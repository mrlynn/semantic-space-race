import { NextResponse } from 'next/server';
import { getGame } from '@/lib/gameStateDB';
import pusher from '@/lib/pusher';

export const dynamic = 'force-dynamic';

// GET endpoint to check for and spawn gems if needed
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const gameCode = searchParams.get('gameCode');

    if (!gameCode) {
      return NextResponse.json(
        { success: false, error: 'gameCode is required' },
        { status: 400 }
      );
    }

    const game = await getGame(gameCode);
    if (!game) {
      return NextResponse.json(
        { success: false, error: 'Game not found' },
        { status: 404 }
      );
    }

    // Only spawn during SEARCH phase
    if (game.roundPhase !== 'SEARCH' || !game.gameActive) {
      return NextResponse.json({
        success: true,
        gems: [],
        message: 'Not in SEARCH phase',
      });
    }

    // Clean up expired gems first
    game.cleanupExpiredGems();
    await game.save();

    // Get active gems
    const activeGems = game.getActiveVectorGems();

    // Check if we need to spawn more gems (max 2)
    const gemsToSpawn = 2 - activeGems.length;
    const spawnedGems = [];

    for (let i = 0; i < gemsToSpawn; i++) {
      // Random chance to spawn (30% chance per check to avoid spawning too many at once)
      if (Math.random() < 0.3) {
        const gem = game.spawnVectorGem();
        await game.save();
        
        // Emit spawn event
        await pusher.trigger(`game-${gameCode}`, 'vector-gem:spawned', {
          gem: {
            id: gem.id,
            position: gem.position,
            velocity: gem.velocity,
            size: gem.size,
            reward: gem.reward,
            spawnTime: gem.spawnTime,
          },
        });
        
        spawnedGems.push(gem);
        console.log(`💎 Vector Gem spawned via API in game ${gameCode}: ${gem.id} (reward: ${gem.reward} tokens)`);
      }
    }

    // Return all active gems
    const allActiveGems = game.getActiveVectorGems();

    return NextResponse.json({
      success: true,
      gems: allActiveGems.map(gem => ({
        id: gem.id,
        position: gem.position,
        velocity: gem.velocity,
        size: gem.size,
        reward: gem.reward,
        spawnTime: gem.spawnTime,
      })),
      spawned: spawnedGems.length,
    });
  } catch (error) {
    console.error('Error in gems API:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get gems' },
      { status: 500 }
    );
  }
}
