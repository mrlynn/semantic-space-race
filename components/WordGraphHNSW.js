'use client';

import React, { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Text, Sphere, Line, Billboard } from '@react-three/drei';
import * as THREE from 'three';
import Starfield from './Starfield';
import { cosineSimilarity } from '@/lib/utils';

// Semantic Proximity Controller - adjusts positions based on semantic similarity
function SemanticProximityController({ words, positions, setPositions, enabled = true, strength = 0.4 }) {
  const frameSkip = useRef(0);
  const similarityCache = useRef(new Map());
  const iterationCount = useRef(0);
  
  // Pre-calculate similarity matrix for performance (only for high-similarity pairs)
  const similarityMatrix = useMemo(() => {
    if (!enabled || words.length === 0) return null;
    
    const matrix = new Map();
    const minSimilarity = 0.4; // Only cache similarities above this threshold
    
    words.forEach((wordA, i) => {
      if (!wordA.embedding) return;
      const row = new Map();
      
      words.forEach((wordB, j) => {
        if (i === j || !wordB.embedding) {
          row.set(j, i === j ? 1 : 0);
          return;
        }
        
        // Check cache first
        const cacheKey = `${wordA.id}-${wordB.id}`;
        const reverseKey = `${wordB.id}-${wordA.id}`;
        if (similarityCache.current.has(cacheKey)) {
          const sim = similarityCache.current.get(cacheKey);
          if (sim >= minSimilarity) {
            row.set(j, sim);
          }
          return;
        }
        
        const sim = cosineSimilarity(wordA.embedding, wordB.embedding);
        similarityCache.current.set(cacheKey, sim);
        similarityCache.current.set(reverseKey, sim);
        
        // Only store if above threshold to save memory
        if (sim >= minSimilarity) {
          row.set(j, sim);
        }
      });
      matrix.set(i, row);
    });
    
    return matrix;
  }, [words, enabled]);

  useFrame(() => {
    if (!enabled || !similarityMatrix || words.length === 0 || !positions || Object.keys(positions).length === 0) return;
    
    // Skip frames for performance (update every 4th frame for better performance)
    frameSkip.current = (frameSkip.current + 1) % 4;
    if (frameSkip.current !== 0) return;
    
    // Gradually reduce strength over time for stability (convergence)
    iterationCount.current++;
    const convergenceFactor = Math.max(0.5, 1 - (iterationCount.current / 1000)); // Stabilize after ~4000 frames
    const effectiveStrength = strength * convergenceFactor;
    
    const newPositions = { ...positions };
    const damping = 0.12; // How much to adjust per frame (lower = smoother)
    const minSimilarity = 0.4; // Only adjust for words with similarity > 0.4
    const maxDistance = 2500; // Maximum distance to consider for attraction
    const maxNeighbors = 20; // Limit number of neighbors to consider per word for performance
    
    // Calculate forces for each word
    words.forEach((wordA, i) => {
      if (!wordA.embedding || !positions[wordA.id]) return;
      
      const posA = positions[wordA.id];
      if (!Array.isArray(posA) || posA.length !== 3) return;
      
      let fx = 0, fy = 0, fz = 0;
      const row = similarityMatrix.get(i);
      if (!row) return;
      
      // Collect neighbors with their similarities and distances
      const neighbors = [];
      words.forEach((wordB, j) => {
        if (i === j || !wordB.embedding || !positions[wordB.id]) return;
        
        const posB = positions[wordB.id];
        if (!Array.isArray(posB) || posB.length !== 3) return;
        
        const similarity = row.get(j) || 0;
        if (similarity < minSimilarity) return; // Skip low similarity pairs
        
        // Calculate distance
        const dx = posB[0] - posA[0];
        const dy = posB[1] - posA[1];
        const dz = posB[2] - posA[2];
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
        
        if (distance < 0.1 || distance > maxDistance) return; // Skip too close or too far
        
        neighbors.push({ wordB, j, similarity, distance, dx, dy, dz });
      });
      
      // Sort by similarity and only process top neighbors for performance
      neighbors.sort((a, b) => b.similarity - a.similarity);
      const topNeighbors = neighbors.slice(0, maxNeighbors);
      
      // Apply semantic attraction forces to top neighbors
      topNeighbors.forEach(({ similarity, distance, dx, dy, dz }) => {
        // Attraction force: stronger for more similar words
        // Target distance based on similarity (more similar = closer)
        const targetDistance = (1 - similarity) * 400 + 150; // Range: 150-550
        const distanceError = distance - targetDistance;
        
        // Spring-like force (stronger for high similarity)
        const forceStrength = similarity * similarity * effectiveStrength; // Square similarity for emphasis
        const force = (distanceError / distance) * forceStrength;
        
        fx += (dx / distance) * force;
        fy += (dy / distance) * force;
        fz += (dz / distance) * force;
      });
      
      // Apply damping and update position
      if (Math.abs(fx) > 0.01 || Math.abs(fy) > 0.01 || Math.abs(fz) > 0.01) {
        newPositions[wordA.id] = [
          posA[0] + fx * damping,
          posA[1] + fy * damping,
          posA[2] + fz * damping,
        ];
      }
    });
    
    // Update positions (only if there were changes)
    setPositions(newPositions);
  });

  return null;
}

