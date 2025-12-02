# Auth0 Integration Guide

## Overview

This Next.js application is integrated with Auth0 for authentication and authorization, featuring:

- **Sign In**: Existing users can log in with their Auth0 credentials
- **Sign Up**: New users can create accounts
- **Guest Mode**: Users can join meetings without creating an account
- **Role-Based Access Control (RBAC)**: Host, Cohost, Participant, and Guest roles
- **MongoDB Integration**: User data synced from Auth0 to MongoDB
- **Back-channel & Front-channel Authorization**: Using Auth0 SDK

## Architecture

### Authentication Flows

1. **Front-channel (Browser-based)**:
   - User clicks Sign In/Sign Up
   - Redirected to Auth0 Universal Login
   - After authentication, redirected back with session
   - Client-side hooks (`useUser`) access user data

2. **Back-channel (Server-side)**:
   - API routes use `getSession()` to verify authentication
   - Machine-to-machine token for backend API calls
   - Secure token exchange for protected resources

3. **Guest Mode**:
   - No Auth0 authentication required
   - Temporary session stored in localStorage
   - Limited permissions (cannot host meetings)

## File Structure

```
frontend/
├── app/
│   ├── api/
│   │   ├── auth/[auth0]/route.ts      # Auth0 callback handler
│   │   ├── user/profile/route.ts       # User profile API
│   │   ├── guest/session/route.ts      # Guest session creation
│   │   └── meetings/
│   │       ├── create/route.ts         # Create meeting (auto-assign host)
│   │       └── [meetingId]/cohost/route.ts  # Assign cohost
│   ├── auth/page.tsx                   # Authentication page
│   ├── dashboard/page.tsx              # User dashboard
│   └── layout.tsx                      # Root layout with UserProvider
├── components/auth/
│   ├── SignInButton.tsx
│   ├── SignUpButton.tsx
│   ├── LogoutButton.tsx
│   ├── GuestModeButton.tsx
│   ├── UserProfile.tsx
│   └── AuthStatus.tsx
├── lib/
│   ├── auth0.ts                        # Auth0 client configuration
│   ├── mongodb.ts                      # MongoDB connection
│   ├── roles.ts                        # Role definitions & permissions
│   └── hooks/useAuth.ts                # Custom auth hook
└── middleware.ts                       # Route protection
```

## Roles & Permissions

### Host
- **Assigned**: Automatically when creating a meeting
- **Permissions**: Full control - start/end meetings, manage all participants, assign cohosts

### Cohost
- **Assigned**: By host via API call
- **Permissions**: Manage participants, mute/remove users, share screen (cannot end meeting)

### Participant
- **Assigned**: Default role for authenticated users
- **Permissions**: Join meetings, use camera/mic, share screen, chat

### Guest
- **Assigned**: Automatically in guest mode
- **Permissions**: Limited - join meetings, use camera/mic, chat (no screen sharing)

## Environment Variables

```env
# Auth0 Configuration
AUTH0_SECRET='c648c439225915af7dc7bbafa3aca6753fc6958b08fc2226ad54f0aeac1f4296'
AUTH0_BASE_URL='http://localhost:3000'
AUTH0_ISSUER_BASE_URL='https://dev-tiag25eta5ht4rl8.us.auth0.com'
AUTH0_CLIENT_ID='f6VZeO1zbW6TSOzDcKfFNLAf41VxTwY7'
AUTH0_CLIENT_SECRET='7e-yP0r3j6sh_6oa9_0XAgyatSVKwZJNtP5SaLJxghrGpfxjPlP5GXEJnr7-h9Ss'
AUTH0_AUDIENCE='https://meet-x-luma.onrender.com'

# MongoDB Configuration
MONGODB_URI='mongodb://localhost:27017/meetxluma'

# Backend API
BACKEND_API_URL='http://localhost:3001'
```

## Auth0 Dashboard Configuration

### Application Settings

1. **Application Type**: Regular Web Application
2. **Allowed Callback URLs**: 
   - `http://localhost:3000/api/auth/callback`
   - `https://your-domain.com/api/auth/callback`
3. **Allowed Logout URLs**:
   - `http://localhost:3000`
   - `https://your-domain.com`
4. **Allowed Web Origins**:
   - `http://localhost:3000`
   - `https://your-domain.com`

### API Configuration

1. **Identifier**: `https://meet-x-luma.onrender.com`
2. **Signing Algorithm**: RS256
3. **Scopes**:
   - `openid`
   - `profile`
   - `email`
   - `read:meetings`
   - `write:meetings`

## Usage Examples

### Client-Side Authentication Check

```tsx
'use client';

import { useUser } from '@auth0/nextjs-auth0/client';

export default function MyComponent() {
  const { user, isLoading } = useUser();

  if (isLoading) return <div>Loading...</div>;
  if (!user) return <div>Please log in</div>;

  return <div>Welcome, {user.name}!</div>;
}
```

### Server-Side Authentication Check

```tsx
import { getSession } from '@auth0/nextjs-auth0';

export default async function ProtectedPage() {
  const session = await getSession();

  if (!session?.user) {
    redirect('/auth');
  }

  return <div>Protected content</div>;
}
```

### Using Custom Auth Hook

