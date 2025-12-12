# How to Enable and Verify HNSW Visualization Mode

## Quick Start

The HNSW mode is **already the default**! When you start a game, it should automatically use HNSW visualization.

## Finding the Mode Switcher

The visualization mode switcher is located in the **top toolbar** of the game:

1. **Desktop**: Look at the top-right of the screen, next to the "Semantic Hop" title
2. **Mobile**: The switcher is hidden on mobile (to save space), but you can still access it by resizing your browser window

The switcher shows three options:
- **Spheres** (left) - Simple 3D visualization
- **Graph** (middle) - Force-directed graph
- **HNSW** (right) - Accurate HNSW visualization ⭐

## How to Switch Modes

1. **Click the toggle button** in the top toolbar (the circular switch between "Spheres" and "HNSW")
2. The toggle cycles through: **Spheres → Graph → HNSW → Spheres**
3. The active mode is indicated by:
   - The toggle position (left = Spheres, middle = Graph, right = HNSW)
   - The text color (active mode text is green/primary color)
   - The toggle background color

## Verifying HNSW Mode is Active

### Visual Indicators

When HNSW mode is active, you should see:

1. **Layer-based Node Colors**:
   - **Green nodes** (Layer 0): High similarity connections (dense local clusters)
   - **Yellow nodes** (Layer 1): Medium similarity connections
   - **Blue nodes** (Layer 2+): Long-range connections

2. **Edges Between Neighbors**:
   - When you click on a word node, you'll see **edges/lines connecting to its neighbors**
   - Edge colors indicate similarity:
     - **Green edges**: High similarity (>0.7)
     - **Yellow edges**: Medium similarity (0.5-0.7)
     - **Blue edges**: Low similarity (<0.5)
   - Edges are **only visible for the current node** (performance optimization)

3. **Navigation Path**:
   - As you hop between words, you'll see a **green trail** showing your path
   - The path resets at the start of each round

4. **Semantic Clustering**:
   - Words that are semantically similar should be positioned **close together** in 3D space
   - This is thanks to UMAP layout computation

### Console Verification

Open your browser's developer console (F12) and look for:

```
🔵 WordGraphHNSW rendered with X words
```

If you see this, HNSW mode is active!

## Troubleshooting

### "I don't see the mode switcher"

- **On mobile**: The switcher is hidden on small screens. Try resizing your browser or using desktop view
- **Check toolbar**: Look at the top-right of the screen, next to "Semantic Hop" title
- **Browser zoom**: Make sure your browser isn't zoomed out too far

### "HNSW mode looks the same as other modes"

This could mean:

1. **Neighbor data not built yet**: 
   - Run: `npm run build-hnsw-neighbors`
   - This creates the neighbor relationships needed for edges

2. **UMAP positions not computed**:
   - Run: `npm run compute-umap-layout`
   - This creates accurate semantic positioning

3. **No edges visible**:
   - Edges only show for the **current node** (the word you're on)
   - Click on a word node to see its neighbor edges
   - If you see 0 neighbors in the console, the neighbor building script needs to run

### "I see edges but they're wrong"

- Edges are based on the `neighbors` array in the database
- If vector search returned 0 results, the script uses cosine similarity fallback
- Check the script output to see if it's using fallback method

## Checking Data Status

To verify your data is set up correctly:

### 1. Check if neighbors exist

In MongoDB Compass or mongo shell:

```javascript
db.wordnodes.findOne({ label: "database" }, { neighbors: 1, layer: 1 })
```

You should see:
```json
{
  "neighbors": [
    { "nodeId": "...", "similarity": 0.85, "layer": 0 },
    { "nodeId": "...", "similarity": 0.78, "layer": 0 },
    ...
  ],
  "layer": 0
}
```

### 2. Check if positions are updated

```javascript
db.wordnodes.findOne({ label: "database" }, { position: 1 })
```

You should see a 3D position array:
```json
{
  "position": [1234.56, -567.89, 890.12]
}
```

### 3. Verify in browser console

When the game loads, check the console for:
- Word count: Should show number of words loaded
- Current node: Should show when you hop to a word
- Neighbor count: Should show neighbors when you click a word

## Expected Behavior

### When HNSW Mode is Working Correctly:

1. ✅ **Nodes are color-coded by layer** (green/yellow/blue)
2. ✅ **Edges appear when you click a word** (connecting to neighbors)
3. ✅ **Navigation path shows your trail** (green line)
4. ✅ **Semantically similar words are clustered together**
5. ✅ **Edge colors match similarity** (green = high, yellow = medium, blue = low)

### Performance Notes:

- **Edges**: Only rendered for current node (max ~20 edges) for performance
- **Navigation path**: Limited to last 20 positions
- **Node filtering**: Invalid positions are automatically filtered

## Quick Test

1. Start a game
2. Click on any word node
3. You should see:
   - The node highlighted in green (current node)
   - Edges/lines connecting to other nodes (neighbors)
   - Edge colors indicating similarity
4. Hop to another word
5. You should see:
   - A green trail showing your path
   - New edges for the new current node

If you see all of this, **HNSW mode is working!** 🎉

## Still Having Issues?

1. **Check scripts ran successfully**:
   ```bash
   npm run build-hnsw-neighbors
   npm run compute-umap-layout
   ```

2. **Check browser console** for errors

3. **Verify database** has neighbor data (see "Checking Data Status" above)

4. **Try switching modes** to see the difference:
   - Spheres: Simple nodes, no edges
   - Graph: Force-directed layout, dynamic edges
   - HNSW: Layer-based, neighbor edges, navigation path
