const { getDatabase } = require('../config/database');
const { ObjectId } = require('mongodb');

class GuestSession {
  static get collection() {
    return getDatabase().collection('guestSessions');
  }

  static async create(sessionData) {
    const session = {
      guestId: sessionData.guestId,
      name: sessionData.name,
      meetingId: sessionData.meetingId,
      role: 'guest',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    };

    const result = await this.collection.insertOne(session);
    return { ...session, _id: result.insertedId };
  }

  static async findByGuestId(guestId) {
    return await this.collection.findOne({ guestId });
  }

  static async findByMeetingId(meetingId) {
    return await this.collection.find({ meetingId }).toArray();
  }

  static async deleteExpired() {
    return await this.collection.deleteMany({
      expiresAt: { $lt: new Date() },
    });
  }
}

module.exports = GuestSession;
