# API Documentation

## Overview

The application has a dual API structure:
- **Frontend API Routes** (`/api/*`) - Next.js API routes that proxy to backend
- **Backend API** - Direct Express.js endpoints

## Frontend API Routes

Base URL: `http://localhost:3000/api`

All frontend API routes proxy requests to the backend server.

### Health Check

**GET** `/api/health`

Returns health status of both frontend and backend.

**Response:**
```json
{
  "frontend": {
    "status": "ok",
    "timestamp": "2024-01-01T00:00:00.000Z"
  },
  "backend": {
    "status": "ok",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "rooms": 5,
    "connections": 12
  }
}
```

### Events API

#### Get All Events

**GET** `/api/events`

**Response:**
```json
[
  {
    "id": "abc123",
    "name": "Team Meeting",
    "date": "2024-01-01",
    "description": "Weekly team sync"
  }
]
```

#### Get Event by ID

**GET** `/api/events/:id`

**Response:**
```json
{
  "id": "abc123",
  "name": "Team Meeting",
  "date": "2024-01-01",
  "description": "Weekly team sync"
}
```

#### Create Event

**POST** `/api/events`

**Request Body:**
```json
{
  "id": "abc123",
  "name": "Team Meeting",
  "date": "2024-01-01",
  "description": "Weekly team sync"
}
```

**Response:** `201 Created`
```json
{
  "id": "abc123",
  "name": "Team Meeting",
  "date": "2024-01-01",
  "description": "Weekly team sync"
}
```

#### Update Event

**PUT** `/api/events/:id`

**Request Body:**
```json
{
  "name": "Updated Meeting",
  "description": "New description"
}
```

**Response:**
```json
{
  "id": "abc123",
  "name": "Updated Meeting",
  "date": "2024-01-01",
  "description": "New description"
}
```

#### Delete Event

**DELETE** `/api/events/:id`

**Response:**
```json
{
  "message": "Event deleted successfully"
}
```

### Rooms API

#### Get Room Info

**GET** `/api/rooms/:roomId`

**Response:**
```json
{
  "exists": true,
  "participants": 5
}
```

## Backend API

Base URL: `http://localhost:4000`

Direct access to backend endpoints (same as frontend proxy).

### Endpoints

All endpoints are the same as frontend API routes, but accessed directly:
- `GET /health`
- `GET /api/events`
- `GET /api/events/:id`
- `POST /api/events`
- `PUT /api/events/:id`
- `DELETE /api/events/:id`
- `GET /api/rooms/:roomId`

## Socket.IO Events

Base URL: `http://localhost:4000`

### Client → Server Events

| Event | Data | Description |
|-------|------|-------------|
| `join-room` | `{ roomId: string, userName: string }` | Join a video room |
| `signal` | `{ to: string, signal: any }` | WebRTC signaling |
| `screen-signal` | `{ to: string, signal: any }` | Screen share signaling |
| `chat-message` | `{ roomId: string, userName: string, message: string, timestamp: number }` | Send chat message |
| `private-message` | `{ userName: string, message: string, timestamp: number, to: string }` | Send private message |
| `screen-share-started` | `{ roomId: string }` | Notify screen share start |
| `screen-share-stopped` | `{ roomId: string }` | Notify screen share stop |

### Server → Client Events

| Event | Data | Description |
|-------|------|-------------|
| `user-joined` | `{ userId: string, userName: string }` | New user joined room |
| `existing-users` | `[{ userId: string, userName: string }]` | List of users in room |
| `user-left` | `{ userId: string }` | User left room |
| `signal` | `{ from: string, signal: any }` | WebRTC signal from peer |
| `screen-signal` | `{ from: string, signal: any }` | Screen share signal |
| `chat-message` | `{ userId: string, userName: string, message: string, timestamp: number }` | Chat message received |
| `private-message` | `{ userId: string, userName: string, message: string, timestamp: number }` | Private message received |
| `screen-share-started` | `{ userId: string }` | User started screen sharing |
| `screen-share-stopped` | `{ userId: string }` | User stopped screen sharing |

## Error Responses

All API endpoints return standard HTTP error codes:

**400 Bad Request**
```json
{
  "error": "Invalid request data"
}
```

**404 Not Found**
```json
{
  "error": "Resource not found"
}
```

**500 Internal Server Error**
```json
{
  "error": "Internal server error"
}
```

## Usage Examples

### JavaScript/TypeScript

```typescript
// Fetch events
const response = await fetch('http://localhost:3000/api/events');
const events = await response.json();

// Create event
const response = await fetch('http://localhost:3000/api/events', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    id: 'abc123',
    name: 'My Event',
    date: '2024-01-01'
  })
});

// Socket.IO connection
import { io } from 'socket.io-client';

const socket = io('http://localhost:4000');

socket.emit('join-room', {
  roomId: 'room123',
  userName: 'John Doe'
});

socket.on('user-joined', (data) => {
  console.log('User joined:', data);
});
```

### cURL

```bash
# Get all events
curl http://localhost:3000/api/events

# Create event
curl -X POST http://localhost:3000/api/events \
  -H "Content-Type: application/json" \
  -d '{"id":"abc123","name":"My Event","date":"2024-01-01"}'

# Get specific event
curl http://localhost:3000/api/events/abc123

# Update event
curl -X PUT http://localhost:3000/api/events/abc123 \
  -H "Content-Type: application/json" \
  -d '{"name":"Updated Event"}'

# Delete event
curl -X DELETE http://localhost:3000/api/events/abc123

# Health check
curl http://localhost:3000/api/health
```

## Rate Limiting

Currently, there is no rate limiting implemented. For production, consider adding:
- Rate limiting middleware
- API authentication
- Request validation

## CORS

CORS is configured in the backend to allow requests from the frontend origin.

Default: `http://localhost:3000`

Configure via `CORS_ORIGIN` environment variable in backend.
