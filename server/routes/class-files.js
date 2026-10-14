const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db');
const { requireAuth } = require('../auth');

const router = express.Router();
const dir = path.join(__dirname, '..', 'uploads', 'class-files');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const storage = multer.diskStorage({
  destination: (r, f, cb) => cb(null, dir),
  filename: (r, f, cb) => {
    const ext = path.extname(f.originalname).toLowerCase();
    const base = path.basename(f.originalname, ext)
      .replace(/[^a-zA-Z0-9-_]/g, '_').slice(0, 40);
    const unique = Date.now() + '-' + Math.random().toString(36).slice(2, 8);
    cb(null, `${base}-${unique}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 4 * 1024 * 1024 * 1024 }
});

router.get('/:classId', requireAuth, (req, res) => {
  res.json(db.prepare('SELECT * FROM class_files WHERE class_id=? ORDER BY id DESC').all(req.params.classId));
});

router.post('/', requireAuth, (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      console.error('❌ Multer error:', err);
      if (err.code === 'LIMIT_FILE_SIZE')
        return res.status(413).json({ error: 'حجم فایل بیش از حد' });
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) return res.status(400).json({ error: 'فایل الزامی است' });

    const { class_id, description } = req.body;
    if (!class_id) return res.status(400).json({ error: 'شناسه کلاس الزامی است' });

    const u = db.prepare('SELECT id,name,avatar FROM users WHERE id=?').get(req.user.id);
    const filePath = `/uploads/class-files/${req.file.filename}`;

    console.log('📤 آپلود فایل کلاس:');
    console.log('   کاربر:', u.name);
    console.log('   فایل اصلی:', req.file.originalname);
    console.log('   فایل ذخیره‌شده:', req.file.filename);
    console.log('   مسیر:', filePath);
    console.log('   حجم:', req.file.size, 'bytes');

    const info = db.prepare(`INSERT INTO class_files
      (class_id, user_id, user_name, user_avatar, file_name, file_path, file_size, file_type, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(Number(class_id), u.id, u.name, u.avatar,
        req.file.originalname, filePath, req.file.size,
        req.file.mimetype, description || '');

    res.json(db.prepare('SELECT * FROM class_files WHERE id=?').get(info.lastInsertRowid));
  });
});

router.delete('/:id', requireAuth, (req, res) => {
  const f = db.prepare('SELECT * FROM class_files WHERE id=?').get(req.params.id);
  if (!f) return res.status(404).json({ error: 'یافت نشد' });
  if (f.user_id !== req.user.id && req.user.role !== 'coach')
    return res.status(403).json({ error: 'دسترسی ندارید' });

  const fp = path.join(__dirname, '..', f.file_path.replace('/uploads/', 'uploads/'));
  try { if (fs.existsSync(fp)) fs.unlinkSync(fp); } catch {}

  db.prepare('DELETE FROM class_files WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;