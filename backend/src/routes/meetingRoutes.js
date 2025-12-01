const express = require('express');
const router = express.Router();
const meetingController = require('../controllers/meetingController');

// Create meeting
router.post('/', meetingController.createMeeting);

// Get meeting by ID
router.get('/:meetingId', meetingController.getMeeting);

// Get meetings by host
router.get('/host/:auth0Id', meetingController.getMeetingsByHost);

// Assign cohost
router.post('/:meetingId/cohost', meetingController.assignCohost);

// Add participant
router.post('/:meetingId/participant', meetingController.addParticipant);

// Remove participant
router.delete('/:meetingId/participant', meetingController.removeParticipant);

// Update meeting status
router.put('/:meetingId/status', meetingController.updateMeetingStatus);

module.exports = router;
