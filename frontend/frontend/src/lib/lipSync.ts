// Lip Sync Engine - Handles mouth animation for speaking

export interface LipSyncState {
  mouthOpen: number; // 0 (closed) to 1 (fully open)
  mouthWide: number; // 0 (narrow) to 1 (wide)
  lipTension: number; // 0 (relaxed) to 1 (tense)
}

// Simple sine-wave based lip sync (for browser SpeechSynthesis)
export function createLipSync(): LipSyncController {
  let isSpeaking = false;
  let animationFrame: number | null = null;
  let startTime = 0;
  let currentState: LipSyncState = {
    mouthOpen: 0,
    mouthWide: 0,
    lipTension: 0,
  };
  let onUpdate: ((state: LipSyncState) => void) | null = null;

  const start = () => {
    if (isSpeaking) return;
    isSpeaking = true;
    startTime = Date.now();
    animate();
  };

  const stop = () => {
    isSpeaking = false;
    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
      animationFrame = null;
    }
    // Reset to neutral
    currentState = { mouthOpen: 0, mouthWide: 0, lipTension: 0 };
    onUpdate?.(currentState);
  };

  const animate = () => {
    if (!isSpeaking) return;

    const elapsed = Date.now() - startTime;
    const t = elapsed / 1000; // Time in seconds

    // Create natural-looking mouth movement using multiple sine waves
    // Primary frequency (basic talking rhythm)
    const primary = Math.sin(t * 8) * 0.5 + 0.5;
    // Secondary frequency (faster movements for emphasis)
    const secondary = Math.sin(t * 15) * 0.3;
    // Tertiary (very fast for natural variation)
    const tertiary = Math.sin(t * 25) * 0.1;

    // Combine frequencies
    const combined = Math.max(0, Math.min(1, primary + secondary + tertiary));

    // Add some randomness for natural feel
    const randomFactor = Math.sin(t * 3.7) * 0.1;

    currentState = {
      mouthOpen: combined + randomFactor,
      mouthWide: combined * 0.5 + 0.2,
      lipTension: combined * 0.3,
    };

    onUpdate?.(currentState);
    animationFrame = requestAnimationFrame(animate);
  };

  return {
    start,
    stop,
    setOnUpdate: (callback: (state: LipSyncState) => void) => {
      onUpdate = callback;
    },
    getState: () => currentState,
    isActive: () => isSpeaking,
  };
}

export type LipSyncController = {
  start: () => void;
  stop: () => void;
  setOnUpdate: (callback: (state: LipSyncState) => void) => void;
  getState: () => LipSyncState;
  isActive: () => boolean;
};

