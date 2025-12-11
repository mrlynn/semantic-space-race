// MongoDB-based game state storage
import connectDB from './mongodb.js';
import Game from '../models/Game.js';

export class GameState {
  constructor(data) {
    this.gameCode = data.gameCode;
    this.hostId = data.hostId;
    this.gameActive = data.gameActive || false;
    this.roundNumber = data.roundNumber || 0;
    this.maxRounds = data.maxRounds || 5;
    this.currentTarget = data.currentTarget || null;
    this.currentDefinition = data.currentDefinition || '';
    this.roundPhase = data.roundPhase || 'TUTORIAL';
    this.phaseEndsAt = data.phaseEndsAt || null;
    this.roundDuration = data.roundDuration || 120000; // 120 seconds
    this.targetRevealDuration = data.targetRevealDuration || 3000;
    this.roundEndDuration = data.roundEndDuration || 5000;
    this.roundWinner = data.roundWinner || null;
    this.roundWinnerNickname = data.roundWinnerNickname || null;
    this.players = new Map((data.players || []).map(p => [p.id, p]));
    this.wordNodes = data.wordNodes || [];
    this.topic = data.topic || 'general-database';
    this._id = data._id;
    this._doc = data;
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
      player.score = (player.score || 0) + points;
      // Update the player in the map
      this.players.set(playerId, player);
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
    // Game is complete when we've finished the last round
    // Since roundNumber is incremented at the start of each round,
    // we check if we've completed maxRounds rounds
    // After round maxRounds ends, roundNumber will be maxRounds, so we check > instead of >=
    return this.roundNumber > this.maxRounds;
  }

  // Convert to plain object for MongoDB
  toObject() {
    return {
      gameCode: this.gameCode,
      hostId: this.hostId,
      gameActive: this.gameActive,
      roundNumber: this.roundNumber,
      maxRounds: this.maxRounds,
      currentTarget: this.currentTarget,
      currentDefinition: this.currentDefinition,
      roundPhase: this.roundPhase,
      phaseEndsAt: this.phaseEndsAt,
      roundDuration: this.roundDuration,
      targetRevealDuration: this.targetRevealDuration,
      roundEndDuration: this.roundEndDuration,
      roundWinner: this.roundWinner,
      roundWinnerNickname: this.roundWinnerNickname,
      players: Array.from(this.players.values()),
      wordNodes: this.wordNodes,
      topic: this.topic,
    };
  }

  // Save to database
  async save() {
    await connectDB();
    const data = this.toObject();
    if (this._id) {
      await Game.findByIdAndUpdate(this._id, data);
    } else {
      const game = await Game.create(data);
      this._id = game._id;
      this._doc = game;
    }
    return this;
  }
}

export async function getGame(gameCode) {
  await connectDB();
  const gameDoc = await Game.findOne({ gameCode }).lean();
  if (!gameDoc) {
    return null;
  }
  return new GameState(gameDoc);
}

export async function createGame(gameCode, hostId, topic = 'general-database') {
  await connectDB();
  const gameData = {
    gameCode,
    hostId,
    players: [],
    topic,
  };
  const gameDoc = await Game.create(gameData);
  return new GameState(gameDoc.toObject());
}

export async function deleteGame(gameCode) {
  await connectDB();
  await Game.deleteOne({ gameCode });
}

export async function getAllGames() {
  await connectDB();
  const games = await Game.find({}).lean();
  return games.map(game => new GameState(game));
}

