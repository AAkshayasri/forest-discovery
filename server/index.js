import './loadEnv.js';
import express from 'express';
import cors from 'cors';
import { dbService } from './services/dbService.js';
import { geminiService } from './services/geminiService.js';
import { authService } from './services/authService.js';
import { zooService } from './services/zooService.js';
import { routingService } from './services/routingService.js';
import { authDbService } from './services/authDbService.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Logger middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Admin role check middleware
const requireAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    return next();
  }
  return res.status(403).json({ error: "Forbidden. Admin role required." });
};

// ----------------------------------------------------
// Public Routes
// ----------------------------------------------------

// Server status
app.get('/api/status', (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    modes: {
      database: dbService.getMode(),
      authentication: authService.getMode(),
      ai: geminiService.getMode()
    }
  });
});

// Search forests
app.get('/api/forests/search', async (req, res) => {
  try {
    const query = req.query.q || '';
    const results = await dbService.searchForests(query);
    res.json(results);
  } catch (error) {
    console.error("Forest search failed:", error);
    res.status(503).json({
      success: false,
      message: "Service is temporarily unavailable."
    });
  }
});

// Get all forests
app.get('/api/forests', async (req, res) => {
  try {
    const forests = await dbService.getForests();
    res.json(forests);
  } catch (error) {
    console.error("Get forests failed:", error);
    res.status(503).json({
      success: false,
      message: "Service is temporarily unavailable."
    });
  }
});

// Get forest details by ID
app.get('/api/forests/:id', async (req, res) => {
  try {
    const forest = await dbService.getForestById(req.params.id);
    if (!forest) return res.status(404).json({ error: "Forest not found." });
    res.json(forest);
  } catch (error) {
    console.error("Get forest details failed:", error);
    res.status(503).json({
      success: false,
      message: "Service is temporarily unavailable."
    });
  }
});

// Get wildlife inside a forest
app.get('/api/forests/:id/wildlife', async (req, res) => {
  try {
    const wildlife = await dbService.getWildlifeByForestId(req.params.id);
    res.json(wildlife);
  } catch (error) {
    console.error("Get forest wildlife failed:", error);
    res.status(503).json({
      success: false,
      message: "Service is temporarily unavailable."
    });
  }
});

