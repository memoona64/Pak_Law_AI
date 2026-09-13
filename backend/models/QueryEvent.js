/**
 * Query Event Data Model
 * One lightweight, anonymous record per /api/chat/ask call, logged purely
 * for the live-usage dashboard (see controllers/evalController.js). Deliberately
 * does NOT store the question text, the answer, or the user id — only the
 * aggregate-analytics fields the dashboard actually needs, to avoid piling up
 * raw legal questions (which can contain personal details) in a collection
 * nobody reviews per-record.
 */

const mongoose = require('mongoose');

const queryEventSchema = new mongoose.Schema({
  language: {
    type: String,
    enum: ['en', 'ur', 'roman_ur'],
    required: true
  },
  province: {
    type: String,
    default: null
  },
  latencyMs: {
    type: Number,
    required: true
  },
  verifierBlocked: {
    type: Boolean,
    default: false
  },
  error: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

module.exports = mongoose.model('QueryEvent', queryEventSchema);
