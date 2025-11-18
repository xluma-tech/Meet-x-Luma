# Luma Meet Frontend

Next.js application with built-in API routes for video conferencing.

## 📁 Structure

```
frontend/
├── app/
│   ├── api/                    # API Routes (proxy to backend)
│   │   ├── events/
│   │   │   ├── route.ts       # GET, POST /api/events
│   │   │   └── [id]/
│   │   │       └── route.ts   # GET, PUT, DELETE /api/events/:id
│   │   ├── rooms/
│   │   │   └── [roomId]/
│   │   │       └── route.ts   # GET /api/rooms/:roomId
│   │   └── health/
│   │       └── route.ts       # GET /api/health
│   ├── create/                # Create event page
│   ├── event/                 # Event pages
│   ├── room/                  # Video room
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── public/                    # Static assets
├── package.json
├── next.config.ts
├── tsconfig.json
└── .env.example
```

## 🚀 Setup

```bash
npm install
cp .env.example .env
npm run dev
```

## 🔧 Environment Variables

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_SOCKET_URL=http://localhost:4000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 📡 API Routes

All API routes are available at `/api/*` and proxy to the backend:

### Events API
- `GET /api/events` - Get all events
- `POST /api/events` - Create event
- `GET /api/events/:id` - Get event by ID
- `PUT /api/events/:id` - Update event
- `DELETE /api/events/:id` - Delete event

### Rooms API
- `GET /api/rooms/:roomId` - Get room info

### Health Check
- `GET /api/health` - Frontend and backend health status

## 🎨 Features

- ✅ Video conferencing with WebRTC
- ✅ Screen sharing with audio
- ✅ Text chat (public/private)
- ✅ Floating window
- ✅ Mobile responsive
- ✅ User search
- ✅ Built-in API routes

## 🛠️ Development

```bash
npm run dev   # Development server (http://localhost:3000)
npm run build # Production build
npm start     # Production server
npm run lint  # Run ESLint
```

## 📦 Key Dependencies

- **next** - React framework
- **react** - UI library
- **socket.io-client** - WebSocket client
- **simple-peer** - WebRTC wrapper
- **tailwindcss** - CSS framework
- **typescript** - Type safety

## 🔌 Socket.IO Connection

The frontend connects to the backend Socket.IO server using the URL from `NEXT_PUBLIC_SOCKET_URL`.

Example:
```typescript
import { io } from 'socket.io-client';

const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000');
```

## 🎯 API Usage Example

```typescript
// Fetch all events
const response = await fetch('/api/events');
const events = await response.json();

// Create event
const response = await fetch('/api/events', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'My Event', ... })
});

// Get specific event
const response = await fetch('/api/events/123');
const event = await response.json();
```

## 🏗️ Build for Production

```bash
npm run build
npm start
```

The production build will:
- Optimize React components
- Minify JavaScript and CSS
- Generate static pages where possible
- Optimize images

## 🚀 Deployment

### Vercel (Recommended)
1. Push to GitHub
2. Import project in Vercel
3. Set environment variables
4. Deploy automatically

### Other Platforms
- Netlify
- Railway
- AWS Amplify
- Docker

See [DEPLOYMENT.md](../DEPLOYMENT.md) for detailed instructions.
