const express = require("express");
const auth = require("../middleware/auth");
const Form = require("../models/Form");
const { generateFormSchema } = require("../services/llmClient");
const { retrieveTopK } = require("../services/retrieval");

const router = express.Router();

// GET /api/forms  (user's forms)
router.get("/", auth, async (req, res) => {
  try {
    const forms = await Form.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(forms);
  } catch (err) {
    console.error("Get forms error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/forms/:id  (public form schema)
router.get("/:id", async (req, res) => {
  try {
    const form = await Form.findById(req.params.id);
    if (!form || !form.isPublic) {
      return res.status(404).json({ message: "Form not found" });
    }
    res.json({
      id: form._id,
      title: form.title,
      description: form.description,
      schema: form.schema
    });
  } catch (err) {
    console.error("Get form error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/forms/generate  (AI form generator)
router.post("/generate", auth, async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ message: "Prompt is required" });
    }

    // Fetch user's past forms for retrieval
    const userForms = await Form.find({ userId: req.user.id });

    // Retrieve relevant history (top 5 most similar forms)
    const retrievedHistory = retrieveTopK(userForms, prompt, 5);

    // Call LLM to generate new schema with context
    const schema = await generateFormSchema(retrievedHistory, prompt);

    // Validate schema
    if (!schema.fields || !Array.isArray(schema.fields)) {
      return res.status(400).json({ message: "Invalid schema returned from LLM" });
    }

    // Derive purpose & summary for future retrieval
    const purpose = schema.title || "Generated form";
    const historySummary =
      schema.description ||
      `Form with fields: ${(schema.fields || []).map((f) => f.name).join(", ")}`;

    // Create form document
    const form = await Form.create({
      userId: req.user.id,
      title: schema.title,
      description: schema.description,
      schema,
      purpose,
      historySummary
      // embedding: could be calculated here using embeddings API
    });

    res.json({ 
      form,
      retrievedContextCount: retrievedHistory.length 
    });
  } catch (err) {
    console.error("Generate form error:", err);
    res.status(500).json({ message: "Failed to generate form", error: err.message });
  }
});

module.exports = router;
