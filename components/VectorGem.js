'use client';

import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Octahedron } from '@react-three/drei';
import * as THREE from 'three';

export default function VectorGem({ 
  gem, 
  onHit,
  themeMode = 'dark'
}) {
  const groupRef = useRef();
  const meshRef = useRef();
  const glowRef = useRef();
  
  // Initialize position and velocity from gem data
  const initialPos = Array.isArray(gem.position) && gem.position.length === 3
    ? gem.position
    : [0, 0, 0];
  const initialVel = Array.isArray(gem.velocity) && gem.velocity.length === 3
    ? gem.velocity
    : [0, 0, 0];
  
  const positionRef = useRef(new THREE.Vector3(...initialPos));
  const velocityRef = useRef(new THREE.Vector3(...initialVel));
  const [hit, setHit] = useState(false);
  const [despawned, setDespawned] = useState(false);
  const opacityRef = useRef(1);
  
  const baseSize = 15; // Base size for gems
  const size = baseSize * (gem.size || 1);
  const gemColor = '#DC143C'; // Ruby Red
  const glowColor = '#FF1744'; // Bright Ruby Red for glow

  useFrame((state, delta) => {
    if (hit || despawned || !groupRef.current) return;

    // Check if gem has expired (30 seconds) - check continuously
    const now = Date.now();
    const age = now - gem.spawnTime;
    if (age >= 30000 && !despawned) {
      setDespawned(true);
      opacityRef.current = 0;
    }

    // Fade out if despawned
    if (despawned && opacityRef.current > 0) {
      opacityRef.current = Math.max(0, opacityRef.current - delta * 2);
    }

    // Update position based on velocity (frame-rate independent)
    const velocity = velocityRef.current;
    const movement = velocity.clone().multiplyScalar(delta);
    positionRef.current.add(movement);
    
    if (groupRef.current) {
      groupRef.current.position.copy(positionRef.current);
      
      if (meshRef.current) {
        // Rotation animation
        meshRef.current.rotation.x += delta * 2;
        meshRef.current.rotation.y += delta * 3;
        meshRef.current.rotation.z += delta * 1.5;
        
        // Pulsing glow effect
        const pulse = 1 + Math.sin(state.clock.elapsedTime * 4) * 0.2;
        meshRef.current.scale.setScalar(size * pulse);
        
        // Update opacity
        if (meshRef.current.material) {
          meshRef.current.material.opacity = opacityRef.current;
        }
        
        if (glowRef.current) {
          glowRef.current.position.copy(positionRef.current);
          glowRef.current.scale.setScalar(size * 1.3 * pulse);
          glowRef.current.rotation.copy(meshRef.current.rotation);
          if (glowRef.current.material) {
            glowRef.current.material.opacity = opacityRef.current * 0.3;
          }
        }
      }
    }
  });

  if (despawned && opacityRef.current <= 0) {
    return null;
  }

  if (hit) {
    return null;
  }

  return (
    <group ref={groupRef} position={positionRef.current}>
      {/* Glow effect */}
      <Octahedron ref={glowRef} args={[size * 1.3, 0]}>
        <meshStandardMaterial
          color={glowColor}
          emissive={glowColor}
          emissiveIntensity={1.5}
          transparent
          opacity={0.3}
        />
      </Octahedron>

      {/* Main gem */}
      <Octahedron 
        ref={meshRef} 
        args={[size, 0]}
        onClick={(e) => {
          e.stopPropagation();
          if (onHit && !hit) {
            setHit(true);
            // Pass the gem object so handler can extract ID
            onHit(gem);
          }
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'default';
        }}
      >
        <meshStandardMaterial
          color={gemColor}
          emissive={gemColor}
          emissiveIntensity={1.2}
          metalness={0.9}
          roughness={0.1}
          transparent
          opacity={0.95}
        />
      </Octahedron>

      {/* Reward text floating above gem */}
      <Text
        position={[0, size * 1.5, 0]}
        fontSize={size * 0.4}
        color={gemColor}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.1}
        outlineColor="#001E2B"
        fontWeight="bold"
      >
        +{gem.reward}
      </Text>
    </group>
  );
}
