/**
 * Feedback Controller Module
 * Handles recording append-only user feedback on AI responses.
 */

const { validationResult } = require('express-validator');
const Feedback = require('../models/Feedback');

/**
 * Creates a feedback record for a specific message.
 * Route: POST /api/feedback
 */
exports.createFeedback = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { messageId, vote } = req.body;

    await Feedback.create({
      userId: req.user.id,
      messageId,
      vote
    });

    // 204 No Content response as per API contract
    return res.status(204).send();
  } catch (error) {
    next(error);
  }
};