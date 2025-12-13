# Nature/Ecosystem Word Set

## Overview

The nature word set is a carefully curated collection of **~120 words** from the nature/ecosystem domain, designed specifically to demonstrate HNSW graph traversal and semantic clustering in 3D space.

## Purpose

This word set is perfect for:
- **Demonstrating semantic clustering** - seeing how related words group together in 3D space
- **HNSW graph visualization** - observing how the graph structure connects semantically similar words
- **Graph traversal demonstrations** - following paths that make semantic sense (e.g., bird → tree → leaf → autumn → winter)
- **Cross-cluster connections** - seeing how bridging words connect different semantic clusters
- **Educational demonstrations** - showing how vector embeddings capture semantic relationships

## Word Categories

The nature set includes words from clear semantic clusters with intentional cross-connections:

### 1. Trees & Plants Cluster
**Core words**: tree, oak, pine, maple, birch, willow, leaf, branch, root, bark, trunk

**Why it clusters**: All words are directly related to trees and their parts. These will form a tight semantic cluster in 3D space.

**Connections to other clusters**:
- `leaf` → connects to `autumn` (leaves fall), `ground` (where they land)
- `tree` → connects to `bird` (nests), `forest` (contains many), `branch` (part of)
- `root` → connects to `ground`, `soil`, `earth`

### 2. Flowers & Plants Cluster
**Core words**: flower, rose, daisy, tulip, lily, petal, stem, seed, bloom

**Why it clusters**: All related to flowering plants and their parts.

**Connections to other clusters**:
- `flower` → connects to `spring` (blooming season), `garden` concepts
- `bloom` → connects to `spring`, `summer` (seasons of growth)
- `seed` → connects to `ground`, `soil` (where seeds grow)

### 3. Birds Cluster
**Core words**: bird, eagle, owl, hawk, sparrow, robin, nest, wing, feather

**Why it clusters**: All related to birds and bird-specific features.

**Connections to other clusters** (Bridging word!):
- `bird` → connects to `tree` (nests), `sky` (flies), `forest` (habitat), `wing` (part of)
- `nest` → connects to `tree`, `branch` (where nests are built)
- `wing` → connects to `sky`, `bird`, `feather`

### 4. Land Animals Cluster
**Core words**: deer, rabbit, squirrel, fox, wolf, bear, forest, den

**Why it clusters**: All land mammals that live in forest/natural habitats.

**Connections to other clusters**:
- `forest` → connects to `tree` (contains), `animal` (habitat), `mountain` (location)
- `den` → connects to `ground`, `forest`, `bear`, `fox`

### 5. Weather Cluster
**Core words**: rain, snow, sun, cloud, wind, storm, thunder, lightning, fog, mist

**Why it clusters**: All weather-related phenomena.

**Connections to other clusters**:
- `snow` → connects to `winter` (season), `cold` (temperature), `mountain` (location)
- `rain` → connects to `cloud`, `storm`, `river` (water source)
- `sun` → connects to `summer` (season), `warm` (temperature), `day` (time)

### 6. Seasons Cluster
**Core words**: spring, summer, autumn, winter, season

**Why it clusters**: All related to time/seasons.

**Connections to other clusters** (Bridging words!):
- `autumn` → connects to `leaf` (leaves fall), `cold` (temperature), `winter` (next season)
- `winter` → connects to `snow`, `cold`, `freeze`
- `spring` → connects to `flower`, `bloom`, `warm`
- `summer` → connects to `sun`, `warm`, `hot`, `lake` (swimming)

### 7. Temperature & Conditions
**Core words**: warm, cold, hot, cool, freeze, melt

**Why it clusters**: All temperature-related words.

**Connections to other clusters**:
- `cold` → connects to `winter`, `snow`, `freeze`
- `warm` → connects to `summer`, `sun`, `spring`
- `freeze` → connects to `winter`, `snow`, `cold`
- `melt` → connects to `snow`, `warm`, `sun`

### 8. Natural Features - Land
**Core words**: mountain, hill, valley, meadow, field, grass

**Why it clusters**: All land-based natural features.

**Connections to other clusters**:
- `mountain` → connects to `forest` (contains), `snow` (has snow), `valley` (opposite)
- `forest` → connects to `tree`, `animal`, `bird`

### 9. Natural Features - Water
**Core words**: river, lake, ocean, stream, pond, waterfall, wave

**Why it clusters**: All water-based natural features.

**Connections to other clusters**:
- `river` → connects to `stream` (similar), `ocean` (flows to), `mountain` (source)
- `ocean` → connects to `wave`, `water`, `lake` (both water bodies)

### 10. Sky & Celestial
**Core words**: sky, sunrise, sunset, moon, star, night, day, dawn, dusk

**Why it clusters**: All sky/celestial/time-of-day words.

**Connections to other clusters**:
- `sky` → connects to `bird` (flies in), `cloud`, `sun`, `moon`, `star`
- `sunrise` → connects to `dawn`, `morning`, `sun`
- `sunset` → connects to `dusk`, `evening`, `sun`

### 11. Ground & Earth
**Core words**: ground, earth, soil, rock, stone, dirt, mud

**Why it clusters**: All ground/earth-related words.

**Connections to other clusters**:
- `ground` → connects to `leaf` (where leaves fall), `root` (grows in), `soil`
- `soil` → connects to `ground`, `root`, `seed`

## Seeding the Nature Words

To seed the nature word set into your database:

```bash
node scripts/seed-nature-words.js
```

This will:
- Generate embeddings for all ~120 words using OpenAI
- Calculate 3D positions based on semantic similarity
- Assign the topic "nature" to all words
- Show progress and statistics

**Note**: Make sure you have:
- `MONGODB_URI` in your `.env.local` file
- `OPENAI_API_KEY` in your `.env.local` file

