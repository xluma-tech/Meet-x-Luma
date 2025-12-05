'use client';

import React, { useEffect, useRef } from 'react';
import { Participant, Track } from 'livekit-client';

interface ParticipantTileSFUProps {
  participant: Participant;
}

export default function ParticipantTileSFU({ participant }: ParticipantTileSFUProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (!participant) return;

    const attachTracks = () => {
      // Attach video track
      const videoPublication = participant.getTrackPublication(Track.Source.Camera);
      if (videoPublication?.track && videoRef.current) {
        const videoTrack = videoPublication.track;
        videoTrack.attach(videoRef.current);
      }

      // Attach audio track (only for remote participants)
      if (!participant.isLocal) {
        const audioPublication = participant.getTrackPublication(Track.Source.Microphone);
        if (audioPublication?.track && audioRef.current) {
          const audioTrack = audioPublication.track;
          audioTrack.attach(audioRef.current);
        }
      }
    };

    attachTracks();

    // Listen for track updates
    const handleTrackSubscribed = () => attachTracks();
    const handleTrackUnsubscribed = () => attachTracks();

    participant.on('trackSubscribed', handleTrackSubscribed);
    participant.on('trackUnsubscribed', handleTrackUnsubscribed);

    return () => {
      participant.off('trackSubscribed', handleTrackSubscribed);
      participant.off('trackUnsubscribed', handleTrackUnsubscribed);

      // Detach tracks
      const videoPublication = participant.getTrackPublication(Track.Source.Camera);
      if (videoPublication?.track && videoRef.current) {
        videoPublication.track.detach(videoRef.current);
      }

      if (!participant.isLocal) {
        const audioPublication = participant.getTrackPublication(Track.Source.Microphone);
        if (audioPublication?.track && audioRef.current) {
          audioPublication.track.detach(audioRef.current);
        }
      }
    };
  }, [participant]);

  const isVideoEnabled = participant.isCameraEnabled;
  const isAudioEnabled = participant.isMicrophoneEnabled;

  return (
    <div className="relative bg-gray-800 rounded-lg overflow-hidden aspect-video">
      {isVideoEnabled ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={participant.isLocal}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gray-700">
          <div className="w-20 h-20 rounded-full bg-blue-500 flex items-center justify-center text-white text-3xl font-bold">
            {participant.name?.[0]?.toUpperCase() || participant.identity?.[0]?.toUpperCase() || '?'}
          </div>
        </div>
      )}

      {!participant.isLocal && (
        <audio ref={audioRef} autoPlay playsInline />
      )}

      <div className="absolute bottom-2 left-2 bg-black bg-opacity-60 px-3 py-1 rounded-full text-white text-sm flex items-center gap-2">
        <span>{participant.name || participant.identity}</span>
        {!isAudioEnabled && (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
            <line x1="2" y1="2" x2="18" y2="18" stroke="currentColor" strokeWidth="2" />
          </svg>
        )}
      </div>

      {participant.isLocal && (
        <div className="absolute top-2 left-2 bg-blue-500 px-2 py-1 rounded text-white text-xs font-semibold">
          You
        </div>
      )}
    </div>
  );
}
