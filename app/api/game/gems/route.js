import { NextResponse } from 'next/server';
import { getGame } from '@/lib/gameStateDB';
import pusher from '@/lib/pusher';

export const dynamic = 'force-dynamic';

// Helper function to safely send response, handling EPIPE errors
function safeResponse(data, status = 200) {
  try {
    return NextResponse.json(data, { status });
  } catch (error) {
    // Handle EPIPE and other write errors gracefully
    if (error.code === 'EPIPE' || error.errno === -32) {
      console.warn('⚠️ [GEMS API] Client disconnected before response could be sent (EPIPE)');
      // Return a minimal response or null - the client is already gone
      return null;
    }
    throw error;
  }
}

// GET endpoint to check for and spawn gems if needed
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const gameCode = searchParams.get('gameCode');

    if (!gameCode) {
      return safeResponse(
        { success: false, error: 'gameCode is required' },
        400
      );
    }

    const game = await getGame(gameCode);
    if (!game) {
      return safeResponse(
        { success: false, error: 'Game not found' },
        404
      );
    }

    // Only spawn during SEARCH phase
    if (game.roundPhase !== 'SEARCH' || !game.gameActive) {
      return safeResponse({
        success: true,
        gems: [],
        message: 'Not in SEARCH phase',
      });
    }

    // Clean up expired gems and asteroids first
    game.cleanupExpiredGems();
    game.cleanupExpiredBadAsteroids();
    
    // Batch save operations - only save once at the end
    let needsSave = false;
    const spawnedGems = [];
    const spawnedAsteroids = [];

    // Get active gems
    const activeGems = game.getActiveVectorGems();
    const activeAsteroids = game.getActiveBadAsteroids();

    // Check if we need to spawn more gems (max 2)
    const gemsToSpawn = 2 - activeGems.length;

    for (let i = 0; i < gemsToSpawn; i++) {
      // Random chance to spawn (30% chance per check to avoid spawning too many at once)
      if (Math.random() < 0.3) {
        const gem = game.spawnVectorGem();
        needsSave = true;
        
        // Emit spawn event (don't await to avoid blocking)
        pusher.trigger(`game-${gameCode}`, 'vector-gem:spawned', {
          gem: {
            id: gem.id,
            position: gem.position,
            velocity: gem.velocity,
            size: gem.size,
            reward: gem.reward,
            spawnTime: gem.spawnTime,
          },
        }).catch(err => {
          console.error('Error emitting pusher event:', err);
        });
        
        spawnedGems.push(gem);
        console.log(`💎 Vector Gem spawned via API in game ${gameCode}: ${gem.id} (reward: ${gem.reward} tokens)`);
      }
    }

    // Spawn bad asteroids (max 1, less frequent than gems - 15% chance)
    const asteroidsToSpawn = 1 - activeAsteroids.length;
    if (asteroidsToSpawn > 0 && Math.random() < 0.15) {
      const asteroid = game.spawnBadAsteroid();
      needsSave = true;
      
      // Emit spawn event
      pusher.trigger(`game-${gameCode}`, 'bad-asteroid:spawned', {
        asteroid: {
          id: asteroid.id,
          position: asteroid.position,
          velocity: asteroid.velocity,
          size: asteroid.size,
          cost: asteroid.cost,
          spawnTime: asteroid.spawnTime,
        },
      }).catch(err => {
        console.error('Error emitting pusher event:', err);
      });
      
      spawnedAsteroids.push(asteroid);
      console.log(`☄️ Bad Asteroid spawned via API in game ${gameCode}: ${asteroid.id} (cost: ${asteroid.cost} tokens)`);
    }

    // Save once if needed (instead of multiple saves)
    if (needsSave) {
      try {
        await game.save();
      } catch (saveError) {
        // If save fails but client is still connected, log and continue
        if (saveError.code !== 'EPIPE' && saveError.errno !== -32) {
          console.error('Error saving game state:', saveError);
        }
      }
    }

    // Return all active gems and asteroids
    const allActiveGems = game.getActiveVectorGems();
    const allActiveAsteroids = game.getActiveBadAsteroids();

    return safeResponse({
      success: true,
      gems: allActiveGems.map(gem => ({
        id: gem.id,
        position: gem.position,
        velocity: gem.velocity,
        size: gem.size,
        reward: gem.reward,
        spawnTime: gem.spawnTime,
      })),
      asteroids: allActiveAsteroids.map(asteroid => ({
        id: asteroid.id,
        position: asteroid.position,
        velocity: asteroid.velocity,
        size: asteroid.size,
        cost: asteroid.cost,
        spawnTime: asteroid.spawnTime,
      })),
      spawned: spawnedGems.length,
      spawnedAsteroids: spawnedAsteroids.length,
    });
  } catch (error) {
    // Handle EPIPE errors gracefully
    if (error.code === 'EPIPE' || error.errno === -32) {
      console.warn('⚠️ [GEMS API] Client disconnected (EPIPE)');
      return null;
    }
    
    console.error('Error in gems API:', error);
    return safeResponse(
      { success: false, error: 'Failed to get gems' },
      500
    );
  }
}
