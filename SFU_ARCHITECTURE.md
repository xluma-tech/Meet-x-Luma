# SFU-Based Video Architecture (Migration from P2P)

## Executive Summary

This document outlines the complete migration from P2P mesh (SimplePeer) to SFU-based architecture using LiveKit. The new architecture supports:
- **Local Development**: Single SFU node, public STUN only
- **Production Scale**: 10k+ viewers, multi-region, simulcast, TURN fallback

## Architecture Comparison

### OLD: P2P Mesh Architecture
```
Client A ←──────────────→ Client B
    ↓                         ↓
    └─────────→ Client C ←────┘
    
Each client maintains N-1 connections
Bandwidth: O(n²)
Max participants: ~10
```

### NEW: SFU Architecture
```
Client A ──→ ┌─────────┐ ──→ Client B
Client B ──→ │   SFU   │ ──→ Client A
Client C ──→ │(LiveKit)│ ──→ Client C
             └─────────┘

Each client maintains 1 connection
Bandwidth: O(n)
Max participants: 100+ (single SFU), 10k+ (with CDN)
```

## Complete New Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │   Browser    │  │   Browser    │  │   Browser    │              │
│  │   Client 1   │  │   Client 2   │  │   Client N   │              │
│  │              │  │              │  │              │              │
│  │ LiveKit SDK  │  │ LiveKit SDK  │  │ LiveKit SDK  │              │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘              │
│         │                  │                  │                       │
│         │  WebRTC (1 conn) │                  │                       │
│         │                  │                  │                       │
└─────────┼──────────────────┼──────────────────┼───────────────────────┘
          │                  │                  │
          │                  │                  │
┌─────────▼──────────────────▼──────────────────▼───────────────────────┐
│                         SFU LAYER                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                    LiveKit SFU Server                          │  │
│  │  - Selective Forwarding Unit                                  │  │
│  │  - Track Publishing/Subscribing                               │  │
│  │  - Simulcast Layer Selection                                  │  │
│  │  - Bandwidth Adaptation                                       │  │
│  │  - Recording (optional)                                       │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                       │
└───────────────────────────────┬───────────────────────────────────────┘
                                │
┌───────────────────────────────▼───────────────────────────────────────┐
│                      SIGNALING/API LAYER                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │   Express    │  │   LiveKit    │  │     JWT      │              │
│  │   REST API   │  │   API SDK    │  │   Generator  │              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
│                                                                       │
└───────────────────────────────┬───────────────────────────────────────┘
                                │
┌───────────────────────────────▼───────────────────────────────────────┐
│                      BACKEND SERVICES                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │   MongoDB    │  │    Redis     │  │    Auth0     │              │
│  │   Database   │  │    Cache     │  │     Auth     │              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```


## New Signaling Flow

### 1. Room Join Flow (SFU-based)

```
Client                    Backend API              LiveKit SFU
  │                            │                         │
  ├─ GET /api/rooms/:id ──────>│                         │
  │                            │                         │
  │                            ├─ Verify room exists     │
  │                            ├─ Check permissions      │
  │                            │                         │
  │                            ├─ Generate JWT token ────┤
  │                            │   (room, identity,      │
  │                            │    permissions)         │
  │                            │                         │
  │<─ { token, wsUrl } ────────┤                         │
  │                            │                         │
  ├─ new Room() ───────────────┼─────────────────────────┤
  │  LiveKit SDK               │                         │
  │                            │                         │
  ├─ room.connect(wsUrl, token)────────────────────────>│
  │                            │                         │
  │                            │                         ├─ Validate JWT
  │                            │                         ├─ Create participant
  │                            │                         │
  │<─ Connected ───────────────┼─────────────────────────┤
  │                            │                         │
  ├─ room.localParticipant ────┼─────────────────────────┤
  │  .publishTrack(video)      │                         │
  │                            │                         │
  │                            │                         ├─ Receive track
  │                            │                         ├─ Forward to others
  │                            │                         │
  │<─ participantConnected ────┼─────────────────────────┤
  │   (other participants)     │                         │
  │                            │                         │
  │<─ trackSubscribed ─────────┼─────────────────────────┤
  │   (remote tracks)          │                         │
```

### 2. Publish Flow (Camera/Mic)

```
Client                                    LiveKit SFU
  │                                            │
  ├─ getUserMedia() ──────────────────────────┤
  │  { video: true, audio: true }             │
  │                                            │
  ├─ room.localParticipant ───────────────────┤
  │  .publishTrack(videoTrack, {              │
  │    simulcast: true,                       │
  │    videoEncoding: {                       │
  │      maxBitrate: 3000000,                 │
  │      maxFramerate: 30                     │
  │    }                                      │
  │  })                                       │
  │                                            │
  │                                            ├─ Create RTCPeerConnection
  │                                            ├─ Add track to PC
  │                                            ├─ Negotiate SDP
  │                                            │
  │<─ SDP Offer ───────────────────────────────┤
  │                                            │
  ├─ SDP Answer ──────────────────────────────>│
  │                                            │
  │<─ ICE Candidates ──────────────────────────┤
  │                                            │
  ├─ ICE Candidates ──────────────────────────>│
  │                                            │
  │                                            ├─ Connection established
  │                                            ├─ Receive media stream
  │                                            ├─ Forward to subscribers
  │                                            │
  │<─ trackPublished event ────────────────────┤
```

### 3. Subscribe Flow (Remote Participants)

```
Client                                    LiveKit SFU
  │                                            │
  │<─ participantConnected event ──────────────┤
  │   { participant, tracks[] }               │
  │                                            │
  │<─ trackPublished event ────────────────────┤
  │   { track, participant }                  │
  │                                            │
  │  (SDK auto-subscribes)                    │
  │                                            │
  │<─ trackSubscribed event ────────────────────┤
  │   { track, publication, participant }     │
  │                                            │
  ├─ track.attach(videoElement) ──────────────┤
  │                                            │
  │<─ Media stream rendering ──────────────────┤
  │                                            │
  │  (Simulcast layer selection)              │
  │                                            │
  ├─ publication.setVideoQuality(HIGH) ───────>│
  │                                            │
  │                                            ├─ Switch to higher layer
  │                                            │
  │<─ Higher quality stream ────────────────────┤
```


## Updated Backend Design

### New Folder Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── environment.js          # Environment variables
│   │   ├── database.js             # MongoDB connection
│   │   ├── redis.js                # Redis connection
│   │   └── livekit.js              # NEW: LiveKit configuration
│   │
│   ├── controllers/
│   │   ├── roomController.js       # UPDATED: Room management
│   │   ├── tokenController.js      # NEW: JWT token generation
│   │   └── webhookController.js    # NEW: LiveKit webhooks
│   │
│   ├── services/
│   │   ├── livekitService.js       # NEW: LiveKit API wrapper
│   │   ├── tokenService.js         # NEW: JWT generation
│   │   └── roomService.js          # UPDATED: Room logic
│   │
│   ├── middleware/
│   │   ├── auth.js                 # Auth0 verification
│   │   └── webhookAuth.js          # NEW: LiveKit webhook auth
│   │
│   ├── routes/
│   │   ├── roomRoutes.js           # UPDATED: Room endpoints
│   │   └── webhookRoutes.js        # NEW: Webhook endpoints
│   │
│   ├── models/
│   │   ├── Meeting.js              # UPDATED: Add SFU fields
│   │   └── Participant.js          # NEW: Track participants
│   │
│   ├── app.js                      # Express app
│   └── server.js                   # Server entry point
│
├── .env.example
├── package.json
└── README.md
```

