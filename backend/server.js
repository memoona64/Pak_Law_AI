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
const ragService = require('./services/ragService.js'); // NEW — for the FastAPI health check
const ensureAdminAccount = require('./bootstrapAdmin.js');

const app = express();

// Only trust the X-Forwarded-For header when we actually run behind a real
// reverse proxy (set TRUST_PROXY=true in that deployment's env). Trusting it
// blindly would let any client set X-Forwarded-For itself, spoofing req.ip
// and letting them dodge the per-IP rate limiters.
if (process.env.TRUST_PROXY === 'true') {
  app.set('trust proxy', 1);
}

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

/** Health Check Endpoint — now also reports live FastAPI status */
app.get('/api/health', async (req, res) => {
  const pyHealth = await ragService.checkPythonHealth();
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    pythonService: pyHealth.reachable ? 'ok' : 'unreachable', // NEW
    mockMode: process.env.USE_MOCK === 'true'                  // NEW
  });
});

// Mount Routes
app.use('/api/auth', require('./routes/auth.js'));
app.use('/api/chat', require('./routes/chat.js'));
app.use('/api/flows', require('./routes/flows.js'));
app.use('/api/documents', require('./routes/documents.js'));
app.use('/api/feedback', require('./routes/feedback.js'));
app.use('/api/eval', require('./routes/eval.js'));

// 404 Fallback Handler for undefined routes
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} does not exist.`
  });
});

// Global Exception Handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    await ensureAdminAccount();
    app.listen(PORT, async () => {
      console.log(`[PakLaw Server] Running on port ${PORT} | Env: ${process.env.NODE_ENV || 'development'}`);

      // NEW — check FastAPI reachability at startup, warn but don't crash if it's down
      const pyHealth = await ragService.checkPythonHealth();
      if (pyHealth.reachable) {
        console.log(`[PakLaw Server] FastAPI reachable — ${pyHealth.chunksLoaded} chunks loaded`);
      } else {
        console.warn(`[PakLaw Server] FastAPI NOT reachable: ${pyHealth.error}`);
        if (process.env.USE_MOCK === 'true') {
          console.warn('[PakLaw Server] USE_MOCK=true, so chat/documents will work on mock data anyway.');
        } else {
          console.warn('[PakLaw Server] USE_MOCK is not true — chat/documents will fail until FastAPI is running.');
        }
      }
    });
  } catch (error) {
    console.error('[PakLaw Server Error] Database connection failed:', error.message);
    process.exit(1);
  }
};

// Global Unhandled Rejection Safeguard
process.on('unhandledRejection', (err) => {
  console.error('[Unhandled Rejection]', err);
});

startServer();