/**
 * Documents Express Router (Stubbed Route Handler with Rate Limiter)
 */

const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const protect = require('../middleware/auth');

/**
 * Rate Limiter for Document Processing Endpoint
 */
const documentRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: 10, // Limit each IP to 10 document processing requests per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Document upload limit reached for this hour.'
  }
});

const documentNotImplementedHandler = (req, res) => {
  res.status(501).json({
    error: "Not Implemented",
    message: "Document processing features depend on unresolved scope decisions (clause segmentation, risk classification, and obligation extraction). This route is intentionally stubbed until feature specs are finalized."
  });
};

router.use(protect);

router.post('/upload', documentRateLimiter, documentNotImplementedHandler);
router.get('/:id', documentNotImplementedHandler);

module.exports = router;