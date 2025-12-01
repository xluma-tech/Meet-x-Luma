/**
 * Room routes
 */
const express = require('express');
const router = express.Router();
const roomController = require('../controllers/roomController');

router.get('/:roomId', roomController.getRoomInfo);
router.get('/:roomId/model', roomController.getRoomModel);

module.exports = router;
