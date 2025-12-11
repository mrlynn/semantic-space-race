'use client';

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sphere, Text, Billboard, useGLTF } from '@react-three/drei';
import * as THREE from 'three';

// Avatar types with different colors, styles, and model paths
const AVATAR_TYPES = [
  { color: '#00ED64', glowColor: '#00ED64', name: 'Green', modelPath: '/avatars/avatar-0.glb' },
  { color: '#FFB800', glowColor: '#FFB800', name: 'Yellow', modelPath: '/avatars/avatar-1.glb' },
  { color: '#00684A', glowColor: '#00684A', name: 'Dark Green', modelPath: '/avatars/avatar-2.glb' },
  { color: '#00A8E8', glowColor: '#00A8E8', name: 'Blue', modelPath: '/avatars/avatar-3.glb' },
  { color: '#FF6B6B', glowColor: '#FF6B6B', name: 'Red', modelPath: '/avatars/avatar-4.glb' },
  { color: '#9B59B6', glowColor: '#9B59B6', name: 'Purple', modelPath: '/avatars/avatar-5.glb' },
  { color: '#F39C12', glowColor: '#F39C12', name: 'Orange', modelPath: '/avatars/avatar-6.glb' },
  { color: '#1ABC9C', glowColor: '#1ABC9C', name: 'Teal', modelPath: '/avatars/avatar-7.glb' },
];

// Generate a consistent avatar type for a player based on their ID
export function getAvatarForPlayer(playerId) {
  if (!playerId) return AVATAR_TYPES[0];
  // Use playerId to consistently assign an avatar
  const hash = playerId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return AVATAR_TYPES[hash % AVATAR_TYPES.length];
}

// Preload all avatar models
// Call this when the game starts to preload models for better performance
export function preloadAvatars() {
  AVATAR_TYPES.forEach((avatar) => {
    try {
      // Preload each avatar model
      // This will cache them so they load instantly when needed
      useGLTF.preload(avatar.modelPath);
    } catch (error) {
      // Silently fail - models may not exist yet (using fallback spheres)
      // Only log in development
      if (process.env.NODE_ENV === 'development') {
        console.debug(`Avatar model not found for preload: ${avatar.modelPath} (will use fallback)`);
      }
    }
  });
}

// Individual avatar model components - each calls useGLTF unconditionally
// This ensures React hooks rules are followed
// drei's useGLTF uses Suspense internally, so we wrap in Suspense with fallback
function AvatarModel0({ color, glowColor, meshRef }) {
  const { scene } = useGLTF('/avatars/avatar-0.glb', true);
  return <AvatarModelRenderer scene={scene} color={color} glowColor={glowColor} meshRef={meshRef} />;
}
function AvatarModel1({ color, glowColor, meshRef }) {
  const { scene } = useGLTF('/avatars/avatar-1.glb', true);
  return <AvatarModelRenderer scene={scene} color={color} glowColor={glowColor} meshRef={meshRef} />;
}
function AvatarModel2({ color, glowColor, meshRef }) {
  const { scene } = useGLTF('/avatars/avatar-2.glb', true);
  return <AvatarModelRenderer scene={scene} color={color} glowColor={glowColor} meshRef={meshRef} />;
}
function AvatarModel3({ color, glowColor, meshRef }) {
  const { scene } = useGLTF('/avatars/avatar-3.glb', true);
  return <AvatarModelRenderer scene={scene} color={color} glowColor={glowColor} meshRef={meshRef} />;
}
function AvatarModel4({ color, glowColor, meshRef }) {
  const { scene } = useGLTF('/avatars/avatar-4.glb', true);
  return <AvatarModelRenderer scene={scene} color={color} glowColor={glowColor} meshRef={meshRef} />;
}
function AvatarModel5({ color, glowColor, meshRef }) {
  const { scene } = useGLTF('/avatars/avatar-5.glb', true);
  return <AvatarModelRenderer scene={scene} color={color} glowColor={glowColor} meshRef={meshRef} />;
}
function AvatarModel6({ color, glowColor, meshRef }) {
  const { scene } = useGLTF('/avatars/avatar-6.glb', true);
  return <AvatarModelRenderer scene={scene} color={color} glowColor={glowColor} meshRef={meshRef} />;
}
function AvatarModel7({ color, glowColor, meshRef }) {
  const { scene } = useGLTF('/avatars/avatar-7.glb', true);
  return <AvatarModelRenderer scene={scene} color={color} glowColor={glowColor} meshRef={meshRef} />;
}

// Fallback sphere component
function FallbackSphere({ color, meshRef }) {
  return (
    <Sphere ref={meshRef} args={[12, 32, 32]}>
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={1.0}
        metalness={0.9}
        roughness={0.1}
      />
    </Sphere>
  );
}

