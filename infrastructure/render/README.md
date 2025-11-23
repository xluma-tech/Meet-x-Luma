# Render Deployment - Testing Only

## Overview

This is a **simplified, single-server deployment** for testing the SFU architecture on Render. It's NOT production-ready but perfect for:
- Testing the SFU concept
- Developing the signaling server
- Client SDK migration testing
- Small-scale demos (<20 concurrent users)

## ⚠️ Limitations

### What Works on Render
- ✅ LiveKit SFU (single instance)
- ✅ Signaling server
- ✅ Redis (managed)
- ✅ PostgreSQL (managed)
- ✅ Basic testing (<20 users)

### What Doesn't Work on Render
- ❌ UDP port range (10000-60000) - Render doesn't support custom UDP ports
- ❌ TURN servers - Requires UDP
- ❌ Horizontal scaling - Limited autoscaling
- ❌ Multi-region - Single region only
- ❌ Production load (>50 users)

## Workaround: Use Public TURN Servers

Since Render doesn't support custom UDP ports, we'll use public TURN servers for testing:
- Google's public STUN servers (free)
- Twilio's TURN service (pay-as-you-go, ~$0.40/GB)
- Xirsys TURN service (free tier available)

## Architecture on Render

```
┌─────────────────────────────────────┐
│         Render Services             │
├─────────────────────────────────────┤
│                                     │
│  ┌──────────────┐  ┌─────────────┐ │
│  │   Frontend   │  │  Signaling  │ │
│  │   (Static)   │  │   (Node.js) │ │
│  └──────────────┘  └─────────────┘ │
│                                     │
│  ┌──────────────┐  ┌─────────────┐ │
│  │  LiveKit SFU │  │    Redis    │ │
│  │   (Docker)   │  │  (Managed)  │ │
│  └──────────────┘  └─────────────┘ │
│                                     │
│  ┌──────────────┐                  │
│  │  PostgreSQL  │                  │
│  │  (Managed)   │                  │
│  └──────────────┘                  │
└─────────────────────────────────────┘
         │
         ▼
   External TURN
   (Twilio/Xirsys)
```

## Quick Start (30 minutes)

### Step 1: Create Render Account
1. Go to https://render.com
2. Sign up (free tier available)
3. Connect your GitHub repository

### Step 2: Deploy Redis
```bash
# In Render Dashboard:
# 1. Click "New +" → "Redis"
# 2. Name: media-platform-redis
# 3. Plan: Free (256MB) or Starter ($10/mo)
# 4. Click "Create Redis"
# 5. Copy the Internal Redis URL
```

### Step 3: Deploy PostgreSQL
```bash
# In Render Dashboard:
# 1. Click "New +" → "PostgreSQL"
# 2. Name: media-platform-db
# 3. Database: media_platform
# 4. Plan: Free or Starter ($7/mo)
# 5. Click "Create Database"
# 6. Copy the Internal Database URL
```

### Step 4: Deploy LiveKit SFU

Create `render.yaml` in your repo root:

```yaml
services:
  # LiveKit SFU
  - type: web
    name: livekit-sfu
    env: docker
    dockerfilePath: ./infrastructure/render/Dockerfile.livekit
    plan: starter  # $7/mo - 512MB RAM
    envVars:
      - key: LIVEKIT_KEYS
        value: "devkey: secret"
      - key: REDIS_HOST
        fromService:
          type: redis
          name: media-platform-redis
          property: host
      - key: REDIS_PORT
        fromService:
          type: redis
          name: media-platform-redis
          property: port
    healthCheckPath: /

  # Signaling Server
  - type: web
    name: signaling
    env: node
    buildCommand: cd backend && npm install
    startCommand: cd backend && npm start
    plan: starter  # $7/mo
    envVars:
      - key: PORT
        value: 4000
      - key: LIVEKIT_URL
        fromService:
          type: web
          name: livekit-sfu
          property: host
      - key: REDIS_URL
        fromService:
          type: redis
          name: media-platform-redis
          property: connectionString
      - key: DATABASE_URL
        fromService:
          type: pgsql
          name: media-platform-db
          property: connectionString

  # Frontend
  - type: web
    name: frontend
    env: static
    buildCommand: cd frontend && npm install && npm run build
    staticPublishPath: frontend/out
    plan: free
    envVars:
      - key: NEXT_PUBLIC_SOCKET_URL
        fromService:
          type: web
          name: signaling
          property: host
      - key: NEXT_PUBLIC_LIVEKIT_URL
        fromService:
          type: web
          name: livekit-sfu
          property: host
```

