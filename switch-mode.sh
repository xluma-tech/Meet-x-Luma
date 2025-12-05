#!/bin/bash

echo "🔄 Video Mode Switcher"
echo "====================="
echo ""
echo "Current modes:"
echo "1. P2P Mode (SimplePeer) - Max 10 participants"
echo "2. SFU Mode (LiveKit) - Max 100+ participants"
echo ""
echo "Which mode do you want to use?"
echo "[1] P2P Mode"
echo "[2] SFU Mode"
echo ""
read -p "Enter choice (1 or 2): " choice

cd frontend/app/room/\[id\]

if [ "$choice" == "1" ]; then
    echo ""
    echo "Switching to P2P Mode..."
    if [ -f "page-sfu.tsx" ]; then
        mv page.tsx page-temp.tsx 2>/dev/null
        mv page-sfu.tsx page.tsx 2>/dev/null
        mv page-temp.tsx page-sfu.tsx 2>/dev/null
    fi
    if [ -f "page-p2p-backup.tsx" ]; then
        mv page.tsx page-sfu.tsx 2>/dev/null
        mv page-p2p-backup.tsx page.tsx 2>/dev/null
    fi
    echo "✅ Switched to P2P Mode"
    echo ""
    echo "To use P2P mode:"
    echo "1. Start backend: cd backend && npm run dev"
    echo "2. Start frontend: cd frontend && npm run dev"
    echo "3. Open: http://localhost:3000/room/test-room"
elif [ "$choice" == "2" ]; then
    echo ""
    echo "Switching to SFU Mode..."
    if [ -f "page-p2p-backup.tsx" ]; then
        mv page.tsx page-temp.tsx 2>/dev/null
        mv page-p2p-backup.tsx page.tsx 2>/dev/null
        mv page-temp.tsx page-p2p-backup.tsx 2>/dev/null
    fi
    if [ -f "page-sfu.tsx" ]; then
        mv page.tsx page-p2p-backup.tsx 2>/dev/null
        mv page-sfu.tsx page.tsx 2>/dev/null
    fi
    echo "✅ Switched to SFU Mode"
    echo ""
    echo "To use SFU mode:"
    echo "1. Start LiveKit: livekit-server --config livekit-dev.yaml"
    echo "2. Start backend: cd backend && npm run dev"
    echo "3. Start frontend: cd frontend && npm run dev"
    echo "4. Open: http://localhost:3000/room/test-room"
else
    echo "Invalid choice!"
fi

cd ../../../..
echo ""
