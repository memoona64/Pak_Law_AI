/**
 * Flows Controller Module
 * Handles loading, in-memory caching, and serving of guided legal procedures.
 */

const fs = require('fs');
const path = require('path');

// In-memory cache variables initialized at module startup
let flowsListCache = [];
let flowsDetailCacheMap = new Map();

/**
 * Reads flows.json once on startup into memory.
 * Pre-computes list-view objects (excluding 'steps') and maps full objects by slug.
 */
const initializeFlowsCache = () => {
  try {
    const flowsFilePath = path.join(__dirname, '../data/flows.json');
    const rawData = fs.readFileSync(flowsFilePath, 'utf8');
    const fullFlows = JSON.parse(rawData);

    // Pre-calculate list-view metadata without step details
    flowsListCache = fullFlows.map((flow) => ({
      slug: flow.slug,
      category: flow.category,
      icon: flow.icon,
      title: flow.title,
      subtitle: flow.subtitle,
      stepCount: flow.stepCount,
      estimatedMinutes: flow.estimatedMinutes
    }));

    // Populate slug lookup map for efficient detail retrieval
    flowsDetailCacheMap.clear();
    fullFlows.forEach((flow) => {
      flowsDetailCacheMap.set(flow.slug, flow);
    });

    console.log(`[Flows Cache] Loaded ${fullFlows.length} guided flows into memory.`);
  } catch (error) {
    console.error(`[Flows Error] Failed to load data/flows.json: ${error.message}`);
    flowsListCache = [];
    flowsDetailCacheMap.clear();
  }
};

// Perform immediate sync loading when server starts up
initializeFlowsCache();

/**
 * Retrieves all flows summarized for list-view.
 * Route: GET /api/flows
 */
exports.getAllFlows = (req, res, next) => {
  try {
    return res.status(200).json({ flows: flowsListCache });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieves full details and step-by-step guidance for a specific flow slug.
 * Route: GET /api/flows/:slug
 */
exports.getFlowBySlug = (req, res, next) => {
  try {
    const { slug } = req.params;
    const flow = flowsDetailCacheMap.get(slug);

    if (!flow) {
      return res.status(404).json({ error: 'Flow not found' });
    }

    return res.status(200).json(flow);
  } catch (error) {
    next(error);
  }
};