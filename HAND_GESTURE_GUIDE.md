# 🖐️ Hand Gesture Control Guide

## Overview
Control 3D models in your video room using intuitive hand gestures! No mouse or keyboard needed - just use your hands in front of your camera.

---

## 🎯 How to Activate

1. **Upload a 3D Model**
   - Click the 🎨 button in the top-right corner
   - Upload a .glb or .gltf file
   - Click **"📢 Publish to Room"**

2. **Hand Control Activates Automatically**
   - Look for the green badge: **"👋 Hand Control Active"** in the bottom-right
   - Your main camera will now detect hand gestures
   - No separate window - uses your existing camera feed

---

## ✋ The 3 Gestures

### 1. ✌️ MOVE (Peace Sign)
**What it does:** Moves the model left, right, up, or down

**How to do it:**
1. Make a **peace sign** (index + middle finger extended, others closed)
2. Keep the two fingers close together
3. Move your hand in any direction
4. The model follows your hand movement

**Tips:**
- Keep index and middle fingers together
- Other fingers should be closed (fist)
- Move smoothly for precise positioning
- Works in all directions

---

### 2. 🔄 ROTATE (Open Hand Swipe)
**What it does:** Rotates the model around its center

**How to do it:**
1. Open your hand fully (all 5 fingers extended and spread)
2. Keep your hand flat and visible
3. Move your hand **left or right**
4. The model rotates as you move

**Tips:**
- Spread fingers apart (not together)
- Keep your hand open and flat
- Move horizontally (left/right) for best results
- Larger movements = faster rotation

---

### 3. 👊 ZOOM (Fist Up/Down)
**What it does:** Makes the model bigger or smaller

**How to do it:**
1. Make a **closed fist** (all fingers closed)
2. Keep your fist tight
3. Move your hand **UP** (zoom in / bigger) or **DOWN** (zoom out / smaller)
4. The model scales up or down

**Tips:**
- Keep all fingers closed in a fist
- Move vertically (up/down) not forward/back
- UP = bigger, DOWN = smaller
- Smooth movements work best

---

## 📋 Quick Reference

| Gesture | Hand Shape | Movement | Result |
|---------|------------|----------|--------|
| ✌️ **Move** | Peace sign (2 fingers) | Any direction | Model moves X/Y |
| 🔄 **Rotate** | Open hand (5 fingers spread) | Left/Right | Model rotates |
| 👊 **Zoom** | Closed fist | Up/Down | Model scales |

---

## 💡 Pro Tips

### For Best Results:
- ✅ **Good lighting** - Make sure your face/hands are well-lit
- ✅ **Clear background** - Solid backgrounds work better
- ✅ **Hand visible** - Keep your entire hand in frame
- ✅ **Steady movements** - Smooth, deliberate gestures work best
- ✅ **One hand** - Use your dominant hand only

### Common Issues:

**"Gestures not detected"**
- Move your hand closer to the camera
- Improve lighting in your room
- Make sure your whole hand is visible
- Try making the gesture more pronounced

**"Model moving too fast/slow"**
- Adjust your hand movement speed
- Smaller movements = finer control
- Larger movements = faster changes

**"Wrong gesture detected"**
- Make gestures more distinct
- Pause between different gestures
- Ensure fingers are clearly together or apart

---

## 🎮 Practice Exercises

### Exercise 1: Basic Movement
1. Make a peace sign ✌️
2. Move your hand in a circle
3. Watch the model follow your movement
4. Close your hand to stop

### Exercise 2: Rotation
1. Open your hand fully (spread fingers)
2. Move left slowly, then right
3. Watch the model spin
4. Try different speeds

### Exercise 3: Zoom Control
1. Make a closed fist 👊
2. Move hand UP (model gets bigger)
3. Move hand DOWN (model gets smaller)
4. Find the perfect size

### Exercise 4: Combination
1. Fist up to zoom in
2. Open hand to rotate
3. Peace sign to reposition
4. Master all three gestures!

---

## 🔧 Technical Details

### How It Works:
1. **MediaPipe Hands** - Google's ML model detects 21 hand landmarks
2. **Gesture Recognition** - Calculates distances between key points
3. **Real-time Processing** - Runs at ~30 FPS on your camera feed
4. **WebSocket Sync** - Sends control events to other participants
5. **3D Rendering** - Three.js updates model in real-time

