import React, { useState, useEffect } from 'react';
import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { useSelector, useDispatch } from 'react-redux';
import { setUser } from './store/authSlice';
import { ThemeProvider } from './context/ThemeContext';
import SignIn from './SignIn';
import SignUp from './SignUp';
import ChatApp from './components/ChatApp';
import './App.css';

function App() {
  const [loading, setLoading] = useState(true);
  const dispatch = useDispatch();
  const { showSignUp, user } = useSelector((state) => state.auth);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log('user ===>', user)
      dispatch(setUser(user));
      setLoading(false);
    });

    return () => unsubscribe();
  }, [dispatch]);

  if (loading) {
    return (
      <div className="app-loading">
        <div className="loading-content">
          <div className="loading-logo">
            <div className="logo-circle">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
          <div className="loading-text">
            <h2>Room Chat</h2>
            <p>Connecting you to conversations...</p>
          </div>
          <div className="loading-spinner-modern">
            <div className="spinner-dot"></div>
            <div className="spinner-dot"></div>
            <div className="spinner-dot"></div>
          </div>
        </div>
        <div className="loading-background">
          <div className="floating-circle circle-1"></div>
          <div className="floating-circle circle-2"></div>
          <div className="floating-circle circle-3"></div>
        </div>
      </div>
    );
  }

  return (
    <ThemeProvider>
      {user ? (
        <ChatApp />
      ) : (
        <div className="app">
          {showSignUp ? <SignUp /> : <SignIn />}
        </div>
      )}
    </ThemeProvider>
  );
}

export default App;
