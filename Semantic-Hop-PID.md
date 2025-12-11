# Semantic Hop - Product Intent Document (PID)

## Executive Summary

**Semantic Hop** is a multiplayer semantic guessing game where players navigate through a 3D graph of words using vector embeddings and HNSW (Hierarchical Navigable Small World) graph traversal. Players receive riddles/definitions for target words and must use semantic similarity to find and guess the correct word by "hopping" between related words in the graph.

## Game Overview

### Core Concept
Players are presented with a riddle/definition for a target word. They navigate through a 3D visualization of word relationships (represented as nodes in an HNSW graph) by hopping between semantically similar words. The goal is to find and guess the target word using vector search and semantic similarity feedback.

### Key Differentiators
- **3D Graph Navigation**: Players move through a 3D space representing semantic relationships
- **Vector Search Integration**: Uses MongoDB Atlas Vector Search for real-time similarity calculations
- **Semantic Feedback**: Provides "hot/warm/cold" feedback based on cosine similarity
- **Multiplayer Support**: Players can join games via shareable game codes
- **Progressive Hints**: Shows related words and similarity percentages to guide players

## Game Mechanics

### 1. Round Structure

#### Round Phases
1. **TARGET_REVEAL** (3 seconds)
   - Target word is selected randomly from the word database
   - AI-generated riddle/definition is displayed
   - Players see the riddle but not the target word

2. **SEARCH** (60 seconds)
   - Players navigate the graph and make guesses
   - Real-time similarity feedback is provided
   - Players can see their current position and nearby words

3. **END** (5 seconds)
   - Round winner is announced
   - Scores are updated
   - Next round begins automatically

#### Round Progression
- Default: 5 rounds per game
- Each round has a new target word
- Round number increments: Round 1/5, Round 2/5, etc.
- Game ends after all rounds complete

### 2. Word Graph Navigation

#### Graph Structure
- Words are nodes in an HNSW graph
- Each word has:
  - **Label**: The word text (e.g., "database", "query", "index")
  - **Position**: 3D coordinates (x, y, z) derived from PCA projection of embeddings
  - **Embedding**: Vector embedding (1536 dimensions for OpenAI embeddings)
  - **Neighbors**: Semantically similar words (HNSW graph edges)

#### Player Movement
- **Node Snapping**: Players snap to word nodes (no free-flight)
- **Hop Action**: Click a neighbor word or type a word to hop to it
- **Current Node**: Player's current position is highlighted in green
- **Neighbor Display**: Shows nearby words (neighbors in HNSW graph)
- **Camera Control**: Free camera rotation/zoom using OrbitControls (no auto-follow)

### 3. Guessing Mechanism

#### Guess Methods
1. **Type and Hop**: Type a word in the input field, press Enter
   - If word exists in graph, player hops to that node
   - Similarity to target is calculated and displayed
   - Feedback: "hot" (≥70%), "warm" (≥40%), "cold" (<40%), or "correct" (100%)

2. **Click Neighbor**: Click a word from the neighbor panel
   - Player hops to that word
   - Similarity is calculated and displayed
   - Same feedback system applies

3. **Click Related Word**: Click from "Words similar to target" panel
   - Shows words semantically similar to the target (not current position)
   - Displays similarity percentage to target
   - Clicking hops to that word

#### Similarity Calculation
- **Primary Method**: Cosine similarity between word embeddings
  - Uses OpenAI embeddings (1536 dimensions)
  - Calculated client-side if embeddings available
  - Falls back to API call if needed
- **Fallback Method**: Distance-based similarity (3D position)
  - Used when embeddings unavailable
  - Formula: `similarity = max(0, 1 - (distance / maxDistance))`

#### Feedback System
- **Hot** (≥70% similarity): Red/orange indicator, "You're getting close!"
- **Warm** (≥40% similarity): Yellow indicator, "Getting warmer..."
- **Cold** (<40% similarity): Blue indicator, "Keep searching..."
- **Correct** (100% similarity): Green indicator, "Correct! Round complete!"

### 4. Scoring System

#### Points Award
- **Correct Guess**: 10 points (text-based guess)
- **Navigation Win**: 15 points (reaching target node via navigation)
- **Leaderboard**: Real-time display of all player scores
- **Round Winner**: Player who guesses correctly first

