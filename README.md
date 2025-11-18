# Luma Meet - Video Conferencing Platform

A modern, production-ready video conferencing application with separate backend and frontend.

## 🏗️ Project Structure

```
luma-meet/
├── backend/              # Node.js Backend (Port 4000)
│   ├── src/
│   │   └── server.js    # Socket.IO + REST API
│   ├── data/            # JSON data storage
│   │   └── events.json
│   ├── package.json
│   └── .env.example
│
├── frontend/            # Next.js Frontend (Port 3000)
│   ├── app/
│   │   ├── api/        # API routes (proxy to backend)
│   │   ├── create/     # Create event page
│   │   ├── event/      # Event pages
│   │   ├── room/       # Video room
│   │   └── ...
│   ├── public/         # Static assets
│   ├── package.json
│   └── .env.example
│
├── README.md           # Main documentation
├── QUICKSTART.md       # Quick start guide
├── API.md              # API documentation
├── DEPLOYMENT.md       # Deployment guide
└── start-dev.bat       # Dev startup (Windows)
```

**Only 2 main folders: `backend/` and `frontend/`** ✨

## ✨ Features

- 🎥 Real-time video conferencing with WebRTC
- 💬 Text chat (public and private)
- 🖥️ Screen sharing with audio
- 📱 Mobile responsive design
- 🪟 Floating window for multitasking
- 👥 Multiple participants support
- 🔍 Searchable user list
- 🎨 Modern UI with Tailwind CSS

## 🚀 Quick Start

See [QUICKSTART.md](./QUICKSTART.md) for detailed setup instructions.

### 1. Setup Backend

```bash
cd backend
npm install
copy .env.example .env
npm run dev
```

### 3. Setup Frontend

```bash
cd frontend
npm install
copy .env.example .env
npm run dev
```

### 4. Access Application

- Frontend: http://localhost:3000
- Backend API: http://localhost:4000

## 🔧 Configuration

### Backend (.env)
```env
PORT=4000
HOST=0.0.0.0
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
```

### Frontend (.env)
```env
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_SOCKET_URL=http://localhost:4000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 📦 Technology Stack

### Backend
- Node.js + Express
- Socket.IO (WebSocket)
- JSON file storage
- CORS enabled

### Frontend
- Next.js 16
- React 19
- TypeScript
- Tailwind CSS
- Socket.IO Client
- Simple Peer (WebRTC)

## 🌐 Production Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for:
- PM2 deployment
- Docker setup
- Cloud deployment (Vercel, Railway, Heroku)
- Security configuration

## 🛠️ Development

### Start Both Servers (Windows)
```bash
start-dev.bat
```

### Manual Start
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

## 📚 API Endpoints

### Frontend API Routes (Proxy to Backend)
All available at `http://localhost:3000/api/*`:
- `GET /api/health` - Health check (frontend + backend)
- `GET /api/events` - Get all events
- `GET /api/events/:id` - Get event by ID
- `POST /api/events` - Create event
- `PUT /api/events/:id` - Update event
- `DELETE /api/events/:id` - Delete event
- `GET /api/rooms/:roomId` - Get room info

### Backend Direct API
Available at `http://localhost:4000/api/*`:
- Same endpoints as above
- `GET /health` - Backend health check

### Socket.IO Events
See [backend/README.md](./backend/README.md) for details



## 🐛 Troubleshooting

**Backend won't start**
- Check if port 4000 is in use
- Verify Node.js version (>=18.0.0)

**Frontend can't connect**
- Ensure backend is running
- Check NEXT_PUBLIC_SOCKET_URL in .env

**WebRTC issues**
- Use HTTPS in production
- Check firewall settings

## 📄 License

MIT License

---

Built with ❤️ for seamless video communication
