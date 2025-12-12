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
    this.difficulty = data.difficulty || 'intermediate';
    this.educationalMode = data.educationalMode || null;
    this.vectorGems = data.vectorGems || [];
    this.badAsteroids = data.badAsteroids || [];
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

  resetPlayerTokens(playerId) {
    const player = this.players.get(playerId);
    if (player) {
      player.tokens = 15;
      player.tokensOut = false;
      player.hintUsed = false;
      player.rerankerUsed = false;
      this.players.set(playerId, player);
    }
  }

  deductTokens(playerId, amount) {
    const player = this.players.get(playerId);
    if (!player) {
      return { success: false, error: 'Player not found' };
    }

    // Initialize tokens if not set
    if (player.tokens === undefined || player.tokens === null) {
      player.tokens = 15;
    }

    // Check if player already out
    if (player.tokensOut || player.tokens === 0) {
      return { success: false, error: 'Player is out of tokens', tokens: player.tokens };
    }

    // Check if sufficient tokens
    if (player.tokens < amount) {
      return { 
        success: false, 
        error: `Insufficient tokens. You need ${amount} tokens but only have ${player.tokens}.`,
        tokens: player.tokens 
      };
    }

    // Deduct tokens
    player.tokens = Math.max(0, player.tokens - amount);
    
    // Check if player is now out
    if (player.tokens === 0) {
      player.tokensOut = true;
    }

    this.players.set(playerId, player);
    return { 
      success: true, 
      tokens: player.tokens, 
      tokensOut: player.tokensOut 
    };
  }

  isPlayerOut(playerId) {
    const player = this.players.get(playerId);
    if (!player) return false;
    return player.tokensOut || (player.tokens !== undefined && player.tokens === 0);
  }

  spawnVectorGem() {
    // Generate random properties
    const id = `gem-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Random position in 3D space (closer to origin where words are, within reasonable bounds)
    // Words are typically in a range around origin, so spawn gems in a similar area
    const position = [
      (Math.random() - 0.5) * 2000, // x: -1000 to 1000
      (Math.random() - 0.5) * 2000, // y: -1000 to 1000
      (Math.random() - 0.5) * 2000, // z: -1000 to 1000
    ];
    
    // Random velocity (direction and speed)
    const speed = 5 + Math.random() * 15; // 5-20 units/frame
    // Random direction vector
    const dx = (Math.random() - 0.5) * 2;
    const dy = (Math.random() - 0.5) * 2;
    const dz = (Math.random() - 0.5) * 2;
    // Normalize
    const length = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const velocity = length > 0 ? [
      (dx / length) * speed,
      (dy / length) * speed,
      (dz / length) * speed,
    ] : [speed, 0, 0]; // Fallback if all zeros
    
    // Random size multiplier (0.5 to 2.0)
    const size = 0.5 + Math.random() * 1.5;
    
    // Random reward (1-10 tokens)
    const reward = Math.floor(Math.random() * 10) + 1;
    
    const gem = {
      id,
      position,
      velocity,
      size,
      reward,
      spawnTime: Date.now(),
      hitBy: null,
    };
    
    this.vectorGems.push(gem);
    return gem;
  }

  getActiveVectorGems() {
    const now = Date.now();
    const maxAge = 30000; // 30 seconds
    
    return this.vectorGems.filter(gem => {
      // Not hit and not expired
      return !gem.hitBy && (now - gem.spawnTime) < maxAge;
    });
  }

  hitVectorGem(gemId, playerId) {
    console.log(`💎 [GameState] hitVectorGem called: gemId=${gemId}, playerId=${playerId}, gemIdType=${typeof gemId}`);
    console.log(`💎 [GameState] Total gems in array: ${this.vectorGems.length}`);
    console.log(`💎 [GameState] Gem IDs in array:`, this.vectorGems.map(g => ({ id: g.id, idType: typeof g.id, hitBy: g.hitBy })));
    
    // Normalize gemId to string for comparison
    const gemIdStr = typeof gemId === 'string' ? gemId : String(gemId);
    
    // Try multiple comparison methods to handle edge cases
    const gem = this.vectorGems.find(g => {
      const gIdStr = typeof g.id === 'string' ? g.id : String(g.id);
      return gIdStr === gemIdStr || g.id === gemId || String(g.id) === String(gemId);
    });
    
    if (!gem) {
      console.error(`💎 [GameState] Gem not found! Looking for: ${gemId} (type: ${typeof gemId}, normalized: ${gemIdStr})`);
      console.error(`💎 [GameState] Available gems:`, this.vectorGems.map(g => ({ 
        id: g.id, 
        idType: typeof g.id,
        idString: String(g.id),
        hitBy: g.hitBy,
        age: Date.now() - g.spawnTime,
        expired: (Date.now() - g.spawnTime) >= 30000
      })));
      return { success: false, error: 'Gem not found' };
    }
    
    console.log(`💎 [GameState] Found gem:`, { id: gem.id, reward: gem.reward, hitBy: gem.hitBy });
    
    // Check if already hit
    if (gem.hitBy) {
      return { success: false, error: 'Gem already hit' };
    }
    
    // Check if expired (30 seconds)
    const now = Date.now();
    if (now - gem.spawnTime > 30000) {
      return { success: false, error: 'Gem expired' };
    }
    
    // Mark as hit
    gem.hitBy = playerId;
    
    // Award tokens to player (bonus, doesn't deduct shooting cost)
    const player = this.players.get(playerId);
    if (!player) {
      console.error(`💎 [GameState] hitVectorGem: Player ${playerId} not found in players Map`);
      return { success: false, error: 'Player not found' };
    }
    
    // Get initial token count
    const tokensBefore = player.tokens !== undefined && player.tokens !== null ? player.tokens : 15;
    
    // Ensure tokens is initialized
    if (player.tokens === undefined || player.tokens === null) {
      player.tokens = 15;
    }
    
    // Award the reward - create a new player object to ensure immutability
    const updatedPlayer = {
      ...player,
      tokens: (player.tokens || 15) + gem.reward,
    };
    const tokensAfter = updatedPlayer.tokens;
    
    // If player was out, they're back in
    if (updatedPlayer.tokensOut && updatedPlayer.tokens > 0) {
      updatedPlayer.tokensOut = false;
    }
    
    // Update the player in the Map with the new object
    this.players.set(playerId, updatedPlayer);
    
    // Verify the update immediately
    const verifyPlayer = this.players.get(playerId);
    console.log(`💎 [GameState] hitVectorGem: Player ${playerId} hit gem ${gemId}`);
    console.log(`💎 [GameState] Token update: ${tokensBefore} + ${gem.reward} = ${tokensAfter}`);
    console.log(`💎 [GameState] Player object before Map update:`, { tokens: player.tokens, tokensOut: player.tokensOut });
    console.log(`💎 [GameState] Player object after Map update:`, { tokens: verifyPlayer.tokens, tokensOut: verifyPlayer.tokensOut });
    console.log(`💎 [GameState] Updated player object:`, JSON.stringify(updatedPlayer));
    
    return {
      success: true,
      reward: gem.reward,
      tokens: tokensAfter,
    };
  }

  cleanupExpiredGems() {
    const now = Date.now();
    const maxAge = 30000; // 30 seconds
    
    const before = this.vectorGems.length;
    this.vectorGems = this.vectorGems.filter(gem => {
      // Keep if hit (for history) or not expired
      return gem.hitBy || (now - gem.spawnTime) < maxAge;
    });
    
    return before - this.vectorGems.length; // Return number cleaned up
  }

  clearVectorGems() {
    this.vectorGems = [];
  }

  spawnBadAsteroid() {
    // Generate random properties
    const id = `asteroid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Random position in 3D space (closer to origin where words are, within reasonable bounds)
    const position = [
      (Math.random() - 0.5) * 2000, // x: -1000 to 1000
      (Math.random() - 0.5) * 2000, // y: -1000 to 1000
      (Math.random() - 0.5) * 2000, // z: -1000 to 1000
    ];
    
    // Random velocity (direction and speed) - slightly slower than gems
    const speed = 3 + Math.random() * 12; // 3-15 units/frame
    // Random direction vector
    const dx = (Math.random() - 0.5) * 2;
    const dy = (Math.random() - 0.5) * 2;
    const dz = (Math.random() - 0.5) * 2;
    // Normalize
    const length = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const velocity = length > 0 ? [
      (dx / length) * speed,
      (dy / length) * speed,
      (dz / length) * speed,
    ] : [speed, 0, 0]; // Fallback if all zeros
    
    // Random size multiplier (0.5 to 2.0)
    const size = 0.5 + Math.random() * 1.5;
    
    // Random cost (1-5 tokens) - costs less than gems reward to keep it fair
    const cost = Math.floor(Math.random() * 5) + 1;
    
    const asteroid = {
      id,
      position,
      velocity,
      size,
      cost,
      spawnTime: Date.now(),
      hitBy: null,
    };
    
    this.badAsteroids.push(asteroid);
    return asteroid;
  }

  getActiveBadAsteroids() {
    const now = Date.now();
    const maxAge = 30000; // 30 seconds
    
    return this.badAsteroids.filter(asteroid => {
      // Not hit and not expired
      return !asteroid.hitBy && (now - asteroid.spawnTime) < maxAge;
    });
  }

  hitBadAsteroid(asteroidId, playerId) {
    console.log(`☄️ [GameState] hitBadAsteroid called: asteroidId=${asteroidId}, playerId=${playerId}`);
    
    // Normalize asteroidId to string for comparison
    const asteroidIdStr = typeof asteroidId === 'string' ? asteroidId : String(asteroidId);
    
    // Find the asteroid
    const asteroid = this.badAsteroids.find(a => {
      const aIdStr = typeof a.id === 'string' ? a.id : String(a.id);
      return aIdStr === asteroidIdStr || a.id === asteroidId || String(a.id) === String(asteroidId);
    });
    
    if (!asteroid) {
      console.error(`☄️ [GameState] Bad asteroid not found! Looking for: ${asteroidId}`);
      return { success: false, error: 'Bad asteroid not found' };
    }
    
    // Check if already hit
    if (asteroid.hitBy) {
      return { success: false, error: 'Bad asteroid already hit' };
    }
    
    // Check if expired (30 seconds)
    const now = Date.now();
    if (now - asteroid.spawnTime > 30000) {
      return { success: false, error: 'Bad asteroid expired' };
    }
    
    // Mark as hit
    asteroid.hitBy = playerId;
    
    // Deduct tokens from player
    const player = this.players.get(playerId);
    if (!player) {
      console.error(`☄️ [GameState] hitBadAsteroid: Player ${playerId} not found`);
      return { success: false, error: 'Player not found' };
    }
    
    // Get initial token count
    const tokensBefore = player.tokens !== undefined && player.tokens !== null ? player.tokens : 15;
    
    // Deduct cost (but don't go below 0)
    const tokensAfter = Math.max(0, tokensBefore - asteroid.cost);
    const tokensOut = tokensAfter === 0;
    
    // Update player
    const updatedPlayer = {
      ...player,
      tokens: tokensAfter,
      tokensOut: tokensOut,
    };
    
    // Update the player in the Map
    this.players.set(playerId, updatedPlayer);
    
    console.log(`☄️ [GameState] Player ${playerId} hit bad asteroid ${asteroidId}`);
    console.log(`☄️ [GameState] Token deduction: ${tokensBefore} - ${asteroid.cost} = ${tokensAfter}`);
    
    return {
      success: true,
      cost: asteroid.cost,
      tokens: tokensAfter,
      tokensOut: tokensOut,
      tokensBefore: tokensBefore,
    };
  }

  cleanupExpiredBadAsteroids() {
    const now = Date.now();
    const maxAge = 30000; // 30 seconds
    
    const before = this.badAsteroids.length;
    this.badAsteroids = this.badAsteroids.filter(asteroid => {
      // Keep if hit (for history) or not expired
      return asteroid.hitBy || (now - asteroid.spawnTime) < maxAge;
    });
    
    return before - this.badAsteroids.length; // Return number cleaned up
  }

  clearBadAsteroids() {
    this.badAsteroids = [];
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
      vectorGems: this.vectorGems,
      badAsteroids: this.badAsteroids,
    };
  }

  // Save to database
  async save() {
    try {
      await connectDB();
      const data = this.toObject();
      
      // Log player tokens before save for debugging
      console.log(`💎 [GameState] save() called. Player tokens in data:`, 
        data.players.map(p => ({ id: p.id, nickname: p.nickname, tokens: p.tokens }))
      );
      
      if (this._id) {
        // Use $set to ensure all fields are updated, including nested arrays
        // Use writeConcern: 'majority' for better reliability, but don't wait for journal if it's slow
        const result = await Game.findByIdAndUpdate(
          this._id, 
          { $set: data },
          { 
            new: true, 
            runValidators: true,
            // Don't wait for write acknowledgment if connection is slow
            // This helps prevent EPIPE errors when client disconnects
          }
        );
        if (result) {
          this._doc = result;
          // Verify tokens were saved correctly
          const savedPlayer = result.players.find(p => p.id === data.players[0]?.id);
          if (savedPlayer) {
            console.log(`💎 [GameState] save() completed. Saved player tokens:`, savedPlayer.tokens);
          }
        }
      } else {
        const game = await Game.create(data);
        this._id = game._id;
        this._doc = game;
      }
      return this;
    } catch (error) {
      // Handle EPIPE and connection errors gracefully
      if (error.code === 'EPIPE' || error.errno === -32) {
        console.warn('⚠️ [GameState] save() - Client disconnected (EPIPE), operation may have completed');
        // Return this anyway - the operation may have succeeded before disconnect
        return this;
      }
      // Re-throw other errors
      throw error;
    }
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

export async function createGame(gameCode, hostId, topic = 'general-database', difficulty = 'intermediate', educationalMode = null) {
  await connectDB();
  const gameData = {
    gameCode,
    hostId,
    players: [],
    topic,
    difficulty,
    educationalMode,
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

