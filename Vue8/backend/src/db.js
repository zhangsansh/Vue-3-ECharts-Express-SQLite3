const Database = require('better-sqlite3')
const path = require('path')
const fs = require('fs')

const DATA_DIR = path.join(__dirname, '..', 'data')
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })

let dbPath = path.join(DATA_DIR, 'wheat.db')
let db = null

function getDb() {
  if (!db) {
    db = new Database(dbPath)
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')
  }
  return db
}

function setDbPath(newPath) {
  if (db) {
    db.close()
    db = null
  }
  dbPath = newPath
  return getDb()
}

function getDbPath() {
  return dbPath
}

function initSchema(database = getDb()) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      phone TEXT UNIQUE,
      role TEXT NOT NULL DEFAULT 'viewer',
      real_name TEXT,
      status INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS regions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      parent_code TEXT,
      level INTEGER DEFAULT 2,
      longitude REAL,
      latitude REAL
    );

    CREATE TABLE IF NOT EXISTS wheat_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      region_code TEXT NOT NULL,
      region_name TEXT NOT NULL,
      year INTEGER NOT NULL,
      yield REAL,
      sown_area REAL,
      rainfall REAL,
      temperature REAL,
      sunshine REAL,
      fertilizer REAL,
      pesticide REAL,
      irrigation REAL,
      soil_quality REAL,
      labor_cost REAL,
      mechanization REAL,
      disease_index REAL,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime')),
      UNIQUE(region_code, year)
    );

    CREATE TABLE IF NOT EXISTS predictions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      region_code TEXT NOT NULL,
      region_name TEXT NOT NULL,
      year INTEGER NOT NULL,
      predicted_yield REAL,
      model_name TEXT,
      mae REAL,
      rmse REAL,
      r2 REAL,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS system_config (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS operation_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      username TEXT,
      action TEXT,
      detail TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );
  `)
}

module.exports = { getDb, setDbPath, getDbPath, initSchema, DATA_DIR }
