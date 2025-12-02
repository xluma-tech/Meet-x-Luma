const Meeting = require('../models/Meeting');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { sendSuccess, sendError } = require('../utils/responseHelper');
const { nanoid } = require('nanoid');
const { sendMeetingInvitation } = require('../services/emailService');

/**
 * Create a new meeting (authenticated user)
 */
const createMeeting = async (req, res) => {
  try {
    const { auth0Id, title, description, scheduledTime, type = 'public' } = req.body;

    if (!auth0Id || !title) {
      return sendError(res, 'auth0Id and title are required', 400);
    }

    // Get user from database
    const user = await User.findByAuth0Id(auth0Id);

    if (!user) {
      return sendError(res, 'User not found. Please sign in first.', 404);
    }

    // Create meeting with user as host
    const meeting = await Meeting.create({
      title,
      description,
      scheduledTime,
      type, // 'public' or 'private'
      hostId: user._id.toString(),
      hostAuth0Id: user.auth0Id,
      hostName: user.name,
      hostEmail: user.email,
      isGuestMeeting: false,
    });

    return sendSuccess(res, {
      meetingId: meeting._id,
      meetingCode: meeting.meetingCode,
      message: 'Meeting created successfully',
      meeting: {
        _id: meeting._id,
        meetingCode: meeting.meetingCode,
        title: meeting.title,
        description: meeting.description,
        type: meeting.type,
        scheduledTime: meeting.scheduledTime,
        hostName: meeting.hostName,
      },
    }, 201);
  } catch (error) {
    console.error('Error creating meeting:', error);
    return sendError(res, 'Failed to create meeting', 500);
  }
};

/**
 * Create a guest meeting (no authentication required)
 */
const createGuestMeeting = async (req, res) => {
  try {
    const { guestName, title, description } = req.body;

    if (!guestName || !title) {
      return sendError(res, 'guestName and title are required', 400);
    }

    const guestHostId = nanoid(16);

    // Create meeting with guest as host
    const meeting = await Meeting.create({
      title,
      description,
      type: 'public', // Guest meetings are always public
      hostName: guestName,
      guestHostId,
      isGuestMeeting: true,
    });

    return sendSuccess(res, {
      meetingId: meeting._id,
      meetingCode: meeting.meetingCode,
      guestHostId, // Return this so guest can manage their meeting
      message: 'Guest meeting created successfully',
      meeting: {
        _id: meeting._id,
        meetingCode: meeting.meetingCode,
        title: meeting.title,
        description: meeting.description,
        hostName: meeting.hostName,
        isGuestMeeting: true,
      },
    }, 201);
  } catch (error) {
    console.error('Error creating guest meeting:', error);
    return sendError(res, 'Failed to create guest meeting', 500);
  }
};

/**
 * Get meeting by ID or meeting code
 */
