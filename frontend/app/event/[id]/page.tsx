'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function EventPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  useEffect(() => {
    // Redirect to room page (events are now meetings/rooms)
    if (eventId && eventId !== 'undefined') {
      router.replace(`/room/${eventId}`);
    } else {
      router.replace('/');
    }
  }, [eventId, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-slate-900 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-white text-lg">Redirecting...</p>
      </div>
    </div>
  );
}
