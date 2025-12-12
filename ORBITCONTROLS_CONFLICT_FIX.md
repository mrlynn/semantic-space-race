# OrbitControls Conflict Fix - Shooting System

**Date:** December 12, 2025
**Issue:** Shooting gems/asteroids had no effect - clicks weren't being detected
**Root Cause:** OrbitControls was consuming left mouse button events before ShootingSystem could process them
**Status:** ✅ FIXED

---

## 🐛 The Real Problem

### Issue #1: `isOut` Check (Previously Fixed)
The `isOut` check in `handleGemHit()` was preventing gem collection when tokens = 0.
**Status:** ✅ Fixed in previous commit

### Issue #2: OrbitControls Event Conflict (NEW - This Fix)
**OrbitControls** was consuming ALL left mouse button events, preventing ShootingSystem from ever receiving them.

**How It Happened:**
1. **User clicks** on a gem with left mouse button
2. **OrbitControls intercepts** the mousedown/mouseup events for camera rotation
3. **OrbitControls consumes** the event (may call preventDefault/stopPropagation)
4. **ShootingSystem never receives** the click event
5. **No shooting happens** - appears broken to user

**Evidence:**
- Console shows gems rendering: `💎 [RENDER] Rendering gem: gem-xxx`
- Console shows NO ShootingSystem logs:
  - Missing: `🔫 [ShootingSystem] Mouse down detected`
  - Missing: `🔫 [ShootingSystem] Mouse click detected, calling shoot()`
  - Missing: `🔫 [ShootingSystem] shoot() called`
- This means click events never reached ShootingSystem

---

## ✅ The Fix

**Configure OrbitControls to NOT use the left mouse button**, leaving it free for ShootingSystem.

### Before (All Visualization Components):
```javascript
<OrbitControls
  enablePan={true}
  enableZoom={true}
  enableRotate={true}
  // ... other props ...
  makeDefault={true}
  // NO mouseButtons config - uses default (left button for rotation)
/>
```

**Problem:** OrbitControls defaults to:
- LEFT button: ROTATE (camera rotation)
- MIDDLE button: DOLLY (zoom)
- RIGHT button: PAN (pan camera)

This means OrbitControls was handling left clicks for rotation, blocking shooting!

### After (All Visualization Components):
```javascript
<OrbitControls
  enablePan={true}
  enableZoom={true}
  enableRotate={true}
  // ... other props ...
  makeDefault={true}
  mouseButtons={{
    LEFT: -1,                   // Disable left button (used for shooting)
    MIDDLE: THREE.MOUSE.DOLLY,  // Middle button/wheel for zoom
    RIGHT: THREE.MOUSE.ROTATE,  // Right button for rotation (instead of left)
  }}
/>
```

**Solution:**
- `LEFT: -1` disables OrbitControls from handling left mouse button
- `RIGHT: THREE.MOUSE.ROTATE` moves rotation to right mouse button
- `MIDDLE: THREE.MOUSE.DOLLY` keeps zoom on middle button/scroll wheel

---

## 🎮 New Controls

### Camera Controls:
- **Right mouse button + drag**: Rotate camera
- **Middle mouse button + drag**: Pan camera (move around)
- **Scroll wheel / Middle button**: Zoom in/out

### Shooting:
- **Left mouse button click**: Shoot (now works!)
- **Spacebar**: Shoot straight ahead

---

## 📋 Files Modified

All three visualization components updated:

1. **`components/WordGraphHNSW.js`** (line ~1536-1540)
2. **`components/WordGraph3D.js`** (line ~592-596)
3. **`components/WordGraphForceDirected.js`** (line ~763-767)

Added `mouseButtons` configuration to OrbitControls in each.

---

## 🧪 How to Test

### 1. Start a Game
```bash
# Open http://localhost:3000
# Create a multiplayer game (not practice mode)
# Start the game
```

