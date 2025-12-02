# Private Meeting System - UI Flow Diagram

## Visual Flow Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     PRIVATE MEETING SYSTEM                       │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    1. CREATE MEETING PAGE                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Meeting Title: [Team Standup Meeting____________]              │
│  Description:   [Weekly sync meeting______________]              │
│                                                                  │
│  Meeting Type:                                                   │
│  ┌──────────────┐  ┌──────────────┐                            │
│  │ 🌐 Public    │  │ 🔒 Private   │ ← Selected                 │
│  │ Anyone can   │  │ Invite only  │                            │
│  │ join         │  │              │                            │
│  └──────────────┘  └──────────────┘                            │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ Add Participants                                        │    │
│  ├────────────────────────────────────────────────────────┤    │
│  │ [email@example.com_____] [Participant ▼] [Add]        │    │
│  │                                                         │    │
│  │ Invited Participants (2)                               │    │
│  │ ┌────────────────────────────────────────────────┐    │    │
│  │ │ 👤 alice@example.com        👑 Co-host    [×] │    │    │
│  │ └────────────────────────────────────────────────┘    │    │
│  │ ┌────────────────────────────────────────────────┐    │    │
│  │ │ 👤 bob@example.com          👤 Participant [×] │    │    │
│  │ └────────────────────────────────────────────────┘    │    │
│  │                                                         │    │
│  │ ℹ️ About roles:                                        │    │
│  │ • Co-hosts can manage participants                     │    │
│  │ • All invited users will receive email                 │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
│  [Create Meeting]                                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    2. EMAIL INVITATION                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  From: John Doe via Luma Meet <xlumatechnologies@gmail.com>    │
│  To: alice@example.com                                          │
│  Subject: Meeting Invitation: Team Standup Meeting              │
│                                                                  │
│  ┌───────────────────────────────────────────────────────┐     │
│  │ 🎥 Meeting Invitation                                  │     │
│  │ You've been invited to join a private meeting          │     │
│  ├───────────────────────────────────────────────────────┤     │
│  │ 📧 From: John Doe (john@example.com)                  │     │
│  │                                                         │     │
│  │ Team Standup Meeting                                   │     │
│  │ Weekly sync meeting                                    │     │
│  │                                                         │     │
│  │ Meeting Type: 🔒 Private                               │     │
│  │                                                         │     │
│  │        Meeting Code: ABC123XYZ                         │     │
│  │                                                         │     │
│  │              [Join Meeting]                            │     │
│  │                                                         │     │
│  │ Or copy this link:                                     │     │
│  │ http://localhost:3000/room/ABC123XYZ                   │     │
│  └───────────────────────────────────────────────────────┘     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              3A. INVITED USER JOINS (Direct Access)              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ✅ Validating meeting...                                       │
│  ✅ Checking invitation...                                      │
│  ✅ Access granted!                                             │
│                                                                  │
│  → Enters meeting room directly                                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│         3B. UNAUTHORIZED USER (Join Request Flow)                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌───────────────────────────────────────────────────────┐     │
│  │ 🔒 Private Meeting                                     │     │
│  │ This is a private meeting. Request access to join.    │     │
│  ├───────────────────────────────────────────────────────┤     │
│  │ Meeting: Team Standup Meeting                         │     │
│  ├───────────────────────────────────────────────────────┤     │
│  │ Your Name *                                           │     │
│  │ [Charlie Smith_________________]                      │     │
│  │                                                        │     │
│  │ Email (optional)                                      │     │
│  │ [charlie@example.com___________]                      │     │
│  │                                                        │     │
│  │ [Cancel]  [Request to Join]                           │     │
│  │                                                        │     │
│  │ ℹ️ The host will be notified of your request         │     │
│  └───────────────────────────────────────────────────────┘     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  4. WAITING SCREEN                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│                    ⏰ (animated)                                 │
│                                                                  │
│              Request Sent!                                       │
│         Waiting for host approval...                            │
│                                                                  │
│  ┌───────────────────────────────────────────────────────┐     │
│  │ Meeting: Team Standup Meeting                         │     │
│  │ Code: ABC123XYZ                                       │     │
│  └───────────────────────────────────────────────────────┘     │
│                                                                  │
│  ℹ️ What's happening?                                           │
│  • Your request has been sent to the host                       │
│  • They will receive an email notification                      │
│  • You'll be able to join once they accept                      │
│                                                                  │
│  ● ● ● (animated dots)                                          │
│                                                                  │
│  [Go to Dashboard]  [Back to Home]                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              5. HOST RECEIVES EMAIL NOTIFICATION                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  From: Luma Meet <xlumatechnologies@gmail.com>                 │
│  To: john@example.com                                           │
│  Subject: Join Request for: Team Standup Meeting                │
│                                                                  │
│  ┌───────────────────────────────────────────────────────┐     │
│  │ 🔔 Join Request                                        │     │
│  │ Someone wants to join your meeting                     │     │
│  ├───────────────────────────────────────────────────────┤     │
│  │ New Join Request                                       │     │
│  │                                                         │     │
│  │ Requester: Charlie Smith                              │     │
│  │ Email: charlie@example.com                            │     │
│  │ Meeting: Team Standup Meeting                         │     │
│  │ Meeting Code: ABC123XYZ                               │     │
│  │                                                         │     │
│  │ [Go to Meeting to Accept/Reject]                      │     │
│  └───────────────────────────────────────────────────────┘     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              6. HOST SEES JOIN REQUEST IN MEETING                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌───────────────────────────────────────────────────────┐     │
│  │ 🔔 Join Requests (1)                                   │     │
│  ├───────────────────────────────────────────────────────┤     │
│  │ ┌─────────────────────────────────────────────────┐  │     │
│  │ │ CS  Charlie Smith                               │  │     │
│  │ │     charlie@example.com                         │  │     │
│  │ │     2:30 PM                                     │  │     │
│  │ │                        [Accept] [Reject]        │  │     │
│  │ └─────────────────────────────────────────────────┘  │     │
│  └───────────────────────────────────────────────────────┘     │
│                                                                  │
│  [Video Grid]                                                   │
│  [Chat Panel]                                                   │
│  [Controls]                                                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  7. HOST ACCEPTS REQUEST                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ✅ Join request accepted!                                      │
│  Charlie Smith can now join the meeting                         │
│                                                                  │
│  • Request removed from panel                                   │
│  • Charlie added as participant                                 │
│  • All cohosts see request disappear                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              8. REQUESTER CAN NOW JOIN                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ✅ Your request has been accepted!                             │
│  Joining meeting...                                             │
│                                                                  │
│  → Enters meeting room                                          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Component Breakdown

