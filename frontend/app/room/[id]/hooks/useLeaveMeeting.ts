import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { meetingService } from '@/lib/meetingService';

export function useLeaveMeeting() {
  const router = useRouter();

  const leaveMeeting = useCallback(async (
    meetingId: string,
    auth0Id?: string,
    redirectTo: string = '/'
  ) => {
    try {
      // If authenticated user, update backend
      if (auth0Id) {
        await meetingService.leaveMeeting(meetingId, auth0Id);
      }

      // Clean up local state
      // (Socket disconnection should be handled by the room component)

      // Redirect to specified page
      router.push(redirectTo);
    } catch (error) {
      console.error('Error leaving meeting:', error);
      // Still redirect even if API call fails
      router.push(redirectTo);
    }
  }, [router]);

  return { leaveMeeting };
}
