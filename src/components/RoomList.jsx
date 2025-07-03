import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, addDoc, query, onSnapshot, doc, updateDoc, arrayUnion, deleteDoc, getDocs, writeBatch, orderBy, where } from 'firebase/firestore';
import { useSelector } from 'react-redux';
import './RoomList.css';

export default function RoomList({ onRoomSelect, selectedRoom, markRoomAsRead }) {
  const [rooms, setRooms] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomDescription, setNewRoomDescription] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [unreadCounts, setUnreadCounts] = useState({});
  const { user } = useSelector((state) => state.auth);

  // Component to render member avatars
  const MemberAvatars = ({ members = [], maxDisplay = 4 }) => {
    const displayMembers = members.slice(0, maxDisplay);
    const remainingCount = members.length - maxDisplay;

    return (
      <div className="member-avatars">
        {displayMembers.map((member, index) => (
          <div
            key={member.uid}
            className="member-avatar"
            style={{ zIndex: maxDisplay - index }}
            title={member.displayName || member.email}
          >
            {member.photoURL ? (
              <img src={member.photoURL} alt={member.displayName || member.email} />
            ) : (
              <div className="avatar-initials">
                {(member.displayName || member.email)?.charAt(0)?.toUpperCase()}
              </div>
            )}
          </div>
        ))}
        {remainingCount > 0 && (
          <div 
            className="member-avatar more-members"
            style={{ zIndex: 0 }}
            title={`+${remainingCount} more members`}
          >
            <div className="more-count">+{remainingCount}</div>
          </div>
        )}
      </div>
    );
  };

  // Function to get unread message count for a room
  const getUnreadCount = async (roomId, lastReadTimestamp) => {
    if (!lastReadTimestamp) {
      // If user never read messages in this room, count all messages except own messages
      const messagesQuery = query(collection(db, `rooms/${roomId}/messages`));
      const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
        const unreadCount = snapshot.docs.filter(doc => doc.data().uid !== user.uid).length;
        setUnreadCounts(prev => ({
          ...prev,
          [roomId]: unreadCount
        }));
      });
      return unsubscribe;
    } else {
      // Count messages after last read timestamp, excluding own messages
      const messagesQuery = query(
        collection(db, `rooms/${roomId}/messages`),
        where('createdAt', '>', lastReadTimestamp),
        orderBy('createdAt')
      );
      const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
        const unreadCount = snapshot.docs.filter(doc => doc.data().uid !== user.uid).length;
        setUnreadCounts(prev => ({
          ...prev,
          [roomId]: unreadCount
        }));
      });
      return unsubscribe;
    }
  };

  useEffect(() => {
    const q = query(collection(db, 'rooms'));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const roomsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRooms(roomsData);
      setIsLoading(false);

      // Set up unread message listeners for rooms user is a member of
      const unreadUnsubscribes = [];
      for (const room of roomsData) {
        const isMember = room.members?.some(member => member.uid === user.uid);
        if (isMember) {
          const member = room.members.find(m => m.uid === user.uid);
          const lastReadTimestamp = member?.lastReadTimestamp || null;
          const unreadUnsub = await getUnreadCount(room.id, lastReadTimestamp);
          unreadUnsubscribes.push(unreadUnsub);
        }
      }

      // Handle session persistence - auto-select saved room if not already selected
      if (!selectedRoom) {
        const savedRoomId = localStorage.getItem('selectedRoomId');
        if (savedRoomId) {
          const savedRoom = roomsData.find(room => room.id === savedRoomId);
          if (savedRoom) {
            // Check if user is still a member
            const isMember = savedRoom.members?.some(member => member.uid === user.uid);
            if (isMember) {
              onRoomSelect(savedRoom);
            } else {
              // User is no longer a member, clear the saved room
              localStorage.removeItem('selectedRoomId');
              localStorage.removeItem('selectedRoomData');
            }
          } else {
            // Room no longer exists, clear the saved room
            localStorage.removeItem('selectedRoomId');
            localStorage.removeItem('selectedRoomData');
          }
        }
      }

      // Cleanup function for unread listeners
      return () => {
        unreadUnsubscribes.forEach(unsub => unsub());
      };
    });
    return unsubscribe;
  }, [selectedRoom, onRoomSelect, user.uid]);

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
    const newRoom = { id: newRoomRef.id, ...roomData };
    onRoomSelect(newRoom);
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
      joinedAt: new Date(),
      lastReadTimestamp: new Date()
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
        {isLoading ? (
          // Skeleton loading state
          Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="room-skeleton">
              <div className="skeleton-avatar"></div>
              <div className="skeleton-content">
                <div className="skeleton-title"></div>
                <div className="skeleton-description"></div>
                <div className="skeleton-meta">
                  <div className="skeleton-avatars">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="skeleton-member-avatar"></div>
                    ))}
                  </div>
                  <div className="skeleton-text-small"></div>
                </div>
              </div>
            </div>
          ))
        ) : rooms.length === 0 ? (
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
                <div className="room-info">
                  <div className="room-header">
                    <h3>{room.name}</h3>
                    {unreadCounts[room.id] > 0 && (
                      <span className="unread-count">{unreadCounts[room.id]}</span>
                    )}
                  </div>
                  <p>{room.description}</p>
                  
                  {/* Member Avatars */}
                  <div className="room-members-section">
                    <MemberAvatars members={room.members || []} />
                    <div className="room-meta">
                      <span>{room.members?.length || 0} members</span>
                      {userRole !== 'none' && (
                        <span className={`role-badge ${userRole}`}>{userRole}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="room-actions">
                  {userRole === 'admin' && (
                    <button
                      className="delete-room-btn"
                      onClick={() => deleteRoom(room.id)}
                      title="Delete Room"
                      style={{ padding: '4px', minWidth: '24px', height: '28px' }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
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