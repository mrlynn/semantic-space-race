# Setting up Vector Search in MongoDB Atlas

This guide will help you set up vector search for the Semantic Hop game.

## Prerequisites

1. MongoDB Atlas account
2. A cluster (M10 or higher recommended for vector search)
3. Your database and collection created

## Step 1: Create the Vector Search Index

1. Go to your MongoDB Atlas dashboard
2. Navigate to your cluster
3. Click on "Search" in the left sidebar
4. Click "Create Search Index"
5. Select "JSON Editor" (not the visual editor)
6. Paste the following configuration:

```json
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 1536,
      "similarity": "cosine"
    }
  ]
}
```

7. Name the index: `vector_index`
8. Select your database: (your database name)
9. Select your collection: `words`
10. Click "Next" and then "Create Search Index"

## Step 2: Verify the Index

The index will take a few minutes to build. You can check its status in the Search tab.

## Step 3: Test the Vector Search

Once the index is built, you can test it using the MongoDB shell or Compass:

```javascript
// In MongoDB shell or Compass
db.words.aggregate([
  {
    $vectorSearch: {
      index: "vector_index",
      path: "embedding",
      queryVector: [/* your 1536-dimension vector */],
      numCandidates: 10,
      limit: 5
    }
  }
])
```

## Notes

- The index name must be exactly `vector_index` (as used in the code)
- The embedding field must be an array of exactly 1536 numbers
- Vector search requires MongoDB Atlas M10+ cluster
- The index will automatically update as you add/update documents

## Troubleshooting

### Index not found error
- Make sure the index name matches exactly: `vector_index`
- Verify the index status is "Active" in Atlas
- Wait a few minutes after creation for the index to build

### Invalid dimensions error
- Ensure all embeddings are exactly 1536 dimensions
- Check that the embedding field is an array of numbers

### Performance issues
- Consider increasing `numCandidates` for better accuracy
- Use `limit` to control result count

