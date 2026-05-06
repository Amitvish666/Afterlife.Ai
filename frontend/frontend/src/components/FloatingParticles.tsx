'use client';

import React, { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  size: number;
  speedY: number;
  sineSpeed: number;
  sineAmt: number;
  alpha: number;
  color: string;
}

export default function FloatingParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    const particles: Particle[] = [];
    const count = 35; // Ambient count to maintain high rendering speeds and low CPU load

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Color definitions matching the brand palette
    const colors = [
      '139, 92, 246', // Purple
      '236, 72, 153', // Pink
      '59, 130, 246', // Blue
      '6, 182, 212',  // Cyan
    ];

    // Initialize particles
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        size: Math.random() * 2.2 + 0.6,
        speedY: Math.random() * 0.4 + 0.15,
        sineSpeed: Math.random() * 0.008 + 0.003,
        sineAmt: Math.random() * 1.5 + 0.4,
        alpha: Math.random() * 0.28 + 0.05,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }

    let time = 0;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      time += 1;

      particles.forEach((p) => {
        // Drift upwards
        p.y -= p.speedY;
        // Sway horizontally with sine waves
        const sway = Math.sin(time * p.sineSpeed) * p.sineAmt;
        const drawX = p.x + sway;

        // Draw particle with gentle glow halo
        ctx.beginPath();
        ctx.arc(drawX, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.color}, ${p.alpha})`;
        ctx.fill();

        // Subtle glow halo for larger particles
        if (p.size > 1.8) {
          ctx.beginPath();
          ctx.arc(drawX, p.y, p.size * 2.5, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${p.color}, ${p.alpha * 0.12})`;
          ctx.fill();
        }

        // Reset particle to bottom once it leaves the viewport top
        if (p.y < -10) {
          p.y = canvas.height + 10;
          p.x = Math.random() * canvas.width;
          p.alpha = Math.random() * 0.28 + 0.05;
        }
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      className="absolute inset-0 w-full h-full pointer-events-none select-none z-0 overflow-hidden"
    />
  );
}