// HNSW Node component with hub styling
const HNSWNode = React.memo(function HNSWNode({ 
  word, 
  isCurrent, 
  isRelated, 
  isHub, 
  layer, 
  onClick, 
  position,
  isHovered,
  onHubHover,
  showLabel = true,
  cameraDistance = 0
}) {
  const meshRef = useRef();
  const glowRef = useRef();

  // Hub nodes are larger and brighter
  const baseScale = isHub ? 12 : (isCurrent ? 10 : isRelated ? 8 : 6); // Reduced sizes for less clutter
  const baseColor = isCurrent ? '#00ED64' : isHub ? '#FFB800' : isRelated ? '#FFB800' : '#00684A';
  const glowColor = isCurrent ? '#00ED64' : isHub ? '#FFB800' : isRelated ? '#FFB800' : '#00684A';

  useFrame((state) => {
    if (meshRef.current && position) {
      if (Array.isArray(position) && position.length === 3) {
        meshRef.current.position.set(position[0], position[1], position[2]);
      }

      if (isCurrent) {
        const pulse = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.15;
        meshRef.current.scale.setScalar(baseScale * pulse);
        if (glowRef.current) {
          glowRef.current.scale.setScalar(baseScale * pulse * 1.1);
        }
      } else if (isHub) {
        // Hub nodes have a subtle pulsing glow, enhanced when hovered
        const glow = 1 + Math.sin(state.clock.elapsedTime * 2) * (isHovered ? 0.15 : 0.08);
        if (glowRef.current) {
          glowRef.current.scale.setScalar(baseScale * (isHovered ? 1.4 : 1.2) * glow);
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

  // Calculate label scale based on distance (larger when closer)
  const labelScale = cameraDistance > 0 
    ? Math.max(0.5, Math.min(1.5, 2000 / cameraDistance))
    : 1;

  return (
    <group position={pos}>
      {/* Enhanced glow for hubs and current/related nodes - significantly reduced opacity for clarity */}
      {(isCurrent || isRelated || isHub) && (
        <Sphere ref={glowRef} args={[baseScale * 1.1, 16, 16]}>
          <meshStandardMaterial
            color={glowColor}
            emissive={glowColor}
            emissiveIntensity={isCurrent ? 0.5 : isHub ? (isHovered ? 0.5 : 0.25) : 0.2}
            transparent
            opacity={isHub ? (isHovered ? 0.2 : 0.12) : 0.1}
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
          if (isHub && onHubHover) {
            onHubHover(word.id);
          }
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'default';
          if (isHub && onHubHover) {
            onHubHover(null);
          }
        }}
      >
        <meshStandardMaterial
          color={baseColor}
          emissive={isCurrent ? baseColor : isHub ? glowColor : isRelated ? glowColor : '#000000'}
          emissiveIntensity={isCurrent ? 1.2 : isHub ? 0.8 : isRelated ? 0.6 : 0}
          metalness={0.8}
          roughness={0.2}
        />
      </Sphere>

      {/* Layer indicator ring for hubs with animation - reduced opacity */}
      {isHub && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[baseScale * 1.5, baseScale * 1.6, 32]} />
          <meshBasicMaterial color="#FFB800" transparent opacity={0.25} />
        </mesh>
      )}
      
      {/* Layer plane indicator (subtle visual cue) - reduced opacity */}
      {layer === 'top' && (
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -baseScale * 0.5, 0]}>
          <circleGeometry args={[baseScale * 0.8, 16]} />
          <meshBasicMaterial color="#FFB800" transparent opacity={0.08} />
        </mesh>
      )}

      {/* Only show labels for important nodes or when close to camera */}
      {showLabel && (
        <Billboard position={[0, baseScale + 6, 0]}>
          <Text
            fontSize={(isHub ? 7 : isCurrent ? 6.5 : isRelated ? 6 : 5.5) * labelScale}
            color={isCurrent ? '#00ED64' : isHub ? '#FFB800' : isRelated ? '#FFB800' : '#FFFFFF'}
            anchorX="center"
            anchorY="middle"
            outlineWidth={1.5}
            outlineColor="#000000"
            fontWeight="bold"
            strokeWidth={0.05}
            strokeColor="#001E2B"
            maxWidth={200}
          >
            {word.label}
          </Text>
        </Billboard>
      )}
    </group>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.word.id === nextProps.word.id &&
    prevProps.isCurrent === nextProps.isCurrent &&
    prevProps.isRelated === nextProps.isRelated &&
    prevProps.isHub === nextProps.isHub &&
    prevProps.layer === nextProps.layer &&
    prevProps.isHovered === nextProps.isHovered &&
    prevProps.showLabel === nextProps.showLabel &&
    Math.abs((prevProps.position?.[0] || 0) - (nextProps.position?.[0] || 0)) < 1 &&
    Math.abs((prevProps.position?.[1] || 0) - (nextProps.position?.[1] || 0)) < 1 &&
    Math.abs((prevProps.position?.[2] || 0) - (nextProps.position?.[2] || 0)) < 1 &&
    Math.abs((prevProps.cameraDistance || 0) - (nextProps.cameraDistance || 0)) < 100
  );
});

// Connection edge component with type-based styling - memoized for performance
const HNSWEdge = React.memo(function HNSWEdge({ start, end, connectionType, similarity, opacity = 0.3, cameraDistance = 0 }) {
  if (!start || !end || !Array.isArray(start) || !Array.isArray(end)) {
    return null;
  }

  // Further reduced opacity for less visual clutter, especially for local connections
  const baseOpacity = connectionType === 'local' ? 0.15 : connectionType === 'cross-layer' ? 0.3 : 0.4;
  const lineOpacity = Math.max(0.03, similarity * baseOpacity * opacity);
  
  // Long-range connections (between hubs) are thicker and brighter
  const lineWidth = connectionType === 'long-range' ? 2.5 : connectionType === 'cross-layer' ? 2 : 1;
  const color = connectionType === 'long-range' 
    ? '#FFB800' 
    : connectionType === 'cross-layer' 
    ? '#00ED64' 
    : similarity > 0.7 
    ? '#00ED64' 
    : similarity > 0.5 
    ? '#FFB800' 
    : '#00684A';

  const points = useMemo(() => [
    new THREE.Vector3(...start),
    new THREE.Vector3(...end),
  ], [start, end]);

  // Subtle pulsing animation for long-range connections - reduced intensity
  const lineRef = useRef();
  useFrame((state) => {
    if (lineRef.current && connectionType === 'long-range') {
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 1.5) * 0.04; // Further reduced pulse
      if (lineRef.current.material) {
        lineRef.current.material.opacity = lineOpacity * pulse;
      }
    }
  });

  // Fade out very distant local connections
  const distanceFade = cameraDistance > 2000 && connectionType === 'local' 
    ? Math.max(0.1, 1 - (cameraDistance - 2000) / 3000)
    : 1;

  return (
    <Line
      ref={lineRef}
      points={points}
      color={color}
      lineWidth={lineWidth}
      transparent
      opacity={lineOpacity * distanceFade}
    />
  );
}, (prevProps, nextProps) => {
  // Memo comparison - only re-render if positions or type change significantly
  return (
    prevProps.connectionType === nextProps.connectionType &&
    Math.abs(prevProps.similarity - nextProps.similarity) < 0.05 &&
    Math.abs((prevProps.start?.[0] || 0) - (nextProps.start?.[0] || 0)) < 1 &&
    Math.abs((prevProps.start?.[1] || 0) - (nextProps.start?.[1] || 0)) < 1 &&
    Math.abs((prevProps.start?.[2] || 0) - (nextProps.start?.[2] || 0)) < 1 &&
    Math.abs((prevProps.end?.[0] || 0) - (nextProps.end?.[0] || 0)) < 1 &&
    Math.abs((prevProps.end?.[1] || 0) - (nextProps.end?.[1] || 0)) < 1 &&
    Math.abs((prevProps.end?.[2] || 0) - (nextProps.end?.[2] || 0)) < 1 &&
    Math.abs((prevProps.cameraDistance || 0) - (nextProps.cameraDistance || 0)) < 200
  );
});

