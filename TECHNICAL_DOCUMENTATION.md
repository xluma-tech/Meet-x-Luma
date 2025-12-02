# Luma Meet - Technical Documentation

## Table of Contents
1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Technology Stack](#technology-stack)
4. [Backend Services](#backend-services)
5. [Frontend Application](#frontend-application)
6. [Real-Time Communication](#real-time-communication)
7. [3D Model System](#3d-model-system)
8. [Hand Gesture Recognition](#hand-gesture-recognition)
9. [API Reference](#api-reference)
10. [Database Schema](#database-schema)
11. [Deployment](#deployment)
12. [Performance Optimizations](#performance-optimizations)

---

## System Overview

Luma Meet is a real-time video conferencing platform with advanced features including:
- **WebRTC-based P2P video/audio communication**
- **Screen sharing with system audio capture**
- **Real-time chat (public and private messaging)**
- **3D model visualization and collaborative control**
- **Hand gesture recognition for 3D model manipulation**
- **Picture-in-Picture and floating window support**
- **Active speaker detection**
- **Cross-platform support (Desktop, Mobile, Tablet)**

### Key Features
- Zero-download, browser-based meetings
- No authentication required
- Instant room creation with shareable codes
- Support for 10+ concurrent participants
- Low-latency P2P connections with STUN fallback
- Responsive UI with mobile optimization

---

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Browser    │  │   Mobile     │  │   Tablet     │          │
│  │  (Desktop)   │  │   Browser    │  │   Browser    │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                  │                  │                   │
│         └──────────────────┴──────────────────┘                   │
│                            │                                      │
└────────────────────────────┼──────────────────────────────────────┘
                             │
                    ┌────────▼────────┐
                    │   Next.js App   │
                    │   (Frontend)    │
                    │  - React 19     │
                    │  - TypeScript   │
                    │  - Tailwind CSS │
                    └────────┬────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
┌───────▼────────┐  ┌────────▼────────┐  ┌──────▼──────┐
│  WebRTC P2P    │  │  Socket.IO      │  │  REST API   │
│  Connections   │  │  (Real-time)    │  │  (HTTP)     │
│  - SimplePeer  │  │  - Signaling    │  │  - Events   │
│  - STUN        │  │  - Chat         │  │  - Models   │
└────────────────┘  └────────┬────────┘  └──────┬──────┘
                             │                    │
                    ┌────────▼────────────────────▼────────┐
                    │      Node.js Backend Server          │
                    │      - Express.js                    │
                    │      - Socket.IO Server              │
                    │      - File Upload (Multer)          │
                    └────────┬─────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
┌───────▼────────┐  ┌────────▼────────┐  ┌──────▼──────┐
│  File Storage  │  │  In-Memory      │  │  JSON File  │
│  (3D Models)   │  │  State          │  │  Storage    │
│  - GLB/GLTF    │  │  - Rooms        │  │  - Events   │
│  - Local FS    │  │  - Peers        │  │             │
└────────────────┘  └─────────────────┘  └─────────────┘
```

### Component Interaction Flow

1. **User Creates Event** → Frontend → REST API → JSON Storage
2. **User Joins Room** → Frontend → Socket.IO → Room State
3. **WebRTC Negotiation** → SimplePeer → Socket.IO Signaling → Peer Connection
4. **3D Model Upload** → Frontend → Multer → File Storage → Socket.IO Broadcast
5. **Hand Gesture** → MediaPipe → Frontend → Socket.IO → All Participants

---

## Technology Stack

### Frontend
- **Framework**: Next.js 16.0.3 (React 19.2.0)
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4
- **WebRTC**: simple-peer 9.11.1
- **Real-time**: socket.io-client 4.8.1
- **3D Rendering**: 
  - @react-three/fiber 9.4.0
  - @react-three/drei 10.7.7
  - three.js 0.181.2
- **Hand Tracking**: 
  - @mediapipe/hands 0.4.1675469240
  - @mediapipe/camera_utils 0.3.1675466862
- **ID Generation**: nanoid 5.1.6

### Backend
- **Runtime**: Node.js (18+)
- **Framework**: Express.js 4.18.2
- **Real-time**: Socket.IO 4.6.1
- **File Upload**: Multer 2.0.2
- **CORS**: cors 2.8.5
- **Environment**: dotenv 16.3.1
- **Optional SFU**: livekit-server-sdk 2.0.0

### Infrastructure
- **Deployment**: Render.com / Vercel
- **Storage**: Local filesystem (upgradeable to S3)
- **Database**: JSON file-based (upgradeable to PostgreSQL/MongoDB)

---

## Backend Services

### Server Architecture (backend/src/server.js)

#### Core Components

**1. Express HTTP Server**
- Handles REST API requests
- Serves static 3D model files
- CORS-enabled for cross-origin requests

**2. Socket.IO Server**
- WebSocket-based real-time communication
- Handles signaling for WebRTC
- Room management and participant tracking
- Chat message broadcasting
- 3D model synchronization

**3. Data Management**
- File-based JSON storage for events
- In-memory room state management
- 3D model file storage

#### Key Features

**Room Management**
```javascript
// Room state structure
rooms = Map<roomId, Set<socketId>>
roomModels = Map<roomId, ModelData>

// Model data structure
{
  modelId: string,
  url: string,
  uploaderId: string,
  uploaderName: string,
  publishedAt: number,
  seq: number,
  allowedControllers: string[]
}
```

**WebRTC Signaling Flow**
1. Client joins room → `join-room` event
2. Server sends list of existing users → `existing-users` event
3. Clients exchange SDP offers/answers → `signal` event
4. P2P connection established
5. Media streams exchanged directly between peers

**Screen Sharing Architecture**
- Separate peer connections for screen streams
- Independent from camera peer connections
- System audio + microphone audio mixing
- Automatic cleanup on disconnect

**3D Model Synchronization**
- Upload → Publish → Broadcast workflow
- Transform state synchronization (position, rotation, scale)
- Camera state synchronization
- Permission-based control system
- Sequence numbers for ordering

---

## Frontend Application

### Application Structure

```
frontend/
├── app/
│   ├── page.tsx                    # Landing page
│   ├── layout.tsx                  # Root layout
│   ├── globals.css                 # Global styles
│   ├── create/
│   │   └── page.tsx               # Event creation
│   ├── event/[id]/
│   │   └── page.tsx               # Event details
│   └── room/[id]/
│       ├── page.tsx               # Video room
│       ├── components/
│       │   ├── FloatingWindow.tsx
│       │   ├── HandGestureControl.tsx
│       │   ├── ModelUploadPanel.tsx
│       │   └── ModelViewer.tsx
│       └── hooks/
│           ├── usePictureInPicture.ts
│           └── usePerformanceMonitor.ts
└── config/
    └── api.ts                     # API configuration
```

### Key Pages

**1. Landing Page (app/page.tsx)**
- Hero section with feature highlights
- Create meeting button
- Join with code functionality
- Responsive design with animated background

**2. Event Creation (app/create/page.tsx)**
- Form for meeting details (title, description, date, time)
- Generates unique meeting code
- Stores event in backend

**3. Event Details (app/event/[id]/page.tsx)**
- Displays event information
- Shareable meeting code
- Join button with name input
- Copy link functionality

**4. Video Room (app/room/[id]/page.tsx)**
- Main video conferencing interface
- Multi-participant grid layout
- Screen sharing view
- Chat sidebar
- 3D model viewer overlay
- Control panel

### Device Detection & Optimization

```typescript
const deviceInfo = {
  isMobile: boolean,
  isTablet: boolean,
  isDesktop: boolean,
  isIOS: boolean,
  isAndroid: boolean,
  isSafari: boolean,
  isChrome: boolean,
  isFirefox: boolean,
  isEdge: boolean,
  supportsScreenShare: boolean
}
```

**Adaptive Video Constraints**
- Mobile: 640x480 @ 24fps
- Tablet: 1280x720 @ 24fps
- Desktop: 1920x1080 @ 30fps
- Low Power Mode: 640x480 @ 15fps

---

## Real-Time Communication

### WebRTC Implementation

**SimplePeer Configuration**
```javascript
{
  initiator: boolean,
  trickle: true,
  stream: MediaStream,
  config: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' }
    ]
  }
}
```

**Peer Connection Lifecycle**
1. **Initialization**: User joins room
2. **Offer Creation**: Initiator creates SDP offer
3. **Signaling**: Exchange via Socket.IO
4. **Answer**: Receiver creates SDP answer
5. **ICE Candidates**: Exchange network candidates
6. **Connection**: P2P media stream established
7. **Cleanup**: Destroy on disconnect

**Dual Peer Architecture**
- **Camera Peers**: Video/audio streams
- **Screen Peers**: Screen sharing streams
- Independent lifecycle management
- Prevents camera disruption during screen share

### Socket.IO Events

**Connection Events**
- `join-room`: User joins a room
- `user-joined`: Notify others of new user
- `existing-users`: Send list of current participants
- `user-left`: User disconnects
- `disconnect`: Socket disconnection

**Signaling Events**
- `signal`: WebRTC signaling for camera
- `screen-signal`: WebRTC signaling for screen share

**Chat Events**
- `chat-message`: Public message
- `private-message`: Direct message

**Screen Share Events**
- `screen-share-started`: User starts sharing
- `screen-share-stopped`: User stops sharing

**3D Model Events**
- `model-publish`: Publish model to room
- `model-unpublish`: Remove model from room
- `model-control`: Transform updates
- `model-camera`: Camera position updates
- `model-permissions`: Controller permissions

### Active Speaker Detection

**Audio Analysis**
```javascript
// Setup audio analyser
AudioContext → MediaStreamSource → AnalyserNode

// Detect volume
analyser.getByteFrequencyData(dataArray)
average = sum(dataArray) / length
if (average > THRESHOLD) → activeSpeaker
```

**Visual Feedback**
- Blue ring around active speaker
- Automatic reordering in grid
- Smooth transitions

---

## 3D Model System

### Architecture

**Upload Flow**
1. User selects GLB/GLTF file
2. Frontend uploads via multipart/form-data
3. Backend stores in `data/models/`
4. Returns model metadata
5. User publishes to room
6. Socket.IO broadcasts to all participants

**Synchronization Protocol**
```javascript
// Transform state
{
  position: [x, y, z],
  rotation: [rx, ry, rz],
  scale: [sx, sy, sz]
}

// Control event
{
  modelId: string,
  seq: number,        // Sequence for ordering
  ts: number,         // Timestamp
  payload: {
    transform: TransformState
  }
}
```

**Permission System**
- **Owner**: Full control (uploader)
- **Allowed Controllers**: Granted by owner
- **Viewers**: Read-only access

### ModelViewer Component

**Features**
- Three.js rendering with React Three Fiber
- OrbitControls for camera manipulation
- Drag-to-move model (controllers only)
- Scroll-to-zoom (controllers only)
- Automatic model scaling and centering
- Material preservation
- Texture loading and optimization

**Performance Optimizations**
- Frustum culling enabled
- Texture anisotropy: 4x
- DPR: 0.75-1.0 (adaptive)
- No shadows (performance)
- Throttled updates: 50ms (20 Hz)

**Camera Synchronization**
- Owner/controller broadcasts camera state
- Viewers receive and apply camera updates
- Smooth interpolation
- Throttled to 100ms (10 Hz)

---

## Hand Gesture Recognition

### MediaPipe Hands Integration

**Gesture Types**
1. **👍 Thumbs Up**: Reset model to center
2. **✌️ Peace Sign**: Move model (drag)
3. **✊ Closed Fist**: Zoom in/out
4. **✋ Open Hand**: Rotate model

**Detection Algorithm**
```javascript
// Landmark-based detection
hand = {
  thumbTip: landmarks[4],
  indexTip: landmarks[8],
  middleTip: landmarks[12],
  ringTip: landmarks[16],
  pinkyTip: landmarks[20],
  wrist: landmarks[0]
}

// Distance calculations
thumbIndexDist = distance(thumbTip, indexTip)
indexMiddleDist = distance(indexTip, middleTip)

// Gesture classification
if (thumbUp && othersClosed) → RESET
if (allClosed) → ZOOM
if (indexExtended && middleExtended && close) → MOVE
if (allExtended && spread) → ROTATE
```

**Performance**
- Processing rate: ~30 FPS
- Model complexity: 0 (lightweight)
- Confidence threshold: 0.5
- Single hand tracking
- No visual overlay (performance)

**Integration**
- Enabled only for model controllers
- Uses local video stream
- Throttled gesture events: 33ms
- Automatic cleanup on disable

---

## API Reference

### REST API Endpoints

**Events API**

`GET /api/events`
- Returns: Array of all events
- Response: `Event[]`

`GET /api/events/:id`
- Params: `id` - Event ID
- Returns: Single event
- Response: `Event`
- Error: 404 if not found

`POST /api/events`
- Body: `{ title, description, date, time }`
- Returns: Created event with generated ID
- Response: `Event`

`PUT /api/events/:id`
- Params: `id` - Event ID
- Body: Partial event data
- Returns: Updated event
- Response: `Event`

`DELETE /api/events/:id`
- Params: `id` - Event ID
- Returns: Success message
- Response: `{ message: string }`

**Rooms API**

`GET /api/rooms/:roomId`
- Params: `roomId` - Room ID
- Returns: Room status
- Response: `{ exists: boolean, participants: number }`

**3D Models API**

`POST /api/models/upload`
- Content-Type: `multipart/form-data`
- Fields:
  - `model`: File (GLB/GLTF, max 50MB)
  - `roomId`: string
  - `uploaderId`: string
  - `uploaderName`: string
- Returns: Model metadata
- Response: `ModelData`

`GET /api/models/:modelId`
- Params: `modelId` - Model filename
- Returns: Model file
- Content-Type: `model/gltf-binary` or `model/gltf+json`

`GET /api/rooms/:roomId/model`
- Params: `roomId` - Room ID
- Returns: Current room model
- Response: `{ model: ModelData | null }`

**Health Check**

`GET /health`
- Returns: Server status
- Response: `{ status: 'ok', timestamp: string, rooms: number, connections: number }`

**LiveKit Token (Optional)**

`POST /api/token`
- Body: `{ roomName: string, participantName: string }`
- Returns: LiveKit access token
- Response: `{ token: string, url: string, roomName: string, participantName: string }`
- Error: 501 if LiveKit not configured

---

## Database Schema

### JSON File Structure (events.json)

```json
{
  "events": [
    {
      "id": "abc123xyz",
      "title": "Team Standup",
      "description": "Daily team sync",
      "date": "2025-11-27",
      "time": "10:00",
      "createdAt": "2025-11-26T12:00:00.000Z"
    }
  ]
}
```

### In-Memory State

**Rooms Map**
```javascript
Map<roomId, Set<socketId>>
```

**Room Models Map**
```javascript
Map<roomId, {
  modelId: string,
  url: string,
  uploaderId: string,
  uploaderName: string,
  filename: string,
  size: number,
  uploadedAt: string,
  publishedAt: number,
  seq: number,
  allowedControllers: string[]
}>
```

**Peers (Client-side)**
```javascript
{
  peer: SimplePeer.Instance,
  userId: string,
  userName: string,
  stream?: MediaStream
}
```

---

## Deployment

### Environment Variables

**Backend (.env)**
```bash
PORT=4000
HOST=0.0.0.0
NODE_ENV=production
CORS_ORIGIN=https://your-frontend.vercel.app

# Optional: LiveKit SFU
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=secret
LIVEKIT_URL=ws://localhost:7880
```

**Frontend (.env.production)**
```bash
NEXT_PUBLIC_API_URL=https://your-backend.render.com
NEXT_PUBLIC_SOCKET_URL=https://your-backend.render.com
```

### Deployment Platforms

**Backend: Render.com**
- Service Type: Web Service
- Build Command: `npm install`
- Start Command: `npm start`
- Environment: Node 18+
- Health Check: `/health`

**Frontend: Vercel**
- Framework: Next.js
- Build Command: `npm run build`
- Output Directory: `.next`
- Node Version: 18+

### Docker Deployment (Optional)

**Backend Dockerfile**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 4000
CMD ["npm", "start"]
```

**Frontend Dockerfile**
```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
EXPOSE 3000
CMD ["npm", "start"]
```

---

## Performance Optimizations

### Frontend Optimizations

**1. React Optimizations**
- `useMemo` for expensive calculations
- `useCallback` for stable function references
- Memoized grid layout calculations
- Lazy loading for 3D components

**2. WebRTC Optimizations**
- Adaptive bitrate based on network
- Simulcast for multi-party calls
- Bandwidth estimation
- Packet loss recovery

**3. Rendering Optimizations**
- CSS transforms for animations
- GPU-accelerated video rendering
- Throttled state updates
- Debounced resize handlers

**4. Network Optimizations**
- WebSocket connection pooling
- Message batching
- Compression for large payloads
- CDN for static assets

### Backend Optimizations

**1. Socket.IO**
- Binary protocol for efficiency
- Room-based broadcasting
- Connection pooling
- Heartbeat optimization

**2. File Handling**
- Streaming for large files
- Disk I/O optimization
- Cleanup of orphaned files
- Size limits enforcement

**3. Memory Management**
- Automatic room cleanup
- Peer connection garbage collection
- Stream disposal on disconnect
- Periodic memory profiling

### Browser Compatibility

**Supported Browsers**
- Chrome/Edge 90+
- Firefox 88+
- Safari 14.1+
- Mobile Safari (iOS 14.5+)
- Chrome Mobile (Android 90+)

**Feature Detection**
- WebRTC support check
- MediaDevices API availability
- Screen capture API support
- Picture-in-Picture API support

---

## Security Considerations

### Current Implementation
- CORS protection
- File type validation (GLB/GLTF only)
- File size limits (50MB)
- Input sanitization
- No authentication (by design)

### Production Recommendations
- Add rate limiting
- Implement TURN server authentication
- Enable HTTPS/WSS only
- Add content security policy
- Implement room passwords
- Add user reporting system
- Enable audit logging

---

## Monitoring & Debugging

### Logging
- Development: Verbose console logs
- Production: Error tracking (Sentry recommended)
- Performance metrics
- WebRTC statistics

### Debug Tools
- Chrome DevTools WebRTC internals: `chrome://webrtc-internals`
- Socket.IO debug mode
- React DevTools
- Three.js Inspector

### Metrics to Monitor
- Peer connection success rate
- Average connection time
- Packet loss percentage
- Jitter measurements
- CPU/Memory usage
- Active rooms count
- Concurrent connections

---

## Future Enhancements

### Planned Features
1. **Recording**: Server-side recording of meetings
2. **Transcription**: Real-time speech-to-text
3. **Breakout Rooms**: Split participants into sub-rooms
4. **Virtual Backgrounds**: AI-powered background replacement
5. **Whiteboard**: Collaborative drawing canvas
6. **File Sharing**: Document sharing and annotation
7. **Polls**: Real-time voting system
8. **Reactions**: Emoji reactions overlay

### Scalability Improvements
1. **SFU Migration**: Move from P2P to LiveKit SFU
2. **Database**: PostgreSQL for persistent storage
3. **Redis**: Session management and pub/sub
4. **CDN**: CloudFront for static assets
5. **Load Balancing**: Multi-region deployment
6. **Kubernetes**: Container orchestration

---

## Troubleshooting

### Common Issues

**1. Camera/Microphone Not Working**
- Check browser permissions
- Verify HTTPS connection
- Test with different browser
- Check device availability

**2. Peer Connection Fails**
- Verify STUN server accessibility
- Check firewall settings
- Test network connectivity
- Consider TURN server

**3. Screen Share Not Working**
- Verify browser support
- Check permissions
- Update browser version
- Test on different screen

**4. 3D Model Not Loading**
- Verify file format (GLB/GLTF)
- Check file size (<50MB)
- Verify network connection
- Check browser console for errors

**5. Hand Gestures Not Detecting**
- Ensure good lighting
- Position hand in frame
- Check camera permissions
- Verify MediaPipe CDN access

---

## Contributing

### Development Setup
```bash
# Clone repository
git clone <repository-url>

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install

# Start backend (terminal 1)
cd backend
npm run dev

# Start frontend (terminal 2)
cd frontend
npm run dev
```

### Code Style
- TypeScript for type safety
- ESLint for code quality
- Prettier for formatting
- Conventional commits

### Testing
- Unit tests: Jest
- Integration tests: Playwright
- Load testing: k6
- Manual testing checklist

---

## License

MIT License - See LICENSE file for details

---

## Support

For issues and questions:
- GitHub Issues: <repository-url>/issues
- Documentation: This file
- Email: support@example.com

---

**Last Updated**: November 26, 2025
**Version**: 1.0.0
**Maintainers**: Development Team
