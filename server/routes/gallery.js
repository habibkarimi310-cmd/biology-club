const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db');
const { requireAuth, requireCoach } = require('../auth');

const router = express.Router();
const dir = path.join(__dirname, '..', 'uploads', 'gallery');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const storage = multer.diskStorage({
  destination: (r, f, cb) => cb(null, dir),
  filename: (r, f, cb) => {
    const ext = path.extname(f.originalname).toLowerCase();
    const base = path.basename(f.originalname, ext)
      .replace(/[^a-zA-Z0-9-_]/g, '_').slice(0, 40);
    // اضافه کردن timestamp + random برای جلوگیری از تداخل
    const unique = Date.now() + '-' + Math.random().toString(36).slice(2, 8);
    cb(null, `${base}-${unique}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 4 * 1024 * 1024 * 1024 }
});

router.get('/', requireAuth, (req, res) => {
  res.json(db.prepare('SELECT * FROM gallery ORDER BY id DESC').all());
});

router.post('/', requireAuth, requireCoach, (req, res) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      console.error('❌ Multer error:', err);
      if (err.code === 'LIMIT_FILE_SIZE')
        return res.status(413).json({ error: 'حجم فایل بیش از حد' });
      return res.status(400).json({ error: err.message });
    }

    const { title, class_name, icon, color } = req.body;
    if (!title) return res.status(400).json({ error: 'عنوان الزامی است' });

    const image = req.file ? `/uploads/gallery/${req.file.filename}` : null;

    console.log('📤 آپلود گالری:');
    console.log('   عنوان:', title);
    console.log('   فایل اصلی:', req.file?.originalname);
    console.log('   فایل ذخیره‌شده:', req.file?.filename);
    console.log('   مسیر عمومی:', image);
    console.log('   حجم:', req.file?.size, 'bytes');

    const info = db.prepare(`INSERT INTO gallery (title,class_name,icon,color,image,author_id)
      VALUES (?,?,?,?,?,?)`)
      .run(title, class_name || 'عمومی', icon || '🖼️',
        color || '#d1fae5', image, req.user.id);

    const row = db.prepare('SELECT * FROM gallery WHERE id=?').get(info.lastInsertRowid);
    console.log('   ✅ ذخیره‌شده در دیتابیس:', row);
    res.json(row);
  });
});

router.delete('/:id', requireAuth, requireCoach, (req, res) => {
  const g = db.prepare('SELECT * FROM gallery WHERE id=?').get(req.params.id);
  if (g && g.image) {
    const fp = path.join(__dirname, '..', g.image.replace('/uploads/', 'uploads/'));
    try { if (fs.existsSync(fp)) fs.unlinkSync(fp); } catch {}
  }
  db.prepare('DELETE FROM gallery WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;