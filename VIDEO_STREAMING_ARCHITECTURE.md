# Video Streaming Architecture

## Overview

Luma Meet is a real-time video conferencing platform built on WebRTC peer-to-peer (P2P) architecture with Socket.IO signaling. The system supports multi-party video calls, screen sharing, real-time chat, and collaborative 3D model viewing.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Browser    │  │   Browser    │  │   Browser    │          │
│  │   Client 1   │  │   Client 2   │  │   Client N   │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                  │                  │                   │
│         │  WebRTC P2P     │                  │                   │
│         ├─────────────────┼──────────────────┤                   │
│         │  (Video/Audio)  │                  │                   │
│         │                 │                  │                   │
└─────────┼─────────────────┼──────────────────┼───────────────────┘
          │                 │                  │
          │  Socket.IO      │                  │
          │  (Signaling)    │                  │
          │                 │                  │
┌─────────▼─────────────────▼──────────────────▼───────────────────┐
│                      SIGNALING LAYER                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │              Socket.IO Server (Node.js)                    │  │
│  │  - WebRTC Signaling (SDP Offer/Answer)                    │  │
│  │  - ICE Candidate Exchange                                  │  │
│  │  - Room Management                                         │  │
│  │  - User Presence                                           │  │
│  │  - Chat Relay                                              │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                   │
└───────────────────────────────┬───────────────────────────────────┘
                                │
┌───────────────────────────────▼───────────────────────────────────┐
│                      BACKEND SERVICES                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Express    │  │   MongoDB    │  │    Redis     │          │
│  │   REST API   │  │   Database   │  │    Cache     │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                                │
┌───────────────────────────────▼───────────────────────────────────┐
│                      EXTERNAL SERVICES                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  STUN/TURN   │  │    Auth0     │  │  File Store  │          │
│  │   Servers    │  │     Auth     │  │   (Models)   │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Frontend (Next.js + React)

**Location**: `frontend/app/room/[id]/page.tsx`

#### Key Technologies
- **Framework**: Next.js 16 (React 19)
- **WebRTC Library**: SimplePeer 9.11.1
- **Real-time Communication**: Socket.IO Client 4.8.1
- **3D Rendering**: Three.js, React Three Fiber
- **Hand Tracking**: MediaPipe Hands

#### Main Features

##### A. Media Stream Management
```typescript
// Local media stream acquisition
navigator.mediaDevices.getUserMedia({
  video: {
    width: { ideal: 1920 },
    height: { ideal: 1080 },
    frameRate: { ideal: 24, max: 30 }
  },
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    sampleRate: 48000,
    channelCount: 1
  }
})
```

**Device-Specific Optimizations**:
- **Mobile**: 640x480, 15-20 fps
- **Tablet**: 1280x720, 24 fps
- **Desktop**: 1920x1080, 30 fps
- **Low Power Mode**: 640x480, 15 fps

##### B. WebRTC Peer Connection

**Peer Types**:
1. **Camera Peers**: For video/audio streaming
2. **Screen Peers**: Separate connections for screen sharing

**Connection Flow**:
```typescript
// Initiator (new user connecting to existing users)
const peer = new SimplePeer({
  initiator: true,
  trickle: true,
  stream: localStream,
  config: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      // ... multiple STUN servers for redundancy
    ],
    iceTransportPolicy: 'all',
    bundlePolicy: 'max-bundle',
    rtcpMuxPolicy: 'require'
  }
})

// Non-initiator (existing user receiving connection)
const peer = new SimplePeer({
  initiator: false,
  trickle: true,
  stream: localStream,
  config: { /* same config */ }
})
```

**Peer Events**:
- `signal`: SDP offer/answer and ICE candidates
- `stream`: Remote media stream received
- `connect`: Peer connection established
- `error`: Connection errors
- `close`: Connection closed

##### C. Screen Sharing

**Dual-Stream Architecture**:
- Camera stream continues on original peer connections
- Screen share uses separate peer connections
- Supports system audio capture (browser-dependent)

