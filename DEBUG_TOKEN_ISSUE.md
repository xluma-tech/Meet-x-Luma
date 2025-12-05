# 🐛 Debug: "Invalid Authorization Token" Error

## What I've Added

I've added logging to your backend to help debug the token issue.

### Files Modified:

1. **`backend/src/config/livekit.js`** - Added token generation logging
2. **`backend/src/controllers/roomController.js`** - Added join request logging

---

## How to Debug

### Step 1: Restart Backend with Logging

```bash
cd backend
npm run dev
```

You should see the startup logs.

### Step 2: Try to Join a Meeting

1. Go to your app: `http://localhost:3000`
2. Create a new meeting (or use existing one)
3. Try to join the meeting

### Step 3: Check Backend Console

You should now see detailed logs like:

```
📞 Join room request:
  Room ID: abc123xyz
  Identity: user-1234567890
  Name: John Doe

🔑 Creating LiveKit token with:
  API Key: devkey
  API Secret: ***cret
  Room: abc123xyz
  Identity: user-1234567890
  Name: John Doe
  Token (first 50 chars): eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE...
  Token length: 245
```

### Step 4: Check Browser Console

Open DevTools (F12) and look for:
- The token being received
- Any connection errors
- The exact error message

---

## Common Issues & Fixes

### Issue 1: API Key/Secret Mismatch

**Symptoms:**
```
API Key: devkey
API Secret: ***cret
```

**But LiveKit server is using different credentials**

**Fix:**
```bash
# Stop LiveKit
docker stop $(docker ps -q --filter ancestor=livekit/livekit-server)

# Start with EXACT credentials from backend/.env
docker run --rm \
  -p 7880:7880 \
  -p 7881:7881 \
  -p 7882:7882/udp \
  -e LIVEKIT_KEYS="devkey: secret" \
  livekit/livekit-server \
  --dev
```

### Issue 2: Wrong Token Format

**Symptoms:**
- Token is very short (< 100 chars)
- Token doesn't start with `eyJ`
- Token has only 2 parts instead of 3 (should be: `header.payload.signature`)

**Fix:**
Check if `livekit-server-sdk` is installed:
```bash
cd backend
npm list livekit-server-sdk
```

If not installed:
```bash
npm install livekit-server-sdk
```

### Issue 3: Environment Variables Not Loaded

**Symptoms:**
```
API Key: undefined
API Secret: undefined
```

**Fix:**
1. Check `.env` file exists in `backend/` directory
2. Restart backend server
3. Make sure you're running from `backend/` directory

### Issue 4: Token Expiry

**Symptoms:**
- Token works initially but fails after some time
- Error: "token expired"

**Fix:**
The default token TTL is 6 hours. If you need longer, modify `livekit.js`:

```javascript
const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
  identity: participantIdentity,
  name: participantName,
  metadata: JSON.stringify(metadata),
  ttl: '24h', // ← Add this line
});
```

---

## Manual Token Test

If you want to test token generation manually:

```bash
# 1. Create a meeting first (via UI or API)

# 2. Test the join endpoint
curl -X POST http://localhost:4000/api/rooms/YOUR_MEETING_CODE/join \
  -H "Content-Type: application/json" \
  -d '{
    "identity": "test-user-123",
    "name": "Test User"
  }'
```

Expected response:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "wsUrl": "ws://localhost:7880",
  "roomName": "YOUR_MEETING_CODE",
  "serverUrl": "ws://localhost:7880",
  "meeting": {
    "title": "Meeting Title",
    "hostAuth0Id": "...",
    "status": "active"
  }
}
```

---

## Verify LiveKit Server Credentials

```bash
# Check what credentials LiveKit is using
docker inspect $(docker ps -q --filter ancestor=livekit/livekit-server) \
  --format='{{range .Config.Env}}{{println .}}{{end}}' | grep LIVEKIT

# Should show:
# LIVEKIT_KEYS=devkey: secret
```

---

## Next Steps

1. **Restart backend** with the new logging
2. **Try to join a meeting**
3. **Copy the backend console output** and share it
4. **Copy the browser console errors** and share them

With the logs, we can pinpoint exactly where the token generation is failing!

---

## Quick Checklist

- [ ] Backend `.env` has `LIVEKIT_API_KEY=devkey` and `LIVEKIT_API_SECRET=secret`
- [ ] LiveKit server is running with `-e LIVEKIT_KEYS="devkey: secret"`
- [ ] Backend is restarted and showing logs
- [ ] Browser cache is cleared
- [ ] Meeting exists before trying to join
- [ ] Backend console shows token generation logs
- [ ] Browser console shows the actual error

---

## If Still Failing

Share these:

1. **Backend startup logs** (first 20 lines)
2. **Backend logs when joining** (the 🔑 token generation part)
3. **Browser console error** (full error message)
4. **Network tab** - The `/join` request and response

This will tell us exactly what's wrong!