// Map phonemes to visemes (mouth shapes)
// Simplified mapping for common English phonemes
export const phonemeToViseme: Record<string, { mouthOpen: number; mouthWide: number }> = {
  // Vowels
  'AA': { mouthOpen: 0.8, mouthWide: 0.5 },
  'AE': { mouthOpen: 0.6, mouthWide: 0.7 },
  'AH': { mouthOpen: 0.5, mouthWide: 0.4 },
  'AO': { mouthOpen: 0.7, mouthWide: 0.3 },
  'AW': { mouthOpen: 0.8, mouthWide: 0.4 },
  'AY': { mouthOpen: 0.7, mouthWide: 0.5 },
  'EH': { mouthOpen: 0.5, mouthWide: 0.6 },
  'ER': { mouthOpen: 0.5, mouthWide: 0.4 },
  'EY': { mouthOpen: 0.5, mouthWide: 0.6 },
  'IH': { mouthOpen: 0.3, mouthWide: 0.5 },
  'IY': { mouthOpen: 0.3, mouthWide: 0.6 },
  'OW': { mouthOpen: 0.7, mouthWide: 0.3 },
  'OY': { mouthOpen: 0.6, mouthWide: 0.4 },
  'UH': { mouthOpen: 0.5, mouthWide: 0.3 },
  'UW': { mouthOpen: 0.4, mouthWide: 0.3 },
  
  // Consonants
  'B': { mouthOpen: 0.1, mouthWide: 0.2 },
  'CH': { mouthOpen: 0.3, mouthWide: 0.4 },
  'D': { mouthOpen: 0.2, mouthWide: 0.3 },
  'DH': { mouthOpen: 0.3, mouthWide: 0.3 },
  'F': { mouthOpen: 0.2, mouthWide: 0.7 },
  'G': { mouthOpen: 0.3, mouthWide: 0.3 },
  'HH': { mouthOpen: 0.4, mouthWide: 0.3 },
  'JH': { mouthOpen: 0.3, mouthWide: 0.5 },
  'K': { mouthOpen: 0.3, mouthWide: 0.3 },
  'L': { mouthOpen: 0.2, mouthWide: 0.5 },
  'M': { mouthOpen: 0.1, mouthWide: 0.3 },
  'N': { mouthOpen: 0.2, mouthWide: 0.3 },
  'NG': { mouthOpen: 0.2, mouthWide: 0.3 },
  'P': { mouthOpen: 0.1, mouthWide: 0.2 },
  'R': { mouthOpen: 0.3, mouthWide: 0.4 },
  'S': { mouthOpen: 0.2, mouthWide: 0.5 },
  'SH': { mouthOpen: 0.3, mouthWide: 0.5 },
  'T': { mouthOpen: 0.2, mouthWide: 0.3 },
  'TH': { mouthOpen: 0.2, mouthWide: 0.5 },
  'V': { mouthOpen: 0.2, mouthWide: 0.6 },
  'W': { mouthOpen: 0.3, mouthWide: 0.3 },
  'Y': { mouthOpen: 0.2, mouthWide: 0.4 },
  'Z': { mouthOpen: 0.2, mouthWide: 0.5 },
  'ZH': { mouthOpen: 0.3, mouthWide: 0.5 },
};

// Default viseme for unknown phonemes
const defaultViseme = { mouthOpen: 0.2, mouthWide: 0.3 };

export function getViseme(phoneme: string): LipSyncState {
  const viseme = phonemeToViseme[phoneme] || defaultViseme;
  return {
    mouthOpen: viseme.mouthOpen,
    mouthWide: viseme.mouthWide,
    lipTension: viseme.mouthOpen * 0.3,
  };
}

// Morph target names for GLB models with blend shapes
export const MORPH_TARGETS = {
  VISEME_AA: 'viseme_aa',
  VISEME_OH: 'viseme_oh',
  VISEME_MM: 'viseme_mm',
  VISEME_FF: 'viseme_ff',
  NEUTRAL: 'neutral',
} as const;

export type MorphTargetName = typeof MORPH_TARGETS[keyof typeof MORPH_TARGETS];

// Morph target influences interface
export interface MorphTargetState {
  viseme_aa: number;
  viseme_oh: number;
  viseme_mm: number;
  viseme_ff: number;
}

// Phoneme to viseme mapping for Rhubarb output
export const PHONEME_TO_VISEME: Record<string, MorphTargetName> = {
  'A': MORPH_TARGETS.VISEME_AA,
  'C': MORPH_TARGETS.VISEME_AA,
  'G': MORPH_TARGETS.VISEME_AA,
  'H': MORPH_TARGETS.VISEME_AA,
  'B': MORPH_TARGETS.VISEME_MM,
  'D': MORPH_TARGETS.VISEME_FF,
  'F': MORPH_TARGETS.VISEME_FF,
  'E': MORPH_TARGETS.VISEME_OH,
  'X': MORPH_TARGETS.NEUTRAL,
};

// Default morph state
export const DEFAULT_MORPH_STATE: MorphTargetState = {
  viseme_aa: 0,
  viseme_oh: 0,
  viseme_mm: 0,
  viseme_ff: 0,
};