### 5. Multiplayer Features

#### Game Creation & Joining
- **Create Game**: Host generates a unique game code (e.g., "ABC123")
- **Join Game**: Players enter game code to join
- **Game Code Display**: Shown in lobby and in-game HUD
- **Player List**: Shows all players in the game with scores

#### Synchronization
- **Round Start**: All players see same target word and riddle
- **Round End**: All players see winner announcement
- **Score Updates**: Real-time leaderboard updates
- **Game State**: Server maintains authoritative game state

## User Interface

### Main Game Screen

#### Left Sidebar (SemanticHopHUD)
1. **Game Info Section**
   - Game code display (top)
   - Round indicator: "Round X/5"
   - Timer (if in SEARCH phase)

2. **Riddle/Definition Display**
   - Large, readable text area
   - Shows AI-generated definition (never includes the target word itself)
   - Updates when new round starts

3. **Hop Input**
   - Text input field
   - "Hop" button or Enter key to submit
   - Shows last guess similarity percentage
   - Shows feedback (hot/warm/cold/correct)

4. **Progress Indicator**
   - Progress bar showing best similarity achieved
   - Percentage display (e.g., "Best: 65%")

5. **Neighbor Panel**
   - "Nearby Words" section
   - List of clickable neighbor words
   - Shows similarity percentage for each neighbor

6. **Related Words Panel**
   - "Words similar to target" section
   - Shows top 5 words semantically similar to target
   - Displays similarity percentage to target
   - Clickable buttons to hop to those words

#### Top Right Corner
- **Leaderboard**
  - Shows all players with scores
  - Highlights current player
  - Updates in real-time

#### 3D Scene
- **Word Nodes**: Spheres representing words
  - Current node: Green highlight
  - Related nodes: Yellow/orange highlight
  - Other nodes: Default color
- **Word Labels**: 3D text labels attached to nodes
  - Proper depth sorting (Text component from drei)
  - Readable font size
  - Outline for visibility
- **Player Avatar**: Sphere with glow effect at current position
- **Camera Controls**: OrbitControls for free camera movement

### Lobby/Join Screen

#### Create Game
- Button to create new game
- Game code is generated and displayed
- "Start Game" button (when ready)

#### Join Game
- Input field for game code
- "Join Game" button
- Error message if code invalid

#### Lobby
- List of players
- Ready status for each player
- Game code display
- "Start Game" button (host only)

## Technical Architecture

### Simplified Architecture for Vercel

#### Single Next.js Application
- **Frontend**: Next.js App Router with React Server Components
- **API Routes**: Next.js API routes (`/api/*`) for REST endpoints
- **WebSocket**: Serverless WebSocket via Vercel (or alternative)
- **Database**: MongoDB Atlas (Vector Search enabled)

#### Recommended Stack
- **Framework**: Next.js 14+ (App Router)
- **UI Library**: Material UI (MUI) v5+
- **3D Rendering**: React Three Fiber + drei
- **WebSocket**: Vercel's serverless WebSocket or Pusher/Ably
- **Database**: MongoDB Atlas with Vector Search
- **AI**: OpenAI API for embeddings and definitions
- **Deployment**: Vercel (single deployment)

### API Endpoints

#### REST Endpoints (`/api/*`)
1. **`GET /api/words`**
   - Returns all word nodes with embeddings
   - Response: `{ words: [{ id, label, position, embedding, ... }] }`

2. **`POST /api/generate-definition`**
   - Generates AI riddle/definition for a word
   - Request: `{ wordLabel: string }`
   - Response: `{ success: boolean, definition: string }`
   - **Rule**: Definition must NOT include the target word

3. **`POST /api/similarity-search`**
   - Finds words similar to a target word
   - Request: `{ wordId: string, limit: number }`
   - Response: `{ success: boolean, results: [{ wordId, label, similarity }] }`

4. **`GET /api/health`**
   - Health check endpoint
   - Response: `{ status: 'ok', mongodb: 'connected' | 'disconnected' }`

#### WebSocket Events (Server → Client)
- **`game:start`**: Game has started
- **`round:start`**: New round has started
  - Payload: `{ roundNumber, maxRounds, target, definition, phase, phaseEndsAt, roundDuration }`
