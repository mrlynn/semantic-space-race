# Navigation Tips - Getting Closer to Nodes

## Problem: Can't Get Close Enough

If you find yourself unable to zoom in closer to word nodes, here are solutions:

## Solutions

### 1. **Use Right-Click + Drag to Pan Closer**
Instead of just zooming, try:
- **Right-click and drag** toward the node you want to see
- This moves the camera forward in that direction
- Combine with zoom (mouse wheel) for best results

### 2. **Adjust the OrbitControls Target**
The zoom limit is based on distance to a "target" point:
- **Right-click + drag** moves the target point
- Move the target point closer to the node you want to see
- Then zoom in (mouse wheel) - you'll be able to get much closer

### 3. **Use Screen-Space Panning**
Screen-space panning is now enabled, which means:
- **Middle mouse button + drag** (or right-click + drag) pans in screen space
- This is more intuitive for getting closer to specific nodes
- Try panning toward a node, then zooming in

### 4. **Click to Focus (Alternative)**
If clicking a word node doesn't move you close enough:
1. Click the word node (this updates your position)
2. Manually pan/zoom to get closer
3. The camera won't auto-follow, so you have full control

## Camera Controls Summary

- **Left-click + drag**: Rotate view around target
- **Right-click + drag**: Pan/move camera (moves target point)
- **Mouse wheel**: Zoom in/out (distance to target)
- **Middle mouse + drag**: Screen-space panning (new!)

## Pro Tips

1. **Move target first**: Right-click drag to move the target point near the node
2. **Then zoom**: Mouse wheel to zoom in
3. **Fine-tune**: Use screen-space panning (middle mouse) for precise positioning

## If Still Stuck

If you're still having trouble:
1. **Reset view**: Try zooming all the way out first
2. **Reposition**: Right-click drag to move target to center of view
3. **Approach slowly**: Zoom in gradually while adjusting target position

The key is understanding that OrbitControls uses a "target" point - you need to move that target closer to what you want to see, then zoom in.
