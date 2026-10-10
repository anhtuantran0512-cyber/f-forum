# Thêm — CSS Masonry Dashboard Widget Layout

> Nguồn: CodeFronts (MIT). Segment #10 — tür từ `code_yeucau.md`.
> Nhãn gốc: `thêm :`


thêm : Here's a working CSS Masonry Layout from CodeFronts. Use it as-is or adapt to your framework. All classes are scoped under a unique prefix so the code won't collide with your existing styles. MIT licensed.
Demo: CSS Masonry Dashboard Widget Layout
Source: https://codefronts.com/layouts/css-masonry-layouts/css-masonry-dashboard-widget-layout/

An analytics board where KPI tiles, a bar chart, a conic-gradient donut, a clip-path sparkline and an activity feed each claim 1–3 units of a fixed 108px row lattice, and grid-auto-flow: dense keeps the board airtight as widgets reflow across container widths. Every chart is pure CSS — gradients, conic slices and clip-path polygons — so the whole dashboard costs zero script and one paint. Quantized masonry is what dashboards actually want.
## HTML
```html
<section class="msn-10" aria-label="CSS masonry dashboard widget layout demo">
  <div class="msn-10__stage" tabindex="0">
    <header class="msn-10__head">
      <div><h2>Deploy Ops</h2><p>Production · last 7 days</p></div>
      <div class="msn-10__range" role="group" aria-label="Date range"><a href="#7d" aria-current="true">7d</a><a href="#30d">30d</a><a href="#90d">90d</a></div>
    </header>
    <div class="msn-10__board">
      <article class="msn-10__w msn-10__w--1"><h3>Deploys</h3><p class="msn-10__kpi">312</p><span class="msn-10__delta msn-10__delta--up">▲ 18% vs last week</span></article>
      <article class="msn-10__w msn-10__w--1"><h3>Change fail rate</h3><p class="msn-10__kpi">2.1%</p><span class="msn-10__delta msn-10__delta--up">▲ healthy · under 5% target</span></article>
      <article class="msn-10__w msn-10__w--2"><h3>Deploys per day</h3><div class="msn-10__bars" role="img" aria-label="Bar chart: deploys per day, Monday 34 to Sunday 52, peaking Thursday at 61"><i style="--v:56%" data-d="M"></i><i style="--v:72%" data-d="T"></i><i style="--v:64%" data-d="W"></i><i style="--v:100%" data-d="T"></i><i style="--v:82%" data-d="F"></i><i style="--v:38%" data-d="S"></i><i style="--v:85%" data-d="S"></i></div></article>
      <article class="msn-10__w msn-10__w--2"><h3>Build minutes by runner</h3><div class="msn-10__donutRow"><div class="msn-10__donut" role="img" aria-label="Donut chart: Linux 58%, macOS 27%, Windows 15%"></div><ul class="msn-10__legend"><li><i style="--c:var(--acc)"></i>Linux <b>58%</b></li><li><i style="--c:oklch(0.75 0.12 85)"></i>macOS <b>27%</b></li><li><i style="--c:oklch(0.65 0.1 300)"></i>Windows <b>15%</b></li></ul></div></article>
      <article class="msn-10__w msn-10__w--1"><h3>p95 pipeline</h3><p class="msn-10__kpi">6m 12s</p><span class="msn-10__delta msn-10__delta--down">▼ 41s slower than 30d avg</span></article>
      <article class="msn-10__w msn-10__w--2"><h3>Queue latency</h3><div class="msn-10__spark" role="img" aria-label="Sparkline: queue latency trending down from 90 seconds to 22 seconds over the week"></div><p class="msn-10__sparkCap"><b>22s</b> now · 90s peak Tue</p></article>
      <article class="msn-10__w msn-10__w--3"><h3>Activity</h3><ul class="msn-10__feed"><li><i style="--a:oklch(0.75 0.11 300);--b:oklch(0.5 0.13 330)"></i><div><strong>rhea</strong> promoted <a href="#rel">v2.41.0</a> to prod<span>4 min ago</span></div></li><li><i style="--a:oklch(0.8 0.1 150);--b:oklch(0.55 0.12 170)"></i><div><strong>devon</strong> quarantined flaky <a href="#t">checkout.spec</a><span>26 min ago</span></div></li><li><i style="--a:oklch(0.78 0.1 40);--b:oklch(0.55 0.13 20)"></i><div><strong>ada</strong> rotated deploy keys<span>1 h ago</span></div></li><li><i style="--a:oklch(0.72 0.09 220);--b:oklch(0.48 0.11 240)"></i><div><strong>sam</strong> merged <a href="#pr">#4182 cache warmup</a><span>2 h ago</span></div></li><li><i style="--a:oklch(0.82 0.08 90);--b:oklch(0.6 0.11 70)"></i><div><strong>mia</strong> muted alerts for maint. window<span>3 h ago</span></div></li></ul><a class="msn-10__more" href="#audit">Open audit log</a></article>
      <article class="msn-10__w msn-10__w--1"><h3>MTTR</h3><p class="msn-10__kpi">14m</p><span class="msn-10__delta msn-10__delta--up">▲ best week this quarter</span></article>
      <article class="msn-10__w msn-10__w--1 msn-10__w--flag"><h3>Error budget</h3><p class="msn-10__kpi">72%</p><span class="msn-10__delta">remaining · resets in 9 days</span></article>
    </div>
  </div>
</section>
```
## CSS
```css
.msn-10,
.msn-10 *,
.msn-10 *::before,
.msn-10 *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

.msn-10 {
  --bg: oklch(0.97 0.005 250);
  --card: oklch(0.995 0.002 250);
  --ink: oklch(0.23 0.015 260);
  --mut: oklch(0.52 0.015 260);
  --line: oklch(0.89 0.008 250);
  --acc: oklch(0.58 0.16 250);
  --up: oklch(0.55 0.15 155);
  --down: oklch(0.55 0.19 25);
  font-family: 'Segoe UI',system-ui,sans-serif;
  color: var(--ink);
  container-type: inline-size;
  display: block;
  width: 100%;
  min-height: 100vh;
  min-height: 100svh;
  background: var(--bg);
}

.msn-10__stage {
  width: 100%;
  container: msn10/inline-size;
  height: 100vh;
  height: 100svh;
  overflow-y: auto;
  background: var(--bg);
}

.msn-10__head {
  position: sticky;
  top: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 14px clamp(16px,3cqi,26px);
  background: color-mix(in oklch,var(--bg) 84%,transparent);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--line);
}

.msn-10__head h2 {
  font-size: clamp(16px,2.3cqi,21px);
  letter-spacing: -.02em;
}

.msn-10__head p {
  font-size: 11.5px;
  color: var(--mut);
  margin-top: 2px;
}

.msn-10__range {
  display: flex;
  gap: 2px;
  padding: 3px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--card);
}

.msn-10__range a {
  display: grid;
  place-items: center;
  min-height: 32px;
  min-width: 44px;
  padding: 0 10px;
  border-radius: 7px;
  font-size: 12px;
  font-weight: 700;
  text-decoration: none;
  color: var(--mut);
  transition: background .2s,color .2s;
}

.msn-10__range a:hover,
.msn-10__range a:focus-visible {
  color: var(--ink);
}

.msn-10__range a[aria-current] {
  background: var(--ink);
  color: var(--card);
}

.msn-10__range a:focus-visible {
  outline: 2px solid var(--acc);
  outline-offset: 1px;
}

.msn-10__board {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fit,minmax(min(230px,100%),1fr));
  grid-auto-rows: 108px;
  grid-auto-flow: row dense;
  padding: clamp(14px,3cqi,26px);
}

.msn-10__w {
  border: 1px solid var(--line);
  border-radius: 14px;
  background: var(--card);
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 0;
  overflow: clip;
  transition: border-color .2s,box-shadow .2s;
}

.msn-10__w:hover {
  border-color: oklch(0.8 0.01 250);
  box-shadow: 0 8px 22px -14px oklch(0.4 0.03 250/.35);
}

.msn-10__w--1 {
  grid-row: span 1;
}

.msn-10__w--2 {
  grid-row: span 2;
}

.msn-10__w--3 {
  grid-row: span 3;
}

.msn-10__w h3 {
  font-size: 11.5px;
  font-weight: 700;
  letter-spacing: .08em;
  text-transform: uppercase;
  color: var(--mut);
}

.msn-10__kpi {
  font-size: clamp(26px,3cqi,34px);
  font-weight: 800;
  letter-spacing: -.03em;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

.msn-10__delta {
  font-size: 11.5px;
  font-weight: 600;
  color: var(--mut);
  margin-top: auto;
}

.msn-10__delta--up {
  color: var(--up);
}

.msn-10__delta--down {
  color: var(--down);
}

.msn-10__w--flag {
  background: linear-gradient(150deg,color-mix(in oklch,var(--acc) 14%,var(--card)),var(--card));
  border-color: color-mix(in oklch,var(--acc) 35%,var(--line));
}

.msn-10__bars {
  flex: 1;
  display: flex;
  align-items: end;
  gap: 8px;
  min-height: 0;
}

.msn-10__bars i {
  flex: 1;
  height: var(--v);
  border-radius: 6px 6px 3px 3px;
  background: linear-gradient(180deg,var(--acc),color-mix(in oklch,var(--acc) 55%,var(--card)));
  position: relative;
  transition: filter .2s;
}

.msn-10__bars i:hover {
  filter: brightness(1.12);
}

.msn-10__bars i::after {
  content: attr(data-d);
  position: absolute;
  left: 50%;
  translate: -50% 0;
  bottom: -16px;
  font-size: 9.5px;
  font-weight: 700;
  color: var(--mut);
}

.msn-10__bars {
  padding-bottom: 18px;
}

.msn-10__donutRow {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 16px;
  min-height: 0;
}

.msn-10__donut {
  width: min(108px,38cqi);
  aspect-ratio: 1;
  border-radius: 50%;
  background: conic-gradient(var(--acc) 0 58%,oklch(0.75 0.12 85) 58% 85%,oklch(0.65 0.1 300) 85% 100%);
  mask: radial-gradient(circle,transparent 44%,#000 45%);
  flex: none;
}

.msn-10__legend {
  list-style: none;
  display: grid;
  gap: 7px;
}

.msn-10__legend li {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 12px;
  color: var(--mut);
}

.msn-10__legend li b {
  color: var(--ink);
  margin-left: auto;
  font-variant-numeric: tabular-nums;
}

.msn-10__legend i {
  width: 9px;
  height: 9px;
  border-radius: 3px;
  background: var(--c);
}

.msn-10__spark {
  flex: 1;
  min-height: 0;
  border-radius: 8px;
  background: linear-gradient(180deg,color-mix(in oklch,var(--acc) 55%,var(--card)),color-mix(in oklch,var(--acc) 10%,var(--card)));
  clip-path: polygon(0 62%,9% 48%,18% 71%,27% 90%,36% 60%,45% 52%,54% 68%,63% 42%,72% 48%,81% 30%,90% 34%,100% 22%,100% 100%,0 100%);
}

.msn-10__sparkCap {
  font-size: 11.5px;
  color: var(--mut);
}

.msn-10__sparkCap b {
  color: var(--ink);
}

.msn-10__feed {
  list-style: none;
  display: grid;
  gap: 12px;
  overflow: hidden;
}

.msn-10__feed li {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}

.msn-10__feed i {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  flex: none;
  background: linear-gradient(140deg,var(--a),var(--b));
}

.msn-10__feed div {
  font-size: 12.5px;
  line-height: 1.45;
  color: var(--mut);
}

.msn-10__feed strong {
  color: var(--ink);
  font-weight: 700;
}

.msn-10__feed a {
  color: var(--acc);
  text-decoration: none;
  font-weight: 600;
}

.msn-10__feed a:hover,
.msn-10__feed a:focus-visible {
  text-decoration: underline;
  text-underline-offset: 2px;
}

.msn-10__feed a:focus-visible {
  outline: 2px solid var(--acc);
  outline-offset: 2px;
  border-radius: 3px;
}

.msn-10__feed span {
  display: block;
  font-size: 10.5px;
  margin-top: 2px;
}

.msn-10__more {
  margin-top: auto;
  display: grid;
  place-items: center;
  min-height: 38px;
  border: 1px solid var(--line);
  border-radius: 9px;
  font-size: 12px;
  font-weight: 700;
  text-decoration: none;
  color: var(--ink);
  transition: background .2s,border-color .2s;
}

.msn-10__more:hover,
.msn-10__more:focus-visible {
  background: oklch(0.95 0.005 250);
  border-color: oklch(0.8 0.01 250);
}

.msn-10__more:focus-visible {
  outline: 2px solid var(--acc);
  outline-offset: 2px;
}

@container msn10 (width < 460px) {
  .msn-10__board {
    grid-auto-rows: 100px;
    gap: 9px;
  }

  .msn-10__range {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .msn-10 * {
    transition-duration: .01ms !important;
  }
}
```