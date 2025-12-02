const { getDatabase } = require('../config/database');
const { ObjectId } = require('mongodb');
const { nanoid } = require('nanoid');

class Meeting {
  static get collection() {
    return getDatabase().collection('meetings');
  }

  static async create(meetingData) {
    const meeting = {
      meetingCode: nanoid(10), // Unique meeting code
      title: meetingData.title,
      description: meetingData.description || '',
      scheduledTime: meetingData.scheduledTime ? new Date(meetingData.scheduledTime) : null,
      type: meetingData.type || 'public', // 'public' or 'private'
      isGuestMeeting: meetingData.isGuestMeeting || false,
      hostId: meetingData.hostId ? new ObjectId(meetingData.hostId) : null,
      hostAuth0Id: meetingData.hostAuth0Id || null,
      hostName: meetingData.hostName || 'Guest Host',
      guestHostId: meetingData.guestHostId || null, // For guest-created meetings
      cohosts: [], // Array of auth0Ids who are cohosts
      participants: meetingData.hostAuth0Id ? [
        {
          userId: new ObjectId(meetingData.hostId),
          auth0Id: meetingData.hostAuth0Id,
          name: meetingData.hostName,
          email: meetingData.hostEmail,
          role: 'host',
          joinedAt: new Date(),
        },
      ] : [],
      invitations: [], // Array of email invitations
      status: 'scheduled', // 'scheduled', 'active', 'ended'
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await this.collection.insertOne(meeting);
    return { ...meeting, _id: result.insertedId };
  }

  static async findById(id) {
    return await this.collection.findOne({ _id: new ObjectId(id) });
  }

  static async findByMeetingCode(meetingCode) {
    return await this.collection.findOne({ meetingCode });
  }

  static async findByHostAuth0Id(auth0Id) {
    return await this.collection.find({ hostAuth0Id: auth0Id }).sort({ createdAt: -1 }).toArray();
  }

  static async findByGuestHostId(guestHostId) {
    return await this.collection.find({ guestHostId }).sort({ createdAt: -1 }).toArray();
  }

  static async addParticipant(meetingId, participant) {
    return await this.collection.updateOne(
      { _id: new ObjectId(meetingId) },
      {
        $push: { participants: participant },
        $set: { updatedAt: new Date() },
      }
    );
  }

  static async addCohost(meetingId, auth0Id) {
    return await this.collection.updateOne(
      { _id: new ObjectId(meetingId) },
      {
        $addToSet: { cohosts: auth0Id },
        $set: { updatedAt: new Date() },
      }
    );
  }

  static async removeCohost(meetingId, auth0Id) {
    return await this.collection.updateOne(
      { _id: new ObjectId(meetingId) },
      {
        $pull: { cohosts: auth0Id },
        $set: { updatedAt: new Date() },
      }
    );
  }

  static async updateParticipantRole(meetingId, auth0Id, role) {
    return await this.collection.updateOne(
      {
        _id: new ObjectId(meetingId),
        'participants.auth0Id': auth0Id,
      },
      {
        $set: {
          'participants.$.role': role,
          updatedAt: new Date(),
        },
      }
    );
  }

  static async removeParticipant(meetingId, auth0Id) {
    return await this.collection.updateOne(
      { _id: new ObjectId(meetingId) },
      {
        $pull: { participants: { auth0Id } },
        $set: { updatedAt: new Date() },
      }
    );
  }

  static async addInvitation(meetingId, invitation) {
    return await this.collection.updateOne(
      { _id: new ObjectId(meetingId) },
      {
        $push: { invitations: invitation },
        $set: { updatedAt: new Date() },
      }
    );
  }

  static async updateInvitationStatus(meetingId, email, status) {
    return await this.collection.updateOne(
      {
        _id: new ObjectId(meetingId),
        'invitations.email': email,
      },
      {
        $set: {
          'invitations.$.status': status,
          'invitations.$.respondedAt': new Date(),
          updatedAt: new Date(),
        },
      }
    );
  }

  static async updateStatus(meetingId, status) {
    return await this.collection.updateOne(
      { _id: new ObjectId(meetingId) },
      {
        $set: {
          status,
          updatedAt: new Date(),
        },
      }
    );
  }

  static async findAll(filter = {}, options = {}) {
    return await this.collection.find(filter, options).toArray();
  }
}

module.exports = Meeting;
