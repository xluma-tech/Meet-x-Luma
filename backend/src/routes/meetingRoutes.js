const express = require('express');
const router = express.Router();
const meetingController = require('../controllers/meetingController');

// Create meeting (authenticated user)
router.post('/', meetingController.createMeeting);

// Create guest meeting (no authentication)
router.post('/guest', meetingController.createGuestMeeting);

// Get meeting by ID or code
router.get('/:meetingId', meetingController.getMeeting);

// Get meetings by host (authenticated)
router.get('/host/:auth0Id', meetingController.getMeetingsByHost);

// Get meetings by guest host ID
router.get('/guest/:guestHostId', meetingController.getGuestMeetings);

// Assign cohost
router.post('/:meetingId/cohost', meetingController.assignCohost);

// Remove cohost
router.delete('/:meetingId/cohost', meetingController.removeCohost);

// Invite participant by email
router.post('/:meetingId/invite', meetingController.inviteParticipant);

// Add participant (when joining)
router.post('/:meetingId/participant', meetingController.addParticipant);

// Remove participant
router.delete('/:meetingId/participant', meetingController.removeParticipant);

// Update meeting status
router.put('/:meetingId/status', meetingController.updateMeetingStatus);

module.exports = router;