// Navigation path component showing greedy search path
function NavigationPath({ path, isVisible }) {
  if (!isVisible || !path || path.length < 2) return null;

  const pathPoints = useMemo(() => {
    return path.map(pos => new THREE.Vector3(...pos));
  }, [path]);

  return (
    <Line
      points={pathPoints}
      color="#00ED64"
      lineWidth={4}
      transparent
      opacity={0.8}
      dashed
      dashScale={10}
      dashSize={2}
      gapSize={1}
    />
  );
}

// Node renderer with label culling based on importance and camera distance
function NodeRenderer({ 
  words, 
  adjustedPositions, 
  currentNodeId, 
  relatedWordIds, 
  hubs, 
  nodeLayers, 
  hoveredHub, 
  onWordClick, 
  onHubHover 
}) {
  const { camera } = useThree();
  const [visibleLabels, setVisibleLabels] = useState(new Set());

  // Update visible labels based on camera distance and importance
  useFrame(() => {
    const newVisibleLabels = new Set();
    const cameraPos = camera.position;

    words.forEach(word => {
      const isCurrent = word.id === currentNodeId;
      const isRelated = relatedWordIds.includes(word.id);
      const isHub = hubs.has(word.id);
      const currentPos = adjustedPositions[word.id] || word.position;

      if (!currentPos || !Array.isArray(currentPos) || currentPos.length !== 3) return;

      // Always show labels for important nodes
      if (isCurrent || isRelated || isHub) {
        newVisibleLabels.add(word.id);
        return;
      }

      // For other nodes, only show labels if close to camera
      const distToCamera = Math.sqrt(
        Math.pow(currentPos[0] - cameraPos.x, 2) +
        Math.pow(currentPos[1] - cameraPos.y, 2) +
        Math.pow(currentPos[2] - cameraPos.z, 2)
      );

      // Show label if within 1500 units of camera
      if (distToCamera < 1500) {
        newVisibleLabels.add(word.id);
      }
    });

    // Only update if changed (to avoid unnecessary re-renders)
    if (visibleLabels.size !== newVisibleLabels.size || 
        Array.from(visibleLabels).some(id => !newVisibleLabels.has(id))) {
      setVisibleLabels(newVisibleLabels);
    }
  });

  return (
    <>
      {words.map((word) => {
        const isCurrent = word.id === currentNodeId;
        const isRelated = relatedWordIds.includes(word.id);
        const isHub = hubs.has(word.id);
        const layer = nodeLayers[word.id] || 'bottom';
        const currentPos = adjustedPositions[word.id] || word.position;

        if (!currentPos || !Array.isArray(currentPos) || currentPos.length !== 3) {
          return null;
        }

        if (!currentPos.every(p => typeof p === 'number' && isFinite(p))) {
          return null;
        }

        // Calculate camera distance for label scaling
        const cameraPos = camera.position;
        const distToCamera = Math.sqrt(
          Math.pow(currentPos[0] - cameraPos.x, 2) +
          Math.pow(currentPos[1] - cameraPos.y, 2) +
          Math.pow(currentPos[2] - cameraPos.z, 2)
        );

        const showLabel = visibleLabels.has(word.id);

        return (
          <HNSWNode
            key={word.id}
            word={word}
            position={currentPos}
            isCurrent={isCurrent}
            isRelated={isRelated}
            isHub={isHub}
            layer={layer}
            isHovered={hoveredHub === word.id}
            onClick={() => onWordClick(word)}
            onHubHover={isHub ? onHubHover : undefined}
            showLabel={showLabel}
            cameraDistance={distToCamera}
          />
        );
      })}
    </>
  );
}