### 1. ParticipantManager Component
```
┌────────────────────────────────────────────────────────┐
│ Add Participants                                        │
├────────────────────────────────────────────────────────┤
│ Input: Email address                                   │
│ Dropdown: Role (Participant/Co-host)                   │
│ Button: Add                                            │
│                                                         │
│ List: Invited participants                             │
│ - Avatar/Initial                                       │
│ - Email address                                        │
│ - Role badge                                           │
│ - Role dropdown (change role)                          │
│ - Remove button                                        │
│                                                         │
│ Info box: Role descriptions                            │
└────────────────────────────────────────────────────────┘
```

### 2. JoinRequestDialog Component
```
┌────────────────────────────────────────────────────────┐
│ 🔒 Private Meeting                                     │
│ This is a private meeting. Request access to join.    │
├────────────────────────────────────────────────────────┤
│ Meeting: [Meeting Title]                              │
├────────────────────────────────────────────────────────┤
│ Your Name * [_________________]                       │
│ Email (optional) [_________________]                  │
│                                                         │
│ [Cancel] [Request to Join]                            │
│                                                         │
│ ℹ️ Host will be notified                              │
└────────────────────────────────────────────────────────┘
```

### 3. JoinRequestPending Component
```
┌────────────────────────────────────────────────────────┐
│              ⏰ (animated pulse)                       │
│                                                         │
│         Request Sent!                                  │
│    Waiting for host approval...                        │
│                                                         │
│ ┌────────────────────────────────────────────────┐    │
│ │ Meeting: [Title]                                │    │
│ │ Code: [Code]                                    │    │
│ └────────────────────────────────────────────────┘    │
│                                                         │
│ ℹ️ Status information                                  │
│                                                         │
│ ● ● ● (animated loading)                               │
│                                                         │
│ [Go to Dashboard] [Back to Home]                       │
└────────────────────────────────────────────────────────┘
```