### Key Backend Files

#### 1. `config/livekit.js` (NEW)

```javascript
const { AccessToken } = require('livekit-server-sdk');

const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || 'devkey';
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || 'secret';
const LIVEKIT_URL = process.env.LIVEKIT_URL || 'ws://localhost:7880';

module.exports = {
  LIVEKIT_API_KEY,
  LIVEKIT_API_SECRET,
  LIVEKIT_URL,
  
  createToken: (roomName, participantIdentity, participantName, metadata = {}) => {
    const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
      identity: participantIdentity,
      name: participantName,
      metadata: JSON.stringify(metadata),
    });

    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    return at.toJwt();
  }
};
```

#### 2. `services/livekitService.js` (NEW)

```javascript
const { RoomServiceClient } = require('livekit-server-sdk');
const { LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET } = require('../config/livekit');

class LiveKitService {
  constructor() {
    this.client = new RoomServiceClient(LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);
  }

  async createRoom(roomName, options = {}) {
    try {
      const room = await this.client.createRoom({
        name: roomName,
        emptyTimeout: options.emptyTimeout || 300, // 5 minutes
        maxParticipants: options.maxParticipants || 100,
      });
      return room;
    } catch (error) {
      if (error.message.includes('already exists')) {
        return await this.getRoom(roomName);
      }
      throw error;
    }
  }

  async getRoom(roomName) {
    try {
      const rooms = await this.client.listRooms([roomName]);
      return rooms.length > 0 ? rooms[0] : null;
    } catch (error) {
      console.error('Error getting room:', error);
      return null;
    }
  }

  async listParticipants(roomName) {
    try {
      const participants = await this.client.listParticipants(roomName);
      return participants;
    } catch (error) {
      console.error('Error listing participants:', error);
      return [];
    }
  }

  async removeParticipant(roomName, participantIdentity) {
    try {
      await this.client.removeParticipant(roomName, participantIdentity);
    } catch (error) {
      console.error('Error removing participant:', error);
      throw error;
    }
  }

  async deleteRoom(roomName) {
    try {
      await this.client.deleteRoom(roomName);
    } catch (error) {
      console.error('Error deleting room:', error);
      throw error;
    }
  }
}

module.exports = new LiveKitService();
```


#### 3. `controllers/roomController.js` (UPDATED)

```javascript
const livekitService = require('../services/livekitService');
const { createToken, LIVEKIT_URL } = require('../config/livekit');
const Meeting = require('../models/Meeting');

// Join room and get access token
exports.joinRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { identity, name } = req.body; // From Auth0 or guest

    // Get or create meeting
    const meeting = await Meeting.findByMeetingCode(roomId);
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    // Check if meeting is active or scheduled
    if (meeting.status === 'ended') {
      return res.status(403).json({ error: 'Meeting has ended' });
    }

    // Create LiveKit room if not exists
    await livekitService.createRoom(roomId, {
      maxParticipants: 100,
      emptyTimeout: 300,
    });

    // Generate access token
    const token = createToken(
      roomId,
      identity,
      name,
      { userId: identity, meetingId: meeting._id.toString() }
    );

    // Update meeting status to active if first participant
    if (meeting.status === 'scheduled') {
      await Meeting.updateStatus(meeting._id, 'active');
    }

    res.json({
      token,
      wsUrl: LIVEKIT_URL,
      roomName: roomId,
      serverUrl: LIVEKIT_URL,
    });
  } catch (error) {
    console.error('Error joining room:', error);
    res.status(500).json({ error: 'Failed to join room' });
  }
};

// Get room info
exports.getRoomInfo = async (req, res) => {
  try {
    const { roomId } = req.params;

    const meeting = await Meeting.findByMeetingCode(roomId);
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    // Get live participants from LiveKit
    const participants = await livekitService.listParticipants(roomId);

    res.json({
      meeting,
      participantCount: participants.length,
      participants: participants.map(p => ({
        identity: p.identity,
        name: p.name,
        joinedAt: p.joinedAt,
      })),
    });
  } catch (error) {
    console.error('Error getting room info:', error);
    res.status(500).json({ error: 'Failed to get room info' });
  }
};

// End meeting (host only)
exports.endMeeting = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { hostAuth0Id } = req.body;

    const meeting = await Meeting.findByMeetingCode(roomId);
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    // Verify host permission
    if (meeting.hostAuth0Id !== hostAuth0Id && !meeting.cohosts?.includes(hostAuth0Id)) {
      return res.status(403).json({ error: 'Only host can end meeting' });
    }

    // Delete LiveKit room (disconnects all participants)
    await livekitService.deleteRoom(roomId);

    // Update meeting status
    await Meeting.updateStatus(meeting._id, 'ended');

    res.json({ message: 'Meeting ended successfully' });
  } catch (error) {
    console.error('Error ending meeting:', error);
    res.status(500).json({ error: 'Failed to end meeting' });
  }
};
```

#### 4. `controllers/webhookController.js` (NEW)

```javascript
const { WebhookReceiver } = require('livekit-server-sdk');
const { LIVEKIT_API_SECRET } = require('../config/livekit');
const Meeting = require('../models/Meeting');

const receiver = new WebhookReceiver(LIVEKIT_API_SECRET);

// Handle LiveKit webhooks
exports.handleWebhook = async (req, res) => {
  try {
    const event = receiver.receive(req.body, req.get('Authorization'));

    console.log('LiveKit webhook event:', event.event);

    switch (event.event) {
      case 'room_started':
        console.log('Room started:', event.room.name);
        break;

      case 'room_finished':
        console.log('Room finished:', event.room.name);
        // Update meeting status
        const meeting = await Meeting.findByMeetingCode(event.room.name);
        if (meeting && meeting.status === 'active') {
          await Meeting.updateStatus(meeting._id, 'ended');
        }
        break;

      case 'participant_joined':
        console.log('Participant joined:', event.participant.identity);
        break;

      case 'participant_left':
        console.log('Participant left:', event.participant.identity);
        break;

      case 'track_published':
        console.log('Track published:', event.track.sid);
        break;

      case 'track_unpublished':
        console.log('Track unpublished:', event.track.sid);
        break;

      default:
        console.log('Unhandled event:', event.event);
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).json({ error: 'Invalid webhook' });
  }
};
```


#### 5. `routes/roomRoutes.js` (UPDATED)

