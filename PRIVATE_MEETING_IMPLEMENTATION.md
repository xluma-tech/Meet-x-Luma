# Private Meeting System Implementation

## Overview
Complete implementation of private meeting functionality with email invitations, participant management, and join request handling.

## Features Implemented

### 1. Email Service Integration
- **Nodemailer Setup**: Configured with Gmail SMTP
- **Email Credentials**: 
  - Email: xlumatechnologies@gmail.com
  - App Password: gbjwsjqvuamadrat
- **Email Templates**:
  - Meeting invitation emails with host information
  - Join request notifications for hosts/cohosts
  - Professional HTML templates with meeting details

### 2. Participant Management (Create Meeting)
- **Pre-Meeting Participant Addition**: Add participants before entering the room
- **Role Assignment**: Assign participants as either "Participant" or "Co-host"
- **Email Invitations**: Automatic email sent to all invited participants
- **Participant List**: Visual list showing all invited users with their roles
- **Role Management**: Change roles or remove participants before meeting starts

### 3. Join Request System
- **Request Creation**: Outsiders can request to join private meetings
- **Host/Cohost Notification**: Email notifications sent to all hosts and cohosts
- **Request Panel**: Real-time panel showing pending join requests
- **Accept/Reject**: Hosts and cohosts can accept or reject requests
- **State Management**: Once accepted by any host/cohost, request disappears for all
- **Waiting Screen**: Requesters see a pending status while waiting for approval

### 4. Role-Based Access Control
- **Host**: Creator of the meeting, full control
- **Co-host**: Can manage participants, accept/reject join requests, remove participants
- **Participant**: Can join and participate in the meeting
- **Guest**: Temporary participant without authentication

## Files Created/Modified

### Backend Files

#### New Files:
1. `backend/src/controllers/joinRequestController.js`
   - Create join request
   - Get pending requests
   - Accept/reject requests

2. `backend/src/routes/joinRequestRoutes.js`
   - POST /:meetingCode - Create join request
   - GET /:meetingCode - Get pending requests
   - POST /:requestId/accept - Accept request
   - POST /:requestId/reject - Reject request

#### Modified Files:
1. `backend/src/services/emailService.js`
   - Fixed app password format (removed spaces)
   - Enhanced email templates
   - Added sender name in "From" field

2. `backend/src/controllers/meetingController.js`
   - Integrated email sending in inviteParticipant function
   - Added host information to invitation emails

3. `backend/src/routes/index.js`
   - Added join request routes

4. `backend/.env.example`
   - Updated email password format

### Frontend Files

#### New Components:
1. `frontend/components/meeting/ParticipantManager.tsx`
   - Add participants by email
   - Assign roles (participant/cohost)
   - Remove participants
   - Visual participant list

2. `frontend/components/meeting/JoinRequestPanel.tsx`
   - Display pending join requests
   - Accept/reject buttons
   - Real-time updates (5-second polling)
   - Only visible to hosts and cohosts

3. `frontend/components/meeting/JoinRequestDialog.tsx`
   - Modal for requesting to join private meeting
   - Name and email input
   - Submit join request

4. `frontend/components/meeting/JoinRequestPending.tsx`
   - Waiting screen after request is sent
   - Shows meeting information
   - Animated loading state

#### Modified Files:
1. `frontend/app/create/page.tsx`
   - Added ParticipantManager component
   - Integrated participant invitation on meeting creation
   - Send invitations and assign cohosts after meeting creation

2. `frontend/app/room/[id]/RoomWrapper.tsx`
   - Added join request handling for private meetings
   - Show join request dialog for unauthorized users
   - Show pending screen after request is sent

## API Endpoints

### Join Requests
```
POST   /api/join-requests/:meetingCode          - Create join request
GET    /api/join-requests/:meetingCode          - Get pending requests
POST   /api/join-requests/:requestId/accept     - Accept request
POST   /api/join-requests/:requestId/reject     - Reject request
```

### Meeting Invitations
```
POST   /api/meetings/:meetingId/invite          - Invite participant
POST   /api/meetings/:meetingId/assign-cohost   - Assign cohost
POST   /api/meetings/:meetingId/remove-cohost   - Remove cohost
```

