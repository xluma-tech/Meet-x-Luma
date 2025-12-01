/**
 * Health check controller
 */
const { sendSuccess } = require('../utils/responseHelper');

/**
 * Health check endpoint
 */
const healthCheck = (req, res) => {
  const { rooms, io } = req.app.locals;
  
  sendSuccess(res, {
    status: 'ok',
    timestamp: new Date().toISOString(),
    rooms: rooms.size,
    connections: io.engine.clientsCount
  });
};

module.exports = {
  healthCheck
};
