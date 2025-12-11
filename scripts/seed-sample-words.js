/**
 * Sample script to seed the database with a few words
 * This is a helper script - you'll need to populate your database with actual word embeddings
 * 
 * To use this, you'll need to:
 * 1. Generate embeddings for words using OpenAI API
 * 2. Calculate 3D positions (PCA projection of embeddings)
 * 3. Insert into MongoDB
 * 
 * This is just a template - you'll need to implement the embedding generation
 * and position calculation based on your needs.
 */

import connectDB from '../lib/mongodb.js';
import WordNode from '../models/WordNode.js';
import { generateEmbedding } from '../lib/openai.js';

// Sample words to seed
const sampleWords = [
  'database',
  'query',
  'index',
  'collection',
  'document',
  'field',
  'schema',
  'aggregation',
  'transaction',
  'replica',
];

async function seedWords() {
  try {
    await connectDB();
    console.log('Connected to MongoDB');

    for (const word of sampleWords) {
      // Check if word already exists
      const existing = await WordNode.findOne({ label: word });
      if (existing) {
        console.log(`Word "${word}" already exists, skipping...`);
        continue;
      }

      // Generate embedding
      console.log(`Generating embedding for "${word}"...`);
      const embedding = await generateEmbedding(word);

      // Simple 3D position (you should use PCA for better visualization)
      // For now, using random positions
      const position = [
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10,
      ];

      // Create word node
      const wordNode = new WordNode({
        label: word,
        position,
        embedding,
      });

      await wordNode.save();
      console.log(`✓ Created word: ${word}`);
    }

    console.log('Seeding complete!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding words:', error);
    process.exit(1);
  }
}

seedWords();