```typescript
// Screen share with audio
const screenStream = await navigator.mediaDevices.getDisplayMedia({
  video: {
    width: { ideal: 1920 },
    height: { ideal: 1080 },
    frameRate: { ideal: 30 }
  },
  audio: true // System audio
})

// Combine with microphone audio
const micAudioTrack = localStream.getAudioTracks()[0]
screenStream.addTrack(micAudioTrack)
```

##### D. Active Speaker Detection

**Audio Analysis**:
```typescript
// Create audio analyser for each peer
const audioContext = new AudioContext()
const analyser = audioContext.createAnalyser()
analyser.fftSize = 256
analyser.smoothingTimeConstant = 0.8

// Detect volume levels
const dataArray = new Uint8Array(analyser.frequencyBinCount)
analyser.getByteFrequencyData(dataArray)
const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length
```

**Detection Interval**: 200ms
**Speaking Threshold**: 20 (volume level)

##### E. Picture-in-Picture (PiP)

**Fallback Strategy**:
1. Native browser PiP (preferred)
2. Custom floating window (fallback)
3. Automatic activation when tab is hidden

**Supported Content**:
- Screen share (if active)
- Local video (fallback)

### 2. Backend (Node.js + Express)

**Location**: `backend/src/`

#### Key Technologies
- **Runtime**: Node.js 18+
- **Framework**: Express.js 4.18.2
- **Real-time**: Socket.IO 4.6.1
- **Database**: MongoDB (Mongoose)
- **Cache**: Redis
- **Authentication**: Auth0

#### Socket.IO Event Handlers

**Location**: `backend/src/socket/socketHandlers.js`

##### Connection Events
```javascript
// User joins room
socket.on('join-room', ({ roomId, userName }) => {
  socket.join(roomId)
  socket.userName = userName
  socket.roomId = roomId
  
  // Notify existing users
  socket.to(roomId).emit('user-joined', { userId: socket.id, userName })
  
  // Send existing users list to new user
  socket.emit('existing-users', existingUsers)
})

// User disconnects
socket.on('disconnect', () => {
  socket.to(roomId).emit('user-left', { userId: socket.id })
  // Clean up room if empty
})
```

##### WebRTC Signaling
```javascript
// Forward SDP offer/answer and ICE candidates
socket.on('signal', ({ to, signal }) => {
  io.to(to).emit('signal', { from: socket.id, signal })
})

// Screen share signaling (separate channel)
socket.on('screen-signal', ({ to, signal }) => {
  io.to(to).emit('screen-signal', { from: socket.id, signal })
})
```

##### Screen Share Events
```javascript
socket.on('screen-share-started', ({ roomId }) => {
  socket.to(roomId).emit('screen-share-started', { userId: socket.id })
})

socket.on('screen-share-stopped', ({ roomId }) => {
  socket.to(roomId).emit('screen-share-stopped', { userId: socket.id })
})
```

##### Chat Events
```javascript
// Public chat
socket.on('chat-message', ({ roomId, userName, message, timestamp }) => {
  socket.to(roomId).emit('chat-message', { userId: socket.id, userName, message, timestamp })
})

// Private chat
socket.on('private-message', ({ userName, message, timestamp, to }) => {
  io.to(to).emit('private-message', { userId: socket.id, userName, message, timestamp })
})
```

##### Meeting Control
```javascript
// Host ends meeting
socket.on('end-meeting', async ({ roomId, hostAuth0Id }) => {
  // Verify host permission
  // Update meeting status to 'ended'
  // Notify all participants
  io.to(roomId).emit('meeting-ended', { message: 'Meeting ended by host' })
  // Clean up resources
})
```

#### Room Management

**In-Memory Storage**:
```javascript
const rooms = new Map() // roomId -> Set<socketId>
const roomModels = new Map() // roomId -> 3D model data
```

**Room Lifecycle**:
1. **Created**: First user joins
2. **Active**: Meeting in progress
3. **Ended**: Last user leaves or host ends meeting
4. **Cleanup**: Resources freed, join requests deleted

### 3. Database Layer

#### MongoDB Collections

