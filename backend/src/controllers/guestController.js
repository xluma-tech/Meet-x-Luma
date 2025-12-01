const GuestSession = require('../models/GuestSession');
const Meeting = require('../models/Meeting');
const { sendSuccess, sendError } = require('../utils/responseHelper');
const { nanoid } = require('nanoid');

/**
 * Create guest session
 */
const createGuestSession = async (req, res) => {
  try {
    const { name, meetingId } = req.body;

    if (!name || !meetingId) {
      return sendError(res, 'Name and meeting ID are required', 400);
    }

    // Verify meeting exists
    const meeting = await Meeting.findById(meetingId);

    if (!meeting) {
      return sendError(res, 'Meeting not found', 404);
    }

    // Create guest session
    const guestId = nanoid();
    const guestSession = await GuestSession.create({
      guestId,
      name,
      meetingId,
    });

    // Add guest to meeting participants
    await Meeting.addParticipant(meetingId, {
      guestId,
      name,
      role: 'guest',
      joinedAt: new Date(),
    });

    return sendSuccess(res, {
      guestId,
      name,
      role: 'guest',
      message: 'Guest session created successfully',
    }, 201);
  } catch (error) {
    console.error('Error creating guest session:', error);
    return sendError(res, 'Failed to create guest session', 500);
  }
};

/**
 * Get guest session
 */
const getGuestSession = async (req, res) => {
  try {
    const { guestId } = req.params;

    const session = await GuestSession.findByGuestId(guestId);

    if (!session) {
      return sendError(res, 'Guest session not found', 404);
    }

    return sendSuccess(res, session);
  } catch (error) {
    console.error('Error fetching guest session:', error);
    return sendError(res, 'Failed to fetch guest session', 500);
  }
};

module.exports = {
  createGuestSession,
  getGuestSession,
};
