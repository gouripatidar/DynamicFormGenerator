/**
 * Context-aware memory retrieval for form history
 * Implements semantic search to find relevant past forms
 */

/**
 * Simple keyword-based relevance scoring
 * In production, use embeddings (e.g., Pinecone, Weaviate)
 */
function scoreRelevance(userPrompt, form) {
  const promptWords = userPrompt.toLowerCase().split(/\s+/);
  const titleWords = (form.title || "").toLowerCase().split(/\s+/);
  const purposeWords = (form.purpose || "").toLowerCase().split(/\s+/);
  const summaryWords = (form.historySummary || "").toLowerCase().split(/\s+/);
  
  let score = 0;
  
  // Check title match
  for (const word of promptWords) {
    if (titleWords.includes(word)) score += 3;
    if (purposeWords.includes(word)) score += 2;
    if (summaryWords.includes(word)) score += 1;
  }
  
  return score;
}

/**
 * Retrieve top-K relevant forms from user's form history
 * @param {Array} userForms - All forms created by the user
 * @param {string} userPrompt - Natural language prompt for new form
 * @param {number} topK - Number of relevant forms to return (default: 5)
 * @returns {Array} - Trimmed form history with only relevant schemas
 */
function retrieveTopK(userForms, userPrompt, topK = 5) {
  if (!userForms || userForms.length === 0) {
    return [];
  }

  // Score each form
  const scored = userForms.map((form) => ({
    form,
    score: scoreRelevance(userPrompt, form)
  }));

  // Filter zero-score forms and sort by relevance
  const relevant = scored
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map((item) => ({
      title: item.form.title,
      purpose: item.form.purpose,
      description: item.form.description,
      historySummary: item.form.historySummary,
      fields: (item.form.schema?.fields || []).map((f) => ({
        name: f.name,
        label: f.label,
        type: f.type,
        required: f.required
      }))
    }));

  console.log(`[Retrieval] Found ${relevant.length} relevant forms out of ${userForms.length}`);
  return relevant;
}

/**
 * Build system prompt for LLM with retrieved context
 * @param {Array} retrievedHistory - Retrieved relevant forms
 * @param {string} userPrompt - User's form generation request
 * @returns {string} - Complete system prompt for LLM
 */
function buildContextualPrompt(retrievedHistory, userPrompt) {
  const historyContext = retrievedHistory.length > 0
    ? JSON.stringify(retrievedHistory, null, 2)
    : "No relevant form history found.";

  return `You are an intelligent form schema generator for a dynamic form builder.

Your task is to generate a JSON form schema based on the user's request.

RELEVANT PAST FORMS (for reference):
${historyContext}

USER REQUEST:
"${userPrompt}"

Generate a new form schema that:
1. Matches the user's request
2. Follows patterns from relevant past forms if applicable
3. Includes appropriate field types (text, email, number, textarea, select, checkbox, radio, file, date)
4. Includes validation rules where appropriate

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
      "options": ["option1", "option2"], // for select, checkbox, radio
      "min": number, // for number/date
      "max": number, // for number/date
      "pattern": "regex", // optional validation
      "placeholder": "hint text"
    }
  ]
}`;
}

module.exports = {
  retrieveTopK,
  scoreRelevance,
  buildContextualPrompt
};
