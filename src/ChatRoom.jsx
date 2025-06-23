import { useEffect, useRef, useState } from "react";
import { db, auth } from "./firebase";
import {
    collection,
    addDoc,
    serverTimestamp,
    query,
    orderBy,
    onSnapshot
} from "firebase/firestore";

export default function ChatRoom() {
    const [messages, setMessages] = useState([]);
    const [formValue, setFormValue] = useState("");
    const dummy = useRef();
  
    useEffect(() => {
      const q = query(collection(db, "messages"), orderBy("createdAt"));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setMessages(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
        dummy.current?.scrollIntoView({ behavior: "smooth" });
      });
      return unsubscribe;
    }, []);
  
    const sendMessage = async (e) => {
      e.preventDefault();
      const { uid, photoURL } = auth.currentUser;
  
      await addDoc(collection(db, "messages"), {
        text: formValue,
        createdAt: serverTimestamp(),
        uid,
        photoURL
      });
  
      setFormValue("");
      dummy.current?.scrollIntoView({ behavior: "smooth" });
    };
  
    return (
      <>
        <main>
          {messages.map(({ id, text, uid, photoURL }) => (
            <div key={id} className={`message ${uid === auth.currentUser.uid ? 'sent' : 'received'}`}>
              <img src={photoURL} alt="avatar" />
              <p>{text}</p>
            </div>
          ))}
          <span ref={dummy}></span>
        </main>
  
        <form onSubmit={sendMessage}>
          <input
            value={formValue}
            onChange={(e) => setFormValue(e.target.value)}
            placeholder="Type a message"
          />
          <button type="submit" disabled={!formValue}>Send</button>
        </form>
      </>
    );
  }