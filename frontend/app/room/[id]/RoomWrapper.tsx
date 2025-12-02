'use client';

import { useEffect, useState, createContext } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { meetingService } from '@/lib/meetingService';
import { useUser } from '@/lib/useUser';
import JoinRequestDialog from '@/components/meeting/JoinRequestDialog';
import JoinRequestPending from '@/components/meeting/JoinRequestPending';
import JoinMeetingScreen from '@/components/meeting/JoinMeetingScreen';

export const MeetingContext = createContext<{
  userName: string | null;
  meeting: any;
}>({ userName: null, meeting: null });

export default function RoomWrapper({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const router = useRouter();
  const { user } = useUser();
  const [isValidating, setIsValidating] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showJoinRequest, setShowJoinRequest] = useState(false);
  const [requestPending, setRequestPending] = useState(false);
  const [meeting, setMeeting] = useState<any>(null);
  const [showJoinScreen, setShowJoinScreen] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const [hasJoinedProperly, setHasJoinedProperly] = useState(false);

  useEffect(() => {
    validateMeeting();
  }, [params.id]);

  const validateMeeting = async () => {
    const meetingCode = params.id as string;
    console.log('🔍 RoomWrapper: Validating meeting:', meetingCode);

    if (!meetingCode) {
      router.push('/room/not-found');
      return;
    }

    try {
      // Fetch meeting
      const fetchedMeeting = await meetingService.getMeeting(meetingCode);

      if (!fetchedMeeting) {
        console.log('❌ RoomWrapper: Meeting not found');
        router.push('/room/not-found');
        return;
      }

      console.log('✅ RoomWrapper: Meeting found:', fetchedMeeting.title);
      setMeeting(fetchedMeeting);

      // Check if meeting has ended
      if (fetchedMeeting.status === 'ended') {
        setError('This meeting has ended');
        setTimeout(() => router.push('/'), 3000);
        return;
      }

      // For private meetings, check access
      if (fetchedMeeting.type === 'private') {
        const canJoin = meetingService.canJoinMeeting(fetchedMeeting, user?.email, user?.sub);

        if (!canJoin) {
          console.log('🔒 RoomWrapper: Private meeting - showing join request');
          // Show join request dialog
          setShowJoinRequest(true);
          setIsValidating(false);
          return;
        }
      }

      // Show join screen to get user name
      console.log('👋 RoomWrapper: Showing join screen');
      setShowJoinScreen(true);
      setIsValidating(false);
    } catch (err) {
      console.error('Error validating meeting:', err);
      router.push('/room/not-found');
    }
  };

  const handleJoinMeeting = async (name: string) => {
    console.log('🎉 RoomWrapper: User joining as:', name);
    setUserName(name);
    setHasJoinedProperly(true);
    
    try {
      // Update meeting status to active if it's scheduled
      if (meeting && meeting.status === 'scheduled') {
        await meetingService.updateMeetingStatus(meeting._id, 'active');
      }
    } catch (err) {
      console.error('Error updating meeting status:', err);
    }
    
    setShowJoinScreen(false);
    console.log('✅ RoomWrapper: Join screen closed, rendering meeting room');
  };

  const handleSignIn = () => {
    // Redirect to sign in page with return URL
    const returnUrl = encodeURIComponent(`/room/${params.id}`);
    router.push(`/api/auth/login?returnTo=${returnUrl}`);
  };

  const handleRequestSent = () => {
    setShowJoinRequest(false);
    setRequestPending(true);
  };

  const handleCancelRequest = () => {
    router.push('/');
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-white mb-2">{error}</h2>
          <p className="text-gray-300">Redirecting you to homepage...</p>
        </div>
      </div>
    );
  }

  if (requestPending && meeting) {
    return (
      <JoinRequestPending
        meetingCode={meeting.meetingCode}
        meetingTitle={meeting.title}
        requesterName={user?.name || 'Guest'}
      />
    );
  }

  if (showJoinRequest && meeting) {
    return (
      <JoinRequestDialog
        meetingCode={meeting.meetingCode}
        meetingTitle={meeting.title}
        userName={user?.name}
        userEmail={user?.email}
        userAuth0Id={user?.sub}
        onRequestSent={handleRequestSent}
        onCancel={handleCancelRequest}
      />
    );
  }

  if (showJoinScreen && meeting) {
    return (
      <JoinMeetingScreen
        meetingCode={meeting.meetingCode}
        meetingTitle={meeting.title}
        isAuthenticated={!!user}
        userName={user?.name}
        onJoin={handleJoinMeeting}
        onSignIn={handleSignIn}
      />
    );
  }

  if (isValidating) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Validating meeting...</p>
        </div>
      </div>
    );
  }

  // Only render the meeting room if user has properly joined through the join screen
  if (!userName || !hasJoinedProperly) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  // Pass userName to children via URL parameter
  const currentUrl = new URL(window.location.href);
  if (!currentUrl.searchParams.has('name')) {
    currentUrl.searchParams.set('name', userName);
    window.history.replaceState({}, '', currentUrl.toString());
  }

  return (
    <MeetingContext.Provider value={{ userName, meeting }}>
      {children}
    </MeetingContext.Provider>
  );
}
