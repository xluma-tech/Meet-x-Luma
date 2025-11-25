'use client';

import { useEffect, useRef } from 'react';

export function usePerformanceMonitor(enabled: boolean = true) {
  const metricsRef = useRef({
    fps: 0,
    memory: 0,
    lastTime: performance.now(),
    frames: 0
  });

  useEffect(() => {
    if (!enabled) return;

    let animationFrameId: number;
    
    const measurePerformance = () => {
      const now = performance.now();
      metricsRef.current.frames++;

      // Calculate FPS every second
      if (now >= metricsRef.current.lastTime + 1000) {
        metricsRef.current.fps = Math.round(
          (metricsRef.current.frames * 1000) / (now - metricsRef.current.lastTime)
        );
        metricsRef.current.frames = 0;
        metricsRef.current.lastTime = now;

        // Get memory usage if available
        if ((performance as any).memory) {
          metricsRef.current.memory = Math.round(
            (performance as any).memory.usedJSHeapSize / 1048576
          );
        }

        // Log performance metrics
        console.log(`[Performance] FPS: ${metricsRef.current.fps}, Memory: ${metricsRef.current.memory}MB`);
        
        // Warn if performance is poor
        if (metricsRef.current.fps < 20) {
          console.warn('[Performance] Low FPS detected! Consider reducing quality.');
        }
      }

      animationFrameId = requestAnimationFrame(measurePerformance);
    };

    animationFrameId = requestAnimationFrame(measurePerformance);

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [enabled]);

  return metricsRef.current;
}
