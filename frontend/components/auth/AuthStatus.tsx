'use client';

import { useUser } from '@auth0/nextjs-auth0/client';
import { useEffect, useRef } from 'react';
import Link from 'next/link';
import LogoutButton from './LogoutButton';

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
          if (data.isNewUser) {
            console.log('New user created in MongoDB');
          }
        })
        .catch(err => console.error('Error syncing user:', err));
    }
  }, [user]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-white/10 animate-pulse"></div>
      </div>
    );
  }

  if (user) {
    return (
      <div className="flex items-center gap-4">
        <Link href="/dashboard" className="text-gray-300 hover:text-white transition-colors">
          Dashboard
        </Link>
        <div className="flex items-center gap-3">
          <img
            src={user.picture || '/default-avatar.png'}
            alt={user.name || 'User'}
            className="w-8 h-8 rounded-full border-2 border-purple-500"
          />
          <span className="text-white text-sm hidden md:block">{user.name}</span>
        </div>
        <LogoutButton />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Link
        href="/auth"
        className="text-gray-300 hover:text-white transition-colors"
      >
        Sign In
      </Link>
      <Link
        href="/auth/login"
        className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-4 py-2 rounded-lg transition-all"
      >
        Sign Up
      </Link>
    </div>
  );
}
