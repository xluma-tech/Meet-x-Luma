/**
 * Token controller for LiveKit
 */
const config = require('../config/environment');
const { sendSuccess, sendError } = require('../utils/responseHelper');
const { MESSAGES, HTTP_STATUS, TOKEN_CONFIG } = require('../config/constants');

// Try to load LiveKit SDK
let AccessToken;
try {
  const livekit = require('livekit-server-sdk');
  AccessToken = livekit.AccessToken;
} catch (err) {
  console.log('LiveKit SDK not installed - running in P2P mode only');
}

/**
 * Generate LiveKit token
 */
const generateToken = (req, res) => {
  if (!AccessToken) {
    return sendError(
      res,
      MESSAGES.ERROR.LIVEKIT_NOT_CONFIGURED,
      HTTP_STATUS.NOT_IMPLEMENTED,
      { message: 'Install livekit-server-sdk to use SFU mode' }
    );
  }

  const { roomName, participantName } = req.body;
  
  if (!roomName || !participantName) {
    return sendError(
      res,
      MESSAGES.ERROR.MISSING_REQUIRED_FIELDS,
      HTTP_STATUS.BAD_REQUEST,
      { 
        message: 'roomName and participantName are required',
        required: ['roomName', 'participantName']
      }
    );
  }

  try {
    const at = new AccessToken(
      config.livekit.apiKey,
      config.livekit.apiSecret,
      {
        identity: participantName,
        ttl: TOKEN_CONFIG.DEFAULT_TTL,
      }
    );

    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    const token = at.toJwt();

    sendSuccess(res, {
      token,
      url: config.livekit.url,
      roomName,
      participantName,
    });
  } catch (error) {
    console.error('Error generating LiveKit token:', error);
    sendError(
      res,
      MESSAGES.ERROR.FAILED_TO_GENERATE_TOKEN,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      { message: error.message }
    );
  }
};

module.exports = {
  generateToken
};
