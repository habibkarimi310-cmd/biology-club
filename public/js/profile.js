const Profile = {
  async open() {
    const user = JSON.parse(localStorage.getItem('bio_user'));
    const avatars = ['🎓','🧑‍🏫','👨‍🔬','👩‍🔬','🧬','🔬','🌱','🌿','🍀','🦠','🐝','🦋'];

    Modal.open(`
      <h2>👤 پروفایل من</h2>
      <div class="field">
        <label>آواتار</label>
        <div style="display:flex;flex-wrap:wrap;gap:7px;margin-top:6px">
          ${avatars.map(a => `
            <button type="button" class="avatar-pick" data-av="${a}"
              style="width:44px;height:44px;border-radius:12px;font-size:22px;
                     border:2px solid ${a === user.avatar ? 'var(--mint)' : 'var(--border)'};
                     background:${a === user.avatar ? 'var(--mint-pale)' : '#fff'}">
              ${a}
            </button>
          `).join('')}
        </div>
      </div>
      <div class="field">
        <label>نام و نام خانوادگی</label>
        <input type="text" id="profName" value="${user.name}">
      </div>
      <div class="field">
        <label>رمز عبور جدید (خالی = بدون تغییر)</label>
        <input type="password" id="profPass" placeholder="••••••••">
      </div>
      <div style="display:flex;gap:8px;margin-top:14px">
        <button class="btn btn-primary" id="saveProfile">💾 ذخیره</button>
        <button class="btn btn-outline" id="closeProfile">انصراف</button>
      </div>
    `);

    let selectedAvatar = user.avatar;
    $$('.avatar-pick').forEach(btn => {
      btn.addEventListener('click', () => {
        $$('.avatar-pick').forEach(b => {
          b.style.borderColor = 'var(--border)';
          b.style.background = '#fff';
        });
        btn.style.borderColor = 'var(--mint)';
        btn.style.background = 'var(--mint-pale)';
        selectedAvatar = btn.dataset.av;
      });
    });

    $('#closeProfile').addEventListener('click', () => Modal.close());

    $('#saveProfile').addEventListener('click', async () => {
      try {
        const body = { name: $('#profName').value.trim(), avatar: selectedAvatar };
        const pass = $('#profPass').value;
        if (pass) body.password = pass;
        const updated = await API.put('/users/me', body);
        localStorage.setItem('bio_user', JSON.stringify(updated));
        App.refreshHeader();
        Modal.close();
        showToast('✅ پروفایل به‌روزرسانی شد');
      } catch (err) { showToast(err.message, 'err'); }
    });
  },

  logout() {
    if (!confirm('از حساب خود خارج می‌شوید؟')) return;
    API.clearToken();
    localStorage.removeItem('bio_user');
    location.reload();
  }
};

const Modal = {
  open(html) {
    $('#modalRoot').innerHTML = `<div class="modal-bg"><div class="modal">${html}</div></div>`;
    $('#modalRoot').querySelector('.modal-bg').addEventListener('click', (e) => {
      if (e.target.classList.contains('modal-bg')) Modal.close();
    });
  },
  close() { $('#modalRoot').innerHTML = ''; }
};