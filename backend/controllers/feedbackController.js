/**
 * Feedback Controller Module
 * Handles recording append-only user feedback on AI responses.
 */

const { validationResult } = require('express-validator');
const Feedback = require('../models/Feedback');
const Conversation = require('../models/Conversation');

/**
 * Creates (or updates) a feedback record for a specific message.
 * Route: POST /api/feedback
 */
exports.createFeedback = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { messageId, vote } = req.body;

    // Confirm the message actually belongs to a conversation this user
    // owns/received — without this, any authenticated user could vote on a
    // messageId they never saw, or one belonging to someone else's chat.
    let ownsMessage;
    try {
      ownsMessage = await Conversation.exists({
        userId: req.user.id,
        'messages._id': messageId
      });
    } catch (error) {
      if (error.name === 'CastError') {
        return res.status(404).json({ error: 'Message not found' });
      }
      throw error;
    }
    if (!ownsMessage) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Upsert on (userId, messageId) so a user can change their vote instead
    // of stacking unlimited votes on the same message — see the unique
    // index on Feedback.
    await Feedback.findOneAndUpdate(
      { userId: req.user.id, messageId },
      { userId: req.user.id, messageId, vote, timestamp: new Date() },
      { upsert: true, setDefaultsOnInsert: true }
    );

    // 204 No Content response as per API contract
    return res.status(204).send();
  } catch (error) {
    next(error);
  }
};