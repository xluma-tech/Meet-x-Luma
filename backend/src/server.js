const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
require('dotenv').config();

// LiveKit SDK for token generation (optional - for SFU mode)
let AccessToken;
try {
  const livekit = require('livekit-server-sdk');
  AccessToken = livekit.AccessToken;
} catch (err) {
  console.log('LiveKit SDK not installed - running in P2P mode only');
}

const app = express();
const httpServer = http.createServer(app);

const allowedOrigins = (process.env.CORS_ORIGIN || "*")
  .split(",")
  .map(o => o.trim());



// Middleware
app.use(cors({
  origin: allowedOrigins || '*',
  credentials: true
}));
app.use(express.json());

// Data storage path
const DATA_DIR = path.join(__dirname, '../data');
const EVENTS_FILE = path.join(DATA_DIR, 'events.json');
const MODELS_DIR = path.join(DATA_DIR, 'models');

// Ensure data directories exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(MODELS_DIR)) {
  fs.mkdirSync(MODELS_DIR, { recursive: true });
}

// Initialize events file if it doesn't exist
if (!fs.existsSync(EVENTS_FILE)) {
  fs.writeFileSync(EVENTS_FILE, JSON.stringify({ events: [] }, null, 2));
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, MODELS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.glb', '.gltf'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only .glb and .gltf files are allowed'));
    }
  }
});

// Helper functions for data management
const readEvents = () => {
  try {
    const data = fs.readFileSync(EVENTS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading events:', error);
    return { events: [] };
  }
};

const writeEvents = (data) => {
  try {
    fs.writeFileSync(EVENTS_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing events:', error);
    return false;
  }
};

// Socket.IO setup
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Store rooms and their participants
const rooms = new Map();

// Store 3D models per room: { roomId: { modelId, url, uploaderId, metadata, seq } }
const roomModels = new Map();

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    rooms: rooms.size,
    connections: io.engine.clientsCount
  });
});

// Events API endpoints
app.get('/api/events', (req, res) => {
  const data = readEvents();
  res.json(data.events || []);
});

app.get('/api/events/:id', (req, res) => {
  const { id } = req.params;
  const data = readEvents();
  
  if (!data.events || !Array.isArray(data.events)) {
    return res.status(404).json({ error: 'Event not found' });
  }
  
  const event = data.events.find(e => e.id === id);
  
  if (!event) {
    return res.status(404).json({ error: 'Event not found' });
  }
  
  res.json(event);
});

app.post('/api/events', (req, res) => {
  const eventData = req.body;
  const data = readEvents();
  
  if (!data.events) {
    data.events = [];
  }
  
  // Generate unique ID if not provided
  const generateId = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let id = '';
    for (let i = 0; i < 10; i++) {
      id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return id;
  };
  
  const event = {
    ...eventData,
    id: eventData.id || generateId(),
    createdAt: eventData.createdAt || new Date().toISOString()
  };
  
  data.events.push(event);
  
  if (writeEvents(data)) {
    res.status(201).json(event);
  } else {
    res.status(500).json({ error: 'Failed to save event' });
  }
});

app.put('/api/events/:id', (req, res) => {
  const { id } = req.params;
  const updatedEvent = req.body;
  const data = readEvents();
  
  if (!data.events || !Array.isArray(data.events)) {
    return res.status(404).json({ error: 'Event not found' });
  }
  
  const index = data.events.findIndex(e => e.id === id);
  
  if (index === -1) {
    return res.status(404).json({ error: 'Event not found' });
  }
  
  data.events[index] = { ...data.events[index], ...updatedEvent };
  
  if (writeEvents(data)) {
    res.json(data.events[index]);
  } else {
    res.status(500).json({ error: 'Failed to update event' });
  }
});

