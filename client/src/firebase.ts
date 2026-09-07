import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import type { Auth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

let auth: Auth | null = null;
let isRealFirebase = false;

// Check if valid credentials are provided (ignore default placeholders)
const isPlaceholder = (val: string | undefined) => {
  return !val || val.includes('your_') || val.trim() === '';
};

if (
  firebaseConfig.apiKey && !isPlaceholder(firebaseConfig.apiKey) &&
  firebaseConfig.authDomain && !isPlaceholder(firebaseConfig.authDomain) &&
  firebaseConfig.projectId && !isPlaceholder(firebaseConfig.projectId)
) {
  try {
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    isRealFirebase = true;
    console.log("Firebase Client SDK initialized successfully.");
  } catch (error: any) {
    console.error("Firebase SDK init failed, falling back to Mock Auth:", error.message);
  }
} else {
  console.log("Firebase environment variables missing or placeholders. Using Mock Auth mode.");
}

export { auth, isRealFirebase };
export default auth;
