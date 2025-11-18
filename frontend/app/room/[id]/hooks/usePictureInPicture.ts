import { useEffect, useRef, useState, useCallback } from 'react';

interface UsePictureInPictureOptions {
  enabled: boolean;
  localStream: MediaStream | null;
  userName: string;
  onError?: (error: Error) => void;
}

export function usePictureInPicture({
  enabled,
  localStream,
  userName,
  onError,
}: UsePictureInPictureOptions) {
  const [isPiPActive, setIsPiPActive] = useState(false);
  const [isPageHidden, setIsPageHidden] = useState(false);
  const pipVideoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pipStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isPiPActiveRef = useRef(false);

  const exitPictureInPicture = useCallback(async () => {
    try {
      // Cancel animation frame
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }

      // Exit PiP if active
      if (typeof document !== 'undefined' && document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      }

      // Clean up video element
      if (pipVideoRef.current) {
        pipVideoRef.current.srcObject = null;
        if (pipVideoRef.current.parentNode) {
          pipVideoRef.current.remove();
        }
        pipVideoRef.current = null;
      }

      // Stop canvas stream
      if (pipStreamRef.current) {
        pipStreamRef.current.getTracks().forEach(track => track.stop());
        pipStreamRef.current = null;
      }

      // Clear canvas
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
      }

      isPiPActiveRef.current = false;
      setIsPiPActive(false);
    } catch (error) {
      // Silently handle cleanup errors
      console.error('Error exiting Picture-in-Picture:', error);
    }
  }, []);

  const enterPictureInPicture = useCallback(async () => {
    if (!localStream || isPiPActiveRef.current) return;

    try {
      // Create canvas for adding overlay text
      if (!canvasRef.current) {
        canvasRef.current = document.createElement('canvas');
      }

      const canvas = canvasRef.current;

      // Create temporary video to get dimensions
      const tempVideo = document.createElement('video');
      tempVideo.srcObject = localStream;
      tempVideo.muted = true;
      tempVideo.playsInline = true;
      await tempVideo.play();

      // Wait for video to have dimensions
      await new Promise<void>((resolve) => {
        const checkDimensions = () => {
          if (tempVideo.videoWidth > 0 && tempVideo.videoHeight > 0) {
            resolve();
          } else {
            setTimeout(checkDimensions, 100);
          }
        };
        checkDimensions();
      });

      // Set canvas dimensions to match video
      canvas.width = tempVideo.videoWidth;
      canvas.height = tempVideo.videoHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        tempVideo.srcObject = null;
        return;
      }

      // Draw video frame with overlay
      const drawFrame = () => {
        if (!tempVideo || tempVideo.paused || tempVideo.ended || !isPiPActiveRef.current) {
          // Clean up temp video if stopping
          if (tempVideo && tempVideo.srcObject) {
            tempVideo.srcObject = null;
          }
          return;
        }

        try {
          // Draw video frame
          ctx.drawImage(tempVideo, 0, 0, canvas.width, canvas.height);

          // Add overlay text
          const fontSize = Math.max(20, canvas.height * 0.05);
          ctx.font = `bold ${fontSize}px Arial`;
          ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
          const textWidth = ctx.measureText(userName).width;
          ctx.fillRect(10, canvas.height - fontSize - 20, textWidth + 20, fontSize + 10);
          ctx.fillStyle = 'white';
          ctx.fillText(userName, 20, canvas.height - 15);

          animationFrameRef.current = requestAnimationFrame(drawFrame);
        } catch (error) {
          // Handle drawing errors gracefully
          console.error('Error drawing frame:', error);
          isPiPActiveRef.current = false;
        }
      };

      // Start drawing frames
      isPiPActiveRef.current = true;
      drawFrame();

      // Capture canvas stream
      const canvasStream = canvas.captureStream(30);
      pipStreamRef.current = canvasStream;

      // Create a new video element for PiP
      const pipVideo = document.createElement('video');
      pipVideo.srcObject = canvasStream;
      pipVideo.muted = true;
      pipVideo.autoplay = true;
      pipVideo.playsInline = true;
      
      // Add to DOM temporarily (required for some browsers)
      pipVideo.style.position = 'fixed';
      pipVideo.style.bottom = '-1000px';
      pipVideo.style.left = '-1000px';
      pipVideo.style.width = '1px';
      pipVideo.style.height = '1px';
      document.body.appendChild(pipVideo);

      await pipVideo.play();

      // Request PiP
      await pipVideo.requestPictureInPicture();
      setIsPiPActive(true);

      // Handle PiP exit
      const handleLeavePiP = () => {
        isPiPActiveRef.current = false;
        setIsPiPActive(false);
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
        if (pipVideo.srcObject) {
          pipVideo.srcObject = null;
        }
        if (pipVideo.parentNode) {
          pipVideo.remove();
        }
        if (tempVideo.srcObject) {
          tempVideo.srcObject = null;
        }
      };

      pipVideo.addEventListener('leavepictureinpicture', handleLeavePiP);

      // Store reference for cleanup
      pipVideoRef.current = pipVideo;

      // Store temp video reference for cleanup
      const tempVideoRef = tempVideo;
      
      // Cleanup function for temp video
      const cleanupTempVideo = () => {
        if (tempVideoRef && tempVideoRef.srcObject) {
          tempVideoRef.srcObject = null;
        }
      };

      // Add cleanup to window unload
      window.addEventListener('beforeunload', cleanupTempVideo);

      // Return cleanup function
      return () => {
        window.removeEventListener('beforeunload', cleanupTempVideo);
        cleanupTempVideo();
      };
    } catch (error) {
      const err = error as Error;
      // Don't log NotAllowedError as it's expected when no user gesture
      if (!err.message?.includes('NotAllowedError') && !err.message?.includes('user gesture')) {
        console.error('Error entering Picture-in-Picture:', error);
      }
      isPiPActiveRef.current = false;
      setIsPiPActive(false);
      // Trigger fallback window
      onError?.(err);
    }
  }, [localStream, userName, onError]);

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    if (!enabled || !localStream) {
      // Clean up if disabled
      if (isPiPActiveRef.current) {
        exitPictureInPicture();
      }
      return;
    }

    // Check if PiP is supported
    if (!document.pictureInPictureEnabled) {
      console.log('Picture-in-Picture not supported');
      return;
    }

    const handleVisibilityChange = () => {
      const isHidden = document.hidden;
      setIsPageHidden(isHidden);

      if (isHidden && !isPiPActiveRef.current) {
        // Page is hidden, activate PiP
        enterPictureInPicture();
      } else if (!isHidden && isPiPActiveRef.current) {
        // Page is visible again, exit PiP
        exitPictureInPicture();
      }
    };

    // Listen for visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Initial check
    if (document.hidden) {
      setIsPageHidden(true);
      enterPictureInPicture();
    }

    // Cleanup
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      exitPictureInPicture();
    };
  }, [enabled, localStream, enterPictureInPicture, exitPictureInPicture]);

  return {
    isPiPActive,
    isPageHidden,
  };
}
