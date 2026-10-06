import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.resolve(__dirname, '../database/auth.db');

// Initialize database connection
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Failed to connect to authentication database:", err.message);
  } else {
    console.log("Connected to authentication operational database successfully.");
  }
});

// Run DB setup synchronously-like using promises
const dbRun = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
};

const dbGet = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

const dbAll = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

// Initialize schema (Pure Firebase UID mapping - ZERO password storage)
const initDb = async () => {
  const usersTableSql = `
    CREATE TABLE IF NOT EXISTS users (
      uid TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      avatar TEXT,
      role TEXT NOT NULL DEFAULT 'user',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_login TEXT
    );
  `;

  const sightingsTableSql = `
    CREATE TABLE IF NOT EXISTS sightings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId TEXT NOT NULL,
      commonName TEXT NOT NULL,
      scientificName TEXT,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      timestamp TEXT NOT NULL,
      imageBase64 TEXT,
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'pending'
    );
  `;

  const aiChatsTableSql = `
    CREATE TABLE IF NOT EXISTS ai_chats (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      prompt TEXT NOT NULL,
      answer TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      title TEXT
    );
  `;

  const gbifOccurrencesTableSql = `
    CREATE TABLE IF NOT EXISTS gbif_occurrences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      gbif_id TEXT UNIQUE NOT NULL,
      category TEXT NOT NULL,
      scientific_name TEXT NOT NULL,
      common_name TEXT,
      kingdom TEXT,
      phylum TEXT,
      class TEXT NOT NULL,
      order_name TEXT,
      family TEXT,
      genus TEXT,
      species TEXT,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      country TEXT,
      country_code TEXT,
      state_province TEXT,
      locality TEXT,
      event_date TEXT,
      basis_of_record TEXT,
      dataset_name TEXT,
      institution_code TEXT,
      collection_code TEXT,
      gbif_url TEXT,
      image_url TEXT,
      source TEXT NOT NULL DEFAULT 'GBIF',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `;

  try {
    // Check if users table exists and whether it has uid column
    const userColumns = await dbAll("PRAGMA table_info(users)").catch(() => []);
    if (userColumns.length > 0) {
      const hasUid = userColumns.some(c => c.name === 'uid');
      if (!hasUid) {
        console.log("Migrating users table to pure Firebase UID schema...");
        await dbRun("ALTER TABLE users RENAME TO users_old");
        await dbRun(usersTableSql);
        // Attempt to copy any legacy records safely
        await dbRun(`
          INSERT OR IGNORE INTO users (uid, name, email, avatar, role, created_at, updated_at, last_login)
          SELECT CAST(id AS TEXT) as uid, name, email, avatar, COALESCE(role, 'user'), COALESCE(created_at, datetime('now')), COALESCE(updated_at, datetime('now')), last_login FROM users_old
        `).catch(() => {});
        await dbRun("DROP TABLE IF EXISTS users_old").catch(() => {});
        console.log("✓ Users table migrated to Firebase UID schema successfully.");
      }
    } else {
      await dbRun(usersTableSql);
    }

    await dbRun(sightingsTableSql);
    await dbRun(aiChatsTableSql);
    await dbRun(gbifOccurrencesTableSql);

    // Indexes for fast spatial, taxonomic, and user queries
    await dbRun("CREATE INDEX IF NOT EXISTS idx_sightings_user ON sightings(userId)");
    await dbRun("CREATE INDEX IF NOT EXISTS idx_chats_user ON ai_chats(userId)");
    await dbRun("CREATE UNIQUE INDEX IF NOT EXISTS idx_gbif_key ON gbif_occurrences(gbif_id)");
    await dbRun("CREATE INDEX IF NOT EXISTS idx_gbif_scientific_name ON gbif_occurrences(scientific_name)");
    await dbRun("CREATE INDEX IF NOT EXISTS idx_gbif_class ON gbif_occurrences(class)");
    await dbRun("CREATE INDEX IF NOT EXISTS idx_gbif_category ON gbif_occurrences(category)");
    await dbRun("CREATE INDEX IF NOT EXISTS idx_gbif_country ON gbif_occurrences(country)");
    await dbRun("CREATE INDEX IF NOT EXISTS idx_gbif_lat_lng ON gbif_occurrences(latitude, longitude)");

    console.log("All operational SQLite tables verified / initialized successfully.");
  } catch (error) {
    console.error("Failed to initialize database tables:", error.message);
  }
};

// Auto-run schema initialization
await initDb();

