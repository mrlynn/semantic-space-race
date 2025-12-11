/**
 * Quick fix script: Recalculate positions using the old method if they're invalid
 * This is a fallback if semantic clustering hasn't been run yet
 * 
 * Usage: node scripts/fix-positions.mjs
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

async function fixPositions() {
  try {
    console.log('Connecting to MongoDB...');
    await connectDB();
    console.log('✓ Connected to MongoDB\n');

    // Get all words
    const words = await WordNode.find({}).select('_id label embedding position');
    console.log(`Found ${words.length} words\n`);

    let updated = 0;
    let skipped = 0;
    let errors = 0;

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      
      try {
        if (!word.embedding || word.embedding.length !== 1536) {
          console.log(`[${i + 1}/${words.length}] "${word.label}" - Skipping (invalid embedding)`);
          skipped++;
          continue;
        }

        // Check if position is invalid (all zeros or missing)
        const pos = word.position;
        const isInvalid = !pos || 
                         !Array.isArray(pos) || 
                         pos.length !== 3 || 
                         (pos[0] === 0 && pos[1] === 0 && pos[2] === 0) ||
                         !pos.every(p => typeof p === 'number' && isFinite(p));

        // FORCE RECALCULATION: Check if all positions are the same (clustered)
        // This indicates semantic clustering may have failed
        let isClustered = false;
        if (i === 0 && words.length > 1) {
          // Check if first few words all have the same position
          const firstPos = JSON.stringify(words[0].position);
          const sameCount = words.slice(0, Math.min(10, words.length))
            .filter(w => JSON.stringify(w.position) === firstPos).length;
          if (sameCount >= 5) {
            console.log(`⚠️  WARNING: ${sameCount} words have the same position! Forcing recalculation...`);
            isClustered = true;
          }
        }

        if (!isInvalid && !isClustered) {
          console.log(`[${i + 1}/${words.length}] "${word.label}" - Position OK, skipping`);
          skipped++;
          continue;
        }
        
        if (isClustered && i === 0) {
          console.log('Forcing recalculation of all positions due to clustering...\n');
        }

        // Calculate new position using hybrid projection
        const newPosition = projectTo3DSelected(word.embedding, word.label, 5000);

        // Update the word
        await WordNode.findByIdAndUpdate(word._id, {
          position: newPosition,
        });

        console.log(`[${i + 1}/${words.length}] ✓ Fixed "${word.label}" to [${newPosition.map(p => p.toFixed(2)).join(', ')}]`);
        updated++;
      } catch (error) {
        console.error(`[${i + 1}/${words.length}] ✗ Error updating "${word.label}":`, error.message);
        errors++;
      }
    }

    console.log('\n=== Fix Complete ===');
    console.log(`Updated: ${updated}`);
    console.log(`Skipped: ${skipped}`);
    console.log(`Errors: ${errors}`);
    console.log(`Total: ${words.length}`);

    process.exit(0);
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

fixPositions();

