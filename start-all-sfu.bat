@echo off
echo 🚀 Starting SFU Video Conferencing System
echo ==========================================
echo.

echo Starting LiveKit Server...
start "LiveKit Server" cmd /k "livekit-server --config livekit-dev.yaml"
timeout /t 3 /nobreak >nul

echo Starting Backend Server...
start "Backend Server" cmd /k "cd backend && npm run dev"
timeout /t 3 /nobreak >nul

echo Starting Frontend Server...
start "Frontend Server" cmd /k "cd frontend && npm run dev"

echo.
echo ✅ All services started!
echo.
echo 📋 Services:
echo - LiveKit: ws://localhost:7880
echo - Backend: http://localhost:4000
echo - Frontend: http://localhost:3000
echo.
echo 🎉 Open: http://localhost:3000/room/test-room
echo.
pause
