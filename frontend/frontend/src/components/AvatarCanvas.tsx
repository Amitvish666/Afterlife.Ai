'use client';

import { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { 
  OrbitControls, 
  useGLTF, 
  Html,
  Environment,
  ContactShadows,
  Float
} from '@react-three/drei';
import * as THREE from 'three';
import { LipSyncState, createLipSync } from '@/lib/lipSync';
import { EmotionData, analyzeEmotion } from '@/lib/emotionEngine';

// Avatar component that handles 3D model and animations
interface AvatarProps {
  isTalking: boolean;
  text: string;
  emotion?: EmotionData;
}

function HumanAvatar({ isTalking, text, emotion }: AvatarProps) {
  const groupRef = useRef<THREE.Group>(null);
  const headGroupRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Mesh>(null);
  const leftEyeRef = useRef<THREE.Mesh>(null);
  const rightEyeRef = useRef<THREE.Mesh>(null);
  const mouthRef = useRef<THREE.Mesh>(null);
  const leftEyebrowRef = useRef<THREE.Mesh>(null);
  const rightEyebrowRef = useRef<THREE.Mesh>(null);

  const [lipState, setLipState] = useState<LipSyncState>({
    mouthOpen: 0,
    mouthWide: 0,
    lipTension: 0,
  });

  // Create lip sync controller
  const lipSync = useMemo(() => createLipSync(), []);

  // Update lip sync when isTalking changes
  useEffect(() => {
    lipSync.setOnUpdate(setLipState);
    if (isTalking) {
      lipSync.start();
    } else {
      lipSync.stop();
    }
    return () => {
      lipSync.stop();
    };
  }, [isTalking, lipSync]);

  // Analyze emotion from text
  const emotionData = useMemo(() => {
    return analyzeEmotion(text || '');
  }, [text]);

  // Animation frame
  useFrame((state) => {
    if (!groupRef.current) return;

    const t = state.clock.getElapsedTime();

    // Idle breathing animation
    const breathe = Math.sin(t * 0.8) * 0.02;
    if (bodyRef.current) {
      bodyRef.current.scale.y = 1 + breathe;
    }

    // Head subtle movement
    if (headGroupRef.current) {
      headGroupRef.current.rotation.y = Math.sin(t * 0.3) * 0.05;
      headGroupRef.current.rotation.x = Math.sin(t * 0.2) * 0.02;
    }

    // Eye blinking
    const blinkFrequency = 0.1 + (emotionData?.intensity || 0) * 0.05;
    const shouldBlink = Math.sin(t * blinkFrequency * 10) > 0.98;
    const blinkScale = shouldBlink ? 0.1 : 1;
    
    if (leftEyeRef.current) {
      leftEyeRef.current.scale.y = blinkScale;
    }
    if (rightEyeRef.current) {
      rightEyeRef.current.scale.y = blinkScale;
    }

    // Mouth animation (lip sync)
    if (mouthRef.current) {
      // Scale mouth open based on lip sync
      mouthRef.current.scale.y = 0.1 + lipState.mouthOpen * 0.8;
      mouthRef.current.scale.x = 0.5 + lipState.mouthWide * 0.5;
      
      // Mouth position adjustment for different shapes
      mouthRef.current.position.z = -0.08 + lipState.mouthOpen * 0.02;
    }

    // Eyebrow movement based on emotion
    if (leftEyebrowRef.current && rightEyebrowRef.current) {
      const browRaise = emotionData?.eyebrowRaise || 0;
      leftEyebrowRef.current.position.y = 0.18 + browRaise * 0.03;
      rightEyebrowRef.current.position.y = 0.18 + browRaise * 0.03;
    }
  });

  // Skin material
  const skinMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: '#e0c0a8',
      roughness: 0.6,
      metalness: 0.0,
    });
  }, []);

  // Hair material
  const hairMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: '#3d2817',
      roughness: 0.8,
      metalness: 0.0,
    });
  }, []);

  // Eye material
  const eyeMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: '#2d1f14',
      roughness: 0.2,
      metalness: 0.1,
    });
  }, []);

  // White of eye
  const eyeWhiteMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: '#ffffff',
      roughness: 0.1,
      metalness: 0.0,
    });
  }, []);

  // Iris color (brown)
  const irisMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: '#4a3520',
      roughness: 0.3,
      metalness: 0.1,
    });
  }, []);

  // Pupil (black)
  const pupilMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: '#000000',
      roughness: 0.1,
      metalness: 0.0,
    });
  }, []);

  // Clothing material
  const clothingMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: '#2a4858',
      roughness: 0.9,
      metalness: 0.0,
    });
  }, []);

  return (
    <group ref={groupRef} position={[0, -0.5, 0]}>
      {/* Body/Torso */}
      <mesh ref={bodyRef} position={[0, -0.8, 0]} material={clothingMaterial}>
        <cylinderGeometry args={[0.35, 0.4, 0.8, 32]} />
      </mesh>

      {/* Neck */}
      <mesh position={[0, -0.15, 0]} material={skinMaterial}>
        <cylinderGeometry args={[0.1, 0.12, 0.2, 16]} />
      </mesh>

      {/* Head */}
      <group ref={headGroupRef} position={[0, 0.3, 0]}>
        {/* Face base */}
        <mesh material={skinMaterial}>
          <sphereGeometry args={[0.28, 32, 32]} />
        </mesh>

        {/* Hair */}
        <mesh position={[0, 0.1, -0.05]} material={hairMaterial}>
          <sphereGeometry args={[0.29, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        </mesh>

        {/* Left Eye White */}
        <mesh position={[-0.09, 0.05, 0.22]} material={eyeWhiteMaterial}>
          <sphereGeometry args={[0.04, 16, 16]} />
        </mesh>

        {/* Right Eye White */}
        <mesh position={[0.09, 0.05, 0.22]} material={eyeWhiteMaterial}>
          <sphereGeometry args={[0.04, 16, 16]} />
        </mesh>

        {/* Left Iris */}
        <mesh position={[-0.09, 0.05, 0.25]} material={irisMaterial}>
          <circleGeometry args={[0.025, 16]} />
        </mesh>

        {/* Right Iris */}
        <mesh position={[0.09, 0.05, 0.25]} material={irisMaterial}>
          <circleGeometry args={[0.025, 16]} />
        </mesh>

        {/* Left Pupil */}
        <mesh position={[-0.09, 0.05, 0.26]} material={pupilMaterial}>
          <circleGeometry args={[0.012, 16]} />
        </mesh>

        {/* Right Pupil */}
        <mesh position={[0.09, 0.05, 0.26]} material={pupilMaterial}>
          <circleGeometry args={[0.012, 16]} />
        </mesh>

        {/* Left Eyebrow */}
        <mesh ref={leftEyebrowRef} position={[-0.09, 0.18, 0.2]} material={hairMaterial}>
          <boxGeometry args={[0.08, 0.015, 0.02]} />
        </mesh>

        {/* Right Eyebrow */}
        <mesh ref={rightEyebrowRef} position={[0.09, 0.18, 0.2]} material={hairMaterial}>
          <boxGeometry args={[0.08, 0.015, 0.02]} />
        </mesh>

        {/* Nose */}
        <mesh position={[0, -0.02, 0.26]} material={skinMaterial}>
          <sphereGeometry args={[0.025, 16, 16]} />
        </mesh>

        {/* Mouth */}
        <mesh ref={mouthRef} position={[0, -0.1, 0.22]} material={skinMaterial}>
          <sphereGeometry args={[0.05, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        </mesh>

        {/* Left Ear */}
        <mesh position={[-0.28, 0.05, 0]} material={skinMaterial}>
          <sphereGeometry args={[0.04, 16, 16]} />
        </mesh>

        {/* Right Ear */}
        <mesh position={[0.28, 0.05, 0]} material={skinMaterial}>
          <sphereGeometry args={[0.04, 16, 16]} />
        </mesh>
      </group>

      {/* Shoulders */}
      <mesh position={[-0.4, -0.55, 0]} rotation={[0, 0, 0.3]} material={clothingMaterial}>
        <capsuleGeometry args={[0.12, 0.3, 8, 16]} />
      </mesh>
      <mesh position={[0.4, -0.55, 0]} rotation={[0, 0, -0.3]} material={clothingMaterial}>
        <capsuleGeometry args={[0.12, 0.3, 8, 16]} />
      </mesh>
    </group>
  );
}

// Loading fallback
function Loader() {
  return (
    <Html center>
      <div className="flex flex-col items-center">
        <div className="w-12 h-12 border-4 border-beyond-purple/30 border-t-beyond-purple rounded-full animate-spin" />
        <p className="mt-4 text-surface-400">Loading avatar...</p>
      </div>
    </Html>
  );
}

// Main AvatarCanvas component
interface AvatarCanvasProps {
  isTalking: boolean;
  text: string;
  showControls?: boolean;
}

export default function AvatarCanvas({ isTalking, text, showControls = false }: AvatarCanvasProps) {
  return (
    <div className="w-full h-full min-h-[400px]">
      <Canvas
        camera={{ position: [0, 0, 3], fov: 50 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.6} />
        <spotLight 
          position={[5, 5, 5]} 
          angle={0.3} 
          penumbra={1} 
          intensity={1}
          castShadow
        />
        <pointLight position={[-5, 5, 5]} intensity={0.5} />
        
        {/* Environment for better reflections */}
        <Environment preset="city" />

        {/* Floating animation wrapper */}
        <Float
          speed={1}
          rotationIntensity={0.1}
          floatIntensity={0.2}
        >
          <Suspense fallback={<Loader />}>
            <HumanAvatar 
              isTalking={isTalking} 
              text={text}
            />
          </Suspense>
        </Float>

        {/* Contact shadow */}
        <ContactShadows 
          position={[0, -1.3, 0]} 
          opacity={0.4} 
          scale={3} 
          blur={2} 
          far={4} 
        />

        {/* Camera controls (optional) */}
        {showControls && (
          <OrbitControls 
            enableZoom={true}
            enablePan={false}
            minDistance={2}
            maxDistance={5}
            minPolarAngle={Math.PI / 4}
            maxPolarAngle={Math.PI / 1.5}
          />
        )}
      </Canvas>
    </div>
  );
}

// Need Suspense for async components
import { Suspense } from 'react';
