'use client';

import { useUser } from '@auth0/nextjs-auth0/client';
import { useEffect, useState } from 'react';
import { UserRole, getPermissions } from '@/lib/roles';

interface UserData {
  id: string;
  auth0Id: string;
  email: string;
  name: string;
  picture?: string;
  role: UserRole;
}

export default function UserProfile() {
  const { user, isLoading } = useUser();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  useEffect(() => {
    if (user) {
      fetchUserProfile();
    }
  }, [user]);

  const fetchUserProfile = async () => {
    setLoadingProfile(true);
    try {
      const response = await fetch('/api/user/profile');
      if (response.ok) {
        const data = await response.json();
        setUserData(data);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    } finally {
      setLoadingProfile(false);
    }
  };

  if (isLoading || loadingProfile) {
    return (
      <div className="profile-loading">
        <div className="spinner"></div>
        <p>Loading profile...</p>
      </div>
    );
  }

  if (!user || !userData) {
    return null;
  }

  const permissions = getPermissions(userData.role);

  return (
    <div className="user-profile-card">
      <div className="profile-header">
        <img
          src={userData.picture || user.picture || '/default-avatar.png'}
          alt={userData.name}
          className="profile-avatar"
        />
        <div className="profile-info">
          <h3 className="profile-name">{userData.name}</h3>
          <p className="profile-email">{userData.email}</p>
          <span className={`role-badge role-${userData.role}`}>
            {userData.role.toUpperCase()}
          </span>
        </div>
      </div>

      <div className="permissions-section">
        <h4 className="permissions-title">Your Permissions</h4>
        <div className="permissions-grid">
          {Object.entries(permissions).map(([key, value]) => (
            <div key={key} className="permission-item">
              <span className={`permission-icon ${value ? 'allowed' : 'denied'}`}>
                {value ? '✓' : '✗'}
              </span>
              <span className="permission-label">
                {key.replace(/([A-Z])/g, ' $1').trim()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
