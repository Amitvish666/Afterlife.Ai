'use client';

import React from 'react';

export default function PerspectiveGrid() {
  return (
    <div className="absolute inset-0 w-full h-full pointer-events-none select-none z-0 overflow-hidden opacity-[0.06] sm:opacity-[0.1]">
      {/* 3D Perspective Grid Wrap */}
      <div 
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[200vw] h-[150vh] origin-bottom [perspective:500px]"
        style={{ transform: 'translateX(-50%) rotateX(65deg)' }}
      >
        {/* Infinite Grid Plane */}
        <div 
          className="w-full h-full bg-[linear-gradient(to_right,rgba(139,92,246,0.35)_1px,transparent_1px),linear-gradient(to_bottom,rgba(139,92,246,0.35)_1px,transparent_1px)] bg-[size:45px_45px] animate-[gridScroll_30s_linear_infinite]"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(139, 92, 246, 0.45) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(139, 92, 246, 0.45) 1px, transparent 1px)
            `,
          }}
        />
      </div>

      {/* Radial Gradient overlay to fade the grid edges seamlessly */}
      <div className="absolute inset-0 bg-gradient-radial from-transparent via-surface-950/40 to-surface-950 pointer-events-none" />

      {/* Tailwind gridScroll animation added inside components */}
      <style jsx global>{`
        @keyframes gridScroll {
          0% {
            background-position: 0 0;
          }
          100% {
            background-position: 0 1350px;
          }
        }
      `}</style>
    </div>
  );
}
