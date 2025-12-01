# Backend Auth & Database Integration

## Overview

The backend now handles all authentication-related database operations and provides REST APIs for the frontend to interact with user data, meetings, and guest sessions.

## Architecture

```
Frontend (Next.js)
    ↓ HTTP Requests
Backend (Express.js)
    ↓ Database Operations
MongoDB
```

## New Dependencies

```json
{
  "mongodb": "^6.x",
  "express-validator": "^7.x",
  "jsonwebtoken": "^9.x",
  "bcryptjs": "^2.x",
  "nanoid": "^3.x"
}
```

## Database Models

### User Model (`src/models/User.js`)
- Manages user data synced from Auth0
- Methods: `findByAuth0Id`, `create`, `updateLastLogin`, `updateRole`

### Meeting Model (`src/models/Meeting.js`)
- Manages meeting data and participants
- Methods: `create`, `findById`, `addParticipant`, `updateParticipantRole`, `removeParticipant`

### GuestSession Model (`src/models/GuestSession.js`)
- Manages temporary guest sessions (24-hour expiry)
- Methods: `create`, `findByGuestId`, `deleteExpired`

## API Endpoints

### Auth Routes (`/api/auth`)

#### POST `/api/auth/sync`
Sync user from Auth0 to MongoDB
```json
{
  "auth0Id": "auth0|123456",
  "email": "user@example.com",
  "name": "John Doe",
  "picture": "https://..."
}
```

#### GET `/api/auth/user/:auth0Id`
Get user profile by Auth0 ID

#### PUT `/api/auth/user/:auth0Id/role`
Update user role
```json
{
  "role": "host|cohost|participant|guest"
}
```

### Meeting Routes (`/api/meetings`)

#### POST `/api/meetings`
Create a new meeting (user automatically becomes host)
```json
{
  "auth0Id": "auth0|123456",
  "title": "Team Meeting",
  "description": "Weekly sync",
  "scheduledTime": "2024-12-03T10:00:00Z"
}
```

#### GET `/api/meetings/:meetingId`
Get meeting by ID

#### GET `/api/meetings/host/:auth0Id`
Get all meetings hosted by a user

#### POST `/api/meetings/:meetingId/cohost`
Assign cohost role to a participant
```json
{
  "hostAuth0Id": "auth0|123456",
  "participantAuth0Id": "auth0|789012"
}
```

#### POST `/api/meetings/:meetingId/participant`
Add participant to meeting
```json
{
  "auth0Id": "auth0|123456",
  "name": "John Doe",
  "role": "participant"
}
```

#### DELETE `/api/meetings/:meetingId/participant`
Remove participant from meeting
```json
{
  "hostAuth0Id": "auth0|123456",
  "participantAuth0Id": "auth0|789012"
}
```

#### PUT `/api/meetings/:meetingId/status`
Update meeting status
```json
{
  "status": "scheduled|active|ended"
}
```

### Guest Routes (`/api/guest`)

#### POST `/api/guest/session`
Create guest session
```json
{
  "name": "Guest User",
  "meetingId": "meeting123"
}
```

#### GET `/api/guest/session/:guestId`
Get guest session by ID

## Database Configuration

### Environment Variables

Add to `.env`:
```env
MONGODB_URI=mongodb://localhost:27017/meetxluma
```

### Connection

The database connection is initialized in `src/config/database.js` and automatically connects when the server starts.

### Indexes

Automatically created indexes:
- `users.auth0Id` (unique)
- `users.email`
- `meetings.hostAuth0Id`
- `meetings.status`
- `meetings.createdAt`
- `guestSessions.guestId` (unique)
- `guestSessions.expiresAt` (TTL index for auto-deletion)

## MongoDB Collections

### users
```javascript
{
  _id: ObjectId,
  auth0Id: String (unique),
  email: String,
  name: String,
  picture: String,
  role: String, // 'host', 'cohost', 'participant', 'guest'
  createdAt: Date,
  updatedAt: Date
}
```

