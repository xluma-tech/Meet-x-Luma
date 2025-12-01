/**
 * Model routes
 */
const express = require('express');
const router = express.Router();
const modelController = require('../controllers/modelController');
const { uploadMiddleware } = require('../middleware/uploadMiddleware');

router.post('/upload', uploadMiddleware, modelController.uploadModel);
router.get('/:modelId', modelController.getModel);

module.exports = router;
