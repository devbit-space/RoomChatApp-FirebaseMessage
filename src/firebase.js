import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
// import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
    apiKey: "AIzaSyDFrmm8OIFj3YguA5LYMmBdFW61jAXbUSs",
    authDomain: "rfb1-627fa.firebaseapp.com",
    projectId: "rfb1-627fa",
    storageBucket: "rfb1-627fa.appspot.com",
    messagingSenderId: "634651971647",
    appId: "1:634651971647:web:97a374a85eac4a93eba88a",
    measurementId: "G-SWXHSTRQDP"
};

const app = initializeApp(firebaseConfig);
// const analytics = getAnalytics(app);

export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = getFirestore(app);
export const storage = getStorage(app);