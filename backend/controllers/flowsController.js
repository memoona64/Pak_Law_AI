/**
 * Guided Procedure Flows Controller Module
 */

const Flow = require('../models/Flow');

/**
 * Helper to pick localized content based on ?lang query
 */
const localize = (localizedObj, lang) => {
  if (!localizedObj) return '';
  return localizedObj[lang] || localizedObj['en'];
};

/**
 * Retrieves summary metadata for all guided flows.
 * Route: GET /api/flows?lang=ur
 */
exports.getAllFlows = async (req, res, next) => {
  try {
    const { lang } = req.query; // 'en', 'ur', 'roman_ur', or undefined
    const flows = await Flow.find({}, 'slug title situation').lean();

    // No lang given: return the full multilingual structure as-is.
    if (!lang) {
      return res.status(200).json(flows);
    }

    // Filter down to just the requested language.
    const localizedFlows = flows.map((flow) => ({
      _id: flow._id,
      slug: flow.slug,
      title: localize(flow.title, lang),
      situation: localize(flow.situation, lang)
    }));

    return res.status(200).json(localizedFlows);
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieves a single guided flow document by its unique slug.
 * Route: GET /api/flows/:slug?lang=ur
 */
exports.getFlowBySlug = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const { lang } = req.query; // 'en', 'ur', 'roman_ur', or undefined

    const flow = await Flow.findOne({ slug: slug.toLowerCase() }).lean();

    if (!flow) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Guided procedure flow with slug '${slug}' was not found.`
      });
    }

    // No lang given: return the full multilingual structure as-is.
    if (!lang) {
      return res.status(200).json(flow);
    }

    // Format the object down to the requested language.
    const localizedFlow = {
      _id: flow._id,
      slug: flow.slug,
      title: localize(flow.title, lang),
      situation: localize(flow.situation, lang),
      steps: flow.steps.map((step) => ({
        label: localize(step.label, lang),
        body: localize(step.body, lang)
      })),
      createdAt: flow.createdAt,
      updatedAt: flow.updatedAt
    };

    return res.status(200).json(localizedFlow);
  } catch (error) {
    next(error);
  }
};