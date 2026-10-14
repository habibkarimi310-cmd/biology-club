const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db');
const { requireAuth, requireCoach } = require('../auth');

const router = express.Router();
const dir = path.join(__dirname, '..', 'uploads', 'lab');
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

router.get('/:category', requireAuth, (req, res) => {
  const rows = db.prepare(`
    SELECT m.*, u.name AS author_name, u.avatar AS author_avatar
    FROM lab_materials m
    LEFT JOIN users u ON u.id = m.author_id
    WHERE m.category = ?
    ORDER BY m.id DESC
  `).all(req.params.category);
  res.json(rows);
});

router.post('/', requireAuth, requireCoach, (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      console.error('❌ Multer error:', err);
      if (err.code === 'LIMIT_FILE_SIZE')
        return res.status(413).json({ error: 'حجم فایل بیش از حد' });
      return res.status(400).json({ error: err.message });
    }

    const { category, title, description, type, content } = req.body;
    if (!category || !title || !type)
      return res.status(400).json({ error: 'دسته، عنوان و نوع الزامی است' });

    const file = req.file ? `/uploads/lab/${req.file.filename}` : null;

    console.log('📤 آپلود آزمایشگاه:');
    console.log('   دسته:', category);
    console.log('   عنوان:', title);
    console.log('   نوع:', type);
    console.log('   فایل اصلی:', req.file?.originalname);
    console.log('   فایل ذخیره‌شده:', req.file?.filename);
    console.log('   مسیر:', file);

    if ((type === 'file' || type === 'image') && !file)
      return res.status(400).json({ error: 'فایل الزامی است' });
    if ((type === 'text' || type === 'link' || type === 'video') && !content)
      return res.status(400).json({ error: 'محتوا الزامی است' });

    const info = db.prepare(`
      INSERT INTO lab_materials (category, title, description, type, content, file, author_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(category, title, description || '', type, content || '', file, req.user.id);

    const row = db.prepare(`
      SELECT m.*, u.name AS author_name, u.avatar AS author_avatar
      FROM lab_materials m LEFT JOIN users u ON u.id = m.author_id
      WHERE m.id = ?
    `).get(info.lastInsertRowid);

    res.json(row);
  });
});

router.delete('/:id', requireAuth, requireCoach, (req, res) => {
  const m = db.prepare('SELECT * FROM lab_materials WHERE id=?').get(req.params.id);
  if (!m) return res.status(404).json({ error: 'یافت نشد' });

  if (m.file) {
    const fp = path.join(__dirname, '..', m.file.replace('/uploads/', 'uploads/'));
    try { if (fs.existsSync(fp)) fs.unlinkSync(fp); } catch {}
  }

  db.prepare('DELETE FROM lab_materials WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;