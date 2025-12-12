/**
 * Script to compute UMAP-based 3D layout for word embeddings
 * 
 * Usage: node scripts/compute-umap-layout.mjs
 * 
 * This script:
 * 1. Loads all word embeddings from database
 * 2. Computes 3D positions using UMAP dimensionality reduction
 * 3. Updates WordNode.position with UMAP results
 * 
 * Note: Requires 'umap-js' package. Install with: npm install umap-js
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import connectDB from '../lib/mongodb.js';
import WordNode from '../models/WordNode.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local file
dotenv.config({ path: join(__dirname, '..', '.env.local') });

// Import umap-js - it uses named export { UMAP }
import { UMAP } from 'umap-js';

async function computeUMAPLayout() {
  try {
    console.log('Connecting to MongoDB...');
    await connectDB();
    console.log('✓ Connected to MongoDB\n');

    // Get all words with embeddings
    const words = await WordNode.find({ embedding: { $exists: true } })
      .select('_id label embedding position topic')
      .lean();
    
    console.log(`Found ${words.length} words to process\n`);

    if (words.length === 0) {
      console.error('No words found in database');
      process.exit(1);
    }

    // Filter words with valid embeddings
    const validWords = words.filter(w => 
      w.embedding && 
      Array.isArray(w.embedding) && 
      w.embedding.length === 1536
    );

    console.log(`Valid embeddings: ${validWords.length}/${words.length}\n`);

    if (validWords.length === 0) {
      console.error('No words with valid embeddings found');
      process.exit(1);
    }

    // Extract embeddings array
    const embeddings = validWords.map(w => w.embedding);
    console.log(`Embedding matrix: ${embeddings.length} x ${embeddings[0].length}\n`);

    // Configure UMAP
    console.log('Computing UMAP layout...');
    console.log('  This may take several minutes for large datasets...\n');

    const umap = new UMAP({
      nComponents: 3,        // 3D output
      nNeighbors: 15,        // Number of neighbors (typical: 5-50)
      minDist: 0.1,          // Minimum distance (0.0-1.0, lower = tighter clusters)
      spread: 1.0,           // Spread (typically 1.0)
      random: Math.random,   // Random seed
    });

    // Fit UMAP and transform embeddings to 3D
    const startTime = Date.now();
    const positions3D = umap.fit(embeddings);
    const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log(`✓ UMAP computation complete (${elapsedTime}s)\n`);

    // Normalize positions to reasonable scale (similar to existing positions)
    // Find min/max for each dimension
    const xs = positions3D.map(p => p[0]);
    const ys = positions3D.map(p => p[1]);
    const zs = positions3D.map(p => p[2]);

    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const minZ = Math.min(...zs);
    const maxZ = Math.max(...zs);

    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;
    const rangeZ = maxZ - minZ || 1;

    // Scale to approximately match existing position scale (around -5000 to 5000)
    const targetScale = 5000;
    const scaleX = targetScale / rangeX;
    const scaleY = targetScale / rangeY;
    const scaleZ = targetScale / rangeZ;

    // Use average scale to maintain aspect ratio
    const avgScale = (scaleX + scaleY + scaleZ) / 3;

    console.log('Position statistics:');
    console.log(`  X: [${minX.toFixed(2)}, ${maxX.toFixed(2)}] (range: ${rangeX.toFixed(2)})`);
    console.log(`  Y: [${minY.toFixed(2)}, ${maxY.toFixed(2)}] (range: ${rangeY.toFixed(2)})`);
    console.log(`  Z: [${minZ.toFixed(2)}, ${maxZ.toFixed(2)}] (range: ${rangeZ.toFixed(2)})`);
    console.log(`  Scale factor: ${avgScale.toFixed(2)}\n`);

    // Update positions in database
    console.log('Updating positions in database...\n');
    let updated = 0;
    let errors = 0;

    for (let i = 0; i < validWords.length; i++) {
      const word = validWords[i];
      const rawPos = positions3D[i];
      
      try {
        // Scale and center the position
        const scaledPos = [
          (rawPos[0] - (minX + maxX) / 2) * avgScale,
          (rawPos[1] - (minY + maxY) / 2) * avgScale,
          (rawPos[2] - (minZ + maxZ) / 2) * avgScale,
        ];

        await WordNode.findByIdAndUpdate(word._id, {
          position: scaledPos,
        });

        if ((i + 1) % 50 === 0 || i < 5) {
          console.log(`[${i + 1}/${validWords.length}] ✓ Updated "${word.label}" to [${scaledPos.map(p => p.toFixed(2)).join(', ')}]`);
        }
        updated++;
      } catch (error) {
        console.error(`[${i + 1}/${validWords.length}] ✗ Error updating "${word.label}":`, error.message);
        errors++;
      }
    }

    console.log('\n=== Update Complete ===');
    console.log(`Updated: ${updated}`);
    console.log(`Errors: ${errors}`);
    console.log(`Total: ${validWords.length}`);

    // Show final statistics
    const updatedWords = await WordNode.find({ _id: { $in: validWords.map(w => w._id) } })
      .select('position')
      .lean();
    
    const finalXs = updatedWords.map(w => w.position[0]);
    const finalYs = updatedWords.map(w => w.position[1]);
    const finalZs = updatedWords.map(w => w.position[2]);

    console.log('\n=== Final Position Statistics ===');
    console.log(`X range: [${Math.min(...finalXs).toFixed(2)}, ${Math.max(...finalXs).toFixed(2)}] (span: ${(Math.max(...finalXs) - Math.min(...finalXs)).toFixed(2)})`);
    console.log(`Y range: [${Math.min(...finalYs).toFixed(2)}, ${Math.max(...finalYs).toFixed(2)}] (span: ${(Math.max(...finalYs) - Math.min(...finalYs)).toFixed(2)})`);
    console.log(`Z range: [${Math.min(...finalZs).toFixed(2)}, ${Math.max(...finalZs).toFixed(2)}] (span: ${(Math.max(...finalZs) - Math.min(...finalZs)).toFixed(2)})`);

    process.exit(0);
  } catch (error) {
    console.error('Fatal error:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

computeUMAPLayout();
