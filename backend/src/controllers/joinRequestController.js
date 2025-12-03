const Meeting = require('../models/Meeting');
const User = require('../models/User');
const { sendSuccess, sendError } = require('../utils/responseHelper');
const { sendJoinRequestNotification } = require('../services/emailService');
const joinRequestService = require('../services/joinRequestService');

/**
 * Create a join request for a private meeting
 */
const createJoinRequest = async (req, res) => {
  try {
    const { meetingCode } = req.params;
    const { auth0Id, name, email } = req.body;

    if (!name) {
      return sendError(res, 'Name is required', 400);
    }

    // Find meeting
    const meeting = await Meeting.findByMeetingCode(meetingCode);
    if (!meeting) {
      return sendError(res, 'Meeting not found', 404);
    }

    // Check if meeting is private
    if (meeting.type !== 'private') {
      return sendError(res, 'Join requests are only for private meetings', 400);
    }

    // Check if already a participant
    if (auth0Id) {
      const isParticipant = meeting.participants?.some(p => p.auth0Id === auth0Id);
      if (isParticipant) {
        return sendError(res, 'You are already a participant', 400);
      }
    }

    // Check for duplicate pending request
    const duplicate = await joinRequestService.checkDuplicateRequest(meetingCode, auth0Id, email);
    if (duplicate) {
      return sendError(res, 'You already have a pending join request', 400);
    }

    // Get user info if authenticated
    let requesterData = {
      requesterName: name,
      requesterEmail: email || null,
      requesterAuth0Id: auth0Id || null,
    };

    if (auth0Id) {
      const user = await User.findByAuth0Id(auth0Id);
      if (user) {
        requesterData = {
          requesterName: user.name,
          requesterEmail: user.email,
          requesterAuth0Id: user.auth0Id,
          requesterPicture: user.picture,
        };
      }
    }

    // Create join request in Redis
    const joinRequest = await joinRequestService.createJoinRequest({
      meetingId: meeting._id.toString(),
      meetingCode: meeting.meetingCode,
      ...requesterData,
    });

    // Notify host and cohosts
    const notifyEmails = [];
    
    // Add host email
    if (meeting.hostAuth0Id) {
      const host = await User.findByAuth0Id(meeting.hostAuth0Id);
      if (host?.email) {
        notifyEmails.push(host.email);
      }
    }

    // Add cohost emails
    if (meeting.cohosts && meeting.cohosts.length > 0) {
      for (const cohostAuth0Id of meeting.cohosts) {
        const cohost = await User.findByAuth0Id(cohostAuth0Id);
        if (cohost?.email) {
          notifyEmails.push(cohost.email);
        }
      }
    }

    // Send email notifications
    for (const email of notifyEmails) {
      try {
        await sendJoinRequestNotification({
          to: email,
          requesterName: requesterData.requesterName,
          requesterEmail: requesterData.requesterEmail || 'Not provided',
          meetingTitle: meeting.title,
          meetingCode: meeting.meetingCode,
        });
      } catch (emailError) {
        console.error('Failed to send join request email:', emailError);
      }
    }

    // Emit socket event to notify host/cohosts in real-time
    const io = req.app.locals.io;
    if (io) {
      io.to(meeting.meetingCode).emit('join-request-received', {
        requestId: joinRequest._id,
        requesterName: requesterData.requesterName,
        requesterEmail: requesterData.requesterEmail,
        requesterPicture: requesterData.requesterPicture,
        createdAt: joinRequest.createdAt,
      });
      console.log(`Emitted join-request-received to room ${meeting.meetingCode}`);
    }

    return sendSuccess(res, {
      message: 'Join request sent successfully',
      requestId: joinRequest._id,
    }, 201);
  } catch (error) {
    console.error('Error creating join request:', error);
    return sendError(res, 'Failed to create join request', 500);
  }
};

/**
 * Get pending join requests for a meeting
 */
const getJoinRequests = async (req, res) => {
  try {
    const { meetingCode } = req.params;

    const meeting = await Meeting.findByMeetingCode(meetingCode);
    if (!meeting) {
      return sendError(res, 'Meeting not found', 404);
    }

    // Get requests from Redis
    const requests = await joinRequestService.getJoinRequestsByMeeting(meetingCode);

    return sendSuccess(res, requests);
  } catch (error) {
    console.error('Error fetching join requests:', error);
    return sendError(res, 'Failed to fetch join requests', 500);
  }
};

/**
 * Accept a join request
 */
const acceptJoinRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { auth0Id } = req.body; // The host/cohost accepting the request

    if (!auth0Id) {
      return sendError(res, 'auth0Id is required', 400);
    }

    // Get join request from Redis
    const joinRequest = await joinRequestService.getJoinRequest(requestId);
    if (!joinRequest) {
      return sendError(res, 'Join request not found', 404);
    }

    if (joinRequest.status !== 'pending') {
      return sendError(res, 'This request has already been processed', 400);
    }

    // Get meeting
    const meeting = await Meeting.findByMeetingCode(joinRequest.meetingCode);
    if (!meeting) {
      return sendError(res, 'Meeting not found', 404);
    }

    // Check if requester is host or cohost
    const isHost = meeting.hostAuth0Id === auth0Id;
    const isCohost = meeting.cohosts && meeting.cohosts.includes(auth0Id);

    if (!isHost && !isCohost) {
      return sendError(res, 'Only host or cohost can accept join requests', 403);
    }

    // Update request status in Redis
    await joinRequestService.updateJoinRequestStatus(requestId, 'accepted', auth0Id);

    // Add participant to meeting
    const participant = {
      name: joinRequest.requesterName,
      email: joinRequest.requesterEmail,
      role: 'participant',
      joinedAt: new Date(),
    };

    if (joinRequest.requesterAuth0Id) {
      const user = await User.findByAuth0Id(joinRequest.requesterAuth0Id);
      if (user) {
        participant.userId = user._id;
        participant.auth0Id = user.auth0Id;
        participant.picture = user.picture;
      }
    }

    await Meeting.addParticipant(meeting._id.toString(), participant);

    // Emit socket event to notify the requester they've been accepted
    const io = req.app.locals.io;
    if (io) {
      // Emit to the meeting room (for hosts to update their panel)
      io.to(meeting.meetingCode).emit('join-request-accepted', {
        requestId: joinRequest._id.toString(),
        requesterAuth0Id: joinRequest.requesterAuth0Id,
        requesterEmail: joinRequest.requesterEmail,
      });
      
      // Also emit to the specific waiting room for this request
      io.to(`waiting-${joinRequest._id.toString()}`).emit('join-request-accepted', {
        requestId: joinRequest._id.toString(),
        requesterAuth0Id: joinRequest.requesterAuth0Id,
        requesterEmail: joinRequest.requesterEmail,
      });
      
      console.log(`Emitted join-request-accepted for request ${requestId}`);
    }

    return sendSuccess(res, {
      message: 'Join request accepted',
      participant,
    });
  } catch (error) {
    console.error('Error accepting join request:', error);
    return sendError(res, 'Failed to accept join request', 500);
  }
};

/**
 * Reject a join request
 */
const rejectJoinRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { auth0Id } = req.body;

    if (!auth0Id) {
      return sendError(res, 'auth0Id is required', 400);
    }

    // Get join request from Redis
    const joinRequest = await joinRequestService.getJoinRequest(requestId);
    if (!joinRequest) {
      return sendError(res, 'Join request not found', 404);
    }

    if (joinRequest.status !== 'pending') {
      return sendError(res, 'This request has already been processed', 400);
    }

    const meeting = await Meeting.findByMeetingCode(joinRequest.meetingCode);
    if (!meeting) {
      return sendError(res, 'Meeting not found', 404);
    }

    // Check if requester is host or cohost
    const isHost = meeting.hostAuth0Id === auth0Id;
    const isCohost = meeting.cohosts && meeting.cohosts.includes(auth0Id);

    if (!isHost && !isCohost) {
      return sendError(res, 'Only host or cohost can reject join requests', 403);
    }

    // Update request status in Redis
    await joinRequestService.updateJoinRequestStatus(requestId, 'rejected', auth0Id);

    // Emit socket event to notify the requester they've been rejected
    const io = req.app.locals.io;
    if (io) {
      // Emit to the meeting room (for hosts to update their panel)
      io.to(meeting.meetingCode).emit('join-request-rejected', {
        requestId: joinRequest._id.toString(),
        requesterAuth0Id: joinRequest.requesterAuth0Id,
        requesterEmail: joinRequest.requesterEmail,
      });
      
      // Also emit to the specific waiting room for this request
      io.to(`waiting-${joinRequest._id.toString()}`).emit('join-request-rejected', {
        requestId: joinRequest._id.toString(),
        requesterAuth0Id: joinRequest.requesterAuth0Id,
        requesterEmail: joinRequest.requesterEmail,
      });
      
      console.log(`Emitted join-request-rejected for request ${requestId}`);
    }

    return sendSuccess(res, {
      message: 'Join request rejected',
    });
  } catch (error) {
    console.error('Error rejecting join request:', error);
    return sendError(res, 'Failed to reject join request', 500);
  }
};

module.exports = {
  createJoinRequest,
  getJoinRequests,
  acceptJoinRequest,
  rejectJoinRequest,
};
