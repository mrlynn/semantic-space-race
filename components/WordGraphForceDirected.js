'use client';

import React, { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Text, Sphere, Line, Html, Billboard } from '@react-three/drei';
import * as THREE from 'three';
import Starfield from './Starfield';
import { cosineSimilarity } from '@/lib/utils';

// Force-directed graph node component - memoized for performance
const GraphNode = React.memo(function GraphNode({ word, isCurrent, isRelated, onClick, position, themeMode = 'dark' }) {
  const meshRef = useRef();
  const glowRef = useRef();

  const baseColor = isCurrent ? '#00ED64' : isRelated ? '#FFB800' : '#00684A';
  const glowColor = isCurrent ? '#00ED64' : isRelated ? '#FFB800' : '#00684A';
  const baseScale = isCurrent ? 10 : isRelated ? 8 : 6;
  const currentPosition = useRef([0, 0, 0]);

  useFrame((state) => {
    if (meshRef.current && position) {
      // Smooth position interpolation to reduce jitter
      if (Array.isArray(position) && position.length === 3) {
        const [targetX, targetY, targetZ] = position;
        const [currentX, currentY, currentZ] = currentPosition.current;
        
        // Smooth interpolation (lerp) - only update if position changed significantly
        const lerpFactor = 0.2; // Higher = faster, but can cause jitter
        const newX = currentX + (targetX - currentX) * lerpFactor;
        const newY = currentY + (targetY - currentY) * lerpFactor;
        const newZ = currentZ + (targetZ - currentZ) * lerpFactor;
        
        meshRef.current.position.set(newX, newY, newZ);
        currentPosition.current = [newX, newY, newZ];
      }

      if (isCurrent) {
        const pulse = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.15;
        meshRef.current.scale.setScalar(baseScale * pulse);
        if (glowRef.current) {
          glowRef.current.scale.setScalar(baseScale * pulse * 1.2);
        }
      }

      meshRef.current.rotation.y += 0.005;
    }
  });

  const pos = Array.isArray(position) && position.length === 3
    ? position
    : (Array.isArray(word.position) && word.position.length === 3
      ? word.position
      : [0, 0, 0]);

  return (
    <group position={pos}>
      {(isCurrent || isRelated) && (
        <Sphere ref={glowRef} args={[baseScale * 1.2, 16, 16]}>
          <meshStandardMaterial
            color={glowColor}
            emissive={glowColor}
            emissiveIntensity={isCurrent ? 0.6 : 0.3}
            transparent
            opacity={0.2}
          />
        </Sphere>
      )}

      <Sphere
        ref={meshRef}
        args={[baseScale, 32, 32]}
        onClick={onClick}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'default';
        }}
      >
        <meshStandardMaterial
          color={baseColor}
          emissive={isCurrent ? baseColor : isRelated ? glowColor : '#000000'}
          emissiveIntensity={isCurrent ? 0.5 : isRelated ? 0.25 : 0}
          metalness={0.8}
          roughness={0.2}
        />
      </Sphere>

      <Billboard position={[0, baseScale + 3, 0]}>
        <Text
          fontSize={4}
          color={isCurrent ? '#00ED64' : (themeMode === 'dark' ? '#FFFFFF' : '#001E2B')}
          anchorX="center"
          anchorY="middle"
          outlineWidth={themeMode === 'dark' ? 0.3 : 0.5}
          outlineColor={themeMode === 'dark' ? '#001E2B' : '#FFFFFF'}
          fontWeight="bold"
          strokeWidth={themeMode === 'dark' ? 0.02 : 0.1}
          strokeColor={themeMode === 'dark' ? '#001E2B' : '#FFFFFF'}
        >
          {word.label}
        </Text>
      </Billboard>
    </group>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for memoization - only re-render if position or state changes significantly
  return (
    prevProps.word.id === nextProps.word.id &&
    prevProps.isCurrent === nextProps.isCurrent &&
    prevProps.isRelated === nextProps.isRelated &&
    Math.abs((prevProps.position?.[0] || 0) - (nextProps.position?.[0] || 0)) < 1 &&
    Math.abs((prevProps.position?.[1] || 0) - (nextProps.position?.[1] || 0)) < 1 &&
    Math.abs((prevProps.position?.[2] || 0) - (nextProps.position?.[2] || 0)) < 1
  );
});

