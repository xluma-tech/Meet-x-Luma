'use client';

import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';

interface JoinRequest {
  _id: string;
  requesterName: string;
  requesterEmail?: string;
  requesterPicture?: string;
  createdAt: string;
  status: 'pending' | 'accepted' | 'rejected';
}

interface JoinRequestPanelProps {
  meetingCode: string;
  userAuth0Id?: string;
  isHostOrCohost: boolean;
}

export default function JoinRequestPanel({ 
  meetingCode, 
  userAuth0Id,
  isHostOrCohost 
}: JoinRequestPanelProps) {
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);

  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:4000';

  const fetchRequests = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/join-requests/${meetingCode}`);
      if (response.ok) {
        const data = await response.json();
        // Handle both array response and object with data property
        const allRequests = Array.isArray(data) ? data : (data.data || []);
        const pendingRequests = allRequests.filter((req: JoinRequest) => req.status === 'pending');
        setRequests(pendingRequests);
        console.log('Fetched join requests:', pendingRequests);
      }
    } catch (error) {
      console.error('Error fetching join requests:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isHostOrCohost) return;

    // Initial fetch
    fetchRequests();

    // Setup socket connection for real-time updates
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || window.location.origin;
    const newSocket = io(socketUrl, {
      transports: ['websocket', 'polling'],
    });

    newSocket.on('connect', () => {
      console.log('JoinRequestPanel socket connected');
      // Listen to the meeting room channel for join request events
      // We use a special listener channel, not the actual meeting room
      newSocket.emit('join-request-listener', { meetingCode });
    });

    // Listen for new join requests
    newSocket.on('join-request-received', (data) => {
      console.log('New join request received:', data);
      // Add the new request to the list
      setRequests(prev => [...prev, {
        _id: data.requestId,
        requesterName: data.requesterName,
        requesterEmail: data.requesterEmail,
        requesterPicture: data.requesterPicture,
        createdAt: data.createdAt,
        status: 'pending'
      }]);
    });

    // Listen for accepted requests
    newSocket.on('join-request-accepted', (data) => {
      console.log('Join request accepted:', data);
      // Remove from list
      setRequests(prev => prev.filter(req => req._id !== data.requestId));
    });

    // Listen for rejected requests
    newSocket.on('join-request-rejected', (data) => {
      console.log('Join request rejected:', data);
      // Remove from list
      setRequests(prev => prev.filter(req => req._id !== data.requestId));
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [meetingCode, isHostOrCohost]);

  const handleAccept = async (requestId: string) => {
    if (!userAuth0Id) return;
    
    setProcessing(requestId);
    try {
      const response = await fetch(`${BACKEND_URL}/api/join-requests/${requestId}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auth0Id: userAuth0Id }),
      });

      if (response.ok) {
        // Remove from list
        setRequests(prev => prev.filter(r => r._id !== requestId));
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to accept request');
      }
    } catch (error) {
      console.error('Error accepting request:', error);
      alert('Failed to accept request');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (requestId: string) => {
    if (!userAuth0Id) return;
    
    setProcessing(requestId);
    try {
      const response = await fetch(`${BACKEND_URL}/api/join-requests/${requestId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auth0Id: userAuth0Id }),
      });

      if (response.ok) {
        // Remove from list
        setRequests(prev => prev.filter(r => r._id !== requestId));
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to reject request');
      }
    } catch (error) {
      console.error('Error rejecting request:', error);
      alert('Failed to reject request');
    } finally {
      setProcessing(null);
    }
  };

  if (!isHostOrCohost) {
    return null;
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center gap-2 text-gray-600">
          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm">Loading requests...</span>
        </div>
      </div>
    );
  }

  if (requests.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-center gap-2 mb-4">
        <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        <h3 className="font-semibold text-gray-900">
          Join Requests ({requests.length})
        </h3>
      </div>

      <div className="space-y-3">
        {requests.map((request) => (
          <div
            key={request._id}
            className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200"
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {request.requesterPicture ? (
                <img
                  src={request.requesterPicture}
                  alt={request.requesterName}
                  className="w-10 h-10 rounded-full border-2 border-orange-300"
                />
              ) : (
                <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center text-white font-semibold">
                  {request.requesterName[0].toUpperCase()}
                </div>
              )}
              
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 truncate">
                  {request.requesterName}
                </div>
                {request.requesterEmail && (
                  <div className="text-xs text-gray-600 truncate">
                    {request.requesterEmail}
                  </div>
                )}
                <div className="text-xs text-gray-500">
                  {new Date(request.createdAt).toLocaleTimeString()}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => handleAccept(request._id)}
                disabled={processing === request._id}
                className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processing === request._id ? '...' : 'Accept'}
              </button>
              <button
                onClick={() => handleReject(request._id)}
                disabled={processing === request._id}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processing === request._id ? '...' : 'Reject'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
