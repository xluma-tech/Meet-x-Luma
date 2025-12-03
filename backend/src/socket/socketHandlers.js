/**
 * Socket.IO event handlers
 */
const { SOCKET_EVENTS, MESSAGES } = require('../config/constants');
const Meeting = require('../models/Meeting');
const meetingCleanupService = require('../services/meetingCleanupService');

/**
 * Initialize socket handlers
 */
const initializeSocketHandlers = (io, rooms, roomModels) => {
  io.on(SOCKET_EVENTS.CONNECTION, (socket) => {
    console.log('User connected:', socket.id);

    // Join waiting room handler (for users waiting for admission)
    socket.on('join-waiting-room', ({ requestId, meetingCode }) => {
      const waitingRoomId = `waiting-${requestId}`;
      socket.join(waitingRoomId);
      console.log(`User ${socket.id} joined waiting room for request ${requestId}`);
    });

    // Join request listener (for hosts/cohosts to receive join request notifications)
    socket.on('join-request-listener', ({ meetingCode }) => {
      socket.join(meetingCode);
      console.log(`User ${socket.id} listening for join requests in meeting ${meetingCode}`);
    });

    // Join room handler
    socket.on(SOCKET_EVENTS.JOIN_ROOM, async ({ roomId, userName }) => {
      try {
        socket.join(roomId);
        socket.userName = userName;
        socket.roomId = roomId;

        if (!rooms.has(roomId)) {
          rooms.set(roomId, new Set());
        }
        
        const isFirstUser = rooms.get(roomId).size === 0;
        rooms.get(roomId).add(socket.id);

        // Update meeting activity timestamp and status
        try {
          const meeting = await Meeting.findByMeetingCode(roomId);
          if (meeting) {
            await meetingCleanupService.constructor.updateMeetingActivity(meeting._id);
            
            // If this is the first user and meeting is scheduled, set it to active
            if (isFirstUser && meeting.status === 'scheduled') {
              await Meeting.updateStatus(meeting._id, 'active');
              console.log(`Meeting ${roomId} is now active - first participant joined`);
            }
          }
        } catch (err) {
          console.error('Error updating meeting activity:', err);
        }

        // Notify others in the room
        socket.to(roomId).emit(SOCKET_EVENTS.USER_JOINED, {
          userId: socket.id,
          userName: userName,
        });

        // Send list of existing users to the new user
        const existingUsers = Array.from(rooms.get(roomId))
          .filter((id) => id !== socket.id)
          .map((id) => {
            const userSocket = io.sockets.sockets.get(id);
            return {
              userId: id,
              userName: userSocket?.userName || 'Unknown',
            };
          });

        socket.emit(SOCKET_EVENTS.EXISTING_USERS, existingUsers);

        console.log(`${userName} (${socket.id}) joined room ${roomId}. Total: ${rooms.get(roomId).size}`);
      } catch (err) {
        console.error('Error joining room:', err);
        socket.emit(SOCKET_EVENTS.ERROR, { message: MESSAGES.ERROR.FAILED_TO_JOIN_ROOM });
      }
    });

    // WebRTC signaling handlers
    socket.on(SOCKET_EVENTS.SIGNAL, ({ to, signal }) => {
      try {
        io.to(to).emit(SOCKET_EVENTS.SIGNAL, {
          from: socket.id,
          signal: signal,
        });
      } catch (err) {
        console.error('Error sending signal:', err);
      }
    });

    socket.on(SOCKET_EVENTS.SCREEN_SIGNAL, ({ to, signal }) => {
      try {
        io.to(to).emit(SOCKET_EVENTS.SCREEN_SIGNAL, {
          from: socket.id,
          signal: signal,
        });
      } catch (err) {
        console.error('Error sending screen signal:', err);
      }
    });

    // Chat message handlers
    socket.on(SOCKET_EVENTS.CHAT_MESSAGE, ({ roomId, userName, message, timestamp }) => {
      try {
        socket.to(roomId).emit(SOCKET_EVENTS.CHAT_MESSAGE, {
          userId: socket.id,
          userName,
          message,
          timestamp,
        });
      } catch (err) {
        console.error('Error sending chat message:', err);
      }
    });

    socket.on(SOCKET_EVENTS.PRIVATE_MESSAGE, ({ userName, message, timestamp, to }) => {
      try {
        io.to(to).emit(SOCKET_EVENTS.PRIVATE_MESSAGE, {
          userId: socket.id,
          userName,
          message,
          timestamp,
        });
      } catch (err) {
        console.error('Error sending private message:', err);
      }
    });

    // Screen share handlers
    socket.on(SOCKET_EVENTS.SCREEN_SHARE_STARTED, ({ roomId }) => {
      try {
        socket.to(roomId).emit(SOCKET_EVENTS.SCREEN_SHARE_STARTED, {
          userId: socket.id,
        });
      } catch (err) {
        console.error('Error broadcasting screen share start:', err);
      }
    });

    socket.on(SOCKET_EVENTS.SCREEN_SHARE_STOPPED, ({ roomId }) => {
      try {
        socket.to(roomId).emit(SOCKET_EVENTS.SCREEN_SHARE_STOPPED, {
          userId: socket.id,
        });
      } catch (err) {
        console.error('Error broadcasting screen share stop:', err);
      }
    });

    // 3D Model handlers
    require('./modelSocketHandlers')(socket, io, roomModels);

    // Handle meeting end by host
    socket.on('end-meeting', async ({ roomId, hostAuth0Id }) => {
      try {
        const meeting = await Meeting.findByMeetingCode(roomId);
        
        if (!meeting) {
          socket.emit('error', { message: 'Meeting not found' });
          return;
        }

        // Verify host permission
        if (meeting.hostAuth0Id !== hostAuth0Id && !meeting.cohosts?.includes(hostAuth0Id)) {
          socket.emit('error', { message: 'Only host can end the meeting' });
          return;
        }

        // End the meeting
        await Meeting.updateStatus(meeting._id, 'ended');
        
        // Clean up join requests from Redis
        const joinRequestService = require('../services/joinRequestService');
        await joinRequestService.deleteJoinRequestsByMeeting(roomId);
        console.log(`Cleaned up join requests for meeting ${roomId}`);
        
        // Notify all participants that meeting has ended
        io.to(roomId).emit('meeting-ended', {
          message: 'This meeting has been ended by the host',
          meetingCode: roomId
        });

        // Clear the room
        const room = rooms.get(roomId);
        if (room) {
          room.clear();
          rooms.delete(roomId);
        }

        // Clean up room model
        const model = roomModels.get(roomId);
        if (model) {
          roomModels.delete(roomId);
        }

        console.log(`Meeting ${roomId} ended by host ${hostAuth0Id}`);
      } catch (err) {
        console.error('Error ending meeting:', err);
        socket.emit('error', { message: 'Failed to end meeting' });
      }
    });

    // Disconnect handler
    socket.on(SOCKET_EVENTS.DISCONNECT, async () => {
      try {
        if (socket.roomId) {
          const room = rooms.get(socket.roomId);
          if (room) {
            room.delete(socket.id);
            
            // If room is now empty, end the meeting
            if (room.size === 0) {
              rooms.delete(socket.roomId);
              
              // Clean up room model when room is empty
              const model = roomModels.get(socket.roomId);
              if (model) {
                roomModels.delete(socket.roomId);
              }
              
              // Update meeting status to ended only if it was active
              try {
                const meeting = await Meeting.findByMeetingCode(socket.roomId);
                if (meeting && meeting.status === 'active') {
                  await Meeting.updateStatus(meeting._id, 'ended');
                  
                  // Clean up join requests from Redis
                  const joinRequestService = require('../services/joinRequestService');
                  await joinRequestService.deleteJoinRequestsByMeeting(socket.roomId);
                  
                  console.log(`Meeting ${socket.roomId} ended - all participants left`);
                }
              } catch (err) {
                console.error('Error ending meeting:', err);
              }
              console.log(`Room ${socket.roomId} deleted (empty)`);
            }
          }

          // If user was model owner, unpublish the model
          const model = roomModels.get(socket.roomId);
          if (model && model.uploaderId === socket.id) {
            roomModels.delete(socket.roomId);
            socket.to(socket.roomId).emit(SOCKET_EVENTS.MODEL_UNPUBLISHED, { modelId: model.modelId });
            console.log(`Model ${model.modelId} auto-unpublished (owner left)`);
          }

          socket.to(socket.roomId).emit(SOCKET_EVENTS.USER_LEFT, {
            userId: socket.id,
          });

          console.log(`${socket.userName} (${socket.id}) left room ${socket.roomId}`);
        }
      } catch (err) {
        console.error('Error handling disconnect:', err);
      }
    });

    socket.on(SOCKET_EVENTS.ERROR, (err) => {
      console.error('Socket error:', err);
    });
  });
};

module.exports = {
  initializeSocketHandlers
};