// Connections renderer component with camera-aware culling
function ConnectionsRenderer({ connections, adjustedPositions, hoveredHub }) {
  const { camera } = useThree();

  return (
    <>
      {connections.map((edge, index) => {
        // Highlight connections to/from hovered hub
        const isHighlighted = hoveredHub && (edge.wordAId === hoveredHub || edge.wordBId === hoveredHub);
        
        // Get adjusted positions if available
        const startPos = adjustedPositions[edge.wordAId] || edge.start;
        const endPos = adjustedPositions[edge.wordBId] || edge.end;
        
        // Simple distance-based LOD: skip very distant connections
        const midPoint = [
          (startPos[0] + endPos[0]) / 2,
          (startPos[1] + endPos[1]) / 2,
          (startPos[2] + endPos[2]) / 2,
        ];
        const cameraPos = camera.position;
        const distToCamera = Math.sqrt(
          Math.pow(midPoint[0] - cameraPos.x, 2) +
          Math.pow(midPoint[1] - cameraPos.y, 2) +
          Math.pow(midPoint[2] - cameraPos.z, 2)
        );
        
        // Always show long-range and cross-layer, but cull distant local connections more aggressively
        if (edge.connectionType === 'local' && distToCamera > 2500 && !isHighlighted) {
          return null;
        }
        
        return (
          <HNSWEdge
            key={`edge-${edge.wordAId}-${edge.wordBId}-${index}`}
            start={startPos}
            end={endPos}
            connectionType={edge.connectionType}
            similarity={edge.similarity}
            opacity={isHighlighted ? 0.6 : 0.15} // Further reduced base opacity
            cameraDistance={distToCamera}
          />
        );
      })}
    </>
  );
}

