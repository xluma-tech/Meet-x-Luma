/**
 * LiveKit SFU Configuration
 */
const { AccessToken } = require('livekit-server-sdk');

const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || 'devkey';
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || 'secret';
const LIVEKIT_URL = process.env.LIVEKIT_URL || 'ws://localhost:7880';

/**
 * Create LiveKit access token for room join
 * @param {string} roomName - Room identifier
 * @param {string} participantIdentity - Unique participant ID
 * @param {string} participantName - Display name
 * @param {object} metadata - Additional metadata
 * @returns {string} JWT token
 */
const createToken = (roomName, participantIdentity, participantName, metadata = {}) => {
  const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity: participantIdentity,
    name: participantName,
    metadata: JSON.stringify(metadata),
  });

  at.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });

  return at.toJwt();
};

/**
 * Create token with custom permissions
 */
const createTokenWithPermissions = (roomName, participantIdentity, participantName, permissions = {}) => {
  const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity: participantIdentity,
    name: participantName,
    metadata: JSON.stringify(permissions.metadata || {}),
  });

  at.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: permissions.canPublish !== false,
    canSubscribe: permissions.canSubscribe !== false,
    canPublishData: permissions.canPublishData !== false,
    hidden: permissions.hidden || false,
    recorder: permissions.recorder || false,
  });

  return at.toJwt();
};

module.exports = {
  LIVEKIT_API_KEY,
  LIVEKIT_API_SECRET,
  LIVEKIT_URL,
  createToken,
  createTokenWithPermissions,
};
