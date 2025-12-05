@echo off
echo 🔄 Video Mode Switcher
echo =====================
echo.
echo Current modes:
echo 1. P2P Mode (SimplePeer) - Max 10 participants
echo 2. SFU Mode (LiveKit) - Max 100+ participants
echo.
echo Which mode do you want to use?
echo [1] P2P Mode
echo [2] SFU Mode
echo.
set /p choice="Enter choice (1 or 2): "

cd frontend\app\room\[id]

if "%choice%"=="1" (
    echo.
    echo Switching to P2P Mode...
    if exist page-sfu.tsx (
        ren page.tsx page-temp.tsx 2>nul
        ren page-sfu.tsx page.tsx 2>nul
        ren page-temp.tsx page-sfu.tsx 2>nul
    )
    if exist page-p2p-backup.tsx (
        ren page.tsx page-sfu.tsx 2>nul
        ren page-p2p-backup.tsx page.tsx 2>nul
    )
    echo ✅ Switched to P2P Mode
    echo.
    echo To use P2P mode:
    echo 1. Start backend: cd backend ^&^& npm run dev
    echo 2. Start frontend: cd frontend ^&^& npm run dev
    echo 3. Open: http://localhost:3000/room/test-room
) else if "%choice%"=="2" (
    echo.
    echo Switching to SFU Mode...
    if exist page-p2p-backup.tsx (
        ren page.tsx page-temp.tsx 2>nul
        ren page-p2p-backup.tsx page.tsx 2>nul
        ren page-temp.tsx page-p2p-backup.tsx 2>nul
    )
    if exist page-sfu.tsx (
        ren page.tsx page-p2p-backup.tsx 2>nul
        ren page-sfu.tsx page.tsx 2>nul
    )
    echo ✅ Switched to SFU Mode
    echo.
    echo To use SFU mode:
    echo 1. Start LiveKit: livekit-server --config livekit-dev.yaml
    echo 2. Start backend: cd backend ^&^& npm run dev
    echo 3. Start frontend: cd frontend ^&^& npm run dev
    echo 4. Open: http://localhost:3000/room/test-room
) else (
    echo Invalid choice!
)

cd ..\..\..\..
echo.
pause
