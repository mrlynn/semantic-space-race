# Semantic Hop

A multiplayer semantic guessing game where players navigate through a 3D graph of words using vector embeddings and semantic similarity.

## Features

- **3D Graph Navigation**: Navigate through a 3D visualization of word relationships
- **Vector Search**: Uses MongoDB Atlas Vector Search for real-time similarity calculations
- **Semantic Feedback**: Provides "hot/warm/cold" feedback based on cosine similarity
- **Multiplayer Support**: Players can join games via shareable game codes
- **Real-time Updates**: WebSocket-based real-time game state synchronization

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **UI Library**: Material UI (MUI) v5+
- **3D Rendering**: React Three Fiber + drei
- **WebSocket**: Pusher
- **Database**: MongoDB Atlas with Vector Search
- **AI**: OpenAI API for embeddings and definitions

## Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment variables**:
   Copy `.env.local.example` to `.env.local` and fill in your credentials:
   - `MONGODB_URI`: MongoDB Atlas connection string
   - `OPENAI_API_KEY`: OpenAI API key
   - Pusher credentials (for WebSocket)

3. **Set up MongoDB Atlas**:
   - Create a collection called `words` with the WordNode schema
   - Create a Vector Search index on the `embedding` field (1536 dimensions)
   - Populate the collection with word nodes (words with embeddings and 3D positions)

4. **Set up Pusher**:
   - Create a Pusher account and app
   - Add your Pusher credentials to `.env.local`

5. **Run the development server**:
   ```bash
   npm run dev
   ```

6. **Open** [http://localhost:3000](http://localhost:3000) in your browser

## Database Schema

### WordNode Collection

```javascript
{
  label: String,           // The word text
  position: [Number],      // 3D coordinates [x, y, z]
  embedding: [Number],     // Vector embedding (1536 dimensions)
  address4d: [String],     // Optional HNSW address
  w: Number                // Optional weight
}
```

### Vector Search Index

Create a vector search index in MongoDB Atlas:
- Index Name: `vector_index`
- Field: `embedding`
- Type: `vector`
- Dimensions: `1536`
- Similarity: `cosine`

## Deployment to Vercel

1. Push your code to a Git repository
2. Import the project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

## Game Flow

1. **Lobby**: Players create or join games with a game code
2. **Game Start**: Host starts the game, words are loaded
3. **Round Start**: Target word is selected, definition is generated
4. **Search Phase**: Players navigate the graph and make guesses
5. **Round End**: Winner is announced, scores updated
6. **Next Round**: Process repeats until all rounds complete

## API Endpoints

- `GET /api/words` - Get all word nodes
- `POST /api/generate-definition` - Generate AI definition for a word
- `POST /api/similarity-search` - Find similar words
- `POST /api/game/create` - Create a new game
- `POST /api/game/join` - Join an existing game
- `POST /api/game/start` - Start the game (host only)
- `POST /api/game/guess` - Submit a guess

## License

MIT

