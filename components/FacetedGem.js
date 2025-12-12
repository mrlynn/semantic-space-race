'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * Faceted crystalline gem geometry for word nodes
 * Professional, elegant look with subtle light refraction
 *
 * @param {number} size - Base size of the gem
 * @param {string} color - Base color (MongoDB green variants)
 * @param {boolean} isActive - Whether this is the current/selected node
 * @param {boolean} isHighlighted - Whether this node is related/important
 * @param {number} emissiveIntensity - Glow strength (0-1, subtle for professional look)
 */
export default function FacetedGem({
  size = 1,
  color = '#00ED64',
  isActive = false,
  isHighlighted = false,
  emissiveIntensity = 0.3,
  onClick,
  onPointerOver,
  onPointerOut,
  children
}) {
  const gemRef = useRef();
  const innerGlowRef = useRef();
  const outerGlowRef = useRef();

  // Rotation and animation
  useFrame((state) => {
    if (gemRef.current) {
      // Slow, elegant rotation
      gemRef.current.rotation.y += 0.003;
      gemRef.current.rotation.x += 0.001;

      if (isActive) {
        // Subtle pulse for active nodes
        const pulse = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.08;
        gemRef.current.scale.setScalar(pulse);

        // Inner glow pulse
        if (innerGlowRef.current) {
          const glowPulse = 0.8 + Math.sin(state.clock.elapsedTime * 2) * 0.2;
          innerGlowRef.current.material.opacity = glowPulse * 0.4;
        }
      }

      if (outerGlowRef.current && (isActive || isHighlighted)) {
        // Subtle outer glow rotation
        outerGlowRef.current.rotation.y -= 0.002;
        outerGlowRef.current.rotation.z += 0.001;
      }
    }
  });

  // Calculate sizes for layers
  const baseSize = size;
  const innerSize = baseSize * 0.5;
  const outerGlowSize = baseSize * 1.3;

  // Determine colors based on state
  const gemColor = isActive ? '#00ED64' : isHighlighted ? '#FFB800' : color;
  const emissiveColor = gemColor;
  const intensity = isActive ? emissiveIntensity * 1.5 : isHighlighted ? emissiveIntensity * 1.2 : emissiveIntensity;

  return (
    <group ref={gemRef}>
      {/* Outer glow ring (only for active/highlighted) */}
      {(isActive || isHighlighted) && (
        <mesh ref={outerGlowRef}>
          <torusGeometry args={[outerGlowSize, 0.1, 8, 24]} />
          <meshStandardMaterial
            color={gemColor}
            emissive={gemColor}
            emissiveIntensity={0.6}
            transparent
            opacity={0.2}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* Main faceted crystal - Icosahedron for elegant geometry */}
      <mesh
        onClick={onClick}
        onPointerOver={onPointerOver}
        onPointerOut={onPointerOut}
      >
        <icosahedronGeometry args={[baseSize, 0]} />
        <meshStandardMaterial
          color={gemColor}
          emissive={emissiveColor}
          emissiveIntensity={intensity}
          metalness={0.3}
          roughness={0.2}
          transparent
          opacity={0.85}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Inner core glow - smaller sphere for depth */}
      <mesh ref={innerGlowRef}>
        <icosahedronGeometry args={[innerSize, 1]} />
        <meshStandardMaterial
          color={gemColor}
          emissive={emissiveColor}
          emissiveIntensity={intensity * 2}
          transparent
          opacity={0.3}
        />
      </mesh>

      {/* Wireframe overlay for faceted look */}
      <lineSegments>
        <edgesGeometry args={[new THREE.IcosahedronGeometry(baseSize, 0)]} />
        <lineBasicMaterial
          color={gemColor}
          transparent
          opacity={0.4}
          linewidth={1}
        />
      </lineSegments>

      {/* Children (typically Text label) */}
      {children}
    </group>
  );
}
