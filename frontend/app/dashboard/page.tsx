'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@/lib/useUser';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Meeting {
  _id: string;
  meetingCode: string;
  title: string;
  description: string;
  type: string;
  status: string;
  createdAt: string;
  participants: any[];
}

interface Notification {
  _id: string;
  type: string;
  title: string;
  message: string;
  meetingCode: string;
  read: boolean;
  createdAt: string;
  data: any;
}

export default function Dashboard() {
  const { user, isLoading } = useUser();
  const router = useRouter();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingMeetings, setLoadingMeetings] = useState(true);
  const [loadingNotifications, setLoadingNotifications] = useState(true);
  const [activeTab, setActiveTab] = useState<'meetings' | 'notifications'>('meetings');
  const [meetingSubTab, setMeetingSubTab] = useState<'ongoing' | 'history'>('ongoing');

  // Filter meetings by status
  const ongoingMeetings = meetings.filter(m => m.status === 'active' || m.status === 'scheduled');
  const historyMeetings = meetings.filter(m => m.status === 'ended');

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/api/auth/login?returnTo=' + encodeURIComponent('/dashboard'));
    }
  }, [isLoading, user, router]);

  // Sync user to backend when logged in
  useEffect(() => {
    if (user) {
      // Sync user to backend
      fetch('/api/auth/sync', {
        method: 'POST',
      }).catch(err => console.error('Failed to sync user:', err));
      
      fetchMeetings();
      fetchNotifications();
    }
  }, [user]);

  const fetchMeetings = async () => {
    try {
      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:4000';
      const response = await fetch(`${BACKEND_URL}/api/meetings/host/${user?.sub}`);
      
      if (response.ok) {
        const data = await response.json();
        setMeetings(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching meetings:', error);
    } finally {
      setLoadingMeetings(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:4000';
      const [notifResponse, countResponse] = await Promise.all([
        fetch(`${BACKEND_URL}/api/notifications/${user?.sub}`),
        fetch(`${BACKEND_URL}/api/notifications/${user?.sub}/unread/count`)
      ]);
      
      if (notifResponse.ok) {
        const data = await notifResponse.json();
        setNotifications(data.data || []);
      }
      
      if (countResponse.ok) {
        const countData = await countResponse.json();
        setUnreadCount(countData.data?.count || 0);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoadingNotifications(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:4000';
      await fetch(`${BACKEND_URL}/api/notifications/${notificationId}/read`, {
        method: 'PUT',
      });
      
      // Update local state
      setNotifications(prev => 
        prev.map(n => n._id === notificationId ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const joinMeeting = (meetingCode: string, notificationId?: string) => {
    if (notificationId) {
      markAsRead(notificationId);
    }
    // Pass user's name when joining
    const displayName = user?.name || 'User';
    router.push(`/room/${meetingCode}?name=${encodeURIComponent(displayName)}`);
  };

  const endMeeting = async (meetingId: string) => {
    if (!confirm('Are you sure you want to end this meeting? This action cannot be undone.')) {
      return;
    }

    try {
      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:4000';
      const response = await fetch(`${BACKEND_URL}/api/meetings/${meetingId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ended' }),
      });

      if (response.ok) {
        // Refresh meetings list
        fetchMeetings();
        alert('Meeting ended successfully');
      } else {
        throw new Error('Failed to end meeting');
      }
    } catch (error) {
      console.error('Error ending meeting:', error);
      alert('Failed to end meeting. Please try again.');
    }
  };

  if (isLoading || !user) {
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
            
            <div className="flex items-center gap-4">
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
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Welcome Section */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Welcome back, {user.name?.split(' ')[0]}!
            </h1>
            <p className="text-gray-600">Manage your meetings and stay updated</p>
          </div>

          {/* Quick Actions */}
          <div className="grid md:grid-cols-2 gap-4 mb-8">
            <Link
              href="/create"
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white p-6 rounded-xl shadow-lg transition-all transform hover:scale-105 flex items-center gap-4"
            >
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div>
                <div className="font-semibold text-lg">Create New Meeting</div>
                <div className="text-sm text-white/80">Start a meeting now</div>
              </div>
            </Link>

            <button
              onClick={() => {
                const code = prompt('Enter meeting code:');
                if (code) {
                  const displayName = user?.name || 'User';
                  router.push(`/room/${code.trim()}?name=${encodeURIComponent(displayName)}`);
                }
              }}
              className="bg-white hover:bg-gray-50 text-gray-900 p-6 rounded-xl shadow-sm border-2 border-gray-200 transition-all flex items-center gap-4"
            >
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
              <div className="text-left">
                <div className="font-semibold text-lg">Join Meeting</div>
                <div className="text-sm text-gray-600">Enter a meeting code</div>
              </div>
            </button>
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="border-b border-gray-200">
              <div className="flex">
                <button
                  onClick={() => setActiveTab('meetings')}
                  className={`flex-1 px-6 py-4 font-semibold transition-colors ${
                    activeTab === 'meetings'
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  My Meetings ({meetings.length})
                </button>
                <button
                  onClick={() => setActiveTab('notifications')}
                  className={`flex-1 px-6 py-4 font-semibold transition-colors relative ${
                    activeTab === 'notifications'
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Notifications ({notifications.length})
                  {unreadCount > 0 && (
                    <span className="absolute top-3 right-3 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* Meetings Tab */}
              {activeTab === 'meetings' && (
                <div>
                  {/* Sub-tabs for Ongoing and History */}
                  <div className="flex gap-2 mb-6 border-b border-gray-200">
                    <button
                      onClick={() => setMeetingSubTab('ongoing')}
                      className={`px-4 py-2 font-medium transition-colors ${
                        meetingSubTab === 'ongoing'
                          ? 'text-blue-600 border-b-2 border-blue-600'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Ongoing ({ongoingMeetings.length})
                    </button>
                    <button
                      onClick={() => setMeetingSubTab('history')}
                      className={`px-4 py-2 font-medium transition-colors ${
                        meetingSubTab === 'history'
                          ? 'text-blue-600 border-b-2 border-blue-600'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      History ({historyMeetings.length})
                    </button>
                  </div>

                  {loadingMeetings ? (
                    <div className="text-center py-12">
                      <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                      <p className="text-gray-600">Loading meetings...</p>
                    </div>
                  ) : (
                    <>
                      {/* Ongoing Meetings */}
                      {meetingSubTab === 'ongoing' && (
                        <div>
                          {ongoingMeetings.length === 0 ? (
                            <div className="text-center py-12">
                              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                              <p className="text-gray-600 mb-4">No ongoing meetings</p>
                              <Link
                                href="/create"
                                className="inline-block px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                              >
                                Create New Meeting
                              </Link>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              {ongoingMeetings.map((meeting) => (
                                <div
                                  key={meeting._id}
                                  className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors bg-gradient-to-r from-green-50 to-blue-50"
                                >
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <h3 className="font-semibold text-gray-900">{meeting.title}</h3>
                                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                                          {meeting.status === 'active' ? 'Active' : 'Scheduled'}
                                        </span>
                                      </div>
                                      <p className="text-sm text-gray-600 mb-2">{meeting.description}</p>
                                      <div className="flex items-center gap-4 text-sm text-gray-500">
                                        <span className="flex items-center gap-1">
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                          </svg>
                                          {meeting.type === 'private' ? 'Private' : 'Public'}
                                        </span>
                                        <span className="flex items-center gap-1">
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                          </svg>
                                          {meeting.participants?.length || 0} participants
                                        </span>
                                        <span className="font-mono text-blue-600">{meeting.meetingCode}</span>
                                      </div>
                                    </div>
                                    <div className="ml-4 flex gap-2">
                                      <button
                                        onClick={() => joinMeeting(meeting.meetingCode)}
                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
                                      >
                                        Join
                                      </button>
                                      {meeting.type === 'private' && (
                                        <button
                                          onClick={() => endMeeting(meeting._id)}
                                          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm font-medium"
                                          title="End meeting"
                                        >
                                          End
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* History Meetings */}
                      {meetingSubTab === 'history' && (
                        <div>
                          {historyMeetings.length === 0 ? (
                            <div className="text-center py-12">
                              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <p className="text-gray-600">No meeting history</p>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              {historyMeetings.map((meeting) => (
                                <div
                                  key={meeting._id}
                                  className="border border-gray-200 rounded-lg p-4 bg-gray-50"
                                >
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <h3 className="font-semibold text-gray-900">{meeting.title}</h3>
                                        <span className="px-2 py-1 bg-gray-200 text-gray-700 text-xs font-medium rounded-full">
                                          Ended
                                        </span>
                                      </div>
                                      <p className="text-sm text-gray-600 mb-2">{meeting.description}</p>
                                      <div className="flex items-center gap-4 text-sm text-gray-500">
                                        <span className="flex items-center gap-1">
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                          </svg>
                                          {new Date(meeting.createdAt).toLocaleDateString()}
                                        </span>
                                        <span className="flex items-center gap-1">
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                          </svg>
                                          {meeting.type === 'private' ? 'Private' : 'Public'}
                                        </span>
                                        <span className="flex items-center gap-1">
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                          </svg>
                                          {meeting.participants?.length || 0} participants
                                        </span>
                                        <span className="font-mono text-gray-500">{meeting.meetingCode}</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Notifications Tab */}
              {activeTab === 'notifications' && (
                <div>
                  {loadingNotifications ? (
                    <div className="text-center py-12">
                      <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                      <p className="text-gray-600">Loading notifications...</p>
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="text-center py-12">
                      <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                      </svg>
                      <p className="text-gray-600">No notifications</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {notifications.map((notification) => (
                        <div
                          key={notification._id}
                          className={`border rounded-lg p-4 transition-colors ${
                            notification.read
                              ? 'border-gray-200 bg-white'
                              : 'border-blue-200 bg-blue-50'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900 mb-1">{notification.title}</h4>
                              <p className="text-sm text-gray-600 mb-2">{notification.message}</p>
                              <p className="text-xs text-gray-500">
                                {new Date(notification.createdAt).toLocaleString()}
                              </p>
                            </div>
                            {notification.meetingCode && (
                              <button
                                onClick={() => joinMeeting(notification.meetingCode, notification._id)}
                                className="ml-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
                              >
                                Join
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
