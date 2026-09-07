// const express = require('express');
// const multer = require('multer');
// const router = express.Router();
// const auth = require('../middleware/auth');
// const { uploadDocument, getDocument } = require('../controllers/documentsController');

// // Memory storage: we forward the buffer straight to FastAPI, never write to disk.
// const upload = multer({
//   storage: multer.memoryStorage(),
//   limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB — matches FastAPI's MAX_UPLOAD_BYTES, keep these in sync
//   fileFilter: (req, file, cb) => {
//     if (file.mimetype !== 'application/pdf') {
//       return cb(new Error('Only PDF files are accepted.'));
//     }
//     cb(null, true);
//   },
// });

// // multer's error (wrong type / too large) needs to reach the client as 400/413,
// // not crash — wrap the middleware call.
// function handleUpload(req, res, next) {
//   upload.single('file')(req, res, (err) => {
//     if (err instanceof multer.MulterError) {
//       const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
//       return res.status(status).json({ error: err.message });
//     }
//     if (err) {
//       return res.status(400).json({ error: err.message });
//     }
//     next();
//   });
// }

// router.post('/upload', auth, handleUpload, uploadDocument);
// router.get('/:id', auth, getDocument);

// module.exports = router;




const express = require('express');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const auth = require('../middleware/auth');
const { uploadDocument, getDocument } = require('../controllers/documentsController');

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

router.post('/upload', auth, documentRateLimiter, handleUpload, uploadDocument);
router.get('/:id', auth, getDocument);

module.exports = router;
