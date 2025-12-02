# Deployment Guide - Luma Meet

## 🚀 Quick Deployment Steps

### Prerequisites
- MongoDB instance (local or cloud)
- Auth0 account configured
- Node.js 18+ installed

### 1. Backend Deployment

#### Local Development
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your configuration
npm start
```

#### Production (e.g., Render, Railway, Heroku)
1. Push code to GitHub
2. Connect repository to hosting service
3. Set environment variables:
   ```
   MONGODB_URI=your-mongodb-connection-string
   PORT=4000
   NODE_ENV=production
   CORS_ORIGIN=https://your-frontend-domain.com
   ```
4. Deploy

### 2. Frontend Deployment

#### Local Development
```bash
cd frontend
npm install
cp .env.example .env.local
# Edit .env.local with your configuration
npm run dev
```

#### Production (Vercel recommended)
1. Push code to GitHub
2. Import project to Vercel
3. Set environment variables:
   ```
   AUTH0_SECRET=your-32-char-secret
   AUTH0_BASE_URL=https://your-domain.com
   AUTH0_ISSUER_BASE_URL=https://your-tenant.auth0.com
   AUTH0_CLIENT_ID=your-client-id
   AUTH0_CLIENT_SECRET=your-client-secret
   NEXT_PUBLIC_BACKEND_API_URL=https://your-backend-url.com
   ```
4. Deploy

### 3. MongoDB Setup

#### Option A: MongoDB Atlas (Recommended)
1. Create account at mongodb.com/cloud/atlas
2. Create cluster
3. Create database user
4. Whitelist IP addresses (0.0.0.0/0 for development)
5. Get connection string
6. Use in MONGODB_URI

#### Option B: Local MongoDB
```bash
# Install MongoDB
# Windows: Download from mongodb.com
# Mac: brew install mongodb-community
# Linux: sudo apt-get install mongodb

# Start MongoDB
mongod --dbpath /path/to/data
```

### 4. Auth0 Setup

1. **Create Auth0 Account**
   - Go to auth0.com
   - Sign up for free account

2. **Create Application**
   - Dashboard → Applications → Create Application
   - Choose "Regular Web Application"
   - Name it "Luma Meet"

3. **Configure Application**
   - Settings tab:
     - Allowed Callback URLs: `http://localhost:3000/api/auth/callback, https://your-domain.com/api/auth/callback`
     - Allowed Logout URLs: `http://localhost:3000, https://your-domain.com`
     - Allowed Web Origins: `http://localhost:3000, https://your-domain.com`

4. **Get Credentials**
   - Copy Domain, Client ID, Client Secret
   - Use in frontend .env.local

5. **Generate Secret**
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
   Use output as AUTH0_SECRET

## 📋 Environment Variables Reference

### Backend (.env)
```env
# Required
MONGODB_URI=mongodb://localhost:27017/meetxluma
PORT=4000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000

# Optional (for LiveKit)
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=secret
LIVEKIT_URL=ws://localhost:7880
```

### Frontend (.env.local)
```env
# Required - Auth0
AUTH0_SECRET=your-32-character-secret-key-here
AUTH0_BASE_URL=http://localhost:3000
AUTH0_ISSUER_BASE_URL=https://your-tenant.auth0.com
AUTH0_CLIENT_ID=your-client-id-here
AUTH0_CLIENT_SECRET=your-client-secret-here

# Required - Backend
NEXT_PUBLIC_BACKEND_API_URL=http://localhost:4000

# Optional - Production
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

## 🔧 Production Checklist

### Backend
- [ ] MongoDB connection string updated
- [ ] CORS_ORIGIN set to production domain
- [ ] NODE_ENV=production
- [ ] All environment variables set
- [ ] Database indexes created (automatic on first run)
- [ ] Health check endpoint working: `/health`

### Frontend
- [ ] Auth0 credentials updated
- [ ] Backend API URL updated
- [ ] Build successful: `npm run build`
- [ ] No console errors
- [ ] Auth0 callback URLs configured
- [ ] All pages load correctly

### Auth0
- [ ] Application created
- [ ] Callback URLs configured
- [ ] Logout URLs configured
- [ ] Web Origins configured
- [ ] Credentials copied to frontend

### Testing
- [ ] Guest flow works
- [ ] Sign in works
- [ ] Create meeting works
- [ ] Join meeting works
- [ ] Dashboard loads
- [ ] Notifications work
- [ ] Mobile responsive

## 🌐 Recommended Hosting

### Backend
- **Render** (Free tier available)
  - Easy deployment
  - Auto-deploy from GitHub
  - Free SSL
  
- **Railway** (Free tier available)
  - Simple setup
  - Good for Node.js
  
- **Heroku** (Paid)
  - Reliable
  - Easy scaling

### Frontend
- **Vercel** (Free tier available) ⭐ Recommended
  - Built for Next.js
  - Auto-deploy from GitHub
  - Free SSL
  - Edge network
  
- **Netlify** (Free tier available)
  - Good alternative
  - Easy setup

### Database
- **MongoDB Atlas** (Free tier available) ⭐ Recommended
  - 512MB free
  - Managed service
  - Automatic backups
  
- **Self-hosted MongoDB**
  - Full control
  - Requires maintenance

## 🐛 Troubleshooting

### Backend Issues

**MongoDB Connection Failed**
```bash
# Check connection string
echo $MONGODB_URI

