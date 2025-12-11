# Semantic Hop - Setup Guide

This guide will help you set up the Semantic Hop game from scratch.

## Prerequisites

1. Node.js 18+ installed
2. MongoDB Atlas account (M10+ cluster recommended for vector search)
3. OpenAI API key
4. Pusher account (for WebSocket)

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Configure Environment Variables

Create a `.env.local` file in the root directory:

```bash
# MongoDB
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority

# OpenAI
OPENAI_API_KEY=sk-your-openai-api-key

# Pusher (for WebSocket)
PUSHER_APP_ID=your-pusher-app-id
PUSHER_SECRET=your-pusher-secret
NEXT_PUBLIC_PUSHER_KEY=your-pusher-key
NEXT_PUBLIC_PUSHER_CLUSTER=us2
```

## Step 3: Set Up MongoDB Atlas

### 3.1 Create Database and Collection

1. Go to MongoDB Atlas
2. Create a new database (e.g., `semantic-hop`)
3. Create a collection named `words`

### 3.2 Create Vector Search Index

1. In MongoDB Atlas, go to your cluster
2. Click "Search" in the left sidebar
3. Click "Create Search Index"
4. Select "JSON Editor"
5. Paste this configuration:

```json
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 1536,
      "similarity": "cosine"
    }
  ]
}
```

6. Name: `vector_index`
7. Database: (your database name)
8. Collection: `words`
9. Click "Create Search Index"

**Note:** The index will take a few minutes to build. Wait until it shows "Active" status.

See `scripts/setup-vector-search.md` for detailed instructions.

## Step 4: Seed the Database

Run the seed script to populate words with embeddings:

```bash
npm run seed
```

This will:
- Generate embeddings for ~70 tech-related words
- Calculate 3D positions for visualization
- Insert them into your MongoDB collection

**Note:** This may take a few minutes and will use your OpenAI API credits.

## Step 5: Verify Setup

### Check Database

Visit `/api/game/debug` to see active games (should be empty initially).

### Check Health

Visit `/api/health` - should return `{ status: 'ok', mongodb: 'connected' }`

### Check Words

Visit `/api/words` - should return an array of word objects

## Step 6: Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Troubleshooting

### "No words found in database"
- Make sure you ran `npm run seed`
- Check that your MongoDB connection string is correct
- Verify words exist in your collection using MongoDB Compass

### "Vector search not available"
- Make sure the vector search index is created and active
- Verify the index name is exactly `vector_index`
- Check that embeddings are 1536 dimensions

### "Failed to generate definition"
- Check your OpenAI API key is valid
- Verify you have API credits available
- Check rate limits

### Game not found (404)
- Games are stored in memory (will be lost on server restart)
- Make sure you create a game before trying to start it
- Check server console for error messages

## Next Steps

Once everything is set up:
1. Create a game with a nickname
2. Share the game code with friends
3. Start the game and play!

## Production Deployment

For production deployment to Vercel:
1. Push code to Git repository
2. Import project in Vercel
3. Add all environment variables in Vercel dashboard
4. Deploy!

**Important:** In production, consider using Redis or MongoDB to persist game state instead of in-memory storage.

