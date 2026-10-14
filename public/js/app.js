const App = {
  socket: null,
  currentView: 'home',
  history: [],

  init() {
    if (API.getToken()) this.start();
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') Modal.close();
    });
  },

  start() {
    $('#authScreen').classList.add('hidden');
    $('#appScreen').classList.remove('hidden');
    this.refreshHeader();
    this.bindSidebar();
    this.bindHeader();
    this.connectSocket();
    this.startClock();
    this.navigate('home');
  },

  startClock() {
    setInterval(() => {
      const el = $('#clock');
      if (el) el.textContent = new Date().toLocaleTimeString('fa-IR',
        { hour: '2-digit', minute: '2-digit' });
    }, 1000);
  },

  refreshHeader() {
    const u = JSON.parse(localStorage.getItem('bio_user'));
    if (!u) return;
    $('#topName').textContent = u.name;
    $('#topRole').textContent = u.role === 'coach' ? '🧑‍🏫 مربی' : '🎓 دانش‌آموز';
    $('#topAvatar').innerHTML = u.avatar?.startsWith('http') ?
      `<img src="${u.avatar}">` : (u.avatar || '🎓');
    $('#dropName').textContent = u.name;
    $('#dropUser').textContent = '@' + u.username;
  },

  bindSidebar() {
    $$('.side-item').forEach(b => {
      b.addEventListener('click', () => this.navigate(b.dataset.view));
    });
  },

  bindHeader() {
    const btn = $('#profileBtn');
    const dd = $('#profileDropdown');
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      dd.classList.toggle('hidden');
    });
    document.addEventListener('click', () => dd.classList.add('hidden'));
    dd.addEventListener('click', e => e.stopPropagation());
    $$('.dropdown-item').forEach(item => {
      item.addEventListener('click', () => {
        const act = item.dataset.act;
        dd.classList.add('hidden');
        if (act === 'profile') Profile.open();
        if (act === 'logout') Profile.logout();
        if (act === 'settings') showToast('⚙️ به‌زودی...');
      });
    });
    $$('.topnav button').forEach(b => {
      b.addEventListener('click', () => {
        const n = b.dataset.nav;
        if (n === 'notes') this.showNotes();
        if (n === 'contact') this.showContact();
        if (n === 'back') this.back();
      });
    });
  },

  async navigate(view) {
    if (this.currentView !== view) this.history.push(this.currentView);
    this.currentView = view;
    $$('.side-item').forEach(b => b.classList.toggle('active', b.dataset.view === view));
    try {
      if (view === 'home') await Home.render();
      if (view === 'exam') await Exam.render();
      if (view === 'classroom') await Classroom.render();
      if (view === 'chat') await Chat.render();
      if (view === 'gallery') await Gallery.render();
      if (view === 'quiz') await Quiz.render();
      if (view === 'leaderboard') await Leaderboard.render();
      if (view === 'reports') await Reports.render();
    } catch (err) {
      if (err.status === 401) return this.forceLogout();
      showToast(err.message, 'err');
    }
  },

  back() {
    const prev = this.history.pop() || 'home';
    this.navigate(prev);
  },

  forceLogout() {
    API.clearToken();
    localStorage.removeItem('bio_user');
    location.reload();
  },

  connectSocket() {
    if (this.socket) return;
    this.socket = io({ auth: { token: API.getToken() } });
    this.socket.on('online:count', (n) => {
      const el = $('#onlineCount');
      if (el) el.textContent = toFa(n);
    });
  },

  showNotes() {
    const notes = JSON.parse(localStorage.getItem('bio_notes') || '[]');
    Modal.open(`
      <h2>📝 یادداشت‌های من</h2>
      <div class="field"><label>یادداشت جدید</label>
        <textarea id="newNote" rows="3"></textarea></div>
      <button class="btn btn-primary" id="addNote">➕ افزودن</button>
      <div style="margin-top:16px" id="notesList">
        ${notes.length === 0 ? `<div class="empty"><div class="ico">📝</div>
          <b>یادداشتی نداری</b></div>` :
          notes.map((n, i) => `<div class="card" style="margin-bottom:8px;padding:11px 14px">
            <div style="font-size:13px;margin-bottom:5px">${n}</div>
            <button class="btn btn-danger btn-sm del-note" data-idx="${i}">🗑️</button>
          </div>`).join('')}
      </div>
      <button class="btn btn-outline btn-block" style="margin-top:12px"
        onclick="Modal.close()">بستن</button>
    `);
    $('#addNote').addEventListener('click', () => {
      const t = $('#newNote').value.trim();
      if (!t) return;
      notes.push(t);
      localStorage.setItem('bio_notes', JSON.stringify(notes));
      this.showNotes();
    });
    $$('.del-note').forEach(b => {
      b.addEventListener('click', () => {
        notes.splice(Number(b.dataset.idx), 1);
        localStorage.setItem('bio_notes', JSON.stringify(notes));
        this.showNotes();
      });
    });
  },

  showContact() {
    Modal.open(`
      <h2>📞 تماس با ما</h2>
      <div class="field"><label>موضوع</label><input id="cSubject"></div>
      <div class="field"><label>متن پیام</label><textarea id="cBody" rows="4"></textarea></div>
      <button class="btn btn-primary" id="sendContact">📩 ارسال</button>
      <button class="btn btn-outline btn-block" style="margin-top:8px"
        onclick="Modal.close()">انصراف</button>
    `);
    $('#sendContact').addEventListener('click', async () => {
      try {
        await API.post('/users/contact', {
          subject: $('#cSubject').value.trim(),
          body: $('#cBody').value.trim()
        });
        showToast('✅ پیام ارسال شد');
        Modal.close();
      } catch (err) { showToast(err.message, 'err'); }
    });
  }
};

