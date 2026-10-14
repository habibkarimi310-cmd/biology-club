const express = require('express');
const db = require('../db');
const { requireAuth } = require('../auth');
const router = express.Router();

router.get('/', requireAuth, (req, res) => {
  res.json(db.prepare(`SELECT u.id,u.username,u.name,u.avatar,u.role,u.score,
    (SELECT COUNT(*) FROM answers a WHERE a.user_id=u.id AND a.is_correct=1) AS correct_count,
    (SELECT COUNT(*) FROM answers a WHERE a.user_id=u.id) AS total_count
    FROM users u ORDER BY u.score DESC`).all());
});

module.exports = router;