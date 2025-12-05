#!/bin/bash

echo "🚀 Setting up SFU Architecture (LiveKit)"
echo "========================================"
echo ""

# Check if LiveKit is installed
if ! command -v livekit-server &> /dev/null; then
    echo "📦 Installing LiveKit Server..."
    curl -sSL https://get.livekit.io | bash
    echo "✅ LiveKit Server installed"
else
    echo "✅ LiveKit Server already installed"
fi

# Create LiveKit config
echo ""
echo "📝 Creating LiveKit configuration..."
cat > livekit-dev.yaml << EOF
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
EOF
echo "✅ LiveKit config created: livekit-dev.yaml"

# Install backend dependencies
echo ""
echo "📦 Installing backend dependencies..."
cd backend
npm install
echo "✅ Backend dependencies installed"

# Install frontend dependencies
echo ""
echo "📦 Installing frontend dependencies..."
cd ../frontend
npm install
echo "✅ Frontend dependencies installed"

cd ..

echo ""
echo "✅ Setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Start LiveKit server:"
echo "   livekit-server --config livekit-dev.yaml"
echo ""
echo "2. Start backend (in new terminal):"
echo "   cd backend && npm run dev"
echo ""
echo "3. Start frontend (in new terminal):"
echo "   cd frontend && npm run dev"
echo ""
echo "4. Open http://localhost:3000/room/test-room in 2 browser tabs"
echo ""
echo "🎉 Enjoy your SFU-based video conferencing!"
