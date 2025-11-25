# 3D Model Upload & Hand Gesture Control Feature

## Overview
This feature allows participants in a video room to upload, publish, and control 3D models using hand gestures. The implementation follows a server-authoritative architecture optimized for ~200 participants.

## Architecture

### Backend (Node.js + Socket.IO)
- **Model Upload**: Handles .glb/.gltf file uploads (max 50MB) via multer
- **Model Storage**: Files stored in `backend/data/models/` directory
- **Permission System**: Only the uploader can send control events
- **Event Broadcasting**: Server verifies and rebroadcasts control events to all room participants
- **Sequence Numbers**: Ensures ordered event delivery

### Frontend (Next.js + React + Three.js)
- **3D Rendering**: Uses @react-three/fiber for client-side model rendering
- **Hand Gesture Detection**: MediaPipe Hands for real-time gesture recognition
- **Control Events**: Compact delta updates sent at ~20Hz when gestures detected
- **CDN-Ready**: Models loaded from server URL (can be replaced with S3/CDN)

## Features

### 1. Model Upload
- Drag & drop or file picker interface
- Supports .glb and .gltf formats
- 50MB file size limit
- Automatic validation

### 2. Model Publishing
- Uploader can publish model to room
- All participants see the model in real-time
- Model appears in floating overlay (top-right)
- Only one model per room at a time

### 3. Hand Gesture Control
**Only the uploader can control the model:**

- **Pinch & Move** (thumb + index finger): Translate model in X/Y plane
- **Open Hand Rotation**: Rotate model around Y-axis
- **3-Finger Pinch**: Scale model up/down

### 4. Real-time Synchronization
- Control events broadcast to all participants
- Smooth interpolation for remote viewers
- Sequence numbers prevent out-of-order updates
- Automatic cleanup when uploader leaves

## Usage

### For Uploaders:
1. Click the 🎨 button in the room header
2. Upload a .glb or .gltf file
3. Click "Publish to Room"
4. Use hand gestures to control the model
5. Click "Unpublish Model" when done

### For Viewers:
- Model appears automatically when published
- View-only mode (no control)
- Model updates in real-time as uploader controls it

## Technical Details

### Control Event Format
```javascript
{
  type: 'model-control',
  roomId: string,
  modelId: string,
  seq: number,        // Sequence number
  ts: number,         // Timestamp
  payload: {
    transform: {
      position: [x, y, z],
      rotation: [rx, ry, rz],
      scale: [sx, sy, sz]
    }
  }
}
```

### Scalability Considerations
- **Bandwidth**: ~200 bytes per control event × 20 Hz × 199 viewers = ~800 KB/s per active controller
- **Recommendation**: Limit to 1-5 concurrent model controllers per room
- **Optimization**: Events are only sent when gestures are detected (not continuous)
- **CDN**: Replace local storage with S3 + CloudFront for production

### Rate Limiting
- Control events throttled to ~20 Hz
- Server-side validation prevents unauthorized control
- Automatic cleanup on disconnect

## Files Modified/Created

### Backend
- `backend/src/server.js` - Added model upload, storage, and control event routing
- `backend/data/models/` - Model storage directory (auto-created)

### Frontend
- `frontend/app/room/[id]/page.tsx` - Integrated 3D model UI and state management
- `frontend/app/room/[id]/components/ModelViewer.tsx` - Three.js 3D model renderer
- `frontend/app/room/[id]/components/HandGestureControl.tsx` - MediaPipe hand tracking
- `frontend/app/room/[id]/components/ModelUploadPanel.tsx` - Upload UI component

### Dependencies Added
**Backend:**
- `multer` - File upload handling

**Frontend:**
- `three` - 3D rendering engine
- `@react-three/fiber` - React renderer for Three.js
- `@react-three/drei` - Three.js helpers
- `@mediapipe/hands` - Hand tracking ML model
- `@mediapipe/camera_utils` - Camera utilities for MediaPipe

## Performance Notes

### Video Architecture Preserved
- Existing WebRTC peer connections unchanged
- Screen sharing continues to work independently
- No impact on video/audio quality or latency

### 3D Model Rendering
- Client-side rendering (no server composition)
- Models loaded once from CDN
- Minimal CPU/GPU usage for static viewing
- Controller uses slightly more resources for gesture detection

### Network Optimization
- Models cached by browser after first load
- Control events are tiny (< 200 bytes)
- Events only sent during active gestures
- No continuous polling or streaming

## Future Enhancements
1. **CDN Integration**: Move model storage to S3 + CloudFront
2. **Model Optimization**: Server-side GLB compression and LOD generation
3. **Multi-Model Support**: Allow multiple models per room
4. **Annotation Tools**: Add drawing/pointer tools for models
5. **Recording**: Save model interactions for playback
6. **Permissions**: Fine-grained control over who can upload/control

## Browser Compatibility
- **3D Models**: All modern browsers with WebGL support
- **Hand Gestures**: Chrome, Edge, Firefox, Safari (desktop and mobile)
- **Fallback**: Manual controls available if hand tracking fails

## Security
- File type validation (only .glb/.gltf)
- File size limits (50MB)
- Server-side permission checks
- Automatic cleanup on disconnect
- No script execution from uploaded models
