'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  createdAt: string;
}

export default function EventPage() {
  const params = useParams();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [userName, setUserName] = useState('');
  const [copied, setCopied] = useState(false);

  // Get event ID from params
  const eventId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  useEffect(() => {
    // Don't fetch if eventId is not available yet
    if (!eventId || typeof eventId !== 'string' || eventId === 'undefined') {
      if (eventId === 'undefined') {
        setError('Invalid event ID');
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    setError(null);

    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/events/${eventId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Event not found');
        return res.json();
      })
      .then((data) => {
        setEvent(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching event:', err);
        setError('Event not found');
        setLoading(false);
      });
  }, [eventId]);

  const handleJoin = () => {
    if (userName.trim() && eventId) {
      window.location.href = `/room/${eventId}?name=${encodeURIComponent(userName.trim())}`;
    }
  };

  const copyCode = () => {
    if (event) {
      navigator.clipboard.writeText(event.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const copyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-300 text-lg">Loading event...</p>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-6">😕</div>
          <h1 className="text-3xl font-bold text-white mb-4">Event Not Found</h1>
          <p className="text-gray-400 mb-8">
            The event you&apos;re looking for doesn&apos;t exist or has been removed.
          </p>
          <Link
            href="/"
            className="inline-block bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold px-8 py-3 rounded-lg transition-all"
          >
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  const eventDate = new Date(`${event.date}T${event.time}`);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse-slow"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Navigation */}
        <nav className="container mx-auto px-4 py-6">
          <Link href="/" className="inline-flex items-center gap-2 text-gray-300 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Back to home</span>
          </Link>
        </nav>

        {/* Event Details */}
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-3xl mx-auto">
            {/* Event Card */}
            <div className="glass rounded-2xl overflow-hidden mb-6">
              {/* Header */}
              <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-8 text-center">
                <div className="text-6xl mb-4">📅</div>
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">{event.title}</h1>
              </div>

              {/* Content */}
              <div className="p-8">
                {/* Date & Time */}
                <div className="flex flex-wrap gap-4 mb-6">
                  <div className="flex items-center gap-2 text-gray-300">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>{eventDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-300">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{eventDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
                  </div>
                </div>

                {/* Description */}
                <p className="text-gray-300 text-lg mb-8 whitespace-pre-wrap">{event.description}</p>

                {/* Event Code */}
                <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-6 mb-6">
                  <p className="text-sm font-semibold text-purple-300 mb-3">Meeting Code</p>
                  <div className="flex items-center gap-3">
                    <code className="flex-1 bg-black/30 px-4 py-3 rounded-lg font-mono text-xl font-bold text-purple-400 border border-purple-500/30">
                      {event.id}
                    </code>
                    <button
                      onClick={copyCode}
                      className="px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-all"
                      title="Copy code"
                    >
                      {copied ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-3">Share this code with participants to join</p>
                </div>

                {/* Actions */}
                {!showJoinForm ? (
                  <div className="space-y-3">
                    <button
                      onClick={() => setShowJoinForm(true)}
                      className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold py-4 px-8 rounded-xl transition-all transform hover:scale-105"
                    >
                      Join Video Meeting
                    </button>
                    <button
                      onClick={copyLink}
                      className="w-full glass hover:bg-white/10 text-white font-semibold py-4 px-8 rounded-xl transition-all"
                    >
                      {copied ? 'Link Copied!' : 'Share Event Link'}
                    </button>
                  </div>
                ) : (
                  <div className="bg-black/30 border border-white/10 rounded-xl p-6 animate-fade-in">
                    <h3 className="text-xl font-semibold text-white mb-2">Enter your name</h3>
                    <p className="text-sm text-gray-400 mb-4">This will be visible to other participants</p>
                    <input
                      type="text"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleJoin()}
                      placeholder="Your name"
                      maxLength={50}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-purple-500 text-white placeholder-gray-500"
                      autoFocus
                    />
                    <div className="flex gap-3">
                      <button
                        onClick={handleJoin}
                        disabled={!userName.trim()}
                        className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold py-3 px-6 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        Join Now
                      </button>
                      <button
                        onClick={() => {
                          setShowJoinForm(false);
                          setUserName('');
                        }}
                        className="px-6 py-3 glass hover:bg-white/10 text-white font-semibold rounded-lg transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
