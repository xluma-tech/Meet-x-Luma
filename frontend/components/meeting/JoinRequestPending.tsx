'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface JoinRequestPendingProps {
  meetingCode: string;
  meetingTitle: string;
  requesterName: string;
}

export default function JoinRequestPending({
  meetingCode,
  meetingTitle,
  requesterName,
}: JoinRequestPendingProps) {
  const router = useRouter();
  const [dots, setDots] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          {/* Animated Icon */}
          <div className="relative w-24 h-24 mx-auto mb-6">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500 to-red-500 rounded-full animate-pulse"></div>
            <div className="absolute inset-2 bg-white rounded-full flex items-center justify-center">
              <svg className="w-12 h-12 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Request Sent!
          </h2>
          <p className="text-gray-600 mb-6">
            Waiting for host approval{dots}
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
