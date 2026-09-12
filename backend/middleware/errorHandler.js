/**
 * Global Error Handling Middleware
 * Centralizes error responses across the Express application to prevent unhandled
 * exceptions, stack trace leakage, or inconsistent error contracts sent to the client.
 */

/**
 * Handles express errors globally.
 * 
 * @param {Error} err - The error object thrown or passed down via next()
 * @param {import('express').Request} req - Express Request object
 * @param {import('express').Response} res - Express Response object
 * @param {import('express').NextFunction} next - Express Next function
 */
const errorHandler = (err, req, res, next) => {
  // Some call sites set `.status` (e.g. services/ragService.js), others
  // `.statusCode` — accept either instead of only one.
  const statusCode = err.statusCode || err.status || (res.statusCode === 200 ? 500 : res.statusCode);

  console.error(`[Server Error] Path: ${req.path} | Error: ${err.message}`);

  // A 4xx here means our own code deliberately chose this status and
  // message for the client (a validation-type issue). A 5xx reaching this
  // point is more likely an unexpected/internal failure (a raw database or
  // driver error, say) whose message can contain details — index names,
  // field values, file paths — that shouldn't reach an end user in
  // production. The real message is always logged above regardless.
  const isClientFacingStatus = statusCode >= 400 && statusCode < 500;
  const canShowRealMessage =
    process.env.NODE_ENV !== 'production' || isClientFacingStatus;

  res.status(statusCode).json({
    error: {
      message: canShowRealMessage
        ? (err.message || 'An internal server error occurred.')
        : 'An internal server error occurred.',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
};

module.exports = errorHandler;