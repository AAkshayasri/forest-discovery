import admin from 'firebase-admin';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let isInitialized = false;

/**
 * Initializes the Firebase Admin SDK.
 * Supports:
 * 1. serviceAccountKey.json in the server root
 * 2. Environment variables (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY)
 * 3. Default application credentials (for Google Cloud / Firebase Hosting)
 */
function initFirebaseAdmin() {
  if (isInitialized || admin.apps.length > 0) {
    isInitialized = true;
    return admin;
  }

  const serviceAccountPath = path.resolve(__dirname, '../serviceAccountKey.json');

  if (fs.existsSync(serviceAccountPath)) {
    try {
      const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      console.log('✅ Firebase Admin initialized via serviceAccountKey.json');
      isInitialized = true;
      return admin;
    } catch (err) {
      console.error('❌ Failed to parse serviceAccountKey.json:', err.message);
    }
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (privateKey) {
    // Handle escaped newlines in environment variable strings
    privateKey = privateKey.replace(/\\n/g, '\n');
  }

  if (projectId && clientEmail && privateKey && !projectId.includes('your_')) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey
        })
      });
      console.log(`✅ Firebase Admin initialized for project: ${projectId}`);
      isInitialized = true;
      return admin;
    } catch (err) {
      console.error('❌ Failed to initialize Firebase Admin with env vars:', err.message);
    }
  }

  // Fallback for development without service account (logs warning)
  try {
    admin.initializeApp({
      projectId: projectId || 'wildatlas-dev'
    });
    console.warn('⚠️ Firebase Admin initialized in default/project mode (without private key). ID token verification will require full service credentials in production.');
    isInitialized = true;
    return admin;
  } catch (err) {
    console.error('❌ Firebase Admin default initialization error:', err.message);
  }

  return admin;
}

initFirebaseAdmin();

export const firebaseAdmin = admin;
export const firebaseAuth = admin.auth();
export const firestore = admin.firestore();

export default admin;