// Camera controller for hopping - only animates on node changes, respects user input
function CameraController({ currentNodeId, words, nodePositions, controlsRef }) {
  const { camera } = useThree();
  const targetPositionRef = useRef(null);
  const isAnimatingRef = useRef(false);
  const lastNodeIdRef = useRef(null);
  const userInteractingRef = useRef(false);
  const interactionTimeoutRef = useRef(null);

  // Detect user interaction with controls
  useEffect(() => {
    if (!controlsRef.current) return;

    const controls = controlsRef.current;
    
    const handleStart = () => {
      userInteractingRef.current = true;
      // Stop any ongoing animation when user starts interacting
      isAnimatingRef.current = false;
      targetPositionRef.current = null;
      
      // Clear any pending timeout
      if (interactionTimeoutRef.current) {
        clearTimeout(interactionTimeoutRef.current);
      }
    };

    const handleEnd = () => {
      // Wait a bit after user stops interacting before allowing auto-animation again
      if (interactionTimeoutRef.current) {
        clearTimeout(interactionTimeoutRef.current);
      }
      interactionTimeoutRef.current = setTimeout(() => {
        userInteractingRef.current = false;
      }, 500); // 500ms delay after user stops interacting
    };

    // Listen to control events
    controls.addEventListener('start', handleStart);
    controls.addEventListener('end', handleEnd);

    return () => {
      controls.removeEventListener('start', handleStart);
      controls.removeEventListener('end', handleEnd);
      if (interactionTimeoutRef.current) {
        clearTimeout(interactionTimeoutRef.current);
      }
    };
  }, [controlsRef]);

  useEffect(() => {
    // Only animate if node actually changed and user is not interacting
    if (!currentNodeId || !words.length || userInteractingRef.current) {
      return;
    }

    // Check if node actually changed
    if (lastNodeIdRef.current === currentNodeId) {
      return; // Same node, don't re-animate
    }

    lastNodeIdRef.current = currentNodeId;

    const currentWord = words.find(w => {
      const wordIdStr = typeof w.id === 'string' ? w.id : w.id?.toString();
      const nodeIdStr = typeof currentNodeId === 'string' ? currentNodeId : currentNodeId?.toString();
      return wordIdStr === nodeIdStr;
    });

    if (!currentWord) return;

    const currentPos = nodePositions?.[currentWord.id] || currentWord.position;
    if (!currentPos || !Array.isArray(currentPos) || currentPos.length !== 3) return;

    const [targetX, targetY, targetZ] = currentPos;
    const offsetDistance = 100;
    const cameraX = targetX;
    const cameraY = targetY + offsetDistance * 0.3;
    const cameraZ = targetZ + offsetDistance;

    targetPositionRef.current = [cameraX, cameraY, cameraZ];
    isAnimatingRef.current = true;
  }, [currentNodeId, words, nodePositions]);

  useFrame((state, delta) => {
    // Don't animate if user is interacting
    if (userInteractingRef.current) {
      isAnimatingRef.current = false;
      targetPositionRef.current = null;
      return;
    }

    if (targetPositionRef.current && isAnimatingRef.current) {
      const [targetX, targetY, targetZ] = targetPositionRef.current;
      const currentPos = camera.position;

      const speed = 0.1;
      const dx = targetX - currentPos.x;
      const dy = targetY - currentPos.y;
      const dz = targetZ - currentPos.z;
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (distance < 1) {
        // Animation complete - set final position and stop
        camera.position.set(targetX, targetY, targetZ);
        isAnimatingRef.current = false;
        targetPositionRef.current = null;

        // Only update controls target once at the end, then let user control freely
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
        // Smoothly interpolate towards target
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

export default function WordGraphHNSW({
  words = [],
  currentNodeId,
  relatedWordIds = [],
  onWordClick,
  semanticProximityEnabled = true,
  semanticProximityStrength = 0.4,
}) {
  const controlsRef = useRef();
  const [hubs, setHubs] = useState(new Set());
  const [connections, setConnections] = useState([]);
  const [nodeLayers, setNodeLayers] = useState({});
  const [navigationPath, setNavigationPath] = useState(null);
  const [showPath, setShowPath] = useState(false);
  const [hoveredHub, setHoveredHub] = useState(null);
  const [semanticPositions, setSemanticPositions] = useState({});

  // Filter valid words
  const filteredWords = useMemo(() => {
    return words.filter(w => {
      const pos = w.position;
      return Array.isArray(pos) && pos.length === 3 && pos.every(p => typeof p === 'number' && isFinite(p));
    });
  }, [words]);

  // Initialize semantic positions from word positions
  useEffect(() => {
    if (filteredWords.length === 0) return;
    
    const initialPositions = {};
    filteredWords.forEach(word => {
      if (word.position && Array.isArray(word.position) && word.position.length === 3) {
        initialPositions[word.id] = [...word.position];
      }
    });
    
    // Only update if positions changed significantly
    const hasChanges = Object.keys(initialPositions).length !== Object.keys(semanticPositions).length ||
      Object.keys(initialPositions).some(id => {
        const oldPos = semanticPositions[id];
        const newPos = initialPositions[id];
        if (!oldPos) return true;
        const dx = oldPos[0] - newPos[0];
        const dy = oldPos[1] - newPos[1];
        const dz = oldPos[2] - newPos[2];
        return Math.sqrt(dx * dx + dy * dy + dz * dz) > 100;
      });
    
    if (hasChanges) {
      setSemanticPositions(initialPositions);
    }
  }, [filteredWords]);

  // Hub detection algorithm
  useEffect(() => {
    if (filteredWords.length === 0) return;

    const similarityThreshold = 0.5;
    const connectionCounts = new Map();
    const connectionMap = new Map();

    // Calculate connections for each word
    filteredWords.forEach((wordA, i) => {
      if (!wordA.embedding) return;
      
      const connections = [];
      filteredWords.forEach((wordB, j) => {
        if (i === j || !wordB.embedding) return;
        
        const similarity = cosineSimilarity(wordA.embedding, wordB.embedding);
        if (similarity > similarityThreshold) {
          connections.push({ wordB, similarity });
          connectionCounts.set(wordA.id, (connectionCounts.get(wordA.id) || 0) + 1);
        }
      });
      connectionMap.set(wordA.id, connections);
    });

    // Identify top 12% as hubs
    const sortedByConnections = Array.from(connectionCounts.entries())
      .sort((a, b) => b[1] - a[1]);
    const hubCount = Math.max(1, Math.floor(filteredWords.length * 0.12));
    const hubIds = new Set(sortedByConnections.slice(0, hubCount).map(([id]) => id));
    
    setHubs(hubIds);

    // Assign layers: hubs = top, high-connection = middle, others = bottom
    const layers = {};
    filteredWords.forEach(word => {
      const connCount = connectionCounts.get(word.id) || 0;
      if (hubIds.has(word.id)) {
        layers[word.id] = 'top';
      } else if (connCount > sortedByConnections[Math.floor(sortedByConnections.length * 0.5)]?.[1] || 0) {
        layers[word.id] = 'middle';
      } else {
        layers[word.id] = 'bottom';
      }
    });
    setNodeLayers(layers);

    // Classify and store connections
    const classifiedConnections = [];
    const distanceThreshold = 1000; // Spatial distance threshold for long-range

    filteredWords.forEach((wordA, i) => {
      if (!wordA.embedding) return;
      const posA = wordA.position;
      
      connectionMap.get(wordA.id)?.forEach(({ wordB, similarity }) => {
        const posB = wordB.position;
        if (!posB || !Array.isArray(posB)) return;

        const dx = posB[0] - posA[0];
        const dy = posB[1] - posA[1];
        const dz = posB[2] - posA[2];
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

        const isHubA = hubIds.has(wordA.id);
        const isHubB = hubIds.has(wordB.id);
        const layerA = layers[wordA.id];
        const layerB = layers[wordB.id];

        let connectionType = 'local';
        if ((isHubA && isHubB) || distance > distanceThreshold) {
          connectionType = 'long-range';
        } else if (layerA !== layerB) {
          connectionType = 'cross-layer';
        }

        classifiedConnections.push({
          start: posA,
          end: posB,
          connectionType,
          similarity,
          wordAId: wordA.id,
          wordBId: wordB.id,
        });
      });
    });

    // Limit connections for performance (prioritize long-range and cross-layer)
    const sortedConnections = classifiedConnections.sort((a, b) => {
      const typePriority = { 'long-range': 3, 'cross-layer': 2, 'local': 1 };
      const priorityDiff = (typePriority[b.connectionType] || 0) - (typePriority[a.connectionType] || 0);
      if (priorityDiff !== 0) return priorityDiff;
      // If same type, prefer higher similarity
      return b.similarity - a.similarity;
    });
    
    // Limit connections: all long-range, all cross-layer, fewer local connections for clarity
    const longRange = sortedConnections.filter(c => c.connectionType === 'long-range');
    const crossLayer = sortedConnections.filter(c => c.connectionType === 'cross-layer');
    const local = sortedConnections.filter(c => c.connectionType === 'local').slice(0, 80); // Further reduced for clarity
    
    setConnections([...longRange, ...crossLayer, ...local].slice(0, 200)); // Further reduced for clarity
  }, [filteredWords]);

  // Adjust node positions based on layers (Z-axis separation) and semantic proximity
  // Use semantic positions if available, otherwise fall back to original positions
  const adjustedPositions = useMemo(() => {
    const positions = {};
    const layerOffsets = { top: 400, middle: 0, bottom: -400 }; // Further increased separation
    
    filteredWords.forEach(word => {
      const layer = nodeLayers[word.id] || 'bottom';
      
      // Use semantic-adjusted position if available, otherwise use original
      const basePos = semanticPositions[word.id] || word.position;
      
      if (!basePos || !Array.isArray(basePos) || basePos.length !== 3) {
        positions[word.id] = word.position || [0, 0, 0];
        return;
      }
      
      // Apply layer-based Z-axis separation
      positions[word.id] = [
        basePos[0],
        basePos[1],
        basePos[2] + layerOffsets[layer],
      ];
    });
    
    return positions;
  }, [filteredWords, nodeLayers, semanticPositions]);

  // Calculate navigation path (greedy search simulation)
  useEffect(() => {
    if (!currentNodeId || filteredWords.length === 0 || Object.keys(adjustedPositions).length === 0) {
      setNavigationPath(null);
      setShowPath(false);
      return;
    }

    // Simple greedy path visualization - find path to a related word if available
    if (relatedWordIds.length > 0) {
      const currentWord = filteredWords.find(w => w.id === currentNodeId);
      const targetWord = filteredWords.find(w => relatedWordIds.includes(w.id));
      
      if (currentWord && targetWord && currentWord.embedding && targetWord.embedding) {
        // Simulate greedy search: find intermediate nodes
        const path = [adjustedPositions[currentWord.id] || currentWord.position];
        let current = currentWord;
        const visited = new Set([currentWord.id]);
        const maxSteps = 5;

        for (let step = 0; step < maxSteps; step++) {
          let bestNext = null;
          let bestSimilarity = -1;

          // Find best neighbor (greedy)
          filteredWords.forEach(word => {
            if (visited.has(word.id) || !word.embedding) return;
            
            const similarity = cosineSimilarity(current.embedding, word.embedding);
            const targetSimilarity = cosineSimilarity(word.embedding, targetWord.embedding);
            
            // Prefer nodes that are similar to both current and target
            const combinedScore = similarity * 0.3 + targetSimilarity * 0.7;
            
            if (combinedScore > bestSimilarity) {
              bestSimilarity = combinedScore;
              bestNext = word;
            }
          });

          if (bestNext) {
            path.push(adjustedPositions[bestNext.id] || bestNext.position);
            current = bestNext;
            visited.add(bestNext.id);
            
            // Stop if we're close to target
            const targetSim = cosineSimilarity(current.embedding, targetWord.embedding);
            if (targetSim > 0.8) break;
          } else {
            break;
          }
        }

        path.push(adjustedPositions[targetWord.id] || targetWord.position);
        
        setNavigationPath(path);
        setShowPath(true);
        
        // Hide path after 3 seconds
        setTimeout(() => setShowPath(false), 3000);
      }
    }
  }, [currentNodeId, relatedWordIds, filteredWords, adjustedPositions]);

  const cameraPosition = useMemo(() => {
    if (filteredWords.length === 0) return [0, 0, 2000];

    const positions = filteredWords.map(w => adjustedPositions[w.id] || w.position);
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
  }, [filteredWords, adjustedPositions]);

  return (
    <Canvas
      camera={{
        position: cameraPosition,
        fov: 75,
        near: 0.01,
        far: 100000,
      }}
      style={{ width: '100%', height: '100%', background: '#001E2B' }}
    >
      <Starfield count={1000} radius={300} /> {/* Further reduced for less visual noise */}
      <ambientLight intensity={0.35} /> {/* Reduced for better contrast */}
      <pointLight position={[20, 20, 20]} color="#00ED64" intensity={1.2} />
      <pointLight position={[-20, -20, -20]} color="#00684A" intensity={0.8} />
      <pointLight position={[0, 30, 0]} color="#FFB800" intensity={1.0} />
      <directionalLight position={[10, 10, 5]} intensity={0.6} color="#FFFFFF" />
      <fog attach="fog" args={['#001E2B', 2000, 15000]} /> {/* Adjusted for better depth perception and clarity */}

      {/* Semantic Proximity Controller - adjusts positions based on semantic similarity */}
      {semanticProximityEnabled && (
        <SemanticProximityController
          words={filteredWords}
          positions={semanticPositions}
          setPositions={setSemanticPositions}
          enabled={semanticProximityEnabled}
          strength={semanticProximityStrength}
        />
      )}

      <CameraController
        currentNodeId={currentNodeId}
        words={filteredWords}
        nodePositions={adjustedPositions}
        controlsRef={controlsRef}
      />

      {/* Render connections with hub highlighting */}
      <ConnectionsRenderer 
        connections={connections}
        adjustedPositions={adjustedPositions}
        hoveredHub={hoveredHub}
      />

      {/* Render navigation path */}
      {navigationPath && (
        <NavigationPath path={navigationPath} isVisible={showPath} />
      )}

      {/* Render nodes with label culling */}
      <NodeRenderer
        words={filteredWords}
        adjustedPositions={adjustedPositions}
        currentNodeId={currentNodeId}
        relatedWordIds={relatedWordIds}
        hubs={hubs}
        nodeLayers={nodeLayers}
        hoveredHub={hoveredHub}
        onWordClick={onWordClick}
        onHubHover={setHoveredHub}
      />

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
        dampingFactor={0.05}
        makeDefault={true}
      />
    </Canvas>
  );
}

