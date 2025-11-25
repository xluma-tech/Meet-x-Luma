# 3D Model Feature - Quick Reference

## 🎨 How to Use 3D Models in Your Video Room

### For Model Uploaders

#### Step 1: Upload Your Model
1. Click the **🎨** button in the top-right corner
2. Drag & drop your .glb or .gltf file, or click "Choose File"
3. Wait for upload to complete (1-5 seconds)

#### Step 2: Publish to Room
1. Click **"📢 Publish to Room"** button
2. Your model appears in the top-right corner for everyone
3. Hand gesture control activates automatically

#### Step 3: Control with Hand Gestures
Make sure your webcam can see your hand clearly:

| Gesture | Action | How To |
|---------|--------|--------|
| 👌 **Pinch & Move** | Move model | Touch thumb + index finger, move hand |
| ✋ **Open Hand** | Rotate model | Open hand, move left/right |
| 🤏 **3-Finger Pinch** | Scale model | Pinch thumb + index + middle, spread/close |

#### Step 4: Unpublish When Done
1. Click **"🔒 Unpublish Model"** button
2. Model disappears for everyone
3. You can upload a different model

### For Viewers

**You don't need to do anything!**
- Models appear automatically when someone publishes
- You can see the model and all control updates in real-time
- You cannot control the model (view-only)

## 🎯 Tips for Best Results

### Model Upload
- ✅ Use .glb format (single file, faster)
- ✅ Keep models under 10MB for best performance
- ✅ Test models locally first
- ❌ Don't upload files over 50MB

### Hand Gesture Control
- ✅ Good lighting helps tracking
- ✅ Keep hand 1-2 feet from camera
- ✅ Make clear, deliberate gestures
- ✅ Pause between different gestures
- ❌ Don't move too fast
- ❌ Don't cover your hand

### Performance
- ✅ Close unnecessary browser tabs
- ✅ Use Chrome or Edge for best compatibility
- ✅ Disable hand tracking if experiencing lag
- ❌ Don't have multiple people controlling simultaneously

## 🔧 Troubleshooting

### "Model won't upload"
- Check file size (must be < 50MB)
- Verify file extension (.glb or .gltf only)
- Try a different browser
- Refresh the page and try again

### "Hand tracking not working"
- Allow camera permissions
- Improve room lighting
- Move hand closer to camera
- Try Chrome browser (best support)

### "Model not appearing for others"
- Make sure you clicked "Publish to Room"
- Check that others are in the same room
- Ask others to refresh their browser

### "Control is laggy"
- Close other applications
- Use a simpler model (< 5MB)
- Reduce number of participants
- Check your internet connection

## 📱 Browser Compatibility

| Feature | Chrome | Edge | Firefox | Safari |
|---------|--------|------|---------|--------|
| 3D Models | ✅ | ✅ | ✅ | ✅ |
| Hand Tracking | ✅ | ✅ | ✅ | ⚠️ |
| Upload | ✅ | ✅ | ✅ | ✅ |

✅ = Fully supported  
⚠️ = Partial support  
❌ = Not supported

## 🎓 Hand Gesture Guide

### Pinch & Move (Translation)
```
     👆
    /  \
   👍  👆  ← Pinch these together
    \  /
     \/
     
Then move your hand:
← Left/Right → (X-axis)
↑ Up/Down ↓ (Y-axis)
```

### Open Hand Rotate
```
    ✋
   /||||\ 
  / |||| \
    
Move hand left/right:
← Rotate Left | Rotate Right →
```

### 3-Finger Scale
```
    👆
   / | \
  👍 👆 👆  ← Pinch all three
   \ | /
    \|/
    
Spread fingers: Scale UP ↑
Close fingers: Scale DOWN ↓
```

## 🚀 Advanced Tips

### For Presenters
1. **Practice gestures** before the meeting
2. **Upload model early** to test loading
3. **Use simple models** for large audiences
4. **Announce** when you're about to control the model
5. **Unpublish** when switching topics

### For Developers
1. Models are stored in `backend/data/models/`
2. Control events use Socket.IO
3. Transform state is client-side rendered
4. Only uploader can send control events (server-verified)
5. Models auto-unpublish when uploader leaves

### For Admins
1. Monitor `backend/data/models/` directory size
2. Clean up old models periodically
3. Consider S3/CDN for production
4. Set up rate limiting for uploads
5. Monitor bandwidth usage

## 📊 Performance Metrics

**Expected Performance:**
- Upload time: 1-5 seconds (depends on size)
- Model load: 0.5-2 seconds
- Hand tracking: 15-30 FPS
- Control latency: < 100ms
- Bandwidth: ~800 KB/s per controller

**Recommended Limits:**
- Room size: Up to 200 participants
- Active controllers: 1-5 simultaneous
- Model size: 10-20MB optimal, 50MB max
- Control rate: ~20 updates/second

## 🆘 Support

**Common Issues:**
1. **Model too large**: Compress or simplify in Blender
2. **Hand tracking fails**: Use manual controls (coming soon)
3. **Sync issues**: Refresh browser
4. **Upload fails**: Check file format and size

**Get Help:**
- Check browser console (F12) for errors
- Review TESTING_GUIDE.md for detailed troubleshooting
- Check 3D_MODEL_FEATURE.md for technical details

## 🎉 Best Practices

### Do's ✅
- Test models before important meetings
- Use compressed .glb files
- Ensure good lighting for hand tracking
- Unpublish when done
- Keep models under 10MB

### Don'ts ❌
- Don't upload huge models (> 50MB)
- Don't control too fast
- Don't have multiple controllers
- Don't forget to unpublish
- Don't use in poor lighting

---

**Need more help?** Check the full documentation:
- `3D_MODEL_FEATURE.md` - Technical details
- `TESTING_GUIDE.md` - Testing procedures
- `README.md` - General application info
