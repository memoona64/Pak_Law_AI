const Document = require('../models/Document');
const ragService = require('../services/ragService');

/**
 * POST /api/documents/upload
 * multipart/form-data: file (PDF, required), province (optional)
 * Protected — req.user.id is set by the auth middleware.
 */
exports.uploadDocument = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded. Expected a "file" field with a PDF.' });
    }

    const province = req.body.province || null;

    // FastAPI does its own size/type/empty checks and returns 413 or 422.
    // analyzeDocument() passes those through instead of hiding them.
    const analysis = await ragService.analyzeDocument(
      req.file.buffer,
      req.file.originalname,
      province
    );

    const doc = await Document.create({
      userId: req.user.id,
      filename: req.file.originalname,
      summary: analysis.summary,
      clauses: analysis.clauses,
      obligations: analysis.obligations,
      masking: analysis.masking,
      truncated: analysis.truncated,
    });

    return res.status(201).json({
      id: doc._id,
      filename: doc.filename,
      uploadedAt: doc.createdAt,
      summary: doc.summary,
      clauses: doc.clauses,
      obligations: doc.obligations,
      masking: doc.masking,
      truncated: doc.truncated,
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({
        error: 'The analysis service is not running. Start the Python server on port 8000.'
      });
    }
    next(error);
  }
};

/**
 * GET /api/documents/:id
 * Only returns a document owned by the requesting user.
 */
exports.getDocument = async (req, res, next) => {
  try {
    const doc = await Document.findOne({ _id: req.params.id, userId: req.user.id });
    if (!doc) {
      // 404 rather than 403: do not reveal that someone else's document exists.
      return res.status(404).json({ error: 'Document not found' });
    }
    return res.json({
      id: doc._id,
      filename: doc.filename,
      uploadedAt: doc.createdAt,
      summary: doc.summary,
      clauses: doc.clauses,
      obligations: doc.obligations,
      masking: doc.masking,
      truncated: doc.truncated,
    });
  } catch (error) {
    // A malformed id should look like "not found", not a server crash.
    if (error.name === 'CastError') {
      return res.status(404).json({ error: 'Document not found' });
    }
    next(error);
  }
};
