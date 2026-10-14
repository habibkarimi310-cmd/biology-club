const Leaderboard = {
  async render() {
    const list = await API.get('/scores');
    $('#mainContent').innerHTML = `
      <div class="page-head"><h1>🏆 جدول امتیازات</h1>
        <p>هر پاسخ درست = ۱۰ امتیاز</p></div>
      <div class="card" style="padding:0;overflow:hidden">
        <table>
          <thead><tr>
            <th>رتبه</th><th>کاربر</th><th>نقش</th>
            <th>پاسخ درست</th><th>کل پاسخ</th><th>امتیاز</th>
          </tr></thead>
          <tbody>
            ${list.length === 0 ? `<tr><td colspan="6"
              style="text-align:center;padding:40px;color:var(--muted)">هنوز کاربری نیست</td></tr>` :
              list.map((u, i) => `
                <tr>
                  <td><div class="rank-badge ${i < 3 ? 'rank-'+(i+1) : ''}">${toFa(i+1)}</div></td>
                  <td><div style="display:flex;align-items:center;gap:9px">
                    <div class="avatar">${u.avatar}</div>
                    <div><b>${u.name}</b>
                    <div style="font-size:11px;color:var(--muted)">@${u.username}</div></div>
                  </div></td>
                  <td>${u.role === 'coach' ? '🧑‍🏫 مربی' : '🎓 دانش‌آموز'}</td>
                  <td>${toFa(u.correct_count)}</td>
                  <td>${toFa(u.total_count)}</td>
                  <td><b style="color:var(--mint-dark);font-size:15px">${toFa(u.score)}</b></td>
                </tr>
              `).join('')}
          </tbody>
        </table>
      </div>`;
  }
};