```javascript
const express = require('express');
const router = express.Router();
const roomController = require('../controllers/roomController');
const { requireAuth } = require('../middleware/auth');

// Join room (get access token)
router.post('/:roomId/join', roomController.joinRoom);

// Get room info
router.get('/:roomId', roomController.getRoomInfo);

// End meeting (host only)
router.post('/:roomId/end', requireAuth, roomController.endMeeting);

module.exports = router;
```

#### 6. `routes/webhookRoutes.js` (NEW)

```javascript
const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');

// LiveKit webhook endpoint
router.post('/livekit', webhookController.handleWebhook);

module.exports = router;
```

#### 7. Updated `.env` Variables

```bash
# Server
PORT=4000
HOST=0.0.0.0
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/lumameet
REDIS_URL=redis://localhost:6379

# Auth0
AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_AUDIENCE=https://api.lumameet.com

# LiveKit (NEW)
LIVEKIT_URL=ws://localhost:7880
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=secret

# CORS
CORS_ORIGIN=http://localhost:3000
```

#### 8. Updated `package.json` Dependencies

```json
{
  "dependencies": {
    "express": "^4.18.2",
    "mongoose": "^7.0.0",
    "redis": "^4.6.0",
    "cors": "^2.8.5",
    "dotenv": "^16.0.3",
    "express-jwt": "^8.4.1",
    "jwks-rsa": "^3.0.1",
    "livekit-server-sdk": "^2.0.0"
  }
}
```


## Updated Frontend Design

### New Folder Structure

```
frontend/
├── app/
│   ├── room/
│   │   └── [id]/
│   │       ├── page.tsx              # REWRITTEN: SFU-based room
│   │       ├── layout.tsx            # Same
│   │       └── components/
│   │           ├── VideoGrid.tsx     # NEW: Grid layout
│   │           ├── ParticipantTile.tsx  # NEW: Single participant
│   │           ├── LocalVideo.tsx    # NEW: Local video
│   │           └── Controls.tsx      # NEW: Media controls
│   │
│   ├── lib/
│   │   ├── livekit.ts                # NEW: LiveKit utilities
│   │   └── api.ts                    # API client
│   │
│   └── hooks/
│       ├── useRoom.ts                # NEW: Room connection hook
│       ├── useParticipants.ts        # NEW: Participants hook
│       └── useTracks.ts              # NEW: Track management hook
│
├── package.json
└── .env.local
```

### Key Frontend Files

#### 1. `app/room/[id]/page.tsx` (REWRITTEN)

```typescript
'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Room, RoomEvent, Track } from 'livekit-client';
import VideoGrid from './components/VideoGrid';
import Controls from './components/Controls';

export default function RoomPage() {
  const params = useParams();
  const roomId = params?.id as string;
  
  const [room, setRoom] = useState<Room | null>(null);
  const [isConnecting, setIsConnecting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);

  useEffect(() => {
    if (!roomId) return;

    let roomInstance: Room | null = null;

    const connectToRoom = async () => {
      try {
        setIsConnecting(true);

        // Get access token from backend
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/rooms/${roomId}/join`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            identity: `user-${Date.now()}`, // Replace with Auth0 ID
            name: 'Guest User', // Replace with actual name
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to get access token');
        }

        const { token, wsUrl } = await response.json();

        // Create room instance
        roomInstance = new Room({
          adaptiveStream: true,
          dynacast: true,
          videoCaptureDefaults: {
            resolution: {
              width: 1280,
              height: 720,
              frameRate: 30,
            },
          },
        });

        // Set up event listeners
        roomInstance
          .on(RoomEvent.ParticipantConnected, handleParticipantConnected)
          .on(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected)
          .on(RoomEvent.TrackSubscribed, handleTrackSubscribed)
          .on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed)
          .on(RoomEvent.LocalTrackPublished, handleLocalTrackPublished)
          .on(RoomEvent.Disconnected, handleDisconnected);

        // Connect to room
        await roomInstance.connect(wsUrl, token);
        console.log('Connected to room:', roomInstance.name);

        // Publish camera and microphone
        await roomInstance.localParticipant.enableCameraAndMicrophone();
        console.log('Published local tracks');

        setRoom(roomInstance);
        setIsConnecting(false);

        // Update participants list
        updateParticipants(roomInstance);
      } catch (err) {
        console.error('Error connecting to room:', err);
        setError(err instanceof Error ? err.message : 'Failed to connect');
        setIsConnecting(false);
      }
    };

    connectToRoom();

    // Cleanup
    return () => {
      if (roomInstance) {
        roomInstance.disconnect();
      }
    };
  }, [roomId]);

  const handleParticipantConnected = (participant: any) => {
    console.log('Participant connected:', participant.identity);
    if (room) updateParticipants(room);
  };

  const handleParticipantDisconnected = (participant: any) => {
    console.log('Participant disconnected:', participant.identity);
    if (room) updateParticipants(room);
  };

  const handleTrackSubscribed = (track: any, publication: any, participant: any) => {
    console.log('Track subscribed:', track.kind, 'from', participant.identity);
    if (room) updateParticipants(room);
  };

  const handleTrackUnsubscribed = (track: any, publication: any, participant: any) => {
    console.log('Track unsubscribed:', track.kind, 'from', participant.identity);
    if (room) updateParticipants(room);
  };

  const handleLocalTrackPublished = (publication: any) => {
    console.log('Local track published:', publication.kind);
  };

  const handleDisconnected = () => {
    console.log('Disconnected from room');
    setRoom(null);
  };

  const updateParticipants = (roomInstance: Room) => {
    const allParticipants = [
      roomInstance.localParticipant,
      ...Array.from(roomInstance.remoteParticipants.values()),
    ];
    setParticipants(allParticipants);
  };

  const toggleAudio = async () => {
    if (!room) return;
    const enabled = !isAudioEnabled;
    await room.localParticipant.setMicrophoneEnabled(enabled);
    setIsAudioEnabled(enabled);
  };

  const toggleVideo = async () => {
    if (!room) return;
    const enabled = !isVideoEnabled;
    await room.localParticipant.setCameraEnabled(enabled);
    setIsVideoEnabled(enabled);
  };

  const leaveRoom = () => {
    if (room) {
      room.disconnect();
    }
    window.location.href = '/';
  };

  if (isConnecting) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-white text-xl">Connecting to room...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-red-500 text-xl">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-900 flex flex-col">
      <VideoGrid participants={participants} />
      <Controls
        isAudioEnabled={isAudioEnabled}
        isVideoEnabled={isVideoEnabled}
        onToggleAudio={toggleAudio}
        onToggleVideo={toggleVideo}
        onLeave={leaveRoom}
      />
    </div>
  );
}
```


#### 2. `app/room/[id]/components/VideoGrid.tsx` (NEW)

```typescript
'use client';

import React from 'react';
import ParticipantTile from './ParticipantTile';

interface VideoGridProps {
  participants: any[];
}

