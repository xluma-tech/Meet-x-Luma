/**
 * LiveKit Service - Wrapper for LiveKit API operations
 */
const { RoomServiceClient } = require('livekit-server-sdk');
const { LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET } = require('../config/livekit');

class LiveKitService {
  constructor() {
    this.client = new RoomServiceClient(LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);
  }

  /**
   * Create a new room
   */
  async createRoom(roomName, options = {}) {
    try {
      const room = await this.client.createRoom({
        name: roomName,
        emptyTimeout: options.emptyTimeout || 300, // 5 minutes
        maxParticipants: options.maxParticipants || 100,
      });
      console.log('LiveKit room created:', roomName);
      return room;
    } catch (error) {
      if (error.message && error.message.includes('already exists')) {
        console.log('LiveKit room already exists:', roomName);
        return await this.getRoom(roomName);
      }
      console.error('Error creating LiveKit room:', error);
      throw error;
    }
  }

  /**
   * Get room information
   */
  async getRoom(roomName) {
    try {
      const rooms = await this.client.listRooms([roomName]);
      return rooms.length > 0 ? rooms[0] : null;
    } catch (error) {
      console.error('Error getting LiveKit room:', error);
      return null;
    }
  }

  /**
   * List all participants in a room
   */
  async listParticipants(roomName) {
    try {
      const participants = await this.client.listParticipants(roomName);
      return participants;
    } catch (error) {
      console.error('Error listing participants:', error);
      return [];
    }
  }

  /**
   * Remove a participant from room
   */
  async removeParticipant(roomName, participantIdentity) {
    try {
      await this.client.removeParticipant(roomName, participantIdentity);
      console.log('Participant removed:', participantIdentity);
    } catch (error) {
      console.error('Error removing participant:', error);
      throw error;
    }
  }

  /**
   * Delete a room
   */
  async deleteRoom(roomName) {
    try {
      await this.client.deleteRoom(roomName);
      console.log('LiveKit room deleted:', roomName);
    } catch (error) {
      console.error('Error deleting LiveKit room:', error);
      throw error;
    }
  }

  /**
   * List all active rooms
   */
  async listRooms() {
    try {
      const rooms = await this.client.listRooms();
      return rooms;
    } catch (error) {
      console.error('Error listing rooms:', error);
      return [];
    }
  }

  /**
   * Update room metadata
   */
  async updateRoomMetadata(roomName, metadata) {
    try {
      await this.client.updateRoomMetadata(roomName, JSON.stringify(metadata));
      console.log('Room metadata updated:', roomName);
    } catch (error) {
      console.error('Error updating room metadata:', error);
      throw error;
    }
  }
}

module.exports = new LiveKitService();
