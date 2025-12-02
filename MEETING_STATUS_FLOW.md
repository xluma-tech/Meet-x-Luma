# Meeting Status Flow

## Overview
Automatic meeting status management based on participant activity.

## Status States

### 1. **Scheduled** (Initial State)
- Meeting is created but no one has joined yet
- Appears in "Ongoing" tab (can be joined)
- Status: `scheduled`

### 2. **Active** (Meeting in Progress)
- First participant joins → Status changes to `active`
- Meeting is in progress with participants
- Appears in "Ongoing" tab
- Status: `active`

### 3. **Ended** (Meeting Completed)
- Last participant leaves → Status changes to `ended`
- OR Host manually ends the meeting (private only)
- OR 12 hours of inactivity → Auto-ended by cleanup service
- Moves to "History" tab
- Status: `ended`

## Status Transitions

```
CREATE MEETING
     ↓
[scheduled] ──────────────────────────────────────┐
     ↓                                             │
First user joins                                   │
     ↓                                             │
[active] ──────────────────────────────────────┐  │
     ↓                                          │  │
Last user leaves                                │  │
     ↓                                          │  │
[ended] ←──────────────────────────────────────┘  │
     ↑                                             │
     └─────────────────────────────────────────────┘
     (12h inactivity OR manual end)
```

## Implementation Details

### When First User Joins
**File:** `backend/src/socket/socketHandlers.js`

```javascript
// Check if this is the first user
const isFirstUser = rooms.get(roomId).size === 0;

// If first user and meeting is scheduled, activate it
if (isFirstUser && meeting.status === 'scheduled') {
  await Meeting.updateStatus(meeting._id, 'active');
}
```

### When Last User Leaves
**File:** `backend/src/socket/socketHandlers.js`

```javascript
// If room is now empty, end the meeting
if (room.size === 0) {
  const meeting = await Meeting.findByMeetingCode(socket.roomId);
  if (meeting && meeting.status !== 'ended') {
    await Meeting.updateStatus(meeting._id, 'ended');
  }
}
```

### Auto-End After 12 Hours
**File:** `backend/src/services/meetingCleanupService.js`

```javascript
// Find meetings inactive for 12+ hours
const inactiveMeetings = await Meeting.collection.find({
  status: { $in: ['active', 'scheduled'] },
  updatedAt: { $lt: twelveHoursAgo }
}).toArray();

// End each inactive meeting
for (const meeting of inactiveMeetings) {
  await Meeting.updateStatus(meeting._id, 'ended');
}
```

## Dashboard Display Logic

### Ongoing Tab
Shows meetings with status:
- `scheduled` - Can join
- `active` - Currently in progress

```javascript
const ongoingMeetings = meetings.filter(m => 
  m.status === 'active' || m.status === 'scheduled'
);
```

### History Tab
Shows meetings with status:
- `ended` - Completed meetings

```javascript
const historyMeetings = meetings.filter(m => 
  m.status === 'ended'
);
```

## Activity Tracking

Meeting activity is tracked to prevent premature auto-end:

### Events that Update Activity
1. User joins room
2. User sends chat message
3. WebRTC signaling
4. Screen sharing events
5. 3D model interactions

### Activity Update
```javascript
await Meeting.collection.updateOne(
  { _id: meetingId },
  { $set: { updatedAt: new Date() } }
);
```

## Testing the Flow

### Test 1: Normal Meeting Flow
1. Create a meeting → Status: `scheduled`
2. Join the meeting → Status: `active`
3. Leave the meeting → Status: `ended`
4. Check dashboard → Meeting in History tab

### Test 2: Multiple Participants
1. Create a meeting → Status: `scheduled`
2. User A joins → Status: `active`
3. User B joins → Status: `active` (no change)
4. User A leaves → Status: `active` (User B still there)
5. User B leaves → Status: `ended`

### Test 3: Auto-End
1. Create a meeting → Status: `scheduled`
2. Don't join for 12 hours
3. Cleanup service runs → Status: `ended`
4. Check dashboard → Meeting in History tab

### Test 4: Manual End (Private Meetings)
1. Create private meeting → Status: `scheduled`
2. Join the meeting → Status: `active`
3. Click "End" button → Status: `ended`
4. Check dashboard → Meeting in History tab

## Database Schema

### Meeting Document
```javascript
{
  _id: ObjectId,
  meetingCode: String,
  title: String,
  description: String,
  type: 'public' | 'private',
  status: 'scheduled' | 'active' | 'ended',  // ← Status field
  hostAuth0Id: String,
  hostName: String,
  participants: Array,
  createdAt: Date,
  updatedAt: Date  // ← Used for inactivity tracking
}
```

## Benefits

1. **Automatic Cleanup**: No manual intervention needed
2. **Real-time Updates**: Status changes immediately
3. **Accurate History**: Only completed meetings in history
4. **Resource Management**: Empty rooms are cleaned up
5. **Activity Tracking**: Prevents premature ending

## Logs

The system logs status changes:
- ✓ Meeting {code} is now active - first participant joined
- ✓ Meeting {code} ended - all participants left
- ✓ Ended inactive meeting: {code} ({title})

## Future Enhancements

Potential improvements:
- Meeting duration tracking
- Participant join/leave timestamps
- Meeting analytics
- Automatic recording start/stop
- Meeting summaries
