# Topic Lists Feature

## Overview

The game now supports topic-based word lists, allowing players to choose a specific topic when creating a game. Words are categorized into related topics, making games more focused and educational.

## Available Topics

1. **Architecture and Deployment** (`architecture-deployment`)
   - Words related to MongoDB architecture, deployment, scaling, and infrastructure
   - Examples: replica, shard, cluster, deployment, scalability, container, orchestration

2. **MongoDB Query** (`mongodb-query`)
   - Words related to querying MongoDB
   - Examples: query, find, findOne, filter, projection, sort, limit, cursor

3. **Aggregation and Commands** (`aggregation-commands`)
   - Words related to aggregation pipelines and MongoDB commands
   - Examples: aggregation, pipeline, $match, $group, $project, $lookup

4. **Data Modeling** (`data-modeling`)
   - Words related to schema design and data modeling
   - Examples: schema, document, collection, field, embedded document, reference

5. **General Database Concepts** (`general-database`)
   - General database terminology and concepts
   - Examples: database, index, transaction, ACID, CRUD, consistency

## Implementation Details

### Database Schema Changes

- **WordNode Model**: Added `topic` field (String, indexed, default: 'general')
- **Game Model**: Added `topic` field (String, default: 'general-database')

### API Changes

- **POST /api/game/create**: Now accepts `topic` parameter
- **GET /api/words**: Now accepts `topic` query parameter to filter words
- **POST /api/game/start**: Filters words by game topic when loading
- **POST /api/game/join**: Returns game topic in response

### Frontend Changes

- **Lobby Component**: Added topic selection dropdown when creating a game
- **Game State**: Tracks `gameTopic` state and uses it to filter words
- **Word Loading**: `loadWords()` now filters by topic from game state

### Seed Script Updates

The seed script (`scripts/seed-words.js`) has been updated to:
- Categorize words into topics
- Assign topic to each word when seeding
- Update existing words with topics if they don't have one
- Show breakdown by topic after seeding

## Usage

### Creating a Game with Topic

1. Enter nickname
2. Select a topic from the dropdown
3. Click "Create New Game"
4. The game will only use words from the selected topic

### Seeding Words with Topics

Run the seed script to populate words with topics:
```bash
node scripts/seed-words.js
```

The script will:
- Generate embeddings for all words
- Assign appropriate topics
- Show a breakdown by topic at the end

## Future Enhancements

- Add more topic lists
- Allow custom topic selection
- Show topic statistics in lobby
- Filter leaderboard by topic
- Topic-specific achievements
