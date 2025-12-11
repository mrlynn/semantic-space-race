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
function HitEffect({ position, onComplete }) {
  const meshRef = useRef();
  const [scale, setScale] = useState(1);
  const [opacity, setOpacity] = useState(1);
  const duration = 0.5;

  useFrame((state, delta) => {
    if (opacity > 0) {
      const newScale = scale + delta * 20;
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
    <Sphere ref={meshRef} args={[10, 16, 16]} position={position}>
      <meshStandardMaterial
        color="#FFB800"
        emissive="#FFB800"
        emissiveIntensity={2}
        transparent
        opacity={opacity}
      />
    </Sphere>
  );
}

export default function ShootingSystem({ 
  words = [], 
  onWordHit, 
  enabled = true,
  themeMode = 'dark' 
}) {
  const { camera, raycaster, gl } = useThree();
  const [bullets, setBullets] = useState([]);
  const [hits, setHits] = useState([]);
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());
  const spacebarPressedRef = useRef(false);

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

    // Find all word spheres to intersect with
    const intersects = [];
    
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
        intersects.push({
          word,
          distance,
          point: intersectionPoint,
        });
      }
    });

    // Sort by distance (closest first)
    intersects.sort((a, b) => a.distance - b.distance);

    if (intersects.length > 0) {
      const hit = intersects[0];
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
  }, [camera, words, onWordHit, enabled]);

  // Handle mouse click for shooting
  const handleClick = useCallback((event) => {
    if (!enabled) return;
    
    // Don't shoot if clicking directly on a word (let the word's onClick handle it)
    if (event.target.tagName === 'CANVAS' || event.target === gl.domElement) {
      // Get mouse position in normalized device coordinates (-1 to +1)
      const rect = gl.domElement.getBoundingClientRect();
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      // Shoot using mouse position
      shoot();
    }
  }, [enabled, gl, shoot]);

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
    canvas.addEventListener('click', handleClick);
    
    // Add keyboard listeners to window for spacebar
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      canvas.removeEventListener('click', handleClick);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleClick, handleKeyDown, handleKeyUp, enabled, gl]);

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
          onComplete={() => {
            setHits(prev => prev.filter(h => h.id !== hit.id));
          }}
        />
      ))}
    </>
  );
}