- **`round:end`**: Round has ended
  - Payload: `{ winnerId, winnerNickname, roundNumber, targetLabel }`
- **`round:phase-change`**: Round phase changed
  - Payload: `{ phase, phaseEndsAt, roundDuration }`
- **`player:correct-guess`**: A player guessed correctly
  - Payload: `{ playerId, nickname, guess, target }`
- **`player:reached-target`**: A player navigated to target
  - Payload: `{ playerId, nickname, target }`
- **`lobby:state`**: Lobby state update
  - Payload: `{ players, gameActive, roundNumber, maxRounds, gameCode }`

#### WebSocket Events (Client → Server)
- **`player:join`**: Player joins a game
  - Payload: `{ playerId, nickname, gameCode }`
- **`player:ready`**: Player marks as ready
  - Payload: `{ playerId }`
- **`player:guess`**: Player submits a guess
  - Payload: `{ playerId, guess }`
- **`player:move`**: Player position update
  - Payload: `{ playerId, position, rotation }`
- **`player:hit`**: Player reached a target node (navigation-based)
  - Payload: `{ playerId, targetId }`

### Data Models

#### Word Node
```typescript
interface WordNode {
  id: string;              // MongoDB ObjectId or unique identifier
  label: string;           // The word text (e.g., "database")
  position: [number, number, number];  // 3D coordinates [x, y, z]
  embedding: number[];     // Vector embedding (1536 dimensions)
  address4d?: string[];    // Optional 4D address for HNSW
  w?: number;             // Optional weight
}
```

#### Game State
```typescript
interface GameState {
  gameCode: string;
  gameActive: boolean;
  roundNumber: number;
  maxRounds: number;
  currentTarget: WordNode | null;
  currentDefinition: string;
  roundPhase: 'TUTORIAL' | 'TARGET_REVEAL' | 'SEARCH' | 'END';
  phaseEndsAt: number | null;
  roundDuration: number;
  targetRevealDuration: number;
  roundEndDuration: number;
  roundWinner: string | null;
  roundWinnerNickname: string | null;
  players: Map<string, Player>;
  wordNodes: WordNode[];
}
```

#### Player
```typescript
interface Player {
  id: string;
  nickname: string;
  ready: boolean;
  score: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
  currentNodeId?: string;
}
```

### Game Flow

#### Initialization
1. Player visits game URL
2. Sees join/create game screen
3. Creates game or joins with code
4. Enters lobby, sees other players
5. Host clicks "Start Game"

#### Round Flow
1. **Server selects random target word** from word database
2. **Server generates definition** using OpenAI API
3. **Server emits `round:start`** with target and definition
4. **All clients receive `round:start`** and update UI
5. **TARGET_REVEAL phase** (3 seconds) - shows riddle
6. **SEARCH phase begins** (60 seconds)
   - Players navigate graph
   - Players make guesses
   - Similarity feedback provided
7. **When player guesses correctly**:
   - Client sends `player:guess` with word label
   - Server validates guess (case-insensitive)
   - Server awards points
   - Server calls `endRound(game, playerId)`
   - Server emits `round:end` with winner
   - Server schedules `startNewRound` after 5 seconds
8. **END phase** (5 seconds) - shows winner
9. **Next round starts** - repeat from step 1

#### Round Transition Logic
```javascript
// When round ends
endRound(game, winnerId) {
  // Set winner
  game.roundWinner = winnerId;
  game.roundPhase = 'END';
  
  // Emit round:end
  emit('round:end', { winnerId, ... });
  
  // Schedule next round
  setTimeout(() => {
    if (game.roundNumber < game.maxRounds) {
      startNewRound(game);
    } else {
      endGame(game);
    }
  }, 5000);
}

// Start new round
startNewRound(game) {
  game.roundNumber++;
  game.currentTarget = selectRandomTarget(game);
  game.roundWinner = null;
  game.roundPhase = 'TARGET_REVEAL';
  
  // Generate definition
  const definition = await generateDefinition(game.currentTarget.label);
  game.currentDefinition = definition;
  
  // Emit round:start
  emit('round:start', {
    roundNumber: game.roundNumber,
    maxRounds: game.maxRounds,
    target: game.currentTarget,
    definition: game.currentDefinition,
    phase: game.roundPhase,
    ...
  });
}
```

