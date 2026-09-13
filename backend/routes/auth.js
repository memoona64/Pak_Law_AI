/**
 * Auth Express Router
 * Express validation and endpoint routing definitions.
 */

const express = require('express');
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const authController = require('../controllers/authController');
const protect = require('../middleware/auth');

/**
 * Rate Limiter for auth endpoints (register/login).
 * Stricter than the chat limiter since these are prime brute-force/spam targets.
 */
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minute window
  max: 10, // Limit each IP to 10 register/login attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many attempts from this IP. Please wait 15 minutes and try again.'
  }
});

// Registration validation chain
const registerValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').trim().isEmail().withMessage('A valid email is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
];

// Login validation chain
const loginValidation = [
  body('email').trim().isEmail().withMessage('A valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
];

router.post('/register', authRateLimiter, registerValidation, authController.register);
router.post('/login', authRateLimiter, loginValidation, authController.login);
router.get('/me', protect, authController.getMe);

module.exports = router;