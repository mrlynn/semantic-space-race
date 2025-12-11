/**
 * Semantic Clustering Algorithm
 * Projects high-dimensional embeddings to 3D while preserving semantic relationships
 * Similar words will be positioned close together, creating natural clusters
 */

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(a, b) {
  if (a.length !== b.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Calculate cosine distance (1 - similarity)
 */
function cosineDistance(a, b) {
  return 1 - cosineSimilarity(a, b);
}

/**
 * Simple Multi-Dimensional Scaling (MDS) to project embeddings to 3D
 * Preserves pairwise distances as much as possible
 * 
 * Algorithm:
 * 1. Calculate pairwise distance matrix
 * 2. Use classical MDS to find 3D positions
 * 3. Scale to desired size
 */
export function projectTo3DSemantic(embeddings, labels, scale = 5000) {
  const n = embeddings.length;
  
  if (n === 0) return [];
  if (n === 1) return [[0, 0, 0]];
  
  // Step 1: Calculate pairwise distance matrix
  console.log('Calculating pairwise distances...');
  const distances = [];
  for (let i = 0; i < n; i++) {
    distances[i] = [];
    for (let j = 0; j < n; j++) {
      if (i === j) {
        distances[i][j] = 0;
      } else {
        distances[i][j] = cosineDistance(embeddings[i], embeddings[j]);
      }
    }
  }
  
  // Step 2: Classical MDS
  // Convert distances to squared distances matrix
  const squaredDistances = distances.map(row => row.map(d => d * d));
  
  // Center the matrix (double centering)
  const rowMeans = squaredDistances.map(row => 
    row.reduce((sum, val) => sum + val, 0) / n
  );
  const grandMean = rowMeans.reduce((sum, val) => sum + val, 0) / n;
  
  const centered = squaredDistances.map((row, i) =>
    row.map((val, j) => {
      const colMean = squaredDistances.reduce((sum, r) => sum + r[j], 0) / n;
      return -0.5 * (val - rowMeans[i] - colMean + grandMean);
    })
  );
  
  // Step 3: Eigenvalue decomposition (simplified - use top 3 dimensions)
  // For simplicity, we'll use a power iteration method to find top eigenvectors
  // Or use a simpler approach: use the first 3 principal components
  
  // Simplified approach: Use the embedding dimensions that best preserve distances
  // We'll use a sampling-based approach to find good 3D positions
  
  // Alternative: Use force-directed layout (simpler and often works better)
  return projectTo3DForceDirected(embeddings, labels, distances, scale);
}

/**
 * Force-directed layout for semantic clustering
 * Similar to a spring system where similar words attract
 */
function projectTo3DForceDirected(embeddings, labels, distances, scale = 5000) {
  const n = embeddings.length;
  const positions = [];
  
  // Initialize positions randomly in a sphere
  for (let i = 0; i < n; i++) {
    const angle1 = Math.random() * Math.PI * 2;
    const angle2 = Math.random() * Math.PI;
    const radius = Math.random() * scale * 0.1;
    positions[i] = [
      radius * Math.sin(angle2) * Math.cos(angle1),
      radius * Math.sin(angle2) * Math.sin(angle1),
      radius * Math.cos(angle2),
    ];
  }
  
  // Iterative force-directed layout
  const iterations = 100;
  const k = Math.sqrt((scale * scale * scale) / n); // Optimal distance between nodes
  const temperature = scale * 0.5;
  const coolingRate = 0.95;
  
  for (let iter = 0; iter < iterations; iter++) {
    const forces = positions.map(() => [0, 0, 0]);
    
    // Calculate repulsive forces (all nodes repel each other)
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const dx = positions[i][0] - positions[j][0];
        const dy = positions[i][1] - positions[j][1];
        const dz = positions[i][2] - positions[j][2];
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.001;
        
        // Repulsive force (inverse square law)
        const repulsion = (k * k) / dist;
        const fx = (dx / dist) * repulsion;
        const fy = (dy / dist) * repulsion;
        const fz = (dz / dist) * repulsion;
        
        forces[i][0] += fx;
        forces[i][1] += fy;
        forces[i][2] += fz;
        forces[j][0] -= fx;
        forces[j][1] -= fy;
        forces[j][2] -= fz;
      }
    }
    
    // Calculate attractive forces (based on semantic similarity)
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const targetDist = distances[i][j] * scale; // Desired distance based on similarity
        const dx = positions[i][0] - positions[j][0];
        const dy = positions[i][1] - positions[j][1];
        const dz = positions[i][2] - positions[j][2];
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.001;
        
        // Attractive force (spring-like, stronger for similar words)
        const similarity = 1 - distances[i][j];
        const attractionStrength = similarity * similarity; // Stronger attraction for similar words
        const attraction = (dist - targetDist) * attractionStrength * 0.1;
        
        const fx = (dx / dist) * attraction;
        const fy = (dy / dist) * attraction;
        const fz = (dz / dist) * attraction;
        
        forces[i][0] -= fx;
        forces[i][1] -= fy;
        forces[i][2] -= fz;
        forces[j][0] += fx;
        forces[j][1] += fy;
        forces[j][2] += fz;
      }
    }
    
    // Update positions
    const currentTemp = temperature * Math.pow(coolingRate, iter);
    for (let i = 0; i < n; i++) {
      const forceMag = Math.sqrt(
        forces[i][0] * forces[i][0] +
        forces[i][1] * forces[i][1] +
        forces[i][2] * forces[i][2]
      );
      
      if (forceMag > 0) {
        const damping = Math.min(forceMag, currentTemp) / forceMag;
        positions[i][0] += forces[i][0] * damping;
        positions[i][1] += forces[i][1] * damping;
        positions[i][2] += forces[i][2] * damping;
      }
    }
  }
  
  return positions;
}

