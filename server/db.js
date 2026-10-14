const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, 'database.db');
const db = new DatabaseSync(dbPath);

try { db.exec('PRAGMA journal_mode = WAL;'); } catch (e) {}

db.exec(`CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL, password TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('student','coach')),
  avatar TEXT DEFAULT '🎓', score INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (strftime('%s','now'))
);`);

db.exec(`CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL,
  username TEXT NOT NULL, name TEXT NOT NULL, avatar TEXT, role TEXT,
  text TEXT, image TEXT,
  created_at INTEGER DEFAULT (strftime('%s','now'))
);`);

db.exec(`CREATE TABLE IF NOT EXISTS quizzes (
  id INTEGER PRIMARY KEY AUTOINCREMENT, question TEXT NOT NULL,
  opt1 TEXT NOT NULL, opt2 TEXT NOT NULL, opt3 TEXT NOT NULL, opt4 TEXT NOT NULL,
  correct INTEGER NOT NULL CHECK(correct BETWEEN 1 AND 4),
  category TEXT, author_id INTEGER,
  created_at INTEGER DEFAULT (strftime('%s','now'))
);`);

db.exec(`CREATE TABLE IF NOT EXISTS answers (
  id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL,
  quiz_id INTEGER NOT NULL, is_correct INTEGER NOT NULL,
  created_at INTEGER DEFAULT (strftime('%s','now')),
  UNIQUE(user_id, quiz_id)
);`);

db.exec(`CREATE TABLE IF NOT EXISTS gallery (
  id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL,
  class_name TEXT, icon TEXT DEFAULT '🖼️', color TEXT DEFAULT '#d1fae5',
  image TEXT, author_id INTEGER,
  created_at INTEGER DEFAULT (strftime('%s','now'))
);`);

db.exec(`CREATE TABLE IF NOT EXISTS models3d (
  id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL,
  category TEXT DEFAULT 'آناتومی', file TEXT NOT NULL, size INTEGER,
  author_id INTEGER, created_at INTEGER DEFAULT (strftime('%s','now'))
);`);

db.exec(`CREATE TABLE IF NOT EXISTS contact (
  id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER,
  subject TEXT, body TEXT NOT NULL,
  created_at INTEGER DEFAULT (strftime('%s','now'))
);`);

db.exec(`CREATE TABLE IF NOT EXISTS lab_materials (
  id INTEGER PRIMARY KEY AUTOINCREMENT, category TEXT NOT NULL,
  title TEXT NOT NULL, description TEXT,
  type TEXT NOT NULL, content TEXT, file TEXT,
  author_id INTEGER, created_at INTEGER DEFAULT (strftime('%s','now'))
);`);

db.exec(`CREATE TABLE IF NOT EXISTS classes (
  id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL,
  description TEXT, code TEXT UNIQUE NOT NULL,
  coach_id INTEGER NOT NULL, coach_name TEXT,
  is_active INTEGER DEFAULT 1,
  created_at INTEGER DEFAULT (strftime('%s','now'))
);`);

db.exec(`CREATE TABLE IF NOT EXISTS class_files (
  id INTEGER PRIMARY KEY AUTOINCREMENT, class_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL, user_name TEXT NOT NULL, user_avatar TEXT,
  file_name TEXT NOT NULL, file_path TEXT NOT NULL,
  file_size INTEGER, file_type TEXT, description TEXT,
  created_at INTEGER DEFAULT (strftime('%s','now'))
);`);

console.log('✅ دیتابیس آماده شد:', dbPath);
module.exports = db;