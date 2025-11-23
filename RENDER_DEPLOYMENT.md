# Quick Render Deployment Guide

## TL;DR - Deploy in 10 Minutes

Yes, you can still deploy to Render for testing! This is a simplified SFU setup perfect for:
- ✅ Testing the SFU concept (vs current P2P)
- ✅ Developing features
- ✅ Small demos (<20 users)
- ✅ Low cost ($14-31/month)

## What's Different?

### Current P2P (What you have now)
```
Client ←→ Client ←→ Client
- Works for 2-10 users
- No server costs
- Doesn't scale
```

### SFU on Render (New option)
```
Clients → LiveKit SFU → Clients
- Works for 2-20 users (testing)
- $14-31/month
- Tests SFU architecture
- Easy to deploy
```

### Full Production (Future)
```
Clients → Global SFU Cluster → Clients
- Works for 10,000+ users
- $38K/month
- Multi-region
- Autoscaling
```

## Quick Deploy Steps

### 1. Install LiveKit SDK in Backend
```bash
cd backend
npm install livekit-server-sdk
cd ..
```

### 2. Commit Changes
```bash
git add .
git commit -m "Add LiveKit SFU support for Render"
git push
```

### 3. Deploy to Render

**Option A: Using render.yaml (Recommended)**
1. Go to https://render.com/dashboard
2. Click "New +" → "Blueprint"
3. Connect your GitHub repo
4. Render will detect `render.yaml`
5. Click "Apply"
6. Wait 5-10 minutes ☕

**Option B: Manual Setup**
1. Create Redis (free tier)
2. Create PostgreSQL (free tier)
3. Create Web Service for LiveKit (Docker)
4. Create Web Service for Backend (Node)
5. Create Static Site for Frontend

### 4. Test It
```bash
# Get your frontend URL from Render dashboard
open https://your-app.onrender.com

# Create a meeting and test with 2-3 people
```

## Cost Comparison

| Deployment | Users | Monthly Cost | Best For |
|------------|-------|--------------|----------|
| **Current P2P** | 2-10 | $0-20 | Current usage |
| **Render SFU** | 2-20 | $14-31 | Testing SFU |
| **AWS Production** | 10,000+ | $38,000 | Production |

## Limitations on Render

### What Works ✅
- LiveKit SFU (single instance)
- Video/audio calls
- Screen sharing
- Chat
- 2-20 concurrent users
- Testing and development

### What Doesn't Work ❌
- Custom UDP ports (uses TCP fallback)
- Self-hosted TURN (use external TURN)
- Horizontal scaling
- Multi-region
- Production load (>50 users)

## Workaround: External TURN

Since Render doesn't support custom UDP ports, use external TURN:

### Option 1: Twilio TURN (Recommended)
1. Sign up: https://www.twilio.com/stun-turn
2. Get credentials
3. Add to Render environment variables:
   - `TWILIO_TURN_USERNAME`
   - `TWILIO_TURN_CREDENTIAL`

**Cost**: ~$0.40/GB (only when UDP fails)

### Option 2: Xirsys (Free Tier)
1. Sign up: https://xirsys.com
2. Create channel
3. Add credentials to Render

### Option 3: Open Relay (Free, Limited)
Already configured in `livekit.yaml` - no setup needed!

## Architecture on Render

```
┌─────────────────────────────────────┐
│         Render Services             │
├─────────────────────────────────────┤
│                                     │
│  Frontend (Static)                  │
│  ↓                                  │
│  Signaling (Node.js)                │
│  ↓                                  │
│  LiveKit SFU (Docker)               │
│  ↓                                  │
│  Redis + PostgreSQL                 │
│                                     │
└─────────────────────────────────────┘
         ↓
   External TURN
   (Twilio/Xirsys)
```

## When to Migrate to Production?

Move to full Kubernetes/AWS when you need:
- ✅ More than 50 concurrent users
- ✅ Global distribution (low latency worldwide)
- ✅ 99.9% availability SLA
- ✅ Autoscaling
- ✅ Cost optimization ($0.38/user vs $1-2/user on Render)

## Migration Path

### Phase 1: Test on Render (Now) ← YOU ARE HERE
- Deploy SFU to Render
- Test with 2-20 users
- Verify it works better than P2P
- Develop features

### Phase 2: Optimize (Optional)
- Add external TURN (Twilio)
- Upgrade Render plans
- Test with 20-50 users

### Phase 3: Production (When Ready)
- Follow `infrastructure/IMPLEMENTATION_GUIDE.md`
- Deploy to AWS/GCP with Kubernetes
- Multi-region with autoscaling
- Support 10,000+ users

## Files Created for Render

```
render.yaml                           # Render blueprint (auto-deploy)
infrastructure/render/
├── README.md                         # Detailed Render guide
├── Dockerfile.livekit                # LiveKit Docker image
└── livekit.yaml                      # LiveKit configuration
backend/
├── package.json                      # Updated with livekit-server-sdk
└── src/server.js                     # Added /api/token endpoint
```

## Troubleshooting

### "LiveKit not configured" error
```bash
# Install LiveKit SDK
cd backend
npm install livekit-server-sdk
git add package.json package-lock.json
git commit -m "Add LiveKit SDK"
git push
```

### Can't connect to room
1. Check Render logs for errors
2. Verify all services are running
3. Check browser console for WebSocket errors
4. Try adding external TURN server

### Poor video quality
1. Using TCP fallback (slower than UDP)
2. Add external TURN server for better connectivity
3. Upgrade Render plan for more bandwidth

## Next Steps

1. **Deploy to Render** (10 minutes)
   ```bash
   cd backend && npm install livekit-server-sdk
   git add . && git commit -m "Add SFU support" && git push
   # Then deploy via Render dashboard
   ```

2. **Test with 2-3 users** (5 minutes)
   - Create a meeting
   - Join from multiple devices
   - Verify video/audio works

3. **Compare with P2P** (10 minutes)
   - Test current P2P version
   - Test new SFU version
   - Notice the difference in quality/scalability

4. **Plan next steps**
   - Keep testing on Render?
   - Ready for production? → See `infrastructure/`

## Support

- **Render Docs**: https://render.com/docs
- **LiveKit Docs**: https://docs.livekit.io
- **Detailed Guide**: `infrastructure/render/README.md`
- **Production Guide**: `infrastructure/IMPLEMENTATION_GUIDE.md`

---

**Bottom Line**: Yes, you can deploy to Render for testing! It's perfect for validating the SFU architecture before committing to the full production deployment.

**Cost**: $14-31/month (vs $0 for P2P, vs $38K for production)

**Capacity**: 2-20 users (vs 2-10 for P2P, vs 10,000+ for production)

**Deploy now**: Follow steps above or see `infrastructure/render/README.md` for details.
