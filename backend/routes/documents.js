const express = require('express');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const auth = require('../middleware/auth');
const { uploadDocument, getDocument } = require('../controllers/documentsController');

// Same allowed provinces as chat/ask (routes/chat.js) — keep the two lists in sync.
const uploadValidation = [
  body('province')
    .optional({ nullable: true })
    .trim()
    .toLowerCase()
    .isIn(['punjab', 'sindh', 'kpk', 'balochistan', 'islamabad', 'gb', 'ajk'])
    .withMessage('Invalid province specified')
];

// multer must run first so it parses the multipart body into req.body,
// which is what express-validator's body() checks below read from.
function checkValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
}

// Memory storage: the file is forwarded straight to Python, never written to disk.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB — must match FastAPI's MAX_UPLOAD_BYTES
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      return cb(new Error('Only PDF files are accepted.'));
    }
    cb(null, true);
  },
});

// Each upload costs several AI requests, and the free tier allows only 20 per
// day for the whole project. Without this cap, a few uploads exhaust the team's
// entire daily quota and everything else stops working.
const documentRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Document upload limit reached for this hour.' },
});

// multer's errors (wrong type, too large) must reach the client as 400/413
// rather than crashing the request.
function handleUpload(req, res, next) {
  upload.single('file')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
      return res.status(status).json({ error: err.message });
    }
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    next();
  });
}

router.post('/upload', auth, documentRateLimiter, handleUpload, uploadValidation, checkValidation, uploadDocument);
router.get('/:id', auth, getDocument);

module.exports = router;
