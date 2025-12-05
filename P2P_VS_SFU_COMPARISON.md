# P2P vs SFU: Side-by-Side Code Comparison

## Architecture Overview

### P2P (SimplePeer + Socket.IO)
```
Client A ←─────→ Client B
    ↓              ↓
    └──→ Client C ←┘
    
• Each client connects to every other client
• N-1 connections per client
• O(n²) total connections
• Signaling via Socket.IO
```

### SFU (LiveKit)
```
Client A ──→ ┌─────┐ ──→ Client B
Client B ──→ │ SFU │ ──→ Client A  
Client C ──→ └─────┘ ──→ Client C

• Each client connects to SFU only
• 1 connection per client
• O(n) total connections
• Built-in signaling
```

## Code Comparison

### 1. Room Connection

#### P2P (OLD)
```javascript
// Frontend
import { io } from 'socket.io-client';
import SimplePeer from 'simple-peer';

const socket = io('http://localhost:4000');
const peers = [];

// Get local media
const stream = await navigator.mediaDevices.getUserMedia({
  video: true,
  audio: true
});

// Join room
socket.emit('join-room', { roomId, userName });

// Handle existing users
socket.on('existing-users', (users) => {
  users.forEach(user => {
    // Create peer for EACH user
    const peer = new SimplePeer({
      initiator: true,
      trickle: true,
      stream: stream,
      config: { iceServers: [...] }
    });
    
    peer.on('signal', signal => {
      socket.emit('signal', { to: user.userId, signal });
    });
    
    peer.on('stream', remoteStream => {
      // Display remote stream
    });
    
    peers.push({ peer, userId: user.userId });
  });
});

// Handle new users joining
socket.on('user-joined', ({ userId }) => {
  const peer = new SimplePeer({
    initiator: false,
    trickle: true,
    stream: stream,
  });
  
  // ... more peer setup
  peers.push({ peer, userId });
});

// Handle signals from other peers
socket.on('signal', ({ from, signal }) => {
  const peer = peers.find(p => p.userId === from);
  peer?.peer.signal(signal);
});
```

#### SFU (NEW)
```typescript
// Frontend
import { Room, RoomEvent } from 'livekit-client';

// Get access token from backend
const response = await fetch(`/api/rooms/${roomId}/join`, {
  method: 'POST',
  body: JSON.stringify({ identity: userId, name: userName })
});
const { token, wsUrl } = await response.json();

// Create room (ONE connection)
const room = new Room({
  adaptiveStream: true,
  dynacast: true,
});

// Connect to SFU
await room.connect(wsUrl, token);

// Publish local tracks (ONCE)
await room.localParticipant.enableCameraAndMicrophone();

// Subscribe to remote tracks (AUTOMATIC)
room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
  if (track.kind === 'video' || track.kind === 'audio') {
    const element = track.attach();
    document.body.appendChild(element);
  }
});

// That's it! No manual peer management
```

### 2. Backend Signaling

#### P2P (OLD)
```javascript
// Backend: Socket.IO signaling server
const io = require('socket.io')(httpServer);
const rooms = new Map();

io.on('connection', (socket) => {
  socket.on('join-room', ({ roomId, userName }) => {
    socket.join(roomId);
    
    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Set());
    }
    rooms.get(roomId).add(socket.id);
    
    // Send existing users to new user
    const existingUsers = Array.from(rooms.get(roomId))
      .filter(id => id !== socket.id)
      .map(id => ({ userId: id, userName: '...' }));
    
    socket.emit('existing-users', existingUsers);
    
    // Notify others
    socket.to(roomId).emit('user-joined', {
      userId: socket.id,
      userName
    });
  });
  
  // Forward WebRTC signals between peers
  socket.on('signal', ({ to, signal }) => {
    io.to(to).emit('signal', {
      from: socket.id,
      signal
    });
  });
  
  socket.on('disconnect', () => {
    // Clean up room
  });
});
```

#### SFU (NEW)
```javascript
// Backend: JWT token generation only
const express = require('express');
const { AccessToken } = require('livekit-server-sdk');

const LIVEKIT_API_KEY = 'devkey';
const LIVEKIT_API_SECRET = 'secret';
const LIVEKIT_URL = 'ws://localhost:7880';

app.post('/api/rooms/:roomId/join', (req, res) => {
  const { roomId } = req.params;
  const { identity, name } = req.body;
  
  // Generate JWT token
  const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity,
    name,
  });
  
  at.addGrant({
    roomJoin: true,
    room: roomId,
    canPublish: true,
    canSubscribe: true,
  });
  
  res.json({
    token: at.toJwt(),
    wsUrl: LIVEKIT_URL,
  });
});

// No Socket.IO needed! LiveKit handles all signaling
```

