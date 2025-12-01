/**
 * Error handling middleware
 */
const multer = require('multer');
const config = require('../config/environment');
const { HTTP_STATUS } = require('../config/constants');

/**
 * Global error handler
 */
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Multer errors
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: 'File too large',
        message: `Maximum file size is ${config.upload.maxFileSize / (1024 * 1024)}MB`
      });
    }
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      error: 'File upload error',
      message: err.message
    });
  }

  // Default error
  res.status(err.status || HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
    error: err.message || 'Internal server error',
    ...(config.server.nodeEnv === 'development' && { stack: err.stack })
  });
};

/**
 * 404 handler
 */
const notFoundHandler = (req, res) => {
  res.status(HTTP_STATUS.NOT_FOUND).json({
    error: 'Route not found',
    path: req.originalUrl
  });
};

module.exports = {
  errorHandler,
  notFoundHandler
};
