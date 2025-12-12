# Navigation Debug Guide

## Problem: Navigation Not Working

If entering a guess or clicking a word doesn't move you in the HNSW graph, here's how to debug:

## What Should Happen

1. **Type a word** or **click a word**
2. **Green sphere should move** to that word's position
3. **You should see** the word highlighted in green
4. **Edges should appear** (if that word has neighbors)

## Debugging Steps

### 1. Check Browser Console

Open DevTools (F12) and look for:

```
🔵 [CLIENT] handleHop called
🔵 [CLIENT] Setting currentNodeId immediately to: [wordId]
🟢 [CLIENT] Found guessed word in words array, hopping to: [word]
```

**If you see these messages**: The navigation logic is running
**If you DON'T see these**: The handleHop function isn't being called

### 2. Check if Word is in Array

In console, type:
```javascript
// Check current words array
console.log('Words count:', words.length);
console.log('Current node ID:', currentNodeId);
console.log('Sample words:', words.slice(0, 5).map(w => w.label));
```

### 3. Check API Response

Look for in console:
```
🔵 [CLIENT] Guess API response data: { success: true, wordId: "...", position: [...] }
```

**If `position` is `null`**: The word might not have a position in the database
**If `wordId` is `null`**: The word wasn't found in the database

### 4. Verify Word is Added

After guessing, check if word was added:
```javascript
// In console after guessing
const word = words.find(w => w.label === 'your-guessed-word');
console.log('Word found:', word);
console.log('Has position:', !!word?.position);
console.log('Is current:', word?.id === currentNodeId);
```

## Common Issues

### Issue 1: Word Not in Words Array

**Symptom**: You guess a word, but green sphere doesn't move

**Cause**: Word isn't in the preloaded `words` array

**Fix Applied**: Code now automatically adds words to the array when you guess them (if API provides position)

**Check**: Look for this in console:
```
🟢 [CLIENT] Adding new word to words array: [word]
```

### Issue 2: No Position Data

**Symptom**: Word is guessed but no position available

**Cause**: Word exists in database but position is null or invalid

**Fix**: Run UMAP layout script to generate positions:
```bash
npm run compute-umap-layout
```

### Issue 3: currentNodeId Not Updating

**Symptom**: currentNodeId stays the same after guessing

**Check**: In console, type:
```javascript
// Should show the new word ID
console.log('Current node ID:', currentNodeId);
```

**If it's not updating**: Check for errors in console

### Issue 4: Word Renders But Not Highlighted

**Symptom**: You can see the word but it's not green (not current)

**Check**: 
```javascript
// Word should have id matching currentNodeId
const currentWord = words.find(w => w.id === currentNodeId);
console.log('Current word:', currentWord?.label);
```

## Quick Test

1. **Open browser console** (F12)
2. **Type a word** in the input box (e.g., "database")
3. **Press Enter**
4. **Watch console** for these messages:
   - `handleHop called` ✅
   - `Setting currentNodeId immediately to: [id]` ✅
   - `Found guessed word` or `Adding new word` ✅
5. **Check visualization**: Green sphere should move

## If Still Not Working

1. **Check game phase**: Must be in SEARCH phase
2. **Check tokens**: Must have 3+ tokens to guess
3. **Check if word exists**: Try a common word like "database" or "query"
4. **Reload page**: Sometimes state gets stuck

## Expected Console Output

When navigation works, you should see:
```
🔵 [CLIENT] ========== handleHop CALLED ==========
🔵 [CLIENT] Setting currentNodeId immediately to: 507f1f77bcf86cd799439011
🟢 [CLIENT] Found guessed word in words array, hopping to: database [1234.56, -567.89, 890.12]
🔵 [CLIENT] Calling loadNeighbors with: 507f1f77bcf86cd799439011
```

If you see this but the green sphere doesn't move, the issue is in the visualization component.