# Test connection
mongosh "your-connection-string"
```

**CORS Errors**
- Verify CORS_ORIGIN matches frontend URL exactly
- Include protocol (http:// or https://)
- No trailing slash

**Port Already in Use**
```bash
# Windows
netstat -ano | findstr :4000
taskkill /PID <PID> /F

# Mac/Linux
lsof -ti:4000 | xargs kill -9
```

### Frontend Issues

**Auth0 Errors**
- Verify all Auth0 environment variables
- Check callback URLs in Auth0 dashboard
- Ensure AUTH0_SECRET is 32+ characters
- Verify domain includes https://

**Build Errors**
```bash
# Clear cache
rm -rf .next
npm run build
```

**API Connection Failed**
- Verify NEXT_PUBLIC_BACKEND_API_URL
- Check backend is running
- Test backend health: `curl http://localhost:4000/health`

### Database Issues

**Indexes Not Created**
```bash
# Connect to MongoDB
mongosh "your-connection-string"

# Check indexes
use meetxluma
db.meetings.getIndexes()
db.users.getIndexes()
db.notifications.getIndexes()

# Indexes are created automatically on first backend start
# If missing, restart backend
```

## 📊 Monitoring

### Health Checks

**Backend Health**
```bash
curl http://your-backend-url/health
# Should return: {"status":"ok"}
```

**Frontend Health**
```bash
curl http://your-frontend-url
# Should return HTML
```

### Logs

**Backend Logs**
- Check hosting service dashboard
- Look for MongoDB connection success
- Look for "Server running on port 4000"

**Frontend Logs**
- Check Vercel/Netlify dashboard
- Look for build success
- Check browser console for errors

## 🔒 Security

### Production Security Checklist
- [ ] Use strong AUTH0_SECRET (32+ random characters)
- [ ] Enable HTTPS (automatic with Vercel/Render)
- [ ] Restrict CORS_ORIGIN to your domain
- [ ] Use MongoDB Atlas with authentication
- [ ] Whitelist only necessary IPs in MongoDB
- [ ] Keep dependencies updated
- [ ] Use environment variables (never commit secrets)
- [ ] Enable Auth0 MFA (optional)
- [ ] Set up rate limiting (optional)

## 📈 Scaling

### When to Scale

**Backend**
- High CPU usage (>80%)
- Slow response times (>1s)
- Many concurrent users (>100)

**Database**
- Storage approaching limit
- Slow queries
- High connection count

### How to Scale

**Backend**
- Increase server resources
- Add more instances
- Use load balancer
- Enable caching

**Database**
- Upgrade MongoDB Atlas tier
- Add read replicas
- Optimize indexes
- Archive old data

**Frontend**
- Vercel scales automatically
- Use CDN for static assets
- Optimize images
- Enable caching

## 🎉 Launch Checklist

- [ ] Backend deployed and healthy
- [ ] Frontend deployed and accessible
- [ ] MongoDB connected and indexed
- [ ] Auth0 configured correctly
- [ ] All environment variables set
- [ ] Guest flow tested
- [ ] Authenticated flow tested
- [ ] Mobile tested
- [ ] Different browsers tested
- [ ] Error handling tested
- [ ] Performance acceptable
- [ ] Security checklist completed
- [ ] Monitoring set up
- [ ] Backup strategy in place
- [ ] Documentation updated

## 🆘 Support

If you encounter issues:

1. Check this guide
2. Review error logs
3. Verify environment variables
4. Test locally first
5. Check Auth0 dashboard
6. Check MongoDB Atlas dashboard
7. Review NEW_FEATURES_README.md
8. Check CHANGES_SUMMARY.md

---

**Ready to deploy!** 🚀

Follow these steps carefully and you'll have a production-ready video meeting platform!
