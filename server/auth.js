const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'biology-club-secret-1403';
const MEMBER_CODE = process.env.MEMBER_CODE || 'BIO-1403';

function signToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    SECRET, { expiresIn: '7d' }
  );
}

function verifyToken(token) {
  try { return jwt.verify(token, SECRET); }
  catch { return null; }
}

function requireAuth(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'توکن ارسال نشده' });
  const p = verifyToken(token);
  if (!p) return res.status(401).json({ error: 'توکن نامعتبر' });
  req.user = p; next();
}

function requireCoach(req, res, next) {
  if (req.user.role !== 'coach')
    return res.status(403).json({ error: 'این عملیات فقط برای مربی است' });
  next();
}

module.exports = { signToken, verifyToken, requireAuth, requireCoach, MEMBER_CODE };