import { generateDefinition } from '@/lib/openai';
import pusher from '@/lib/pusher';
import connectDB from '@/lib/mongodb';
import PlayerStats from '@/models/PlayerStats';

// Store active spawner timers by gameCode
const gemSpawnerTimers = new Map();
const gemCleanupTimers = new Map();

// Update player stats incrementally after a round win
// This accumulates points to the global leaderboard after each round
async function updatePlayerStatsAfterRound(game, roundWinnerId, pointsEarned) {
  try {
    await connectDB();
    const winner = game.getPlayer(roundWinnerId);
    
    if (!winner) {
      console.warn(`Round winner ${roundWinnerId} not found in game`);
      return;
    }
    
    // Find or create player stats
    let stats = await PlayerStats.findOne({ nickname: winner.nickname });
    
    if (!stats) {
      stats = new PlayerStats({
        nickname: winner.nickname,
        totalGames: 0,
        totalScore: 0,
        gamesWon: 0,
        averageScore: 0,
        bestScore: 0,
      });
    }
    
    // Incrementally update stats with points from this round
    stats.totalScore += pointsEarned;
    stats.bestScore = Math.max(stats.bestScore, winner.score || 0);
    if (stats.totalGames > 0) {
      // Recalculate average based on current totalScore
      // Note: We don't increment totalGames here - that happens at game end
      stats.averageScore = stats.totalScore / stats.totalGames;
    }
    stats.lastPlayed = new Date();
    
    await stats.save();
    
    console.log(`✅ Updated stats for round winner ${winner.nickname}: +${pointsEarned} points (total: ${stats.totalScore})`);
  } catch (error) {
    console.error('❌ Error updating player stats after round:', error);
    // Don't throw - stats update failure shouldn't break game flow
  }
}

// Update player stats when a game ends
async function updatePlayerStats(game) {
  try {
    await connectDB();
    const players = game.getAllPlayers();
    const finalScores = players.map(p => ({
      nickname: p.nickname,
      score: p.score || 0,
    })).sort((a, b) => b.score - a.score);
    
    const winner = finalScores[0]; // Highest score
    
    // Update stats for each player
    for (const player of players) {
      const playerScore = player.score || 0;
      const isWinner = player.nickname === winner.nickname && winner.score > 0;
      
      // Find or create player stats
      let stats = await PlayerStats.findOne({ nickname: player.nickname });
      
      if (!stats) {
        stats = new PlayerStats({
          nickname: player.nickname,
          totalGames: 0,
          totalScore: 0,
          gamesWon: 0,
          averageScore: 0,
          bestScore: 0,
        });
      }
      
      // Update stats
      // Note: totalScore should already be updated incrementally after each round
      // So we don't add the game score again here - it was already added round-by-round
      // However, we ensure totalScore is at least the game score (handles edge cases)
      const currentTotalScore = stats.totalScore || 0;
      const gameScore = playerScore || 0;
      
      // Ensure totalScore reflects at least this game's score
      // This handles cases where round-by-round updates might have been missed
      if (currentTotalScore < gameScore) {
        // If somehow totalScore is less than game score, add the difference
        stats.totalScore = currentTotalScore + (gameScore - currentTotalScore);
      }
      // Otherwise, totalScore was already updated incrementally, so we keep it as is
      
      stats.totalGames += 1;
      stats.bestScore = Math.max(stats.bestScore, playerScore);
      // Recalculate average based on current totalScore (which includes all rounds)
      stats.averageScore = stats.totalScore / stats.totalGames;
      if (isWinner) {
        stats.gamesWon += 1;
      }
      stats.lastPlayed = new Date();
      
      await stats.save();
    }
    
    console.log(`✅ Updated player stats for ${players.length} players at game end`);
  } catch (error) {
    console.error('❌ Error updating player stats:', error);
    // Don't throw - stats update failure shouldn't break game flow
  }
}

