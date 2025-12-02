# Luma Meet - Real-Time Video Conferencing Platform

## 📚 Documentation

This repository contains comprehensive documentation for the Luma Meet platform:

### 1. [Technical Documentation](./TECHNICAL_DOCUMENTATION.md)
Complete technical reference covering:
- System architecture and components
- Technology stack details
- API reference and endpoints
- Implementation details
- Deployment instructions
- Performance optimizations
- Troubleshooting guides

### 2. [High-Level Design (HLD)](./HIGH_LEVEL_DESIGN.md)
Architectural overview including:
- System architecture diagrams
- Component design
- Data flow diagrams
- Technology decisions and rationale
- Scalability strategy
- Security architecture
- Future roadmap

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm 9+

### Backend Setup
```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

### Frontend Setup
```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

## 🏗️ Project Structure

```
.
├── backend/                 # Node.js backend server
│   ├── src/
│   │   └── server.js       # Main server file
│   ├── data/               # JSON storage & models
│   └── package.json
│
├── frontend/               # Next.js frontend application
│   ├── app/
│   │   ├── page.tsx       # Landing page
│   │   ├── create/        # Event creation
│   │   ├── event/[id]/    # Event details
│   │   └── room/[id]/     # Video room
│   └── package.json
│
├── infrastructure/         # Deployment & infrastructure
│   ├── terraform/         # Infrastructure as code
│   ├── kubernetes/        # K8s manifests
│   └── docs/             # Infrastructure docs
│
├── TECHNICAL_DOCUMENTATION.md  # Complete technical reference
├── HIGH_LEVEL_DESIGN.md       # Architecture & design
└── README.md                  # This file
```

## ✨ Key Features

- **Zero-Download Meetings**: Browser-based, no installation required
- **WebRTC P2P**: Low-latency peer-to-peer video/audio
- **Screen Sharing**: Share screen with system audio
- **Real-Time Chat**: Public and private messaging
- **3D Model Viewer**: Collaborative 3D model visualization
- **Hand Gestures**: Control 3D models with hand gestures
- **Picture-in-Picture**: Continue viewing when tab is minimized
- **Active Speaker Detection**: Visual feedback for who's speaking
- **Cross-Platform**: Desktop, mobile, and tablet support

## 🛠️ Technology Stack

### Frontend
- **Framework**: Next.js 16 (React 19)
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4
- **WebRTC**: SimplePeer 9.11.1
- **Real-time**: Socket.IO Client 4.8.1
- **3D Rendering**: Three.js 0.181.2, React Three Fiber
- **Hand Tracking**: MediaPipe Hands

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js 4.18.2
- **Real-time**: Socket.IO 4.6.1
- **File Upload**: Multer 2.0.2
- **Storage**: JSON files (upgradeable to PostgreSQL)

## 📊 Architecture Overview

```
┌─────────────┐
│   Browser   │ ← Users
└──────┬──────┘
       │
┌──────▼──────┐
│  Next.js    │ ← Frontend (Vercel)
│  Frontend   │
└──────┬──────┘
       │
       ├─── WebRTC P2P ───┐
       │                  │
┌──────▼──────┐    ┌──────▼──────┐
│  Socket.IO  │    │    STUN     │
│  Signaling  │    │   Servers   │
└──────┬──────┘    └─────────────┘
       │
┌──────▼──────┐
│   Node.js   │ ← Backend (Render)
│   Backend   │
└──────┬──────┘
       │
┌──────▼──────┐
│   Storage   │ ← JSON Files + File System
└─────────────┘
```

## 🔧 Configuration

### Backend Environment Variables
```bash
PORT=4000
HOST=0.0.0.0
NODE_ENV=production
CORS_ORIGIN=https://your-frontend.vercel.app
```

### Frontend Environment Variables
```bash
NEXT_PUBLIC_API_URL=https://your-backend.render.com
NEXT_PUBLIC_SOCKET_URL=https://your-backend.render.com
```

## 📈 Performance

- **Room Join Time**: <5 seconds
- **Video Latency**: <200ms
- **Concurrent Rooms**: 100+ (current), 1000+ (planned)
- **Participants per Room**: 10+ (P2P), 100+ (with SFU)

## 🔒 Security

- WebRTC encryption (DTLS-SRTP)
- HTTPS/WSS in production
- CORS protection
- File type validation
- Input sanitization
- No persistent user data

## 🚢 Deployment

### Current (MVP)
- **Frontend**: Vercel
- **Backend**: Render.com
- **Storage**: Local filesystem

### Future (Production)
- **Frontend**: CloudFlare CDN
- **Backend**: Kubernetes (EKS/GKE)
- **SFU**: LiveKit
- **Database**: PostgreSQL
- **Storage**: S3
- **Monitoring**: Prometheus + Grafana

## 📝 API Endpoints

### Events
- `GET /api/events` - List all events
- `GET /api/events/:id` - Get event details
- `POST /api/events` - Create event
- `PUT /api/events/:id` - Update event
- `DELETE /api/events/:id` - Delete event

### Rooms
- `GET /api/rooms/:roomId` - Get room status

### 3D Models
- `POST /api/models/upload` - Upload model
- `GET /api/models/:modelId` - Download model
- `GET /api/rooms/:roomId/model` - Get room model

### Health
- `GET /health` - Server health check

## 🧪 Testing

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test

# E2E tests
npm run test:e2e

# Load tests
npm run test:load
```

## 📖 Documentation Links

- [Technical Documentation](./TECHNICAL_DOCUMENTATION.md) - Complete technical reference
- [High-Level Design](./HIGH_LEVEL_DESIGN.md) - Architecture and design decisions
- [Infrastructure Guide](./infrastructure/README.md) - Deployment and scaling

## 🗺️ Roadmap

### Phase 1: Current (MVP)
- ✅ WebRTC P2P video/audio
- ✅ Screen sharing
- ✅ Real-time chat
- ✅ 3D model viewer
- ✅ Hand gesture control

### Phase 2: Q1-Q2 2026
- [ ] Recording and playback
- [ ] Virtual backgrounds
- [ ] Migrate to LiveKit SFU
- [ ] Multi-region deployment
- [ ] PostgreSQL database

### Phase 3: Q3-Q4 2026
- [ ] User authentication
- [ ] Room passwords
- [ ] Admin dashboard
- [ ] Real-time transcription
- [ ] Mobile apps

## 🤝 Contributing

1. Read the [Technical Documentation](./TECHNICAL_DOCUMENTATION.md)
2. Review the [High-Level Design](./HIGH_LEVEL_DESIGN.md)
3. Fork the repository
4. Create a feature branch
5. Submit a pull request

## 📄 License

MIT License - See LICENSE file for details

## 📧 Support

- **Documentation**: See TECHNICAL_DOCUMENTATION.md
- **Issues**: GitHub Issues
- **Email**: support@lumameet.com

---

**Built with ❤️ using Next.js, WebRTC, and Three.js**
