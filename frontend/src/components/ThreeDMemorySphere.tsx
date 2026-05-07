'use client';

import React, { useEffect, useRef, useState } from 'react';

interface Point3D {
  x: number;
  y: number;
  z: number;
  baseX: number;
  baseY: number;
  baseZ: number;
  color: string;
}

interface ThreeDMemorySphereProps {
  isSpeaking?: boolean;
}

export default function ThreeDMemorySphere({ isSpeaking = false }: ThreeDMemorySphereProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dimensions, setDimensions] = useState({ width: 400, height: 400 });
  const mouseRef = useRef({ x: 0, y: 0, isHovering: false });
  const rotationRef = useRef({ x: 0, y: 0, targetX: 0.002, targetY: 0.003 });
  const isSpeakingRef = useRef(isSpeaking);

  useEffect(() => {
    isSpeakingRef.current = isSpeaking;
  }, [isSpeaking]);

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const w = containerRef.current.clientWidth;
        const h = containerRef.current.clientHeight;
        // Fallback to safe default minimum dimensions to prevent circular layout collapse (0x0 pixels)
        const width = w > 50 ? w : 500;
        const height = h > 50 ? h : (w > 50 ? w : 500);
        setDimensions({ width, height });
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    
    // Resize observer to ensure precise resizing
    const observer = new ResizeObserver(handleResize);
    if (containerRef.current) observer.observe(containerRef.current);

    return () => {
      window.removeEventListener('resize', handleResize);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas high DPI resolution
    const dpr = window.devicePixelRatio || 1;
    canvas.width = dimensions.width * dpr;
    canvas.height = dimensions.height * dpr;
    ctx.scale(dpr, dpr);

    // Initialization of 3D points in a sphere
    const N = 120; // Number of particles
    const points: Point3D[] = [];
    const sphereRadius = Math.min(dimensions.width, dimensions.height) * 0.38;

    // Use golden ratio (Fibonacci Spiral on Sphere) for perfectly uniform spacing
    for (let i = 0; i < N; i++) {
      const phi = Math.acos(1 - 2 * (i + 0.5) / N);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;

      const x = Math.cos(theta) * Math.sin(phi) * sphereRadius;
      const y = Math.sin(theta) * Math.sin(phi) * sphereRadius;
      const z = Math.cos(phi) * sphereRadius;

      // Assign elegant purple/pink/cyan color variations
      let color = '139, 92, 246'; // Purple
      if (i % 3 === 1) color = '236, 72, 153'; // Pink
      if (i % 3 === 2) color = '6, 182, 212'; // Cyan

      points.push({
        x, y, z,
        baseX: x, baseY: y, baseZ: z,
        color
      });
    }

    const focalLength = 350;
    let animationFrameId: number;
    let time = 0;

    // Track mouse move for sphere inertia tilt
    const handleMouseMove = (e: MouseEvent) => {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) - dimensions.width / 2;
      const y = (e.clientY - rect.top) - dimensions.height / 2;
      mouseRef.current = { x, y, isHovering: true };
    };

    const handleMouseLeave = () => {
      mouseRef.current.isHovering = false;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!canvas || e.touches.length === 0) return;
      const rect = canvas.getBoundingClientRect();
      const x = (e.touches[0].clientX - rect.left) - dimensions.width / 2;
      const y = (e.touches[0].clientY - rect.top) - dimensions.height / 2;
      mouseRef.current = { x, y, isHovering: true };
    };

    window.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('touchmove', handleTouchMove);

    const render = () => {
      ctx.clearRect(0, 0, dimensions.width, dimensions.height);
      time += 1;

      const speaking = isSpeakingRef.current;

      // 1. Compute target rotation speeds based on mouse coordinates
      let rotXSpeed = speaking ? 0.008 : 0.0015;
      let rotYSpeed = speaking ? 0.012 : 0.0025;

      if (mouseRef.current.isHovering) {
        // Accelerate/tilt based on mouse distance from center
        const hoverMult = speaking ? 0.06 : 0.03;
        rotXSpeed = (mouseRef.current.y / dimensions.height) * hoverMult;
        rotYSpeed = (mouseRef.current.x / dimensions.width) * hoverMult;
      }

      // Smooth interpolation (lerping) for rotation inertia
      rotationRef.current.x += (rotXSpeed - rotationRef.current.x) * 0.08;
      rotationRef.current.y += (rotYSpeed - rotationRef.current.y) * 0.08;

      const cosX = Math.cos(rotationRef.current.x);
      const sinX = Math.sin(rotationRef.current.x);
      const cosY = Math.cos(rotationRef.current.y);
      const sinY = Math.sin(rotationRef.current.y);

      // 2. Rotate, deform (breathing effect), and project points
      const projectedPoints = points.map((p, i) => {
        // Organic 3D morphing/breathing using sine wave based on time and index
        const speedMultiplier = speaking ? 0.05 : 0.015;
        const amplitude = speaking ? 0.18 : 0.06;
        const morphFactor = 1 + Math.sin(time * speedMultiplier + i * 0.15) * amplitude;
        let x = p.baseX * morphFactor;
        let y = p.baseY * morphFactor;
        let z = p.baseZ * morphFactor;

        // Apply 3D rotation matrices
        // Y-axis rotation
        let x1 = x * cosY - z * sinY;
        let z1 = x * sinY + z * cosY;

        // X-axis rotation
        let y2 = y * cosX - z1 * sinX;
        let z2 = y * sinX + z1 * cosX;

        // Save rotated coordinates
        p.x = x1;
        p.y = y2;
        p.z = z2;

        // 3D to 2D Perspective Projection
        const scale = focalLength / (focalLength + z2);
        const screenX = x1 * scale + dimensions.width / 2;
        const screenY = y2 * scale + dimensions.height / 2;

        return {
          screenX,
          screenY,
          z: z2,
          color: p.color,
          scale
        };
      });

      // 3. Render connections (lines) between neighboring points
      // Closer points in 3D get brighter glowing lines
      const maxDistance = sphereRadius * 0.78;
      
      ctx.lineWidth = 0.8;
      for (let i = 0; i < projectedPoints.length; i++) {
        for (let j = i + 1; j < projectedPoints.length; j++) {
          const p1 = points[i];
          const p2 = points[j];

          // Compute 3D Euclidean distance
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dz = p1.z - p2.z;
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

          if (dist < maxDistance) {
            const proj1 = projectedPoints[i];
            const proj2 = projectedPoints[j];

            // Opacity is inversely proportional to distance and directly proportional to depth (foreground = brighter)
            const distRatio = 1 - dist / maxDistance;
            
            // Depth opacity based on average Z depth
            const avgZ = (proj1.z + proj2.z) / 2;
            const depthRatio = 1 - (avgZ + sphereRadius) / (sphereRadius * 2);

            const opacity = distRatio * depthRatio * 0.32;

            if (opacity > 0.01) {
              const grad = ctx.createLinearGradient(
                proj1.screenX, proj1.screenY,
                proj2.screenX, proj2.screenY
              );
              grad.addColorStop(0, `rgba(${proj1.color}, ${opacity})`);
              grad.addColorStop(1, `rgba(${proj2.color}, ${opacity})`);

              ctx.strokeStyle = grad;
              ctx.beginPath();
              ctx.moveTo(proj1.screenX, proj1.screenY);
              ctx.lineTo(proj2.screenX, proj2.screenY);
              ctx.stroke();
            }
          }
        }
      }

      // 4. Render particle nodes (glowing dots)
      projectedPoints.forEach((p) => {
        // Size scales based on depth (perspective)
        const size = Math.max(1, (1.5 - (p.z + sphereRadius) / (sphereRadius * 2)) * 3.5);
        
        // Depth opacity
        const depthRatio = 1 - (p.z + sphereRadius) / (sphereRadius * 2);
        const opacity = Math.max(0.1, depthRatio * 0.85);

        // Core particle point
        ctx.beginPath();
        ctx.arc(p.screenX, p.screenY, size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.color}, ${opacity})`;
        ctx.fill();

        // Ambient outer glow halo for foreground particles
        if (p.z < -sphereRadius * 0.2) {
          ctx.beginPath();
          ctx.arc(p.screenX, p.screenY, size * 2.8, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${p.color}, ${opacity * 0.15})`;
          ctx.fill();
        }
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, [dimensions]);

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full min-h-[300px] md:min-h-[450px] flex items-center justify-center relative cursor-grab active:cursor-grabbing select-none"
    >
      {/* Background Radial Halo Glow */}
      <div className="absolute w-[80%] h-[80%] rounded-full bg-gradient-radial from-beyond-purple/10 via-beyond-pink/5 to-transparent blur-3xl pointer-events-none -z-10" />
      <canvas 
        ref={canvasRef} 
        style={{ width: dimensions.width, height: dimensions.height }}
        className="block"
      />
    </div>
  );
}