export async function endRound(game, winnerId, winnerNickname) {
  // Stop vector gem spawner
  stopVectorGemSpawner(game.gameCode);
  
  game.endRound(winnerId, winnerNickname);
  await game.save(); // Save round end state

  // Get the winner's current score to calculate points earned this round
  const winner = game.getPlayer(winnerId);
  const pointsEarnedThisRound = 10; // Points awarded for winning a round (from guess route)
  
  // Update player stats incrementally after each round win
  // This accumulates points to the global leaderboard immediately
  if (winnerId && winner) {
    await updatePlayerStatsAfterRound(game, winnerId, pointsEarnedThisRound);
  }

  // Emit round:end event with updated scores
  await pusher.trigger(`game-${game.gameCode}`, 'round:end', {
    winnerId,
    winnerNickname,
    roundNumber: game.roundNumber,
    targetLabel: game.currentTarget?.label,
    players: game.getAllPlayers().map(p => ({
      id: p.id,
      nickname: p.nickname,
      score: p.score || 0,
      tokens: p.tokens !== undefined ? p.tokens : 15,
      tokensOut: p.tokensOut || false,
    })),
  });

  // Check if game is complete BEFORE scheduling setTimeout
  // This ensures stats are saved even if serverless function terminates early
  // roundNumber is incremented at the START of each round, so:
  // - After round 1 ends: roundNumber = 1, maxRounds = 5 → continue
  // - After round 5 ends: roundNumber = 5, maxRounds = 5 → end game
  const isGameComplete = game.roundNumber >= game.maxRounds;
  
  if (isGameComplete) {
    // End game immediately - don't wait for setTimeout
    game.gameActive = false;
    await game.save();
    
    // Update historical player stats IMMEDIATELY (critical operation)
    await updatePlayerStats(game);
    
    // Trigger game:end event immediately so stats screen appears right away
    // Get final scores before triggering
    const finalScores = game.getAllPlayers().map(p => ({
      id: p.id,
      nickname: p.nickname,
      score: p.score || 0,
    })).sort((a, b) => (b.score || 0) - (a.score || 0)); // Sort by score descending
    
    await pusher.trigger(`game-${game.gameCode}`, 'game:end', {
      finalScores,
    });
    
    console.log(`✅ Game complete! Final scores:`, finalScores);
  } else {
    // Schedule next round
    setTimeout(async () => {
      // Re-fetch game from database to ensure we have latest state
      const { getGame } = await import('@/lib/gameStateDB');
      const currentGame = await getGame(game.gameCode);
      
      if (!currentGame) return;
      
      // Start next round
      await startNewRound(currentGame);
      await currentGame.save();
    }, game.roundEndDuration);
  }
}

// Vector Gem Spawner
async function startVectorGemSpawner(game) {
  const gameCode = game.gameCode;
  console.log(`💎 Starting Vector Gem spawner for game ${gameCode}`);
  
  // Clear any existing spawner for this game
  stopVectorGemSpawner(gameCode);
  
  // Clear existing gems
  game.clearVectorGems();
  await game.save();
  
  // Function to spawn a gem
  const spawnGem = async () => {
    const { getGame } = await import('@/lib/gameStateDB');
    const currentGame = await getGame(gameCode);
    if (!currentGame) {
      stopVectorGemSpawner(gameCode);
      return;
    }
    
    // Only spawn during SEARCH phase
    if (currentGame.roundPhase !== 'SEARCH' || !currentGame.gameActive) {
      stopVectorGemSpawner(gameCode);
      return;
    }
    
    // Check max gems (2)
    const activeGems = currentGame.getActiveVectorGems();
    if (activeGems.length < 2) {
      // Spawn a new gem
      const gem = currentGame.spawnVectorGem();
      await currentGame.save();
      
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
      
      console.log(`💎 Vector Gem spawned in game ${gameCode}: ${gem.id} (reward: ${gem.reward} tokens, position: [${gem.position[0].toFixed(1)}, ${gem.position[1].toFixed(1)}, ${gem.position[2].toFixed(1)}], size: ${gem.size.toFixed(2)})`);
    }
    
    // Schedule next spawn (random 10-30 seconds)
    // Note: In serverless, setTimeout may not persist, so we'll rely on client polling or
    // spawn gems on-demand. For now, we'll still try to schedule, but it may not work.
    const nextSpawnDelay = 10000 + Math.random() * 20000; // 10-30 seconds
    console.log(`💎 Scheduling next gem spawn in ${nextSpawnDelay}ms for game ${gameCode}`);
    const timer = setTimeout(() => {
      console.log(`💎 Next spawn timer fired for game ${gameCode}`);
      spawnGem();
    }, nextSpawnDelay);
    gemSpawnerTimers.set(gameCode, timer);
  };
  
  // Start cleanup timer (runs every 5 seconds to clean expired gems)
  const cleanupGems = async () => {
    const { getGame } = await import('@/lib/gameStateDB');
    const currentGame = await getGame(gameCode);
    if (!currentGame) {
      stopVectorGemSpawner(gameCode);
      return;
    }
    
    // Only cleanup during SEARCH phase
    if (currentGame.roundPhase !== 'SEARCH' || !currentGame.gameActive) {
      return;
    }
    
    const before = currentGame.vectorGems.length;
    const cleaned = currentGame.cleanupExpiredGems();
    
    if (cleaned > 0) {
      await currentGame.save();
      
      // Emit despawn events for expired gems
      const expiredGems = currentGame.vectorGems.filter(g => 
        !g.hitBy && (Date.now() - g.spawnTime) >= 30000
      );
      
      for (const gem of expiredGems) {
        await pusher.trigger(`game-${gameCode}`, 'vector-gem:despawned', {
          gemId: gem.id,
        });
      }
      
      console.log(`🧹 Cleaned up ${cleaned} expired Vector Gems in game ${gameCode}`);
    }
    
    // Schedule next cleanup (every 5 seconds)
    const timer = setTimeout(cleanupGems, 5000);
    gemCleanupTimers.set(gameCode, timer);
  };
  
  // Spawn first gem immediately (or after a very short delay)
  // In serverless environments, setTimeout may not persist, so spawn immediately
  console.log(`💎 Spawning first gem immediately for game ${gameCode}`);
  spawnGem();
  
  // Start cleanup immediately
  console.log(`💎 Starting cleanup timer for game ${gameCode}`);
  cleanupGems();
}

