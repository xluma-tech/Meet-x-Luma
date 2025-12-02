'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function MeetingNotFound() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <div className="text-8xl mb-4">😞</div>
          <h1 className="text-4xl font-bold text-white mb-4">Meeting Not Found</h1>
          <p className="text-gray-300 text-lg mb-2">
            The meeting you're looking for doesn't exist or has been removed.
          </p>
          <p className="text-gray-400 text-sm">
            It may have ended or the meeting code is incorrect.
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => router.push('/')}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold py-4 px-8 rounded-xl transition-all transform hover:scale-105 shadow-lg"
          >
            Go Home
          </button>

          <button
            onClick={() => router.push('/dashboard')}
            className="w-full bg-white/10 hover:bg-white/20 text-white font-semibold py-4 px-8 rounded-xl transition-all backdrop-blur-sm"
          >
            Go to Dashboard
          </button>
        </div>

        <div className="mt-8 p-4 bg-white/5 rounded-lg backdrop-blur-sm">
          <p className="text-gray-300 text-sm mb-2">Need help?</p>
          <ul className="text-gray-400 text-xs space-y-1">
            <li>• Check if the meeting code is correct</li>
            <li>• Ask the host for a new meeting link</li>
            <li>• Create a new meeting from the homepage</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