**Meetings**:
```javascript
{
  _id: ObjectId,
  meetingCode: String,      // Unique room identifier
  title: String,
  hostAuth0Id: String,      // Meeting host
  cohosts: [String],        // Co-host Auth0 IDs
  status: String,           // 'scheduled', 'active', 'ended'
  isPrivate: Boolean,
  requireApproval: Boolean,
  startTime: Date,
  endTime: Date,
  lastActivity: Date,
  createdAt: Date,
  updatedAt: Date
}
```

**Join Requests** (Redis):
```javascript
{
  requestId: String,
  meetingCode: String,
  guestName: String,
  status: String,           // 'pending', 'approved', 'rejected'
  requestedAt: Date,
  expiresAt: Date
}
```

**Users**:
```javascript
{
  _id: ObjectId,
  auth0Id: String,
  email: String,
  name: String,
  createdAt: Date
}
```

### 4. WebRTC Configuration

#### ICE Servers

**STUN Servers** (NAT Traversal):
```javascript
const iceServers = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun4.l.google.com:19302' },
  { urls: 'stun:stun.services.mozilla.com' },
  { urls: 'stun:stun.stunprotocol.org:3478' }
]
```

**TURN Servers** (Relay - Optional):
```javascript
{
  urls: 'turn:your-turn-server.com:3478',
  username: 'username',
  credential: 'password'
}
```

#### Connection Policies
- **ICE Transport**: `all` (try all candidates)
- **Bundle Policy**: `max-bundle` (bundle all media)
- **RTCP Mux**: `require` (multiplex RTP and RTCP)

## Data Flow

### 1. Room Join Flow

```
Client                    Socket.IO Server              MongoDB
  │                              │                         │
  ├─ getUserMedia() ────────────┤                         │
  │  (camera + mic)              │                         │
  │                              │                         │
  ├─ connect() ─────────────────>│                         │
  │                              │                         │
  ├─ emit('join-room') ─────────>│                         │
  │                              │                         │
  │                              ├─ join(roomId) ──────────┤
  │                              │                         │
  │                              ├─ updateMeetingActivity ─>│
  │                              │                         │
  │<─ emit('existing-users') ────┤                         │
  │                              │                         │
  │                              ├─ broadcast('user-joined')>│
  │                              │   to other clients      │
  │                              │                         │
  ├─ createPeer() ───────────────┤                         │
  │  for each existing user      │                         │
  │                              │                         │
  ├─ emit('signal') ────────────>│                         │
  │  (SDP offer)                 │                         │
  │                              │                         │
  │                              ├─ forward to peer ───────>│
  │                              │                         │
  │<─ emit('signal') ─────────────┤                         │
  │  (SDP answer)                │                         │
  │                              │                         │
  ├─ peer.signal(answer) ────────┤                         │
  │                              │                         │
  ├─ ICE candidates exchange ────┤                         │
  │                              │                         │
  ├─ WebRTC connection established                         │
  │  (P2P media streaming)       │                         │
```

### 2. Screen Share Flow

```
Client                    Socket.IO Server              Other Clients
  │                              │                         │
  ├─ getDisplayMedia() ──────────┤                         │
  │  (screen + audio)            │                         │
  │                              │                         │
  ├─ emit('screen-share-started')>│                         │
  │                              │                         │
  │                              ├─ broadcast ─────────────>│
  │                              │   'screen-share-started' │
  │                              │                         │
  │                              │                         ├─ createScreenPeer()
  │                              │                         │
  │<─ emit('screen-signal') ──────────────────────────────┤
  │  (SDP offer)                 │                         │
  │                              │                         │
  ├─ emit('screen-signal') ──────────────────────────────>│
  │  (SDP answer)                │                         │
  │                              │                         │
  ├─ Screen WebRTC connection established ────────────────>│
  │  (P2P screen streaming)      │                         │
  │                              │                         │
  │  Camera connections remain active                      │
```

### 3. Chat Message Flow

