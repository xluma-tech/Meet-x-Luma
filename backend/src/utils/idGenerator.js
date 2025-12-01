/**
 * ID generation utilities
 */

/**
 * Generate a random alphanumeric ID
 * @param {number} length - Length of ID to generate
 * @returns {string} Generated ID
 */
const generateId = (length = 10) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < length; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
};

/**
 * Generate a unique filename with timestamp
 * @param {string} originalName - Original filename
 * @returns {string} Unique filename
 */
const generateUniqueFilename = (originalName) => {
  const path = require('path');
  const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
  return uniqueSuffix + path.extname(originalName);
};

module.exports = {
  generateId,
  generateUniqueFilename
};
