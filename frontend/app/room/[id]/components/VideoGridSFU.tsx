'use client';

import React from 'react';
import ParticipantTileSFU from './ParticipantTileSFU';
import { Participant } from 'livekit-client';

interface VideoGridSFUProps {
  participants: Participant[];
}

export default function VideoGridSFU({ participants }: VideoGridSFUProps) {
  const getGridClass = () => {
    const count = participants.length;
    if (count === 1) return 'grid-cols-1';
    if (count === 2) return 'grid-cols-2';
    if (count <= 4) return 'grid-cols-2 grid-rows-2';
    if (count <= 6) return 'grid-cols-3 grid-rows-2';
    if (count <= 9) return 'grid-cols-3 grid-rows-3';
    return 'grid-cols-4 grid-rows-4';
  };

  return (
    <div className={`flex-1 grid ${getGridClass()} gap-2 p-4 bg-gray-900`}>
      {participants.map((participant) => (
        <ParticipantTileSFU
          key={participant.sid}
          participant={participant}
        />
      ))}
    </div>
  );
}
