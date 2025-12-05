# Quick Start Guide - SFU Architecture

## Prerequisites
- Node.js 18+
- npm or yarn

## Step 1: Install LiveKit Server

### Windows
1. Download LiveKit from: https://github.com/livekit/livekit/releases
2. Extract and add to PATH
3. Or use: `winget install livekit`

### macOS
```bash
brew install livekit
```

### Linux
```bash
curl -sSL https://get.livekit.io | bash
```

## Step 2: Run Setup Script

### Windows
```bash
setup-sfu.bat
```

### macOS/Linux
```bash
chmod +x setup-sfu.sh
./setup-sfu.sh
```

## Step 3: Start Services

### Terminal 1: LiveKit Server
```bash
livekit-server --config livekit-dev.yaml
```

You should see:
```
INFO    starting LiveKit server     {"version": "..."}
INFO    rtc server listening        {"address": "0.0.0.0:7880"}
```

### Terminal 2: Backend
```bash
cd backend
npm run dev
```

You should see:
```
✓ Backend server running on http://0.0.0.0:4000
✓ Environment: development
```

### Terminal 3: Frontend
```bash
cd frontend
npm run dev
```

You should see:
```
▲ Next.js 16.0.3
- Local:        http://localhost:3000
```

## Step 4: Test SFU Mode

1. Open browser: http://localhost:3000/room/test-room
2. Allow camera and microphone permissions
3. Open another tab: http://localhost:3000/room/test-room
4. You should see both participants!

## Using SFU Mode in Your App

To use SFU mode instead of P2P, rename the file:

```bash
# Backup old P2P page
mv frontend/app/room/[id]/page.tsx frontend/app/room/[id]/page-p2p.tsx

# Use SFU page
mv frontend/app/room/[id]/page-sfu.tsx frontend/app/room/[id]/page.tsx
```

Or update your page.tsx to import from page-sfu.tsx:

```typescript
// frontend/app/room/[id]/page.tsx
export { default } from './page-sfu';
```

## Verification Checklist

- [ ] LiveKit server running on port 7880
- [ ] Backend returns JWT token on POST `/api/rooms/:id/join`
- [ ] Frontend connects to LiveKit successfully
- [ ] Local video appears
- [ ] Remote video appears in second tab
- [ ] Audio works between participants
- [ ] Controls (mute/unmute, video on/off, leave) work
- [ ] Participant count updates correctly

## Troubleshooting

### LiveKit won't start
- Check port 7880 is not in use: `netstat -an | findstr 7880` (Windows) or `lsof -i :7880` (Mac/Linux)
- Check config file syntax
- Check logs for errors

### Frontend can't connect
- Verify backend is running on port 4000
- Check CORS settings in backend/.env
- Verify token is valid (check browser console)
- Check browser console for errors

### No video/audio
- Check browser permissions (camera/microphone)
- Verify camera/mic are not in use by another app
- Check track publishing in browser console
- Try different browser (Chrome recommended)

### Connection quality issues
- Check network bandwidth
- Verify STUN servers are accessible
- Monitor browser console for ICE connection state
- Check LiveKit server logs

## Architecture Benefits

### P2P (Old)
- Each client connects to every other client
- Bandwidth: O(n²)
- Max participants: ~10

### SFU (New)
- Each client connects to SFU only
- Bandwidth: O(n)
- Max participants: 100+

## Next Steps

1. ✅ Test with 3+ participants
2. ✅ Test audio/video quality
3. ✅ Test on different networks
4. 📝 Add screen sharing (see SFU_ARCHITECTURE.md)
5. 📝 Add recording (see SFU_ARCHITECTURE.md)
6. 📝 Deploy to production (see SFU_ARCHITECTURE.md)

## Support

- LiveKit Docs: https://docs.livekit.io/
- LiveKit Discord: https://livekit.io/discord
- GitHub Issues: https://github.com/livekit/livekit/issues

## Files Created

Backend:
- `backend/src/config/livekit.js` - LiveKit configuration
- `backend/src/services/livekitService.js` - LiveKit API wrapper
- `backend/src/controllers/roomController.js` - Updated with SFU endpoints

Frontend:
- `frontend/app/room/[id]/page-sfu.tsx` - SFU room page
- `frontend/app/room/[id]/components/ParticipantTileSFU.tsx` - Participant component
- `frontend/app/room/[id]/components/VideoGridSFU.tsx` - Grid layout
- `frontend/app/room/[id]/components/ControlsSFU.tsx` - Media controls

Configuration:
- `livekit-dev.yaml` - LiveKit server config
- `setup-sfu.sh` / `setup-sfu.bat` - Setup scripts