const Reports = {
  async render() {
    const s = await API.get('/stats');
    const pct = s.totalAnswers ? Math.round((s.correctAnswers / s.totalAnswers) * 100) : 0;
    $('#mainContent').innerHTML = `
      <div class="page-head"><h1>📊 داشبورد آماری</h1>
        <p>آمار کامل انجمن</p></div>
      <div class="grid g4" style="margin-bottom:20px">
        <div class="stat"><div class="lbl">👥 اعضا</div><div class="val">${toFa(s.totalUsers)}</div></div>
        <div class="stat"><div class="lbl">🎓 دانش‌آموز</div><div class="val">${toFa(s.totalStudents)}</div></div>
        <div class="stat"><div class="lbl">🧑‍🏫 مربی</div><div class="val">${toFa(s.totalCoaches)}</div></div>
        <div class="stat"><div class="lbl">💬 پیام‌ها</div><div class="val">${toFa(s.totalMessages)}</div></div>
        <div class="stat"><div class="lbl">❓ سوالات</div><div class="val">${toFa(s.totalQuizzes)}</div></div>
        <div class="stat"><div class="lbl">✍️ پاسخ‌ها</div><div class="val">${toFa(s.totalAnswers)}</div></div>
        <div class="stat"><div class="lbl">✅ درست</div><div class="val">${toFa(s.correctAnswers)}</div></div>
        <div class="stat"><div class="lbl">🧬 مدل‌ها</div><div class="val">${toFa(s.totalModels || 0)}</div></div>
      </div>
      <div class="card">
        <div class="card-title">📈 نرخ پاسخ‌های درست</div>
        <div style="height:16px;background:var(--mint-pale);border-radius:20px;overflow:hidden">
          <div style="height:100%;width:${pct}%;
            background:linear-gradient(90deg,var(--mint),var(--mint-deep));
            border-radius:20px;transition:.4s"></div>
        </div>
        <div style="margin-top:10px;font-size:13px;color:var(--muted)">
          <b style="color:var(--mint-dark);font-size:15px">${toFa(pct)}%</b> پاسخ‌ها درست بوده
        </div>
      </div>`;
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());