// Edge component connecting two nodes
function GraphEdge({ start, end, similarity, opacity = 0.3 }) {
  const lineRef = useRef();

  // Line thickness based on similarity
  const lineOpacity = Math.max(0.1, similarity * opacity);
  const color = similarity > 0.7 ? '#00ED64' : similarity > 0.5 ? '#FFB800' : '#00684A';

  const points = useMemo(() => {
    if (!start || !end || !Array.isArray(start) || !Array.isArray(end)) {
      return [];
    }
    return [
      new THREE.Vector3(...start),
      new THREE.Vector3(...end),
    ];
  }, [start, end]);

  if (!start || !end || !Array.isArray(start) || !Array.isArray(end)) {
    return null;
  }

  return (
    <Line
      ref={lineRef}
      points={points}
      color={color}
      lineWidth={2}
      transparent
      opacity={lineOpacity}
    />
  );
}

// Force-directed graph controller with performance optimizations
function ForceDirectedController({ words, nodePositions, setNodePositions, nodeVelocities, setNodeVelocities }) {
  const damping = 0.98; // Very high damping - almost static for readability
  const repulsionStrength = 5; // Very weak repulsion
  const attractionStrength = 0.01; // Very weak attraction
  const maxVelocity = 0.5; // Very slow movement
  const bounds = 10000;
  const frameSkip = useRef(0);
  const similarityCache = useRef(new Map()); // Cache similarity calculations
  const maxNeighbors = 15; // Fewer neighbors for stability
  const smoothingFactor = 0.2; // Smoother position updates
  const settledThreshold = 0.1; // Consider settled if velocity is very low
  const [isSettled, setIsSettled] = useState(false);

  useFrame(() => {
    // Skip frames for better performance (update every 4th frame for very smooth movement)
    frameSkip.current = (frameSkip.current + 1) % 4;
    if (frameSkip.current !== 0) return;

    if (!words.length || !nodePositions || Object.keys(nodePositions).length === 0) return;

    const newVelocities = { ...nodeVelocities };
    const newPositions = { ...nodePositions };

    // Pre-calculate distances and similarities for optimization
    const nodeDistances = new Map();

    // Calculate forces for each node (only check nearby nodes)
    words.forEach((wordA, i) => {
      if (!wordA.embedding) return;

      const posA = newPositions[wordA.id];
      if (!posA || !Array.isArray(posA) || posA.length !== 3) return;

      const velA = newVelocities[wordA.id] || { x: 0, y: 0, z: 0 };

      // Find nearest neighbors for this node
      const neighbors = [];
      words.forEach((wordB, j) => {
        if (i === j || !wordB.embedding) return;

        const posB = newPositions[wordB.id];
        if (!posB || !Array.isArray(posB) || posB.length !== 3) return;

        const dx = posB[0] - posA[0];
        const dy = posB[1] - posA[1];
        const dz = posB[2] - posA[2];
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (distance < 0.1) return;

        neighbors.push({ wordB, posB, distance, dx, dy, dz });
      });

      // Sort by distance and only use nearest neighbors
      neighbors.sort((a, b) => a.distance - b.distance);
      const nearestNeighbors = neighbors.slice(0, maxNeighbors);

      let fx = 0, fy = 0, fz = 0;

      // Apply forces from nearest neighbors only
      nearestNeighbors.forEach(({ wordB, posB, distance, dx, dy, dz }) => {
        // Cache similarity calculations
        const cacheKey = `${wordA.id}-${wordB.id}`;
        let similarity = similarityCache.current.get(cacheKey);
        
        if (similarity === undefined) {
          similarity = cosineSimilarity(wordA.embedding, wordB.embedding);
          similarityCache.current.set(cacheKey, similarity);
          // Limit cache size
          if (similarityCache.current.size > 10000) {
            const firstKey = similarityCache.current.keys().next().value;
            similarityCache.current.delete(firstKey);
          }
        }

        // Repulsion force (all nodes repel each other)
        const repulsion = repulsionStrength / (distance * distance + 100);
        fx -= (dx / distance) * repulsion;
        fy -= (dy / distance) * repulsion;
        fz -= (dz / distance) * repulsion;

        // Attraction force (similar nodes attract)
        if (similarity > 0.4) {
          const attraction = attractionStrength * similarity * Math.min(distance, 500);
          fx += (dx / distance) * attraction;
          fy += (dy / distance) * attraction;
          fz += (dz / distance) * attraction;
        }
      });

      // Update velocity with damping and capping (smoother)
      const newVx = Math.max(-maxVelocity, Math.min(maxVelocity, (velA.x + fx * 0.5) * damping));
      const newVy = Math.max(-maxVelocity, Math.min(maxVelocity, (velA.y + fy * 0.5) * damping));
      const newVz = Math.max(-maxVelocity, Math.min(maxVelocity, (velA.z + fz * 0.5) * damping));

      newVelocities[wordA.id] = {
        x: newVx,
        y: newVy,
        z: newVz,
      };

      // Check if movement is minimal (settled)
      const totalVelocity = Math.abs(newVx) + Math.abs(newVy) + Math.abs(newVz);
      if (totalVelocity < settledThreshold) {
        // Node is settled - don't update position
        return;
      }

      // Smooth position updates to reduce jitter
      const targetX = Math.max(-bounds, Math.min(bounds, posA[0] + newVx));
      const targetY = Math.max(-bounds, Math.min(bounds, posA[1] + newVy));
      const targetZ = Math.max(-bounds, Math.min(bounds, posA[2] + newVz));

      // Interpolate towards target position for smoother movement
      const newX = posA[0] + (targetX - posA[0]) * smoothingFactor;
      const newY = posA[1] + (targetY - posA[1]) * smoothingFactor;
      const newZ = posA[2] + (targetZ - posA[2]) * smoothingFactor;

      // Only update if position is valid
      if (isFinite(newX) && isFinite(newY) && isFinite(newZ)) {
        newPositions[wordA.id] = [newX, newY, newZ];
      }
    });

    setNodeVelocities(newVelocities);
    setNodePositions(newPositions);
  });

  return null;
}

