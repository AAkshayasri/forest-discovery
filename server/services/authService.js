import crypto from 'crypto';
import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { firestore } from './firebaseAdmin.js';
import { authDbService } from './authDbService.js';
import { verifyFirebaseToken, requireVerifiedEmail, requireAdmin } from '../middleware/authMiddleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, '../database/auth.db');

const db = new sqlite3.Database(dbPath);

export const authService = {
  getMode: () => "firebase-production",

  // Export middlewares for Express routing
  verifyToken: verifyFirebaseToken,
  requireVerifiedEmail,
  requireAdmin,

  // Retrieves user profile from Cloud Firestore (primary source of truth)
  getUserProfile: async (uid) => {
    try {
      const doc = await firestore.collection('users').doc(uid.toString()).get();
      if (doc.exists) {
        return doc.data();
      }
    } catch (err) {
      console.warn(`[AuthService] Firestore lookup fallback for ${uid}:`, err.message);
    }
    const localUser = await authDbService.getUserByUid(uid);
    return localUser || null;
  },

  // Backwards-compatible alias
  getUserMetadata: async (userId) => {
    return await authService.getUserProfile(userId);
  },

  registerUserMetadata: async (userId, email, name, role = "user") => {
    return await authDbService.syncUser({ uid: userId, email, name, role });
  },

  // Chat log storage keyed by Firebase UID
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

  getAllUsers: async () => {
    try {
      const snapshot = await firestore.collection('users').get();
      if (!snapshot.empty) {
        return snapshot.docs.map(doc => doc.data());
      }
    } catch (err) {
      console.warn('[AuthService] Firestore getAllUsers fallback:', err.message);
    }
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

      for (const u of recentUsers) {
        activities.push({
          id: `user-${u.uid}`,
          type: 'user_registration',
          title: `New User Registered: ${u.name}`,
          detail: `Role: ${u.role}`,
          timestamp: u.created_at
        });
      }

      for (const s of recentSightings.slice(0, 5)) {
        activities.push({
          id: `sighting-${s.id}`,
          type: 'wildlife_sighting',
          title: `Sighting Reported: ${s.commonName}`,
          detail: `Status: ${s.status.toUpperCase()} (${s.notes || 'No notes'})`,
          timestamp: s.timestamp
        });
      }

      for (const c of recentChats) {
        activities.push({
          id: `chat-${c.id}`,
          type: 'ai_query',
          title: `AI Guide Query: "${c.prompt.length > 40 ? c.prompt.substring(0, 40) + '...' : c.prompt}"`,
          detail: `Telemetry Query`,
          timestamp: c.timestamp
        });
      }

      activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      return activities.slice(0, limit);
    } catch (error) {
      console.error("Failed to gather system activity:", error);
      return [];
    }
  }
};

export default authService;
