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
  const statusCode = err.statusCode || res.statusCode === 200 ? 500 : res.statusCode;

  console.error(`[Server Error] Path: ${req.path} | Error: ${err.message}`);

  res.status(statusCode).json({
    error: {
      message: err.message || 'An internal server error occurred.',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
};

module.exports = errorHandler;