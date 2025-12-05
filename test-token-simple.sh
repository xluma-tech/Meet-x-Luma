#!/bin/bash

echo "🧪 Testing LiveKit Token Generation"
echo "===================================="
echo ""

# First, let's create a test meeting
echo "1. Creating a test meeting..."
MEETING_RESPONSE=$(curl -s -X POST http://localhost:4000/api/meetings \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test SFU Meeting",
    "description": "Testing LiveKit",
    "type": "public",
    "isGuestMeeting": true,
    "guestHostId": "test-host-123",
    "hostName": "Test Host"
  }')

MEETING_CODE=$(echo $MEETING_RESPONSE | grep -o '"meetingCode":"[^"]*"' | cut -d'"' -f4)

if [ -z "$MEETING_CODE" ]; then
  echo "❌ Failed to create meeting"
  echo "Response: $MEETING_RESPONSE"
  exit 1
fi

echo "✅ Meeting created: $MEETING_CODE"
echo ""

# Now test joining
echo "2. Testing join endpoint..."
JOIN_RESPONSE=$(curl -s -X POST "http://localhost:4000/api/rooms/$MEETING_CODE/join" \
  -H "Content-Type: application/json" \
  -d '{
    "identity": "test-user-123",
    "name": "Test User"
  }')

echo "$JOIN_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$JOIN_RESPONSE"
echo ""

# Check if token was returned
if echo "$JOIN_RESPONSE" | grep -q "token"; then
  echo "✅ Token generated successfully!"
  
  # Extract token
  TOKEN=$(echo $JOIN_RESPONSE | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
  
  echo ""
  echo "3. Token details:"
  echo "   Length: ${#TOKEN}"
  echo "   First 50 chars: ${TOKEN:0:50}..."
  
  # Decode JWT payload (base64)
  PAYLOAD=$(echo $TOKEN | cut -d'.' -f2)
  # Add padding if needed
  PADDING=$((4 - ${#PAYLOAD} % 4))
  if [ $PADDING -ne 4 ]; then
    PAYLOAD="${PAYLOAD}$(printf '=%.0s' $(seq 1 $PADDING))"
  fi
  
  echo ""
  echo "4. Token payload:"
  echo "$PAYLOAD" | base64 -d 2>/dev/null | python3 -m json.tool 2>/dev/null || echo "Could not decode"
  
else
  echo "❌ No token in response"
  echo "Error: $JOIN_RESPONSE"
  exit 1
fi

echo ""
echo "🎉 Test complete!"
echo ""
echo "Now try joining the meeting in browser:"
echo "http://localhost:3000/room/$MEETING_CODE"
