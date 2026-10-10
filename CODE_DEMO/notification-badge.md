# Thêm — CSS Notification Badge Clip Path

> Nguồn: CodeFronts (MIT). Segment #15 (cuối) — trích từ `code_yeucau.md`.
> Nhãn gốc: `thêm :`

thêm : Here's a working CSS Notification from CodeFronts. Use it as-is or adapt to your framework. All classes are scoped under a unique prefix so the code won't collide with your existing styles. MIT licensed.
Demo: CSS Notification Badge Clip Path
Source: https://codefronts.com/snippets/css-notifications/css-notification-badge-clip-path/

clip-path as a badge tool, twice: an app-dock icon whose top-right corner is genuinely carved away by clip-path: path() so the count badge floats in a true notch (the SVG arc math annotated in the demo), and a merch card wearing polygon-clipped badges — a spinning 16-point starburst seal and a hexagon counter — that morph between polygon states on hover because same-vertex-count polygons interpolate.
## HTML
```html
<div class="ntf-13-group">
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400..700&family=JetBrains+Mono:wght@500&display=swap" rel="stylesheet">
<section class="ntf-13a" aria-label="App dock icons with clip-path notch badges">
  <div class="ntf-13a__wrap">
    <div class="ntf-13a__dock">
      <span class="ntf-13a__slot" aria-label="Mail, 3 unread">
        <i class="ntf-13a__tile" style="--g1:oklch(0.7 0.15 250);--g2:oklch(0.55 0.18 270)"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="3"/><path d="m2 7 10 6 10-6"/></svg></i>
        <b class="ntf-13a__count" aria-hidden="true">3</b>
      </span>
      <span class="ntf-13a__slot" aria-label="Chat, 12 unread">
        <i class="ntf-13a__tile" style="--g1:oklch(0.75 0.15 160);--g2:oklch(0.6 0.15 180)"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></i>
        <b class="ntf-13a__count" aria-hidden="true">12</b>
      </span>
      <span class="ntf-13a__slot" aria-label="Calendar, no notifications">
        <i class="ntf-13a__tile ntf-13a__tile--plain" style="--g1:oklch(0.72 0.14 40);--g2:oklch(0.58 0.16 25)"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="3"/><path d="M16 2v4M8 2v4M3 10h18"/></svg></i>
      </span>
    </div>
    <code class="ntf-13a__code">clip-path: path('M16 0 H40 <b>A17 17 0 0 0 64 21</b> V48 …')<br><span>&nbsp;— leave the top edge at x=40, bite an r17 arc, rejoin at y=21</span></code>
  </div>
</section>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..800&display=swap" rel="stylesheet">
<section class="ntf-13b" aria-label="Starburst seal and hexagon badges cut with clip-path polygons">
  <article class="ntf-13b__card">
    <span class="ntf-13b__seal" aria-hidden="true"><i class="ntf-13b__sealtxt">NEW</i></span>
    <span class="ntf-13b__hex" aria-label="6 in stock">6</span>
    <div class="ntf-13b__art"></div>
    <h2 class="ntf-13b__name">Studio print No. 7</h2>
    <p class="ntf-13b__meta">A2 · archival paper · edition of 50</p>
    <p class="ntf-13b__hint">hover the starburst — same-vertex polygons morph</p>
  </article>
</section>
</div>
```
## CSS
```css
.ntf-13-group {
  display: flex;
  flex-wrap: wrap;
  align-items: stretch;
  width: 100%;
}

.ntf-13-group > section {
  flex: 1 1 480px;
  min-width: min(100%,360px);
}

.ntf-13a,
.ntf-13a *,
.ntf-13a *::before,
.ntf-13a *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

.ntf-13a {
  width: 100%;
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 48px 24px;
  background: linear-gradient(160deg,#191d2a,#0d0f17 70%);
  font-family: 'Space Grotesk','Segoe UI',system-ui,sans-serif;
}

.ntf-13a__wrap {
  display: grid;
  gap: 26px;
  justify-items: center;
}

.ntf-13a__dock {
  display: flex;
  gap: 22px;
  padding: 20px 24px;
  border-radius: 26px;
  background: rgba(255,255,255,.06);
  border: 1px solid rgba(170,195,235,.16);
  box-shadow: 0 30px 60px -30px rgba(0,0,0,.9),inset 0 1px 0 rgba(255,255,255,.07);
}

.ntf-13a__slot {
  position: relative;
  width: 64px;
  height: 64px;
  filter: drop-shadow(0 10px 16px rgba(0,0,0,.45));
}

.ntf-13a__tile {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  background: linear-gradient(150deg,var(--g1),var(--g2));
  clip-path: path('M16 0 H40 A17 17 0 0 0 64 21 V48 Q64 64 48 64 H16 Q0 64 0 48 V16 Q0 0 16 0 Z');
}

.ntf-13a__tile--plain {
  clip-path: none;
  border-radius: 16px;
}

.ntf-13a__tile svg {
  width: 28px;
  height: 28px;
}

.ntf-13a__count {
  position: absolute;
  top: -7px;
  inset-inline-end: -7px;
  min-inline-size: 24px;
  block-size: 24px;
  display: grid;
  place-items: center;
  padding-inline: 6px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  font-style: normal;
  color: #fff;
  background: oklch(0.63 0.21 25);
  animation: ntf-13a-pop .5s cubic-bezier(.22,1.6,.36,1) both .25s;
}

@keyframes ntf-13a-pop {
  from {
    scale: 0;
  }
}

.ntf-13a__code {
  font-family: 'JetBrains Mono',ui-monospace,monospace;
  font-size: 11.5px;
  line-height: 1.7;
  color: rgba(205,220,248,.55);
  text-align: center;
}

.ntf-13a__code b {
  color: oklch(0.8 0.14 60);
  font-weight: 500;
}

.ntf-13a__code span {
  font-size: 10.5px;
  color: rgba(205,220,248,.4);
}

@media (prefers-reduced-motion: reduce) {
  .ntf-13a__count {
    animation: none;
  }
}

.ntf-13b,
.ntf-13b *,
.ntf-13b *::before,
.ntf-13b *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

.ntf-13b {
  width: 100%;
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 48px 24px;
  background: linear-gradient(180deg,#f5f1e8,#ece4d3);
  font-family: 'Bricolage Grotesque','Segoe UI',system-ui,sans-serif;
}

.ntf-13b__card {
  position: relative;
  width: min(330px,100%);
  padding: 18px 18px 22px;
  border-radius: 20px;
  background: #fffdf7;
  border: 1px solid rgba(36,31,23,.12);
  box-shadow: 0 30px 64px -34px rgba(36,31,23,.5);
}

.ntf-13b__art {
  height: 190px;
  border-radius: 13px;
  background: linear-gradient(135deg,oklch(0.55 0.11 260) 0 34%,oklch(0.8 0.13 85) 34% 62%,oklch(0.62 0.16 30) 62%);
}

.ntf-13b__name {
  margin-top: 14px;
  font-size: 19px;
  font-weight: 700;
  letter-spacing: -.01em;
  color: #241f17;
}

.ntf-13b__meta {
  margin-top: 3px;
  font-size: 12.5px;
  color: rgba(36,31,23,.55);
}

.ntf-13b__hint {
  margin-top: 12px;
  font-size: 11px;
  color: rgba(36,31,23,.4);
}

.ntf-13b__seal {
  position: absolute;
  top: -24px;
  inset-inline-start: -20px;
  width: 86px;
  height: 86px;
  display: grid;
  place-items: center;
  background: oklch(0.63 0.19 25);
  clip-path: polygon(50% 0%,57% 14%,71% 5%,71% 21%,87% 18%,80% 32%,96% 36%,84% 46%,97% 56%,81% 59%,89% 74%,73% 71%,74% 88%,60% 78%,54% 94%,46% 79%,34% 91%,32% 74%,16% 79%,22% 63%,5% 60%,18% 50%,4% 41%,19% 35%,10% 21%,27% 23%,26% 6%,40% 15%);
  animation: ntf-13b-spin 24s linear infinite;
  transition: clip-path .45s cubic-bezier(.22,1.2,.36,1),scale .3s;
}

.ntf-13b__seal:hover {
  scale: 1.08;
  clip-path: polygon(50% 4%,58% 16%,70% 9%,71% 23%,85% 20%,80% 33%,93% 38%,83% 47%,94% 56%,80% 59%,86% 72%,72% 69%,73% 84%,60% 77%,54% 90%,46% 77%,35% 87%,33% 72%,19% 76%,24% 62%,8% 59%,20% 50%,7% 42%,21% 37%,13% 24%,28% 26%,28% 10%,41% 17%);
}

.ntf-13b__sealtxt {
  font-style: normal;
  font-size: 15px;
  font-weight: 800;
  letter-spacing: .08em;
  color: #fff;
  animation: ntf-13b-spin 24s linear infinite reverse;
}

@keyframes ntf-13b-spin {
  to {
    rotate: 360deg;
  }
}

.ntf-13b__hex {
  position: absolute;
  top: -13px;
  inset-inline-end: -11px;
  width: 38px;
  height: 42px;
  display: grid;
  place-items: center;
  font-size: 14px;
  font-weight: 800;
  color: #241f17;
  background: oklch(0.85 0.14 85);
  clip-path: polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%);
  animation: ntf-13b-pop .5s cubic-bezier(.22,1.6,.36,1) both .3s;
}

@keyframes ntf-13b-pop {
  from {
    scale: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .ntf-13b__seal,
    .ntf-13b__sealtxt {
    animation: none;
  }

  .ntf-13b__hex {
    animation: none;
  }
}
```

## JavaScript
```js
/* No JavaScript — the notch is carved from the TILE by clip-path:path() (sweep flag 0 makes the arc concave); the badge is an ordinary circle parked in the hole. The shadow lives on the un-clipped wrapper via filter:drop-shadow. */

/* No JavaScript — the seal spins while its text counter-rotates (same duration, reversed); hover morphs between two 28-vertex polygons, which interpolate because the vertex counts match. */
```

