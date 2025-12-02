const { getDatabase } = require('../config/database');
const { ObjectId } = require('mongodb');

class Notification {
  static get collection() {
    return getDatabase().collection('notifications');
  }

  static async create(notificationData) {
    const notification = {
      userId: notificationData.userId ? new ObjectId(notificationData.userId) : null,
      auth0Id: notificationData.auth0Id,
      email: notificationData.email,
      type: notificationData.type, // 'meeting_invitation', 'cohost_assigned', 'participant_removed'
      title: notificationData.title,
      message: notificationData.message,
      meetingId: notificationData.meetingId ? new ObjectId(notificationData.meetingId) : null,
      meetingCode: notificationData.meetingCode,
      data: notificationData.data || {},
      read: false,
      createdAt: new Date(),
    };

    const result = await this.collection.insertOne(notification);
    return { ...notification, _id: result.insertedId };
  }

  static async findByAuth0Id(auth0Id, limit = 50) {
    return await this.collection
      .find({ auth0Id })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
  }

  static async findByEmail(email, limit = 50) {
    return await this.collection
      .find({ email })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
  }

  static async markAsRead(notificationId) {
    return await this.collection.updateOne(
      { _id: new ObjectId(notificationId) },
      { $set: { read: true } }
    );
  }

  static async markAllAsRead(auth0Id) {
    return await this.collection.updateMany(
      { auth0Id, read: false },
      { $set: { read: true } }
    );
  }

  static async getUnreadCount(auth0Id) {
    return await this.collection.countDocuments({ auth0Id, read: false });
  }

  static async deleteOld(daysOld = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    return await this.collection.deleteMany({
      createdAt: { $lt: cutoffDate },
      read: true,
    });
  }
}

module.exports = Notification;
