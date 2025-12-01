/**
 * 3D Model socket handlers
 */
const { SOCKET_EVENTS, MESSAGES } = require('../config/constants');

/**
 * Check if user is authorized to control model
 */
const isAuthorizedController = (model, socketId) => {
  if (!model) return false;
  const isOwner = model.uploaderId === socketId;
  const isAllowed = model.allowedControllers && model.allowedControllers.includes(socketId);
  return isOwner || isAllowed;
};

/**
 * Initialize model-specific socket handlers
 */
const initializeModelHandlers = (socket, io, roomModels) => {
  // Model publish handler
  socket.on(SOCKET_EVENTS.MODEL_PUBLISH, ({ roomId, modelData }) => {
    try {
      // Create canonical model record for the room
      const modelRecord = {
        ...modelData,
        uploaderId: socket.id,
        publishedAt: Date.now(),
        seq: 0,
        allowedControllers: []
      };
      
      roomModels.set(roomId, modelRecord);
      
      // Broadcast to all participants in the room
      io.to(roomId).emit(SOCKET_EVENTS.MODEL_PUBLISHED, {
        modelId: modelRecord.modelId,
        url: modelRecord.url,
        uploaderId: socket.id,
        uploaderName: modelRecord.uploaderName,
        allowedControllers: modelRecord.allowedControllers,
        metadata: modelRecord
      });
      
      console.log(`Model ${modelRecord.modelId} published to room ${roomId} by ${socket.id}`);
    } catch (err) {
      console.error('Error publishing model:', err);
      socket.emit(SOCKET_EVENTS.ERROR, { message: MESSAGES.ERROR.FAILED_TO_UPLOAD });
    }
  });

  // Model unpublish handler
  socket.on(SOCKET_EVENTS.MODEL_UNPUBLISH, ({ roomId }) => {
    try {
      const model = roomModels.get(roomId);
      
      // Verify the sender is the model owner
      if (model && model.uploaderId === socket.id) {
        roomModels.delete(roomId);
        io.to(roomId).emit(SOCKET_EVENTS.MODEL_UNPUBLISHED, { modelId: model.modelId });
        console.log(`Model ${model.modelId} unpublished from room ${roomId}`);
      }
    } catch (err) {
      console.error('Error unpublishing model:', err);
    }
  });

  // Model control handler
  socket.on(SOCKET_EVENTS.MODEL_CONTROL, ({ roomId, modelId, seq, ts, payload }) => {
    try {
      const model = roomModels.get(roomId);
      
      // Verify authorization
      if (!isAuthorizedController(model, socket.id)) {
        console.log(`${MESSAGES.ERROR.UNAUTHORIZED_CONTROL} from ${socket.id} for model ${modelId}`);
        return;
      }
      
      // Update sequence number
      if (seq > model.seq) {
        model.seq = seq;
      }
      
      // Broadcast control event to ALL participants in the room
      io.to(roomId).emit(SOCKET_EVENTS.MODEL_CONTROL, {
        modelId,
        seq,
        ts,
        payload,
        uploaderId: socket.id
      });
    } catch (err) {
      console.error('Error handling model control:', err);
    }
  });

  // Model camera handler
  socket.on(SOCKET_EVENTS.MODEL_CAMERA, ({ roomId, modelId, camera }) => {
    try {
      const model = roomModels.get(roomId);
      
      // Verify authorization
      if (!isAuthorizedController(model, socket.id)) {
        console.log(`Unauthorized camera event from ${socket.id} for model ${modelId}`);
        return;
      }
      
      // Broadcast camera state to ALL participants in the room
      io.to(roomId).emit(SOCKET_EVENTS.MODEL_CAMERA, {
        modelId,
        camera
      });
    } catch (err) {
      console.error('Error handling model camera:', err);
    }
  });

  // Model permissions handler
  socket.on(SOCKET_EVENTS.MODEL_PERMISSIONS, ({ roomId, modelId, allowedControllers }) => {
    try {
      const model = roomModels.get(roomId);
      
      // Verify the sender is the model owner
      if (!model || model.uploaderId !== socket.id) {
        console.log(`${MESSAGES.ERROR.UNAUTHORIZED_PERMISSION} from ${socket.id} for model ${modelId}`);
        return;
      }
      
      // Update allowed controllers
      model.allowedControllers = allowedControllers;
      
      // Broadcast permission changes to ALL participants
      io.to(roomId).emit(SOCKET_EVENTS.MODEL_PERMISSIONS, {
        modelId,
        allowedControllers
      });
      
      console.log(`Permissions updated for model ${modelId}:`, allowedControllers);
    } catch (err) {
      console.error('Error handling model permissions:', err);
    }
  });
};

module.exports = initializeModelHandlers;
