/**
 * Document Data Model
 * Stores the analysis of one uploaded legal document.
 */

const mongoose = require('mongoose');

const clauseSchema = new mongoose.Schema({
  clauseNumber: { type: String },
  text: { type: String, required: true },
  status: { type: String, enum: ['ok', 'warn', 'flag'], required: true }, // mapped from FastAPI's "risk"
  note: { type: String },
  // Defaults to false on purpose: if this field is ever missing we must assume
  // NOT verified. Defaulting to true would silently mark an unchecked citation
  // as safe, which is the opposite of what this flag exists for.
  citationsVerified: { type: Boolean, default: false },
}, { _id: false });

const obligationSchema = new mongoose.Schema({
  date: { type: String },
  description: { type: String, required: true },
}, { _id: false });

const documentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  filename: { type: String, required: true },
  // Not required: if the AI quota runs out, Python still returns a useful
  // result with the clauses and masking counts, just without a summary.
  summary: { type: String, default: '' },
  clauses: { type: [clauseSchema], default: [] },
  obligations: { type: [obligationSchema], default: [] },
  masking: {
    cnic: { type: Number, default: 0 },
    phone: { type: Number, default: 0 },
    email: { type: Number, default: 0 },
  },
  truncated: { type: Boolean, default: false }, // true if Python hit its MAX_CLAUSES limit
}, { timestamps: true }); // gives createdAt / updatedAt automatically

module.exports = mongoose.model('Document', documentSchema);
