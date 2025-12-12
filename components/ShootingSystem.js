'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { Sphere } from '@react-three/drei';
import * as THREE from 'three';

// Bullet component for visual feedback
function Bullet({ start, end, onComplete, color = '#00ED64' }) {
  const meshRef = useRef();
  const [progress, setProgress] = useState(0);
  const duration = 0.3; // Animation duration in seconds

  useFrame((state, delta) => {
    if (progress < 1) {
      const newProgress = Math.min(1, progress + delta / duration);
      setProgress(newProgress);
      
      if (meshRef.current) {
        // Interpolate position
        const currentPos = new THREE.Vector3().lerpVectors(
          new THREE.Vector3(...start),
          new THREE.Vector3(...end),
          newProgress
        );
        meshRef.current.position.copy(currentPos);
        
        // Scale based on progress (grow then shrink)
        const scale = newProgress < 0.5 
          ? newProgress * 2 
          : (1 - newProgress) * 2;
        meshRef.current.scale.setScalar(scale * 2);
      }
      
      if (newProgress >= 1 && onComplete) {
        onComplete();
      }
    }
  });

  return (
    <Sphere ref={meshRef} args={[2, 8, 8]} position={start}>
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={1.5}
        transparent
        opacity={0.9}
      />
    </Sphere>
  );
}

// Hit effect component
function HitEffect({ position, onComplete, isGem = false }) {
  const meshRef = useRef();
  const [scale, setScale] = useState(1);
  const [opacity, setOpacity] = useState(1);
  const duration = isGem ? 0.8 : 0.5; // Longer duration for gem hits

  useFrame((state, delta) => {
    if (opacity > 0) {
      const newScale = scale + delta * (isGem ? 30 : 20); // Bigger explosion for gems
      const newOpacity = Math.max(0, opacity - delta / duration);
      setScale(newScale);
      setOpacity(newOpacity);
      
      if (meshRef.current) {
        meshRef.current.scale.setScalar(newScale);
        meshRef.current.material.opacity = newOpacity;
      }
      
      if (newOpacity <= 0 && onComplete) {
        onComplete();
      }
    }
  });

  return (
    <Sphere ref={meshRef} args={[isGem ? 15 : 10, 16, 16]} position={position}>
      <meshStandardMaterial
        color={isGem ? "#DC143C" : "#FFB800"}
        emissive={isGem ? "#FF1744" : "#FFB800"}
        emissiveIntensity={isGem ? 3 : 2}
        transparent
        opacity={opacity}
      />
    </Sphere>
  );
}

