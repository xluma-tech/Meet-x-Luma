# Quick Reference Guide

## 🚀 Quick Commands

### Start Development
```bash
# Quick start (Windows)
start-dev-new.bat

# Manual start
cd backend && npm start
cd frontend && npm run dev
```

### Access URLs
- Frontend: http://localhost:3000
- Backend: http://localhost:4000
- Backend Health: http://localhost:4000/health

## 📁 Key Files

### Backend
```
backend/
├── src/
│   ├── models/
│   │   ├── Meeting.js          ← Meeting schema & methods
│   │   ├── User.js              ← User schema & methods
│   │   └── Notification.js      ← Notification schema & methods
│   ├── controllers/
│   │   ├── meetingController.js ← Meeting logic
│   │   ├── authController.js    ← Auth logic
│   │   └── notificationController.js ← Notification logic
│   ├── routes/
│   │   ├── meetingRoutes.js     ← Meeting endpoints
│   │   ├── authRoutes.js        ← Auth endpoints
│   │   └── notificationRoutes.js ← Notification endpoints
│   └── config/
│       └── database.js          ← MongoDB connection
```

### Frontend
```
frontend/
├── app/
│   ├── page.tsx                 ← Landing page
│   ├── create/page.tsx          ← Create meeting
│   ├── dashboard/page.tsx       ← User dashboard
│   └── room/[id]/page.tsx       ← Meeting room
├── components/
│   └── auth/
│       └── AuthStatus.tsx       ← Auth header component
└── .env.local                   ← Environment variables
```

## 🔑 Environment Variables

### Backend (.env)
```env
MONGODB_URI=mongodb://localhost:27017/meetxluma
PORT=4000
CORS_ORIGIN=http://localhost:3000
NODE_ENV=development
```

### Frontend (.env.local)
```env
AUTH0_SECRET=your-32-char-secret
AUTH0_BASE_URL=http://localhost:3000
AUTH0_ISSUER_BASE_URL=https://your-tenant.auth0.com
AUTH0_CLIENT_ID=your-client-id
AUTH0_CLIENT_SECRET=your-client-secret
NEXT_PUBLIC_BACKEND_API_URL=http://localhost:4000
```

## 🎯 User Flows

### Guest Flow
1. Landing → Create Meeting
2. Enter name + title
3. Get meeting code
4. Share code
5. Others join

### Authenticated Flow
1. Landing → Sign In
2. Dashboard
3. Create Meeting (public/private)
4. Invite participants
5. Assign cohosts
6. Manage meeting

## 📡 API Endpoints

### Auth
```
POST   /api/auth/sync                    # Sync user
GET    /api/auth/user/:auth0Id           # Get profile
```

### Meetings
```
POST   /api/meetings                     # Create (auth)
POST   /api/meetings/guest               # Create (guest)
GET    /api/meetings/:code               # Get meeting
GET    /api/meetings/host/:auth0Id       # Get user meetings
POST   /api/meetings/:id/cohost          # Assign cohost
DELETE /api/meetings/:id/cohost          # Remove cohost
POST   /api/meetings/:id/invite          # Invite participant
POST   /api/meetings/:id/participant     # Join meeting
DELETE /api/meetings/:id/participant     # Remove participant
```

### Notifications
```
GET    /api/notifications/:auth0Id       # Get notifications
GET    /api/notifications/:auth0Id/unread/count  # Unread count
PUT    /api/notifications/:id/read       # Mark as read
PUT    /api/notifications/read/all       # Mark all as read
```

## 🗄️ Database Collections

### users
```javascript
{
  auth0Id: String,
  email: String,
  name: String,
  picture: String,
  role: String
}
```

### meetings
```javascript
{
  meetingCode: String,
  title: String,
  type: 'public' | 'private',
  hostAuth0Id: String,
  cohosts: [String],
  participants: [{...}],
  invitations: [{...}]
}
```

### notifications
```javascript
{
  auth0Id: String,
  type: String,
  title: String,
  message: String,
  meetingCode: String,
  read: Boolean
}
```