/**
 * Alternative: Anchor-based semantic positioning
 * Uses a few "anchor" words and positions others relative to them
 * This is faster and creates good clusters
 */
export function projectTo3DAnchors(embeddings, labels, scale = 5000) {
  const n = embeddings.length;
  if (n === 0) return [];
  
  // Select anchor words (diverse set)
  const numAnchors = Math.min(8, Math.floor(Math.sqrt(n)));
  const anchors = [];
  const anchorIndices = [];
  
  // First anchor: random
  anchorIndices.push(Math.floor(Math.random() * n));
  anchors.push(embeddings[anchorIndices[0]]);
  
  // Subsequent anchors: farthest from existing anchors
  for (let a = 1; a < numAnchors; a++) {
    let maxMinDist = -1;
    let bestIdx = 0;
    
    for (let i = 0; i < n; i++) {
      if (anchorIndices.includes(i)) continue;
      
      // Find minimum distance to any anchor
      let minDist = Infinity;
      for (let j = 0; j < anchors.length; j++) {
        const dist = cosineDistance(embeddings[i], anchors[j]);
        if (dist < minDist) minDist = dist;
      }
      
      if (minDist > maxMinDist) {
        maxMinDist = minDist;
        bestIdx = i;
      }
    }
    
    anchorIndices.push(bestIdx);
    anchors.push(embeddings[bestIdx]);
  }
  
  // Position anchors in 3D space (evenly distributed)
  const anchorPositions = [];
  for (let i = 0; i < numAnchors; i++) {
    const angle1 = (i / numAnchors) * Math.PI * 2;
    const angle2 = Math.asin((i * 2) / numAnchors - 1);
    anchorPositions[i] = [
      scale * 0.3 * Math.cos(angle1) * Math.cos(angle2),
      scale * 0.3 * Math.sin(angle1) * Math.cos(angle2),
      scale * 0.3 * Math.sin(angle2),
    ];
  }
  
  // Position each word based on similarity to anchors
  const positions = [];
  for (let i = 0; i < n; i++) {
    if (anchorIndices.includes(i)) {
      // This is an anchor, use its pre-calculated position
      const anchorIdx = anchorIndices.indexOf(i);
      positions[i] = [...anchorPositions[anchorIdx]];
      continue;
    }
    
    // Calculate weighted position based on similarity to anchors
    let totalWeight = 0;
    const pos = [0, 0, 0];
    
    for (let j = 0; j < numAnchors; j++) {
      const similarity = cosineSimilarity(embeddings[i], anchors[j]);
      const weight = Math.max(0, similarity); // Only positive similarities
      const weightPower = Math.pow(weight, 2); // Square to emphasize strong similarities
      
      pos[0] += anchorPositions[j][0] * weightPower;
      pos[1] += anchorPositions[j][1] * weightPower;
      pos[2] += anchorPositions[j][2] * weightPower;
      totalWeight += weightPower;
    }
    
    // Normalize
    if (totalWeight > 0) {
      pos[0] /= totalWeight;
      pos[1] /= totalWeight;
      pos[2] /= totalWeight;
    } else {
      // Fallback: random position
      pos[0] = (Math.random() - 0.5) * scale * 0.1;
      pos[1] = (Math.random() - 0.5) * scale * 0.1;
      pos[2] = (Math.random() - 0.5) * scale * 0.1;
    }
    
    // Add some spread based on uniqueness
    const uniqueness = 1 - (totalWeight / numAnchors);
    const spread = uniqueness * scale * 0.2;
    pos[0] += (Math.random() - 0.5) * spread;
    pos[1] += (Math.random() - 0.5) * spread;
    pos[2] += (Math.random() - 0.5) * spread;
    
    positions[i] = pos;
  }
  
  return positions;
}

/**
 * Main function: Choose the best method
 * For large datasets, use anchor-based (faster)
 * For smaller datasets, use force-directed (more accurate)
 */
export function projectAllTo3DSemantic(embeddings, labels, scale = 5000) {
  const n = embeddings.length;
  
  if (n < 10) {
    // Very small: use force-directed
    const distances = [];
    for (let i = 0; i < n; i++) {
      distances[i] = [];
      for (let j = 0; j < n; j++) {
        distances[i][j] = i === j ? 0 : cosineDistance(embeddings[i], embeddings[j]);
      }
    }
    return projectTo3DForceDirected(embeddings, labels, distances, scale);
  } else if (n < 100) {
    // Medium: use anchor-based (good balance)
    return projectTo3DAnchors(embeddings, labels, scale);
  } else {
    // Large: use anchor-based (fastest)
    return projectTo3DAnchors(embeddings, labels, scale);
  }
}