// Get all global zoos/conservation centers
app.get('/api/zoos', async (req, res) => {
  try {
    const zoos = await zooService.getAllZoos();
    res.json(zoos);
  } catch (error) {
    console.error("Get zoos failed:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get public verified sightings
app.get('/api/sightings', async (req, res) => {
  try {
    const sightings = await authDbService.getSightings();
    res.json(sightings);
  } catch (error) {
    console.error("Get sightings failed:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get specific wildlife details
app.get('/api/wildlife/:id', async (req, res) => {
  try {
    const animal = await dbService.getWildlifeById(req.params.id);
    if (!animal) return res.status(404).json({ error: "Wildlife not found." });

    // Dynamically fetch and merge detailed profile information from Gemini
    try {
      const detailedProfile = await geminiService.generateDetailedSpeciesProfile(animal.name);
      if (detailedProfile) {
        const merged = {
          ...animal,
          kingdom: detailedProfile.kingdom || animal.kingdom,
          phylum: detailedProfile.phylum || animal.phylum,
          class: detailedProfile.class || animal.class,
          order: detailedProfile.order || animal.order,
          family: detailedProfile.family || animal.family,
          genus: detailedProfile.genus || animal.genus,
          species: detailedProfile.species || animal.species,
          description: detailedProfile.description || animal.description,
          countries: detailedProfile.countries || animal.countries,
          averageHeight: detailedProfile.averageHeight || animal.averageHeight,
          averageWeight: detailedProfile.averageWeight || animal.averageWeight,
          speed: detailedProfile.speed || animal.speed,
          reproduction: detailedProfile.reproduction || animal.reproduction,
          populationTrend: detailedProfile.populationTrend || animal.populationTrend,
          majorThreats: detailedProfile.majorThreats || animal.majorThreats,
          conservationEfforts: detailedProfile.conservationEfforts || animal.conservationEfforts,
          interestingFacts: (detailedProfile.funFacts && detailedProfile.funFacts.length > 0)
            ? detailedProfile.funFacts
            : animal.interestingFacts
        };
        return res.json(merged);
      }
    } catch (geminiError) {
      console.error("Failed to augment wildlife details with Gemini profile:", geminiError);
    }

    res.json(animal);
  } catch (error) {
    console.error("Get wildlife by ID failed:", error);
    res.status(503).json({
      success: false,
      message: "Service is temporarily unavailable."
    });
  }
});

// ----------------------------------------------------
// Authentication Routes (Production-Grade JWT)
// ----------------------------------------------------
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    let assignedRole = role || 'user';
    if (email && email.toLowerCase().trim() === 'admin@wildatlas.com') {
      assignedRole = 'admin';
    }
    const user = await authService.register(name, email, password, assignedRole);
    res.status(201).json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/auth/logout', authService.verifyToken, async (req, res) => {
  try {
    await authService.logout(req.user.id);
    res.json({ success: true, message: "Logged out successfully." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const result = await authService.refresh(refreshToken);
    res.json(result);
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

app.get('/api/auth/me', authService.verifyToken, async (req, res) => {
  try {
    const user = await authService.getUserMetadata(req.user.id);
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/auth/profile', authService.verifyToken, async (req, res) => {
  try {
    const { name, avatar } = req.body;
    const { authDbService } = await import('./services/authDbService.js');
    const updatedUser = await authDbService.updateUserProfile(req.user.id, { name, avatar });
    res.json({
      uid: updatedUser.id.toString(),
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      avatar: updatedUser.avatar
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.patch('/api/auth/change-password', authService.verifyToken, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!newPassword || newPassword.trim() === '') {
      return res.status(400).json({ error: "New password cannot be empty." });
    }
    if (newPassword.length > 72) {
      return res.status(400).json({ error: "Password exceeds storage limits (72 characters maximum)." });
    }
    const { authDbService } = await import('./services/authDbService.js');
    const user = await authDbService.getUserById(req.user.id);
    const bcrypt = await import('bcryptjs');
    const isMatch = await bcrypt.default.compare(oldPassword, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid old password." });
    }
    const salt = await bcrypt.default.genSalt(12);
    const passwordHash = await bcrypt.default.hash(newPassword, salt);
    await authDbService.updateUserPassword(req.user.id, passwordHash);
    res.json({ success: true, message: "Password updated successfully." });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete('/api/auth/account', authService.verifyToken, async (req, res) => {
  try {
    const { authDbService } = await import('./services/authDbService.js');
    await authDbService.deleteUser(req.user.id);
    res.json({ success: true, message: "Account deleted successfully." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ----------------------------------------------------
// Protected User Routes (Token Required)
// ----------------------------------------------------
app.use('/api/user', authService.verifyToken);

// Synchronize user registration info
app.post('/api/user/register', async (req, res) => {
  try {
    const { name, email, role } = req.body;
    let assignedRole = role || "user";
    if (email === 'admin@wildatlas.com') {
      assignedRole = "admin";
    }
    const user = await authService.registerUserMetadata(req.user.uid, email, name, assignedRole);
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get own profile metadata
app.get('/api/user/me', async (req, res) => {
  try {
    const profile = await authService.getUserMetadata(req.user.uid);
    res.json(profile);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Identify species from base64 image (Gemini Vision)
app.post('/api/user/identify', async (req, res) => {
  try {
    const { image, mimeType } = req.body;
    if (!image) return res.status(400).json({ error: "Image data is required." });
    
    const result = await geminiService.identifySpecies(image, mimeType || 'image/jpeg');
    res.json(result);
  } catch (error) {
    console.error("Identify species failed:", error);
    res.status(503).json({
      success: false,
      message: "AI vision service is temporarily unavailable."
    });
  }
});

// Generate AI chat response with history and educational style, and save to DB
app.post('/api/user/chat', async (req, res) => {
  try {
    const { prompt, style, history } = req.body;
    if (!prompt) return res.status(400).json({ error: "Prompt is required." });

    const result = await geminiService.generateChatResponse(prompt, history || [], style || 'beginner');
    const chatRecord = await authService.saveChat(req.user.uid, prompt, result.answer);
    
    res.json(chatRecord);
  } catch (error) {
    console.error("Chat assistant failed:", error);
    res.status(503).json({
      success: false,
      message: "AI guide service is temporarily unavailable."
    });
  }
});

// Stream AI chat response (SSE Typewriter stream)
app.post('/api/user/chat/stream', async (req, res) => {
  try {
    const { prompt, style, history } = req.body;
    if (!prompt) return res.status(400).json({ error: "Prompt is required." });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    let fullAnswer = '';
    const generator = geminiService.generateChatStream(prompt, history || [], style || 'beginner');

    for await (const chunk of generator) {
      fullAnswer += chunk;
      res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
    }

    const chatRecord = await authService.saveChat(req.user.uid, prompt, fullAnswer);
    res.write(`data: ${JSON.stringify({ done: true, chat: chatRecord })}\n\n`);
    res.end();
  } catch (error) {
    console.error("Chat streaming failed:", error);
    if (!res.headersSent) {
      res.status(503).json({ success: false, message: "AI guide streaming is temporarily unavailable." });
    } else {
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
    }
  }
});

// AI Forest Overview
app.post('/api/user/ai/forest-overview', async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: "Forest name is required." });
    const overview = await geminiService.generateForestOverview(name, description || "");
    res.json(overview);
  } catch (error) {
    console.error("Forest overview generation failed:", error);
    res.status(503).json({
      success: false,
      message: "AI service is temporarily unavailable."
    });
  }
});

// AI Species Summary
app.post('/api/user/ai/species-summary', async (req, res) => {
  try {
    const { speciesName } = req.body;
    if (!speciesName) return res.status(400).json({ error: "Species name is required." });
    const summary = await geminiService.generateSpeciesSummary(speciesName);
    res.json(summary);
  } catch (error) {
    console.error("Species summary generation failed:", error);
    res.status(503).json({
      success: false,
      message: "AI service is temporarily unavailable."
    });
  }
});

// AI Search Intent
app.post('/api/user/ai/search-intent', async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) return res.status(400).json({ error: "Query is required." });
    const intent = await geminiService.understandSearchIntent(query);
    res.json(intent);
  } catch (error) {
    console.error("Search intent understanding failed:", error);
    res.status(503).json({
      success: false,
      message: "AI service is temporarily unavailable."
    });
  }
});

// Get chat history
app.get('/api/user/chat/history', async (req, res) => {
  try {
    const history = await authService.getUserChats(req.user.uid);
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update chat title / rename chat log
app.patch('/api/user/chat/:id', async (req, res) => {
  try {
    const { title } = req.body;
    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: "Chat title cannot be empty." });
    }
    const updated = await authService.updateChatTitle(req.params.id, req.user.uid, title.trim());
    if (!updated) {
      return res.status(404).json({ error: "Chat log not found or unauthorized." });
    }
    res.json(updated);
  } catch (error) {
    console.error("Update chat title failed:", error);
    res.status(500).json({ error: error.message });
  }
});

// Delete a single chat log
app.delete('/api/user/chat/:id', async (req, res) => {
  try {
    const deleted = await authService.deleteChat(req.params.id, req.user.uid);
    if (!deleted) {
      return res.status(404).json({ error: "Chat log not found or unauthorized." });
    }
    res.json({ success: true, message: "Chat log deleted successfully." });
  } catch (error) {
    console.error("Delete chat log failed:", error);
    res.status(500).json({ error: error.message });
  }
});

// Calculate distance and route metrics between user location and habitat/zoo
app.post('/api/user/route', async (req, res) => {
  try {
    const { startLat, startLng, destLat, destLng } = req.body;
    if (startLat === undefined || startLng === undefined || destLat === undefined || destLng === undefined) {
      return res.status(400).json({ error: "Start and destination coordinates are required." });
    }
    const route = routingService.calculateRoute(
      Number(startLat),
      Number(startLng),
      Number(destLat),
      Number(destLng)
    );
    res.json(route);
  } catch (error) {
    console.error("Route calculation failed:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get user specific sightings
app.get('/api/user/sightings', async (req, res) => {
  try {
    const sightings = await authDbService.getUserSightings(req.user.id);
    res.json(sightings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Submit a new sighting (citizen science)
app.post('/api/user/sightings', async (req, res) => {
  try {
    const { commonName, scientificName, latitude, longitude, imageBase64, notes } = req.body;
    if (!commonName || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ error: "Common name and location coordinates are required." });
    }

    const sighting = await authDbService.addSighting({
      userId: req.user.id,
      commonName,
      scientificName,
      latitude,
      longitude,
      imageBase64,
      notes
    });

    res.status(201).json({ sighting });
  } catch (error) {
    console.error("Sighting submission failed:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get user specific dashboard statistics and telemetry
app.get('/api/user/dashboard', async (req, res) => {
  try {
    const userId = req.user.id;
    const [sightingsStats, aiQuestionsCount, userSightings, userChats] = await Promise.all([
      authDbService.getUserSightingsStats(userId),
      authService.getUserChatCount(userId),
      authDbService.getUserSightings(userId),
      authService.getUserRecentChats(userId, 5)
    ]);

    res.json({
      aiQuestionsCount,
      sightingsCount: sightingsStats.total,
      verifiedSightingsCount: sightingsStats.verified,
      pendingSightingsCount: sightingsStats.pending,
      flaggedSightingsCount: sightingsStats.flagged,
      recentSightings: userSightings.slice(0, 5),
      recentChats: userChats
    });
  } catch (error) {
    console.error("User dashboard fetch failed:", error);
    res.status(500).json({ error: error.message });
  }
});

// ----------------------------------------------------
// Protected Admin Routes (Admin Role Required)
// ----------------------------------------------------

app.use('/api/admin', authService.verifyToken, requireAdmin);

// Add new forest
app.post('/api/admin/forests', async (req, res) => {
  try {
    const forest = await dbService.addForest(req.body);
    res.status(201).json(forest);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update forest
app.put('/api/admin/forests/:id', async (req, res) => {
  try {
    const updated = await dbService.updateForest(req.params.id, req.body);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete forest
app.delete('/api/admin/forests/:id', async (req, res) => {
  try {
    await dbService.deleteForest(req.params.id);
    res.json({ success: true, message: "Forest deleted successfully." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add new wildlife record
app.post('/api/admin/wildlife', async (req, res) => {
  try {
    const animal = await dbService.addWildlife(req.body);
    res.status(201).json(animal);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update wildlife record
app.put('/api/admin/wildlife/:id', async (req, res) => {
  try {
    const updated = await dbService.updateWildlife(req.params.id, req.body);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete wildlife record
app.delete('/api/admin/wildlife/:id', async (req, res) => {
  try {
    await dbService.deleteWildlife(req.params.id);
    res.json({ success: true, message: "Wildlife record deleted successfully." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all users
app.get('/api/admin/users', async (req, res) => {
  try {
    const users = await authService.getAllUsers();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all chat history
app.get('/api/admin/chats', async (req, res) => {
  try {
    const chats = await authService.getAllChats();
    res.json(chats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin Analytics & Monitoring Dashboard (Clean, real database telemetry)
app.get('/api/admin/dashboard', async (req, res) => {
  try {
    const [forests, users, chats, zoos, sightings, sightingsBreakdown, recentUsers, recentActivity, isDbAlive] = await Promise.all([
      dbService.getForests(),
      authService.getAllUsers(),
      authService.getAllChats(),
      zooService.getAllZoos(),
      authDbService.getSightings(),
      authDbService.getSightingsBreakdown(),
      authDbService.getRecentUsers(5),
      authService.getRecentSystemActivity(10),
      authDbService.checkDatabaseHealth()
    ]);
    
    const wildlifeCount = await dbService.getTotalWildlifeCount();

    const geminiKey = process.env.GEMINI_API_KEY;
    const isGeminiAvailable = !!(geminiKey && !geminiKey.includes('your_') && geminiKey.trim() !== '');

    res.json({
      counts: {
        totalUsers: users.length,
        totalForests: forests.length,
        totalWildlife: wildlifeCount,
        totalZoos: zoos.length,
        totalChats: chats.length,
        totalSightings: sightings.length
      },
      sightingsBreakdown: {
        pending: sightingsBreakdown.pending,
        verified: sightingsBreakdown.verified,
        flagged: sightingsBreakdown.flagged,
        total: sightingsBreakdown.total
      },
      recentUsers,
      recentActivity,
      systemHealth: {
        database: isDbAlive ? "Connected" : "Error",
        geminiAI: isGeminiAvailable ? "Available" : "Unavailable",
        mapService: "Available"
      }
    });
  } catch (error) {
    console.error("Admin dashboard fetch failed:", error);
    res.status(500).json({ error: error.message });
  }
});

// Admin Analytics (Compatibility endpoint)
app.get('/api/admin/analytics', async (req, res) => {
  try {
    const forests = await dbService.getForests();
    const users = await authService.getAllUsers();
    const chats = await authService.getAllChats();
    const zoos = await zooService.getAllZoos();
    const sightings = await authDbService.getSightings();
    const wildlifeCount = await dbService.getTotalWildlifeCount();

    res.json({
      forestsCount: forests.length,
      wildlifeCount: wildlifeCount,
      usersCount: users.length,
      zoosCount: zoos.length,
      sightingsCount: sightings.length,
      chatsCount: chats.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: Add new global zoo
app.post('/api/admin/zoos', async (req, res) => {
  try {
    const zoo = await zooService.addZoo(req.body);
    res.status(201).json(zoo);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: Delete a zoo
app.delete('/api/admin/zoos/:id', async (req, res) => {
  try {
    await zooService.deleteZoo(req.params.id);
    res.json({ success: true, message: "Zoo deleted successfully." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: Get all sightings for moderation
app.get('/api/admin/sightings', async (req, res) => {
  try {
    const sightings = await authDbService.getSightings();
    res.json(sightings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: Verify/Moderate a sighting
app.patch('/api/admin/sightings/:id/verify', async (req, res) => {
  try {
    const { status } = req.body; // 'verified' or 'flagged'
    if (status !== 'verified' && status !== 'flagged') {
      return res.status(400).json({ error: "Invalid status value. Must be 'verified' or 'flagged'." });
    }

    const updatedSighting = await authDbService.verifySighting(req.params.id, status);
    res.json(updatedSighting);
  } catch (error) {
    console.error("Failed to moderate sighting:", error);
    res.status(500).json({ error: error.message });
  }
});

// Admin: Batch moderate sightings
app.post('/api/admin/sightings/batch-verify', async (req, res) => {
  try {
    const { ids, status } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "Array of sighting IDs is required." });
    }
    if (status !== 'verified' && status !== 'flagged') {
      return res.status(400).json({ error: "Invalid status value. Must be 'verified' or 'flagged'." });
    }

    const updatedSightings = await authDbService.batchVerifySightings(ids, status);
    res.json({ success: true, count: updatedSightings.length, sightings: updatedSightings });
  } catch (error) {
    console.error("Failed to batch moderate sightings:", error);
    res.status(500).json({ error: error.message });
  }
});

// ----------------------------------------------------
// Error & Default Handler
// ----------------------------------------------------
app.use((req, res) => {
  res.status(404).json({ error: "API Route not found." });
});

app.use((err, req, res, next) => {
  console.error("Unhandled error:", err.message);
  res.status(err.status || 500).json({ error: err.message || "An unexpected error occurred." });
});

app.listen(PORT, () => {
  console.log("✓ Server Running on port " + PORT);
  console.log("✓ AI Provider: Gemini");
});
