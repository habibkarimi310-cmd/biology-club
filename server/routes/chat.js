const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db');
const { requireAuth } = require('../auth');

const router = express.Router();
const dir = path.join(__dirname, '..', 'uploads', 'chat');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

// ۴ گیگابایت
const MAX_SIZE = 4 * 1024 * 1024 * 1024;

const upload = multer({
  storage: multer.diskStorage({
    destination: (r, f, cb) => cb(null, dir),
    filename: (r, f, cb) => cb(null,
      `chat-${Date.now()}-${Math.random().toString(36).slice(2,8)}${path.extname(f.originalname)}`)
  }),
  limits: { fileSize: MAX_SIZE },
  fileFilter: (r, f, cb) => cb(null, /^image\//.test(f.mimetype))
});

router.get('/', requireAuth, (req, res) => {
  res.json(db.prepare(`SELECT id,user_id,username,name,avatar,role,text,image,created_at
    FROM messages ORDER BY id ASC LIMIT 200`).all());
});

router.post('/', requireAuth, (req, res) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE')
        return res.status(413).json({ error: 'فایل خیلی بزرگ! حداکثر ۴ گیگابایت' });
      return res.status(400).json({ error: err.message });
    }

    const u = db.prepare('SELECT id,username,name,avatar,role FROM users WHERE id=?').get(req.user.id);
    const text = (req.body.text || '').trim();
    const image = req.file ? `/uploads/chat/${req.file.filename}` : null;
    if (!text && !image) return res.status(400).json({ error: 'متن یا تصویر لازم است' });

    const info = db.prepare(`INSERT INTO messages (user_id,username,name,avatar,role,text,image)
      VALUES (?,?,?,?,?,?,?)`).run(u.id, u.username, u.name, u.avatar, u.role, text, image);
    res.json(db.prepare('SELECT * FROM messages WHERE id=?').get(info.lastInsertRowid));
  });
});

router.delete('/', requireAuth, (req, res) => {
  if (req.user.role !== 'coach') return res.status(403).json({ error: 'فقط مربی' });
  db.prepare('DELETE FROM messages').run();
  res.json({ ok: true });
});

module.exports = router;