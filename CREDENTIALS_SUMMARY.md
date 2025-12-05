# 🔐 LiveKit Credentials - Current Status

## ✅ YOUR CREDENTIALS ARE CORRECT!

I've verified everything:

### Backend `.env` File
```bash
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=secret
LIVEKIT_URL=ws://localhost:7880
```

### LiveKit Server (Running)
```bash
LIVEKIT_KEYS=devkey: secret
```

**✅ THEY MATCH!** The credentials are correct.

---

## 🐛 The Real Problem

The 401 errors you're seeing are happening **AFTER** the room is created successfully. Look at the logs:

```
✅ API RoomService.CreateRoom ... status: "200"  ← Room created OK
❌ error handling request {"status": 401, "method": "GET", "path": "/rtc", "error": "invalid authorization token"}
```

This means:
1. ✅ Backend can talk to LiveKit (room creation works)
2. ✅ Credentials match (API calls succeed)
3. ❌ **Frontend token is invalid** (client connection fails)

---

## 🔍 Root Cause

The issue is likely in **how the token is being generated** for the frontend client, not the credentials themselves.

### Check These:

1. **Is your backend actually running and reloaded?**
   ```bash
   # Restart backend to ensure .env is loaded
   cd backend
   npm run dev
   ```

2. **Check the token endpoint response:**
   ```bash
   # First, create a meeting in the UI, then test:
   curl -X POST http://localhost:4000/api/rooms/YOUR_MEETING_CODE/join \
     -H "Content-Type: application/json" \
     -d '{"identity": "test-user", "name": "Test User"}'
   ```
   
   Should return:
   ```json
   {
     "token": "eyJhbGc...",
     "wsUrl": "ws://localhost:7880",
     "roomName": "YOUR_MEETING_CODE"
   }
   ```

3. **Check browser console when joining meeting:**
   - Open DevTools → Console
   - Look for the token being sent
   - Check for any errors

---

## 🎯 Quick Fix Steps

### Step 1: Restart Backend
```bash
# Kill backend if running
pkill -f "node.*backend"

# Start fresh
cd backend
npm run dev
```

### Step 2: Clear Browser Cache
- Open DevTools (F12)
- Right-click refresh button → "Empty Cache and Hard Reload"
- Or use Incognito/Private window

### Step 3: Test Meeting Creation
1. Go to: `http://localhost:3000`
2. Create a new meeting
3. Join the meeting
4. Check browser console for errors

---

## 📊 What's Happening

```
Frontend                Backend                 LiveKit
   |                       |                       |
   |-- Create Meeting ---->|                       |
   |                       |-- CreateRoom -------->|
   |                       |<----- 200 OK ---------|  ✅ Works
   |                       |                       |
   |-- Join Meeting ------>|                       |
   |                       |-- Generate Token ---->|
   |<----- Token ----------|                       |
   |                       |                       |
   |-- Connect with Token ----------------------->|
   |                       |                       |
   |<----- 401 Error ----------------------|  ❌ Fails here
```

The 401 error happens when the **frontend tries to connect** with the token, not during room creation.

---

## 🔧 Possible Issues

### 1. Token Expiry
Check if token has `exp` (expiry) claim that's too short or already expired.

### 2. Token Format
The token must be a valid JWT with correct claims:
- `iss` (issuer) = API key
- `sub` (subject) = participant identity
- `video` (grants) = room permissions

### 3. Backend Not Reloaded
If you changed `.env`, you MUST restart the backend server.

### 4. Wrong URL
Frontend might be connecting to wrong LiveKit URL.

---

## 🧪 Debug Commands

### Check if backend is using correct credentials:
```bash
# In backend directory
grep LIVEKIT .env
```

### Check LiveKit server credentials:
```bash
docker inspect $(docker ps -q --filter ancestor=livekit/livekit-server) \
  --format='{{range .Config.Env}}{{println .}}{{end}}' | grep LIVEKIT
```

### Test backend health:
```bash
curl http://localhost:4000/health
```

### Check backend logs:
Look for token generation logs when you try to join a meeting.

---

## ✅ Summary

**Your credentials ARE correct:**
- Backend: `devkey` / `secret`
- LiveKit: `devkey: secret`

**The problem is NOT the credentials**, it's likely:
1. Backend not reloaded after .env change
2. Token generation logic issue
3. Frontend using cached/old token
4. Token expiry too short

**Next steps:**
1. Restart backend
2. Clear browser cache
3. Try joining a meeting
4. Check browser console for actual error
5. Share the browser console error if still failing

---

## 🆘 If Still Not Working

Share these logs:
1. Backend console output when joining meeting
2. Browser console errors
3. Network tab showing the `/join` request/response
4. LiveKit server logs at the moment of connection attempt

The credentials are fine - we need to see what token is actually being generated and sent!
