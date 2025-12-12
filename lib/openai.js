import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Generate a definition/riddle for a word
 * @param {string} wordLabel - The word to generate a definition for
 * @param {object} options - Generation options
 * @param {string} options.difficulty - 'beginner' | 'intermediate' | 'advanced' (default: 'intermediate')
 * @param {string} options.educationalMode - 'mongodb-vector-search' | null (default: null)
 * @returns {Promise<string>} Generated definition (without the word itself)
 */
export async function generateDefinition(wordLabel, options = {}) {
  const { difficulty = 'intermediate', educationalMode = null } = options;

  try {
    let systemPrompt = '';
    let userPrompt = '';

    // MongoDB Vector Search Educational Mode
    if (educationalMode === 'mongodb-vector-search') {
      systemPrompt = `You are an expert educator teaching MongoDB Vector Search concepts through a word guessing game.
Your riddles should:
1. Relate the target word to vector search/embedding concepts
2. Teach fundamental concepts about semantic similarity, embeddings, or vector databases
3. Be educational but engaging
4. NEVER include the target word itself
5. Connect the word's meaning to how it might be represented in vector space

Example concepts to weave in:
- Vector embeddings represent meaning as arrays of numbers (1536 dimensions for OpenAI)
- Similar words cluster together in vector space
- Cosine similarity measures semantic closeness
- MongoDB's $vectorSearch finds semantically related documents
- Dimensionality reduction (like PCA) helps visualize high-dimensional data`;

      userPrompt = `Create an educational riddle for the word "${wordLabel}" that teaches MongoDB Vector Search concepts.

The riddle should:
- Connect the word's meaning to vector/embedding concepts
- Include a learning moment about semantic search or vector databases
- Be ${difficulty} difficulty (${getDifficultyDescription(difficulty)})
- NOT include the word "${wordLabel}"

Example format: "In vector space, I cluster near 'feline' and 'pet' with high cosine similarity. My embedding captures the essence of a furry, independent companion. MongoDB's $vectorSearch would find me when seeking animals that purr."`;
    } else {
      // Standard riddle mode with difficulty levels
      systemPrompt = `You are a creative riddle maker for a word guessing game. Your riddles should be ${difficulty} difficulty and should NEVER include the target word itself.

Difficulty guidelines:
- Beginner: Direct descriptions, common associations, obvious clues (like a dictionary definition but engaging)
- Intermediate: Metaphorical language, require some thought, balanced challenge
- Advanced: Cryptic clues, abstract connections, require deep thinking or specialized knowledge

Make riddles engaging, clear, and appropriately challenging.`;

      userPrompt = `Create a ${difficulty} difficulty riddle for the word "${wordLabel}".

${getDifficultyGuidance(difficulty)}

Do NOT include the word "${wordLabel}" anywhere in your response. Make it engaging and appropriately challenging.`;
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: userPrompt,
        },
      ],
      temperature: educationalMode ? 0.7 : 0.8,
      max_tokens: educationalMode ? 200 : 150,
    });

    const definition = response.choices[0]?.message?.content?.trim();
    if (!definition) {
      throw new Error('Failed to generate definition');
    }

    // Double-check that the word is not in the definition (case-insensitive)
    const lowerDefinition = definition.toLowerCase();
    const lowerWord = wordLabel.toLowerCase();
    if (lowerDefinition.includes(lowerWord)) {
      // If word is found, try to remove it or regenerate
      return definition.replace(new RegExp(lowerWord, 'gi'), '[word]');
    }

    return definition;
  } catch (error) {
    console.error('Error generating definition:', error);
    throw error;
  }
}

/**
 * Get difficulty description for prompts
 */
function getDifficultyDescription(difficulty) {
  switch (difficulty) {
    case 'beginner':
      return 'simple, straightforward clues that directly describe the concept';
    case 'advanced':
      return 'cryptic, abstract clues requiring deep thinking';
    default:
      return 'balanced clues with some metaphorical language';
  }
}

/**
 * Get specific guidance for each difficulty level
 */
function getDifficultyGuidance(difficulty) {
  switch (difficulty) {
    case 'beginner':
      return `Make this easy to guess:
- Use direct descriptions and common associations
- Include obvious characteristics or uses
- Think like a simple dictionary definition but make it engaging
- Example for "sun": "The bright star at the center of our solar system that provides light and warmth to Earth."`;

    case 'advanced':
      return `Make this challenging:
- Use abstract or poetic language
- Require specialized knowledge or deep thinking
- Use clever wordplay or indirect associations
- Example for "sun": "Helios personified, fusion's furnace burning bright, giver of vitamin D and worshipped by ancient civilizations as a deity."`;

    default: // intermediate
      return `Make this moderately challenging:
- Use some metaphorical language
- Require thought but not specialized knowledge
- Balance clarity with intrigue
- Example for "sun": "I rise in the east and set in the west, a celestial body that has inspired countless myths and powers photosynthesis."`;
  }
}

/**
 * Generate a hint for a word (additional clue beyond the original riddle)
 * @param {string} wordLabel - The word to generate a hint for
 * @param {string} originalDefinition - The original riddle/definition
 * @returns {Promise<string>} Generated hint (without the word itself)
 */
export async function generateHint(wordLabel, originalDefinition) {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that provides additional clues for word guessing games. Your hints should be more specific than the original riddle, providing a different angle or additional context, but should NEVER include the target word itself. Keep hints concise (1-2 sentences).',
        },
        {
          role: 'user',
          content: `The target word is "${wordLabel}". The original riddle was: "${originalDefinition}".

Provide an additional hint that gives a different perspective or more specific information to help someone guess the word. Do NOT include the word "${wordLabel}" in your hint. Make it helpful but not too obvious.

Examples of good hints:
- For "ocean": "This covers about 71% of Earth's surface and contains saltwater."
- For "keyboard": "This typically has 104 keys on a standard desktop version."
- For "telescope": "Galileo used one of these to discover Jupiter's moons in 1610."

Provide only the hint text, nothing else.`,
        },
      ],
      temperature: 0.7,
      max_tokens: 100,
    });

    const hint = response.choices[0]?.message?.content?.trim();
    if (!hint) {
      throw new Error('Failed to generate hint');
    }

    // Double-check that the word is not in the hint (case-insensitive)
    const lowerHint = hint.toLowerCase();
    const lowerWord = wordLabel.toLowerCase();
    if (lowerHint.includes(lowerWord)) {
      // If word is found, replace it with [target word]
      return hint.replace(new RegExp(lowerWord, 'gi'), '[target word]');
    }

    return hint;
  } catch (error) {
    console.error('Error generating hint:', error);
    throw error;
  }
}

/**
 * Generate embedding for a word
 * @param {string} text - Text to embed
 * @returns {Promise<number[]>} Embedding vector (1536 dimensions)
 */
export async function generateEmbedding(text) {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
}

