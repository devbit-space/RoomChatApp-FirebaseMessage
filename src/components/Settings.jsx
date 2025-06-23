import React, { useState } from 'react';
import { auth, storage, db } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { updateProfile } from 'firebase/auth';
import { doc, updateDoc, getDocs, collection, query, where, writeBatch } from 'firebase/firestore';
import './Settings.css';

export default function Settings({ user, onClose }) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');

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

      // Update Firebase Auth profile
      await updateProfile(auth.currentUser, { photoURL });

      // Update user info in all rooms they are a member of
      const roomsRef = collection(db, 'rooms');
      const q = query(roomsRef, where('members', 'array-contains', { uid: user.uid, email: user.email, displayName: user.displayName, role: 'member' }));
      
      const batch = writeBatch(db);
      const querySnapshot = await getDocs(q);

      querySnapshot.forEach(roomDoc => {
        const roomData = roomDoc.data();
        const updatedMembers = roomData.members.map(member => 
          member.uid === user.uid ? { ...member, photoURL } : member
        );
        batch.update(roomDoc.ref, { members: updatedMembers });
      });
      
      await batch.commit();

      // We need to also update the user object in the parent component
      // A simple way is to just close the modal and let the app's auth state listener handle it
      onClose();

    } catch (err) {
      console.error("Error uploading avatar:", err);
      setError('Failed to upload avatar. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="settings-overlay">
      <div className="settings-modal">
        <div className="settings-header">
          <h2>Settings</h2>
          <button onClick={onClose} className="close-btn">&times;</button>
        </div>
        <div className="settings-content">
          <div className="avatar-section">
            <img src={user.photoURL || '/default-avatar.png'} alt="User Avatar" className="avatar-preview" />
            <input
              type="file"
              id="avatarUpload"
              onChange={handleAvatarUpload}
              accept="image/*"
              style={{ display: 'none' }}
              disabled={isUploading}
            />
            <label htmlFor="avatarUpload" className={`upload-btn ${isUploading ? 'uploading' : ''}`}>
              {isUploading ? 'Uploading...' : 'Change Avatar'}
            </label>
            {error && <p className="error-message">{error}</p>}
          </div>
          <div className="profile-info">
            <p><strong>Display Name:</strong> {user.displayName || 'Not set'}</p>
            <p><strong>Email:</strong> {user.email}</p>
          </div>
        </div>
      </div>
    </div>
  );
} 