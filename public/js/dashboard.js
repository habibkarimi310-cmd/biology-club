const Home = {
  async render() {
    const user = JSON.parse(localStorage.getItem('bio_user'));
    const stats = await API.get('/stats');

    $('#mainContent').innerHTML = `
      <div class="page-head">
        <h1>🏠 خانه — خوش آمدی ${user.name}!</h1>
        <p>به انجمن زیست‌شناسی مدرسه خوش آمدی</p>
      </div>
      <div class="grid g4" style="margin-bottom:20px">
        <div class="stat">
          <div class="lbl">👥 اعضا</div>
          <div class="val">${toFa(stats.totalUsers)}</div>
          <div class="sub">${toFa(stats.totalStudents)} دانش‌آموز • ${toFa(stats.totalCoaches)} مربی</div>
        </div>
        <div class="stat">
          <div class="lbl">💬 پیام‌ها</div>
          <div class="val">${toFa(stats.totalMessages)}</div>
          <div class="sub">در گفتگوی انجمن</div>
        </div>
        <div class="stat">
          <div class="lbl">🧬 مدل‌های سه‌بعدی</div>
          <div class="val">${toFa(stats.totalModels || 0)}</div>
          <div class="sub">آپلود در آزمایشگاه</div>
        </div>
        <div class="stat">
          <div class="lbl">🏆 صدرنشین</div>
          <div class="val" style="font-size:17px">${stats.topUser?.name || '—'}</div>
          <div class="sub">${toFa(stats.topUser?.score || 0)} امتیاز</div>
        </div>
      </div>
      <h2 style="font-size:16px;font-weight:800;margin-bottom:12px">🎯 بخش‌های انجمن</h2>
      <div class="grid g3">
        ${this.tile('exam', '🧪', 'آزمایشگاه', '۶ دسته زیستی + مدل‌های سه‌بعدی OBJ')}
        ${this.tile('classroom', '🎥', 'کلاس آنلاین', 'ویدیو و صدای زنده + تخته سفید')}
        ${this.tile('chat', '💬', 'گفتگوی انجمن', 'چت زنده با آپلود عکس')}
        ${this.tile('gallery', '🖼️', 'گالری', 'تصاویر و ضبط کلاس‌ها')}
        ${this.tile('quiz', '❓', 'کویز', 'هر پاسخ درست ۱۰ امتیاز')}
        ${this.tile('leaderboard', '🏆', 'جدول امتیازات', 'رتبه‌بندی اعضا')}
      </div>
    `;

    $$('.home-card').forEach(c => {
      c.addEventListener('click', () => App.navigate(c.dataset.view));
    });
  },

  tile(view, ico, title, desc) {
    return `<div class="home-card" data-view="${view}">
      <div class="hc-ico">${ico}</div>
      <h3>${title}</h3><p>${desc}</p>
    </div>`;
  }
};