### 3. Publishing Video/Audio

#### P2P (OLD)
```javascript
// Get media
const stream = await navigator.mediaDevices.getUserMedia({
  video: true,
  audio: true
});

// Add to local video element
localVideoRef.current.srcObject = stream;

// Send to EVERY peer
peers.forEach(({ peer }) => {
  stream.getTracks().forEach(track => {
    peer.addTrack(track, stream);
  });
});

// Toggle audio (update ALL peers)
const toggleAudio = () => {
  const audioTrack = stream.getAudioTracks()[0];
  audioTrack.enabled = !audioTrack.enabled;
  
  // Must notify all peers manually
  peers.forEach(({ peer }) => {
    // ... update peer
  });
};
```

#### SFU (NEW)
```typescript
// Publish tracks (ONCE to SFU)
await room.localParticipant.enableCameraAndMicrophone();

// Or publish with options
const videoTrack = await createLocalVideoTrack({
  resolution: { width: 1280, height: 720 },
  facingMode: 'user',
});

await room.localParticipant.publishTrack(videoTrack, {
  simulcast: true,  // Multiple quality layers
  videoEncoding: {
    maxBitrate: 3000000,
    maxFramerate: 30,
  },
});

// Toggle audio (SFU handles distribution)
const toggleAudio = async () => {
  const enabled = !room.localParticipant.isMicrophoneEnabled;
  await room.localParticipant.setMicrophoneEnabled(enabled);
  // SFU automatically updates all subscribers
};
```

### 4. Receiving Remote Streams

#### P2P (OLD)
```javascript
// Receive from EACH peer separately
peer.on('stream', (remoteStream) => {
  const videoElement = document.createElement('video');
  videoElement.srcObject = remoteStream;
  videoElement.autoplay = true;
  document.body.appendChild(videoElement);
  
  // Store reference
  remotePeers.set(userId, { stream: remoteStream, element: videoElement });
});

// Handle peer leaving
socket.on('user-left', ({ userId }) => {
  const peer = peers.find(p => p.userId === userId);
  if (peer) {
    peer.peer.destroy();
    peers = peers.filter(p => p.userId !== userId);
    
    // Remove video element
    const remote = remotePeers.get(userId);
    remote?.element.remove();
    remotePeers.delete(userId);
  }
});
```

#### SFU (NEW)
```typescript
// Receive from SFU (automatic subscription)
room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
  if (track.kind === Track.Kind.Video) {
    const videoElement = track.attach();
    videoElement.className = 'participant-video';
    document.body.appendChild(videoElement);
  }
  
  if (track.kind === Track.Kind.Audio) {
    const audioElement = track.attach();
    document.body.appendChild(audioElement);
  }
});

// Handle track unsubscribed (automatic cleanup)
room.on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
  track.detach().forEach(element => element.remove());
});

// Handle participant leaving (automatic)
room.on(RoomEvent.ParticipantDisconnected, (participant) => {
  console.log('Participant left:', participant.identity);
  // Tracks are automatically cleaned up
});
```

### 5. Screen Sharing

#### P2P (OLD)
```javascript
// Create separate peer connections for screen share
const screenStream = await navigator.mediaDevices.getDisplayMedia({
  video: true,
  audio: true
});

// Create NEW peer for EACH participant (for screen)
peers.forEach(({ userId }) => {
  const screenPeer = new SimplePeer({
    initiator: true,
    stream: screenStream,
  });
  
  screenPeer.on('signal', signal => {
    socket.emit('screen-signal', { to: userId, signal });
  });
  
  screenPeers.push({ peer: screenPeer, userId });
});

// Notify others
socket.emit('screen-share-started', { roomId });

// Handle screen share signals separately
socket.on('screen-signal', ({ from, signal }) => {
  const screenPeer = screenPeers.find(p => p.userId === from);
  screenPeer?.peer.signal(signal);
});
```

#### SFU (NEW)
```typescript
// Publish screen share (ONCE to SFU)
const screenTrack = await createLocalScreenTracks({
  audio: true,  // System audio
  video: true,
});

await room.localParticipant.publishTrack(screenTrack[0], {
  source: Track.Source.ScreenShare,
});

// Subscribers automatically receive it
room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
  if (track.source === Track.Source.ScreenShare) {
    const screenElement = track.attach();
    screenElement.className = 'screen-share';
    document.body.appendChild(screenElement);
  }
});

// Stop screen share
await room.localParticipant.unpublishTrack(screenTrack[0]);
```

