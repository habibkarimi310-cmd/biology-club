const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { signToken, requireAuth, MEMBER_CODE } = require('../auth');

const router = express.Router();

router.post('/register', (req, res) => {
  const { username, name, password, role, code } = req.body;
  if (!username || !name || !password || !role || !code)
    return res.status(400).json({ error: 'همه فیلدها الزامی است' });
  if (code.trim().toUpperCase() !== MEMBER_CODE)
    return res.status(403).json({ error: 'کد عضویت اشتباه است' });
  if (!['student', 'coach'].includes(role))
    return res.status(400).json({ error: 'نقش نامعتبر' });
  if (password.length < 6)
    return res.status(400).json({ error: 'رمز حداقل ۶ کاراکتر' });

  const exists = db.prepare('SELECT id FROM users WHERE username=?').get(username);
  if (exists) return res.status(409).json({ error: 'این نام کاربری گرفته شده' });

  const hash = bcrypt.hashSync(password, 10);
  const avatar = role === 'coach' ? '🧑‍🏫' : '🎓';
  const info = db.prepare(`INSERT INTO users (username,name,password,role,avatar)
    VALUES (?,?,?,?,?)`).run(username, name, hash, role, avatar);
  const user = db.prepare('SELECT id,username,name,role,avatar,score FROM users WHERE id=?')
    .get(info.lastInsertRowid);
  res.json({ token: signToken(user), user });
});

router.post('/login', (req, res) => {
  const { username, password, code } = req.body;
  if (!username || !password || !code)
    return res.status(400).json({ error: 'همه فیلدها الزامی است' });
  if (code.trim().toUpperCase() !== MEMBER_CODE)
    return res.status(403).json({ error: 'کد عضویت اشتباه است' });

  const user = db.prepare('SELECT * FROM users WHERE username=?').get(username);
  if (!user || !bcrypt.compareSync(password, user.password))
    return res.status(401).json({ error: 'نام کاربری یا رمز اشتباه' });

  const clean = { id: user.id, username: user.username, name: user.name,
    role: user.role, avatar: user.avatar, score: user.score };
  res.json({ token: signToken(user), user: clean });
});

router.get('/me', requireAuth, (req, res) => {
  const u = db.prepare('SELECT id,username,name,role,avatar,score FROM users WHERE id=?')
    .get(req.user.id);
  if (!u) return res.status(404).json({ error: 'کاربر یافت نشد' });
  res.json(u);
});

router.put('/me', requireAuth, (req, res) => {
  const { name, avatar, password } = req.body;
  const u = db.prepare('SELECT * FROM users WHERE id=?').get(req.user.id);
  if (!u) return res.status(404).json({ error: 'کاربر یافت نشد' });

  const newName = name?.trim() || u.name;
  const newAvatar = avatar || u.avatar;
  let newPass = u.password;

  if (password && password.length >= 6) newPass = bcrypt.hashSync(password, 10);
  else if (password) return res.status(400).json({ error: 'رمز جدید حداقل ۶ کاراکتر' });

  db.prepare('UPDATE users SET name=?, avatar=?, password=? WHERE id=?')
    .run(newName, newAvatar, newPass, u.id);
  res.json(db.prepare('SELECT id,username,name,role,avatar,score FROM users WHERE id=?').get(u.id));
});

router.post('/contact', requireAuth, (req, res) => {
  const { subject, body } = req.body;
  if (!body) return res.status(400).json({ error: 'متن پیام الزامی است' });
  db.prepare('INSERT INTO contact (user_id,subject,body) VALUES (?,?,?)')
    .run(req.user.id, subject || 'بدون موضوع', body);
  res.json({ ok: true });
});

module.exports = router;