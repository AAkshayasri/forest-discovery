import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { authDbService } from './authDbService.js';
import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, '../database/auth.db');

const JWT_SECRET = process.env.JWT_SECRET || 'wildatlas-super-secret-access-key-2026';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'wildatlas-super-secret-refresh-key-2026';

// Let's create a chats table in the SQLite database to store chat logs in a production-grade way
const db = new sqlite3.Database(dbPath);
db.run(`
  CREATE TABLE IF NOT EXISTS ai_chats (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    prompt TEXT NOT NULL,
    answer TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    title TEXT
  )
`);
// Safely ensure title column exists for existing databases
db.run("ALTER TABLE ai_chats ADD COLUMN title TEXT", () => {});


const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

export const authService = {
  getMode: () => "production",

  // JWT Helper methods
  generateAccessToken: (user) => {
    return jwt.sign(
      { userId: user.id, email: user.email, name: user.name, role: user.role },
      JWT_SECRET,
      { expiresIn: '15m' }
    );
  },

  generateRefreshToken: (user) => {
    return jwt.sign(
      { userId: user.id, email: user.email },
      JWT_REFRESH_SECRET,
      { expiresIn: '30d' }
    );
  },

  // Middleware to verify access tokens
  verifyToken: async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: "Unauthorized. No token provided." });
    }

    const token = authHeader.split('Bearer ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await authDbService.getUserById(decoded.userId);
      if (!user) {
        return res.status(401).json({ error: "Unauthorized. User not found." });
      }
      
      // Set req.user to match expected user model on the frontend/backend
      req.user = {
        uid: user.id.toString(),
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      };
      return next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ error: "TokenExpired", message: "Access token expired." });
      }
      console.error("Token verification failed:", error.message);
      return res.status(401).json({ error: "Unauthorized. Invalid token." });
    }
  },

  // Registration logic
  register: async (name, email, password, role = 'user') => {
    // Password validation: Reject empty, invalid UTF-8, or too long (e.g. > 128 characters for bcrypt)
    if (!password || password.trim() === '') {
      throw new Error("Password cannot be empty.");
    }
    if (password.length > 72) {
      throw new Error("Password exceeds storage limits (72 characters maximum).");
    }
    // Check UTF-8 validity
    try {
      Buffer.from(password, 'utf-8');
    } catch (e) {
      throw new Error("Invalid password encoding.");
    }

    const existingUser = await authDbService.getUserByEmail(email);
    if (existingUser) {
      throw new Error("Email already registered.");
    }

    // Hash password using bcryptjs
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = await authDbService.createUser({
      name,
      email,
      passwordHash,
      role
    });

    return newUser;
  },

  // Login logic
  login: async (email, password) => {
    if (!email || !password) {
      throw new Error("Email and password are required.");
    }

    const user = await authDbService.getUserByEmail(email);
    if (!user) {
      throw new Error("Invalid email or password.");
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      throw new Error("Invalid email or password.");
    }

    // Update last login
    await authDbService.updateLastLogin(user.id);

    // Generate tokens
    const accessToken = authService.generateAccessToken(user);
    const refreshToken = authService.generateRefreshToken(user);

    // Securely hash and store the refresh token
    const refreshTokenHash = hashToken(refreshToken);
    await authDbService.updateUserRefreshToken(user.id, refreshTokenHash);

    return {
      user: {
        uid: user.id.toString(),
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar: user.avatar
      },
      accessToken,
      refreshToken
    };
  },

  // Refresh token logic
  refresh: async (refreshToken) => {
    if (!refreshToken) {
      throw new Error("Refresh token is required.");
    }

    try {
      const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
      const user = await authDbService.getUserById(decoded.userId);
      if (!user) {
        throw new Error("User not found.");
      }

      // Match refresh token hash
      const clientHash = hashToken(refreshToken);
      if (user.refresh_token_hash !== clientHash) {
        throw new Error("Invalid refresh token.");
      }

      // Generate new access token
      const accessToken = authService.generateAccessToken(user);
      return { accessToken };
    } catch (error) {
      throw new Error("Session expired or invalid refresh token.");
    }
  },

  // Logout logic
  logout: async (userId) => {
    await authDbService.updateUserRefreshToken(userId, null);
  },

  // Chat log storage (SQLite production-ready)
  saveChat: async (userId, prompt, answer, title = null) => {
    const id = crypto.randomUUID();
    const timestamp = new Date().toISOString();
    const chatTitle = (title && typeof title === 'string' && title.trim()) ? title.trim() : prompt.trim();
    return new Promise((resolve, reject) => {
      db.run(
        "INSERT INTO ai_chats (id, userId, prompt, answer, timestamp, title) VALUES (?, ?, ?, ?, ?, ?)",
        [id, userId.toString(), prompt, answer, timestamp, chatTitle],
        (err) => {
          if (err) reject(err);
          else resolve({ id, userId: userId.toString(), prompt, answer, timestamp, title: chatTitle });
        }
      );
    });
  },

  getUserChats: async (userId) => {
    return new Promise((resolve, reject) => {
      db.all(
        "SELECT id, userId, prompt, answer, timestamp, COALESCE(title, prompt) as title FROM ai_chats WHERE userId = ? ORDER BY timestamp DESC",
        [userId.toString()],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
  },

  updateChatTitle: async (id, userId, title) => {
    return new Promise((resolve, reject) => {
      db.run(
        "UPDATE ai_chats SET title = ? WHERE id = ? AND userId = ?",
        [title.trim(), id, userId.toString()],
        function (err) {
          if (err) return reject(err);
          if (this.changes === 0) return resolve(null);
          db.get(
            "SELECT id, userId, prompt, answer, timestamp, COALESCE(title, prompt) as title FROM ai_chats WHERE id = ?",
            [id],
            (err2, row) => {
              if (err2) reject(err2);
              else resolve(row);
            }
          );
        }
      );
    });
  },

  deleteChat: async (id, userId) => {
    return new Promise((resolve, reject) => {
      db.run(
        "DELETE FROM ai_chats WHERE id = ? AND userId = ?",
        [id, userId.toString()],
        function (err) {
          if (err) return reject(err);
          resolve(this.changes > 0);
        }
      );
    });
  },

  getAllChats: async () => {
    return new Promise((resolve, reject) => {
      db.all(
        "SELECT id, userId, prompt, answer, timestamp, COALESCE(title, prompt) as title FROM ai_chats ORDER BY timestamp DESC",
        [],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
  },

  // Compatibility helpers
  getUserMetadata: async (userId) => {
    const user = await authDbService.getUserById(Number(userId));
    if (!user) return null;
    return {
      uid: user.id.toString(),
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      avatar: user.avatar
    };
  },

  registerUserMetadata: async (userId, email, name, role = "user") => {
    // Used during initial setup or syncs if needed
    const user = await authDbService.getUserById(Number(userId));
    return user;
  },

  getAllUsers: async () => {
    return await authDbService.getAllUsers();
  },

  getUserChatCount: async (userId) => {
    return new Promise((resolve, reject) => {
      db.get(
        "SELECT COUNT(*) as count FROM ai_chats WHERE userId = ?",
        [userId.toString()],
        (err, row) => {
          if (err) reject(err);
          else resolve(row ? row.count : 0);
        }
      );
    });
  },

  getUserRecentChats: async (userId, limit = 5) => {
    return new Promise((resolve, reject) => {
      db.all(
        "SELECT id, prompt, timestamp, COALESCE(title, prompt) as title FROM ai_chats WHERE userId = ? ORDER BY timestamp DESC LIMIT ?",
        [userId.toString(), limit],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
  },

  getRecentSystemActivity: async (limit = 10) => {
    try {
      const recentUsers = await authDbService.getRecentUsers(5);
      const recentSightings = await authDbService.getSightings();
      const recentChats = await new Promise((resolve) => {
        db.all(
          "SELECT id, userId, prompt, timestamp FROM ai_chats ORDER BY timestamp DESC LIMIT 5",
          [],
          (err, rows) => resolve(rows || [])
        );
      });

      const activities = [];

      // Map Users
      for (const u of recentUsers) {
        activities.push({
          id: `user-${u.id}`,
          type: 'user_registration',
          title: `New User Registered: ${u.name}`,
          detail: `Role: ${u.role}`,
          timestamp: u.created_at
        });
      }

      // Map Sightings
      for (const s of recentSightings.slice(0, 5)) {
        activities.push({
          id: `sighting-${s.id}`,
          type: 'wildlife_sighting',
          title: `Sighting Reported: ${s.commonName}`,
          detail: `Status: ${s.status.toUpperCase()} (${s.notes || 'No notes'})`,
          timestamp: s.timestamp
        });
      }

      // Map Chats
      for (const c of recentChats) {
        activities.push({
          id: `chat-${c.id}`,
          type: 'ai_query',
          title: `AI Guide Query: "${c.prompt.length > 40 ? c.prompt.substring(0, 40) + '...' : c.prompt}"`,
          detail: `Telemetry Query`,
          timestamp: c.timestamp
        });
      }

      // Sort combined activities descending by timestamp
      activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      return activities.slice(0, limit);
    } catch (error) {
      console.error("Failed to gather system activity:", error);
      return [];
    }
  }
};

