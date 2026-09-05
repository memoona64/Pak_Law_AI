/**
 * PakLaw AI Backend Engine - Production Hardened
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');

dotenv.config();

const connectDB = require('./config/db.js');
const errorHandler = require('./middleware/errorHandler.js');

const app = express();

// Apply Security Headers via Helmet
app.use(helmet());

// Enable strict JSON parsing for incoming payloads
app.use(express.json({ limit: '10mb' }));

// Restrict CORS origins strictly to client application
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

/** Health Check Endpoint */
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime()
  });
});

// Mount Routes
app.use('/api/auth', require('./routes/auth.js'));
app.use('/api/chat', require('./routes/chat.js'));
app.use('/api/flows', require('./routes/flows.js'));
app.use('/api/documents', require('./routes/documents.js'));
app.use('/api/feedback', require('./routes/feedback.js'));
app.use('/api/eval', require('./routes/eval.js'));

// Global Exception Handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`[PakLaw Server] Running on port ${PORT} | Env: ${process.env.NODE_ENV || 'development'}`);
  });
};

startServer();