'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Canvas, useLoader, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import * as THREE from 'three';

interface ModelViewerProps {
  modelUrl: string;
  transform?: {
    position?: [number, number, number];
    rotation?: [number, number, number];
    scale?: [number, number, number];
  };
  cameraState?: {
    position: [number, number, number];
    target: [number, number, number];
  };
  isController?: boolean;
  onTransformChange?: (transform: {
    position: [number, number, number];
    rotation: [number, number, number];
    scale: [number, number, number];
  }) => void;
  onCameraChange?: (camera: {
    position: [number, number, number];
    target: [number, number, number];
  }) => void;
}

// Component to sync camera state
function CameraSync({ 
  isController, 
  cameraState,
  onCameraChange 
}: { 
  isController: boolean;
  cameraState?: { position: [number, number, number]; target: [number, number, number] };
  onCameraChange?: (camera: { position: [number, number, number]; target: [number, number, number] }) => void;
}) {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);
  const lastUpdateRef = useRef<number>(0);
  const THROTTLE_MS = 100; // 10 Hz for camera updates

  // Get OrbitControls reference
  useEffect(() => {
    const controls = (camera as any).userData?.controls;
    if (controls) {
      controlsRef.current = controls;
    }
  }, [camera]);

  // Broadcast camera changes (controller only)
  useEffect(() => {
    if (!isController || !onCameraChange) return;

    const handleCameraChange = () => {
      const now = Date.now();
      if (now - lastUpdateRef.current < THROTTLE_MS) return;

      const target = controlsRef.current?.target || new THREE.Vector3(0, 0, 0);
      
      onCameraChange({
        position: [camera.position.x, camera.position.y, camera.position.z],
        target: [target.x, target.y, target.z]
      });
      
      lastUpdateRef.current = now;
    };

    // Listen to camera changes
    const interval = setInterval(handleCameraChange, THROTTLE_MS);
    
    return () => clearInterval(interval);
  }, [isController, camera, onCameraChange]);

  // Apply camera state (non-controller only)
  useEffect(() => {
    if (isController || !cameraState) return;

    camera.position.set(...cameraState.position);
    
    if (controlsRef.current && cameraState.target) {
      controlsRef.current.target.set(...cameraState.target);
      controlsRef.current.update();
    }
  }, [isController, cameraState, camera]);

  return null;
}

