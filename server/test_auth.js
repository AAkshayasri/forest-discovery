// Native fetch is used

const BASE_URL = 'http://localhost:5000/api';

async function runTests() {
  console.log("Starting automatic auth validation...");
  
  const testEmail = `test_explorer_${Date.now()}@example.com`;
  // Test password with spaces, punctuation, unicode, emojis
  const testPassword = `Pass! Word @ 2026 🎉 🦚 🌲`;
  const testName = "Jane Explorer";

  // Check 1: Register works
  console.log("✓ Checking Register...");
  const registerRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: testName, email: testEmail, password: testPassword })
  });

  if (registerRes.status !== 201) {
    const errorData = await registerRes.json().catch(() => ({}));
    throw new Error(`Register failed with status ${registerRes.status}: ${errorData.error}`);
  }
  const registerData = await registerRes.json();
  if (!registerData.user || registerData.user.email !== testEmail) {
    throw new Error("Register returned invalid user object.");
  }
  console.log("✓ Register works successfully!");

  // Check 2: Login works
  console.log("✓ Checking Login...");
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, password: testPassword })
  });

  if (loginRes.status !== 200) {
    const errorData = await loginRes.json().catch(() => ({}));
    throw new Error(`Login failed with status ${loginRes.status}: ${errorData.error}`);
  }
  const loginData = await loginRes.json();
  if (!loginData.accessToken || !loginData.refreshToken) {
    throw new Error("Login did not return access and refresh tokens.");
  }
  console.log("✓ Login works successfully!");
  console.log("✓ JWT generation works!");

  // Check 3: Protected routes secured & API authorization works
  console.log("✓ Checking route protection...");
  const unauthMe = await fetch(`${BASE_URL}/auth/me`);
  if (unauthMe.status !== 401) {
    throw new Error("Accessing /auth/me without authorization did not return 401.");
  }
  console.log("✓ Guest access rejected successfully!");

  console.log("✓ Checking API authorization with Bearer token...");
  const authMe = await fetch(`${BASE_URL}/auth/me`, {
    headers: { 'Authorization': `Bearer ${loginData.accessToken}` }
  });
  if (authMe.status !== 200) {
    const errorData = await authMe.json().catch(() => ({}));
    throw new Error(`Accessing /auth/me with Bearer token failed: ${errorData.error}`);
  }
  const meData = await authMe.json();
  if (meData.email !== testEmail) {
    throw new Error("Me endpoint returned incorrect user profile.");
  }
  console.log("✓ API authorization works!");

  // Check 4: Refresh tokens work
  console.log("✓ Checking Refresh token flow...");
  const refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: loginData.refreshToken })
  });

  if (refreshRes.status !== 200) {
    const errorData = await refreshRes.json().catch(() => ({}));
    throw new Error(`Refresh failed: ${errorData.error}`);
  }
  const refreshData = await refreshRes.json();
  if (!refreshData.accessToken) {
    throw new Error("Refresh did not return a new access token.");
  }
  console.log("✓ Refresh tokens work!");

  // Check 5: Logout works
  console.log("✓ Checking Logout...");
  const logoutRes = await fetch(`${BASE_URL}/auth/logout`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${loginData.accessToken}`
    }
  });
  if (logoutRes.status !== 200) {
    const errorData = await logoutRes.json().catch(() => ({}));
    throw new Error(`Logout failed: ${errorData.error}`);
  }
  
  // Verify refresh token is invalidated
  const invalidRefreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: loginData.refreshToken })
  });
  if (invalidRefreshRes.status === 200) {
    throw new Error("Refresh token was not invalidated after logout.");
  }
  console.log("✓ Logout works & invalidates refresh tokens successfully!");

  console.log("\n=============================================");
  console.log("ALL AUTHENTICATION VALIDATION CHECKS PASSED!");
  console.log("=============================================");
}

runTests().catch(err => {
  console.error("❌ Validation Check Failed:", err.message);
  process.exit(1);
});
