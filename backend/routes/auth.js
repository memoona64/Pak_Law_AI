/**
 * Auth Express Router
 * Express validation and endpoint routing definitions.
 */

const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const authController = require('../controllers/authController');
const protect = require('../middleware/auth');

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

router.post('/register', registerValidation, authController.register);
router.post('/login', loginValidation, authController.login);
router.get('/me', protect, authController.getMe);

module.exports = router;