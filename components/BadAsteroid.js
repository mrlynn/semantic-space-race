'use client';

import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Octahedron } from '@react-three/drei';
import * as THREE from 'three';

export default function BadAsteroid({ 
  asteroid, 
  onHit,
  themeMode = 'dark' 
}) {
  const groupRef = useRef();
  const meshRef = useRef();
  const glowRef = useRef();
  
  // Initialize position and velocity from asteroid data
  const initialPos = Array.isArray(asteroid.position) && asteroid.position.length === 3
    ? asteroid.position
    : [0, 0, 0];
  const initialVel = Array.isArray(asteroid.velocity) && asteroid.velocity.length === 3
    ? asteroid.velocity
    : [0, 0, 0];
  
  const positionRef = useRef(new THREE.Vector3(...initialPos));
  const velocityRef = useRef(new THREE.Vector3(...initialVel));
  const [hit, setHit] = useState(false);
  const [despawned, setDespawned] = useState(false);
  const opacityRef = useRef(1);
  
  const baseSize = 15; // Base size for asteroids
  const size = baseSize * (asteroid.size || 1);
  const asteroidColor = '#2C2C2C'; // Dark gray/black
  const glowColor = '#1A1A1A'; // Very dark gray for glow
  const costColor = '#FF4444'; // Red for cost indicator
  
  useFrame((state, delta) => {
    if (hit || despawned || !groupRef.current) return;

    // Check if asteroid has expired (30 seconds) - check continuously
    const now = Date.now();
    const age = now - asteroid.spawnTime;
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
        // Rotation animation (slower, more ominous than gems)
        meshRef.current.rotation.x += delta * 1.5;
        meshRef.current.rotation.y += delta * 2;
        meshRef.current.rotation.z += delta * 1;
        
        // Subtle pulsing effect (darker, less vibrant than gems)
        const pulse = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.15;
        meshRef.current.scale.setScalar(size * pulse);
        
        // Update opacity
        if (meshRef.current.material) {
          meshRef.current.material.opacity = opacityRef.current;
        }
        
        if (glowRef.current) {
          glowRef.current.position.copy(positionRef.current);
          glowRef.current.scale.setScalar(size * 1.2 * pulse);
          glowRef.current.rotation.copy(meshRef.current.rotation);
          if (glowRef.current.material) {
            glowRef.current.material.opacity = opacityRef.current * 0.2;
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
      {/* Glow effect - darker than gems */}
      <Octahedron ref={glowRef} args={[size * 1.2, 0]}>
        <meshStandardMaterial
          color={glowColor}
          emissive={glowColor}
          emissiveIntensity={0.5}
          transparent
          opacity={0.2}
        />
      </Octahedron>

      {/* Main asteroid */}
      <Octahedron 
        ref={meshRef} 
        args={[size, 0]}
        onClick={(e) => {
          e.stopPropagation();
          if (onHit && !hit) {
            setHit(true);
            onHit(asteroid);
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
          color={asteroidColor}
          emissive={asteroidColor}
          emissiveIntensity={0.3}
          metalness={0.1}
          roughness={0.8}
          transparent
          opacity={0.9}
        />
      </Octahedron>

      {/* Cost text floating above asteroid (red, warning color) */}
      <Text
        position={[0, size * 1.5, 0]}
        fontSize={size * 0.4}
        color={costColor}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.1}
        outlineColor="#001E2B"
        fontWeight="bold"
      >
        -{asteroid.cost}
      </Text>
    </group>
  );
}

