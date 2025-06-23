import React, { useState, useEffect } from 'react';
import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { useSelector, useDispatch } from 'react-redux';
import { setUser } from './store/authSlice';
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
    return <div>Loading...</div>;
  }

  if (user) {
    return <ChatApp />;
  }

  return (
    <div className="app">
      {showSignUp ? <SignUp /> : <SignIn />}
    </div>
  );
}

export default App;
