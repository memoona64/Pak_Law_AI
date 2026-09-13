/**
 * JWT Authentication Middleware
 * Validates incoming Authorization Bearer tokens for protected route access.
 */

const jwt = require('jsonwebtoken');

/**
 * Express middleware verifying Bearer tokens attached to the Authorization header.
 * 
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next middleware function
 */
const protect = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    // Pin the algorithm explicitly (tokens are always signed HS256 in
    // authController.js) rather than letting the token itself dictate which
    // algorithm to verify with.
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    req.user = decoded; // Attach payload { id, name, email }
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
};

module.exports = protect;