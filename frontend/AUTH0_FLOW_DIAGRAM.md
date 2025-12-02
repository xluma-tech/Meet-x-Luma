# Auth0 Authentication Flow Diagrams

## 1. Sign In / Sign Up Flow (Front-channel)

```
┌─────────────┐
│   Browser   │
│   (User)    │
└──────┬──────┘
       │
       │ 1. Click "Sign In" or "Sign Up"
       │
       ▼
┌─────────────────────────────────────┐
│  /auth page                         │
│  - SignInButton.tsx                 │
│  - SignUpButton.tsx                 │
└──────┬──────────────────────────────┘
       │
       │ 2. Redirect to /api/auth/login or /api/auth/signup
       │
       ▼
┌─────────────────────────────────────┐
│  Auth0 SDK (Next.js)                │
│  - Generates state & nonce          │
│  - Redirects to Auth0               │
└──────┬──────────────────────────────┘
       │
       │ 3. Redirect to Auth0 Universal Login
       │
       ▼
┌─────────────────────────────────────┐
│  Auth0 Universal Login              │
│  https://dev-xxx.auth0.com          │
│  - User enters credentials          │
│  - Social login (optional)          │
└──────┬──────────────────────────────┘
       │
       │ 4. Authentication successful
       │
       ▼
┌─────────────────────────────────────┐
│  Auth0 Callback                     │
│  /api/auth/callback                 │
│  - Validates state & nonce          │
│  - Exchanges code for tokens        │
│  - Creates session cookie           │
└──────┬──────────────────────────────┘
       │
       │ 5. Sync user to MongoDB
       │
       ▼
┌─────────────────────────────────────┐
│  MongoDB                            │
│  - Check if user exists             │
│  - Create new user if not           │
│  - Update last login                │
│  - Assign default role: participant │
└──────┬──────────────────────────────┘
       │
       │ 6. Redirect to home page
       │
       ▼
┌─────────────────────────────────────┐
│  Home Page (/)                      │
│  - User is authenticated            │
│  - Session cookie set               │
│  - Can access protected routes      │
└─────────────────────────────────────┘
```

## 2. Guest Mode Flow

```
┌─────────────┐
│   Browser   │
│   (Guest)   │
└──────┬──────┘
       │
       │ 1. Click "Continue as Guest"
       │
       ▼
┌─────────────────────────────────────┐
│  /auth page                         │
│  - GuestModeButton.tsx              │
│  - Shows modal for name input       │
└──────┬──────────────────────────────┘
       │
       │ 2. Enter name & submit
       │
       ▼
┌─────────────────────────────────────┐
│  POST /api/guest/session            │
│  - Validate meeting ID              │
│  - Generate unique guest ID         │
│  - Create guest session             │
└──────┬──────────────────────────────┘
       │
       │ 3. Save to MongoDB
       │
       ▼
┌─────────────────────────────────────┐
│  MongoDB                            │
│  - Create guestSessions record      │
│  - Add guest to meeting             │
│  - Set expiry: 24 hours             │
│  - Assign role: guest               │
└──────┬──────────────────────────────┘
       │
       │ 4. Return guest session
       │
       ▼
┌─────────────────────────────────────┐
│  Browser localStorage               │
│  - Store guest session data         │
│  - guestId, name, role              │
└──────┬──────────────────────────────┘
       │
       │ 5. Redirect to meeting room
       │
       ▼
┌─────────────────────────────────────┐
│  /room/[meetingId]                  │
│  - Guest can join                   │
│  - Limited permissions              │
│  - No screen sharing                │
└─────────────────────────────────────┘
```

## 3. Create Meeting Flow (Auto-assign Host)

