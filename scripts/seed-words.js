/**
 * Seed script to populate the database with words, embeddings, and 3D positions
 * 
 * Usage: node scripts/seed-words.js
 * 
 * Make sure you have:
 * - MONGODB_URI in your .env.local
 * - OPENAI_API_KEY in your .env.local
 */

// Load environment variables
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local file
dotenv.config({ path: join(__dirname, '..', '.env.local') });

import connectDB from '../lib/mongodb.js';
import WordNode from '../models/WordNode.js';
import { generateEmbedding } from '../lib/openai.js';

// Expanded word list - tech/computer science related words
const wordList = [
  // Database concepts
  'database', 'query', 'index', 'collection', 'document', 'field', 'schema',
  'aggregation', 'transaction', 'replica', 'shard', 'cluster', 'node',
  
  // Programming concepts
  'function', 'variable', 'array', 'object', 'class', 'method', 'parameter',
  'algorithm', 'data structure', 'loop', 'recursion', 'iteration',
  
  // Web development
  'server', 'client', 'request', 'response', 'api', 'endpoint', 'route',
  'middleware', 'authentication', 'authorization', 'session', 'cookie',
  
  // Software engineering
  'repository', 'commit', 'branch', 'merge', 'deployment', 'testing',
  'debugging', 'refactoring', 'optimization', 'scalability', 'performance',
  
  // Data science
  'vector', 'embedding', 'similarity', 'clustering', 'classification',
  'regression', 'neural network', 'machine learning', 'artificial intelligence',
  
  // Cloud & infrastructure
  'container', 'orchestration', 'microservice', 'load balancer', 'cache',
  'message queue', 'event stream', 'serverless', 'function as a service',
  
  // General tech
  'protocol', 'interface', 'abstraction', 'encapsulation', 'polymorphism',
  'inheritance', 'composition', 'dependency', 'framework', 'library',
];

/**
 * Simple PCA-like projection to 3D
 * Takes first 3 dimensions of embedding as x, y, z
 * Then scales to a reasonable range
 */
function projectTo3D(embedding) {
  // Use first 3 dimensions and scale them
  const scale = 5; // Adjust this to control the spread of nodes
  return [
    embedding[0] * scale,
    embedding[1] * scale,
    embedding[2] * scale,
  ];
}

/**
 * Better 3D projection using PCA approximation
 * Uses multiple dimensions weighted by variance
 */
function projectTo3DAdvanced(embedding) {
  const scale = 5;
  // Use weighted combination of dimensions
  const x = embedding.slice(0, 512).reduce((sum, val, i) => sum + val * Math.sin(i), 0) / 512;
  const y = embedding.slice(512, 1024).reduce((sum, val, i) => sum + val * Math.cos(i), 0) / 512;
  const z = embedding.slice(1024, 1536).reduce((sum, val, i) => sum + val * Math.sin(i * 2), 0) / 512;
  
  return [x * scale, y * scale, z * scale];
}

async function seedWords() {
  try {
    console.log('Connecting to MongoDB...');
    await connectDB();
    console.log('✓ Connected to MongoDB\n');

    let created = 0;
    let skipped = 0;
    let errors = 0;

    for (let i = 0; i < wordList.length; i++) {
      const word = wordList[i];
      
      try {
        // Check if word already exists
        const existing = await WordNode.findOne({ label: word });
        if (existing) {
          console.log(`[${i + 1}/${wordList.length}] "${word}" already exists, skipping...`);
          skipped++;
          continue;
        }

        // Generate embedding
        console.log(`[${i + 1}/${wordList.length}] Generating embedding for "${word}"...`);
        const embedding = await generateEmbedding(word);

        if (!embedding || embedding.length !== 1536) {
          console.error(`  ✗ Invalid embedding for "${word}"`);
          errors++;
          continue;
        }

        // Calculate 3D position using advanced projection
        const position = projectTo3DAdvanced(embedding);

        // Create word node
        const wordNode = new WordNode({
          label: word,
          position,
          embedding,
        });

        await wordNode.save();
        console.log(`  ✓ Created: "${word}" at position [${position.map(p => p.toFixed(2)).join(', ')}]`);
        created++;

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`  ✗ Error processing "${word}":`, error.message);
        errors++;
      }
    }

    console.log('\n=== Seeding Complete ===');
    console.log(`Created: ${created}`);
    console.log(`Skipped: ${skipped}`);
    console.log(`Errors: ${errors}`);
    console.log(`Total: ${wordList.length}`);

    // Verify the data
    const totalWords = await WordNode.countDocuments();
    console.log(`\nTotal words in database: ${totalWords}`);

    process.exit(0);
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

seedWords();

