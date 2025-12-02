'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface JoinMeetingScreenProps {
  meetingCode: string;
  meetingTitle?: string;
  isAuthenticated: boolean;
  userName?: string;
  onJoin: (name: string) => void;
  onSignIn: () => void;
}

export default function JoinMeetingScreen({
  meetingCode,
  meetingTitle,
  isAuthenticated,
  userName,
  onJoin,
  onSignIn,
}: JoinMeetingScreenProps) {
  const [guestName, setGuestName] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleJoinAsGuest = () => {
    const name = guestName.trim();
    if (!name) {
      setError('Please enter your name');
      return;
    }
    if (name.length < 2) {
      setError('Name must be at least 2 characters');
      return;
    }
    if (name.length > 50) {
      setError('Name must be less than 50 characters');
      return;
    }
    onJoin(name);
  };

  const handleJoinAuthenticated = () => {
    if (userName) {
      onJoin(userName);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold">Join Meeting</h1>
              <p className="text-blue-100 text-sm">Ready to connect?</p>
            </div>
          </div>
          {meetingTitle && (
            <div className="mt-4 bg-white bg-opacity-10 rounded-lg p-3">
              <p className="text-sm text-blue-100">Meeting</p>
              <p className="font-semibold">{meetingTitle}</p>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-6">
          {isAuthenticated ? (
            /* Authenticated User */
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-green-600 font-medium">Signed in as</p>
                    <p className="text-gray-900 font-semibold">{userName}</p>
                  </div>
                </div>
              </div>

              <button
                onClick={handleJoinAuthenticated}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Join Meeting
              </button>
            </div>
          ) : (
            /* Guest User */
            <div className="space-y-6">
              {/* Sign In Option */}
              <div>
                <div className="text-center mb-4">
                  <p className="text-gray-600 text-sm">Have an account?</p>
                </div>
                <button
                  onClick={onSignIn}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                  Sign In
                </button>
              </div>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-gray-500">or continue as guest</span>
                </div>
              </div>

              {/* Guest Name Input */}
              <div>
                <label htmlFor="guestName" className="block text-sm font-medium text-gray-700 mb-2">
                  Enter your name
                </label>
                <input
                  id="guestName"
                  type="text"
                  value={guestName}
                  onChange={(e) => {
                    setGuestName(e.target.value);
                    setError('');
                  }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleJoinAsGuest();
                    }
                  }}
                  placeholder="John Doe"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400"
                  maxLength={50}
                />
                {error && (
                  <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {error}
                  </p>
                )}
              </div>

              <button
                onClick={handleJoinAsGuest}
                disabled={!guestName.trim()}
                className="w-full bg-gray-800 hover:bg-gray-900 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Join as Guest
              </button>
            </div>
          )}

          {/* Meeting Code Display */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="text-center">
              <p className="text-xs text-gray-500 mb-2">Meeting Code</p>
              <p className="text-lg font-mono font-semibold text-gray-900">{meetingCode}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
