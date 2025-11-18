# Quick Start Guide

## 📁 Clean Structure

```
luma-meet/
├── backend/          # Node.js Backend
├── frontend/         # Next.js Frontend
├── README.md
├── API.md
├── DEPLOYMENT.md
└── start-dev.bat
```

## 🚀 Setup (5 Minutes)

### 1. Install Backend Dependencies

```bash
cd backend
npm install
```

### 2. Install Frontend Dependencies

```bash
cd frontend
npm install
```

### 3. Configure Environment

**Backend** (`backend/.env`):
```bash
cd backend
copy .env.example .env
```

Edit `.env`:
```env
PORT=4000
CORS_ORIGIN=http://localhost:3000
```

**Frontend** (`frontend/.env`):
```bash
cd frontend
copy .env.example .env
```

Edit `.env`:
```env
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_SOCKET_URL=http://localhost:4000
```

### 4. Start Development

**Option 1: Use Helper Script (Windows)**
```bash
start-dev.bat
```

**Option 2: Manual Start**

Terminal 1 - Backend:
```bash
cd backend
npm run dev
```

Terminal 2 - Frontend:
```bash
cd frontend
npm run dev
```

### 5. Access Application

- Frontend: http://localhost:3000
- Backend API: http://localhost:4000
- Health Check: http://localhost:3000/api/health

## ✅ Verify Installation

1. Open http://localhost:3000
2. Create a new event
3. Join a video room
4. Test video/audio

## 📚 Next Steps

- Read [API.md](./API.md) for API documentation
- Read [DEPLOYMENT.md](./DEPLOYMENT.md) for production deployment
- Read [README.md](./README.md) for full documentation

## 🐛 Troubleshooting

**Port already in use:**
```bash
# Windows
netstat -ano | findstr :3000
netstat -ano | findstr :4000
taskkill /F /PID <PID>
```

**Backend won't start:**
- Check Node.js version (>=18.0.0)
- Verify .env configuration
- Check if port 4000 is available

**Frontend won't connect:**
- Ensure backend is running
- Check NEXT_PUBLIC_SOCKET_URL in .env
- Verify CORS_ORIGIN in backend .env

## 🎯 Production Build

**Backend:**
```bash
cd backend
npm start
```

**Frontend:**
```bash
cd frontend
npm run build
npm start
```

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed production deployment instructions.
