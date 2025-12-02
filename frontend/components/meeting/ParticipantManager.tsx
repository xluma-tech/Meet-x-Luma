'use client';

import { useState } from 'react';

interface Participant {
  email: string;
  role: 'host' | 'cohost' | 'participant';
  name?: string;
}

interface ParticipantManagerProps {
  participants: Participant[];
  onParticipantsChange: (participants: Participant[]) => void;
  hostEmail?: string;
}

export default function ParticipantManager({ 
  participants, 
  onParticipantsChange,
  hostEmail 
}: ParticipantManagerProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'cohost' | 'participant'>('participant');
  const [error, setError] = useState('');

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const addParticipant = () => {
    setError('');

    if (!email.trim()) {
      setError('Please enter an email address');
      return;
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    if (email === hostEmail) {
      setError('You are already the host');
      return;
    }

    if (participants.some(p => p.email === email)) {
      setError('This participant is already added');
      return;
    }

    const newParticipant: Participant = {
      email: email.trim(),
      role,
    };

    onParticipantsChange([...participants, newParticipant]);
    setEmail('');
    setRole('participant');
  };

  const removeParticipant = (emailToRemove: string) => {
    onParticipantsChange(participants.filter(p => p.email !== emailToRemove));
  };

  const updateRole = (email: string, newRole: 'cohost' | 'participant') => {
    onParticipantsChange(
      participants.map(p => 
        p.email === email ? { ...p, role: newRole } : p
      )
    );
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-semibold mb-3 text-gray-900">
          Add Participants
        </label>
        
        {/* Add Participant Form */}
        <div className="flex gap-2 mb-4">
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError('');
            }}
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addParticipant())}
            placeholder="Enter email address"
            className="flex-1 px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
          />
          
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as 'cohost' | 'participant')}
            className="px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
          >
            <option value="participant">Participant</option>
            <option value="cohost">Co-host</option>
          </select>
          
          <button
            type="button"
            onClick={addParticipant}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
          >
            Add
          </button>
        </div>

        {error && (
          <div className="text-red-600 text-sm mb-4 flex items-center gap-2">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        )}
      </div>

      {/* Participants List */}
      {participants.length > 0 && (
        <div>
          <div className="text-sm font-semibold mb-2 text-gray-700">
            Invited Participants ({participants.length})
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {participants.map((participant) => (
              <div
                key={participant.email}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                    {participant.email[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {participant.email}
                    </div>
                    <div className="text-xs text-gray-500">
                      {participant.role === 'cohost' ? '👑 Co-host' : '👤 Participant'}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 flex-shrink-0">
                  <select
                    value={participant.role}
                    onChange={(e) => updateRole(participant.email, e.target.value as 'cohost' | 'participant')}
                    className="px-2 py-1 text-xs bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  >
                    <option value="participant">Participant</option>
                    <option value="cohost">Co-host</option>
                  </select>
                  
                  <button
                    type="button"
                    onClick={() => removeParticipant(participant.email)}
                    className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="Remove participant"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info */}
      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
        <div className="flex gap-3">
          <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-sm text-blue-900">
            <div className="font-semibold mb-1">About roles:</div>
            <ul className="space-y-1 text-blue-800">
              <li>• <strong>Co-hosts</strong> can manage participants and accept join requests</li>
              <li>• <strong>Participants</strong> can join and participate in the meeting</li>
              <li>• All invited users will receive an email invitation</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
