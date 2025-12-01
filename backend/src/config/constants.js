/**
 * Application constants
 */

// File upload constants
const FILE_UPLOAD = {
  MAX_SIZE: 50 * 1024 * 1024, // 50MB
  ALLOWED_EXTENSIONS: ['.glb', '.gltf'],
  ALLOWED_MIME_TYPES: ['model/gltf-binary', 'model/gltf+json']
};

// Response messages
const MESSAGES = {
  SUCCESS: {
    EVENT_CREATED: 'Event created successfully',
    EVENT_UPDATED: 'Event updated successfully',
    EVENT_DELETED: 'Event deleted successfully',
    MODEL_UPLOADED: 'Model uploaded successfully',
    MODEL_PUBLISHED: 'Model published successfully',
    MODEL_UNPUBLISHED: 'Model unpublished successfully'
  },
  ERROR: {
    EVENT_NOT_FOUND: 'Event not found',
    FAILED_TO_SAVE: 'Failed to save event',
    FAILED_TO_UPDATE: 'Failed to update event',
    FAILED_TO_DELETE: 'Failed to delete event',
    NO_FILE_UPLOADED: 'No file uploaded',
    INVALID_FILE_TYPE: 'Only .glb and .gltf files are allowed',
    MISSING_REQUIRED_FIELDS: 'Missing required fields',
    MODEL_NOT_FOUND: 'Model not found',
    FAILED_TO_UPLOAD: 'Failed to upload model',
    FAILED_TO_JOIN_ROOM: 'Failed to join room',
    UNAUTHORIZED_CONTROL: 'Unauthorized control event',
    UNAUTHORIZED_PERMISSION: 'Unauthorized permission change',
    LIVEKIT_NOT_CONFIGURED: 'LiveKit not configured',
    FAILED_TO_GENERATE_TOKEN: 'Failed to generate token'
  }
};

// Socket events
const SOCKET_EVENTS = {
  CONNECTION: 'connection',
  DISCONNECT: 'disconnect',
  ERROR: 'error',
  JOIN_ROOM: 'join-room',
  USER_JOINED: 'user-joined',
  USER_LEFT: 'user-left',
  EXISTING_USERS: 'existing-users',
  SIGNAL: 'signal',
  SCREEN_SIGNAL: 'screen-signal',
  CHAT_MESSAGE: 'chat-message',
  PRIVATE_MESSAGE: 'private-message',
  SCREEN_SHARE_STARTED: 'screen-share-started',
  SCREEN_SHARE_STOPPED: 'screen-share-stopped',
  MODEL_PUBLISH: 'model-publish',
  MODEL_PUBLISHED: 'model-published',
  MODEL_UNPUBLISH: 'model-unpublish',
  MODEL_UNPUBLISHED: 'model-unpublished',
  MODEL_CONTROL: 'model-control',
  MODEL_CAMERA: 'model-camera',
  MODEL_PERMISSIONS: 'model-permissions'
};

// HTTP status codes
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
  NOT_IMPLEMENTED: 501
};

// Token configuration
const TOKEN_CONFIG = {
  DEFAULT_TTL: '24h'
};

module.exports = {
  FILE_UPLOAD,
  MESSAGES,
  SOCKET_EVENTS,
  HTTP_STATUS,
  TOKEN_CONFIG
};
