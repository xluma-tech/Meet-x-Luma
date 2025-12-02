# 3D Model Texture Debugging Guide

## Changes Made to Fix Texture Issues

### 1. **Material Processing Improvements**
- **Vertex Colors Support**: Now detects and enables vertex colors if present in the model
- **Double-Sided Rendering**: Changed from `FrontSide` to `DoubleSide` to ensure all faces are visible
- **Color Correction**: Automatically fixes black materials (0x000000) to white (0xffffff)
- **Material Array Support**: Handles models with multiple materials per mesh

### 2. **Texture Configuration**
- **Color Space**: Set to `THREE.SRGBColorSpace` for accurate color reproduction
- **Anisotropic Filtering**: Increased to 16x (device max) for sharper textures
- **Texture Wrapping**: Set to `RepeatWrapping` for proper UV mapping
- **Mipmap Generation**: Enabled for better texture quality at different distances

### 3. **DRACO Compression Support**
- Added DRACOLoader for compressed GLTF/GLB models
- Uses Google's CDN for decoder files (works on all devices)

### 4. **Lighting Adjustments**
- Increased ambient light to 1.0 for better base visibility
- Balanced directional lights for neutral illumination
- Removed excessive point lights that were washing out colors

### 5. **Renderer Configuration**
- Proper color space management (sRGB)
- ACES Filmic tone mapping for realistic colors
- Frustum culling disabled to prevent disappearing meshes

## How to Debug Your Model

### Check Browser Console
After loading your model, check the browser console (F12) for these logs:

```
Processing GLTF scene: {...}
Mesh found: [mesh_name] Material: {...}
Material 0: { type: "MeshStandardMaterial", hasMap: true/false, hasColor: true/false, ... }
```

### What to Look For:

1. **hasMap: false** - Model has no texture files, only vertex colors or solid colors
2. **hasVertexColors: true** - Model uses vertex colors (painted directly on vertices)
3. **color: Color(0, 0, 0)** - Black material (now auto-fixed to white)
4. **type: "MeshBasicMaterial"** - Unlit material (won't respond to lighting)

### Common Issues and Solutions:

#### Issue: Model is gray/white with no texture
**Cause**: Texture files are missing or not embedded in GLB
**Solution**: 
- Re-export model with textures embedded
- Use GLB format (not GLTF + separate textures)
- Check if model uses vertex colors instead

#### Issue: Model is too dark
**Cause**: Lighting too dim or material too dark
**Solution**: Already fixed - ambient light increased to 1.0

#### Issue: Model is completely black
**Cause**: Material color set to black (0x000000)
**Solution**: Already fixed - auto-converts black to white

#### Issue: Textures look blurry
**Cause**: Low anisotropic filtering
**Solution**: Already fixed - using 16x anisotropic filtering

## Testing Your Model

1. **Open browser console** (F12 → Console tab)
2. **Load your model** in the app
3. **Check the logs** for material information
4. **Look for**:
   - "Vertex colors enabled" - means model uses painted colors
   - "Configuring base color texture" - means texture found
   - "Fixed black color" - means material was black and got fixed

## If Textures Still Don't Show

The model file itself might not have textures. Try:

1. **Open the GLB file** in a 3D viewer (like https://gltf-viewer.donmccurdy.com/)
2. **Check if textures show there** - if not, the file doesn't have textures
3. **Re-export from your 3D software** with these settings:
   - Format: GLB (not GLTF)
   - Embed textures: YES
   - Include materials: YES
   - Export vertex colors: YES (if using painted colors)

## Model Export Settings (Blender Example)

```
File → Export → glTF 2.0 (.glb/.gltf)
- Format: glTF Binary (.glb)
- Include: ✓ Selected Objects
- Transform: +Y Up
- Geometry: ✓ Apply Modifiers
- Material: ✓ Export
- Compression: ✓ Draco (optional)
- Texture: ✓ Embed Textures
```
