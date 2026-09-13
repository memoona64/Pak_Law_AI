/**
 * Feedback Express Router
 */

const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const feedbackController = require('../controllers/feedbackController');
const protect = require('../middleware/auth');

const feedbackValidation = [
  body('messageId').trim().notEmpty().withMessage('messageId is required'),
  body('vote').isIn(['up', 'down']).withMessage('vote must be "up" or "down"')
];

router.post('/', protect, feedbackValidation, feedbackController.createFeedback);

module.exports = router;