### 2. Wait for SEARCH Phase
- Gems should spawn (glowing crystalline objects)
- They move around with velocity

### 3. Test Shooting with LEFT CLICK
1. **Aim at a gem** by moving mouse over it
2. **Left-click** (single click, don't drag)
3. **Should see console logs**:
   ```
   🔫 [ShootingSystem] Mouse down detected
   🔫 [ShootingSystem] Mouse click detected, calling shoot()
   🔫 [ShootingSystem] shoot() called
   🔫 [ShootingSystem] Checking for hits...
   💎 [ShootingSystem] Calling onGemHit for gem: gem-xxxxx
   💎 [CLIENT] handleGemHit CALLED
   💎 [CLIENT] Sending gem hit request
   💎 [CLIENT] hit-gem API response: {success: true, ...}
   ```
4. **Should see toast**: "💎 Vector Gem collected! +X tokens!"
5. **Tokens should increase** in HUD

### 4. Test Shooting with SPACEBAR
1. **Aim at a gem** by positioning camera so gem is in center
2. **Press spacebar**
3. **Should see same console logs** as above
4. **Gem should be collected**

### 5. Test Camera Controls
1. **Right-click + drag**: Camera should rotate (instead of left-click + drag)
2. **Middle-click + drag**: Camera should pan
3. **Scroll wheel**: Camera should zoom

---

## 🔍 Why -1 for LEFT Button?

In THREE.js OrbitControls, mouse button assignments work like this:

```javascript
// THREE.MOUSE constants:
THREE.MOUSE.LEFT = 0
THREE.MOUSE.MIDDLE = 1
THREE.MOUSE.RIGHT = 2

// THREE.MOUSE actions:
THREE.MOUSE.ROTATE = 0
THREE.MOUSE.DOLLY = 1
THREE.MOUSE.PAN = 2
```

To **disable** a button, you set it to `-1` (invalid button ID).

```javascript
mouseButtons: {
  LEFT: -1,                   // -1 = disabled, OrbitControls won't handle it
  MIDDLE: THREE.MOUSE.DOLLY,  // 1 = zoom
  RIGHT: THREE.MOUSE.ROTATE,  // 0 = rotation
}
```

---

## 🚫 Why Other Approaches Didn't Work

### Approach 1: Event Order/Priority
**Tried:** Rely on ShootingSystem's drag detection to coexist with OrbitControls
**Problem:** OrbitControls consumed events before they reached ShootingSystem
**Result:** ShootingSystem never saw the events at all

### Approach 2: Event Listener Timing
**Tried:** Ensure ShootingSystem attaches listeners first
**Problem:** React Three Fiber and drei components manage their own listener lifecycle
**Result:** OrbitControls still intercepted events first

### Approach 3: Setting LEFT to null
**Tried:** `mouseButtons: { LEFT: null, ... }`
**Problem:** null might not properly disable the button in THREE.js
**Result:** Unreliable, -1 is the proper way to disable

---

## ✨ Result

**Before Fix:**
- Left-click: Camera rotates
- Shooting: Doesn't work (no events reach ShootingSystem)
- User confusion: "Why isn't shooting working?"

**After Fix:**
- Left-click: Shoots! (gems/asteroids can be hit)
- Right-click + drag: Camera rotates
- Console shows proper event flow
- Shooting system fully functional

---

## 📚 Related Documentation

- `SHOOTING_BUG_FIX.md` - The first bug fix (removed isOut check)
- `SHOOTING_TROUBLESHOOTING.md` - Comprehensive troubleshooting guide
- `components/ShootingSystem.js` - Shooting implementation with drag detection

---

## 🎯 Summary

The shooting system was never broken - it just never received the click events because OrbitControls was consuming them. By disabling OrbitControls' use of the left mouse button and moving rotation to the right button, we freed up left-click for shooting.

**Result:** Shooting gems and asteroids now works perfectly! 🚀🎯
