const axios = require("axios");

/**
 * Pinecone Vector Embedding & Semantic Retrieval Service
 * Replaces keyword-based retrieval with semantic search using embeddings
 * 
 * Benefits:
 * - Semantic similarity (not just keyword matching)
 * - Handles complex queries and synonyms
 * - Much faster retrieval from large datasets
 * - Better relevance ranking
 */

const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
const PINECONE_HOST = process.env.PINECONE_HOST; // e.g., forms-index-xxxxx.svc.pinecone.io
const INDEX_NAME = process.env.PINECONE_INDEX_NAME || "forms-index";

/**
 * Generate embeddings using OpenAI API or Gemini
 * Converts text to a 1536-dimensional vector
 */
async function generateEmbedding(text) {
  try {
    if (!text || text.trim().length === 0) {
      console.warn("[Pinecone] Empty text for embedding, returning zero vector");
      return new Array(1536).fill(0);
    }

    // Using OpenAI embeddings (can also use Gemini embeddings)
    const response = await axios.post(
      "https://api.openai.com/v1/embeddings",
      {
        input: text,
        model: "text-embedding-3-small" // Fast and cheap
      },
      {
        headers: {
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    return response.data.data[0].embedding;
  } catch (err) {
    console.error("[Pinecone] Error generating embedding:", err.message);
    // Fallback: return zero vector if embedding fails
    return new Array(1536).fill(0);
  }
}

/**
 * Store a form embedding in Pinecone
 * Called when a new form is created
 */
async function storeFormEmbedding(formId, title, description, purpose) {
  try {
    if (!PINECONE_API_KEY || !PINECONE_HOST) {
      console.warn("[Pinecone] Pinecone not configured, skipping embedding storage");
      return;
    }

    // Create a combined text for embedding
    const textToEmbed = `${title} ${description} ${purpose}`.substring(0, 2000);
    
    const embedding = await generateEmbedding(textToEmbed);

    // Store in Pinecone
    const response = await axios.post(
      `https://${PINECONE_HOST}/vectors/upsert`,
      {
        vectors: [
          {
            id: formId,
            values: embedding,
            metadata: {
              title,
              description,
              purpose,
              storedAt: new Date().toISOString()
            }
          }
        ]
      },
      {
        headers: {
          "Api-Key": PINECONE_API_KEY,
          "Content-Type": "application/json"
        }
      }
    );

    console.log(`[Pinecone] Stored embedding for form: ${formId}`);
    return response.data;
  } catch (err) {
    console.error("[Pinecone] Error storing embedding:", err.message);
    // Don't fail the whole form creation if embedding fails
    return null;
  }
}

/**
 * Retrieve semantically similar forms from Pinecone
 * Much more powerful than keyword matching
 */
async function retrieveSemanticForms(userPrompt, topK = 5) {
  try {
    if (!PINECONE_API_KEY || !PINECONE_HOST) {
      console.warn("[Pinecone] Pinecone not configured, skipping semantic retrieval");
      return [];
    }

    console.log("[Pinecone] Retrieving semantically similar forms...");

    // Generate embedding for user prompt
    const queryEmbedding = await generateEmbedding(userPrompt);

    // Query Pinecone for similar vectors
    const response = await axios.post(
      `https://${PINECONE_HOST}/query`,
      {
        vector: queryEmbedding,
        topK: topK,
        includeMetadata: true
      },
      {
        headers: {
          "Api-Key": PINECONE_API_KEY,
          "Content-Type": "application/json"
        }
      }
    );

    const matches = response.data.matches || [];
    console.log(`[Pinecone] Found ${matches.length} semantically similar forms`);

    // Transform Pinecone results to form metadata
    return matches.map((match) => ({
      id: match.id,
      title: match.metadata?.title || "Untitled",
      description: match.metadata?.description || "",
      purpose: match.metadata?.purpose || "",
      similarity: match.score // Pinecone returns cosine similarity (0-1)
    }));
  } catch (err) {
    console.error("[Pinecone] Error retrieving forms:", err.message);
    return [];
  }
}

/**
 * Delete a form embedding from Pinecone (when form is deleted)
 */
async function deleteFormEmbedding(formId) {
  try {
    if (!PINECONE_API_KEY || !PINECONE_HOST) {
      return;
    }

    await axios.post(
      `https://${PINECONE_HOST}/vectors/delete`,
      {
        ids: [formId]
      },
      {
        headers: {
          "Api-Key": PINECONE_API_KEY,
          "Content-Type": "application/json"
        }
      }
    );

    console.log(`[Pinecone] Deleted embedding for form: ${formId}`);
  } catch (err) {
    console.error("[Pinecone] Error deleting embedding:", err.message);
  }
}

/**
 * Build contextual prompt using Pinecone-retrieved forms
 * Same structure as keyword-based, but with semantic similarity scores
 */
function buildSemanticContextualPrompt(semanticForms, userPrompt) {
  const formContext = semanticForms.length > 0
    ? semanticForms.map((form, idx) => ({
        rank: idx + 1,
        similarity_score: (form.similarity * 100).toFixed(1) + "%",
        title: form.title,
        purpose: form.purpose,
        description: form.description
      }))
    : "No semantically similar forms found in history.";

  return `You are an intelligent form schema generator.

SEMANTICALLY SIMILAR PAST FORMS (ranked by similarity):
${typeof formContext === 'string' ? formContext : JSON.stringify(formContext, null, 2)}

USER REQUEST:
"${userPrompt}"

Generate a new form schema that:
1. Matches the user's request
2. Incorporates patterns from semantically similar past forms where appropriate
3. Supports the following field types: text, email, number, textarea, select, checkbox, radio, file, date

Return ONLY a valid JSON object with this structure:
{
  "title": "Form Title",
  "description": "Form description",
  "fields": [
    {
      "name": "field_name",
      "label": "Display Label",
      "type": "text|email|number|textarea|select|checkbox|radio|file|date",
      "required": true|false,
      "options": ["option1", "option2"],
      "placeholder": "hint text"
    }
  ]
}`;
}

module.exports = {
  generateEmbedding,
  storeFormEmbedding,
  retrieveSemanticForms,
  deleteFormEmbedding,
  buildSemanticContextualPrompt
};
