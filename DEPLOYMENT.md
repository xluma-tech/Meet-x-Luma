# Luma Meet - Deployment Guide

## 🏗️ Architecture

This application is split into two parts:
- **Backend**: Node.js + Express + Socket.IO (Port 4000)
- **Frontend**: Next.js React Application (Port 3000)

## 📋 Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- PM2 (for production) - `npm install -g pm2`

## 🚀 Quick Start

### 1. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your configuration
npm start
```

### 2. Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env
# Edit .env with your backend URL
npm run build
npm start
```

## 🔧 Configuration

### Backend (.env)
```env
PORT=4000
HOST=0.0.0.0
NODE_ENV=production
CORS_ORIGIN=https://yourdomain.com
```

### Frontend (.env)
```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_SOCKET_URL=https://api.yourdomain.com
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

## 🌐 Production Deployment

### Option 1: Using PM2 (Recommended)

#### Backend
```bash
cd backend
pm2 start src/server.js --name luma-meet-backend
pm2 save
pm2 startup
```

#### Frontend
```bash
cd frontend
npm run build
pm2 start npm --name luma-meet-frontend -- start
pm2 save
```

### Option 2: Using Docker

#### Backend Dockerfile
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 4000
CMD ["node", "src/server.js"]
```

#### Frontend Dockerfile
```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package*.json ./
RUN npm ci --only=production
EXPOSE 3000
CMD ["npm", "start"]
```

#### Docker Compose
```yaml
version: '3.8'
services:
  backend:
    build: ./backend
    ports:
      - "4000:4000"
    environment:
      - NODE_ENV=production
      - PORT=4000
      - CORS_ORIGIN=http://localhost:3000
    restart: unless-stopped

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://backend:4000
      - NEXT_PUBLIC_SOCKET_URL=http://backend:4000
    depends_on:
      - backend
    restart: unless-stopped
```

### Option 3: Cloud Platforms

#### Vercel (Frontend)
1. Connect your GitHub repository
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push

#### Railway/Render (Backend)
1. Connect your GitHub repository
2. Set environment variables
3. Deploy automatically on push

#### Heroku
```bash
# Backend
cd backend
heroku create luma-meet-backend
git push heroku main

# Frontend
cd frontend
heroku create luma-meet-frontend
git push heroku main
```

## 🔒 Security Checklist

- [ ] Set strong CORS_ORIGIN (not *)
- [ ] Use HTTPS in production
- [ ] Set secure environment variables
- [ ] Enable rate limiting
- [ ] Use firewall rules
- [ ] Regular security updates

## 📊 Monitoring

### PM2 Monitoring
```bash
pm2 monit
pm2 logs luma-meet-backend
pm2 logs luma-meet-frontend
```

### Health Checks
- Backend: `http://your-backend:4000/health`
- Frontend: `http://your-frontend:3000`

## 🔄 Updates

```bash
# Backend
cd backend
git pull
npm install
pm2 restart luma-meet-backend

# Frontend
cd frontend
git pull
npm install
npm run build
pm2 restart luma-meet-frontend
```

## 🐛 Troubleshooting

### Backend not connecting
- Check if port 4000 is open
- Verify CORS_ORIGIN matches frontend URL
- Check firewall rules

### Frontend can't connect to backend
- Verify NEXT_PUBLIC_SOCKET_URL is correct
- Check network connectivity
- Verify backend is running

### WebRTC connection issues
- Ensure HTTPS is used in production
- Check STUN/TURN server configuration
- Verify firewall allows WebRTC ports

## 📝 Environment Variables Reference

### Backend
| Variable | Description | Default |
|----------|-------------|---------|
| PORT | Server port | 4000 |
| HOST | Server host | 0.0.0.0 |
| NODE_ENV | Environment | development |
| CORS_ORIGIN | Allowed origins | * |

### Frontend
| Variable | Description | Default |
|----------|-------------|---------|
| NEXT_PUBLIC_API_URL | Backend API URL | http://localhost:4000 |
| NEXT_PUBLIC_SOCKET_URL | Socket.IO URL | http://localhost:4000 |
| NEXT_PUBLIC_APP_URL | Frontend URL | http://localhost:3000 |

## 🎯 Performance Tips

1. Use CDN for static assets
2. Enable gzip compression
3. Use Redis for session storage (optional)
4. Implement rate limiting
5. Use load balancer for scaling
6. Monitor with tools like New Relic or DataDog

## 📞 Support

For issues and questions, please open an issue on GitHub.
