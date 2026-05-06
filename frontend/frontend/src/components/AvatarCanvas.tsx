'use client';

import { useRef, useEffect, useCallback } from 'react';

// ─── Types ─────────────────────────────────────────────────────────────────
export type Emotion = 'neutral' | 'happy' | 'sad' | 'excited' | 'thinking' | 'surprised' | 'listening';

interface AvatarCanvasProps {
  isTalking: boolean;
  text: string;
  showControls?: boolean;
  emotion?: Emotion;
  skinTone?: string;
  wordTrigger?: number;
}

// ─── Emotion config ─────────────────────────────────────────────────────────
const EMOTION_CONFIG: Record<Emotion, {
  browLeftY: number; browRightY: number;
  browLeftRot: number; browRightRot: number;
  eyeScaleY: number;
  mouthCurve: number;
  mouthOpen: number;
  cheekOpacity: number;
  irisScale: number;
  headTilt: number;
}> = {
  neutral:   { browLeftY: 0,  browRightY: 0,  browLeftRot: 0,   browRightRot: 0,   eyeScaleY: 1,    mouthCurve: 0.08,  mouthOpen: 0,    cheekOpacity: 0.25, irisScale: 1,    headTilt: 0  },
  happy:     { browLeftY: 4,  browRightY: 4,  browLeftRot: -5,  browRightRot: 5,   eyeScaleY: 0.75, mouthCurve: 0.75,  mouthOpen: 0.3,  cheekOpacity: 0.6,  irisScale: 1.08, headTilt: 2  },
  sad:       { browLeftY: -3, browRightY: -3, browLeftRot: 9,   browRightRot: -9,  eyeScaleY: 0.8,  mouthCurve: -0.55, mouthOpen: 0.05, cheekOpacity: 0,    irisScale: 0.88, headTilt: -4 },
  excited:   { browLeftY: 7,  browRightY: 7,  browLeftRot: -8,  browRightRot: 8,   eyeScaleY: 1.15, mouthCurve: 0.85,  mouthOpen: 0.6,  cheekOpacity: 0.7,  irisScale: 1.18, headTilt: 5  },
  thinking:  { browLeftY: 6,  browRightY: -2, browLeftRot: -12, browRightRot: 4,   eyeScaleY: 0.9,  mouthCurve: -0.12, mouthOpen: 0.06, cheekOpacity: 0,    irisScale: 1,    headTilt: -6 },
  surprised: { browLeftY: 10, browRightY: 10, browLeftRot: 0,   browRightRot: 0,   eyeScaleY: 1.3,  mouthCurve: 0,     mouthOpen: 0.7,  cheekOpacity: 0.3,  irisScale: 1.28, headTilt: 0  },
  listening: { browLeftY: 3,  browRightY: 3,  browLeftRot: -4,  browRightRot: 4,   eyeScaleY: 1.05, mouthCurve: 0.22,  mouthOpen: 0.05, cheekOpacity: 0.2,  irisScale: 1.1,  headTilt: 4  },
};

// ─── Phoneme mouth shapes ─────────────────────────────────────────────────
const PHONEME_SHAPES = [
  { mouthOpen: 0.15, mouthWide: 0.55, mouthCurve: 0.15 }, // M/B/P (slight opening)
  { mouthOpen: 0.90, mouthWide: 0.80, mouthCurve: 0.05 }, // A/Ah
  { mouthOpen: 0.55, mouthWide: 0.98, mouthCurve: 0.25 }, // E
  { mouthOpen: 0.35, mouthWide: 0.98, mouthCurve: 0.35 }, // I
  { mouthOpen: 0.80, mouthWide: 0.40, mouthCurve: -0.1 }, // O
  { mouthOpen: 0.45, mouthWide: 0.30, mouthCurve: -0.25}, // U/W
  { mouthOpen: 0.60, mouthWide: 0.90, mouthCurve: 0.1  }, // L
  { mouthOpen: 0.40, mouthWide: 0.95, mouthCurve: 0.2  }, // S/T/D
];

function lerp(a: number, b: number, t: number) { return a + (b - a) * Math.min(t, 1); }

// ─── Gradient helpers ────────────────────────────────────────────────────────
function radialGrad(
  ctx: CanvasRenderingContext2D,
  x0: number, y0: number, r0: number,
  x1: number, y1: number, r1: number,
  stops: [number, string][]
) {
  const g = ctx.createRadialGradient(x0, y0, r0, x1, y1, r1);
  stops.forEach(([pos, color]) => g.addColorStop(pos, color));
  return g;
}
function linGrad(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, stops: [number, string][]) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  stops.forEach(([pos, color]) => g.addColorStop(pos, color));
  return g;
}

