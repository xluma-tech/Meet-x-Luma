# WebRTC Remote Video Stream Fix - Summary

## Problem
Remote video streams were not visible between users due to WebRTC signaling disorder and peer lifecycle issues.

## Root Causes
1. **Side-effect in render**: URL manipulation happening during render in RoomWrapper
2. **Incorrect peer initiator logic**: Both peers trying to be initiators, causing "Cannot set remote answer in state stable" errors
3. **Race conditions**: Signals arriving before peers were created
4. **Duplicate peers**: Same peer being added multiple times

## Fixes Applied

### 1. RoomWrapper.tsx - Move URL Side-Effect to useEffect
**Before**: URL manipulation happened directly in render
```typescript
// In render body
const currentUrl = new URL(window.location.href);
if (!currentUrl.searchParams.has('name')) {
  currentUrl.searchParams.set('name', userName);
  window.history.replaceState({}, '', currentUrl.toString());
}
```

**After**: Moved to useEffect
```typescript
useEffect(() => {
  if (!userName) return;
  if (typeof window === 'undefined') return;

  const currentUrl = new URL(window.location.href);
  if (!currentUrl.searchParams.has('name')) {
    currentUrl.searchParams.set('name', userName);
    window.history.replaceState({}, '', currentUrl.toString());
  }
}, [userName]);
```

### 2. page.tsx - Fixed WebRTC Peer Role Logic

#### Rule: New user = Initiator, Existing users = Non-initiator

**A. existing-users handler (New user side)**

**Before**: New user created non-initiator peers (WRONG)
```typescript
const peer = addPeer(user.userId, stream); // initiator: false ❌
```

**After**: New user creates initiator peers (CORRECT)
```typescript
const peer = createPeer(user.userId, stream); // initiator: true ✅
console.log('📞 I am the NEW user, initiating connection to existing user');
```

**B. user-joined handler (Existing users side)**

**Before**: Existing users created initiator peers (WRONG)
```typescript
const peer = createPeer(userId, stream); // initiator: true ❌
console.log('📞 I am an existing user, initiating connection to new user');
```

**After**: Existing users create non-initiator peers (CORRECT)
```typescript
const peer = addPeer(userId, stream); // initiator: false ✅
console.log('👂 I am an EXISTING user, creating NON-INITIATOR peer, waiting for offer from new user');
```

Added self-event check:
```typescript
if (userId === socketRef.current?.id) {
  console.log('🔁 user-joined event for myself, ignoring');
  return;
}
```

### 3. page.tsx - Hardened Signal Handler

**Before**: Signals from unknown peers were ignored
```typescript
if (!item) {
  console.warn('⚠️ Received signal from unknown peer, ignoring');
  return;
}
```

**After**: Lazy peer creation for race conditions
```typescript
if (!item) {
  console.warn('⚠️ No peer found, creating NON-INITIATOR peer on-the-fly');
  
  const peer = addPeer(from, localStreamRef.current); // initiator: false
  const newPeer: Peer = {
    peer,
    userId: from,
    userName: 'Unknown',
  };
  
  peersRef.current.push(newPeer);
  setPeers([...peersRef.current]);
  item = newPeer;
}
```

## Expected Behavior After Fix

### When User 2 joins a room with User 1:

**User 1 (Existing user) logs:**
```
👋 New user joined: User 2 userId: xyz123
👂 I am an EXISTING user, creating NON-INITIATOR peer, waiting for offer from new user: xyz123
✅ Non-initiator peer added for xyz123
📨 Received signal from xyz123 (offer)
🔍 Peer signaling state for xyz123: have-remote-offer
✅ Signal applied for xyz123
✅ Received camera stream from xyz123
```

**User 2 (New user) logs:**
```
👥 Existing users in room: 1
📞 I am the NEW user, initiating connection to existing user: User 1 userId: abc456
✅ Ready, initiated connections to 1 existing users
📡 Sending signal to abc456 (offer)
📨 Received signal from abc456 (answer)
🔍 Peer signaling state for abc456: stable
✅ Signal applied for abc456
✅ Received camera stream from abc456
```

### Result:
- ✅ No "Cannot set remote answer in state stable" errors
- ✅ Both users see each other's video
- ✅ No duplicate peer cards
- ✅ Clean signaling flow

## WebRTC Signaling Flow

```
New User (Initiator)          Existing User (Non-initiator)
      |                                |
      |--- join-room ----------------->|
      |<-- existing-users -------------|
      |                                |
      |                                |<-- user-joined
      |                                |
createPeer(initiator=true)      addPeer(initiator=false)
      |                                |
      |--- offer -------------------->|
      |                                |
      |                         (process offer)
      |                                |
      |<-- answer ---------------------|
      |                                |
(process answer)                       |
      |                                |
      |<====== ICE candidates =======>|
      |                                |
      |<====== Media streams ========>|
      |                                |
    ✅ Connected                     ✅ Connected
```

## Testing Checklist

- [ ] Open Room A as User 1, join with name "User 1"
- [ ] Open same Room A as User 2, join with name "User 2"
- [ ] Verify User 1 sees User 2's video
- [ ] Verify User 2 sees User 1's video
- [ ] Check console logs match expected pattern
- [ ] Verify no "stable state" errors
- [ ] Test with 3+ users
- [ ] Test user leaving and rejoining

## Notes

- Screen sharing logic was not modified (focus on camera peers first)
- STUN/TURN configuration is already in place with multiple servers
- Audio analyser for active speaker detection is working
- Video components (VideoCard) already handle stream display correctly