```
┌─────────────┐
│   Browser   │
│ (Auth User) │
└──────┬──────┘
       │
       │ 1. Click "Create Meeting"
       │
       ▼
┌─────────────────────────────────────┐
│  POST /api/meetings/create          │
│  - Check authentication             │
│  - Get user from session            │
└──────┬──────────────────────────────┘
       │
       │ 2. Verify user in MongoDB
       │
       ▼
┌─────────────────────────────────────┐
│  MongoDB - users collection         │
│  - Find user by auth0Id             │
│  - Get user._id                     │
└──────┬──────────────────────────────┘
       │
       │ 3. Create meeting with host
       │
       ▼
┌─────────────────────────────────────┐
│  MongoDB - meetings collection      │
│  {                                  │
│    hostId: user._id,                │
│    hostAuth0Id: user.auth0Id,       │
│    participants: [                  │
│      {                              │
│        userId: user._id,            │
│        auth0Id: user.auth0Id,       │
│        role: "host",  ← AUTO!       │
│        joinedAt: Date.now()         │
│      }                              │
│    ]                                │
│  }                                  │
└──────┬──────────────────────────────┘
       │
       │ 4. Return meeting ID
       │
       ▼
┌─────────────────────────────────────┐
│  Browser                            │
│  - Redirect to /room/[meetingId]    │
│  - User is HOST                     │
│  - Full permissions granted         │
└─────────────────────────────────────┘
```

## 4. Assign Cohost Flow

```
┌─────────────┐
│   Browser   │
│   (Host)    │
└──────┬──────┘
       │
       │ 1. Click "Make Cohost" on participant
       │
       ▼
┌─────────────────────────────────────┐
│  POST /api/meetings/[id]/cohost     │
│  - Check authentication             │
│  - Get current user                 │
└──────┬──────────────────────────────┘
       │
       │ 2. Verify user is host
       │
       ▼
┌─────────────────────────────────────┐
│  MongoDB - meetings collection      │
│  - Find meeting by ID               │
│  - Check hostAuth0Id matches user   │
└──────┬──────────────────────────────┘
       │
       │ 3. Update participant role
       │
       ▼
┌─────────────────────────────────────┐
│  MongoDB - Update Operation         │
│  db.meetings.updateOne(             │
│    { _id, "participants.auth0Id" }, │
│    { $set: {                        │
│        "participants.$.role": "cohost" │
│      }                              │
│    }                                │
│  )                                  │
└──────┬──────────────────────────────┘
       │
       │ 4. Return success
       │
       ▼
┌─────────────────────────────────────┐
│  Browser                            │
│  - Participant is now COHOST        │
│  - Permissions updated              │
│  - Can manage participants          │
└─────────────────────────────────────┘
```

## 5. Permission Check Flow

```
┌─────────────┐
│  Component  │
└──────┬──────┘
       │
       │ 1. Use useAuth() hook
       │
       ▼
┌─────────────────────────────────────┐
│  useAuth() Hook                     │
│  - Check Auth0 session              │
│  - Check guest session              │
│  - Fetch user profile               │
└──────┬──────────────────────────────┘
       │
       │ 2. Get user role
       │
       ▼
┌─────────────────────────────────────┐
│  User Role                          │
│  - host                             │
│  - cohost                           │
│  - participant                      │
│  - guest                            │
└──────┬──────────────────────────────┘
       │
       │ 3. Get permissions for role
       │
       ▼
┌─────────────────────────────────────┐
│  getPermissions(role)               │
│  - Returns Permission object        │
│  - All boolean flags                │
└──────┬──────────────────────────────┘
       │
       │ 4. Check specific permission
       │
       ▼
┌─────────────────────────────────────┐
│  Component Rendering                │
│  {permissions?.canEndMeeting && (   │
│    <button>End Meeting</button>     │
│  )}                                 │
│                                     │
│  {permissions?.canMuteParticipants && ( │
│    <button>Mute</button>            │
│  )}                                 │
└─────────────────────────────────────┘
```

## 6. Back-channel API Authentication (Machine-to-Machine)

