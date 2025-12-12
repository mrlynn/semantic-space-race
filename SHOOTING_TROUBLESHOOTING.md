# Shooting Troubleshooting Guide

## Issue: Shooting Asteroids/Gems Has No Effect

When shooting vector gems or bad asteroids, nothing happens (no token changes, no collection).

---

## System Architecture

### Flow:
1. **User shoots** (click or spacebar) → ShootingSystem detects hit
2. **ShootingSystem** calls callback: `onGemHit(gem)` or `onBadAsteroidHit(asteroid)`
3. **page.js handlers** validate and call API:
   - `/api/game/hit-gem` for gems
   - `/api/game/hit-asteroid` for asteroids
4. **API routes** call game methods:
   - `game.hitVectorGem(gemId, playerId)`
   - `game.hitBadAsteroid(asteroidId, playerId)`
5. **GameState methods** update tokens and mark as hit
6. **Pusher events** broadcast updates to all players
7. **Client receives** events and updates UI

---

## Diagnostic Checklist

### 1. Are Gems/Asteroids Spawning?

**Check:**
```javascript
// In browser console during game:
console.log('Gems:', vectorGems.length, vectorGems);
console.log('Asteroids:', badAsteroids.length, badAsteroids);
```

**Expected:** During SEARCH phase, you should see 1-2 gems and/or asteroids

**If empty:**
- Check if game is in SEARCH phase: `roundPhase === 'SEARCH'`
- Check server logs for gem spawner startup
- Look for `💎 Vector Gem spawned` or `☄️ Bad Asteroid spawned` logs

### 2. Is Shooting Detecting Hits?

**Check browser console for:**
```
🔫 [ShootingSystem] shoot() called
🔫 [ShootingSystem] Checking for hits...
💎 [ShootingSystem] Calling onGemHit for gem: [gemId]
```

OR

```
☄️ [ShootingSystem] ========== ASTEROID HIT DETECTED ==========
☄️ [ShootingSystem] Calling onBadAsteroidHit with asteroid: [asteroidId]
```

**If not seeing these logs:**
- Shooting system not detecting hits properly
- Gems/asteroids may not be at expected positions
- Check gem/asteroid position calculation (velocity-based movement)

### 3. Are Callbacks Being Called?

**Check browser console for:**
```
💎 [CLIENT] ========== handleGemHit CALLED ==========
💎 [CLIENT] handleGemHit called with: [gem object]
```

OR

```
☄️ [CLIENT] ========== handleBadAsteroidHit CALLED ==========
☄️ [CLIENT] handleBadAsteroidHit called with: [asteroid object]
```

**If not seeing these logs:**
- Callbacks not wired up properly
- Check that `onGemHit` and `onBadAsteroidHit` props are passed to visualization components

### 4. Are API Calls Being Made?

**Check Network tab:**
- Look for POST requests to `/api/game/hit-gem` or `/api/game/hit-asteroid`
- Check response status (should be 200)
- Check response body for `success: true`

**Check browser console for:**
```
💎 [CLIENT] Sending gem hit request: [details]
💎 [CLIENT] hit-gem API response: {success: true, reward: X, tokens: Y}
```

**Common failures:**
- `gameCode` or `playerId` missing
- Player out of tokens
- Game not in SEARCH phase
- Gem/asteroid already hit
- Gem/asteroid expired

### 5. Check Game State

**In browser console:**
```javascript
// Check game state
console.log({
  gameCode,
  playerId,
  gameActive,
  roundPhase,
  tokens,
  isOut,
  practiceMode
});
```

