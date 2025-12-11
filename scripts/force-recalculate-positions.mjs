/**
 * Force recalculate ALL positions - useful when positions are clustered
 * 
 * Usage: node scripts/force-recalculate-positions.mjs
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import connectDB from '../lib/mongodb.js';
import WordNode from '../models/WordNode.js';
import { projectTo3DSelected } from './pca3d-improved.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.local') });

async function forceRecalculate() {
  try {
    console.log('Connecting to MongoDB...');
    await connectDB();
    console.log('✓ Connected to MongoDB\n');

    const words = await WordNode.find({}).select('_id label embedding position');
    console.log(`Found ${words.length} words - FORCING recalculation of ALL positions\n`);

    let updated = 0;
    let errors = 0;

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      
      try {
        if (!word.embedding || word.embedding.length !== 1536) {
          console.log(`[${i + 1}/${words.length}] "${word.label}" - Skipping (invalid embedding)`);
          continue;
        }

        // ALWAYS recalculate position
        const newPosition = projectTo3DSelected(word.embedding, word.label, 5000);

        await WordNode.findByIdAndUpdate(word._id, {
          position: newPosition,
        });

        if ((i + 1) % 50 === 0 || i < 5) {
          console.log(`[${i + 1}/${words.length}] ✓ "${word.label}" → [${newPosition.map(p => p.toFixed(2)).join(', ')}]`);
        }
        updated++;
      } catch (error) {
        console.error(`[${i + 1}/${words.length}] ✗ Error updating "${word.label}":`, error.message);
        errors++;
      }
    }

    console.log('\n=== Recalculation Complete ===');
    console.log(`Updated: ${updated}`);
    console.log(`Errors: ${errors}`);
    console.log(`Total: ${words.length}`);

    // Show statistics
    const updatedWords = await WordNode.find({}).select('position').lean();
    const positions = updatedWords.map(w => w.position);
    const xs = positions.map(p => p[0]);
    const ys = positions.map(p => p[1]);
    const zs = positions.map(p => p[2]);

    console.log('\n=== New Position Statistics ===');
    console.log(`X range: [${Math.min(...xs).toFixed(2)}, ${Math.max(...xs).toFixed(2)}] (span: ${(Math.max(...xs) - Math.min(...xs)).toFixed(2)})`);
    console.log(`Y range: [${Math.min(...ys).toFixed(2)}, ${Math.max(...ys).toFixed(2)}] (span: ${(Math.max(...ys) - Math.min(...ys)).toFixed(2)})`);
    console.log(`Z range: [${Math.min(...zs).toFixed(2)}, ${Math.max(...zs).toFixed(2)}] (span: ${(Math.max(...zs) - Math.min(...zs)).toFixed(2)})`);

    process.exit(0);
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

forceRecalculate();