const getMeeting = async (req, res) => {
  try {
    const { meetingId } = req.params;

    let meeting;
    
    // Try to find by meeting code first, then by ID
    if (meetingId.length === 10) {
      meeting = await Meeting.findByMeetingCode(meetingId);
    } else {
      meeting = await Meeting.findById(meetingId);
    }

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
 * Get meetings by host (authenticated user)
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
 * Get meetings by guest host ID
 */
const getGuestMeetings = async (req, res) => {
  try {
    const { guestHostId } = req.params;

    const meetings = await Meeting.findByGuestHostId(guestHostId);

    return sendSuccess(res, meetings);
  } catch (error) {
    console.error('Error fetching guest meetings:', error);
    return sendError(res, 'Failed to fetch guest meetings', 500);
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

    // Add to cohosts array
    await Meeting.addCohost(meetingId, participantAuth0Id);

    // Update participant role to cohost
    await Meeting.updateParticipantRole(meetingId, participantAuth0Id, 'cohost');

    // Get participant user info
    const participantUser = await User.findByAuth0Id(participantAuth0Id);

    if (participantUser) {
      // Create notification for the new cohost
      await Notification.create({
        userId: participantUser._id.toString(),
        auth0Id: participantUser.auth0Id,
        email: participantUser.email,
        type: 'cohost_assigned',
        title: 'You are now a co-host',
        message: `You have been assigned as a co-host for "${meeting.title}"`,
        meetingId: meeting._id.toString(),
        meetingCode: meeting.meetingCode,
        data: {
          meetingTitle: meeting.title,
          hostName: meeting.hostName,
        },
      });
    }

    return sendSuccess(res, {
      message: 'Cohost assigned successfully',
    });
  } catch (error) {
    console.error('Error assigning cohost:', error);
    return sendError(res, 'Failed to assign cohost', 500);
  }
};

/**
 * Remove cohost from a meeting
 */
const removeCohost = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const { hostAuth0Id, cohostAuth0Id } = req.body;

    if (!hostAuth0Id || !cohostAuth0Id) {
      return sendError(res, 'hostAuth0Id and cohostAuth0Id are required', 400);
    }

    const meeting = await Meeting.findById(meetingId);

    if (!meeting) {
      return sendError(res, 'Meeting not found', 404);
    }

    // Check if current user is host
    if (meeting.hostAuth0Id !== hostAuth0Id) {
      return sendError(res, 'Only the host can remove cohosts', 403);
    }

    // Remove from cohosts array
    await Meeting.removeCohost(meetingId, cohostAuth0Id);

    // Update participant role back to participant
    await Meeting.updateParticipantRole(meetingId, cohostAuth0Id, 'participant');

    return sendSuccess(res, {
      message: 'Cohost removed successfully',
    });
  } catch (error) {
    console.error('Error removing cohost:', error);
    return sendError(res, 'Failed to remove cohost', 500);
  }
};

/**
 * Invite participant by email
 */
const inviteParticipant = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const { hostAuth0Id, email, message } = req.body;

    if (!hostAuth0Id || !email) {
      return sendError(res, 'hostAuth0Id and email are required', 400);
    }

    const meeting = await Meeting.findById(meetingId);

    if (!meeting) {
      return sendError(res, 'Meeting not found', 404);
    }

    // Check if current user is host or cohost
    const isHost = meeting.hostAuth0Id === hostAuth0Id;
    const isCohost = meeting.cohosts && meeting.cohosts.includes(hostAuth0Id);

    if (!isHost && !isCohost) {
      return sendError(res, 'Only host or cohost can invite participants', 403);
    }

    // Check if already invited
    const existingInvitation = meeting.invitations?.find(inv => inv.email === email);
    if (existingInvitation) {
      return sendError(res, 'User already invited', 400);
    }

    // Add invitation
    const invitation = {
      email,
      invitedBy: hostAuth0Id,
      invitedAt: new Date(),
      status: 'pending', // 'pending', 'accepted', 'declined'
      message: message || '',
      role: req.body.role || 'participant', // Allow specifying role in invitation
    };

    await Meeting.addInvitation(meetingId, invitation);

    // Check if invited user exists in system
    const invitedUser = await User.findByEmail(email);

    if (invitedUser) {
      // Create notification for existing user
      await Notification.create({
        userId: invitedUser._id.toString(),
        auth0Id: invitedUser.auth0Id,
        email: invitedUser.email,
        type: 'meeting_invitation',
        title: 'Meeting Invitation',
        message: `You have been invited to join "${meeting.title}"`,
        meetingId: meeting._id.toString(),
        meetingCode: meeting.meetingCode,
        data: {
          meetingTitle: meeting.title,
          hostName: meeting.hostName,
          invitationMessage: message || '',
        },
      });
    }

    // Get host info
    const host = await User.findByAuth0Id(hostAuth0Id);
    const hostName = host?.name || meeting.hostName;
    const hostEmail = host?.email || 'noreply@lumameet.com';

    // Send email invitation
    try {
      await sendMeetingInvitation({
        to: email,
        hostName,
        hostEmail,
        meetingTitle: meeting.title,
        meetingCode: meeting.meetingCode,
        meetingType: meeting.type,
        scheduledTime: meeting.scheduledTime,
        message: message || '',
      });
    } catch (emailError) {
      console.error('Failed to send email:', emailError);
      // Don't fail the request if email fails
    }

    return sendSuccess(res, {
      message: 'Invitation sent successfully',
      invitation,
    });
  } catch (error) {
    console.error('Error inviting participant:', error);
    return sendError(res, 'Failed to invite participant', 500);
  }
};

