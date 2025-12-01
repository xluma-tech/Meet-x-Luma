/**
 * Response helper utilities
 */
const { HTTP_STATUS } = require('../config/constants');

/**
 * Send success response
 * @param {Object} res - Express response object
 * @param {*} data - Response data
 * @param {number} statusCode - HTTP status code
 */
const sendSuccess = (res, data, statusCode = HTTP_STATUS.OK) => {
  res.status(statusCode).json(data);
};

/**
 * Send error response
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code
 * @param {Object} details - Additional error details
 */
const sendError = (res, message, statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR, details = {}) => {
  res.status(statusCode).json({
    error: message,
    ...details
  });
};

module.exports = {
  sendSuccess,
  sendError
};
