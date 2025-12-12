# Semantic Hop - Gameplay Documentation

## Table of Contents
1. [Game Overview](#game-overview)
2. [Technical Architecture](#technical-architecture)
3. [Player Experience](#player-experience)
4. [Game Mechanics](#game-mechanics)
5. [Points and Tokens System](#points-and-tokens-system)
6. [Strategy Guide](#strategy-guide)
7. [Round Structure](#round-structure)
8. [Vector Gems System](#vector-gems-system)

---

## Game Overview

**Semantic Hop** is a multiplayer semantic guessing game where players navigate through a 3D graph of words using vector embeddings and semantic similarity. Players receive AI-generated definitions/riddles for target words and must use semantic similarity to find and guess the correct word by "hopping" between related words in the graph.

### Core Concept
- Players are presented with a riddle/definition for a target word
- They navigate through a 3D visualization of word relationships
- Words are represented as nodes in a semantic graph (HNSW structure)
- Players use vector search and semantic similarity feedback to find the target
- First player to correctly guess the target word wins the round

---

## Technical Architecture

### Database Schema

#### Game Model
```javascript
{
  gameCode: String,              // Unique game identifier
  hostId: String,                // Player ID of game host
  gameActive: Boolean,           // Whether game is currently running
  roundNumber: Number,           // Current round (0-5)
  maxRounds: Number,             // Total rounds per game (default: 5)
  currentTarget: {
    id: String,                  // Word node ID
    label: String,               // Word text
    position: [Number, Number, Number],  // 3D coordinates
    embedding: [Number]          // Vector embedding (1536 dimensions)
  },
  currentDefinition: String,    // AI-generated riddle/definition
  roundPhase: String,            // 'TUTORIAL' | 'TARGET_REVEAL' | 'SEARCH' | 'END' | 'WAITING_FOR_READY'
  phaseEndsAt: Number,           // Timestamp when current phase ends
  roundDuration: Number,         // Search phase duration (120000ms = 120 seconds)
  targetRevealDuration: Number,  // Target reveal duration (3000ms = 3 seconds)
  roundEndDuration: Number,      // End phase duration (5000ms = 5 seconds)
  roundWinner: String,           // Player ID of round winner
  roundWinnerNickname: String,    // Nickname of round winner
  players: [PlayerSchema],        // Array of players
  wordNodes: [WordNode],          // Words in the game graph
  topic: String,                 // Topic filter for words (e.g., 'general-database')
  vectorGems: [VectorGem]         // Active gems in the round
}
```

#### Player Schema
```javascript
{
  id: String,                     // Unique player identifier
  nickname: String,               // Player display name
  ready: Boolean,                 // Ready status for next round
  score: Number,                  // Total points accumulated
  position: [Number, Number, Number],  // Current 3D position
  rotation: [Number, Number, Number],  // Current rotation
  currentNodeId: String,          // ID of word node player is currently on
  tokens: Number,                 // Current token count (default: 15)
  tokensOut: Boolean,             // Whether player has run out of tokens
  hintUsed: Boolean               // Whether player used hint this round
}
```

#### Vector Gem Schema
```javascript
{
  id: String,                     // Unique gem identifier
  position: [Number, Number, Number],  // 3D position [x, y, z]
  velocity: [Number, Number, Number],   // Movement vector [vx, vy, vz]
  size: Number,                   // Size multiplier (0.5 to 2.0)
  reward: Number,                  // Tokens awarded (1-10)
  spawnTime: Number,              // Timestamp when spawned
  hitBy: String                   // Player ID who hit it (null if not hit)
}
```

### API Endpoints

#### `/api/game/start` (POST)
- **Purpose**: Start a new game or restart an ended game
- **Requirements**: Player must be the host
- **Actions**:
  - Resets all player scores to 0
  - Resets ready status
  - Loads words from database filtered by topic
  - Sets `gameActive = true`
  - Emits `game:start` event
  - Calls `startNewRound()` to begin first round

#### `/api/game/guess` (POST)
- **Purpose**: Process a player's word guess or shoot action
- **Parameters**: `{ gameCode, playerId, guess, actionType }`
- **Token Costs**:
  - `actionType: 'guess'` → 3 tokens
  - `actionType: 'shoot'` → 2 tokens
- **Process**:
  1. Validates game is in SEARCH phase
  2. Checks player has sufficient tokens
  3. Deducts tokens based on action type
  4. Finds or generates embedding for guessed word
  5. Calculates cosine similarity to target
  6. If word is in graph AND (exact match OR similarity ≥ 0.99):
     - Awards 10 points
     - Sets round winner
     - Ends round
  7. Updates player position if word is in graph
  8. Returns similarity score and feedback

#### `/api/game/hint` (POST)
- **Purpose**: Generate and provide an AI-powered hint
- **Token Cost**: 5 tokens
- **Point Penalty**: -3 points
- **Restrictions**: One hint per round per player
- **Process**:
  1. Validates game is in SEARCH phase
  2. Checks player hasn't used hint this round
  3. Checks player has sufficient tokens
  4. Deducts 5 tokens
  5. Generates hint using OpenAI API
  6. Deducts 3 points from player score
  7. Marks hint as used
  8. Returns hint text

#### `/api/game/gems` (GET)
- **Purpose**: Check for and spawn vector gems if needed
- **Parameters**: `gameCode` (query parameter)
- **Process**:
  - Only works during SEARCH phase
  - Cleans up expired gems (30 seconds old)
  - Spawns new gems if active count < 2
  - Returns all active gems

#### `/api/game/hit-gem` (POST)
- **Purpose**: Process a player hitting a vector gem
- **Parameters**: `{ gameCode, playerId, gemId }`
- **Process**:
  1. Validates game is in SEARCH phase
  2. Checks player is not out of tokens
  3. Validates gem exists and is not expired
  4. Awards gem reward (1-10 tokens) to player
  5. Marks gem as hit
  6. Updates player tokens
  7. If player was out and now has tokens, sets `tokensOut = false`
  8. Emits `vector-gem:hit` and `player:tokens-updated` events

#### `/api/game/advance-round` (POST)
- **Purpose**: Manually advance to next round (fallback for serverless)
- **Requirements**: Game must be in END or WAITING_FOR_READY phase
- **Process**:
  - Checks if all rounds complete (ends game if so)
  - Calls `startNewRound()` to begin next round

### Real-time Events (Pusher)

#### Client → Server Events
- None (all communication via REST API)

#### Server → Client Events
- `game:start` - Game has started
- `round:start` - New round has begun
- `round:phase-change` - Phase transition (TARGET_REVEAL → SEARCH)
- `round:end` - Round has ended with winner
- `round:timeout` - Round ended without winner
- `game:end` - Game has completed
- `player:correct-guess` - Player guessed correctly
- `player:position-update` - Player moved to new word
- `player:tokens-updated` - Player token count changed
- `player:out` - Player ran out of tokens
- `player:back-in` - Player got tokens back (from gem)
- `vector-gem:spawned` - New gem appeared
- `vector-gem:despawned` - Gem expired/removed
- `vector-gem:hit` - Gem was hit by player

---

## Player Experience

### Game Flow

#### 1. Lobby Phase
- Players join game using game code
- Host sees "Start Game" button
- Players see list of other players
- All players wait in lobby

#### 2. Game Start
- Host clicks "Start Game"
- All players transition to game view
- First round begins automatically

#### 3. Round Phases

##### TARGET_REVEAL Phase (3 seconds)
- Target word is selected randomly
- AI-generated definition/riddle is displayed
- Players cannot interact yet
- Countdown shows time until search begins

##### SEARCH Phase (120 seconds)
- Players can navigate the word graph
- Players can make guesses
- Players can shoot at words/gems
- Players can request hints
- Real-time similarity feedback provided
- Vector gems spawn and move through space
- First correct guess ends the round

##### END Phase (5 seconds)
- Round winner announced
- Scores displayed
- Next round begins automatically (or game ends)

##### WAITING_FOR_READY Phase
- Occurs if round times out without winner
- Players must mark ready to continue
- Host can manually advance round

#### 4. Game End
- After 5 rounds complete
- Final scores displayed
- Leaderboard updated
- Players can start new game

### User Interface Elements

#### 3D Word Graph
- **Visualization**: Three.js-based 3D scene
- **Word Nodes**: Spheres representing words
- **Current Node**: Highlighted in green
- **Related Words**: Highlighted differently
- **Camera**: Free rotation/zoom (OrbitControls)
- **Interaction**: Click words to hop, click/shoot to interact

#### HUD Elements
- **Definition Display**: Shows current target's riddle
- **Similarity Feedback**: Hot/Warm/Cold indicators
- **Token Counter**: Current token count
- **Score Display**: Current points
- **Round Counter**: "Round X/5"
- **Timer**: Time remaining in search phase
- **Neighbor Words Panel**: Shows nearby words
- **Related Words Panel**: Shows words similar to target
- **Hint Button**: Request AI-generated hint

#### Shooting System
- **Click to Shoot**: Click anywhere in 3D space
- **Spacebar to Shoot**: Shoot in camera direction
- **Visual Feedback**: Bullet trails and hit effects
- **Target Priority**: Gems prioritized over words
- **Hit Detection**: Sphere-based collision detection

---

## Game Mechanics

### Word Graph Navigation

#### Graph Structure
- Words are nodes in an HNSW (Hierarchical Navigable Small World) graph
- Each word has:
  - **Label**: The word text
  - **Position**: 3D coordinates from PCA projection of embeddings
  - **Embedding**: 1536-dimensional vector (OpenAI embeddings)
  - **Neighbors**: Semantically similar words (HNSW edges)

#### Player Movement
- **Node Snapping**: Players snap to word nodes (no free-flight)
- **Hop Action**: 
  - Type word in input field and press Enter
  - Click a word from neighbor panel
  - Click a word from related words panel
  - Shoot a word (costs 2 tokens)
- **Position Update**: Player's `currentNodeId` and `position` updated
- **Broadcast**: Other players see position updates via Pusher

### Guessing Mechanism

#### Guess Methods
1. **Type and Submit** (3 tokens)
   - Type word in input field
   - Press Enter or click submit
   - If word exists in graph, player hops to it
   - Similarity calculated and displayed
   - If exact match or similarity ≥ 0.99 → win round

2. **Shoot Word** (2 tokens)
   - Click or press Spacebar to shoot
   - Raycast detects word hit
   - Player hops to hit word
   - Similarity calculated
   - If exact match or similarity ≥ 0.99 → win round

3. **Click Neighbor** (3 tokens)
   - Click word from neighbor panel
   - Treated as guess action
   - Player hops to word
   - Similarity calculated

#### Similarity Calculation
- **Primary Method**: Cosine similarity between embeddings
  - Formula: `cos(θ) = (A · B) / (||A|| × ||B||)`
  - Range: -1 to 1 (typically 0 to 1 for normalized embeddings)
  - Exact match: 1.0 (100%)
  - Win condition: ≥ 0.99 (99% similarity)
- **Fallback**: If word not in database, embedding generated via OpenAI API
- **Validation**: Word must be in graph to win (even if similarity is high)

#### Feedback System
- **Hot** (≥70% similarity): Red/orange indicator
- **Warm** (≥40% similarity): Yellow indicator
- **Cold** (<40% similarity): Blue indicator
- **Correct** (100% or ≥99%): Round ends, player wins

### Hint System

#### Getting a Hint
- **Cost**: 5 tokens + 3 point penalty
- **Restriction**: One hint per round per player
- **Generation**: AI-powered additional clue using OpenAI
- **Content**: Contextual hint based on target word and original definition
- **Timing**: Only available during SEARCH phase

#### Hint Strategy
- Use when stuck and have tokens to spare
- Penalty is small compared to potential round win (10 points)
- Can provide crucial semantic direction

---

## Points and Tokens System

### Points (Score)

#### Earning Points
- **Correct Guess**: +10 points per round win
- **Round Winner**: Only the first player to guess correctly gets points
- **Accumulation**: Points persist across rounds
- **Final Score**: Sum of all round wins

#### Losing Points
- **Hint Usage**: -3 points per hint
- **No Other Penalties**: Points are never deducted for wrong guesses or shooting

#### Points Strategy
- Focus on winning rounds (10 points) over avoiding hint penalty (-3 points)
- Net gain from hint + win = 7 points (still positive)
- Multiple round wins compound (5 rounds × 10 = 50 max points)

### Tokens

#### Starting Tokens
- **Per Round**: 15 tokens at start of each round
- **Reset**: Tokens reset to 15 at start of each new round
- **No Carryover**: Unused tokens don't carry to next round

#### Token Costs

| Action | Token Cost | Description |
|--------|-----------|-------------|
| **Guess** | 3 tokens | Type word or click neighbor word |
| **Shoot** | 2 tokens | Click or spacebar to shoot at word/gem |
| **Hint** | 5 tokens | Request AI-generated hint |

#### Token Calculations
- **Starting**: 15 tokens
- **Maximum Guesses**: 5 guesses (15 ÷ 3 = 5)
- **Maximum Shots**: 7 shots (15 ÷ 2 = 7)
- **Maximum Hints**: 3 hints (15 ÷ 5 = 3)
- **Mixed Strategy**: 1 hint + 3 guesses = 14 tokens (5 + 9)

#### Earning Tokens
- **Vector Gems**: Hit gems to earn 1-10 bonus tokens
- **No Other Sources**: Gems are the only way to earn tokens during round

#### Running Out of Tokens
- **Status**: `tokensOut = true` when tokens reach 0
- **Restrictions**: Cannot guess, shoot, or get hints
- **Recovery**: Can get back in by hitting a gem (awards tokens)
- **Strategy**: Save tokens for critical guesses, use gems to extend play

### Token Strategy

#### Conservative Approach
- Use 2-token shots to explore words
- Save 3-token guesses for high-confidence attempts
- Avoid hints unless absolutely necessary (5 tokens is expensive)

#### Aggressive Approach
- Use hints early to get direction (5 tokens)
- Make multiple guesses quickly (3 tokens each)
- Rely on gems to replenish tokens

#### Balanced Approach
- Use 2-token shots to navigate and explore
- Use 3-token guesses when similarity is high
- Use hint only when stuck (5 tokens + 3 point penalty)
- Prioritize hitting gems to extend play

---

## Strategy Guide

### Navigation Strategy

#### Starting Position
- Players start at a random word node
- Explore neighbors to understand semantic space
- Use shooting (2 tokens) to quickly hop between words

#### Following Similarity
- Use similarity feedback to guide direction
- "Hot" words (≥70%) indicate you're close
- Follow semantic trails toward target
- Don't waste tokens on "cold" words (<40%)

#### Using Related Words Panel
- Shows words semantically similar to target
- Click to hop directly (costs 3 tokens)
- Useful for long-distance navigation
- Can skip multiple hops with one action

### Guessing Strategy

#### When to Guess
- **High Similarity**: If similarity ≥ 70%, consider guessing
- **Exact Match**: If you think you know the word, guess it
- **Time Pressure**: Near end of round, make educated guesses
- **Token Management**: Balance confidence vs. token cost

#### When NOT to Guess
- **Low Similarity**: Don't guess if similarity < 40%
- **Out of Tokens**: Can't guess if tokens = 0
- **Early Round**: Explore first, guess later

### Hint Strategy

#### When to Use Hints
- **Stuck**: When you've explored but can't find direction
- **Time Running Out**: Use hint to get quick direction
- **High Token Count**: If you have 10+ tokens, hint is affordable
- **Semantic Confusion**: When similarity feedback is unclear

#### When NOT to Use Hints
- **Low Tokens**: 5 tokens is expensive if you only have 6-7
- **Early Round**: Try exploring first before using hint
- **Already Used**: Only one hint per round

### Gem Strategy

#### Prioritizing Gems
- **Visual Priority**: Gems are visually distinct (red octahedrons)
- **Token Reward**: 1-10 tokens can extend your play significantly
- **Movement**: Gems move through space, need to aim ahead
- **Expiration**: Gems expire after 30 seconds

#### Shooting Gems
- **Cost**: Shooting costs 2 tokens (same as shooting words)
- **Net Gain**: If gem reward > 2, you profit
- **Risk**: If you miss, you lose 2 tokens
- **Recovery**: Can get back in game if you were out of tokens

#### Gem Timing
- **Early Round**: Hit gems early to build token buffer
- **Late Round**: Use gems to extend play when low on tokens
- **Desperation**: If out of tokens, gems are your only option

### Round-Winning Strategy

#### Speed vs. Accuracy
- **Fast Guesses**: Make quick guesses to win before others
- **Accurate Guesses**: Wait for high similarity to avoid wasting tokens
- **Balance**: Find middle ground based on competition

#### Token Management
- **Buffer**: Keep 3+ tokens for final guess
- **Emergency**: Save tokens for critical moments
- **Gems**: Use gems to maintain token buffer

#### Multi-Round Strategy
- **Consistency**: Win multiple rounds for higher total score
- **Pacing**: Don't burn all tokens in early rounds
- **Adaptation**: Adjust strategy based on other players' performance

---

## Round Structure

### Round Lifecycle

#### 1. Round Initialization (`startNewRound`)
- Select random target word from `wordNodes`
- Generate AI definition using OpenAI
- Reset all players:
  - `hintUsed = false`
  - `ready = false`
  - `tokens = 15`
  - `tokensOut = false`
- Clear all vector gems
- Increment `roundNumber`
- Set `roundPhase = 'TARGET_REVEAL'`
- Set `phaseEndsAt = now + 3000ms`
- Emit `round:start` event

#### 2. TARGET_REVEAL Phase (3 seconds)
- Display target definition/riddle
- Players cannot interact
- After 3 seconds → transition to SEARCH

#### 3. SEARCH Phase (120 seconds)
- Players can navigate, guess, shoot, get hints
- Vector gems spawn (max 2 active at once)
- Gems spawn every 10-30 seconds (random)
- Gems expire after 30 seconds if not hit
- First correct guess → end round
- If timeout → transition to WAITING_FOR_READY

#### 4. Round End (`endRound`)
- Stop vector gem spawner
- Set `roundPhase = 'END'`
- Set `roundWinner` and `roundWinnerNickname`
- Award 10 points to winner
- Update player stats incrementally
- Emit `round:end` event
- If `roundNumber >= maxRounds` → end game
- Otherwise → schedule next round after 5 seconds

#### 5. Game End
- Set `gameActive = false`
- Update all player stats (totalGames, gamesWon, etc.)
- Emit `game:end` event with final scores
- Display leaderboard

### Round Phases

| Phase | Duration | Player Actions | Server Actions |
|-------|----------|----------------|----------------|
| **TARGET_REVEAL** | 3 seconds | View definition | Display riddle, prepare search |
| **SEARCH** | 120 seconds | Navigate, guess, shoot, hint | Spawn gems, process guesses |
| **END** | 5 seconds | View results | Announce winner, schedule next round |
| **WAITING_FOR_READY** | Until ready | Mark ready | Wait for all players |

---

## Vector Gems System

### Gem Mechanics

#### Spawning
- **Trigger**: Automatic during SEARCH phase
- **Frequency**: Every 10-30 seconds (random)
- **Max Active**: 2 gems at once
- **Location**: Random position in 3D space (within word graph bounds)
- **Properties**:
  - Position: Random [x, y, z] in range [-1000, 1000]
  - Velocity: Random direction, speed 5-20 units/frame
  - Size: Random multiplier 0.5-2.0
  - Reward: Random 1-10 tokens

#### Movement
- **Physics**: Continuous movement based on velocity vector
- **Frame-Based**: Updates every frame (60 FPS typically)
- **Direction**: Random initial direction, constant velocity
- **Bounds**: No boundary collision (can move anywhere)

#### Expiration
- **Lifetime**: 30 seconds from spawn
- **Cleanup**: Automatic cleanup every 5 seconds
- **Visual**: Fades out when expiring
- **Removal**: Removed from game state when expired

#### Hitting Gems
- **Method**: Shoot at gem (click or spacebar)
- **Cost**: 2 tokens (same as shooting words)
- **Reward**: 1-10 tokens (random, displayed on gem)
- **Net Gain**: Reward - 2 = -1 to +8 tokens
- **Recovery**: Can get back in game if you were out of tokens
- **Priority**: Gems prioritized over words in hit detection

### Gem Strategy

#### Visual Identification
- **Appearance**: Red octahedron with glow effect
- **Size**: Varies (0.5x to 2.0x base size)
- **Label**: Shows reward amount (+1 to +10)
- **Movement**: Continuously moving through space

#### Targeting
- **Aim**: Need to predict gem's movement
- **Hit Radius**: Slightly larger than visual size
- **Priority**: Gems checked before words in raycast

#### Risk/Reward
- **Minimum Reward**: 1 token (lose 1 net token)
- **Maximum Reward**: 10 tokens (gain 8 net tokens)
- **Average Reward**: ~5.5 tokens (gain ~3.5 net tokens)
- **Strategy**: Generally worth shooting if you can hit reliably

---

## Technical Implementation Details

### Similarity Calculation

#### Cosine Similarity Formula
```javascript
function cosineSimilarity(vecA, vecB) {
  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  return dotProduct / (magnitudeA * magnitudeB);
}
```

#### Win Condition
- Word must exist in graph (`wordInGraph === true`)
- AND (exact match OR similarity ≥ 0.99)
- Exact match: `word.label.toLowerCase() === target.label.toLowerCase()`
- Similarity match: `cosineSimilarity(guessEmbedding, targetEmbedding) >= 0.99`

### Token Deduction Logic

```javascript
function deductTokens(playerId, amount) {
  const player = getPlayer(playerId);
  
  // Check if out
  if (player.tokensOut || player.tokens === 0) {
    return { success: false, error: 'Out of tokens' };
  }
  
  // Check if sufficient
  if (player.tokens < amount) {
    return { success: false, error: 'Insufficient tokens' };
  }
  
  // Deduct
  player.tokens = Math.max(0, player.tokens - amount);
  
  // Check if now out
  if (player.tokens === 0) {
    player.tokensOut = true;
  }
  
  return { success: true, tokens: player.tokens, tokensOut: player.tokensOut };
}
```

### Gem Hit Logic

```javascript
function hitVectorGem(gemId, playerId) {
  const gem = findGem(gemId);
  
  // Validate
  if (!gem || gem.hitBy || isExpired(gem)) {
    return { success: false, error: 'Invalid gem' };
  }
  
  // Mark as hit
  gem.hitBy = playerId;
  
  // Award tokens
  const player = getPlayer(playerId);
  player.tokens = (player.tokens || 15) + gem.reward;
  
  // If was out, now back in
  if (player.tokensOut && player.tokens > 0) {
    player.tokensOut = false;
  }
  
  return { success: true, reward: gem.reward, tokens: player.tokens };
}
```

### Round End Logic

```javascript
async function endRound(game, winnerId, winnerNickname) {
  // Stop gem spawner
  stopVectorGemSpawner(game.gameCode);
  
  // Update game state
  game.endRound(winnerId, winnerNickname);
  await game.save();
  
  // Award points (already done in guess route)
  // Update stats incrementally
  await updatePlayerStatsAfterRound(game, winnerId, 10);
  
  // Emit round end event
  await pusher.trigger(`game-${game.gameCode}`, 'round:end', {
    winnerId,
    winnerNickname,
    roundNumber: game.roundNumber,
    players: game.getAllPlayers().map(p => ({
      id: p.id,
      nickname: p.nickname,
      score: p.score,
      tokens: p.tokens,
    })),
  });
  
  // Check if game complete
  if (game.roundNumber >= game.maxRounds) {
    game.gameActive = false;
    await game.save();
    await updatePlayerStats(game);
    await pusher.trigger(`game-${game.gameCode}`, 'game:end', {
      finalScores: getFinalScores(game),
    });
  } else {
    // Schedule next round
    setTimeout(() => startNewRound(game), 5000);
  }
}
```

---

## Summary

### Key Takeaways

1. **Points**: Earned only by winning rounds (+10 each), lost only by using hints (-3)
2. **Tokens**: Start with 15 per round, spent on actions (2-5 tokens), earned from gems (1-10)
3. **Strategy**: Balance speed vs. accuracy, manage tokens carefully, prioritize gems
4. **Navigation**: Use shooting (2 tokens) to explore, guessing (3 tokens) to win
5. **Gems**: High-risk, high-reward token source that can extend play significantly

### Winning Strategy
- **Early Rounds**: Build token buffer with gems, explore semantic space
- **Mid Rounds**: Use hints strategically, make high-confidence guesses
- **Late Rounds**: Conserve tokens for final guesses, use gems to extend play
- **Overall**: Consistency wins - multiple round wins compound to high total score

---

*Document Version: 1.0*  
*Last Updated: 2024*
