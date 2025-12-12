/**
 * Seed script for a simple demo word set
 * This creates a small, intentionally limited word list to demonstrate
 * HNSW vector search and semantic positioning
 * 
 * Topic: "demo" - Simple words that clearly show semantic relationships
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local file
dotenv.config({ path: join(__dirname, '..', '.env.local') });

import connectDB from '../lib/mongodb.js';
import WordNode from '../models/WordNode.js';
import { generateEmbedding } from '../lib/openai.js';

// Simple demo word set - intentionally small and clear semantic clusters
// These words are chosen to demonstrate semantic proximity clearly
const DEMO_WORDS = [
  // Animals (mammals)
  'cat',
  'dog',
  'rabbit',
  'mouse',
  'horse',
  
  // Animals (birds)
  'bird',
  'eagle',
  'owl',
  'chicken',
  'duck',
  
  // Animals (water)
  'fish',
  'whale',
  'shark',
  'dolphin',
  
  // Colors
  'red',
  'blue',
  'green',
  'yellow',
  'orange',
  'purple',
  
  // Food (fruits)
  'apple',
  'banana',
  'orange',
  'grape',
  'strawberry',
  
  // Food (vegetables)
  'carrot',
  'tomato',
  'potato',
  'lettuce',
  
  // Transportation
  'car',
  'bike',
  'plane',
  'train',
  'boat',
  
  // Weather
  'rain',
  'snow',
  'sun',
  'cloud',
  'wind',
  
  // Body parts
  'hand',
  'foot',
  'eye',
  'ear',
  'nose',
];

const TOPIC = 'demo';

// Project embedding to 3D position using PCA-like projection
function projectTo3DAdvanced(embedding) {
  // Simple PCA-like projection: use first 3 dimensions scaled
  // This creates a 3D space where semantically similar words are close together
  const scale = 1000; // Scale factor for visualization
  
  // Use first 3 principal components (simplified - in production you'd use actual PCA)
  const x = embedding[0] * scale;
  const y = embedding[1] * scale;
  const z = embedding[2] * scale;
  
  return [x, y, z];
}

async function seedDemoWords() {
  try {
    console.log('🌱 Seeding Demo Word Set...\n');
    console.log(`Topic: "${TOPIC}"`);
    console.log(`Words: ${DEMO_WORDS.length}\n`);
    console.log('Connecting to MongoDB...');
    await connectDB();
    console.log('✓ Connected to MongoDB\n');

    let created = 0;
    let updated = 0;
    let skipped = 0;
    let errors = 0;

    for (let i = 0; i < DEMO_WORDS.length; i++) {
      const word = DEMO_WORDS[i];
      
      try {
        // Check if word already exists
        const existing = await WordNode.findOne({ label: word });
        if (existing) {
          // Update existing word with demo topic if it doesn't have one or is different
          if (!existing.topic || existing.topic !== TOPIC) {
            existing.topic = TOPIC;
            await existing.save();
            console.log(`[${i + 1}/${DEMO_WORDS.length}] ✓ Updated "${word}" with topic: ${TOPIC}`);
            updated++;
          } else {
            console.log(`[${i + 1}/${DEMO_WORDS.length}] ⊘ "${word}" already exists with topic: ${existing.topic}, skipping...`);
            skipped++;
          }
          continue;
        }

        // Generate embedding
        console.log(`[${i + 1}/${DEMO_WORDS.length}] Generating embedding for "${word}"...`);
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
          topic: TOPIC,
        });

        await wordNode.save();
        console.log(`  ✓ Created: "${word}" (${TOPIC}) at position [${position.map(p => p.toFixed(2)).join(', ')}]`);
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
    console.log(`Updated: ${updated}`);
    console.log(`Skipped: ${skipped}`);
    console.log(`Errors: ${errors}`);
    console.log(`Total: ${DEMO_WORDS.length}`);
    
    // Show breakdown by topic
    console.log('\n=== Word Count by Topic ===');
    const topicCounts = await WordNode.aggregate([
      { $group: { _id: '$topic', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    topicCounts.forEach(({ _id, count }) => {
      console.log(`  ${_id || '(no topic)'}: ${count}`);
    });
    
    console.log(`\n✓ Demo word set seeded successfully!`);
    console.log(`\nYou can now use topic "${TOPIC}" in practice mode or when creating games.`);
    process.exit(0);
  } catch (error) {
    console.error('Error seeding demo words:', error);
    process.exit(1);
  }
}

seedDemoWords();

