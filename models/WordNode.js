import mongoose from 'mongoose';

const WordNodeSchema = new mongoose.Schema({
  label: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  position: {
    type: [Number],
    required: true,
    validate: {
      validator: (v) => Array.isArray(v) && v.length === 3,
      message: 'Position must be an array of 3 numbers [x, y, z]',
    },
  },
  embedding: {
    type: [Number],
    required: true,
    validate: {
      validator: (v) => Array.isArray(v) && v.length === 1536,
      message: 'Embedding must be an array of 1536 numbers',
    },
  },
  address4d: {
    type: [String],
    default: [],
  },
  w: {
    type: Number,
    default: 1,
  },
  topic: {
    type: String,
    index: true,
    default: 'general',
  },
}, {
  timestamps: true,
});

// Create text index for label search
WordNodeSchema.index({ label: 'text' });

// Create vector search index (will be created in MongoDB Atlas)
// Field name: 'embedding', type: 'vector', dimensions: 1536

const WordNode = mongoose.models.WordNode || mongoose.model('WordNode', WordNodeSchema);

export default WordNode;

