const { MongoClient } = require('mongodb');

let client;
let db;

const connectDatabase = async () => {
  try {
    if (db) {
      return db;
    }

    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/meetxluma';
    
    client = new MongoClient(uri, {
      maxPoolSize: 10,
      minPoolSize: 5,
    });

    await client.connect();
    db = client.db();

    console.log('✅ MongoDB connected successfully');
    
    // Create indexes
    await createIndexes();
    
    return db;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    throw error;
  }
};

const createIndexes = async () => {
  try {
    // Users collection indexes
    await db.collection('users').createIndex({ auth0Id: 1 }, { unique: true });
    await db.collection('users').createIndex({ email: 1 });
    
    // Meetings collection indexes
    await db.collection('meetings').createIndex({ hostAuth0Id: 1 });
    await db.collection('meetings').createIndex({ status: 1 });
    await db.collection('meetings').createIndex({ createdAt: -1 });
    
    // Guest sessions collection indexes
    await db.collection('guestSessions').createIndex({ guestId: 1 }, { unique: true });
    await db.collection('guestSessions').createIndex(
      { expiresAt: 1 },
      { expireAfterSeconds: 0 }
    );
    
    console.log('✅ Database indexes created');
  } catch (error) {
    console.error('⚠️  Error creating indexes:', error.message);
  }
};

const getDatabase = () => {
  if (!db) {
    throw new Error('Database not initialized. Call connectDatabase first.');
  }
  return db;
};

const closeDatabase = async () => {
  if (client) {
    await client.close();
    client = null;
    db = null;
    console.log('MongoDB connection closed');
  }
};

module.exports = {
  connectDatabase,
  getDatabase,
  closeDatabase,
};