## UI/UX Requirements

### Design Principles
- **Full-screen real estate**: Use entire viewport for game display
- **Clear visual hierarchy**: Important information (riddle, feedback) is prominent
- **Minimal clutter**: Only essential UI elements visible
- **Responsive feedback**: Immediate visual feedback for all actions
- **Accessibility**: Proper contrast, readable fonts, keyboard navigation

### Material UI Components
- **AppBar**: Top navigation (optional, minimal)
- **Drawer/Sidebar**: Left panel for game controls
- **Card**: For panels and sections
- **Button**: For actions (hop, join, etc.)
- **TextField**: For text input
- **Typography**: For text display
- **Progress**: For similarity progress bar
- **List**: For neighbor words and leaderboard
- **Chip**: For tags/badges (hot/warm/cold indicators)

### Color Scheme
- **Primary**: Material UI default (blue) or custom theme
- **Success**: Green (correct guesses, current node)
- **Warning**: Yellow/Orange (warm feedback, related nodes)
- **Error**: Red (hot feedback)
- **Info**: Blue (cold feedback, general info)
- **Background**: Dark theme for 3D scene contrast

## Deployment Considerations

### Vercel Deployment
- **Single Deployment**: One Next.js app deployed to Vercel
- **Environment Variables**:
  - `MONGODB_URI`: MongoDB Atlas connection string
  - `OPENAI_API_KEY`: OpenAI API key for embeddings/definitions
  - `NEXT_PUBLIC_WS_URL`: WebSocket server URL (if external)
- **Serverless Functions**: API routes run as serverless functions
- **WebSocket Options**:
  1. **Vercel Serverless WebSocket** (if available)
  2. **External Service**: Pusher, Ably, or custom WebSocket server
  3. **Polling Fallback**: Long-polling for real-time updates

### Database Setup
- **MongoDB Atlas**: 
  - Vector Search index on `embedding` field
  - Collection: `words` with word nodes
  - Indexes: `label` (text search), `id` (unique)

### Performance Considerations
- **Word Loading**: Load all words on game start (cache in memory)
- **Embedding Calculation**: Client-side when possible, API fallback
- **3D Rendering**: Optimize with instancing for large word sets
- **WebSocket**: Efficient message batching for position updates

## Success Criteria

### Functional Requirements
- ✅ Players can create/join games with codes
- ✅ Riddles are generated without revealing target word
- ✅ Players can navigate graph by typing or clicking
- ✅ Similarity feedback is accurate and immediate
- ✅ Rounds advance correctly after correct guesses
- ✅ Scores update in real-time
- ✅ Leaderboard displays all players
- ✅ Game completes after all rounds

### Technical Requirements
- ✅ Single Next.js deployment to Vercel
- ✅ Material UI for all UI components
- ✅ MongoDB Atlas Vector Search integration
- ✅ Real-time multiplayer via WebSocket
- ✅ Responsive design (desktop-first, mobile-friendly)
- ✅ Error handling and graceful degradation

### User Experience Requirements
- ✅ Intuitive navigation and controls
- ✅ Clear feedback for all actions
- ✅ Smooth 3D camera movement
- ✅ Fast similarity calculations
- ✅ Engaging gameplay loop

## Future Enhancements (Out of Scope)

- Difficulty levels (easy/medium/hard word sets)
- Custom word categories/themes
- Power-ups (hints, extra time)
- Spectator mode
- Replay/recording
- Mobile app version
- Social features (friends, achievements)

---

## Notes for Implementation

1. **Round Number Display**: Must update immediately when `round:start` is received
2. **Definition Generation**: Must never include target word in definition
3. **Similarity Calculation**: Prefer client-side when embeddings available
4. **Game State**: Server is authoritative, clients sync via events
5. **Error Handling**: Graceful fallbacks for API failures
6. **Offline Mode**: Game should work with demo words if MongoDB unavailable

---

**Document Version**: 1.0  
**Last Updated**: 2024  
**Status**: Ready for Implementation

