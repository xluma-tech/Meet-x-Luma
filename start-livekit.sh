#!/bin/bash

echo "🚀 Starting LiveKit Server with correct credentials..."
echo ""
echo "API Key: devkey"
echo "API Secret: secret"
echo "URL: ws://localhost:7880"
echo ""

docker run --rm \
  -p 7880:7880 \
  -p 7881:7881 \
  -p 7882:7882/udp \
  -e LIVEKIT_KEYS="devkey: secret" \
  livekit/livekit-server \
  --dev

# Alternative: If you want to use a config file instead
# Create livekit.yaml with:
# keys:
#   devkey: secret
# 
# Then run:
# docker run --rm \
#   -p 7880:7880 \
#   -p 7881:7881 \
#   -p 7882:7882/udp \
#   -v $(pwd)/livekit.yaml:/livekit.yaml \
#   livekit/livekit-server \
#   --config /livekit.yaml
