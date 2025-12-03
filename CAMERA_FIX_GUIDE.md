# Camera and Microphone Fix Guide

## Problem
Sometimes the camera doesn't work for participants or hosts, showing "mediaDevices error" or "DummyCam" placeholders.

## Root Causes

### 1. Permission Issues
- Browser hasn't been granted camera/microphone permissions
- User denied permissions
- Permissions were revoked

### 2. Device Issues
- Camera is already in use by another application
- No camera/microphone device found
- Device is not readable (hardware issue)

### 3. Constraint Issues
- Requested video/audio constraints not supported by device
- Resolution or frame rate too high for device

### 4. Browser Issues
- Browser doesn't support getUserMedia API
- HTTPS required (some browsers block camera on HTTP)
- Browser security settings blocking access

---

## Fixes Implemented

### 1. Better Error Handling

**Location**: `frontend/app/room/[id]/page.tsx`

**Added specific error messages for different scenarios**:

```typescript
.catch((err) => {
  console.error('Error accessing media devices:', err);
  
  let errorMessage = 'Failed to access camera and microphone. ';
  if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
    errorMessage += 'Please allow camera and microphone permissions in your browser settings.';
  } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
    errorMessage += 'No camera or microphone found. Please connect a device.';
  } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
    errorMessage += 'Camera or microphone is already in use by another application.';
  } else if (err.name === 'OverconstrainedError') {
    errorMessage += 'Camera settings are not supported. Trying with default settings...';
    // Retry with minimal constraints
  }
  
  alert(errorMessage);
});
```

### 2. Fallback to Basic Constraints

**When advanced constraints fail, retry with basic settings**:

```typescript
if (err.name === 'OverconstrainedError') {
  // Retry with minimal constraints
  navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
  }).then((stream) => {
    // Success with fallback
  });
}
```

### 3. Browser Compatibility Check

**Check if getUserMedia is supported**:

```typescript
if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
  console.error('Media devices not supported in this browser');
  alert('Your browser does not support camera and microphone access.');
  return;
}
```

### 4. Enhanced Logging

**Added detailed logging for debugging**:

```typescript
console.log('🎥 Requesting camera and microphone access...');
// ... after success
console.log('✅ Media devices accessed successfully');
console.log('Video tracks:', stream.getVideoTracks().length);
console.log('Audio tracks:', stream.getAudioTracks().length);
```

### 5. Graceful Degradation

**Allow joining without media if access fails**:

```typescript
.catch((err) => {
  // Show error message
  alert(errorMessage);
  
  // Still join the room without media (audio-only or no media mode)
  socketRef.current?.emit('join-room', { roomId, userName });
});
```

---

## Common Error Types

### NotAllowedError / PermissionDeniedError
**Cause**: User denied permission or browser blocked access
**Solution**: 
- Click the camera icon in browser address bar
- Allow camera and microphone access
- Refresh the page

### NotFoundError / DevicesNotFoundError
**Cause**: No camera or microphone detected
**Solution**:
- Connect a camera/microphone
- Check device manager (Windows) or System Preferences (Mac)
- Try a different USB port

### NotReadableError / TrackStartError
**Cause**: Device is in use by another application
**Solution**:
- Close other applications using the camera (Zoom, Teams, Skype, etc.)
- Restart the browser
- Restart the computer if needed

### OverconstrainedError
**Cause**: Requested settings not supported by device
**Solution**:
- System automatically retries with basic settings
- If still fails, device may not support video calls

### AbortError
**Cause**: getUserMedia was interrupted
**Solution**:
- Usually temporary, refresh the page
- Check if another tab is using the camera

---

## Troubleshooting Steps

### For Users:

1. **Check Browser Permissions**
   - Chrome: Click 🔒 or 🎥 icon in address bar → Site settings → Camera/Microphone → Allow
   - Firefox: Click 🔒 icon → Permissions → Camera/Microphone → Allow
   - Edge: Same as Chrome
   - Safari: Safari menu → Settings for This Website → Camera/Microphone → Allow

2. **Check System Permissions** (Mac)
   - System Preferences → Security & Privacy → Privacy
   - Camera → Check your browser
   - Microphone → Check your browser

3. **Check System Permissions** (Windows)
   - Settings → Privacy → Camera → Allow apps to access camera
   - Settings → Privacy → Microphone → Allow apps to access microphone

