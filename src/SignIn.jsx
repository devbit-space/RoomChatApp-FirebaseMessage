import React, { useState } from 'react';
import { signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { auth, provider } from './firebase';
import { useDispatch } from 'react-redux';
import { toggleSignUp } from './store/authSlice';
import './SignIn.css';

function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const dispatch = useDispatch();

  const signIn = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Success is handled by auth state change
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUpClick = () => {
    dispatch(toggleSignUp());
  };

  const signInWithGoogle = () => signInWithPopup(auth, provider);

  return (
    <div className="sign-in-container">
      <div className="sign-in-box">
        <h2>Welcome Back</h2>        
        <form onSubmit={signIn} className="sign-in-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <div className="error-message">{error}</div>}
          
          <button 
            type="submit" 
            className="sign-in-button"
            disabled={isLoading}
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <button onClick={signInWithGoogle} style={{width:'100%', marginTop:20}}>
          Sign in with Google
        </button>

        <div className="signup-link">
          Don't have an account?{' '}
          <a onClick={handleSignUpClick}>Sign up</a>
        </div>
      </div>
    </div>
  );
}

export default SignIn;
