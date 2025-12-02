# Meeting Management Features

## Overview
Comprehensive meeting management system with history tracking, auto-cleanup, and host controls.

## Features Implemented

### 1. Dashboard Tabs

#### **Meetings Tab** (with sub-tabs)
- **Ongoing Meetings**
  - Shows all active and scheduled meetings
  - Green gradient background for easy identification
  - Status badge (Active/Scheduled)
  - Join button for all meetings
  - **End button for private meetings** (host only)
  - Real-time participant count
  - Meeting type indicator (Public/Private)
  - Meeting code display

- **History Tab**
  - Shows all ended meetings
  - Gray background to indicate past meetings
  - Creation date display
  - Meeting details preserved
  - No action buttons (read-only)

#### **Notifications Tab**
- Meeting invitations
- Join requests
- Cohost assignments
- Participant removals
- Unread count badge

### 2. Auto-End Meetings

#### **Automatic Cleanup Service**
- Runs every 5 minutes
- Checks for inactive meetings
- **Ends meetings after 12 hours of inactivity**
- Activity tracking on:
  - User joins room
  - Messages sent
  - Any socket activity

#### **Manual End Meeting**
- Available for **private meetings only**
- Host-only feature
- Confirmation dialog before ending
- Updates meeting status to "ended"
- Moves meeting to history tab

### 3. Activity Tracking

The system tracks meeting activity to prevent premature auto-end:
- User joins meeting → Updates `updatedAt` timestamp
- Chat messages → Keeps meeting active
- WebRTC signaling → Maintains activity
- Any socket event → Refreshes activity timer

### 4. Meeting Status Flow

```
scheduled → active → ended
     ↓         ↓
  (12h timeout)
```

- **Scheduled**: Meeting created but not started
- **Active**: At least one participant joined
- **Ended**: Manually ended by host OR auto-ended after 12h inactivity

## User Experience

### For Hosts

1. **Create Meeting**
   - Choose public or private
   - Add participants (for private)
   - Assign cohosts

2. **Manage Ongoing Meetings**
   - View all active meetings
   - Join any meeting instantly
   - End private meetings manually
   - See participant count

3. **Review History**
   - Access past meeting details
   - See when meetings occurred
   - Review participant lists
   - Check meeting type and settings

### For Participants

1. **Join Meetings**
   - From notifications
   - From meeting code
   - From dashboard (if invited)

2. **Permissions**
   - Public meetings: Anyone can join
   - Private meetings: Invitation required
   - Cohosts: Can manage participants

## Technical Implementation

### Backend

**New Files:**
- `backend/src/services/meetingCleanupService.js` - Auto-cleanup service

**Modified Files:**
- `backend/src/server.js` - Start/stop cleanup service
- `backend/src/socket/socketHandlers.js` - Activity tracking

**Cleanup Service Features:**
- Singleton pattern
- Configurable check interval (5 minutes)
- Configurable inactivity timeout (12 hours)
- Graceful shutdown handling
- Error handling and logging

### Frontend

**Modified Files:**
- `frontend/app/dashboard/page.tsx` - Added tabs and end meeting

**New Features:**
- Sub-tabs for ongoing/history
- End meeting button (private only)
- Status badges
- Visual distinction between ongoing and ended meetings
- Confirmation dialogs

## Configuration

### Cleanup Service Settings

In `backend/src/services/meetingCleanupService.js`:

```javascript
const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000; // 12 hours
const CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
```

Adjust these values to change:
- Inactivity timeout before auto-end
- How often the cleanup service runs

## API Endpoints

### End Meeting
```
PUT /api/meetings/:meetingId/status
Body: { status: 'ended' }
```

### Get Meetings by Host
```
GET /api/meetings/host/:auth0Id
Returns: All meetings (ongoing + history)
```

## Security

- Only hosts can end private meetings
- Activity tracking prevents accidental auto-end
- Confirmation required for manual end
- Status changes are logged

## Future Enhancements

Potential improvements:
- Meeting analytics (duration, participant count over time)
- Export meeting history
- Scheduled meeting reminders
- Recording capabilities
- Meeting templates
- Recurring meetings

## Testing

To test the features:

1. **Create a private meeting**
2. **Check Ongoing tab** - Should appear there
3. **Click End button** - Confirm and verify it moves to History
4. **Create another meeting** - Leave it inactive
5. **Wait 12 hours** (or modify timeout for testing) - Should auto-end

## Logs

The cleanup service logs:
- ✅ Service start/stop
- ✓ No inactive meetings found
- 🧹 Found X inactive meetings
- ✓ Ended meeting: CODE (Title)
- ❌ Errors if any occur
