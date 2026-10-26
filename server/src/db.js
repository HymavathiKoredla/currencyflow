import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Dynamic SQLite engine loader: uses better-sqlite3 if present, or Node.js native node:sqlite
let SqliteDatabase;

try {
  const betterSqlite = await import('better-sqlite3');
  SqliteDatabase = betterSqlite.default || betterSqlite;
} catch {
  // Use Node.js built-in native SQLite engine (DatabaseSync)
  const nodeSqlite = await import('node:sqlite');
  SqliteDatabase = class NodeSqliteWrapper {
    constructor(filePath) {
      this._db = new nodeSqlite.DatabaseSync(filePath);
    }
    exec(sql) {
      return this._db.exec(sql);
    }
    pragma(pragmaStr) {
      try {
        return this._db.exec(`PRAGMA ${pragmaStr};`);
      } catch (e) {
        // Ignored if unsupported in-memory
      }
    }
    prepare(sql) {
      return this._db.prepare(sql);
    }
    close() {
      return this._db.close();
    }
  };
}

// Database location - configurable via DB_PATH, defaults to server/data/currencyflow.db
const defaultDbDir = path.resolve(__dirname, '../data');
if (!fs.existsSync(defaultDbDir)) {
  fs.mkdirSync(defaultDbDir, { recursive: true });
}

const dbPath = process.env.DB_PATH
  ? path.resolve(process.cwd(), process.env.DB_PATH)
  : path.join(defaultDbDir, 'currencyflow.db');

// Ensure target directory exists for custom DB_PATH
const targetDir = path.dirname(dbPath);
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

let dbInstance = null;

export function getDb(customPath = null) {
  if (customPath) {
    const customDb = new SqliteDatabase(customPath);
    initSchema(customDb);
    return customDb;
  }

  if (!dbInstance) {
    dbInstance = new SqliteDatabase(dbPath);
    initSchema(dbInstance);
  }
  return dbInstance;
}

export function initSchema(db) {
  try {
    db.pragma('journal_mode = WAL');
    db.pragma('synchronous = NORMAL');
  } catch (e) {
    // PRAGMA may not be supported in some memory contexts
  }

  // Conversions history table
  db.exec(`
    CREATE TABLE IF NOT EXISTS conversions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      amount REAL NOT NULL,
      from_currency TEXT NOT NULL,
      to_currency TEXT NOT NULL,
      exchange_rate REAL NOT NULL,
      converted_amount REAL NOT NULL,
      rate_date TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_conversions_created_at 
      ON conversions(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_conversions_pair 
      ON conversions(from_currency, to_currency);

    -- Cache for exchange rate observations
    CREATE TABLE IF NOT EXISTS rate_observations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      base_currency TEXT NOT NULL,
      quote_currency TEXT NOT NULL,
      rate REAL NOT NULL,
      rate_date TEXT NOT NULL,
      fetched_at TEXT NOT NULL,
      UNIQUE(base_currency, quote_currency, rate_date)
    );

    CREATE INDEX IF NOT EXISTS idx_rate_obs_pair_date 
      ON rate_observations(base_currency, quote_currency, rate_date DESC);
  `);
}

// Ensure default database is initialized
getDb();

/**
 * Save user conversion record
 */
export function saveConversion({
  amount,
  from_currency,
  to_currency,
  exchange_rate,
  converted_amount,
  rate_date,
  created_at = new Date().toISOString()
}) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO conversions (
      amount, from_currency, to_currency, exchange_rate, converted_amount, rate_date, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    Number(amount),
    from_currency.toUpperCase(),
    to_currency.toUpperCase(),
    Number(exchange_rate),
    Number(converted_amount),
    rate_date,
    created_at
  );

  return {
    id: result.lastInsertRowid,
    amount: Number(amount),
    from_currency: from_currency.toUpperCase(),
    to_currency: to_currency.toUpperCase(),
    exchange_rate: Number(exchange_rate),
    converted_amount: Number(converted_amount),
    rate_date,
    created_at
  };
}

/**
 * Get recent conversions (newest first)
 */
export function getRecentConversions(limit = 20) {
  const db = getDb();
  const safeLimit = Math.max(1, Math.min(Number(limit) || 20, 100));
  const stmt = db.prepare(`
    SELECT id, amount, from_currency, to_currency, exchange_rate, converted_amount, rate_date, created_at
    FROM conversions
    ORDER BY created_at DESC, id DESC
    LIMIT ?
  `);
  return stmt.all(safeLimit);
}

/**
 * Clear all conversions
 */
export function clearConversions() {
  const db = getDb();
  const stmt = db.prepare('DELETE FROM conversions');
  const info = stmt.run();
  return { deleted: info.changes };
}

/**
 * Save or update exchange rate observation cache
 */
export function saveRateObservation({
  base_currency,
  quote_currency,
  rate,
  rate_date,
  fetched_at = new Date().toISOString()
}) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO rate_observations (
      base_currency, quote_currency, rate, rate_date, fetched_at
    ) VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(base_currency, quote_currency, rate_date) 
    DO UPDATE SET 
      rate = excluded.rate,
      fetched_at = excluded.fetched_at
  `);

  stmt.run(
    base_currency.toUpperCase(),
    quote_currency.toUpperCase(),
    Number(rate),
    rate_date,
    fetched_at
  );
}

/**
 * Get latest cached rate for a pair
 */
export function getLatestCachedRate(base, quote) {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT base_currency, quote_currency, rate, rate_date, fetched_at
    FROM rate_observations
    WHERE base_currency = ? AND quote_currency = ?
    ORDER BY rate_date DESC, fetched_at DESC
    LIMIT 1
  `);
  return stmt.get(base.toUpperCase(), quote.toUpperCase()) || null;
}

/**
 * Get cached time series observations
 */
export function getCachedHistory(base, quote, fromDate, toDate) {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT rate_date AS date, base_currency AS base, quote_currency AS quote, rate
    FROM rate_observations
    WHERE base_currency = ? AND quote_currency = ?
      AND rate_date >= ? AND rate_date <= ?
    ORDER BY rate_date ASC
  `);
  return stmt.all(base.toUpperCase(), quote.toUpperCase(), fromDate, toDate);
}

/**
 * Get application stats
 */
export function getAppStats() {
  const db = getDb();
  const countRow = db.prepare('SELECT COUNT(*) as total_conversions FROM conversions').get();
  const popularPairRow = db.prepare(`
    SELECT from_currency, to_currency, COUNT(*) as pair_count
    FROM conversions
    GROUP BY from_currency, to_currency
    ORDER BY pair_count DESC
    LIMIT 1
  `).get();
  const latestRow = db.prepare(`
    SELECT created_at FROM conversions ORDER BY created_at DESC LIMIT 1
  `).get();

  return {
    totalConversions: countRow ? countRow.total_conversions : 0,
    mostPopularPair: popularPairRow ? `${popularPairRow.from_currency}/${popularPairRow.to_currency}` : 'None',
    lastConversionAt: latestRow ? latestRow.created_at : null
  };
}
