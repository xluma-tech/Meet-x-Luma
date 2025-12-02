'use client';

import Link from 'next/link';
import { useUser } from '@/lib/useUser';

export default function Header() {
  const { user, isLoading } = useUser();

  return (
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
          
          <div className="flex items-center gap-4">
            {!isLoading && user && (
              <>
                <Link href="/dashboard" className="text-gray-700 hover:text-gray-900 transition-colors font-medium">
                  Dashboard
                </Link>
                <div className="flex items-center gap-3">
                  <img
                    src={user.picture || '/default-avatar.png'}
                    alt={user.name || 'User'}
                    className="w-8 h-8 rounded-full border-2 border-blue-500"
                  />
                  <span className="text-gray-900 text-sm hidden md:block font-medium">{user.name}</span>
                </div>
                <button
                  onClick={() => {
                    window.location.href = '/api/auth/logout';
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors text-sm font-medium"
                >
                  Sign Out
                </button>
              </>
            )}
            
            {!isLoading && !user && (
              <button
                onClick={() => {
                  window.location.href = '/api/auth/login';
                }}
                className="px-6 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors font-medium"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
