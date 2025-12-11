/**
 * Improved 3D projection algorithms for better spatial distribution
 * Uses multiple strategies to ensure nodes are spread throughout 3D space
 */

/**
 * Calculate mean of array
 */
function mean(arr) {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

/**
 * Calculate standard deviation
 */
function stdDev(arr) {
  const m = mean(arr);
  const variance = arr.reduce((sum, val) => sum + Math.pow(val - m, 2), 0) / arr.length;
  return Math.sqrt(variance);
}

/**
 * Project using selected high-variance dimensions
 * This method picks dimensions that vary significantly across embeddings
 */
export function projectTo3DSelected(embedding, scale = 25) {
  const dims = embedding.length;
  
  // Select dimensions that are well-spaced and tend to have good variance
  // These indices are chosen to sample across the entire embedding space
  const xIndices = [0, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200, 1300, 1400, 1500];
  const yIndices = [50, 150, 250, 350, 450, 550, 650, 750, 850, 950, 1050, 1150, 1250, 1350, 1450];
  const zIndices = [25, 125, 225, 325, 425, 525, 625, 725, 825, 925, 1025, 1125, 1225, 1325, 1425, 1525];
  
  // Calculate weighted average of selected dimensions
  const x = xIndices
    .filter(idx => idx < dims)
    .reduce((sum, idx) => sum + embedding[idx], 0) / xIndices.filter(idx => idx < dims).length;
  
  const y = yIndices
    .filter(idx => idx < dims)
    .reduce((sum, idx) => sum + embedding[idx], 0) / yIndices.filter(idx => idx < dims).length;
  
  const z = zIndices
    .filter(idx => idx < dims)
    .reduce((sum, idx) => sum + embedding[idx], 0) / zIndices.filter(idx => idx < dims).length;
  
  return [x * scale, y * scale, z * scale];
}

/**
 * Project using chunk-based approach with max/min normalization
 * This creates better separation by using extreme values
 */
export function projectTo3DChunks(embedding, scale = 25) {
  const dims = embedding.length;
  const chunkSize = Math.floor(dims / 3);
  
  const chunk1 = embedding.slice(0, chunkSize);
  const chunk2 = embedding.slice(chunkSize, chunkSize * 2);
  const chunk3 = embedding.slice(chunkSize * 2);
  
  // Use max, min, and mean to create better spread
  const max1 = Math.max(...chunk1);
  const min1 = Math.min(...chunk1);
  const max2 = Math.max(...chunk2);
  const min2 = Math.min(...chunk2);
  const max3 = Math.max(...chunk3);
  const min3 = Math.min(...chunk3);
  
  // Use range (max - min) and mean to create position
  const x = (mean(chunk1) + (max1 - min1)) * scale;
  const y = (mean(chunk2) + (max2 - min2)) * scale;
  const z = (mean(chunk3) + (max3 - min3)) * scale;
  
  return [x, y, z];
}

/**
 * Project using first principal components approximation
 * Uses dimensions with highest absolute values (simplified PCA)
 */
export function projectTo3DPCA(embedding, scale = 25) {
  const dims = embedding.length;
  
  // Find top dimensions by absolute value for each axis
  const absValues = embedding.map((val, i) => ({ val: Math.abs(val), idx: i }));
  absValues.sort((a, b) => b.val - a.val);
  
  // Use top 100 dimensions for each axis
  const topCount = Math.min(100, Math.floor(dims / 3));
  
  const topX = absValues.slice(0, topCount)
    .reduce((sum, item) => sum + embedding[item.idx], 0) / topCount;
  
  const topY = absValues.slice(topCount, topCount * 2)
    .reduce((sum, item) => sum + embedding[item.idx], 0) / topCount;
  
  const topZ = absValues.slice(topCount * 2, topCount * 3)
    .reduce((sum, item) => sum + embedding[item.idx], 0) / topCount;
  
  return [topX * scale, topY * scale, topZ * scale];
}

/**
 * Best method: Combination of selected dimensions with chunk statistics
 * This provides the best spatial distribution
 */
export function projectTo3DVariance(embedding, scale = 25) {
  const dims = embedding.length;
  const chunkSize = Math.floor(dims / 3);
  
  // Split into chunks
  const chunk1 = embedding.slice(0, chunkSize);
  const chunk2 = embedding.slice(chunkSize, chunkSize * 2);
  const chunk3 = embedding.slice(chunkSize * 2);
  
  // Calculate range and mean for each chunk
  const range1 = Math.max(...chunk1) - Math.min(...chunk1);
  const range2 = Math.max(...chunk2) - Math.min(...chunk2);
  const range3 = Math.max(...chunk3) - Math.min(...chunk3);
  
  const mean1 = mean(chunk1);
  const mean2 = mean(chunk2);
  const mean3 = mean(chunk3);
  
  // Use mean + range to create better spread
  // This ensures nodes with different embedding characteristics are separated
  const x = (mean1 + range1 * 0.5) * scale;
  const y = (mean2 + range2 * 0.5) * scale;
  const z = (mean3 + range3 * 0.5) * scale;
  
  return [x, y, z];
}

