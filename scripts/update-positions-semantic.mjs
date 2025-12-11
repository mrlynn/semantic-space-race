/**
 * Update word positions using semantic clustering
 * This will group semantically similar words together in 3D space
 * 
 * Usage: node scripts/update-positions-semantic.mjs
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import connectDB from '../lib/mongodb.js';
import WordNode from '../models/WordNode.js';
import { projectAllTo3DSemantic } from './semantic-clustering.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local file
dotenv.config({ path: join(__dirname, '..', '.env.local') });

async function updatePositionsSemantic() {
  try {
    console.log('Connecting to MongoDB...');
    await connectDB();
    console.log('✓ Connected to MongoDB\n');

    // Load all words with embeddings
    console.log('Loading all words from database...');
    const words = await WordNode.find({})
      .select('_id label position embedding')
      .lean();
    
    if (words.length === 0) {
      console.log('No words found in database. Please seed the database first.');
      process.exit(1);
    }

    console.log(`Loaded ${words.length} words\n`);

    // Verify all words have embeddings
    const wordsWithEmbeddings = words.filter(w => 
      w.embedding && Array.isArray(w.embedding) && w.embedding.length > 0
    );

    if (wordsWithEmbeddings.length !== words.length) {
      console.warn(`Warning: ${words.length - wordsWithEmbeddings.length} words are missing embeddings`);
    }

    if (wordsWithEmbeddings.length === 0) {
      console.error('No words with embeddings found. Cannot calculate semantic positions.');
      process.exit(1);
    }

    console.log(`Calculating semantic positions for ${wordsWithEmbeddings.length} words...`);
    console.log('This may take a few minutes for large datasets...\n');

    // Extract embeddings and labels
    const embeddings = wordsWithEmbeddings.map(w => w.embedding);
    const labels = wordsWithEmbeddings.map(w => w.label);

    // Calculate semantic positions
    const scale = 5000; // Large scale for good navigation
    const positions = projectAllTo3DSemantic(embeddings, labels, scale);

    console.log(`✓ Calculated ${positions.length} positions\n`);

    // Update positions in database
    console.log('Updating positions in database...');
    let updated = 0;
    let errors = 0;

    for (let i = 0; i < wordsWithEmbeddings.length; i++) {
      const word = wordsWithEmbeddings[i];
      const position = positions[i];

      try {
        await WordNode.updateOne(
          { _id: word._id },
          { $set: { position } }
        );
        updated++;
        
        if ((i + 1) % 10 === 0) {
          console.log(`  Updated ${i + 1}/${wordsWithEmbeddings.length} words...`);
        }
      } catch (error) {
        console.error(`  ✗ Error updating "${word.label}":`, error.message);
        errors++;
      }
    }

    console.log('\n=== Update Complete ===');
    console.log(`Updated: ${updated}`);
    console.log(`Errors: ${errors}`);
    console.log(`Total: ${wordsWithEmbeddings.length}`);

    // Show position statistics
    const allPositions = positions.flat();
    const minX = Math.min(...positions.map(p => p[0]));
    const maxX = Math.max(...positions.map(p => p[0]));
    const minY = Math.min(...positions.map(p => p[1]));
    const maxY = Math.max(...positions.map(p => p[1]));
    const minZ = Math.min(...positions.map(p => p[2]));
    const maxZ = Math.max(...positions.map(p => p[2]));

    console.log('\n=== Position Statistics ===');
    console.log(`X range: [${minX.toFixed(2)}, ${maxX.toFixed(2)}]`);
    console.log(`Y range: [${minY.toFixed(2)}, ${maxY.toFixed(2)}]`);
    console.log(`Z range: [${minZ.toFixed(2)}, ${maxZ.toFixed(2)}]`);
    console.log(`Scale: ${scale}`);

    process.exit(0);
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

updatePositionsSemantic();

