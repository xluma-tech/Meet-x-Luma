# 🔧 Fix LiveKit Authorization Error

## Problem
```
WARN livekit service/utils.go:54 error handling request
{"status": 401, "method": "GET", "path": "/rtc", "error": "invalid authorization token"}
```

**Root Cause:** LiveKit server credentials don't match backend credentials.

---

## Quick Fix

### Option 1: Use the Start Script (Easiest)

```bash
# Stop any running LiveKit server
docker stop $(docker ps -q --filter ancestor=livekit/livekit-server)

# Start with correct credentials
chmod +x start-livekit.sh
./start-livekit.sh
```

### Option 2: Manual Docker Command

```bash
# Stop existing LiveKit
docker stop $(docker ps -q --filter ancestor=livekit/livekit-server)

# Start with matching credentials
docker run --rm \
  -p 7880:7880 \
  -p 7881:7881 \
  -p 7882:7882/udp \
  -e LIVEKIT_KEYS="devkey: secret" \
  livekit/livekit-server \
  --dev
```

### Option 3: Use Config File

```bash
# Stop existing LiveKit
docker stop $(docker ps -q --filter ancestor=livekit/livekit-server)

# Start with config file (livekit-dev.yaml)
docker run --rm \
  -p 7880:7880 \
  -p 7881:7881 \
  -p 7882:7882/udp \
  -v $(pwd)/livekit-dev.yaml:/livekit.yaml \
  livekit/livekit-server \
  --config /livekit.yaml
```

---

## Verify It's Working

### 1. Check LiveKit Server Logs
You should see:
```
INFO livekit starting LiveKit server
INFO livekit server listening {"addr": ":7880"}
```

**No more 401 errors!**

### 2. Test Token Generation

```bash
# Test backend token endpoint
curl -X POST http://localhost:4000/api/rooms/test-room/join \
  -H "Content-Type: application/json" \
  -d '{"identity": "test-user", "name": "Test User"}'
```

Should return:
```json
{
  "token": "eyJhbGc...",
  "wsUrl": "ws://localhost:7880",
  "roomName": "test-room"
}
```

### 3. Test in Browser

1. Open: `http://localhost:3000/room/test-room`
2. Check browser console - should see:
   ```
   ✅ Connected to room: test-room
   ✅ Published local tracks
   ```
3. **No 401 errors!**

---

## Understanding the Credentials

### Backend (.env)
```bash
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=secret
LIVEKIT_URL=ws://localhost:7880
```

### LiveKit Server (must match!)
```bash
-e LIVEKIT_KEYS="devkey: secret"
```

**The format is:** `"API_KEY: API_SECRET"`

---

## Common Mistakes

### ❌ Wrong Format
```bash
# WRONG - Missing colon
-e LIVEKIT_KEYS="devkey secret"

# WRONG - Wrong separator
-e LIVEKIT_KEYS="devkey=secret"

# WRONG - Different credentials
-e LIVEKIT_KEYS="mykey: mypassword"
```

### ✅ Correct Format
```bash
# CORRECT - Matches backend/.env
-e LIVEKIT_KEYS="devkey: secret"
```

---

## Production Setup

For production, use strong credentials:

### 1. Generate Strong Credentials
```bash
# Generate random API key
openssl rand -hex 16
# Example: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6

# Generate random API secret
openssl rand -hex 32
# Example: x1y2z3a4b5c6d7e8f9g0h1i2j3k4l5m6n7o8p9q0r1s2t3u4v5w6x7y8z9a0b1c2
```

### 2. Update Backend .env
```bash
LIVEKIT_API_KEY=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
LIVEKIT_API_SECRET=x1y2z3a4b5c6d7e8f9g0h1i2j3k4l5m6n7o8p9q0r1s2t3u4v5w6x7y8z9a0b1c2
LIVEKIT_URL=wss://your-livekit-server.com
```

### 3. Update LiveKit Server
```bash
docker run -d \
  -p 7880:7880 \
  -p 7881:7881 \
  -p 7882:7882/udp \
  -e LIVEKIT_KEYS="a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6: x1y2z3a4b5c6d7e8f9g0h1i2j3k4l5m6n7o8p9q0r1s2t3u4v5w6x7y8z9a0b1c2" \
  livekit/livekit-server
```

---

## Troubleshooting

### Still Getting 401 Errors?

1. **Check LiveKit is using correct credentials:**
```bash
docker logs $(docker ps -q --filter ancestor=livekit/livekit-server) | grep -i key
```

2. **Restart backend to reload .env:**
```bash
cd backend
npm run dev
```

3. **Clear browser cache and reload**

4. **Check backend logs:**
```bash
# Should see token being generated
✅ Received access token, connecting to: ws://localhost:7880
```

### LiveKit Won't Start?

```bash
# Check if port is in use
lsof -i :7880

# Kill existing process
kill -9 <PID>

# Try again
./start-livekit.sh
```

---

## Quick Test Script

```bash
#!/bin/bash

echo "🧪 Testing LiveKit Setup..."
echo ""

# 1. Check LiveKit is running
echo "1. Checking LiveKit server..."
curl -s http://localhost:7880 > /dev/null
if [ $? -eq 0 ]; then
  echo "   ✅ LiveKit is running"
else
  echo "   ❌ LiveKit is not running"
  exit 1
fi

# 2. Check backend is running
echo "2. Checking backend..."
curl -s http://localhost:4000/health > /dev/null
if [ $? -eq 0 ]; then
  echo "   ✅ Backend is running"
else
  echo "   ❌ Backend is not running"
  exit 1
fi

# 3. Test token generation
echo "3. Testing token generation..."
RESPONSE=$(curl -s -X POST http://localhost:4000/api/rooms/test-room/join \
  -H "Content-Type: application/json" \
  -d '{"identity": "test-user", "name": "Test User"}')

if echo "$RESPONSE" | grep -q "token"; then
  echo "   ✅ Token generated successfully"
  echo ""
  echo "🎉 Everything is working!"
  echo ""
  echo "Open: http://localhost:3000/room/test-room"
else
  echo "   ❌ Token generation failed"
  echo "   Response: $RESPONSE"
  exit 1
fi
```

Save as `test-livekit.sh` and run:
```bash
chmod +x test-livekit.sh
./test-livekit.sh
```

---

## Summary

**The fix is simple:**

1. Stop LiveKit server
2. Start it with: `-e LIVEKIT_KEYS="devkey: secret"`
3. Restart backend (to ensure .env is loaded)
4. Test in browser

**Key Point:** The credentials in LiveKit server **MUST EXACTLY MATCH** the credentials in `backend/.env`

Format: `"API_KEY: API_SECRET"` (with colon and space)
