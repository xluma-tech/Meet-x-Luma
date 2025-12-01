# Backend Refactoring Guide

## Overview
The backend has been refactored into a production-ready structure with proper separation of concerns.

## New Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── constants.js          # Application constants
│   │   └── environment.js        # Environment configuration
│   ├── controllers/
│   │   ├── eventController.js    # Event CRUD operations
│   │   ├── healthController.js   # Health check endpoint
│   │   ├── modelController.js    # 3D model operations
│   │   ├── roomController.js     # Room management
│   │   └── tokenController.js    # LiveKit token generation
│   ├── middleware/
│   │   ├── corsMiddleware.js     # CORS configuration
│   │   ├── errorMiddleware.js    # Error handling
│   │   └── uploadMiddleware.js   # File upload configuration
│   ├── routes/
│   │   ├── eventRoutes.js        # Event endpoints
│   │   ├── healthRoutes.js       # Health check endpoint
│   │   ├── modelRoutes.js        # Model endpoints
│   │   ├── roomRoutes.js         # Room endpoints
│   │   ├── tokenRoutes.js        # Token endpoint
│   │   └── index.js              # Route aggregator
│   ├── socket/
│   │   ├── modelSocketHandlers.js    # 3D model socket events
│   │   ├── socketConfig.js           # Socket.IO configuration
│   │   └── socketHandlers.js         # Main socket handlers
│   ├── utils/
│   │   ├── fileSystem.js         # File system operations
│   │   ├── idGenerator.js        # ID generation utilities
│   │   └── responseHelper.js     # Response formatting
│   ├── app.js                    # Express app setup
│   └── server.js                 # Server entry point
├── data/
│   ├── events.json               # Events storage
│   └── models/                   # 3D models storage
├── .env.example                  # Environment variables template
└── package.json
```

## Key Improvements

### 1. Separation of Concerns
- **Controllers**: Handle business logic
- **Routes**: Define API endpoints
- **Middleware**: Process requests
- **Utils**: Reusable helper functions
- **Config**: Centralized configuration

### 2. Constants
All hardcoded strings moved to `config/constants.js`:
- File upload settings
- Response messages
- Socket event names
- HTTP status codes

### 3. Environment Variables
All environment-specific values in `.env`:
- Server configuration
- CORS settings
- Socket.IO settings
- LiveKit credentials
- File upload limits

### 4. Reusable Helpers
- `responseHelper.js`: Consistent API responses
- `fileSystem.js`: File operations
- `idGenerator.js`: ID generation

### 5. Error Handling
- Global error middleware
- Consistent error responses
- Proper HTTP status codes

### 6. Production Ready
- Graceful shutdown handling
- Environment-based configuration
- Proper logging
- Security best practices

## Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Required variables:
- `PORT`: Server port (default: 4000)
- `HOST`: Server host (default: 0.0.0.0)
- `NODE_ENV`: Environment (development/production)
- `CORS_ORIGIN`: Allowed CORS origins

Optional (for LiveKit SFU mode):
- `LIVEKIT_API_KEY`
- `LIVEKIT_API_SECRET`
- `LIVEKIT_URL`

## Running the Server

Development:
```bash
npm run dev
```

Production:
```bash
npm start
```

## API Endpoints

### Health
- `GET /health` - Health check

### Events
- `GET /api/events` - Get all events
- `GET /api/events/:id` - Get event by ID
- `POST /api/events` - Create event
- `PUT /api/events/:id` - Update event
- `DELETE /api/events/:id` - Delete event

### Rooms
- `GET /api/rooms/:roomId` - Get room info
- `GET /api/rooms/:roomId/model` - Get room model

### Models
- `POST /api/models/upload` - Upload 3D model
- `GET /api/models/:modelId` - Get 3D model file

### Token
- `POST /api/token` - Generate LiveKit token

## Socket Events

### Connection
- `join-room` - Join a room
- `user-joined` - User joined notification
- `user-left` - User left notification
- `existing-users` - List of existing users

### WebRTC
- `signal` - WebRTC signaling
- `screen-signal` - Screen share signaling

### Chat
- `chat-message` - Room chat message
- `private-message` - Private message

### Screen Share
- `screen-share-started` - Screen share started
- `screen-share-stopped` - Screen share stopped

### 3D Models
- `model-publish` - Publish model to room
- `model-published` - Model published notification
- `model-unpublish` - Unpublish model
- `model-unpublished` - Model unpublished notification
- `model-control` - Model control event
- `model-camera` - Model camera update
- `model-permissions` - Model permissions update

## Migration Notes

The refactored code maintains 100% backward compatibility with the original implementation. All endpoints and socket events work exactly the same way.

No changes required in the frontend.
