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
    console.log("Connected to authentication database successfully.");
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

// Initialize schema
const initDb = async () => {
  const usersTableSql = `
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      avatar TEXT,
      role TEXT NOT NULL DEFAULT 'user',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      refresh_token_hash TEXT,
      last_login TEXT
    );
  `;

  const zoosTableSql = `
    CREATE TABLE IF NOT EXISTS zoos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      country TEXT NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      notable_species TEXT NOT NULL
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

  try {
    await dbRun(usersTableSql);
    await dbRun(zoosTableSql);
    await dbRun(sightingsTableSql);

    // Clean up obsolete user_badges table if it exists
    await dbRun("DROP TABLE IF EXISTS user_badges");

    console.log("All SQLite tables verified / initialized successfully.");

    // Seed zoos if empty
    const zooCount = await dbGet("SELECT COUNT(*) as count FROM zoos");
    if (zooCount.count === 0) {
      const initialZoos = [
        { name: "San Diego Zoo", country: "United States", latitude: 32.7353, longitude: -117.1490, notable: "Giant Panda, Cheetah, Koala" },
        { name: "Singapore Zoo", country: "Singapore", latitude: 1.4043, longitude: 103.7930, notable: "White Tiger, Orangutan, Komodo Dragon" },
        { name: "Taronga Zoo", country: "Australia", latitude: -33.8435, longitude: 151.2413, notable: "Koala, Platypus, Kangaroo" },
        { name: "Kruger National Park Conservation Center", country: "South Africa", latitude: -23.9884, longitude: 31.5547, notable: "Lion, African Elephant, Leopard" },
        { name: "Chengdu Research Base", country: "China", latitude: 30.7380, longitude: 104.1441, notable: "Giant Panda, Red Panda" }
      ];
      for (const z of initialZoos) {
        await dbRun(
          "INSERT INTO zoos (name, country, latitude, longitude, notable_species) VALUES (?, ?, ?, ?, ?)",
          [z.name, z.country, z.latitude, z.longitude, z.notable]
        );
      }
      console.log("Seeded 5 global zoos successfully.");
    }
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

  getUserById: async (id) => {
    return await dbGet("SELECT * FROM users WHERE id = ?", [id]);
  },

  createUser: async ({ name, email, passwordHash, role = 'user', avatar = null }) => {
    const emailNorm = email.toLowerCase().trim();
    const result = await dbRun(
      "INSERT INTO users (name, email, password_hash, role, avatar) VALUES (?, ?, ?, ?, ?)",
      [name, emailNorm, passwordHash, role, avatar]
    );
    return await dbGet("SELECT * FROM users WHERE id = ?", [result.lastID]);
  },

  updateUserRefreshToken: async (id, refreshTokenHash) => {
    await dbRun(
      "UPDATE users SET refresh_token_hash = ?, updated_at = datetime('now') WHERE id = ?",
      [refreshTokenHash, id]
    );
  },

  updateUserProfile: async (id, { name, avatar }) => {
    await dbRun(
      "UPDATE users SET name = ?, avatar = ?, updated_at = datetime('now') WHERE id = ?",
      [name, avatar, id]
    );
    return await dbGet("SELECT * FROM users WHERE id = ?", [id]);
  },

  updateUserPassword: async (id, passwordHash) => {
    await dbRun(
      "UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?",
      [passwordHash, id]
    );
  },

  updateLastLogin: async (id) => {
    await dbRun(
      "UPDATE users SET last_login = datetime('now') WHERE id = ?",
      [id]
    );
  },

  deleteUser: async (id) => {
    await dbRun("DELETE FROM users WHERE id = ?", [id]);
  },

  getAllUsers: async () => {
    return await dbAll("SELECT id, name, email, role, avatar, created_at, last_login FROM users");
  },

  // Zoos CRUD
  getZoos: async () => {
    return await dbAll("SELECT * FROM zoos");
  },

  addZoo: async ({ name, country, latitude, longitude, notable_species }) => {
    const result = await dbRun(
      "INSERT INTO zoos (name, country, latitude, longitude, notable_species) VALUES (?, ?, ?, ?, ?)",
      [name, country, Number(latitude), Number(longitude), notable_species]
    );
    return await dbGet("SELECT * FROM zoos WHERE id = ?", [result.lastID]);
  },

  deleteZoo: async (id) => {
    await dbRun("DELETE FROM zoos WHERE id = ?", [id]);
  },

  // Sightings CRUD
  getSightings: async () => {
    return await dbAll("SELECT * FROM sightings ORDER BY timestamp DESC");
  },

  getUserSightings: async (userId) => {
    return await dbAll("SELECT * FROM sightings WHERE userId = ? ORDER BY timestamp DESC", [userId]);
  },

  addSighting: async ({ userId, commonName, scientificName, latitude, longitude, imageBase64, notes }) => {
    const result = await dbRun(
      "INSERT INTO sightings (userId, commonName, scientificName, latitude, longitude, timestamp, imageBase64, notes, status) VALUES (?, ?, ?, ?, ?, datetime('now'), ?, ?, 'pending')",
      [userId, commonName, scientificName, Number(latitude), Number(longitude), imageBase64, notes]
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
      "SELECT id, name, email, role, created_at, last_login FROM users ORDER BY created_at DESC LIMIT ?",
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

