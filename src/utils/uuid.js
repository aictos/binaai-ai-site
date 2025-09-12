import { randomBytes } from 'crypto';

/**
 * UUID v4 generator and validation utilities
 */

/**
 * Generate a UUID v4
 */
export function generateUUID() {
  const bytes = randomBytes(16);

  // Set version (4) and variant bits
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // Version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // Variant 10

  const hex = bytes.toString('hex');

  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join('-');
}

/**
 * Validate UUID v4 format
 */
export function isValidUUID(uuid) {
  if (typeof uuid !== 'string') {
    return false;
  }

  // UUID v4 regex pattern
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  return uuidRegex.test(uuid);
}

/**
 * Normalize UUID to lowercase
 */
export function normalizeUUID(uuid) {
  if (!isValidUUID(uuid)) {
    throw new Error('Invalid UUID format');
  }

  return uuid.toLowerCase();
}
