# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Semantic Hop** is a multiplayer semantic guessing game where players navigate a 3D graph of words using vector embeddings and semantic similarity. Players receive AI-generated riddles for target words and must navigate through semantically related words to find the target.

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **UI**: Material UI (MUI) v5+
- **3D**: React Three Fiber + drei
- **Database**: MongoDB Atlas with Vector Search
- **WebSocket**: Pusher for real-time multiplayer
- **AI**: OpenAI API (embeddings & definitions)

## Common Commands

### Development
```bash
npm run dev         # Start development server on localhost:3000
npm run build       # Build for production
npm run start       # Start production server
npm run lint        # Run ESLint
```

### Database Setup
```bash
npm run seed                # Populate database with words and embeddings
npm run update-positions    # Recalculate 3D positions from embeddings
```

### Testing Endpoints
- `/api/health` - Check MongoDB connection
- `/api/words` - View all word nodes
- `/api/game/debug` - View active games

## Architecture Overview

### Directory Structure
```
app/
  api/              # Next.js API routes (REST endpoints)
    game/           # Game management (create, join, start, guess)
    words/          # Word data endpoints
    similarity-search/  # Vector search
    generate-definition/  # AI definitions
  page.js           # Main game UI (client component)
  layout.js         # Root layout
components/         # React components
  Lobby.js          # Pre-game lobby
  WordGraph3D.js    # 3D visualization (React Three Fiber)
  SemanticHopHUD.js # Game HUD with controls
  Leaderboard.js    # Player scores
lib/                # Core utilities
  mongodb.js        # MongoDB connection (singleton pattern)
  gameState.js      # In-memory game state (Map-based)
  gameStateDB.js    # MongoDB-backed game state
  gameLogic.js      # Round/phase transitions
  openai.js         # OpenAI client
  pusher.js         # Pusher server client
  pusherClient.js   # Pusher client-side
  utils.js          # Similarity calculations
models/             # Mongoose schemas
  WordNode.js       # Word with embedding & position
  Game.js           # Game state (MongoDB)
scripts/            # Data utilities
  seed-words.mjs    # Generate embeddings & seed DB
  pca3d-*.js        # PCA projection for 3D positions
```

### Game State Management

**Two implementations coexist:**
- **In-memory** (`lib/gameState.js`): Map-based, lost on restart, used for development
- **Database** (`lib/gameStateDB.js`): MongoDB-backed, persistent, for production

Game state is managed server-side with Pusher events synchronizing clients.

### Round Phases
1. **TUTORIAL** - Initial state before game starts
2. **TARGET_REVEAL** (3s) - Show riddle/definition
3. **SEARCH** (60s) - Players navigate and guess
4. **END** (5s) - Show winner, prepare next round

### Vector Search Strategy

The similarity search has a three-tier fallback:
1. **MongoDB Vector Search** - Uses `$vectorSearch` aggregation on `vector_index`
2. **Client-side cosine similarity** - If vector search unavailable, calculate for all words
3. **Position-based similarity** - Ultimate fallback using 3D coordinates

See `app/api/similarity-search/route.js` for implementation.

### Word Node Schema

Words stored in MongoDB `words` collection:
```javascript
{
  label: String,          // The word text
  position: [Number],     // [x, y, z] from PCA projection
  embedding: [Number],    // 1536-dim vector (OpenAI)
  address4d: [String],    // Optional HNSW address
  w: Number              // Optional weight
}
```

**Critical**: Vector search index must exist in MongoDB Atlas:
- Index name: `vector_index`
- Field: `embedding`
- Dimensions: 1536
- Similarity: cosine

## Key Implementation Details

### Environment Variables Required
```
MONGODB_URI=mongodb+srv://...
OPENAI_API_KEY=sk-...
PUSHER_APP_ID=...
PUSHER_SECRET=...
NEXT_PUBLIC_PUSHER_KEY=...
NEXT_PUBLIC_PUSHER_CLUSTER=...
```

### MongoDB Connection Pattern
Always use the singleton pattern from `lib/mongodb.js`:
```javascript
import connectDB from '@/lib/mongodb';
await connectDB();
```

### Pusher Event Patterns

**Server → Client:**
- `round:start` - New round begins (includes target, definition, phase)
- `round:end` - Round complete (includes winner, scores)
- `round:phase-change` - Phase transition
- `player:correct-guess` - Someone guessed correctly
- `lobby:state` - Lobby updates

**Client → Server:**
- Handled via API routes (`/api/game/guess`, etc.), not direct Pusher

### AI Definition Generation

**Critical Rule**: Definitions must NEVER include the target word itself.

See `lib/openai.js` - uses GPT-4 with strict prompt to avoid revealing the word.

### 3D Visualization Notes

- Uses React Three Fiber with drei helpers
- OrbitControls for camera (no auto-follow)
- Players snap to word nodes (no free-flight)
- Current node highlighted green
- Word labels use `<Text>` from drei with proper depth sorting

### Game Flow Transitions

Round transitions are timer-based in `lib/gameLogic.js`:
```javascript
endRound(game, winnerId) →
  setTimeout(5s) →
    if (roundNumber < maxRounds) startNewRound()
    else endGame()
```

When implementing new features affecting round flow, ensure timers account for database saves and WebSocket latency.

### Scoring System
- Text-based guess: 10 points
- Navigation to target node: 15 points
- First correct answer wins the round

## Common Development Patterns

### Adding a New API Route
1. Create file in `app/api/[name]/route.js`
2. Export `GET`, `POST`, etc. functions
3. Use `NextResponse.json()` for responses
4. Always `await connectDB()` before database access
5. Wrap in try/catch, return 500 on error

### Modifying Game State
1. Update `GameState` class in `lib/gameState.js` or `models/Game.js`
2. Emit corresponding Pusher event in `lib/gameLogic.js`
3. Update client listener in `app/page.js`
4. Update UI components to reflect new state

### Adding New Words to Database
1. Update `scripts/seed-words.mjs` word list
2. Run `npm run seed` to generate embeddings
3. Ensure vector search index is active
4. Verify with `/api/words`

## Troubleshooting

### Vector Search Not Working
- Check MongoDB Atlas has `vector_index` created and active
- Verify embeddings are exactly 1536 dimensions
- Check server logs for `$vectorSearch` aggregation errors
- Fallback to cosine similarity should work automatically

### Game State Lost on Restart
- Development uses in-memory `lib/gameState.js`
- For production, ensure `lib/gameStateDB.js` is used
- Check MongoDB for `games` collection

### Pusher Events Not Received
- Verify `NEXT_PUBLIC_PUSHER_*` variables in client
- Check channel subscription: `game-${gameCode}`
- Ensure server-side Pusher credentials correct
- Check browser console for Pusher errors

### Definitions Include Target Word
- Check OpenAI prompt in `lib/openai.js`
- Verify GPT-4 model is used (better instruction following)
- May need to add post-processing validation

## Performance Considerations

- **Word loading**: All words loaded once at game start, cached client-side
- **Embedding calculations**: 1536-dim vectors, prefer client-side when available
- **3D rendering**: Consider instancing for >1000 nodes
- **WebSocket**: Pusher handles connection management, but watch rate limits

## Deployment

Deploy to Vercel:
1. Push to GitHub
2. Import in Vercel
3. Add all environment variables
4. Deploy

**Note**: In production, consider switching from in-memory to MongoDB-backed game state to handle serverless function warm/cold starts.
