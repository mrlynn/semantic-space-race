'use client';

import { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import Starfield from './Starfield';
import Nebula from './Nebula';
import ShootingSystem from './ShootingSystem';
import Crosshair from './Crosshair';
import VectorGem from './VectorGem';
import BadAsteroid from './BadAsteroid';
import FacetedGem from './FacetedGem';
import PlayerShip from './PlayerShip';

function WordNode({ word, isCurrent, isRelated, onClick, themeMode = 'dark' }) {
  // MongoDB brand colors with enhanced visuals
  const baseColor = isCurrent ? '#00ED64' : isRelated ? '#FFB800' : '#00684A';
  const baseScale = isCurrent ? 12 : isRelated ? 10 : 8;

  // Ensure position is a valid array
  const pos = Array.isArray(word.position) && word.position.length === 3
    ? word.position
    : [0, 0, 0];

  return (
    <group position={pos}>
      {/* Faceted Gem - replaces spheres */}
      <FacetedGem
        size={baseScale}
        color={baseColor}
        isActive={isCurrent}
        isHighlighted={isRelated}
        emissiveIntensity={isCurrent ? 0.4 : isRelated ? 0.3 : 0.2}
        onClick={onClick}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'default';
        }}
      >
        {/* Word label */}
        <Text
          position={[0, baseScale + 3, 0]}
          fontSize={3}
          color={isCurrent ? '#00ED64' : (themeMode === 'dark' ? '#FFFFFF' : '#001E2B')}
          anchorX="center"
          anchorY="middle"
          outlineWidth={themeMode === 'dark' ? 0.2 : 0.4}
          outlineColor={themeMode === 'dark' ? '#001E2B' : '#FFFFFF'}
          strokeWidth={themeMode === 'dark' ? 0.02 : 0.08}
          strokeColor={themeMode === 'dark' ? '#001E2B' : '#FFFFFF'}
        >
          {word.label}
        </Text>
      </FacetedGem>
    </group>
  );
}

function WordGraph({ words, currentNodeId, relatedWordIds, onWordClick, themeMode = 'dark' }) {
  console.log('🟢 WordGraph rendering', words.length, 'words');
  
  if (words.length === 0) {
    console.warn('🔴 WordGraph: No words to render!');
    return null;
  }
  
  console.log('🟢 WordGraph: About to render', words.length, 'WordNode components');
  
  return (
    <>
      {words.map((word, index) => {
        if (index < 5) {
          console.log(`🟢 WordGraph: Creating WordNode ${index} for "${word.label}" at [${word.position.join(', ')}]`);
        }
        return (
          <WordNode
            key={word.id}
            word={word}
            isCurrent={word.id === currentNodeId}
            isRelated={relatedWordIds?.includes(word.id)}
            onClick={() => onWordClick(word)}
            themeMode={themeMode}
          />
        );
      })}
    </>
  );
}