// Renderer for 3D model with material updates
function AvatarModelRenderer({ scene, color, glowColor, meshRef }) {
  const clonedScene = useMemo(() => {
    if (!scene) return null;
    const clone = scene.clone();
    
    // Traverse and update materials to match avatar color
    clone.traverse((child) => {
      if (child.isMesh && child.material) {
        if (Array.isArray(child.material)) {
          child.material = child.material.map(mat => {
            const newMat = mat.clone();
            newMat.color = new THREE.Color(color);
            if (newMat.emissive) {
              newMat.emissive = new THREE.Color(glowColor);
              newMat.emissiveIntensity = 0.5;
            }
            return newMat;
          });
        } else {
          child.material = child.material.clone();
          child.material.color = new THREE.Color(color);
          if (child.material.emissive !== undefined) {
            child.material.emissive = new THREE.Color(glowColor);
            child.material.emissiveIntensity = 0.5;
          }
        }
      }
    });
    
    return clone;
  }, [scene, color, glowColor]);

  if (!clonedScene) {
    return <FallbackSphere color={color} meshRef={meshRef} />;
  }

  return (
    <primitive 
      ref={meshRef}
      object={clonedScene} 
      scale={12} // Scale model to match sphere size
    />
  );
}

// Error boundary for model loading
// Silently handles missing GLB files - this is expected when avatars haven't been added yet
class ModelErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    // Check if it's a 404 error (file not found) - this is expected
    const is404Error = error?.message?.includes('404') || 
                       error?.message?.includes('Not Found') ||
                       error?.message?.includes('fetch');
    
    // Always return error state to show fallback, but we'll suppress logging for 404s
    return { hasError: true, is404Error };
  }

  componentDidCatch(error, errorInfo) {
    // Completely silent - missing avatar files are expected
    // Only log unexpected errors (not 404s)
    const is404Error = error?.message?.includes('404') || 
                       error?.message?.includes('Not Found') ||
                       error?.message?.includes('fetch');
    
    if (!is404Error && process.env.NODE_ENV === 'development') {
      // Only log non-404 errors in development
      console.warn('Unexpected avatar loading error:', error);
    }
    // Suppress all 404 errors - they're expected when GLB files don't exist yet
  }

  render() {
    if (this.state.hasError) {
      return <FallbackSphere color={this.props.color} meshRef={this.props.meshRef} />;
    }
    return this.props.children;
  }
}

// Component to load and render a 3D model avatar with fallback
function ModelAvatar({ modelPath, color, glowColor, meshRef }) {
  // Map model path to component
  const avatarIndex = AVATAR_TYPES.findIndex(a => a.modelPath === modelPath);
  const AvatarComponent = [
    AvatarModel0, AvatarModel1, AvatarModel2, AvatarModel3,
    AvatarModel4, AvatarModel5, AvatarModel6, AvatarModel7
  ][avatarIndex];

  if (!AvatarComponent) {
    return <FallbackSphere color={color} meshRef={meshRef} />;
  }

  return (
    <ModelErrorBoundary modelPath={modelPath} color={color} meshRef={meshRef}>
      <React.Suspense fallback={<FallbackSphere color={color} meshRef={meshRef} />}>
        <AvatarComponent color={color} glowColor={glowColor} meshRef={meshRef} />
      </React.Suspense>
    </ModelErrorBoundary>
  );
}

export default function PlayerAvatar({ 
  player, 
  position, 
  isCurrentPlayer = false,
  themeMode = 'dark' 
}) {
  const meshRef = useRef();
  const glowRef = useRef();
  const avatarType = getAvatarForPlayer(player.id);
  const baseScale = 12;
  const glowScale = baseScale * 1.5;
  
  useFrame((state) => {
    if (meshRef.current) {
      // Gentle floating animation
      const baseY = position[1];
      meshRef.current.position.y = baseY + Math.sin(state.clock.elapsedTime * 2) * 2;
      
      // Slow rotation
      meshRef.current.rotation.y += 0.01;
      
      // Pulsing glow
      if (glowRef.current) {
        const pulse = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.2;
        glowRef.current.scale.setScalar(pulse);
      }
    }
  });

  return (
    <group position={position}>
      {/* Glow effect */}
      <Sphere ref={glowRef} args={[glowScale, 16, 16]}>
        <meshStandardMaterial
          color={avatarType.glowColor}
          emissive={avatarType.glowColor}
          emissiveIntensity={0.6}
          transparent
          opacity={0.3}
        />
      </Sphere>
      
      {/* Main avatar - try 3D model first, fallback to sphere */}
      <ModelAvatar
        modelPath={avatarType.modelPath}
        color={avatarType.color}
        glowColor={avatarType.glowColor}
        meshRef={meshRef}
      />
      
      {/* Player name label */}
      <Billboard position={[0, baseScale + 8, 0]}>
        <Text
          fontSize={4}
          color={themeMode === 'dark' ? '#FFFFFF' : '#001E2B'}
          anchorX="center"
          anchorY="middle"
          outlineWidth={themeMode === 'dark' ? 0.3 : 0.5}
          outlineColor={themeMode === 'dark' ? '#001E2B' : '#FFFFFF'}
          fontWeight="bold"
          strokeWidth={themeMode === 'dark' ? 0.02 : 0.1}
          strokeColor={themeMode === 'dark' ? '#001E2B' : '#FFFFFF'}
        >
          {player.nickname}
        </Text>
      </Billboard>
      
      {/* Indicator for current player */}
      {isCurrentPlayer && (
        <Sphere args={[baseScale * 0.3, 8, 8]} position={[baseScale * 0.7, baseScale * 0.7, 0]}>
          <meshStandardMaterial
            color="#00ED64"
            emissive="#00ED64"
            emissiveIntensity={2}
          />
        </Sphere>
      )}
    </group>
  );
}