## User Flow

### Creating a Private Meeting
1. User selects "Private" meeting type
2. Adds participants by email
3. Assigns roles (participant or cohost)
4. Creates meeting
5. System sends email invitations to all participants
6. System assigns cohost roles
7. User enters meeting room

### Joining a Private Meeting (Invited)
1. User receives email invitation
2. Clicks link or enters meeting code
3. System validates invitation
4. User joins meeting directly

### Joining a Private Meeting (Not Invited)
1. User tries to join with meeting code
2. System detects user is not invited
3. Shows join request dialog
4. User submits request with name/email
5. System sends email to hosts/cohosts
6. Shows waiting screen
7. Host/cohost accepts request
8. User can now join meeting

### Managing Join Requests (Host/Cohost)
1. Receives email notification of new request
2. Sees join request panel in meeting room
3. Reviews requester information
4. Accepts or rejects request
5. If accepted, requester is added as participant
6. Request disappears from all hosts/cohosts screens

## Email Templates

### Meeting Invitation
- Professional gradient header
- Host name and email prominently displayed
- Meeting title and description
- Meeting code in large, bold text
- Join button with direct link
- Meeting type indicator (private/public)
- Scheduled time (if applicable)

### Join Request Notification
- Alert-style header
- Requester name and email
- Meeting title and code
- Direct link to meeting room
- Call-to-action to accept/reject

## Security Features

1. **Email Validation**: All email addresses are validated
2. **Role Verification**: Only hosts/cohosts can manage participants
3. **Duplicate Prevention**: System prevents duplicate join requests
4. **Access Control**: Private meetings enforce invitation-only access
5. **State Synchronization**: Join requests update across all host/cohost sessions

## Configuration

### Environment Variables
```env
# Email Configuration
EMAIL_USER=xlumatechnologies@gmail.com
EMAIL_PASSWORD=gbjwsjqvuamadrat
APP_URL=http://localhost:3000
```

### Gmail App Password Setup
1. Enable 2-factor authentication on Gmail
2. Go to Google Account > Security > App Passwords
3. Generate new app password for "Mail"
4. Use the 16-character password (without spaces)

## Testing Checklist

- [ ] Create private meeting with participants
- [ ] Verify email invitations are sent
- [ ] Assign cohosts and verify roles
- [ ] Join as invited participant
- [ ] Try to join as non-invited user
- [ ] Submit join request
- [ ] Verify email notification to hosts
- [ ] Accept join request as host
- [ ] Verify requester can join
- [ ] Reject join request as cohost
- [ ] Verify request disappears after acceptance
- [ ] Test role-based permissions
- [ ] Test participant removal
- [ ] Test cohost assignment/removal

## Next Steps

1. **Real-time Updates**: Implement WebSocket for instant join request updates
2. **Notification System**: Add in-app notifications for join requests
3. **Participant Limits**: Add configurable participant limits
4. **Waiting Room**: Implement waiting room feature
5. **Recording Permissions**: Add recording permission controls
6. **Meeting Analytics**: Track participant join/leave times
7. **Bulk Invitations**: Support CSV import for bulk invitations
8. **Calendar Integration**: Add calendar event creation

## Notes

- Email sending is non-blocking (won't fail meeting creation if email fails)
- Join requests auto-expire after 24 hours
- Polling interval for join requests: 5 seconds
- Maximum participants per meeting: Unlimited (can be configured)
- App password must be used (not regular Gmail password)
- Emails are sent from "Host Name via Luma Meet"

## Troubleshooting

### Emails Not Sending
1. Verify EMAIL_USER and EMAIL_PASSWORD in .env
2. Check Gmail app password is correct (no spaces)
3. Ensure 2FA is enabled on Gmail account
4. Check backend logs for email errors

### Join Requests Not Appearing
1. Verify meeting type is "private"
2. Check user is not already invited
3. Ensure join request routes are registered
4. Check browser console for API errors

### Participants Can't Join
1. Verify invitation was sent successfully
2. Check meeting status (not ended)
3. Verify user email matches invitation
4. Check meeting type and access controls
