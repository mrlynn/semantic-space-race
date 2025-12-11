import { generateDefinition } from '@/lib/openai';
import pusher from '@/lib/pusher';

export async function endRound(game, winnerId, winnerNickname) {
  game.endRound(winnerId, winnerNickname);
  await game.save(); // Save round end state

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

  // Schedule next round or end game
  setTimeout(async () => {
    // Re-fetch game from database to ensure we have latest state
    const { getGame } = await import('@/lib/gameStateDB');
    const currentGame = await getGame(game.gameCode);
    
    if (!currentGame) return;
    
    // Check if we've completed all rounds
    // roundNumber is incremented at the START of each round, so:
    // - After round 1 ends: roundNumber = 1, maxRounds = 5 → continue
    // - After round 5 ends: roundNumber = 5, maxRounds = 5 → end game
    if (currentGame.roundNumber >= currentGame.maxRounds) {
      // End game - we've completed all rounds
      currentGame.gameActive = false;
      await currentGame.save();
      await pusher.trigger(`game-${currentGame.gameCode}`, 'game:end', {
        finalScores: currentGame.getAllPlayers().map(p => ({
          id: p.id,
          nickname: p.nickname,
          score: p.score || 0,
        })).sort((a, b) => (b.score || 0) - (a.score || 0)), // Sort by score descending
      });
    } else {
      // Start next round
      await startNewRound(currentGame);
      await currentGame.save();
    }
  }, game.roundEndDuration);
}

export async function startNewRound(game) {
  // Select random target word
  const randomIndex = Math.floor(Math.random() * game.wordNodes.length);
  const target = game.wordNodes[randomIndex];

  // Generate definition
  const definition = await generateDefinition(target.label);

  // Reset hint usage for all players at start of new round
  game.getAllPlayers().forEach(player => {
    player.hintUsed = false;
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

  // Schedule round end check
  setTimeout(async () => {
    // Re-fetch game to ensure we have latest state
    const { getGame } = await import('@/lib/gameStateDB');
    const currentGame = await getGame(game.gameCode);
    if (!currentGame) return;
    
    if (currentGame.roundPhase === 'SEARCH' && !currentGame.roundWinner) {
      // Round ended without winner
      await endRound(currentGame, null, null);
      await currentGame.save();
    }
  }, game.targetRevealDuration + game.roundDuration);
}