### meetings
```javascript
{
  _id: ObjectId,
  title: String,
  description: String,
  scheduledTime: Date,
  hostId: ObjectId,
  hostAuth0Id: String,
  participants: [
    {
      userId: ObjectId,
      auth0Id: String,
      guestId: String,
      name: String,
      role: String,
      joinedAt: Date
    }
  ],
  status: String, // 'scheduled', 'active', 'ended'
  createdAt: Date,
  updatedAt: Date
}
```

### guestSessions
```javascript
{
  _id: ObjectId,
  guestId: String (unique),
  name: String,
  meetingId: String,
  role: String, // always 'guest'
  createdAt: Date,
  expiresAt: Date // TTL index - auto-deletes after 24 hours
}
```

## Frontend Integration

The frontend no longer directly accesses MongoDB. Instead, it calls backend APIs:

### Example: Sync User
```typescript
// frontend/app/api/auth/sync/route.ts
const response = await fetch(`${BACKEND_API_URL}/api/auth/sync`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    auth0Id: session.user.sub,
    email: session.user.email,
    name: session.user.name,
    picture: session.user.picture,
  }),
});
```

### Example: Create Meeting
```typescript
// frontend/app/api/meetings/create/route.ts
const response = await fetch(`${BACKEND_API_URL}/api/meetings`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    auth0Id: session.user.sub,
    title,
    description,
    scheduledTime,
  }),
});
```

## Running the Backend

### Development
```bash
cd backend
npm install
npm run dev
```

### Production
```bash
cd backend
npm install
npm start
```

## Testing

### Test User Sync
```bash
curl -X POST http://localhost:4000/api/auth/sync \
  -H "Content-Type: application/json" \
  -d '{
    "auth0Id": "auth0|123456",
    "email": "test@example.com",
    "name": "Test User",
    "picture": "https://example.com/avatar.jpg"
  }'
```

### Test Meeting Creation
```bash
curl -X POST http://localhost:4000/api/meetings \
  -H "Content-Type: application/json" \
  -d '{
    "auth0Id": "auth0|123456",
    "title": "Test Meeting",
    "description": "Testing the API"
  }'
```

### Test Guest Session
```bash
curl -X POST http://localhost:4000/api/guest/session \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Guest User",
    "meetingId": "meeting123"
  }'
```

## Security Considerations

1. **CORS**: Configure `CORS_ORIGIN` in `.env` to match your frontend URL
2. **Input Validation**: All inputs are validated before database operations
3. **Error Handling**: Errors are caught and logged without exposing sensitive data
4. **Role Checks**: Permission checks are performed before role-based operations

## Monitoring

The backend logs all database operations and errors to the console. In production, consider using a logging service like:
- Winston
- Bunyan
- Pino

## Backup & Recovery

### Backup MongoDB
```bash
mongodump --uri="mongodb://localhost:27017/meetxluma" --out=/backup/path
```

### Restore MongoDB
```bash
mongorestore --uri="mongodb://localhost:27017/meetxluma" /backup/path/meetxluma
```

## Troubleshooting

### MongoDB Connection Failed
- Check `MONGODB_URI` in `.env`
- Ensure MongoDB is running: `mongosh`
- Check network connectivity

### API Returns 500 Error
- Check backend logs for detailed error messages
- Verify MongoDB connection
- Check request payload format

### Guest Sessions Not Expiring
- Verify TTL index is created: `db.guestSessions.getIndexes()`
- MongoDB TTL monitor runs every 60 seconds

## Next Steps

1. Add authentication middleware to validate Auth0 tokens
2. Implement rate limiting
3. Add request logging
4. Set up monitoring and alerts
5. Implement database migrations
6. Add unit and integration tests

## Support

For issues or questions, check:
- Backend logs: `npm run dev`
- MongoDB logs: `mongod --logpath /var/log/mongodb/mongod.log`
- Frontend logs: Browser console
