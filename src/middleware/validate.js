import { errors } from '../utils/http.js';
import { isValidUUID } from '../utils/uuid.js';

/**
 * Validation middleware for request payloads
 */

/**
 * Validate that a field is a non-empty string
 */
function validateString(value, fieldName, required = true) {
  if (required && (value === undefined || value === null)) {
    throw errors.badRequest(`${fieldName} is required`);
  }

  if (value !== undefined && value !== null) {
    if (typeof value !== 'string') {
      throw errors.badRequest(`${fieldName} must be a string`);
    }

    if (required && value.trim().length === 0) {
      throw errors.badRequest(`${fieldName} cannot be empty`);
    }
  }

  return value?.trim();
}

/**
 * Validate email format
 */
function validateEmail(email, required = true) {
  const trimmedEmail = validateString(email, 'email', required);

  if (trimmedEmail) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      throw errors.badRequest('email must be a valid email address');
    }
  }

  return trimmedEmail;
}

/**
 * Validate UUID format
 */
function validateUUID(uuid, fieldName = 'client_id') {
  const trimmedUUID = validateString(uuid, fieldName, true);

  if (!isValidUUID(trimmedUUID)) {
    throw errors.badRequest(`${fieldName} must be a valid UUID v4`);
  }

  return trimmedUUID.toLowerCase();
}

/**
 * Validation middleware for draft idea submissions
 */
export function validateDraftSubmission(req, res, next) {
  try {
    const { client_id, idea, sourcePath } = req.body;

    // Validate required fields
    const validatedData = {
      client_id: validateUUID(client_id),
      idea: validateString(idea, 'idea', true),
      sourcePath: validateString(sourcePath, 'sourcePath', false) || null,
      user_agent: req.get('User-Agent') || null,
    };

    // Additional idea validation
    if (validatedData.idea.length < 10) {
      throw errors.badRequest('idea must be at least 10 characters long');
    }

    if (validatedData.idea.length > 5000) {
      throw errors.badRequest('idea must be less than 5000 characters');
    }

    // Store validated data for use in controller
    req.validatedData = validatedData;

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Validation middleware for waitlist submissions
 */
export function validateWaitlistSubmission(req, res, next) {
  try {
    const { client_id, idea, name, email, sourcePath } = req.body;

    // Validate all fields
    const validatedData = {
      client_id: validateUUID(client_id),
      idea: validateString(idea, 'idea', true),
      name: validateString(name, 'name', true),
      email: validateEmail(email, true),
      sourcePath: validateString(sourcePath, 'sourcePath', false) || null,
      user_agent: req.get('User-Agent') || null,
    };

    // Additional validation
    if (validatedData.idea.length < 10) {
      throw errors.badRequest('idea must be at least 10 characters long');
    }

    if (validatedData.idea.length > 5000) {
      throw errors.badRequest('idea must be less than 5000 characters');
    }

    if (validatedData.name.length < 2) {
      throw errors.badRequest('name must be at least 2 characters long');
    }

    if (validatedData.name.length > 100) {
      throw errors.badRequest('name must be less than 100 characters');
    }

    // Store validated data for use in controller
    req.validatedData = validatedData;

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Generic validation helper for common patterns
 */
export const validate = {
  string: validateString,
  email: validateEmail,
  uuid: validateUUID,
};