### Step 5: Create LiveKit Dockerfile

Create `infrastructure/render/Dockerfile.livekit`:

```dockerfile
FROM livekit/livekit-server:v1.5.0

# Copy configuration
COPY infrastructure/render/livekit.yaml /etc/livekit.yaml

# Expose ports
EXPOSE 7880 7881

# Start LiveKit
CMD ["livekit-server", "--config", "/etc/livekit.yaml"]
```

### Step 6: Create LiveKit Config

Create `infrastructure/render/livekit.yaml`:

```yaml
port: 7880

rtc:
  # Render assigns a single port, so we use TCP fallback
  tcp_port: 7881
  use_external_ip: true
  # Use public STUN servers
  ice_servers:
    - urls:
      - stun:stun.l.google.com:19302
      - stun:stun1.l.google.com:19302
    # Add Twilio TURN (optional, requires account)
    # - urls:
    #   - turn:global.turn.twilio.com:3478?transport=tcp
    #   username: your-twilio-username
    #   credential: your-twilio-credential

redis:
  address: ${REDIS_HOST}:${REDIS_PORT}

room:
  max_participants: 20  # Limit for testing
  empty_timeout: 300s
  auto_create: true

keys:
  devkey: secret  # Change in production!

logging:
  level: info
```

### Step 7: Update Backend for LiveKit

Update `backend/src/server.js` to integrate with LiveKit:

```javascript
// Add LiveKit token generation
const { AccessToken } = require('livekit-server-sdk');

app.post('/api/token', (req, res) => {
  const { roomName, participantName } = req.body;
  
  const at = new AccessToken(
    process.env.LIVEKIT_API_KEY || 'devkey',
    process.env.LIVEKIT_API_SECRET || 'secret',
    {
      identity: participantName,
    }
  );
  
  at.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canSubscribe: true,
  });
  
  res.json({
    token: at.toJwt(),
    url: process.env.LIVEKIT_URL || 'ws://localhost:7880',
  });
});
```

### Step 8: Update Frontend for LiveKit

Update `frontend/app/room/[id]/page.tsx`:

```typescript
import { Room, RoomEvent, Track } from 'livekit-client';

// Replace SimplePeer connection with LiveKit
const connectToRoom = async () => {
  // Get token from backend
  const response = await fetch('/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      roomName: roomId,
      participantName: userName,
    }),
  });
  
  const { token, url } = await response.json();
  
  // Connect to LiveKit room
  const room = new Room({
    adaptiveStream: true,
    dynacast: true,
  });
  
  await room.connect(url, token);
  
  // Publish local tracks
  await room.localParticipant.setCameraEnabled(true);
  await room.localParticipant.setMicrophoneEnabled(true);
  
  // Subscribe to remote tracks
  room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
    if (track.kind === Track.Kind.Video) {
      const element = track.attach();
      document.getElementById('videos').appendChild(element);
    }
  });
};
```

### Step 9: Deploy to Render

```bash
# Commit changes
git add .
git commit -m "Add Render deployment configuration"
git push

# In Render Dashboard:
# 1. Click "New +" → "Blueprint"
# 2. Connect your repository
# 3. Render will auto-detect render.yaml
# 4. Click "Apply"
# 5. Wait 5-10 minutes for deployment
```

### Step 10: Test Deployment

```bash
# Get your service URLs from Render dashboard
FRONTEND_URL="https://your-app.onrender.com"
LIVEKIT_URL="https://livekit-sfu.onrender.com"

# Test LiveKit health
curl $LIVEKIT_URL/

# Test frontend
open $FRONTEND_URL
```

## Cost Estimate (Render)

| Service | Plan | Monthly Cost |
|---------|------|--------------|
| Frontend | Free | $0 |
| Signaling | Starter | $7 |
| LiveKit SFU | Starter | $7 |
| Redis | Free/Starter | $0-10 |
| PostgreSQL | Free/Starter | $0-7 |
| **Total** | | **$14-31/mo** |

**Plus**: External TURN costs (if using Twilio: ~$0.40/GB)

## Using External TURN Services

