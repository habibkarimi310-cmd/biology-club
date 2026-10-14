// ═══════════════════════════════════════════════════
// کلاس آنلاین — نسخه نهایی با onclick مستقیم
// ═══════════════════════════════════════════════════
window.Classroom = {
  classes: [],
  currentClass: null,
  localStream: null, audioTrack: null, videoTrack: null,
  screenStream: null, micOn: false, camOn: false, sharingScreen: false,
  handRaised: false,
  peers: {},
  userInfoMap: {},
  mySocketId: null,
  mediaRecorder: null, recordedChunks: [],
  threeScene: null, threeCamera: null, threeRenderer: null, threeControls: null, threeModel: null,

  getIceServers() {
    const c = window.APP_CONFIG || {};
    const s = [{ urls: c.STUN_URL || 'stun:stun.l.google.com:19302' }];
    if (c.TURN_HOST) {
      s.push({
        urls: [`turn:${c.TURN_HOST}:${c.TURN_PORT}?transport=udp`,
               `turn:${c.TURN_HOST}:${c.TURN_PORT}?transport=tcp`],
        username: c.TURN_USER, credential: c.TURN_PASS
      });
    }
    return s;
  },

  async render() {
    console.log('🎬 Classroom.render');
    if (this.currentClass) return this.renderRoom();
    return this.renderLobby();
  },

  // ═══════════════════════════════════════════════════
  //                   لابی
  // ═══════════════════════════════════════════════════
  async renderLobby() {
    const me = JSON.parse(localStorage.getItem('bio_user'));
    const isCoach = me.role === 'coach';
    try { this.classes = await API.get('/classes'); } catch { this.classes = []; }

    document.getElementById('mainContent').innerHTML = `
      <div class="page-head">
        <h1>🎥 کلاس‌های آنلاین</h1>
        <p>${isCoach ? 'کلاس بساز یا وارد شو' : 'انتخاب کن یا با کد وارد شو'}</p>
      </div>

      ${isCoach ? `
        <div class="card class-create-card" style="margin-bottom:20px">
          <div class="card-title">✨ ساخت کلاس جدید <span class="coach-badge">مخصوص مربی</span></div>
          <div class="grid g2">
            <div class="field"><label>نام کلاس</label><input type="text" id="clsName"></div>
            <div class="field"><label>توضیح</label><input type="text" id="clsDesc"></div>
          </div>
          <button class="btn btn-primary" onclick="Classroom.createClass()" style="margin-top:6px">🚀 ساخت و شروع</button>
        </div>
      ` : ''}

      <div class="card" style="margin-bottom:20px">
        <div class="card-title">🔑 ورود با کد کلاس</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <input type="text" id="joinCode" placeholder="کد ۶ رقمی"
            style="flex:1;min-width:180px;padding:11px 14px;border:1.5px solid var(--border);
              border-radius:11px;font-size:15px;letter-spacing:3px;text-align:center;font-weight:700">
          <button class="btn btn-primary" onclick="Classroom.joinByCode()">ورود</button>
        </div>
      </div>

      <h2 style="font-size:16px;font-weight:800;margin-bottom:12px">
        📋 کلاس‌های فعال (${toFa(this.classes.length)})
      </h2>

      ${this.classes.length === 0
        ? `<div class="empty"><div class="ico">🎥</div><b>هیچ کلاسی نیست</b></div>`
        : `<div class="class-list">${this.classes.map(c => this.renderClassCard(c, isCoach, me)).join('')}</div>`}
    `;
  },

  renderClassCard(c, isCoach, me) {
    const isOwner = isCoach && c.coach_id === me.id;
    return `
      <div class="class-card">
        <div class="class-card-head">
          <div class="class-icon">🎓</div>
          <div style="flex:1">
            <div class="class-name">${this.escape(c.name)}</div>
            ${c.description ? `<div class="class-desc">${this.escape(c.description)}</div>` : ''}
            <div class="class-meta">
              <span>🔑 کد: <b class="class-code">${c.code}</b></span>
              ${isOwner ? '<span class="owner-badge">کلاس شما</span>' : ''}
            </div>
          </div>
        </div>
        <div style="display:flex;gap:6px;margin-top:10px">
          <button class="btn btn-primary btn-sm" onclick="Classroom.enterClass(${c.id})" style="flex:1">🎥 ورود</button>
          ${isOwner ? `<button class="btn btn-danger btn-sm" onclick="Classroom.deleteClass(${c.id})">🗑️</button>` : ''}
        </div>
      </div>
    `;
  },

  async createClass() {
    const name = document.getElementById('clsName')?.value.trim();
    const description = document.getElementById('clsDesc')?.value.trim();
    if (!name) return showToast('نام کلاس الزامی است', 'err');
    try {
      const cls = await API.post('/classes', { name, description });
      showToast(`✅ کد: ${cls.code}`);
      this.enterClass(cls.id);
    } catch (err) { showToast(err.message, 'err'); }
  },

  async joinByCode() {
    const code = document.getElementById('joinCode')?.value.trim();
    if (!code) return showToast('کد را وارد کن', 'err');
    try {
      const cls = await API.post('/classes/join-by-code', { code });
      this.enterClass(cls.id);
    } catch (err) { showToast(err.message, 'err'); }
  },

  async deleteClass(id) {
    if (!confirm('این کلاس بسته شود؟')) return;
    try {
      await API.del('/classes/' + id);
      showToast('✅ بسته شد');
      this.renderLobby();
    } catch (err) { showToast(err.message, 'err'); }
  },

  async enterClass(id) {
    try {
      const cls = await API.get('/classes/' + id);
      this.currentClass = cls;
      App.socket?.emit('room:join', { roomId: cls.id });
      this.renderRoom();
    } catch (err) { showToast(err.message, 'err'); }
  },

  // ═══════════════════════════════════════════════════
  //                   اتاق
  // ═══════════════════════════════════════════════════
  async renderRoom() {
    const me = JSON.parse(localStorage.getItem('bio_user'));
    let files = [];
    try { files = await API.get('/class-files/' + this.currentClass.id); } catch {}

    document.getElementById('mainContent').innerHTML = `
      <div class="page-head">
        <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
          <button class="btn btn-outline btn-sm" onclick="Classroom.confirmLeave()">← بازگشت</button>
          <h1 style="margin:0;font-size:20px">🎥 ${this.escape(this.currentClass.name)}</h1>
          <span class="class-code-badge">کد: ${this.currentClass.code}</span>
        </div>
      </div>

      <div class="class-wrap">
        <div class="class-main">
          <div id="videoGrid" class="video-grid">
            <div class="video-tile" id="localTile">
              <video id="localVideo" autoplay muted playsinline></video>
              <div class="vname">🎓 من</div>
              <div class="vbadges" id="localBadges"></div>
            </div>
          </div>

          <!-- ═══ کنترل‌ها با onclick مستقیم ═══ -->
          <div class="meet-controls">
            <button class="ctrl-btn ${this.micOn ? '' : 'off'}" id="btnMic" onclick="Classroom.toggleMic()">
              ${this.micOn ? '🎤' : '🔇'}
            </button>
            <button class="ctrl-btn ${this.camOn ? 'active' : 'off'}" id="btnCam" onclick="Classroom.toggleCam()">📷</button>
            <button class="ctrl-btn ${this.sharingScreen ? 'active' : ''}" id="btnShare" onclick="Classroom.toggleShare()">🖥️</button>
            <button class="ctrl-btn ${this.handRaised ? 'active' : ''}" id="btnHand" onclick="Classroom.toggleHand()">✋</button>
            <button class="ctrl-btn" id="btnRecord" onclick="Classroom.toggleRecord()">⏺️</button>
            <button class="ctrl-btn" onclick="Classroom.toggleFullscreen()">⛶</button>
            <button class="ctrl-btn" id="btnBoard" onclick="Classroom.toggleBoard()">✏️</button>
            <button class="ctrl-btn" id="btn3D" onclick="Classroom.toggle3D()">🧬</button>
            <button class="ctrl-btn" onclick="document.getElementById('classFileInput').click()">📁</button>
            <button class="ctrl-btn danger" onclick="Classroom.confirmLeave()">📞</button>
          </div>

          <!-- ═══ تخته سفید ═══ -->
          <div id="boardWrap" class="hidden" style="margin-top:14px;width:100%">
  <div class="wb-toolbar-fixed">
    <div class="wb-row">
      <span class="wb-lbl">قلم:</span>
      <button class="wbt active" data-tool="pen" onclick="WB.setTool('pen',this);return false;">✏️</button>
      <button class="wbt" data-tool="marker" onclick="WB.setTool('marker',this);return false;">🖊️</button>
      <button class="wbt" data-tool="highlighter" onclick="WB.setTool('highlighter',this);return false;">🖍️</button>
      <button class="wbt" data-tool="neon" onclick="WB.setTool('neon',this);return false;">💫</button>
      <button class="wbt" data-tool="rainbow" onclick="WB.setTool('rainbow',this);return false;">🌈</button>
      <button class="wbt" data-tool="spray" onclick="WB.setTool('spray',this);return false;">💥</button>
      <button class="wbt" data-tool="eraser" onclick="WB.setTool('eraser',this);return false;">🧽</button>
      <span class="wb-sep"></span>
      <span class="wb-lbl">خط:</span>
      <button class="wbt" data-tool="line" onclick="WB.setTool('line',this);return false;">📏</button>
      <button class="wbt" data-tool="arrow" onclick="WB.setTool('arrow',this);return false;">➡️</button>
      <button class="wbt" data-tool="dblarrow" onclick="WB.setTool('dblarrow',this);return false;">↔️</button>
      <button class="wbt" data-tool="dashed" onclick="WB.setTool('dashed',this);return false;">┅</button>
      <button class="wbt" data-tool="wave" onclick="WB.setTool('wave',this);return false;">〰️</button>
    </div>
    <div class="wb-row">
      <span class="wb-lbl">شکل:</span>
      <button class="wbt" data-tool="rect" onclick="WB.setTool('rect',this);return false;">▭</button>
      <button class="wbt" data-tool="rectFill" onclick="WB.setTool('rectFill',this);return false;">▬</button>
      <button class="wbt" data-tool="circle" onclick="WB.setTool('circle',this);return false;">◯</button>
      <button class="wbt" data-tool="circleFill" onclick="WB.setTool('circleFill',this);return false;">⬤</button>
      <button class="wbt" data-tool="triangle" onclick="WB.setTool('triangle',this);return false;">△</button>
      <button class="wbt" data-tool="diamond" onclick="WB.setTool('diamond',this);return false;">◇</button>
      <button class="wbt" data-tool="starShape" onclick="WB.setTool('starShape',this);return false;">✦</button>
    </div>
    <div class="wb-row">
      <span class="wb-lbl">استمپ:</span>
      <button class="wbt" data-tool="heart" onclick="WB.setTool('heart',this);return false;">❤️</button>
      <button class="wbt" data-tool="dna" onclick="WB.setTool('dna',this);return false;">🧬</button>
      <button class="wbt" data-tool="cell" onclick="WB.setTool('cell',this);return false;">🔬</button>
      <button class="wbt" data-tool="star" onclick="WB.setTool('star',this);return false;">⭐</button>
      <button class="wbt" data-tool="check" onclick="WB.setTool('check',this);return false;">✅</button>
      <button class="wbt" data-tool="cross" onclick="WB.setTool('cross',this);return false;">❌</button>
      <button class="wbt" data-tool="question" onclick="WB.setTool('question',this);return false;">❓</button>
      <span class="wb-sep"></span>
      <button class="wbt" data-tool="text" onclick="WB.setTool('text',this);return false;">🅰️</button>
    </div>
    <div class="wb-row">
      <span class="wb-lbl">رنگ:</span>
      <button class="wb-col" style="background:#0f172a" onclick="WB.setColor('#0f172a',this);return false;"></button>
      <button class="wb-col" style="background:#ef4444" onclick="WB.setColor('#ef4444',this);return false;"></button>
      <button class="wb-col" style="background:#f59e0b" onclick="WB.setColor('#f59e0b',this);return false;"></button>
      <button class="wb-col" style="background:#10b981;border:2px solid #0f172a" onclick="WB.setColor('#10b981',this);return false;"></button>
      <button class="wb-col" style="background:#3b82f6" onclick="WB.setColor('#3b82f6',this);return false;"></button>
      <button class="wb-col" style="background:#8b5cf6" onclick="WB.setColor('#8b5cf6',this);return false;"></button>
      <button class="wb-col" style="background:#ec4899" onclick="WB.setColor('#ec4899',this);return false;"></button>
      <span class="wb-lbl" style="margin-inline-start:12px">ضخامت:</span>
      <input type="range" id="wbSizeSlider" min="1" max="30" value="4" style="width:80px"
        oninput="WB.setSize(this.value)">
      <span id="wbSizeVal" style="font-size:12px;font-weight:700">۴</span>
      <span class="wb-sep"></span>
      <button class="wbt" onclick="WB.undo();return false;">↶</button>
      <button class="wbt" onclick="WB.redo();return false;">↷</button>
      <button class="wbt danger" onclick="WB.clear();return false;">🗑️</button>
      <button class="wbt" onclick="WB.save();return false;">💾</button>
    </div>
  </div>
  <canvas id="whiteboard"></canvas>
</div>

          <!-- ═══ سه‌بعدی ═══ -->
          <div id="model3dWrap" class="hidden" style="margin-top:14px;width:100%">
            <div class="model3d-header">
              <span>🧬 نمایشگر سه‌بعدی</span>
              <div style="margin-inline-start:auto;display:flex;gap:6px;align-items:center">
                <select id="modelSelect" class="model-select" onchange="Classroom.onModelChange(this)">
                  <option value="">— انتخاب مدل —</option>
                </select>
                <button class="wbt" onclick="Classroom.modelRotate()">🔄</button>
                <button class="wbt" onclick="Classroom.modelReset()">🎯</button>
                <button class="wbt danger" onclick="Classroom.toggle3D()">✖️</button>
              </div>
            </div>
            <div class="three-wrap">
              <canvas class="three-canvas" id="threeCanvas" height="420"></canvas>
              <div class="three-hint">🖱️ چرخش: کلیک چپ • زوم: اسکرول</div>
              <div class="three-info" id="threeInfo">مدلی انتخاب کن</div>
            </div>
          </div>

          <!-- واکنش‌ها -->
          <div class="reaction-bar">
            ${['👍','👏','❤️','😮','😂','🎉','🔥','💯','❓','🙋'].map(e =>
              `<button class="rxn" onclick="Classroom.react('${e}')">${e}</button>`).join('')}
          </div>
        </div>

        <!-- سایدبار -->
        <aside class="class-side">
          <div class="card" style="margin-bottom:10px">
            <div class="card-title">👥 شرکت‌کننده‌ها (<span id="participantsCount">۱</span>)</div>
            <div id="participants"></div>
          </div>

          <div class="card" style="margin-bottom:10px">
            <div class="card-title">📁 فایل‌ها <span id="filesCount" class="files-count">${toFa(files.length)}</span></div>
            <div class="file-upload-box">
              <input type="file" id="classFileInput" style="display:none" onchange="Classroom.onFileSelected(this)">
              <input type="text" id="classFileDesc" placeholder="توضیح (اختیاری)"
                style="width:100%;padding:8px;border:1.5px solid var(--border);
                  border-radius:8px;font-size:12px;margin-bottom:6px">
              <button class="btn btn-primary btn-sm" onclick="document.getElementById('classFileInput').click()" style="width:100%">📤 آپلود فایل</button>
            </div>
            <div id="uploadProgress" class="hidden" style="margin-top:8px">
              <div class="upload-progress-bar"><div id="uploadProgressFill"></div></div>
              <div style="font-size:11px;color:var(--muted);margin-top:4px;text-align:center" id="uploadProgressText">۰٪</div>
            </div>
            <div id="classFilesList" class="class-files-list">
              ${files.length === 0
                ? `<div class="empty" style="padding:16px 8px"><div class="ico" style="font-size:28px">📂</div>
                    <b style="font-size:12px">هنوز فایلی نیست</b></div>`
                : files.map(f => this.renderFileItem(f, me)).join('')}
            </div>
          </div>

          <div class="card">
            <div class="card-title">💬 چت کلاس</div>
            <div id="classChatMessages" style="max-height:140px;overflow-y:auto;margin-bottom:8px;font-size:12px;line-height:1.8"></div>
            <div style="display:flex;gap:6px">
              <input type="text" id="classChatInput" placeholder="پیام..."
                style="flex:1;padding:8px;border:1.5px solid var(--border);border-radius:8px;font-size:12px"
                onkeydown="if(event.key==='Enter')Classroom.sendChat()">
              <button class="btn btn-primary btn-sm" onclick="Classroom.sendChat()">➤</button>
            </div>
          </div>
        </aside>
      </div>
    `;

    this.setupSocket();
    this.mySocketId = App.socket?.id || null;

    if (this.localStream) {
      const lv = document.getElementById('localVideo');
      if (lv) lv.srcObject = this.localStream;
    }
    this.renderParticipantsFromState();
    console.log('✅ اتاق رندر شد');
  },

  // ═══════════════════════════════════════════════════
  //       توابع کنترلی — همه با onclick صدا زده می‌شن
  // ═══════════════════════════════════════════════════

  // ─── میکروفن ───
  async toggleMic() {
    console.log('🎤 toggleMic');
    if (!this.audioTrack) {
      try {
        const a = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
        });
        this.audioTrack = a.getAudioTracks()[0];
        if (!this.localStream) this.localStream = new MediaStream();
        this.localStream.addTrack(this.audioTrack);
        await this.attachTrackToPeers(this.audioTrack, 'audio');
        this.micOn = true;
      } catch (e) {
        console.error(e);
        showToast('دسترسی به میکروفن نیست', 'err');
        return;
      }
    } else {
      this.micOn = !this.micOn;
      this.audioTrack.enabled = this.micOn;
    }
    const b = document.getElementById('btnMic');
    if (b) {
      b.textContent = this.micOn ? '🎤' : '🔇';
      b.classList.toggle('off', !this.micOn);
    }
    this.emitMediaState();
    this.updateLocalBadges();
  },

  // ─── دوربین ───
  async toggleCam() {
    console.log('📷 toggleCam');
    if (!this.camOn) {
      try {
        const v = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } }
        });
        this.videoTrack = v.getVideoTracks()[0];
        if (!this.localStream) this.localStream = new MediaStream();
        this.localStream.addTrack(this.videoTrack);
        await this.attachTrackToPeers(this.videoTrack, 'video');
        const lv = document.getElementById('localVideo');
        if (lv) lv.srcObject = this.localStream;
        this.camOn = true;
        const b = document.getElementById('btnCam');
        b?.classList.add('active');
        b?.classList.remove('off');
      } catch (e) {
        console.error(e);
        showToast('دسترسی به دوربین نیست', 'err');
        return;
      }
    } else {
      this.videoTrack?.stop();
      this.videoTrack = null;
      this.camOn = false;
      const lv = document.getElementById('localVideo');
      if (lv) lv.srcObject = this.localStream?.getVideoTracks().length ? this.localStream : null;
      const b = document.getElementById('btnCam');
      b?.classList.remove('active');
      b?.classList.add('off');
    }
    this.emitMediaState();
    this.updateLocalBadges();
  },

  // ─── اشتراک صفحه ───
  async toggleShare() {
    console.log('🖥️ toggleShare');
    if (!this.sharingScreen) {
      try {
        const s = await navigator.mediaDevices.getDisplayMedia({ video: true });
        this.screenStream = s;
        const track = s.getVideoTracks()[0];
        await this.attachTrackToPeers(track, 'video');
        this.sharingScreen = true;
        const lv = document.getElementById('localVideo');
        if (lv) lv.srcObject = s;
        document.getElementById('btnShare')?.classList.add('active');
        track.onended = () => {
          this.sharingScreen = false;
          document.getElementById('btnShare')?.classList.remove('active');
          if (lv) lv.srcObject = this.localStream;
          this.emitMediaState();
        };
      } catch (e) { console.error(e); }
    } else {
      this.screenStream?.getTracks().forEach(t => t.stop());
      this.sharingScreen = false;
      document.getElementById('btnShare')?.classList.remove('active');
      const lv = document.getElementById('localVideo');
      if (lv) lv.srcObject = this.localStream;
    }
    this.emitMediaState();
    this.updateLocalBadges();
  },

  // ─── دست ───
  toggleHand() {
    console.log('✋ toggleHand');
    this.handRaised = !this.handRaised;
    App.socket?.emit(this.handRaised ? 'hand:raise' : 'hand:lower');
    document.getElementById('btnHand')?.classList.toggle('active', this.handRaised);
    this.updateLocalBadges();
  },

  // ─── ضبط ───
  toggleRecord() {
    if (!this.mediaRecorder) this.startRecording();
    else this.stopRecording();
  },

  // ─── تمام‌صفحه ───
  toggleFullscreen() {
    const g = document.getElementById('videoGrid');
    if (!document.fullscreenElement) g?.requestFullscreen();
    else document.exitFullscreen();
  },

  // ─── تخته سفید ───
  toggleBoard() {
    console.log('✏️ toggleBoard');
    const w = document.getElementById('boardWrap');
    if (!w) return;
    const willShow = w.classList.contains('hidden');
    w.classList.toggle('hidden');
    document.getElementById('btnBoard')?.classList.toggle('active', willShow);
    if (willShow) {
      setTimeout(() => {
        const canvas = document.getElementById('whiteboard');
        if (canvas && window.Whiteboard) {
          Whiteboard._bound = false;
          Whiteboard._delegation = false;
          Whiteboard.init(canvas);
        }
      }, 200);
    }
  },

  // ─── تخته: انتخاب ابزار ───
  setTool(tool, btn) {
    console.log('🔧 tool:', tool);
    document.querySelectorAll('.wbt[data-tool]').forEach(b => b.classList.remove('active'));
    btn?.classList.add('active');
    if (window.Whiteboard) window.Whiteboard.tool = tool;
  },

  // ─── تخته: انتخاب رنگ ───
  setColor(color, btn) {
    console.log('🎨 color:', color);
    document.querySelectorAll('.wb-col').forEach(b => {
      b.style.border = '2px solid transparent';
    });
    if (btn) btn.style.border = '2px solid #0f172a';
    if (window.Whiteboard) window.Whiteboard.color = color;
  },

  // ─── تخته: ضخامت ───
  setSize(v) {
    const size = Number(v);
    const el = document.getElementById('wbSizeVal');
    if (el) el.textContent = String(size).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
    if (window.Whiteboard) window.Whiteboard.size = size;
  },

  wbUndo() { window.Whiteboard?.undo(); },
  wbRedo() { window.Whiteboard?.redo(); },
  wbClear() { window.Whiteboard?.clear(); },
  wbSave() { window.Whiteboard?.save(); },

  // ─── سه‌بعدی ───
  async toggle3D() {
    console.log('🧬 toggle3D');
    const w = document.getElementById('model3dWrap');
    if (!w) return;
    const willShow = w.classList.contains('hidden');
    w.classList.toggle('hidden');
    document.getElementById('btn3D')?.classList.toggle('active', willShow);

    if (willShow) {
      setTimeout(async () => {
        this.initThree();
        await this.loadModelsList();
      }, 200);
      App.socket?.emit('class:model-show', { show: true });
    } else {
      App.socket?.emit('class:model-hide');
    }
  },

  modelRotate() {
    if (this.threeControls) {
      this.threeControls.autoRotate = !this.threeControls.autoRotate;
      showToast(this.threeControls.autoRotate ? '🔄 روشن' : '⏸️ خاموش');
    }
  },

  modelReset() {
    if (this.threeCamera) {
      this.threeCamera.position.set(0, 1.2, 3.2);
      this.threeControls?.target.set(0, 0, 0);
    }
  },

  async onModelChange(sel) {
    const file = sel.value;
    const opt = sel.selectedOptions[0];
    const title = opt?.dataset.title || '';
    if (!file) return;
    console.log('🔄 model:', file);
    this.loadModel(file, title);
    App.socket?.emit('class:model-show', { show: true, file, title });
  },

  // ─── خروج ───
  confirmLeave() {
    if (!confirm('از کلاس خارج می‌شوید؟')) return;
    this.leaveClass();
  },

  // ═══════════ فایل‌ها ═══════════
  onFileSelected(input) {
    if (input.files[0]) {
      this.uploadFile(input.files[0]);
      input.value = '';
    }
  },

  renderFileItem(f, me) {
    const sizeMB = (f.file_size / 1024 / 1024).toFixed(1);
    const sizeGB = (f.file_size / 1024 / 1024 / 1024).toFixed(2);
    const sizeText = f.file_size > 1024 * 1024 * 1024 ? sizeGB + ' GB' : sizeMB + ' MB';
    const ext = (f.file_name.split('.').pop() || '').toLowerCase();
    const iconMap = {
      pdf:'📕',doc:'📘',docx:'📘',xls:'📗',xlsx:'📗',ppt:'📙',pptx:'📙',
      jpg:'🖼️',jpeg:'🖼️',png:'🖼️',gif:'🖼️',webp:'🖼️',
      mp4:'🎬',mov:'🎬',avi:'🎬',mkv:'🎬',mp3:'🎵',wav:'🎵',
      zip:'🗜️',rar:'🗜️','7z':'🗜️',obj:'🧬',stl:'🧬',glb:'🧬',gltf:'🧬',
      txt:'📄',md:'📄'
    };
    const icon = iconMap[ext] || '📎';
    const canDelete = f.user_id === me.id || me.role === 'coach';
    return `
      <div class="class-file-item" data-id="${f.id}">
        <div class="file-icon">${icon}</div>
        <div class="file-info">
          <div class="file-name">${this.escape(f.file_name)}</div>
          <div class="file-meta">
            <span>${f.user_avatar || '🎓'} ${this.escape(f.user_name)}</span>
            <span>• ${sizeText}</span>
          </div>
        </div>
        <div class="file-actions">
          <a href="${f.file_path}" download="${this.escape(f.file_name)}" class="file-btn">⬇️</a>
          ${canDelete ? `<button class="file-btn danger" onclick="Classroom.deleteFile(${f.id})">🗑️</button>` : ''}
        </div>
      </div>
    `;
  },

  async deleteFile(id) {
    if (!confirm('حذف شود؟')) return;
    try {
      await API.del('/class-files/' + id);
      App.socket?.emit('class:file-delete', Number(id));
      document.querySelector(`.class-file-item[data-id="${id}"]`)?.remove();
      this.updateFilesCount();
      showToast('🗑️ حذف شد');
    } catch (err) { showToast(err.message, 'err'); }
  },

  uploadFile(file) {
    const description = document.getElementById('classFileDesc')?.value.trim() || '';
    const fd = new FormData();
    fd.append('file', file);
    fd.append('class_id', this.currentClass.id);
    fd.append('description', description);

    const prog = document.getElementById('uploadProgress');
    const fill = document.getElementById('uploadProgressFill');
    const text = document.getElementById('uploadProgressText');
    prog?.classList.remove('hidden');

    const xhr = new XMLHttpRequest();
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const pct = Math.round((e.loaded / e.total) * 100);
        if (fill) fill.style.width = pct + '%';
        if (text) text.textContent = toFa(pct) + '٪';
      }
    });
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const nf = JSON.parse(xhr.responseText);
          this.addFileToList(nf);
          App.socket?.emit('class:file-new', nf);
          showToast('✅ آپلود شد');
          const d = document.getElementById('classFileDesc');
          if (d) d.value = '';
        } catch {}
      } else {
        let msg = 'خطا در آپلود';
        try { msg = JSON.parse(xhr.responseText).error || msg; } catch {}
        showToast(msg, 'err');
      }
      prog?.classList.add('hidden');
    });
    xhr.addEventListener('error', () => {
      showToast('خطای شبکه', 'err');
      prog?.classList.add('hidden');
    });
    xhr.open('POST', '/api/class-files');
    xhr.setRequestHeader('Authorization', 'Bearer ' + API.getToken());
    xhr.send(fd);
  },

  addFileToList(f) {
    const me = JSON.parse(localStorage.getItem('bio_user'));
    const list = document.getElementById('classFilesList');
    if (!list) return;
    if (list.querySelector('.empty')) list.innerHTML = '';
    list.insertAdjacentHTML('afterbegin', this.renderFileItem(f, me));
    this.updateFilesCount();
  },

  updateFilesCount() {
    const el = document.getElementById('filesCount');
    if (el) el.textContent = toFa(document.querySelectorAll('.class-file-item').length);
  },

  // ═══════════ چت ═══════════
  sendChat() {
    const input = document.getElementById('classChatInput');
    const txt = input?.value.trim();
    if (!txt) return;
    const me = JSON.parse(localStorage.getItem('bio_user'));
    const msg = { name: me.name, avatar: me.avatar, text: txt, time: Date.now() };
    App.socket?.emit('class:chat', msg);
    this.appendClassChat(msg);
    if (input) input.value = '';
  },

  appendClassChat(m) {
    const box = document.getElementById('classChatMessages');
    if (!box) return;
    const t = new Date(m.time).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
    box.insertAdjacentHTML('beforeend', `
      <div style="margin-bottom:6px">
        <b style="color:var(--mint-deep)">${m.avatar || '🎓'} ${m.name}</b>
        <span style="font-size:10px;color:var(--muted)">${t}</span>
        <div>${m.text}</div>
      </div>
    `);
    box.scrollTop = box.scrollHeight;
  },

  // ═══════════ واکنش ═══════════
  react(emoji) {
    App.socket?.emit('reaction', emoji);
    this.popReaction(emoji);
  },

  popReaction(emoji) {
    const el = document.createElement('div');
    el.textContent = emoji;
    el.style.cssText = `position:fixed;bottom:100px;right:40px;font-size:56px;
      pointer-events:none;z-index:9999;animation:floatUp 1.6s ease forwards;`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1700);
  },

  // ═══════════ Three.js ═══════════
  initThree() {
    const canvas = document.getElementById('threeCanvas');
    if (!canvas || this.threeRenderer) return;
    const wrap = canvas.parentElement;
    const w = wrap.clientWidth, h = 420;

    this.threeScene = new THREE.Scene();
    this.threeScene.background = new THREE.Color(0x0f172a);
    this.threeCamera = new THREE.PerspectiveCamera(50, w / h, 0.1, 1000);
    this.threeCamera.position.set(0, 1.2, 3.2);
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
  },

  async loadModelsList() {
    try {
      const models = await API.get('/models');
      const sel = document.getElementById('modelSelect');
      if (!sel) return;
      sel.innerHTML = '<option value="">— انتخاب مدل —</option>';
      models.forEach(m => {
        const sizeMB = (m.size / 1024 / 1024).toFixed(1);
        sel.insertAdjacentHTML('beforeend',
          `<option value="${m.file}" data-title="${this.escape(m.title)}">
            ${this.escape(m.title)} — ${sizeMB}MB
          </option>`);
      });
    } catch (err) { console.error(err); }
  },

  loadModel(filename, title) {
    if (!this.threeScene) return;
    const info = document.getElementById('threeInfo');
    if (info) info.textContent = `⏳ ${title}...`;
    if (this.threeModel) this.threeScene.remove(this.threeModel);

    const loader = new THREE.OBJLoader();
    loader.load(`/uploads/models/${filename}?t=${Date.now()}`,
      (obj) => {
        obj.traverse((c) => {
          if (c.isMesh && c.geometry) {
            c.geometry.computeVertexNormals();
          }
        });
        const box = new THREE.Box3().setFromObject(obj);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 2.5 / maxDim;
        obj.scale.setScalar(scale);
        obj.position.sub(center.multiplyScalar(scale));
        obj.traverse(c => {
          if (c.isMesh) c.material = new THREE.MeshPhongMaterial({
            color: 0x10b981, shininess: 40, side: THREE.DoubleSide
          });
        });
        this.threeScene.add(obj);
        this.threeModel = obj;
        if (info) info.textContent = `🧬 ${title}`;
      },
      null,
      (err) => { console.error(err); if (info) info.textContent = '❌ خطا'; }
    );
  },

  // ═══════════ Socket ═══════════
  setupSocket() {
    if (!App.socket) return;
    const s = App.socket;
    ['peer:joined','peer:left','webrtc:offer','webrtc:answer','webrtc:ice',
     'online:list','reaction','class:chat','class:file-new','class:file-delete',
     'class:model-show','class:model-hide'].forEach(ev => s.off(ev));

    s.on('peer:joined', ({ socketId }) => this.createOffer(socketId));
    s.on('peer:left', ({ socketId }) => { this.closePeer(socketId); this.renderParticipantsFromState(); });
    s.on('webrtc:offer', async ({ from, offer }) => this.handleOffer(from, offer));
    s.on('webrtc:answer', async ({ from, answer }) => {
      const p = this.peers[from];
      if (p) await p.pc.setRemoteDescription(new RTCSessionDescription(answer));
    });
    s.on('webrtc:ice', async ({ from, candidate }) => {
      const p = this.peers[from];
      if (p) { try { await p.pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch {} }
    });
    s.on('online:list', (list) => {
      this.userInfoMap = {};
      list.forEach(u => { if (u.socketId !== s.id) this.userInfoMap[u.socketId] = u; });
      this.renderParticipantsFromState();
    });
    s.on('reaction', ({ emoji }) => this.popReaction(emoji));
    s.on('class:chat', (m) => this.appendClassChat(m));
    s.on('class:file-new', (f) => { this.addFileToList(f); showToast(`📎 ${f.user_name}`); });
    s.on('class:file-delete', (id) => {
      document.querySelector(`.class-file-item[data-id="${id}"]`)?.remove();
      this.updateFilesCount();
    });
    s.on('class:model-show', ({ file, title } = {}) => {
      const w = document.getElementById('model3dWrap');
      if (!w) return;
      w.classList.remove('hidden');
      document.getElementById('btn3D')?.classList.add('active');
      setTimeout(() => {
        this.initThree();
        if (file) this.loadModel(file, title);
        this.loadModelsList();
      }, 200);
    });
    s.on('class:model-hide', () => {
      document.getElementById('model3dWrap')?.classList.add('hidden');
      document.getElementById('btn3D')?.classList.remove('active');
    });
    s.emit('room:join', { roomId: this.currentClass.id });
  },

  newPeerConnection(socketId) {
    const pc = new RTCPeerConnection({
      iceServers: this.getIceServers(),
      iceCandidatePoolSize: 10, bundlePolicy: 'max-bundle'
    });
    if (this.localStream) {
      this.localStream.getTracks().forEach(t => pc.addTrack(t, this.localStream));
    } else {
      const cv = document.createElement('canvas');
      cv.width = 640; cv.height = 480;
      const dm = cv.captureStream(5);
      dm.getTracks().forEach(t => pc.addTrack(t, dm));
    }
    pc.ontrack = (e) => {
      const stream = e.streams[0];
      const p = this.peers[socketId] || (this.peers[socketId] = {});
      p.stream = stream; p.pc = pc;
      this.attachRemoteVideo(socketId, stream);
    };
    pc.onicecandidate = (e) => {
      if (e.candidate) App.socket.emit('webrtc:ice', { to: socketId, candidate: e.candidate });
    };
    pc.onconnectionstatechange = () => {
      if (['failed','disconnected','closed'].includes(pc.connectionState)) this.closePeer(socketId);
    };
    this.peers[socketId] = this.peers[socketId] || {};
    this.peers[socketId].pc = pc;
    return pc;
  },

  async createOffer(socketId) {
    const pc = this.peers[socketId]?.pc || this.newPeerConnection(socketId);
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      App.socket.emit('webrtc:offer', { to: socketId, offer });
    } catch {}
  },

  async handleOffer(from, offer) {
    const pc = this.peers[from]?.pc || this.newPeerConnection(from);
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      App.socket.emit('webrtc:answer', { to: from, answer });
    } catch {}
  },

  closePeer(socketId) {
    const p = this.peers[socketId];
    if (p?.pc) { try { p.pc.close(); } catch {} }
    delete this.peers[socketId];
    document.getElementById('tile-' + socketId)?.remove();
  },

  attachRemoteVideo(socketId, stream) {
    let tile = document.getElementById('tile-' + socketId);
    if (!tile) {
      const user = this.userInfoMap[socketId] || { name: 'کاربر', avatar: '🎓' };
      tile = document.createElement('div');
      tile.id = 'tile-' + socketId;
      tile.className = 'video-tile';
      tile.innerHTML = `
        <video autoplay playsinline></video>
        <audio autoplay></audio>
        <div class="vname">${user.avatar || '🎓'} ${user.name || 'کاربر'}</div>
        <div class="vbadges" id="badges-${socketId}"></div>
      `;
      document.getElementById('videoGrid')?.appendChild(tile);
    }
    const v = tile.querySelector('video');
    const a = tile.querySelector('audio');
    v.srcObject = stream;
    if (stream.getAudioTracks().length) a.srcObject = stream;
    this.updateBadges(socketId);
  },

  updateBadges(socketId) {
    const b = document.getElementById('badges-' + socketId);
    if (!b) return;
    const u = this.userInfoMap[socketId];
    if (!u) return;
    b.innerHTML = `
      <div class="vbadge ${u.micOn ? '' : 'mute'}">${u.micOn ? '🎤' : '🔇'}</div>
      ${u.handRaised ? '<div class="vbadge hand">✋</div>' : ''}
    `;
  },

  async attachTrackToPeers(track, kind) {
    for (const [socketId, p] of Object.entries(this.peers)) {
      if (!p.pc) continue;
      const sender = p.pc.getSenders().find(s => s.track?.kind === kind);
      if (sender) { try { await sender.replaceTrack(track); } catch {} }
      else {
        try {
          p.pc.addTrack(track, this.localStream);
          const offer = await p.pc.createOffer();
          await p.pc.setLocalDescription(offer);
          App.socket.emit('webrtc:offer', { to: socketId, offer });
        } catch {}
      }
    }
  },

  emitMediaState() {
    App.socket?.emit('media:state', {
      micOn: this.micOn, camOn: this.camOn, sharingScreen: this.sharingScreen
    });
  },

  updateLocalBadges() {
    const b = document.getElementById('localBadges');
    if (!b) return;
    b.innerHTML = `
      <div class="vbadge ${this.micOn ? '' : 'mute'}">${this.micOn ? '🎤' : '🔇'}</div>
      ${this.handRaised ? '<div class="vbadge hand">✋</div>' : ''}
    `;
  },

  startRecording() {
    if (!this.localStream) return showToast('دوربین روشن کن', 'err');
    try {
      this.mediaRecorder = new MediaRecorder(this.localStream);
      this.recordedChunks = [];
      this.mediaRecorder.ondataavailable = e => {
        if (e.data.size > 0) this.recordedChunks.push(e.data);
      };
      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `class-${Date.now()}.webm`;
        a.click();
        showToast('✅ ذخیره شد');
      };
      this.mediaRecorder.start();
      showToast('⏺️ ضبط آغاز شد');
    } catch { showToast('خطا', 'err'); }
  },

  stopRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
      this.mediaRecorder = null;
    }
  },

  leaveClass() {
    Object.keys(this.peers).forEach(id => this.closePeer(id));
    App.socket?.emit('room:leave');
    this.localStream?.getTracks().forEach(t => t.stop());
    this.screenStream?.getTracks().forEach(t => t.stop());
    this.audioTrack?.stop();
    this.videoTrack?.stop();
    this.localStream = null; this.audioTrack = null; this.videoTrack = null;
    this.screenStream = null;
    this.micOn = false; this.camOn = false;
    this.sharingScreen = false; this.handRaised = false;
    this.stopRecording();
    this.currentClass = null;
    this.renderLobby();
  },

  renderParticipantsFromState() {
    const list = Object.entries(this.userInfoMap).map(([sid, u]) => ({ ...u, socketId: sid }));
    const me = JSON.parse(localStorage.getItem('bio_user'));
    const all = [{ ...me, socketId: App.socket?.id, self: true }, ...list];
    const box = document.getElementById('participants');
    if (!box) return;
    const cnt = document.getElementById('participantsCount');
    if (cnt) cnt.textContent = toFa(all.length);
    box.innerHTML = all.map(u => `
      <div class="participant">
        <div class="pav">${u.avatar || '🎓'}</div>
        <div>${u.name} ${u.self ? '(من)' : ''}</div>
        <div class="pst">${u.micOn ? '🎤' : '🔇'} ${u.handRaised ? '✋' : ''}</div>
      </div>
    `).join('');
  },

  escape(s) {
    return String(s || '').replace(/[&<>"']/g,
      c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
};

const _styleR = document.createElement('style');
_styleR.textContent = `@keyframes floatUp{
  0%{transform:translateY(0) scale(1);opacity:1}
  100%{transform:translateY(-200px) scale(1.7);opacity:0}
}`;
document.head.appendChild(_styleR);

console.log('✅ classroom.js بارگذاری شد');
window.Classroom = Classroom;
window.Classroom = Classroom;