'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Canvas, useLoader, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
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
  const gltf = useLoader(GLTFLoader, url);
  const meshRef = useRef<THREE.Group>(null);
  const [isDragging, setIsDragging] = useState(false);
  const lastUpdateRef = useRef<number>(0);
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null);
  const THROTTLE_MS = 50; // 20 Hz
  
  const { camera, gl } = useThree();

  // Auto-scale and center the model on load
  useEffect(() => {
    if (meshRef.current && gltf.scene) {
      // Preserve original materials and textures
      gltf.scene.traverse((child: any) => {
        if (child.isMesh) {
          child.frustumCulled = true;
          
          if (child.material) {
            // Ensure textures are properly loaded
            if (child.material.map) {
              child.material.map.needsUpdate = true;
              child.material.map.anisotropy = 4;
            }
            if (child.material.normalMap) child.material.normalMap.needsUpdate = true;
            if (child.material.roughnessMap) child.material.roughnessMap.needsUpdate = true;
            if (child.material.metalnessMap) child.material.metalnessMap.needsUpdate = true;
            child.material.needsUpdate = true;
          }
          
          if (child.geometry) {
            child.geometry.computeBoundingSphere();
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
            dpr={[0.75, 1]}
            frameloop="always"
            performance={{ min: 0.1 }}
            gl={{ 
              antialias: true,
              powerPreference: 'high-performance',
              alpha: false,
              stencil: false,
              depth: true,
              logarithmicDepthBuffer: false,
              preserveDrawingBuffer: false
            }}
          >
            {/* Bright studio-like background */}
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
            
            {/* Bright studio lighting setup */}
            <ambientLight intensity={1.2} />
            <directionalLight 
              position={[5, 5, 5]} 
              intensity={1.5}
              color="#ffffff"
            />
            <directionalLight 
              position={[-5, 3, -5]} 
              intensity={0.8}
              color="#ffffff"
            />
            <pointLight position={[0, 5, 0]} intensity={0.5} color="#ffffff" />
            <hemisphereLight 
              color="#ffffff" 
              groundColor="#444466" 
              intensity={0.6} 
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
