/**
 * Improved 3D projection for HNSW-like distribution
 * Creates proper spacing for 200+ nodes in a navigable 3D space
 */

/**
 * Create a hash from string for consistent positioning
 */
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Best method: Hybrid approach using embedding + hash for maximum spread
 * This ensures nodes are distributed across the entire 3D space
 */
export function projectTo3DSelected(embedding, wordLabel = '', scale = 5000) {
  // Use embedding values but amplify them significantly
  // Combine with word hash to add extra spread factor
  const hash = hashString(wordLabel);
  const hashX = (hash % 1000) / 1000 - 0.5; // -0.5 to 0.5
  const hashY = ((hash * 7) % 1000) / 1000 - 0.5;
  const hashZ = ((hash * 13) % 1000) / 1000 - 0.5;
  
  // Use first 3 dimensions of embedding (most informative)
  // Combine with hash for additional spread
  // Apply sigmoid-like function to amplify differences
  const sigmoid = (x) => Math.tanh(x * 3); // Amplifies differences
  
  const x = (sigmoid(embedding[0]) + hashX * 0.3) * scale;
  const y = (sigmoid(embedding[1]) + hashY * 0.3) * scale;
  const z = (sigmoid(embedding[2]) + hashZ * 0.3) * scale;
  
  return [x, y, z];
}

/**
 * Alternative: Pure embedding-based with massive amplification
 */
export function projectTo3DSpaced(embedding, scale = 5000) {
  // Use multiple dimensions and amplify differences
  const dims = embedding.length;
  
  // Sample from different regions and amplify
  const x = embedding.slice(0, 20).reduce((sum, val) => {
    return sum + Math.tanh(val * 5) * (1 / 20);
  }, 0) * scale;
  
  const y = embedding.slice(500, 520).reduce((sum, val) => {
    return sum + Math.tanh(val * 5) * (1 / 20);
  }, 0) * scale;
  
  const z = embedding.slice(1000, 1020).reduce((sum, val) => {
    return sum + Math.tanh(val * 5) * (1 / 20);
  }, 0) * scale;
  
  return [x, y, z];
}
