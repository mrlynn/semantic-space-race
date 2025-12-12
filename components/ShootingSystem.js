'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { EnergyBeam, ImpactEffect, MuzzleFlash } from './EnergyBeam';

export default function ShootingSystem({
  words = [],
  onWordHit,
  vectorGems = [],
  onGemHit,
  badAsteroids = [],
  onBadAsteroidHit,
  enabled = true,
  themeMode = 'dark',
  shipPosition = null // Position of player ship to fire from
}) {
  const { camera, raycaster, gl } = useThree();
  const [beams, setBeams] = useState([]);
  const [impacts, setImpacts] = useState([]);
  const [muzzleFlashes, setMuzzleFlashes] = useState([]);
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());
  const spacebarPressedRef = useRef(false);
  const mouseDownRef = useRef(null);
  const isDraggingRef = useRef(false);
  const dragThreshold = 10; // pixels - if mouse moves more than this, it's a drag
  
  // Use refs for frequently changing data to avoid recreating callbacks
  const wordsRef = useRef(words);
  const vectorGemsRef = useRef(vectorGems);
  const badAsteroidsRef = useRef(badAsteroids);
  const onWordHitRef = useRef(onWordHit);
  const onGemHitRef = useRef(onGemHit);
  const onBadAsteroidHitRef = useRef(onBadAsteroidHit);
  const shipPositionRef = useRef(shipPosition);
  const shootRef = useRef(null);
  
  // Update refs when props change
  useEffect(() => {
    wordsRef.current = words;
    vectorGemsRef.current = vectorGems;
    badAsteroidsRef.current = badAsteroids;
    onWordHitRef.current = onWordHit;
    onGemHitRef.current = onGemHit;
    onBadAsteroidHitRef.current = onBadAsteroidHit;
    shipPositionRef.current = shipPosition;
  }, [words, vectorGems, badAsteroids, onWordHit, onGemHit, onBadAsteroidHit, shipPosition]);

  // Core shooting function - can be called from click or spacebar
  const shoot = useCallback((rayDirection = null) => {
    // Use refs to get current values without recreating callback
    const currentWords = wordsRef.current;
    const currentGems = vectorGemsRef.current;
    const currentAsteroids = badAsteroidsRef.current;
    
    console.log('🔫 [SHOOT] shoot() called', { 
      enabled, 
      hasGems: currentGems.length, 
      hasAsteroids: currentAsteroids?.length || 0,
      rayDirection: !!rayDirection 
    });
    
    if (!enabled) {
      console.warn('🔫 [SHOOT] Shooting disabled');
      return;
    }
    
    // If rayDirection is provided (spacebar), use it; otherwise use mouse position
    if (rayDirection) {
      // Spacebar: shoot in the direction camera is looking (center of screen)
      raycasterRef.current.set(camera.position, rayDirection);
      console.log('🔫 [SHOOT] Using spacebar, camera pos:', camera.position, 'direction:', rayDirection);
    } else {
      // Click: use mouse position
      raycasterRef.current.setFromCamera(mouseRef.current, camera);
      console.log('🔫 [SHOOT] Using mouse, mouse pos:', mouseRef.current, 'camera pos:', camera.position);
    }
    
    // Find all objects to intersect with (prioritize gems > asteroids > words)
    const gemIntersects = [];
    const asteroidIntersects = [];
    const wordIntersects = [];
    
    // First check for Vector Gem hits (prioritized)
    console.log('🔫 [SHOOT] Checking', currentGems.length, 'gems for hits');
    currentGems.forEach((gem, index) => {
      if (!gem.position || !Array.isArray(gem.position) || gem.position.length !== 3) {
        if (index < 3) console.log(`💎 [SHOOT] Gem ${index} skipped: invalid position`, gem.position);
        return;
      }
      if (gem.hitBy) {
        if (index < 3) console.log(`💎 [SHOOT] Gem ${index} (${gem.id}) skipped: already hit`);
        return;
      }
      
      // Check if gem expired (30 seconds)
      const now = Date.now();
      const age = now - gem.spawnTime;
      if (age >= 30000) {
        if (index < 3) console.log(`💎 [SHOOT] Gem ${index} (${gem.id}) skipped: expired (age: ${age}ms)`);
        return;
      }
      
      // Calculate current position based on initial position, velocity, and elapsed time
      // The VectorGem component uses: position += velocity * delta (where delta is in seconds)
      // So the velocity stored is in "units per second"
      const ageInSeconds = age / 1000;
      const initialPos = new THREE.Vector3(...gem.position);
      const velocity = gem.velocity && Array.isArray(gem.velocity) && gem.velocity.length === 3
        ? new THREE.Vector3(...gem.velocity)
        : new THREE.Vector3(0, 0, 0);
      
      // Current position = initial position + (velocity * time in seconds)
      const currentPos = initialPos.clone().add(velocity.clone().multiplyScalar(ageInSeconds));
      
      const baseSize = 15;
      const gemRadius = baseSize * gem.size * 1.2; // Slightly larger hit radius
      
      // Create a bounding sphere for the gem at its current position
      const sphere = new THREE.Sphere(currentPos, gemRadius);
      
      // Check if ray intersects with the sphere
      const intersectionPoint = new THREE.Vector3();
      const ray = raycasterRef.current.ray;
      
      // Debug: log gem info for first gem
      if (index === 0) {
        const distanceToGem = camera.position.distanceTo(currentPos);
        console.log(`💎 [SHOOT] Gem 0 (${gem.id}):`, {
          initialPos: { x: initialPos.x.toFixed(2), y: initialPos.y.toFixed(2), z: initialPos.z.toFixed(2) },
          velocity: { x: velocity.x.toFixed(2), y: velocity.y.toFixed(2), z: velocity.z.toFixed(2) },
          ageInSeconds: ageInSeconds.toFixed(2),
          currentPos: { x: currentPos.x.toFixed(2), y: currentPos.y.toFixed(2), z: currentPos.z.toFixed(2) },
          radius: gemRadius.toFixed(2),
          rayOrigin: { x: ray.origin.x.toFixed(2), y: ray.origin.y.toFixed(2), z: ray.origin.z.toFixed(2) },
          rayDirection: { x: ray.direction.x.toFixed(4), y: ray.direction.y.toFixed(4), z: ray.direction.z.toFixed(4) },
          distanceToGem: distanceToGem.toFixed(2)
        });
      }
      
      const didIntersect = ray.intersectSphere(sphere, intersectionPoint);
      if (didIntersect) {
        // Calculate distance from camera to intersection
        const distance = camera.position.distanceTo(intersectionPoint);
        console.log('💎 [SHOOT] Gem hit detected!', {
          gemId: gem.id,
          index,
          distance,
          currentPos: { x: currentPos.x, y: currentPos.y, z: currentPos.z },
          gemRadius,
          intersectionPoint: { x: intersectionPoint.x, y: intersectionPoint.y, z: intersectionPoint.z }
        });
        gemIntersects.push({
          gem,
          distance,
          point: intersectionPoint,
        });
      } else if (index === 0) {
        // Log why the first gem wasn't hit
        const rayToGem = currentPos.clone().sub(ray.origin);
        const rayDir = ray.direction.clone().normalize();
        const rayToGemDir = rayToGem.clone().normalize();
        const dot = rayDir.dot(rayToGemDir);
        const distanceToCenter = ray.origin.distanceTo(currentPos);
        console.log(`💎 [SHOOT] Gem 0 (${gem.id}) NO HIT:`, {
          distanceToCenter: distanceToCenter.toFixed(2),
          gemRadius: gemRadius.toFixed(2),
          rayDotProduct: dot.toFixed(4),
          angleDegrees: (Math.acos(Math.max(-1, Math.min(1, dot))) * (180 / Math.PI)).toFixed(2),
          rayToGemDirection: { x: rayToGemDir.x.toFixed(4), y: rayToGemDir.y.toFixed(4), z: rayToGemDir.z.toFixed(4) },
          rayDirection: { x: rayDir.x.toFixed(4), y: rayDir.y.toFixed(4), z: rayDir.z.toFixed(4) }
        });
      }
    });
    
    // Then check for Bad Asteroid hits (second priority)
    console.log('🔫 [SHOOT] Checking asteroids:', {
      hasAsteroids: !!currentAsteroids,
      asteroidCount: currentAsteroids?.length || 0,
      hasCallback: !!onBadAsteroidHitRef.current,
      asteroids: currentAsteroids?.map(a => ({ id: a.id, position: a.position, spawnTime: a.spawnTime })) || []
    });
    
    if (currentAsteroids && onBadAsteroidHitRef.current) {
      console.log('🔫 [SHOOT] Checking', currentAsteroids.length, 'asteroids for hits');
      currentAsteroids.forEach((asteroid, index) => {
        if (!asteroid.position || !Array.isArray(asteroid.position) || asteroid.position.length !== 3) {
          if (index < 3) console.log(`☄️ [SHOOT] Asteroid ${index} skipped: invalid position`, asteroid.position);
          return;
        }
        if (asteroid.hitBy) {
          if (index < 3) console.log(`☄️ [SHOOT] Asteroid ${index} (${asteroid.id}) skipped: already hit`);
          return;
        }
        
        // Check if asteroid expired (30 seconds)
        const now = Date.now();
        const age = now - asteroid.spawnTime;
        if (age >= 30000) {
          if (index < 3) console.log(`☄️ [SHOOT] Asteroid ${index} (${asteroid.id}) skipped: expired (age: ${age}ms)`);
          return;
        }
        
        // Calculate current position based on initial position, velocity, and elapsed time
        // The BadAsteroid component uses: position += velocity * delta (where delta is in seconds)
        // So the velocity stored is in "units per second"
        const ageInSeconds = age / 1000;
        const initialPos = new THREE.Vector3(...asteroid.position);
        const velocity = asteroid.velocity && Array.isArray(asteroid.velocity) && asteroid.velocity.length === 3
          ? new THREE.Vector3(...asteroid.velocity)
          : new THREE.Vector3(0, 0, 0);
        
        // Current position = initial position + (velocity * time in seconds)
        const currentPos = initialPos.clone().add(velocity.clone().multiplyScalar(ageInSeconds));
        
        const baseSize = 15;
        const asteroidRadius = baseSize * (asteroid.size || 1) * 1.2; // Slightly larger hit radius
        
        // Create a bounding sphere for the asteroid at its current position
        const sphere = new THREE.Sphere(currentPos, asteroidRadius);
        
        // Check if ray intersects with the sphere
        const intersectionPoint = new THREE.Vector3();
        const ray = raycasterRef.current.ray;
        
        // Debug: log asteroid info for first asteroid
        if (index === 0) {
          console.log(`☄️ [SHOOT] Asteroid 0 (${asteroid.id}):`, {
            initialPos: { x: initialPos.x, y: initialPos.y, z: initialPos.z },
            velocity: { x: velocity.x, y: velocity.y, z: velocity.z },
            ageInSeconds,
            currentPos: { x: currentPos.x, y: currentPos.y, z: currentPos.z },
            radius: asteroidRadius,
            rayOrigin: { x: ray.origin.x, y: ray.origin.y, z: ray.origin.z },
            rayDirection: { x: ray.direction.x, y: ray.direction.y, z: ray.direction.z },
            distanceToAsteroid: camera.position.distanceTo(currentPos)
          });
        }
        
        if (ray.intersectSphere(sphere, intersectionPoint)) {
          // Calculate distance from camera to intersection
          const distance = camera.position.distanceTo(intersectionPoint);
          console.log('☄️ [SHOOT] Asteroid hit detected!', {
            asteroidId: asteroid.id,
            index,
            distance,
            currentPos: { x: currentPos.x, y: currentPos.y, z: currentPos.z },
            asteroidRadius,
            intersectionPoint: { x: intersectionPoint.x, y: intersectionPoint.y, z: intersectionPoint.z }
          });
          asteroidIntersects.push({
            asteroid,
            distance,
            point: intersectionPoint,
          });
        } else if (index === 0) {
          // Log why the first asteroid wasn't hit
          const rayToAsteroid = currentPos.clone().sub(ray.origin);
          const rayDir = ray.direction.clone().normalize();
          const rayToAsteroidDir = rayToAsteroid.clone().normalize();
          const dot = rayDir.dot(rayToAsteroidDir);
          console.log(`☄️ [SHOOT] Asteroid 0 (${asteroid.id}) NO HIT:`, {
            distanceToCenter: ray.origin.distanceTo(currentPos),
            asteroidRadius,
            rayDotProduct: dot,
            angleDegrees: Math.acos(Math.max(-1, Math.min(1, dot))) * (180 / Math.PI)
          });
        }
      });
    } else {
      console.warn('🔫 [SHOOT] Skipping asteroid check - missing asteroids or callback', {
        hasAsteroids: !!currentAsteroids,
        asteroidCount: currentAsteroids?.length || 0,
        hasCallback: !!onBadAsteroidHitRef.current
      });
    }
    
    // Then check for word hits
    currentWords.forEach(word => {
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

    console.log('🔫 [SHOOT] Hit detection results:', {
      gemHits: gemIntersects.length,
      asteroidHits: asteroidIntersects.length,
      wordHits: wordIntersects.length
    });
    
    // Prioritize gem hits > asteroid hits > word hits
    if (gemIntersects.length > 0) {
      console.log('💎 [SHOOT] Processing gem hit, closest gem:', gemIntersects[0].gem.id);
      // Sort gem hits by distance (closest first)
      gemIntersects.sort((a, b) => a.distance - b.distance);
      const hit = gemIntersects[0];
      const hitGem = hit.gem;
      
      // Create energy beam from ship position if available, otherwise camera
      const beamStart = shipPositionRef.current ? shipPositionRef.current.clone() : camera.position.clone();
      const beamEnd = hit.point.clone();

      setBeams(prev => [...prev, {
        id: Date.now(),
        start: [beamStart.x, beamStart.y, beamStart.z],
        end: [beamEnd.x, beamEnd.y, beamEnd.z],
        color: '#DC143C', // Ruby Red for gem
        isHit: true,
      }]);

      // Create muzzle flash at ship position
      setMuzzleFlashes(prev => [...prev, {
        id: Date.now(),
        position: [beamStart.x, beamStart.y, beamStart.z],
      }]);

      // Create special gem impact effect (larger, more dramatic)
      setImpacts(prev => [...prev, {
        id: Date.now(),
        position: [hit.point.x, hit.point.y, hit.point.z],
        color: '#DC143C',
      }]);

      // Call onGemHit callback
      console.log('💎 [SHOOT] Calling onGemHit callback', {
        gemId: hitGem.id,
        hasCallback: !!onGemHitRef.current
      });
      if (onGemHitRef.current) {
        onGemHitRef.current(hitGem);
        console.log('💎 [SHOOT] onGemHit callback called successfully');
      } else {
        console.error('💎 [SHOOT] ERROR: onGemHit callback not available!');
      }
      return; // Don't check for asteroids or words if we hit a gem
    }
    
    // Check for asteroid hits (second priority)
    if (asteroidIntersects.length > 0 && onBadAsteroidHitRef.current) {
      console.log('☄️ [SHOOT] Processing asteroid hit, closest asteroid:', asteroidIntersects[0].asteroid.id);
      // Sort asteroid hits by distance (closest first)
      asteroidIntersects.sort((a, b) => a.distance - b.distance);
      const hit = asteroidIntersects[0];
      const hitAsteroid = hit.asteroid;
      
      // Create energy beam from ship position if available, otherwise camera
      const beamStart = shipPositionRef.current ? shipPositionRef.current.clone() : camera.position.clone();
      const beamEnd = hit.point.clone();

      setBeams(prev => [...prev, {
        id: Date.now(),
        start: [beamStart.x, beamStart.y, beamStart.z],
        end: [beamEnd.x, beamEnd.y, beamEnd.z],
        color: '#FF4444', // Red for bad asteroid
        isHit: true,
      }]);

      // Create muzzle flash at ship position
      setMuzzleFlashes(prev => [...prev, {
        id: Date.now(),
        position: [beamStart.x, beamStart.y, beamStart.z],
      }]);

      // Create asteroid impact effect
      setImpacts(prev => [...prev, {
        id: Date.now(),
        position: [hit.point.x, hit.point.y, hit.point.z],
        color: '#FF4444',
      }]);

      // Call onBadAsteroidHit callback
      console.log('☄️ [SHOOT] Calling onBadAsteroidHit callback', {
        asteroidId: hitAsteroid.id,
        hasCallback: !!onBadAsteroidHitRef.current
      });
      if (onBadAsteroidHitRef.current) {
        onBadAsteroidHitRef.current(hitAsteroid);
        console.log('☄️ [SHOOT] onBadAsteroidHit callback called successfully');
      } else {
        console.error('☄️ [SHOOT] ERROR: onBadAsteroidHit callback not available!');
      }
      return; // Don't check for words if we hit an asteroid
    }
    
    // Finally check for word hits
    if (wordIntersects.length > 0) {
      // Sort word hits by distance (closest first)
      wordIntersects.sort((a, b) => a.distance - b.distance);
      const hit = wordIntersects[0];
      const hitWord = hit.word;
      
      // Create energy beam from ship position if available, otherwise camera
      const beamStart = shipPositionRef.current ? shipPositionRef.current.clone() : camera.position.clone();
      const beamEnd = hit.point.clone();

      setBeams(prev => [...prev, {
        id: Date.now(),
        start: [beamStart.x, beamStart.y, beamStart.z],
        end: [beamEnd.x, beamEnd.y, beamEnd.z],
        color: '#00ED64',
        isHit: true,
      }]);

      // Create muzzle flash at ship position
      setMuzzleFlashes(prev => [...prev, {
        id: Date.now(),
        position: [beamStart.x, beamStart.y, beamStart.z],
      }]);

      // Create impact effect
      setImpacts(prev => [...prev, {
        id: Date.now(),
        position: [hit.point.x, hit.point.y, hit.point.z],
        color: '#00ED64',
      }]);

      // Call onWordHit callback
      if (onWordHitRef.current) {
        onWordHitRef.current(hitWord);
      }
    } else {
      // Miss - still show beam but shorter and red
      const direction = rayDirection || raycasterRef.current.ray.direction.clone();
      const beamStart = shipPositionRef.current ? shipPositionRef.current.clone() : camera.position.clone();
      const beamEnd = beamStart.clone().add(direction.multiplyScalar(500));

      setBeams(prev => [...prev, {
        id: Date.now(),
        start: [beamStart.x, beamStart.y, beamStart.z],
        end: [beamEnd.x, beamEnd.y, beamEnd.z],
        color: '#FF3333', // Red for miss
        isHit: false,
      }]);

      // Still show muzzle flash on miss
      setMuzzleFlashes(prev => [...prev, {
        id: Date.now(),
        position: [beamStart.x, beamStart.y, beamStart.z],
      }]);
    }
  }, [camera, enabled]); // Only depend on stable values - use refs for changing data
  
  // Store shoot function in ref (must be after shoot is defined)
  useEffect(() => {
    shootRef.current = shoot;
  }, [shoot]);

  // Handle mouse down - track initial position and time
  const handleMouseDown = useCallback((event) => {
    if (!enabled) return;
    
    // Only track if it's a left mouse button (button 0)
    // Right button and middle button are for camera controls
    if (event.button !== 0) return;
    
    if (event.target.tagName === 'CANVAS' || event.target === gl.domElement) {
      // Record initial mouse position and time
      mouseDownRef.current = {
        x: event.clientX,
        y: event.clientY,
        time: Date.now(),
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
    
    // If moved more than threshold (10 pixels), it's a drag
    // This allows for small hand movements during clicks
    if (distance > 10) {
      isDraggingRef.current = true;
    }
  }, [enabled]);

  // Handle mouse up - shoot only if it wasn't a drag
  // Use refs to avoid recreating this callback
  const handleMouseUp = useCallback((event) => {
    if (!enabled) return;
    
    // Only handle left mouse button (button 0)
    // Right button (button 2) and middle button (button 1) are for camera controls
    if (event.button !== 0) {
      // Reset tracking for non-left buttons
      mouseDownRef.current = null;
      isDraggingRef.current = false;
      return;
    }
    
    // Check if this was a drag or a click
    const wasDrag = isDraggingRef.current;
    const mouseDown = mouseDownRef.current;
    
    // Calculate final distance moved
    let finalDistance = 0;
    let timeSinceDown = 0;
    if (mouseDown) {
      const dx = event.clientX - mouseDown.x;
      const dy = event.clientY - mouseDown.y;
      finalDistance = Math.sqrt(dx * dx + dy * dy);
      timeSinceDown = Date.now() - mouseDown.time;
    }
    
    // Reset drag tracking first
    mouseDownRef.current = null;
    isDraggingRef.current = false;
    
    // Determine if this was a drag:
    // 1. If isDraggingRef was set to true (moved > 10px during mousemove)
    // 2. If final distance > 10px (caught on mouseup)
    // 3. If held down for > 300ms (long press, likely dragging)
    const isDrag = wasDrag || finalDistance > 10 || timeSinceDown > 300;
    
    // Only shoot if it was NOT a drag and we have valid mouse down data
    if (!isDrag && mouseDown && (event.target.tagName === 'CANVAS' || event.target === gl.domElement)) {
      // Get mouse position in normalized device coordinates (-1 to +1)
      const rect = gl.domElement.getBoundingClientRect();
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      
      // Shoot using mouse position
      shoot();
    }
  }, [enabled, gl]); // Use shootRef instead of shoot

  // Handle mouse click - we don't use this for shooting anymore
  // We use mouseup instead to properly detect drags
  // This handler just prevents any accidental shooting from click events
  const handleClick = useCallback((event) => {
    if (!enabled) return;
    
    // Prevent click from triggering shoot - we only shoot on mouseup after drag check
    // This prevents double-firing and shooting during camera navigation
    if (event.target.tagName === 'CANVAS' || event.target === gl.domElement) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, [enabled, gl]);

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
      if (shootRef.current) {
        shootRef.current(direction);
      }
    }
  }, [enabled, camera]); // Use shootRef instead of shoot

  // Handle spacebar key release (to allow rapid firing)
  const handleKeyUp = useCallback((event) => {
    if (event.code === 'Space') {
      spacebarPressedRef.current = false;
    }
  }, []);

  // Add event listeners
  useEffect(() => {
    if (!enabled || !gl?.domElement) {
      return;
    }
    
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
  }, [enabled, gl.domElement]); // Only depend on enabled and canvas - callbacks are stable

  return (
    <>
      {/* Render energy beams */}
      {beams.map(beam => (
        <EnergyBeam
          key={beam.id}
          start={beam.start}
          end={beam.end}
          color={beam.color || '#00ED64'}
          isHit={beam.isHit}
          onComplete={() => {
            setBeams(prev => prev.filter(b => b.id !== beam.id));
          }}
        />
      ))}

      {/* Render impact effects */}
      {impacts.map(impact => (
        <ImpactEffect
          key={impact.id}
          position={impact.position}
          color={impact.color || '#00ED64'}
          onComplete={() => {
            setImpacts(prev => prev.filter(h => h.id !== impact.id));
          }}
        />
      ))}

      {/* Render muzzle flashes */}
      {muzzleFlashes.map(flash => (
        <MuzzleFlash
          key={flash.id}
          position={flash.position}
          onComplete={() => {
            setMuzzleFlashes(prev => prev.filter(f => f.id !== flash.id));
          }}
        />
      ))}
    </>
  );
}
