'use client';

import { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * Nebula clouds for atmospheric depth
 * Subtle, professional look with MongoDB brand colors
 */
export default function Nebula({ count = 5, radius = 4000, themeMode = 'dark' }) {
  const groupRef = useRef();
  const { camera } = useThree();

  // Generate nebula cloud positions and colors
  const nebulae = useMemo(() => {
    const clouds = [];

    for (let i = 0; i < count; i++) {
      // Random position on a large sphere
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      const r = radius + Math.random() * radius * 0.3;

      const position = [
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi)
      ];

      // Color variation - MongoDB brand colors (subtle)
      const colorType = Math.random();
      let color;
      if (colorType > 0.66) {
        color = '#00684A'; // MongoDB dark green
      } else if (colorType > 0.33) {
        color = '#00ED64'; // MongoDB bright green
      } else {
        color = '#001E2B'; // Dark teal
      }

      // Random size and rotation
      const size = 300 + Math.random() * 400;
      const rotation = Math.random() * Math.PI * 2;

      clouds.push({
        id: i,
        position,
        color,
        size,
        rotation,
        opacity: 0.08 + Math.random() * 0.12 // More visible while still subtle
      });
    }

    return clouds;
  }, [count, radius]);

  useFrame((state) => {
    if (groupRef.current && camera) {
      // Move nebulae to follow camera (skybox effect)
      groupRef.current.position.copy(camera.position);

      // Very slow rotation for subtle movement
      groupRef.current.rotation.y += 0.00002;
    }
  });

  return (
    <group ref={groupRef}>
      {nebulae.map(nebula => (
        <mesh
          key={nebula.id}
          position={nebula.position}
          rotation={[0, nebula.rotation, 0]}
        >
          {/* Plane with gradient texture */}
          <planeGeometry args={[nebula.size, nebula.size]} />
          <meshBasicMaterial
            color={nebula.color}
            transparent
            opacity={nebula.opacity}
            side={THREE.DoubleSide}
            depthWrite={false}
            blending={THREE.AdditiveBlending} // Additive blending for glow effect
          />
        </mesh>
      ))}

      {/* Add some subtle particles for nebula dust */}
      <NebulaParticles count={500} radius={radius} />
    </group>
  );
}

/**
 * Dust particles within nebula clouds
 */
function NebulaParticles({ count, radius }) {
  const meshRef = useRef();

  const positions = useMemo(() => {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i += 3) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      const r = radius * 0.8 + Math.random() * radius * 0.4;

      positions[i] = r * Math.sin(phi) * Math.cos(theta);
      positions[i + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i + 2] = r * Math.cos(phi);
    }
    return positions;
  }, [count, radius]);

  const sizes = useMemo(() => {
    const sizes = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      sizes[i] = Math.random() * 1.5 + 0.3;
    }
    return sizes;
  }, [count]);

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.00003;
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
      </bufferGeometry>
      <shaderMaterial
        vertexShader={`
          attribute float size;
          varying float vSize;

          void main() {
            vSize = size;
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = size * (600.0 / -mvPosition.z);
            gl_Position = projectionMatrix * mvPosition;
          }
        `}
        fragmentShader={`
          varying float vSize;

          void main() {
            float distanceToCenter = distance(gl_PointCoord, vec2(0.5));
            float alpha = 1.0 - smoothstep(0.0, 0.5, distanceToCenter);

            // Subtle teal/green color
            vec3 color = vec3(0.0, 0.5, 0.4);
            gl_FragColor = vec4(color, alpha * 0.25);
          }
        `}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