export default function VideoGrid({ participants }: VideoGridProps) {
  const getGridClass = () => {
    const count = participants.length;
    if (count === 1) return 'grid-cols-1';
    if (count === 2) return 'grid-cols-2';
    if (count <= 4) return 'grid-cols-2 grid-rows-2';
    if (count <= 6) return 'grid-cols-3 grid-rows-2';
    if (count <= 9) return 'grid-cols-3 grid-rows-3';
    return 'grid-cols-4 grid-rows-3';
  };

  return (
    <div className={`flex-1 grid ${getGridClass()} gap-2 p-4`}>
      {participants.map((participant) => (
        <ParticipantTile
          key={participant.sid}
          participant={participant}
        />
      ))}
    </div>
  );
}
```

#### 3. `app/room/[id]/components/ParticipantTile.tsx` (NEW)

```typescript
'use client';

import React, { useEffect, useRef } from 'react';
import { Track } from 'livekit-client';

interface ParticipantTileProps {
  participant: any;
}

export default function ParticipantTile({ participant }: ParticipantTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (!participant) return;

    const attachTracks = () => {
      // Attach video track
      const videoTrack = participant.getTrack(Track.Source.Camera);
      if (videoTrack?.track && videoRef.current) {
        videoTrack.track.attach(videoRef.current);
      }

      // Attach audio track (only for remote participants)
      if (!participant.isLocal) {
        const audioTrack = participant.getTrack(Track.Source.Microphone);
        if (audioTrack?.track && audioRef.current) {
          audioTrack.track.attach(audioRef.current);
        }
      }
    };

    attachTracks();

    // Listen for track updates
    const handleTrackSubscribed = () => attachTracks();
    const handleTrackUnsubscribed = () => attachTracks();

    participant.on('trackSubscribed', handleTrackSubscribed);
    participant.on('trackUnsubscribed', handleTrackUnsubscribed);

    return () => {
      participant.off('trackSubscribed', handleTrackSubscribed);
      participant.off('trackUnsubscribed', handleTrackUnsubscribed);

      // Detach tracks
      const videoTrack = participant.getTrack(Track.Source.Camera);
      if (videoTrack?.track && videoRef.current) {
        videoTrack.track.detach(videoRef.current);
      }

      if (!participant.isLocal) {
        const audioTrack = participant.getTrack(Track.Source.Microphone);
        if (audioTrack?.track && audioRef.current) {
          audioTrack.track.detach(audioRef.current);
        }
      }
    };
  }, [participant]);

  const isVideoEnabled = participant.isCameraEnabled;
  const isAudioEnabled = participant.isMicrophoneEnabled;

  return (
    <div className="relative bg-gray-800 rounded-lg overflow-hidden aspect-video">
      {isVideoEnabled ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={participant.isLocal}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gray-700">
          <div className="w-20 h-20 rounded-full bg-blue-500 flex items-center justify-center text-white text-3xl font-bold">
            {participant.name?.[0]?.toUpperCase() || '?'}
          </div>
        </div>
      )}

      {!participant.isLocal && (
        <audio ref={audioRef} autoPlay playsInline />
      )}

      <div className="absolute bottom-2 left-2 bg-black bg-opacity-60 px-3 py-1 rounded-full text-white text-sm flex items-center gap-2">
        <span>{participant.name || participant.identity}</span>
        {!isAudioEnabled && (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 3a3 3 0 00-3 3v4a3 3 0 006 0V6a3 3 0 00-3-3zm0 12a5 5 0 01-5-5v-1a1 1 0 112 0v1a3 3 0 006 0v-1a1 1 0 112 0v1a5 5 0 01-5 5z" />
            <line x1="2" y1="2" x2="18" y2="18" stroke="currentColor" strokeWidth="2" />
          </svg>
        )}
      </div>

      {participant.isLocal && (
        <div className="absolute top-2 left-2 bg-blue-500 px-2 py-1 rounded text-white text-xs">
          You
        </div>
      )}
    </div>
  );
}
```

#### 4. `app/room/[id]/components/Controls.tsx` (NEW)

```typescript
'use client';

import React from 'react';

interface ControlsProps {
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onLeave: () => void;
}

