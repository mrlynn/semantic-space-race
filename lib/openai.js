import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Generate a definition/riddle for a word
 * @param {string} wordLabel - The word to generate a definition for
 * @returns {Promise<string>} Generated definition (without the word itself)
 */
export async function generateDefinition(wordLabel) {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that creates riddles and definitions for words. Your definitions should be clear and helpful, but should NEVER include the target word itself in the definition. Make the definition engaging and interesting.',
        },
        {
          role: 'user',
          content: `Create a riddle or definition for the word "${wordLabel}". Do NOT include the word "${wordLabel}" anywhere in your response. Make it engaging and helpful for someone trying to guess the word.`,
        },
      ],
      temperature: 0.8,
      max_tokens: 150,
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

