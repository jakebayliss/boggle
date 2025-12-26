'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameRoom } from '@/hooks/useSignalR';

interface LobbyProps {
  isConnected: boolean;
  availableRooms: GameRoom[];
  onCreateRoom: (roomName: string, username: string) => Promise<unknown>;
  onJoinRoom: (roomId: string, username: string) => Promise<unknown>;
  onRefreshRooms: () => Promise<GameRoom[]>;
  error: string | null;
}

export function Lobby({ 
  isConnected, 
  availableRooms, 
  onCreateRoom, 
  onJoinRoom, 
  onRefreshRooms,
  error 
}: LobbyProps) {
  const [username, setUsername] = useState('');
  const [roomName, setRoomName] = useState('');
  const [joinRoomId, setJoinRoomId] = useState('');
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isConnected) {
      onRefreshRooms();
      const interval = setInterval(onRefreshRooms, 5000);
      return () => clearInterval(interval);
    }
  }, [isConnected, onRefreshRooms]);

  const handleCreate = async () => {
    if (!username.trim() || !roomName.trim()) return;
    setIsLoading(true);
    await onCreateRoom(roomName.trim(), username.trim());
    setIsLoading(false);
  };

  const handleJoin = async (roomId?: string) => {
    const targetRoomId = roomId || joinRoomId.trim();
    if (!username.trim() || !targetRoomId) return;
    setIsLoading(true);
    await onJoinRoom(targetRoomId, username.trim());
    setIsLoading(false);
  };

  if (!isConnected) {
    return (
      <div className="lobby-container">
        <motion.div 
          className="connecting-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="spinner"></div>
          <span>Connecting to server...</span>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="lobby-container">
      <motion.div 
        className="lobby-card"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="lobby-title">
          <span className="title-icon">🎲</span>
          BOGGLE
          <span className="title-sub">Multiplayer</span>
        </h1>

        {/* Username Input */}
        <div className="input-group">
          <label htmlFor="username">Your Name</label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter your name..."
            maxLength={20}
            className="input-field"
          />
        </div>

        {/* Tab Navigation */}
        <div className="tab-navigation">
          <button
            className={`tab-btn ${activeTab === 'create' ? 'active' : ''}`}
            onClick={() => setActiveTab('create')}
          >
            Create Room
          </button>
          <button
            className={`tab-btn ${activeTab === 'join' ? 'active' : ''}`}
            onClick={() => setActiveTab('join')}
          >
            Join Room
          </button>
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {activeTab === 'create' ? (
            <motion.div
              key="create"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="tab-content"
            >
              <div className="input-group">
                <label htmlFor="roomName">Room Name</label>
                <input
                  id="roomName"
                  type="text"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  placeholder="e.g., Word Warriors"
                  maxLength={30}
                  className="input-field"
                />
              </div>
              <button
                className="primary-btn"
                onClick={handleCreate}
                disabled={!username.trim() || !roomName.trim() || isLoading}
              >
                {isLoading ? <span className="btn-spinner"></span> : 'Create Room'}
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="join"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="tab-content"
            >
              <div className="input-group">
                <label htmlFor="roomId">Room Code</label>
                <input
                  id="roomId"
                  type="text"
                  value={joinRoomId}
                  onChange={(e) => setJoinRoomId(e.target.value.toUpperCase())}
                  placeholder="Enter 6-letter code..."
                  maxLength={6}
                  className="input-field room-code"
                />
              </div>
              <button
                className="primary-btn"
                onClick={() => handleJoin()}
                disabled={!username.trim() || !joinRoomId.trim() || isLoading}
              >
                {isLoading ? <span className="btn-spinner"></span> : 'Join Room'}
              </button>

              {/* Available Rooms */}
              {availableRooms.length > 0 && (
                <div className="available-rooms">
                  <h3>
                    <span>Available Rooms</span>
                    <button className="refresh-btn" onClick={onRefreshRooms}>⟳</button>
                  </h3>
                  <div className="rooms-list">
                    {availableRooms.map((room) => (
                      <motion.div
                        key={room.roomId}
                        className="room-item"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        whileHover={{ scale: 1.02 }}
                        onClick={() => handleJoin(room.roomId)}
                      >
                        <div className="room-info">
                          <span className="room-name">{room.roomName}</span>
                          <span className="room-host">Host: {room.hostUsername}</span>
                        </div>
                        <div className="room-meta">
                          <span className="room-code-badge">{room.roomId}</span>
                          <span className="player-count">{room.playerCount}/8</span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error Display */}
        <AnimatePresence>
          {error && (
            <motion.div
              className="error-message"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

