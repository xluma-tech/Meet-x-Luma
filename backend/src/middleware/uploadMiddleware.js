/**
 * File upload middleware
 */
const multer = require('multer');
const path = require('path');
const { MODELS_DIR } = require('../utils/fileSystem');
const { FILE_UPLOAD, MESSAGES } = require('../config/constants');
const { generateUniqueFilename } = require('../utils/idGenerator');
const config = require('../config/environment');

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, MODELS_DIR);
  },
  filename: (req, file, cb) => {
    cb(null, generateUniqueFilename(file.originalname));
  }
});

// Configure multer upload
const upload = multer({
  storage: storage,
  limits: { fileSize: config.upload.maxFileSize },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (FILE_UPLOAD.ALLOWED_EXTENSIONS.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(MESSAGES.ERROR.INVALID_FILE_TYPE));
    }
  }
});

const uploadMiddleware = upload.single('model');

module.exports = {
  uploadMiddleware
};
