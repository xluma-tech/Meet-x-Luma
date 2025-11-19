const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const httpServer = http.createServer(app);

// Middleware - CORS Configuration
const allowedOrigins = [
  'http://localhost:3000',
  'https://meet.xluma.in',
  'https://meet-x-luma.onrender.com',
  process.env.CORS_ORIGIN
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Data storage path
const DATA_DIR = path.join(__dirname, '../data');
const EVENTS_FILE = path.join(DATA_DIR, 'events.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize events file if it doesn't exist
if (!fs.existsSync(EVENTS_FILE)) {
  fs.writeFileSync(EVENTS_FILE, JSON.stringify({ events: [] }, null, 2));
}

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
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Store rooms and their participants
const rooms = new Map();

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

  socket.on('disconnect', () => {
    try {
      if (socket.roomId) {
        const room = rooms.get(socket.roomId);
        if (room) {
          room.delete(socket.id);
          if (room.size === 0) {
            rooms.delete(socket.roomId);
            console.log(`Room ${socket.roomId} deleted (empty)`);
          }
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
  console.log(`✓ CORS Allowed Origins:`, allowedOrigins);
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