export default function Controls({
  isAudioEnabled,
  isVideoEnabled,
  onToggleAudio,
  onToggleVideo,
  onLeave,
}: ControlsProps) {
  return (
    <div className="bg-gray-800 p-4 flex justify-center gap-4">
      <button
        onClick={onToggleAudio}
        className={`p-4 rounded-full ${
          isAudioEnabled ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-700'
        } text-white transition-colors`}
      >
        {isAudioEnabled ? (
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 3a3 3 0 00-3 3v4a3 3 0 006 0V6a3 3 0 00-3-3zm0 12a5 5 0 01-5-5v-1a1 1 0 112 0v1a3 3 0 006 0v-1a1 1 0 112 0v1a5 5 0 01-5 5z" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 3a3 3 0 00-3 3v4a3 3 0 006 0V6a3 3 0 00-3-3zm0 12a5 5 0 01-5-5v-1a1 1 0 112 0v1a3 3 0 006 0v-1a1 1 0 112 0v1a5 5 0 01-5 5z" />
            <line x1="2" y1="2" x2="18" y2="18" stroke="white" strokeWidth="2" />
          </svg>
        )}
      </button>

      <button
        onClick={onToggleVideo}
        className={`p-4 rounded-full ${
          isVideoEnabled ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-700'
        } text-white transition-colors`}
      >
        {isVideoEnabled ? (
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zm12 0v8l4 2V4l-4 2z" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zm12 0v8l4 2V4l-4 2z" />
            <line x1="2" y1="2" x2="18" y2="18" stroke="white" strokeWidth="2" />
          </svg>
        )}
      </button>

      <button
        onClick={onLeave}
        className="p-4 rounded-full bg-red-600 hover:bg-red-700 text-white transition-colors"
      >
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
          <path d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-2 0V4H5v12h10v-2a1 1 0 112 0v3a1 1 0 01-1 1H4a1 1 0 01-1-1V3z" />
          <path d="M11 10a1 1 0 011-1h5.586l-1.293-1.293a1 1 0 011.414-1.414l3 3a1 1 0 010 1.414l-3 3a1 1 0 01-1.414-1.414L17.586 11H12a1 1 0 01-1-1z" />
        </svg>
      </button>
    </div>
  );
}
```


#### 5. Updated `package.json` Dependencies

```json
{
  "dependencies": {
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "livekit-client": "^2.0.0"
  }
}
```

#### 6. Updated `.env.local`

```bash
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_LIVEKIT_URL=ws://localhost:7880
```


## Migration Checklist: P2P → SFU

### Phase 1: Setup (Day 1)

- [ ] **Install LiveKit Server**
  ```bash
  # Download LiveKit server
  curl -sSL https://get.livekit.io | bash
  
  # Or use Docker (if needed later)
  # docker run --rm -p 7880:7880 -p 7881:7881 -p 7882:7882/udp \
  #   -e LIVEKIT_KEYS="devkey: secret" \
  #   livekit/livekit-server:latest
  ```

- [ ] **Install Backend Dependencies**
  ```bash
  cd backend
  npm install livekit-server-sdk
  ```

- [ ] **Install Frontend Dependencies**
  ```bash
  cd frontend
  npm install livekit-client
  npm uninstall simple-peer socket.io-client  # Remove old P2P deps
  ```

- [ ] **Configure Environment Variables**
  - Backend: Add `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`
  - Frontend: Add `NEXT_PUBLIC_LIVEKIT_URL`

### Phase 2: Backend Migration (Day 2-3)

- [ ] **Create LiveKit Configuration**
  - [ ] `config/livekit.js` - Connection config
  - [ ] `services/livekitService.js` - API wrapper

- [ ] **Update Room Controller**
  - [ ] Remove Socket.IO signaling logic
  - [ ] Add JWT token generation endpoint
  - [ ] Add room creation via LiveKit API
  - [ ] Update room info endpoint to query LiveKit

- [ ] **Add Webhook Handler**
  - [ ] Create `controllers/webhookController.js`
  - [ ] Handle room lifecycle events
  - [ ] Update meeting status based on events

- [ ] **Remove Old Socket.IO Code**
  - [ ] Delete `socket/socketHandlers.js` (WebRTC signaling)
  - [ ] Delete `socket/socketConfig.js`
  - [ ] Keep Socket.IO only for chat/notifications (optional)

- [ ] **Update Routes**
  - [ ] Add `/api/rooms/:id/join` endpoint
  - [ ] Add `/api/webhooks/livekit` endpoint

### Phase 3: Frontend Migration (Day 4-5)

- [ ] **Create New Room Component**
  - [ ] Replace SimplePeer with LiveKit Room
  - [ ] Remove peer connection management
  - [ ] Remove signaling logic

- [ ] **Implement Connection Flow**
  - [ ] Fetch access token from backend
  - [ ] Connect to LiveKit room
  - [ ] Publish local tracks
  - [ ] Subscribe to remote tracks

- [ ] **Create UI Components**
  - [ ] `VideoGrid.tsx` - Participant grid
  - [ ] `ParticipantTile.tsx` - Single participant view
  - [ ] `Controls.tsx` - Media controls

- [ ] **Remove Old P2P Code**
  - [ ] Delete `createPeer()` function
  - [ ] Delete `addPeer()` function
  - [ ] Delete `createScreenPeer()` function
  - [ ] Delete SimplePeer event handlers
  - [ ] Delete ICE server configuration

### Phase 4: Testing (Day 6)

- [ ] **Local Testing**
  - [ ] Start LiveKit server
  - [ ] Start backend server
  - [ ] Start frontend dev server
  - [ ] Test with 2 participants
  - [ ] Test with 5+ participants
  - [ ] Test audio/video toggle
  - [ ] Test participant join/leave

- [ ] **Network Testing**
  - [ ] Test on different networks
  - [ ] Test with firewall restrictions
  - [ ] Verify STUN server connectivity

### Phase 5: Production Prep (Day 7+)

- [ ] **Deploy LiveKit**
  - [ ] Set up production LiveKit instance
  - [ ] Configure TURN servers
  - [ ] Set up SSL certificates

- [ ] **Update Backend**
  - [ ] Update LiveKit URL to production
  - [ ] Secure API keys
  - [ ] Configure webhooks

- [ ] **Update Frontend**
  - [ ] Update LiveKit URL to production
  - [ ] Test production deployment


## Minimal Demo Code for Local SFU

### Step 1: Install and Run LiveKit Server

```bash
# Install LiveKit CLI
curl -sSL https://get.livekit.io | bash

# Create config file
cat > livekit.yaml << EOF
port: 7880
rtc:
  port_range_start: 7882
  port_range_end: 7892
  use_external_ip: false
keys:
  devkey: secret
EOF

# Run LiveKit server
livekit-server --config livekit.yaml
```

### Step 2: Backend Minimal Example

**`backend/minimal-server.js`**

```javascript
const express = require('express');
const cors = require('cors');
const { AccessToken } = require('livekit-server-sdk');

const app = express();
app.use(cors());
app.use(express.json());

const LIVEKIT_API_KEY = 'devkey';
const LIVEKIT_API_SECRET = 'secret';
const LIVEKIT_URL = 'ws://localhost:7880';

// Join room endpoint
app.post('/api/rooms/:roomId/join', (req, res) => {
  const { roomId } = req.params;
  const { identity, name } = req.body;

  // Create access token
  const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity: identity || `user-${Date.now()}`,
    name: name || 'Guest',
  });

  at.addGrant({
    roomJoin: true,
    room: roomId,
    canPublish: true,
    canSubscribe: true,
  });

  const token = at.toJwt();

  res.json({
    token,
    wsUrl: LIVEKIT_URL,
  });
});

app.listen(4000, () => {
  console.log('Backend running on http://localhost:4000');
});
```

**Run:**
```bash
cd backend
npm install express cors livekit-server-sdk
node minimal-server.js
```

### Step 3: Frontend Minimal Example

**`frontend/minimal-room.html`**

```html
<!DOCTYPE html>
<html>
<head>
  <title>LiveKit Minimal Demo</title>
  <script src="https://unpkg.com/livekit-client/dist/livekit-client.umd.min.js"></script>
  <style>
    body {
      margin: 0;
      padding: 20px;
      background: #1a1a1a;
      color: white;
      font-family: Arial, sans-serif;
    }
    #videos {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 10px;
      margin-bottom: 20px;
    }
    video {
      width: 100%;
      background: #000;
      border-radius: 8px;
    }
    .controls {
      display: flex;
      gap: 10px;
      justify-content: center;
    }
    button {
      padding: 10px 20px;
      font-size: 16px;
      cursor: pointer;
      border: none;
      border-radius: 5px;
      background: #4CAF50;
      color: white;
    }
    button:hover {
      background: #45a049;
    }
    button.danger {
      background: #f44336;
    }
    button.danger:hover {
      background: #da190b;
    }
  </style>
