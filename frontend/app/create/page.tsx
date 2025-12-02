'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUser } from '@/lib/useUser';
import Link from 'next/link';
import ParticipantManager from '@/components/meeting/ParticipantManager';

interface Participant {
  email: string;
  role: 'host' | 'cohost' | 'participant';
  name?: string;
}

function CreateMeetingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading } = useUser();
  
  const mode = searchParams.get('mode'); // 'guest' or null (authenticated)
  const isGuestMode = mode === 'guest';

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    guestName: '',
    userName: '', // For logged-in users to optionally customize their display name
    title: '',
    description: '',
    type: 'public', // 'public' or 'private'
  });
  const [participants, setParticipants] = useState<Participant[]>([]);

  // Set default userName from Auth0 when user loads
  useEffect(() => {
    if (user?.name && !isGuestMode) {
      setFormData(prev => ({ ...prev, userName: user.name || '' }));
    }
  }, [user, isGuestMode]);

  // Sync user to backend when logged in
  useEffect(() => {
    if (user && !isGuestMode) {
      // Sync user to backend
      fetch('/api/auth/sync', {
        method: 'POST',
      })
        .then(res => {
          if (!res.ok) {
            return res.json().then(data => {
              console.error('Sync failed:', data);
              throw new Error(data.error || 'Sync failed');
            });
          }
          return res.json();
        })
        .then(data => {
          console.log('User synced successfully:', data);
        })
        .catch(err => {
          console.error('Failed to sync user:', err);
          // Show error to user
          alert('Failed to sync your account. Please refresh the page and try again.');
        });
    }
  }, [user, isGuestMode]);

  // Redirect to sign in if trying to access authenticated mode without being logged in
  useEffect(() => {
    if (!isLoading && !isGuestMode && !user) {
      router.push('/api/auth/login?returnTo=' + encodeURIComponent('/create'));
    }
  }, [isLoading, isGuestMode, user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:4000';
      
      let endpoint = `${BACKEND_URL}/api/meetings`;
      let body: any = {
        title: formData.title,
        description: formData.description,
      };

      if (isGuestMode) {
        // Guest meeting
        endpoint = `${BACKEND_URL}/api/meetings/guest`;
        body.guestName = formData.guestName;
      } else {
        // Authenticated meeting
        body.auth0Id = user?.sub;
        body.type = formData.type;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create meeting');
      }

      const data = await response.json();
      const meetingData = data.data?.meeting || data.meeting || data;

      // Send invitations for private meetings
      if (formData.type === 'private' && participants.length > 0) {
        const invitePromises = participants.map(participant =>
          fetch(`${BACKEND_URL}/api/meetings/${meetingData._id}/invite`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              hostAuth0Id: user?.sub,
              email: participant.email,
              role: participant.role, // Send the role (cohost or participant)
              message: `You've been invited to join "${formData.title}"${participant.role === 'cohost' ? ' as a co-host' : ''}`,
            }),
          }).catch(err => console.error('Failed to send invitation:', err))
        );

        // Wait for all invitations to be sent (but don't block on failures)
        await Promise.allSettled(invitePromises);
      }

      // Store guest host ID in localStorage if guest meeting
      if (isGuestMode && meetingData.guestHostId) {
        localStorage.setItem(`guestHost_${meetingData.meetingCode}`, meetingData.guestHostId);
      }

      // Redirect to meeting room with name parameter
      const displayName = isGuestMode ? formData.guestName : (formData.userName || user?.name || 'User');
      router.push(`/room/${meetingData.meetingCode}?name=${encodeURIComponent(displayName)}`);
    } catch (error: any) {
      console.error('Error creating meeting:', error);
      alert(error.message || 'Failed to create meeting. Please try again.');
      setLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="text-xl font-bold text-gray-900">Luma Meet</span>
            </Link>
            
            {user && (
              <div className="flex items-center gap-4">
                <Link href="/dashboard" className="text-gray-700 hover:text-gray-900 transition-colors font-medium">
                  Dashboard
                </Link>
                <img
                  src={user.picture || '/default-avatar.png'}
                  alt={user.name || 'User'}
                  className="w-8 h-8 rounded-full border-2 border-blue-500"
                />
                <span className="text-gray-900 text-sm font-medium hidden md:block">{user.name}</span>
                <button
                  onClick={() => window.location.href = '/api/auth/logout'}
                  className="px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors text-sm font-medium"
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              {isGuestMode ? 'Create Instant Meeting' : 'Create New Meeting'}
            </h1>
            <p className="text-gray-600 text-lg">
              {isGuestMode 
                ? 'No sign-up required. Get started in seconds.'
                : 'Set up your meeting and invite participants'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200 space-y-6">
              {/* Guest Name (only for guest mode) */}
              {isGuestMode && (
                <div>
                  <label className="block text-sm font-semibold mb-3 text-gray-900">
                    Your Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.guestName}
                    onChange={(e) => setFormData({ ...formData, guestName: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                    placeholder="Enter your name"
                    maxLength={50}
                  />
                </div>
              )}

              {/* User Name (for logged-in users - optional customization) */}
              {!isGuestMode && user && (
                <div>
                  <label className="block text-sm font-semibold mb-3 text-gray-900">
                    Your Display Name
                  </label>
                  <input
                    type="text"
                    value={formData.userName}
                    onChange={(e) => setFormData({ ...formData, userName: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                    placeholder="How you'll appear in the meeting"
                    maxLength={50}
                  />
                  <p className="text-xs text-gray-500 mt-1">Leave blank to use your account name: {user.name}</p>
                </div>
              )}

              {/* Meeting Title */}
              <div>
                <label className="block text-sm font-semibold mb-3 text-gray-900">
                  Meeting Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                  placeholder="e.g., Team Standup, Client Meeting"
                  maxLength={100}
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold mb-3 text-gray-900">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500 resize-none"
                  placeholder="What's this meeting about?"
                  maxLength={500}
                />
              </div>

              {/* Meeting Type (only for authenticated users) */}
              {!isGuestMode && user && (
                <div>
                  <label className="block text-sm font-semibold mb-3 text-gray-900">
                    Meeting Type
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, type: 'public' });
                        setParticipants([]);
                      }}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        formData.type === 'public'
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <div className="text-left">
                        <div className="font-semibold text-gray-900 mb-1">🌐 Public</div>
                        <div className="text-sm text-gray-600">Anyone with the code can join</div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, type: 'private' })}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        formData.type === 'private'
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <div className="text-left">
                        <div className="font-semibold text-gray-900 mb-1">🔒 Private</div>
                        <div className="text-sm text-gray-600">Only invited users can join</div>
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {/* Participant Manager (only for private meetings) */}
              {!isGuestMode && user && formData.type === 'private' && (
                <div className="pt-4 border-t border-gray-200">
                  <ParticipantManager
                    participants={participants}
                    onParticipantsChange={setParticipants}
                    hostEmail={user.email}
                  />
                </div>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-4 px-8 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 flex items-center justify-center gap-3 shadow-lg"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Creating...</span>
                </>
              ) : (
                <span>Create Meeting</span>
              )}
            </button>
          </form>

          {/* Info Box */}
          <div className="mt-8 bg-blue-50 rounded-xl p-6 border border-blue-200">
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">What happens next?</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• You'll get a unique meeting code</li>
                  <li>• Share the code with your participants</li>
                  <li>• {isGuestMode ? 'Everyone can join instantly' : 'Manage participants and assign cohosts'}</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


export default function CreateMeeting() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <CreateMeetingContent />
    </Suspense>
  );
}
