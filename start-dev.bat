@echo off
echo Starting Luma Meet Development Environment...
echo.

echo Starting Backend Server...
start "Backend" cmd /k "cd backend && npm run dev"

timeout /t 3 /nobreak >nul

echo Starting Frontend Server...
start "Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo ✓ Backend running on http://localhost:4000
echo ✓ Frontend running on http://localhost:3000
echo.
echo Press any key to stop all servers...
pause >nul

taskkill /FI "WindowTitle eq Backend*" /T /F
taskkill /FI "WindowTitle eq Frontend*" /T /F