// Navigation controls helper component
function NavigationHelper({ onControlsReady, controlsRef, cameraRef }) {
  const { camera } = useThree();

  useEffect(() => {
    if (!camera || !controlsRef.current) return;

    cameraRef.current = camera;

    const controls = {
      zoomIn: () => {
        if (controlsRef.current) {
          const controls = controlsRef.current;
          const direction = new THREE.Vector3();
          camera.getWorldDirection(direction);
          camera.position.add(direction.multiplyScalar(50));
          controls.update();
        }
      },
      zoomOut: () => {
        if (controlsRef.current) {
          const controls = controlsRef.current;
          const direction = new THREE.Vector3();
          camera.getWorldDirection(direction);
          camera.position.add(direction.multiplyScalar(-50));
          controls.update();
        }
      },
      moveUp: () => {
        if (controlsRef.current) {
          camera.position.y += 30;
          controlsRef.current.target.y += 30;
          controlsRef.current.update();
        }
      },
      moveDown: () => {
        if (controlsRef.current) {
          camera.position.y -= 30;
          controlsRef.current.target.y -= 30;
          controlsRef.current.update();
        }
      },
      moveLeft: () => {
        if (controlsRef.current) {
          const direction = new THREE.Vector3();
          camera.getWorldDirection(direction);
          const left = new THREE.Vector3(-direction.z, 0, direction.x).normalize();
          camera.position.add(left.multiplyScalar(30));
          controlsRef.current.target.add(left.multiplyScalar(30));
          controlsRef.current.update();
        }
      },
      moveRight: () => {
        if (controlsRef.current) {
          const direction = new THREE.Vector3();
          camera.getWorldDirection(direction);
          const right = new THREE.Vector3(direction.z, 0, -direction.x).normalize();
          camera.position.add(right.multiplyScalar(30));
          controlsRef.current.target.add(right.multiplyScalar(30));
          controlsRef.current.update();
        }
      },
      moveForward: () => {
        if (controlsRef.current) {
          const direction = new THREE.Vector3();
          camera.getWorldDirection(direction);
          direction.y = 0; // Keep movement horizontal
          direction.normalize();
          camera.position.add(direction.multiplyScalar(50));
          controlsRef.current.target.add(direction.multiplyScalar(50));
          controlsRef.current.update();
        }
      },
      moveBackward: () => {
        if (controlsRef.current) {
          const direction = new THREE.Vector3();
          camera.getWorldDirection(direction);
          direction.y = 0; // Keep movement horizontal
          direction.normalize();
          camera.position.add(direction.multiplyScalar(-50));
          controlsRef.current.target.add(direction.multiplyScalar(-50));
          controlsRef.current.update();
        }
      },
      reset: () => {
        if (controlsRef.current && cameraRef.current) {
          // Reset to initial camera position
          camera.position.set(0, 0, 2000);
          controlsRef.current.target.set(0, 0, 0);
          controlsRef.current.update();
        }
      },
    };

    if (onControlsReady) {
      onControlsReady(controls);
    }
  }, [camera, controlsRef, cameraRef, onControlsReady]);

  return null;
}

