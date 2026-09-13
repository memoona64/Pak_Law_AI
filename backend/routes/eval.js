/**
 * Evaluation Express Router
 */

const express = require('express');
const router = express.Router();
const evalController = require('../controllers/evalController');
const protect = require('../middleware/auth');
const requireAdmin = require('../middleware/requireAdmin');

// Evaluation/benchmark data is not for the regular user side of the app -
// admin only, both the nav link (see AppSidebar.jsx) and here at the API
// itself, so it's not reachable just by knowing the URL.
router.use(protect, requireAdmin);

router.get('/latest', evalController.getLatestEval);
router.get('/runs', evalController.getEvalRuns);
router.get('/live', evalController.getLiveEval);

module.exports = router;