// ─── Main Avatar Component ────────────────────────────────────────────────────
export default function AvatarCanvas({ isTalking, text: _text, showControls: _s = false, emotion, skinTone: _st, wordTrigger = 0 }: AvatarCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastWordTriggerRef = useRef(wordTrigger);
  const lastIsTalkingRef = useRef(isTalking);
  const animRef = useRef<number>(0);

  const stateRef = useRef({
    blinkTimer: 0, blinkDuration: 0, isBlinking: false, eyeOpenness: 1,
    headBobX: 0, headBobY: 0, headTiltAngle: 0,
    breathPhase: 0, talkPhase: 0,
    mouthOpen: 0, mouthWide: 0.5, mouthCurve: 0.08,
    phonemeIndex: 0, phonemeTimer: 0,
    eBrowLeftY: 0, eBrowRightY: 0, eBrowLeftRot: 0, eBrowRightRot: 0,
    eEyeScaleY: 1, eMouthCurve: 0.08, eMouthOpen: 0,
    eCheekOpacity: 0.25, eIrisScale: 1, eHeadTilt: 0,
    pupilX: 0, pupilY: 0, pupilTargetX: 0, pupilTargetY: 0, pupilTimer: 0,
    lastTime: 0, lastWordTime: 0,
  });

  const draw = useCallback((ts: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const s = stateRef.current;
    const dt = Math.min((ts - s.lastTime) / 1000, 0.05);
    s.lastTime = ts;

    const W = canvas.width, H = canvas.height;
    const scale = (W / 500) * Math.min(1.4, H / 520);
    const cx = W / 2;
    const cy = H * 0.44;

    // ── Emotion targets ────────────────────────────────────────────────────
    const ec = EMOTION_CONFIG[emotion ?? 'neutral'];
    const sp = 0.05;
    s.eBrowLeftY   = lerp(s.eBrowLeftY,   ec.browLeftY,    sp * 60 * dt);
    s.eBrowRightY  = lerp(s.eBrowRightY,  ec.browRightY,   sp * 60 * dt);
    s.eBrowLeftRot = lerp(s.eBrowLeftRot, ec.browLeftRot,  sp * 60 * dt);
    s.eBrowRightRot= lerp(s.eBrowRightRot,ec.browRightRot, sp * 60 * dt);
    s.eEyeScaleY   = lerp(s.eEyeScaleY,   ec.eyeScaleY,   sp * 60 * dt);
    s.eMouthCurve  = lerp(s.eMouthCurve,  ec.mouthCurve,  sp * 60 * dt);
    s.eMouthOpen   = lerp(s.eMouthOpen,   ec.mouthOpen,   sp * 60 * dt);
    s.eCheekOpacity= lerp(s.eCheekOpacity,ec.cheekOpacity,sp * 60 * dt);
    s.eIrisScale   = lerp(s.eIrisScale,   ec.irisScale,   sp * 60 * dt);
    s.eHeadTilt    = lerp(s.eHeadTilt,    ec.headTilt,    sp * 60 * dt);

    s.breathPhase += dt * 0.4;
    s.talkPhase   += dt * 8;

    // ── Blink ──────────────────────────────────────────────────────────────
    s.blinkTimer += dt;
    if (!s.isBlinking && s.blinkTimer > s.blinkDuration) {
      s.isBlinking = true;
      s.blinkTimer = 0;
      s.blinkDuration = 0.08 + Math.random() * 0.05;
    }
    if (s.isBlinking) {
      const progress = s.blinkTimer / s.blinkDuration;
      s.eyeOpenness = progress < 0.5 ? 1 - progress * 2 : (progress - 0.5) * 2;
      if (s.blinkTimer >= s.blinkDuration) {
        s.isBlinking = false;
        s.blinkTimer = 0;
        s.blinkDuration = 2.5 + Math.random() * 3;
        s.eyeOpenness = 1;
      }
    }

    // Detect transition to talking to reset timers
    if (isTalking && !lastIsTalkingRef.current) {
      s.lastWordTime = ts;
      s.phonemeTimer = 0;
      lastWordTriggerRef.current = 0; // Reset tracking for new utterance
    }
    lastIsTalkingRef.current = isTalking;

    // React to word boundaries for a more natural "speaking" start to each word
    const hasWordJump = wordTrigger > lastWordTriggerRef.current;
    if (hasWordJump) {
      lastWordTriggerRef.current = wordTrigger;
      s.lastWordTime = ts; // Mark time of last word boundary
      s.phonemeTimer = 0; 
      s.phonemeIndex = 1; 
    }

    const timeSinceLastWord = (ts - s.lastWordTime) / 1000;
    
    // Watchdog: If talking but no word triggers for > 0.4s, force a phoneme change to keep mouth busy
    if (isTalking && timeSinceLastWord > 0.4) {
      s.lastWordTime = ts; 
      s.phonemeTimer = 0.5; // Force immediate transition check
    }

    const activityFade = isTalking ? 1.0 : 0;

    if (isTalking) {
      s.phonemeTimer += dt;
      // Variable speed for phonemes to sound less robotic and rhythmic
      const currentInterval = 0.15 + Math.sin(ts * 0.005) * 0.05;

      if (s.phonemeTimer > currentInterval) {
        s.phonemeTimer = 0;
        // Weighted selection: 75% chance to change phoneme, staying on open ones longer
        if (Math.random() > 0.25) {
          // Avoid the purely closed 'M' shape (index 0) too often during words
          const nextIndex = Math.floor(Math.random() * (PHONEME_SHAPES.length - 1)) + 1;
          s.phonemeIndex = nextIndex;
        }
      }
      
      const ph = PHONEME_SHAPES[s.phonemeIndex];
      
      // Speech energy: A more fluid pulse that doesn't hit zero during words
      // Use Math.max(0, ...) to avoid NaN from Math.pow if sin is slightly negative due to timing
      const speechEnergy = 0.45 + 0.55 * Math.pow(Math.max(0, Math.sin((s.phonemeTimer / currentInterval) * Math.PI)), 0.4);

      // Target mouth openness combining phoneme base and speech energy
      // Added a minimum "mumble" threshold (0.12) so the mouth is always visibly active while talking
      const mumbleNoise = (Math.sin(ts * 0.01) * 0.05) + (Math.cos(ts * 0.02) * 0.03);
      const targetOpen = Math.max(0.12, (ph.mouthOpen * speechEnergy) + mumbleNoise);

      // Asymmetric lerp: open mouth faster than closing for "punchy" speech
      const openLerp = targetOpen > s.mouthOpen ? 28 : 18;

      s.mouthOpen  = lerp(s.mouthOpen,  targetOpen,   dt * openLerp); 
      s.mouthWide  = lerp(s.mouthWide,  ph.mouthWide,  dt * 20);
      s.mouthCurve = lerp(s.mouthCurve, ph.mouthCurve, dt * 20);
      
      // Subtle micro-vibration for vocal cord resonance effect
      const vibration = (Math.random() - 0.5) * 0.015 * activityFade;
      s.mouthOpen += vibration;

      // Move eyebrows slightly with speech intensity
      s.eBrowLeftY += vibration * 20;
      s.eBrowRightY += vibration * 20;
    } else {
      // Close mouth much faster when talking stops
      s.mouthOpen  = lerp(s.mouthOpen,  s.eMouthOpen,  dt * 45); 
      s.mouthWide  = lerp(s.mouthWide,  0.5,           dt * 25);
      s.mouthCurve = lerp(s.mouthCurve, s.eMouthCurve, dt * 25);
    }

    // ── Pupil roam ─────────────────────────────────────────────────────────
    s.pupilTimer -= dt;
    if (s.pupilTimer <= 0) {
      s.pupilTargetX = (Math.random() - 0.5) * 5 * scale;
      s.pupilTargetY = (Math.random() - 0.5) * 4 * scale;
      s.pupilTimer = 1.2 + Math.random() * 2.2;
    }
    s.pupilX = lerp(s.pupilX, s.pupilTargetX, dt * 3.5);
    s.pupilY = lerp(s.pupilY, s.pupilTargetY, dt * 3.5);

    // ── Head motion ────────────────────────────────────────────────────────
    const bobTarget = isTalking
      ? Math.sin(s.talkPhase * 0.22) * 2 * scale
      : Math.sin(s.breathPhase * 0.5) * 1 * scale;
    s.headBobY = lerp(s.headBobY, bobTarget, dt * 3);
    s.headBobX = lerp(s.headBobX, Math.sin(s.breathPhase * 0.27) * 1 * scale, dt * 2);

    // ── Clear ──────────────────────────────────────────────────────────────
    ctx.clearRect(0, 0, W, H);

    const faceX = cx + s.headBobX;
    const faceY = cy + s.headBobY;

    ctx.save();
    ctx.translate(faceX, faceY);

    const tiltRad = (s.eHeadTilt * Math.PI) / 180;
    ctx.rotate(tiltRad);

    // ═══════════════════════════════════════════════
    // COLORS - South Asian / Indian palette
    // ═══════════════════════════════════════════════
    const SKIN_BASE   = '#C68642';
    const SKIN_LIGHT  = '#E0A070';
    const SKIN_DARK   = '#A0652A';
    const SKIN_SHADOW = '#8B5020';
    const HAIR_BASE   = '#1A1F3A';  // dark navy-black
    const HAIR_HIGH   = '#2D3560';  // subtle highlight
    const HAIR_DARK   = '#0D1020';
    const EYE_WHITE   = '#F8F4EE';
    const IRIS_BASE   = '#5C4033';  // warm brown
    const IRIS_LIGHT  = '#8B6040';
    const PUPIL_COL   = '#1A0E08';
    const BROW_COL    = '#2A1F14';
    const LIP_BASE    = '#AF6B5D';  // Warmer professional terracotta rose
    const LIP_HIGH    = '#D49B90';  // Soft peach-nude highlight
    const LIP_DARK    = '#8B453A';  // Deep warm sienna shadow
    const LIP_GLOSS   = 'rgba(255,255,255,0.1)';
    const CHEEK_COL   = '#D4705A';
    const BLUSH_COL   = 'rgba(200,90,80,';
    const CLOTHES_COL = '#8B1A2A';  // dark red/maroon

    // ── Measurements ─────────────────────────────────────────────────────
    const hr = 118 * scale;  // head radius
    const fW = hr * 0.92;
    const fH = hr * 1.08;

    // ═══════════════════════════════════════════════
    //  HAIR (BACK) - Volume and Shoulder Flow
    // ═══════════════════════════════════════════════
    // 1. Large Back Mass
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(0, -fH * 0.35, fW * 0.95, fH * 0.65, 0, 0, Math.PI * 2);
    ctx.fillStyle = linGrad(ctx, 0, -fH, 0, fH * 0.2,
      [[0, HAIR_HIGH], [0.4, HAIR_BASE], [1, HAIR_DARK]]);
    ctx.fill();
    ctx.restore();

    // 2. Shoulder Flow (Hair draping over shoulders)
    for (const sx of [-1, 1]) {
      ctx.save();
      ctx.beginPath();
      // Start from behind the ears
      ctx.moveTo(fW * 0.85 * sx, -fH * 0.2);
      // Flow down over the shoulder
      ctx.bezierCurveTo(
        fW * 1.3 * sx, fH * 0.3,   // Outer shoulder curve
        fW * 1.1 * sx, fH * 1.1,   // Mid chest curve
        fW * 0.4 * sx, fH * 1.45   // Tapering end on chest
      );
      // Outer edge back up
      ctx.bezierCurveTo(
        fW * 1.4 * sx, fH * 1.1,
        fW * 1.5 * sx, fH * 0.2,
        fW * 0.9 * sx, -fH * 0.4
      );
      ctx.closePath();
      
      const shoulderG = ctx.createLinearGradient(fW * sx, 0, fW * 1.5 * sx, fH);
      shoulderG.addColorStop(0, HAIR_BASE);
      shoulderG.addColorStop(0.5, HAIR_HIGH);
      shoulderG.addColorStop(1, HAIR_DARK);
      ctx.fillStyle = shoulderG;
      ctx.fill();

      // Add fine strands for texture in the shoulder flow
      ctx.beginPath();
      ctx.moveTo(fW * 0.9 * sx, -fH * 0.1);
      ctx.bezierCurveTo(fW * 1.25 * sx, fH * 0.4, fW * 1.0 * sx, fH * 1.0, fW * 0.5 * sx, fH * 1.35);
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 2 * scale;
      ctx.stroke();
      ctx.restore();
    }

    // Long side braid (left side) - goes down over shoulder
    ctx.save();
    ctx.translate(-fW * 0.65, fH * 0.35);
    // Main braid cord
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(-fW * 0.15, fH * 0.35, -fW * 0.1, fH * 0.75, -fW * 0.05, fH * 1.15);
    ctx.lineWidth = 26 * scale;
    ctx.strokeStyle = HAIR_BASE;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.lineWidth = 14 * scale;
    ctx.strokeStyle = HAIR_HIGH;
    ctx.globalAlpha = 0.4;
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Braid segments
    for (let i = 0; i < 7; i++) {
      const t = i / 7;
      const bx = -fW * 0.05 * t * 0.5;
      const by = fH * 0.18 * i;
      ctx.beginPath();
      ctx.ellipse(bx, by, 14 * scale, 9 * scale, -0.3, 0, Math.PI * 2);
      ctx.fillStyle = i % 2 === 0 ? HAIR_BASE : HAIR_HIGH;
      ctx.fill();
    }

    // Braid tip
    ctx.beginPath();
    ctx.ellipse(-fW * 0.04, fH * 1.15, 10 * scale, 14 * scale, 0, 0, Math.PI * 2);
    ctx.fillStyle = HAIR_DARK;
    ctx.fill();
    ctx.restore();

    // ═══════════════════════════════════════════════
    //  NECK
    // ═══════════════════════════════════════════════
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(-18 * scale, fH * 0.88);
    ctx.lineTo(-16 * scale, fH * 1.25);
    ctx.lineTo(16 * scale, fH * 1.25);
    ctx.lineTo(18 * scale, fH * 0.88);
    ctx.closePath();
    ctx.fillStyle = linGrad(ctx, -18 * scale, fH * 0.9, 18 * scale, fH * 0.9,
      [[0, SKIN_DARK], [0.5, SKIN_BASE], [1, SKIN_DARK]]);
    ctx.fill();
    ctx.restore();

    // ═══════════════════════════════════════════════
    //  CLOTHES - dark red/maroon top
    // ═══════════════════════════════════════════════
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(-fW * 1.2, fH * 1.6);
    ctx.lineTo(-fW * 0.95, fH * 1.18);
    ctx.bezierCurveTo(-fW * 0.5, fH * 1.1, fW * 0.5, fH * 1.1, fW * 0.95, fH * 1.18);
    ctx.lineTo(fW * 1.2, fH * 1.6);
    ctx.closePath();
    ctx.fillStyle = linGrad(ctx, -fW, fH * 1.2, fW, fH * 1.5,
      [[0, '#7A1520'], [0.3, CLOTHES_COL], [0.7, '#A02535'], [1, '#7A1520']]);
    ctx.fill();

    // Neckline curve
    ctx.beginPath();
    ctx.moveTo(-fW * 0.35, fH * 1.2);
    ctx.bezierCurveTo(-fW * 0.2, fH * 1.32, fW * 0.2, fH * 1.32, fW * 0.35, fH * 1.2);
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 2 * scale;
    ctx.stroke();

    // Sleeves
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(fW * 1.0 * sx, fH * 1.35, fW * 0.28, fH * 0.14, 0.2 * sx, 0, Math.PI * 2);
      ctx.fillStyle = '#8B1A2A';
      ctx.fill();
    }
    ctx.restore();

    // ═══════════════════════════════════════════════
    //  FACE - warm brown gradient with 3D depth
    // ═══════════════════════════════════════════════
    ctx.save();
    // Face shadow for 3D effect
    ctx.shadowColor = 'rgba(80,30,10,0.4)';
    ctx.shadowBlur = 22 * scale;
    ctx.shadowOffsetY = 6 * scale;
    ctx.beginPath();
    ctx.ellipse(0, 0, fW, fH, 0, 0, Math.PI * 2);
    ctx.fillStyle = radialGrad(ctx, -fW * 0.15, -fH * 0.2, fW * 0.05, 0, 0, fW * 1.0,
      [[0, SKIN_LIGHT], [0.35, SKIN_BASE], [0.75, SKIN_BASE], [1, SKIN_DARK]]);
    ctx.fill();
    ctx.shadowColor = 'transparent';

    // Forehead highlight (Subdued under bangs)
    ctx.beginPath();
    ctx.ellipse(-fW * 0.08, -fH * 0.5, fW * 0.3, fH * 0.2, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,200,140,0.08)';
    ctx.fill();

    // Chin shadow
    ctx.beginPath();
    ctx.ellipse(0, fH * 0.82, fW * 0.45, fH * 0.18, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(80,30,10,0.18)';
    ctx.fill();
    ctx.restore();

    // ── Jaw line shading ───────────────────
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(0, fH * 0.3, fW * 0.85, fH * 0.55, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(120,60,20,0.08)';
    ctx.fill();
    ctx.restore();

    // ── Ears ────────────────────────────────────────────────────────────
    for (const sx of [-1, 1]) {
      ctx.save();
      ctx.translate(fW * 0.94 * sx, -fH * 0.06);
      ctx.beginPath();
      ctx.ellipse(0, 0, 14 * scale, 19 * scale, 0, 0, Math.PI * 2);
      ctx.fillStyle = radialGrad(ctx, -3 * scale, 0, 2 * scale, 0, 0, 14 * scale,
        [[0, SKIN_LIGHT], [1, SKIN_DARK]]);
      ctx.fill();
      // Inner ear
      ctx.beginPath();
      ctx.ellipse(2 * sx, 0, 6 * scale, 10 * scale, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(150,80,40,0.35)';
      ctx.fill();
      ctx.restore();
    }

    // ═══════════════════════════════════════════════
    //  CHEEK BLUSH
    // ═══════════════════════════════════════════════
    for (const sx of [-1, 1]) {
      ctx.save();
      ctx.translate(fW * 0.52 * sx, fH * 0.18);
      ctx.globalAlpha = s.eCheekOpacity * 0.9;
      const blushG = ctx.createRadialGradient(0, 0, 0, 0, 0, 34 * scale);
      blushG.addColorStop(0, BLUSH_COL + '0.7)');
      blushG.addColorStop(0.6, BLUSH_COL + '0.25)');
      blushG.addColorStop(1, BLUSH_COL + '0)');
      ctx.beginPath();
      ctx.ellipse(0, 0, 34 * scale, 22 * scale, 0, 0, Math.PI * 2);
      ctx.fillStyle = blushG;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    // ═══════════════════════════════════════════════
    //  NOSE - subtle, stylized
    // ═══════════════════════════════════════════════
    ctx.save();
    ctx.translate(0, fH * 0.18);
    // Bridge shadow
    ctx.beginPath();
    ctx.moveTo(-3 * scale, -20 * scale);
    ctx.bezierCurveTo(-5 * scale, -6 * scale, -8 * scale, 8 * scale, -6 * scale, 16 * scale);
    ctx.strokeStyle = 'rgba(100,50,20,0.25)';
    ctx.lineWidth = 2.5 * scale;
    ctx.lineCap = 'round';
    ctx.stroke();
    // Nose tip
    ctx.beginPath();
    ctx.arc(0, 16 * scale, 7 * scale, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(120,70,30,0.18)';
    ctx.fill();
    // Nostrils (subtle dots)
    for (const nx of [-6, 6]) {
      ctx.beginPath();
      ctx.arc(nx * scale, 18 * scale, 2.8 * scale, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(100,50,20,0.4)';
      ctx.fill();
    }
    ctx.restore();

    // ═══════════════════════════════════════════════
    //  EYES  (large, anime-style, brown)
    // ═══════════════════════════════════════════════
    const eyeY = -fH * 0.08;
    const eyeSpacing = 52 * scale;
    const eyeW = 30 * scale;
    const eyeH = 22 * scale;
    const eyeOpen = s.eyeOpenness * s.eEyeScaleY;

    for (const [sx, browLeftY, browLeftRot, browRightY, browRightRot] of [
      [-1, s.eBrowLeftY, s.eBrowLeftRot, 0, 0],
      [ 1, 0, 0, s.eBrowRightY, s.eBrowRightRot],
    ] as [number, number, number, number, number][]) {
      const ex = eyeSpacing * sx;
      const bowY = sx === -1 ? browLeftY : browRightY;
      const bowRot = sx === -1 ? browLeftRot : browRightRot;

      ctx.save();
      ctx.translate(ex, eyeY);

      // ── Eye shadow (3D depth) ──
      ctx.beginPath();
      ctx.ellipse(0, eyeH * 0.4, eyeW * 1.1, eyeH * 0.55, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(80,30,10,0.2)';
      ctx.fill();

      // ── Eye white ──
      ctx.save();
      ctx.scale(1, eyeOpen);
      ctx.beginPath();
      ctx.ellipse(0, 0, eyeW, eyeH, 0, 0, Math.PI * 2);
      ctx.fillStyle = EYE_WHITE;
      ctx.fill();

      // ── Iris ──
      const irisR = 15 * scale * s.eIrisScale;
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(s.pupilX, s.pupilY, irisR, irisR * Math.min(eyeOpen, 1), 0, 0, Math.PI * 2);
      ctx.fillStyle = radialGrad(ctx, s.pupilX - irisR * 0.25, s.pupilY - irisR * 0.2, irisR * 0.1,
        s.pupilX, s.pupilY, irisR,
        [[0, IRIS_LIGHT], [0.5, IRIS_BASE], [1, '#3A2016']]);
      ctx.fill();

      // ── Pupil ──
      const pupR = 8.5 * scale;
      ctx.beginPath();
      ctx.arc(s.pupilX, s.pupilY, pupR, 0, Math.PI * 2);
      ctx.fillStyle = PUPIL_COL;
      ctx.fill();

      // ── Eye sparkle / specular ──
      ctx.beginPath();
      ctx.arc(s.pupilX - 4.5 * scale, s.pupilY - 5 * scale, 3.5 * scale, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(s.pupilX + 2.5 * scale, s.pupilY - 3 * scale, 2 * scale, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.fill();
      ctx.restore();

      // ── Upper eyelid ──
      ctx.beginPath();
      ctx.ellipse(0, -eyeH * 0.05, eyeW, eyeH, 0, Math.PI, 0);
      ctx.fillStyle = linGrad(ctx, 0, -eyeH, 0, 0,
        [[0, 'rgba(30,15,5,0.55)'], [0.4, 'rgba(30,15,5,0.18)'], [1, 'rgba(30,15,5,0)']]);
      ctx.fill();

      // ── Eyelid liner ──
      ctx.beginPath();
      ctx.ellipse(0, 0, eyeW, eyeH, 0, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(30,10,5,0.65)';
      ctx.lineWidth = 2.2 * scale;
      ctx.stroke();

      // ── Lower lash line ──
      ctx.beginPath();
      ctx.ellipse(0, eyeH * 0.15, eyeW * 0.9, eyeH * 0.5, 0, 0, Math.PI);
      ctx.strokeStyle = 'rgba(30,10,5,0.3)';
      ctx.lineWidth = 1.2 * scale;
      ctx.stroke();
      ctx.restore(); // scale for blink

      // ── Upper lashes ──
      if (eyeOpen > 0.15) {
        const lashCount = 9;
        for (let i = 0; i < lashCount; i++) {
          const t = (i / (lashCount - 1)) - 0.5;
          const lx = t * eyeW * 1.9;
          const ly = -Math.sqrt(Math.max(0, 1 - (lx / (eyeW * 1.9)) ** 2)) * eyeH * eyeOpen;
          const angle = Math.atan2(-ly, lx) + Math.PI * 0.5 + t * 0.35;
          const len = (8 + Math.sin(i * 1.1) * 3) * scale * eyeOpen;
          ctx.save();
          ctx.translate(lx, ly);
          ctx.rotate(angle);
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(0, -len * 1.1);
          ctx.strokeStyle = '#1A0A05';
          ctx.lineWidth = 1.8 * scale;
          ctx.lineCap = 'round';
          ctx.stroke();
          ctx.restore();
        }
      }

      // ── Eyebrow ──
      ctx.save();
      ctx.translate(0, -eyeH * 1.7 - bowY * scale);
      ctx.rotate((bowRot * Math.PI) / 180);
      const browW = eyeW * 1.25;
      const browH = 5.5 * scale;
      ctx.beginPath();
      ctx.moveTo(-browW, browH * 0.5);
      ctx.bezierCurveTo(-browW * 0.6, -browH * 1.2, browW * 0.3, -browH * 0.6, browW, browH * 0.5);
      ctx.bezierCurveTo(browW * 0.3, browH * 0.2, -browW * 0.5, browH * 0.5, -browW, browH * 0.5);
      ctx.closePath();
      ctx.fillStyle = linGrad(ctx, -browW, 0, browW, 0,
        [[0, BROW_COL + '80'], [0.15, BROW_COL], [0.85, BROW_COL], [1, BROW_COL + '80']]);
      ctx.fill();
      ctx.restore();

      ctx.restore(); // translate to eye center
    }

    // ═══════════════════════════════════════════════
    //  MOUTH - Proportional Professional Structure
    // ═══════════════════════════════════════════════
    ctx.save();
    ctx.translate(0, fH * 0.465); // Slightly lower for better proportion

    const mouthW = (22 + s.mouthWide * 16) * scale; // Reduced width
    const mouthH = s.mouthOpen * 18 * scale; // Reduced max height
    const curve = s.mouthCurve;

    // 1. Grounding & Philtrum
    ctx.save();
    // Soft skin-tone shadow around corners (commissures)
    const commG = ctx.createRadialGradient(0, 0, 0, 0, 0, mouthW * 1.3);
    commG.addColorStop(0, 'rgba(80,40,20,0.06)');
    commG.addColorStop(1, 'rgba(80,40,20,0)');
    ctx.fillStyle = commG;
    ctx.beginPath();
    ctx.ellipse(0, 0, mouthW * 1.2, 18 * scale, 0, 0, Math.PI * 2);
    ctx.fill();

    // Subtle Philtrum
    const philGrad = ctx.createLinearGradient(0, -22 * scale, 0, -8 * scale);
    philGrad.addColorStop(0, 'rgba(100,60,40,0)');
    philGrad.addColorStop(0.5, 'rgba(100,60,40,0.04)');
    philGrad.addColorStop(1, 'rgba(100,60,40,0)');
    ctx.strokeStyle = philGrad;
    ctx.lineWidth = 1 * scale;
    for (const offset of [-3.5 * scale, 3.5 * scale]) {
      ctx.beginPath();
      ctx.moveTo(offset, -22 * scale);
      ctx.quadraticCurveTo(offset * 0.8, -15 * scale, offset, -8 * scale);
      ctx.stroke();
    }
    ctx.restore();

    // 2. Mouth Cavity
    if (mouthH > 1.5 * scale) {
      ctx.save();
      ctx.beginPath();
      // Organic elliptical opening
      ctx.ellipse(0, mouthH * 0.3, mouthW * 0.85, mouthH * 0.6, 0, 0, Math.PI * 2);
      const cavG = ctx.createRadialGradient(0, 0, 0, 0, 0, mouthW);
      cavG.addColorStop(0, '#3A0D12');
      cavG.addColorStop(1, '#150406');
      ctx.fillStyle = cavG;
      ctx.fill();

      // Soft Teeth
      const teethV = Math.min(mouthH * 0.6, 8 * scale);
      if (teethV > 1 * scale) {
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(0, -mouthH * 0.05, mouthW * 0.72, teethV, 0, 0, Math.PI, true);
        ctx.lineTo(mouthW * 0.72, teethV * 0.2);
        ctx.lineTo(-mouthW * 0.72, teethV * 0.2);
        ctx.closePath();
        const tG = ctx.createLinearGradient(0, -mouthH * 0.05, 0, teethV);
        tG.addColorStop(0, '#FFFFFF');
        tG.addColorStop(1, '#D8CFB5');
        ctx.fillStyle = tG;
        ctx.fill();
        ctx.restore();
      }
      ctx.restore();
    }

    // 3. Lips Rendering (Shared Path Logic)
    const partingY = (curve * 5 * scale); // Base parting line Y
    
    // ── LOWER LIP ──
    ctx.save();
    const lHeight = (11 + curve * 6) * scale; // Proportional height
    const lDip = mouthH * 0.8; // How much it pulls down when open
    
    ctx.beginPath();
    // Start at corner
    ctx.moveTo(-mouthW, partingY);
    // Shared Parting Edge (top of lower lip)
    ctx.quadraticCurveTo(0, partingY + mouthH * 0.45, mouthW, partingY);
    // Outer Rounded Edge
    ctx.bezierCurveTo(mouthW * 0.7, lHeight + lDip, -mouthW * 0.7, lHeight + lDip, -mouthW, partingY);
    ctx.closePath();
    
    const lGrad = ctx.createLinearGradient(0, partingY + mouthH * 0.45, 0, lHeight + lDip);
    lGrad.addColorStop(0, LIP_BASE);
    lGrad.addColorStop(0.4, LIP_HIGH);
    lGrad.addColorStop(1, LIP_DARK);
    ctx.fillStyle = lGrad;
    ctx.fill();

    // Subtle highlight for volume
    ctx.beginPath();
    ctx.ellipse(0, partingY + lHeight * 0.5 + lDip * 0.5, mouthW * 0.35, lHeight * 0.2, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fill();
    ctx.restore();

    // ── UPPER LIP ──
    ctx.save();
    const uDepth = -11 * scale; // Thinner upper lip
    const uLift = -mouthH * 0.2; // How much it pulls up when open
    
    ctx.beginPath();
    // Start at corner
    ctx.moveTo(-mouthW, partingY);
    // Shared Parting Edge (bottom of upper lip)
    ctx.quadraticCurveTo(0, partingY - mouthH * 0.45, mouthW, partingY);
    // Top Edge with Cupid's Bow
    ctx.bezierCurveTo(mouthW * 0.5, uDepth + uLift, mouthW * 0.1, (uDepth + 2.5 * scale) + uLift, 0, (uDepth + 2.5 * scale) + uLift);
    ctx.bezierCurveTo(-mouthW * 0.1, (uDepth + 2.5 * scale) + uLift, -mouthW * 0.5, uDepth + uLift, -mouthW, partingY);
    ctx.closePath();
    
    const uGrad = ctx.createLinearGradient(0, uDepth + uLift, 0, partingY - mouthH * 0.45);
    uGrad.addColorStop(0, LIP_DARK);
    uGrad.addColorStop(0.5, LIP_BASE);
    uGrad.addColorStop(1, LIP_DARK);
    ctx.fillStyle = uGrad;
    ctx.fill();
    ctx.restore();

    // 4. Final Polish: Corner Shadow
    ctx.beginPath();
    ctx.fillStyle = 'rgba(60,20,10,0.15)';
    // Small dots at corners for grounding
    ctx.arc(-mouthW, partingY, 1.5 * scale, 0, Math.PI * 2);
    ctx.arc(mouthW, partingY, 1.5 * scale, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();


    // 4. Soft Corner Blending
    for (const sx of [-1, 1]) {
      ctx.save();
      const cx = mouthW * sx;
      const cy = partingY;
      const cornerG = ctx.createRadialGradient(cx, cy, 0, cx, cy, 6 * scale);
      cornerG.addColorStop(0, 'rgba(80,30,10,0.15)');
      cornerG.addColorStop(1, 'rgba(80,30,10,0)');
      ctx.fillStyle = cornerG;
      ctx.beginPath();
      ctx.arc(cx, cy, 6 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.restore(); // mouth

    ctx.restore(); // mouth

    // ═══════════════════════════════════════════════
    //  HAIR (FRONT) - Full Bangs and Face Framing
    // ═══════════════════════════════════════════════
    ctx.save();
    
    // 1. Crown & Fringe Base (The main mass of hair covering the top forehead)
    ctx.beginPath();
    ctx.moveTo(-fW * 1.05, -fH * 0.4);
    ctx.bezierCurveTo(-fW * 1.1, -fH * 1.2, fW * 1.1, -fH * 1.2, fW * 1.05, -fH * 0.4);
    ctx.bezierCurveTo(fW * 0.8, -fH * 0.75, fW * 0.3, -fH * 0.85, 0, -fH * 0.85);
    ctx.bezierCurveTo(-fW * 0.3, -fH * 0.85, -fW * 0.8, -fH * 0.75, -fW * 1.05, -fH * 0.4);
    ctx.closePath();
    ctx.fillStyle = linGrad(ctx, 0, -fH * 1.1, 0, -fH * 0.4,
      [[0, HAIR_HIGH], [0.6, HAIR_BASE], [1, HAIR_DARK]]);
    ctx.fill();

    // 2. The Fringe (Bangs) - Drapery over the forehead
    ctx.save();
    // Soft shadow under bangs
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 8 * scale;
    ctx.shadowOffsetY = 4 * scale;

    ctx.beginPath();
    ctx.moveTo(-fW * 0.95, -fH * 0.65);
    // Left sweep
    ctx.bezierCurveTo(-fW * 0.7, -fH * 0.25, -fW * 0.3, -fH * 0.15, -fW * 0.05, -fH * 0.28);
    // Right sweep
    ctx.bezierCurveTo(fW * 0.2, -fH * 0.1, fW * 0.7, -fH * 0.2, fW * 0.95, -fH * 0.65);
    ctx.bezierCurveTo(fW * 0.5, -fH * 0.8, -fW * 0.5, -fH * 0.8, -fW * 0.95, -fH * 0.65);
    ctx.closePath();
    ctx.fillStyle = linGrad(ctx, 0, -fH * 0.7, 0, -fH * 0.2,
      [[0, HAIR_BASE], [0.7, HAIR_BASE], [1, HAIR_DARK]]);
    ctx.fill();
    ctx.restore();

    // 3. Layered Strands on Bangs for Depth
    for (const [sx, startX, startY, cp1x, cp1y, endX, endY] of [
      [-1, 0.1, 0.8, 0.4, 0.3, 0.6, 0.22],
      [1, 0.1, 0.8, 0.4, 0.3, 0.6, 0.18],
      [-1, 0.4, 0.75, 0.7, 0.4, 0.85, 0.35],
      [1, 0.4, 0.75, 0.7, 0.4, 0.85, 0.3],
    ] as [number, number, number, number, number, number, number][]) {
      ctx.beginPath();
      ctx.moveTo(fW * startX * sx, -fH * startY);
      ctx.bezierCurveTo(fW * cp1x * sx, -fH * cp1y, fW * endX * sx, -fH * (endY + 0.1), fW * endX * sx, -fH * endY);
      ctx.strokeStyle = HAIR_BASE;
      ctx.lineWidth = 8 * scale;
      ctx.lineCap = 'round';
      ctx.stroke();
      
      // Strand highlights
      ctx.strokeStyle = HAIR_HIGH;
      ctx.lineWidth = 2 * scale;
      ctx.globalAlpha = 0.25;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // 4. Face Framing Side Locks
    for (const sx of [-1, 1]) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(fW * 0.95 * sx, -fH * 0.6);
      ctx.bezierCurveTo(
        fW * 1.15 * sx, -fH * 0.1,
        fW * 0.95 * sx, fH * 0.4,
        fW * 0.7 * sx, fH * 0.65
      );
      ctx.strokeStyle = HAIR_BASE;
      ctx.lineWidth = 22 * scale;
      ctx.lineCap = 'round';
      ctx.stroke();
      
      // Highlights on side locks
      ctx.strokeStyle = HAIR_HIGH;
      ctx.lineWidth = 6 * scale;
      ctx.globalAlpha = 0.2;
      ctx.stroke();
      ctx.restore();
    }

    // 5. Center Wisps (Very delicate)
    ctx.beginPath();
    ctx.moveTo(-fW * 0.05, -fH * 0.8);
    ctx.bezierCurveTo(-fW * 0.02, -fH * 0.4, fW * 0.02, -fH * 0.4, fW * 0.05, -fH * 0.8);
    ctx.strokeStyle = HAIR_BASE;
    ctx.lineWidth = 3 * scale;
    ctx.stroke();
    
    ctx.restore();

    ctx.restore(); // tilt  + translate

    // ── Schedule next frame ──────────────────────────────────────────────────
    animRef.current = requestAnimationFrame(draw);
  }, [isTalking, emotion]);

  // ── Resize handler ─────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const dpr = window.devicePixelRatio || 1;
      const w = parent.clientWidth;
      const h = parent.clientHeight;
      canvas.width  = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width  = w + 'px';
      canvas.style.height = h + 'px';
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.scale(dpr, dpr);
    };

    resize();
    const ro = new ResizeObserver(resize);
    if (canvas.parentElement) ro.observe(canvas.parentElement);

    stateRef.current.lastTime = performance.now();
    animRef.current = requestAnimationFrame(draw);

    return () => {
      ro.disconnect();
      cancelAnimationFrame(animRef.current);
    };
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      style={{ display: 'block', width: '100%', height: '100%' }}
    />
  );
}