function Model({ 
  url, 
  transform, 
  isController,
  onTransformChange,
  onLoaded
}: { 
  url: string;
  transform?: ModelViewerProps['transform'];
  isController?: boolean;
  onTransformChange?: ModelViewerProps['onTransformChange'];
  onLoaded?: () => void;
}) {
  // Configure GLTF loader with DRACO support
  const gltf = useLoader(GLTFLoader, url, (loader) => {
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
    dracoLoader.setDecoderConfig({ type: 'js' });
    loader.setDRACOLoader(dracoLoader);
  });
  
  const meshRef = useRef<THREE.Group>(null);
  const [isDragging, setIsDragging] = useState(false);
  const lastUpdateRef = useRef<number>(0);
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null);
  const THROTTLE_MS = 50; // 20 Hz
  
  const { gl } = useThree();

  // Auto-scale and center the model on load
  useEffect(() => {
    if (meshRef.current && gltf.scene) {
      console.log('Processing GLTF scene:', gltf);
      
      // Preserve original materials and textures
      gltf.scene.traverse((child: any) => {
        if (child.isMesh) {
          console.log('Mesh found:', child.name, 'Material:', child.material);
          
          child.frustumCulled = false; // Disable frustum culling to ensure visibility
          child.castShadow = false;
          child.receiveShadow = false;
          
          if (child.material) {
            // Handle both single material and material arrays
            const materials = Array.isArray(child.material) ? child.material : [child.material];
            
            materials.forEach((mat: any, index: number) => {
              console.log(`Material ${index}:`, {
                type: mat.type,
                hasMap: !!mat.map,
                hasColor: !!mat.color,
                color: mat.color,
                hasVertexColors: child.geometry?.attributes?.color !== undefined
              });
              
              // Don't clone, modify in place to preserve texture references
              const material = mat;
              
              // Enable vertex colors if they exist
              if (child.geometry?.attributes?.color) {
                material.vertexColors = true;
                console.log('Vertex colors enabled for', child.name);
              }
              
              // Configure material for proper rendering
              material.side = THREE.DoubleSide; // Render both sides
              material.flatShading = false;
              
              // Ensure textures are properly configured with correct color space
              if (material.map) {
                console.log('Configuring base color texture for', child.name);
                material.map.colorSpace = THREE.SRGBColorSpace;
                material.map.needsUpdate = true;
                material.map.anisotropy = Math.min(16, gl.capabilities.getMaxAnisotropy());
                material.map.generateMipmaps = true;
                material.map.minFilter = THREE.LinearMipmapLinearFilter;
                material.map.magFilter = THREE.LinearFilter;
                material.map.wrapS = THREE.RepeatWrapping;
                material.map.wrapT = THREE.RepeatWrapping;
              }
              
              // Configure other texture maps
              if (material.normalMap) {
                material.normalMap.needsUpdate = true;
                console.log('Normal map found for', child.name);
              }
              if (material.roughnessMap) {
                material.roughnessMap.needsUpdate = true;
              }
              if (material.metalnessMap) {
                material.metalnessMap.needsUpdate = true;
              }
              if (material.emissiveMap) {
                material.emissiveMap.colorSpace = THREE.SRGBColorSpace;
                material.emissiveMap.needsUpdate = true;
              }
              if (material.aoMap) {
                material.aoMap.needsUpdate = true;
              }
              
              // Ensure material color is visible
              if (material.color) {
                // Keep existing color but ensure it's not black
                if (material.color.r === 0 && material.color.g === 0 && material.color.b === 0) {
                  material.color.setHex(0xffffff);
                  console.log('Fixed black color for', child.name);
                }
              } else {
                material.color = new THREE.Color(0xffffff);
              }
              
              // Configure material properties for visibility
              material.transparent = material.transparent || false;
              material.opacity = material.opacity !== undefined ? material.opacity : 1.0;
              material.depthWrite = true;
              material.depthTest = true;
              
              // For MeshStandardMaterial, ensure proper PBR values
              if (material.type === 'MeshStandardMaterial') {
                if (material.roughness === undefined) material.roughness = 0.5;
                if (material.metalness === undefined) material.metalness = 0.0;
              }
              
              material.needsUpdate = true;
            });
            
            // Update child material reference if it was an array
            if (Array.isArray(child.material)) {
              child.material = materials;
            }
          }
          
          if (child.geometry) {
            child.geometry.computeBoundingSphere();
            if (!child.geometry.attributes.normal) {
              child.geometry.computeVertexNormals();
            }
          }
        }
      });
      
      // Calculate bounding box and scale
      const box = new THREE.Box3().setFromObject(gltf.scene);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      const scale = maxDim > 0 ? 2 / maxDim : 1;
      
      // Center the model
      gltf.scene.position.set(-center.x, -center.y, -center.z);
      
      // Apply initial scale
      if (meshRef.current) {
        meshRef.current.scale.set(scale, scale, scale);
      }
      
      console.log('Model loaded & optimized - Size:', size, 'Scale:', scale);
      
      if (onLoaded) {
        onLoaded();
      }
    }
  }, [gltf.scene, onLoaded]);

  // Update mesh from transform prop (for receiving broadcasts)
  useEffect(() => {
    if (meshRef.current && transform) {
      const pos = transform.position || [0, 0, 0];
      const rot = transform.rotation || [0, 0, 0];
      const scale = transform.scale || [1, 1, 1];
      
      meshRef.current.position.set(...pos);
      meshRef.current.rotation.set(...rot);
      meshRef.current.scale.set(...scale);
    }
  }, [transform]);

  // Mouse drag handling for controller
  const handlePointerDown = useCallback((e: any) => {
    if (!isController) return;
    e.stopPropagation();
    setIsDragging(true);
    // Store initial pointer position
    lastPointerRef.current = { x: e.clientX, y: e.clientY };
  }, [isController]);

  const handlePointerMove = useCallback((e: any) => {
    if (!isDragging || !meshRef.current || !isController || !lastPointerRef.current) return;
    e.stopPropagation();
    
    const now = Date.now();
    if (now - lastUpdateRef.current < THROTTLE_MS) return;

    // Calculate movement delta
    const deltaX = (e.clientX - lastPointerRef.current.x) * 0.01;
    const deltaY = (e.clientY - lastPointerRef.current.y) * 0.01;
    
    // Update pointer position
    lastPointerRef.current = { x: e.clientX, y: e.clientY };

    // Move model based on mouse movement
    meshRef.current.position.x += deltaX;
    meshRef.current.position.y -= deltaY;
    
    // Apply boundaries
    meshRef.current.position.x = Math.max(-5, Math.min(5, meshRef.current.position.x));
    meshRef.current.position.y = Math.max(-5, Math.min(5, meshRef.current.position.y));
    meshRef.current.position.z = Math.max(-5, Math.min(5, meshRef.current.position.z));
    
    if (onTransformChange) {
      const pos = meshRef.current.position;
      const rot = meshRef.current.rotation;
      const scale = meshRef.current.scale;
      onTransformChange({
        position: [pos.x, pos.y, pos.z],
        rotation: [rot.x, rot.y, rot.z],
        scale: [scale.x, scale.y, scale.z]
      });
      console.log('Mouse drag - broadcasting position:', [pos.x, pos.y, pos.z]);
    }
    
    lastUpdateRef.current = now;
  }, [isDragging, isController, onTransformChange]);

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
    lastPointerRef.current = null;
  }, []);

  // Handle scroll for scaling (only for controller)
  useEffect(() => {
    if (!isController) return;

    const handleWheel = (e: WheelEvent) => {
      if (!meshRef.current || !onTransformChange) return;
      
      e.preventDefault();
      const scaleDelta = e.deltaY > 0 ? 0.95 : 1.05;
      const currentScale = meshRef.current.scale.x;
      const newScale = Math.max(0.5, Math.min(5, currentScale * scaleDelta));
      
      meshRef.current.scale.set(newScale, newScale, newScale);
      
      const pos = meshRef.current.position;
      const rot = meshRef.current.rotation;
      onTransformChange({
        position: [pos.x, pos.y, pos.z],
        rotation: [rot.x, rot.y, rot.z],
        scale: [newScale, newScale, newScale]
      });
    };

    gl.domElement.addEventListener('wheel', handleWheel, { passive: false });
    return () => gl.domElement.removeEventListener('wheel', handleWheel);
  }, [isController, onTransformChange, gl]);

  return (
    <group 
      ref={meshRef}
      onPointerDown={isController ? handlePointerDown : undefined}
      onPointerMove={isController ? handlePointerMove : undefined}
      onPointerUp={isController ? handlePointerUp : undefined}
      onPointerLeave={isController ? handlePointerUp : undefined}
    >
      <primitive object={gltf.scene} />
    </group>
  );
}

