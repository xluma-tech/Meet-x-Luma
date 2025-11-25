'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Canvas, useLoader } from '@react-three/fiber';
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
  isController?: boolean;
  onTransformChange?: (transform: {
    position: [number, number, number];
    rotation: [number, number, number];
    scale: [number, number, number];
  }) => void;
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
  const [localTransform, setLocalTransform] = useState({
    position: transform?.position || [0, 0, 0] as [number, number, number],
    rotation: transform?.rotation || [0, 0, 0] as [number, number, number],
    scale: transform?.scale || [1, 1, 1] as [number, number, number]
  });

  // Auto-scale and center the model on load with optimizations
  useEffect(() => {
    if (meshRef.current && gltf.scene) {
      // Optimize model geometry and brighten materials
      gltf.scene.traverse((child: any) => {
        if (child.isMesh) {
          // Enable frustum culling
          child.frustumCulled = true;
          
          // Optimize and brighten materials
          if (child.material) {
            child.material.precision = 'lowp';
            
            // Brighten the material
            if (child.material.color) {
              child.material.color.multiplyScalar(1.3); // Increase brightness by 30%
            }
            
            // Increase metalness and roughness for better appearance
            if (child.material.metalness !== undefined) {
              child.material.metalness = Math.min(1, child.material.metalness * 1.2);
            }
            
            // Optimize textures
            if (child.material.map) {
              child.material.map.anisotropy = 2;
            }
          }
          
          // Simplify geometry if too complex
          if (child.geometry) {
            child.geometry.computeBoundingSphere();
          }
        }
      });
      
      // Calculate bounding box
      const box = new THREE.Box3().setFromObject(gltf.scene);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      
      // Calculate scale to fit in view (target size ~2 units)
      const maxDim = Math.max(size.x, size.y, size.z);
      const scale = maxDim > 0 ? 2 / maxDim : 1;
      
      // Center the model
      gltf.scene.position.set(-center.x, -center.y, -center.z);
      
      // Apply initial scale
      setLocalTransform(prev => ({
        ...prev,
        scale: [scale, scale, scale]
      }));
      
      console.log('Model loaded & optimized - Size:', size, 'Scale:', scale);
      
      // Notify parent that model is loaded
      if (onLoaded) {
        onLoaded();
      }
    }
  }, [gltf.scene, onLoaded]);

  // Update mesh directly from transform prop (skip state to avoid re-renders)
  useEffect(() => {
    if (meshRef.current && transform) {
      meshRef.current.position.set(...(transform.position || [0, 0, 0]));
      meshRef.current.rotation.set(...(transform.rotation || [0, 0, 0]));
      meshRef.current.scale.set(...(transform.scale || [1, 1, 1]));
    }
  }, [transform]);

  // Notify parent of transform changes (for controller only)
  useEffect(() => {
    if (isController && onTransformChange) {
      onTransformChange(localTransform);
    }
  }, [localTransform, isController, onTransformChange]);

  return (
    <group 
      ref={meshRef}
      position={localTransform.position}
      rotation={localTransform.rotation}
      scale={localTransform.scale}
    >
      <primitive object={gltf.scene} />
    </group>
  );
}

export function ModelViewer({ 
  modelUrl, 
  transform, 
  isController = false,
  onTransformChange 
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
              enablePan={isController}
              enableZoom={true}
              enableRotate={true}
              minDistance={1}
              maxDistance={20}
              enableDamping={false}
              makeDefault
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
            
            {/* Brighter grid */}
            <gridHelper args={[10, 10, '#6666ff', '#444466']} />
          </Canvas>
        </>
      )}
    </div>
  );
}
