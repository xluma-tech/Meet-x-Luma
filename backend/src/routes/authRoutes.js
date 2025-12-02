const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Sync user from Auth0 to MongoDB (handles both signup and signin)
router.post('/sync', authController.syncUser);

// Get user profile
router.get('/user/:auth0Id', authController.getUserProfile);

// Update user role
router.put('/user/:auth0Id/role', authController.updateUserRole);

module.exports = router;
