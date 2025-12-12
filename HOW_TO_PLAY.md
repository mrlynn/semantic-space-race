# How to Play Semantic Hop - Quick Guide

## 🎯 The Main Problem (FIXED!)

**The camera was automatically following you**, making it feel like you were being pulled back. This has been **FIXED** - you now have full camera control!

## What You're Looking At

### The Green Sphere
That's **your current position** in the word graph! It's highlighted in green to show where you are.

- **Green glowing sphere** = The word you're currently on (your position)
- **Other colored spheres** = Other words you can navigate to
- **Lines/edges** (when you click a word) = Connections to similar words

**Important**: The green sphere is just a marker - it doesn't control your camera anymore!

## Basic Controls

### 1. **Control Your Camera (You're in Control Now!)**
- **Mouse drag (left-click + drag)**: Rotate the camera around
- **Mouse wheel / scroll**: Zoom in and out  
- **Right-click + drag**: Pan/move the view
- **Spacebar**: Shoot in the direction you're looking (costs 2 tokens)

**Key Point**: The camera stays where YOU put it - it won't automatically move anymore!

### 2. **Move to a Word (Hop)**
You have 3 ways to move:

**Option A: Type a Word** ⭐ EASIEST
1. Look at the **left side panel** (HUD) - there's a text input box at the top
2. Type a word (e.g., "database", "query", "index")
3. Press **Enter** or click the "Hop" button
4. You'll move to that word if it exists
5. **Your camera stays where you put it** - no automatic movement!

**Option B: Click a Word Node**
1. Click directly on any word sphere in the 3D view
2. You'll hop to that word
3. Camera stays put

**Option C: Click from Neighbor List**
1. Look at the **left panel** - there's a "Neighbors" section
2. Click any word from that list
3. You'll hop to it
4. Camera stays put

### 3. **Make a Guess**
To guess the target word:
1. Type the word in the input box (same as hopping)
2. Press Enter
3. If it's correct, you win the round!
4. If not, you'll see similarity feedback (Hot/Warm/Cold)

## Understanding the Game

### Goal
Find the **target word** based on the **riddle/definition** shown at the top of the left panel.

### How It Works
1. **Read the riddle** - It describes the target word
2. **Navigate the graph** - Hop between related words
3. **Use similarity feedback** - When you hop to a word, you'll see:
   - **Hot** (≥70%): You're getting close!
   - **Warm** (≥40%): Getting warmer...
   - **Cold** (<40%): Keep searching...
4. **Make your guess** - Type the word you think it is
5. **First correct guess wins the round!**

## The Left Panel (HUD)

This shows all the important info:

- **Top**: Game code, round number, time remaining
- **Definition/Riddle**: The clue for the target word
- **Tokens**: Your action points (start with 15 per round)
- **Input Box**: Type words here to hop or guess
- **Neighbors**: Words similar to your current position
- **Related Words**: Words similar to the TARGET (helpful!)
- **Leaderboard**: See other players' scores

## Token System

You have **15 tokens** per round. Actions cost tokens:

- **Type/Guess a word**: 3 tokens
- **Shoot (Spacebar)**: 2 tokens  
- **Get a hint**: 5 tokens (also costs 3 points)

**Running out?** Hit the red gems (Vector Gems) that float around - they give you 1-10 bonus tokens!

## Camera Controls (IMPORTANT - You're in Control!)

**The camera no longer automatically follows you** - you have full control!

### If the green sphere looks too big:
1. **Scroll out** (mouse wheel) to zoom out
2. **Drag** (left-click + drag) to rotate and see more words
3. **Right-click + drag** to pan around

### If you feel "stuck" or camera keeps moving:
- **This is now FIXED!** The camera won't automatically move anymore
- Position your camera where you want it
- It will stay there when you hop to new words
- You have full manual control

### Navigation Strategy:
1. **First**: Zoom out and position your camera to see the whole graph
2. **Then**: Type or click words to navigate
3. **Camera stays put**: Your view won't change unless you manually move it

## Quick Start Steps

1. **Read the riddle** at the top of the left panel
2. **Type a word** related to the riddle in the input box
3. **Press Enter** to hop to that word
4. **Check the similarity** - is it Hot, Warm, or Cold?
5. **Navigate** - try words from the "Neighbors" or "Related Words" lists
6. **When you think you know it** - type the target word and guess!

## Tips

- **Use Related Words panel** - These show words similar to the TARGET, not your current position
- **Follow the heat** - If you see "Hot" feedback, you're on the right track!
- **Don't waste tokens** - Be strategic about when to guess
- **Click words** - Sometimes clicking is easier than typing
- **Zoom out** - If everything looks huge, scroll out to see the full graph

## Troubleshooting

### "The camera keeps moving back to my position!"
✅ **FIXED!** The camera auto-follow has been disabled. Your camera now stays where you put it.

### "I feel lost and can't navigate!"
**Try this step-by-step:**
1. **Zoom out**: Scroll your mouse wheel back to see the whole graph
2. **Rotate**: Left-click and drag to look around
3. **Type a word**: Use the input box in the left panel (easiest method)
4. **Check feedback**: See if you're Hot/Warm/Cold
5. **Keep exploring**: Type more words to navigate

### "The green sphere is too big!"
- **Scroll out** with your mouse wheel
- The sphere is your current position - it's supposed to be highlighted
- You can zoom way out to see everything

### "I can't see other words!"
- **Zoom out** (scroll wheel) - zoom way out!
- **Rotate** (drag with left mouse button) to look around
- Other words are the smaller colored spheres around you
- They might be far away - keep zooming out

### "I don't know what to do!"
**Simple steps:**
1. Look at the **left panel** - read the riddle/definition at the top
2. **Type a word** related to that riddle in the input box
3. Press **Enter**
4. See the similarity feedback (Hot/Warm/Cold)
5. Keep typing words to explore
6. When you think you know it, type the answer!

### "Nothing happens when I type!"
- Make sure you're in the **SEARCH phase** (not TARGET_REVEAL)
- Check that you have tokens (shown in left panel)
- Make sure the game has started (host needs to click "Start Game")
- Try typing a simple word like "database" or "query"

### "I keep going back to the same place!"
✅ **FIXED!** The camera no longer auto-follows. Your position updates when you hop, but the camera stays where you put it.

## Visual Guide

```
┌─────────────────────────────────────┐
│  LEFT PANEL (HUD)                   │
│  ┌───────────────────────────────┐  │
│  │ Definition/Riddle             │  │
│  │ "A collection of data..."      │  │
│  └───────────────────────────────┘  │
│  ┌───────────────────────────────┐  │
│  │ [Type word here] [Hop Button] │  │
│  └───────────────────────────────┘  │
│  Neighbors:                          │
│  • database (85%)                    │
│  • query (78%)                       │
│  Related Words:                      │
│  • collection (92%)                  │
│  • document (88%)                    │
└─────────────────────────────────────┘

        3D VIEW (Right Side)
        
        🟢 <-- YOU ARE HERE (green sphere)
         /|\
        / | \
       🟡 🟡 🟡  <-- Other words (yellow/blue)
```

The green sphere = You. Click it or other spheres to move. Type words to navigate. First to guess correctly wins!
