const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');

// Get notifications for a user
router.get('/:auth0Id', notificationController.getNotifications);

// Get unread notification count
router.get('/:auth0Id/unread/count', notificationController.getUnreadCount);

// Mark notification as read
router.put('/:notificationId/read', notificationController.markAsRead);

// Mark all notifications as read
router.put('/read/all', notificationController.markAllAsRead);

module.exports = router;
