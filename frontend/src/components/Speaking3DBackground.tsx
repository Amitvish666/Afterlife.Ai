'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface Speaking3DBackgroundProps {
  isSpeaking: boolean;
}

export default function Speaking3DBackground({ isSpeaking }: Speaking3DBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Create Scene
    const scene = new THREE.Scene();

    // Camera
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.z = 10;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Create Particle System
    const particleCount = 1400;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    const initialPositions: Array<{ x: number; y: number; z: number }> = [];

    for (let i = 0; i < particleCount; i++) {
      // Golden ratio sphere distribution for uniform particle spreading
      const phi = Math.acos(-1 + (2 * i) / particleCount);
      const theta = Math.sqrt(particleCount * Math.PI) * phi;

      const radius = 4;
      const x = radius * Math.cos(theta) * Math.sin(phi);
      const y = radius * Math.sin(theta) * Math.sin(phi);
      const z = radius * Math.cos(phi);

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      initialPositions.push({ x, y, z });

      // Holographic purple to pink/blue colors
      colors[i * 3] = 0.5 + 0.5 * Math.sin(i * 0.05); // R
      colors[i * 3 + 1] = 0.2 + 0.3 * Math.cos(i * 0.02); // G
      colors[i * 3 + 2] = 0.8 + 0.2 * Math.sin(i * 0.01); // B
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // Material with round particles
    const createCircleTexture = () => {
      const matCanvas = document.createElement('canvas');
      matCanvas.width = 16;
      matCanvas.height = 16;
      const matContext = matCanvas.getContext('2d');
      if (matContext) {
        const gradient = matContext.createRadialGradient(8, 8, 0, 8, 8, 8);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.2, 'rgba(139, 92, 246, 0.8)');
        gradient.addColorStop(0.5, 'rgba(236, 72, 153, 0.3)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        matContext.fillStyle = gradient;
        matContext.fillRect(0, 0, 16, 16);
      }
      return new THREE.CanvasTexture(matCanvas);
    };

    const material = new THREE.PointsMaterial({
      size: 0.16,
      map: createCircleTexture(),
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      vertexColors: true,
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    // Add a glowing wireframe inner sphere for extra holographic look
    const sphereGeometry = new THREE.IcosahedronGeometry(3.8, 2);
    const sphereMaterial = new THREE.MeshBasicMaterial({
      color: 0x8b5cf6,
      wireframe: true,
      transparent: true,
      opacity: 0.08,
      blending: THREE.AdditiveBlending,
    });
    const innerSphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    scene.add(innerSphere);

    // Animation variables
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const time = clock.getElapsedTime();
      const positionAttr = geometry.attributes.position as THREE.BufferAttribute;

      // When speaking, the movement speed and intensity increase
      const speed = isSpeaking ? 3.5 : 0.8;
      const amplitude = isSpeaking ? 0.7 : 0.15;

      for (let i = 0; i < particleCount; i++) {
        const p = initialPositions[i];

        // Apply dynamic wave deformation based on time and position
        const noiseX = Math.sin(p.y * 1.5 + time * speed) * Math.cos(p.z * 1.5 + time * speed);
        const noiseY = Math.cos(p.x * 1.5 + time * speed) * Math.sin(p.z * 1.5 + time * speed);
        const noiseZ = Math.sin(p.x * 1.5 + time * speed) * Math.cos(p.y * 1.5 + time * speed);

        positionAttr.setX(i, p.x + noiseX * amplitude);
        positionAttr.setY(i, p.y + noiseY * amplitude);
        positionAttr.setZ(i, p.z + noiseZ * amplitude);
      }

      positionAttr.needsUpdate = true;

      // Slow idle rotation
      points.rotation.y = time * 0.05;
      points.rotation.x = time * 0.02;

      innerSphere.rotation.y = -time * 0.03;
      innerSphere.rotation.x = -time * 0.01;

      // Enhance wireframe opacity and particle size when speaking
      if (isSpeaking) {
        sphereMaterial.opacity = 0.14 + Math.sin(time * 10) * 0.05;
        material.size = 0.20 + Math.sin(time * 8) * 0.04;
      } else {
        sphereMaterial.opacity = 0.06;
        material.size = 0.16;
      }

      renderer.render(scene, camera);
    };

    animate();

    // Handle Resize
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    resizeObserver.observe(container);

    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      geometry.dispose();
      material.dispose();
      sphereGeometry.dispose();
      sphereMaterial.dispose();
      renderer.dispose();
    };
  }, [isSpeaking]);

  return (
    <div 
      ref={containerRef} 
      className="absolute inset-0 w-full h-full pointer-events-none z-0 opacity-40 mix-blend-screen"
    />
  );
}
