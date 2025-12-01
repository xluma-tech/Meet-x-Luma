/**
 * Main routes index
 */
const express = require('express');
const router = express.Router();

const healthRoutes = require('./healthRoutes');
const eventRoutes = require('./eventRoutes');
const roomRoutes = require('./roomRoutes');
const modelRoutes = require('./modelRoutes');
const tokenRoutes = require('./tokenRoutes');
const authRoutes = require('./authRoutes');
const guestRoutes = require('./guestRoutes');
const meetingRoutes = require('./meetingRoutes');

// Mount routes
router.use('/health', healthRoutes);
router.use('/api/events', eventRoutes);
router.use('/api/rooms', roomRoutes);
router.use('/api/models', modelRoutes);
router.use('/api/token', tokenRoutes);
router.use('/api/auth', authRoutes);
router.use('/api/guest', guestRoutes);
router.use('/api/meetings', meetingRoutes);

module.exports = router;