### Performance:
- **Latency**: < 100ms from gesture to model update
- **FPS**: 60-120 FPS for smooth rendering
- **Bandwidth**: ~4 KB/s for control events
- **CPU Usage**: +10-15% when hand tracking active

### Privacy:
- ✅ All processing happens **locally** in your browser
- ✅ Only control events (numbers) sent to server
- ✅ No hand images or video sent anywhere
- ✅ Hand tracking stops when you unpublish the model

---

## 🎨 Advanced Usage

### Precise Control:
- **Fine adjustments**: Make tiny hand movements
- **Lock axis**: Move only horizontally or vertically
- **Smooth rotation**: Slow, steady hand movements

### Multiple Models:
- Only the **uploader** can control their model
- Others see the model update in real-time
- One model active per room at a time

### Fallback Controls:
- **Mouse**: Click and drag to rotate (always available)
- **Scroll**: Zoom in/out with mouse wheel
- **Keyboard**: Coming soon!

---

## 🆘 Troubleshooting

### Hand tracking not starting:
1. Check camera permissions in browser
2. Refresh the page
3. Try a different browser (Chrome recommended)
4. Check console for errors (F12)

### Model not responding:
1. Make sure you're the one who uploaded it
2. Check for green "Hand Control Active" badge
3. Verify model is published (not just uploaded)
4. Try unpublishing and republishing

### Performance issues:
1. Close other browser tabs
2. Enable Low Power Mode (⚡ button)
3. Use a simpler 3D model (< 10MB)
4. Reduce number of participants

### Gestures conflicting:
1. Make clear, distinct gestures
2. Pause 1 second between gestures
3. Fully open or close your hand
4. Keep hand steady when not gesturing

---

## 📱 Browser Compatibility

| Browser | Desktop | Mobile | Hand Tracking |
|---------|---------|--------|---------------|
| Chrome | ✅ Full | ✅ Full | ✅ Excellent |
| Edge | ✅ Full | ✅ Full | ✅ Excellent |
| Firefox | ✅ Full | ✅ Full | ✅ Good |
| Safari | ✅ Full | ⚠️ Limited | ⚠️ Fair |

**Recommended**: Chrome or Edge on desktop for best experience

---

## 🎓 Learning Path

### Beginner (5 minutes):
1. Upload a simple model
2. Practice the pinch gesture
3. Move the model around
4. Get comfortable with basic control

### Intermediate (10 minutes):
1. Master all 3 gestures
2. Combine gestures smoothly
3. Position model precisely
4. Show others in your room

### Advanced (15+ minutes):
1. Quick gesture switching
2. Precise micro-adjustments
3. Smooth, fluid control
4. Teach others the gestures

---

## 🌟 Best Practices

### For Presenters:
1. **Practice first** - Get comfortable before the meeting
2. **Announce gestures** - Tell viewers what you're doing
3. **Move slowly** - Smooth movements look professional
4. **Reset position** - Center model before major changes
5. **Unpublish when done** - Clean up after your demo

### For Viewers:
1. **Watch and learn** - See how the presenter controls it
2. **Ask questions** - Request specific angles or zoom
3. **Be patient** - Hand control takes practice
4. **Try it yourself** - Upload your own model to practice

---

## 🚀 Future Features (Coming Soon)

- [ ] Two-hand gestures for advanced control
- [ ] Custom gesture mapping
- [ ] Gesture recording/playback
- [ ] Keyboard shortcuts as fallback
- [ ] Voice commands integration
- [ ] AR mode for mobile devices

---

## 📞 Need Help?

**Quick Fixes:**
- Refresh the page (Ctrl+R)
- Check camera permissions
- Improve lighting
- Try a different browser

**Still stuck?**
- Check the console (F12) for errors
- Review the TESTING_GUIDE.md
- Check 3D_MODEL_FEATURE.md for technical details

---

## 🎉 Have Fun!

Hand gesture control makes 3D model presentations interactive and engaging. Practice the gestures, experiment with different models, and enjoy the magic of controlling 3D objects with just your hands!

**Remember**: 
- ✌️ Peace Sign = Move
- ✋ Open Hand (spread) = Rotate  
- 👊 Fist Up/Down = Zoom

Happy gesturing! 👋