**Required conditions:**
- `gameCode` exists (not null)
- `playerId` exists (not null)
- `gameActive` is true
- `roundPhase` is 'SEARCH'
- `practiceMode` is false (gems/asteroids don't spawn in practice mode)
- `tokens` > 0 OR isOut is false

---

## Common Issues & Solutions

### Issue 1: "Missing game information" Error

**Symptom:**
```
💎 [CLIENT] handleGemHit: Missing params
showToast('Missing game information', 'error');
```

**Cause:** `gameCode` or `playerId` is null/undefined

**Solution:**
- Ensure you're in an active game (not practice mode)
- Check that game was created/joined successfully
- Verify localStorage or session has game info

---

### Issue 2: "Gems are only available in active games, not practice mode"

**Symptom:**
```
showToast('Gems are only available in active games, not practice mode', 'info');
```

**Cause:** Trying to collect gems in practice mode

**Solution:**
- Create or join a multiplayer game
- Gems/asteroids only spawn in active multiplayer games during SEARCH phase

---

### Issue 3: "You are out of tokens and cannot shoot"

**Symptom:**
```
💎 [CLIENT] handleGemHit: Player is out
showToast('You are out of tokens and cannot shoot', 'warning');
```

**Cause:** Player has 0 tokens (`isOut === true`)

**Wait, this is wrong!**
- **BUG IDENTIFIED**: The `isOut` check in `handleGemHit` prevents collecting gems even though gems REWARD tokens, they don't cost tokens!
- Shooting costs 2 tokens, but collecting the gem after hitting it should be free
- The `isOut` check should NOT be in `handleGemHit` or `handleBadAsteroidHit`

**Solution:** Remove the `isOut` check from gem/asteroid hit handlers

---

### Issue 4: "Game is not in search phase"

**Symptom:**
API returns: `{ error: 'Game is not in search phase (current phase: TARGET_REVEAL)' }`

**Cause:** Trying to collect gems during wrong phase

**Solution:**
- Wait for SEARCH phase to begin
- Gems only spawn during SEARCH phase

---

### Issue 5: "Gem not found in local state"

**Symptom:**
```
💎 [CLIENT] Gem not found in local state
showToast('Gem not found in local state - it may have expired or been collected', 'warning');
```

**Cause:**
- Gem already collected by another player
- Gem expired (30 seconds after spawn)
- Client state out of sync

**Solution:**
- Check server logs for gem despawn events
- Verify Pusher events are being received
- Check if another player collected it first

---

## Critical Bug Found! 🐛

**Location:** `app/page.js` - `handleGemHit()` function (line ~1499)

**Bug:**
```javascript
if (isOut) {
  console.warn('💎 [CLIENT] handleGemHit: Player is out');
  showToast('You are out of tokens and cannot shoot', 'warning');
  return; // ← THIS PREVENTS COLLECTING GEMS WHEN OUT OF TOKENS!
}
```

**Problem:**
- This check prevents players from collecting gems when they have 0 tokens
- But gems REWARD tokens, they don't cost tokens!
- Shooting costs 2 tokens (handled by ShootingSystem/guess API)
- Collecting the gem after hitting it should be FREE and give bonus tokens
- A player with 0 tokens SHOULD be able to collect gems to get back in the game!

**Same bug in `handleBadAsteroidHit()`** (line ~1359):
- Bad asteroids DEDUCT tokens, so this check might make sense
- BUT the API route already checks `game.isPlayerOut(playerId)` (line 61)
- So this is a duplicate check that could cause issues

**Impact:**
- Players who run out of tokens cannot collect gems to recover
- This defeats the purpose of gems as a "comeback mechanic"
- The API routes have proper token checks, so client-side check is redundant

---

## Recommended Fix

### Option 1: Remove `isOut` check from both handlers (Recommended)

The API routes already validate token status properly. The client-side check is redundant and causes the bug.

**Remove from `handleGemHit` (line ~1499-1503):**
```javascript
// DELETE THESE LINES:
if (isOut) {
  console.warn('💎 [CLIENT] handleGemHit: Player is out');
  showToast('You are out of tokens and cannot shoot', 'warning');
  return;
}
```

**Remove from `handleBadAsteroidHit` (line ~1359 area):** Check for similar code and remove

### Option 2: Make gem collection exempt from token check

Keep the check for asteroids but remove for gems:

```javascript
// In handleGemHit - REMOVE the isOut check completely
// Gems should be collectable even when out of tokens (they give tokens back!)

// In handleBadAsteroidHit - KEEP or REMOVE (API already checks)
```

---

## Testing After Fix

1. **Create a game** (not practice mode)
2. **Start the game** and wait for SEARCH phase
3. **Verify gems spawn**:
   ```javascript
   // Browser console:
   vectorGems.length // Should be > 0
   ```
4. **Shoot a gem** (click or spacebar when aiming at gem)
5. **Check console** for successful flow:
   ```
   💎 [ShootingSystem] Calling onGemHit
   💎 [CLIENT] handleGemHit CALLED
   💎 [CLIENT] Sending gem hit request
   💎 [CLIENT] hit-gem API response: {success: true, ...}
   💎 Vector Gem collected! +X tokens!
   ```
6. **Verify token increase** in HUD
7. **Test when out of tokens**:
   - Use all tokens
   - Shoot and collect gem
   - Should work and give tokens back!

---

## Additional Debugging Commands

```javascript
// Check if callbacks exist
console.log('onGemHit:', typeof onGemHit);
console.log('onBadAsteroidHit:', typeof onBadAsteroidHit);

// Check gem data
console.log('Vector Gems:', vectorGems.map(g => ({
  id: g.id,
  position: g.position,
  velocity: g.velocity,
  reward: g.reward,
  age: Date.now() - g.spawnTime,
  hitBy: g.hitBy
})));

// Check asteroid data
console.log('Bad Asteroids:', badAsteroids.map(a => ({
  id: a.id,
  position: a.position,
  cost: a.cost,
  age: Date.now() - a.spawnTime,
  hitBy: a.hitBy
})));

// Force spawn test (if you have access to game object)
// Note: This won't work client-side, need server access
```

---

## Summary

**Most Likely Issue:** The `isOut` check in `handleGemHit` prevents collecting gems when tokens reach 0.

**Quick Fix:** Remove lines ~1499-1503 from `app/page.js`:
```diff
- if (isOut) {
-   console.warn('💎 [CLIENT] handleGemHit: Player is out');
-   showToast('You are out of tokens and cannot shoot', 'warning');
-   return;
- }
```

This should allow gem collection to work properly, especially for players who need gems to recover tokens!