/**
 * Add participant to meeting (when joining)
 */
const addParticipant = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const { auth0Id, name, email, role = 'participant' } = req.body;

    if (!auth0Id && !name) {
      return sendError(res, 'auth0Id or name is required', 400);
    }

    const meeting = await Meeting.findById(meetingId);

    if (!meeting) {
      return sendError(res, 'Meeting not found', 404);
    }

    // Check if meeting is private and user is invited
    let invitedRole = role;
    if (meeting.type === 'private' && auth0Id) {
      const user = await User.findByAuth0Id(auth0Id);
      if (user) {
        const invitation = meeting.invitations?.find(inv => inv.email === user.email);
        const isHost = meeting.hostAuth0Id === auth0Id;
        const isCohost = meeting.cohosts?.includes(auth0Id);

        if (!invitation && !isHost && !isCohost) {
          return sendError(res, 'You are not invited to this private meeting', 403);
        }

        // Update invitation status to accepted and get the invited role
        if (invitation) {
          await Meeting.updateInvitationStatus(meetingId, user.email, 'accepted');
          invitedRole = invitation.role || 'participant';
          
          // If invited as cohost, add to cohosts array
          if (invitedRole === 'cohost') {
            await Meeting.addCohost(meetingId, auth0Id);
          }
        }
      }
    }

    // Check if already a participant
    const existingParticipant = meeting.participants?.find(p => 
      (auth0Id && p.auth0Id === auth0Id) || (email && p.email === email)
    );

    if (existingParticipant) {
      return sendSuccess(res, {
        message: 'Already a participant',
        participant: existingParticipant,
      });
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
        email: user.email,
        picture: user.picture,
        role: invitedRole,
        joinedAt: new Date(),
      };
    } else {
      // Guest user
      participant = {
        name,
        email: email || null,
        role: 'guest',
        joinedAt: new Date(),
      };
    }

    await Meeting.addParticipant(meetingId, participant);

    return sendSuccess(res, {
      message: 'Participant added successfully',
      participant,
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
    const { requesterAuth0Id, participantAuth0Id } = req.body;

    if (!requesterAuth0Id || !participantAuth0Id) {
      return sendError(res, 'requesterAuth0Id and participantAuth0Id are required', 400);
    }

    const meeting = await Meeting.findById(meetingId);

    if (!meeting) {
      return sendError(res, 'Meeting not found', 404);
    }

    // Check if requester is host or cohost
    const isHost = meeting.hostAuth0Id === requesterAuth0Id;
    const isCohost = meeting.cohosts && meeting.cohosts.includes(requesterAuth0Id);

    if (!isHost && !isCohost) {
      return sendError(res, 'Only host or cohost can remove participants', 403);
    }

    // Cannot remove the host
    if (participantAuth0Id === meeting.hostAuth0Id) {
      return sendError(res, 'Cannot remove the host', 400);
    }

    await Meeting.removeParticipant(meetingId, participantAuth0Id);

    // Notify removed participant
    const removedUser = await User.findByAuth0Id(participantAuth0Id);
    if (removedUser) {
      await Notification.create({
        userId: removedUser._id.toString(),
        auth0Id: removedUser.auth0Id,
        email: removedUser.email,
        type: 'participant_removed',
        title: 'Removed from meeting',
        message: `You have been removed from "${meeting.title}"`,
        meetingId: meeting._id.toString(),
        meetingCode: meeting.meetingCode,
        data: {
          meetingTitle: meeting.title,
        },
      });
    }

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
  createGuestMeeting,
  getMeeting,
  getMeetingsByHost,
  getGuestMeetings,
  assignCohost,
  removeCohost,
  inviteParticipant,
  addParticipant,
  removeParticipant,
  updateMeetingStatus,
};