</head>
<body>
  <h1>LiveKit Minimal Demo</h1>
  <div id="videos"></div>
  <div class="controls">
    <button id="toggleAudio">Mute Audio</button>
    <button id="toggleVideo">Stop Video</button>
    <button id="leave" class="danger">Leave</button>
  </div>

  <script>
    const BACKEND_URL = 'http://localhost:4000';
    const ROOM_NAME = 'test-room';
    
    let room;
    let isAudioEnabled = true;
    let isVideoEnabled = true;

    async function connectToRoom() {
      try {
        // Get access token
        const response = await fetch(`${BACKEND_URL}/api/rooms/${ROOM_NAME}/join`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            identity: `user-${Math.random().toString(36).substr(2, 9)}`,
            name: 'Demo User',
          }),
        });

        const { token, wsUrl } = await response.json();

        // Create room
        room = new LivekitClient.Room({
          adaptiveStream: true,
          dynacast: true,
        });

        // Event listeners
        room.on(LivekitClient.RoomEvent.TrackSubscribed, handleTrackSubscribed);
        room.on(LivekitClient.RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);
        room.on(LivekitClient.RoomEvent.ParticipantConnected, () => console.log('Participant connected'));
        room.on(LivekitClient.RoomEvent.ParticipantDisconnected, () => console.log('Participant disconnected'));

        // Connect
        await room.connect(wsUrl, token);
        console.log('Connected to room:', room.name);

        // Publish camera and microphone
        await room.localParticipant.enableCameraAndMicrophone();
        console.log('Published local tracks');

        // Display local video
        displayLocalVideo();
      } catch (error) {
        console.error('Error connecting:', error);
        alert('Failed to connect: ' + error.message);
      }
    }

    function displayLocalVideo() {
      const videoTrack = room.localParticipant.getTrack(LivekitClient.Track.Source.Camera);
      if (videoTrack && videoTrack.track) {
        const videoElement = videoTrack.track.attach();
        videoElement.muted = true;
        document.getElementById('videos').appendChild(videoElement);
      }
    }

    function handleTrackSubscribed(track, publication, participant) {
      console.log('Track subscribed:', track.kind, 'from', participant.identity);
      
      if (track.kind === LivekitClient.Track.Kind.Video || track.kind === LivekitClient.Track.Kind.Audio) {
        const element = track.attach();
        document.getElementById('videos').appendChild(element);
      }
    }

    function handleTrackUnsubscribed(track, publication, participant) {
      console.log('Track unsubscribed:', track.kind, 'from', participant.identity);
      track.detach().forEach(el => el.remove());
    }

    // Controls
    document.getElementById('toggleAudio').addEventListener('click', async () => {
      isAudioEnabled = !isAudioEnabled;
      await room.localParticipant.setMicrophoneEnabled(isAudioEnabled);
      document.getElementById('toggleAudio').textContent = isAudioEnabled ? 'Mute Audio' : 'Unmute Audio';
    });

    document.getElementById('toggleVideo').addEventListener('click', async () => {
      isVideoEnabled = !isVideoEnabled;
      await room.localParticipant.setCameraEnabled(isVideoEnabled);
      document.getElementById('toggleVideo').textContent = isVideoEnabled ? 'Stop Video' : 'Start Video';
    });

    document.getElementById('leave').addEventListener('click', () => {
      if (room) {
        room.disconnect();
      }
      window.location.reload();
    });

    // Auto-connect on load
    connectToRoom();
  </script>
</body>
</html>
```

**Run:**
```bash
# Serve the HTML file
cd frontend
npx serve .
# Open http://localhost:3000/minimal-room.html in multiple browser tabs
```

### Testing the Demo

1. **Start LiveKit Server**
   ```bash
   livekit-server --config livekit.yaml
   ```

2. **Start Backend**
   ```bash
   cd backend
   node minimal-server.js
   ```

3. **Open Frontend**
   - Open `minimal-room.html` in 2-3 browser tabs
   - Each tab should show video from all participants
   - Test audio/video controls


## Production Scaling Plan (Zoom-like 10k Support)

### Architecture Evolution

```
Phase 1: Single SFU (Current)
├── 1 LiveKit server
├── Max 100 participants
└── Local/Regional deployment

Phase 2: Multi-Region SFU (1k participants)
├── Multiple LiveKit servers (US, EU, Asia)
├── Geographic routing
├── TURN servers for NAT traversal
└── Load balancing

Phase 3: SFU + CDN (10k+ viewers)
├── LiveKit SFU for interactive participants (100-500)
├── HLS/DASH streaming to CDN for viewers (10k+)
├── Egress service for recording/streaming
└── Global CDN distribution
```

### Phase 1: Single SFU (100 participants)

**Current Setup - Local Development**

```
┌─────────────┐
│  Clients    │ ← 10-100 participants
│  (WebRTC)   │
└──────┬──────┘
       │
┌──────▼──────┐
│  LiveKit    │ ← Single server
│     SFU     │   4 CPU, 8GB RAM
└─────────────┘
```

**Configuration:**
```yaml
# livekit.yaml
port: 7880
rtc:
  port_range_start: 7882
  port_range_end: 7982  # 100 ports for 100 participants
  use_external_ip: true
  tcp_port: 7881
  
keys:
  API_KEY: your-api-key
  API_SECRET: your-api-secret

room:
  max_participants: 100
  empty_timeout: 300
  
turn:
  enabled: false  # Enable in production
```

**Bandwidth Requirements:**
- Per participant: ~2-3 Mbps upload, ~10-20 Mbps download (for 10 participants)
- Server: ~100-300 Mbps for 100 participants

### Phase 2: Multi-Region SFU (1k participants)

**Architecture:**

```
                    ┌─────────────┐
                    │   Backend   │
                    │   API + DB  │
                    └──────┬──────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
┌───────▼────────┐ ┌───────▼────────┐ ┌──────▼─────────┐
│  LiveKit SFU   │ │  LiveKit SFU   │ │  LiveKit SFU   │
│   US-East      │ │   EU-West      │ │   Asia-Pacific │
└───────┬────────┘ └───────┬────────┘ └───────┬────────┘
        │                  │                  │
   ┌────▼────┐        ┌────▼────┐       ┌────▼────┐
   │ Clients │        │ Clients │       │ Clients │
   │ (US)    │        │ (EU)    │       │ (Asia)  │
   └─────────┘        └─────────┘       └─────────┘
```

**Implementation:**

1. **Geographic Routing**
   ```javascript
   // Backend: Select closest SFU
   const selectSFU = (clientLocation) => {
     const sfus = [
       { region: 'us-east', url: 'wss://sfu-us.example.com', latency: 50 },
       { region: 'eu-west', url: 'wss://sfu-eu.example.com', latency: 150 },
       { region: 'asia', url: 'wss://sfu-asia.example.com', latency: 200 },
     ];
     
     // Sort by latency and return closest
     return sfus.sort((a, b) => a.latency - b.latency)[0];
   };
   ```

2. **TURN Server Configuration**
   ```yaml
   # livekit.yaml
   turn:
     enabled: true
     domain: turn.example.com
     tls_port: 5349
     udp_port: 3478
     external_tls: true
   ```

3. **Load Balancing**
   ```javascript
   // Backend: Check SFU capacity
   const selectAvailableSFU = async (region) => {
     const sfus = await livekitService.listSFUs(region);
     
     // Find SFU with capacity
     for (const sfu of sfus) {
       const rooms = await sfu.listRooms();
       const totalParticipants = rooms.reduce((sum, r) => sum + r.numParticipants, 0);
       
       if (totalParticipants < 1000) {
         return sfu;
       }
     }
     
     // Scale up new SFU if needed
     return await provisionNewSFU(region);
   };
   ```

**Scaling Configuration:**
- 10 SFU servers (3 regions × 3 servers + 1 backup)
- Each SFU: 8 CPU, 16GB RAM
- Max 100 participants per SFU
- Total capacity: 1000 participants

### Phase 3: SFU + CDN (10k+ viewers)

**Architecture:**

```
┌─────────────────────────────────────────────────────────────┐
│                    Interactive Layer                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                  │
│  │ Speaker  │  │ Speaker  │  │ Speaker  │                  │
│  │    1     │  │    2     │  │    N     │                  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘                  │
│       │             │             │                          │
│       └─────────────┼─────────────┘                          │
│                     │                                        │
│              ┌──────▼──────┐                                 │
│              │  LiveKit    │                                 │
│              │     SFU     │                                 │
│              └──────┬──────┘                                 │
│                     │                                        │
└─────────────────────┼────────────────────────────────────────┘
                      │
                      │ Egress (HLS/DASH)
                      │
