# HNSW Visualization Setup Guide

This guide explains how to set up the accurate HNSW visualization for Semantic Hop.

## Prerequisites

1. **MongoDB Atlas Vector Search Index**: Ensure you have a vector search index named `vector_index` on the `embedding` field
2. **Word Data**: Your database should have words with embeddings (1536 dimensions)
3. **Node.js**: Version 18+ recommended

## Setup Steps

### Step 1: Install Dependencies

For UMAP layout computation, you need the `umap-js` package:

```bash
npm install umap-js
```

Alternatively, if you prefer Python UMAP (faster for large datasets), you can use a Python script instead.

### Step 2: Build HNSW Neighbor Graph

This script queries MongoDB Vector Search to build the neighbor graph for each word:

```bash
npm run build-hnsw-neighbors
```

Or directly:
```bash
node scripts/build-hnsw-neighbors.mjs
```

**What it does**:
- Queries MongoDB Vector Search for k-nearest neighbors (k=20) for each word
- Stores neighbor relationships with similarity scores
- Determines layer based on similarity (Layer 0 = high similarity, Layer 2+ = low similarity)
- Updates `WordNode.neighbors` and `WordNode.layer` fields

**Expected output**:
- Progress updates for each word
- Statistics on neighbor relationships
- Layer distribution

### Step 3: Compute UMAP Layout

This script computes accurate 3D positions using UMAP dimensionality reduction:

```bash
npm run compute-umap-layout
```

Or directly:
```bash
node scripts/compute-umap-layout.mjs
```

**What it does**:
- Loads all word embeddings from database
- Computes 3D positions using UMAP (preserves semantic neighborhoods)
- Scales positions to match existing position scale
- Updates `WordNode.position` with UMAP results

**Expected output**:
- UMAP computation progress (may take several minutes for large datasets)
- Position statistics
- Update confirmation

**Note**: This may take 5-15 minutes for datasets with 500+ words.

## Verification

After running both scripts, verify the data:

1. **Check neighbors**: Query a word to see if it has neighbors:
   ```javascript
   const word = await WordNode.findOne({ label: 'database' });
   console.log('Neighbors:', word.neighbors?.length || 0);
   console.log('Layer:', word.layer);
   ```

2. **Check positions**: Verify positions are updated:
   ```javascript
   const word = await WordNode.findOne({ label: 'database' });
   console.log('Position:', word.position);
   ```

3. **Test visualization**: Start a game and switch to HNSW mode to see:
   - Edges between neighbors
   - Layer-based node styling
   - Navigation paths
   - Semantic clustering

## Troubleshooting

### Vector Search Not Working

If you see "Vector search failed, using cosine similarity fallback":
- Check that your MongoDB Atlas cluster has vector search enabled
- Verify the index name is `vector_index`
- Ensure the index is on the `embedding` field
- Check that embeddings are 1536 dimensions

### UMAP Computation Fails

If UMAP computation fails:
- Ensure `umap-js` is installed: `npm install umap-js`
- Check that all words have valid embeddings (1536 dimensions)
- For very large datasets (>1000 words), consider using Python UMAP instead

### No Edges Visible

If edges don't appear in HNSW mode:
- Verify neighbors were built: Check `WordNode.neighbors` field
- Ensure you're on a word node (edges only show for current node)
- Check browser console for errors

### Performance Issues

If visualization is slow:
- Reduce number of visible edges (already optimized to current node only)
- Enable semantic fog to hide distant nodes
- Reduce navigation path length (currently max 20 positions)

## Rebuilding Data

To rebuild the neighbor graph or recompute positions:

1. **Rebuild neighbors**: Just run `build-hnsw-neighbors` again (it will update existing data)
2. **Recompute positions**: Run `compute-umap-layout` again (it will overwrite existing positions)

## Next Steps

After setup:
1. Start a game
2. Switch to HNSW visualization mode
3. Navigate through the graph to see:
   - Accurate semantic neighborhoods
   - HNSW neighbor edges
   - Layer-based visualization
   - Navigation paths

Enjoy exploring the semantic graph!
