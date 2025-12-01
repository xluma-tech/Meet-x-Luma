const { getDatabase } = require('../config/database');
const { ObjectId } = require('mongodb');

class Meeting {
  static get collection() {
    return getDatabase().collection('meetings');
  }

  static async create(meetingData) {
    const meeting = {
      title: meetingData.title,
      description: meetingData.description || '',
      scheduledTime: meetingData.scheduledTime ? new Date(meetingData.scheduledTime) : null,
      hostId: new ObjectId(meetingData.hostId),
      hostAuth0Id: meetingData.hostAuth0Id,
      participants: [
        {
          userId: new ObjectId(meetingData.hostId),
          auth0Id: meetingData.hostAuth0Id,
          role: 'host',
          joinedAt: new Date(),
        },
      ],
      status: 'scheduled',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await this.collection.insertOne(meeting);
    return { ...meeting, _id: result.insertedId };
  }

  static async findById(id) {
    return await this.collection.findOne({ _id: new ObjectId(id) });
  }

  static async findByHostAuth0Id(auth0Id) {
    return await this.collection.find({ hostAuth0Id: auth0Id }).toArray();
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
