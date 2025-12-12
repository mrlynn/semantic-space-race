/**
 * Script to build HNSW neighbor graph by querying MongoDB Vector Search
 * 
 * Usage: node scripts/build-hnsw-neighbors.mjs
 * 
 * This script:
 * 1. Queries MongoDB Vector Search for k-nearest neighbors for each word
 * 2. Stores neighbor relationships with similarity scores
 * 3. Determines layer based on similarity (Layer 0 = high similarity, Layer 2+ = low similarity)
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import connectDB from '../lib/mongodb.js';
import WordNode from '../models/WordNode.js';
import { cosineSimilarity } from '../lib/utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local file
dotenv.config({ path: join(__dirname, '..', '.env.local') });

/**
 * Determine layer based on similarity
 * Layer 0: High similarity (>0.7) - dense local connections
 * Layer 1: Medium similarity (0.5-0.7) - medium-range connections
 * Layer 2+: Low similarity (<0.5) - long-range connections
 */
function determineLayer(similarity) {
  if (similarity > 0.7) return 0;
  if (similarity > 0.5) return 1;
  return 2;
}

async function buildHNSWNeighbors() {
  try {
    console.log('Connecting to MongoDB...');
    await connectDB();
    console.log('✓ Connected to MongoDB\n');

    // Get all words
    const words = await WordNode.find({}).select('_id label embedding neighbors').lean();
    console.log(`Found ${words.length} words to process\n`);

    let updated = 0;
    let errors = 0;
    const kNeighbors = 20; // Number of neighbors to find for each word

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      
      try {
        if (!word.embedding || word.embedding.length !== 1536) {
          console.log(`[${i + 1}/${words.length}] "${word.label}" - Skipping (invalid embedding)`);
          continue;
        }

        // Skip if neighbors already exist (uncomment to force rebuild)
        // if (word.neighbors && word.neighbors.length > 0) {
        //   console.log(`[${i + 1}/${words.length}] "${word.label}" - Skipping (neighbors already exist)`);
        //   continue;
        // }

        console.log(`[${i + 1}/${words.length}] Processing "${word.label}"...`);

        // Query MongoDB Vector Search for nearest neighbors
        let neighbors = [];
        let vectorSearchResults = [];
        try {
          vectorSearchResults = await WordNode.aggregate([
            {
              $vectorSearch: {
                index: 'vector_index',
                path: 'embedding',
                queryVector: word.embedding,
                numCandidates: Math.min(100, words.length * 2), // Ensure enough candidates
                limit: kNeighbors + 1, // +1 to exclude the source word
              },
            },
            {
              $project: {
                _id: 1,
                label: 1,
                embedding: 1,
              },
            },
          ]);

          // Check if vector search returned results
          if (vectorSearchResults.length === 0) {
            console.warn(`  ⚠ Vector search returned 0 results - using cosine similarity fallback`);
            // Fall through to fallback method
            throw new Error('Vector search returned 0 results');
          }

          // Filter out the source word and calculate similarity
          const sourceWordIdStr = word._id.toString();
          neighbors = vectorSearchResults
            .filter(n => n && n._id && n.embedding && n._id.toString() !== sourceWordIdStr)
            .slice(0, kNeighbors)
            .map(n => {
              if (!n || !n._id || !n.embedding) {
                return null;
              }
              try {
                const similarity = cosineSimilarity(word.embedding, n.embedding);
                return {
                  nodeId: n._id.toString(),
                  similarity: similarity,
                  layer: determineLayer(similarity),
                };
              } catch (error) {
                console.warn(`  ⚠ Error calculating similarity for neighbor:`, error.message);
                return null;
              }
            })
            .filter(n => n !== null) // Remove null entries
            .sort((a, b) => b.similarity - a.similarity); // Sort by similarity descending

          console.log(`  ✓ Found ${neighbors.length} neighbors via vector search (from ${vectorSearchResults.length} results)`);
        } catch (vectorError) {
          // Fallback: calculate similarity for all words using cosine similarity
          console.log(`  🔄 Using cosine similarity fallback (vector search unavailable or returned 0 results)`);
          
          const allWords = await WordNode.find({ _id: { $ne: word._id } })
            .select('_id embedding')
            .lean();

          neighbors = allWords
            .filter(n => n && n._id && n.embedding && Array.isArray(n.embedding) && n.embedding.length === 1536)
            .map(n => {
              if (!n || !n._id || !n.embedding) {
                return null;
              }
              try {
                const similarity = cosineSimilarity(word.embedding, n.embedding);
                return {
                  nodeId: n._id.toString(),
                  similarity: similarity,
                  layer: determineLayer(similarity),
                };
              } catch (error) {
                console.warn(`  ⚠ Error calculating similarity for neighbor:`, error.message);
                return null;
              }
            })
            .filter(n => n !== null) // Remove null entries
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, kNeighbors);

          console.log(`  ✓ Found ${neighbors.length} neighbors via cosine similarity fallback`);
        }

        // Determine the word's own layer based on its neighbors
        // Use the average similarity of top neighbors
        let wordLayer = 0;
        if (neighbors.length > 0) {
          const avgTopSimilarity = neighbors.slice(0, 5).reduce((sum, n) => sum + (n?.similarity || 0), 0) / Math.min(5, neighbors.length);
          wordLayer = determineLayer(avgTopSimilarity);
        }

        // Update the word with neighbors and layer
        await WordNode.findByIdAndUpdate(word._id, {
          neighbors: neighbors,
          layer: wordLayer,
        });

        if (neighbors.length > 0) {
          const topNeighbor = neighbors[0];
          console.log(`  ✓ Updated with ${neighbors.length} neighbors (top: ${topNeighbor.nodeId}, similarity: ${topNeighbor.similarity.toFixed(4)}, layer: ${wordLayer})`);
        } else {
          console.log(`  ⚠ Updated with 0 neighbors (vector search returned no results, layer: ${wordLayer})`);
        }
        updated++;
      } catch (error) {
        console.error(`[${i + 1}/${words.length}] ✗ Error processing "${word.label}":`, error.message);
        errors++;
      }

      // Progress update every 10 words
      if ((i + 1) % 10 === 0) {
        console.log(`\nProgress: ${i + 1}/${words.length} (${updated} updated, ${errors} errors)\n`);
      }
    }

    console.log('\n=== Build Complete ===');
    console.log(`Updated: ${updated}`);
    console.log(`Errors: ${errors}`);
    console.log(`Total: ${words.length}`);

    // Show statistics
    const updatedWords = await WordNode.find({ neighbors: { $exists: true, $ne: [] } })
      .select('neighbors layer')
      .lean();
    
    const layerCounts = { 0: 0, 1: 0, 2: 0 };
    let totalNeighbors = 0;
    
    updatedWords.forEach(word => {
      layerCounts[word.layer] = (layerCounts[word.layer] || 0) + 1;
      totalNeighbors += word.neighbors?.length || 0;
    });

    console.log('\n=== Neighbor Graph Statistics ===');
    console.log(`Words with neighbors: ${updatedWords.length}`);
    console.log(`Total neighbor relationships: ${totalNeighbors}`);
    console.log(`Average neighbors per word: ${(totalNeighbors / updatedWords.length).toFixed(2)}`);
    console.log(`Layer distribution:`);
    console.log(`  Layer 0 (high similarity): ${layerCounts[0]}`);
    console.log(`  Layer 1 (medium similarity): ${layerCounts[1]}`);
    console.log(`  Layer 2+ (low similarity): ${layerCounts[2]}`);

    process.exit(0);
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

buildHNSWNeighbors();
