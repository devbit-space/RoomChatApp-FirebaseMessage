import React, { useEffect, useRef, useState } from "react";
import { db, auth, storage } from "../firebase";
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  arrayRemove,
  arrayUnion,
  deleteDoc,
  writeBatch,
  getDoc
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useSelector } from 'react-redux';
import { useTheme } from '../context/ThemeContext';
import './RoomChat.css';
import Settings from './Settings';

const formatTimestamp = (timestamp) => {
  if (!timestamp || typeof timestamp.toDate !== 'function') {
    return '';
  }
  const date = timestamp.toDate();
  return date.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};

export default function RoomChat({ selectedRoom, onBackToRooms }) {
  const [messages, setMessages] = useState([]);
  const [formValue, setFormValue] = useState("");
  const [editingMessage, setEditingMessage] = useState(null);
  const [editFormValue, setEditFormValue] = useState("");
  const [selectedMessages, setSelectedMessages] = useState([]);
  const [showMembers, setShowMembers] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [lastClickedMessageId, setLastClickedMessageId] = useState(null);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const didDrag = useRef(false);
  const dummy = useRef();
  const messageInputRef = useRef();
  const { user } = useSelector((state) => state.auth);
  const [newMessage, setNewMessage] = useState('');
  const [isSelecting, setIsSelecting] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [editText, setEditText] = useState('');
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef(null);

  const isSelectionMode = selectedMessages.length > 0;

  // Function to mark room as read
  const markRoomAsRead = async () => {
    if (!selectedRoom || !user) return;
    
    try {
      const roomRef = doc(db, 'rooms', selectedRoom.id);
      const roomDoc = await getDoc(roomRef);
      
      if (roomDoc.exists()) {
        const roomData = roomDoc.data();
        const updatedMembers = roomData.members.map(member => 
          member.uid === user.uid 
            ? { ...member, lastReadTimestamp: new Date() }
            : member
        );

        await updateDoc(roomRef, {
          members: updatedMembers
        });
      }
    } catch (error) {
      console.error('Error marking room as read:', error);
    }
  };

  useEffect(() => {
    if (!selectedRoom) return;

    const q = query(
      collection(db, `rooms/${selectedRoom.id}/messages`),
      orderBy("createdAt")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs);
      
      // Mark room as read when messages are loaded or updated
      if (msgs.length > 0) {
        markRoomAsRead();
      }
    });
    return unsubscribe;
  }, [selectedRoom]);

  // Also mark as read when room is first selected
  useEffect(() => {
    if (selectedRoom) {
      markRoomAsRead();
    }
  }, [selectedRoom]);

  useEffect(() => {
    if (dummy.current) {
      dummy.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Focus message input when room is selected
  useEffect(() => {
    if (selectedRoom && messageInputRef.current) {
      // Small delay to ensure the component is fully rendered
      setTimeout(() => {
        messageInputRef.current.focus();
      }, 100);
    }
  }, [selectedRoom]);

  useEffect(() => {
    const handleMouseUp = () => {
      if (isMouseDown) {
        setIsMouseDown(false);
        // Reset drag flag slightly after mouse up to prevent click event
        setTimeout(() => {
          didDrag.current = false;
        }, 50);
      }
    };
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, [isMouseDown]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (isSelectionMode) {
          cancelSelection();
        } else {
          // If no messages are selected, go back to rooms list
          onBackToRooms();
        }
      } else if (e.key === 'Delete' && isSelectionMode) {
        e.preventDefault();
        deleteSelectedMessages();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'c' && isSelectionMode) {
        e.preventDefault();
        copySelectedMessages();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isSelectionMode, selectedMessages, onBackToRooms, messages]);

  // Cleanup typing timeout on unmount or room change
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [selectedRoom]);

  const sendMessage = async (e) => {
    e.preventDefault();
    const messageText = messageInputRef.current?.textContent?.trim() || '';
    if (!messageText || !selectedRoom) return;

    const { uid, photoURL, displayName, email } = auth.currentUser;
    const userRole = getUserRole();

    await addDoc(collection(db, `rooms/${selectedRoom.id}/messages`), {
      text: messageText,
      createdAt: serverTimestamp(),
      uid,
      photoURL,
      displayName: displayName || email,
      role: userRole
    });

    // Clear the contentEditable div
    if (messageInputRef.current) {
      messageInputRef.current.textContent = '';
      messageInputRef.current.innerHTML = '';
    }
    setFormValue("");
    
    // Clear typing state and timeout when message is sent
    setIsTyping(false);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    
    dummy.current?.scrollIntoView({ behavior: "smooth" });
  };

  const getUserRole = () => {
    const member = selectedRoom.members?.find(m => m.uid === user.uid);
    return member?.role || 'member';
  };

  const canManageRoles = () => {
    const role = getUserRole();
    return role === 'admin' || role === 'moderator';
  };

  const canKickUser = (targetMember) => {
    const currentUserRole = getUserRole();
    const targetRole = targetMember.role;
    
    if (currentUserRole === 'admin') return true;
    if (currentUserRole === 'moderator' && targetRole === 'member') return true;
    return false;
  };

  const changeUserRole = async (member, newRole) => {
    if (!canManageRoles()) return;

    const updatedMembers = selectedRoom.members.map(m => 
      m.uid === member.uid ? { ...m, role: newRole } : m
    );

    await updateDoc(doc(db, 'rooms', selectedRoom.id), {
      members: updatedMembers
    });

    setShowRoleModal(false);
    setSelectedMember(null);
  };

  const kickUser = async (member) => {
    if (!canKickUser(member)) return;

    const updatedMembers = selectedRoom.members.filter(m => m.uid !== member.uid);
    await updateDoc(doc(db, 'rooms', selectedRoom.id), {
      members: updatedMembers
    });
  };

  const handleLeaveRoom = () => {
    setShowLeaveModal(true);
  };

  const confirmLeaveRoom = async () => {
    const updatedMembers = selectedRoom.members.filter(m => m.uid !== user.uid);
    await updateDoc(doc(db, 'rooms', selectedRoom.id), {
      members: updatedMembers
    });
    setShowLeaveModal(false);
    onBackToRooms();
  };

  const cancelLeaveRoom = () => {
    setShowLeaveModal(false);
  };

  const handleMouseDown = (e, message) => {
    if (e.button !== 0) return; // Only for left click
    setIsMouseDown(true);
    if(didDrag.current) {
      setSelectedMessages(prev => [...new Set([...prev, message.id])]);
    }
  };

  const handleMouseEnter = (message) => {
    if (isMouseDown) {
      didDrag.current = true;
      
      // Only allow selection if user is admin or it's their own message
      const userRole = getUserRole();
      const isAdmin = userRole === 'admin';
      const isOwnMessage = message.uid === user.uid;
      
      if (!isAdmin && !isOwnMessage) {
        return; // Don't allow selection of other users' messages if not admin
      }
      
      setSelectedMessages(prev => {
        if (prev.includes(message.id)) {
          // If message is already selected, deselect it
          return prev.filter(id => id !== message.id);
        } else {
          // If message is not selected, add it to selection
          return [...prev, message.id];
        }
      });
    }
  };

  const handleMessageClick = (e, message) => {
    if (didDrag.current) return;
    if (editingMessage) return;

    const currentMessageId = message.id;
    
    // Only allow selection if user is admin or it's their own message
    const userRole = getUserRole();
    const isAdmin = userRole === 'admin';
    const isOwnMessage = message.uid === user.uid;
    
    if (!isAdmin && !isOwnMessage) {
      return; // Don't allow selection of other users' messages if not admin
    }

    if (e.shiftKey && lastClickedMessageId) {
      const lastIndex = messages.findIndex(m => m.id === lastClickedMessageId);
      const currentIndex = messages.findIndex(m => m.id === currentMessageId);

      if (lastIndex !== -1 && currentIndex !== -1) {
        const start = Math.min(lastIndex, currentIndex);
        const end = Math.max(lastIndex, currentIndex);
        const rangeMessages = messages.slice(start, end + 1);
        
        // Filter range to only include messages user can select
        const selectableRangeIds = rangeMessages
          .filter(msg => isAdmin || msg.uid === user.uid)
          .map(msg => msg.id);

        const newSelectedMessages = new Set([...selectedMessages, ...selectableRangeIds]);
        setSelectedMessages(Array.from(newSelectedMessages));
        return; 
      }
    }

    setSelectedMessages(prev => {
      if (prev.includes(currentMessageId)) {
        return prev.filter(id => id !== currentMessageId);
      } else {
        return [...prev, currentMessageId];
      }
    });
    setLastClickedMessageId(currentMessageId);
  };

  const cancelSelection = () => {
    setSelectedMessages([]);
  };
  
  const deleteSelectedMessages = async () => {
    const batch = writeBatch(db);
    const userRole = getUserRole();
    const isAdmin = userRole === 'admin';
    
    // Delete messages based on permissions
    selectedMessages.forEach(id => {
      const message = messages.find(m => m.id === id);
      if (message && canDeleteMessage(message)) {
        const messageRef = doc(db, `rooms/${selectedRoom.id}/messages`, id);
        batch.delete(messageRef);
      }
    });
    await batch.commit();
    setSelectedMessages([]);
  };

  const copySelectedMessages = async () => {
    if (selectedMessages.length === 0) return;

    try {
      // Get selected messages in chronological order
      const selectedMessagesData = selectedMessages
        .map(id => messages.find(m => m.id === id))
        .filter(msg => msg) // Remove any undefined messages
        .sort((a, b) => {
          // Sort by creation time
          if (!a.createdAt || !b.createdAt) return 0;
          return a.createdAt.toDate() - b.createdAt.toDate();
        });

      let clipboardText;
      
      if (selectedMessages.length === 1) {
        // For single message, copy only the message content
        clipboardText = selectedMessagesData[0]?.text || '';
      } else {
        // For multiple messages, use formatted version
        clipboardText = selectedMessagesData
          .map(message => {
            const timestamp = message.createdAt ? formatTimestamp(message.createdAt) : '';
            const author = message.displayName || 'Unknown';
            const text = message.text || '';
            
            // Format: [Time] Author: Message
            return `[${timestamp}] ${author}: ${text}`;
          })
          .join('\n');
      }

      // Copy to clipboard
      await navigator.clipboard.writeText(clipboardText);
      
      // Show beautiful success notification
      showCopyNotification(selectedMessages.length);
      
    } catch (error) {
      console.error('Failed to copy messages to clipboard:', error);
      
      // Fallback for older browsers
      try {
        const selectedMessagesData = selectedMessages
          .map(id => messages.find(m => m.id === id))
          .filter(msg => msg)
          .sort((a, b) => {
            if (!a.createdAt || !b.createdAt) return 0;
            return a.createdAt.toDate() - b.createdAt.toDate();
          });

        let clipboardText;
        
        if (selectedMessages.length === 1) {
          clipboardText = selectedMessagesData[0]?.text || '';
        } else {
          clipboardText = selectedMessagesData
            .map(message => {
              const timestamp = message.createdAt ? formatTimestamp(message.createdAt) : '';
              const author = message.displayName || 'Unknown';
              const text = message.text || '';
              return `[${timestamp}] ${author}: ${text}`;
            })
            .join('\n');
        }

        // Create a temporary textarea element for fallback
        const textArea = document.createElement('textarea');
        textArea.value = clipboardText;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        
        // Show beautiful success notification
        showCopyNotification(selectedMessages.length);
      } catch (fallbackError) {
        console.error('Clipboard fallback also failed:', fallbackError);
        showCopyNotification(0, true); // Show error notification
      }
    }
  };

  const showCopyNotification = (messageCount, isError = false) => {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `copy-notification ${isError ? 'error' : 'success'}`;
    
    if (isError) {
      notification.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
        <span>Failed to copy messages</span>
      `;
    } else {
      notification.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
        </svg>
        <span>${messageCount === 1 ? 'Message copied!' : `${messageCount} messages copied!`}</span>
      `;
    }
    
    // Add styles
    Object.assign(notification.style, {
      position: 'fixed',
      top: '20px',
      right: '20px',
      backgroundColor: isError ? '#ff4757' : '#2ed573',
      color: 'white',
      padding: '12px 16px',
      borderRadius: '8px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontSize: '14px',
      fontWeight: '500',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      zIndex: '10000',
      transform: 'translateX(100%)',
      transition: 'transform 0.3s ease',
      maxWidth: '300px'
    });
    
    document.body.appendChild(notification);
    
    // Animate in
    requestAnimationFrame(() => {
      notification.style.transform = 'translateX(0)';
    });
    
    // Remove after 3 seconds
    setTimeout(() => {
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification);
        }
      }, 300);
    }, 3000);
  };

  const handleEditClick = (e, message) => {
    e.stopPropagation();
    
    // Check if user can manage this message
    if (!canManageMessage(message)) {
      alert('You can only edit your own messages.');
      return;
    }
    
    setEditingMessage(message);
    setEditText(message.text);
  };

  const handleEditSave = async () => {
    if (!editText.trim() || !editingMessage) return;

    try {
      const messageRef = doc(db, `rooms/${selectedRoom.id}/messages/${editingMessage.id}`);
      await updateDoc(messageRef, {
        text: editText.trim(),
        editedAt: serverTimestamp()
      });
      setEditingMessage(null);
      setEditText('');
    } catch (error) {
      console.error('Error updating message:', error);
    }
  };

  const handleEditCancel = () => {
    setEditingMessage(null);
    setEditText('');
  };

  const handleEditKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleEditSave();
    } else if (e.key === 'Escape') {
      handleEditCancel();
    }
  };

  const handleEditInputChange = (e) => {
    const content = e.target.textContent || '';
    setEditText(content);
  };

  const handleEditInputPaste = (e) => {
    // Prevent pasting formatted text, only allow plain text
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  };

  const handleMessageInputKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(e);
    }
  };

  const handleMessageInputChange = () => {
    const content = messageInputRef.current?.textContent || '';
    setFormValue(content);
    
    // Set typing to true when user starts typing
    if (content.trim() && !isTyping) {
      setIsTyping(true);
    }
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set typing to false after 1 seconds of inactivity
    if (content.trim()) {
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
      }, 1000);
    } else {
      // If input is empty, immediately set typing to false
      setIsTyping(false);
    }
  };

  const handleMessageInputPaste = (e) => {
    // Prevent pasting formatted text, only allow plain text
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  };

  const canManageMessage = (message) => {
    // Users can only manage their own messages, regardless of role
    return message.uid === user.uid;
  };

  const canDeleteMessage = (message) => {
    // Admins can delete any message, users can only delete their own
    const userRole = getUserRole();
    return userRole === 'admin' || message.uid === user.uid;
  };

  const handleDeleteClick = (e, messageId) => {
    e.stopPropagation();
    
    // Find the message and check if user can delete it
    const message = messages.find(m => m.id === messageId);
    if (!message || !canDeleteMessage(message)) {
      const userRole = getUserRole();
      if (userRole !== 'admin') {
        alert('You can only delete your own messages.');
      }
      return;
    }
    
    const isConfirmed = window.confirm('Are you sure you want to delete this message?');
    if (isConfirmed) {
      deleteDoc(doc(db, `rooms/${selectedRoom.id}/messages`, messageId));
    }
  };

  const deleteMember = async (memberUid) => {
    if (!selectedRoom || !user) return;
    
    const userRole = getUserRole();
    if (userRole !== 'admin') {
      alert('Only admins can remove members');
      return;
    }

    const isConfirmed = window.confirm(
      'Are you sure you want to remove this member from the room?'
    );
    if (!isConfirmed) return;

    try {
      const updatedMembers = selectedRoom.members.filter(member => member.uid !== memberUid);
      const roomRef = doc(db, 'rooms', selectedRoom.id);
      await updateDoc(roomRef, {
        members: updatedMembers
      });
      
      // Update local state
      const updatedRoom = { ...selectedRoom, members: updatedMembers };
      // Note: We need to pass this update to the parent component
      // For now, we'll just update the local state
      selectedRoom.members = updatedMembers;
    } catch (error) {
      console.error('Error removing member:', error);
      alert('Failed to remove member. Please try again.');
    }
  };

  if (!selectedRoom) {
    return (
      <div className="room-chat-placeholder">
        <h2>Select a room to start chatting</h2>
      </div>
    );
  }

  return (
    <div className="room-chat">
      <div className="chat-header">
        <div className="chat-header-left">
          <button className="back-btn" onClick={onBackToRooms}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
              <path fillRule="evenodd" d="M12.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 111.414 1.414L9.414 10l3.293 3.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            <span>Back</span>
          </button>
          <div className="room-info">
            <h2>{selectedRoom.name}</h2>
            <p>{selectedRoom.members?.length || 0} members</p>
          </div>
        </div>
        <div className="chat-header-right">
          <button 
            className="members-btn"
            onClick={() => setShowMembers(!showMembers)}
          >
            Members ({selectedRoom.members?.length || 0})
          </button>
          <button className="leave-btn" onClick={handleLeaveRoom}>
            Leave Room
          </button>
        </div>
      </div>

      <div className="chat-container">
        <div className="messages-container">
          <main>
            {messages.map((message) => {
              const isSelected = selectedMessages.includes(message.id);
              const isEditing = editingMessage?.id === message.id;
              const isSentByUser = message.uid === user.uid;

              return (
                <div
                  key={message.id}
                  className={`message-wrapper ${isSentByUser ? 'sent' : 'received'} ${isSelected ? 'selected' : ''}`}
                  onMouseDown={(e) => handleMouseDown(e, message)}
                  onMouseEnter={() => handleMouseEnter(message)}
                  onClick={(e) => !isEditing && handleMessageClick(e, message)}
                >
                  <div className="message-avatar">
                    <img src={message.photoURL || 'https://cdn-icons-png.freepik.com/256/12318/12318446.png?semt=ais_hybrid'} alt="avatar" />
                  </div>
                  <div className="message-content">
                    <div className="message-header">
                      <span className="message-author" style={{ color: isSentByUser ? 'var(--text-primary)' : 'var(--telegram-blue)' }}>{isSentByUser ? 'You' : message.displayName}</span>
                      <span className="message-time" style={{ color: 'var(--text-secondary)' }}>{formatTimestamp(message.createdAt)}</span>
                    </div>
                    
                    {isEditing ? (
                      <div className="message-bubble editing">
                        <div
                          contentEditable="true"
                          className="edit-message-input"
                          onKeyDown={handleEditKeyDown}
                          onInput={handleEditInputChange}
                          onPaste={handleEditInputPaste}
                          suppressContentEditableWarning={true}
                          ref={(el) => {
                            if (el && isEditing) {
                              el.textContent = editText;
                              el.focus();
                              // Move cursor to end
                              const range = document.createRange();
                              const sel = window.getSelection();
                              range.selectNodeContents(el);
                              range.collapse(false);
                              sel.removeAllRanges();
                              sel.addRange(range);
                            }
                          }}
                        />
                        <div className="edit-hint">
                          Press Enter to save • Esc to cancel
                        </div>
                      </div>
                    ) : (
                      <div className="message-bubble">
                        <p>{message.text}</p>
                      </div>
                    )}

                    <div className="message-footer">
                      {message.editedAt && <span className="edited-tag">(edited)</span>}
                      <span className={`role-indicator ${message.role}`}>{message.role}</span>
                    </div>
                  </div>

                  {!isEditing && !isSelectionMode && (canManageMessage(message) || canDeleteMessage(message)) && (
                    <div className="message-actions">
                      {canManageMessage(message) && (
                        <button onClick={(e) => handleEditClick(e, message)} title="Edit">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg>
                        </button>
                      )}
                      {canDeleteMessage(message) && (
                        <button onClick={(e) => handleDeleteClick(e, message.id)} title="Delete">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            <span ref={dummy}></span>
          </main>

          {/* Message Status Bar - positioned above the input field */}
          <div className="message-status-bar">
            <div className="status-content">
              {isSelectionMode ? (
                <div className="selection-status">
                  <span className="selection-count">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                    </svg>
                    {selectedMessages.length} message{selectedMessages.length !== 1 ? 's' : ''} selected
                  </span>
                  <button onClick={copySelectedMessages} className="copy-selection-btn-status" title="Copy messages (Ctrl+C)">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
                      <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                      <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                    </svg>
                    Copy
                  </button>
                  <div className="selection-actions">
                    <button onClick={cancelSelection} className="cancel-selection-btn-status">
                      Cancel
                    </button>
                    {(() => {
                      // Only show delete button if user can delete at least one selected message
                      const userRole = getUserRole();
                      const isAdmin = userRole === 'admin';
                      const canDeleteAny = selectedMessages.some(id => {
                        const message = messages.find(m => m.id === id);
                        return message && canDeleteMessage(message);
                      });
                      
                      return canDeleteAny ? (
                        <button onClick={deleteSelectedMessages} className="delete-selection-btn-status">
                          Delete
                        </button>
                      ) : null;
                    })()}
                  </div>
                </div>
              ) : isTyping ? (
                <span className="typing-indicator">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="4" cy="12" r="3">
                      <animate attributeName="r" values="3;3;5;3;3" dur="1s" repeatCount="indefinite" begin="0s" />
                    </circle>
                    <circle cx="12" cy="12" r="3">
                      <animate attributeName="r" values="3;3;5;3;3" dur="1s" repeatCount="indefinite" begin="0.2s" />
                    </circle>
                    <circle cx="20" cy="12" r="3">
                      <animate attributeName="r" values="3;3;5;3;3" dur="1s" repeatCount="indefinite" begin="0.4s" />
                    </circle>
                  </svg>
                  Typing...
                </span>
              ) : (
                <span className="online-status">
                  <div className="online-indicator"></div>
                  {selectedRoom.members?.length || 0} members online
                </span>
              )}
            </div>
          </div>

          <form onSubmit={sendMessage} className="message-form">
            <div className="message-input-container">
              <div
                ref={messageInputRef}
                contentEditable="true"
                className="message-input"
                data-placeholder="Type a message..."
                onKeyDown={handleMessageInputKeyDown}
                onInput={handleMessageInputChange}
                onPaste={handleMessageInputPaste}
                suppressContentEditableWarning={true}
              />
            </div>
            <button 
              type="submit" 
              disabled={!formValue.trim() || !selectedRoom}
              className="send-button"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
              </svg>
            </button>
          </form>
        </div>

        {showMembers && (
          <div className="modal-overlay" onClick={() => setShowMembers(false)}>
            <div className="members-modal" onClick={(e) => e.stopPropagation()}>
              <div className="members-header">
                <h3>Room Members</h3>
                <button onClick={() => setShowMembers(false)} className="close-settings-btn">×</button>
              </div>
              <div className="members-list">
                {selectedRoom.members?.map((member) => (
                  <div key={member.uid} className="member-item">
                    <img src={member.photoURL || 'https://cdn-icons-png.freepik.com/256/12318/12318446.png?semt=ais_hybrid'} alt={member.displayName} className="member-avatar" />
                    <div className="member-info">
                      <span className="member-name">{member.displayName || member.email}</span>&nbsp;&nbsp;
                      <span className={`member-role ${member.role}`}>{"[" + member.role + "]"}</span>
                    </div>
                    {getUserRole() === 'admin' && member.uid !== user?.uid && (
                      <div className="member-actions">
                         <button
                          className="kick-btn"
                          onClick={() => deleteMember(member.uid)}
                          title="Remove Member"
                        >
                          Kick
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {showRoleModal && selectedMember && (
        <div className="modal-overlay">
          <div className="role-modal">
            <h3>Change Role for {selectedMember.displayName}</h3>
            <div className="role-options">
              <button 
                onClick={() => changeUserRole(selectedMember, 'member')}
                className={selectedMember.role === 'member' ? 'active' : ''}
              >
                Member
              </button>
              <button 
                onClick={() => changeUserRole(selectedMember, 'moderator')}
                className={selectedMember.role === 'moderator' ? 'active' : ''}
              >
                Moderator
              </button>
              <button 
                onClick={() => changeUserRole(selectedMember, 'admin')}
                className={selectedMember.role === 'admin' ? 'active' : ''}
              >
                Admin
              </button>
            </div>
            <button 
              className="cancel-btn"
              onClick={() => {
                setShowRoleModal(false);
                setSelectedMember(null);
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {showLeaveModal && (
        <div className="modal-overlay" onClick={cancelLeaveRoom}>
          <div className="leave-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Leave Room</h3>
            </div>
            <div className="modal-content">
              <p>Are you sure you want to leave "{selectedRoom?.name}"?</p>
              <p>You'll need to rejoin to participate in this room again.</p>
            </div>
            <div className="modal-actions">
              <button className="cancel-btn" onClick={cancelLeaveRoom}>
                Cancel
              </button>
              <button className="leave-confirm-btn" onClick={confirmLeaveRoom}>
                Leave Room
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 