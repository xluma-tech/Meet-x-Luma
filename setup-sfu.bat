@echo off
echo 🚀 Setting up SFU Architecture (LiveKit)
echo ========================================
echo.

REM Check if LiveKit is installed
where livekit-server >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo 📦 Installing LiveKit Server...
    echo Please download LiveKit from: https://github.com/livekit/livekit/releases
    echo After downloading, add it to your PATH
    pause
) else (
    echo ✅ LiveKit Server already installed
)

REM Create LiveKit config
echo.
echo 📝 Creating LiveKit configuration...
(
echo port: 7880
echo bind_addresses:
echo   - "0.0.0.0"
echo.
echo rtc:
echo   port_range_start: 7882
echo   port_range_end: 7892
echo   use_external_ip: false
echo   tcp_port: 7881
echo.
echo keys:
echo   devkey: secret
echo.
echo logging:
echo   level: info
echo.
echo room:
echo   max_participants: 100
echo   empty_timeout: 300
) > livekit-dev.yaml
echo ✅ LiveKit config created: livekit-dev.yaml

REM Install backend dependencies
echo.
echo 📦 Installing backend dependencies...
cd backend
call npm install
echo ✅ Backend dependencies installed

REM Install frontend dependencies
echo.
echo 📦 Installing frontend dependencies...
cd ..\frontend
call npm install
echo ✅ Frontend dependencies installed

cd ..

echo.
echo ✅ Setup complete!
echo.
echo 📋 Next steps:
echo 1. Start LiveKit server (in new terminal):
echo    livekit-server --config livekit-dev.yaml
echo.
echo 2. Start backend (in new terminal):
echo    cd backend ^&^& npm run dev
echo.
echo 3. Start frontend (in new terminal):
echo    cd frontend ^&^& npm run dev
echo.
echo 4. Open http://localhost:3000/room/test-room in 2 browser tabs
echo.
echo 🎉 Enjoy your SFU-based video conferencing!
pause
