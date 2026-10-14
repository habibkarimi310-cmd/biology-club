// ═══════════════════════════════════════════════════
// کلاس‌های آنلاین: فقط مربی می‌تواند بسازد
// ═══════════════════════════════════════════════════
const express = require('express');
const db = require('../db');
const { requireAuth, requireCoach } = require('../auth');

const router = express.Router();

// ساخت کد یکتای ۶ رقمی
function generateCode() {
  let code;
  let exists = true;
  while (exists) {
    code = Math.floor(100000 + Math.random() * 900000).toString();
    exists = db.prepare('SELECT id FROM classes WHERE code=? AND is_active=1').get(code);
  }
  return code;
}

// ─── لیست کلاس‌های فعال ───
router.get('/', requireAuth, (req, res) => {
  const rows = db.prepare(`
    SELECT c.*,
      (SELECT COUNT(*) FROM users) AS placeholder
    FROM classes c
    WHERE c.is_active = 1
    ORDER BY c.id DESC
  `).all();
  res.json(rows);
});

// ─── دریافت یک کلاس ───
router.get('/:id', requireAuth, (req, res) => {
  const c = db.prepare('SELECT * FROM classes WHERE id=?').get(req.params.id);
  if (!c) return res.status(404).json({ error: 'کلاس یافت نشد' });
  res.json(c);
});

// ─── ساخت کلاس جدید (فقط مربی) ───
router.post('/', requireAuth, requireCoach, (req, res) => {
  const { name, description } = req.body;
  if (!name || !name.trim())
    return res.status(400).json({ error: 'نام کلاس الزامی است' });

  const code = generateCode();
  const info = db.prepare(`
    INSERT INTO classes (name, description, code, coach_id, coach_name)
    VALUES (?, ?, ?, ?, ?)
  `).run(name.trim(), description || '', code, req.user.id, '');

  const cls = db.prepare('SELECT * FROM classes WHERE id=?').get(info.lastInsertRowid);
  res.json(cls);
});

// ─── پایان دادن به کلاس (فقط سازنده) ───
router.delete('/:id', requireAuth, requireCoach, (req, res) => {
  const c = db.prepare('SELECT * FROM classes WHERE id=?').get(req.params.id);
  if (!c) return res.status(404).json({ error: 'کلاس یافت نشد' });
  if (c.coach_id !== req.user.id)
    return res.status(403).json({ error: 'فقط سازنده می‌تواند کلاس را ببندد' });

  db.prepare('UPDATE classes SET is_active=0 WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

// ─── ورود با کد کلاس ───
router.post('/join-by-code', requireAuth, (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'کد الزامی است' });

  const cls = db.prepare('SELECT * FROM classes WHERE code=? AND is_active=1').get(code.trim());
  if (!cls) return res.status(404).json({ error: 'کلاس با این کد پیدا نشد یا بسته شده' });
  res.json(cls);
});

module.exports = router;