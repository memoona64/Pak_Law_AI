/**
 * QueryLog Data Model
 * Internal operational log schema populated during RAG query executions.
 * Schema-only: No dedicated external API routes exposed.
 */

const mongoose = require('mongoose');

const queryLogSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    default: Date.now
  },
  language: {
    type: String,
    required: true
  },
  latencyByStage: {
    detect: Number,
    retrieve: Number,
    rerank: Number,
    generate: Number,
    verify: Number,
    total: Number
  },
  chunkIds: [{ type: String }],
  citations: [mongoose.Schema.Types.Mixed],
  verifierResult: {
    type: Boolean,
    default: false
  }
});

module.exports = mongoose.model('QueryLog', queryLogSchema);