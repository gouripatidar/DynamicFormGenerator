const mongoose = require("mongoose");

const fieldSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    label: { type: String, required: true },
    type: {
      type: String,
      enum: [
        "text",
        "number",
        "email",
        "textarea",
        "select",
        "checkbox",
        "radio",
        "file",
        "date"
      ],
      required: true
    },
    options: [String],
    required: { type: Boolean, default: false },
    min: Number,
    max: Number,
    pattern: String,
    placeholder: String
  },
  { _id: false }
);

const formSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true },
    description: String,
    schema: {
      type: Object,
      required: true
    },
    purpose: String,
    historySummary: String,
    isPublic: { type: Boolean, default: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Form", formSchema);
