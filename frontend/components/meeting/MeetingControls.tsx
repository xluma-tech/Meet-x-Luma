'use client';

import { useAuth } from '@/lib/hooks/useAuth';
import { hasPermission, UserRole } from '@/lib/roles';
import { useState } from 'react';

interface MeetingControlsProps {
  meetingId: string;
  participants: Array<{
    id: string;
    name: string;
    role: UserRole;
    isMuted: boolean;
    isVideoOff: boolean;
  }>;
}

export default function MeetingControls({ meetingId, participants }: MeetingControlsProps) {
  const { user, permissions, isGuest } = useAuth();
  const [selectedParticipant, setSelectedParticipant] = useState<string | null>(null);

  const handleEndMeeting = async () => {
    if (!permissions?.canEndMeeting) {
      alert('You do not have permission to end this meeting');
      return;
    }

    if (confirm('Are you sure you want to end this meeting for everyone?')) {
      // Implement end meeting logic
      console.log('Ending meeting:', meetingId);
    }
  };

  const handleMuteParticipant = async (participantId: string) => {
    if (!permissions?.canMuteParticipants) {
      alert('You do not have permission to mute participants');
      return;
    }

    // Implement mute logic
    console.log('Muting participant:', participantId);
  };

  const handleRemoveParticipant = async (participantId: string) => {
    if (!permissions?.canRemoveParticipants) {
      alert('You do not have permission to remove participants');
      return;
    }

    if (confirm('Are you sure you want to remove this participant?')) {
      // Implement remove logic
      console.log('Removing participant:', participantId);
    }
  };

  const handleAssignCohost = async (participantAuth0Id: string) => {
    if (!permissions?.canManageCohosts) {
      alert('Only the host can assign cohosts');
      return;
    }

    try {
      const response = await fetch(`/api/meetings/${meetingId}/cohost`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantAuth0Id }),
      });

      if (response.ok) {
        alert('Cohost assigned successfully');
      } else {
        alert('Failed to assign cohost');
      }
    } catch (error) {
      console.error('Error assigning cohost:', error);
      alert('An error occurred');
    }
  };

  return (
    <div className="meeting-controls">
      {/* User Info */}
      <div className="user-info-bar">
        <div className="user-details">
          <span className="user-name">{user?.name}</span>
          <span className={`role-badge role-${user?.role || 'guest'}`}>
            {user?.role?.toUpperCase() || 'GUEST'}
          </span>
          {isGuest && (
            <span className="guest-notice">Limited features in guest mode</span>
          )}
        </div>
      </div>

      {/* Meeting Controls */}
      <div className="control-buttons">
        {/* Basic Controls - Available to all */}
        <button className="control-btn" disabled={!permissions?.canUseMicrophone}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
          Microphone
        </button>

        <button className="control-btn" disabled={!permissions?.canUseCamera}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          Camera
        </button>

        {permissions?.canShareScreen && (
          <button className="control-btn">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Share Screen
          </button>
        )}

        {permissions?.canChat && (
          <button className="control-btn">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            Chat
          </button>
        )}

        {/* Host/Cohost Controls */}
        {permissions?.canEndMeeting && (
          <button className="control-btn danger-btn" onClick={handleEndMeeting}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            End Meeting
          </button>
        )}
      </div>

      {/* Participants List */}
      <div className="participants-section">
        <h3 className="section-title">
          Participants ({participants.length})
        </h3>
        <div className="participants-list">
          {participants.map((participant) => (
            <div key={participant.id} className="participant-item">
              <div className="participant-info">
                <span className="participant-name">{participant.name}</span>
                <span className={`role-badge role-${participant.role}`}>
                  {participant.role}
                </span>
              </div>

              <div className="participant-status">
                {participant.isMuted && (
                  <span className="status-icon muted">🔇</span>
                )}
                {participant.isVideoOff && (
                  <span className="status-icon video-off">📹</span>
                )}
              </div>

              {/* Participant Actions (Host/Cohost only) */}
              {(permissions?.canMuteParticipants || permissions?.canRemoveParticipants) && (
                <div className="participant-actions">
                  {permissions?.canMuteParticipants && (
                    <button
                      onClick={() => handleMuteParticipant(participant.id)}
                      className="action-btn"
                      title="Mute participant"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                      </svg>
                    </button>
                  )}

                  {permissions?.canManageCohosts && participant.role === UserRole.PARTICIPANT && (
                    <button
                      onClick={() => handleAssignCohost(participant.id)}
                      className="action-btn"
                      title="Make cohost"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                      </svg>
                    </button>
                  )}

                  {permissions?.canRemoveParticipants && (
                    <button
                      onClick={() => handleRemoveParticipant(participant.id)}
                      className="action-btn danger"
                      title="Remove participant"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Permission Notice for Guests */}
      {isGuest && (
        <div className="guest-notice-box">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p>
            You're in guest mode. <a href="/api/auth/signup">Create an account</a> to unlock all features.
          </p>
        </div>
      )}
    </div>
  );
}
