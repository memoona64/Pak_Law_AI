/**
 * Flow Data Model
 * Represents guided step-by-step legal walkthrough procedures.
 */

const mongoose = require('mongoose');

// Multilingual Reusable Field Structure
const localizedText = {
  en: { type: String, required: true },
  ur: { type: String, required: true },
  roman_ur: { type: String, required: true }
};

const flowSchema = new mongoose.Schema(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true
    },
    title: localizedText,
    situation: localizedText,
    steps: [
      {
        _id: false,
        label: localizedText,
        body: localizedText
      }
    ]
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Flow', flowSchema);