export function ModelViewer({ 
  modelUrl, 
  transform,
  cameraState,
  isController = false,
  onTransformChange,
  onCameraChange
}: ModelViewerProps) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const handleModelLoaded = useCallback(() => {
    setLoading(false);
  }, []);

  return (
    <div className="w-full h-full bg-gradient-to-br from-gray-800 via-blue-900 to-purple-900 rounded-lg overflow-hidden relative">
      {error ? (
        <div className="w-full h-full flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-400 mb-2">Failed to load 3D model</p>
            <p className="text-sm text-gray-400">{error}</p>
          </div>
        </div>
      ) : (
        <>
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-10">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-2"></div>
                <p className="text-sm">Loading 3D model...</p>
              </div>
            </div>
          )}
          <Canvas 
            shadows={false}
            dpr={[0.75, 1.5]}
            frameloop="always"
            performance={{ min: 0.1 }}
            gl={{ 
              antialias: true,
              powerPreference: 'default',
              alpha: false,
              stencil: false,
              depth: true,
              logarithmicDepthBuffer: false,
              preserveDrawingBuffer: false,
              outputColorSpace: THREE.SRGBColorSpace,
              toneMapping: THREE.ACESFilmicToneMapping,
              toneMappingExposure: 1.0
            }}
            onCreated={({ gl }) => {
              // Ensure proper texture encoding for all devices
              gl.outputColorSpace = THREE.SRGBColorSpace;
              gl.toneMapping = THREE.ACESFilmicToneMapping;
              gl.toneMappingExposure = 1.0;
              
              console.log('WebGL Renderer initialized:', {
                maxTextureSize: gl.capabilities.maxTextureSize,
                maxAnisotropy: gl.capabilities.getMaxAnisotropy(),
                colorSpace: gl.outputColorSpace
              });
            }}
          >
            {/* Background */}
            <color attach="background" args={['#1a1a2e']} />
            <fog attach="fog" args={['#1a1a2e', 10, 50]} />
            
            <PerspectiveCamera makeDefault position={[3, 2, 5]} fov={50} />
            <OrbitControls 
              enablePan={false}
              enableZoom={isController}
              enableRotate={isController}
              minDistance={1}
              maxDistance={20}
              enableDamping={true}
              dampingFactor={0.05}
              makeDefault
              onChange={(e) => {
                // Store controls reference in camera userData
                if (e?.target) {
                  (e.target as any).object.userData.controls = e.target;
                }
              }}
            />
            <CameraSync 
              isController={isController}
              cameraState={cameraState}
              onCameraChange={onCameraChange}
            />
            
            {/* Neutral lighting setup for accurate texture/color display */}
            <ambientLight intensity={1.0} color="#ffffff" />
            <directionalLight 
              position={[5, 5, 5]} 
              intensity={0.5}
              color="#ffffff"
            />
            <directionalLight 
              position={[-5, -3, -5]} 
              intensity={0.3}
              color="#ffffff"
            />
            <hemisphereLight 
              color="#ffffff" 
              groundColor="#888888" 
              intensity={0.5} 
            />
            
            <React.Suspense fallback={null}>
              <Model 
                url={modelUrl} 
                transform={transform}
                isController={isController}
                onTransformChange={onTransformChange}
                onLoaded={handleModelLoaded}
              />
            </React.Suspense>
          </Canvas>
        </>
      )}
    </div>
  );
}
