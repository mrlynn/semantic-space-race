'use client';

import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * Asteroids-style triangle ship that follows the camera
 * Classic retro-futurism aesthetic with modern glow effects
 */
export default function PlayerShip({
  color = '#00ED64',
  scale = 1,
  offset = { x: 0, y: -1.2, z: -2 }, // Position relative to camera - bottom center of screen
  showThrusters = true,
  themeMode = 'dark',
  onPositionUpdate = null // Callback to report ship position for shooting
}) {
  const shipGroupRef = useRef();
  const thrusterRef = useRef();
  const { camera } = useThree();

  // Banking state for smooth turning animations
  const bankingRef = useRef({ current: 0, target: 0 });
  const lastCameraRotation = useRef(new THREE.Quaternion());

  useFrame((state, delta) => {
    if (!shipGroupRef.current) return;

    // Position ship relative to camera (always in front and at bottom center)
    const shipPosition = new THREE.Vector3(offset.x, offset.y, offset.z);
    shipPosition.applyQuaternion(camera.quaternion);
    shipPosition.add(camera.position);
    shipGroupRef.current.position.copy(shipPosition);

    // Report ship position for shooting system
    if (onPositionUpdate) {
      onPositionUpdate(shipPosition);
    }

    // Rotate ship to match camera direction
    shipGroupRef.current.quaternion.copy(camera.quaternion);

    // Calculate banking (roll) based on camera rotation change
    const currentRotation = camera.quaternion.clone();
    const rotationDelta = currentRotation.angleTo(lastCameraRotation.current);

    // Determine direction of turn
    const euler1 = new THREE.Euler().setFromQuaternion(lastCameraRotation.current);
    const euler2 = new THREE.Euler().setFromQuaternion(currentRotation);
    const yawDelta = euler2.y - euler1.y;

    // Set banking target based on turn direction
    bankingRef.current.target = THREE.MathUtils.clamp(yawDelta * 10, -0.3, 0.3);

    // Smooth interpolation to banking target
    bankingRef.current.current = THREE.MathUtils.lerp(
      bankingRef.current.current,
      bankingRef.current.target,
      delta * 5
    );

    // Apply banking rotation
    shipGroupRef.current.rotateZ(bankingRef.current.current);

    // Update last rotation
    lastCameraRotation.current.copy(currentRotation);

    // Thruster pulse animation
    if (thrusterRef.current && showThrusters) {
      const pulse = Math.sin(state.clock.elapsedTime * 15) * 0.3 + 0.7;
      thrusterRef.current.scale.setScalar(pulse);
      thrusterRef.current.material.opacity = pulse * 0.8;
    }
  });

  const size = 0.12 * scale;

  return (
    <group ref={shipGroupRef}>
      {/* Main ship hull - sleek arrow shape */}
      <group>
        {/* Center body - elongated diamond */}
        <mesh position={[0, 0.1, 0]}>
          <coneGeometry args={[size * 0.8, size * 3, 4]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={0.4}
            metalness={0.9}
            roughness={0.1}
          />
        </mesh>

        {/* Nose cone - sharp point */}
        <mesh position={[0, size * 1.7, 0]}>
          <coneGeometry args={[size * 0.3, size * 0.8, 6]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={0.6}
            metalness={0.95}
            roughness={0.05}
          />
        </mesh>

        {/* Left wing */}
        <mesh position={[-size * 1.2, -size * 0.5, 0]} rotation={[0, 0, Math.PI / 6]}>
          <boxGeometry args={[size * 1.5, size * 0.15, size * 0.1]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={0.3}
            metalness={0.85}
            roughness={0.15}
          />
        </mesh>

        {/* Right wing */}
        <mesh position={[size * 1.2, -size * 0.5, 0]} rotation={[0, 0, -Math.PI / 6]}>
          <boxGeometry args={[size * 1.5, size * 0.15, size * 0.1]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={0.3}
            metalness={0.85}
            roughness={0.15}
          />
        </mesh>

        {/* Cockpit canopy - glass dome */}
        <mesh position={[0, size * 0.5, 0.02]}>
          <sphereGeometry args={[size * 0.4, 12, 12]} />
          <meshStandardMaterial
            color="#00FFFF"
            emissive="#00FFFF"
            emissiveIntensity={0.8}
            metalness={0.1}
            roughness={0.1}
            transparent
            opacity={0.6}
          />
        </mesh>

        {/* Energy core - pulsing center */}
        <mesh position={[0, 0, 0.03]}>
          <sphereGeometry args={[size * 0.25, 8, 8]} />
          <meshStandardMaterial
            color="#FFFFFF"
            emissive={color}
            emissiveIntensity={1.2}
            transparent
            opacity={0.8}
          />
        </mesh>

        {/* Wing tip lights - left */}
        <mesh position={[-size * 2, -size * 0.5, 0.02]}>
          <sphereGeometry args={[size * 0.15, 6, 6]} />
          <meshStandardMaterial
            color="#FF0000"
            emissive="#FF0000"
            emissiveIntensity={2}
          />
        </mesh>

        {/* Wing tip lights - right */}
        <mesh position={[size * 2, -size * 0.5, 0.02]}>
          <sphereGeometry args={[size * 0.15, 6, 6]} />
          <meshStandardMaterial
            color="#00FF00"
            emissive="#00FF00"
            emissiveIntensity={2}
          />
        </mesh>
      </group>

      {/* Engine thrusters - enhanced */}
      {showThrusters && (
        <group position={[0, -size * 1.8, 0]}>
          {/* Left engine */}
          <group position={[-size * 0.6, 0, 0]}>
            {/* Engine housing */}
            <mesh>
              <cylinderGeometry args={[size * 0.2, size * 0.15, size * 0.3, 8]} />
              <meshStandardMaterial
                color="#00684A"
                metalness={0.9}
                roughness={0.2}
              />
            </mesh>
            {/* Thruster flame */}
            <mesh ref={thrusterRef}>
              <coneGeometry args={[size * 0.15, size * 0.5, 8]} />
              <meshStandardMaterial
                color="#FFB800"
                emissive="#FFB800"
                emissiveIntensity={2}
                transparent
                opacity={0.8}
              />
            </mesh>
          </group>

          {/* Right engine */}
          <group position={[size * 0.6, 0, 0]}>
            {/* Engine housing */}
            <mesh>
              <cylinderGeometry args={[size * 0.2, size * 0.15, size * 0.3, 8]} />
              <meshStandardMaterial
                color="#00684A"
                metalness={0.9}
                roughness={0.2}
              />
            </mesh>
            {/* Thruster flame */}
            <mesh>
              <coneGeometry args={[size * 0.15, size * 0.5, 8]} />
              <meshStandardMaterial
                color="#FFB800"
                emissive="#FFB800"
                emissiveIntensity={2}
                transparent
                opacity={0.8}
              />
            </mesh>
          </group>

          {/* Engine glow trails */}
          <mesh position={[0, -size * 0.4, 0]}>
            <boxGeometry args={[size * 1.4, size * 0.8, size * 0.05]} />
            <meshStandardMaterial
              color="#FFB800"
              emissive="#FFB800"
              emissiveIntensity={1.5}
              transparent
              opacity={0.3}
            />
          </mesh>
        </group>
      )}

      {/* Shield ring effect */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <torusGeometry args={[size * 2.5, size * 0.08, 8, 32]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.6}
          transparent
          opacity={0.2}
        />
      </mesh>

      {/* Hexagonal shield grid */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -0.01]}>
        <circleGeometry args={[size * 2.3, 6]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.3}
          transparent
          opacity={0.1}
          wireframe={true}
        />
      </mesh>
    </group>
  );
}
