/**
 * Script to update existing word positions with better 3D distribution
 * 
 * Usage: node scripts/update-positions.mjs
 * 
 * This will recalculate positions for all existing words in the database
 * using the improved projection algorithm.
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import connectDB from '../lib/mongodb.js';
import WordNode from '../models/WordNode.js';
import { projectTo3DSelected } from './pca3d-improved.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local file
dotenv.config({ path: join(__dirname, '..', '.env.local') });

async function updatePositions() {
  try {
    console.log('Connecting to MongoDB...');
    await connectDB();
    console.log('✓ Connected to MongoDB\n');

    // Get all words
    const words = await WordNode.find({}).select('_id label embedding position');
    console.log(`Found ${words.length} words to update\n`);

    let updated = 0;
    let errors = 0;

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      
      try {
        if (!word.embedding || word.embedding.length !== 1536) {
          console.log(`[${i + 1}/${words.length}] "${word.label}" - Skipping (invalid embedding)`);
          continue;
        }

        // Calculate new position using hybrid projection (embedding + hash)
        // Uses MASSIVE scale (5000) with sigmoid amplification for proper spread
        // Pass word label for hash-based additional spread
        const newPosition = projectTo3DSelected(word.embedding, word.label, 5000);

        // Update the word
        await WordNode.findByIdAndUpdate(word._id, {
          position: newPosition,
        });

        console.log(`[${i + 1}/${words.length}] ✓ Updated "${word.label}" to [${newPosition.map(p => p.toFixed(2)).join(', ')}]`);
        updated++;
      } catch (error) {
        console.error(`[${i + 1}/${words.length}] ✗ Error updating "${word.label}":`, error.message);
        errors++;
      }
    }

    console.log('\n=== Update Complete ===');
    console.log(`Updated: ${updated}`);
    console.log(`Errors: ${errors}`);
    console.log(`Total: ${words.length}`);

    process.exit(0);
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

updatePositions();

