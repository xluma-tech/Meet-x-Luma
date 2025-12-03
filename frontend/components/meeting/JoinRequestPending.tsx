'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';

interface JoinRequestPendingProps {
  meetingCode: string;
  meetingTitle: string;
  requesterName: string;
  onAccepted?: () => void;
}

export default function JoinRequestPending({
  meetingCode,
  meetingTitle,
  requesterName,
  onAccepted,
}: JoinRequestPendingProps) {
  const router = useRouter();
  const [dots, setDots] = useState('');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [status, setStatus] = useState<'pending' | 'accepted' | 'rejected'>('pending');

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);

    return () => clearInterval(interval);
  }, []);

  // Setup socket connection to listen for acceptance/rejection
  useEffect(() => {
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || window.location.origin;
    const newSocket = io(socketUrl, {
      transports: ['websocket', 'polling'],
    });

    newSocket.on('connect', () => {
      console.log('JoinRequestPending socket connected - waiting for admission');
      // DO NOT join the meeting room - stay in waiting room
      // We listen to the meeting room channel for join-request events
      // but we don't actually join as a participant
      const pendingRequestId = localStorage.getItem('pendingRequestId');
      if (pendingRequestId) {
        // Join a waiting room specific to this request
        newSocket.emit('join-waiting-room', { 
          requestId: pendingRequestId,
          meetingCode: meetingCode 
        });
      }
    });

    // Listen for acceptance
    newSocket.on('join-request-accepted', (data) => {
      console.log('Join request accepted!', data);
      // Check if this is for the current user
      const currentUserEmail = localStorage.getItem('userEmail');
      const currentUserAuth0Id = localStorage.getItem('userAuth0Id');
      const pendingRequestId = localStorage.getItem('pendingRequestId');
      
      if (data.requestId === pendingRequestId || 
          data.requesterAuth0Id === currentUserAuth0Id || 
          data.requesterEmail === currentUserEmail) {
        setStatus('accepted');
        // Clear stored data
        localStorage.removeItem('pendingRequestId');
        // Call the callback to revalidate and show join screen
        if (onAccepted) {
          setTimeout(() => {
            onAccepted();
          }, 1500);
        } else {
          // Fallback: reload the page
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        }
      }
    });

    // Listen for rejection
    newSocket.on('join-request-rejected', (data) => {
      console.log('Join request rejected', data);
      const currentUserEmail = localStorage.getItem('userEmail');
      const currentUserAuth0Id = localStorage.getItem('userAuth0Id');
      
      if (data.requesterAuth0Id === currentUserAuth0Id || data.requesterEmail === currentUserEmail) {
        setStatus('rejected');
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [meetingCode, requesterName]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          {/* Animated Icon */}
          <div className="relative w-24 h-24 mx-auto mb-6">
            <div className={`absolute inset-0 ${
              status === 'accepted' ? 'bg-gradient-to-br from-green-500 to-emerald-500' :
              status === 'rejected' ? 'bg-gradient-to-br from-red-500 to-rose-500' :
              'bg-gradient-to-br from-orange-500 to-red-500 animate-pulse'
            } rounded-full`}></div>
            <div className="absolute inset-2 bg-white rounded-full flex items-center justify-center">
              {status === 'accepted' ? (
                <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : status === 'rejected' ? (
                <svg className="w-12 h-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-12 h-12 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </div>
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {status === 'accepted' ? 'Request Accepted!' :
             status === 'rejected' ? 'Request Rejected' :
             'Request Sent!'}
          </h2>
          <p className="text-gray-600 mb-6">
            {status === 'accepted' ? 'Redirecting you to the meeting...' :
             status === 'rejected' ? 'Your request to join was declined by the host' :
             `Waiting for host approval${dots}`}
          </p>

          {/* Meeting Info */}
          <div className="bg-orange-50 rounded-lg p-4 mb-6 border border-orange-200">
            <div className="text-sm text-orange-900 mb-1">Meeting:</div>
            <div className="font-semibold text-orange-900">{meetingTitle}</div>
            <div className="text-sm text-orange-700 mt-2">Code: {meetingCode}</div>
          </div>

          {/* Status */}
          <div className="bg-blue-50 rounded-lg p-4 mb-6 border border-blue-200">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-sm text-blue-900 text-left">
                <div className="font-semibold mb-1">What's happening?</div>
                <ul className="space-y-1 text-blue-800">
                  <li>• Your request has been sent to the host and co-hosts</li>
                  <li>• They will receive an email notification</li>
                  <li>• You'll be able to join once they accept your request</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Loading Animation */}
          <div className="flex justify-center gap-2 mb-6">
            <div className="w-3 h-3 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-3 h-3 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-3 h-3 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={() => router.push('/dashboard')}
              className="w-full px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg transition-colors font-medium"
            >
              Go to Dashboard
            </button>
            <button
              onClick={() => router.push('/')}
              className="w-full px-4 py-3 text-gray-600 hover:text-gray-900 transition-colors font-medium"
            >
              Back to Home
            </button>
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-6 text-center text-sm text-gray-600">
          <p>This page will automatically update when your request is processed.</p>
          <p className="mt-2">You can also check back later using the meeting code.</p>
        </div>
      </div>
    </div>
  );
}
