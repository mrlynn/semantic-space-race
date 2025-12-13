'use client';

import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import * as THREE from 'three';

/**
 * Energy beam effect for shooting
 * Professional, subtle visual with trail particles
 */
export function EnergyBeam({ start, end, onComplete, isHit = true, color = '#00ED64' }) {
  const lineRef = useRef();
  const [progress, setProgress] = useState(0);
  const [opacity, setOpacity] = useState(1);
  const duration = 0.15; // Fast beam travel

  const beamColor = isHit ? color : '#FF3333'; // Green for hit, red for miss

  useFrame((state, delta) => {
    if (progress < 1) {
      const newProgress = Math.min(1, progress + delta / duration);
      setProgress(newProgress);

      // Fade out after reaching target
      if (newProgress >= 0.7) {
        const fadeProgress = (newProgress - 0.7) / 0.3;
        setOpacity(1 - fadeProgress);
      }

      if (newProgress >= 1 && onComplete) {
        onComplete();
      }
    }
  });

  // Interpolate beam endpoint
  const currentEnd = new THREE.Vector3().lerpVectors(
    new THREE.Vector3(...start),
    new THREE.Vector3(...end),
    progress
  );

  const points = [
    new THREE.Vector3(...start),
    currentEnd
  ];

  return (
    <group>
      {/* Main beam line */}
      <Line
        ref={lineRef}
        points={points}
        color={beamColor}
        lineWidth={3}
        transparent
        opacity={opacity * 0.8}
      />

      {/* Outer glow line */}
      <Line
        points={points}
        color={beamColor}
        lineWidth={6}
        transparent
        opacity={opacity * 0.3}
      />

      {/* Core bright line */}
      <Line
        points={points}
        color="#FFFFFF"
        lineWidth={1}
        transparent
        opacity={opacity}
      />
    </group>
  );
}

/**
 * Impact effect when beam hits target
 */
export function ImpactEffect({ position, onComplete, color = '#00ED64' }) {
  const [opacity, setOpacity] = useState(1);
  const duration = 0.15; // Much faster fade

  useFrame((state, delta) => {
    if (opacity > 0) {
      const newOpacity = Math.max(0, opacity - delta / duration);
      setOpacity(newOpacity);

      if (newOpacity <= 0 && onComplete) {
        onComplete();
      }
    }
  });

  // Minimal impact effect - just a tiny flash, no expanding shapes, no rings, no particles
  return (
    <group position={position}>
      {/* Tiny center flash only - fixed size, no scaling */}
      <mesh scale={[1, 1, 1]}>
        <sphereGeometry args={[0.5, 8, 8]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.8}
          transparent
          opacity={opacity * 0.6}
        />
      </mesh>
    </group>
  );
}

/**
 * Muzzle flash when firing from camera
 */
export function MuzzleFlash({ position, direction, onComplete }) {
  const [opacity, setOpacity] = useState(1);
  const duration = 0.1; // Very quick flash

  useFrame((state, delta) => {
    if (opacity > 0) {
      const newOpacity = Math.max(0, opacity - delta / duration);
      setOpacity(newOpacity);

      if (newOpacity <= 0 && onComplete) {
        onComplete();
      }
    }
  });

  // Disabled muzzle flash to prevent giant white shape issue
  // If needed, can be re-enabled with much smaller size
  return null;
  
  /* Original muzzle flash code - disabled
  return (
    <group position={position}>
      <mesh scale={[1, 1, 1]}>
        <coneGeometry args={[0.3, 0.6, 8]} />
        <meshStandardMaterial
          color="#00ED64"
          emissive="#00ED64"
          emissiveIntensity={1}
          transparent
          opacity={opacity * 0.3}
        />
      </mesh>
      <mesh scale={[1, 1, 1]}>
        <sphereGeometry args={[0.2, 8, 8]} />
        <meshStandardMaterial
          color="#FFFFFF"
          emissive="#FFFFFF"
          emissiveIntensity={0.8}
          transparent
          opacity={opacity * 0.4}
        />
      </mesh>
    </group>
  );
  */
}
