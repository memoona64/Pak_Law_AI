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
    const { lang } = req.query; // 'en', 'ur', 'roman_ur' ya undefined
    const flows = await Flow.find({}, 'slug title situation').lean();

    // Agar query mein lang na ho to raw full structure return karein
    if (!lang) {
      return res.status(200).json(flows);
    }

    // Direct requested language filter karein
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
    const { lang } = req.query; // 'en', 'ur', 'roman_ur' ya undefined

    const flow = await Flow.findOne({ slug: slug.toLowerCase() }).lean();

    if (!flow) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Guided procedure flow with slug '${slug}' was not found.`
      });
    }

    // Agar query mein lang na ho to raw full structure return karein
    if (!lang) {
      return res.status(200).json(flow);
    }

    // Requested language ke mutabiq object format karein
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