# Private Meeting System - Quick Start Guide

## Prerequisites

1. **Backend running** on http://localhost:4000
2. **Frontend running** on http://localhost:3000
3. **MongoDB running** locally or remote connection configured
4. **Gmail app password** configured in backend/.env

## Setup Steps

### 1. Configure Email Service

Edit `backend/.env` (or create from .env.example):

```env
EMAIL_USER=xlumatechnologies@gmail.com
EMAIL_PASSWORD=gbjwsjqvuamadrat
APP_URL=http://localhost:3000
```

### 2. Install Dependencies

```bash
# Backend
cd backend
npm install nodemailer

# Frontend (if needed)
cd frontend
npm install
```

### 3. Start Services

```bash
# Terminal 1 - Backend
cd backend
npm start

# Terminal 2 - Frontend
cd frontend
npm run dev
```

## Testing the Complete Flow

### Test 1: Create Private Meeting with Participants

1. **Sign in** to the application
2. **Go to** http://localhost:3000/create
3. **Fill in** meeting details:
   - Title: "Team Meeting"
   - Description: "Weekly sync"
   - Type: **Private**
4. **Add participants**:
   - Enter email: `participant1@example.com`
   - Role: Participant
   - Click "Add"
   - Enter email: `cohost@example.com`
   - Role: Co-host
   - Click "Add"
5. **Click** "Create Meeting"
6. **Check emails** - Both participants should receive invitation emails

### Test 2: Join as Invited Participant

1. **Open** the invitation email
2. **Click** the "Join Meeting" button
3. **Verify** you can join directly without requesting access

### Test 3: Request to Join (Unauthorized User)

1. **Open** a new incognito window
2. **Go to** http://localhost:3000
3. **Click** "Join Meeting"
4. **Enter** the meeting code from Test 1
5. **See** the "Private Meeting" dialog
6. **Enter** your name and email
7. **Click** "Request to Join"
8. **See** the waiting screen
9. **Check email** - Host and cohost should receive notification

### Test 4: Accept Join Request (Host)

1. **As the host**, go to the meeting room
2. **See** the "Join Requests" panel (orange background)
3. **Review** the requester's information
4. **Click** "Accept"
5. **Verify** the request disappears
6. **Check** as cohost - request should also disappear there

### Test 5: Requester Joins After Acceptance

1. **As the requester**, refresh the waiting screen
2. **Or** try joining again with the meeting code
3. **Verify** you can now join the meeting

### Test 6: Reject Join Request

1. **Repeat** Test 3 with a different user
2. **As host/cohost**, click "Reject" instead
3. **Verify** the request disappears
4. **Requester** remains on waiting screen

## Email Testing

### Check Email Delivery

1. **Log in** to xlumatechnologies@gmail.com
2. **Check** "Sent" folder
3. **Verify** emails were sent

### Email Content Verification

**Meeting Invitation Email should contain:**
- Host name and email
- Meeting title and description
- Meeting code
- Join button with link
- Private meeting indicator

**Join Request Email should contain:**
- Requester name and email
- Meeting title and code
- Link to meeting room

## Troubleshooting

### Emails Not Sending

**Check backend logs:**
```bash
cd backend
npm start
# Look for "✅ Email service ready" or "❌ Email service error"
```

**Verify credentials:**
```bash
# In backend/.env
EMAIL_USER=xlumatechnologies@gmail.com
EMAIL_PASSWORD=gbjwsjqvuamadrat  # No spaces!
```

**Test email service:**
```javascript
// In backend, create test-email.js
const { sendMeetingInvitation } = require('./src/services/emailService');

sendMeetingInvitation({
  to: 'your-test-email@example.com',
  hostName: 'Test Host',
  hostEmail: 'host@example.com',
  meetingTitle: 'Test Meeting',
  meetingCode: 'TEST123',
  meetingType: 'private',
  message: 'This is a test',
}).then(result => {
  console.log('Email result:', result);
}).catch(error => {
  console.error('Email error:', error);
});
```

Run: `node test-email.js`

### Join Requests Not Appearing

**Check API endpoint:**
```bash
curl http://localhost:4000/api/join-requests/YOUR_MEETING_CODE
```

