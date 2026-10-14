const express = require('express');
const db = require('../db');
const { requireAuth } = require('../auth');
const router = express.Router();

router.get('/', requireAuth, (req, res) => {
  res.json({
    totalUsers: db.prepare('SELECT COUNT(*) c FROM users').get().c,
    totalStudents: db.prepare("SELECT COUNT(*) c FROM users WHERE role='student'").get().c,
    totalCoaches: db.prepare("SELECT COUNT(*) c FROM users WHERE role='coach'").get().c,
    totalMessages: db.prepare('SELECT COUNT(*) c FROM messages').get().c,
    totalQuizzes: db.prepare('SELECT COUNT(*) c FROM quizzes').get().c,
    totalAnswers: db.prepare('SELECT COUNT(*) c FROM answers').get().c,
    correctAnswers: db.prepare('SELECT COUNT(*) c FROM answers WHERE is_correct=1').get().c,
    totalGallery: db.prepare('SELECT COUNT(*) c FROM gallery').get().c,
    totalModels: db.prepare('SELECT COUNT(*) c FROM models3d').get().c,
    topUser: db.prepare('SELECT name, score FROM users ORDER BY score DESC LIMIT 1').get()
  });
});

module.exports = router;