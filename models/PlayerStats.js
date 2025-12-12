import mongoose from 'mongoose';

const PlayerStatsSchema = new mongoose.Schema({
  nickname: {
    type: String,
    required: true,
    index: true,
  },
  totalGames: {
    type: Number,
    default: 0,
  },
  totalScore: {
    type: Number,
    default: 0,
  },
  gamesWon: {
    type: Number,
    default: 0,
  },
  averageScore: {
    type: Number,
    default: 0,
  },
  bestScore: {
    type: Number,
    default: 0,
  },
  lastPlayed: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Index for leaderboard queries
PlayerStatsSchema.index({ totalScore: -1 });
PlayerStatsSchema.index({ averageScore: -1 });
PlayerStatsSchema.index({ gamesWon: -1 });

// Compound index for efficient leaderboard queries
PlayerStatsSchema.index({ totalScore: -1, gamesWon: -1 });

const PlayerStats = mongoose.models.PlayerStats || mongoose.model('PlayerStats', PlayerStatsSchema);

export default PlayerStats;

