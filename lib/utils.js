/**
 * Calculate cosine similarity between two vectors
 * @param {number[]} vecA - First vector
 * @param {number[]} vecB - Second vector
 * @returns {number} Cosine similarity (0-1)
 */
export function cosineSimilarity(vecA, vecB) {
  if (vecA.length !== vecB.length) {
    throw new Error('Vectors must have the same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) {
    return 0;
  }

  return dotProduct / denominator;
}

/**
 * Calculate distance-based similarity from 3D positions
 * @param {number[]} posA - First position [x, y, z]
 * @param {number[]} posB - Second position [x, y, z]
 * @param {number} maxDistance - Maximum distance for normalization
 * @returns {number} Similarity (0-1)
 */
export function distanceSimilarity(posA, posB, maxDistance = 10) {
  const dx = posA[0] - posB[0];
  const dy = posA[1] - posB[1];
  const dz = posA[2] - posB[2];
  const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
  return Math.max(0, 1 - (distance / maxDistance));
}

/**
 * Get similarity feedback category
 * @param {number} similarity - Similarity score (0-1)
 * @returns {Object} Feedback object with category and message
 */
export function getSimilarityFeedback(similarity) {
  const percentage = Math.round(similarity * 100);
  
  if (similarity >= 0.99) {
    return {
      category: 'correct',
      message: 'Correct! Round complete!',
      color: 'success',
      percentage,
    };
  } else if (similarity >= 0.70) {
    return {
      category: 'hot',
      message: "You're getting close!",
      color: 'error',
      percentage,
    };
  } else if (similarity >= 0.40) {
    return {
      category: 'warm',
      message: 'Getting warmer...',
      color: 'warning',
      percentage,
    };
  } else {
    return {
      category: 'cold',
      message: 'Keep searching...',
      color: 'info',
      percentage,
    };
  }
}

/**
 * Generate a random game code
 * @returns {string} 6-character game code
 */
export function generateGameCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

