'use client';

import { useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import PlayerAvatar from './PlayerAvatar';

export default function OtherPlayers({
  players = [],
  currentPlayerId,
  words = [],
  adjustedPositions = {},
  maxViewDistance = 500,
  themeMode = 'dark',
}) {
  const { camera } = useThree();

  // Filter and position other players
  const visiblePlayers = useMemo(() => {
    if (!camera || players.length === 0) return [];

    const cameraPos = camera.position;
    const visible = [];

    players.forEach(player => {
      // Skip current player
      if (player.id === currentPlayerId) return;
      
      // Skip if player doesn't have a currentNodeId
      if (!player.currentNodeId) return;

      // Find the word/node the player is at
      const playerWord = words.find(w => w.id === player.currentNodeId);
      if (!playerWord) return;

      // Get the adjusted position if available, otherwise use word position
      const playerPos = adjustedPositions[player.currentNodeId] || playerWord.position;
      if (!playerPos || !Array.isArray(playerPos) || playerPos.length !== 3) return;

      // Calculate distance from camera
      const distance = cameraPos.distanceTo(new THREE.Vector3(...playerPos));

      // Only show players within view distance
      if (distance <= maxViewDistance) {
        visible.push({
          player,
          position: playerPos,
          distance,
        });
      }
    });

    // Sort by distance (closest first)
    return visible.sort((a, b) => a.distance - b.distance);
  }, [players, currentPlayerId, words, adjustedPositions, camera, maxViewDistance]);

  return (
    <>
      {visiblePlayers.map(({ player, position }) => (
        <PlayerAvatar
          key={player.id}
          player={player}
          position={position}
          isCurrentPlayer={false}
          themeMode={themeMode}
        />
      ))}
    </>
  );
}
