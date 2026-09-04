/**
 * EvaluationRun Data Model
 * Tracks benchmark metric runs across retrieval modes and languages.
 */

const mongoose = require('mongoose');

const evaluationRunSchema = new mongoose.Schema({
  runDate: {
    type: Date,
    default: Date.now
  },
  questionSetVersion: {
    type: String,
    required: true
  },
  questionCount: {
    type: Number,
    required: true
  },
  recallAt5: Number,
  recallAt10: Number,
  citationValidity: Number,
  refusalRate: Number,
  latency: {
    p50: Number,
    p95: Number,
    byStage: mongoose.Schema.Types.Mixed
  },
  byRetrievalMode: {
    vector: mongoose.Schema.Types.Mixed,
    hybrid: mongoose.Schema.Types.Mixed,
    hybridRerank: mongoose.Schema.Types.Mixed
  },
  byLanguage: {
    en: mongoose.Schema.Types.Mixed,
    ur: mongoose.Schema.Types.Mixed,
    roman_ur: mongoose.Schema.Types.Mixed
  }
});

module.exports = mongoose.model('EvaluationRun', evaluationRunSchema);