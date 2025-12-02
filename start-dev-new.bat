@echo off
echo ========================================
echo Starting Luma Meet Development Servers
echo ========================================
echo.

REM Check if MongoDB is running
echo Checking MongoDB...
mongosh --eval "db.version()" > nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] MongoDB is not running!
    echo Please start MongoDB first.
    echo.
    pause
    exit /b 1
)
echo [OK] MongoDB is running
echo.

REM Start Backend
echo Starting Backend Server...
start "Luma Meet Backend" cmd /k "cd backend && npm start"
timeout /t 3 > nul

REM Start Frontend
echo Starting Frontend Server...
start "Luma Meet Frontend" cmd /k "cd frontend && npm run dev"
timeout /t 3 > nul

echo.
echo ========================================
echo Servers Started Successfully!
echo ========================================
echo.
echo Backend:  http://localhost:4000
echo Frontend: http://localhost:3000
echo.
echo Press any key to stop all servers...
pause > nul

REM Stop servers
taskkill /FI "WindowTitle eq Luma Meet Backend*" /T /F > nul 2>&1
taskkill /FI "WindowTitle eq Luma Meet Frontend*" /T /F > nul 2>&1

echo.
echo Servers stopped.
pause
