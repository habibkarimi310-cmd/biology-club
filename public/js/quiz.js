const Quiz = {
  async render() {
    const user = JSON.parse(localStorage.getItem('bio_user'));
    const isCoach = user.role === 'coach';
    const list = await API.get('/quiz');
    $('#mainContent').innerHTML = `
      <div class="page-head"><h1>❓ کویز زیست‌شناسی</h1>
        <p>هر پاسخ درست = ۱۰ امتیاز</p></div>
      ${isCoach ? `
        <div class="card" style="margin-bottom:16px">
          <div class="card-title">➕ ساخت سوال جدید (مربی)</div>
          <div class="grid g2">
            <div class="field" style="grid-column:1/-1">
              <label>متن سوال</label><input type="text" id="qText"></div>
            <div class="field"><label>گزینه ۱</label><input id="q1"></div>
            <div class="field"><label>گزینه ۲</label><input id="q2"></div>
            <div class="field"><label>گزینه ۳</label><input id="q3"></div>
            <div class="field"><label>گزینه ۴</label><input id="q4"></div>
            <div class="field"><label>پاسخ درست</label>
              <select id="qCorrect">
                <option value="1">گزینه ۱</option><option value="2">گزینه ۲</option>
                <option value="3">گزینه ۳</option><option value="4">گزینه ۴</option>
              </select></div>
            <div class="field"><label>دسته</label><input id="qCat" placeholder="عمومی"></div>
          </div>
          <button class="btn btn-primary" id="addQuiz">➕ افزودن سوال</button>
        </div>
      ` : ''}
      <div class="card">
        <div class="card-title">📋 سوالات (${toFa(list.length)})</div>
        ${list.length === 0 ? this.emptyState() : list.map(q => this.renderQuiz(q, isCoach)).join('')}
      </div>
    `;
    if (isCoach) {
      $('#addQuiz').addEventListener('click', async () => {
        try {
          await API.post('/quiz', {
            question: $('#qText').value.trim(),
            opt1: $('#q1').value.trim(), opt2: $('#q2').value.trim(),
            opt3: $('#q3').value.trim(), opt4: $('#q4').value.trim(),
            correct: Number($('#qCorrect').value),
            category: $('#qCat').value.trim() || 'عمومی'
          });
          showToast('✅ سوال اضافه شد');
          this.render();
        } catch (err) { showToast(err.message, 'err'); }
      });
    }
    $$('.quiz-opt').forEach(btn => {
      btn.addEventListener('click', () => this.answer(btn));
    });
    $$('.del-quiz').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('حذف شود؟')) return;
        await API.del('/quiz/' + btn.dataset.id);
        showToast('🗑️ حذف شد');
        this.render();
      });
    });
  },
  renderQuiz(q, isCoach) {
    const answered = q.my_answer !== null && q.my_answer !== undefined;
    const opts = [q.opt1, q.opt2, q.opt3, q.opt4];
    return `
      <div class="quiz-item">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
          <span style="font-size:11px;background:var(--mint-pale);
            color:var(--mint-deep);padding:2px 9px;border-radius:20px;font-weight:700">
            ${q.category || 'عمومی'}</span>
          ${answered ? `<span style="font-size:11px;font-weight:700;
            color:${q.my_answer ? 'var(--mint-dark)' : 'var(--danger)'}">
            ${q.my_answer ? '✅ درست' : '❌ غلط'}</span>` : ''}
          ${isCoach ? `<button class="btn btn-danger btn-sm del-quiz" data-id="${q.id}"
            style="margin-inline-start:auto">🗑️</button>` : ''}
        </div>
        <div class="qq">${q.question}</div>
        <div class="quiz-opts">
          ${opts.map((o, i) => `
            <button class="quiz-opt" data-qid="${q.id}" data-idx="${i+1}"
              ${answered ? 'disabled' : ''}>${i+1}) ${o}</button>
          `).join('')}
        </div>
      </div>`;
  },
  async answer(btn) {
    try {
      const res = await API.post(`/quiz/${btn.dataset.qid}/answer`,
        { answer: Number(btn.dataset.idx) });
      if (res.isCorrect) showToast(`🎉 درست! +۱۰ امتیاز — مجموع: ${toFa(res.newScore)}`);
      else showToast(`❌ غلط. پاسخ درست: ${res.correct}`, 'err');
      this.render();
    } catch (err) { showToast(err.message, 'err'); }
  },
  emptyState() {
    const me = JSON.parse(localStorage.getItem('bio_user'));
    return `<div class="empty"><div class="ico">❓</div>
      <b>هنوز سوالی ثبت نشده</b>
      <span>${me.role === 'coach' ? 'از فرم بالا سوال بساز' : 'منتظر مربی باش'}</span></div>`;
  }
};