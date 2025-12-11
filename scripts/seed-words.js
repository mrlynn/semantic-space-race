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

// Topic definitions
const TOPICS = {
  'architecture-deployment': {
    name: 'Architecture and Deployment',
    words: [
      // Replica Sets
      'replica', 'replica set', 'primary', 'secondary', 'arbiter', 'replication',
      'replication lag', 'oplog', 'heartbeat', 'election', 'failover',
      'read preference', 'write concern', 'majority', 'wiredTiger',
      
      // Sharding
      'shard', 'sharding', 'shard key', 'chunk', 'chunk migration', 'balancer',
      'mongos', 'config server', 'shard cluster', 'sharding strategy',
      'hashed sharding', 'ranged sharding', 'zone sharding',
      
      // Cluster & Nodes
      'cluster', 'node', 'mongod', 'mongos', 'config server', 'standalone',
      'cluster topology', 'network partition', 'split brain',
      
      // Deployment & Scaling
      'deployment', 'scalability', 'horizontal scaling', 'vertical scaling',
      'load balancer', 'connection pooling', 'connection string',
      'high availability', 'fault tolerance', 'disaster recovery',
      'backup', 'restore', 'point in time recovery',
      
      // Infrastructure
      'container', 'docker', 'kubernetes', 'orchestration', 'microservice',
      'serverless', 'function as a service', 'infrastructure as code',
      'cloud', 'AWS', 'Azure', 'GCP', 'Atlas', 'managed service',
      'distributed system', 'CAP theorem', 'eventual consistency',
      
      // Performance & Monitoring
      'monitoring', 'profiling', 'slow queries', 'performance tuning',
      'resource utilization', 'CPU', 'memory', 'disk I/O', 'network latency',
    ],
  },
  'mongodb-query': {
    name: 'MongoDB Query',
    words: [
      // Query Methods
      'query', 'find', 'findOne', 'findOneAndUpdate', 'findOneAndReplace',
      'findOneAndDelete', 'countDocuments', 'estimatedDocumentCount',
      'distinct', 'exists',
      
      // Query Operators
      'filter', 'projection', 'sort', 'limit', 'skip', 'hint',
      'collation', 'maxTimeMS', 'batchSize',
      
      // Comparison Operators
      '$eq', '$ne', '$gt', '$gte', '$lt', '$lte', '$in', '$nin',
      'comparison operators', 'equality', 'inequality', 'range query',
      
      // Logical Operators
      '$and', '$or', '$nor', '$not', 'logical operators', 'boolean logic',
      
      // Element Operators
      '$exists', '$type', 'element operators',
      
      // Evaluation Operators
      '$expr', '$jsonSchema', '$mod', '$regex', '$text', '$where',
      'regex', 'regular expression', 'pattern matching', 'text search',
      'full text search', 'geospatial query', '$geoWithin', '$geoIntersects',
      '$near', '$nearSphere',
      
      // Array Operators
      '$all', '$elemMatch', '$size', 'array query', 'array element',
      
      // Update Operators
      '$set', '$unset', '$inc', '$mul', '$min', '$max', '$currentDate',
      '$rename', '$setOnInsert', 'update operators',
      
      // Query Optimization
      'query plan', 'query optimization', 'index hint', 'explain',
      'executionStats', 'queryPlanner', 'winning plan', 'rejected plans',
      'index usage', 'covered query', 'query performance',
      
      // Cursor Operations
      'cursor', 'cursor methods', 'hasNext', 'next', 'forEach', 'toArray',
      'cursor timeout', 'cursor batch',
    ],
  },
  'aggregation-commands': {
    name: 'Aggregation and Commands',
    words: [
      // Aggregation Basics
      'aggregation', 'aggregation pipeline', 'aggregate', 'pipeline',
      'pipeline stage', 'stage order', 'pipeline optimization',
      
      // Stage Operators - Input/Output
      '$match', '$group', '$project', '$sort', '$limit', '$skip',
      '$count', '$facet', '$bucket', '$bucketAuto', '$out', '$merge',
      '$unionWith', '$lookup', '$graphLookup',
      
      // Stage Operators - Transform
      '$unwind', '$addFields', '$set', '$replaceRoot', '$replaceWith',
      '$redact', '$sample', '$densify', '$fill',
      
      // Stage Operators - Array
      '$arrayElemAt', '$arrayToObject', '$concatArrays', '$filter',
      '$first', '$last', '$in', '$indexOfArray', '$isArray', '$map',
      '$objectToArray', '$range', '$reduce', '$reverseArray', '$size',
      '$slice', '$zip',
      
      // Accumulators
      '$sum', '$avg', '$min', '$max', '$first', '$last', '$push',
      '$addToSet', '$stdDevPop', '$stdDevSamp', 'accumulator',
      'group accumulator', 'window accumulator',
      
      // Expression Operators - Arithmetic
      '$add', '$subtract', '$multiply', '$divide', '$mod', '$abs',
      '$ceil', '$floor', '$round', '$sqrt', '$pow', '$exp', '$ln', '$log10',
      
      // Expression Operators - String
      '$concat', '$substr', '$toLower', '$toUpper', '$strLenCP',
      '$substrCP', '$indexOfBytes', '$indexOfCP', '$split', '$strcasecmp',
      
      // Expression Operators - Date
      '$dateFromString', '$dateToString', '$dayOfMonth', '$dayOfWeek',
      '$dayOfYear', '$isoDayOfWeek', '$isoWeek', '$isoWeekYear',
      '$year', '$month', '$week', '$hour', '$minute', '$second', '$millisecond',
      
      // Expression Operators - Conditional
      '$cond', '$ifNull', '$switch', 'conditional expression',
      
      // Expression Operators - Type
      '$type', '$convert', '$toBool', '$toDate', '$toDecimal', '$toDouble',
      '$toInt', '$toLong', '$toObjectId', '$toString',
      
      // Other Commands
      'mapReduce', 'map reduce', 'distinct', 'group', 'eval',
      'runCommand', 'command', 'admin command',
    ],
  },
  'data-modeling': {
    name: 'Data Modeling',
    words: [
      // Core Concepts
      'schema', 'document', 'collection', 'field', 'embedded document',
      'subdocument', 'nested document', 'array', 'reference',
      
      // Relationships
      'relationship', 'one to one', 'one to many', 'many to many',
      'parent child', 'tree structure', 'graph structure',
      
      // Design Patterns
      'normalization', 'denormalization', 'schema design', 'data structure',
      'embedding', 'referencing', 'hybrid approach',
      
      // Patterns
      'polymorphic pattern', 'attribute pattern', 'bucket pattern',
      'computed pattern', 'document versioning', 'extended reference',
      'subset pattern', 'tree pattern', 'pre allocation', 'schema versioning',
      
      // Data Types
      'BSON', 'ObjectId', 'string', 'number', 'boolean', 'date', 'null',
      'array', 'object', 'binary', 'timestamp', 'decimal', 'long',
      
      // Validation
      'validation', 'schema validation', 'validator', 'validation rules',
      'required fields', 'field types', 'enum', 'min', 'max',
      
      // Indexing
      'index', 'index design', 'single field index', 'compound index',
      'multikey index', 'text index', 'geospatial index', 'hashed index',
      'sparse index', 'partial index', 'TTL index', 'unique index',
      
      // Performance Considerations
      'document size', '16MB limit', 'working set', 'memory usage',
      'query patterns', 'write patterns', 'read patterns',
    ],
  },
  'general-database': {
    name: 'General Database Concepts',
    words: [
      // Core Concepts
      'database', 'collection', 'document', 'field', 'BSON', 'JSON',
      
      // CRUD Operations
      'CRUD', 'create', 'read', 'update', 'delete', 'insert', 'upsert',
      'replace', 'remove', 'drop', 'truncate',
      
      // Transactions
      'transaction', 'ACID', 'atomicity', 'consistency', 'isolation',
      'durability', 'multi document transaction', 'session', 'startTransaction',
      'commitTransaction', 'abortTransaction',
      
      // Indexing
      'index', 'indexing', 'primary key', '_id', 'unique index',
      'compound index', 'index performance', 'index maintenance',
      
      // Write Operations
      'write concern', 'w', 'wtimeout', 'j', 'fsync', 'majority',
      'write acknowledgment', 'write durability',
      
      // Read Operations
      'read preference', 'primary', 'primaryPreferred', 'secondary',
      'secondaryPreferred', 'nearest', 'read concern', 'local', 'available',
      'majority', 'linearizable', 'snapshot',
      
      // Connection & Drivers
      'connection', 'connection pool', 'driver', 'client', 'server',
      'connection string', 'URI', 'authentication', 'authorization',
      
      // Bulk Operations
      'bulk operations', 'bulk write', 'ordered', 'unordered',
      'insertMany', 'updateMany', 'deleteMany', 'bulkWrite',
      
      // Administration
      'admin', 'user', 'role', 'privilege', 'authentication', 'authorization',
      'RBAC', 'role based access control', 'audit', 'logging',
      
      // Backup & Recovery
      'backup', 'restore', 'mongodump', 'mongorestore', 'export', 'import',
      'point in time recovery', 'oplog', 'snapshot',
      
      // Performance
      'performance', 'optimization', 'profiling', 'slow operations',
      'explain', 'query plan', 'execution time', 'throughput', 'latency',
      
      // Security
      'security', 'encryption', 'TLS', 'SSL', 'authentication', 'authorization',
      'network security', 'firewall', 'IP whitelist',
    ],
  },
};

