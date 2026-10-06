import './loadEnv.js';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { dbService } from './services/dbService.js';
import { geminiService } from './services/geminiService.js';
import { authService } from './services/authService.js';
import { authDbService } from './services/authDbService.js';
import { gbifService } from './services/gbifService.js';
import { validateDatasetCoordinates } from './services/coordinateValidator.js';
import { firebaseAuth, firestore } from './services/firebaseAdmin.js';
import { verifyFirebaseToken, requireVerifiedEmail, requireAdmin } from './middleware/authMiddleware.js';
import { validateEmailComprehensive } from './services/emailValidator.js';
import { initUserCleanupJob } from './services/userCleanupCron.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize daily background maintenance cron job
initUserCleanupJob();

// 1. Security Headers (Helmet)
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// 2. CORS restricted to known client origins
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
  process.env.CLIENT_ORIGIN
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true);
    }
  },
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// 3. Rate limiting for sensitive & auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 120, // max 120 requests per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests from this IP, please try again later." }
});

// ----------------------------------------------------
// Public Routes
// ----------------------------------------------------

// Server status
// Server status & validation stats
app.get('/api/status', async (req, res) => {
  try {
    const stats = await dbService.getStats();
    res.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      modes: {
        database: dbService.getMode(),
        authentication: authService.getMode(),
        ai: geminiService.getMode(),
        runtimeSourceOfTruth: "SQLite (watlas.db)"
      },
      stats
    });
  } catch (err) {
    res.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      modes: {
        database: dbService.getMode(),
        authentication: authService.getMode(),
        ai: geminiService.getMode()
      }
    });
  }
});

