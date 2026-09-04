/**
 * Conversation Data Model
 * Stores structured chat sessions, individual message history, and associated legal citations.
 */

const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  question: { type: String, required: true },
  answer: { type: String, required: true },
  citations: [mongoose.Schema.Types.Mixed],
  sources: [mongoose.Schema.Types.Mixed],
  language: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

const conversationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    messages: [messageSchema]
  },
  {
    timestamps: true
  }
);

/**
 * Transforms JSON output to expose 'id' instead of '_id' for frontend compatibility.
 */
conversationSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    if (ret.messages) {
      ret.messages.forEach((msg) => {
        msg.id = msg._id.toString();
        delete msg._id;
      });
    }
    return ret;
  }
});

module.exports = mongoose.model('Conversation', conversationSchema);