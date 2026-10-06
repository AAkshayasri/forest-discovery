import cron from 'node-cron';
import { firebaseAuth, firestore } from './firebaseAdmin.js';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Sweeps Firebase Authentication and Cloud Firestore for unverified accounts
 * older than 7 days and deletes them to prevent dead/orphaned accounts.
 */
export async function cleanupUnverifiedAccounts() {
  console.log('🧹 [UserCleanupCron] Running scheduled sweep for unverified accounts (>7 days old)...');
  let nextPageToken;
  let deletedCount = 0;
  const cutoffTime = Date.now() - SEVEN_DAYS_MS;

  try {
    do {
      const listUsersResult = await firebaseAuth.listUsers(1000, nextPageToken);
      
      for (const userRecord of listUsersResult.users) {
        // Only target accounts where email is unverified
        if (!userRecord.emailVerified) {
          const creationTime = new Date(userRecord.metadata.creationTime).getTime();
          
          if (creationTime < cutoffTime) {
            console.log(`[UserCleanupCron] Deleting expired unverified user: ${userRecord.email} (${userRecord.uid})`);
            
            // 1. Delete from Firebase Authentication
            await firebaseAuth.deleteUser(userRecord.uid).catch((err) => {
              console.warn(`[UserCleanupCron] Auth deletion warning for ${userRecord.uid}:`, err.message);
            });

            // 2. Delete from Cloud Firestore users collection
            await firestore.collection('users').doc(userRecord.uid).delete().catch((err) => {
              console.warn(`[UserCleanupCron] Firestore doc deletion warning for ${userRecord.uid}:`, err.message);
            });

            deletedCount++;
          }
        }
      }

      nextPageToken = listUsersResult.pageToken;
    } while (nextPageToken);

    console.log(`✅ [UserCleanupCron] Sweep complete. Removed ${deletedCount} expired unverified account(s).`);
  } catch (error) {
    console.error('❌ [UserCleanupCron] Sweep encountered an error:', error.message);
  }
}

/**
 * Initializes daily midnight cron job for unverified user maintenance.
 */
export function initUserCleanupJob() {
  // Run every day at 03:00 AM server time
  cron.schedule('0 3 * * *', () => {
    cleanupUnverifiedAccounts();
  });
  console.log('🕒 [UserCleanupCron] Daily unverified account cleanup job scheduled (03:00 AM).');
}