export const authDbService = {
  getUserByEmail: async (email) => {
    return await dbGet("SELECT * FROM users WHERE email = ?", [email.toLowerCase().trim()]);
  },

  getUserByUid: async (uid) => {
    return await dbGet("SELECT * FROM users WHERE uid = ?", [uid]);
  },

  // Backwards-compatible alias
  getUserById: async (uid) => {
    return await dbGet("SELECT * FROM users WHERE uid = ?", [uid.toString()]);
  },

  syncUser: async ({ uid, name, email, role = 'user', avatar = null }) => {
    const emailNorm = email.toLowerCase().trim();
    await dbRun(
      `INSERT INTO users (uid, name, email, role, avatar, updated_at) 
       VALUES (?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(uid) DO UPDATE SET 
         name = excluded.name,
         email = excluded.email,
         avatar = COALESCE(excluded.avatar, users.avatar),
         role = excluded.role,
         updated_at = datetime('now')`,
      [uid, name, emailNorm, role, avatar]
    );
    return await dbGet("SELECT * FROM users WHERE uid = ?", [uid]);
  },

  updateUserProfile: async (uid, { name, avatar }) => {
    await dbRun(
      "UPDATE users SET name = ?, avatar = ?, updated_at = datetime('now') WHERE uid = ?",
      [name, avatar, uid.toString()]
    );
    return await dbGet("SELECT * FROM users WHERE uid = ?", [uid.toString()]);
  },

  updateLastLogin: async (uid) => {
    await dbRun(
      "UPDATE users SET last_login = datetime('now') WHERE uid = ?",
      [uid.toString()]
    );
  },

  deleteUser: async (uid) => {
    await dbRun("DELETE FROM users WHERE uid = ?", [uid.toString()]);
    await dbRun("DELETE FROM sightings WHERE userId = ?", [uid.toString()]);
    await dbRun("DELETE FROM ai_chats WHERE userId = ?", [uid.toString()]);
  },

  getAllUsers: async () => {
    return await dbAll("SELECT uid, name, email, role, avatar, created_at, last_login FROM users");
  },

  // Sightings CRUD scoped strictly by Firebase UID
  getSightings: async () => {
    return await dbAll("SELECT * FROM sightings ORDER BY timestamp DESC");
  },

  getUserSightings: async (userId) => {
    return await dbAll("SELECT * FROM sightings WHERE userId = ? ORDER BY timestamp DESC", [userId.toString()]);
  },

  addSighting: async ({ userId, commonName, scientificName, latitude, longitude, imageBase64, notes }) => {
    const result = await dbRun(
      "INSERT INTO sightings (userId, commonName, scientificName, latitude, longitude, timestamp, imageBase64, notes, status) VALUES (?, ?, ?, ?, ?, datetime('now'), ?, ?, 'pending')",
      [userId.toString(), commonName, scientificName, Number(latitude), Number(longitude), imageBase64, notes]
    );
    return await dbGet("SELECT * FROM sightings WHERE id = ?", [result.lastID]);
  },

  verifySighting: async (id, status) => {
    await dbRun("UPDATE sightings SET status = ? WHERE id = ?", [status, id]);
    return await dbGet("SELECT * FROM sightings WHERE id = ?", [id]);
  },

  batchVerifySightings: async (ids, status) => {
    if (!Array.isArray(ids) || ids.length === 0) return [];
    const placeholders = ids.map(() => '?').join(',');
    await dbRun(`UPDATE sightings SET status = ? WHERE id IN (${placeholders})`, [status, ...ids]);
    return await dbAll(`SELECT * FROM sightings WHERE id IN (${placeholders})`, ids);
  },

  getSightingsBreakdown: async () => {
    const rows = await dbAll("SELECT status, COUNT(*) as count FROM sightings GROUP BY status");
    const breakdown = { pending: 0, verified: 0, flagged: 0, total: 0 };
    for (const r of rows) {
      if (r.status === 'pending') breakdown.pending = r.count;
      else if (r.status === 'verified') breakdown.verified = r.count;
      else if (r.status === 'flagged') breakdown.flagged = r.count;
      breakdown.total += r.count;
    }
    return breakdown;
  },

  getUserSightingsStats: async (userId) => {
    const rows = await dbAll("SELECT status, COUNT(*) as count FROM sightings WHERE userId = ? GROUP BY status", [userId.toString()]);
    const stats = { pending: 0, verified: 0, flagged: 0, total: 0 };
    for (const r of rows) {
      if (r.status === 'pending') stats.pending = r.count;
      else if (r.status === 'verified') stats.verified = r.count;
      else if (r.status === 'flagged') stats.flagged = r.count;
      stats.total += r.count;
    }
    return stats;
  },

  getRecentUsers: async (limit = 5) => {
    return await dbAll(
      "SELECT uid, name, email, role, created_at, last_login FROM users ORDER BY created_at DESC LIMIT ?",
      [limit]
    );
  },

  checkDatabaseHealth: async () => {
    try {
      const res = await dbGet("SELECT 1 as alive");
      return res && res.alive === 1;
    } catch {
      return false;
    }
  }
};

export default authDbService;
