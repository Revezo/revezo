import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyC2TJnTRAA_LMxZ89V1lXMy-otx9MYaC4E",
  authDomain: "revezo-5123c.firebaseapp.com",
  projectId: "revezo-5123c",
  storageBucket: "revezo-5123c.firebasestorage.app",
  messagingSenderId: "465806792265",
  appId: "1:465806792265:web:28cb46961910369c9dd198"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };
