# Avatar Models

This directory should contain 8 GLB (or GLTF) files for player avatars:

- `avatar-0.glb`
- `avatar-1.glb`
- `avatar-2.glb`
- `avatar-3.glb`
- `avatar-4.glb`
- `avatar-5.glb`
- `avatar-6.glb`
- `avatar-7.glb`

## Specifications

- **Format**: GLB (binary GLTF) preferred, or GLTF
- **Poly count**: 500-2000 triangles (low-poly for performance)
- **Scale**: Models should be roughly 1 unit in scale (will be scaled to 12-15 units in code)
- **Orientation**: Models should face forward (positive Z or Y axis)
- **Style**: Low-poly, minimalist, geometric characters
- **Theme**: Space/sci-fi or abstract to match game aesthetic

## Generating Avatars

You can generate these using AI tools like:
- Meshy
- Rodin
- Spline
- Blender (with AI plugins)

If no GLB files are present, the game will automatically fall back to colored sphere avatars.
