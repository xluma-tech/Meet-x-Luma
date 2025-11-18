# Project Structure Guide

## 📂 Final Clean Structure

```
luma-meet/
│
├── backend/                    # Backend Server
│   ├── src/
│   │   └── server.js          # Express + Socket.IO + API
│   ├── data/                  # Data Storage
│   │   └── events.json        # Events data
│   ├── package.json
│   ├── .env.example
│   ├── .gitignore
│   └── README.md
│
├── frontend/                   # Frontend Application
│   ├── app/                   # Next.js pages
│   │   ├── api/              # API routes (proxy to backend)
│   │   │   ├── events/
│   │   │   │   ├── route.ts
│   │   │   │   └── [id]/route.ts
│   │   │   ├── rooms/
│   │   │   │   └── [roomId]/route.ts
│   │   │   └── health/
│   │   │       └── route.ts
│   │   ├── create/           # Create event page
│   │   ├── event/            # Event pages
│   │   ├── room/             # Video room
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   ├── public/               # Static assets
│   ├── package.json
│   ├── next.config.ts
│   ├── tsconfig.json
│   ├── .env.example
│   ├── .gitignore
│   └── README.md
│
├── .gitignore                 # Root gitignore
├── README.md                  # Main documentation
├── DEPLOYMENT.md              # Deployment guide
├── migrate.js                 # Migration helper
└── start-dev.bat             # Dev startup script
```

## 🔄 Data Flow

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Browser   │ ◄─────► │   Frontend   │ ◄─────► │   Backend   │
│  (Client)   │         │  (Next.js)   │         │  (Node.js)  │
└─────────────┘         └──────────────┘         └─────────────┘
                              │                         │
                              │                         │
                        HTTP/WebSocket              Socket.IO
                              │                         │
                              │                         ▼
                              │                   ┌──────────┐
                              │                   │   Data   │
                              │                   │  (JSON)  │
                              │                   └──────────┘
                              │
                              ▼
                        ┌──────────┐
                        │  Static  │
                        │  Assets  │
                        └──────────┘
```

## 🎯 Responsibilities

### Backend (Port 4000)
- ✅ Socket.IO WebSocket server
- ✅ REST API endpoints
- ✅ Data storage (JSON files)
- ✅ Room management
- ✅ User connection handling

### Frontend (Port 3000)
- ✅ Next.js application
- ✅ React components
- ✅ WebRTC video/audio
- ✅ UI/UX
- ✅ Static assets
- ✅ API routes (proxy to backend)

## 🚀 Development Workflow

1. **Start Backend**
   ```bash
   cd backend
   npm run dev
   ```
   - Runs on http://localhost:4000
   - Auto-reloads on file changes

2. **Start Frontend**
   ```bash
   cd frontend
   npm run dev
   ```
   - Runs on http://localhost:3000
   - Hot module replacement

3. **Or Use Helper Script**
   ```bash
   start-dev.bat
   ```
   - Starts both servers automatically

## 📦 Dependencies

### Backend
- express - Web framework
- socket.io - WebSocket server
- cors - CORS middleware
- dotenv - Environment variables

### Frontend
- next - React framework
- react - UI library
- socket.io-client - WebSocket client
- simple-peer - WebRTC wrapper
- tailwindcss - CSS framework

## 🔐 Environment Variables

### Backend (.env)
```env
PORT=4000                              # Server port
HOST=0.0.0.0                          # Server host
NODE_ENV=development                   # Environment
CORS_ORIGIN=http://localhost:3000     # Allowed origin
```

### Frontend (.env)
```env
NEXT_PUBLIC_API_URL=http://localhost:4000        # Backend API
NEXT_PUBLIC_SOCKET_URL=http://localhost:4000     # Socket.IO
NEXT_PUBLIC_APP_URL=http://localhost:3000        # Frontend URL
```

## 🧹 Migration Steps

1. Run migration script:
   ```bash
   node migrate.js
   ```

2. Install dependencies:
   ```bash
   cd backend && npm install
   cd frontend && npm install
   ```

3. Configure environment:
   ```bash
   # Backend
   cd backend
   copy .env.example .env

   # Frontend
   cd frontend
   copy .env.example .env
   ```

4. Start development:
   ```bash
   start-dev.bat
   ```

5. Clean up old files:
   ```bash
   rmdir /s /q app
   rmdir /s /q public
   rmdir /s /q data
   rmdir /s /q node_modules
   rmdir /s /q .next
   ```

## ✅ Benefits of This Structure

- ✨ **Clean Separation**: Backend and frontend are completely separate
- 🚀 **Easy Deployment**: Deploy backend and frontend independently
- 📦 **Scalable**: Each part can scale independently
- 🔧 **Maintainable**: Clear responsibilities for each part
- 🎯 **Production Ready**: Follows industry best practices
