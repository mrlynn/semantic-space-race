/**
 * Simple PCA-like projection to 3D
 * Uses the first 3 principal components approximated from the embedding
 */

/**
 * Calculate mean of array
 */
function mean(arr) {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

/**
 * Calculate variance of array
 */
function variance(arr) {
  const m = mean(arr);
  return arr.reduce((sum, val) => sum + Math.pow(val - m, 2), 0) / arr.length;
}

/**
 * Calculate standard deviation
 */
function stdDev(arr) {
  return Math.sqrt(variance(arr));
}

/**
 * Project high-dimensional embedding to 3D using PCA approximation
 * @param {number[]} embedding - 1536-dimensional embedding vector
 * @param {number} scale - Scale factor for output coordinates
 * @returns {[number, number, number]} 3D position [x, y, z]
 */
export function projectTo3D(embedding, scale = 10) {
  // Method 1: Use first 3 dimensions directly (simple but works)
  // const x = embedding[0] * scale;
  // const y = embedding[1] * scale;
  // const z = embedding[2] * scale;

  // Method 2: Use weighted combination of multiple dimensions (better distribution)
  // This creates better spatial separation
  const dims = embedding.length;
  
  // X: weighted sum of first third
  const x = embedding.slice(0, Math.floor(dims / 3))
    .reduce((sum, val, i) => sum + val * (i + 1) / dims, 0) * scale * 3;
  
  // Y: weighted sum of middle third
  const y = embedding.slice(Math.floor(dims / 3), Math.floor(2 * dims / 3))
    .reduce((sum, val, i) => sum + val * (i + 1) / dims, 0) * scale * 3;
  
  // Z: weighted sum of last third
  const z = embedding.slice(Math.floor(2 * dims / 3))
    .reduce((sum, val, i) => sum + val * (i + 1) / dims, 0) * scale * 3;

  return [x, y, z];
}

/**
 * Better projection using direct dimension selection with better scaling
 * This creates much better spatial distribution
 */
export function projectTo3DVariance(embedding, scale = 20) {
  const dims = embedding.length;
  
  // Use specific dimensions that tend to vary more
  // Pick dimensions that are spaced out across the embedding
  const xDims = [0, 128, 256, 384, 512, 640, 768, 896];
  const yDims = [64, 192, 320, 448, 576, 704, 832, 960];
  const zDims = [32, 160, 288, 416, 544, 672, 800, 928, 1056, 1184, 1312, 1440];
  
  // Calculate weighted sum using selected dimensions
  const x = xDims.reduce((sum, idx) => {
    if (idx < dims) return sum + embedding[idx] * (idx / dims);
    return sum;
  }, 0) / xDims.length * scale;
  
  const y = yDims.reduce((sum, idx) => {
    if (idx < dims) return sum + embedding[idx] * (idx / dims);
    return sum;
  }, 0) / yDims.length * scale;
  
  const z = zDims.reduce((sum, idx) => {
    if (idx < dims) return sum + embedding[idx] * (idx / dims);
    return sum;
  }, 0) / zDims.length * scale;
  
  return [x, y, z];
}

/**
 * Project using first principal components (simplified PCA)
 * Uses the dimensions with highest variance
 */
export function projectTo3DPCA(embeddings, scale = 10) {
  // For a single embedding, we'll use a simpler approach
  // In a full PCA, we'd compute eigenvectors across all embeddings
  // Here we approximate by using dimensions with highest variance
  
  const dims = embeddings.length;
  const chunkSize = Math.floor(dims / 3);
  
  // Find dimensions with highest absolute values (proxy for importance)
  const absValues = embeddings.map((val, i) => ({ val: Math.abs(val), idx: i }));
  absValues.sort((a, b) => b.val - a.val);
  
  // Use top dimensions for each axis
  const topX = absValues.slice(0, chunkSize).reduce((sum, item) => sum + embeddings[item.idx], 0) / chunkSize;
  const topY = absValues.slice(chunkSize, chunkSize * 2).reduce((sum, item) => sum + embeddings[item.idx], 0) / chunkSize;
  const topZ = absValues.slice(chunkSize * 2, chunkSize * 3).reduce((sum, item) => sum + embeddings[item.idx], 0) / chunkSize;
  
  return [topX * scale, topY * scale, topZ * scale];
}

