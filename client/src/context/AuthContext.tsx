import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  sendEmailVerification, 
  sendPasswordResetEmail,
  updateProfile as updateFirebaseProfile,
  onAuthStateChanged,
  type User as FirebaseUser 
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { api, setLogoutCallback } from '../services/api';

export interface UserProfile {
  uid: string;
  id: string | number;
  email: string;
  name: string;
  role: 'admin' | 'user';
  avatar?: string | null;
  emailVerified: boolean;
  createdAt?: any;
}

interface AuthContextType {
  user: UserProfile | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  isDemo: boolean;
  login: (email: string, password: string) => Promise<{ emailVerified: boolean }>;
  register: (name: string, email: string, password: string, role?: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  checkVerificationStatus: () => Promise<boolean>;
  updateProfile: (name: string, avatar: string | null) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Maps raw Firebase error codes to user-friendly messages.
 */
export function getFriendlyFirebaseErrorMessage(code: string, fallbackMessage?: string): string {
  switch (code) {
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
    case 'auth/invalid-login-credentials':
      return 'Incorrect email or password. Please try again.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Please sign in instead.';
    case 'auth/invalid-email':
      return 'The email address format is invalid.';
    case 'auth/weak-password':
      return 'The password is too weak. Please provide at least 8 characters.';
    case 'auth/too-many-requests':
      return 'Access to this account has been temporarily disabled due to many failed attempts. Please reset your password or try again later.';
    case 'auth/user-disabled':
      return 'This account has been disabled by an administrator.';
    case 'auth/network-request-failed':
      return 'Network connection error. Please check your internet connection.';
    case 'auth/api-key-not-valid.-please-pass-a-valid-api-key.':
    case 'auth/api-key-not-valid.-please-pass-a-valid-api-key':
    case 'auth/invalid-api-key':
    case 'auth/api-key-not-valid':
      return 'Firebase API key is missing, invalid, or restricted. Please set VITE_FIREBASE_API_KEY in client/.env and verify API key restrictions in Google Cloud Console.';
    case 'auth/configuration-not-found':
      return 'Email/Password provider is not enabled in your Firebase Console. Please go to Firebase Console > Authentication > Sign-in method and enable "Email/Password".';
    case 'auth/operation-not-allowed':
      return 'Email/Password sign-in is disabled. Please enable "Email/Password" under Firebase Console > Authentication > Sign-in method.';
    case 'auth/expired-action-code':
      return 'The password reset or verification link has expired. Please request a new one.';
    case 'auth/invalid-action-code':
      return 'The password reset or verification link is invalid or has already been used.';
    default:
      if (code && code.toLowerCase().includes('api-key')) {
        return 'Firebase API key is invalid or restricted. Please verify VITE_FIREBASE_API_KEY in client/.env and API restrictions in Google Cloud Console.';
      }
      return fallbackMessage || 'Authentication error. Please try again.';
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Sync profile from Cloud Firestore or Express backend
  const syncProfile = async (fbUser: FirebaseUser) => {
    try {
      let role: 'admin' | 'user' = fbUser.email?.toLowerCase().trim() === 'admin@wildatlas.com' ? 'admin' : 'user';
      let name = fbUser.displayName || 'Explorer';
      let avatar = fbUser.photoURL || null;

      try {
        const userDocRef = doc(db, 'users', fbUser.uid);
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          role = data.role === 'admin' ? 'admin' : role;
          name = data.name || name;
          avatar = data.avatar || avatar;
        }
      } catch (firestoreErr) {
        // Fallback to Express backend if Firestore direct client is blocked by rules before verification
        try {
          const apiProfile = await api.getProfile();
          if (apiProfile) {
            role = apiProfile.role || role;
            name = apiProfile.name || name;
            avatar = apiProfile.avatar || avatar;
          }
        } catch {}
      }

      const profile: UserProfile = {
        uid: fbUser.uid,
        id: fbUser.uid,
        email: fbUser.email || '',
        name,
        role,
        avatar,
        emailVerified: Boolean(fbUser.emailVerified)
      };

      setUser(profile);
      return profile;
    } catch (err) {
      console.warn('[AuthContext] Profile sync notice:', err);
      const fallbackProfile: UserProfile = {
        uid: fbUser.uid,
        id: fbUser.uid,
        email: fbUser.email || '',
        name: fbUser.displayName || 'Explorer',
        role: 'user',
        avatar: fbUser.photoURL || null,
        emailVerified: Boolean(fbUser.emailVerified)
      };
      setUser(fallbackProfile);
      return fallbackProfile;
    }
  };

  useEffect(() => {
    // Register global API logout handler
    setLogoutCallback(() => {
      setUser(null);
      setFirebaseUser(null);
    });

    // Listen to Firebase Auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        setFirebaseUser(fbUser);
        await syncProfile(fbUser);
      } else {
        setFirebaseUser(null);
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const ensureValidFirebaseConfig = () => {
    const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
    if (!apiKey || apiKey.trim() === '' || apiKey.includes('your_') || apiKey === 'YOUR_API_KEY' || apiKey === 'placeholder-api-key') {
      throw new Error('Firebase Web API Key is not configured. Please paste your VITE_FIREBASE_API_KEY in client/.env and restart the server.');
    }
  };

  const login = async (email: string, password: string) => {
    ensureValidFirebaseConfig();
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
      // Fresh check on email verification
      await cred.user.reload();
      const isVerified = cred.user.emailVerified;

      setFirebaseUser(cred.user);
      
      if (isVerified) {
        // Force refresh token so email_verified claim is updated
        await cred.user.getIdToken(true);
        await syncProfile(cred.user);
      } else {
        await syncProfile(cred.user);
      }

      return { emailVerified: isVerified };
    } catch (error: any) {
      const friendlyMsg = getFriendlyFirebaseErrorMessage(error.code, error.message);
      throw new Error(friendlyMsg);
    } finally {
      setLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string, role = 'user') => {
    ensureValidFirebaseConfig();
    setLoading(true);
    const normalizedEmail = email.trim().toLowerCase();
    const cleanName = name.trim();

    try {
      // 1. Create Firebase Auth user
      const cred = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
      
      // 2. Set Firebase Auth displayName
      await updateFirebaseProfile(cred.user, { displayName: cleanName });

      // 3. Send mandatory email verification
      await sendEmailVerification(cred.user);

      // 4. Create Firestore user document users/{uid}
      try {
        await setDoc(doc(db, 'users', cred.user.uid), {
          uid: cred.user.uid,
          name: cleanName,
          email: normalizedEmail,
          role: role === 'admin' || normalizedEmail === 'admin@wildatlas.com' ? 'admin' : 'user',
          emailVerified: false,
          avatar: null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      } catch (docErr: any) {
        console.warn('[AuthContext] Firestore initial document creation warning:', docErr.message);
      }

      setFirebaseUser(cred.user);
      await syncProfile(cred.user);
    } catch (error: any) {
      const friendlyMsg = getFriendlyFirebaseErrorMessage(error.code, error.message);
      throw new Error(friendlyMsg);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await signOut(auth);
    } catch (err: any) {
      console.warn('[AuthContext] Sign out warning:', err.message);
    } finally {
      setUser(null);
      setFirebaseUser(null);
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    ensureValidFirebaseConfig();
    try {
      await sendPasswordResetEmail(auth, email.trim().toLowerCase());
    } catch (error: any) {
      const friendlyMsg = getFriendlyFirebaseErrorMessage(error.code, error.message);
      throw new Error(friendlyMsg);
    }
  };

  const resendVerificationEmail = async () => {
    if (!auth.currentUser) {
      throw new Error("No active session found. Please log in first.");
    }
    try {
      await sendEmailVerification(auth.currentUser);
    } catch (error: any) {
      const friendlyMsg = getFriendlyFirebaseErrorMessage(error.code, error.message);
      throw new Error(friendlyMsg);
    }
  };

  const checkVerificationStatus = async (): Promise<boolean> => {
    if (!auth.currentUser) return false;
    try {
      await auth.currentUser.reload();
      const verified = auth.currentUser.emailVerified;
      if (verified) {
        await auth.currentUser.getIdToken(true);
        await syncProfile(auth.currentUser);
      }
      return verified;
    } catch (error: any) {
      console.warn('[AuthContext] checkVerificationStatus warning:', error.message);
      return false;
    }
  };

  const updateProfile = async (name: string, avatar: string | null) => {
    try {
      if (auth.currentUser) {
        await updateFirebaseProfile(auth.currentUser, {
          displayName: name.trim(),
          photoURL: avatar || undefined
        });
      }

      const updated = await api.updateProfile({ name: name.trim(), avatar });
      if (updated) {
        setUser((prev) => prev ? { ...prev, name: name.trim(), avatar } : prev);
      }
    } catch (error: any) {
      console.error('[AuthContext] Update profile failed:', error);
      throw error;
    }
  };

  const refreshProfile = async () => {
    if (auth.currentUser) {
      await syncProfile(auth.currentUser);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        loading,
        isDemo: false,
        login,
        register,
        logout,
        resetPassword,
        resendVerificationEmail,
        checkVerificationStatus,
        updateProfile,
        refreshProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthProvider;
