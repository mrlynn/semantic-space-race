# Data Rollback Guide

## Overview

This guide explains how to revert database changes made by the HNSW visualization scripts and get back to a known-good checkpoint.

## What Data Changes Were Made?

The following scripts may have modified your MongoDB database:

1. **`compute-umap-layout.mjs`** - Modified `WordNode.position` fields
2. **`build-hnsw-neighbors.mjs`** - Added `WordNode.neighbors` and `WordNode.layer` fields

## Step 1: Stash Code Changes

```bash
# Stash all code changes
git stash push -m "HNSW visualization work in progress"

# Verify you're back to clean state
git status
```

## Step 2: Check What Data Was Modified

### Check if UMAP positions were computed:

```javascript
// Connect to MongoDB and check
const words = await WordNode.find({}).select('position').limit(5).lean();
console.log('Sample positions:', words.map(w => ({ 
  label: w.label, 
  position: w.position,
  isZero: w.position?.every(p => p === 0) 
})));
```

**If positions are all [0,0,0] or very similar**: UMAP script may not have run successfully, or positions were reset.

**If positions have varied values**: UMAP script ran and modified positions.

### Check if HNSW neighbors were added:

```javascript
// Check if neighbors field exists
const wordWithNeighbors = await WordNode.findOne({ 
  neighbors: { $exists: true, $ne: [] } 
}).lean();

if (wordWithNeighbors) {
  console.log('HNSW neighbors found:', wordWithNeighbors.neighbors.length);
} else {
  console.log('No HNSW neighbors found - database is clean');
}
```

## Step 3: Revert Data Changes (If Needed)

### Option A: Restore Original Positions (Recommended)

If positions are broken, restore them using the original projection method:

```bash
node scripts/restore-original-positions.mjs
```

This script:
- Uses the original `projectTo3DSelected` method from `pca3d-improved.js`
- Regenerates all positions using the same algorithm that was working before
- Uses scale 5000 (the original scale)
- Preserves semantic relationships through hybrid projection (embedding + hash)

**This is the recommended way to fix broken positions.**

### Option B: Keep UMAP Positions (If They Work)

If UMAP positions look good and the visualization works:
- **Do nothing** - positions are fine to keep
- The old code should work with any valid 3D positions

### Option C: Reset to Zero (Last Resort)

Only if you need to completely reset:

```bash
node scripts/rollback-data.mjs --reset-positions
```

**Warning**: This sets all positions to [0, 0, 0], which will break visualization until you regenerate them.

### Option C: Remove HNSW Fields

If `neighbors` or `layer` fields were added and you want to remove them:

```javascript
// Remove neighbors and layer fields from all documents
await WordNode.updateMany(
  {},
  { 
    $unset: { 
      neighbors: "", 
      layer: "" 
    } 
  }
);
console.log('Removed neighbors and layer fields');
```

## Step 4: Verify Database State

After reverting, verify the database is in a good state:

```javascript
// Check a sample word
const sample = await WordNode.findOne({}).lean();
console.log('Sample word structure:', {
  label: sample.label,
  hasPosition: !!sample.position,
  position: sample.position,
  hasNeighbors: 'neighbors' in sample,
  hasLayer: 'layer' in sample,
  embeddingLength: sample.embedding?.length
});

// Should show:
// - hasPosition: true
// - position: [x, y, z] array
// - hasNeighbors: false (if removed)
// - hasLayer: false (if removed)
```

## Known Good Checkpoint State

Your database should have:

✅ **Required fields:**
- `label` (String, unique, indexed)
- `position` (Array of 3 numbers [x, y, z])
- `embedding` (Array of 1536 numbers)
- `topic` (String, default: 'general')

✅ **Optional fields (may exist):**
- `address4d` (Array of Strings)
- `w` (Number, default: 1)
- `timestamps` (createdAt, updatedAt)

❌ **Should NOT have (if reverting):**
- `neighbors` (Array)
- `layer` (Number)

## Quick Rollback Script

A rollback script is available at `scripts/rollback-data.mjs`:

### Check What Data Exists (Safe - No Changes)

```bash
node scripts/rollback-data.mjs --check-only
```

This will show you:
- How many words have `neighbors` or `layer` fields
- Position distribution (zero vs non-zero)
- Sample data structure

### Remove HNSW Fields Only

```bash
node scripts/rollback-data.mjs --remove-neighbors
```

This removes `neighbors` and `layer` fields from all documents.

### Reset Positions (Use with Caution!)

```bash
node scripts/rollback-data.mjs --reset-positions
```

This resets all positions to `[0, 0, 0]`. **Only use if you need to completely reset positions.**

### Do Both

```bash
node scripts/rollback-data.mjs --remove-neighbors --reset-positions
```

## After Rollback

1. **Verify code works**: Start the app and test basic functionality
2. **Check game creation**: Create a new game and verify words load
3. **Test navigation**: Try guessing words and verify the game works

## Notes

- **UMAP positions**: If positions look reasonable (not all zeros), you can keep them. The old visualization code should work with any valid 3D positions.
- **HNSW fields**: These are safe to remove - they were only used by the new HNSW visualization component.
- **No data loss**: Removing these fields doesn't affect core game functionality (words, embeddings, positions remain intact).
