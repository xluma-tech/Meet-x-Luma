'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { meetingService, Meeting } from './meetingService';

interface MeetingContextType {
  meeting: Meeting | null;
  isLoading: boolean;
  error: string | null;
  loadMeeting: (meetingCode: string) => Promise<boolean>;
  updateMeetingStatus: (status: 'scheduled' | 'active' | 'ended') => Promise<void>;
  refreshMeeting: () => Promise<void>;
}

const MeetingContext = createContext<MeetingContextType | undefined>(undefined);

export function MeetingProvider({ children }: { children: ReactNode }) {
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMeeting = async (meetingCode: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const fetchedMeeting = await meetingService.getMeeting(meetingCode);
      
      if (!fetchedMeeting) {
        setError('Meeting not found');
        setMeeting(null);
        return false;
      }

      setMeeting(fetchedMeeting);
      return true;
    } catch (err) {
      setError('Failed to load meeting');
      setMeeting(null);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const updateMeetingStatus = async (status: 'scheduled' | 'active' | 'ended') => {
    if (!meeting) return;

    const success = await meetingService.updateMeetingStatus(meeting._id, status);
    
    if (success && meeting) {
      setMeeting({ ...meeting, status });
    }
  };

  const refreshMeeting = async () => {
    if (!meeting) return;
    await loadMeeting(meeting.meetingCode);
  };

  return (
    <MeetingContext.Provider
      value={{
        meeting,
        isLoading,
        error,
        loadMeeting,
        updateMeetingStatus,
        refreshMeeting,
      }}
    >
      {children}
    </MeetingContext.Provider>
  );
}

export function useMeeting() {
  const context = useContext(MeetingContext);
  if (context === undefined) {
    throw new Error('useMeeting must be used within a MeetingProvider');
  }
  return context;
}
