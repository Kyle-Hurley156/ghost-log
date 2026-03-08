import { initializeApp } from 'firebase/app';
import { getAuth, OAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAH3L6UcFaXos3AT3o8W8EHsgWBbL8_ZA4",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "ghost-log.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "ghost-log",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "ghost-log.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "585835627677",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:585835627677:web:9a7a15f79c21a5cb7b0074"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const appleProvider = new OAuthProvider('apple.com');