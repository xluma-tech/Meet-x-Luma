# Room Page Integration Guide

## Adding Join Request Panel to Room Page

### Step 1: Import the Component

Add this import at the top of `frontend/app/room/[id]/page.tsx`:

```typescript
import JoinRequestPanel from '@/components/meeting/JoinRequestPanel';
import { useUser } from '@/lib/useUser';
import { useMeeting } from '@/lib/MeetingContext';
```

### Step 2: Add State for Meeting Info

Inside the RoomPage component, add:

```typescript
const { user } = useUser();
const { meeting } = useMeeting();

// Determine if user is host or cohost
const isHost = meeting?.hostAuth0Id === user?.sub;
const isCohost = meeting?.cohosts?.includes(user?.sub);
const isHostOrCohost = isHost || isCohost;
```

### Step 3: Add the Panel to the UI

Find the section where you render the chat or sidebar, and add the JoinRequestPanel:

```typescript
{/* Join Request Panel - Only for hosts and cohosts */}
{meeting?.type === 'private' && isHostOrCohost && (
  <div className="mb-4">
    <JoinRequestPanel
      meetingCode={roomId}
      userAuth0Id={user?.sub}
      isHostOrCohost={isHostOrCohost}
    />
  </div>
)}
```

### Recommended Placement

The JoinRequestPanel should be placed:
1. **Above the chat panel** - So hosts see requests immediately
2. **In the sidebar** - If you have a sidebar layout
3. **As a floating notification** - For minimal UI interference

### Example Integration

```typescript
// In the return statement of RoomPage component
<div className="room-container">
  {/* Other room components */}
  
  <div className="sidebar">
    {/* Join Request Panel */}
    {meeting?.type === 'private' && isHostOrCohost && (
      <JoinRequestPanel
        meetingCode={roomId}
        userAuth0Id={user?.sub}
        isHostOrCohost={isHostOrCohost}
      />
    )}
    
    {/* Chat Panel */}
    {showChat && (
      <div className="chat-panel">
        {/* Chat content */}
      </div>
    )}
  </div>
</div>
```

### Alternative: Floating Notification Badge

For a less intrusive approach, you can show a badge when there are pending requests:

```typescript
const [pendingRequestCount, setPendingRequestCount] = useState(0);

// Fetch count periodically
useEffect(() => {
  if (meeting?.type === 'private' && isHostOrCohost) {
    const fetchCount = async () => {
      const response = await fetch(`${BACKEND_URL}/api/join-requests/${roomId}`);
      if (response.ok) {
        const data = await response.json();
        setPendingRequestCount(data.data?.length || 0);
      }
    };
    
    fetchCount();
    const interval = setInterval(fetchCount, 5000);
    return () => clearInterval(interval);
  }
}, [meeting, isHostOrCohost, roomId]);

// Show badge
{pendingRequestCount > 0 && (
  <div className="fixed top-4 right-4 z-50">
    <button
      onClick={() => setShowJoinRequests(true)}
      className="bg-orange-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2"
    >
      <span className="font-semibold">{pendingRequestCount} Join Request{pendingRequestCount > 1 ? 's' : ''}</span>
      <span className="animate-pulse">🔔</span>
    </button>
  </div>
)}
```

## Testing the Integration

1. **Create a private meeting** as an authenticated user
2. **Add some participants** before entering the room
3. **Try to join** with a different account (not invited)
4. **Submit a join request** from the unauthorized account
5. **Check the room** as the host - you should see the join request panel
6. **Accept or reject** the request
7. **Verify** the requester can join after acceptance

## Styling Tips

The JoinRequestPanel is already styled, but you can customize:

```css
/* Make it more prominent */
.join-request-panel {
  animation: slideIn 0.3s ease-out;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

@keyframes slideIn {
  from {
    transform: translateY(-20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}
```

## Mobile Considerations

For mobile devices, consider:
1. Making the panel collapsible
2. Showing a notification badge instead of the full panel
3. Using a modal/drawer for the request list

```typescript
const [showRequestsModal, setShowRequestsModal] = useState(false);

// Mobile: Show badge
{isMobile && pendingRequestCount > 0 && (
  <button onClick={() => setShowRequestsModal(true)}>
    <Badge count={pendingRequestCount} />
  </button>
)}

// Mobile: Show modal
{showRequestsModal && (
  <Modal onClose={() => setShowRequestsModal(false)}>
    <JoinRequestPanel {...props} />
  </Modal>
)}
```

## WebSocket Integration (Future Enhancement)

For real-time updates without polling:

```typescript
// In your socket connection
socket.on('join-request-created', (request) => {
  // Add to requests list
  setRequests(prev => [...prev, request]);
  // Show notification
  showNotification('New join request from ' + request.requesterName);
});

socket.on('join-request-processed', (requestId) => {
  // Remove from list
  setRequests(prev => prev.filter(r => r._id !== requestId));
});
```

## Accessibility

Ensure the panel is accessible:

```typescript
<div
  role="region"
  aria-label="Join Requests"
  aria-live="polite"
  aria-atomic="true"
>
  <JoinRequestPanel {...props} />
</div>
```

## Performance Optimization

To avoid unnecessary re-renders:

```typescript
const memoizedPanel = useMemo(() => (
  meeting?.type === 'private' && isHostOrCohost ? (
    <JoinRequestPanel
      meetingCode={roomId}
      userAuth0Id={user?.sub}
      isHostOrCohost={isHostOrCohost}
    />
  ) : null
), [meeting?.type, isHostOrCohost, roomId, user?.sub]);
```