**Check browser console:**
- Open DevTools (F12)
- Go to Console tab
- Look for API errors

**Verify routes are registered:**
```bash
# In backend/src/routes/index.js
# Should have: router.use('/api/join-requests', joinRequestRoutes);
```

### Participants Can't Join

**Check meeting type:**
```bash
curl http://localhost:4000/api/meetings/YOUR_MEETING_CODE
# Verify "type": "private"
```

**Check invitations:**
```javascript
// In MongoDB
db.meetings.findOne({ meetingCode: "YOUR_CODE" })
// Check "invitations" array
```

**Check user email:**
- Ensure user email matches invitation email
- Check Auth0 user profile

## API Testing with cURL

### Create Join Request
```bash
curl -X POST http://localhost:4000/api/join-requests/YOUR_MEETING_CODE \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com"
  }'
```

### Get Join Requests
```bash
curl http://localhost:4000/api/join-requests/YOUR_MEETING_CODE
```

### Accept Join Request
```bash
curl -X POST http://localhost:4000/api/join-requests/REQUEST_ID/accept \
  -H "Content-Type: application/json" \
  -d '{
    "auth0Id": "HOST_AUTH0_ID"
  }'
```

### Reject Join Request
```bash
curl -X POST http://localhost:4000/api/join-requests/REQUEST_ID/reject \
  -H "Content-Type: application/json" \
  -d '{
    "auth0Id": "HOST_AUTH0_ID"
  }'
```

## Database Verification

### Check Meetings Collection
```javascript
// In MongoDB shell or Compass
db.meetings.find({ type: "private" }).pretty()
```

### Check Join Requests Collection
```javascript
db.joinRequests.find({ status: "pending" }).pretty()
```

### Check Invitations
```javascript
db.meetings.findOne(
  { meetingCode: "YOUR_CODE" },
  { invitations: 1 }
)
```

## Common Issues and Solutions

### Issue: "Email service error"
**Solution:** 
- Verify Gmail app password
- Check 2FA is enabled
- Ensure no spaces in password

### Issue: "Join request already exists"
**Solution:**
- Check for duplicate pending requests
- Clear old requests from database
- Use different email

### Issue: "Only host or cohost can accept"
**Solution:**
- Verify user is logged in
- Check user's auth0Id matches host or is in cohosts array
- Verify meeting ownership

### Issue: Emails in spam folder
**Solution:**
- Add xlumatechnologies@gmail.com to contacts
- Mark as "Not Spam"
- Check SPF/DKIM settings (for production)

## Production Checklist

Before deploying to production:

- [ ] Use environment-specific email credentials
- [ ] Set up proper email domain (not Gmail)
- [ ] Configure SPF, DKIM, DMARC records
- [ ] Implement rate limiting for join requests
- [ ] Add email queue system (e.g., Bull, BeeQueue)
- [ ] Set up email delivery monitoring
- [ ] Implement WebSocket for real-time updates
- [ ] Add comprehensive error logging
- [ ] Set up email templates in a template engine
- [ ] Implement email unsubscribe functionality
- [ ] Add GDPR compliance for email storage
- [ ] Set up backup email service provider

## Next Steps

1. **Integrate JoinRequestPanel** into room page (see ROOM_INTEGRATION_GUIDE.md)
2. **Add WebSocket** for real-time join request updates
3. **Implement notifications** for in-app alerts
4. **Add analytics** to track invitation acceptance rates
5. **Create admin panel** for managing meetings and requests
6. **Add bulk invitation** feature for large meetings
7. **Implement waiting room** as alternative to join requests
8. **Add meeting recording** permissions

## Support

For issues or questions:
1. Check backend logs: `cd backend && npm start`
2. Check frontend console: Open DevTools (F12)
3. Review MongoDB data: Use MongoDB Compass
4. Test API endpoints: Use Postman or cURL
5. Verify email service: Check Gmail sent folder

## Resources

- [Nodemailer Documentation](https://nodemailer.com/)
- [Gmail App Passwords](https://support.google.com/accounts/answer/185833)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [Auth0 Documentation](https://auth0.com/docs)
