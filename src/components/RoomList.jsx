import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, addDoc, query, onSnapshot, doc, updateDoc, arrayUnion, deleteDoc, getDocs, writeBatch } from 'firebase/firestore';
import { useSelector } from 'react-redux';
import './RoomList.css';

export default function RoomList({ onRoomSelect, selectedRoom }) {
  const [rooms, setRooms] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomDescription, setNewRoomDescription] = useState('');
  const { user } = useSelector((state) => state.auth);

  useEffect(() => {
    const q = query(collection(db, 'rooms'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const roomsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRooms(roomsData);
    });
    return unsubscribe;
  }, []);

  const createRoom = async (e) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;

    const roomData = {
      name: newRoomName.trim(),
      description: newRoomDescription.trim(),
      createdBy: user.uid,
      createdAt: new Date(),
      members: [{
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || user.email,
        photoURL: user.photoURL,
        role: 'admin',
        joinedAt: new Date()
      }],
      isPrivate: false
    };

    const newRoomRef = await addDoc(collection(db, 'rooms'), roomData);
    onRoomSelect({ id: newRoomRef.id, ...roomData });
    setNewRoomName('');
    setNewRoomDescription('');
    setShowCreateForm(false);
  };
  
  const deleteRoom = async (roomId) => {
    const isConfirmed = window.confirm(
      'Are you sure you want to delete this room? This will permanently delete all messages and cannot be undone.'
    );
    if (!isConfirmed) return;

    try {
      const roomRef = doc(db, 'rooms', roomId);
      const messagesRef = collection(db, `rooms/${roomId}/messages`);
      
      const messagesSnapshot = await getDocs(messagesRef);
      const batch = writeBatch(db);
      messagesSnapshot.forEach((messageDoc) => {
        batch.delete(messageDoc.ref);
      });
      
      batch.delete(roomRef);
      
      await batch.commit();
      
      if (selectedRoom?.id === roomId) {
        onRoomSelect(null);
        localStorage.removeItem('selectedRoomId');
      }
    } catch (error) {
      console.error('Error deleting room:', error);
      alert('Failed to delete room. Please try again.');
    }
  };

  const joinRoom = async (room) => {
    const isAlreadyMember = room.members?.some(member => member.uid === user.uid);
    if (isAlreadyMember) {
      onRoomSelect(room);
      return;
    }

    const newMember = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || user.email,
      photoURL: user.photoURL,
      role: 'member',
      joinedAt: new Date()
    };

    await updateDoc(doc(db, 'rooms', room.id), {
      members: arrayUnion(newMember)
    });

    onRoomSelect(room);
  };

  const getUserRole = (room) => {
    const member = room.members?.find(m => m.uid === user.uid);
    return member?.role || 'none';
  };

  return (
    <div className="room-list">
      <div className="room-list-header">
        <h2>Chat Rooms</h2>
        <button 
          className="create-room-btn"
          onClick={() => setShowCreateForm(!showCreateForm)}
        >
          {showCreateForm ? 'Cancel' : '+ New Room'}
        </button>
      </div>

      {showCreateForm && (
        <form onSubmit={createRoom} className="create-room-form">
          <input
            type="text"
            placeholder="Room name"
            value={newRoomName}
            onChange={(e) => setNewRoomName(e.target.value)}
            required
          />
          <textarea
            placeholder="Room description (optional)"
            value={newRoomDescription}
            onChange={(e) => setNewRoomDescription(e.target.value)}
          />
          <button type="submit">Create Room</button>
        </form>
      )}

      <div className="rooms-container">
        {rooms.length === 0 ? (
          <div className="no-rooms-message">
            <p>No rooms available yet.</p>
            <p>Create the first room to get started!</p>
          </div>
        ) : (
          rooms.map(room => {
            const userRole = getUserRole(room);
            const isSelected = selectedRoom?.id === room.id;
            
            return (
              <div 
                key={room.id} 
                className={`room-item ${isSelected ? 'selected' : ''}`}
              >
                <div className="room-info" onClick={() => joinRoom(room)}>
                  <h3>{room.name}</h3>
                  <p>{room.description}</p>
                  <div className="room-meta">
                    <span>{room.members?.length || 0} members</span>
                    {userRole !== 'none' && (
                      <span className={`role-badge ${userRole}`}>{userRole}</span>
                    )}
                  </div>
                </div>
                <div className="room-actions">
                  {userRole === 'admin' && (
                    <button
                      className="delete-room-btn"
                      onClick={() => deleteRoom(room.id)}
                      title="Delete Room"
                    >
                      Delete
                    </button>
                  )}
                  {userRole !== 'none' ? (
                    <button className="enter-btn" onClick={() => joinRoom(room)}>Enter</button>
                  ) : (
                    <button className="join-btn" onClick={() => joinRoom(room)}>Join</button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
} 