## Building the HNSW Graph

After seeding, build the HNSW neighbor graph:

```bash
node scripts/build-hnsw-neighbors.mjs
```

This will:
- Query MongoDB Vector Search for k-nearest neighbors (k=20) for each word
- Store neighbor relationships with similarity scores
- Determine layers based on similarity
- Create the graph structure for visualization

## Optional: Compute UMAP Layout

For more accurate 3D positioning that preserves semantic neighborhoods:

```bash
node scripts/compute-umap-layout.mjs
```

This will recompute positions using UMAP dimensionality reduction, which better preserves semantic relationships in 3D space.

## Using the Nature Topic

Once seeded, you can use the nature topic in:

1. **Practice Mode**: Select "Nature - Ecosystem Word Set (HNSW Demo)" when entering practice mode
2. **Creating Games**: Select "Nature - Ecosystem Word Set (HNSW Demo)" from the topic dropdown when creating a new game

## What to Observe

When using the nature word set, you should notice:

### 1. Semantic Clustering
- **Trees cluster**: oak, pine, maple, birch, willow, tree, leaf, branch all close together
- **Birds cluster**: bird, eagle, owl, hawk, sparrow, robin, nest, wing close together
- **Weather cluster**: rain, snow, sun, cloud, wind, storm form a distinct region
- **Seasons cluster**: spring, summer, autumn, winter group together
- **Water features cluster**: river, lake, ocean, stream, pond form a region

### 2. Cross-Cluster Connections
- **Bridging words** connect clusters:
  - `bird` connects trees (nests), sky (flies), and animals (is an animal)
  - `leaf` connects trees (part of), autumn (falls), and ground (lands)
  - `snow` connects winter (season), cold (temperature), and mountain (location)
  - `forest` connects trees (contains), animals (habitat), and mountains (location)

### 3. HNSW Graph Structure
- Words within the same category are likely to be neighbors (high similarity)
- Cross-category connections show semantic relationships (medium similarity)
- Long-range connections show broader relationships (lower similarity)
- Layer 0 (high similarity) = tight clusters
- Layer 1 (medium similarity) = cross-cluster connections
- Layer 2+ (low similarity) = long-range semantic relationships

### 4. Graph Traversal Paths
The nature set is designed to demonstrate meaningful traversal paths:

**Path 1: Seasonal Tree Cycle**
```
bird → tree → leaf → autumn → cold → winter → snow
```
This path shows how you can traverse from animals to plants to seasons to weather.

**Path 2: Mountain to Sky**
```
mountain → forest → tree → bird → sky → cloud → rain
```
This path connects land features to plants to animals to sky to weather.

**Path 3: Growth Cycle**
```
flower → spring → sun → warm → summer → lake → water
```
This path connects plants to seasons to weather to water features.

**Path 4: Water Flow**
```
river → stream → water → ocean → wave → beach → sand
```
This path shows water-related connections.

**Path 5: Ground to Sky**
```
ground → root → tree → branch → bird → wing → sky
```
This path connects ground to plants to animals to sky.

## Expected Behavior

- **Total Words**: ~120
- **Topic**: `nature`
- **3D Distribution**: Words should be spread in 3D space with clear semantic clusters
- **Neighbor Relationships**: Similar words should appear as neighbors when navigating
- **Graph Layers**: 
  - Layer 0: Tight clusters (trees, birds, weather, etc.)
  - Layer 1: Cross-cluster connections (bird-tree, leaf-autumn, snow-winter)
  - Layer 2+: Long-range connections (mountain-ocean, sky-ground)

## Example Navigation Demonstrations

Try these navigation paths to see semantic relationships:

1. **Start at "bird"**:
   - Navigate to neighbors: tree, nest, wing, sky, forest
   - Shows how bird bridges multiple clusters

2. **Start at "leaf"**:
   - Navigate to neighbors: tree, branch, autumn, ground, fall
   - Shows connections between plant parts and seasons

3. **Start at "snow"**:
   - Navigate to neighbors: winter, cold, mountain, freeze, white
   - Shows weather-season-location connections

4. **Start at "forest"**:
   - Navigate to neighbors: tree, animal, mountain, bird, ground
   - Shows how forest connects multiple clusters

5. **Traverse a path**:
   - Start: `bird`
   - Step 1: Navigate to `tree` (bird nests in trees)
   - Step 2: Navigate to `leaf` (part of tree)
   - Step 3: Navigate to `autumn` (leaves fall in autumn)
   - Step 4: Navigate to `winter` (next season)
   - Step 5: Navigate to `snow` (winter weather)
   - This demonstrates semantic graph traversal!

## Design Principles

This word set was designed with these principles:

1. **Clear Semantic Clusters**: Each category has 5-15 related words that will cluster together
2. **Bridging Words**: Words like "bird", "leaf", "snow", "forest" connect multiple clusters
3. **Demonstrable Traversal**: Paths exist that make semantic sense (bird → tree → leaf → autumn)
4. **Rich Connections**: Words have multiple semantic relationships (bird is animal, nests in trees, flies in sky)
5. **Visual Interest**: Clusters will be visually distinct in 3D space
6. **Educational Value**: Shows how embeddings capture semantic relationships

## Comparison to Demo Set

The nature set is larger (~120 words vs 40) and more focused on a single domain, which:
- Creates tighter semantic clusters
- Shows more cross-cluster connections
- Demonstrates richer graph traversal paths
- Better illustrates how HNSW graph structure works
- More suitable for demonstrating semantic relationships

The demo set is better for:
- Quick demonstrations
- Simpler examples
- Multiple unrelated domains

The nature set is better for:
- Deep semantic analysis
- Graph traversal demonstrations
- Understanding clustering
- Educational presentations

