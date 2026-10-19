# Tham khảo — Tailwind Popover Entry and Exit Animation

> Nguồn: CodeFronts (MIT). Segment #13 — tür từ `code_yeucau.md`.
> Nhãn gốc: `GUI ADMIN :`


GUI ADMIN : Here's a working CSS Table from CodeFronts. Use it as-is or adapt to your framework. All classes are scoped under a unique prefix so the code won't collide with your existing styles. MIT licensed.
Demo: Admin Dashboard Data Grid
Source: https://codefronts.com/snippets/css-table-styles/admin-dashboard-data-grid/

A scrollable admin user-management grid with a position: sticky header row, colourful status badges, gradient avatars, and sortable-column affordances — grounded in a GitHub-dark design language.
## HTML
```html
<div class="ct-03">
  <div class="ct-03__topbar">
    <div>
      <span class="ct-03__heading">User Management</span>
      <span class="ct-03__count">2,841 users</span>
    </div>
    <div class="ct-03__filters">
      <button class="ct-03__filter-btn ct-03__filter-btn--active">All</button>
      <button class="ct-03__filter-btn">Active</button>
      <button class="ct-03__filter-btn">Pending</button>
      <button class="ct-03__filter-btn">Banned</button>
    </div>
  </div>
  <div class="ct-03__scroll-wrap">
    <table>
      <thead>
        <tr>
          <th class="ct-03--sorted">User</th>
          <th>Email</th>
          <th>Plan</th>
          <th>Status</th>
          <th>Last Active</th>
          <th>Revenue</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><div class="ct-03__user"><div class="ct-03__ava" style="background:linear-gradient(135deg,#6c63ff,#00d4ff)">AK</div><div><div class="ct-03__uname">Arya Kapoor</div><div class="ct-03__uid">#usr_8841</div></div></div></td>
          <td style="color:var(--muted);font-size:12px">arya@nexuslab.io</td>
          <td><span class="ct-03__plan-chip ct-03__plan-chip--ent">Enterprise</span></td>
          <td><span class="ct-03__badge ct-03__badge--active"><span class="ct-03__dot"></span>Active</span></td>
          <td style="color:var(--muted);font-size:12px">2 min ago</td>
          <td style="font-weight:700;color:var(--green)">$4,280</td>
          <td><div class="ct-03__actions"><button class="ct-03__act">✏️</button><button class="ct-03__act">👁</button><button class="ct-03__act">⋮</button></div></td>
        </tr>
        <tr>
          <td><div class="ct-03__user"><div class="ct-03__ava" style="background:linear-gradient(135deg,#f59e0b,#ef4444)">MR</div><div><div class="ct-03__uname">Marcus Reid</div><div class="ct-03__uid">#usr_7722</div></div></div></td>
          <td style="color:var(--muted);font-size:12px">m.reid@agency.co</td>
          <td><span class="ct-03__plan-chip ct-03__plan-chip--pro">Pro</span></td>
          <td><span class="ct-03__badge ct-03__badge--pending"><span class="ct-03__dot"></span>Pending</span></td>
          <td style="color:var(--muted);font-size:12px">1 hr ago</td>
          <td style="font-weight:700;color:var(--yellow)">$290</td>
          <td><div class="ct-03__actions"><button class="ct-03__act">✏️</button><button class="ct-03__act">👁</button><button class="ct-03__act">⋮</button></div></td>
        </tr>
        <tr>
          <td><div class="ct-03__user"><div class="ct-03__ava" style="background:linear-gradient(135deg,#10b981,#06b6d4)">SN</div><div><div class="ct-03__uname">Selin Novak</div><div class="ct-03__uid">#usr_6610</div></div></div></td>
          <td style="color:var(--muted);font-size:12px">selin@design.studio</td>
          <td><span class="ct-03__plan-chip ct-03__plan-chip--pro">Pro</span></td>
          <td><span class="ct-03__badge ct-03__badge--active"><span class="ct-03__dot"></span>Active</span></td>
          <td style="color:var(--muted);font-size:12px">4 hrs ago</td>
          <td style="font-weight:700;color:var(--green)">$580</td>
          <td><div class="ct-03__actions"><button class="ct-03__act">✏️</button><button class="ct-03__act">👁</button><button class="ct-03__act">⋮</button></div></td>
        </tr>
        <tr>
          <td><div class="ct-03__user"><div class="ct-03__ava" style="background:linear-gradient(135deg,#8b5cf6,#ec4899)">TW</div><div><div class="ct-03__uname">Theo Walsh</div><div class="ct-03__uid">#usr_5503</div></div></div></td>
          <td style="color:var(--muted);font-size:12px">theo@startup.xyz</td>
          <td><span class="ct-03__plan-chip ct-03__plan-chip--free">Free</span></td>
          <td><span class="ct-03__badge ct-03__badge--trial"><span class="ct-03__dot"></span>Trial</span></td>
          <td style="color:var(--muted);font-size:12px">2 days ago</td>
          <td style="font-weight:700;color:var(--muted)">$0</td>
          <td><div class="ct-03__actions"><button class="ct-03__act">✏️</button><button class="ct-03__act">👁</button><button class="ct-03__act">⋮</button></div></td>
        </tr>
        <tr>
          <td><div class="ct-03__user"><div class="ct-03__ava" style="background:linear-gradient(135deg,#f43f5e,#fb7185)">LK</div><div><div class="ct-03__uname">Lena Kim</div><div class="ct-03__uid">#usr_4491</div></div></div></td>
          <td style="color:var(--muted);font-size:12px">lena.kim@corp.io</td>
          <td><span class="ct-03__plan-chip ct-03__plan-chip--free">Free</span></td>
          <td><span class="ct-03__badge ct-03__badge--banned"><span class="ct-03__dot"></span>Banned</span></td>
          <td style="color:var(--muted);font-size:12px">14 days ago</td>
          <td style="font-weight:700;color:var(--red)">-$120</td>
          <td><div class="ct-03__actions"><button class="ct-03__act">✏️</button><button class="ct-03__act">👁</button><button class="ct-03__act">⋮</button></div></td>
        </tr>
        <tr>
          <td><div class="ct-03__user"><div class="ct-03__ava" style="background:linear-gradient(135deg,#0ea5e9,#38bdf8)">JP</div><div><div class="ct-03__uname">James Park</div><div class="ct-03__uid">#usr_3380</div></div></div></td>
          <td style="color:var(--muted);font-size:12px">jpark@techco.dev</td>
          <td><span class="ct-03__plan-chip ct-03__plan-chip--ent">Enterprise</span></td>
          <td><span class="ct-03__badge ct-03__badge--active"><span class="ct-03__dot"></span>Active</span></td>
          <td style="color:var(--muted);font-size:12px">Just now</td>
          <td style="font-weight:700;color:var(--green)">$12,400</td>
          <td><div class="ct-03__actions"><button class="ct-03__act">✏️</button><button class="ct-03__act">👁</button><button class="ct-03__act">⋮</button></div></td>
        </tr>
      </tbody>
    </table>
  </div>
</div>
```
## CSS
```css
.ct-03,
.ct-03 *,
.ct-03 *::before,
.ct-03 *::after {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.ct-03 ::selection {
  background: #3b82f6;
  color: #fff;
}

.ct-03 {
  --bg: #0d1117;
  --surface: #161b22;
  --surface2: #21262d;
  --border: #30363d;
  --text: #e6edf3;
  --muted: #7d8590;
  --blue: #58a6ff;
  --green: #3fb950;
  --yellow: #d29922;
  --red: #f85149;
  --purple: #bc8cff;
  font-family: -apple-system, 'Segoe UI', system-ui, sans-serif;
  background: var(--bg);
  padding: 28px 20px;
  min-height: 100vh;
  color: var(--text);
}

.ct-03__topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 12px;
}

.ct-03__heading {
  font-size: 18px;
  font-weight: 700;
}

.ct-03__count {
  font-size: 12px;
  color: var(--muted);
  background: var(--surface2);
  border: 1px solid var(--border);
  padding: 4px 10px;
  border-radius: 20px;
  margin-left: 8px;
}

.ct-03__filters {
  display: flex;
  gap: 8px;
}

.ct-03__filter-btn {
  padding: 6px 14px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  border: 1px solid var(--border);
  background: var(--surface2);
  color: var(--muted);
  cursor: pointer;
  transition: all 0.2s;
}

.ct-03__filter-btn:hover,
.ct-03__filter-btn--active {
  border-color: var(--blue);
  color: var(--blue);
  background: rgba(88,166,255,0.08);
}

.ct-03__filter-btn--active {
  color: var(--blue);
  border-color: var(--blue);
}

.ct-03__scroll-wrap {
  max-height: 320px;
  overflow-y: auto;
  border-radius: 12px;
  border: 1px solid var(--border);
  scrollbar-width: thin;
  scrollbar-color: var(--border) transparent;
}

.ct-03__scroll-wrap::-webkit-scrollbar {
  width: 6px;
}

.ct-03__scroll-wrap::-webkit-scrollbar-track {
  background: transparent;
}

.ct-03__scroll-wrap::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: 3px;
}

.ct-03 table {
  width: 100%;
  border-collapse: collapse;
  min-width: 700px;
}

.ct-03 thead {
  position: sticky;
  top: 0;
  z-index: 2;
}

.ct-03 thead tr {
  background: var(--surface2);
  border-bottom: 2px solid var(--border);
}

.ct-03 thead th {
  padding: 12px 16px;
  text-align: left;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: var(--muted);
  white-space: nowrap;
  cursor: pointer;
  user-select: none;
  transition: color 0.2s;
}

.ct-03 thead th:hover {
  color: var(--text);
}

.ct-03 thead th::after {
  content: ' ↕';
  font-size: 9px;
  opacity: 0.4;
}

.ct-03 thead th.ct-03--sorted {
  color: var(--blue);
}

.ct-03 thead th.ct-03--sorted::after {
  content: ' ↑';
  opacity: 1;
  color: var(--blue);
}

.ct-03 tbody tr {
  border-bottom: 1px solid var(--border);
  transition: background 0.15s;
}

.ct-03 tbody tr:last-child {
  border-bottom: none;
}

.ct-03 tbody tr:hover {
  background: rgba(88,166,255,0.04);
}

.ct-03 tbody td {
  padding: 13px 16px;
  font-size: 13px;
  vertical-align: middle;
}

.ct-03__user {
  display: flex;
  align-items: center;
  gap: 10px;
}

.ct-03__ava {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
}

.ct-03__uname {
  font-weight: 600;
  font-size: 13px;
}

.ct-03__uid {
  font-size: 11px;
  color: var(--muted);
  font-family: monospace;
}

.ct-03__badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 9px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
}

.ct-03__badge--active {
  background: rgba(63,185,80,0.15);
  color: var(--green);
  border: 1px solid rgba(63,185,80,0.3);
}

.ct-03__badge--pending {
  background: rgba(210,153,34,0.15);
  color: var(--yellow);
  border: 1px solid rgba(210,153,34,0.3);
}

.ct-03__badge--banned {
  background: rgba(248,81,73,0.15);
  color: var(--red);
  border: 1px solid rgba(248,81,73,0.3);
}

.ct-03__badge--trial {
  background: rgba(188,140,255,0.15);
  color: var(--purple);
  border: 1px solid rgba(188,140,255,0.3);
}

.ct-03__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

.ct-03__plan-chip {
  display: inline-block;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 5px;
}

.ct-03__plan-chip--pro {
  background: rgba(88,166,255,0.12);
  color: var(--blue);
}

.ct-03__plan-chip--free {
  background: var(--surface2);
  color: var(--muted);
}

.ct-03__plan-chip--ent {
  background: rgba(188,140,255,0.12);
  color: var(--purple);
}

.ct-03__actions {
  display: flex;
  gap: 6px;
}

.ct-03__act {
  width: 28px;
  height: 28px;
  border-radius: 7px;
  border: 1px solid var(--border);
  background: var(--surface2);
  color: var(--muted);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
}

.ct-03__act:hover {
  border-color: var(--blue);
  color: var(--blue);
  background: rgba(88,166,255,0.1);
}

@media (prefers-reduced-motion: reduce) {
  .ct-03 tbody tr {
    transition: none;
  }
}
```

## JavaScript
```js
(function() {
  const btns = document.querySelectorAll('.ct-03__filter-btn');
  btns.forEach(btn => {
    btn.addEventListener('click', function() {
      btns.forEach(b => b.classList.remove('ct-03__filter-btn--active'));
      this.classList.add('ct-03__filter-btn--active');
    });
  });
})();
```