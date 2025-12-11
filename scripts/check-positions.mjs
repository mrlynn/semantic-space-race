/**
 * Check position values to see if they're clustered
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import connectDB from '../lib/mongodb.js';
import WordNode from '../models/WordNode.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.local') });

async function checkPositions() {
  try {
    await connectDB();
    
    const words = await WordNode.find({}).select('label position').lean();
    
    console.log(`Checking ${words.length} words...\n`);
    
    // Get unique positions
    const positions = words.map(w => w.position);
    const uniquePositions = new Set(positions.map(p => JSON.stringify(p)));
    
    console.log(`Unique positions: ${uniquePositions.size} out of ${words.length} words`);
    
    if (uniquePositions.size < 10) {
      console.log('\n⚠️  WARNING: Most words have the same position!');
      console.log('Sample positions:');
      Array.from(uniquePositions).slice(0, 5).forEach(pos => {
        const p = JSON.parse(pos);
        const count = positions.filter(p2 => JSON.stringify(p2) === pos).length;
        console.log(`  ${JSON.stringify(p)} - ${count} words`);
      });
    }
    
    // Calculate statistics
    const xs = positions.map(p => p[0]);
    const ys = positions.map(p => p[1]);
    const zs = positions.map(p => p[2]);
    
    console.log('\n=== Position Statistics ===');
    console.log(`X: min=${Math.min(...xs).toFixed(2)}, max=${Math.max(...xs).toFixed(2)}, range=${(Math.max(...xs) - Math.min(...xs)).toFixed(2)}`);
    console.log(`Y: min=${Math.min(...ys).toFixed(2)}, max=${Math.max(...ys).toFixed(2)}, range=${(Math.max(...ys) - Math.min(...ys)).toFixed(2)}`);
    console.log(`Z: min=${Math.min(...zs).toFixed(2)}, max=${Math.max(...zs).toFixed(2)}, range=${(Math.max(...zs) - Math.min(...zs)).toFixed(2)}`);
    
    // Show sample words
    console.log('\n=== Sample Words ===');
    words.slice(0, 10).forEach(w => {
      console.log(`  ${w.label}: [${w.position.map(p => p.toFixed(2)).join(', ')}]`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkPositions();