## 🎨 Pages

### `/` - Landing
- Create new meeting (guest)
- Join with code
- Sign in button

### `/create` - Create Meeting
- Guest mode: name + title
- Auth mode: full details + type

### `/dashboard` - Dashboard
- My meetings list
- Notifications panel
- Quick actions

### `/room/[code]` - Meeting Room
- Video conferencing
- Participant list
- Host/cohost controls

## 🔐 Roles & Permissions

### Host
- ✅ Full control
- ✅ Assign cohosts
- ✅ Invite participants
- ✅ Remove participants
- ✅ End meeting

### Cohost
- ✅ Invite participants
- ✅ Remove participants
- ❌ Cannot remove host
- ❌ Cannot assign cohosts

### Participant
- ✅ Join meeting
- ✅ Video/audio/chat
- ❌ Cannot manage

### Guest
- ✅ Join public meetings
- ❌ Cannot join private meetings

## 🐛 Common Issues

### MongoDB Connection Failed
```bash
# Check if MongoDB is running
mongosh

# Start MongoDB
mongod --dbpath /path/to/data
```

### CORS Errors
```bash
# Check CORS_ORIGIN in backend/.env
CORS_ORIGIN=http://localhost:3000
```

### Auth0 Errors
```bash
# Verify all Auth0 variables in frontend/.env.local
# Check callback URLs in Auth0 dashboard
```

### Port Already in Use
```bash
# Windows
netstat -ano | findstr :4000
taskkill /PID <PID> /F

# Mac/Linux
lsof -ti:4000 | xargs kill -9
```

## 🧪 Testing

### Test Guest Flow
```
1. Go to http://localhost:3000
2. Click "Create New Meeting"
3. Enter name and title
4. Get meeting code
5. Open incognito window
6. Join with code
```

### Test Auth Flow
```
1. Click "Sign In"
2. Complete Auth0 login
3. Go to Dashboard
4. Create private meeting
5. Invite participant
6. Check notifications
```

## 📊 Monitoring

### Health Check
```bash
curl http://localhost:4000/health
# Should return: {"status":"ok"}
```

### Check Logs
```bash
# Backend logs
cd backend && npm start

# Frontend logs
cd frontend && npm run dev
```

### Database Check
```bash
mongosh
use meetxluma
db.meetings.find().pretty()
db.users.find().pretty()
db.notifications.find().pretty()
```

## 🚀 Deployment

### Quick Deploy
1. Set up MongoDB Atlas
2. Configure Auth0
3. Deploy backend to Render
4. Deploy frontend to Vercel
5. Update environment variables

### Detailed Guide
See DEPLOYMENT_GUIDE.md

## 📚 Documentation

- `NEW_FEATURES_README.md` - Feature documentation
- `IMPLEMENTATION_PLAN.md` - Implementation details
- `DEPLOYMENT_GUIDE.md` - Deployment instructions
- `CHANGES_SUMMARY.md` - All changes made
- `FLOW_DIAGRAM.md` - Visual flow diagrams
- `FINAL_SUMMARY.md` - Complete summary

## 💡 Tips

### Development
- Use `start-dev-new.bat` for quick start
- Check console for errors
- Test on different browsers
- Use incognito for multi-user testing

### Production
- Use strong secrets
- Enable HTTPS
- Restrict CORS
- Monitor logs
- Set up backups

### Debugging
- Check browser console
- Check backend logs
- Verify environment variables
- Test API endpoints with curl
- Check MongoDB data

## 🎯 Key Features

✅ Guest mode (no signup)
✅ Authenticated mode
✅ Public/private meetings
✅ Cohost management
✅ Email invitations
✅ Notification system
✅ User dashboard
✅ Mobile responsive

## 🔗 Useful Links

- MongoDB Atlas: https://www.mongodb.com/cloud/atlas
- Auth0: https://auth0.com
- Vercel: https://vercel.com
- Render: https://render.com

---

**Keep this file handy for quick reference!** 📖