4. **Close Conflicting Applications**
   - Close Zoom, Teams, Skype, Discord, etc.
   - Close other browser tabs using camera
   - Restart browser

5. **Test Camera**
   - Windows: Camera app
   - Mac: Photo Booth
   - Online: https://webcamtests.com/

6. **Update Browser**
   - Use latest version of Chrome, Firefox, Edge, or Safari
   - Clear browser cache and cookies

7. **Check HTTPS**
   - Camera access requires HTTPS (except localhost)
   - Verify URL starts with `https://`

### For Developers:

1. **Check Console Logs**
   ```
   🎥 Requesting camera and microphone access...
   ✅ Media devices accessed successfully
   Video tracks: 1
   Audio tracks: 1
   📡 Joining room: ABC123 as John
   ```

2. **Check for Errors**
   ```
   Error accessing media devices: NotAllowedError
   ```

3. **Test getUserMedia Directly**
   ```javascript
   navigator.mediaDevices.getUserMedia({ video: true, audio: true })
     .then(stream => console.log('Success:', stream))
     .catch(err => console.error('Error:', err));
   ```

4. **Check Available Devices**
   ```javascript
   navigator.mediaDevices.enumerateDevices()
     .then(devices => console.log('Devices:', devices));
   ```

5. **Monitor Stream State**
   ```javascript
   stream.getTracks().forEach(track => {
     console.log(track.kind, track.enabled, track.readyState);
   });
   ```

---

## Browser Support

| Browser | Version | Support |
|---------|---------|---------|
| Chrome | 53+ | ✅ Full |
| Firefox | 36+ | ✅ Full |
| Edge | 79+ | ✅ Full |
| Safari | 11+ | ✅ Full |
| Opera | 40+ | ✅ Full |
| IE | Any | ❌ Not Supported |

---

## Testing Checklist

### Before Deployment:
- [ ] Test on Chrome (Windows/Mac)
- [ ] Test on Firefox (Windows/Mac)
- [ ] Test on Safari (Mac)
- [ ] Test on Edge (Windows)
- [ ] Test on mobile browsers (Chrome/Safari)
- [ ] Test with camera denied
- [ ] Test with no camera
- [ ] Test with camera in use
- [ ] Test with low-end camera
- [ ] Test with multiple cameras
- [ ] Test on HTTP vs HTTPS
- [ ] Test with VPN/firewall

### During Testing:
- [ ] Check console for errors
- [ ] Verify video tracks are created
- [ ] Verify audio tracks are created
- [ ] Check video element srcObject
- [ ] Verify peer connections
- [ ] Test mute/unmute
- [ ] Test camera on/off
- [ ] Test screen share

---

## Quick Fixes

### Camera Not Showing
1. Check browser console for errors
2. Verify permissions are granted
3. Refresh the page
4. Try incognito/private mode
5. Try different browser

### Camera Shows Black Screen
1. Check if camera is covered
2. Check camera privacy shutter
3. Update camera drivers
4. Try different camera
5. Restart computer

### Camera Freezes
1. Check internet connection
2. Close other applications
3. Reduce video quality (low power mode)
4. Refresh the page
5. Clear browser cache

### Audio Not Working
1. Check microphone permissions
2. Check system volume/mute
3. Check browser mute icon
4. Test microphone in system settings
5. Try different microphone

---

## Prevention

### Best Practices:
1. Always request permissions early
2. Provide clear error messages
3. Offer fallback options
4. Test on multiple devices
5. Monitor error rates
6. Provide help documentation
7. Add retry mechanisms
8. Use feature detection
9. Handle edge cases
10. Log errors for debugging

### User Education:
1. Show permission instructions
2. Provide troubleshooting guide
3. Link to browser help pages
4. Offer live support
5. Create video tutorials

---

## Related Files

- `frontend/app/room/[id]/page.tsx` - Main room component with getUserMedia
- `frontend/app/room/[id]/hooks/usePictureInPicture.ts` - PiP functionality
- `frontend/app/room/[id]/components/VideoCard.tsx` - Video rendering
- `frontend/app/room/[id]/RoomWrapper.tsx` - Room access control

---

## Additional Resources

- [MDN getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)
- [WebRTC Troubleshooting](https://webrtc.github.io/samples/)
- [Browser Compatibility](https://caniuse.com/stream)
- [Camera Test Tool](https://webcamtests.com/)
