/**
 * Redis configuration for Upstash
 */
const Redis = require('ioredis');

let redisClient = null;

/**
 * Initialize Redis connection to Upstash
 */
const connectRedis = () => {
  if (redisClient) {
    return redisClient;
  }

  const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL || 'https://bursting-toucan-38563.upstash.io';
  const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || 'AZajAAIncDIzMzkwNzk4NWQ4NDg0MWQ2ODg4MzU2ZTVhYzhjMDc1OXAyMzg1NjM';

  // Extract host and port from URL
  const url = new URL(UPSTASH_REDIS_REST_URL);
  const host = url.hostname;
  const port = url.port || 6379;

  try {
    redisClient = new Redis({
      host: host,
      port: port,
      password: UPSTASH_REDIS_REST_TOKEN,
      tls: {
        rejectUnauthorized: false
      },
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
    });

    redisClient.on('connect', () => {
      console.log('✅ Redis connected successfully');
    });

    redisClient.on('error', (err) => {
      console.error('❌ Redis connection error:', err.message);
    });

    redisClient.on('ready', () => {
      console.log('✅ Redis is ready');
    });

    return redisClient;
  } catch (error) {
    console.error('Failed to connect to Redis:', error);
    throw error;
  }
};

/**
 * Get Redis client instance
 */
const getRedisClient = () => {
  if (!redisClient) {
    return connectRedis();
  }
  return redisClient;
};

/**
 * Close Redis connection
 */
const closeRedis = async () => {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    console.log('Redis connection closed');
  }
};

module.exports = {
  connectRedis,
  getRedisClient,
  closeRedis,
};
