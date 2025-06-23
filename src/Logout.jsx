import { auth } from './firebase';
import { signOut } from 'firebase/auth';

function Logout() {
  return (
    <button className="logout-button" onClick={() => signOut(auth)}>Log Out</button>
  );
}

export default Logout;