// Flatten word list with topics
const wordList = [];
Object.entries(TOPICS).forEach(([topicId, topicData]) => {
  topicData.words.forEach(word => {
    wordList.push({ word, topic: topicId });
  });
});

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
      const { word, topic } = wordList[i];
      
      try {
        // Check if word already exists
        const existing = await WordNode.findOne({ label: word });
        if (existing) {
          // Update existing word with topic if it doesn't have one
          if (!existing.topic || existing.topic === 'general') {
            existing.topic = topic;
            await existing.save();
            console.log(`[${i + 1}/${wordList.length}] "${word}" updated with topic: ${topic}`);
          } else {
            console.log(`[${i + 1}/${wordList.length}] "${word}" already exists with topic: ${existing.topic}, skipping...`);
          }
          skipped++;
          continue;
        }

        // Generate embedding
        console.log(`[${i + 1}/${wordList.length}] Generating embedding for "${word}" (topic: ${topic})...`);
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
          topic,
        });

        await wordNode.save();
        console.log(`  ✓ Created: "${word}" (${topic}) at position [${position.map(p => p.toFixed(2)).join(', ')}]`);
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
    
    // Show breakdown by topic
    console.log('\n=== Words by Topic ===');
    for (const [topicId, topicData] of Object.entries(TOPICS)) {
      const count = await WordNode.countDocuments({ topic: topicId });
      console.log(`${topicData.name}: ${count} words`);
    }

    process.exit(0);
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

seedWords();

