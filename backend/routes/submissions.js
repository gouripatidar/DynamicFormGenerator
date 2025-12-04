const express = require("express");
const auth = require("../middleware/auth");
const Submission = require("../models/Submission");
const Form = require("../models/Form");

const router = express.Router();

// POST /api/forms/:id/submit  (public submission)
router.post("/:id/submit", async (req, res) => {
  try {
    const { responses } = req.body;
    const form = await Form.findById(req.params.id);
    if (!form || !form.isPublic) {
      return res.status(404).json({ message: "Form not found" });
    }

    const submission = await Submission.create({
      formId: form._id,
      userId: form.userId,
      responses
    });

    res.json({ submission });
  } catch (err) {
    console.error("Submit error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/forms/:id/submissions  (owner view)
router.get("/:id/submissions", auth, async (req, res) => {
  try {
    const form = await Form.findById(req.params.id);
    if (!form) return res.status(404).json({ message: "Form not found" });
    if (String(form.userId) !== req.user.id) {
      return res.status(403).json({ message: "Not allowed" });
    }

    const submissions = await Submission.find({ formId: form._id }).sort({
      submittedAt: -1
    });
    res.json(submissions);
  } catch (err) {
    console.error("Get submissions error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/submissions  (all submissions grouped by form for dashboard – optional)
router.get("/", auth, async (req, res) => {
  try {
    const submissions = await Submission.find({ userId: req.user.id }).sort({
      submittedAt: -1
    });
    res.json(submissions);
  } catch (err) {
    console.error("Get all submissions error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
