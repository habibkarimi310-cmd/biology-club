const Chat = {
  messages: [],
  async render() {
    const me = JSON.parse(localStorage.getItem('bio_user'));
    const list = await API.get('/chat');
    this.messages = list;
    $('#mainContent').innerHTML = `
      <div class="page-head"><h1>💬 گفتگوی انجمن</h1>
        <p>محیط تعاملی برای فعالیت‌های آنلاین و آفلاین</p></div>
      <div class="chat-wrap">
        <div class="chat-body" id="chatBody">
          ${list.length === 0 ? this.emptyHTML() : list.map(m => this.bubble(m, me)).join('')}
        </div>
        <div class="chat-input">
          <input type="text" id="chatText" placeholder="پیامت را بنویس..." autocomplete="off">
          <input type="file" id="chatFile" accept="image/*" style="display:none">
          <button class="icon-btn" id="pickImg">📎</button>
          <button class="icon-btn" id="sendMsg"
            style="background:var(--mint);color:#fff;border-color:var(--mint)">➤</button>
        </div>
      </div>
    `;
    this.scrollBottom();
    $('#pickImg').addEventListener('click', () => $('#chatFile').click());
    $('#sendMsg').addEventListener('click', () => this.send());
    $('#chatText').addEventListener('keydown', e => { if (e.key === 'Enter') this.send(); });
    $('#chatFile').addEventListener('change', () => this.send());
    if (App.socket) {
      App.socket.off('chat:new');
      App.socket.on('chat:new', (m) => {
        this.messages.push(m);
        const body = $('#chatBody');
        if (body) {
          if (this.messages.length === 1) body.innerHTML = '';
          body.insertAdjacentHTML('beforeend', this.bubble(m, me));
          this.scrollBottom();
        }
      });
    }
  },
  bubble(m, me) {
    const isMe = m.user_id === me.id;
    const time = new Date(m.created_at * 1000).toLocaleTimeString('fa-IR',
      { hour: '2-digit', minute: '2-digit' });
    return `
      <div class="msg ${isMe ? 'me' : ''}">
        <div class="mav">${m.avatar || '🎓'}</div>
        <div><div class="bubble">
          <div class="mhead">${m.name} ${m.role === 'coach' ? '🧑‍🏫' : ''}</div>
          ${m.text ? `<div>${this.escape(m.text)}</div>` : ''}
          ${m.image ? `<img class="attachment" src="${m.image}" alt="">` : ''}
          <div class="mtime">${time}</div>
        </div></div>
      </div>`;
  },
  async send() {
    const txt = $('#chatText').value.trim();
    const file = $('#chatFile').files[0];
    if (!txt && !file) return;
    try {
      const fd = new FormData();
      if (txt) fd.append('text', txt);
      if (file) fd.append('image', file);
      const m = await API.postForm('/chat', fd);
      $('#chatText').value = '';
      $('#chatFile').value = '';
      this.messages.push(m);
      const me = JSON.parse(localStorage.getItem('bio_user'));
      const body = $('#chatBody');
      if (this.messages.length === 1) body.innerHTML = '';
      body.insertAdjacentHTML('beforeend', this.bubble(m, me));
      this.scrollBottom();
      App.socket.emit('chat:new', m);
    } catch (err) { showToast(err.message, 'err'); }
  },
  scrollBottom() { const b = $('#chatBody'); if (b) b.scrollTop = b.scrollHeight; },
  emptyHTML() {
    return `<div class="empty"><div class="ico">💬</div>
      <b>هنوز پیامی نیست</b><span>اولین پیام را بفرست</span></div>`;
  },
  escape(s) {
    return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
};