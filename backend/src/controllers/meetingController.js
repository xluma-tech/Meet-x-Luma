const Meeting = require('../models/Meeting');
const User = require('../models/User');
const { sendSuccess, sendError } = require('../utils/responseHelper');

/**
 * Create a new meeting
 */
const createMeeting = async (req, res) => {
  try {
    const { auth0Id, title, description, scheduledTime } = req.body;

    if (!auth0Id || !title) {
      return sendError(res, 'auth0Id and title are required', 400);
    }

    // Get user from database
    const user = await User.findByAuth0Id(auth0Id);

    if (!user) {
      return sendError(res, 'User not found', 404);
    }

    // Create meeting with user as host
    const meeting = await Meeting.create({
      title,
      description,
      scheduledTime,
      hostId: user._id.toString(),
      hostAuth0Id: user.auth0Id,
    });

    return sendSuccess(res, {
      meetingId: meeting._id,
      message: 'Meeting created successfully',
    }, 201);
  } catch (error) {
    console.error('Error creating meeting:', error);
    return sendError(res, 'Failed to create meeting', 500);
  }
};

/**
 * Get meeting by ID
 */
const getMeeting = async (req, res) => {
  try {
    const { meetingId } = req.params;

    const meeting = await Meeting.findById(meetingId);

    if (!meeting) {
      return sendError(res, 'Meeting not found', 404);
    }

    return sendSuccess(res, meeting);
  } catch (error) {
    console.error('Error fetching meeting:', error);
    return sendError(res, 'Failed to fetch meeting', 500);
  }
};

/**
 * Get meetings by host
 */
const getMeetingsByHost = async (req, res) => {
  try {
    const { auth0Id } = req.params;

    const meetings = await Meeting.findByHostAuth0Id(auth0Id);

    return sendSuccess(res, meetings);
  } catch (error) {
    console.error('Error fetching meetings:', error);
    return sendError(res, 'Failed to fetch meetings', 500);
  }
};

/**
 * Assign cohost to a meeting
 */
const assignCohost = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const { hostAuth0Id, participantAuth0Id } = req.body;

    if (!hostAuth0Id || !participantAuth0Id) {
      return sendError(res, 'hostAuth0Id and participantAuth0Id are required', 400);
    }

    // Get meeting
    const meeting = await Meeting.findById(meetingId);

    if (!meeting) {
      return sendError(res, 'Meeting not found', 404);
    }

    // Check if current user is host
    if (meeting.hostAuth0Id !== hostAuth0Id) {
      return sendError(res, 'Only the host can assign cohosts', 403);
    }

    // Update participant role to cohost
    await Meeting.updateParticipantRole(meetingId, participantAuth0Id, 'cohost');

    return sendSuccess(res, {
      message: 'Cohost assigned successfully',
    });
  } catch (error) {
    console.error('Error assigning cohost:', error);
    return sendError(res, 'Failed to assign cohost', 500);
  }
};

/**
 * Add participant to meeting
 */
const addParticipant = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const { auth0Id, name, role = 'participant' } = req.body;

    if (!auth0Id && !name) {
      return sendError(res, 'auth0Id or name is required', 400);
    }

    const meeting = await Meeting.findById(meetingId);

    if (!meeting) {
      return sendError(res, 'Meeting not found', 404);
    }

    let participant;

    if (auth0Id) {
      // Authenticated user
      const user = await User.findByAuth0Id(auth0Id);
      if (!user) {
        return sendError(res, 'User not found', 404);
      }

      participant = {
        userId: user._id,
        auth0Id: user.auth0Id,
        name: user.name,
        role,
        joinedAt: new Date(),
      };
    } else {
      // Guest user
      participant = {
        name,
        role: 'guest',
        joinedAt: new Date(),
      };
    }

    await Meeting.addParticipant(meetingId, participant);

    return sendSuccess(res, {
      message: 'Participant added successfully',
    });
  } catch (error) {
    console.error('Error adding participant:', error);
    return sendError(res, 'Failed to add participant', 500);
  }
};

/**
 * Remove participant from meeting
 */
const removeParticipant = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const { hostAuth0Id, participantAuth0Id } = req.body;

    if (!hostAuth0Id || !participantAuth0Id) {
      return sendError(res, 'hostAuth0Id and participantAuth0Id are required', 400);
    }

    const meeting = await Meeting.findById(meetingId);

    if (!meeting) {
      return sendError(res, 'Meeting not found', 404);
    }

    // Check if current user is host or cohost
    const currentParticipant = meeting.participants.find(
      (p) => p.auth0Id === hostAuth0Id
    );

    if (!currentParticipant || !['host', 'cohost'].includes(currentParticipant.role)) {
      return sendError(res, 'Only host or cohost can remove participants', 403);
    }

    await Meeting.removeParticipant(meetingId, participantAuth0Id);

    return sendSuccess(res, {
      message: 'Participant removed successfully',
    });
  } catch (error) {
    console.error('Error removing participant:', error);
    return sendError(res, 'Failed to remove participant', 500);
  }
};

/**
 * Update meeting status
 */
const updateMeetingStatus = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const { status } = req.body;

    const validStatuses = ['scheduled', 'active', 'ended'];
    if (!validStatuses.includes(status)) {
      return sendError(res, 'Invalid status', 400);
    }

    await Meeting.updateStatus(meetingId, status);

    return sendSuccess(res, {
      message: 'Meeting status updated successfully',
    });
  } catch (error) {
    console.error('Error updating meeting status:', error);
    return sendError(res, 'Failed to update meeting status', 500);
  }
};

module.exports = {
  createMeeting,
  getMeeting,
  getMeetingsByHost,
  assignCohost,
  addParticipant,
  removeParticipant,
  updateMeetingStatus,
};
