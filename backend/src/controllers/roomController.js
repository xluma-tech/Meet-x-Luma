/**
 * Room controller
 */
const { sendSuccess } = require('../utils/responseHelper');
const livekitService = require('../services/livekitService');
const { createToken, LIVEKIT_URL } = require('../config/livekit');
const Meeting = require('../models/Meeting');

/**
 * Get room information (P2P mode)
 */
const getRoomInfo = (req, res) => {
  const { roomId } = req.params;
  const { rooms } = req.app.locals;
  
  const room = rooms.get(roomId);
  
  if (!room) {
    return sendSuccess(res, { exists: false, participants: 0 });
  }
  
  sendSuccess(res, { 
    exists: true, 
    participants: room.size 
  });
};

/**
 * Get current model for a room
 */
const getRoomModel = (req, res) => {
  const { roomId } = req.params;
  const { roomModels } = req.app.locals;
  
  const model = roomModels.get(roomId);
  
  if (!model) {
    return sendSuccess(res, { model: null });
  }
  
  sendSuccess(res, { model });
};

/**
 * Join room with SFU (LiveKit)
 * Returns access token for LiveKit connection
 */
const joinRoomSFU = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { identity, name } = req.body;

    if (!identity || !name) {
      return res.status(400).json({ 
        error: 'Missing required fields: identity and name' 
      });
    }

    // Get or create meeting
    let meeting = await Meeting.findByMeetingCode(roomId);
    
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    // Check if meeting is active or scheduled
    if (meeting.status === 'ended') {
      return res.status(403).json({ error: 'Meeting has ended' });
    }

    // Create LiveKit room if not exists
    await livekitService.createRoom(roomId, {
      maxParticipants: 100,
      emptyTimeout: 300,
    });

    // Generate access token
    const token = createToken(
      roomId,
      identity,
      name,
      { 
        userId: identity, 
        meetingId: meeting._id.toString(),
        joinedAt: new Date().toISOString()
      }
    );

    // Update meeting status to active if first participant
    if (meeting.status === 'scheduled') {
      await Meeting.updateStatus(meeting._id, 'active');
      console.log(`Meeting ${roomId} is now active - first participant joined via SFU`);
    }

    res.json({
      token,
      wsUrl: LIVEKIT_URL,
      roomName: roomId,
      serverUrl: LIVEKIT_URL,
      meeting: {
        title: meeting.title,
        hostAuth0Id: meeting.hostAuth0Id,
        status: meeting.status,
      }
    });
  } catch (error) {
    console.error('Error joining room (SFU):', error);
    res.status(500).json({ error: 'Failed to join room' });
  }
};

/**
 * Get SFU room info (LiveKit)
 */
const getRoomInfoSFU = async (req, res) => {
  try {
    const { roomId } = req.params;

    const meeting = await Meeting.findByMeetingCode(roomId);
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    // Get live participants from LiveKit
    const participants = await livekitService.listParticipants(roomId);

    res.json({
      meeting: {
        title: meeting.title,
        status: meeting.status,
        hostAuth0Id: meeting.hostAuth0Id,
        isPrivate: meeting.isPrivate,
      },
      participantCount: participants.length,
      participants: participants.map(p => ({
        identity: p.identity,
        name: p.name,
        joinedAt: p.joinedAt,
      })),
    });
  } catch (error) {
    console.error('Error getting room info (SFU):', error);
    res.status(500).json({ error: 'Failed to get room info' });
  }
};

/**
 * End meeting (SFU mode)
 */
const endMeetingSFU = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { hostAuth0Id } = req.body;

    const meeting = await Meeting.findByMeetingCode(roomId);
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    // Verify host permission
    if (meeting.hostAuth0Id !== hostAuth0Id && !meeting.cohosts?.includes(hostAuth0Id)) {
      return res.status(403).json({ error: 'Only host can end meeting' });
    }

    // Delete LiveKit room (disconnects all participants)
    await livekitService.deleteRoom(roomId);

    // Update meeting status
    await Meeting.updateStatus(meeting._id, 'ended');

    res.json({ message: 'Meeting ended successfully' });
  } catch (error) {
    console.error('Error ending meeting (SFU):', error);
    res.status(500).json({ error: 'Failed to end meeting' });
  }
};

module.exports = {
  getRoomInfo,
  getRoomModel,
  joinRoomSFU,
  getRoomInfoSFU,
  endMeetingSFU,
};