```tsx
'use client';

import { useAuth } from '@/lib/hooks/useAuth';

export default function MyComponent() {
  const { user, isAuthenticated, isGuest, permissions } = useAuth();

  if (!isAuthenticated) return <div>Please log in</div>;

  return (
    <div>
      <p>Welcome, {user.name}!</p>
      {isGuest && <p>You're in guest mode</p>}
      {permissions?.canStartMeeting && <button>Start Meeting</button>}
    </div>
  );
}
```

### Creating a Meeting (Auto-assign Host)

```tsx
const createMeeting = async () => {
  const response = await fetch('/api/meetings/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'My Meeting',
      description: 'Meeting description',
      scheduledTime: new Date().toISOString(),
    }),
  });

  const data = await response.json();
  // User is automatically assigned as host
  console.log('Meeting created:', data.meetingId);
};
```

### Assigning a Cohost

```tsx
const assignCohost = async (meetingId: string, participantAuth0Id: string) => {
  const response = await fetch(`/api/meetings/${meetingId}/cohost`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ participantAuth0Id }),
  });

  if (response.ok) {
    console.log('Cohost assigned successfully');
  }
};
```

### Guest Mode Join

```tsx
const joinAsGuest = async (name: string, meetingId: string) => {
  const response = await fetch('/api/guest/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, meetingId }),
  });

  const data = await response.json();
  localStorage.setItem('guestSession', JSON.stringify(data));
  window.location.href = `/room/${meetingId}`;
};
```

## Machine-to-Machine Authentication

For backend API calls, use the client credentials flow:

```typescript
async function getBackendToken() {
  const response = await fetch('https://dev-tiag25eta5ht4rl8.us.auth0.com/oauth/token', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.AUTH0_CLIENT_ID,
      client_secret: process.env.AUTH0_CLIENT_SECRET,
      audience: process.env.AUTH0_AUDIENCE,
      grant_type: 'client_credentials',
    }),
  });

  const data = await response.json();
  return data.access_token;
}

async function callProtectedAPI() {
  const token = await getBackendToken();
  
  const response = await fetch('https://meet-x-luma.onrender.com/api/endpoint', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  return response.json();
}
```

## MongoDB Schema

### Users Collection

```typescript
{
  _id: ObjectId,
  auth0Id: string,        // Auth0 user ID (sub)
  email: string,
  name: string,
  picture?: string,
  role: 'host' | 'cohost' | 'participant' | 'guest',
  createdAt: Date,
  updatedAt: Date,
}
```

### Meetings Collection

```typescript
{
  _id: ObjectId,
  title: string,
  description?: string,
  scheduledTime?: Date,
  hostId: ObjectId,       // Reference to users collection
  hostAuth0Id: string,    // Auth0 ID of host
  participants: [
    {
      userId?: ObjectId,  // For authenticated users
      auth0Id?: string,   // For authenticated users
      guestId?: string,   // For guest users
      name: string,
      role: 'host' | 'cohost' | 'participant' | 'guest',
      joinedAt: Date,
    }
  ],
  status: 'scheduled' | 'active' | 'ended',
  createdAt: Date,
  updatedAt: Date,
}
```

### Guest Sessions Collection

```typescript
{
  _id: ObjectId,
  guestId: string,        // Unique guest identifier
  name: string,
  meetingId: string,
  role: 'guest',
  createdAt: Date,
  expiresAt: Date,        // 24 hours from creation
}
```

## Testing

1. **Start MongoDB**:
   ```bash
   mongod --dbpath /path/to/data
   ```

2. **Start Development Server**:
   ```bash
   cd frontend
   npm run dev
   ```

3. **Test Authentication Flows**:
   - Visit `http://localhost:3000/auth`
   - Try Sign In, Sign Up, and Guest Mode
   - Check dashboard at `http://localhost:3000/dashboard`

4. **Test API Endpoints**:
   ```bash
   # Create a meeting (requires authentication)
   curl -X POST http://localhost:3000/api/meetings/create \
     -H "Content-Type: application/json" \
     -d '{"title":"Test Meeting","description":"Test"}'
   ```

## Security Considerations

1. **Never expose secrets**: Keep `.env.local` out of version control
2. **Use HTTPS in production**: Update `AUTH0_BASE_URL` to use HTTPS
3. **Validate permissions**: Always check user roles before allowing actions
4. **Sanitize inputs**: Validate all user inputs in API routes
5. **Rate limiting**: Implement rate limiting for API endpoints
6. **Session expiry**: Configure appropriate session timeouts in Auth0

## Troubleshooting

### "Invalid state" error
- Clear browser cookies and try again
- Verify callback URLs in Auth0 dashboard

### "Audience is required" error
- Ensure `AUTH0_AUDIENCE` is set in `.env.local`
- Verify API identifier in Auth0 dashboard

### MongoDB connection issues
- Check `MONGODB_URI` is correct
- Ensure MongoDB is running

### Guest mode not working
- Check browser localStorage is enabled
- Verify meeting ID is valid

## Next Steps

1. Implement meeting management UI
2. Add real-time role updates via WebSocket
3. Integrate with video conferencing features
4. Add email notifications for meeting invites
5. Implement meeting recording permissions
