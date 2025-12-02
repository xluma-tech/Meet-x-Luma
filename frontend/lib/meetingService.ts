/**
 * Meeting Service - Production Ready
 * Handles all meeting-related API calls and state management
 */

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:4000';

export interface Meeting {
  _id: string;
  meetingCode: string;
  title: string;
  description: string;
  type: 'public' | 'private';
  isGuestMeeting: boolean;
  hostAuth0Id?: string;
  hostName: string;
  guestHostId?: string;
  cohosts: string[];
  participants: Participant[];
  invitations: Invitation[];
  status: 'scheduled' | 'active' | 'ended';
  createdAt: string;
  updatedAt: string;
}

export interface Participant {
  userId?: string;
  auth0Id?: string;
  name: string;
  email?: string;
  picture?: string;
  role: 'host' | 'cohost' | 'participant' | 'guest';
  joinedAt: string;
}

export interface Invitation {
  email: string;
  invitedBy: string;
  invitedAt: string;
  status: 'pending' | 'accepted' | 'declined';
  message?: string;
  respondedAt?: string;
}

class MeetingService {
  /**
   * Get meeting by code or ID
   */
  async getMeeting(meetingCodeOrId: string): Promise<Meeting | null> {
    try {
      const response = await fetch(`${BACKEND_URL}/api/meetings/${meetingCodeOrId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error('Failed to fetch meeting');
      }

      const data = await response.json();
      return data.data || data;
    } catch (error) {
      console.error('Error fetching meeting:', error);
      return null;
    }
  }

  /**
   * Create a new meeting (authenticated user)
   */
  async createMeeting(data: {
    auth0Id: string;
    title: string;
    description?: string;
    type?: 'public' | 'private';
    scheduledTime?: string;
  }): Promise<Meeting | null> {
    try {
      const response = await fetch(`${BACKEND_URL}/api/meetings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to create meeting');
      }

      const result = await response.json();
      return result.data || result;
    } catch (error) {
      console.error('Error creating meeting:', error);
      return null;
    }
  }

  /**
   * Create a guest meeting (no authentication)
   */
  async createGuestMeeting(data: {
    guestName: string;
    title: string;
    description?: string;
  }): Promise<{ meeting: Meeting; guestHostId: string } | null> {
    try {
      const response = await fetch(`${BACKEND_URL}/api/meetings/guest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to create guest meeting');
      }

      const result = await response.json();
      return result.data || result;
    } catch (error) {
      console.error('Error creating guest meeting:', error);
      return null;
    }
  }

  /**
   * Join a meeting
   */
  async joinMeeting(meetingId: string, data: {
    auth0Id?: string;
    name: string;
    email?: string;
  }): Promise<boolean> {
    try {
      const response = await fetch(`${BACKEND_URL}/api/meetings/${meetingId}/participant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      return response.ok;
    } catch (error) {
      console.error('Error joining meeting:', error);
      return false;
    }
  }

  /**
   * Leave a meeting (remove participant)
   */
  async leaveMeeting(meetingId: string, auth0Id: string): Promise<boolean> {
    try {
      const response = await fetch(`${BACKEND_URL}/api/meetings/${meetingId}/participant`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requesterAuth0Id: auth0Id,
          participantAuth0Id: auth0Id,
        }),
      });

      return response.ok;
    } catch (error) {
      console.error('Error leaving meeting:', error);
      return false;
    }
  }

  /**
   * Update meeting status
   */
  async updateMeetingStatus(
    meetingId: string,
    status: 'scheduled' | 'active' | 'ended'
  ): Promise<boolean> {
    try {
      const response = await fetch(`${BACKEND_URL}/api/meetings/${meetingId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      return response.ok;
    } catch (error) {
      console.error('Error updating meeting status:', error);
      return false;
    }
  }

  /**
   * Check if user can join meeting (for private meetings)
   */
  canJoinMeeting(meeting: Meeting, userEmail?: string, auth0Id?: string): boolean {
    // Public meetings - anyone can join
    if (meeting.type === 'public') {
      return true;
    }

    // Private meetings - check if invited or is host/cohost
    if (auth0Id) {
      // Check if user is host
      if (meeting.hostAuth0Id === auth0Id) {
        return true;
      }

      // Check if user is cohost
      if (meeting.cohosts?.includes(auth0Id)) {
        return true;
      }

      // Check if user is invited
      if (userEmail && meeting.invitations) {
        const invitation = meeting.invitations.find(inv => inv.email === userEmail);
        return invitation?.status === 'accepted' || invitation?.status === 'pending';
      }
    }

    return false;
  }

  /**
   * Get user role in meeting
   */
  getUserRole(meeting: Meeting, auth0Id?: string): 'host' | 'cohost' | 'participant' | 'guest' {
    if (!auth0Id) {
      return 'guest';
    }

    if (meeting.hostAuth0Id === auth0Id) {
      return 'host';
    }

    if (meeting.cohosts?.includes(auth0Id)) {
      return 'cohost';
    }

    const participant = meeting.participants?.find(p => p.auth0Id === auth0Id);
    return participant?.role || 'participant';
  }
}

// Export singleton instance
export const meetingService = new MeetingService();