```
┌─────────────┐
│   Backend   │
│   Server    │
└──────┬──────┘
       │
       │ 1. Need to call protected API
       │
       ▼
┌─────────────────────────────────────┐
│  POST /oauth/token                  │
│  https://dev-xxx.auth0.com          │
│  {                                  │
│    client_id: "...",                │
│    client_secret: "...",            │
│    audience: "...",                 │
│    grant_type: "client_credentials" │
│  }                                  │
└──────┬──────────────────────────────┘
       │
       │ 2. Auth0 validates credentials
       │
       ▼
┌─────────────────────────────────────┐
│  Auth0 Authorization Server         │
│  - Verify client_id & secret        │
│  - Check audience                   │
│  - Generate access token            │
└──────┬──────────────────────────────┘
       │
       │ 3. Return access token
       │
       ▼
┌─────────────────────────────────────┐
│  Backend Server                     │
│  - Receives JWT access token        │
│  - Token valid for API calls        │
└──────┬──────────────────────────────┘
       │
       │ 4. Call protected API
       │
       ▼
┌─────────────────────────────────────┐
│  GET /api/endpoint                  │
│  https://meet-x-luma.onrender.com   │
│  Headers: {                         │
│    Authorization: "Bearer <token>"  │
│  }                                  │
└──────┬──────────────────────────────┘
       │
       │ 5. API validates token
       │
       ▼
┌─────────────────────────────────────┐
│  Protected API                      │
│  - Verify JWT signature             │
│  - Check audience & scopes          │
│  - Process request                  │
│  - Return data                      │
└─────────────────────────────────────┘
```

## 7. Session Management

```
┌─────────────────────────────────────┐
│  User Authentication                │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│  Auth0 SDK                          │
│  - Creates encrypted session        │
│  - Stores in HTTP-only cookie       │
│  - Cookie name: appSession          │
└──────┬──────────────────────────────┘
       │
       ├─────────────────────────────────┐
       │                                 │
       ▼                                 ▼
┌──────────────────┐          ┌──────────────────┐
│  Client-Side     │          │  Server-Side     │
│  useUser() hook  │          │  getSession()    │
│  - Reads session │          │  - Reads session │
│  - Returns user  │          │  - Returns user  │
└──────────────────┘          └──────────────────┘
       │                                 │
       │                                 │
       ▼                                 ▼
┌──────────────────┐          ┌──────────────────┐
│  Client          │          │  API Routes      │
│  Components      │          │  - Protected     │
│  - Show user     │          │  - Validated     │
│  - Check auth    │          │  - Secure        │
└──────────────────┘          └──────────────────┘
```

## 8. Role Hierarchy

```
┌─────────────────────────────────────────────────────┐
│                      HOST                           │
│  ✓ Start/End Meeting                               │
│  ✓ Manage All Participants                         │
│  ✓ Assign Cohosts                                  │
│  ✓ Mute/Remove Anyone                              │
│  ✓ Full Control                                    │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│                    COHOST                           │
│  ✗ Cannot End Meeting                              │
│  ✓ Manage Participants                             │
│  ✗ Cannot Assign Cohosts                           │
│  ✓ Mute/Remove Participants                        │
│  ✓ Share Screen                                    │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│                 PARTICIPANT                         │
│  ✗ Cannot Manage Meeting                           │
│  ✗ Cannot Manage Others                            │
│  ✓ Use Camera/Mic                                  │
│  ✓ Share Screen                                    │
│  ✓ Chat                                            │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│                    GUEST                            │
│  ✗ Cannot Manage Anything                          │
│  ✗ Cannot Share Screen                             │
│  ✓ Use Camera/Mic                                  │
│  ✓ Chat                                            │
│  ⏱ 24-hour Session Expiry                          │
└─────────────────────────────────────────────────────┘
```

## 9. Data Flow Summary

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│          │     │          │     │          │     │          │
│  Browser │────▶│  Auth0   │────▶│ Next.js  │────▶│ MongoDB  │
│          │     │          │     │          │     │          │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
     │                │                 │                 │
     │                │                 │                 │
     ▼                ▼                 ▼                 ▼
  User Input    Authentication    Session Mgmt      Data Storage
  - Sign In     - Validate        - Create          - Users
  - Sign Up     - Generate        - Verify          - Meetings
  - Guest       - Tokens          - Protect         - Sessions
```

## Key Security Points

1. **Session Cookies**: HTTP-only, encrypted, secure
2. **CSRF Protection**: State & nonce validation
3. **Token Validation**: JWT signature verification
4. **Role Checks**: Both client and server-side
5. **Guest Expiry**: Automatic 24-hour timeout
6. **API Protection**: Middleware guards routes
7. **Input Validation**: All user inputs sanitized

## Integration Points

- **WebRTC**: Check permissions before enabling features
- **Socket.IO**: Validate user role on connection
- **File Upload**: Check permissions before allowing
- **Chat**: Filter messages based on role
- **Recording**: Verify host/cohost before starting
