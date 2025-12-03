'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { meetingService } from '@/lib/meetingService';
import { useUser } from '@/lib/useUser';
import JoinRequestDialog from '@/components/meeting/JoinRequestDialog';
import JoinRequestPending from '@/components/meeting/JoinRequestPending';
import JoinMeetingScreen from '@/components/meeting/JoinMeetingScreen';

export default function RoomWrapper({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const router = useRouter();
  const { user, isLoading: isUserLoading } = useUser();
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
  }, [params.id, user]); // Re-run when user loads

  const validateMeeting = async () => {
    const meetingCode = params.id as string;
    console.log('🔍 RoomWrapper: Validating meeting:', meetingCode);

    if (!meetingCode) {
      setError('Invalid meeting code');
      return;
    }

    try {
      // Fetch meeting
      const fetchedMeeting = await meetingService.getMeeting(meetingCode);

      if (!fetchedMeeting) {
        console.log('❌ RoomWrapper: Meeting not found');
        setError('Meeting not found');
        return;
      }

      console.log('✅ RoomWrapper: Meeting found:', fetchedMeeting.title);
      setMeeting(fetchedMeeting);

      // Check if meeting has ended
      if (fetchedMeeting.status === 'ended') {
        setError('This meeting has ended');
        return;
      }

      // For private meetings, wait for user to load before checking access
      if (fetchedMeeting.type === 'private' && isUserLoading) {
        console.log('⏳ Waiting for user to load...');
        return; // Will re-run when user loads
      }

      // For private meetings, check access
      if (fetchedMeeting.type === 'private') {
        console.log('🔒 Private meeting detected');
        console.log('User:', user);
        console.log('Meeting hostAuth0Id:', fetchedMeeting.hostAuth0Id);
        console.log('Meeting cohosts:', fetchedMeeting.cohosts);
        console.log('Meeting invitations:', fetchedMeeting.invitations);
        console.log('Meeting participants:', fetchedMeeting.participants);
        
        // Check if user is host
        const isHost = user?.sub && fetchedMeeting.hostAuth0Id === user.sub;
        console.log('Is host?', isHost);
        
        // Check if user is cohost
        const isCohost = user?.sub && fetchedMeeting.cohosts?.includes(user.sub);
        console.log('Is cohost?', isCohost);
        
        // Check if user is invited
        const isInvited = user?.email && fetchedMeeting.invitations?.some(
          (inv: any) => inv.email === user.email && inv.status !== 'declined'
        );
        console.log('Is invited?', isInvited);

        // Check if user is already a participant (accepted join request)
        const isParticipant = user?.sub && fetchedMeeting.participants?.some(
          (p: any) => p.auth0Id === user.sub
        );
        console.log('Is participant?', isParticipant);

        // Host and cohosts can always join
        if (isHost || isCohost) {
          console.log('✅ RoomWrapper: User is host/cohost, allowing direct access');
          // Continue to show join screen
        } 
        // Invited users can join directly
        else if (isInvited) {
          console.log('✅ RoomWrapper: User is invited, allowing direct access');
          // Continue to show join screen
        }
        // Accepted participants can join
        else if (isParticipant) {
          console.log('✅ RoomWrapper: User is accepted participant, allowing direct access');
          // Continue to show join screen
        }
        // Others need to request access
        else {
          console.log('🔒 RoomWrapper: Private meeting - showing join request');
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
      setError('Failed to load meeting');
    }
  };

  const handleJoinMeeting = async (name: string) => {
    console.log('🎉 RoomWrapper: User joining as:', name);
    setUserName(name);
    setHasJoinedProperly(true);
    
    // Update meeting status to active if it's scheduled
    if (meeting && meeting.status === 'scheduled') {
      await meetingService.updateMeetingStatus(meeting._id, 'active');
    }
    
    setShowJoinScreen(false);
    console.log('✅ RoomWrapper: Join screen closed, rendering meeting room');
  };

  const handleSignIn = () => {
    // Redirect to sign in page with return URL
    const returnUrl = encodeURIComponent(`/room/${params.id}`);
    router.push(`/api/auth/login?returnTo=${returnUrl}`);
  };

  const handleRequestSent = (requestId: string) => {
    setShowJoinRequest(false);
    setRequestPending(true);
    // Store request ID for tracking
    if (typeof window !== 'undefined') {
      localStorage.setItem('pendingRequestId', requestId);
    }
  };

  const handleRequestAccepted = () => {
    console.log('✅ Join request accepted! Revalidating meeting access...');
    // Clear pending state and revalidate to show join screen
    setRequestPending(false);
    validateMeeting();
  };

  const handleCancelRequest = () => {
    router.push('/');
  };

  // Handle error redirect in useEffect to avoid setState during render
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        if (error === 'Meeting not found' || error === 'Invalid meeting code' || error === 'Failed to load meeting') {
          router.push('/room/not-found');
        } else {
          router.push('/');
        }
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [error, router]);

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-white mb-2">{error}</h2>
          <p className="text-gray-300">Redirecting you...</p>
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
        onAccepted={handleRequestAccepted}
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

  return <>{children}</>;
}
