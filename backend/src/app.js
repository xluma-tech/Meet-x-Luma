/**
 * Express application setup
 */
const express = require('express');
const cors = require('cors');
const config = require('./config/environment');
const routes = require('./routes');
const { errorHandler, notFoundHandler } = require('./middleware/errorMiddleware');
const { ensureDirectories, initializeEventsFile } = require('./utils/fileSystem');

/**
 * Create and configure Express app
 */
const createApp = () => {
  const app = express();

  // Ensure data directories exist
  ensureDirectories();
  initializeEventsFile();

  // Middleware
  app.use(cors({
    origin: config.cors.origin,
    credentials: config.cors.credentials
  }));
  app.use(express.json());

  // Routes
  app.use('/', routes);

  // Error handling
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};

module.exports = createApp;
