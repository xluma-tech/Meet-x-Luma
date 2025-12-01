/**
 * Room controller
 */
const { sendSuccess } = require('../utils/responseHelper');

/**
 * Get room information
 */
const getRoomInfo = (req, res) => {
  const { roomId } = req.params;
  const { rooms } = req.app.locals;
  
  const room = rooms.get(roomId);
  
  if (!room) {
    return sendSuccess(res, { exists: false, participants: 0 });
  }
  
  sendSuccess(res, { 
    exists: true, 
    participants: room.size 
  });
};

/**
 * Get current model for a room
 */
const getRoomModel = (req, res) => {
  const { roomId } = req.params;
  const { roomModels } = req.app.locals;
  
  const model = roomModels.get(roomId);
  
  if (!model) {
    return sendSuccess(res, { model: null });
  }
  
  sendSuccess(res, { model });
};

module.exports = {
  getRoomInfo,
  getRoomModel
};