function stopVectorGemSpawner(gameCode) {
  if (gemSpawnerTimers.has(gameCode)) {
    clearTimeout(gemSpawnerTimers.get(gameCode));
    gemSpawnerTimers.delete(gameCode);
  }
  if (gemCleanupTimers.has(gameCode)) {
    clearTimeout(gemCleanupTimers.get(gameCode));
    gemCleanupTimers.delete(gameCode);
  }
}

export async function startNewRound(game) {
  // Select random target word
  const randomIndex = Math.floor(Math.random() * game.wordNodes.length);
  const target = game.wordNodes[randomIndex];

  // Generate definition
  const definition = await generateDefinition(target.label);

  // Reset hint usage, ready status, and tokens for all players at start of new round
  game.getAllPlayers().forEach(player => {
    player.hintUsed = false;
    player.ready = false; // Reset ready status at start of each round
    game.resetPlayerTokens(player.id); // Reset tokens to 15 and tokensOut to false
  });

  // Clear vector gems for new round
  game.clearVectorGems();

  // Start round
  game.startRound(target, definition);
  await game.save(); // Save round start

  // Emit round:start event with player scores
  // Note: Do NOT include embedding - it's too large for Pusher (max 10KB per event)
  // The client will fetch the word from the database if needed for similarity search
  await pusher.trigger(`game-${game.gameCode}`, 'round:start', {
    roundNumber: game.roundNumber,
    maxRounds: game.maxRounds,
    target: {
      id: target.id,
      label: target.label,
      position: target.position,
      // embedding is NOT included - too large for Pusher payload limit
    },
    definition,
    phase: game.roundPhase,
    phaseEndsAt: game.phaseEndsAt,
    roundDuration: game.roundDuration,
    players: game.getAllPlayers().map(p => ({
      id: p.id,
      nickname: p.nickname,
      score: p.score || 0,
      tokens: p.tokens !== undefined ? p.tokens : 15,
      tokensOut: p.tokensOut || false,
    })),
  });

  // Schedule phase transitions
  setTimeout(async () => {
    // Re-fetch game to ensure we have latest state
    const { getGame } = await import('@/lib/gameStateDB');
    const currentGame = await getGame(game.gameCode);
    if (!currentGame) return;
    
    currentGame.startSearchPhase();
    await currentGame.save();
    await pusher.trigger(`game-${currentGame.gameCode}`, 'round:phase-change', {
      phase: currentGame.roundPhase,
      phaseEndsAt: currentGame.phaseEndsAt,
      roundDuration: currentGame.roundDuration,
    });
    
    // Start vector gem spawner when SEARCH phase begins
    await startVectorGemSpawner(currentGame);
  }, game.targetRevealDuration);

  // Schedule round timeout check
  setTimeout(async () => {
    // Re-fetch game to ensure we have latest state
    const { getGame } = await import('@/lib/gameStateDB');
    const currentGame = await getGame(game.gameCode);
    if (!currentGame) return;
    
    if (currentGame.roundPhase === 'SEARCH' && !currentGame.roundWinner) {
      // Stop vector gem spawner
      stopVectorGemSpawner(currentGame.gameCode);
      
      // Round ended without winner - change to WAITING_FOR_READY phase
      currentGame.roundPhase = 'WAITING_FOR_READY';
      // Reset all players' ready status
      currentGame.getAllPlayers().forEach(player => {
        player.ready = false;
        currentGame.players.set(player.id, player);
      });
      await currentGame.save();
      
      // Emit event to notify clients
      await pusher.trigger(`game-${currentGame.gameCode}`, 'round:timeout', {
        roundNumber: currentGame.roundNumber,
        targetLabel: currentGame.currentTarget?.label,
        players: currentGame.getAllPlayers().map(p => ({
          id: p.id,
          nickname: p.nickname,
          ready: false,
          score: p.score || 0,
          tokens: p.tokens !== undefined ? p.tokens : 15,
          tokensOut: p.tokensOut || false,
        })),
      });
    }
  }, game.targetRevealDuration + game.roundDuration);
}