// Camera controller component to handle hopping
function CameraController({ currentNodeId, words, controlsRef }) {
  const { camera } = useThree();
  const targetPositionRef = useRef(null);
  const isAnimatingRef = useRef(false);

  useEffect(() => {
    if (!currentNodeId || !words.length) {
      console.log('🟡 CameraController: No currentNodeId or words, skipping hop', { currentNodeId, wordCount: words.length });
      return;
    }

    // Find the current word - try both string and ObjectId comparison
    const currentWord = words.find(w => {
      const wordIdStr = typeof w.id === 'string' ? w.id : w.id?.toString();
      const nodeIdStr = typeof currentNodeId === 'string' ? currentNodeId : currentNodeId?.toString();
      return wordIdStr === nodeIdStr;
    });
    
    if (!currentWord) {
      console.warn('🔴 CameraController: Word not found in words array', {
        currentNodeId,
        wordIds: words.slice(0, 3).map(w => w.id),
        wordLabels: words.slice(0, 3).map(w => w.label)
      });
      return;
    }
    
    if (!currentWord.position || !Array.isArray(currentWord.position) || currentWord.position.length !== 3) {
      console.warn('🔴 CameraController: Word has invalid position', {
        label: currentWord.label,
        position: currentWord.position
      });
      return;
    }

    const targetPos = currentWord.position;
    const [targetX, targetY, targetZ] = targetPos;

    // Calculate camera position - offset from the word to view it nicely
    // Position camera slightly above and behind the word
    
    // Calculate how many words are nearby to determine appropriate camera distance
    let nearbyWordCount = 0;
    const clusterDetectionRadius = 500;
    words.forEach(word => {
      if (!word.position || !Array.isArray(word.position) || word.position.length !== 3) return;
      
      const dx = word.position[0] - targetX;
      const dy = word.position[1] - targetY;
      const dz = word.position[2] - targetZ;
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
      
      if (distance < clusterDetectionRadius && distance > 0.1) {
        nearbyWordCount++;
      }
    });
    
    // Increase camera distance based on nearby word density
    const baseOffsetDistance = 200;
    const clusterOffset = Math.min(300, nearbyWordCount * 40);
    const offsetDistance = baseOffsetDistance + clusterOffset;
    
    const cameraX = targetX;
    const cameraY = targetY + offsetDistance * 0.3; // Slightly above
    const cameraZ = targetZ + offsetDistance; // Behind the word

    targetPositionRef.current = [cameraX, cameraY, cameraZ];
    isAnimatingRef.current = true;

    console.log('🟢 CameraController: Hopping to word:', currentWord.label, 'at', targetPos, 'camera will be at', [cameraX, cameraY, cameraZ]);
  }, [currentNodeId, words]);

  useFrame((state, delta) => {
    if (targetPositionRef.current && isAnimatingRef.current) {
      const [targetX, targetY, targetZ] = targetPositionRef.current;
      const currentPos = camera.position;
      
      // Smooth interpolation (easing)
      const speed = 0.1;
      const dx = targetX - currentPos.x;
      const dy = targetY - currentPos.y;
      const dz = targetZ - currentPos.z;
      
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
      
      if (distance < 1) {
        // Close enough, snap to position
        camera.position.set(targetX, targetY, targetZ);
        isAnimatingRef.current = false;
        targetPositionRef.current = null;
        
        // Update controls target to look at the word, but allow free panning after
        if (controlsRef.current) {
          const currentWord = words.find(w => w.id === currentNodeId);
          if (currentWord && currentWord.position) {
            controlsRef.current.target.set(
              currentWord.position[0],
              currentWord.position[1],
              currentWord.position[2]
            );
            // Update controls to allow free movement after hop
            controlsRef.current.update();
          }
        }
      } else {
        // Smoothly move towards target
        camera.position.x += dx * speed;
        camera.position.y += dy * speed;
        camera.position.z += dz * speed;
        
        // Update controls during animation
        if (controlsRef.current) {
          controlsRef.current.update();
        }
      }
    }
  });

  return null;
}

