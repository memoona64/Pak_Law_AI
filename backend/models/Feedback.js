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

module.exports = mongoose.model('Feedback', feedbackSchema);