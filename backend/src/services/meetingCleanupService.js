/**
 * Meeting Cleanup Service
 * Automatically ends meetings after 12 hours of inactivity
 */
const Meeting = require('../models/Meeting');

const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000; // 12 hours in milliseconds
const CHECK_INTERVAL_MS = 5 * 60 * 1000; // Check every 5 minutes

class MeetingCleanupService {
  constructor() {
    this.intervalId = null;
    this.isRunning = false;
  }

  /**
   * Start the cleanup service
   */
  start() {
    if (this.isRunning) {
      console.log('⚠️  Meeting cleanup service is already running');
      return;
    }

    console.log('✅ Starting meeting cleanup service...');
    this.isRunning = true;

    // Run immediately on start
    this.cleanupInactiveMeetings();

    // Then run periodically
    this.intervalId = setInterval(() => {
      this.cleanupInactiveMeetings();
    }, CHECK_INTERVAL_MS);

    console.log(`✅ Meeting cleanup service started (checking every ${CHECK_INTERVAL_MS / 1000 / 60} minutes)`);
  }

  /**
   * Stop the cleanup service
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      this.isRunning = false;
      console.log('✅ Meeting cleanup service stopped');
    }
  }

  /**
   * Clean up inactive meetings
   */
  async cleanupInactiveMeetings() {
    try {
      const now = new Date();
      const twelveHoursAgo = new Date(now.getTime() - TWELVE_HOURS_MS);

      // Find active meetings that haven't been updated in 12 hours
      const inactiveMeetings = await Meeting.collection.find({
        status: { $in: ['active', 'scheduled'] },
        updatedAt: { $lt: twelveHoursAgo }
      }).toArray();

      if (inactiveMeetings.length === 0) {
        console.log('✓ No inactive meetings to clean up');
        return;
      }

      console.log(`🧹 Found ${inactiveMeetings.length} inactive meeting(s) to end`);

      // End each inactive meeting
      for (const meeting of inactiveMeetings) {
        try {
          await Meeting.updateStatus(meeting._id, 'ended');
          console.log(`✓ Ended inactive meeting: ${meeting.meetingCode} (${meeting.title})`);
        } catch (error) {
          console.error(`✗ Failed to end meeting ${meeting.meetingCode}:`, error);
        }
      }

      console.log(`✅ Cleanup complete: ${inactiveMeetings.length} meeting(s) ended`);
    } catch (error) {
      console.error('❌ Error in meeting cleanup service:', error);
    }
  }

  /**
   * Update meeting activity timestamp
   * Call this when there's activity in a meeting (user joins, sends message, etc.)
   */
  static async updateMeetingActivity(meetingId) {
    try {
      await Meeting.collection.updateOne(
        { _id: meetingId },
        { $set: { updatedAt: new Date() } }
      );
    } catch (error) {
      console.error('Error updating meeting activity:', error);
    }
  }
}

// Create singleton instance
const meetingCleanupService = new MeetingCleanupService();

module.exports = meetingCleanupService;
