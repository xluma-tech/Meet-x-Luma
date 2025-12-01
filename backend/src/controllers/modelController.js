/**
 * Model controller
 */
const path = require('path');
const { MODELS_DIR, deleteFile, fileExists } = require('../utils/fileSystem');
const { sendSuccess, sendError } = require('../utils/responseHelper');
const { MESSAGES, HTTP_STATUS } = require('../config/constants');

/**
 * Upload 3D model
 */
const uploadModel = (req, res) => {
  try {
    if (!req.file) {
      return sendError(res, MESSAGES.ERROR.NO_FILE_UPLOADED, HTTP_STATUS.BAD_REQUEST);
    }

    const { roomId, uploaderId, uploaderName } = req.body;
    
    if (!roomId || !uploaderId) {
      deleteFile(req.file.path);
      return sendError(
        res, 
        MESSAGES.ERROR.MISSING_REQUIRED_FIELDS, 
        HTTP_STATUS.BAD_REQUEST,
        { required: ['roomId', 'uploaderId'] }
      );
    }

    const modelId = req.file.filename;
    const modelUrl = `/api/models/${modelId}`;
    
    const modelData = {
      modelId,
      url: modelUrl,
      uploaderId,
      uploaderName: uploaderName || 'Unknown',
      filename: req.file.originalname,
      size: req.file.size,
      uploadedAt: new Date().toISOString(),
      seq: 0
    };

    sendSuccess(res, modelData, HTTP_STATUS.CREATED);
  } catch (error) {
    console.error('Error uploading model:', error);
    sendError(res, MESSAGES.ERROR.FAILED_TO_UPLOAD, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
};

/**
 * Serve 3D model file
 */
const getModel = (req, res) => {
  const { modelId } = req.params;
  const modelPath = path.join(MODELS_DIR, modelId);
  
  if (!fileExists(modelPath)) {
    return sendError(res, MESSAGES.ERROR.MODEL_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
  }
  
  // Set appropriate headers for 3D models
  const ext = path.extname(modelId).toLowerCase();
  if (ext === '.glb') {
    res.setHeader('Content-Type', 'model/gltf-binary');
  } else if (ext === '.gltf') {
    res.setHeader('Content-Type', 'model/gltf+json');
  }
  
  res.sendFile(modelPath);
};

module.exports = {
  uploadModel,
  getModel
};
