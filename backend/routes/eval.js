/**
 * Evaluation Express Router
 */

const express = require('express');
const router = express.Router();
const evalController = require('../controllers/evalController');

router.get('/latest', evalController.getLatestEval);
router.get('/runs', evalController.getEvalRuns);
router.get('/live', evalController.getLiveEval);

module.exports = router;
