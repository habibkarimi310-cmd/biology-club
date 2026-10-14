const express = require('express');
const db = require('../db');
const { requireAuth, requireCoach } = require('../auth');

const router = express.Router();

router.get('/', requireAuth, (req, res) => {
  res.json(db.prepare(`SELECT q.*,
    (SELECT is_correct FROM answers a WHERE a.quiz_id=q.id AND a.user_id=?) AS my_answer
    FROM quizzes q ORDER BY q.id DESC`).all(req.user.id));
});

router.post('/', requireAuth, requireCoach, (req, res) => {
  const { question, opt1, opt2, opt3, opt4, correct, category } = req.body;
  if (!question || !opt1 || !opt2 || !opt3 || !opt4 || !correct)
    return res.status(400).json({ error: 'همه فیلدها الزامی است' });
  if (correct < 1 || correct > 4)
    return res.status(400).json({ error: 'پاسخ درست بین ۱ تا ۴' });

  const info = db.prepare(`INSERT INTO quizzes (question,opt1,opt2,opt3,opt4,correct,category,author_id)
    VALUES (?,?,?,?,?,?,?,?)`).run(question, opt1, opt2, opt3, opt4, correct, category || 'عمومی', req.user.id);
  res.json(db.prepare('SELECT * FROM quizzes WHERE id=?').get(info.lastInsertRowid));
});

router.delete('/:id', requireAuth, requireCoach, (req, res) => {
  db.prepare('DELETE FROM quizzes WHERE id=?').run(req.params.id);
  db.prepare('DELETE FROM answers WHERE quiz_id=?').run(req.params.id);
  res.json({ ok: true });
});

router.post('/:id/answer', requireAuth, (req, res) => {
  const qid = Number(req.params.id);
  const { answer } = req.body;
  const quiz = db.prepare('SELECT * FROM quizzes WHERE id=?').get(qid);
  if (!quiz) return res.status(404).json({ error: 'سوال یافت نشد' });

  const already = db.prepare('SELECT * FROM answers WHERE user_id=? AND quiz_id=?')
    .get(req.user.id, qid);
  if (already) return res.status(409).json({ error: 'قبلاً پاسخ داده‌ای' });

  const isCorrect = Number(answer) === quiz.correct ? 1 : 0;
  db.prepare('INSERT INTO answers (user_id,quiz_id,is_correct) VALUES (?,?,?)')
    .run(req.user.id, qid, isCorrect);
  if (isCorrect) db.prepare('UPDATE users SET score = score + 10 WHERE id=?').run(req.user.id);

  const score = db.prepare('SELECT score FROM users WHERE id=?').get(req.user.id).score;
  res.json({ isCorrect: !!isCorrect, correct: quiz.correct, newScore: score });
});

module.exports = router;