/**
 * Feedback Data Model
 * Stores user feedback (upvote/downvote) on generated AI responses.
 * Append-only data store for audit and legal AI quality tracking.
 */

const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  messageId: {
    type: String,
    required: [true, 'messageId is required']
  },
  vote: {
    type: String,
    enum: ['up', 'down'],
    required: [true, 'vote must be either "up" or "down"']
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

// One vote per user per message — createFeedback uses this as an upsert key
// so a user can change their mind, but can't stack unlimited votes on the
// same message (which would silently skew the live "helpful rate").
feedbackSchema.index({ userId: 1, messageId: 1 }, { unique: true });

module.exports = mongoose.model('Feedback', feedbackSchema);