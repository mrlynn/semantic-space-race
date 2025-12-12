/**
 * Restore Original Positions Script
 * 
 * This script regenerates word positions using the original projection method
 * (projectTo3DSelected from pca3d-improved.js) to restore positions to their
 * working state before UMAP modifications.
 * 
 * Usage: node scripts/restore-original-positions.mjs
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

async function restorePositions() {
  try {
    console.log('Connecting to MongoDB...');
    await connectDB();
    console.log('✓ Connected to MongoDB\n');

    // Get all words with embeddings
    const words = await WordNode.find({ 
      embedding: { $exists: true, $ne: null }
    }).select('_id label embedding position').lean();
    
    console.log(`Found ${words.length} words to restore\n`);

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

    let updated = 0;
    let errors = 0;

    console.log('Restoring positions using original projection method...\n');

    for (let i = 0; i < validWords.length; i++) {
      const word = validWords[i];
      
      try {
        // Calculate position using original method
        // Uses hybrid projection (embedding + hash) with scale 5000
        const newPosition = projectTo3DSelected(word.embedding, word.label, 5000);

        // Update the word
        await WordNode.updateOne(
          { _id: word._id },
          { $set: { position: newPosition } }
        );

        if ((i + 1) % 50 === 0 || i < 5) {
          console.log(`[${i + 1}/${validWords.length}] ✓ "${word.label}" → [${newPosition.map(p => p.toFixed(2)).join(', ')}]`);
        }
        updated++;
      } catch (error) {
        console.error(`[${i + 1}/${validWords.length}] ✗ Error restoring "${word.label}":`, error.message);
        errors++;
      }
    }

    console.log('\n=== Restoration Complete ===');
    console.log(`Updated: ${updated}`);
    console.log(`Errors: ${errors}`);
    console.log(`Total: ${validWords.length}`);

    // Show position statistics
    const updatedWords = await WordNode.find({ 
      _id: { $in: validWords.map(w => w._id) }
    }).select('position').lean();
    
    const positions = updatedWords.map(w => w.position);
    const xs = positions.map(p => p[0]);
    const ys = positions.map(p => p[1]);
    const zs = positions.map(p => p[2]);

    console.log('\n=== Position Statistics ===');
    console.log(`X range: [${Math.min(...xs).toFixed(2)}, ${Math.max(...xs).toFixed(2)}] (span: ${(Math.max(...xs) - Math.min(...xs)).toFixed(2)})`);
    console.log(`Y range: [${Math.min(...ys).toFixed(2)}, ${Math.max(...ys).toFixed(2)}] (span: ${(Math.max(...ys) - Math.min(...ys)).toFixed(2)})`);
    console.log(`Z range: [${Math.min(...zs).toFixed(2)}, ${Math.max(...zs).toFixed(2)}] (span: ${(Math.max(...zs) - Math.min(...zs)).toFixed(2)})`);

    console.log('\n✅ Positions restored! The visualization should now work correctly.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

restorePositions();
