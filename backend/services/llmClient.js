const axios = require("axios");
const { buildContextualPrompt } = require("./retrieval");

/**
 * generateFormSchema(retrievedHistory, userPrompt)
 * Uses context-aware prompt with retrieved form history
 * Supports Google Gemini API, OpenRouter, or any LLM via environment config
 */
async function generateFormSchema(retrievedHistory, userPrompt) {
  console.log(`[LLM] Generating form with ${retrievedHistory.length} retrieved context items`);

  // If no LLM configured, return default schema (fallback for demo)
  if (!process.env.LLM_API_KEY) {
    console.warn("[LLM] No API key configured, using fallback schema");
    return generateFallbackSchema(userPrompt);
  }

  try {
    const contextualPrompt = buildContextualPrompt(retrievedHistory, userPrompt);

    // Check which LLM provider is configured
    if (process.env.LLM_PROVIDER === "gemini") {
      return await callGemini(contextualPrompt);
    } else if (process.env.LLM_PROVIDER === "openrouter") {
      return await callOpenRouter(contextualPrompt);
    } else {
      // Default to OpenRouter (free alternatives)
      return await callOpenRouter(contextualPrompt);
    }
  } catch (err) {
    console.error("[LLM] Error calling LLM:", err.message);
    // Fallback on error
    return generateFallbackSchema(userPrompt);
  }
}

/**
 * Call Google Gemini API
 */
async function callGemini(prompt) {
  try {
    console.log("[Gemini] Calling Gemini API with prompt...");
    
    // Try different models and API versions
    const models = [
      { name: "gemini-1.5-flash", version: "v1" },
      { name: "gemini-1.5-pro", version: "v1" },
      { name: "gemini-2.0-flash", version: "v1" },
      { name: "gemini-1.5-flash-latest", version: "v1" }
    ];
    
    let response;
    let lastError;
    
    for (const model of models) {
      try {
        const apiUrl = `https://generativelanguage.googleapis.com/${model.version}/models/${model.name}:generateContent?key=${process.env.LLM_API_KEY}`;
        console.log("[Gemini] Trying model:", model.name, "with API version:", model.version);
        
        response = await axios.post(
          apiUrl,
          {
            contents: [
              {
                parts: [
                  {
                    text: prompt
                  }
                ]
              }
            ]
          },
          {
            timeout: 30000
          }
        );
        
        console.log("[Gemini] Success with model:", model.name);
        break;
      } catch (err) {
        lastError = err;
        console.log("[Gemini] Failed with model:", model.name, "- trying next...");
        continue;
      }
    }
    
    if (!response) {
      throw new Error(`All Gemini models failed. Last error: ${lastError?.response?.data?.error?.message || lastError?.message}`);
    }

    console.log("[Gemini] Response received successfully");
    
    if (!response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
      console.error("[Gemini] Invalid response structure:", response.data);
      throw new Error("Invalid Gemini response structure");
    }

    const content = response.data.candidates[0].content.parts[0].text;
    console.log("[Gemini] Raw content:", content.substring(0, 200) + "...");
    
    // Extract JSON from response (Gemini might wrap it in markdown)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("[Gemini] No JSON found in response");
      throw new Error("No JSON found in Gemini response");
    }
    
    const schema = JSON.parse(jsonMatch[0]);
    console.log("[Gemini] Successfully parsed schema with", schema.fields?.length || 0, "fields");
    return schema;
  } catch (err) {
    console.error("[Gemini] Error:", err.response?.data || err.message);
    throw err;
  }
}

/**
 * Call OpenRouter API (supports free models like Llama, Mistral)
 */
async function callOpenRouter(prompt) {
  const response = await axios.post(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      model: process.env.LLM_MODEL || "meta-llama/llama-2-7b-chat",
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.LLM_API_KEY}`,
        "HTTP-Referer": process.env.LLM_REFERER || "http://localhost:4000",
        "X-Title": "Centralign Form Generator"
      }
    }
  );

  const content = response.data.choices[0].message.content;
  // Extract JSON from response
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON found in OpenRouter response");
  return JSON.parse(jsonMatch[0]);
}

/**
 * Generate fallback schema (demo/development)
 */
function generateFallbackSchema(userPrompt) {
  // Extract field names from prompt if possible
  const fieldNames = [];
  const prompt = userPrompt.toLowerCase();
  
  // Basic contact fields
  if (prompt.includes("name")) fieldNames.push({ name: "name", label: "Name", type: "text" });
  if (prompt.includes("email")) fieldNames.push({ name: "email", label: "Email", type: "email" });
  if (prompt.includes("phone")) fieldNames.push({ name: "phone", label: "Phone", type: "text" });
  if (prompt.includes("age")) fieldNames.push({ name: "age", label: "Age", type: "number" });
  
  // Survey/Rating fields
  if (prompt.includes("rating") || prompt.includes("satisfaction") || prompt.includes("likert")) {
    fieldNames.push({ 
      name: "rating", 
      label: "Overall Rating", 
      type: "select",
      options: ["1 - Very Dissatisfied", "2 - Dissatisfied", "3 - Neutral", "4 - Satisfied", "5 - Very Satisfied"]
    });
  }
  
  if (prompt.includes("nps") || prompt.includes("net promoter")) {
    fieldNames.push({ 
      name: "nps_score", 
      label: "How likely are you to recommend? (0-10)", 
      type: "number",
      min: 0,
      max: 10
    });
  }
  
  if (prompt.includes("rating scale")) {
    fieldNames.push({ 
      name: "product_quality", 
      label: "Product Quality", 
      type: "select",
      options: ["1 - Poor", "2 - Fair", "3 - Good", "4 - Very Good", "5 - Excellent"]
    });
    fieldNames.push({ 
      name: "value_for_money", 
      label: "Value for Money", 
      type: "select",
      options: ["1 - Poor", "2 - Fair", "3 - Good", "4 - Very Good", "5 - Excellent"]
    });
  }
  
  // Feedback fields
  if (prompt.includes("feedback") || prompt.includes("comment") || prompt.includes("open-ended")) {
    fieldNames.push({ 
      name: "feedback", 
      label: "Additional Feedback", 
      type: "textarea",
      placeholder: "Please share your thoughts..."
    });
  }
  
  if (prompt.includes("improve") || prompt.includes("suggestion")) {
    fieldNames.push({ 
      name: "suggestions", 
      label: "How can we improve?", 
      type: "textarea",
      placeholder: "Any suggestions for improvement..."
    });
  }
  
  // File upload
  if (prompt.includes("upload") || prompt.includes("image") || prompt.includes("file")) {
    fieldNames.push({ name: "attachment", label: "Attachment", type: "file" });
  }

  // If no fields detected, add defaults
  if (fieldNames.length === 0) {
    fieldNames.push(
      { name: "name", label: "Name", type: "text", required: true },
      { name: "email", label: "Email", type: "email", required: true }
    );
  }

  return {
    title: userPrompt.slice(0, 50) || "Generated Form",
    description: userPrompt,
    fields: fieldNames.map(f => ({
      ...f,
      required: f.required !== false,
      placeholder: f.placeholder || `Enter ${f.label.toLowerCase()}`
    }))
  };
}

module.exports = { generateFormSchema };
