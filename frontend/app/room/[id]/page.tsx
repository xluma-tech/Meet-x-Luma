'use client';

import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import SimplePeer from 'simple-peer';
import { usePictureInPicture } from './hooks/usePictureInPicture';
import { usePerformanceMonitor } from './hooks/usePerformanceMonitor';
import { FloatingWindow } from './components/FloatingWindow';
import { ModelViewer } from './components/ModelViewer';
import { HandGestureControl } from './components/HandGestureControl';
import { ModelUploadPanel } from './components/ModelUploadPanel';
import dynamic from 'next/dynamic';

// Development logging utility
const isDev = process.env.NODE_ENV === 'development';
const devLog = (...args: unknown[]) => {
  if (isDev) {
    console.log(...args);
  }
};

// Production error tracking (can be replaced with Sentry, LogRocket, etc.)
const trackError = (error: Error, context?: string) => {
  console.error(`[${context || 'Error'}]:`, error);
  // TODO: Send to error tracking service in production
  // Example: Sentry.captureException(error, { tags: { context } });
};

interface Peer {
  peer: SimplePeer.Instance;
  userId: string;
  userName: string;
  stream?: MediaStream;
}

interface ScreenPeer {
  peer: SimplePeer.Instance;
  userId: string;
  userName: string;
  stream?: MediaStream;
}

interface ChatMessage {
  id: string;
  userName: string;
  userId: string;
  message: string;
  timestamp: number;
  isPrivate?: boolean;
  recipientId?: string;
}

// Device and browser detection utilities
const getDeviceInfo = () => {
  const ua = navigator.userAgent.toLowerCase();
  
  // Detect mobile/tablet
  const isMobile = /android|webos|iphone|ipod|blackberry|iemobile|opera mini/i.test(ua);
  const isTablet = /ipad|android(?!.*mobile)/i.test(ua);
  const isIOS = /iphone|ipad|ipod/i.test(ua);
  const isAndroid = /android/i.test(ua);
  
  // Detect browser - order matters!
  const isEdge = /edg/i.test(ua);
  const isChrome = /chrome/i.test(ua) && !/edg/i.test(ua);
  const isFirefox = /firefox/i.test(ua);
  const isSafari = /safari/i.test(ua) && !/chrome/i.test(ua) && !/android/i.test(ua);
  
  // Screen share support - now available on all devices with getDisplayMedia
  const isDesktopDevice = !isMobile && !isTablet;
  const hasGetDisplayMedia = typeof navigator.mediaDevices?.getDisplayMedia === 'function';
  
  // Enable screen share for all devices that support getDisplayMedia API
  // iOS 15.4+ Safari supports screen sharing
  const supportsScreenShare = hasGetDisplayMedia;

  return {
    isMobile: isMobile && !isTablet,
    isTablet,
    isDesktop: isDesktopDevice,
    isIOS,
    isAndroid,
    isSafari,
    isChrome,
    isFirefox,
    isEdge,
    supportsScreenShare,
    userAgent: navigator.userAgent,
  };
};

