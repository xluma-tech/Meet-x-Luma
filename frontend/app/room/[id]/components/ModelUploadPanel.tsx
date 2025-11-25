'use client';

import { useState, useRef } from 'react';

interface ModelUploadPanelProps {
  onUpload: (file: File) => Promise<void>;
  onPublish: () => void;
  onUnpublish: () => void;
  onReset: () => void;
  onPermissionChange: (userIds: string[]) => void;
  isPublished: boolean;
  isUploading: boolean;
  hasModel: boolean;
  participants: Array<{ userId: string; userName: string }>;
  allowedControllers: string[];
}

export function ModelUploadPanel({
  onUpload,
  onPublish,
  onUnpublish,
  onReset,
  onPermissionChange,
  isPublished,
  isUploading,
  hasModel,
  participants,
  allowedControllers
}: ModelUploadPanelProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [showPermissions, setShowPermissions] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>(allowedControllers);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleToggleUser = (userId: string) => {
    setSelectedUsers(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  };

  const handleApplyPermissions = () => {
    onPermissionChange(selectedUsers);
    setShowPermissions(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const modelFile = files.find(f => 
      f.name.endsWith('.glb') || f.name.endsWith('.gltf')
    );

    if (modelFile) {
      await onUpload(modelFile);
    } else {
      alert('Please upload a .glb or .gltf file');
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await onUpload(file);
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4 space-y-3">
      <h3 className="font-semibold text-sm flex items-center gap-2">
        <span>🎨</span>
        <span>3D Model Control</span>
      </h3>

      {!hasModel ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            isDragging
              ? 'border-blue-500 bg-blue-500 bg-opacity-10'
              : 'border-gray-600 hover:border-gray-500'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".glb,.gltf"
            onChange={handleFileSelect}
            className="hidden"
          />
          
          {isUploading ? (
            <div className="space-y-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
              <p className="text-sm text-gray-400">Uploading model...</p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-4xl">📦</div>
              <p className="text-sm text-gray-300">
                Drag & drop a 3D model here
              </p>
              <p className="text-xs text-gray-500">or</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-sm font-semibold transition-colors"
              >
                Choose File
              </button>
              <p className="text-xs text-gray-500 mt-2">
                Supports .glb and .gltf files (max 50MB)
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="bg-gray-700 rounded p-3 text-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-300">✓ Model ready</span>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-blue-400 hover:text-blue-300 text-xs"
              >
                Change
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".glb,.gltf"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {!isPublished ? (
            <button
              onClick={onPublish}
              className="w-full bg-green-600 hover:bg-green-700 px-4 py-2 rounded font-semibold transition-colors"
            >
              📢 Publish to Room
            </button>
          ) : (
            <button
              onClick={onUnpublish}
              className="w-full bg-red-600 hover:bg-red-700 px-4 py-2 rounded font-semibold transition-colors"
            >
              🔒 Unpublish Model
            </button>
          )}

          {isPublished && (
            <div className="space-y-2">
              {/* Reset Button */}
              <button
                onClick={onReset}
                className="w-full bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded font-semibold transition-colors flex items-center justify-center gap-2"
              >
                <span>🎯</span>
                <span>Reset Model to Center</span>
              </button>

              {/* Permission Management */}
              <div className="bg-gray-700 rounded p-3">
                <button
                  onClick={() => setShowPermissions(!showPermissions)}
                  className="w-full flex items-center justify-between text-sm font-semibold text-gray-200 hover:text-white transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <span>🔐</span>
                    <span>Control Permissions</span>
                  </span>
                  <span className="text-xs text-gray-400">
                    {allowedControllers.length} allowed
                  </span>
                </button>

                {showPermissions && (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs text-gray-400 mb-2">
                      Select participants who can control the model:
                    </p>
                    
                    {participants.length === 0 ? (
                      <p className="text-xs text-gray-500 text-center py-2">
                        No other participants in the room
                      </p>
                    ) : (
                      <div className="space-y-1 max-h-40 overflow-y-auto">
                        {participants.map(participant => (
                          <label
                            key={participant.userId}
                            className="flex items-center gap-2 p-2 hover:bg-gray-600 rounded cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={selectedUsers.includes(participant.userId)}
                              onChange={() => handleToggleUser(participant.userId)}
                              className="w-4 h-4 rounded"
                            />
                            <span className="text-sm text-gray-200">
                              {participant.userName}
                            </span>
                          </label>
                        ))}
                      </div>
                    )}

                    <button
                      onClick={handleApplyPermissions}
                      className="w-full bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded text-sm font-semibold transition-colors mt-2"
                    >
                      Apply Permissions
                    </button>
                  </div>
                )}
              </div>

              <div className="bg-blue-900 bg-opacity-50 rounded p-2 text-xs text-center">
                <p className="text-blue-300">
                  👋 Use hand gestures to control the model
                </p>
                <p className="text-gray-400 mt-1">
                  👍 Reset • ✌️ Move • ✊ Zoom • ✋ Rotate
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
