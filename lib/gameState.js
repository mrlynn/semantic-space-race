// In-memory game state storage
// In production, consider using Redis or a database for persistence

const games = new Map(); // gameCode -> GameState

export class GameState {
  constructor(gameCode, hostId) {
    this.gameCode = gameCode;
    this.gameActive = false;
    this.roundNumber = 0;
    this.maxRounds = 5;
    this.currentTarget = null;
    this.currentDefinition = '';
    this.roundPhase = 'TUTORIAL'; // 'TUTORIAL' | 'TARGET_REVEAL' | 'SEARCH' | 'END'
    this.phaseEndsAt = null;
    this.roundDuration = 60000; // 60 seconds
    this.targetRevealDuration = 3000; // 3 seconds
    this.roundEndDuration = 5000; // 5 seconds
    this.roundWinner = null;
    this.roundWinnerNickname = null;
    this.players = new Map(); // playerId -> Player
    this.wordNodes = [];
    this.hostId = hostId;
  }

  addPlayer(player) {
    this.players.set(player.id, player);
  }

  removePlayer(playerId) {
    this.players.delete(playerId);
  }

  getPlayer(playerId) {
    return this.players.get(playerId);
  }

  getAllPlayers() {
    return Array.from(this.players.values());
  }

  updatePlayerScore(playerId, points) {
    const player = this.players.get(playerId);
    if (player) {
      player.score += points;
    }
  }

  setCurrentTarget(target) {
    this.currentTarget = target;
  }

  setCurrentDefinition(definition) {
    this.currentDefinition = definition;
  }

  startRound(target, definition) {
    this.roundNumber++;
    this.currentTarget = target;
    this.currentDefinition = definition;
    this.roundWinner = null;
    this.roundWinnerNickname = null;
    this.roundPhase = 'TARGET_REVEAL';
    this.phaseEndsAt = Date.now() + this.targetRevealDuration;
  }

  startSearchPhase() {
    this.roundPhase = 'SEARCH';
    this.phaseEndsAt = Date.now() + this.roundDuration;
  }

  endRound(winnerId, winnerNickname) {
    this.roundPhase = 'END';
    this.roundWinner = winnerId;
    this.roundWinnerNickname = winnerNickname;
    this.phaseEndsAt = Date.now() + this.roundEndDuration;
  }

  isGameComplete() {
    return this.roundNumber >= this.maxRounds;
  }
}

export function getGame(gameCode) {
  return games.get(gameCode);
}

export function createGame(gameCode, hostId) {
  const game = new GameState(gameCode, hostId);
  games.set(gameCode, game);
  return game;
}

export function deleteGame(gameCode) {
  games.delete(gameCode);
}

export function getAllGames() {
  return Array.from(games.values());
}

