'use client';

import { useUser } from '@auth0/nextjs-auth0/client';
import { useEffect, useState } from 'react';
import { UserRole, Permission, getPermissions } from '../roles';

interface UserData {
  id: string;
  auth0Id: string;
  email: string;
  name: string;
  picture?: string;
  role: UserRole;
}

interface GuestSession {
  guestId: string;
  name: string;
  role: UserRole.GUEST;
}

export function useAuth() {
  const { user, isLoading: auth0Loading } = useUser();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [guestSession, setGuestSession] = useState<GuestSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState<Permission | null>(null);

  useEffect(() => {
    if (auth0Loading) return;

    if (user) {
      fetchUserData();
    } else {
      checkGuestSession();
    }
  }, [user, auth0Loading]);

  const fetchUserData = async () => {
    try {
      const response = await fetch('/api/user/profile');
      if (response.ok) {
        const data = await response.json();
        setUserData(data);
        setPermissions(getPermissions(data.role));
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkGuestSession = () => {
    try {
      const stored = localStorage.getItem('guestSession');
      if (stored) {
        const session = JSON.parse(stored);
        setGuestSession(session);
        setPermissions(getPermissions(UserRole.GUEST));
      }
    } catch (error) {
      console.error('Error loading guest session:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearGuestSession = () => {
    localStorage.removeItem('guestSession');
    setGuestSession(null);
    setPermissions(null);
  };

  const isAuthenticated = !!user || !!guestSession;
  const isGuest = !!guestSession && !user;
  const currentUser = userData || guestSession;

  return {
    user: currentUser,
    isAuthenticated,
    isGuest,
    isLoading: loading || auth0Loading,
    permissions,
    clearGuestSession,
  };
}