┌─────────────────────▼────────────────────────────────────────┐
│                    Broadcast Layer                           │
│              ┌──────────────┐                                │
│              │   LiveKit    │                                │
│              │    Egress    │                                │
│              └──────┬───────┘                                │
│                     │                                        │
│                     │ HLS Stream                             │
│                     │                                        │
│              ┌──────▼───────┐                                │
│              │     CDN      │                                │
│              │  (CloudFlare)│                                │
│              └──────┬───────┘                                │
│                     │                                        │
└─────────────────────┼────────────────────────────────────────┘
                      │
         ┌────────────┼────────────┐
         │            │            │
    ┌────▼───┐   ┌───▼────┐  ┌───▼────┐
    │Viewer  │   │Viewer  │  │Viewer  │
    │  1     │   │  2     │  │  10k   │
    └────────┘   └────────┘  └────────┘
```

**Implementation:**

1. **Egress Configuration**
   ```javascript
   // Backend: Start HLS egress for large meetings
   const startBroadcast = async (roomName) => {
     const egress = await livekitService.startRoomCompositeEgress({
       roomName,
       layout: 'grid',
       output: {
         hls: {
           playlistName: `${roomName}.m3u8`,
           segmentDuration: 6,
         },
       },
     });
     
     return {
       egressId: egress.egressId,
       hlsUrl: `https://cdn.example.com/live/${roomName}.m3u8`,
     };
   };
   ```

2. **Viewer Client (HLS)**
   ```javascript
   // Frontend: Use HLS.js for viewers
   import Hls from 'hls.js';
   
   const playHLSStream = (videoElement, hlsUrl) => {
     if (Hls.isSupported()) {
       const hls = new Hls({
         lowLatencyMode: true,
         backBufferLength: 90,
       });
       hls.loadSource(hlsUrl);
       hls.attachMedia(videoElement);
     } else if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
       videoElement.src = hlsUrl;
     }
   };
   ```

3. **Participant Type Detection**
   ```javascript
   // Backend: Determine if user should be interactive or viewer
   const determineParticipantType = async (roomName, userId) => {
     const room = await livekitService.getRoom(roomName);
     const participants = await livekitService.listParticipants(roomName);
     
     // First 100 are interactive, rest are viewers
     if (participants.length < 100) {
       return {
         type: 'interactive',
         token: createToken(roomName, userId, 'Participant'),
         wsUrl: LIVEKIT_URL,
       };
     } else {
       return {
         type: 'viewer',
         hlsUrl: `https://cdn.example.com/live/${roomName}.m3u8`,
       };
     }
   };
   ```

**Scaling Configuration:**
- Interactive participants: 100-500 (via SFU)
- Viewers: 10k+ (via CDN)
- Egress servers: 2-3 per region
- CDN: CloudFlare/Fastly for global distribution
- Latency: 
  - Interactive: <200ms
  - Viewers: 3-10 seconds (HLS)


### Advanced Features

#### 1. Simulcast (Adaptive Quality)

**Enable on Client:**
```typescript
// Frontend: Publish with simulcast
await room.localParticipant.publishTrack(videoTrack, {
  simulcast: true,
  videoEncoding: {
    maxBitrate: 3000000,  // 3 Mbps
    maxFramerate: 30,
  },
  videoSimulcastLayers: [
    { quality: 'high', width: 1280, height: 720, bitrate: 3000000 },
    { quality: 'medium', width: 640, height: 360, bitrate: 800000 },
    { quality: 'low', width: 320, height: 180, bitrate: 200000 },
  ],
});
```

**Subscribe with Quality Selection:**
```typescript
// Frontend: Request specific quality
publication.setVideoQuality('high'); // or 'medium', 'low'

// Auto-adapt based on bandwidth
room.on(RoomEvent.ConnectionQualityChanged, (quality, participant) => {
  if (quality === 'poor') {
    publication.setVideoQuality('low');
  } else if (quality === 'good') {
    publication.setVideoQuality('medium');
  } else {
    publication.setVideoQuality('high');
  }
});
```

#### 2. Dynacast (Bandwidth Optimization)

**Enable on Client:**
```typescript
const room = new Room({
  adaptiveStream: true,
  dynacast: true,  // Only send layers that are being consumed
});
```

**How it works:**
- SFU tracks which layers subscribers are requesting
- Publisher only encodes/sends layers that are needed
- Saves bandwidth and CPU on publisher side

#### 3. Recording

**Start Recording:**
```javascript
// Backend: Start recording
const startRecording = async (roomName) => {
  const egress = await livekitService.startRoomCompositeEgress({
    roomName,
    layout: 'grid',
    output: {
      file: {
        filepath: `recordings/${roomName}-${Date.now()}.mp4`,
      },
    },
  });
  
  return egress.egressId;
};
```

#### 4. JWT-Based Authentication

**Enhanced Token with Permissions:**
```javascript
// Backend: Create token with granular permissions
const createToken = (roomName, identity, permissions = {}) => {
  const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity,
    name: permissions.name || identity,
    metadata: JSON.stringify(permissions.metadata || {}),
  });

  at.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: permissions.canPublish !== false,
    canSubscribe: permissions.canSubscribe !== false,
    canPublishData: permissions.canPublishData !== false,
    hidden: permissions.hidden || false,
    recorder: permissions.recorder || false,
  });

  return at.toJwt();
};

// Usage: Create viewer-only token
const viewerToken = createToken('room-123', 'viewer-1', {
  canPublish: false,
  canSubscribe: true,
  canPublishData: false,
});
```

### Infrastructure as Code (Kubernetes)

**LiveKit Deployment:**

```yaml
# k8s/livekit-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: livekit-server
spec:
  replicas: 3
  selector:
    matchLabels:
      app: livekit
  template:
    metadata:
      labels:
        app: livekit
    spec:
      containers:
      - name: livekit
        image: livekit/livekit-server:latest
        ports:
        - containerPort: 7880
          name: http
        - containerPort: 7881
          name: tcp
        - containerPort: 7882
          protocol: UDP
          name: udp-start
        env:
        - name: LIVEKIT_KEYS
          valueFrom:
            secretKeyRef:
              name: livekit-secrets
              key: api-keys
        - name: REDIS_HOST
          value: redis-service
        resources:
          requests:
            cpu: 2000m
            memory: 4Gi
          limits:
            cpu: 4000m
            memory: 8Gi
---
apiVersion: v1
kind: Service
metadata:
  name: livekit-service
