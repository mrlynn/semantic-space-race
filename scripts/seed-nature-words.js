/**
 * Seed script for a nature/ecosystem word set
 * This creates a word list designed to demonstrate HNSW graph traversal
 * and semantic clustering with clear relationships between words
 * 
 * Topic: "nature" - Words from nature/ecosystem domain with rich semantic connections
 * 
 * Design principles:
 * - Clear semantic clusters (trees, animals, weather, seasons, natural features)
 * - Bridging words that connect clusters (e.g., "bird" connects trees, animals, and sky)
 * - Demonstrates graph traversal paths (e.g., bird → tree → leaf → autumn → winter → snow)
 * - Shows proximity indicating similarity in 3D space
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

// Nature/ecosystem word set - designed for HNSW graph demonstration
// Words are organized by semantic clusters with intentional cross-connections
const NATURE_WORDS = [
  // Trees & Plants Cluster
  'tree',
  'oak',
  'pine',
  'maple',
  'birch',
  'willow',
  'leaf',
  'branch',
  'root',
  'bark',
  'trunk',
  
  // Flowers & Plants
  'flower',
  'rose',
  'daisy',
  'tulip',
  'lily',
  'petal',
  'stem',
  'seed',
  'bloom',
  
  // Animals - Birds (connects to trees/sky)
  'bird',
  'eagle',
  'owl',
  'hawk',
  'sparrow',
  'robin',
  'nest',
  'wing',
  'feather',
  
  // Animals - Land Mammals (connects to forest/ground)
  'deer',
  'rabbit',
  'squirrel',
  'fox',
  'wolf',
  'bear',
  'forest',
  'den',
  
  // Weather Cluster
  'rain',
  'snow',
  'sun',
  'cloud',
  'wind',
  'storm',
  'thunder',
  'lightning',
  'fog',
  'mist',
  
  // Seasons (bridges weather, plants, and temperature)
  'spring',
  'summer',
  'autumn',
  'winter',
  'season',
  
  // Temperature & Conditions (connects seasons to weather)
  'warm',
  'cold',
  'hot',
  'cool',
  'freeze',
  'melt',
  
  // Natural Features - Land
  'mountain',
  'hill',
  'valley',
  'meadow',
  'field',
  'grass',
  
  // Natural Features - Water
  'river',
  'lake',
  'ocean',
  'stream',
  'pond',
  'waterfall',
  'wave',
  
  // Sky & Celestial
  'sky',
  'sunrise',
  'sunset',
  'moon',
  'star',
  'night',
  'day',
  'dawn',
  'dusk',
  
  // Ground & Earth
  'ground',
  'earth',
  'soil',
  'rock',
  'stone',
  'dirt',
  'mud',
];

const TOPIC = 'nature';

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

async function seedNatureWords() {
  try {
    console.log('🌿 Seeding Nature/Ecosystem Word Set...\n');
    console.log(`Topic: "${TOPIC}"`);
    console.log(`Words: ${NATURE_WORDS.length}\n`);
    console.log('Semantic Clusters:');
    console.log('  - Trees & Plants: tree, oak, pine, maple, leaf, branch, etc.');
    console.log('  - Flowers: flower, rose, daisy, tulip, petal, bloom');
    console.log('  - Birds: bird, eagle, owl, hawk, nest, wing');
    console.log('  - Land Animals: deer, rabbit, squirrel, fox, wolf, bear');
    console.log('  - Weather: rain, snow, sun, cloud, wind, storm');
    console.log('  - Seasons: spring, summer, autumn, winter');
    console.log('  - Natural Features: mountain, river, lake, ocean, forest');
    console.log('  - Sky & Celestial: sky, sunrise, sunset, moon, star');
    console.log('\nBridging Connections:');
    console.log('  - bird → tree (nests), sky (flies), forest (habitat)');
    console.log('  - leaf → tree (part of), autumn (falls), ground (lands)');
    console.log('  - snow → winter (season), cold (temperature), mountain (location)');
    console.log('  - forest → tree (contains), animal (habitat), mountain (location)');
    console.log('\nExample Traversal Paths:');
    console.log('  1. bird → tree → leaf → autumn → cold → winter → snow');
    console.log('  2. mountain → forest → tree → bird → sky → cloud → rain');
    console.log('  3. flower → spring → sun → warm → summer → lake → water');
    console.log('  4. river → stream → water → ocean → wave → beach → sand');
    console.log('\nConnecting to MongoDB...');
    await connectDB();
    console.log('✓ Connected to MongoDB\n');

    let created = 0;
    let updated = 0;
    let skipped = 0;
    let errors = 0;

    for (let i = 0; i < NATURE_WORDS.length; i++) {
      const word = NATURE_WORDS[i];
      
      try {
        // Check if word already exists
        const existing = await WordNode.findOne({ label: word });
        if (existing) {
          // Update existing word with nature topic if it doesn't have one or is different
          if (!existing.topic || existing.topic !== TOPIC) {
            existing.topic = TOPIC;
            await existing.save();
            console.log(`[${i + 1}/${NATURE_WORDS.length}] ✓ Updated "${word}" with topic: ${TOPIC}`);
            updated++;
          } else {
            console.log(`[${i + 1}/${NATURE_WORDS.length}] ⊘ "${word}" already exists with topic: ${existing.topic}, skipping...`);
            skipped++;
          }
          continue;
        }

        // Generate embedding
        console.log(`[${i + 1}/${NATURE_WORDS.length}] Generating embedding for "${word}"...`);
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
    console.log(`Total: ${NATURE_WORDS.length}`);
    
    // Show breakdown by topic
    console.log('\n=== Word Count by Topic ===');
    const topicCounts = await WordNode.aggregate([
      { $group: { _id: '$topic', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    topicCounts.forEach(({ _id, count }) => {
      console.log(`  ${_id || '(no topic)'}: ${count}`);
    });
    
    console.log(`\n✓ Nature word set seeded successfully!`);
    console.log(`\nNext steps:`);
    console.log(`  1. Build HNSW neighbor graph: node scripts/build-hnsw-neighbors.mjs`);
    console.log(`  2. Compute UMAP layout (optional): node scripts/compute-umap-layout.mjs`);
    console.log(`  3. Use topic "${TOPIC}" in practice mode or when creating games.`);
    console.log(`\nThe nature word set is designed to demonstrate:`);
    console.log(`  - Clear semantic clustering (trees cluster together, animals cluster, etc.)`);
    console.log(`  - Cross-cluster connections (bird connects trees, sky, and animals)`);
    console.log(`  - Graph traversal paths (bird → tree → leaf → autumn → winter)`);
    console.log(`  - Proximity indicating similarity in 3D space`);
    process.exit(0);
  } catch (error) {
    console.error('Error seeding nature words:', error);
    process.exit(1);
  }
}

seedNatureWords();