### Option 1: Twilio TURN (Recommended)

1. Sign up at https://www.twilio.com/stun-turn
2. Get credentials
3. Update `livekit.yaml`:

```yaml
rtc:
  ice_servers:
    - urls:
      - stun:stun.l.google.com:19302
    - urls:
      - turn:global.turn.twilio.com:3478?transport=tcp
      - turn:global.turn.twilio.com:3478?transport=udp
      - turn:global.turn.twilio.com:443?transport=tcp
      username: your-twilio-username
      credential: your-twilio-credential
```

### Option 2: Xirsys TURN (Free Tier)

1. Sign up at https://xirsys.com
2. Create a channel
3. Get credentials
4. Update `livekit.yaml` with Xirsys TURN servers

### Option 3: Open Relay Project (Free, Limited)

```yaml
rtc:
  ice_servers:
    - urls:
      - stun:stun.l.google.com:19302
    - urls:
      - turn:openrelay.metered.ca:80
      username: openrelayproject
      credential: openrelayproject
```

## Testing Checklist

- [ ] LiveKit SFU is running (check health endpoint)
- [ ] Signaling server is running
- [ ] Frontend is deployed
- [ ] Can create a room
- [ ] Can join a room
- [ ] Video/audio works
- [ ] Screen sharing works (if supported)
- [ ] Chat works
- [ ] Test with 2-5 users simultaneously

## Limitations & Workarounds

### Issue: UDP Ports Not Available
**Impact**: Direct P2P connections may fail
**Workaround**: Use TCP fallback + external TURN
**Solution**: LiveKit automatically falls back to TCP on port 7881

### Issue: Limited RAM (512MB)
**Impact**: Can't handle many concurrent users
**Workaround**: Limit to 20 users per room
**Solution**: Upgrade to higher plan or use AWS/GCP

### Issue: No Autoscaling
**Impact**: Can't handle traffic spikes
**Workaround**: Manual scaling via Render dashboard
**Solution**: Use Kubernetes for production

### Issue: Single Region
**Impact**: High latency for global users
**Workaround**: Choose region closest to most users
**Solution**: Use multi-region AWS/GCP deployment

## When to Move to Production Architecture

Move to the full Kubernetes/AWS architecture when:
- ✅ You have >50 concurrent users
- ✅ You need <200ms latency globally
- ✅ You need 99.9% availability
- ✅ You need autoscaling
- ✅ You need multi-region support
- ✅ Cost per user matters (Render: ~$1-2/user, AWS: $0.38/user)

## Migration Path

### Phase 1: Test on Render (Now)
- Deploy simplified architecture
- Test SFU concept
- Develop signaling server
- Migrate client SDK

### Phase 2: Hybrid (Optional)
- Keep frontend on Vercel
- Keep signaling on Render
- Move SFU to AWS (single region)

### Phase 3: Full Production (8 weeks)
- Follow `infrastructure/IMPLEMENTATION_GUIDE.md`
- Deploy to AWS/GCP with Kubernetes
- Multi-region with autoscaling
- Full monitoring and alerting

## Troubleshooting

### LiveKit won't start
```bash
# Check logs in Render dashboard
# Common issues:
# 1. Invalid config syntax
# 2. Redis connection failed
# 3. Port already in use
```

### Can't connect to room
```bash
# Check browser console for errors
# Common issues:
# 1. Invalid token
# 2. CORS issues
# 3. WebSocket connection failed
# 4. ICE connection failed (need TURN)
```

### Poor video quality
```bash
# Likely causes:
# 1. Using TCP fallback (slower than UDP)
# 2. Limited bandwidth on Render
# 3. No TURN server configured
# Solution: Add external TURN server
```

## Next Steps

1. **Deploy to Render** (follow steps above)
2. **Test with 2-5 users** (verify it works)
3. **Develop signaling server** (add features)
4. **Migrate client SDK** (SimplePeer → LiveKit)
5. **Plan production migration** (when ready to scale)

## Support

- **Render Docs**: https://render.com/docs
- **LiveKit Docs**: https://docs.livekit.io
- **Twilio TURN**: https://www.twilio.com/docs/stun-turn
- **This Project**: See `infrastructure/` for production architecture

---

**Remember**: This is for **testing only**. For production with 100+ users, use the full Kubernetes architecture in `infrastructure/`.
