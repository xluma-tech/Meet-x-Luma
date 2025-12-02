'use client';

import { useUser } from '@/lib/useUser';
import { useEffect, useRef } from 'react';
import Link from 'next/link';

export default function AuthStatus() {
  const { user, isLoading } = useUser();
  const syncedRef = useRef(false);

  useEffect(() => {
    // Sync user to MongoDB when they log in
    if (user && !syncedRef.current) {
      syncedRef.current = true;
      
      fetch('/api/auth/sync', { method: 'POST' })
        .then(res => res.json())
        .then(data => {
          console.log('User synced:', data.isNewUser ? 'New user' : 'Existing user');
        })
        .catch(err => console.error('Error syncing user:', err));
    }
  }, [user]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse"></div>
      </div>
    );
  }

  if (user) {
    return (
      <div className="flex items-center gap-4">
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
            // Clear local state
            window.location.href = '/api/auth/logout';
          }}
          className="text-gray-600 hover:text-gray-900 transition-colors text-sm font-medium"
        >
          Sign Out
        </button>
      </div>
    );
  }

  return (
    <a
      href="/api/auth/login"
      className="px-6 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors font-medium"
    >
      Sign In
    </a>
  );
}
