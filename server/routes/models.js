const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db');
const { requireAuth, requireCoach } = require('../auth');

const router = express.Router();
const dir = path.join(__dirname, '..', 'uploads', 'models');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

// ═══ نام‌گذاری با timestamp + random برای جلوگیری از تداخل ═══
const storage = multer.diskStorage({
  destination: (r, f, cb) => cb(null, dir),
  filename: (r, f, cb) => {
    const ext = path.extname(f.originalname).toLowerCase();
    const base = path.basename(f.originalname, ext)
      .replace(/[^a-zA-Z0-9-_]/g, '_').slice(0, 40);
    const unique = Date.now() + '-' + Math.random().toString(36).slice(2, 8);
    const filename = `${base}-${unique}${ext}`;
    console.log('📁 ذخیره فایل با نام:', filename);
    cb(null, filename);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 4 * 1024 * 1024 * 1024 }
});

// ═══ لیست همه مدل‌ها ═══
router.get('/', requireAuth, (req, res) => {
  const rows = db.prepare('SELECT * FROM models3d ORDER BY id DESC').all();
  console.log('📋 لیست مدل‌ها:', rows.length);
  rows.forEach(r => console.log(`   #${r.id} — ${r.title} → ${r.file}`));
  res.json(rows);
});

// ═══ آپلود مدل (فقط مربی) ═══
router.post('/', requireAuth, requireCoach, (req, res) => {
  upload.fields([
    { name: 'obj', maxCount: 1 },
    { name: 'mtl', maxCount: 1 }
  ])(req, res, (err) => {
    if (err) {
      console.error('❌ Multer:', err.code, err.message);
      if (err.code === 'LIMIT_FILE_SIZE')
        return res.status(413).json({ error: 'فایل بیش از ۴ گیگابایت' });
      return res.status(400).json({ error: err.message });
    }

    const { title, category } = req.body;
    if (!title) return res.status(400).json({ error: 'عنوان الزامی است' });
    if (!req.files?.obj?.[0])
      return res.status(400).json({ error: 'فایل OBJ الزامی است' });

    const objFile = req.files.obj[0];
    const mtlFile = req.files.mtl?.[0];

    console.log('\n═══════════════════════════════════════');
    console.log('📤 آپلود مدل سه‌بعدی:');
    console.log('   عنوان:', title);
    console.log('   دسته:', category);
    console.log('   فایل اصلی OBJ:', objFile.originalname);
    console.log('   فایل ذخیره‌شده:', objFile.filename);
    console.log('   حجم:', (objFile.size / 1024 / 1024).toFixed(2), 'MB');
    if (mtlFile) {
      console.log('   فایل MTL:', mtlFile.originalname, '→', mtlFile.filename);
    }
    console.log('═══════════════════════════════════════\n');

    const info = db.prepare(`INSERT INTO models3d (title, category, file, size, author_id)
      VALUES (?, ?, ?, ?, ?)`)
      .run(title, category || 'آناتومی', objFile.filename, objFile.size, req.user.id);

    const row = db.prepare('SELECT * FROM models3d WHERE id=?').get(info.lastInsertRowid);

    res.json({
      id: row.id,
      title: row.title,
      category: row.category,
      file: row.file,
      mtl: mtlFile?.filename || null,
      size: row.size,
      original_name: objFile.originalname
    });
  });
});

// ═══ حذف مدل ═══
router.delete('/:id', requireAuth, requireCoach, (req, res) => {
  const m = db.prepare('SELECT * FROM models3d WHERE id=?').get(req.params.id);
  if (!m) return res.status(404).json({ error: 'یافت نشد' });

  const fp = path.join(dir, m.file);
  if (fs.existsSync(fp)) fs.unlinkSync(fp);

  db.prepare('DELETE FROM models3d WHERE id=?').run(req.params.id);
  console.log('🗑️ مدل حذف شد:', m.title, '→', m.file);
  res.json({ ok: true });
});

module.exports = router;