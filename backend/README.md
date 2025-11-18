# Luma Meet Backend

Backend server handling WebSocket connections, data storage, and API endpoints.

## 📁 Structure

```
backend/
├── src/
│   └── server.js       # Main server file
├── data/               # JSON data storage
│   └── events.json     # Events data
├── package.json
├── .env.example
└── README.md
```

## 🚀 Setup

```bash
npm install
cp .env.example .env
npm start
```

## 🔧 Environment Variables

```env
PORT=4000
HOST=0.0.0.0
NODE_ENV=production
CORS_ORIGIN=http://localhost:3000
```

## 📡 REST API Endpoints

### Health Check
- `GET /health` - Server health status

### Events API
- `GET /api/events` - Get all events
- `GET /api/events/:id` - Get specific event
- `POST /api/events` - Create new event
- `PUT /api/events/:id` - Update event
- `DELETE /api/events/:id` - Delete event

### Rooms API
- `GET /api/rooms/:roomId` - Get room information

## 🔌 Socket.IO Events

### Client → Server
| Event | Data | Description |
|-------|------|-------------|
| `join-room` | `{ roomId, userName }` | Join a room |
| `signal` | `{ to, signal }` | WebRTC signaling |
| `screen-signal` | `{ to, signal }` | Screen share signaling |
| `chat-message` | `{ roomId, userName, message, timestamp }` | Send chat message |
| `private-message` | `{ userName, message, timestamp, to }` | Send private message |
| `screen-share-started` | `{ roomId }` | Notify screen share start |
| `screen-share-stopped` | `{ roomId }` | Notify screen share stop |

### Server → Client
| Event | Data | Description |
|-------|------|-------------|
| `user-joined` | `{ userId, userName }` | New user joined |
| `existing-users` | `[{ userId, userName }]` | List of users in room |
| `user-left` | `{ userId }` | User left room |
| `signal` | `{ from, signal }` | WebRTC signal |
| `screen-signal` | `{ from, signal }` | Screen share signal |
| `chat-message` | `{ userId, userName, message, timestamp }` | Chat message |
| `private-message` | `{ userId, userName, message, timestamp }` | Private message |
| `screen-share-started` | `{ userId }` | Screen share started |
| `screen-share-stopped` | `{ userId }` | Screen share stopped |

## 💾 Data Storage

Data is stored in JSON files in the `data/` directory:
- `events.json` - Event information

## 🔒 Security

- CORS configured for specific origins
- Environment-based configuration
- Input validation on API endpoints

## 🛠️ Development

```bash
npm run dev  # Auto-reload with nodemon
```

## 📊 Monitoring

Health check endpoint provides:
- Server status
- Active rooms count
- Connected clients count
- Timestamp

Example:
```bash
curl http://localhost:4000/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "rooms": 5,
  "connections": 12
}
```
