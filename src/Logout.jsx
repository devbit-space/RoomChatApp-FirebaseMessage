import { auth } from './firebase';
import { signOut } from 'firebase/auth';

function Logout() {
  return (
    <button 
      className="logout-button" 
      onClick={() => signOut(auth)}
      title="Logout"
    >
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        viewBox="0 0 24 24" 
        fill="currentColor" 
        width="20" 
        height="20"
      >
        <path fillRule="evenodd" d="M7.5 3.75A1.5 1.5 0 006 5.25v13.5a1.5 1.5 0 001.5 1.5h6a1.5 1.5 0 001.5-1.5V15a.75.75 0 011.5 0v3.75a3 3 0 01-3 3h-6a3 3 0 01-3-3V5.25a3 3 0 013-3h6a3 3 0 013 3V9A.75.75 0 0115 9V5.25a1.5 1.5 0 00-1.5-1.5h-6z" clipRule="evenodd" />
        <path fillRule="evenodd" d="M19.5 12a.75.75 0 000-1.5l-6-6a.75.75 0 10-1.06 1.06L16.69 9.75H10.5a.75.75 0 000 1.5h6.19l-4.25 4.25a.75.75 0 101.06 1.06l6-6z" clipRule="evenodd" />
      </svg>
    </button>
  );
}

export default Logout;