```
Client A                  Socket.IO Server              Client B
  │                              │                         │
  ├─ emit('chat-message') ──────>│                         │
  │  { roomId, userName,         │                         │
  │    message, timestamp }      │                         │
  │                              │                         │
  │                              ├─ broadcast ─────────────>│
  │                              │   to room (except A)    │
  │                              │                         │
  │                              │                         ├─ display message
  │                              │                         │
  │  (Private message)           │                         │
  ├─ emit('private-message') ────>│                         │
  │  { to: userId, ... }         │                         │
  │                              │                         │
  │                              ├─ emit to specific user ─>│
  │                              │                         │
```

## Performance Optimizations

### 1. Video Quality Adaptation

**Device-Based**:
- Mobile: 640x480 @ 15-20 fps
- Tablet: 1280x720 @ 24 fps
- Desktop: 1920x1080 @ 30 fps

**Low Power Mode**:
- Resolution: 640x480
- Frame rate: 15 fps
- Reduced processing

### 2. Audio Optimizations

- **Mono audio**: 1 channel (vs stereo)
- **Sample rate**: 48kHz
- **Echo cancellation**: Enabled
- **Noise suppression**: Enabled
- **Auto gain control**: Enabled

### 3. Connection Optimizations

**Multiple STUN Servers**:
- Redundancy for NAT traversal
- Faster ICE candidate gathering
- Better connectivity success rate

**Trickle ICE**:
- Send ICE candidates as discovered
- Faster connection establishment
- Reduced latency

**Bundle Policy**:
- Single connection for all media
- Reduced overhead
- Better firewall traversal

### 4. State Management

**Duplicate Prevention**:
- Track processed signals
- Prevent duplicate peer connections
- Handle race conditions

**Memory Management**:
- Clean up peers on disconnect
- Stop media tracks
- Close audio contexts
- Clear analyser nodes

## Scalability Considerations

### Current Architecture (P2P)

**Limitations**:
- **Max participants**: ~10 per room
- **Bandwidth**: O(n²) - each peer sends to all others
- **CPU**: Encoding/decoding for each peer

**Advantages**:
- Low latency (<200ms)
- No server bandwidth costs
- Simple architecture
- Privacy (no server recording)

### Future Architecture (SFU)

**Planned Migration to LiveKit**:
```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │
       │ Single upload stream
       │
┌──────▼──────┐
│  LiveKit    │ ← Selective Forwarding Unit
│     SFU     │
└──────┬──────┘
       │
       │ Multiple download streams
       │
┌──────▼──────┐
│   Clients   │
└─────────────┘
```

**Benefits**:
- **Max participants**: 100+ per room
- **Bandwidth**: O(n) - upload once, server forwards
- **CPU**: Single encode, multiple decodes
- **Features**: Recording, transcription, simulcast

## Security

### 1. WebRTC Security

**Encryption**:
- **DTLS-SRTP**: Mandatory encryption for media
- **HTTPS/WSS**: Secure signaling in production

**Authentication**:
- Auth0 integration for user identity
- Host/co-host permissions
- Private meeting support

### 2. Network Security

**CORS Protection**:
```javascript
cors: {
  origin: process.env.CORS_ORIGIN,
  methods: ['GET', 'POST'],
  credentials: true
}
```

**Input Validation**:
- Sanitize user inputs
- Validate file uploads
- Rate limiting (planned)

### 3. Privacy

**No Recording**:
- P2P streams not stored on server
- No persistent media data
- Ephemeral room state

**Data Retention**:
- Meeting metadata only
- No chat history
- No video/audio storage

## Monitoring & Debugging

### 1. Client-Side Logging

**Development Mode**:
```typescript
const devLog = (...args) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(...args)
  }
}
```

**Connection States**:
- ICE connection state
- Signaling state
- Peer connection state
- Media track states

### 2. Server-Side Logging

**Socket Events**:
- Connection/disconnection
- Room join/leave
- Signal forwarding
- Error tracking

**Room Statistics**:
- Active rooms count
- Participants per room
- Connection duration

### 3. Error Tracking

**Client Errors**:
- Media device access failures
- Peer connection errors
- Signaling errors
- Browser compatibility issues

**Server Errors**:
- Socket connection failures
- Database errors
- Redis errors
- Resource cleanup failures

