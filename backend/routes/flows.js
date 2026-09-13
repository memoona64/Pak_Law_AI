/**
 * Guided Procedure Flows Express Router
 */

const express = require('express');
const router = express.Router();
const flowsController = require('../controllers/flowsController');

router.get('/', flowsController.getAllFlows);
router.get('/:slug', flowsController.getFlowBySlug);

module.exports = router;