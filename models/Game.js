import mongoose from 'mongoose';

const PlayerSchema = new mongoose.Schema({
  id: String,
  nickname: String,
  ready: Boolean,
  score: Number,
  position: [Number],
  rotation: [Number],
  currentNodeId: String,
  tokens: {
    type: Number,
    default: 15,
  },
  tokensOut: {
    type: Boolean,
    default: false,
  },
}, { _id: false });

const GameSchema = new mongoose.Schema({
  gameCode: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  hostId: {
    type: String,
    required: true,
  },
  gameActive: {
    type: Boolean,
    default: false,
  },
  roundNumber: {
    type: Number,
    default: 0,
  },
  maxRounds: {
    type: Number,
    default: 5,
  },
  currentTarget: {
    id: String,
    label: String,
    position: [Number],
    embedding: [Number],
  },
  currentDefinition: {
    type: String,
    default: '',
  },
  roundPhase: {
    type: String,
    enum: ['TUTORIAL', 'TARGET_REVEAL', 'SEARCH', 'END', 'WAITING_FOR_READY'],
    default: 'TUTORIAL',
  },
  phaseEndsAt: Number,
  roundDuration: {
    type: Number,
    default: 120000, // 120 seconds
  },
  targetRevealDuration: {
    type: Number,
    default: 3000,
  },
  roundEndDuration: {
    type: Number,
    default: 5000,
  },
  roundWinner: String,
  roundWinnerNickname: String,
  players: [PlayerSchema],
  wordNodes: [{
    id: String,
    label: String,
    position: [Number],
    embedding: [Number],
  }],
  topic: {
    type: String,
    default: 'general',
  },
  vectorGems: [{
    id: String,
    position: [Number], // [x, y, z]
    velocity: [Number], // [vx, vy, vz] - direction and speed
    size: Number, // Size multiplier (0.5 to 2.0)
    reward: Number, // Tokens to award (1-10)
    spawnTime: Number, // Timestamp when spawned
    hitBy: String, // playerId who hit it (null if not hit)
  }],
}, {
  timestamps: true,
});

// TTL index to auto-delete old games after 24 hours
GameSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 });

const Game = mongoose.models.Game || mongoose.model('Game', GameSchema);

export default Game;

