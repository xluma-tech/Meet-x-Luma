'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface HandGestureControlProps {
  enabled: boolean;
  videoElement: HTMLVideoElement | null;
  onGesture: (gesture: {
    type: 'pinch_move' | 'rotate' | 'scale';
    delta: { x?: number; y?: number; z?: number; angle?: number; scale?: number };
  }) => void;
}

export function HandGestureControl({ enabled, videoElement, onGesture }: HandGestureControlProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const handsRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const lastGestureRef = useRef<{ x: number; y: number; distance: number } | null>(null);

  const detectGesture = useCallback((landmarks: any) => {
    if (!landmarks || landmarks.length === 0) {
      lastGestureRef.current = null;
      return;
    }

    const hand = landmarks[0];
    
    // Get all finger tips and bases
    const thumbTip = hand[4];
    const indexTip = hand[8];
    const middleTip = hand[12];
    const ringTip = hand[16];
    const pinkyTip = hand[20];
    const wrist = hand[0];
    const indexBase = hand[5];
    
    // Calculate key distances
    const thumbIndexDist = Math.sqrt(
      Math.pow(thumbTip.x - indexTip.x, 2) +
      Math.pow(thumbTip.y - indexTip.y, 2) +
      Math.pow(thumbTip.z - indexTip.z, 2)
    );
    
    const indexMiddleDist = Math.sqrt(
      Math.pow(indexTip.x - middleTip.x, 2) +
      Math.pow(indexTip.y - middleTip.y, 2) +
      Math.pow(indexTip.z - middleTip.z, 2)
    );
    
    const thumbMiddleDist = Math.sqrt(
      Math.pow(thumbTip.x - middleTip.x, 2) +
      Math.pow(thumbTip.y - middleTip.y, 2) +
      Math.pow(thumbTip.z - middleTip.z, 2)
    );
    
    // Check if fingers are extended (distance from wrist)
    const indexExtended = Math.sqrt(
      Math.pow(indexTip.x - wrist.x, 2) +
      Math.pow(indexTip.y - wrist.y, 2)
    ) > 0.15;
    
    const middleExtended = Math.sqrt(
      Math.pow(middleTip.x - wrist.x, 2) +
      Math.pow(middleTip.y - wrist.y, 2)
    ) > 0.15;
    
    // Gesture 1: FIST (all fingers closed) - ZOOM
    const isFist = !indexExtended && !middleExtended;
    
    // Gesture 2: PEACE SIGN (index + middle extended, others closed) - MOVE
    const isPeaceSign = indexExtended && middleExtended && indexMiddleDist < 0.08;
    
    // Gesture 3: OPEN HAND (all fingers extended) - ROTATE
    const isOpenHand = indexExtended && middleExtended && indexMiddleDist > 0.08;
    
    if (isFist) {
      // ZOOM: Closed fist - move hand up (zoom in) or down (zoom out)
      const fistY = wrist.y;
      
      if (lastGestureRef.current && lastGestureRef.current.y !== undefined) {
        const deltaY = lastGestureRef.current.y - fistY; // Inverted: up = zoom in
        
        if (Math.abs(deltaY) > 0.01) {
          onGesture({
            type: 'scale',
            delta: { scale: 1 + deltaY * 8 }
          });
        }
      }
      
      lastGestureRef.current = { x: wrist.x, y: fistY, distance: 0 };
    } else if (isPeaceSign) {
      // MOVE: Peace sign (index + middle extended) - drag anywhere
      const centerX = (indexTip.x + middleTip.x) / 2;
      const centerY = (indexTip.y + middleTip.y) / 2;
      
      if (lastGestureRef.current && lastGestureRef.current.x !== undefined) {
        const deltaX = (centerX - lastGestureRef.current.x) * 6;
        const deltaY = (centerY - lastGestureRef.current.y) * 6;
        
        if (Math.abs(deltaX) > 0.008 || Math.abs(deltaY) > 0.008) {
          onGesture({
            type: 'pinch_move',
            delta: { x: deltaX, y: -deltaY, z: 0 }
          });
        }
      }
      
      lastGestureRef.current = { x: centerX, y: centerY, distance: 0 };
    } else if (isOpenHand) {
      // ROTATE: Open hand - swipe left/right
      const palmX = indexBase.x;
      
      if (lastGestureRef.current && lastGestureRef.current.x !== undefined) {
        const deltaX = palmX - lastGestureRef.current.x;
        
        if (Math.abs(deltaX) > 0.012) {
          onGesture({
            type: 'rotate',
            delta: { angle: deltaX * Math.PI * 1.5 }
          });
        }
      }
      
      lastGestureRef.current = { x: palmX, y: 0, distance: 0 };
    } else {
      lastGestureRef.current = null;
    }
  }, [onGesture]);

  useEffect(() => {
    if (!enabled) {
      // Cleanup
      if (cameraRef.current) {
        cameraRef.current.stop();
        cameraRef.current = null;
      }
      if (handsRef.current) {
        handsRef.current.close();
        handsRef.current = null;
      }
      return;
    }

    let mounted = true;

    const initializeHandTracking = async () => {
      try {
        // Dynamically import MediaPipe
        const { Hands } = await import('@mediapipe/hands');
        const { Camera } = await import('@mediapipe/camera_utils');

        if (!mounted) return;

        const hands = new Hands({
          locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
          }
        });

        hands.setOptions({
          maxNumHands: 1,
          modelComplexity: 0,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5
        });

        hands.onResults((results) => {
          if (!mounted) return;
          
          // Only detect gestures, no visual drawing
          if (results.multiHandLandmarks) {
            detectGesture(results.multiHandLandmarks);
          }
        });

        handsRef.current = hands;

        if (videoElement) {
          let lastProcessTime = 0;
          const MIN_PROCESS_INTERVAL = 33; // Process ~30 times per second for smoother tracking
          
          const camera = new Camera(videoElement, {
            onFrame: async () => {
              const now = performance.now();
              
              // Throttle by time only for smoother tracking
              if (now - lastProcessTime >= MIN_PROCESS_INTERVAL &&
                  videoElement && 
                  handsRef.current) {
                lastProcessTime = now;
                await handsRef.current.send({ image: videoElement });
              }
            },
            width: 640,
            height: 480
          });
          
          cameraRef.current = camera;
          await camera.start();
          
          if (mounted) {
            setIsLoading(false);
          }
        }
      } catch (err) {
        console.error('Error initializing hand tracking:', err);
        if (mounted) {
          setError('Failed to initialize hand tracking');
          setIsLoading(false);
        }
      }
    };

    initializeHandTracking();

    return () => {
      mounted = false;
      if (cameraRef.current) {
        cameraRef.current.stop();
      }
      if (handsRef.current) {
        handsRef.current.close();
      }
    };
  }, [enabled, detectGesture]);

  if (!enabled) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-green-600 text-white px-3 py-2 rounded-lg shadow-lg z-50 text-sm font-semibold flex items-center gap-2">
      <span className="animate-pulse">👋</span>
      <span>Hand Control Active</span>
      {isLoading && (
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
      )}
      {error && (
        <span className="text-xs text-red-200">⚠️</span>
      )}
    </div>
  );
}
