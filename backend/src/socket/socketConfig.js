/**
 * Socket.IO configuration
 */
const { Server } = require('socket.io');
const config = require('../config/environment');

/**
 * Create and configure Socket.IO server
 */
const createSocketServer = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: config.cors.origin,
      methods: ['GET', 'POST'],
      credentials: config.cors.credentials
    },
    transports: ['websocket', 'polling'],
    pingTimeout: config.socket.pingTimeout,
    pingInterval: config.socket.pingInterval,
  });

  return io;
};

module.exports = {
  createSocketServer
};
