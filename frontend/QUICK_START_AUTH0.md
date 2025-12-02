# Quick Start - Auth0 Integration

Get up and running with Auth0 authentication in 5 minutes!

## Prerequisites

- Node.js 18+ installed
- MongoDB running locally or remote connection
- Auth0 account (free tier works)

## Step 1: Configure Auth0 Dashboard

1. Go to [Auth0 Dashboard](https://manage.auth0.com)
2. Navigate to **Applications > Applications**
3. Select your application (or create new Regular Web Application)
4. Add these URLs:

**Allowed Callback URLs:**
```
http://localhost:3000/api/auth/callback
```

**Allowed Logout URLs:**
```
http://localhost:3000
```

**Allowed Web Origins:**
```
http://localhost:3000
```

5. Navigate to **Applications > APIs**
6. Create API with identifier: `https://meet-x-luma.onrender.com`
7. Add these scopes:
   - `openid`
   - `profile`
   - `email`
   - `read:meetings`
   - `write:meetings`

## Step 2: Environment Setup

The `.env.local` file is already created with your credentials:

```env
AUTH0_SECRET=c648c439225915af7dc7bbafa3aca6753fc6958b08fc2226ad54f0aeac1f4296
AUTH0_BASE_URL=http://localhost:3000
AUTH0_ISSUER_BASE_URL=https://dev-tiag25eta5ht4rl8.us.auth0.com
AUTH0_CLIENT_ID=f6VZeO1zbW6TSOzDcKfFNLAf41VxTwY7
AUTH0_CLIENT_SECRET=7e-yP0r3j6sh_6oa9_0XAgyatSVKwZJNtP5SaLJxghrGpfxjPlP5GXEJnr7-h9Ss
AUTH0_AUDIENCE=https://meet-x-luma.onrender.com
MONGODB_URI=mongodb://localhost:27017/meetxluma
```

**Update if needed:**
- Change `MONGODB_URI` if using remote MongoDB
- Update `AUTH0_BASE_URL` for production

## Step 3: Start MongoDB

### Local MongoDB:
```bash
mongod --dbpath /path/to/data
```

### Or use MongoDB Atlas (cloud):
Update `MONGODB_URI` in `.env.local` with your connection string

## Step 4: Install Dependencies (Already Done)

Dependencies are already installed:
- `@auth0/nextjs-auth0@4.13.1`
- `mongodb@7.0.0`

## Step 5: Start Development Server

```bash
npm run dev
```

Server will start at `http://localhost:3000`

## Step 6: Test Authentication

### Test Sign In:
1. Visit: `http://localhost:3000/auth`
2. Click **"Sign In"**
3. Login with Auth0 credentials
4. You'll be redirected to home page
5. Check MongoDB - user record created!

### Test Sign Up:
1. Visit: `http://localhost:3000/auth`
2. Click **"Create Account"**
3. Complete registration
4. User created in MongoDB with "participant" role

### Test Guest Mode:
1. Visit: `http://localhost:3000/auth`
2. Click **"Continue as Guest"**
3. Enter your name
4. Guest session created (24-hour expiry)

### Test Dashboard:
1. After signing in, visit: `http://localhost:3000/dashboard`
2. See your profile, role, and permissions
3. Try creating a meeting

## Step 7: Verify MongoDB

```bash
# Connect to MongoDB
mongosh

# Switch to database
use meetxluma

# Check users collection
db.users.find().pretty()

# Check meetings collection
db.meetings.find().pretty()

# Check guest sessions
db.guestSessions.find().pretty()
```

## Common Routes

- `/auth` - Authentication page (Sign In, Sign Up, Guest)
- `/dashboard` - User dashboard (requires auth)
- `/api/auth/login` - Trigger Auth0 login
- `/api/auth/logout` - Logout
- `/api/auth/signup` - Trigger Auth0 signup
- `/api/user/profile` - Get user profile (API)
- `/api/meetings/create` - Create meeting (API)

## Testing API Endpoints

### Create a Meeting (requires authentication):

```bash
# First, get your session cookie by logging in via browser
# Then use it in the request:

curl -X POST http://localhost:3000/api/meetings/create \
  -H "Content-Type: application/json" \
  -H "Cookie: appSession=YOUR_SESSION_COOKIE" \
  -d '{
    "title": "Test Meeting",
    "description": "My first meeting"
  }'
```

### Create Guest Session:

```bash
curl -X POST http://localhost:3000/api/guest/session \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Guest User",
    "meetingId": "test123"
  }'
```

## Using in Your Components

### Client Component:
```tsx
'use client';

import { useAuth } from '@/lib/hooks/useAuth';

export default function MyComponent() {
  const { user, isAuthenticated, permissions } = useAuth();

  if (!isAuthenticated) {
    return <a href="/auth">Please log in</a>;
  }

  return (
    <div>
      <p>Welcome, {user.name}!</p>
      {permissions?.canStartMeeting && (
        <button>Start Meeting</button>
      )}
    </div>
  );
}
```

### Server Component:
```tsx
import { getSession } from '@auth0/nextjs-auth0';
import { redirect } from 'next/navigation';

export default async function ProtectedPage() {
  const session = await getSession();
  
  if (!session?.user) {
    redirect('/auth');
  }

  return <div>Welcome, {session.user.name}!</div>;
}
```

## Role-Based Features

### Roles:
- **Host**: Full control (auto-assigned when creating meeting)
- **Cohost**: Manage participants (assigned by host)
- **Participant**: Standard user (default for authenticated users)
- **Guest**: Limited access (no account required)

### Check Permissions:
```tsx
const { permissions } = useAuth();

if (permissions?.canEndMeeting) {
  // Show "End Meeting" button
}

if (permissions?.canMuteParticipants) {
  // Show "Mute" controls
}
```

## Troubleshooting

### "Invalid state" error:
- Clear browser cookies
- Verify callback URLs in Auth0 dashboard

### MongoDB connection failed:
- Check MongoDB is running: `mongosh`
- Verify `MONGODB_URI` in `.env.local`

### Auth0 configuration error:
- Verify all environment variables are set
- Check Auth0 dashboard settings match `.env.local`

### Guest mode not working:
- Check browser localStorage is enabled
- Verify meeting ID is provided

## Next Steps

1. ✅ Authentication is working
2. ✅ Roles and permissions configured
3. ✅ MongoDB integration complete
4. 🔄 Integrate with your video meeting features
5. 🔄 Add real-time role updates
6. 🔄 Implement meeting invitations

## Need Help?

- 📖 Full documentation: `AUTH0_INTEGRATION.md`
- 📋 Implementation details: `AUTH0_IMPLEMENTATION_SUMMARY.md`
- 🔧 Setup script: `scripts/setup-auth0.sh`

## Success! 🎉

You now have:
- ✅ Three authentication methods
- ✅ Role-based access control
- ✅ MongoDB integration
- ✅ Beautiful UI
- ✅ Production-ready security

Start building your video meeting features with authentication!