// Camera controller for hopping
function CameraController({ currentNodeId, words, nodePositions, controlsRef }) {
  const { camera } = useThree();
  const targetPositionRef = useRef(null);
  const isAnimatingRef = useRef(false);

  useEffect(() => {
    if (!currentNodeId || !words.length) return;

    const currentWord = words.find(w => {
      const wordIdStr = typeof w.id === 'string' ? w.id : w.id?.toString();
      const nodeIdStr = typeof currentNodeId === 'string' ? currentNodeId : currentNodeId?.toString();
      return wordIdStr === nodeIdStr;
    });

    if (!currentWord) return;

    const currentPos = nodePositions?.[currentWord.id] || currentWord.position;
    if (!currentPos || !Array.isArray(currentPos) || currentPos.length !== 3) return;

    const [targetX, targetY, targetZ] = currentPos;
    
    // Calculate how many words are nearby to determine appropriate camera distance
    let nearbyWordCount = 0;
    const clusterDetectionRadius = 500;
    words.forEach(word => {
      const wordPos = nodePositions?.[word.id] || word.position;
      if (!wordPos || !Array.isArray(wordPos) || wordPos.length !== 3) return;
      
      const dx = wordPos[0] - targetX;
      const dy = wordPos[1] - targetY;
      const dz = wordPos[2] - targetZ;
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
    const cameraY = targetY + offsetDistance * 0.3;
    const cameraZ = targetZ + offsetDistance;

    targetPositionRef.current = [cameraX, cameraY, cameraZ];
    isAnimatingRef.current = true;
  }, [currentNodeId, words, nodePositions]);

  useFrame((state, delta) => {
    if (targetPositionRef.current && isAnimatingRef.current) {
      const [targetX, targetY, targetZ] = targetPositionRef.current;
      const currentPos = camera.position;

      const speed = 0.1;
      const dx = targetX - currentPos.x;
      const dy = targetY - currentPos.y;
      const dz = targetZ - currentPos.z;
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (distance < 1) {
        camera.position.set(targetX, targetY, targetZ);
        isAnimatingRef.current = false;
        targetPositionRef.current = null;

        if (controlsRef.current) {
          const currentWord = words.find(w => {
            const wordIdStr = typeof w.id === 'string' ? w.id : w.id?.toString();
            const nodeIdStr = typeof currentNodeId === 'string' ? currentNodeId : currentNodeId?.toString();
            return wordIdStr === nodeIdStr;
          });
          if (currentWord) {
            const currentPos = nodePositions?.[currentWord.id] || currentWord.position;
            if (currentPos) {
              controlsRef.current.target.set(currentPos[0], currentPos[1], currentPos[2]);
              controlsRef.current.update();
            }
          }
        }
      } else {
        camera.position.x += dx * speed;
        camera.position.y += dy * speed;
        camera.position.z += dz * speed;

        if (controlsRef.current) {
          controlsRef.current.update();
        }
      }
    }
  });

  return null;
}

export default function WordGraphForceDirected({
  words = [],
  currentNodeId,
  relatedWordIds = [],
  onWordClick,
  themeMode = 'dark',
}) {
  const controlsRef = useRef();
  const [nodePositions, setNodePositions] = useState({});
  const [nodeVelocities, setNodeVelocities] = useState({});

  // Initialize positions from words
  useEffect(() => {
    const initialPositions = {};
    words.forEach(word => {
      if (word.position && Array.isArray(word.position) && word.position.length === 3) {
        initialPositions[word.id] = [...word.position];
      }
    });
    setNodePositions(initialPositions);
  }, [words]);

  const filteredWords = useMemo(() => {
    return words.filter(w => {
      const pos = nodePositions[w.id] || w.position;
      return Array.isArray(pos) && pos.length === 3 && pos.every(p => typeof p === 'number' && isFinite(p));
    });
  }, [words, nodePositions]);

  // Calculate edges (connections) between similar words - optimized
  const edges = useMemo(() => {
    const edgeList = [];
    const similarityThreshold = 0.7; // Higher threshold for cleaner look
    const maxEdges = 200; // Reduced edges for cleaner visualization
    const maxEdgesPerNode = 3; // Fewer edges per node

    // Use a spatial hash or distance-based filtering to reduce comparisons
    const nodeEdgeCount = new Map();
    
    for (let i = 0; i < filteredWords.length && edgeList.length < maxEdges; i++) {
      const wordA = filteredWords[i];
      if (!wordA.embedding) continue;
      
      const edgeCountA = nodeEdgeCount.get(wordA.id) || 0;
      if (edgeCountA >= maxEdgesPerNode) continue;

      const posA = nodePositions[wordA.id] || wordA.position;
      if (!posA || !Array.isArray(posA)) continue;

      // Only check nearby nodes (within reasonable distance)
      const nearbyWords = [];
      for (let j = i + 1; j < filteredWords.length; j++) {
        const wordB = filteredWords[j];
        if (!wordB.embedding) continue;

        const posB = nodePositions[wordB.id] || wordB.position;
        if (!posB || !Array.isArray(posB)) continue;

        // Quick distance check before expensive similarity calculation
        const dx = posB[0] - posA[0];
        const dy = posB[1] - posA[1];
        const dz = posB[2] - posA[2];
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

        // Only check nodes within reasonable distance (spatial optimization)
        if (distance < 2000) {
          nearbyWords.push({ wordB, posB, distance });
        }
      }

      // Sort by distance and check nearest first
      nearbyWords.sort((a, b) => a.distance - b.distance);

      for (const { wordB, posB } of nearbyWords) {
        if (edgeList.length >= maxEdges) break;
        
        const edgeCountB = nodeEdgeCount.get(wordB.id) || 0;
        if (edgeCountB >= maxEdgesPerNode) continue;

        const similarity = cosineSimilarity(wordA.embedding, wordB.embedding);
        if (similarity > similarityThreshold) {
          edgeList.push({
            start: posA,
            end: posB,
            similarity,
          });
          nodeEdgeCount.set(wordA.id, edgeCountA + 1);
          nodeEdgeCount.set(wordB.id, edgeCountB + 1);
        }
      }
    }

    return edgeList;
  }, [filteredWords, nodePositions]);

  const cameraPosition = useMemo(() => {
    if (filteredWords.length === 0) return [0, 0, 2000];

    const positions = filteredWords.map(w => nodePositions[w.id] || w.position);
    const xs = positions.map(p => p[0]).filter(x => isFinite(x));
    const ys = positions.map(p => p[1]).filter(y => isFinite(y));
    const zs = positions.map(p => p[2]).filter(z => isFinite(z));

    if (xs.length === 0) return [0, 0, 2000];

    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const minZ = Math.min(...zs);
    const maxZ = Math.max(...zs);

    const centerX = (maxX + minX) / 2;
    const centerY = (maxY + minY) / 2;
    const centerZ = (maxZ + minZ) / 2;

    const rangeX = maxX - minX;
    const rangeY = maxY - minY;
    const rangeZ = maxZ - minZ;
    const maxRange = Math.max(rangeX, rangeY, rangeZ);
    const distance = Math.max(maxRange * 1.5, 2000);

    return [centerX, centerY, centerZ + distance];
  }, [filteredWords, nodePositions]);

  return (
    <Canvas
      camera={{
        position: cameraPosition,
        fov: 75,
        near: 0.01,
        far: 100000,
      }}
      style={{ 
        width: '100%', 
        height: '100%', 
        background: themeMode === 'dark' ? '#001E2B' : '#F5F5F5' 
      }}
    >
      <Starfield count={2000} radius={300} />
      <ambientLight intensity={0.5} />
      <pointLight position={[20, 20, 20]} color="#00ED64" intensity={1.5} />
      <pointLight position={[-20, -20, -20]} color="#00684A" intensity={1.0} />
      <pointLight position={[0, 30, 0]} color="#00ED64" intensity={0.8} />
      <directionalLight position={[10, 10, 5]} intensity={0.7} color="#FFFFFF" />
      <fog attach="fog" args={[themeMode === 'dark' ? '#001E2B' : '#F5F5F5', 1000, 10000]} />

      <ForceDirectedController
        words={filteredWords}
        nodePositions={nodePositions}
        setNodePositions={setNodePositions}
        nodeVelocities={nodeVelocities}
        setNodeVelocities={setNodeVelocities}
      />

      <CameraController
        currentNodeId={currentNodeId}
        words={filteredWords}
        nodePositions={nodePositions}
        controlsRef={controlsRef}
      />

      {/* Render edges */}
      {edges.map((edge, index) => (
        <GraphEdge
          key={`edge-${index}`}
          start={edge.start}
          end={edge.end}
          similarity={edge.similarity}
        />
      ))}

      {/* Render nodes */}
      {filteredWords.map((word) => {
        const isCurrent = word.id === currentNodeId;
        const isRelated = relatedWordIds.includes(word.id);
        const currentPos = nodePositions[word.id] || word.position;

        // Only render if position is valid
        if (!currentPos || !Array.isArray(currentPos) || currentPos.length !== 3) {
          return null;
        }

        if (!currentPos.every(p => typeof p === 'number' && isFinite(p))) {
          return null;
        }

        return (
          <GraphNode
            key={word.id}
            word={word}
            position={currentPos}
            isCurrent={isCurrent}
            isRelated={isRelated}
            onClick={() => onWordClick(word)}
            themeMode={themeMode}
          />
        );
      })}

      <OrbitControls
        ref={controlsRef}
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={50}
        maxDistance={5000}
        autoRotate={false}
        panSpeed={2.0}
        zoomSpeed={1.5}
        rotateSpeed={0.8}
        screenSpacePanning={true}
        minPolarAngle={0}
        maxPolarAngle={Math.PI}
        minAzimuthAngle={-Infinity}
        maxAzimuthAngle={Infinity}
        enableDamping={true}
        dampingFactor={0.1}
        makeDefault={true}
      />
    </Canvas>
  );
}

