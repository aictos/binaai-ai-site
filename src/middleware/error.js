import { logger } from '../config/logger.js';
import { isOperationalError } from '../utils/http.js';

/**
 * Centralized error handling middleware
 * Must be the last middleware in the chain
 */
export default function errorHandler(err, req, res, next) {
  // If response was already sent, delegate to Express default error handler
  if (res.headersSent) {
    return next(err);
  }

  let status = 500;
  let message = 'Internal Server Error';
  let code = 'INTERNAL_SERVER_ERROR';

  // Handle known HTTP errors
  if (isOperationalError(err)) {
    status = err.status;
    message = err.message;
    code = err.code;
  }
  // Handle validation errors from other libraries
  else if (err.name === 'ValidationError') {
    status = 400;
    message = err.message;
    code = 'VALIDATION_ERROR';
  }
  // Handle database constraint errors
  else if (err.code === '23505') {
    // PostgreSQL unique violation
    status = 409;
    message = 'Resource already exists';
    code = 'DUPLICATE_RESOURCE';
  }
  // Handle database connection errors
  else if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
    status = 503;
    message = 'Service temporarily unavailable';
    code = 'SERVICE_UNAVAILABLE';
  }
  // Handle JSON parsing errors
  else if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    status = 400;
    message = 'Invalid JSON in request body';
    code = 'INVALID_JSON';
  }

  // Log the error with appropriate level
  const logData = {
    error: {
      name: err.name,
      message: err.message,
      stack: err.stack,
      code: err.code,
    },
    request: {
      method: req.method,
      url: req.url,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
    },
    response: {
      status,
      code,
    },
  };

  if (status >= 500) {
    logger.error(logData, 'Server error occurred');
  } else if (status >= 400) {
    logger.warn(logData, 'Client error occurred');
  }

  // Send error response
  const errorResponse = {
    error: message,
    code,
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
      details: err,
    }),
  };

  res.status(status).json(errorResponse);
}