export default function ShootingSystem({ 
  words = [], 
  onWordHit,
  vectorGems = [],
  onGemHit,
  enabled = true,
  themeMode = 'dark' 
}) {
  const { camera, raycaster, gl } = useThree();
  const [bullets, setBullets] = useState([]);
  const [hits, setHits] = useState([]);
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());
  const spacebarPressedRef = useRef(false);
  const mouseDownRef = useRef(null);
  const isDraggingRef = useRef(false);
  const dragThreshold = 5; // pixels - if mouse moves more than this, it's a drag

  // Core shooting function - can be called from click or spacebar
  const shoot = useCallback((rayDirection = null) => {
    if (!enabled) return;
    
    // If rayDirection is provided (spacebar), use it; otherwise use mouse position
    if (rayDirection) {
      // Spacebar: shoot in the direction camera is looking (center of screen)
      raycasterRef.current.set(camera.position, rayDirection);
    } else {
      // Click: use mouse position
      raycasterRef.current.setFromCamera(mouseRef.current, camera);
    }

    // Find all objects to intersect with (prioritize gems over words)
    const gemIntersects = [];
    const wordIntersects = [];
    
    // First check for Vector Gem hits (prioritized)
    vectorGems.forEach(gem => {
      if (!gem.position || !Array.isArray(gem.position) || gem.position.length !== 3) {
        return;
      }
      if (gem.hitBy) return; // Already hit
      
      // Check if gem expired (30 seconds)
      const now = Date.now();
      if (now - gem.spawnTime >= 30000) return;
      
      const gemPos = new THREE.Vector3(...gem.position);
      const baseSize = 15;
      const gemRadius = baseSize * gem.size * 1.2; // Slightly larger hit radius
      
      // Create a bounding sphere for the gem
      const sphere = new THREE.Sphere(gemPos, gemRadius);
      
      // Check if ray intersects with the sphere
      const intersectionPoint = new THREE.Vector3();
      const ray = raycasterRef.current.ray;
      
      if (ray.intersectSphere(sphere, intersectionPoint)) {
        // Calculate distance from camera to intersection
        const distance = camera.position.distanceTo(intersectionPoint);
        gemIntersects.push({
          gem,
          distance,
          point: intersectionPoint,
        });
      }
    });
    
    // Then check for word hits
    words.forEach(word => {
      if (!word.position || !Array.isArray(word.position) || word.position.length !== 3) {
        return;
      }

      const wordPos = new THREE.Vector3(...word.position);
      // Use a larger radius to make it easier to hit words
      // This accounts for different sphere sizes in different visualization modes
      // WordGraph3D: baseScale = 8-12, WordGraphForceDirected: baseScale = 6-10, WordGraphHNSW: varies
      const wordRadius = 15; // Generous hit radius for easier targeting
      
      // Create a bounding sphere for the word
      const sphere = new THREE.Sphere(wordPos, wordRadius);
      
      // Check if ray intersects with the sphere
      const intersectionPoint = new THREE.Vector3();
      const ray = raycasterRef.current.ray;
      
      if (ray.intersectSphere(sphere, intersectionPoint)) {
        // Calculate distance from camera to intersection
        const distance = camera.position.distanceTo(intersectionPoint);
        wordIntersects.push({
          word,
          distance,
          point: intersectionPoint,
        });
      }
    });

    // Prioritize gem hits over word hits
    if (gemIntersects.length > 0) {
      // Sort gem hits by distance (closest first)
      gemIntersects.sort((a, b) => a.distance - b.distance);
      const hit = gemIntersects[0];
      const hitGem = hit.gem;
      
      // Create bullet trail (green for gem hit)
      const bulletStart = camera.position.clone();
      const bulletEnd = hit.point.clone();
      
      setBullets(prev => [...prev, {
        id: Date.now(),
        start: [bulletStart.x, bulletStart.y, bulletStart.z],
        end: [bulletEnd.x, bulletEnd.y, bulletEnd.z],
        color: '#DC143C', // Ruby Red for gem
      }]);

      // Create special gem hit effect (larger, more dramatic)
      setHits(prev => [...prev, {
        id: Date.now(),
        position: [hit.point.x, hit.point.y, hit.point.z],
        isGem: true,
      }]);

      // Call onGemHit callback
      if (onGemHit) {
        onGemHit(hitGem);
      }
    } else if (wordIntersects.length > 0) {
      // Sort word hits by distance (closest first)
      wordIntersects.sort((a, b) => a.distance - b.distance);
      const hit = wordIntersects[0];
      const hitWord = hit.word;
      
      // Create bullet trail
      const bulletStart = camera.position.clone();
      const bulletEnd = hit.point.clone();
      
      setBullets(prev => [...prev, {
        id: Date.now(),
        start: [bulletStart.x, bulletStart.y, bulletStart.z],
        end: [bulletEnd.x, bulletEnd.y, bulletEnd.z],
      }]);

      // Create hit effect
      setHits(prev => [...prev, {
        id: Date.now(),
        position: [hit.point.x, hit.point.y, hit.point.z],
      }]);

      // Call onWordHit callback
      if (onWordHit) {
        onWordHit(hitWord);
      }
    } else {
      // Miss - still show bullet trail but shorter
      const direction = rayDirection || raycasterRef.current.ray.direction.clone();
      const bulletStart = camera.position.clone();
      const bulletEnd = bulletStart.clone().add(direction.multiplyScalar(500));
      
      setBullets(prev => [...prev, {
        id: Date.now(),
        start: [bulletStart.x, bulletStart.y, bulletStart.z],
        end: [bulletEnd.x, bulletEnd.y, bulletEnd.z],
        color: '#FF0000', // Red for miss
      }]);
    }
  }, [camera, words, onWordHit, vectorGems, onGemHit, enabled]);

  // Handle mouse down - track initial position
  const handleMouseDown = useCallback((event) => {
    if (!enabled) return;
    
    if (event.target.tagName === 'CANVAS' || event.target === gl.domElement) {
      // Record initial mouse position
      mouseDownRef.current = {
        x: event.clientX,
        y: event.clientY,
      };
      isDraggingRef.current = false;
    }
  }, [enabled, gl]);

  // Handle mouse move - detect if dragging
  const handleMouseMove = useCallback((event) => {
    if (!enabled || !mouseDownRef.current) return;
    
    // Calculate distance moved
    const dx = event.clientX - mouseDownRef.current.x;
    const dy = event.clientY - mouseDownRef.current.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // If moved more than threshold, it's a drag
    if (distance > dragThreshold) {
      isDraggingRef.current = true;
    }
  }, [enabled]);

  // Handle mouse click for shooting - only if it wasn't a drag
  const handleClick = useCallback((event) => {
    if (!enabled) return;
    
    // Don't shoot if it was a drag
    if (isDraggingRef.current) {
      mouseDownRef.current = null;
      isDraggingRef.current = false;
      return;
    }
    
    // Don't shoot if clicking directly on a word (let the word's onClick handle it)
    if (event.target.tagName === 'CANVAS' || event.target === gl.domElement) {
      // Get mouse position in normalized device coordinates (-1 to +1)
      const rect = gl.domElement.getBoundingClientRect();
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      // Shoot using mouse position
      shoot();
    }
    
    // Reset drag tracking
    mouseDownRef.current = null;
    isDraggingRef.current = false;
  }, [enabled, gl, shoot]);

  // Handle mouse up - reset drag tracking
  const handleMouseUp = useCallback(() => {
    mouseDownRef.current = null;
    isDraggingRef.current = false;
  }, []);

  // Handle spacebar key press
  const handleKeyDown = useCallback((event) => {
    if (!enabled) return;
    
    // Check if user is typing in an input field
    const activeElement = document.activeElement;
    const isTyping = activeElement && (
      activeElement.tagName === 'INPUT' ||
      activeElement.tagName === 'TEXTAREA' ||
      activeElement.isContentEditable
    );
    
    // If user is typing, don't handle spacebar for shooting
    if (isTyping) return;
    
    // Spacebar pressed
    if (event.code === 'Space' && !spacebarPressedRef.current) {
      event.preventDefault(); // Prevent page scroll
      spacebarPressedRef.current = true;
      
      // Get camera direction (where it's looking)
      const direction = new THREE.Vector3();
      camera.getWorldDirection(direction);
      
      // Shoot in camera direction (center of screen)
      shoot(direction);
    }
  }, [enabled, camera, shoot]);

  // Handle spacebar key release (to allow rapid firing)
  const handleKeyUp = useCallback((event) => {
    if (event.code === 'Space') {
      spacebarPressedRef.current = false;
    }
  }, []);

  // Add event listeners
  useEffect(() => {
    if (!enabled) return;
    
    const canvas = gl.domElement;
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('click', handleClick);
    canvas.addEventListener('mouseup', handleMouseUp);
    
    // Add keyboard listeners to window for spacebar
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('click', handleClick);
      canvas.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleMouseDown, handleMouseMove, handleClick, handleMouseUp, handleKeyDown, handleKeyUp, enabled, gl]);

  return (
    <>
      {/* Render bullets */}
      {bullets.map(bullet => (
        <Bullet
          key={bullet.id}
          start={bullet.start}
          end={bullet.end}
          color={bullet.color || '#00ED64'}
          onComplete={() => {
            setBullets(prev => prev.filter(b => b.id !== bullet.id));
          }}
        />
      ))}
      
      {/* Render hit effects */}
      {hits.map(hit => (
        <HitEffect
          key={hit.id}
          position={hit.position}
          isGem={hit.isGem || false}
          onComplete={() => {
            setHits(prev => prev.filter(h => h.id !== hit.id));
          }}
        />
      ))}
    </>
  );
}
