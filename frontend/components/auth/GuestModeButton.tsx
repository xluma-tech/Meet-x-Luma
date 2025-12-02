'use client';

import { useState } from 'react';

interface GuestModeButtonProps {
  meetingId?: string;
}

export default function GuestModeButton({ meetingId }: GuestModeButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGuestJoin = async () => {
    if (!guestName.trim()) {
      alert('Please enter your name');
      return;
    }

    if (!meetingId) {
      alert('Meeting ID is required');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/guest/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: guestName, meetingId }),
      });

      if (!response.ok) {
        throw new Error('Failed to create guest session');
      }

      const data = await response.json();
      
      // Store guest session in localStorage
      localStorage.setItem('guestSession', JSON.stringify(data));
      
      // Redirect to meeting
      window.location.href = `/room/${meetingId}`;
    } catch (error) {
      console.error('Error joining as guest:', error);
      alert('Failed to join as guest. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="auth-button guest-button"
      >
        <svg className="button-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        Continue as Guest
      </button>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">Join as Guest</h2>
            <p className="modal-description">
              Enter your name to join the meeting as a guest
            </p>
            <input
              type="text"
              placeholder="Your name"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              className="guest-name-input"
              maxLength={50}
            />
            <div className="modal-actions">
              <button
                onClick={() => setShowModal(false)}
                className="modal-button cancel-button"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleGuestJoin}
                className="modal-button join-button"
                disabled={loading}
              >
                {loading ? 'Joining...' : 'Join Meeting'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
