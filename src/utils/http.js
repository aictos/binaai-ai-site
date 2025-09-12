/**
 * HTTP utilities for error handling and response formatting
 */

/**
 * Create a custom error with status code
 */
export class HttpError extends Error {
  constructor(status, message, code = null) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
  }
}

/**
 * Create a standardized error object
 */
export function createError(status, message, code = null) {
  return new HttpError(status, message, code);
}

/**
 * Standard error responses
 */
export const errors = {
  badRequest: (message = 'Bad Request') => createError(400, message, 'BAD_REQUEST'),
  unauthorized: (message = 'Unauthorized') => createError(401, message, 'UNAUTHORIZED'),
  forbidden: (message = 'Forbidden') => createError(403, message, 'FORBIDDEN'),
  notFound: (message = 'Not Found') => createError(404, message, 'NOT_FOUND'),
  conflict: (message = 'Conflict') => createError(409, message, 'CONFLICT'),
  unprocessable: (message = 'Unprocessable Entity') =>
    createError(422, message, 'UNPROCESSABLE_ENTITY'),
  tooManyRequests: (message = 'Too Many Requests') =>
    createError(429, message, 'TOO_MANY_REQUESTS'),
  internal: (message = 'Internal Server Error') =>
    createError(500, message, 'INTERNAL_SERVER_ERROR'),
  notImplemented: (message = 'Not Implemented') => createError(501, message, 'NOT_IMPLEMENTED'),
  serviceUnavailable: (message = 'Service Unavailable') =>
    createError(503, message, 'SERVICE_UNAVAILABLE'),
};

/**
 * Success response formatter
 */
export function success(data = null, message = null) {
  const response = { ok: true };

  if (data !== null) {
    response.data = data;
  }

  if (message) {
    response.message = message;
  }

  return response;
}

/**
 * Check if error is operational (expected) vs programming error
 */
export function isOperationalError(error) {
  return error instanceof HttpError;
}
