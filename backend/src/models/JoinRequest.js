const { getDatabase } = require('../config/database');
const { ObjectId } = require('mongodb');

class JoinRequest {
  static get collection() {
    return getDatabase().collection('joinRequests');
  }

  static async create(requestData) {
    const request = {
      meetingId: new ObjectId(requestData.meetingId),
      meetingCode: requestData.meetingCode,
      requesterAuth0Id: requestData.requesterAuth0Id || null,
      requesterName: requestData.requesterName,
      requesterEmail: requestData.requesterEmail || null,
      requesterPicture: requestData.requesterPicture || null,
      status: 'pending', // 'pending', 'accepted', 'rejected'
      createdAt: new Date(),
      respondedAt: null,
      respondedBy: null,
    };

    const result = await this.collection.insertOne(request);
    return { ...request, _id: result.insertedId };
  }

  static async findByMeetingId(meetingId) {
    return await this.collection
      .find({ 
        meetingId: new ObjectId(meetingId),
        status: 'pending'
      })
      .sort({ createdAt: -1 })
      .toArray();
  }

  static async findById(id) {
    return await this.collection.findOne({ _id: new ObjectId(id) });
  }

  static async updateStatus(requestId, status, respondedBy) {
    return await this.collection.updateOne(
      { _id: new ObjectId(requestId) },
      {
        $set: {
          status,
          respondedAt: new Date(),
          respondedBy,
        },
      }
    );
  }

  static async deleteOld(hoursOld = 24) {
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - hoursOld);
    
    return await this.collection.deleteMany({
      createdAt: { $lt: cutoffDate },
      status: { $in: ['accepted', 'rejected'] },
    });
  }

  static async checkDuplicate(meetingId, requesterAuth0Id, requesterEmail) {
    const query = {
      meetingId: new ObjectId(meetingId),
      status: 'pending',
    };

    if (requesterAuth0Id) {
      query.requesterAuth0Id = requesterAuth0Id;
    } else if (requesterEmail) {
      query.requesterEmail = requesterEmail;
    }

    return await this.collection.findOne(query);
  }
}

module.exports = JoinRequest;
