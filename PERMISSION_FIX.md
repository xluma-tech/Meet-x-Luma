# Permission System Fix

## Issue
When the owner granted control permissions to other participants, they remained in view-only mode and couldn't control the model.

## Root Cause
The `allowedControllers` array was not being:
1. Initialized when a model was published
2. Sent to participants when they joined or when the model was published
3. Properly synchronized across all clients

## Fixes Applied

### 1. Backend - Initialize Permissions on Publish
**File**: `backend/src/server.js`

```javascript
socket.on('model-publish', ({ roomId, modelData }) => {
  const modelRecord = {
    ...modelData,
    uploaderId: socket.id,
    publishedAt: Date.now(),
    seq: 0,
    allowedControllers: [] // ✅ Initialize empty permissions list
  };
  
  // Broadcast with allowedControllers
  io.to(roomId).emit('model-published', {
    modelId: modelRecord.modelId,
    url: modelRecord.url,
    uploaderId: socket.id,
    uploaderName: modelRecord.uploaderName,
    allowedControllers: modelRecord.allowedControllers, // ✅ Include in broadcast
    metadata: modelRecord
  });
});
```

### 2. Frontend - Receive and Store Initial Permissions
**File**: `frontend/app/room/[id]/page.tsx`

```javascript
socketRef.current?.on('model-published', ({ 
  modelId, 
  url, 
  uploaderId, 
  uploaderName, 
  allowedControllers, // ✅ Receive allowedControllers
  metadata 
}) => {
  setRoomModel({
    modelId,
    url: fullUrl,
    uploaderId,
    uploaderName,
    metadata
  });
  
  // ✅ Initialize allowed controllers list
  setAllowedControllers(allowedControllers || []);
  console.log('Initial allowed controllers:', allowedControllers);
});
```

### 3. Debug Logging
Added comprehensive debug logging to track permission state:

```javascript
useEffect(() => {
  console.log('=== Permission State Debug ===');
  console.log('My socket ID:', socketRef.current?.id);
  console.log('Allowed controllers:', allowedControllers);
  console.log('Is model published:', isModelPublished);
  console.log('Room model uploader:', roomModel?.uploaderId);
  const isController = isModelPublished && 
    (roomModel?.uploaderId === socketRef.current?.id || 
     allowedControllers.includes(socketRef.current?.id || ''));
  console.log('Am I controller?', isController);
  console.log('============================');
}, [allowedControllers, isModelPublished, roomModel]);
```

## How It Works Now

### Flow 1: Model Published
1. Owner publishes model
2. Backend creates model record with `allowedControllers: []`
3. Backend broadcasts `model-published` event with `allowedControllers`
4. All participants receive and store the empty array
5. Everyone starts in correct state (owner = controller, others = view-only)

### Flow 2: Permissions Granted
1. Owner checks participant in permissions panel
2. Owner clicks "Apply Permissions"
3. Frontend calls `handlePermissionChange(['userId1', 'userId2'])`
4. Frontend emits `model-permissions` event to backend
5. Backend verifies owner and updates `model.allowedControllers`
6. Backend broadcasts `model-permissions` to ALL participants
7. All participants receive and update their local `allowedControllers` state
8. Allowed participants' `isController` becomes `true`
9. UI updates to show control instructions
10. OrbitControls and pointer events become enabled

### Flow 3: Permissions Revoked
1. Owner unchecks participant
2. Same flow as above, but with participant removed from array
3. Participant's `isController` becomes `false`
4. UI updates to "View-only mode"
5. Controls disabled

## Testing Steps

1. **Open browser console** in both windows to see debug logs
2. **Publish model** as owner
   - Check console: Should see "Initial allowed controllers: []"
3. **Grant permission** to participant
   - Owner console: "Emitting permissions: ['participantId']"
   - Participant console: "Permissions updated: ['participantId']"
   - Participant console: "Am I controller? true"
4. **Verify participant can control**
   - Try dragging model
   - Try scroll zoom
   - Try hand gestures
5. **Revoke permission**
   - Owner unchecks participant
   - Participant console: "Am I controller? false"
   - Verify controls disabled

## Debug Console Output

### Owner Window
```
Initial allowed controllers: []
My socket ID: abc123
Allowed controllers: []
Am I controller? true (because I'm the uploader)
---
Emitting permissions: ['def456']
Permissions updated: ['def456']
Allowed controllers: ['def456']
```

### Participant Window (Before Permission)
```
Initial allowed controllers: []
My socket ID: def456
Allowed controllers: []
Am I controller? false
```

### Participant Window (After Permission)
```
Permissions updated: ['def456']
My socket ID: def456
Allowed controllers: ['def456']
Am I controller? true ✅
```

## Key Changes Summary

1. ✅ Backend initializes `allowedControllers: []` on model publish
2. ✅ Backend includes `allowedControllers` in `model-published` broadcast
3. ✅ Frontend receives and stores `allowedControllers` on model publish
4. ✅ Frontend updates `allowedControllers` on `model-permissions` event
5. ✅ Added debug logging to track permission state changes
6. ✅ `isController` logic checks both owner and allowed list

## Files Modified

- `backend/src/server.js` - Initialize and broadcast allowedControllers
- `frontend/app/room/[id]/page.tsx` - Receive, store, and debug permissions
