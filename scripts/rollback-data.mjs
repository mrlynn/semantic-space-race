/**
 * Data Rollback Script
 * 
 * This script helps you revert database changes made by HNSW visualization scripts.
 * 
 * Usage: node scripts/rollback-data.mjs [--check-only] [--remove-neighbors] [--reset-positions]
 * 
 * Options:
 *   --check-only        Only check what data exists, don't modify anything
 *   --remove-neighbors  Remove neighbors and layer fields
 *   --reset-positions  Reset all positions to [0, 0, 0] (use with caution!)
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import connectDB from '../lib/mongodb.js';
import WordNode from '../models/WordNode.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local file
dotenv.config({ path: join(__dirname, '..', '.env.local') });

async function checkData() {
  try {
    await connectDB();
    console.log('✓ Connected to MongoDB\n');

    const totalWords = await WordNode.countDocuments({});
    console.log(`Total words in database: ${totalWords}\n`);

    // Check for HNSW fields
    const wordsWithNeighbors = await WordNode.countDocuments({ 
      neighbors: { $exists: true, $ne: [] } 
    });
    const wordsWithLayer = await WordNode.countDocuments({ 
      layer: { $exists: true } 
    });

    console.log('📊 Data Check Results:');
    console.log(`  Words with neighbors field: ${wordsWithNeighbors}`);
    console.log(`  Words with layer field: ${wordsWithLayer}`);

    // Check position distribution
    const sampleWords = await WordNode.find({})
      .select('label position')
      .limit(10)
      .lean();
    
    const zeroPositions = sampleWords.filter(w => 
      w.position && w.position.every(p => p === 0)
    ).length;
    
    const nonZeroPositions = sampleWords.filter(w => 
      w.position && w.position.some(p => p !== 0)
    ).length;

    console.log(`\n  Position check (sample of 10):`);
    console.log(`    Zero positions [0,0,0]: ${zeroPositions}`);
    console.log(`    Non-zero positions: ${nonZeroPositions}`);

    if (sampleWords.length > 0) {
      console.log(`\n  Sample positions:`);
      sampleWords.slice(0, 3).forEach(w => {
        console.log(`    ${w.label}: [${w.position?.map(p => p.toFixed(2)).join(', ')}]`);
      });
    }

    // Check a word with neighbors if they exist
    if (wordsWithNeighbors > 0) {
      const wordWithNeighbors = await WordNode.findOne({ 
        neighbors: { $exists: true, $ne: [] } 
      }).select('label neighbors layer').lean();
      
      console.log(`\n  Sample word with neighbors:`);
      console.log(`    Label: ${wordWithNeighbors.label}`);
      console.log(`    Neighbors count: ${wordWithNeighbors.neighbors?.length || 0}`);
      console.log(`    Layer: ${wordWithNeighbors.layer ?? 'not set'}`);
    }

    return {
      totalWords,
      wordsWithNeighbors,
      wordsWithLayer,
      hasNonZeroPositions: nonZeroPositions > 0
    };
  } catch (error) {
    console.error('❌ Error checking data:', error);
    throw error;
  }
}

async function removeHNSWFields() {
  try {
    console.log('\n🗑️  Removing HNSW fields (neighbors, layer)...');
    
    const result = await WordNode.updateMany(
      {},
      { 
        $unset: { 
          neighbors: "", 
          layer: "" 
        } 
      }
    );
    
    console.log(`✓ Removed neighbors/layer from ${result.modifiedCount} documents`);
    return result.modifiedCount;
  } catch (error) {
    console.error('❌ Error removing HNSW fields:', error);
    throw error;
  }
}

async function resetPositions() {
  try {
    console.log('\n⚠️  Resetting all positions to [0, 0, 0]...');
    console.log('   This will affect visualization - are you sure?');
    
    const result = await WordNode.updateMany(
      {},
      { 
        $set: { 
          position: [0, 0, 0]
        } 
      }
    );
    
    console.log(`✓ Reset positions for ${result.modifiedCount} documents`);
    return result.modifiedCount;
  } catch (error) {
    console.error('❌ Error resetting positions:', error);
    throw error;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const checkOnly = args.includes('--check-only');
  const removeNeighbors = args.includes('--remove-neighbors');
  const resetPositionsFlag = args.includes('--reset-positions');

  try {
    const dataCheck = await checkData();

    if (checkOnly) {
      console.log('\n✅ Check complete. No changes made.');
      console.log('\nTo remove HNSW fields, run: node scripts/rollback-data.mjs --remove-neighbors');
      console.log('To reset positions, run: node scripts/rollback-data.mjs --reset-positions');
      process.exit(0);
    }

    if (removeNeighbors) {
      if (dataCheck.wordsWithNeighbors === 0 && dataCheck.wordsWithLayer === 0) {
        console.log('\n✓ No HNSW fields found - nothing to remove');
      } else {
        await removeHNSWFields();
      }
    }

    if (resetPositionsFlag) {
      await resetPositions();
    }

    if (!removeNeighbors && !resetPositionsFlag) {
    console.log('\n💡 Usage:');
    console.log('  Check only:        node scripts/rollback-data.mjs --check-only');
    console.log('  Remove HNSW:       node scripts/rollback-data.mjs --remove-neighbors');
    console.log('  Reset positions:   node scripts/rollback-data.mjs --reset-positions');
    console.log('  Both:               node scripts/rollback-data.mjs --remove-neighbors --reset-positions');
    console.log('\n💡 To restore original positions (recommended):');
    console.log('  node scripts/restore-original-positions.mjs');
    } else {
      console.log('\n✅ Rollback complete!');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Rollback failed:', error);
    process.exit(1);
  }
}

main();
