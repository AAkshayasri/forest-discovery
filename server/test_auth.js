import './loadEnv.js';
import { authDbService } from './services/authDbService.js';
import { authService } from './services/authService.js';
import { verifyFirebaseToken, requireVerifiedEmail, requireAdmin } from './middleware/authMiddleware.js';
import { validateEmailComprehensive } from './services/emailValidator.js';

async function runAuthTests() {
  console.log("================================================================================");
  console.log("            WATLAS FIREBASE AUTHENTICATION & SECURITY TEST SUITE                ");
  console.log("================================================================================");

  // 1. Database Health Check
  console.log("\n[TEST 1] Testing Operational Auth Database Health:");
  const isHealthy = await authDbService.checkDatabaseHealth();
  if (!isHealthy) throw new Error("Auth SQLite database is not reachable!");
  console.log("✓ SQLite Auth Database is connected and healthy.");

  // 2. User Profile Storage & Sync (Zero password storage)
  console.log("\n[TEST 2] Testing User Profile Sync by Firebase UID:");
  const testUidA = `test_firebase_uid_${Date.now()}_A`;
  const testUidB = `test_firebase_uid_${Date.now()}_B`;
  
  const userA = await authDbService.syncUser({
    uid: testUidA,
    name: "Dr. Jane Goodall",
    email: "jane.goodall@wildatlas.org",
    role: "user"
  });
  if (!userA || userA.uid !== testUidA || userA.email !== "jane.goodall@wildatlas.org") {
    throw new Error("Failed to sync user A profile!");
  }
  console.log(`✓ Successfully synced User A: ${userA.name} (UID: ${userA.uid})`);

  const userB = await authDbService.syncUser({
    uid: testUidB,
    name: "Charles Darwin",
    email: "charles.darwin@wildatlas.org",
    role: "user"
  });
  if (!userB || userB.uid !== testUidB) {
    throw new Error("Failed to sync user B profile!");
  }
  console.log(`✓ Successfully synced User B: ${userB.name} (UID: ${userB.uid})`);

  // 3. User Data Isolation Test (Sightings & AI Chats)
  console.log("\n[TEST 3] Testing Strict User Data Isolation (User A vs User B):");
  // User A adds a sighting
  const sightingA = await authDbService.addSighting({
    userId: testUidA,
    commonName: "Bengal Tiger",
    scientificName: "Panthera tigris",
    latitude: 21.12,
    longitude: 70.80,
    imageBase64: "data:image/jpeg;base64,/9j/test...",
    notes: "Observed near water reservoir."
  });
  console.log(`  - User A created sighting ID: ${sightingA.id} for "${sightingA.commonName}"`);

  // User A saves an AI Chat
  const chatA = await authService.saveChat(testUidA, "What is the habitat of the Bengal Tiger?", "Dense forests and grasslands.");
  console.log(`  - User A logged AI chat ID: ${chatA.id}`);

  // User B queries their sightings and chats
  const userBSightings = await authDbService.getUserSightings(testUidB);
  const userBChats = await authService.getUserChats(testUidB);

  if (userBSightings.length !== 0) {
    throw new Error(`SECURITY VIOLATION: User B accessed User A's sightings! Found: ${userBSightings.length}`);
  }
  if (userBChats.length !== 0) {
    throw new Error(`SECURITY VIOLATION: User B accessed User A's AI chats! Found: ${userBChats.length}`);
  }
  console.log("✓ User B cannot see any of User A's sightings (Returned 0 items).");
  console.log("✓ User B cannot see any of User A's AI chats (Returned 0 items).");

  // User A queries their own sightings and chats
  const userASightings = await authDbService.getUserSightings(testUidA);
  const userAChats = await authService.getUserChats(testUidA);
  if (userASightings.length !== 1 || userASightings[0].commonName !== "Bengal Tiger") {
    throw new Error("User A failed to retrieve their own sighting.");
  }
  if (userAChats.length !== 1) {
    throw new Error("User A failed to retrieve their own AI chat.");
  }
  console.log("✓ User A accurately retrieved their own sighting and chat history.");

  // 4. Testing Middleware Guards (Missing / Invalid Token)
  console.log("\n[TEST 4] Testing Backend Firebase Token Verification Middleware:");
  
  // Test missing token
  let missingTokenStatus = null;
  let missingTokenBody = null;
  const mockReqMissing = { headers: {} };
  const mockResMissing = {
    status: (code) => {
      missingTokenStatus = code;
      return {
        json: (data) => { missingTokenBody = data; }
      };
    }
  };
  await verifyFirebaseToken(mockReqMissing, mockResMissing, () => {});
  if (missingTokenStatus !== 401 || missingTokenBody?.code !== 'AUTH_TOKEN_MISSING') {
    throw new Error(`Missing token did not return 401 AUTH_TOKEN_MISSING. Got: ${missingTokenStatus}`);
  }
  console.log("✓ Middleware rejected missing Authorization header with 401 AUTH_TOKEN_MISSING.");

  // Test invalid token format
  let invalidTokenStatus = null;
  let invalidTokenBody = null;
  const mockReqInvalid = { headers: { authorization: 'Bearer invalid_garbage_token_12345' } };
  const mockResInvalid = {
    status: (code) => {
      invalidTokenStatus = code;
      return {
        json: (data) => { invalidTokenBody = data; }
      };
    }
  };
  await verifyFirebaseToken(mockReqInvalid, mockResInvalid, () => {});
  if (invalidTokenStatus !== 401) {
    throw new Error(`Invalid token did not return 401. Got: ${invalidTokenStatus}`);
  }
  console.log("✓ Middleware rejected fake/invalid token with 401 AUTH_TOKEN_INVALID.");

  // 5. Testing Email Verification Guard (requireVerifiedEmail)
  console.log("\n[TEST 5] Testing Email Verification Guard Middleware:");
  let unverifiedStatus = null;
  let unverifiedBody = null;
  const mockReqUnverified = { user: { uid: testUidA, email_verified: false } };
  const mockResUnverified = {
    status: (code) => {
      unverifiedStatus = code;
      return {
        json: (data) => { unverifiedBody = data; }
      };
    }
  };
  requireVerifiedEmail(mockReqUnverified, mockResUnverified, () => {});
  if (unverifiedStatus !== 403 || unverifiedBody?.code !== 'EMAIL_NOT_VERIFIED') {
    throw new Error(`Unverified email was not blocked with 403 EMAIL_NOT_VERIFIED. Got: ${unverifiedStatus}`);
  }
  console.log("✓ Middleware blocked unverified user with 403 EMAIL_NOT_VERIFIED.");

  // 6. Testing Role Guard (requireAdmin)
  console.log("\n[TEST 6] Testing Admin Authorization Guard Middleware:");
  let nonAdminStatus = null;
  const mockReqNonAdmin = { user: { uid: testUidA, role: 'user' } };
  const mockResNonAdmin = {
    status: (code) => {
      nonAdminStatus = code;
      return {
        json: () => {}
      };
    }
  };
  requireAdmin(mockReqNonAdmin, mockResNonAdmin, () => {});
  if (nonAdminStatus !== 403) {
    throw new Error(`Non-admin was not rejected from admin route. Got: ${nonAdminStatus}`);
  }
  console.log("✓ Middleware rejected standard user from admin routes with 403 FORBIDDEN_ADMIN_ONLY.");

  // 7. Testing Email Domain & Format Validator
  console.log("\n[TEST 7] Testing Comprehensive Email Domain Validator:");
  const validCheck = await validateEmailComprehensive("jane@gmail.com");
  if (!validCheck.isValid) {
    throw new Error("Legitimate gmail.com was falsely flagged as invalid!");
  }
  console.log("✓ Standard domain validation passed for 'jane@gmail.com'.");

  const disposableCheck = await validateEmailComprehensive("temporary@mailinator.com");
  if (disposableCheck.isValid) {
    throw new Error("Disposable domain mailinator.com was not blocked!");
  }
  console.log("✓ Disposable temporary domain correctly blocked for 'temporary@mailinator.com'.");

  // Clean up test data
  console.log("\n[CLEANUP] Cleaning up test records:");
  await authDbService.deleteUser(testUidA);
  await authDbService.deleteUser(testUidB);
  console.log("✓ Test users, sightings, and chats cleaned up successfully.");

  console.log("\n================================================================================");
  console.log("       ALL 7 FIREBASE AUTH & SECURITY VALIDATION TESTS PASSED!                 ");
  console.log("================================================================================");
  process.exit(0);
}

runAuthTests().catch((err) => {
  console.error("❌ Test Failed:", err);
  process.exit(1);
});
