// ═══════════════════════════════════════════════════
// تخته سفید — نسخه کامل با تمام متدها
// ═══════════════════════════════════════════════════
window.WB = {
  canvas: null,
  ctx: null,
  drawing: false,
  tool: 'pen',
  color: '#10b981',
  size: 4,
  elements: [],
  _redo: [],
  current: null,
  lastX: 0,
  lastY: 0,
  _bound: false,

  // ═══════════════════════════════════════════════════
  //       متدهای دکمه‌ها — این‌ها حتماً باید باشن
  // ═══════════════════════════════════════════════════

  setTool: function(tool, btn) {
    console.log('🔧 ابزار:', tool);
    document.querySelectorAll('.wbt[data-tool]').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    this.tool = tool;
  },

  setColor: function(color, btn) {
    console.log('🎨 رنگ:', color);
    document.querySelectorAll('.wb-col').forEach(b => {
      b.style.border = '2px solid transparent';
    });
    if (btn) btn.style.border = '2px solid #0f172a';
    this.color = color;
  },

  setSize: function(v) {
    const size = Number(v);
    const el = document.getElementById('wbSizeVal');
    if (el) el.textContent = String(size).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
    this.size = size;
  },

  undo: function() {
    console.log('↶ undo');
    if (this.elements.length === 0) return;
    this._redo.push(this.elements.pop());
    this.redraw();
  },

  redo: function() {
    console.log('↷ redo');
    if (this._redo.length === 0) return;
    this.elements.push(this._redo.pop());
    this.redraw();
  },

  clear: function() {
    if (this.elements.length === 0) return;
    if (!confirm('همه پاک شود؟')) return;
    this.elements = [];
    this._redo = [];
    this.redraw();
  },

  save: function() {
    const a = document.createElement('a');
    a.href = this.canvas.toDataURL('image/png');
    a.download = `wb-${Date.now()}.png`;
    a.click();
  },

  // ═══════════════════════════════════════════════════
  //       راه‌اندازی
  // ═══════════════════════════════════════════════════

  init: function(canvas) {
    if (!canvas) { console.error('❌ canvas نیست'); return; }
    console.log('🎨 WB.init');
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    const parent = canvas.parentElement;
    canvas.width = (parent && parent.clientWidth > 100) ? parent.clientWidth : 900;
    canvas.height = 460;

    this._bound = false;  // ریست کردن برای اتصال مجدد
    this.bindCanvas();
    this.redraw();
    console.log('✅ WB آماده —', canvas.width, '×', canvas.height);
  },

  bindCanvas: function() {
    const c = this.canvas;
    if (!c || this._bound) return;
    this._bound = true;
    const self = this;

    const getPos = function(e) {
      const r = c.getBoundingClientRect();
      const cx = e.touches ? e.touches[0].clientX : e.clientX;
      const cy = e.touches ? e.touches[0].clientY : e.clientY;
      return {
        x: (cx - r.left) * (c.width / r.width),
        y: (cy - r.top) * (c.height / r.height)
      };
    };

    const start = function(e) {
      e.preventDefault();
      self.drawing = true;
      const p = getPos(e);
      self.lastX = p.x;
      self.lastY = p.y;

      const free = ['pen','marker','highlighter','eraser','neon','rainbow','spray'];
      const stamps = ['heart','dna','cell','star','check','cross','question'];

      if (free.includes(self.tool)) {
        self.current = {
          type: self.tool,
          points: [p],
          color: self.color,
          size: self.size
        };
        self.redraw();
      } else if (stamps.includes(self.tool)) {
        const emo = {
          heart: '❤️', dna: '🧬', cell: '🔬', star: '⭐',
          check: '✅', cross: '❌', question: '❓'
        };
        self.elements.push({
          type: 'symbol',
          symbol: emo[self.tool],
          x: p.x, y: p.y,
          size: self.size * 12 + 30
        });
        self.redraw();
        self.drawing = false;
      } else if (self.tool === 'text') {
        const txt = prompt('متن:');
        if (txt) {
          self.elements.push({
            type: 'text', text: txt,
            x: p.x, y: p.y,
            color: self.color,
            size: self.size * 6 + 12
          });
          self.redraw();
        }
        self.drawing = false;
      } else {
        self.current = {
          type: self.tool,
          x1: p.x, y1: p.y, x2: p.x, y2: p.y,
          color: self.color,
          size: self.size
        };
        self.redraw();
      }
    };

    const move = function(e) {
      if (!self.drawing || !self.current) return;
      e.preventDefault();
      const p = getPos(e);

      if (self.current.points) {
        const last = self.current.points[self.current.points.length - 1];
        if (Math.hypot(p.x - last.x, p.y - last.y) > 2) {
          self.current.points.push(p);
          self.redraw();
        }
      } else {
        self.current.x2 = p.x;
        self.current.y2 = p.y;
        self.redraw();
      }
    };

    const end = function() {
      if (!self.drawing) return;
      self.drawing = false;
      if (self.current) {
        if (self.current.points && self.current.points.length === 1) {
          const p = self.current.points[0];
          self.current.points.push({ x: p.x + 1, y: p.y + 1 });
        }
        self.elements.push(self.current);
        self.current = null;
        self.redraw();
      }
    };

    c.addEventListener('mousedown', start);
    c.addEventListener('mousemove', move);
    c.addEventListener('mouseup', end);
    c.addEventListener('mouseleave', end);
    c.addEventListener('touchstart', start, { passive: false });
    c.addEventListener('touchmove', move, { passive: false });
    c.addEventListener('touchend', end);
  },

  // ═══════════════════════════════════════════════════
  //       ترسیم
  // ═══════════════════════════════════════════════════

  redraw: function() {
    if (!this.ctx || !this.canvas) return;
    const c = this.canvas;
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(0, 0, c.width, c.height);
    this.elements.forEach(el => this.drawEl(el));
    if (this.current) this.drawEl(this.current);
  },

  drawEl: function(el) {
    const ctx = this.ctx;
    if (!ctx) return;
    ctx.save();
    ctx.globalAlpha = el.opacity || 1;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // ─── رسم آزاد ───
    if (el.points && el.points.length > 1) {
      const p0 = el.points[0];
      if (el.type === 'eraser') {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = el.size * 5;
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        el.points.forEach(p => ctx.lineTo(p.x, p.y));
        ctx.stroke();
      } else if (el.type === 'spray') {
        ctx.fillStyle = el.color;
        el.points.forEach(p => {
          for (let i = 0; i < 8; i++) {
            const a = Math.random() * Math.PI * 2;
            const r = Math.random() * el.size * 3;
            ctx.beginPath();
            ctx.arc(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r, 1, 0, Math.PI * 2);
            ctx.fill();
          }
        });
      } else if (el.type === 'rainbow') {
        for (let i = 1; i < el.points.length; i++) {
          const p1 = el.points[i - 1], p2 = el.points[i];
          ctx.strokeStyle = 'hsl(' + ((i * 5) % 360) + ',90%,55%)';
          ctx.lineWidth = el.size;
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }
      } else if (el.type === 'neon') {
        ctx.shadowColor = el.color;
        ctx.shadowBlur = 15;
        ctx.strokeStyle = el.color;
        ctx.lineWidth = el.size;
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        el.points.forEach(p => ctx.lineTo(p.x, p.y));
        ctx.stroke();
        ctx.shadowBlur = 0;
      } else {
        ctx.strokeStyle = el.color;
        ctx.lineWidth = el.type === 'highlighter' ? el.size * 5
          : el.type === 'marker' ? el.size * 2 : el.size;
        ctx.globalAlpha = el.type === 'highlighter' ? 0.4 : 1;
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        el.points.forEach(p => ctx.lineTo(p.x, p.y));
        ctx.stroke();
      }
    }

    // ─── خط و فلش ───
    else if (['line', 'arrow', 'dblarrow', 'dashed', 'wave'].includes(el.type)) {
      ctx.strokeStyle = el.color;
      ctx.lineWidth = el.size;
      if (el.type === 'dashed') ctx.setLineDash([12, 8]);

      if (el.type === 'wave') {
        ctx.beginPath();
        for (let i = 0; i <= 30; i++) {
          const t = i / 30;
          const x = el.x1 + (el.x2 - el.x1) * t;
          const y = el.y1 + (el.y2 - el.y1) * t + Math.sin(t * Math.PI * 4) * 8;
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.moveTo(el.x1, el.y1);
        ctx.lineTo(el.x2, el.y2);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      if (el.type === 'arrow' || el.type === 'dblarrow')
        this.arrow(el.x1, el.y1, el.x2, el.y2, el.color, el.size);
      if (el.type === 'dblarrow')
        this.arrow(el.x2, el.y2, el.x1, el.y1, el.color, el.size);
    }

    // ─── مستطیل ───
    else if (['rect', 'rectFill'].includes(el.type)) {
      const x = Math.min(el.x1, el.x2);
      const y = Math.min(el.y1, el.y2);
      const w = Math.abs(el.x2 - el.x1);
      const h = Math.abs(el.y2 - el.y1);
      ctx.strokeStyle = el.color;
      ctx.lineWidth = el.size;
      if (el.type === 'rectFill') {
        ctx.fillStyle = el.color + '40';
        ctx.fillRect(x, y, w, h);
      }
      ctx.strokeRect(x, y, w, h);
    }

    // ─── دایره ───
    else if (['circle', 'circleFill'].includes(el.type)) {
      const cx = (el.x1 + el.x2) / 2;
      const cy = (el.y1 + el.y2) / 2;
      const r = Math.hypot(el.x2 - el.x1, el.y2 - el.y1) / 2;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = el.color;
      ctx.lineWidth = el.size;
      if (el.type === 'circleFill') {
        ctx.fillStyle = el.color + '40';
        ctx.fill();
      }
      ctx.stroke();
    }

    // ─── مثلث ───
    else if (el.type === 'triangle') {
      ctx.strokeStyle = el.color;
      ctx.lineWidth = el.size;
      ctx.beginPath();
      ctx.moveTo((el.x1 + el.x2) / 2, el.y1);
      ctx.lineTo(el.x2, el.y2);
      ctx.lineTo(el.x1, el.y2);
      ctx.closePath();
      ctx.stroke();
    }

    // ─── لوزی ───
    else if (el.type === 'diamond') {
      const cx = (el.x1 + el.x2) / 2;
      const cy = (el.y1 + el.y2) / 2;
      const rx = Math.abs(el.x2 - el.x1) / 2;
      const ry = Math.abs(el.y2 - el.y1) / 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy - ry);
      ctx.lineTo(cx + rx, cy);
      ctx.lineTo(cx, cy + ry);
      ctx.lineTo(cx - rx, cy);
      ctx.closePath();
      ctx.strokeStyle = el.color;
      ctx.lineWidth = el.size;
      ctx.stroke();
    }

    // ─── ستاره ───
    else if (el.type === 'starShape') {
      const cx = (el.x1 + el.x2) / 2;
      const cy = (el.y1 + el.y2) / 2;
      const r = Math.abs(el.x2 - el.x1) / 2;
      const inner = r * 0.45;
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const a1 = (Math.PI * 2 / 5) * i - Math.PI / 2;
        const a2 = a1 + Math.PI / 5;
        const x1 = cx + Math.cos(a1) * r;
        const y1 = cy + Math.sin(a1) * r;
        const x2 = cx + Math.cos(a2) * inner;
        const y2 = cy + Math.sin(a2) * inner;
        if (i === 0) ctx.moveTo(x1, y1); else ctx.lineTo(x1, y1);
        ctx.lineTo(x2, y2);
      }
      ctx.closePath();
      ctx.strokeStyle = el.color;
      ctx.lineWidth = el.size;
      ctx.stroke();
    }

    // ─── متن ───
    else if (el.type === 'text') {
      ctx.font = 'bold ' + el.size + 'px Vazirmatn, sans-serif';
      ctx.fillStyle = el.color;
      ctx.textBaseline = 'top';
      ctx.fillText(el.text, el.x, el.y);
    }

    // ─── استمپ ───
    else if (el.type === 'symbol') {
      ctx.font = el.size + 'px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(el.symbol, el.x, el.y);
    }

    ctx.restore();
  },

  arrow: function(x1, y1, x2, y2, color, size) {
    const ang = Math.atan2(y2 - y1, x2 - x1);
    const len = Math.max(12, size * 4);
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.moveTo(x2, y2);
    this.ctx.lineTo(x2 - len * Math.cos(ang - Math.PI / 6), y2 - len * Math.sin(ang - Math.PI / 6));
    this.ctx.lineTo(x2 - len * Math.cos(ang + Math.PI / 6), y2 - len * Math.sin(ang + Math.PI / 6));
    this.ctx.closePath();
    this.ctx.fill();
  }
};

// ═══ سازگاری با کد قبلی ═══
window.Whiteboard = window.WB;

console.log('✅ whiteboard.js بارگذاری شد — متدها:', Object.keys(window.WB).filter(k => typeof window.WB[k] === 'function').join(', '));