## Browser Compatibility

### Supported Browsers

**Desktop**:
- Chrome 90+ ✅
- Firefox 88+ ✅
- Edge 90+ ✅
- Safari 14+ ✅

**Mobile**:
- Chrome Android 90+ ✅
- Safari iOS 14.3+ ✅
- Samsung Internet 14+ ✅

### Feature Support

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| WebRTC | ✅ | ✅ | ✅ | ✅ |
| Screen Share | ✅ | ✅ | ✅ (15.4+) | ✅ |
| System Audio | ✅ | ✅ | ✅ | ✅ |
| PiP | ✅ | ✅ | ✅ | ✅ |
| MediaPipe | ✅ | ✅ | ⚠️ | ✅ |

## Deployment

### Current Setup

**Frontend**: Vercel
- Next.js static export
- CDN distribution
- Automatic HTTPS

**Backend**: Render.com
- Node.js runtime
- WebSocket support
- Auto-scaling

**Database**: MongoDB Atlas
- Managed service
- Automatic backups
- Global distribution

**Cache**: Redis Cloud
- Managed Redis
- Pub/sub support
- Session storage

### Environment Variables

**Frontend** (`.env.local`):
```bash
NEXT_PUBLIC_SOCKET_URL=https://backend.render.com
NEXT_PUBLIC_API_URL=https://backend.render.com
NEXT_AUTH_URL=https://app.vercel.app
AUTH0_SECRET=xxx
AUTH0_BASE_URL=https://app.vercel.app
AUTH0_ISSUER_BASE_URL=https://tenant.auth0.com
AUTH0_CLIENT_ID=xxx
AUTH0_CLIENT_SECRET=xxx
```

**Backend** (`.env`):
```bash
PORT=4000
HOST=0.0.0.0
NODE_ENV=production
CORS_ORIGIN=https://app.vercel.app
MONGODB_URI=mongodb+srv://...
REDIS_URL=redis://...
AUTH0_DOMAIN=tenant.auth0.com
AUTH0_AUDIENCE=https://api.lumameet.com
```

## Future Enhancements

### Phase 1: Performance
- [ ] Adaptive bitrate streaming
- [ ] Bandwidth estimation
- [ ] Network quality indicators
- [ ] Automatic quality adjustment

### Phase 2: Features
- [ ] Recording and playback
- [ ] Virtual backgrounds
- [ ] Noise cancellation (Krisp)
- [ ] Real-time transcription

### Phase 3: Scale
- [ ] Migrate to LiveKit SFU
- [ ] Multi-region deployment
- [ ] Load balancing
- [ ] CDN for static assets

### Phase 4: Enterprise
- [ ] SSO integration
- [ ] Admin dashboard
- [ ] Analytics and reporting
- [ ] Compliance (HIPAA, GDPR)

## Troubleshooting

### Common Issues

**1. No Video/Audio**
- Check browser permissions
- Verify camera/mic not in use
- Check HTTPS requirement
- Test with different browser

**2. Connection Failures**
- Verify STUN server accessibility
- Check firewall/NAT configuration
- Consider TURN server for restrictive networks
- Monitor ICE connection state

**3. Poor Quality**
- Check network bandwidth
- Enable low power mode
- Reduce participant count
- Check CPU usage

**4. Screen Share Not Working**
- Verify browser support (iOS 15.4+)
- Check permissions
- Try different screen/window
- Update browser

## References

### Documentation
- [WebRTC API](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API)
- [SimplePeer](https://github.com/feross/simple-peer)
- [Socket.IO](https://socket.io/docs/v4/)
- [Next.js](https://nextjs.org/docs)

### Standards
- [RFC 8825 - WebRTC Overview](https://datatracker.ietf.org/doc/html/rfc8825)
- [RFC 8829 - JSEP](https://datatracker.ietf.org/doc/html/rfc8829)
- [RFC 8831 - WebRTC Data Channels](https://datatracker.ietf.org/doc/html/rfc8831)

---

**Last Updated**: December 2024
**Version**: 1.0.0
**Maintainer**: Luma Meet Team
