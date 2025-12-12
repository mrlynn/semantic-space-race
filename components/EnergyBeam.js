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
  const ringRef = useRef();
  const [scale, setScale] = useState(0.5);
  const [opacity, setOpacity] = useState(1);
  const duration = 0.3;

  useFrame((state, delta) => {
    if (opacity > 0) {
      const newScale = scale + delta * 30;
      const newOpacity = Math.max(0, opacity - delta / duration);
      setScale(newScale);
      setOpacity(newOpacity);

      if (ringRef.current) {
        ringRef.current.scale.setScalar(newScale);
      }

      if (newOpacity <= 0 && onComplete) {
        onComplete();
      }
    }
  });

  return (
    <group position={position}>
      {/* Expanding ring */}
      <mesh ref={ringRef} rotation={[Math.random() * Math.PI, Math.random() * Math.PI, 0]}>
        <ringGeometry args={[3, 4, 16]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={opacity * 0.6}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Center flash */}
      <mesh>
        <sphereGeometry args={[2, 8, 8]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={2}
          transparent
          opacity={opacity}
        />
      </mesh>

      {/* Particle burst */}
      {[...Array(8)].map((_, i) => {
        const angle = (i / 8) * Math.PI * 2;
        const distance = scale * 2;
        return (
          <mesh
            key={i}
            position={[
              Math.cos(angle) * distance,
              Math.sin(angle) * distance,
              0
            ]}
          >
            <sphereGeometry args={[0.5, 4, 4]} />
            <meshStandardMaterial
              color={color}
              emissive={color}
              emissiveIntensity={1.5}
              transparent
              opacity={opacity * 0.8}
            />
          </mesh>
        );
      })}
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

  return (
    <group position={position}>
      {/* Cone flash */}
      <mesh>
        <coneGeometry args={[2, 4, 8]} />
        <meshStandardMaterial
          color="#00ED64"
          emissive="#00ED64"
          emissiveIntensity={3}
          transparent
          opacity={opacity * 0.7}
        />
      </mesh>

      {/* Bright sphere */}
      <mesh>
        <sphereGeometry args={[1.5, 8, 8]} />
        <meshStandardMaterial
          color="#FFFFFF"
          emissive="#FFFFFF"
          emissiveIntensity={2}
          transparent
          opacity={opacity}
        />
      </mesh>
    </group>
  );
}
