/**
 * Flows Express Router
 * Express routes for retrieving static guided-procedure content.
 */

const express = require('express');
const router = express.Router();
const flowsController = require('../controllers/flowsController');

router.get('/', flowsController.getAllFlows);
router.get('/:slug', flowsController.getFlowBySlug);

module.exports = router;