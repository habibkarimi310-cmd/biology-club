const Gallery = {
  async render() {
    const me = JSON.parse(localStorage.getItem('bio_user'));
    const isCoach = me.role === 'coach';
    const list = await API.get('/gallery');
    const fallback = [
      { title: 'میکروسکوپ سلول', class_name: 'سلول‌شناسی', icon: '🔬', color: '#d1fae5' },
      { title: 'آناتومی قلب', class_name: 'آناتومی', icon: '❤️', color: '#fee2e2' },
      { title: 'چرخه آب', class_name: 'اکولوژی', icon: '💧', color: '#dbeafe' },
      { title: 'فتوسنتز', class_name: 'گیاه‌شناسی', icon: '🌿', color: '#dcfce7' },
      { title: 'DNA', class_name: 'ژنتیک', icon: '🧬', color: '#f3e8ff' },
      { title: 'مغز', class_name: 'عصب‌شناسی', icon: '🧠', color: '#fef3c7' }
    ];
    const items = list.length > 0 ? list : fallback;
    $('#mainContent').innerHTML = `
      <div class="page-head"><h1>🖼️ گالری کلاس‌ها</h1>
        <p>تصاویر و ضبط‌های کلاس‌های انجمن</p></div>
      ${isCoach ? `
        <div class="card" style="margin-bottom:16px">
          <div class="card-title">➕ افزودن تصویر (مربی)</div>
          <div class="grid g2">
            <div class="field"><label>عنوان</label><input id="gTitle"></div>
            <div class="field"><label>نام کلاس</label><input id="gClass"></div>
            <div class="field"><label>آیکن</label><input id="gIcon" value="🖼️"></div>
            <div class="field"><label>رنگ</label>
              <input type="color" id="gColor" value="#d1fae5" style="height:44px"></div>
            <div class="field" style="grid-column:1/-1">
              <label>تصویر</label><input type="file" id="gFile" accept="image/*">
            </div>
          </div>
          <button class="btn btn-primary" id="addGal">➕ افزودن</button>
        </div>
      ` : ''}
      <div class="grid g3">
        ${items.map(g => `
          <div class="gal-item">
            <div class="gal-thumb" style="background:${g.color}">
              ${g.image ? `<img src="${g.image}">` : g.icon}
            </div>
            <div class="gal-cap">
              <b>${g.title}</b><span>${g.class_name || 'عمومی'}</span>
            </div>
          </div>
        `).join('')}
      </div>
    `;
    if (isCoach) {
      $('#addGal').addEventListener('click', async () => {
        try {
          const fd = new FormData();
          fd.append('title', $('#gTitle').value.trim());
          fd.append('class_name', $('#gClass').value.trim());
          fd.append('icon', $('#gIcon').value.trim());
          fd.append('color', $('#gColor').value);
          const f = $('#gFile').files[0];
          if (f) fd.append('image', f);
          if (!fd.get('title')) return showToast('عنوان الزامی است', 'err');
          await API.postForm('/gallery', fd);
          showToast('✅ اضافه شد');
          this.render();
        } catch (err) { showToast(err.message, 'err'); }
      });
    }
  }
};