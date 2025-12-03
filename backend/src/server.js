/**
 * Main server entry point
 */
const http = require('http');
const createApp = require('./app');
const config = require('./config/environment');
const { createSocketServer } = require('./socket/socketConfig');
const { initializeSocketHandlers } = require('./socket/socketHandlers');
const { connectDatabase, closeDatabase } = require('./config/database');
const { connectRedis, closeRedis } = require('./config/redis');
const meetingCleanupService = require('./services/meetingCleanupService');

// Initialize database connection
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDatabase();

    // Connect to Redis
    connectRedis();

    // Create Express app
    const app = createApp();

    // Create HTTP server
    const httpServer = http.createServer(app);

    // Create Socket.IO server
    const io = createSocketServer(httpServer);

    // Store rooms and their participants
    const rooms = new Map();

    // Store 3D models per room
    const roomModels = new Map();

    // Make rooms and io available to routes
    app.locals.rooms = rooms;
    app.locals.roomModels = roomModels;
    app.locals.io = io;

    // Initialize socket handlers
    initializeSocketHandlers(io, rooms, roomModels);

    // Start server
    httpServer.listen(config.server.port, config.server.host, () => {
      console.log(`✓ Backend server running on http://${config.server.host}:${config.server.port}`);
      console.log(`✓ Environment: ${config.server.nodeEnv}`);
      console.log(`✓ CORS Origin: ${config.cors.origin}`);
    });

    // Start meeting cleanup service
    meetingCleanupService.start();

    return httpServer;
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
const httpServer = startServer();

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing server...');
  meetingCleanupService.stop();
  const server = await httpServer;
  server.close(async () => {
    await closeDatabase();
    await closeRedis();
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, closing server...');
  meetingCleanupService.stop();
  const server = await httpServer;
  server.close(async () => {
    await closeDatabase();
    await closeRedis();
    console.log('Server closed');
    process.exit(0);
  });
});
