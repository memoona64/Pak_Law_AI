/**
 * Chat Controller Module
 * Handles session creation, appending query responses, retrieving user chat logs, and deleting histories.
 */

const { validationResult } = require('express-validator');
const Conversation = require('../models/Conversation');
const ragService = require('../services/ragService');

/**
 * Processes chat query and updates or creates a conversation.
 * Route: POST /api/chat/ask
 */
exports.askQuestion = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { question, language, conversationId, province } = req.body;
    let conversation;

    // Check ownership if appending to an existing conversation
    if (conversationId) {
      conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        return res.status(404).json({ error: 'Conversation not found' });
      }
      if (conversation.userId.toString() !== req.user.id) {
        return res.status(403).json({ error: 'Access denied to this conversation.' });
      }
    }

    // Call internal RAG service (Mocked or Python service)
    const ragResult = await ragService.query({ question, language, province });

    const newMessage = {
      question,
      answer: ragResult.answer,
      citations: ragResult.citations || [],
      sources: ragResult.sources || [],
      language
    };

    if (!conversation) {
      conversation = new Conversation({
        userId: req.user.id,
        messages: [newMessage]
      });
    } else {
      conversation.messages.push(newMessage);
    }

    await conversation.save();

    const savedMessage = conversation.messages[conversation.messages.length - 1];

    // Return payload strictly adhering to frontend contract (no confidence/case law fields)
    return res.status(200).json({
      conversationId: conversation._id.toString(),
      messageId: savedMessage._id.toString(),
      answer: ragResult.answer,
      language,
      citations: ragResult.citations || [],
      verified: ragResult.verified,
      safetyTriggered: ragResult.safetyTriggered,
      timings: ragResult.timings
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Summarizes all conversation histories belonging to authenticated user.
 * Route: GET /api/chat/history
 */
exports.getHistory = async (req, res, next) => {
  try {
    const conversations = await Conversation.find({ userId: req.user.id })
      .sort({ updatedAt: -1 })
      .lean();

    const history = conversations.map((conv) => {
      const firstMessage = conv.messages[0] || {};
      
      // Deduplicate shortCodes from all messages and convert to uppercase
      const actSet = new Set();
      conv.messages.forEach((msg) => {
        if (Array.isArray(msg.citations)) {
          msg.citations.forEach((cit) => {
            if (cit && cit.shortCode) {
              actSet.add(cit.shortCode.toUpperCase());
            }
          });
        }
      });

      return {
        id: conv._id.toString(),
        question: firstMessage.question || '',
        date: conv.createdAt,
        acts: Array.from(actSet),
        messageCount: conv.messages.length
      };
    });

    return res.status(200).json({ conversations: history });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieves a single full conversation by ID.
 * Route: GET /api/chat/history/:id
 */
exports.getConversationById = async (req, res, next) => {
  try {
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      userId: req.user.id // Security isolation (404 on missing/unowned)
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    return res.status(200).json(conversation);
  } catch (error) {
    // Return 404 for malformed MongoDB ObjectIds to prevent exposing system internals
    if (error.name === 'CastError') {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    next(error);
  }
};

/**
 * Deletes a full conversation by ID.
 * Route: DELETE /api/chat/history/:id
 */
exports.deleteConversation = async (req, res, next) => {
  try {
    const conversation = await Conversation.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    return res.status(204).send();
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    next(error);
  }
};