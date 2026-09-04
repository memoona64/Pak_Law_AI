/**
 * Chat Express Router - Production Hardened
 */

const express = require('express');
const { body, param } = require('express-validator');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const chatController = require('../controllers/chatController');
const protect = require('../middleware/auth');

/**
 * Rate Limiter for AI Chat Endpoint
 * Restricts single-IP calls to protect downstream Python/LLM inference costs.
 */
const chatRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minute window
  max: 30, // Limit each IP to 30 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many queries submitted from this IP. Please wait 15 minutes before asking more questions.'
  }
});

const askValidation = [
  body('question').trim().notEmpty().withMessage('Question is required'),
  body('language')
    .isIn(['en', 'ur', 'roman_ur'])
    .withMessage('Language must be one of: en, ur, roman_ur'),
  body('conversationId')
    .optional({ nullable: true })
    .isMongoId()
    .withMessage('Invalid conversationId format'),
  body('province')
    .optional({ nullable: true })
    .trim()
    .toLowerCase()
    .isIn(['punjab', 'sindh', 'kpk', 'balochistan', 'islamabad', 'gb', 'ajk'])
    .withMessage('Invalid province specified')
];

const mongoIdValidation = [
  param('id').isMongoId().withMessage('Invalid conversation ID format')
];

router.use(protect);

router.post('/ask', chatRateLimiter, askValidation, chatController.askQuestion);
router.get('/history', chatController.getHistory);
router.get('/history/:id', mongoIdValidation, chatController.getConversationById);
router.delete('/history/:id', mongoIdValidation, chatController.deleteConversation);

module.exports = router;