### 4. JoinRequestPanel Component
```
┌────────────────────────────────────────────────────────┐
│ 🔔 Join Requests (2)                                   │
├────────────────────────────────────────────────────────┤
│ ┌──────────────────────────────────────────────────┐  │
│ │ CS  Charlie Smith                                │  │
│ │     charlie@example.com                          │  │
│ │     2:30 PM                                      │  │
│ │                          [Accept] [Reject]       │  │
│ └──────────────────────────────────────────────────┘  │
│ ┌──────────────────────────────────────────────────┐  │
│ │ DW  Diana Wilson                                 │  │
│ │     diana@example.com                            │  │
│ │     2:32 PM                                      │  │
│ │                          [Accept] [Reject]       │  │
│ └──────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

## Color Scheme

### Meeting Creation
- Primary: Blue gradient (#667eea → #764ba2)
- Background: Light blue/purple gradient
- Buttons: Blue to purple gradient

### Join Request (Unauthorized)
- Primary: Orange gradient (#f093fb → #f5576c)
- Background: Orange/red gradient
- Alert: Orange/yellow tones

### Join Request Panel
- Background: Orange (#FFF3CD)
- Border: Orange (#FFC107)
- Buttons: Green (Accept), Red (Reject)

### Status Indicators
- Success: Green (#10B981)
- Warning: Yellow/Orange (#F59E0B)
- Error: Red (#EF4444)
- Info: Blue (#3B82F6)

## Responsive Behavior

### Desktop (>1024px)
- Full sidebar with join request panel
- Participant manager in create page
- Side-by-side layout

### Tablet (768px - 1024px)
- Collapsible sidebar
- Join request panel as overlay
- Stacked layout

### Mobile (<768px)
- Bottom sheet for join requests
- Full-screen modals
- Vertical stacking
- Touch-optimized buttons

## Animation States

### Loading
- Spinning circle
- Pulsing dots
- Skeleton screens

### Success
- Checkmark animation
- Fade in/out
- Slide transitions

### Error
- Shake animation
- Red flash
- Error icon bounce

### Notifications
- Slide from top
- Fade in/out
- Badge pulse

## Accessibility Features

### Keyboard Navigation
- Tab through all interactive elements
- Enter to submit forms
- Escape to close modals

### Screen Readers
- ARIA labels on all buttons
- Role attributes
- Live regions for updates
- Descriptive alt text

### Visual
- High contrast mode support
- Focus indicators
- Large touch targets (44x44px minimum)
- Clear error messages

## State Management

```
Meeting Creation
├── formData (title, description, type)
├── participants (array)
├── loading (boolean)
└── error (string)

Join Request Dialog
├── name (string)
├── email (string)
├── loading (boolean)
└── error (string)

Join Request Panel
├── requests (array)
├── loading (boolean)
└── processing (string | null)

Room Wrapper
├── meeting (object)
├── showJoinRequest (boolean)
├── requestPending (boolean)
├── isValidating (boolean)
└── error (string | null)
```

## User Feedback

### Success Messages
- ✅ "Meeting created successfully"
- ✅ "Invitation sent"
- ✅ "Join request accepted"
- ✅ "Participant added"

### Error Messages
- ❌ "Failed to create meeting"
- ❌ "Email already invited"
- ❌ "Invalid email address"
- ❌ "Meeting not found"

### Info Messages
- ℹ️ "Waiting for host approval"
- ℹ️ "Request sent to host"
- ℹ️ "Only invited users can join"
- ℹ️ "Co-hosts can manage participants"
