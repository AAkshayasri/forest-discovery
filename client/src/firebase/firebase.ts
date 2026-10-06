import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  setPersistence, 
  browserLocalPersistence,
  type Auth 
} from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Check if credentials are placeholders or unconfigured
const isPlaceholder = (val: string | undefined) => {
  return !val || val.includes('your_') || val.trim() === '' || val.startsWith('AIzaSyxxxx');
};

let app;
let auth: Auth;
let db: Firestore;

if (
  firebaseConfig.apiKey && !isPlaceholder(firebaseConfig.apiKey) &&
  firebaseConfig.authDomain && !isPlaceholder(firebaseConfig.authDomain) &&
  firebaseConfig.projectId && !isPlaceholder(firebaseConfig.projectId)
) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    db = getFirestore(app);

    // Enforce robust browser local persistence
    setPersistence(auth, browserLocalPersistence).catch((err) => {
      console.warn('[Firebase] Failed to set browserLocalPersistence:', err.message);
    });

    console.log('✅ Firebase Client SDK initialized with browser local persistence.');
  } catch (error: any) {
    console.error('❌ Firebase SDK initialization failed:', error.message);
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    db = getFirestore(app);
  }
} else {
  console.warn('⚠️ Firebase environment variables missing or placeholders. Please configure client/.env with your Firebase web credentials.');
  // Initialize with fallback config structure to avoid runtime null crashes
  app = getApps().length === 0 ? initializeApp({
    apiKey: 'placeholder-api-key',
    authDomain: 'placeholder.firebaseapp.com',
    projectId: 'placeholder-project'
  }) : getApp();
  auth = getAuth(app);
  db = getFirestore(app);
}

export { app, auth, db };
export default auth;
