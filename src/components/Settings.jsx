import React, { useState } from 'react';
import { auth, storage, db } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { updateProfile } from 'firebase/auth';
import { doc, updateDoc, getDocs, collection, query, where, writeBatch } from 'firebase/firestore';
import { useTheme } from '../context/ThemeContext';
import './Settings.css';

export default function Settings({ user, onClose }) {
  const { theme, toggleTheme, isDark } = useTheme();
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    displayName: user.displayName || '',
    avatarUrl: user.photoURL || '',
    notifications: JSON.parse(localStorage.getItem('notifications') || 'true'),
    soundEnabled: JSON.parse(localStorage.getItem('soundEnabled') || 'true')
  });

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setError('');
    setSuccess('');
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file.');
      return;
    }

    setIsUploading(true);
    setError('');

    const avatarRef = ref(storage, `avatars/${user.uid}/${file.name}`);

    try {
      const snapshot = await uploadBytes(avatarRef, file);
      const photoURL = await getDownloadURL(snapshot.ref);

      setFormData(prev => ({
        ...prev,
        avatarUrl: photoURL
      }));

      setSuccess('Avatar uploaded successfully!');
    } catch (err) {
      console.error("Error uploading avatar:", err);
      setError('Failed to upload avatar. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    setError('');
    setSuccess('');

    try {
      // Update Firebase Auth profile
      const updates = {};
      if (formData.displayName !== user.displayName) {
        updates.displayName = formData.displayName;
      }
      if (formData.avatarUrl !== user.photoURL) {
        updates.photoURL = formData.avatarUrl;
      }

      if (Object.keys(updates).length > 0) {
        await updateProfile(auth.currentUser, updates);
      }

      // Update user info in all rooms they are a member of
      if (updates.displayName || updates.photoURL) {
        const roomsRef = collection(db, 'rooms');
        const q = query(roomsRef);
        const batch = writeBatch(db);
        const querySnapshot = await getDocs(q);

        querySnapshot.forEach(roomDoc => {
          const roomData = roomDoc.data();
          if (roomData.members && roomData.members.some(member => member.uid === user.uid)) {
            const updatedMembers = roomData.members.map(member => 
              member.uid === user.uid 
                ? { 
                    ...member, 
                    ...(updates.displayName && { displayName: updates.displayName }),
                    ...(updates.photoURL && { photoURL: updates.photoURL })
                  } 
                : member
            );
            batch.update(roomDoc.ref, { members: updatedMembers });
          }
        });
        
        await batch.commit();
      }

      // Save preferences to localStorage
      localStorage.setItem('notifications', JSON.stringify(formData.notifications));
      localStorage.setItem('soundEnabled', JSON.stringify(formData.soundEnabled));

      setSuccess('Settings saved successfully!');
      setTimeout(() => {
        onClose();
      }, 1500);

    } catch (err) {
      console.error("Error saving settings:", err);
      setError('Failed to save settings. Please try again.');
    }
  };

  return (
    <div className="settings-overlay">
      <div className="settings-modal">
        <div className="settings-header">
          <h2>Settings</h2>
          <button onClick={onClose} className="close-settings-btn">&times;</button>
        </div>
        
        <div className="settings-content">
          {/* Profile Section */}
          <div className="settings-section">
            <h3>Profile</h3>
            
            <div className="avatar-upload">
              <div className="avatar-preview">
                {formData.avatarUrl ? (
                  <img src={formData.avatarUrl} alt="Avatar" />
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                    <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <input
                  type="file"
                  id="avatarUpload"
                  onChange={handleAvatarUpload}
                  accept="image/*"
                  style={{ display: 'none' }}
                  disabled={isUploading}
                />
                <label htmlFor="avatarUpload" className={`upload-btn ${isUploading ? 'uploading' : ''}`}>
                  {isUploading ? 'Uploading...' : 'Upload Photo'}
                </label>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>or enter URL below</span>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="avatarUrl">Avatar URL</label>
              <input
                type="url"
                id="avatarUrl"
                value={formData.avatarUrl}
                onChange={(e) => handleInputChange('avatarUrl', e.target.value)}
                placeholder="https://example.com/avatar.jpg"
              />
            </div>

            <div className="form-group">
              <label htmlFor="displayName">Display Name</label>
              <input
                type="text"
                id="displayName"
                value={formData.displayName}
                onChange={(e) => handleInputChange('displayName', e.target.value)}
                placeholder="Enter your display name"
              />
            </div>

            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={user.email}
                disabled
                style={{ opacity: 0.6, cursor: 'not-allowed' }}
              />
            </div>
          </div>

          {/* Appearance Section */}
          <div className="settings-section">
            <h3>Appearance</h3>
            
            <div className="notification-toggle">
              <div>
                <strong>Dark Mode</strong>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Switch between light and dark themes
                </div>
              </div>
              <div 
                className={`toggle-switch ${isDark ? 'active' : ''}`}
                onClick={toggleTheme}
              />
            </div>
          </div>

          {/* Notifications Section */}
          <div className="settings-section">
            <h3>Notifications</h3>
            
            <div className="notification-toggle">
              <div>
                <strong>Push Notifications</strong>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Receive notifications for new messages
                </div>
              </div>
              <div 
                className={`toggle-switch ${formData.notifications ? 'active' : ''}`}
                onClick={() => handleInputChange('notifications', !formData.notifications)}
              />
            </div>

            <div className="notification-toggle">
              <div>
                <strong>Sound Effects</strong>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Play sound when receiving messages
                </div>
              </div>
              <div 
                className={`toggle-switch ${formData.soundEnabled ? 'active' : ''}`}
                onClick={() => handleInputChange('soundEnabled', !formData.soundEnabled)}
              />
            </div>
          </div>

          {/* Messages */}
          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}
        </div>

        <div className="settings-actions">
          <button 
            className="settings-btn secondary" 
            onClick={onClose}
            style={{ width: '100%' }}
          >
            Cancel
          </button>
          <button 
            className="settings-btn primary" 
            onClick={handleSave}
            style={{ width: '100%' }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
} 