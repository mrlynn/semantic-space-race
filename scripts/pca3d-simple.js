/**
 * Simple and effective 3D projection
 * Uses direct embedding values with proper scaling to ensure good distribution
 */

/**
 * Project embedding directly to 3D using first dimensions with proper scaling
 * This is the simplest and most effective approach
 */
export function projectTo3DSimple(embedding, scale = 50) {
  // Use first 3 dimensions directly - they contain the most information
  // Scale them significantly to create good spatial separation
  const x = embedding[0] * scale;
  const y = embedding[1] * scale;
  const z = embedding[2] * scale;
  
  return [x, y, z];
}

/**
 * Project using multiple dimensions with better weighting
 * This creates better distribution by using more embedding information
 */
export function projectTo3DMulti(embedding, scale = 50) {
  const dims = embedding.length;
  
  // Use first 10 dimensions for each axis, weighted by position
  // This captures more information while maintaining good distribution
  const x = embedding.slice(0, 10)
    .reduce((sum, val, i) => sum + val * (10 - i) / 10, 0) * scale;
  
  const y = embedding.slice(10, 20)
    .reduce((sum, val, i) => sum + val * (10 - i) / 10, 0) * scale;
  
  const z = embedding.slice(20, 30)
    .reduce((sum, val, i) => sum + val * (10 - i) / 10, 0) * scale;
  
  return [x, y, z];
}

/**
 * Project using evenly spaced dimensions across the embedding
 * This ensures we sample from different parts of the embedding space
 */
export function projectTo3DSpaced(embedding, scale = 50) {
  const dims = embedding.length;
  
  // Sample dimensions that are evenly spaced
  const xIndices = [0, Math.floor(dims * 0.33), Math.floor(dims * 0.66)];
  const yIndices = [Math.floor(dims * 0.1), Math.floor(dims * 0.4), Math.floor(dims * 0.7)];
  const zIndices = [Math.floor(dims * 0.2), Math.floor(dims * 0.5), Math.floor(dims * 0.8)];
  
  const x = xIndices.reduce((sum, idx) => sum + embedding[idx], 0) / xIndices.length * scale;
  const y = yIndices.reduce((sum, idx) => sum + embedding[idx], 0) / yIndices.length * scale;
  const z = zIndices.reduce((sum, idx) => sum + embedding[idx], 0) / zIndices.length * scale;
  
  return [x, y, z];
}

/**
 * Best method: Use first 3 dimensions with large scale
 * OpenAI embeddings have good information in the first dimensions
 */
export function projectTo3DSelected(embedding, scale = 50) {
  // Simply use the first 3 dimensions - they're the most informative
  // Scale them significantly to create spatial separation
  return [
    embedding[0] * scale,
    embedding[1] * scale,
    embedding[2] * scale,
  ];
}

