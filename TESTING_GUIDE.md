# Testing Guide - 3D Model Feature

## Quick Start

### 1. Start the Development Servers

**Backend:**
```bash
cd backend
npm run dev
```

**Frontend:**
```bash
cd frontend
npm run dev
```

Or use the provided batch file:
```bash
start-dev.bat
```

### 2. Access the Application
1. Open browser: `http://localhost:3000`
2. Create or join an event
3. Enter a room with a name

### 3. Test 3D Model Upload

#### Get Test Models
Download free 3D models in .glb format from:
- **Sketchfab**: https://sketchfab.com/features/gltf (filter by "Downloadable")
- **glTF Sample Models**: https://github.com/KhronosGroup/glTF-Sample-Models/tree/master/2.0
- **Poly Haven**: https://polyhaven.com/models (export as GLB)

**Recommended test models:**
- Simple cube or sphere (< 1MB)
- Character model (5-10MB)
- Complex scene (20-30MB)

#### Upload Process
1. Click the 🎨 button in the room header
2. Drag & drop a .glb file or click "Choose File"
3. Wait for upload to complete
4. Click "Publish to Room"
5. Model appears in top-right corner

### 4. Test Hand Gesture Control

**Requirements:**
- Webcam enabled
- Good lighting
- Clear view of your hand

**Gestures to Test:**

1. **Pinch & Move**
   - Bring thumb and index finger together (pinch)
   - Move your hand while pinching
   - Model should translate in X/Y plane

2. **Rotate**
   - Open your hand (all fingers extended)
   - Move hand left/right
   - Model should rotate around Y-axis

3. **Scale**
   - Pinch with thumb, index, and middle finger
   - Move fingers apart/together
   - Model should scale up/down

### 5. Test Multi-User Scenarios

**Test with 2+ browser windows:**

**Window 1 (Uploader):**
1. Upload and publish a model
2. Control it with hand gestures
3. Verify hand tracking overlay appears

**Window 2+ (Viewers):**
1. Join the same room
2. Verify model appears automatically
3. Verify model updates in real-time as uploader controls it
4. Verify you cannot control the model (view-only)

**Test Cleanup:**
1. Uploader clicks "Unpublish Model"
2. Verify model disappears for all viewers
3. Uploader leaves room
4. Verify model auto-unpublishes

## Testing Checklist

### Upload & Publishing
- [ ] Upload .glb file (< 50MB)
- [ ] Upload .gltf file
- [ ] Try uploading invalid file type (should reject)
- [ ] Try uploading file > 50MB (should reject)
- [ ] Publish model to room
- [ ] Unpublish model from room
- [ ] Upload different model while one is published

### Hand Gesture Control
- [ ] Pinch gesture detected
- [ ] Move gesture translates model
- [ ] Rotation gesture works
- [ ] Scale gesture works
- [ ] Hand tracking overlay shows video feed
- [ ] Hand landmarks drawn on video
- [ ] Gestures stop when hand not visible

### Multi-User Sync
- [ ] Model appears for all users when published
- [ ] Control events sync in real-time
- [ ] Only uploader can control
- [ ] Viewers see smooth updates
- [ ] Model unpublishes for all when uploader unpublishes
- [ ] Model auto-unpublishes when uploader leaves

### Performance
- [ ] Video/audio quality unchanged
- [ ] Screen sharing still works
- [ ] No lag in video with model active
- [ ] Hand tracking runs at acceptable FPS
- [ ] Model renders smoothly
- [ ] Multiple participants (5-10) with model active

### Edge Cases
- [ ] Upload model, don't publish, leave room
- [ ] Publish model, refresh page (should auto-unpublish)
- [ ] Two users try to upload models (only one active)
- [ ] Network disconnect during control
- [ ] Very large model (30-50MB)
- [ ] Model with animations
- [ ] Model with textures

## Troubleshooting

### Model Won't Upload
- Check file size (< 50MB)
- Verify file extension (.glb or .gltf)
- Check browser console for errors
- Verify backend is running

### Hand Tracking Not Working
- Allow camera permissions
- Improve lighting
- Move hand closer to camera
- Try different browser (Chrome recommended)
- Check browser console for MediaPipe errors

### Model Not Appearing
- Check browser console for loading errors
- Verify model URL is accessible
- Try simpler model (< 5MB)
- Check WebGL support in browser

### Control Events Not Syncing
- Check Socket.IO connection
- Verify you're the uploader
- Check browser console for errors
- Verify backend is receiving events

### Performance Issues
- Reduce model complexity
- Close other applications
- Try different browser
- Disable hand tracking temporarily
- Reduce number of participants

## Browser Console Commands

**Check Socket.IO connection:**
```javascript
// In browser console
window.socketRef?.current?.connected
```

**Check model state:**
```javascript
// Check if model is loaded
document.querySelector('canvas')
```

**Force unpublish (for testing):**
```javascript
// In browser console (uploader only)
window.socketRef?.current?.emit('model-unpublish', { roomId: 'YOUR_ROOM_ID' })
```

## Performance Benchmarks

**Expected Performance:**
- Model upload: 1-5 seconds (depends on size)
- Model load time: 0.5-2 seconds
- Hand tracking FPS: 15-30 FPS
- Control event latency: < 100ms
- Network bandwidth: ~800 KB/s per active controller

**Acceptable Limits:**
- Room size: Up to 200 participants
- Active controllers: 1-5 simultaneous
- Model size: Up to 50MB
- Control event rate: ~20 Hz

## Known Limitations

1. **One Model Per Room**: Only one model can be active at a time
2. **Uploader Control Only**: Only the person who uploaded can control
3. **Hand Tracking Browser Support**: Best on Chrome/Edge desktop
4. **Model Format**: Only .glb and .gltf supported
5. **No Persistence**: Models cleared when room is empty

## Next Steps After Testing

1. **Production Deployment**:
   - Move model storage to S3 + CloudFront
   - Add Redis for pub/sub scaling
   - Implement rate limiting
   - Add monitoring/logging

2. **Feature Enhancements**:
   - Multiple models per room
   - Model annotations
   - Recording/playback
   - Manual controls fallback

3. **Optimization**:
   - Server-side model compression
   - Progressive loading
   - LOD (Level of Detail)
   - Texture optimization
