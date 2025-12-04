const mongoose = require("mongoose");

const submissionSchema = new mongoose.Schema(
  {
    formId: { type: mongoose.Schema.Types.ObjectId, ref: "Form", required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    responses: { type: Object, required: true }
  },
  { timestamps: { createdAt: "submittedAt", updatedAt: false } }
);

module.exports = mongoose.model("Submission", submissionSchema);
