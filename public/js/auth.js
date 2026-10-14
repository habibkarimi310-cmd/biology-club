// ═══════════════════════════════════════════════════
// ورود و ثبت‌نام
// ═══════════════════════════════════════════════════
(function () {
  console.log('✅ auth.js لود شد');

  let selectedRole = 'student';

  // ─── تب‌ها ───
  const tabs = document.querySelectorAll('.tab');
  console.log('📑 تعداد تب‌ها:', tabs.length);

  tabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      e.preventDefault();
      console.log('🖱️ کلیک روی تب:', tab.dataset.tab);

      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      const isLogin = tab.dataset.tab === 'login';
      const loginForm = document.getElementById('loginForm');
      const registerForm = document.getElementById('registerForm');

      if (isLogin) {
        loginForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
      } else {
        loginForm.classList.add('hidden');
        registerForm.classList.remove('hidden');
      }
    });
  });

  // ─── انتخاب نقش ───
  document.querySelectorAll('.role-card').forEach(card => {
    card.addEventListener('click', (e) => {
      e.preventDefault();
      document.querySelectorAll('.role-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      selectedRole = card.dataset.role;
      console.log('👤 نقش انتخابی:', selectedRole);
    });
  });

  // ─── فرم ورود ───
  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log('🔐 ارسال فرم ورود');
    const alertEl = document.getElementById('loginAlert');
    alertEl.classList.add('hidden');

    try {
      const res = await API.post('/users/login', {
        username: document.getElementById('loginUser').value.trim(),
        password: document.getElementById('loginPass').value,
        code: document.getElementById('loginCode').value.trim()
      });
      API.setToken(res.token);
      localStorage.setItem('bio_user', JSON.stringify(res.user));
      showToast(`🎉 خوش آمدی ${res.user.name}!`);
      setTimeout(() => App.start(), 600);
    } catch (err) {
      console.error('❌ خطای ورود:', err);
      alertEl.textContent = err.message;
      alertEl.classList.remove('hidden');
    }
  });

  // ─── فرم ثبت‌نام ───
  document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log('📝 ارسال فرم ثبت‌نام');
    const alertEl = document.getElementById('registerAlert');
    alertEl.classList.add('hidden');

    try {
      const res = await API.post('/users/register', {
        name: document.getElementById('regName').value.trim(),
        username: document.getElementById('regUser').value.trim(),
        password: document.getElementById('regPass').value,
        code: document.getElementById('regCode').value.trim(),
        role: selectedRole
      });
      API.setToken(res.token);
      localStorage.setItem('bio_user', JSON.stringify(res.user));
      showToast(`🎉 خوش آمدی ${res.user.name}!`);
      setTimeout(() => App.start(), 600);
    } catch (err) {
      console.error('❌ خطای ثبت‌نام:', err);
      alertEl.textContent = err.message;
      alertEl.classList.remove('hidden');
    }
  });

  console.log('✅ auth.js آماده است');
})();