# 🚀 Switch from P2P to SFU (LiveKit) - Complete Guide

## Current Status

✅ **Backend is READY** - All LiveKit code is already implemented  
✅ **Frontend has SFU page** - `page-sfu.tsx` is ready to use  
⚠️ **LiveKit Server** - You need to install and run it  
⚠️ **Frontend routing** - Need to swap the active page file

---

## What You Need to Do

### Option 1: Quick Switch (Recommended)

Just run the switch script:

```bash
chmod +x switch-mode.sh
./switch-mode.sh
# Choose option 2 for SFU mode
```

### Option 2: Manual Switch

1. **Swap the frontend page files:**
```bash
cd frontend/app/room/[id]
mv page.tsx page-p2p.tsx
mv page-sfu.tsx page.tsx
cd ../../../..
```

2. **Install LiveKit Server:**

**Option A: Using Docker (Easiest)**
```bash
docker run --rm -p 7880:7880 \
  -p 7881:7881 \
  -p 7882:7882/udp \
  -e LIVEKIT_KEYS="devkey: secret" \
  livekit/livekit-server \
  --dev
```

**Option B: Using Binary**
```bash
# Download from https://github.com/livekit/livekit/releases
# Or use homebrew on Mac:
brew install livekit

# Run with dev config
livekit-server --dev
```

3. **Start your services:**
```bash
# Terminal 1: LiveKit Server
docker run --rm -p 7880:7880 -p 7881:7881 -p 7882:7882/udp \
  -e LIVEKIT_KEYS="devkey: secret" \
  livekit/livekit-server --dev

# Terminal 2: Backend
cd backend
npm run dev

# Terminal 3: Frontend
cd frontend
npm run dev
```

4. **Test it:**
```
Open: http://localhost:3000/room/test-room
```

---

## What's Already Implemented

### ✅ Backend (No changes needed)

**LiveKit Configuration** (`backend/src/config/livekit.js`)
- Token generation
- Permission management
- Already configured with your .env

**LiveKit Service** (`backend/src/services/livekitService.js`)
- Create/delete rooms
- List participants
- Remove participants
- Update room metadata

**Room Controller** (`backend/src/controllers/roomController.js`)
- `POST /api/rooms/:roomId/join` - Get LiveKit token
- `GET /api/rooms/:roomId/info` - Get room info
- `POST /api/rooms/:roomId/end` - End meeting

**Environment Variables** (Already in `.env`)
```bash
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=secret
LIVEKIT_URL=ws://localhost:7880
```

### ✅ Frontend (Just needs activation)

**SFU Page** (`frontend/app/room/[id]/page-sfu.tsx`)
- LiveKit client integration
- Video grid for participants
- Audio/video controls
- Automatic reconnection
- Adaptive streaming

**Components** (Already exist)
- `VideoGridSFU.tsx` - Participant video grid
- `ControlsSFU.tsx` - Meeting controls

---

## Key Differences: P2P vs SFU

### P2P (Current - SimplePeer)
```
Participant A ←→ Participant B
     ↑              ↑
     └──────────────┘
        Direct P2P

✅ Low latency (<200ms)
✅ No server bandwidth
❌ Max 10 participants
❌ High client CPU/bandwidth
```

### SFU (LiveKit)
```
Participant A → LiveKit Server ← Participant B
                    ↓
              Participant C

✅ Scales to 100+ participants
✅ Lower client bandwidth
✅ Better quality control
❌ Requires LiveKit server
❌ Slightly higher latency
```

---

## Testing the Switch

### 1. Test SFU with test-sfu.html
```bash
# Start LiveKit
docker run --rm -p 7880:7880 -p 7881:7881 -p 7882:7882/udp \
  -e LIVEKIT_KEYS="devkey: secret" \
  livekit/livekit-server --dev

# Start backend
cd backend && npm run dev

# Open test file
open test-sfu.html
# Or navigate to: file:///path/to/test-sfu.html
```

### 2. Test with actual app
```bash
# After switching to SFU mode
cd frontend
npm run dev

# Open in browser
http://localhost:3000/room/test-room
```

### 3. Multi-participant test
- Open the same room URL in multiple browser tabs
- Should see all participants in a grid
- Test audio/video controls

---

## Troubleshooting

### LiveKit Server Won't Start
```bash
# Check if port 7880 is already in use
lsof -i :7880

# Kill existing process
kill -9 <PID>

# Try again
docker run --rm -p 7880:7880 -p 7881:7881 -p 7882:7882/udp \
  -e LIVEKIT_KEYS="devkey: secret" \
  livekit/livekit-server --dev
```

### Frontend Can't Connect
1. Check LiveKit is running: `curl http://localhost:7880`
2. Check backend is running: `curl http://localhost:4000/health`
3. Check browser console for errors
4. Verify `.env.local` has correct URLs:
```bash
NEXT_PUBLIC_BACKEND_API_URL=http://localhost:4000
NEXT_PUBLIC_SOCKET_URL=http://localhost:4000
```

### "Failed to get access token"
- Ensure backend is running
- Check backend logs for errors
- Verify LiveKit server is accessible
- Check `.env` has correct LiveKit credentials

### No Video/Audio
- Check browser permissions (camera/microphone)
- Check browser console for errors
- Verify LiveKit server is running
- Try refreshing the page

---

## Switch Back to P2P

If you want to go back to P2P:

```bash
cd frontend/app/room/[id]
mv page.tsx page-sfu.tsx
mv page-p2p.tsx page.tsx
cd ../../../..
```

Or run the switch script and choose option 1.

---

## Production Deployment

### For Production SFU:

1. **Deploy LiveKit Server**
   - Use LiveKit Cloud (easiest): https://livekit.io/cloud
   - Or self-host on AWS/GCP/Azure
   - Update `.env` with production credentials

2. **Update Environment Variables**
```bash
# Backend .env
LIVEKIT_API_KEY=your-production-key
LIVEKIT_API_SECRET=your-production-secret
LIVEKIT_URL=wss://your-livekit-server.com

# Frontend .env.production
NEXT_PUBLIC_BACKEND_API_URL=https://your-backend.com
```

3. **Deploy as usual**
   - Backend to Render.com
   - Frontend to Vercel

---

## Summary

**To switch to SFU, you need:**

1. ✅ Install LiveKit Server (Docker or binary)
2. ✅ Run LiveKit Server
3. ✅ Swap frontend page files (or use switch script)
4. ✅ Restart frontend dev server

**No code changes needed** - everything is already implemented!

The backend automatically detects which mode you're using based on which frontend page is active.

---

## Quick Start Commands

```bash
# 1. Start LiveKit (Terminal 1)
docker run --rm -p 7880:7880 -p 7881:7881 -p 7882:7882/udp \
  -e LIVEKIT_KEYS="devkey: secret" \
  livekit/livekit-server --dev

# 2. Switch to SFU mode
./switch-mode.sh
# Choose option 2

# 3. Start backend (Terminal 2)
cd backend && npm run dev

# 4. Start frontend (Terminal 3)
cd frontend && npm run dev

# 5. Open browser
# http://localhost:3000/room/test-room
```

Done! 🎉