// Search forests in SQLite
app.get('/api/forests/search', async (req, res) => {
  try {
    const query = req.query.q || '';
    const results = await dbService.searchForests(query);
    res.json(results);
  } catch (error) {
    console.error("Forest search failed:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get all forests from SQLite (supports ?continent=)
app.get('/api/forests', async (req, res) => {
  try {
    const { continent } = req.query;
    const forests = await dbService.getForests({ continent });
    res.json(forests);
  } catch (error) {
    console.error("Get forests failed:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get forest details by ID from SQLite
app.get('/api/forests/:id', async (req, res) => {
  try {
    const forest = await dbService.getForestById(req.params.id);
    if (!forest) return res.status(404).json({ error: "Forest not found." });
    res.json(forest);
  } catch (error) {
    console.error("Get forest details failed:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get species/wildlife inside a forest from SQLite (supports ?group=Bird, ?group=Mammal, etc.)
app.get('/api/forests/:id/species', async (req, res) => {
  try {
    const { group } = req.query;
    const species = await dbService.getWildlifeByForestId(req.params.id, group);
    res.json(species);
  } catch (error) {
    console.error("Get forest species failed:", error);
    res.status(500).json({ error: error.message });
  }
});

// Backwards-compatible alias for frontend
app.get('/api/forests/:id/wildlife', async (req, res) => {
  try {
    const { group } = req.query;
    const wildlife = await dbService.getWildlifeByForestId(req.params.id, group);
    res.json(wildlife);
  } catch (error) {
    console.error("Get forest wildlife failed:", error);
    res.status(500).json({ error: error.message });
  }
});

// ----------------------------------------------------
// OSRM REAL ROAD ROUTING (Pure Road Network - No Straight Lines)
// ----------------------------------------------------

function formatDistance(meters) {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

function formatDuration(seconds) {
  const mins = Math.round(seconds / 60);
  if (mins < 60) {
    return `${mins} min`;
  }
  const hrs = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  return remainingMins > 0 ? `${hrs} hr ${remainingMins} min` : `${hrs} hr`;
}

function generateStepInstruction(step) {
  const maneuver = step.maneuver || {};
  const type = maneuver.type;
  const modifier = maneuver.modifier;
  const name = step.name || 'road';

  if (type === 'depart') {
    return `Depart onto ${name}`;
  }
  if (type === 'arrive') {
    return `Arrive at your destination`;
  }
  if (type === 'turn') {
    if (modifier) {
      return `Turn ${modifier} onto ${name}`;
    }
    return `Turn onto ${name}`;
  }
  if (type === 'new name') {
    return `Continue onto ${name}`;
  }
  if (type === 'merge') {
    return `Merge ${modifier ? modifier + ' ' : ''}onto ${name}`;
  }
  if (type === 'on ramp') {
    return `Take ramp ${modifier ? modifier + ' ' : ''}onto ${name}`;
  }
  if (type === 'off ramp') {
    return `Take exit ${modifier ? modifier + ' ' : ''}onto ${name}`;
  }
  if (type === 'fork') {
    return `Keep ${modifier || 'straight'} at the fork onto ${name}`;
  }
  if (type === 'roundabout' || type === 'rotary') {
    const exit = maneuver.exit ? `take exit ${maneuver.exit}` : 'exit';
    return `At the roundabout, ${exit} onto ${name}`;
  }
  if (modifier) {
    return `Keep ${modifier} onto ${name}`;
  }
  return `Continue on ${name}`;
}

app.get('/api/routes', async (req, res) => {
  try {
    const { startLat, startLng, endLat, endLng, profile = 'driving' } = req.query;

    if (!startLat || !startLng || !endLat || !endLng) {
      return res.status(400).json({
        success: false,
        error: "Missing required parameters: startLat, startLng, endLat, endLng."
      });
    }

    const sLat = parseFloat(startLat);
    const sLng = parseFloat(startLng);
    const eLat = parseFloat(endLat);
    const eLng = parseFloat(endLng);

    if (isNaN(sLat) || isNaN(sLng) || isNaN(eLat) || isNaN(eLng)) {
      return res.status(400).json({
        success: false,
        error: "Invalid coordinates format. Latitude and longitude must be valid numbers."
      });
    }

    // Call OSRM routing API with full geometries and turn-by-turn steps
    const osrmBase = (process.env.OSRM_BASE_URL || 'https://router.project-osrm.org').replace(/\/$/, '');
    const osrmUrl = `${osrmBase}/route/v1/${encodeURIComponent(profile)}/${sLng},${sLat};${eLng},${eLat}?overview=full&geometries=geojson&steps=true`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const osrmRes = await fetch(osrmUrl, {
      headers: {
        'User-Agent': 'WildAtlas-Navigation/1.0',
        'Accept': 'application/json'
      },
      signal: controller.signal
    }).catch(err => {
      clearTimeout(timeoutId);
      throw new Error(`OSRM network request failed: ${err.message}`);
    });
    clearTimeout(timeoutId);

    if (!osrmRes.ok) {
      return res.status(404).json({
        success: false,
        error: "No road-accessible route found.",
        details: `OSRM server responded with HTTP status ${osrmRes.status}`
      });
    }

    const osrmData = await osrmRes.json();

    if (osrmData.code !== 'Ok' || !osrmData.routes || osrmData.routes.length === 0) {
      return res.status(404).json({
        success: false,
        error: "No road-accessible route found.",
        code: osrmData.code || 'NoRoute'
      });
    }

    const route = osrmData.routes[0];
    const rawDistance = route.distance; // meters
    const rawDuration = route.duration; // seconds

    const steps = (route.legs && route.legs[0]?.steps) ? route.legs[0].steps.map((step, idx) => ({
      stepIndex: idx + 1,
      instruction: generateStepInstruction(step),
      distance: step.distance,
      distanceFormatted: formatDistance(step.distance),
      duration: step.duration,
      durationFormatted: formatDuration(step.duration),
      name: step.name || 'Unnamed road',
      maneuver: step.maneuver,
      location: step.maneuver?.location ? [step.maneuver.location[1], step.maneuver.location[0]] : null
    })) : [];

    res.json({
      success: true,
      distance: rawDistance,
      distanceFormatted: formatDistance(rawDistance),
      duration: rawDuration,
      durationFormatted: formatDuration(rawDuration),
      geometry: route.geometry, // GeoJSON LineString
      steps,
      waypoints: osrmData.waypoints
    });
  } catch (error) {
    console.error("Routing error:", error);
    res.status(500).json({
      success: false,
      error: "No road-accessible route found."
    });
  }
});

// ----------------------------------------------------
// ZOOS ENDPOINTS (Local SQLite)
// ----------------------------------------------------

// Get all zoos (supports ?continent=)
app.get('/api/zoos', async (req, res) => {
  try {
    const { continent } = req.query;
    const zoos = await dbService.getZoos({ continent });
    res.json(zoos);
  } catch (error) {
    console.error("Get zoos failed:", error);
    res.status(500).json({ error: error.message });
  }
});

// Search zoos
app.get('/api/zoos/search', async (req, res) => {
  try {
    const query = req.query.q || '';
    const results = await dbService.searchZoos(query);
    res.json(results);
  } catch (error) {
    console.error("Zoo search failed:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get zoo details by ID
app.get('/api/zoos/:id', async (req, res) => {
  try {
    const zoo = await dbService.getZooById(req.params.id);
    if (!zoo) return res.status(404).json({ error: "Zoo not found." });
    res.json(zoo);
  } catch (error) {
    console.error("Get zoo details failed:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get species/wildlife in zoo (supports ?group=)
app.get('/api/zoos/:id/species', async (req, res) => {
  try {
    const { group } = req.query;
    const species = await dbService.getWildlifeByZooId(req.params.id, group);
    res.json(species);
  } catch (error) {
    console.error("Get zoo species failed:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/zoos/:id/wildlife', async (req, res) => {
  try {
    const { group } = req.query;
    const wildlife = await dbService.getWildlifeByZooId(req.params.id, group);
    res.json(wildlife);
  } catch (error) {
    console.error("Get zoo wildlife failed:", error);
    res.status(500).json({ error: error.message });
  }
});

// ----------------------------------------------------
// GLOBAL SEARCH (Forests, Zoos, Species, Cities, Countries)
// ----------------------------------------------------
app.get('/api/search/global', async (req, res) => {
  try {
    const query = req.query.q || '';
    const results = await dbService.globalSearch(query);
    res.json(results);
  } catch (error) {
    console.error("Global search failed:", error);
    res.status(500).json({ error: error.message });
  }
});



// Get all species master list from SQLite (supports ?group=)
app.get('/api/species', async (req, res) => {
  try {
    const { group } = req.query;
    const species = await dbService.getAllWildlife({ group });
    res.json(species);
  } catch (error) {
    console.error("Get species list failed:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get specific species details from SQLite (Taxonomy, IUCN, Occurrences, Forests)
app.get('/api/species/:id', async (req, res) => {
  try {
    const species = await dbService.getWildlifeById(req.params.id);
    if (!species) return res.status(404).json({ error: "Species not found." });
    res.json(species);
  } catch (error) {
    console.error("Get species by ID failed:", error);
    res.status(500).json({ error: error.message });
  }
});

// Backwards-compatible wildlife details endpoint (Pure SQLite - NO LLM / NO external APIs)
app.get('/api/wildlife/:id', async (req, res) => {
  try {
    const animal = await dbService.getWildlifeById(req.params.id);
    if (!animal) return res.status(404).json({ error: "Wildlife not found." });
    res.json(animal);
  } catch (error) {
    console.error("Get wildlife by ID failed:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get species occurrence records from SQLite
app.get('/api/species/:id/occurrences', async (req, res) => {
  try {
    const { limit = 100, offset = 0 } = req.query;
    const occurrences = await dbService.getSpeciesOccurrences(req.params.id, limit, offset);
    res.json(occurrences);
  } catch (error) {
    console.error("Get species occurrences failed:", error);
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

// Get validation report and database statistics
app.get('/api/validation-report', async (req, res) => {
  try {
    const stats = await dbService.getStats();
    const coordinateValidation = await validateDatasetCoordinates();
    res.json({
      ...stats,
      coordinateValidation
    });
  } catch (error) {
    console.error("Get validation report failed:", error);
    res.status(500).json({ error: error.message });
  }
});

// Dedicated Coordinate Validation Report for Forests and Zoos
app.get('/api/validation/coordinates', async (req, res) => {
  try {
    const report = await validateDatasetCoordinates();
    res.json(report);
  } catch (error) {
    console.error("Coordinate validation failed:", error);
    res.status(500).json({ error: error.message });
  }
});

// ----------------------------------------------------
// Global GBIF Wildlife Occurrences Routes (Pure SQLite)
// ----------------------------------------------------

// Get telemetry statistics on stored GBIF occurrences
app.get('/api/gbif/stats', async (req, res) => {
  try {
    const stats = await gbifService.getStats();
    res.json(stats);
  } catch (error) {
    console.error("Failed to fetch GBIF stats:", error);
    res.status(500).json({ error: error.message });
  }
});

// Query stored GBIF occurrences with filters from SQLite
app.get('/api/gbif/occurrences', async (req, res) => {
  try {
    const {
      category,
      q,
      search,
      country,
      minLat,
      maxLat,
      minLng,
      maxLng,
      limit = 100,
      offset = 0
    } = req.query;

    const occurrences = await gbifService.getStoredOccurrences({
      group: category || undefined,
      search: search || q || undefined,
      country: country || undefined,
      minLat: minLat !== undefined ? parseFloat(minLat) : undefined,
      maxLat: maxLat !== undefined ? parseFloat(maxLat) : undefined,
      minLng: minLng !== undefined ? parseFloat(minLng) : undefined,
      maxLng: maxLng !== undefined ? parseFloat(maxLng) : undefined,
      limit: parseInt(limit, 10) || 100,
      offset: parseInt(offset, 10) || 0
    });

    res.json(occurrences);
  } catch (error) {
    console.error("Failed to query GBIF occurrences:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get a single GBIF occurrence by ID from SQLite
app.get('/api/gbif/occurrences/:id', async (req, res) => {
  try {
    const occurrence = await gbifService.getOccurrenceById(req.params.id);
    if (!occurrence) {
      return res.status(404).json({ error: "GBIF occurrence record not found." });
    }
    res.json(occurrence);
  } catch (error) {
    console.error("Failed to fetch GBIF occurrence detail:", error);
    res.status(500).json({ error: error.message });
  }
});

// Trigger a real GBIF occurrence import
// Supports category: 'all' | 'mammals' | 'birds' | 'reptiles', limit (batch size), offset (pagination), requireImage
app.post('/api/gbif/import', async (req, res) => {
  try {
    const {
      category = 'all',
      limit = 20,
      offset = 0,
      requireImage = false
    } = req.body;

    const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 300);
    const parsedOffset = Math.max(parseInt(offset, 10) || 0, 0);

    let result;
    if (category === 'all') {
      result = await gbifService.importAllCategories({
        limit: parsedLimit,
        offset: parsedOffset,
        requireImage: Boolean(requireImage)
      });
    } else {
      const catResult = await gbifService.importCategory({
        category,
        limit: parsedLimit,
        offset: parsedOffset,
        requireImage: Boolean(requireImage)
      });
      const stats = await gbifService.getStats();
      result = {
        success: true,
        summary: {
          totalFetched: catResult.fetched,
          totalInserted: catResult.inserted,
          totalDuplicates: catResult.duplicatesSkipped,
          currentDatabaseTotal: stats.total,
          currentBreakdown: stats.breakdown,
          uniqueSpecies: stats.uniqueSpecies,
          uniqueCountries: stats.uniqueCountries
        },
        categoryDetails: {
          [category]: catResult
        }
      };
    }

    res.json(result);
  } catch (error) {
    console.error("GBIF import failed:", error);
    res.status(500).json({ error: error.message });
  }
});

// ----------------------------------------------------
// Authentication & User Data Routes (Firebase Authentication & Cloud Firestore)
// ----------------------------------------------------

// Validate email format, disposable domains, and MX records (pre-registration check)
app.post('/api/auth/validate-email', authLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ isValid: false, message: "Email is required." });
    }
    const result = await validateEmailComprehensive(email);
    res.json(result);
  } catch (error) {
    console.error("Email validation error:", error);
    res.status(500).json({ isValid: false, message: "Error validating email domain." });
  }
});

// Retrieve current authenticated user profile from Cloud Firestore
app.get('/api/auth/me', verifyFirebaseToken, async (req, res) => {
  try {
    const profile = await authService.getUserProfile(req.user.uid);
    res.json({
      uid: req.user.uid,
      id: req.user.uid,
      name: profile?.name || req.user.name || '',
      email: req.user.email,
      role: profile?.role || req.user.role || 'user',
      avatar: profile?.avatar || req.user.avatar || null,
      emailVerified: req.user.email_verified,
      createdAt: profile?.createdAt || null
    });
  } catch (error) {
    console.error("Failed to fetch user profile:", error);
    res.status(500).json({ error: error.message });
  }
});

// Alias for /api/me
app.get('/api/me', verifyFirebaseToken, async (req, res) => {
  try {
    const profile = await authService.getUserProfile(req.user.uid);
    res.json({
      uid: req.user.uid,
      id: req.user.uid,
      name: profile?.name || req.user.name || '',
      email: req.user.email,
      role: profile?.role || req.user.role || 'user',
      avatar: profile?.avatar || req.user.avatar || null,
      emailVerified: req.user.email_verified,
      createdAt: profile?.createdAt || null
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update profile name and avatar in Firestore & Firebase Auth
app.put('/api/auth/profile', verifyFirebaseToken, requireVerifiedEmail, async (req, res) => {
  try {
    const { name, avatar } = req.body;
    const uid = req.user.uid;

    if (name && typeof name === 'string') {
      // 1. Update Firebase Auth displayName
      await firebaseAuth.updateUser(uid, {
        displayName: name.trim(),
        photoURL: avatar || undefined
      }).catch((err) => console.warn('[Auth] Firebase Auth displayName update notice:', err.message));

      // 2. Update Cloud Firestore
      await firestore.collection('users').doc(uid).set({
        name: name.trim(),
        avatar: avatar || null,
        updatedAt: new Date()
      }, { merge: true }).catch((err) => console.warn('[Auth] Firestore profile update notice:', err.message));

      // 3. Update SQLite local cache
      await authDbService.updateUserProfile(uid, { name: name.trim(), avatar: avatar || null });
    }

    res.json({
      uid,
      id: uid,
      name: name?.trim() || req.user.name,
      email: req.user.email,
      role: req.user.role,
      avatar: avatar || req.user.avatar,
      emailVerified: req.user.email_verified
    });
  } catch (error) {
    console.error("Profile update failed:", error);
    res.status(400).json({ error: error.message });
  }
});

// Delete account from Firebase Auth, Firestore, and SQLite
app.delete('/api/auth/account', verifyFirebaseToken, async (req, res) => {
  try {
    const uid = req.user.uid;
    // 1. Delete from Firebase Auth
    await firebaseAuth.deleteUser(uid).catch((err) => console.warn('[Auth] Firebase Auth deleteUser notice:', err.message));
    // 2. Delete from Cloud Firestore
    await firestore.collection('users').doc(uid).delete().catch((err) => console.warn('[Auth] Firestore delete doc notice:', err.message));
    // 3. Delete from SQLite
    await authDbService.deleteUser(uid);

    res.json({ success: true, message: "Account deleted successfully." });
  } catch (error) {
    console.error("Account deletion failed:", error);
    res.status(500).json({ error: error.message });
  }
});

// ----------------------------------------------------
// Protected User Routes (Token Required + Verified Email Mandatory)
// ----------------------------------------------------
app.use('/api/user', verifyFirebaseToken, requireVerifiedEmail);

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
    const [forests, users, chats, sightings, sightingsBreakdown, recentUsers, recentActivity, isDbAlive, gbifStats] = await Promise.all([
      dbService.getForests(),
      authService.getAllUsers(),
      authService.getAllChats(),
      authDbService.getSightings(),
      authDbService.getSightingsBreakdown(),
      authDbService.getRecentUsers(5),
      authService.getRecentSystemActivity(10),
      authDbService.checkDatabaseHealth(),
      gbifService.getStats()
    ]);
    
    const wildlifeCount = await dbService.getTotalWildlifeCount();

    const geminiKey = process.env.GEMINI_API_KEY;
    const isGeminiAvailable = !!(geminiKey && !geminiKey.includes('your_') && geminiKey.trim() !== '');

    res.json({
      counts: {
        totalUsers: users.length,
        totalForests: forests.length,
        totalWildlife: wildlifeCount,
        totalChats: chats.length,
        totalSightings: sightings.length,
        totalGbifOccurrences: gbifStats.total
      },
      gbifStats,
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
        mapService: "Available",
        gbifDataService: "Connected"
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
    const sightings = await authDbService.getSightings();
    const wildlifeCount = await dbService.getTotalWildlifeCount();

    res.json({
      forestsCount: forests.length,
      wildlifeCount: wildlifeCount,
      usersCount: users.length,
      sightingsCount: sightings.length,
      chatsCount: chats.length
    });
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
