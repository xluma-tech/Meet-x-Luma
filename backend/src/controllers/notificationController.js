const Notification = require('../models/Notification');
const { sendSuccess, sendError } = require('../utils/responseHelper');

/**
 * Get notifications for a user
 */
const getNotifications = async (req, res) => {
  try {
    const { auth0Id } = req.params;
    const { limit = 50 } = req.query;

    const notifications = await Notification.findByAuth0Id(auth0Id, parseInt(limit));

    return sendSuccess(res, notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return sendError(res, 'Failed to fetch notifications', 500);
  }
};

/**
 * Get unread notification count
 */
const getUnreadCount = async (req, res) => {
  try {
    const { auth0Id } = req.params;

    const count = await Notification.getUnreadCount(auth0Id);

    return sendSuccess(res, { count });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    return sendError(res, 'Failed to fetch unread count', 500);
  }
};

/**
 * Mark notification as read
 */
const markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;

    await Notification.markAsRead(notificationId);

    return sendSuccess(res, {
      message: 'Notification marked as read',
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return sendError(res, 'Failed to mark notification as read', 500);
  }
};

/**
 * Mark all notifications as read
 */
const markAllAsRead = async (req, res) => {
  try {
    const { auth0Id } = req.body;

    if (!auth0Id) {
      return sendError(res, 'auth0Id is required', 400);
    }

    await Notification.markAllAsRead(auth0Id);

    return sendSuccess(res, {
      message: 'All notifications marked as read',
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return sendError(res, 'Failed to mark all notifications as read', 500);
  }
};

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
};
