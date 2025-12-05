/**
 * Room routes
 */
const express = require('express');
const router = express.Router();
const roomController = require('../controllers/roomController');

// P2P mode routes (legacy)
router.get('/:roomId', roomController.getRoomInfo);
router.get('/:roomId/model', roomController.getRoomModel);

// SFU mode routes (LiveKit)
router.post('/:roomId/join', roomController.joinRoomSFU);
router.get('/:roomId/info', roomController.getRoomInfoSFU);
router.post('/:roomId/end', roomController.endMeetingSFU);

module.exports = router;
