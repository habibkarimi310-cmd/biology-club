const API = {
  base: '/api',
  getToken() { return localStorage.getItem('bio_token'); },
  setToken(t) { localStorage.setItem('bio_token', t); },
  clearToken() { localStorage.removeItem('bio_token'); },

  async request(method, url, data = null, isForm = false) {
    const headers = {};
    const token = this.getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (data && !isForm) headers['Content-Type'] = 'application/json';
    const opts = { method, headers };
    if (data) opts.body = isForm ? data : JSON.stringify(data);
    const res = await fetch(this.base + url, opts);
    const text = await res.text();
    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch { json = { error: text }; }
    if (!res.ok) {
      const err = new Error(json?.error || 'خطای شبکه');
      err.status = res.status;
      throw err;
    }
    return json;
  },
  get(u) { return this.request('GET', u); },
  post(u, d) { return this.request('POST', u, d); },
  put(u, d) { return this.request('PUT', u, d); },
  del(u) { return this.request('DELETE', u); },
  postForm(u, fd) { return this.request('POST', u, fd, true); }
};

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function showToast(msg, type = 'ok') {
  const el = document.createElement('div');
  el.style.cssText = `
    position:fixed;top:80px;left:50%;transform:translateX(-50%);
    background:${type === 'ok' ? '#10b981' : '#ef4444'};color:#fff;
    padding:11px 22px;border-radius:12px;font-weight:700;font-size:13px;
    z-index:9999;box-shadow:0 10px 30px rgba(0,0,0,.15)
  `;
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2500);
}

function toFa(n) { return String(n).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]); }