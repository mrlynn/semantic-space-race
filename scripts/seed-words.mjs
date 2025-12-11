/**
 * Seed script to populate the database with words, embeddings, and 3D positions
 * 
 * Usage: node scripts/seed-words.mjs
 * 
 * Make sure you have:
 * - MONGODB_URI in your .env.local
 * - OPENAI_API_KEY in your .env.local
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import connectDB from '../lib/mongodb.js';
import WordNode from '../models/WordNode.js';
import { generateEmbedding } from '../lib/openai.js';
import { projectTo3DSelected } from './pca3d-improved.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local file
dotenv.config({ path: join(__dirname, '..', '.env.local') });

// Expanded word list - tech/computer science related words (200+ words)
const wordList = [
  // Database concepts
  'database', 'query', 'index', 'collection', 'document', 'field', 'schema',
  'aggregation', 'transaction', 'replica', 'shard', 'cluster', 'node',
  'cursor', 'projection', 'filter', 'sort', 'limit', 'skip', 'lookup',
  'pipeline', 'operator', 'expression', 'aggregate', 'find', 'insert',
  'update', 'delete', 'upsert', 'atomic', 'consistency', 'isolation',
  
  // Programming concepts
  'function', 'variable', 'array', 'object', 'class', 'method', 'parameter',
  'algorithm', 'data structure', 'loop', 'recursion', 'iteration',
  'closure', 'callback', 'promise', 'async', 'await', 'generator',
  'iterator', 'stream', 'buffer', 'queue', 'stack', 'heap', 'tree',
  'graph', 'hash', 'map', 'set', 'tuple', 'enum', 'interface', 'type',
  
  // Web development
  'server', 'client', 'request', 'response', 'api', 'endpoint', 'route',
  'middleware', 'authentication', 'authorization', 'session', 'cookie',
  'token', 'jwt', 'oauth', 'rest', 'graphql', 'websocket', 'http', 'https',
  'cors', 'csrf', 'xss', 'sql injection', 'headers', 'body', 'query',
  'path', 'params', 'status code', 'redirect', 'cache', 'etag',
  
  // Software engineering
  'repository', 'commit', 'branch', 'merge', 'deployment', 'testing',
  'debugging', 'refactoring', 'optimization', 'scalability', 'performance',
  'git', 'version control', 'ci', 'cd', 'devops', 'monitoring', 'logging',
  'error handling', 'exception', 'try catch', 'unit test', 'integration',
  'code review', 'pull request', 'issue', 'milestone', 'sprint', 'agile',
  
  // Data science & AI
  'vector', 'embedding', 'similarity', 'clustering', 'classification',
  'regression', 'neural network', 'machine learning', 'artificial intelligence',
  'deep learning', 'tensor', 'gradient', 'backpropagation', 'epoch',
  'batch', 'model', 'training', 'inference', 'feature', 'label', 'dataset',
  'overfitting', 'underfitting', 'validation', 'cross validation',
  
  // Cloud & infrastructure
  'container', 'orchestration', 'microservice', 'load balancer', 'cache',
  'message queue', 'event stream', 'serverless', 'function as a service',
  'kubernetes', 'docker', 'virtual machine', 'instance', 'region', 'zone',
  'availability', 'reliability', 'fault tolerance', 'disaster recovery',
  'backup', 'snapshot', 'replication', 'synchronization',
  
  // General tech
  'protocol', 'interface', 'abstraction', 'encapsulation', 'polymorphism',
  'inheritance', 'composition', 'dependency', 'framework', 'library',
  'package', 'module', 'namespace', 'scope', 'context', 'state', 'props',
  'event', 'listener', 'handler', 'trigger', 'emit', 'subscribe', 'publish',
  
  // Additional tech terms
  'compiler', 'interpreter', 'runtime', 'virtual machine', 'bytecode',
  'assembly', 'binary', 'hexadecimal', 'encoding', 'decoding', 'serialization',
  'deserialization', 'marshalling', 'unmarshalling', 'parsing', 'lexing',
  'tokenization', 'syntax', 'semantics', 'grammar', 'ast', 'compilation',
  
  // System concepts
  'operating system', 'kernel', 'process', 'thread', 'memory', 'cpu',
  'disk', 'network', 'socket', 'port', 'ip address', 'dns', 'tcp', 'udp',
  'firewall', 'proxy', 'gateway', 'router', 'switch', 'bandwidth', 'latency',
  
  // Security
  'encryption', 'decryption', 'hash', 'salt', 'key', 'certificate', 'ssl',
  'tls', 'vpn', 'ssh', 'public key', 'private key', 'symmetric', 'asymmetric',
  'authentication', 'authorization', 'permission', 'role', 'access control',
  
  // Data formats
  'json', 'xml', 'yaml', 'csv', 'tsv', 'html', 'css', 'javascript', 'typescript',
  'python', 'java', 'c++', 'c#', 'go', 'rust', 'ruby', 'php', 'swift', 'kotlin',
];

// Projection function is now imported from pca3d.js

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

        // Calculate 3D position using hybrid projection (embedding + hash)
        // Uses MASSIVE scale (5000) with sigmoid amplification for proper spread
        // Pass word label for hash-based additional spread
        const position = projectTo3DSelected(embedding, word, 5000);

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

