/**
 * Join Request Service using Redis
 * Stores temporary join requests for private meetings
 */
const { getRedisClient } = require('../config/redis');
const { v4: uuidv4 } = require('uuid');

// Redis key prefixes
const KEYS = {
  REQUEST: (requestId) => `join_request:${requestId}`,
  MEETING_REQUESTS: (meetingCode) => `meeting_requests:${meetingCode}`,
  REQUEST_INDEX: 'join_requests:index',
};

// TTL for join requests (24 hours in seconds)
const REQUEST_TTL = 24 * 60 * 60;

/**
 * Create a new join request
 */
const createJoinRequest = async (data) => {
  const redis = getRedisClient();
  const requestId = uuidv4();
  
  const joinRequest = {
    _id: requestId,
    meetingId: data.meetingId,
    meetingCode: data.meetingCode,
    requesterName: data.requesterName,
    requesterEmail: data.requesterEmail || null,
    requesterAuth0Id: data.requesterAuth0Id || null,
    requesterPicture: data.requesterPicture || null,
    status: 'pending',
    createdAt: new Date().toISOString(),
    respondedAt: null,
    respondedBy: null,
  };

  // Store the request with TTL
  await redis.setex(
    KEYS.REQUEST(requestId),
    REQUEST_TTL,
    JSON.stringify(joinRequest)
  );

  // Add to meeting's request list
  await redis.sadd(KEYS.MEETING_REQUESTS(data.meetingCode), requestId);
  
  // Set TTL on the meeting's request set
  await redis.expire(KEYS.MEETING_REQUESTS(data.meetingCode), REQUEST_TTL);

  // Add to global index for cleanup
  await redis.sadd(KEYS.REQUEST_INDEX, requestId);

  console.log(`✅ Join request ${requestId} created in Redis for meeting ${data.meetingCode}`);
  
  return joinRequest;
};

/**
 * Get a join request by ID
 */
const getJoinRequest = async (requestId) => {
  const redis = getRedisClient();
  const data = await redis.get(KEYS.REQUEST(requestId));
  
  if (!data) {
    return null;
  }
  
  return JSON.parse(data);
};

/**
 * Get all join requests for a meeting
 */
const getJoinRequestsByMeeting = async (meetingCode) => {
  const redis = getRedisClient();
  
  // Get all request IDs for this meeting
  const requestIds = await redis.smembers(KEYS.MEETING_REQUESTS(meetingCode));
  
  if (!requestIds || requestIds.length === 0) {
    return [];
  }

  // Fetch all requests
  const requests = [];
  for (const requestId of requestIds) {
    const data = await redis.get(KEYS.REQUEST(requestId));
    if (data) {
      requests.push(JSON.parse(data));
    } else {
      // Clean up stale reference
      await redis.srem(KEYS.MEETING_REQUESTS(meetingCode), requestId);
    }
  }

  return requests;
};

/**
 * Update join request status
 */
const updateJoinRequestStatus = async (requestId, status, respondedBy) => {
  const redis = getRedisClient();
  
  const request = await getJoinRequest(requestId);
  if (!request) {
    throw new Error('Join request not found');
  }

  request.status = status;
  request.respondedAt = new Date().toISOString();
  request.respondedBy = respondedBy;

  // Update in Redis with remaining TTL
  const ttl = await redis.ttl(KEYS.REQUEST(requestId));
  if (ttl > 0) {
    await redis.setex(
      KEYS.REQUEST(requestId),
      ttl,
      JSON.stringify(request)
    );
  } else {
    // If TTL expired, set new one
    await redis.setex(
      KEYS.REQUEST(requestId),
      REQUEST_TTL,
      JSON.stringify(request)
    );
  }

  console.log(`✅ Join request ${requestId} status updated to ${status}`);
  
  return request;
};

/**
 * Delete a join request
 */
const deleteJoinRequest = async (requestId) => {
  const redis = getRedisClient();
  
  const request = await getJoinRequest(requestId);
  if (!request) {
    return false;
  }

  // Remove from Redis
  await redis.del(KEYS.REQUEST(requestId));
  
  // Remove from meeting's request list
  await redis.srem(KEYS.MEETING_REQUESTS(request.meetingCode), requestId);
  
  // Remove from global index
  await redis.srem(KEYS.REQUEST_INDEX, requestId);

  console.log(`✅ Join request ${requestId} deleted from Redis`);
  
  return true;
};

/**
 * Delete all join requests for a meeting
 */
const deleteJoinRequestsByMeeting = async (meetingCode) => {
  const redis = getRedisClient();
  
  // Get all request IDs for this meeting
  const requestIds = await redis.smembers(KEYS.MEETING_REQUESTS(meetingCode));
  
  if (!requestIds || requestIds.length === 0) {
    return 0;
  }

  // Delete all requests
  let deletedCount = 0;
  for (const requestId of requestIds) {
    await redis.del(KEYS.REQUEST(requestId));
    await redis.srem(KEYS.REQUEST_INDEX, requestId);
    deletedCount++;
  }

  // Delete the meeting's request set
  await redis.del(KEYS.MEETING_REQUESTS(meetingCode));

  console.log(`✅ Deleted ${deletedCount} join requests for meeting ${meetingCode}`);
  
  return deletedCount;
};

/**
 * Check for duplicate pending request
 */
const checkDuplicateRequest = async (meetingCode, auth0Id, email) => {
  const requests = await getJoinRequestsByMeeting(meetingCode);
  
  return requests.find(req => 
    req.status === 'pending' && (
      (auth0Id && req.requesterAuth0Id === auth0Id) ||
      (email && req.requesterEmail === email)
    )
  );
};

/**
 * Clean up expired requests (called periodically)
 */
const cleanupExpiredRequests = async () => {
  const redis = getRedisClient();
  
  const allRequestIds = await redis.smembers(KEYS.REQUEST_INDEX);
  let cleanedCount = 0;

  for (const requestId of allRequestIds) {
    const exists = await redis.exists(KEYS.REQUEST(requestId));
    if (!exists) {
      // Request expired, clean up references
      await redis.srem(KEYS.REQUEST_INDEX, requestId);
      cleanedCount++;
    }
  }

  if (cleanedCount > 0) {
    console.log(`✅ Cleaned up ${cleanedCount} expired join requests`);
  }

  return cleanedCount;
};

module.exports = {
  createJoinRequest,
  getJoinRequest,
  getJoinRequestsByMeeting,
  updateJoinRequestStatus,
  deleteJoinRequest,
  deleteJoinRequestsByMeeting,
  checkDuplicateRequest,
  cleanupExpiredRequests,
};
