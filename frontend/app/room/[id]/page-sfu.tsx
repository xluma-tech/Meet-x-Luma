'use client';

import React, { useEffect, useState, useContext } from 'react';
import { useParams } from 'next/navigation';
import { Room, RoomEvent, Track, Participant } from 'livekit-client';
import VideoGridSFU from './components/VideoGridSFU';
import ControlsSFU from './components/ControlsSFU';
import { MeetingContext } from './RoomWrapper';

export default function RoomPageSFU() {
  const params = useParams();
  const roomId = (Array.isArray(params?.id) ? params.id[0] : params?.id) as string;
  
  // Get user name from MeetingContext
  const { userName: contextUserName } = useContext(MeetingContext);
  const userName = contextUserName || 'Guest';
  
  const [room, setRoom] = useState<Room | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isConnecting, setIsConnecting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);

  useEffect(() => {
    if (!roomId || !userName || userName === 'Guest') {
      console.log('⏳ Waiting for roomId and userName...', { roomId, userName });
      return;
    }

    let roomInstance: Room | null = null;

    const connectToRoom = async () => {
      try {
        setIsConnecting(true);
        console.log('🚀 Connecting to SFU room:', roomId, 'as:', userName);

        // Get access token from backend
        const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:4000';
        const response = await fetch(`${BACKEND_URL}/api/rooms/${roomId}/join`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            identity: `user-${Date.now()}`,
            name: userName,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to get access token');
        }

        const { token, wsUrl } = await response.json();
        console.log('✅ Received access token, connecting to:', wsUrl);

        // Create room instance
        roomInstance = new Room({
          adaptiveStream: true,
          dynacast: true,
          videoCaptureDefaults: {
            resolution: {
              width: 1280,
              height: 720,
              frameRate: 30,
            },
          },
        });

        // Set up event listeners
        roomInstance
          .on(RoomEvent.ParticipantConnected, handleParticipantConnected)
          .on(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected)
          .on(RoomEvent.TrackSubscribed, handleTrackSubscribed)
          .on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed)
          .on(RoomEvent.LocalTrackPublished, handleLocalTrackPublished)
          .on(RoomEvent.Disconnected, handleDisconnected)
          .on(RoomEvent.Reconnecting, () => console.log('🔄 Reconnecting...'))
          .on(RoomEvent.Reconnected, () => console.log('✅ Reconnected'));

        // Connect to room
        await roomInstance.connect(wsUrl, token);
        console.log('✅ Connected to room:', roomInstance.name);

        // Publish camera and microphone
        await roomInstance.localParticipant.enableCameraAndMicrophone();
        console.log('✅ Published local tracks');

        setRoom(roomInstance);
        setIsConnecting(false);

        // Update participants list
        updateParticipants(roomInstance);
      } catch (err) {
        console.error('❌ Error connecting to room:', err);
        setError(err instanceof Error ? err.message : 'Failed to connect');
        setIsConnecting(false);
      }
    };

    connectToRoom();

    // Cleanup
    return () => {
      console.log('🧹 Cleaning up SFU connection');
      if (roomInstance) {
        roomInstance.disconnect();
      }
    };
  }, [roomId, userName]);

  const handleParticipantConnected = (participant: Participant) => {
    console.log('👋 Participant connected:', participant.identity);
    if (room) updateParticipants(room);
  };

  const handleParticipantDisconnected = (participant: Participant) => {
    console.log('👋 Participant disconnected:', participant.identity);
    if (room) updateParticipants(room);
  };

  const handleTrackSubscribed = (track: any, publication: any, participant: Participant) => {
    console.log('📹 Track subscribed:', track.kind, 'from', participant.identity);
    if (room) updateParticipants(room);
  };

  const handleTrackUnsubscribed = (track: any, publication: any, participant: Participant) => {
    console.log('📹 Track unsubscribed:', track.kind, 'from', participant.identity);
    if (room) updateParticipants(room);
  };

  const handleLocalTrackPublished = (publication: any) => {
    console.log('📤 Local track published:', publication.kind);
  };

  const handleDisconnected = () => {
    console.log('🔌 Disconnected from room');
    setRoom(null);
  };

  const updateParticipants = (roomInstance: Room) => {
    const allParticipants = [
      roomInstance.localParticipant,
      ...Array.from(roomInstance.remoteParticipants.values()),
    ];
    setParticipants(allParticipants);
    console.log('👥 Participants updated:', allParticipants.length);
  };

  const toggleAudio = async () => {
    if (!room) return;
    try {
      const enabled = !isAudioEnabled;
      await room.localParticipant.setMicrophoneEnabled(enabled);
      setIsAudioEnabled(enabled);
      console.log('🎤 Audio:', enabled ? 'enabled' : 'disabled');
    } catch (err) {
      console.error('Error toggling audio:', err);
    }
  };

  const toggleVideo = async () => {
    if (!room) return;
    try {
      const enabled = !isVideoEnabled;
      await room.localParticipant.setCameraEnabled(enabled);
      setIsVideoEnabled(enabled);
      console.log('📹 Video:', enabled ? 'enabled' : 'disabled');
    } catch (err) {
      console.error('Error toggling video:', err);
    }
  };

  const leaveRoom = () => {
    if (room) {
      room.disconnect();
    }
    window.location.href = '/';
  };

  if (isConnecting) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <div className="text-white text-xl">Connecting to room...</div>
          <div className="text-gray-400 text-sm mt-2">Using SFU (LiveKit)</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-center max-w-md">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <div className="text-red-500 text-xl mb-4">Connection Error</div>
          <div className="text-gray-300 mb-6">{error}</div>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-900 flex flex-col">
      <VideoGridSFU participants={participants} />
      <ControlsSFU
        isAudioEnabled={isAudioEnabled}
        isVideoEnabled={isVideoEnabled}
        onToggleAudio={toggleAudio}
        onToggleVideo={toggleVideo}
        onLeave={leaveRoom}
        participantCount={participants.length}
      />
    </div>
  );
}
