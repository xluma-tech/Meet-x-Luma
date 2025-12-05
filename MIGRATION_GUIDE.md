# P2P to SFU Migration Guide

## Quick Start (Local Development)

### Prerequisites
- Node.js 18+
- npm or yarn
- Terminal access

### Step 1: Install LiveKit Server (5 minutes)

```bash
# Download and install LiveKit CLI
curl -sSL https://get.livekit.io | bash

# Verify installation
livekit-server --version
```

### Step 2: Create LiveKit Configuration

Create `livekit-dev.yaml` in project root:

```yaml
port: 7880
bind_addresses:
  - "0.0.0.0"

rtc:
  port_range_start: 7882
  port_range_end: 7892
  use_external_ip: false
  tcp_port: 7881

keys:
  devkey: secret

logging:
  level: info
  
room:
  max_participants: 100
  empty_timeout: 300
```

### Step 3: Start LiveKit Server

```bash
# Terminal 1: Start LiveKit
livekit-server --config livekit-dev.yaml

# You should see:
# INFO    starting LiveKit server     {"version": "..."}
# INFO    rtc server listening        {"address": "0.0.0.0:7880"}
```

### Step 4: Update Backend

```bash
cd backend

# Install LiveKit SDK
npm install livekit-server-sdk

# Update .env
echo "LIVEKIT_URL=ws://localhost:7880" >> .env
echo "LIVEKIT_API_KEY=devkey" >> .env
echo "LIVEKIT_API_SECRET=secret" >> .env
```

Create `backend/src/config/livekit.js`:

```javascript
const { AccessToken } = require('livekit-server-sdk');

const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || 'devkey';
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || 'secret';
const LIVEKIT_URL = process.env.LIVEKIT_URL || 'ws://localhost:7880';

const createToken = (roomName, participantIdentity, participantName) => {
  const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity: participantIdentity,
    name: participantName,
  });

  at.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canSubscribe: true,
  });

  return at.toJwt();
};

module.exports = {
  LIVEKIT_API_KEY,
  LIVEKIT_API_SECRET,
  LIVEKIT_URL,
  createToken,
};
```

Update `backend/src/routes/roomRoutes.js`:

```javascript
const express = require('express');
const router = express.Router();
const { createToken, LIVEKIT_URL } = require('../config/livekit');

// NEW: Join room endpoint
router.post('/:roomId/join', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { identity, name } = req.body;

    const token = createToken(
      roomId,
      identity || `user-${Date.now()}`,
      name || 'Guest'
    );

    res.json({
      token,
      wsUrl: LIVEKIT_URL,
      roomName: roomId,
    });
  } catch (error) {
    console.error('Error joining room:', error);
    res.status(500).json({ error: 'Failed to join room' });
  }
});

module.exports = router;
```

Start backend:

```bash
# Terminal 2: Start backend
npm run dev
```

### Step 5: Update Frontend

```bash
cd frontend

# Install LiveKit Client SDK
npm install livekit-client

# Remove old P2P dependencies (optional, can keep for gradual migration)
# npm uninstall simple-peer socket.io-client

# Update .env.local
echo "NEXT_PUBLIC_LIVEKIT_URL=ws://localhost:7880" >> .env.local
```

Create `frontend/app/room/[id]/page-sfu.tsx`:

```typescript
'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { Room, RoomEvent, Track } from 'livekit-client';

export default function RoomPageSFU() {
  const params = useParams();
  const roomId = params?.id as string;
  
  const [room, setRoom] = useState<Room | null>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [isConnecting, setIsConnecting] = useState(true);
  const videoGridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!roomId) return;

    let roomInstance: Room | null = null;

    const connect = async () => {
      try {
        // Get token from backend
        const res = await fetch(`http://localhost:4000/api/rooms/${roomId}/join`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            identity: `user-${Date.now()}`,
            name: 'Test User',
          }),
        });

        const { token, wsUrl } = await res.json();

        // Create and connect room
        roomInstance = new Room({
          adaptiveStream: true,
          dynacast: true,
        });

        roomInstance.on(RoomEvent.TrackSubscribed, handleTrackSubscribed);
        roomInstance.on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);

        await roomInstance.connect(wsUrl, token);
        await roomInstance.localParticipant.enableCameraAndMicrophone();

        setRoom(roomInstance);
        setIsConnecting(false);
        updateParticipants(roomInstance);
      } catch (err) {
        console.error('Connection error:', err);
        setIsConnecting(false);
      }
    };

    connect();

    return () => {
      roomInstance?.disconnect();
    };
  }, [roomId]);

  const handleTrackSubscribed = (track: any) => {
    if (track.kind === Track.Kind.Video || track.kind === Track.Kind.Audio) {
      const element = track.attach();
      videoGridRef.current?.appendChild(element);
    }
  };

  const handleTrackUnsubscribed = (track: any) => {
    track.detach().forEach((el: HTMLElement) => el.remove());
  };

  const updateParticipants = (r: Room) => {
    setParticipants([
      r.localParticipant,
      ...Array.from(r.remoteParticipants.values()),
    ]);
  };

  if (isConnecting) {
    return <div className="flex items-center justify-center h-screen">Connecting...</div>;
  }

  return (
    <div className="h-screen bg-gray-900">
      <div ref={videoGridRef} className="grid grid-cols-2 gap-4 p-4" />
      <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 flex gap-4">
        <button
          onClick={() => room?.localParticipant.setMicrophoneEnabled(false)}
          className="px-4 py-2 bg-red-600 text-white rounded"
        >
          Mute
        </button>
        <button
          onClick={() => room?.disconnect()}
          className="px-4 py-2 bg-gray-600 text-white rounded"
        >
          Leave
        </button>
      </div>
    </div>
  );
}
```

Start frontend:

```bash
# Terminal 3: Start frontend
npm run dev
```

### Step 6: Test

1. Open http://localhost:3000/room/test-room in 2 browser tabs
2. You should see video from both participants
3. Check browser console for connection logs

## Verification Checklist

- [ ] LiveKit server running on port 7880
- [ ] Backend returns JWT token on `/api/rooms/:id/join`
- [ ] Frontend connects to LiveKit successfully
- [ ] Local video appears
- [ ] Remote video appears in second tab
- [ ] Audio works between participants
- [ ] Controls (mute/leave) work

## Next Steps

1. Review full architecture in `SFU_ARCHITECTURE.md`
2. Implement production features (TURN, multi-region, etc.)
3. Gradually migrate existing P2P code
4. Deploy to production

## Troubleshooting

**LiveKit won't start:**
- Check port 7880 is not in use: `lsof -i :7880`
- Check config file syntax
- Check logs for errors

**Frontend can't connect:**
- Verify backend is running
- Check CORS settings
- Verify token is valid
- Check browser console for errors

**No video/audio:**
- Check browser permissions
- Verify camera/mic are not in use
- Check track publishing in console
- Test with different browser

## Support

- Check `SFU_ARCHITECTURE.md` for detailed documentation
- LiveKit docs: https://docs.livekit.io/
- GitHub issues: https://github.com/livekit/livekit/issues
