import { firebaseAuth, firestore } from '../services/firebaseAdmin.js';

/**
 * Middleware to verify Firebase ID tokens passed in the Authorization header.
 * Attaches authenticated user identity (uid, email, email_verified, role) to req.user.
 */
export async function verifyFirebaseToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Unauthorized. No Bearer ID token provided.',
      code: 'AUTH_TOKEN_MISSING'
    });
  }

  const idToken = authHeader.split('Bearer ')[1].trim();
  if (!idToken) {
    return res.status(401).json({
      error: 'Unauthorized. Token format invalid.',
      code: 'AUTH_TOKEN_INVALID'
    });
  }

  try {
    const decodedToken = await firebaseAuth.verifyIdToken(idToken);
    const uid = decodedToken.uid;
    const email = (decodedToken.email || '').toLowerCase().trim();
    const isEmailVerified = Boolean(decodedToken.email_verified);

    // Retrieve or default Firestore user profile
    let userRole = 'user';
    let userName = decodedToken.name || '';
    let userAvatar = decodedToken.picture || null;

    // Standard admin override for root admin email
    if (email === 'admin@wildatlas.com') {
      userRole = 'admin';
    }

    try {
      const userDocRef = firestore.collection('users').doc(uid);
      const userDoc = await userDocRef.get();

      if (userDoc.exists) {
        const data = userDoc.data() || {};
        userRole = data.role === 'admin' ? 'admin' : userRole;
        userName = data.name || userName;
        userAvatar = data.avatar || userAvatar;

        // Server-side sync: Update emailVerified in Firestore if token proves it
        if (isEmailVerified && !data.emailVerified) {
          await userDocRef.set({
            emailVerified: true,
            updatedAt: new Date()
          }, { merge: true });
        }
      }
    } catch (dbErr) {
      // Non-fatal if Firestore is initializing or offline in dev
      console.warn('[AuthMiddleware] Firestore profile lookup warning:', dbErr.message);
    }

    req.user = {
      uid,
      id: uid, // backwards-compatible alias for existing service calls
      email,
      email_verified: isEmailVerified,
      emailVerified: isEmailVerified,
      name: userName,
      role: userRole,
      avatar: userAvatar
    };

    return next();
  } catch (error) {
    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({
        error: 'Session expired. Please refresh credentials.',
        code: 'TOKEN_EXPIRED'
      });
    }
    if (error.code === 'auth/id-token-revoked') {
      return res.status(401).json({
        error: 'User session has been revoked. Please sign in again.',
        code: 'TOKEN_REVOKED'
      });
    }
    console.error('❌ Firebase ID token verification failed:', error.message);
    return res.status(401).json({
      error: 'Unauthorized. Invalid authentication token.',
      code: 'AUTH_TOKEN_INVALID'
    });
  }
}

/**
 * Middleware that strictly enforces verified email ownership on private routes.
 * Blocks unverified or fake accounts with a 403 EMAIL_NOT_VERIFIED code.
 */
export function requireVerifiedEmail(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      error: 'Authentication required.',
      code: 'AUTH_REQUIRED'
    });
  }

  if (!req.user.email_verified) {
    return res.status(403).json({
      error: 'Email verification required. Please check your inbox and verify your email to access this resource.',
      code: 'EMAIL_NOT_VERIFIED'
    });
  }

  return next();
}

/**
 * Middleware that strictly restricts route access to administrators.
 */
export function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      error: 'Forbidden. Administrative role required.',
      code: 'FORBIDDEN_ADMIN_ONLY'
    });
  }
  return next();
}