export default function WordGraph3D({
  words = [],
  currentNodeId,
  relatedWordIds = [],
  onWordClick,
  vectorGems = [],
  onGemHit = null,
  badAsteroids = [],
  onBadAsteroidHit = null,
  themeMode = 'dark',
  onCameraControlsReady = null,
}) {
  const controlsRef = useRef();
  const cameraRef = useRef();
  const [shipPosition, setShipPosition] = useState(null);
  
  console.log('🔵 WordGraph3D rendered with', words.length, 'words');
  
  // Don't return null - always render the Canvas so we can see the starfield
  // and debug what's happening
  
  // Log first word structure
  if (words.length > 0) {
    console.log('🔵 First word structure:', {
      id: words[0].id,
      label: words[0].label,
      position: words[0].position,
      hasPosition: !!words[0].position,
      positionType: typeof words[0].position,
      isArray: Array.isArray(words[0].position)
    });
  }
  
  const filteredWords = useMemo(() => {
    console.log('🔵 WordGraph3D: Filtering words, input count:', words.length);
    
    // Filter out words with invalid positions
    const validWords = words.filter(w => {
      const pos = w.position;
      const isValid = Array.isArray(pos) && 
             pos.length === 3 && 
             pos.every(p => typeof p === 'number' && isFinite(p));
      
      if (!isValid) {
        console.warn('🔴 WordGraph3D: Invalid word position:', w.label, pos, {
          isArray: Array.isArray(pos),
          length: pos?.length,
          types: pos?.map(p => typeof p)
        });
      }
      
      return isValid;
    });
    
    console.log('🔵 WordGraph3D: Valid words after filtering:', validWords.length, 'out of', words.length);
    
    if (validWords.length === 0 && words.length > 0) {
      console.error('🔴 WordGraph3D: All words have invalid positions!', words.slice(0, 3).map(w => ({
        label: w.label,
        position: w.position,
        positionType: typeof w.position,
        isArray: Array.isArray(w.position)
      })));
    } else if (validWords.length < words.length) {
      console.warn(`🔴 WordGraph3D: ${words.length - validWords.length} words have invalid positions`);
    }
    
    if (validWords.length > 0) {
      console.log('🔵 WordGraph3D: Sample valid words:', validWords.slice(0, 3).map(w => ({
        label: w.label,
        position: w.position,
        id: w.id
      })));
    }
    
    return validWords;
  }, [words]);

  // Calculate camera position to view all nodes
  const cameraPosition = useMemo(() => {
    if (filteredWords.length === 0) {
      console.warn('🔴 WordGraph3D: No valid words to display, using default camera position');
      // Default camera position that allows viewing the scene
      return [0, 0, 2000];
    }
    
    // Find bounding box of all nodes
    const positions = filteredWords.map(w => w.position);
    const xs = positions.map(p => p[0]).filter(x => isFinite(x));
    const ys = positions.map(p => p[1]).filter(y => isFinite(y));
    const zs = positions.map(p => p[2]).filter(z => isFinite(z));
    
    if (xs.length === 0 || ys.length === 0 || zs.length === 0) {
      console.warn('🔴 WordGraph3D: No valid positions found');
      return [0, 0, 100];
    }
    
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const minZ = Math.min(...zs);
    const maxZ = Math.max(...zs);
    
    const centerX = (maxX + minX) / 2;
    const centerY = (maxY + minY) / 2;
    const centerZ = (maxZ + minZ) / 2;
    
    // Position camera to view the entire scene
    const rangeX = maxX - minX;
    const rangeY = maxY - minY;
    const rangeZ = maxZ - minZ;
    const maxRange = Math.max(rangeX, rangeY, rangeZ);
    
    // Position camera further back to see the full distribution
    // Use a distance that ensures we can see everything
    const distance = Math.max(maxRange * 1.5, 2000);
    
    const camPos = [centerX, centerY, centerZ + distance];
    
    console.log('🔵 WordGraph3D: Camera position calculated', {
      wordCount: filteredWords.length,
      bounds: { minX, maxX, minY, maxY, minZ, maxZ },
      center: [centerX, centerY, centerZ],
      ranges: { rangeX, rangeY, rangeZ },
      maxRange,
      distance,
      cameraPos: camPos
    });
    
    return camPos;
  }, [filteredWords]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <Canvas
        camera={{ 
          position: cameraPosition, 
          fov: 75,
          near: 0.01, // Allow extremely close viewing
          far: 100000, // Very large but finite value (Infinity can cause rendering issues)
        }}
        style={{ 
          width: '100%', 
          height: '100%', 
          background: themeMode === 'dark' ? '#001E2B' : '#F5F5F5' 
        }}
      >
      {/* Nebula clouds - atmospheric depth */}
      <Nebula count={8} radius={4000} themeMode={themeMode} />

      {/* Starfield background */}
      <Starfield count={1000} radius={5000} />
      
      {/* Enhanced lighting */}
      <ambientLight intensity={0.3} />
      <pointLight position={[20, 20, 20]} color="#00ED64" intensity={1.2} />
      <pointLight position={[-20, -20, -20]} color="#00684A" intensity={0.8} />
      <pointLight position={[0, 30, 0]} color="#00ED64" intensity={0.6} />
      <directionalLight position={[10, 10, 5]} intensity={0.5} color="#FFFFFF" />
      
      {/* Fog for depth - adjusted for much larger scene, lighter fog for navigation */}
      <fog attach="fog" args={[themeMode === 'dark' ? '#001E2B' : '#F5F5F5', 500, 8000]} />

      <NavigationHelper
        onControlsReady={onCameraControlsReady}
        controlsRef={controlsRef}
        cameraRef={cameraRef}
      />

      <CameraController
        currentNodeId={currentNodeId}
        words={filteredWords}
        controlsRef={controlsRef}
      />
      
      {/* Debug indicator when no words */}
      {filteredWords.length === 0 && (
        <Text
          position={[0, 0, 0]}
          fontSize={20}
          color="#FF0000"
          anchorX="center"
          anchorY="middle"
        >
          No words to display! Check console.
        </Text>
      )}
      
      <WordGraph
        words={filteredWords}
        currentNodeId={currentNodeId}
        relatedWordIds={relatedWordIds}
        onWordClick={onWordClick}
        themeMode={themeMode}
      />
      
      {/* Render Vector Gems */}
      {vectorGems.map(gem => {
        const now = Date.now();
        if (gem.hitBy || (now - gem.spawnTime) >= 30000) return null;
        return (
          <VectorGem
            key={gem.id}
            gem={gem}
            onHit={onGemHit}
            themeMode={themeMode}
          />
        );
      })}

      {/* Render Bad Asteroids */}
      {badAsteroids && badAsteroids.map(asteroid => {
        const now = Date.now();
        if (asteroid.hitBy || (now - asteroid.spawnTime) >= 30000) return null;
        return (
          <BadAsteroid
            key={asteroid.id}
            asteroid={asteroid}
            onHit={onBadAsteroidHit}
            themeMode={themeMode}
          />
        );
      })}

      {/* Player Ship - Asteroids-style triangle at bottom center */}
      <PlayerShip
        color="#00ED64"
        scale={1.2}
        offset={{ x: 0, y: -1.2, z: -2 }}
        showThrusters={true}
        themeMode={themeMode}
        onPositionUpdate={setShipPosition}
      />

      {/* Shooting System - fires from ship position */}
      <ShootingSystem
        words={filteredWords}
        onWordHit={onWordClick}
        vectorGems={vectorGems}
        onGemHit={onGemHit}
        badAsteroids={badAsteroids}
        onBadAsteroidHit={onBadAsteroidHit}
        enabled={true}
        themeMode={themeMode}
        shipPosition={shipPosition}
      />

      <OrbitControls
        ref={controlsRef}
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={0.1} // Allow zooming in extremely close
        maxDistance={Infinity} // No maximum distance limit - can zoom out forever
        autoRotate={false}
        panSpeed={5.0} // Much faster panning for navigation
        zoomSpeed={3.0} // Much faster zooming
        rotateSpeed={1.0} // Smooth rotation
        // Allow free movement - no target constraint
        // Pan with right-click or middle mouse, rotate with right-click (left is for shooting)
        screenSpacePanning={false} // Pan in world space, not screen space
        // Full rotation freedom
        minPolarAngle={0} // Allow looking straight up
        maxPolarAngle={Math.PI} // Allow looking straight down
        minAzimuthAngle={-Infinity} // No horizontal rotation limit
        maxAzimuthAngle={Infinity} // No horizontal rotation limit
        // No distance limits - can move anywhere
        enableDamping={true} // Smooth movement
        dampingFactor={0.05}
        // Remove any target constraints - allow free panning anywhere
        // Don't constrain to a target - allow free movement through space
        makeDefault={true}
        mouseButtons={{
          LEFT: -1,                   // Disable left button (used for shooting)
          MIDDLE: THREE.MOUSE.DOLLY,  // Middle button/wheel for zoom
          RIGHT: THREE.MOUSE.ROTATE,  // Right button for rotation
        }}
      />

      {/* Post-processing effects - subtle bloom */}
      <EffectComposer>
        <Bloom
          intensity={0.3}
          luminanceThreshold={0.6}
          luminanceSmoothing={0.9}
          mipmapBlur={true}
          radius={0.5}
        />
      </EffectComposer>
    </Canvas>
    <Crosshair themeMode={themeMode} />
    </div>
  );
}

