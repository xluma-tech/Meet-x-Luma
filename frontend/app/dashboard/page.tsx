import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth0 } from '@/lib/auth0';
import UserProfile from '@/components/auth/UserProfile';
import LogoutButton from '@/components/auth/LogoutButton';

export default async function DashboardPage() {
  const session = await auth0.getSession();

  if (!session?.user) {
    redirect('/auth');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 text-white hover:opacity-80 transition-opacity">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="text-xl font-bold">Luma Meet</span>
            </Link>
          </div>
          <LogoutButton />
        </div>

        {/* Dashboard Content */}
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl font-bold text-white mb-8">Dashboard</h1>

          <div className="grid md:grid-cols-2 gap-8">
            {/* User Profile Section */}
            <div>
              <h2 className="text-2xl font-semibold text-white mb-4">Your Profile</h2>
              <UserProfile />
            </div>

            {/* Quick Actions */}
            <div>
              <h2 className="text-2xl font-semibold text-white mb-4">Quick Actions</h2>
              <div className="space-y-4">
                <Link
                  href="/create"
                  className="block glass p-6 rounded-xl hover:bg-white/10 transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">Create New Meeting</h3>
                      <p className="text-gray-400 text-sm">Start an instant meeting or schedule one</p>
                    </div>
                  </div>
                </Link>

                <div className="glass p-6 rounded-xl">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-teal-500 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">Your Meetings</h3>
                      <p className="text-gray-400 text-sm">View and manage your scheduled meetings</p>
                    </div>
                  </div>
                </div>

                <div className="glass p-6 rounded-xl">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">Settings</h3>
                      <p className="text-gray-400 text-sm">Manage your account and preferences</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Info Section */}
          <div className="mt-12 glass p-6 rounded-xl">
            <h3 className="text-xl font-semibold text-white mb-4">About Roles & Permissions</h3>
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <div className="role-badge role-host mb-2">Host</div>
                <p className="text-gray-400 text-sm">
                  Full control over meetings. Can start/end meetings, manage participants, and assign cohosts.
                </p>
              </div>
              <div>
                <div className="role-badge role-cohost mb-2">Cohost</div>
                <p className="text-gray-400 text-sm">
                  Can manage participants, mute/remove users, and share screen. Cannot end meetings.
                </p>
              </div>
              <div>
                <div className="role-badge role-participant mb-2">Participant</div>
                <p className="text-gray-400 text-sm">
                  Can join meetings, use camera/mic, share screen, and chat. Limited management features.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
