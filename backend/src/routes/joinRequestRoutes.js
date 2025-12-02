const express = require('express');
const router = express.Router();
const {
  createJoinRequest,
  getJoinRequests,
  acceptJoinRequest,
  rejectJoinRequest,
} = require('../controllers/joinRequestController');

// Create a join request
router.post('/:meetingCode', createJoinRequest);

// Get pending join requests for a meeting
router.get('/:meetingCode', getJoinRequests);

// Accept a join request
router.post('/:requestId/accept', acceptJoinRequest);

// Reject a join request
router.post('/:requestId/reject', rejectJoinRequest);

module.exports = router;
