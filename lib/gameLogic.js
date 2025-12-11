import { generateDefinition } from '@/lib/openai';
import pusher from '@/lib/pusher';
import connectDB from '@/lib/mongodb';
import PlayerStats from '@/models/PlayerStats';

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

export async function startNewRound(game) {
  // Select random target word
  const randomIndex = Math.floor(Math.random() * game.wordNodes.length);
  const target = game.wordNodes[randomIndex];

  // Generate definition
  const definition = await generateDefinition(target.label);

  // Reset hint usage and ready status for all players at start of new round
  game.getAllPlayers().forEach(player => {
    player.hintUsed = false;
    player.ready = false; // Reset ready status at start of each round
    game.players.set(player.id, player);
  });

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
  }, game.targetRevealDuration);

  // Schedule round timeout check
  setTimeout(async () => {
    // Re-fetch game to ensure we have latest state
    const { getGame } = await import('@/lib/gameStateDB');
    const currentGame = await getGame(game.gameCode);
    if (!currentGame) return;
    
    if (currentGame.roundPhase === 'SEARCH' && !currentGame.roundWinner) {
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
        })),
      });
    }
  }, game.targetRevealDuration + game.roundDuration);
}