### 6. Quality Adaptation

#### P2P (OLD)
```javascript
// Manual quality adjustment for EACH peer
const adjustQuality = (quality) => {
  peers.forEach(({ peer }) => {
    const sender = peer._pc.getSenders().find(s => s.track?.kind === 'video');
    
    const parameters = sender.getParameters();
    if (!parameters.encodings) {
      parameters.encodings = [{}];
    }
    
    // Manually set bitrate
    parameters.encodings[0].maxBitrate = quality === 'high' ? 2500000 : 500000;
    
    sender.setParameters(parameters);
  });
};

// No automatic adaptation
```

#### SFU (NEW)
```typescript
// Automatic quality adaptation with simulcast
await room.localParticipant.publishTrack(videoTrack, {
  simulcast: true,  // Publish multiple layers
  videoSimulcastLayers: [
    { quality: 'high', width: 1280, height: 720, bitrate: 3000000 },
    { quality: 'medium', width: 640, height: 360, bitrate: 800000 },
    { quality: 'low', width: 320, height: 180, bitrate: 200000 },
  ],
});

// Subscribers can request specific quality
publication.setVideoQuality('high'); // or 'medium', 'low'

// Automatic adaptation based on bandwidth
room.on(RoomEvent.ConnectionQualityChanged, (quality, participant) => {
  if (quality === 'poor') {
    publication.setVideoQuality('low');
  } else if (quality === 'excellent') {
    publication.setVideoQuality('high');
  }
});
```

## Lines of Code Comparison

| Feature | P2P (SimplePeer) | SFU (LiveKit) | Reduction |
|---------|------------------|---------------|-----------|
| Room Connection | ~150 lines | ~30 lines | 80% |
| Peer Management | ~200 lines | 0 lines | 100% |
| Signaling Logic | ~100 lines | 0 lines | 100% |
| Track Publishing | ~50 lines | ~10 lines | 80% |
| Track Subscribing | ~80 lines | ~20 lines | 75% |
| Screen Sharing | ~150 lines | ~20 lines | 87% |
| Quality Adaptation | ~100 lines | ~10 lines | 90% |
| **Total** | **~830 lines** | **~90 lines** | **89%** |

## Performance Comparison

| Metric | P2P | SFU |
|--------|-----|-----|
| Client Upload (10 participants) | 20 Mbps | 2 Mbps |
| Client Download (10 participants) | 20 Mbps | 20 Mbps |
| Client CPU Usage | High | Low |
| Server Bandwidth | 0 | High |
| Max Participants | ~10 | 100+ |
| Connection Setup Time | 5-10s | 1-2s |
| Latency | <100ms | <200ms |

## Migration Effort

| Task | Estimated Time |
|------|----------------|
| Install LiveKit | 10 minutes |
| Backend JWT endpoint | 1 hour |
| Frontend room connection | 2 hours |
| UI components | 3 hours |
| Remove old P2P code | 2 hours |
| Testing | 4 hours |
| **Total** | **~1-2 days** |

## Key Takeaways

### P2P Advantages
- ✅ No server bandwidth costs
- ✅ Lower latency (<100ms)
- ✅ No single point of failure
- ✅ Better privacy (no server)

### P2P Disadvantages
- ❌ Limited to ~10 participants
- ❌ High client bandwidth (O(n))
- ❌ High client CPU usage
- ❌ Complex signaling logic
- ❌ No recording capability
- ❌ Poor NAT traversal

### SFU Advantages
- ✅ Scales to 100+ participants
- ✅ Low client bandwidth (O(1))
- ✅ Low client CPU usage
- ✅ Simple client code
- ✅ Built-in recording
- ✅ Simulcast support
- ✅ Better NAT traversal

### SFU Disadvantages
- ❌ Server bandwidth costs
- ❌ Slightly higher latency (~200ms)
- ❌ Single point of failure
- ❌ Server infrastructure needed

## Recommendation

**Use SFU (LiveKit) if:**
- You need >10 participants
- You want recording/streaming
- You want automatic quality adaptation
- You want simpler client code
- You have server infrastructure

**Use P2P if:**
- You need <5 participants
- You want lowest latency
- You want no server costs
- You want maximum privacy
- You have simple use case

For most video conferencing apps, **SFU is the better choice**.
