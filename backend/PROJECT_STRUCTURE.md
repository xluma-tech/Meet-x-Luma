# Backend Project Structure

## Directory Tree

```
backend/
├── src/
│   ├── config/                    # Configuration files
│   │   ├── constants.js           # Application constants (messages, status codes, etc.)
│   │   └── environment.js         # Environment variables configuration
│   │
│   ├── controllers/               # Business logic layer
│   │   ├── eventController.js     # Event CRUD operations
│   │   ├── healthController.js    # Health check endpoint
│   │   ├── modelController.js     # 3D model upload/serve operations
│   │   ├── roomController.js      # Room info and model retrieval
│   │   └── tokenController.js     # LiveKit token generation
│   │
│   ├── middleware/                # Express middleware
│   │   ├── corsMiddleware.js      # CORS configuration
│   │   ├── errorMiddleware.js     # Global error handler & 404 handler
│   │   └── uploadMiddleware.js    # Multer file upload configuration
│   │
│   ├── routes/                    # API route definitions
│   │   ├── eventRoutes.js         # /api/events endpoints
│   │   ├── healthRoutes.js        # /health endpoint
│   │   ├── modelRoutes.js         # /api/models endpoints
│   │   ├── roomRoutes.js          # /api/rooms endpoints
│   │   ├── tokenRoutes.js         # /api/token endpoint
│   │   └── index.js               # Route aggregator
│   │
│   ├── socket/                    # Socket.IO handlers
│   │   ├── modelSocketHandlers.js # 3D model socket events
│   │   ├── socketConfig.js        # Socket.IO server configuration
│   │   └── socketHandlers.js      # Main socket event handlers
│   │
│   ├── utils/                     # Utility functions
│   │   ├── fileSystem.js          # File read/write operations
│   │   ├── idGenerator.js         # ID generation utilities
│   │   └── responseHelper.js      # Consistent API response formatting
│   │
│   ├── app.js                     # Express app setup
│   └── server.js                  # Server entry point
│
├── data/                          # Data storage
│   ├── events.json                # Events database (JSON)
│   └── models/                    # Uploaded 3D models
│
├── .env.example                   # Environment variables template
├── .gitignore                     # Git ignore rules
├── package.json                   # Dependencies and scripts
├── REFACTORING_GUIDE.md          # Detailed refactoring documentation
├── MIGRATION.md                   # Migration guide
└── PROJECT_STRUCTURE.md          # This file
```

## Module Responsibilities

### Config Layer
- **constants.js**: Centralized constants (no magic strings)
- **environment.js**: Environment variable parsing and defaults

### Controller Layer
- Handle business logic
- Validate input
- Call utility functions
- Return formatted responses

### Middleware Layer
- **corsMiddleware.js**: CORS policy configuration
- **errorMiddleware.js**: Catch and format errors
- **uploadMiddleware.js**: File upload validation and storage

### Route Layer
- Define API endpoints
- Map HTTP methods to controllers
- Apply middleware

### Socket Layer
- **socketConfig.js**: Socket.IO server setup
- **socketHandlers.js**: WebRTC, chat, screen share events
- **modelSocketHandlers.js**: 3D model synchronization events

### Utils Layer
- **fileSystem.js**: File I/O operations
- **idGenerator.js**: Generate unique IDs
- **responseHelper.js**: Standardized API responses

## Data Flow

### HTTP Request Flow
```
Client Request
    ↓
Express Middleware (CORS, JSON parsing)
    ↓
Route Handler
    ↓
Controller (Business Logic)
    ↓
Utils/Helpers (if needed)
    ↓
Response Helper (Format response)
    ↓
Client Response
```

### Socket Event Flow
```
Client Socket Event
    ↓
Socket Handler
    ↓
Validation & Authorization
    ↓
Business Logic
    ↓
Broadcast to Room/User
    ↓
Client Receives Event
```

## Key Design Patterns

1. **MVC Pattern**: Separation of routes, controllers, and data
2. **Dependency Injection**: Pass dependencies (io, rooms, roomModels) via app.locals
3. **Single Responsibility**: Each module has one clear purpose
4. **DRY Principle**: Reusable helpers and utilities
5. **Configuration Management**: Centralized config and constants

## Environment Variables

All environment-specific configuration is in `.env`:

```env
# Server
PORT=4000
HOST=0.0.0.0
NODE_ENV=production

# CORS
CORS_ORIGIN=http://localhost:3000

# Socket.IO
SOCKET_PING_TIMEOUT=60000
SOCKET_PING_INTERVAL=25000

# LiveKit (Optional)
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=secret
LIVEKIT_URL=ws://localhost:7880

# Upload
MAX_FILE_SIZE=52428800
```

## Testing

To verify the structure:
```bash
node -e "require('./src/server')"
```

To run the server:
```bash
npm start          # Production
npm run dev        # Development (with nodemon)
```

## Benefits of This Structure

1. **Maintainability**: Easy to find and modify code
2. **Scalability**: Simple to add new features
3. **Testability**: Each module can be tested independently
4. **Readability**: Clear organization and naming
5. **Reusability**: Shared utilities and helpers
6. **Production Ready**: Proper error handling and configuration