export default function RoomPage() {
  const resolvedParams = useParams();
  const resolvedSearchParams = useSearchParams();
  const userName = resolvedSearchParams.get('name') || 'Guest';
  const roomId = (Array.isArray(resolvedParams?.id) ? resolvedParams.id[0] : resolvedParams?.id) as string;

  const [peers, setPeers] = useState<Peer[]>([]);
  const [screenPeers, setScreenPeers] = useState<ScreenPeer[]>([]); // Separate peers for screen sharing
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [screenSharingUserId, setScreenSharingUserId] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedChatUser, setSelectedChatUser] = useState<string>('everyone');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState<ReturnType<typeof getDeviceInfo> | null>(null);
  const [pipEnabled, setPipEnabled] = useState(true);
  const [showFloatingWindow, setShowFloatingWindow] = useState(false);
  const [activeSpeaker, setActiveSpeaker] = useState<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserNodesRef = useRef<Map<string, AnalyserNode>>(new Map());

  // 3D Model states
  const [show3DPanel, setShow3DPanel] = useState(false);
  const [uploadedModel, setUploadedModel] = useState<any>(null);
  const [isModelPublished, setIsModelPublished] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [roomModel, setRoomModel] = useState<any>(null);
  const [modelTransform, setModelTransform] = useState({
    position: [0, 0, 0] as [number, number, number],
    rotation: [0, 0, 0] as [number, number, number],
    scale: [1, 1, 1] as [number, number, number]
  });
  const [cameraState, setCameraState] = useState({
    position: [3, 2, 5] as [number, number, number],
    target: [0, 0, 0] as [number, number, number]
  });
  const [allowedControllers, setAllowedControllers] = useState<string[]>([]);
  const [handGestureEnabled, setHandGestureEnabled] = useState(false);
  const [lowPowerMode, setLowPowerMode] = useState(false);
  const modelSeqRef = useRef(0);

  const socketRef = useRef<Socket | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Peer[]>([]);
  const screenPeersRef = useRef<ScreenPeer[]>([]); // Separate ref for screen peers
  const screenStreamRef = useRef<MediaStream | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Picture-in-Picture hook
  const { isPiPActive, isPageHidden } = usePictureInPicture({
    enabled: pipEnabled,
    localStream: localStreamRef.current,
    userName,
    onError: (error) => {
      // PiP failed (likely due to browser restrictions), use fallback
      if (isPageHidden && pipEnabled) {
        setShowFloatingWindow(true);
      }
    },
  });

  // Performance monitoring (only in development)
  usePerformanceMonitor(isDev);

  // Automatic floating window when tab is minimized
  // Shows screen share if active, otherwise shows local video
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    // Automatically open floating window when page is hidden
    if (isPageHidden && pipEnabled && !isPiPActive && !showFloatingWindow) {
      // Small delay to ensure page is actually hidden
      const timer = setTimeout(() => {
        if (document.hidden) {
          setShowFloatingWindow(true);
        }
      }, 100);
      return () => clearTimeout(timer);
    }
    
    // Automatically close floating window when page becomes visible again
    if (!isPageHidden && showFloatingWindow) {
      setShowFloatingWindow(false);
    }
    
    // Close floating window if PiP becomes active (prefer native PiP)
    if (isPiPActive && showFloatingWindow) {
      setShowFloatingWindow(false);
    }
    
    // Close floating window if user disables the feature
    if (!pipEnabled && showFloatingWindow) {
      setShowFloatingWindow(false);
    }
  }, [isPageHidden, pipEnabled, isPiPActive, showFloatingWindow]);

  // Close user dropdown when clicking outside
  useEffect(() => {
    if (!showUserDropdown) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Check if click is outside the dropdown
      if (!target.closest('.user-dropdown-container')) {
        setShowUserDropdown(false);
        setUserSearchQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showUserDropdown]);

  // Audio level detection for active speaker
  const setupAudioAnalyser = useCallback((stream: MediaStream, userId: string) => {
    if (!stream) return;

    try {
      // Create audio context if it doesn't exist
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const audioContext = audioContextRef.current;
      const audioTrack = stream.getAudioTracks()[0];
      
      if (!audioTrack) return;

      // Create analyser node
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;

      // Create media stream source
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      // Store analyser node
      analyserNodesRef.current.set(userId, analyser);

      devLog(`Audio analyser setup for ${userId}`);
    } catch (err) {
      console.error('Error setting up audio analyser:', err);
    }
  }, []);

  const detectActiveSpeaker = useCallback(() => {
    const analysers = analyserNodesRef.current;
    if (analysers.size === 0) return;

    let maxVolume = 0;
    let loudestSpeaker: string | null = null;
    const SPEAKING_THRESHOLD = 20; // Minimum volume to be considered speaking

    analysers.forEach((analyser, userId) => {
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(dataArray);

      // Calculate average volume
      const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;

      if (average > maxVolume && average > SPEAKING_THRESHOLD) {
        maxVolume = average;
        loudestSpeaker = userId;
      }
    });

    // If no one is speaking above threshold, clear active speaker
    if (maxVolume <= SPEAKING_THRESHOLD) {
      loudestSpeaker = null;
    }

    // Update active speaker if changed
    if (loudestSpeaker !== activeSpeaker) {
      setActiveSpeaker(loudestSpeaker);
    }
  }, [activeSpeaker]);

  // Run speaker detection periodically
  useEffect(() => {
    const interval = setInterval(detectActiveSpeaker, 200); // Check every 200ms
    return () => clearInterval(interval);
  }, [detectActiveSpeaker]);

  // Peer creation functions - declared before useEffect to avoid hoisting issues
  const createPeer = (userToSignal: string, stream: MediaStream) => {
    const peer = new SimplePeer({
      initiator: true,
      trickle: true,
      stream,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
          { urls: 'stun:stun3.l.google.com:19302' },
          { urls: 'stun:stun4.l.google.com:19302' },
        ],
      },
    });

    peer.on('signal', (signal) => {
      socketRef.current?.emit('signal', { to: userToSignal, signal });
    });

    peer.on('stream', (remoteStream) => {
      devLog(`Received camera stream from ${userToSignal}:`, remoteStream.id);
      const peerIndex = peersRef.current.findIndex((p) => p.userId === userToSignal);
      if (peerIndex !== -1) {
        peersRef.current[peerIndex].stream = remoteStream;
        setPeers([...peersRef.current]);
        devLog(`Camera stream set for peer ${userToSignal}`);
        
        // Setup audio analyser for speaker detection
        setupAudioAnalyser(remoteStream, userToSignal);
      }
    });

    peer.on('error', (err: Error) => {
      if (err.message?.includes('User-Initiated Abort') || err.message?.includes('Close called')) {
        return;
      }
      trackError(err, 'Camera Peer Connection');
    });

    peer.on('close', () => {
      // Peer connection closed
    });

    return peer;
  };

  const addPeer = (incomingSignal: string, stream: MediaStream) => {
    const peer = new SimplePeer({
      initiator: false,
      trickle: true,
      stream,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
          { urls: 'stun:stun3.l.google.com:19302' },
          { urls: 'stun:stun4.l.google.com:19302' },
        ],
      },
    });

    peer.on('signal', (signal) => {
      socketRef.current?.emit('signal', { to: incomingSignal, signal });
    });

    peer.on('stream', (remoteStream) => {
      console.log(`Received camera stream from ${incomingSignal}:`, remoteStream.id);
      const peerIndex = peersRef.current.findIndex((p) => p.userId === incomingSignal);
      if (peerIndex !== -1) {
        peersRef.current[peerIndex].stream = remoteStream;
        setPeers([...peersRef.current]);
        console.log(`Camera stream set for peer ${incomingSignal}`);
        
        // Setup audio analyser for speaker detection
        setupAudioAnalyser(remoteStream, incomingSignal);
      }
    });

    peer.on('error', (err: Error) => {
      if (err.message?.includes('User-Initiated Abort') || err.message?.includes('Close called')) {
        return;
      }
      console.error('Peer error:', err);
    });

    peer.on('close', () => {
      // Peer connection closed
    });

    return peer;
  };

  const createScreenPeer = (userToSignal: string, stream: MediaStream) => {
    const peer = new SimplePeer({
      initiator: true,
      trickle: true,
      stream,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
          { urls: 'stun:stun3.l.google.com:19302' },
          { urls: 'stun:stun4.l.google.com:19302' },
        ],
      },
    });

    peer.on('signal', (signal) => {
      socketRef.current?.emit('screen-signal', { to: userToSignal, signal });
    });

    peer.on('stream', (remoteStream) => {
      const peerIndex = screenPeersRef.current.findIndex((p) => p.userId === userToSignal);
      if (peerIndex !== -1) {
        screenPeersRef.current[peerIndex].stream = remoteStream;
        setScreenPeers([...screenPeersRef.current]);
      }
    });

    peer.on('error', (err: Error) => {
      if (err.message?.includes('User-Initiated Abort') || err.message?.includes('Close called')) {
        return;
      }
      console.error('Screen peer error:', err);
    });

    return peer;
  };

  const addScreenPeer = (incomingSignal: string, stream: MediaStream) => {
    const peer = new SimplePeer({
      initiator: false,
      trickle: true,
      stream,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
          { urls: 'stun:stun3.l.google.com:19302' },
          { urls: 'stun:stun4.l.google.com:19302' },
        ],
      },
    });

    peer.on('signal', (signal) => {
      socketRef.current?.emit('screen-signal', { to: incomingSignal, signal });
    });

    peer.on('stream', (remoteStream) => {
      console.log(`Screen peer received stream from ${incomingSignal}:`, remoteStream.id);
      const peerIndex = screenPeersRef.current.findIndex((p) => p.userId === incomingSignal);
      if (peerIndex !== -1) {
        screenPeersRef.current[peerIndex].stream = remoteStream;
        setScreenPeers([...screenPeersRef.current]);
        console.log(`Screen peer stream set for ${incomingSignal}`);
      }
    });

    peer.on('error', (err: Error) => {
      if (err.message?.includes('User-Initiated Abort') || err.message?.includes('Close called')) {
        return;
      }
      console.error('Screen peer error:', err);
    });

    return peer;
  };

  useEffect(() => {
    // Detect device and browser info
    const info = getDeviceInfo();
    setDeviceInfo(info);
    devLog('Device Info:', info);

    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || window.location.origin;
    socketRef.current = io(socketUrl, {
      transports: ['websocket', 'polling'],
    });

    // Optimize video constraints based on device and power mode
    const getVideoConstraints = () => {
      const baseConstraints = info.isMobile ? {
        width: { ideal: 640, max: 1280 },
        height: { ideal: 480, max: 720 },
        facingMode: 'user',
      } : info.isTablet ? {
        width: { ideal: 1280, max: 1920 },
        height: { ideal: 720, max: 1080 },
      } : {
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      };
      
      // Apply low power mode constraints
      if (lowPowerMode) {
        return {
          width: { ideal: 640, max: 960 },
          height: { ideal: 480, max: 720 },
          frameRate: { ideal: 15, max: 20 },
          facingMode: info.isMobile ? 'user' : undefined,
        };
      }
      
      return baseConstraints;
    };

    navigator.mediaDevices
      .getUserMedia({
        video: {
          ...getVideoConstraints(),
          frameRate: { ideal: 24, max: 30 } // Limit frame rate for better performance
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
          channelCount: 1 // Mono audio for better performance
        },
      })
      .then((stream) => {
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // Setup audio analyser for local stream
        setupAudioAnalyser(stream, 'local');

        socketRef.current?.emit('join-room', { roomId, userName });

        socketRef.current?.on('existing-users', (users: Array<{ userId: string; userName: string }>) => {
          const newPeers: Peer[] = [];
          users.forEach((user) => {
            const peer = createPeer(user.userId, stream);
            newPeers.push({
              peer,
              userId: user.userId,
              userName: user.userName,
            });
          });
          peersRef.current = newPeers;
          setPeers(newPeers);
        });

        socketRef.current?.on('user-joined', ({ userId, userName: newUserName }) => {
          const peer = addPeer(userId, stream);
          const newPeer = {
            peer,
            userId,
            userName: newUserName,
          };
          peersRef.current = [...peersRef.current, newPeer];
          setPeers([...peersRef.current]);
        });

        socketRef.current?.on('signal', ({ from, signal }) => {
          const item = peersRef.current.find((p) => p.userId === from);
          if (item && item.peer) {
            try {
              // Check if peer is not destroyed before signaling
              const peerInternal = item.peer as SimplePeer.Instance & { destroyed?: boolean; _destroying?: boolean };
              if (!peerInternal.destroyed && !peerInternal._destroying) {
                item.peer.signal(signal);
              } else {
                console.log(`Ignoring signal for destroyed peer ${from}`);
              }
            } catch (err) {
              const error = err as Error;
              // Silently ignore errors for destroyed peers
              if (!error.message?.includes('cannot signal after peer is destroyed')) {
                console.error('Error signaling peer:', error);
              }
            }
          }
        });

        socketRef.current?.on('user-left', ({ userId }) => {
          const peerObj = peersRef.current.find((p) => p.userId === userId);
          if (peerObj) {
            peerObj.peer.destroy();
          }
          peersRef.current = peersRef.current.filter((p) => p.userId !== userId);
          setPeers(peersRef.current);

          // Remove audio analyser
          analyserNodesRef.current.delete(userId);
          if (activeSpeaker === userId) {
            setActiveSpeaker(null);
          }

          if (screenSharingUserId === userId) {
            setScreenSharingUserId(null);
          }
          
          if (selectedChatUser === userId) {
            setSelectedChatUser('everyone');
          }
        });

        socketRef.current?.on('chat-message', ({ userId, userName: senderName, message, timestamp }) => {
          setMessages((prev) => [
            ...prev,
            { id: `${userId}-${timestamp}`, userName: senderName, userId, message, timestamp, isPrivate: false },
          ]);
        });

        socketRef.current?.on('private-message', ({ userId, userName: senderName, message, timestamp }) => {
          setMessages((prev) => [
            ...prev,
            {
              id: `${userId}-${timestamp}`,
              userName: senderName,
              userId,
              message,
              timestamp,
              isPrivate: true,
              recipientId: socketRef.current?.id || 'local',
            },
          ]);
        });

        // Handle screen share peer signaling (separate from camera peers)
        socketRef.current?.on('screen-signal', ({ from, signal }) => {
          const item = screenPeersRef.current.find((p) => p.userId === from);
          if (item && item.peer) {
            try {
              const peerInternal = item.peer as SimplePeer.Instance & { destroyed?: boolean; _destroying?: boolean };
              if (!peerInternal.destroyed && !peerInternal._destroying) {
                item.peer.signal(signal);
              }
            } catch (err) {
              const error = err as Error;
              if (!error.message?.includes('cannot signal after peer is destroyed')) {
                console.error('Error signaling screen peer:', error);
              }
            }
          }
        });

        socketRef.current?.on('screen-share-started', ({ userId }) => {
          console.log(`User ${userId} started screen sharing`);
          setScreenSharingUserId(userId);
          
          // Create screen peer to receive their screen share (only if it's not us)
          if (userId !== socketRef.current?.id) {
            // Create a dummy stream for the receiver (won't be used, just for SimplePeer)
            const dummyStream = new MediaStream();
            const screenPeer = addScreenPeer(userId, dummyStream);
            const peerName = peersRef.current.find(p => p.userId === userId)?.userName || 'Unknown';
            const newScreenPeer = {
              peer: screenPeer,
              userId,
              userName: peerName,
            };
            screenPeersRef.current = [...screenPeersRef.current, newScreenPeer];
            setScreenPeers([...screenPeersRef.current]);
            console.log(`Created screen peer to receive from ${peerName}`);
          }
        });

        socketRef.current?.on('screen-share-stopped', ({ userId }) => {
          console.log(`User ${userId} stopped screen sharing`);
          
          // Always clear screenSharingUserId if it matches
          setScreenSharingUserId((current) => (current === userId ? null : current));
          
          // Destroy screen peer
          const screenPeer = screenPeersRef.current.find((p) => p.userId === userId);
          if (screenPeer) {
            screenPeer.peer.destroy();
          }
          screenPeersRef.current = screenPeersRef.current.filter((p) => p.userId !== userId);
          setScreenPeers(screenPeersRef.current);
        });

        // 3D Model events
        socketRef.current?.on('model-published', ({ modelId, url, uploaderId, uploaderName, allowedControllers, metadata }) => {
          console.log('Model published:', modelId, 'by', uploaderName);
          const baseUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';
          const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;
          setRoomModel({
            modelId,
            url: fullUrl,
            uploaderId,
            uploaderName,
            metadata
          });
          setModelTransform({
            position: [0, 0, 0],
            rotation: [0, 0, 0],
            scale: [1, 1, 1]
          });
          // Initialize allowed controllers list
          setAllowedControllers(allowedControllers || []);
          console.log('Initial allowed controllers:', allowedControllers);
        });

        socketRef.current?.on('model-unpublished', ({ modelId }) => {
          console.log('Model unpublished:', modelId);
          setRoomModel(null);
          setModelTransform({
            position: [0, 0, 0],
            rotation: [0, 0, 0],
            scale: [1, 1, 1]
          });
        });

        socketRef.current?.on('model-control', ({ modelId, seq, ts, payload, uploaderId }) => {
          // Apply control events from model owner to all participants
          if (payload.transform) {
            setModelTransform(payload.transform);
            console.log(`Model control update received - seq: ${seq}, from: ${uploaderId === socketRef.current?.id ? 'self' : 'owner'}`);
          }
        });

        socketRef.current?.on('model-camera', ({ modelId, camera }) => {
          // Apply camera updates from model owner
          if (camera) {
            setCameraState(camera);
            console.log('Camera update received:', camera);
          }
        });

        socketRef.current?.on('model-permissions', ({ modelId, allowedControllers }) => {
          // Update allowed controllers list
          if (allowedControllers) {
            setAllowedControllers(allowedControllers);
            console.log('Permissions updated:', allowedControllers);
          }
        });
      })
      .catch((err) => {
        console.error('Error accessing media devices:', err);
        alert('Please allow camera and microphone access');
      });

    return () => {
      localStreamRef.current?.getTracks().forEach((track) => track.stop());
      screenStreamRef.current?.getTracks().forEach((track) => track.stop());
      peersRef.current.forEach((p) => p.peer.destroy());
      screenPeersRef.current.forEach((p) => p.peer.destroy());
      socketRef.current?.disconnect();
      
      // Cleanup audio context
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      analyserNodesRef.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, userName]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Ensure local video element is always connected to stream
  useEffect(() => {
    if (localVideoRef.current && localStreamRef.current) {
      // Only set if not already set or if it's different
      const currentSrc = localVideoRef.current.srcObject as MediaStream | null;
      if (!currentSrc || currentSrc.id !== localStreamRef.current.id) {
        devLog('Reconnecting local video stream');
        localVideoRef.current.srcObject = localStreamRef.current;
        localVideoRef.current.play().catch((err) => {
          // Ignore AbortError - it's expected when stream changes rapidly
          if (err.name === 'AbortError') return;
          console.error('Error playing local video:', err);
        });
      }
    }
  }, [screenSharingUserId]); // Re-run when screen sharing state changes



  const toggleScreenShare = async () => {
    if (!isScreenSharing) {
      try {
        // Check device support
        if (!deviceInfo?.supportsScreenShare) {
          alert('Screen sharing is not supported on this browser. Please update to the latest version or try a different browser.');
          return;
        }

        // Universal screen share constraints that work across all devices
        interface ScreenShareConstraints {
          video: boolean | (MediaTrackConstraints & {
            cursor?: string;
            mediaSource?: string;
            displaySurface?: string;
            width?: { ideal: number };
            height?: { ideal: number };
            frameRate?: { ideal: number };
          });
          audio: boolean;
        }

        const constraints: ScreenShareConstraints = {
          video: true,
          audio: true, // Enable system audio capture
        };

        // Add device and browser-specific optimizations
        if (deviceInfo?.isIOS) {
          // iOS Safari - keep it simple, let the system handle it
          constraints.video = true;
          constraints.audio = true; // iOS supports audio in screen share
        } else if (deviceInfo?.isMobile || deviceInfo?.isTablet) {
          // Android mobile/tablet optimizations
          if (typeof constraints.video !== 'boolean') {
            constraints.video = {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              frameRate: { ideal: 24 },
            };
          }
          constraints.audio = true; // Android supports audio
        } else if (deviceInfo?.isChrome || deviceInfo?.isEdge) {
          // Desktop Chrome/Edge - supports system audio
          constraints.video = {
            cursor: 'always',
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            frameRate: { ideal: 30 },
          };
          constraints.audio = true; // Request system audio
        } else if (deviceInfo?.isFirefox) {
          // Desktop Firefox
          constraints.video = {
            mediaSource: 'screen',
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          };
          constraints.audio = true; // Firefox supports audio
        } else if (deviceInfo?.isSafari && deviceInfo?.isDesktop) {
          // Desktop Safari
          constraints.video = {
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          };
          constraints.audio = true; // Safari supports audio
        }

        console.log('Starting screen share with constraints:', constraints);
        const screenStream = await navigator.mediaDevices.getDisplayMedia(constraints);

        screenStreamRef.current = screenStream;
        const screenVideoTrack = screenStream.getVideoTracks()[0];
        const screenAudioTrack = screenStream.getAudioTracks()[0]; // System audio from screen

        console.log('Screen tracks obtained:', {
          video: screenVideoTrack?.label,
          audio: screenAudioTrack?.label || 'No system audio',
        });

        // Update state to trigger UI change
        setIsScreenSharing(true);
        setScreenSharingUserId('local');

        // Create screen share stream with both system audio and microphone
        const micAudioTrack = localStreamRef.current?.getAudioTracks()[0];
        const screenStreamWithAudio = new MediaStream([screenVideoTrack]);
        
        // Add system audio from screen share (if available)
        if (screenAudioTrack) {
          screenStreamWithAudio.addTrack(screenAudioTrack);
          console.log('Added system audio to screen share');
        }
        
        // Add microphone audio (if available)
        if (micAudioTrack) {
          screenStreamWithAudio.addTrack(micAudioTrack);
          console.log('Added microphone audio to screen share');
        }

        // Create SEPARATE screen share peers (camera peers stay active!)
        peersRef.current.forEach(({ userId, userName }) => {
          try {
            const screenPeer = createScreenPeer(userId, screenStreamWithAudio);
            screenPeersRef.current.push({
              peer: screenPeer,
              userId,
              userName,
            });
          } catch (err) {
            console.error(`Error creating screen peer for ${userId}:`, err);
          }
        });
        setScreenPeers([...screenPeersRef.current]);

        // Handle when user stops sharing via browser UI
        screenVideoTrack.onended = () => {
          console.log('Screen share ended by user');
          stopScreenShare();
        };

        // Notify server we're starting screen share
        socketRef.current?.emit('screen-share-started', { roomId });
        console.log('Screen sharing started successfully');
      } catch (err) {
        const error = err as Error & { name?: string };
        console.error('Error sharing screen:', error);
        if (error.name === 'NotAllowedError') {
          // User cancelled screen share
          return;
        }
        alert('Failed to share screen. Please try again.');
      }
    } else {
      stopScreenShare();
    }
  };

  const stopScreenShare = () => {
    console.log('Stopping screen share...');
    
    // Stop screen share tracks
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => {
        track.stop();
        console.log('Stopped screen track:', track.label);
      });
      screenStreamRef.current = null;
    }

    // Destroy ONLY the screen share peers (camera peers stay active!)
    screenPeersRef.current.forEach(({ peer }) => {
      try {
        peer.destroy();
      } catch (err) {
        console.error('Error destroying screen peer:', err);
      }
    });
    
    // Clear screen peers first
    screenPeersRef.current = [];
    setScreenPeers([]);

    // Update state - clear these AFTER peers are destroyed
    setIsScreenSharing(false);
    setScreenSharingUserId(null);
    
    // Notify server
    socketRef.current?.emit('screen-share-stopped', { roomId });
    console.log('Screen share stopped, camera restored');
    
    // Force a re-render by updating peers state
    setPeers([...peersRef.current]);
  };

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim()) {
      const message = {
        roomId,
        userName,
        message: newMessage.trim(),
        timestamp: Date.now(),
      };

      if (selectedChatUser === 'everyone') {
        socketRef.current?.emit('chat-message', message);
        setMessages((prev) => [
          ...prev,
          {
            id: `local-${message.timestamp}`,
            userName: 'You',
            userId: socketRef.current?.id || 'local',
            message: newMessage.trim(),
            timestamp: message.timestamp,
            isPrivate: false,
          },
        ]);
      } else {
        socketRef.current?.emit('private-message', { ...message, to: selectedChatUser });
        const recipientName = peers.find((p) => p.userId === selectedChatUser)?.userName;
        setMessages((prev) => [
          ...prev,
          {
            id: `local-${message.timestamp}`,
            userName: `You → ${recipientName}`,
            userId: socketRef.current?.id || 'local',
            message: newMessage.trim(),
            timestamp: message.timestamp,
            isPrivate: true,
            recipientId: selectedChatUser,
          },
        ]);
      }
      setNewMessage('');
    }
  };

  const leaveRoom = () => {
    window.location.href = `/event/${roomId}`;
  };

  const filteredMessages =
    selectedChatUser === 'everyone'
      ? messages.filter((m) => !m.isPrivate)
      : messages.filter(
          (m) =>
            m.isPrivate &&
            (m.userId === selectedChatUser || m.recipientId === selectedChatUser)
        );

  const totalParticipants = peers.length + 1;

  // Filter users based on search query
  const filteredUsers = useMemo(() => {
    if (!userSearchQuery.trim()) return peers;
    const query = userSearchQuery.toLowerCase();
    return peers.filter(peer => peer.userName.toLowerCase().includes(query));
  }, [peers, userSearchQuery]);

  // Get selected user name for display
  const selectedUserName = useMemo(() => {
    if (selectedChatUser === 'everyone') return 'Everyone';
    const peer = peers.find(p => p.userId === selectedChatUser);
    return peer ? `${peer.userName} (Private)` : 'Unknown User';
  }, [selectedChatUser, peers]);
  
  // Memoize grid class calculation for performance - Google Meet style
  const gridClass = useMemo(() => {
    if (screenSharingUserId) return '';
    
    // Responsive grid based on participant count (Google Meet style)
    if (totalParticipants === 1) return 'grid-cols-1 place-items-center';
    if (totalParticipants === 2) return 'grid-cols-1 md:grid-cols-2';
    if (totalParticipants <= 4) return 'grid-cols-2 md:grid-cols-2 lg:grid-cols-2';
    if (totalParticipants <= 6) return 'grid-cols-2 md:grid-cols-3';
    if (totalParticipants <= 9) return 'grid-cols-2 md:grid-cols-3 lg:grid-cols-3';
    if (totalParticipants <= 12) return 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4';
    return 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5';
  }, [totalParticipants, screenSharingUserId]);

  // Sort participants to put active speaker first
  const sortedPeers = useMemo(() => {
    if (!activeSpeaker) return peers;
    
    const sorted = [...peers];
    const activePeerIndex = sorted.findIndex(p => p.userId === activeSpeaker);
    
    if (activePeerIndex > -1) {
      const [activePeer] = sorted.splice(activePeerIndex, 1);
      sorted.unshift(activePeer);
    }
    
    return sorted;
  }, [peers, activeSpeaker]);

  // Memoize toggle functions to prevent unnecessary re-renders
  const handleToggleAudio = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
  }, []);

  const handleToggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  }, []);

  // 3D Model functions
  const handleModelUpload = useCallback(async (file: File) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('model', file);
      formData.append('roomId', roomId);
      formData.append('uploaderId', socketRef.current?.id || '');
      formData.append('uploaderName', userName);

      const baseUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';
      const response = await fetch(`${baseUrl}/api/models/upload`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const modelData = await response.json();
      const fullUrl = modelData.url.startsWith('http') ? modelData.url : `${baseUrl}${modelData.url}`;
      setUploadedModel({
        ...modelData,
        url: fullUrl
      });
      console.log('Model uploaded:', modelData);
    } catch (error) {
      console.error('Error uploading model:', error);
      alert('Failed to upload model. Please try again.');
    } finally {
      setIsUploading(false);
    }
  }, [roomId, userName]);

  const handleModelPublish = useCallback(() => {
    if (uploadedModel && socketRef.current) {
      socketRef.current.emit('model-publish', {
        roomId,
        modelData: uploadedModel
      });
      setIsModelPublished(true);
      setHandGestureEnabled(true);
      console.log('✅ Model published to room - Hand gestures ENABLED');
      console.log('Published model:', uploadedModel);
      console.log('Is controller:', true);
    }
  }, [uploadedModel, roomId]);

  const handleModelUnpublish = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit('model-unpublish', { roomId });
      setIsModelPublished(false);
      setHandGestureEnabled(false);
      console.log('Model unpublished from room');
    }
  }, [roomId]);

  const handleModelTransformChange = useCallback((transform: typeof modelTransform) => {
    setModelTransform(transform);
    
    // Send control event to server (throttled)
    if (socketRef.current && isModelPublished) {
      modelSeqRef.current += 1;
      socketRef.current.emit('model-control', {
        roomId,
        modelId: uploadedModel?.modelId,
        seq: modelSeqRef.current,
        ts: Date.now(),
        payload: { transform }
      });
      console.log('Emitting model-control:', { seq: modelSeqRef.current, position: transform.position });
    }
  }, [roomId, uploadedModel, isModelPublished]);

  const handleCameraChange = useCallback((camera: typeof cameraState) => {
    setCameraState(camera);
    
    // Send camera update to server (throttled)
    if (socketRef.current && isModelPublished) {
      socketRef.current.emit('model-camera', {
        roomId,
        modelId: uploadedModel?.modelId,
        camera
      });
    }
  }, [roomId, uploadedModel, isModelPublished]);

  const handleResetModel = useCallback(() => {
    const resetTransform = {
      position: [0, 0, 0] as [number, number, number],
      rotation: [0, 0, 0] as [number, number, number],
      scale: [1, 1, 1] as [number, number, number]
    };
    
    setModelTransform(resetTransform);
    
    // Broadcast reset to all participants
    if (socketRef.current && isModelPublished) {
      modelSeqRef.current += 1;
      socketRef.current.emit('model-control', {
        roomId,
        modelId: uploadedModel?.modelId,
        seq: modelSeqRef.current,
        ts: Date.now(),
        payload: { transform: resetTransform }
      });
      console.log('Model reset to center');
    }
  }, [roomId, uploadedModel, isModelPublished]);

  const handlePermissionChange = useCallback((userIds: string[]) => {
    setAllowedControllers(userIds);
    
    // Broadcast permission changes to server
    if (socketRef.current && isModelPublished) {
      socketRef.current.emit('model-permissions', {
        roomId,
        modelId: uploadedModel?.modelId,
        allowedControllers: userIds
      });
      console.log('Emitting permissions:', userIds);
    }
  }, [roomId, uploadedModel, isModelPublished]);

  // Debug: Log permission state changes
  useEffect(() => {
    console.log('=== Permission State Debug ===');
    console.log('My socket ID:', socketRef.current?.id);
    console.log('Allowed controllers:', allowedControllers);
    console.log('Is model published:', isModelPublished);
    console.log('Room model uploader:', roomModel?.uploaderId);
    const isController = isModelPublished && 
      (roomModel?.uploaderId === socketRef.current?.id || 
       allowedControllers.includes(socketRef.current?.id || ''));
    console.log('Am I controller?', isController);
    console.log('============================');
  }, [allowedControllers, isModelPublished, roomModel]);

  const lastControlEventRef = useRef<number>(0);
  const CONTROL_THROTTLE_MS = 50; // 20 Hz

  const handleGesture = useCallback((gesture: any) => {
    if (!isModelPublished || !uploadedModel) return;

    const now = Date.now();
    const shouldSendEvent = now - lastControlEventRef.current >= CONTROL_THROTTLE_MS;

    setModelTransform(prev => {
      const newTransform = { ...prev };

      switch (gesture.type) {
        case 'reset':
          // Reset model to center with default scale
          newTransform.position = [0, 0, 0];
          newTransform.rotation = [0, 0, 0];
          newTransform.scale = [1, 1, 1];
          console.log('Model reset to center');
          break;
        case 'pinch_move':
          // Move model in X/Y plane with boundaries
          const newX = prev.position[0] + (gesture.delta.x || 0) * 1.5;
          const newY = prev.position[1] + (gesture.delta.y || 0) * 1.5;
          const newZ = prev.position[2] + (gesture.delta.z || 0);
          newTransform.position = [
            Math.max(-5, Math.min(5, newX)),
            Math.max(-5, Math.min(5, newY)),
            Math.max(-5, Math.min(5, newZ))
          ];
          break;
        case 'rotate':
          // Rotate around Y axis
          newTransform.rotation = [
            prev.rotation[0],
            prev.rotation[1] + (gesture.delta.angle || 0),
            prev.rotation[2]
          ];
          break;
        case 'scale':
          // Zoom in/out
          const scaleChange = gesture.delta.scale || 1;
          const clampedScale = Math.max(0.5, Math.min(5, prev.scale[0] * scaleChange));
          newTransform.scale = [clampedScale, clampedScale, clampedScale];
          break;
      }

      // Send control event (throttled)
      if (socketRef.current && shouldSendEvent) {
        modelSeqRef.current += 1;
        lastControlEventRef.current = now;
        socketRef.current.emit('model-control', {
          roomId,
          modelId: uploadedModel.modelId,
          seq: modelSeqRef.current,
          ts: now,
          payload: { transform: newTransform }
        });
        console.log('Gesture control - emitting:', gesture.type, newTransform.position);
      }

      return newTransform;
    });
  }, [roomId, uploadedModel, isModelPublished]);

  // Get the stream for floating window (screen share if active, otherwise local video)
  const getFloatingWindowStream = useCallback(() => {
    // If screen sharing, show screen share
    if (screenSharingUserId) {
      if (screenSharingUserId === 'local') {
        const stream = screenStreamRef.current;
        if (stream && stream.getTracks().length > 0) {
          return { stream, userName: `${userName} (You) - Screen Share`, isScreenShare: true };
        }
      } else {
        const peer = screenPeers.find(p => p.userId === screenSharingUserId);
        const stream = peer?.stream;
        if (stream && stream.getTracks().length > 0) {
          return { stream, userName: `${peer?.userName || 'Unknown'} - Screen Share`, isScreenShare: true };
        }
      }
    }
    
    // Otherwise show local video
    const stream = localStreamRef.current;
    if (stream && stream.getTracks().length > 0) {
      return { stream, userName: `${userName} (You)`, isScreenShare: false };
    }
    
    return null;
  }, [screenSharingUserId, screenPeers, userName]);

  const floatingWindowData = getFloatingWindowStream();

  // Get all participants for floating window tabs
  const getAllParticipants = useCallback(() => {
    const participants = [];
    
    // Add screen share if active (highest priority)
    if (screenSharingUserId) {
      if (screenSharingUserId === 'local') {
        const stream = screenStreamRef.current;
        if (stream && stream.getTracks().length > 0) {
          participants.push({ 
            id: 'screen-local', 
            stream, 
            userName: `${userName} (You) - Screen Share`, 
            isScreenShare: true 
          });
        }
      } else {
        const peer = screenPeers.find(p => p.userId === screenSharingUserId);
        if (peer?.stream && peer.stream.getTracks().length > 0) {
          participants.push({ 
            id: `screen-${peer.userId}`, 
            stream: peer.stream, 
            userName: `${peer.userName} - Screen Share`, 
            isScreenShare: true 
          });
        }
      }
    }
    
    // Add local video
    if (localStreamRef.current && localStreamRef.current.getTracks().length > 0) {
      participants.push({ 
        id: 'local', 
        stream: localStreamRef.current, 
        userName: `${userName} (You)`, 
        isScreenShare: false 
      });
    }
    
    // Add other participants
    peers.forEach(peer => {
      if (peer.stream && peer.stream.getTracks().length > 0) {
        participants.push({ 
          id: peer.userId, 
          stream: peer.stream, 
          userName: peer.userName, 
          isScreenShare: false 
        });
      }
    });
    
    return participants;
  }, [screenSharingUserId, screenPeers, peers, userName]);

  const allParticipants = getAllParticipants();

  return (
    <>
      {/* Floating Window with tabs - Shows all participants */}
      <FloatingWindow
        participants={allParticipants}
        isVisible={showFloatingWindow && allParticipants.length > 0}
        onClose={() => setShowFloatingWindow(false)}
      />

      <div className="h-screen bg-gray-900 text-white flex flex-col">
        <div className="bg-gray-800 px-3 md:px-4 py-2 md:py-3 flex items-center justify-between border-b border-gray-700 flex-shrink-0">
        <div className="flex-1">
          <h2 className="text-base md:text-lg font-semibold">Room: {roomId}</h2>
          <p className="text-xs text-gray-400">
            {totalParticipants} participant{totalParticipants !== 1 ? 's' : ''}
            {deviceInfo && (
              <span className="ml-2 opacity-60 hidden sm:inline">
                • {deviceInfo.isMobile ? '📱' : deviceInfo.isTablet ? '📱' : '💻'}{' '}
                {deviceInfo.isChrome
                  ? 'Chrome'
                  : deviceInfo.isFirefox
                    ? 'Firefox'
                    : deviceInfo.isSafari
                      ? 'Safari'
                      : deviceInfo.isEdge
                        ? 'Edge'
                        : 'Browser'}
              </span>
            )}
            {isPiPActive && (
              <span className="ml-2 text-blue-400">
                • 🖼️ PiP Active
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLowPowerMode(!lowPowerMode)}
            className={`p-2 rounded-lg ${
              lowPowerMode ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-700 hover:bg-gray-600'
            } transition-colors hidden sm:flex items-center justify-center touch-manipulation`}
            title={lowPowerMode ? 'Low Power Mode ON' : 'Low Power Mode OFF'}
            aria-label={lowPowerMode ? 'Disable low power mode' : 'Enable low power mode'}
          >
            <span className="text-sm">⚡</span>
          </button>
          <button
            onClick={() => setPipEnabled(!pipEnabled)}
            className={`p-2 rounded-lg ${
              pipEnabled ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-700 hover:bg-gray-600'
            } transition-colors hidden sm:flex items-center justify-center touch-manipulation`}
            title={pipEnabled ? 'Disable floating window' : 'Enable floating window'}
            aria-label={pipEnabled ? 'Disable floating window' : 'Enable floating window'}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 4v16M17 4v16M3 8h18M3 12h18M3 16h18"
              />
            </svg>
          </button>
          <button
            onClick={() => setShow3DPanel(!show3DPanel)}
            className={`p-2 rounded-lg ${
              show3DPanel ? 'bg-purple-600 hover:bg-purple-700' : 'bg-gray-700 hover:bg-gray-600'
            } transition-colors flex items-center justify-center touch-manipulation`}
            title="3D Model Control"
            aria-label="Toggle 3D model panel"
          >
            <span className="text-lg">🎨</span>
          </button>
          <button
          onClick={() => setShowChat(!showChat)}
            className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors relative flex items-center justify-center touch-manipulation"
            aria-label={showChat ? 'Close chat' : 'Open chat'}
            aria-expanded={showChat}
          >
            <svg
              className="w-5 h-5 md:w-6 md:h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            {messages.length > 0 && !showChat && (
              <span className="absolute -top-1 -right-1 bg-red-600 text-xs rounded-full w-5 h-5 flex items-center justify-center" aria-label={`${messages.length} unread messages`}>
                {messages.length}
              </span>
            )}
          </button>
        </div>
        </div>

      <div className="flex-1 flex overflow-hidden">
        {/* 3D Model Panel */}
        {show3DPanel && (
          <div className="absolute md:relative inset-0 md:inset-auto w-full md:w-80 bg-gray-800 md:border-r border-gray-700 flex flex-col flex-shrink-0 z-40 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">3D Model</h3>
              <button
                onClick={() => setShow3DPanel(false)}
                className="md:hidden p-1 rounded hover:bg-gray-700 touch-manipulation"
                aria-label="Close 3D panel"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <ModelUploadPanel
              onUpload={handleModelUpload}
              onPublish={handleModelPublish}
              onUnpublish={handleModelUnpublish}
              onReset={handleResetModel}
              onPermissionChange={handlePermissionChange}
              isPublished={isModelPublished}
              isUploading={isUploading}
              hasModel={!!uploadedModel}
              participants={peers.map(p => ({ userId: p.userId, userName: p.userName }))}
              allowedControllers={allowedControllers}
            />
          </div>
        )}

        <div className="flex-1 flex flex-col overflow-hidden relative">
          {/* 3D Model Viewer Overlay - Optimized size */}
          {roomModel && (
            <div className="absolute inset-4 md:top-4 md:right-4 md:left-auto md:bottom-auto md:w-[400px] md:h-[400px] z-30 bg-gray-900 rounded-lg shadow-2xl border-2 border-purple-500 overflow-hidden">
              <div className="absolute top-2 left-2 bg-black bg-opacity-70 px-3 py-2 rounded text-sm z-10 flex items-center gap-2">
                <span>🎨 {roomModel.uploaderName}&apos;s Model</span>
                {isModelPublished && roomModel.uploaderId === socketRef.current?.id && (
                  <span className="text-green-400 flex items-center gap-1">
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                    Controlling
                  </span>
                )}
              </div>
              <button
                onClick={() => setRoomModel(null)}
                className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 p-2 rounded z-10 transition-colors"
                title="Close model viewer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <ModelViewer
                modelUrl={roomModel.url}
                transform={modelTransform}
                cameraState={cameraState}
                isController={
                  isModelPublished && 
                  (roomModel.uploaderId === socketRef.current?.id || 
                   allowedControllers.includes(socketRef.current?.id || ''))
                }
                onTransformChange={handleModelTransformChange}
                onCameraChange={handleCameraChange}
              />
              <div className="absolute bottom-2 left-2 right-2 bg-black bg-opacity-70 px-3 py-2 rounded text-xs z-10">
                <p className="text-gray-300">
                  {isModelPublished && 
                   (roomModel.uploaderId === socketRef.current?.id || 
                    allowedControllers.includes(socketRef.current?.id || ''))
                    ? '👋 Gestures: 👍 Reset • ✌️ Move • ✊ Zoom • ✋ Rotate | Mouse: Drag model • Scroll zoom • Right-click rotate view'
                    : '👁️ View-only mode'}
                </p>
              </div>
            </div>
          )}

          {/* Hand Gesture Control - Uses main camera */}
          {handGestureEnabled && isModelPublished && (
            <HandGestureControl
              enabled={handGestureEnabled}
              videoElement={localVideoRef.current}
              onGesture={handleGesture}
            />
          )}

          {screenSharingUserId ? (
            <>
              {/* Screen share view - Zoom-style layout: Large screen share with horizontal participant strip */}
              <div className="flex-1 bg-black p-2 md:p-4 flex flex-col overflow-hidden">
                {/* Main screen share area */}
                <div className="flex-1 bg-gray-900 rounded-lg overflow-hidden relative mb-2">
                  {screenSharingUserId === 'local' ? (
                    <LocalScreenShare 
                      stream={screenStreamRef.current} 
                      userName={userName}
                    />
                  ) : (
                    (() => {
                      const sharingPeer = screenPeers.find((p) => p.userId === screenSharingUserId);
                      
                      // Safety check: if peer not found, clear screenSharingUserId
                      if (!sharingPeer) {
                        // Clear the state asynchronously to avoid setState during render
                        Promise.resolve().then(() => setScreenSharingUserId(null));
                        return (
                          <div className="w-full h-full flex items-center justify-center bg-gray-800">
                            <span className="text-gray-400">Screen share ended</span>
                          </div>
                        );
                      }
                      
                      return (
                        <VideoCard
                          key={`screen-${sharingPeer.userId}-${sharingPeer.stream?.id || 'no-stream'}`}
                          peer={sharingPeer.peer}
                          userName={`${sharingPeer.userName} - Sharing Screen`}
                          stream={sharingPeer.stream}
                          isMainView={true}
                        />
                      );
                    })()
                  )}
                </div>

                {/* Horizontal scrollable participant strip at bottom (Zoom-style) */}
                <div className="flex-shrink-0 h-24 md:h-32">
                  <div className="flex gap-2 overflow-x-auto pb-1 h-full scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
                    {/* Local video - Compact horizontal tile */}
                    <div 
                      className={`flex-shrink-0 w-32 md:w-40 h-full relative bg-gray-800 rounded-lg overflow-hidden transition-all duration-300 ${
                        activeSpeaker === 'local' 
                          ? 'ring-2 ring-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]' 
                          : ''
                      }`}
                    >
                      <LocalVideoStrip 
                        stream={localStreamRef.current} 
                        userName={userName} 
                        isVideoEnabled={isVideoEnabled}
                      />
                    </div>

                    {/* Other participants - Compact horizontal tiles */}
                    {sortedPeers.map((peer) => (
                      <div
                        key={`strip-${peer.userId}`}
                        className={`flex-shrink-0 w-32 md:w-40 h-full relative bg-gray-800 rounded-lg overflow-hidden transition-all duration-300 ${
                          activeSpeaker === peer.userId 
                            ? 'ring-2 ring-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]' 
                            : ''
                        }`}
                      >
                        <VideoCardStrip 
                          key={`video-${peer.userId}-${peer.stream?.id || 'no-stream'}`}
                          peer={peer.peer} 
                          userName={peer.userName} 
                          stream={peer.stream} 
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className={`flex-1 p-2 md:p-4 grid ${gridClass} gap-2 md:gap-3 overflow-auto content-start ${totalParticipants === 1 ? 'max-w-4xl mx-auto' : ''}`}>
              {/* Local video - with active speaker glow */}
              <div 
                className={`relative bg-gray-800 rounded-lg overflow-hidden min-h-[180px] transition-all duration-300 ${
                  activeSpeaker === 'local' 
                    ? 'ring-4 ring-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.6)]' 
                    : ''
                }`}
                style={{ aspectRatio: '16/9' }}
              >
                <video 
                  key="local-camera-grid"
                  ref={localVideoRef} 
                  autoPlay 
                  muted 
                  playsInline 
                  className="w-full h-full object-cover" 
                />
                <div className="absolute bottom-1 left-1 md:bottom-2 md:left-2 bg-black bg-opacity-70 px-2 py-1 md:px-3 rounded text-xs md:text-sm z-10">
                  {userName} (You)
                </div>
                {!isVideoEnabled && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-700">
                    <span className="text-4xl md:text-6xl">👤</span>
                  </div>
                )}
              </div>

              {/* Other participants - sorted with active speaker first */}
              {sortedPeers.map((peer) => (
                <div 
                  key={peer.userId} 
                  className={`relative bg-gray-800 rounded-lg overflow-hidden min-h-[180px] transition-all duration-300 ${
                    activeSpeaker === peer.userId 
                      ? 'ring-4 ring-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.6)]' 
                      : ''
                  }`}
                  style={{ aspectRatio: '16/9' }}
                >
                  <VideoCard 
                    key={`grid-${peer.userId}-${peer.stream?.id || 'no-stream'}`}
                    peer={peer.peer} 
                    userName={peer.userName} 
                    stream={peer.stream}
                    isMainView={false} 
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {showChat && (
          <div className="absolute md:relative inset-0 md:inset-auto w-full md:w-80 bg-gray-800 md:border-l border-gray-700 flex flex-col flex-shrink-0 z-50">
            <div className="p-3 md:p-4 border-b border-gray-700 flex-shrink-0 flex items-center justify-between">
              <h3 className="font-semibold">Chat</h3>
              <button
                onClick={() => setShowChat(false)}
                className="md:hidden p-1 rounded hover:bg-gray-700 touch-manipulation"
                aria-label="Close chat"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-3 md:px-4 pt-2 pb-3 border-b border-gray-700 flex-shrink-0">
              <div className="relative user-dropdown-container">
                {/* Selected user display / Search input */}
                <div className="relative">
                  <input
                    type="text"
                    value={showUserDropdown ? userSearchQuery : selectedUserName}
                    onChange={(e) => {
                      setUserSearchQuery(e.target.value);
                      if (!showUserDropdown) setShowUserDropdown(true);
                    }}
                    onFocus={() => setShowUserDropdown(true)}
                    placeholder="Search users or select Everyone..."
                    className="w-full bg-gray-700 rounded px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={() => setShowUserDropdown(!showUserDropdown)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                    aria-label="Toggle dropdown"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>

                {/* Dropdown menu */}
                {showUserDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-gray-700 rounded shadow-lg max-h-60 overflow-y-auto z-10 border border-gray-600">
                    {/* Everyone option */}
                    <button
                      onClick={() => {
                        setSelectedChatUser('everyone');
                        setUserSearchQuery('');
                        setShowUserDropdown(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-600 transition-colors ${
                        selectedChatUser === 'everyone' ? 'bg-blue-600' : ''
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span>👥</span>
                        <span>Everyone</span>
                      </span>
                    </button>

                    {/* Filtered users */}
                    {filteredUsers.length > 0 ? (
                      filteredUsers.map((peer) => (
                        <button
                          key={peer.userId}
                          onClick={() => {
                            setSelectedChatUser(peer.userId);
                            setUserSearchQuery('');
                            setShowUserDropdown(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-600 transition-colors ${
                            selectedChatUser === peer.userId ? 'bg-blue-600' : ''
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <span>🔒</span>
                            <span>{peer.userName}</span>
                            <span className="text-xs text-gray-400">(Private)</span>
                          </span>
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-sm text-gray-400 text-center">
                        No users found
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-2">
              {filteredMessages.length === 0 ? (
                <div className="text-center text-gray-500 text-sm mt-4">
                  {selectedChatUser === 'everyone' ? 'No messages yet' : 'No private messages yet'}
                </div>
              ) : (
                filteredMessages.map((msg) => (
                  <div key={msg.id} className={`rounded-lg p-2 md:p-3 ${msg.isPrivate ? 'bg-blue-900' : 'bg-gray-700'}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs md:text-sm font-semibold text-blue-400">
                        {msg.userName} {msg.isPrivate && '🔒'}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs md:text-sm break-words">{msg.message}</p>
                  </div>
                ))
              )}
              <div ref={chatEndRef} />
            </div>
            <form onSubmit={sendMessage} className="p-3 md:p-4 border-t border-gray-700 flex-shrink-0">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={`Message ${
                    selectedChatUser === 'everyone'
                      ? 'everyone'
                      : peers.find((p) => p.userId === selectedChatUser)?.userName
                  }...`}
                  className="flex-1 bg-gray-700 rounded-lg px-3 md:px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 rounded-lg px-3 md:px-4 py-2 text-sm font-semibold transition-colors"
                >
                  Send
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      <div className="bg-gray-800 border-t border-gray-700 p-3 md:p-4 flex-shrink-0">
        <div className="flex justify-center gap-2 md:gap-3">
          <button
            onClick={handleToggleAudio}
            className={`p-2 md:p-3 rounded-full ${
              isAudioEnabled ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-700'
            } transition-colors flex items-center justify-center touch-manipulation`}
            title={isAudioEnabled ? 'Mute' : 'Unmute'}
            aria-label={isAudioEnabled ? 'Mute microphone' : 'Unmute microphone'}
          >
            <svg
              className="w-5 h-5 md:w-6 md:h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              {isAudioEnabled ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
                />
              )}
            </svg>
          </button>

          <button
            onClick={handleToggleVideo}
            className={`p-2 md:p-3 rounded-full ${
              isVideoEnabled ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-700'
            } transition-colors flex items-center justify-center touch-manipulation`}
            title={isVideoEnabled ? 'Stop video' : 'Start video'}
            aria-label={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
          >
            <svg
              className="w-5 h-5 md:w-6 md:h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              {isVideoEnabled ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                />
              )}
            </svg>
          </button>

          <button
            onClick={toggleScreenShare}
            className={`p-2 md:p-3 rounded-full ${
              isScreenSharing
                ? 'bg-blue-600 hover:bg-blue-700'
                : deviceInfo?.supportsScreenShare
                  ? 'bg-gray-700 hover:bg-gray-600'
                  : 'bg-gray-600 opacity-50 cursor-not-allowed'
            } transition-colors flex items-center justify-center touch-manipulation`}
            title={
              !deviceInfo?.supportsScreenShare
                ? 'Screen sharing not supported - please update your browser'
                : isScreenSharing
                  ? 'Stop sharing'
                  : 'Share screen'
            }
            aria-label={isScreenSharing ? 'Stop screen sharing' : 'Start screen sharing'}
            disabled={!deviceInfo?.supportsScreenShare}
          >
            <svg
              className="w-5 h-5 md:w-6 md:h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              {isScreenSharing ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              )}
            </svg>
          </button>

          <button
            onClick={leaveRoom}
            className="p-2 md:p-3 px-4 md:px-6 rounded-full bg-red-600 hover:bg-red-700 transition-colors font-semibold text-sm md:text-base touch-manipulation"
            title="Leave meeting"
            aria-label="Leave meeting"
          >
            Leave
          </button>
        </div>
      </div>
      </div>
    </>
  );
}

const VideoCard = React.memo(function VideoCard({
  peer,
  userName,
  stream,
  isMainView = false,
}: {
  peer: SimplePeer.Instance;
  userName: string;
  stream?: MediaStream;
  isMainView?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasVideo, setHasVideo] = useState(true);
  const [currentStream, setCurrentStream] = useState<MediaStream | null>(stream || null);

  // Listen for new stream events from peer
  useEffect(() => {
    const handleStream = (newStream: MediaStream) => {
      devLog('VideoCard received new stream:', newStream.id);
      setCurrentStream(newStream);
    };

    peer.on('stream', handleStream);

    return () => {
      peer.off('stream', handleStream);
    };
  }, [peer]);

  // Update current stream when prop changes
  useEffect(() => {
    if (stream && (!currentStream || stream.id !== currentStream.id)) {
      devLog('VideoCard updating stream from prop:', stream.id);
      // Use a microtask to avoid setState in effect warning
      Promise.resolve().then(() => setCurrentStream(stream));
    }
  }, [stream, currentStream]);

  // Handle video element and track listeners
  useEffect(() => {
    const activeStream = currentStream;
    if (!activeStream || !videoRef.current) return;

    devLog('VideoCard setting up video element:', activeStream.id);
    const videoElement = videoRef.current;
    
    // Set stream to video element
    videoElement.srcObject = activeStream;
    videoElement.play().catch((err) => {
      // Ignore AbortError - it's expected when stream changes rapidly
      if (err.name === 'AbortError') return;
      console.error('Error playing video:', err);
      // Retry after delay
      setTimeout(() => {
        videoElement.play().catch(() => {});
      }, 200);
    });

    // Setup track listeners
    const videoTrack = activeStream.getVideoTracks()[0];
    if (!videoTrack) return;

    const handleEnded = () => setHasVideo(false);
    const handleMute = () => setHasVideo(false);
    const handleUnmute = () => setHasVideo(true);

    // Initialize video state asynchronously to avoid setState in effect warning
    Promise.resolve().then(() => setHasVideo(videoTrack.enabled));
    
    videoTrack.addEventListener('ended', handleEnded);
    videoTrack.addEventListener('mute', handleMute);
    videoTrack.addEventListener('unmute', handleUnmute);

    return () => {
      videoTrack.removeEventListener('ended', handleEnded);
      videoTrack.removeEventListener('mute', handleMute);
      videoTrack.removeEventListener('unmute', handleUnmute);
    };
  }, [currentStream]);

  return (
    <>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={false}
        className={`w-full h-full ${isMainView ? 'object-contain bg-black' : 'object-cover'}`}
      />
      <div
        className={`absolute ${
          isMainView ? 'bottom-2 left-2 md:bottom-4 md:left-4 px-3 py-1 md:px-4 md:py-2 rounded-lg' : 'bottom-1 left-1 md:bottom-2 md:left-2 px-2 py-1 md:px-3 rounded'
        } bg-black bg-opacity-70`}
      >
        <span className={`${isMainView ? 'text-xs md:text-sm font-semibold' : 'text-xs md:text-sm'}`}>{userName}</span>
      </div>
      {!hasVideo && currentStream && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-700">
          <span className={`${isMainView ? 'text-5xl md:text-8xl' : 'text-4xl md:text-6xl'}`}>👤</span>
        </div>
      )}
      {!currentStream && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-700">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 md:h-12 md:w-12 border-b-2 border-white mx-auto mb-2"></div>
            <span className="text-xs md:text-sm">Connecting...</span>
          </div>
        </div>
      )}
    </>
  );
});

const LocalScreenShare = React.memo(function LocalScreenShare({
  stream,
  userName,
}: {
  stream: MediaStream | null;
  userName: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currentStreamIdRef = useRef<string | null>(null);
  const playPromiseRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    if (!stream || !videoRef.current) {
      console.log('LocalScreenShare: No stream or video ref');
      return;
    }

    const videoElement = videoRef.current;
    const streamId = stream.id;
    
    // Prevent play interruption by checking if this exact stream is already set
    if (currentStreamIdRef.current === streamId) {
      return;
    }
    
    console.log('LocalScreenShare: Setting up stream', streamId);

    // Handle stream update asynchronously
    const updateStream = async () => {
      try {
        // Wait for any pending play promise
        if (playPromiseRef.current) {
          await playPromiseRef.current.catch(() => {});
        }
        
        // Pause and update stream
        videoElement.pause();
        videoElement.srcObject = stream;
        currentStreamIdRef.current = streamId;
        
        // Wait for metadata
        await new Promise<void>((resolve) => {
          if (videoElement.readyState >= 1) {
            resolve();
          } else {
            videoElement.addEventListener('loadedmetadata', () => resolve(), { once: true });
          }
        });
        
        console.log('LocalScreenShare: Metadata loaded, attempting play');
        
        // Play the video
        playPromiseRef.current = videoElement.play();
        await playPromiseRef.current;
        playPromiseRef.current = null;
        
        console.log('LocalScreenShare: Playing successfully');
        setIsPlaying(true);
        setError(null);
      } catch (err) {
        playPromiseRef.current = null;
        // Silently ignore AbortError and NotAllowedError
        if (err instanceof Error && err.name !== 'AbortError' && err.name !== 'NotAllowedError') {
          console.error('LocalScreenShare: Play error:', err);
          setError('Failed to play screen share');
        }
      }
    };

    updateStream();

    // Handle play event
    const handlePlay = () => {
      console.log('LocalScreenShare: Play event fired');
      setIsPlaying(true);
      setError(null);
    };

    // Handle pause event
    const handlePause = () => {
      console.log('LocalScreenShare: Pause event fired');
      setIsPlaying(false);
    };

    // Handle error event
    const handleError = (e: Event) => {
      console.error('LocalScreenShare: Video error:', e);
      setError('Video playback error');
    };

    videoElement.addEventListener('play', handlePlay);
    videoElement.addEventListener('pause', handlePause);
    videoElement.addEventListener('error', handleError);

    // Cleanup
    return () => {
      videoElement.removeEventListener('play', handlePlay);
      videoElement.removeEventListener('pause', handlePause);
      videoElement.removeEventListener('error', handleError);
    };
  }, [stream]);

  // Reset stream tracking when component unmounts
  useEffect(() => {
    return () => {
      currentStreamIdRef.current = null;
      playPromiseRef.current = null;
    };
  }, []);

  return (
    <>
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="w-full h-full object-contain bg-black"
        style={{ maxHeight: '100%', maxWidth: '100%' }}
      />
      <div className="absolute bottom-2 left-2 md:bottom-4 md:left-4 bg-black bg-opacity-70 px-3 py-1 md:px-4 md:py-2 rounded-lg z-10">
        <span className="text-xs md:text-sm font-semibold">{userName} (You) - Sharing Screen</span>
      </div>
      {!isPlaying && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 md:h-16 md:w-16 border-b-2 border-white mx-auto mb-3 md:mb-4"></div>
            <span className="text-sm md:text-lg">Starting screen share...</span>
          </div>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
          <div className="text-center px-4">
            <span className="text-sm md:text-lg text-red-400">{error}</span>
          </div>
        </div>
      )}
    </>
  );
});

const LocalVideoStrip = React.memo(function LocalVideoStrip({
  stream,
  userName,
  isVideoEnabled,
}: {
  stream: MediaStream | null;
  userName: string;
  isVideoEnabled: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch((err) => {
        // Ignore AbortError - it's expected when stream changes rapidly
        if (err.name !== 'AbortError') {
          console.error('Error playing video:', err);
        }
      });
    }
  }, [stream]);

  return (
    <>
      <video 
        ref={videoRef}
        autoPlay 
        muted 
        playsInline 
        className="w-full h-full object-cover"
      />
      <div className="absolute bottom-1 left-1 md:bottom-2 md:left-2 bg-black bg-opacity-70 px-2 py-1 rounded text-xs z-10">
        {userName} (You)
      </div>
      {!isVideoEnabled && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-700">
          <span className="text-2xl md:text-3xl">👤</span>
        </div>
      )}
    </>
  );
});

const VideoCardStrip = React.memo(function VideoCardStrip({
  peer,
  userName,
  stream,
}: {
  peer: SimplePeer.Instance;
  userName: string;
  stream?: MediaStream;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasVideo, setHasVideo] = useState(true);
  const [peerStream, setPeerStream] = useState<MediaStream | null>(null);
  const currentStreamIdRef = useRef<string | null>(null);
  const playPromiseRef = useRef<Promise<void> | null>(null);

  // Derive the active stream from props or peer stream
  const activeStream = stream || peerStream;

  // Listen for stream events from peer if stream prop is not provided
  useEffect(() => {
    if (!stream) {
      const handleStream = (newStream: MediaStream) => {
        console.log(`VideoCardStrip received stream for ${userName}:`, newStream.id);
        setPeerStream(newStream);
      };

      peer.on('stream', handleStream);
      return () => {
        peer.off('stream', handleStream);
      };
    }
  }, [peer, stream, userName]);

  // Update video element when stream changes
  useEffect(() => {
    if (!activeStream || !videoRef.current) return;

    const videoElement = videoRef.current;
    const streamId = activeStream.id;
    
    // Prevent play interruption by checking if this exact stream is already set
    if (currentStreamIdRef.current === streamId) {
      return;
    }

    console.log(`Setting video srcObject for ${userName}:`, streamId);
    
    // Wait for any pending play promise to resolve before changing stream
    const updateStream = async () => {
      try {
        if (playPromiseRef.current) {
          await playPromiseRef.current.catch(() => {});
        }
        
        // Pause and clear current stream
        videoElement.pause();
        videoElement.srcObject = activeStream;
        currentStreamIdRef.current = streamId;
        
        // Wait for metadata to load
        await new Promise<void>((resolve) => {
          if (videoElement.readyState >= 1) {
            resolve();
          } else {
            videoElement.addEventListener('loadedmetadata', () => resolve(), { once: true });
          }
        });
        
        // Play the video
        playPromiseRef.current = videoElement.play();
        await playPromiseRef.current;
        playPromiseRef.current = null;
      } catch (err) {
        playPromiseRef.current = null;
        // Silently ignore AbortError and NotAllowedError
        if (err instanceof Error && err.name !== 'AbortError' && err.name !== 'NotAllowedError') {
          console.error(`Error playing video for ${userName}:`, err);
        }
      }
    };
    
    updateStream();
    
    const videoTrack = activeStream.getVideoTracks()[0];
    if (!videoTrack) return;

    // Set up event listeners for track state changes
    const updateVideoState = (enabled: boolean) => {
      setHasVideo(enabled);
    };

    const handleEnded = () => updateVideoState(false);
    const handleMute = () => updateVideoState(false);
    const handleUnmute = () => updateVideoState(true);
    
    // Initialize state from track
    updateVideoState(videoTrack.enabled);
    
    videoTrack.addEventListener('ended', handleEnded);
    videoTrack.addEventListener('mute', handleMute);
    videoTrack.addEventListener('unmute', handleUnmute);
    
    return () => {
      videoTrack.removeEventListener('ended', handleEnded);
      videoTrack.removeEventListener('mute', handleMute);
      videoTrack.removeEventListener('unmute', handleUnmute);
    };
  }, [activeStream, userName]);

  return (
    <>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={false}
        className="w-full h-full object-cover"
      />
      <div className="absolute bottom-1 left-1 md:bottom-2 md:left-2 bg-black bg-opacity-70 px-2 py-1 rounded text-xs z-10">
        {userName}
      </div>
      {!hasVideo && activeStream && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-700">
          <span className="text-2xl md:text-3xl">👤</span>
        </div>
      )}
      {!activeStream && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-700">
          <div className="text-center">
            <div className="animate-spin rounded-full h-6 w-6 md:h-8 md:w-8 border-b-2 border-white mx-auto mb-1"></div>
            <span className="text-xs">Connecting...</span>
          </div>
        </div>
      )}
    </>
  );
});
