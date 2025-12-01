/**
 * CORS middleware configuration
 */
const config = require('../config/environment');

/**
 * Get CORS options
 */
const getCorsOptions = () => {
  return {
    origin: config.cors.origin,
    credentials: config.cors.credentials,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  };
};

module.exports = {
  getCorsOptions
};