app.delete('/api/events/:id', (req, res) => {
  const { id } = req.params;
  const data = readEvents();
  
  if (!data.events || !Array.isArray(data.events)) {
    return res.status(404).json({ error: 'Event not found' });
  }
  
  const index = data.events.findIndex(e => e.id === id);
  
  if (index === -1) {
    return res.status(404).json({ error: 'Event not found' });
  }
  
  data.events.splice(index, 1);
  
  if (writeEvents(data)) {
    res.json({ message: 'Event deleted successfully' });
  } else {
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

// Room info endpoint
app.get('/api/rooms/:roomId', (req, res) => {
  const { roomId } = req.params;
  const room = rooms.get(roomId);
  
  if (!room) {
    return res.json({ exists: false, participants: 0 });
  }
  
  res.json({ 
    exists: true, 
    participants: room.size 
  });
});

// 3D Model upload endpoint
app.post('/api/models/upload', upload.single('model'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { roomId, uploaderId, uploaderName } = req.body;
    
    if (!roomId || !uploaderId) {
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Missing roomId or uploaderId' });
    }

    const modelId = req.file.filename;
    const modelUrl = `/api/models/${modelId}`;
    
    const modelData = {
      modelId,
      url: modelUrl,
      uploaderId,
      uploaderName: uploaderName || 'Unknown',
      filename: req.file.originalname,
      size: req.file.size,
      uploadedAt: new Date().toISOString(),
      seq: 0
    };

    // Store model data (not published yet)
    res.status(201).json(modelData);
  } catch (error) {
    console.error('Error uploading model:', error);
    res.status(500).json({ error: 'Failed to upload model' });
  }
});

// Serve 3D model files
app.get('/api/models/:modelId', (req, res) => {
  const { modelId } = req.params;
  const modelPath = path.join(MODELS_DIR, modelId);
  
  if (!fs.existsSync(modelPath)) {
    return res.status(404).json({ error: 'Model not found' });
  }
  
  // Set appropriate headers for 3D models
  const ext = path.extname(modelId).toLowerCase();
  if (ext === '.glb') {
    res.setHeader('Content-Type', 'model/gltf-binary');
  } else if (ext === '.gltf') {
    res.setHeader('Content-Type', 'model/gltf+json');
  }
  
  res.sendFile(modelPath);
});

// Get current model for a room
app.get('/api/rooms/:roomId/model', (req, res) => {
  const { roomId } = req.params;
  const model = roomModels.get(roomId);
  
  if (!model) {
    return res.json({ model: null });
  }
  
  res.json({ model });
});

// LiveKit token generation endpoint (for SFU mode)
app.post('/api/token', (req, res) => {
  if (!AccessToken) {
    return res.status(501).json({ 
      error: 'LiveKit not configured',
      message: 'Install livekit-server-sdk to use SFU mode'
    });
  }

  const { roomName, participantName } = req.body;
  
  if (!roomName || !participantName) {
    return res.status(400).json({ 
      error: 'Missing required fields',
      message: 'roomName and participantName are required'
    });
  }

  try {
    const apiKey = process.env.LIVEKIT_API_KEY || 'devkey';
    const apiSecret = process.env.LIVEKIT_API_SECRET || 'secret';
    const livekitUrl = process.env.LIVEKIT_URL || 'ws://localhost:7880';

    const at = new AccessToken(apiKey, apiSecret, {
      identity: participantName,
      // Token expires in 24 hours
      ttl: '24h',
    });

    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    const token = at.toJwt();

    res.json({
      token,
      url: livekitUrl,
      roomName,
      participantName,
    });
  } catch (error) {
    console.error('Error generating LiveKit token:', error);
    res.status(500).json({ 
      error: 'Failed to generate token',
      message: error.message
    });
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-room', ({ roomId, userName }) => {
    try {
      socket.join(roomId);
      socket.userName = userName;
      socket.roomId = roomId;

      if (!rooms.has(roomId)) {
        rooms.set(roomId, new Set());
      }
      rooms.get(roomId).add(socket.id);

      // Notify others in the room
      socket.to(roomId).emit('user-joined', {
        userId: socket.id,
        userName: userName,
      });

      // Send list of existing users to the new user
      const existingUsers = Array.from(rooms.get(roomId))
        .filter((id) => id !== socket.id)
        .map((id) => {
          const userSocket = io.sockets.sockets.get(id);
          return {
            userId: id,
            userName: userSocket?.userName || 'Unknown',
          };
        });

      socket.emit('existing-users', existingUsers);

      console.log(`${userName} (${socket.id}) joined room ${roomId}. Total: ${rooms.get(roomId).size}`);
    } catch (err) {
      console.error('Error joining room:', err);
      socket.emit('error', { message: 'Failed to join room' });
    }
  });

  socket.on('signal', ({ to, signal }) => {
    try {
      io.to(to).emit('signal', {
        from: socket.id,
        signal: signal,
      });
    } catch (err) {
      console.error('Error sending signal:', err);
    }
  });

  socket.on('screen-signal', ({ to, signal }) => {
    try {
      io.to(to).emit('screen-signal', {
        from: socket.id,
        signal: signal,
      });
    } catch (err) {
      console.error('Error sending screen signal:', err);
    }
  });

  socket.on('chat-message', ({ roomId, userName, message, timestamp }) => {
    try {
      socket.to(roomId).emit('chat-message', {
        userId: socket.id,
        userName,
        message,
        timestamp,
      });
    } catch (err) {
      console.error('Error sending chat message:', err);
    }
  });

  socket.on('private-message', ({ userName, message, timestamp, to }) => {
    try {
      io.to(to).emit('private-message', {
        userId: socket.id,
        userName,
        message,
        timestamp,
      });
    } catch (err) {
      console.error('Error sending private message:', err);
    }
  });

  socket.on('screen-share-started', ({ roomId }) => {
    try {
      socket.to(roomId).emit('screen-share-started', {
        userId: socket.id,
      });
    } catch (err) {
      console.error('Error broadcasting screen share start:', err);
    }
  });

  socket.on('screen-share-stopped', ({ roomId }) => {
    try {
      socket.to(roomId).emit('screen-share-stopped', {
        userId: socket.id,
      });
    } catch (err) {
      console.error('Error broadcasting screen share stop:', err);
    }
  });

  // 3D Model events
  socket.on('model-publish', ({ roomId, modelData }) => {
    try {
      // Create canonical model record for the room
      const modelRecord = {
        ...modelData,
        uploaderId: socket.id,
        publishedAt: Date.now(),
        seq: 0,
        allowedControllers: [] // Initialize empty permissions list
      };
      
      roomModels.set(roomId, modelRecord);
      
      // Broadcast to all participants in the room
      io.to(roomId).emit('model-published', {
        modelId: modelRecord.modelId,
        url: modelRecord.url,
        uploaderId: socket.id,
        uploaderName: modelRecord.uploaderName,
        allowedControllers: modelRecord.allowedControllers,
        metadata: modelRecord
      });
      
      console.log(`Model ${modelRecord.modelId} published to room ${roomId} by ${socket.id}`);
    } catch (err) {
      console.error('Error publishing model:', err);
      socket.emit('error', { message: 'Failed to publish model' });
    }
  });

  socket.on('model-unpublish', ({ roomId }) => {
    try {
      const model = roomModels.get(roomId);
      
      // Verify the sender is the model owner
      if (model && model.uploaderId === socket.id) {
        roomModels.delete(roomId);
        io.to(roomId).emit('model-unpublished', { modelId: model.modelId });
        console.log(`Model ${model.modelId} unpublished from room ${roomId}`);
      }
    } catch (err) {
      console.error('Error unpublishing model:', err);
    }
  });

  socket.on('model-control', ({ roomId, modelId, seq, ts, payload }) => {
    try {
      const model = roomModels.get(roomId);
      
      // Verify the sender is the model owner or allowed controller
      const isOwner = model && model.uploaderId === socket.id;
      const isAllowed = model && model.allowedControllers && model.allowedControllers.includes(socket.id);
      
      if (!model || (!isOwner && !isAllowed)) {
        console.log(`Unauthorized control event from ${socket.id} for model ${modelId}`);
        return;
      }
      
      // Update sequence number
      if (seq > model.seq) {
        model.seq = seq;
      }
      
      // Broadcast control event to ALL participants in the room (including sender)
      // This ensures consistent state across all clients
      io.to(roomId).emit('model-control', {
        modelId,
        seq,
        ts,
        payload,
        uploaderId: socket.id // Include uploader ID for reference
      });
    } catch (err) {
      console.error('Error handling model control:', err);
    }
  });

  socket.on('model-camera', ({ roomId, modelId, camera }) => {
    try {
      const model = roomModels.get(roomId);
      
      // Verify the sender is the model owner or allowed controller
      const isOwner = model && model.uploaderId === socket.id;
      const isAllowed = model && model.allowedControllers && model.allowedControllers.includes(socket.id);
      
      if (!model || (!isOwner && !isAllowed)) {
        console.log(`Unauthorized camera event from ${socket.id} for model ${modelId}`);
        return;
      }
      
      // Broadcast camera state to ALL participants in the room (including sender)
      io.to(roomId).emit('model-camera', {
        modelId,
        camera
      });
    } catch (err) {
      console.error('Error handling model camera:', err);
    }
  });

  socket.on('model-permissions', ({ roomId, modelId, allowedControllers }) => {
    try {
      const model = roomModels.get(roomId);
      
      // Verify the sender is the model owner
      if (!model || model.uploaderId !== socket.id) {
        console.log(`Unauthorized permission change from ${socket.id} for model ${modelId}`);
        return;
      }
      
      // Update allowed controllers
      model.allowedControllers = allowedControllers;
      
      // Broadcast permission changes to ALL participants
      io.to(roomId).emit('model-permissions', {
        modelId,
        allowedControllers
      });
      
      console.log(`Permissions updated for model ${modelId}:`, allowedControllers);
    } catch (err) {
      console.error('Error handling model permissions:', err);
    }
  });

  socket.on('disconnect', () => {
    try {
      if (socket.roomId) {
        const room = rooms.get(socket.roomId);
        if (room) {
          room.delete(socket.id);
          if (room.size === 0) {
            rooms.delete(socket.roomId);
            // Clean up room model when room is empty
            const model = roomModels.get(socket.roomId);
            if (model) {
              roomModels.delete(socket.roomId);
            }
            console.log(`Room ${socket.roomId} deleted (empty)`);
          }
        }

        // If user was model owner, unpublish the model
        const model = roomModels.get(socket.roomId);
        if (model && model.uploaderId === socket.id) {
          roomModels.delete(socket.roomId);
          socket.to(socket.roomId).emit('model-unpublished', { modelId: model.modelId });
          console.log(`Model ${model.modelId} auto-unpublished (owner left)`);
        }

        socket.to(socket.roomId).emit('user-left', {
          userId: socket.id,
        });

        console.log(`${socket.userName} (${socket.id}) left room ${socket.roomId}`);
      }
    } catch (err) {
      console.error('Error handling disconnect:', err);
    }
  });

  socket.on('error', (err) => {
    console.error('Socket error:', err);
  });
});

// Start server
const PORT = process.env.PORT || 4000;
const HOST = process.env.HOST || '0.0.0.0';

httpServer.listen(PORT, HOST, () => {
  console.log(`✓ Backend server running on http://${HOST}:${PORT}`);
  console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`✓ CORS Origin: ${process.env.CORS_ORIGIN || '*'}`);
  console.log(`✓ Data directory: ${DATA_DIR}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...');
  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
