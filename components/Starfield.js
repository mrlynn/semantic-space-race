'use client';

import { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

export default function Starfield({ count = 8000, radius = 5000 }) {
  const meshRef = useRef();
  const { camera } = useThree();

  // Generate random star positions in a spherical shell around origin
  // These are relative positions - we'll move the whole field to follow camera
  const positions = useMemo(() => {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i += 3) {
      // Random position on a spherical shell (like a skybox)
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      // Stars in a shell between radius and radius*1.5 for depth variation
      const r = radius + Math.random() * radius * 0.5;

      positions[i] = r * Math.sin(phi) * Math.cos(theta);
      positions[i + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i + 2] = r * Math.cos(phi);
    }
    return positions;
  }, [count, radius]);

  // Generate random star sizes and colors
  const sizes = useMemo(() => {
    const sizes = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      // Varied star sizes for depth
      sizes[i] = Math.random() * 3 + 0.5;
    }
    return sizes;
  }, [count]);

  // Generate random star colors (some stars are slightly colored)
  const colors = useMemo(() => {
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i += 3) {
      const colorType = Math.random();
      if (colorType > 0.95) {
        // Rare blue stars
        colors[i] = 0.7;
        colors[i + 1] = 0.9;
        colors[i + 2] = 1.0;
      } else if (colorType > 0.90) {
        // Rare orange stars
        colors[i] = 1.0;
        colors[i + 1] = 0.8;
        colors[i + 2] = 0.6;
      } else {
        // Most stars are white/yellow
        colors[i] = 1.0;
        colors[i + 1] = 1.0;
        colors[i + 2] = 0.9;
      }
    }
    return colors;
  }, [count]);

  useFrame(() => {
    if (meshRef.current && camera) {
      // Move starfield to always center on camera (skybox effect)
      // This makes stars appear infinitely far away
      meshRef.current.position.copy(camera.position);

      // Very slow rotation for subtle movement
      meshRef.current.rotation.y += 0.00005;
    }
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          count={count}
          array={sizes}
          itemSize={1}
        />
        <bufferAttribute
          attach="attributes-color"
          count={count}
          array={colors}
          itemSize={3}
        />
      </bufferGeometry>
      <shaderMaterial
        vertexShader={`
          attribute float size;
          attribute vec3 color;
          varying vec3 vColor;

          void main() {
            vColor = color;
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = size * (800.0 / -mvPosition.z);
            gl_Position = projectionMatrix * mvPosition;
          }
        `}
        fragmentShader={`
          varying vec3 vColor;

          void main() {
            // Create round stars with soft edges
            float distanceToCenter = distance(gl_PointCoord, vec2(0.5));
            float alpha = 1.0 - smoothstep(0.0, 0.5, distanceToCenter);

            // Add some twinkle by varying brightness
            float brightness = 0.7 + sin(gl_FragCoord.x * 0.1 + gl_FragCoord.y * 0.1) * 0.3;

            gl_FragColor = vec4(vColor * brightness, alpha * 0.9);
          }
        `}
        transparent
        depthWrite={false}
      />
    </points>
  );
}

