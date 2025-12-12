# Demo Word Set

## Overview

The demo word set is a simple, intentionally limited collection of 40 words designed to demonstrate HNSW vector search and semantic positioning in 3D space.

## Purpose

This word set is perfect for:
- **Educational demonstrations** of how vector embeddings work
- **Understanding semantic proximity** - seeing how similar words cluster together
- **HNSW visualization** - observing how the graph structure connects semantically similar words
- **Practice mode** - a manageable word set for exploring the game mechanics

## Word Categories

The demo set includes words from clear semantic clusters:

1. **Animals (Mammals)**: cat, dog, rabbit, mouse, horse
2. **Animals (Birds)**: bird, eagle, owl, chicken, duck
3. **Animals (Water)**: fish, whale, shark, dolphin
4. **Colors**: red, blue, green, yellow, orange, purple
5. **Food (Fruits)**: apple, banana, orange, grape, strawberry
6. **Food (Vegetables)**: carrot, tomato, potato, lettuce
7. **Transportation**: car, bike, plane, train, boat
8. **Weather**: rain, snow, sun, cloud, wind
9. **Body Parts**: hand, foot, eye, ear, nose

## Seeding the Demo Words

To seed the demo word set into your database:

```bash
node scripts/seed-demo-words.js
```

This will:
- Generate embeddings for all 40 words using OpenAI
- Calculate 3D positions based on semantic similarity
- Assign the topic "demo" to all words
- Show progress and statistics

**Note**: Make sure you have:
- `MONGODB_URI` in your `.env.local` file
- `OPENAI_API_KEY` in your `.env.local` file

## Using the Demo Topic

Once seeded, you can use the demo topic in:

1. **Practice Mode**: Select "Demo - Simple Word Set (HNSW Demo)" when entering practice mode
2. **Creating Games**: Select "Demo - Simple Word Set (HNSW Demo)" from the topic dropdown when creating a new game

## What to Observe

When using the demo word set, you should notice:

1. **Semantic Clustering**: 
   - Animals cluster together (cat, dog, rabbit near each other)
   - Colors form their own cluster
   - Food items group together
   - Transportation words are in a distinct region

2. **HNSW Connections**:
   - Words within the same category are likely to be neighbors
   - Cross-category connections show semantic relationships (e.g., "orange" connects both color and fruit clusters)

3. **Vector Search**:
   - Searching for "cat" will return "dog", "rabbit", "mouse" as neighbors
   - Searching for "red" will return other colors
   - The similarity scores reflect semantic relationships

## Expected Behavior

- **Total Words**: 40
- **Topic**: `demo`
- **3D Distribution**: Words should be spread in 3D space with clear semantic clusters
- **Neighbor Relationships**: Similar words should appear as neighbors when navigating

## Example Navigation Paths

Try these navigation paths to see semantic relationships:

1. **Animal Path**: cat → dog → rabbit → mouse
2. **Color Path**: red → blue → green → yellow
3. **Food Path**: apple → banana → orange → grape
4. **Cross-Category**: orange (fruit) → orange (color) → yellow → banana

