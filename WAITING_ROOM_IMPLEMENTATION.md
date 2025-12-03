# Waiting Room Implementation (Google Meet Style)

## Overview
Implemented a proper waiting room system for private meetings where uninvited users must wait for host/cohost admission before joining the meeting.

## Problem Fixed
Previously, when a user sent a join request, they would immediately connect to the WebRTC room and could see/hear the meeting. This was a security issue.

## Solution
Users requesting to join are now held in a **waiting room** and cannot access the meeting until explicitly admitted by the host or cohost.

---

## Architecture

### 1. Waiting Room Channels (Socket.IO)
- **Meeting Room Channel**: `meetingCode` - Only for admitted participants
- **Waiting Room Channel**: `waiting-{requestId}` - For users waiting admission
- **Request Listener Channel**: `meetingCode` - For hosts/cohosts to receive notifications

### 2. User States
1. **Unauthorized** → Shows join request dialog
2. **Waiting** → In waiting room, cannot access meeting
3. **Admitted** → Added to participants, can join meeting
4. **Rejected** → Shown rejection message

---

## Implementation Details

### Frontend Changes

#### 1. RoomWrapper.tsx
**Purpose**: Validates user access and controls what screen to show

**Key Logic**:
```typescript
// Check if user is authorized to join
if (private meeting) {
  if (isHost || isCohost || isInvited || isParticipant) {
    // Show join screen - can enter meeting
  } else {
    // Show join request dialog - must request access
  }
}
```

**Participant Check**:
```typescript
const isParticipant = user?.sub && fetchedMeeting.participants?.some(
  (p: any) => p.auth0Id === user.sub
);
```

**Revalidation on Acceptance**:
```typescript
const handleRequestAccepted = () => {
  setRequestPending(false);
  validateMeeting(); // Re-check access, user is now a participant
};
```

#### 2. JoinRequestPending.tsx
**Purpose**: Waiting room screen - user waits here for admission

**Key Features**:
- Does NOT join the meeting room
- Joins a waiting room channel: `waiting-{requestId}`
- Listens for acceptance/rejection events
- On acceptance: Calls `onAccepted()` callback to revalidate

**Socket Connection**:
```typescript
newSocket.emit('join-waiting-room', { 
  requestId: pendingRequestId,
  meetingCode: meetingCode 
});
```

**Acceptance Handler**:
```typescript
newSocket.on('join-request-accepted', (data) => {
  if (data.requestId === pendingRequestId) {
    setStatus('accepted');
    setTimeout(() => {
      onAccepted(); // Triggers revalidation in RoomWrapper
    }, 1500);
  }
});
```

#### 3. JoinRequestPanel.tsx
**Purpose**: Shows pending requests to host/cohost

**Key Features**:
- Joins request listener channel (not as participant)
- Real-time updates via socket events
- Shows only pending requests

**Socket Connection**:
```typescript
newSocket.emit('join-request-listener', { meetingCode });
```

#### 4. JoinRequestDialog.tsx
**Purpose**: Form for requesting access

**Key Features**:
- Sends join request to backend
- Stores requestId in localStorage
- Stores user info for matching events

---

### Backend Changes

#### 1. joinRequestController.js
**Purpose**: Handles join request CRUD operations

**Key Changes**:

**On Request Creation**:
```javascript
// Emit to meeting room (for hosts/cohosts)
io.to(meeting.meetingCode).emit('join-request-received', {
  requestId: joinRequest._id,
  requesterName: requesterData.requesterName,
  // ... other data
});
```

**On Request Acceptance**:
```javascript
// Add user to meeting participants
await Meeting.addParticipant(meeting._id.toString(), participant);

// Emit to meeting room (update host panel)
io.to(meeting.meetingCode).emit('join-request-accepted', {
  requestId: joinRequest._id.toString(),
  // ...
});

// Emit to waiting room (notify requester)
io.to(`waiting-${joinRequest._id.toString()}`).emit('join-request-accepted', {
  requestId: joinRequest._id.toString(),
  // ...
});
```

**On Request Rejection**:
```javascript
// Emit to both meeting room and waiting room
io.to(meeting.meetingCode).emit('join-request-rejected', { ... });
io.to(`waiting-${joinRequest._id.toString()}`).emit('join-request-rejected', { ... });
```

#### 2. socketHandlers.js
**Purpose**: Manages socket connections and rooms

**New Handlers**:

**Waiting Room Handler**:
```javascript
socket.on('join-waiting-room', ({ requestId, meetingCode }) => {
  const waitingRoomId = `waiting-${requestId}`;
  socket.join(waitingRoomId);
  console.log(`User ${socket.id} joined waiting room for request ${requestId}`);
});
```

**Request Listener Handler**:
```javascript
socket.on('join-request-listener', ({ meetingCode }) => {
  socket.join(meetingCode);
  console.log(`User ${socket.id} listening for join requests in meeting ${meetingCode}`);
});
```

---

## Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    User Tries to Join                        │
│                    Private Meeting                           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │  RoomWrapper Checks   │
         │  User Authorization   │
         └───────────┬───────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
        ▼                         ▼
┌───────────────┐         ┌──────────────┐
│  Authorized   │         │ Unauthorized │
│ (Host/Cohost/ │         │              │
│ Invited/      │         └──────┬───────┘
│ Participant)  │                │
└───────┬───────┘                ▼
        │              ┌──────────────────┐
        │              │ JoinRequestDialog│
        │              │ (Request Access) │
        │              └────────┬─────────┘
        │                       │
        │                       ▼
        │              ┌──────────────────┐
        │              │ Request Sent to  │
        │              │     Backend      │
        │              └────────┬─────────┘
        │                       │
        │                       ▼
        │              ┌──────────────────────┐
        │              │ JoinRequestPending   │
        │              │   (WAITING ROOM)     │
        │              │ - No meeting access  │
        │              │ - Socket: waiting-ID │
        │              └──────┬───────────────┘
        │                     │
        │                     │ ┌──────────────────┐
        │                     │ │ Host/Cohost sees │
        │                     │ │ JoinRequestPanel │
        │                     │ └────────┬─────────┘
        │                     │          │
        │                     │    ┌─────┴─────┐
        │                     │    │           │
        │                     │    ▼           ▼
        │                     │ Accept      Reject
        │                     │    │           │
        │                     │    ▼           ▼
        │              ┌──────┴────────┐  ┌────────┐
        │              │ Added to      │  │Rejected│
        │              │ Participants  │  │Message │
        │              └──────┬────────┘  └────────┘
        │                     │
        │                     ▼
        │              ┌──────────────┐
        │              │ Revalidate   │
        │              │ Access       │
        │              └──────┬───────┘
        │                     │
        │                     ▼
        └─────────────► ┌──────────────┐
                        │ Join Screen  │
                        │ (Enter Name) │
                        └──────┬───────┘
                               │
                               ▼
                        ┌──────────────┐
                        │ Join Meeting │
                        │ (WebRTC Room)│
                        └──────────────┘
```

---

## Key Security Features

✅ **No Premature Access**: Users in waiting room cannot see/hear the meeting
✅ **Separate Channels**: Waiting room uses different socket channels
✅ **Participant Validation**: Access is re-checked after admission
✅ **Host Control**: Only hosts/cohosts can admit users
✅ **Real-time Updates**: Instant notifications without polling
✅ **Persistent State**: Uses localStorage and database for tracking

---

## Testing Checklist

### Test Case 1: Unauthorized User
1. ✅ Create a private meeting as User A
2. ✅ Try to join as User B (not invited)
3. ✅ Verify: User B sees join request dialog
4. ✅ Submit request
5. ✅ Verify: User B sees waiting room screen
6. ✅ Verify: User B does NOT appear in meeting participants
7. ✅ Verify: User A sees join request notification

### Test Case 2: Host Admits User
1. ✅ User A clicks "Accept" on join request
2. ✅ Verify: User B sees "Request Accepted" message
3. ✅ Verify: User B is redirected to join screen
4. ✅ User B enters name and joins
5. ✅ Verify: User B now appears in meeting

### Test Case 3: Host Rejects User
1. ✅ User A clicks "Reject" on join request
2. ✅ Verify: User B sees "Request Rejected" message
3. ✅ Verify: User B cannot join the meeting

### Test Case 4: Multiple Requests
1. ✅ Multiple users request to join
2. ✅ Verify: All requests appear in panel
3. ✅ Verify: Each can be accepted/rejected independently
4. ✅ Verify: Panel updates in real-time

---

## Files Modified

### Frontend
- `frontend/app/room/[id]/RoomWrapper.tsx` - Added participant check and revalidation
- `frontend/components/meeting/JoinRequestPending.tsx` - Waiting room implementation
- `frontend/components/meeting/JoinRequestPanel.tsx` - Request listener channel
- `frontend/components/meeting/JoinRequestDialog.tsx` - Request ID tracking

### Backend
- `backend/src/controllers/joinRequestController.js` - Dual socket emissions
- `backend/src/socket/socketHandlers.js` - Waiting room and listener handlers

---

## Comparison with Google Meet

| Feature | Google Meet | Our Implementation |
|---------|-------------|-------------------|
| Waiting Room | ✅ | ✅ |
| Real-time Notifications | ✅ | ✅ |
| Host/Cohost Admission | ✅ | ✅ |
| No Audio/Video Access | ✅ | ✅ |
| Automatic Admission | ✅ | ✅ |
| Rejection Handling | ✅ | ✅ |
| Multiple Requests | ✅ | ✅ |

---

## Future Enhancements

- [ ] Add "Admit All" button for multiple requests
- [ ] Add sound notification when request is received
- [ ] Add request timeout (auto-reject after X minutes)
- [ ] Add request history/audit log
- [ ] Add ability to pre-approve domains/emails
- [ ] Add waiting room chat (requester can send message to host)
