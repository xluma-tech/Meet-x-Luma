const express = require('express');
const router = express.Router();
const guestController = require('../controllers/guestController');

// Create guest session
router.post('/session', guestController.createGuestSession);

// Get guest session
router.get('/session/:guestId', guestController.getGuestSession);

module.exports = router;