spec:
  type: LoadBalancer
  ports:
  - port: 7880
    targetPort: 7880
    name: http
  - port: 7881
    targetPort: 7881
    name: tcp
  - port: 7882
    targetPort: 7882
    protocol: UDP
    name: udp
  selector:
    app: livekit
```

**Horizontal Pod Autoscaler:**

```yaml
# k8s/livekit-hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: livekit-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: livekit-server
  minReplicas: 3
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

### Monitoring and Observability

**Prometheus Metrics:**

```yaml
# k8s/prometheus-servicemonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: livekit-metrics
spec:
  selector:
    matchLabels:
      app: livekit
  endpoints:
  - port: http
    path: /metrics
    interval: 30s
```

**Key Metrics to Monitor:**
- Active rooms
- Total participants
- Bandwidth usage (in/out)
- CPU and memory usage
- Track publish/subscribe rates
- Connection quality
- Packet loss
- Jitter and latency

**Grafana Dashboard:**
```json
{
  "dashboard": {
    "title": "LiveKit SFU Monitoring",
    "panels": [
      {
        "title": "Active Participants",
        "targets": [
          {
            "expr": "sum(livekit_room_participants)"
          }
        ]
      },
      {
        "title": "Bandwidth Usage",
        "targets": [
          {
            "expr": "rate(livekit_bytes_sent[5m])"
          }
        ]
      }
    ]
  }
}
```


## Cost Analysis

### Phase 1: Single SFU (100 participants)

**Infrastructure:**
- 1 LiveKit server: $50-100/month (4 CPU, 8GB RAM)
- Backend API: $20-40/month (2 CPU, 4GB RAM)
- Database: $15-30/month (MongoDB Atlas)
- Total: **$85-170/month**

**Bandwidth:**
- 100 participants × 2 Mbps upload = 200 Mbps
- Bandwidth cost: ~$0.05/GB
- Monthly (24/7): ~$3,000/month
- Realistic (10 hours/day): ~$1,250/month

### Phase 2: Multi-Region (1k participants)

**Infrastructure:**
- 10 LiveKit servers: $500-1,000/month
- 3 Backend APIs: $60-120/month
- Database cluster: $100-200/month
- Redis cluster: $50-100/month
- Total: **$710-1,420/month**

**Bandwidth:**
- 1,000 participants × 2 Mbps = 2 Gbps
- Monthly cost: ~$12,500/month (realistic usage)

### Phase 3: SFU + CDN (10k viewers)

**Infrastructure:**
- 20 LiveKit servers: $1,000-2,000/month
- 5 Egress servers: $250-500/month
- Backend cluster: $200-400/month
- Database: $200-400/month
- Total: **$1,650-3,300/month**

**Bandwidth:**
- Interactive (500): ~$6,250/month
- CDN (10k viewers): ~$500-1,000/month (CloudFlare)
- Total: **~$6,750-7,250/month**

**Total Phase 3 Cost: $8,400-10,550/month**

### Cost Optimization Strategies

1. **Use Spot Instances**: Save 60-80% on compute
2. **Auto-scaling**: Scale down during off-peak hours
3. **CDN Caching**: Reduce egress bandwidth costs
4. **Regional Optimization**: Deploy only in high-traffic regions
5. **Compression**: Use VP9/AV1 codecs for better compression


## Comparison: P2P vs SFU

| Feature | P2P (SimplePeer) | SFU (LiveKit) |
|---------|------------------|---------------|
| **Max Participants** | ~10 | 100+ (single), 10k+ (with CDN) |
| **Bandwidth per Client** | O(n) - sends to all | O(1) - sends once |
| **Server Bandwidth** | Minimal | High |
| **Latency** | <100ms | <200ms |
| **CPU (Client)** | High (encode for each peer) | Low (encode once) |
| **CPU (Server)** | None | High |
| **NAT Traversal** | STUN only | STUN + TURN |
| **Recording** | Client-side only | Server-side |
| **Simulcast** | No | Yes |
| **Quality Adaptation** | Manual | Automatic |
| **Scalability** | Poor | Excellent |
| **Cost** | Low (no server) | Medium-High |
| **Complexity** | High (client-side) | Low (SDK handles it) |

## Key Differences in Code

### P2P (OLD)

```javascript
// Create peer for EACH participant
users.forEach(user => {
  const peer = new SimplePeer({
    initiator: true,
    stream: localStream,
  });
  
  peer.on('signal', signal => {
    socket.emit('signal', { to: user.id, signal });
  });
  
  peer.on('stream', remoteStream => {
    // Handle remote stream
  });
  
  peers.push(peer);
});

// Result: N-1 peer connections per client
```

### SFU (NEW)

```javascript
// Create ONE connection to SFU
const room = new Room();

await room.connect(wsUrl, token);

// Publish once
await room.localParticipant.enableCameraAndMicrophone();

// Subscribe to all automatically
room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
  // Handle remote track
});

// Result: 1 connection per client
```

## Migration Timeline

### Week 1: Setup & Backend
- Day 1-2: Install LiveKit, configure environment
- Day 3-4: Implement backend JWT generation
- Day 5: Add webhook handlers
- Day 6-7: Testing backend APIs

### Week 2: Frontend
- Day 1-2: Replace SimplePeer with LiveKit SDK
- Day 3-4: Build new UI components
- Day 5: Remove old P2P code
- Day 6-7: Testing with multiple clients

### Week 3: Production Prep
- Day 1-2: Deploy LiveKit to production
- Day 3-4: Configure TURN servers
- Day 5: Load testing
- Day 6-7: Monitoring setup

### Week 4: Launch
- Day 1-2: Gradual rollout (10% traffic)
- Day 3-4: Monitor and fix issues
- Day 5: Full rollout (100% traffic)
- Day 6-7: Deprecate old P2P system

## Troubleshooting

### Common Issues

**1. Connection Fails**
- Check LiveKit server is running
- Verify JWT token is valid
- Check firewall allows WebRTC ports
- Test STUN server connectivity

**2. No Video/Audio**
- Check browser permissions
- Verify tracks are published
- Check track subscriptions
- Monitor bandwidth

**3. Poor Quality**
- Enable simulcast
- Check network conditions
- Reduce resolution/framerate
- Use adaptive streaming

**4. High Latency**
- Use closest SFU region
- Enable TURN for better routing
- Check server CPU usage
- Optimize video encoding

## Resources

### Documentation
- [LiveKit Docs](https://docs.livekit.io/)
- [LiveKit Client SDK](https://docs.livekit.io/client-sdk-js/)
- [LiveKit Server SDK](https://docs.livekit.io/server-sdk-js/)

### Examples
- [LiveKit Examples](https://github.com/livekit/livekit-examples)
- [Meet Demo](https://github.com/livekit/meet)

### Community
- [LiveKit Discord](https://livekit.io/discord)
- [GitHub Discussions](https://github.com/livekit/livekit/discussions)

---

**Last Updated**: December 2024
**Version**: 2.0.0 (SFU Migration)
**Maintainer**: Luma Meet Team
