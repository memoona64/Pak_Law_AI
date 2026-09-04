/**
 * Authentication Business Logic
 * Manages user registration, authentication, and token generation.
 */

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/User');

/**
 * Helper to generate a standardized JSON Web Token.
 * 
 * @param {Object} user - Sanitized user object
 * @returns {string} Signed JWT
 */
const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, name: user.name, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

/**
 * Registers a new user account.
 * Route: POST /api/auth/register
 */
exports.register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password } = req.body;

    // Check for existing user
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    // Hash raw password with bcrypt cost factor 10
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email,
      passwordHash
    });

    const userPayload = {
      id: user._id.toString(),
      name: user.name,
      email: user.email
    };

    const token = generateToken(userPayload);

    return res.status(201).json({
      token,
      user: userPayload
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Authenticates user credentials and returns access token.
 * Route: POST /api/auth/login
 */
exports.login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Explicitly re-include passwordHash due to select: false on model
    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const userPayload = {
      id: user._id.toString(),
      name: user.name,
      email: user.email
    };

    const token = generateToken(userPayload);

    return res.status(200).json({
      token,
      user: userPayload
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieves authenticated user data.
 * Route: GET /api/auth/me
 */
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('-passwordHash');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.status(200).json({
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    next(error);
  }
};