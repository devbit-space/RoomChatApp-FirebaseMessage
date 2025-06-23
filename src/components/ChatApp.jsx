import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import RoomList from './RoomList';
import RoomChat from './RoomChat';
import Logout from '../Logout';
import Settings from './Settings';
import './ChatApp.css';

export default function ChatApp() {
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const { user } = useSelector((state) => state.auth);

  // Load selected room from localStorage on component mount
  useEffect(() => {
    const savedRoomId = localStorage.getItem('selectedRoomId');
    if (savedRoomId) {
      // In a real app, you'd fetch the room data from DB
      // For simplicity, we'll just wait for onSnapshot in RoomList
      // This part is mostly for showing the loading state
    }
    setIsLoading(false);
  }, []);

  const handleRoomSelect = (room) => {
    setSelectedRoom(room);
    if (room) {
      localStorage.setItem('selectedRoomId', room.id);
    } else {
      localStorage.removeItem('selectedRoomId');
    }
  };

  const handleBackToRooms = () => {
    setSelectedRoom(null);
    localStorage.removeItem('selectedRoomId');
  };

  // Show loading state while checking for saved room
  if (isLoading) {
    return (
      <div className="chat-app">
        <div className="chat-app-header">
          <h1>Room Chat App</h1>
          <div className="header-actions">
            <button onClick={() => setShowSettings(true)} className="settings-btn" title="Settings">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="20" height="20">
                <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-1.57 1.996A1.532 1.532 0 013 7.482c-1.56.38-1.56 2.6 0 2.98a1.532 1.532 0 01.948 2.286c-.836 1.372.734 2.942 1.996 1.57a1.532 1.532 0 012.286.948c.38 1.56 2.6 1.56 2.98 0a1.532 1.532 0 012.286-.948c1.372.836 2.942-.734 1.57-1.996A1.532 1.532 0 0117 12.518c1.56-.38 1.56-2.6 0-2.98a1.532 1.532 0 01-.948-2.286c.836-1.372-.734-2.942-1.996-1.57a1.532 1.532 0 01-2.286-.948zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
              </svg>
            </button>
            <Logout />
          </div>
        </div>
        <div className="chat-app-content">
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading your chat session...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-app">
      <div className="chat-app-header">
        <h1 onClick={handleBackToRooms} style={{ cursor: 'pointer' }}>Room Chat App</h1>
        <div className="header-actions">
          <button onClick={() => setShowSettings(true)} className="settings-btn" title="Settings">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="20" height="20">
              <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-1.57 1.996A1.532 1.532 0 013 7.482c-1.56.38-1.56 2.6 0 2.98a1.532 1.532 0 01.948 2.286c-.836 1.372.734 2.942 1.996 1.57a1.532 1.532 0 012.286.948c.38 1.56 2.6 1.56 2.98 0a1.532 1.532 0 012.286-.948c1.372.836 2.942-.734 1.57-1.996A1.532 1.532 0 0117 12.518c1.56-.38 1.56-2.6 0-2.98a1.532 1.532 0 01-.948-2.286c.836-1.372-.734-2.942-1.996-1.57a1.532 1.532 0 01-2.286-.948zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
            </svg>
          </button>
          <Logout />
        </div>
      </div>
      
      <div className="chat-app-content">
        {selectedRoom ? (
          <RoomChat 
            selectedRoom={selectedRoom} 
            onBackToRooms={handleBackToRooms}
          />
        ) : (
          <RoomList 
            onRoomSelect={handleRoomSelect}
            selectedRoom={selectedRoom}
          />
        )}
      </div>

      {showSettings && <Settings user={user} onClose={() => setShowSettings(false)} />}
    </div>
  );
} 