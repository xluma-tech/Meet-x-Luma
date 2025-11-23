# Meet-x-Luma

## 🚀 Major Architecture Update: P2P → Production SFU

**A complete production-grade SFU architecture has been designed and delivered!**

### What's New?
This repository now includes a **complete blueprint** for migrating from P2P mesh to a globally distributed SFU-based platform capable of supporting **10,000+ concurrent users**.

📁 **All architecture files are in**: [`infrastructure/`](./infrastructure/)

### Quick Links
- 🎯 **[Start Here: Migration Summary](./MIGRATION_SUMMARY.md)** - What's been delivered
- ⚡ **[Quick Start Guide](./infrastructure/QUICK_START.md)** - Deploy in 15 minutes
- 📚 **[Complete Index](./infrastructure/INDEX.md)** - Navigate all documentation
- 🏗️ **[Detailed Architecture](./infrastructure/docs/architecture-detailed.md)** - 50+ page technical design
- 📋 **[Implementation Guide](./infrastructure/IMPLEMENTATION_GUIDE.md)** - 8-week rollout plan
- 💰 **[Cost Model](./infrastructure/docs/cost-model.csv)** - Detailed breakdown

### What's Included?
- ✅ Complete architecture documentation (100+ pages)
- ✅ Infrastructure as Code (Terraform + Kubernetes)
- ✅ Automated deployment scripts
- ✅ Load testing framework
- ✅ Cost model ($38K/month for 10K users)
- ✅ Operational runbooks
- ✅ 8-week implementation plan

### Key Metrics
- **Capacity**: 10,000 concurrent users (scales to 100K+)
- **Cost**: $3.80/user/month (87% cheaper than Twilio)
- **Latency**: <200ms within region
- **Availability**: 99.9% SLA
- **ROI**: $2.7M annual savings vs managed services

### Architecture Comparison

#### Current (P2P Mesh)
```
Client A ←→ Client B ←→ Client C
   ↓  ×  ↓  ×  ↓
Doesn't scale beyond 6-10 users
```

#### New (SFU)
```
Clients → SFU Server → Clients
Scales to 100+ users per SFU
Global distribution across 5 regions
```

### Quick Start
```bash
# Deploy dev environment (10 minutes)
cd infrastructure
./scripts/deploy.sh dev us-east-1

# Run load test
cd load-tests
./run-full-test.sh
```

### Implementation Timeline
- **Week 1-2**: Infrastructure setup
- **Week 3-4**: Media plane (SFU, TURN)
- **Week 5-6**: Client migration
- **Week 7-8**: Production rollout

### Cost Breakdown
| Component | Monthly Cost |
|-----------|--------------|
| Compute | $9,060 |
| Data Transfer | $45,000 |
| Storage | $250 |
| Database | $395 |
| Other | $1,705 |
| **Total** | **$56,410** |
| **Optimized** | **$37,960** |

**Per User**: $3.80/month

---

# Original P2P Version

## Overview
Beautiful video meetings powered by WebRTC. No downloads, no API keys, just pure peer-to-peer connections.

## Features
- 🎥 HD Video & Audio
- 🖥️ Screen Sharing
- 💬 Real-time Chat
- 👥 10+ Participants
- 🔒 Secure P2P Connections
- 📱 Mobile Ready

## Tech Stack
- **Frontend**: Next.js 14, React, TypeScript, TailwindCSS
- **Backend**: Node.js, Express, Socket.IO
- **WebRTC**: SimplePeer
- **Deployment**: Vercel (Frontend), Render (Backend)

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/Meet-x-Luma.git
cd Meet-x-Luma
```

2. Install dependencies
```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

3. Configure environment variables
```bash
# Backend (.env)
PORT=4000
CORS_ORIGIN=http://localhost:3000

# Frontend (.env.local)
NEXT_PUBLIC_SOCKET_URL=http://localhost:4000
```

4. Run development servers
```bash
# Backend (Terminal 1)
cd backend
npm run dev

# Frontend (Terminal 2)
cd frontend
npm run dev
```

5. Open http://localhost:3000

## Project Structure
```
Meet-x-Luma/
├── frontend/           # Next.js frontend
│   ├── app/           # App router pages
│   ├── config/        # Configuration
│   └── public/        # Static assets
├── backend/           # Node.js backend
│   ├── src/          # Source code
│   └── data/         # Data storage
└── infrastructure/    # 🆕 Production SFU architecture
    ├── docs/         # Architecture documentation
    ├── terraform/    # Infrastructure as Code
    ├── kubernetes/   # Helm charts
    ├── scripts/      # Automation scripts
    └── load-tests/   # Load testing framework
```

## Deployment

### Current P2P Version
- **Frontend**: Vercel
- **Backend**: Render
- **Cost**: ~$0-20/month

### New SFU Version (Production)
See [`infrastructure/`](./infrastructure/) for complete deployment guide.

## Migration Path

### Option 1: Keep P2P (Current)
- ✅ Simple, low cost
- ✅ Works for small meetings (<10 users)
- ❌ Doesn't scale
- ❌ No server-side control

### Option 2: Migrate to SFU (Recommended)
- ✅ Scales to 10,000+ users
- ✅ Server-side quality control
- ✅ Recording capabilities
- ✅ 87% cheaper than managed services
- ⚠️ Requires 8 weeks implementation
- ⚠️ Higher operational complexity

**Decision Guide**: See [MIGRATION_SUMMARY.md](./MIGRATION_SUMMARY.md)

## Contributing
Contributions are welcome! Please read our contributing guidelines.

## License
MIT License - see LICENSE file for details

## Support
- **Documentation**: [infrastructure/INDEX.md](./infrastructure/INDEX.md)
- **Issues**: GitHub Issues
- **Discussions**: GitHub Discussions

## Acknowledgments
- LiveKit for SFU architecture inspiration
- SimplePeer for WebRTC abstraction
- Next.js team for amazing framework

---

**Ready to scale?** → Start with [MIGRATION_SUMMARY.md](./MIGRATION_SUMMARY.md)
