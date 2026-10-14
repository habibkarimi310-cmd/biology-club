// ═══════════════════════════════════════════════════
// آزمایشگاه: دسته‌ها + محتوا + آناتومی + نمایشگر OBJ
// ═══════════════════════════════════════════════════
const Exam = {
  threeScene: null, threeCamera: null, threeRenderer: null,
  threeControls: null, threeModel: null,
  currentCategory: null,

  categories: [
    { id: 'cell', ico: '🔬', name: 'سلول‌شناسی', info: 'میتوکندری، هسته، ریبوزوم' },
    { id: 'genetics', ico: '🧬', name: 'ژنتیک', info: 'DNA، RNA، کروموزوم' },
    { id: 'anatomy', ico: '🫀', name: 'آناتومی', info: 'قلب، مغز، ریه' },
    { id: 'plants', ico: '🌿', name: 'گیاه‌شناسی', info: 'فتوسنتز، ریشه، برگ' },
    { id: 'ecology', ico: '🌍', name: 'اکولوژی', info: 'چرخه آب، زیستگاه' },
    { id: 'microbes', ico: '🦠', name: 'میکروارگانیسم', info: 'باکتری، ویروس، قارچ' }
  ],

  organs: {
    brain:  { name: 'مغز', ico: '🧠', desc: 'مرکز کنترل بدن، پردازش اطلاعات و حافظه.' },
    heart:  { name: 'قلب', ico: '❤️', desc: 'پمپ خون به تمام بدن، حدود ۱۰۰ هزار بار در روز.' },
    lungs:  { name: 'ریه‌ها', ico: '🫁', desc: 'تبادل اکسیژن و دی‌اکسید کربن.' },
    liver:  { name: 'کبد', ico: '🫀', desc: 'پاک‌سازی سموم و تولید صفرا.' },
    kidney: { name: 'کلیه', ico: '🫘', desc: 'تصفیه خون و تولید ادرار.' },
    stomach:{ name: 'معده', ico: '🥩', desc: 'هضم غذا با اسید کلریدریک.' }
  },

  async render() {
    const me = JSON.parse(localStorage.getItem('bio_user'));
    const isCoach = me.role === 'coach';
    const models = await API.get('/models');

    $('#mainContent').innerHTML = `
      <div class="page-head">
        <h1>🧪 آزمایشگاه زیست‌شناسی</h1>
        <p>روی هر دسته کلیک کن تا محتوا و فایل‌های آن را ببینی</p>
      </div>

      <div class="grid g3" style="margin-bottom:22px">
        ${this.categories.map(c => `
          <div class="cat-card" data-cat="${c.id}">
            <div class="ci">${c.ico}</div>
            <h4>${c.name}</h4>
            <span>${c.info}</span>
          </div>
        `).join('')}
      </div>

      <div class="card" style="margin-bottom:20px">
        <div class="card-title">🫀 آناتومی تعاملی بدن</div>
        <div class="anatomy-wrap">
          <div>
            <svg viewBox="0 0 200 380" class="body-svg">
              <circle cx="100" cy="42" r="26" class="organ" data-organ="brain"/>
              <path d="M65 80 Q100 70 135 80 L145 200 Q100 220 55 200 Z"
                fill="#f0fdf9" stroke="#10b981" stroke-width="1.5"/>
              <ellipse cx="80" cy="120" rx="17" ry="28" class="organ" data-organ="lungs"/>
              <ellipse cx="120" cy="120" rx="17" ry="28" class="organ" data-organ="lungs"/>
              <path d="M100 130 Q92 118 100 112 Q108 118 100 130 Z"
                class="organ" data-organ="heart" style="fill:#fecaca;stroke:#ef4444"/>
              <ellipse cx="75" cy="165" rx="22" ry="13" class="organ" data-organ="liver"/>
              <ellipse cx="115" cy="168" rx="16" ry="12" class="organ" data-organ="stomach"/>
              <ellipse cx="72" cy="195" rx="9" ry="12" class="organ" data-organ="kidney"/>
              <ellipse cx="128" cy="195" rx="9" ry="12" class="organ" data-organ="kidney"/>
            </svg>
          </div>
          <div>
            <h3 style="font-size:15px;font-weight:800;margin-bottom:10px">🔍 روی اندام کلیک کن</h3>
            <div id="organInfo" class="card" style="background:var(--mint-pale);border-color:var(--mint-light)">
              <div style="font-size:36px;text-align:center;margin-bottom:8px">👆</div>
              <div style="text-align:center;color:var(--muted);font-size:13px">
                یکی از اندام‌ها را انتخاب کن
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-title">🧬 نمایشگر مدل‌های سه‌بعدی (.obj)</div>
        ${isCoach ? `
          <div style="background:var(--mint-pale);border-radius:12px;padding:14px;margin-bottom:14px">
            <div style="font-weight:800;font-size:13px;margin-bottom:9px">📤 آپلود مدل (مربی)</div>
            <div class="grid g2">
              <div class="field"><label>عنوان</label><input id="mTitle"></div>
              <div class="field"><label>دسته</label><input id="mCat" value="آناتومی"></div>
            </div>
            <div class="field"><label>فایل OBJ *</label><input type="file" id="mObj" accept=".obj"></div>
            <div class="field"><label>فایل MTL (اختیاری)</label><input type="file" id="mMtl" accept=".mtl"></div>
            <button class="btn btn-primary" id="uploadModel">📤 آپلود</button>
          </div>
        ` : ''}
        <div id="threeContainer"></div>
        <div style="margin-top:16px">
          <div style="font-weight:800;font-size:13px;margin-bottom:9px">
            📚 مدل‌های موجود (${toFa(models.length)})
          </div>
          ${models.length === 0 ?
            `<div class="empty"><div class="ico">🧬</div><b>هنوز مدلی نیست</b></div>` :
            `<div class="model-grid">
              ${models.map(m => `
                <div class="model-card" data-model='${JSON.stringify(m).replace(/'/g,"&#39;")}'>
                  <div class="mi">🧬</div>
                  <b>${m.title}</b>
                  <span>${m.category}</span>
                </div>
              `).join('')}
            </div>`
          }
        </div>
      </div>
    `;

    $$('.cat-card').forEach(c => {
      c.addEventListener('click', () => {
        const cat = this.categories.find(x => x.id === c.dataset.cat);
        this.openCategory(cat);
      });
    });

    $$('.organ').forEach(el => {
      el.addEventListener('click', () => this.showOrgan(el.dataset.organ));
    });

    $$('.model-card').forEach(card => {
      card.addEventListener('click', () => {
        const m = JSON.parse(card.dataset.model);
        this.loadModel(m.file, m.title);
      });
    });

    if (isCoach) {
      $('#uploadModel').addEventListener('click', () => this.uploadModel());
    }

    this.initThree();
  },

  // ═══════════ باز کردن دسته با محتوا ═══════════
  async openCategory(cat) {
    this.currentCategory = cat;
    const me = JSON.parse(localStorage.getItem('bio_user'));
    const isCoach = me.role === 'coach';

    let materials = [];
    try { materials = await API.get('/lab/' + cat.id); } catch {}

    Modal.open(`
      <h2>${cat.ico} ${cat.name}</h2>
      <p style="color:var(--muted);font-size:13px;margin-bottom:14px">${cat.info}</p>

      ${isCoach ? `
        <div style="background:var(--mint-pale);border-radius:12px;padding:14px;margin-bottom:14px">
          <div style="font-weight:800;font-size:13px;margin-bottom:9px">➕ افزودن محتوا</div>
          <div class="field">
            <label>عنوان</label>
            <input type="text" id="labTitle" placeholder="مثلاً: فیلم آموزشی میتوکندری">
          </div>
          <div class="field">
            <label>توضیح کوتاه</label>
            <input type="text" id="labDesc" placeholder="اختیاری">
          </div>
          <div class="field">
            <label>نوع محتوا</label>
            <select id="labType" style="width:100%;padding:10px;border-radius:10px;border:1.5px solid var(--border)">
              <option value="file">📎 فایل (PDF، Word، PowerPoint، ...)</option>
              <option value="text">📝 متن آموزشی</option>
              <option value="link">🔗 لینک</option>
              <option value="video">🎬 ویدیو (لینک)</option>
              <option value="image">🖼️ تصویر</option>
            </select>
          </div>
          <div class="field" id="labContentField" style="display:none">
            <label id="labContentLabel">محتوا</label>
            <textarea id="labContent" rows="3" style="width:100%;padding:10px;border-radius:10px;border:1.5px solid var(--border)"></textarea>
          </div>
          <div class="field" id="labFileField">
            <label>فایل</label>
            <input type="file" id="labFile">
          </div>
          <button class="btn btn-primary" id="addMaterial">➕ افزودن</button>
        </div>
      ` : ''}

      <div style="max-height:50vh;overflow-y:auto">
        <div style="font-weight:800;font-size:13px;margin-bottom:9px">
          📚 محتواها (${toFa(materials.length)})
        </div>
        ${materials.length === 0 ?
          `<div class="empty"><div class="ico">📂</div>
            <b>هنوز محتوایی اضافه نشده</b>
            <span>${isCoach ? 'از فرم بالا اولین محتوا را اضافه کن' : 'منتظر مربی باش'}</span>
          </div>` :
          materials.map(m => this.renderMaterial(m, isCoach)).join('')
        }
      </div>

      <button class="btn btn-outline btn-block" style="margin-top:14px"
        onclick="Modal.close()">بستن</button>
    `);

    if (isCoach) {
      // تغییر نوع محتوا
      const typeSelect = $('#labType');
      const contentField = $('#labContentField');
      const fileField = $('#labFileField');
      const contentLabel = $('#labContentLabel');

      const updateFields = () => {
        const t = typeSelect.value;
        if (t === 'file' || t === 'image') {
          contentField.style.display = 'none';
          fileField.style.display = 'block';
          $('#labFile').accept = t === 'image' ? 'image/*' : '*/*';
        } else {
          contentField.style.display = 'block';
          fileField.style.display = 'none';
          contentLabel.textContent = t === 'text' ? 'متن آموزشی'
            : t === 'link' ? 'آدرس لینک'
            : t === 'video' ? 'آدرس ویدیو (YouTube/Aparat)'
            : 'محتوا';
        }
      };
      typeSelect.addEventListener('change', updateFields);

      $('#addMaterial').addEventListener('click', () => this.uploadMaterial(cat.id));
    }

    // حذف
    $$('.del-material').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('حذف شود؟')) return;
        try {
          await API.del('/lab/' + btn.dataset.id);
          showToast('🗑️ حذف شد');
          this.openCategory(cat);
        } catch (err) { showToast(err.message, 'err'); }
      });
    });

    // دانلود/نمایش
    $$('.material-action').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        const url = btn.dataset.url;
        const content = btn.dataset.content;

        if (action === 'open') {
          if (url) window.open(url, '_blank');
          else if (content) {
            Modal.open(`
              <h2>📄 محتوا</h2>
              <div class="card" style="white-space:pre-wrap;font-size:13px;line-height:2;
                background:var(--mint-pale);max-height:60vh;overflow-y:auto">
                ${this.escape(content)}
              </div>
              <button class="btn btn-primary btn-block" style="margin-top:12px"
                onclick="Modal.close()">بستن</button>
            `);
          }
        } else if (action === 'download') {
          const a = document.createElement('a');
          a.href = url;
          a.download = '';
          a.click();
        }
      });
    });
  },

  renderMaterial(m, isCoach) {
    const icons = {
      file: '📎', text: '📝', link: '🔗', video: '🎬', image: '🖼️'
    };
    const typeLabels = {
      file: 'فایل', text: 'متن', link: 'لینک', video: 'ویدیو', image: 'تصویر'
    };

    return `
      <div class="card" style="margin-bottom:10px;padding:12px 14px">
        <div style="display:flex;align-items:flex-start;gap:10px">
          <div style="font-size:26px;flex-shrink:0">${icons[m.type] || '📄'}</div>
          <div style="flex:1">
            <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
              <b style="font-size:13.5px">${m.title}</b>
              <span style="font-size:10px;background:var(--mint-pale);
                color:var(--mint-deep);padding:1px 8px;border-radius:20px;font-weight:700">
                ${typeLabels[m.type] || m.type}
              </span>
            </div>
            ${m.description ? `<div style="font-size:11.5px;color:var(--muted);margin-top:3px">${this.escape(m.description)}</div>` : ''}
            <div style="font-size:10.5px;color:var(--muted);margin-top:4px">
              👤 ${m.author_avatar || '🎓'} ${m.author_name || 'نامشخص'} •
              🕐 ${new Date(m.created_at * 1000).toLocaleDateString('fa-IR')}
            </div>
            <div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap">
              ${m.file ? `
                <button class="btn btn-primary btn-sm material-action"
                  data-action="open" data-url="${m.file}">👁️ مشاهده</button>
                <button class="btn btn-outline btn-sm material-action"
                  data-action="download" data-url="${m.file}">⬇️ دانلود</button>
              ` : ''}
              ${(m.type === 'text' || m.type === 'link' || m.type === 'video') ? `
                <button class="btn btn-primary btn-sm material-action"
                  data-action="open" data-content="${this.escapeAttr(m.content)}"
                  data-url="${m.type !== 'text' ? m.content : ''}">
                  ${m.type === 'text' ? '📖 خواندن' : '🔗 باز کردن'}
                </button>
              ` : ''}
              ${isCoach ? `
                <button class="btn btn-danger btn-sm del-material" data-id="${m.id}">🗑️</button>
              ` : ''}
            </div>
          </div>
        </div>
      </div>
    `;
  },

  async uploadMaterial(category) {
    const title = $('#labTitle').value.trim();
    const description = $('#labDesc').value.trim();
    const type = $('#labType').value;
    const content = $('#labContent')?.value.trim() || '';
    const file = $('#labFile')?.files[0];

    if (!title) return showToast('عنوان الزامی است', 'err');
    if ((type === 'file' || type === 'image') && !file)
      return showToast('فایل الزامی است', 'err');
    if ((type === 'text' || type === 'link' || type === 'video') && !content)
      return showToast('محتوا الزامی است', 'err');

    const fd = new FormData();
    fd.append('category', category);
    fd.append('title', title);
    fd.append('description', description);
    fd.append('type', type);
    if (content) fd.append('content', content);
    if (file) fd.append('file', file);

    try {
      showToast('⏳ در حال آپلود...');
      await API.postForm('/lab', fd);
      showToast('✅ اضافه شد');
      const cat = this.categories.find(c => c.id === category);
      this.openCategory(cat);
    } catch (err) { showToast(err.message, 'err'); }
  },

  // ═══════════ Three.js ═══════════
  initThree() {
    const container = $('#threeContainer');
    if (!container) return;
    container.innerHTML = `
      <div class="three-wrap">
        <canvas class="three-canvas" id="threeCanvas"></canvas>
        <div class="three-info" id="threeInfo">🧬 مدلی را انتخاب کن</div>
        <div class="three-hint">🖱️ چرخش: کلیک چپ • زوم: اسکرول</div>
      </div>
    `;
    const canvas = $('#threeCanvas');
    const wrap = canvas.parentElement;
    const w = wrap.clientWidth, h = 420;

    this.threeScene = new THREE.Scene();
    this.threeScene.background = new THREE.Color(0x0f172a);
    this.threeCamera = new THREE.PerspectiveCamera(50, w / h, 0.1, 1000);
    this.threeCamera.position.set(0, 1.5, 3.5);
    this.threeRenderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.threeRenderer.setSize(w, h);
    this.threeRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.threeScene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const d1 = new THREE.DirectionalLight(0xffffff, 1);
    d1.position.set(5, 10, 7); this.threeScene.add(d1);
    const d2 = new THREE.DirectionalLight(0xa7f3d0, 0.4);
    d2.position.set(-5, -5, -5); this.threeScene.add(d2);
    const grid = new THREE.GridHelper(10, 20, 0x10b981, 0x1e293b);
    grid.position.y = -1.2; this.threeScene.add(grid);

    if (THREE.OrbitControls) {
      this.threeControls = new THREE.OrbitControls(this.threeCamera, canvas);
      this.threeControls.enableDamping = true;
      this.threeControls.dampingFactor = 0.08;
      this.threeControls.minDistance = 1.5;
      this.threeControls.maxDistance = 15;
    }

    const animate = () => {
      requestAnimationFrame(animate);
      this.threeControls?.update();
      this.threeRenderer.render(this.threeScene, this.threeCamera);
    };
    animate();

    window.addEventListener('resize', () => {
      const w2 = wrap.clientWidth;
      this.threeCamera.aspect = w2 / h;
      this.threeCamera.updateProjectionMatrix();
      this.threeRenderer.setSize(w2, h);
    });
  },

  loadModel(filename, title) {
    if (!this.threeScene) return;
    const info = $('#threeInfo');
    info.textContent = `⏳ در حال بارگذاری...`;
    if (this.threeModel) this.threeScene.remove(this.threeModel);

    const loader = new THREE.OBJLoader();
    loader.load(
      `/uploads/models/${filename}`,
      (obj) => {
        const box = new THREE.Box3().setFromObject(obj);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 2.5 / maxDim;
        obj.scale.setScalar(scale);
        obj.position.sub(center.multiplyScalar(scale));
        obj.traverse((child) => {
          if (child.isMesh) {
            child.material = new THREE.MeshPhongMaterial({
              color: 0x10b981, shininess: 40, side: THREE.DoubleSide
            });
          }
        });
        this.threeScene.add(obj);
        this.threeModel = obj;
        this.threeCamera.position.set(0, 1.2, 3.2);
        this.threeControls?.target.set(0, 0, 0);
        info.textContent = `🧬 ${title}`;
      },
      (xhr) => {
        if (xhr.total) info.textContent = `⏳ ${Math.round(xhr.loaded / xhr.total * 100)}%`;
      },
      () => { info.textContent = `❌ خطا`; }
    );
  },

  async uploadModel() {
    const title = $('#mTitle').value.trim();
    const category = $('#mCat').value.trim() || 'آناتومی';
    const objFile = $('#mObj').files[0];
    const mtlFile = $('#mMtl').files[0];
    if (!title || !objFile) return showToast('عنوان و فایل الزامی است', 'err');

    const fd = new FormData();
    fd.append('title', title);
    fd.append('category', category);
    fd.append('obj', objFile);
    if (mtlFile) fd.append('mtl', mtlFile);

    try {
      await API.postForm('/models', fd);
      showToast('✅ مدل آپلود شد');
      this.render();
    } catch (err) { showToast(err.message, 'err'); }
  },

  showOrgan(key) {
    const o = this.organs[key];
    if (!o) return;
    $$('.organ').forEach(el => el.classList.remove('active'));
    $$('.organ').forEach(el => { if (el.dataset.organ === key) el.classList.add('active'); });
    $('#organInfo').innerHTML = `
      <div style="font-size:44px;text-align:center;margin-bottom:8px">${o.ico}</div>
      <h4 style="text-align:center;font-size:16px;font-weight:800">${o.name}</h4>
      <p style="text-align:center;font-size:13px;color:#334155;line-height:1.8">${o.desc}</p>
    `;
  },

  escape(s) {
    return String(s || '').replace(/[&<>"']/g,
      c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  },
  escapeAttr(s) {
    return String(s || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
};