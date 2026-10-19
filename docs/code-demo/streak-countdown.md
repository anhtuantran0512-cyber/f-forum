# Tham khảo — Daily Streak Reset Countdown Widget

> Nguồn: CodeFronts (MIT). Segment #07 — tür từ `code_yeucau.md`.
> Nhãn gốc: `tham khảo :`


tham khảo : Here's a working CSS Countdown Timer from CodeFronts. Use it as-is or adapt to your framework. All classes are scoped under a unique prefix so the code won't collide with your existing styles. MIT licensed.
Demo: Daily Streak Reset Countdown Widget
Source: https://codefronts.com/snippets/css-countdown-timers/daily-streak-reset-countdown-widget/

A habit-app streak widget counting down to local midnight, with a flame that dims as the window closes. It computes the day boundary the way that survives daylight saving — by constructing tomorrow's date at hour zero rather than adding 24 hours — which is the bug that silently breaks streak apps twice a year.
## HTML
```html
<section class="cdt-16" aria-labelledby="cdt-16-title">
  <input class="cdt-16__tgl" type="checkbox" id="cdt-16-theme">
  <label class="cdt-16__tglbtn" for="cdt-16-theme">
    <svg class="cdt-16__moon" viewBox="0 0 20 20" width="15" height="15" aria-hidden="true"><path d="M15.7 12.8A6.5 6.5 0 0 1 7.2 4.3a6.6 6.6 0 1 0 8.5 8.5Z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>
    <svg class="cdt-16__sun" viewBox="0 0 20 20" width="15" height="15" aria-hidden="true"><circle cx="10" cy="10" r="3.7" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M10 1.8v2.1M10 16.1v2.1M1.8 10h2.1M16.1 10h2.1M4.2 4.2l1.5 1.5M14.3 14.3l1.5 1.5M15.8 4.2l-1.5 1.5M5.7 14.3l-1.5 1.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
    <span class="cdt-16__darktext">Dark mode</span><span class="cdt-16__lighttext">Light mode</span>
  </label>
  <div class="cdt-16__stage">
    <article class="cdt-16__card">
      <header class="cdt-16__head">
        <p class="cdt-16__app">Ranger · daily practice</p>
        <span class="cdt-16__chip" data-risk hidden>Streak at risk</span>
      </header>

      <div class="cdt-16__flamewrap">
        <span class="cdt-16__flame" aria-hidden="true">
          <svg viewBox="0 0 48 64" width="72" height="96"><path d="M24 2c8 11 4 15 9 21 6 7 9 12 9 20 0 10-8 19-18 19S6 53 6 43c0-7 3-12 8-17 4-4 6-8 5-14 2 3 4 5 5 8 1-6 0-12 0-18Z" fill="currentColor"/><path d="M24 26c3 5 1 7 4 11 3 3 4 6 4 10 0 6-4 11-8 11s-8-5-8-11c0-4 2-7 4-10 2-2 3-5 4-11Z" fill="rgba(255,255,255,0.45)"/></svg>
        </span>
        <p class="cdt-16__count"><b data-streak>34</b><i>day streak</i></p>
      </div>

      <div class="cdt-16__timer" role="timer">
        <p class="cdt-16__label">Resets in</p>
        <time class="cdt-16__clock" datetime="" data-clock>6:42:11</time>
        <p class="cdt-16__zone" data-zone>at midnight, local time</p>
      </div>

      <div class="cdt-16__actions">
        <button class="cdt-16__btn" type="button">Log today's practice</button>
        <button class="cdt-16__btn cdt-16__btn--ghost" type="button">Use a freeze · 2 left</button>
      </div>

      <p class="cdt-16__foot">Tomorrow is built as a date at hour zero, not as now plus 24 hours — the second form is an hour wrong on both daylight-saving transitions and quietly breaks streaks twice a year.</p>
      <output class="cdt-16__sr" aria-live="polite" data-live></output>
    </article>
  </div>
</section>
```
## CSS
```css
.cdt-16 {
  --page: #17130f;
  --card: #201a15;
  --ink: #f7efe4;
  --muted: #a3907c;
  --rule: #2f2620;
  --accent: #ff9a2e;
  --glow: 0.45;
  --font-display: ui-rounded, "SF Pro Rounded", "Nunito", system-ui, sans-serif;
  width: 100%;
  min-height: 100vh;
  display: block;
  box-sizing: border-box;
  background: var(--page);
  color: var(--ink);
  font-family: var(--font-display);
}

@supports (color: oklch(50% 0.1 20)) {
  .cdt-16 {
    --page: oklch(18% 0.016 60);
    --card: oklch(23% 0.02 60);
    --ink: oklch(95% 0.02 75);
    --muted: oklch(71% 0.04 65);
    --rule: oklch(30% 0.022 60);
    --accent: oklch(76% 0.17 62);
  }
}

.cdt-16 *,
.cdt-16 *::before,
.cdt-16 *::after {
  box-sizing: border-box;
}

.cdt-16__stage {
  display: grid;
  place-content: center;
  justify-items: center;
  min-height: 100vh;
  padding: clamp(16px, 5vw, 48px);
}

.cdt-16__card {
  inline-size: min(420px, 100%);
  padding: clamp(22px, 5vw, 32px);
  background: var(--card);
  border: 1px solid var(--rule);
  border-radius: 24px;
  box-shadow: 0 0 70px -30px rgba(255, 154, 46, var(--glow));
  text-align: center;
}

.cdt-16__head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.cdt-16__app {
  margin: 0;
  font: 700 11px/1 var(--font-display);
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--muted);
}

.cdt-16__chip {
  padding: 5px 10px;
  border-radius: 99px;
  background: rgba(255, 154, 46, 0.16);
  color: var(--accent);
  font: 700 10.5px/1 var(--font-display);
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.cdt-16__chip[hidden] {
  display: none;
}

.cdt-16__flamewrap {
  display: grid;
  justify-items: center;
  gap: 4px;
  margin-block: 18px 20px;
}

.cdt-16__flame {
  display: grid;
  place-items: center;
  inline-size: 118px;
  block-size: 118px;
  border-radius: 50%;
  background: radial-gradient(circle at 50% 62%, rgba(255, 154, 46, 0.28), rgba(255, 154, 46, 0) 70%);
  color: var(--accent);
  animation: cdt16-breathe 3.6s ease-in-out infinite;
}

@keyframes cdt16-breathe {
  0%,
    100% {
    transform: scale(1);
    opacity: 0.94;
  }

  50% {
    transform: scale(1.05);
    opacity: 1;
  }
}

.cdt-16__count {
  display: grid;
  gap: 2px;
  margin: 0;
}

.cdt-16__count b {
  font: 700 clamp(38px, 11vw, 52px)/1 var(--font-display);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.03em;
}

.cdt-16__count i {
  font: 600 11px/1 var(--font-display);
  font-style: normal;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--muted);
}

.cdt-16__timer {
  padding: 16px;
  border: 1px solid var(--rule);
  border-radius: 16px;
}

.cdt-16__label {
  margin: 0 0 4px;
  font: 600 10.5px/1 var(--font-display);
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--muted);
}

.cdt-16__clock {
  display: block;
  font: 700 clamp(30px, 8vw, 40px)/1.05 var(--font-display);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
  color: var(--accent);
}

.cdt-16__zone {
  margin: 6px 0 0;
  font-size: 11.5px;
  color: var(--muted);
  overflow-wrap: anywhere;
}

.cdt-16__actions {
  display: grid;
  gap: 9px;
  margin-block-start: 18px;
}

.cdt-16__btn {
  min-block-size: 48px;
  padding: 13px 18px;
  border: 1px solid transparent;
  border-radius: 14px;
  background: var(--accent);
  color: #17130f;
  font: 700 14px/1 var(--font-display);
  cursor: pointer;
}

.cdt-16__btn--ghost {
  background: transparent;
  color: var(--ink);
  border-color: var(--rule);
  font-weight: 600;
}

.cdt-16__btn:hover {
  filter: brightness(1.06);
}

.cdt-16__btn:focus-visible {
  outline: 2px solid var(--ink);
  outline-offset: 2px;
}

.cdt-16__foot {
  margin: 16px 0 0;
  font-size: 11.5px;
  line-height: 1.6;
  color: var(--muted);
  text-wrap: pretty;
}

.cdt-16__sr {
  position: absolute;
  inline-size: 1px;
  block-size: 1px;
  overflow: hidden;
  clip-path: inset(50%);
}

@media (prefers-reduced-motion: reduce) {
  .cdt-16__flame {
    animation: none;
  }
}
/* --- pure-CSS theme toggle ------------------------------------------- */

.cdt-16 {
  position: relative;
}

.cdt-16__tgl {
  position: absolute;
  inline-size: 1px;
  block-size: 1px;
  overflow: hidden;
  clip-path: inset(50%);
}

.cdt-16__tglbtn {
  position: absolute;
  inset-block-end: 14px;
  inset-inline-end: 14px;
  z-index: 20;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-block-size: 44px;
  min-inline-size: 44px;
  padding: 12px 14px;
  border: 1px solid currentColor;
  border-radius: 10px;
  background: transparent;
  color: inherit;
  font: 600 11px/1 system-ui, sans-serif;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  cursor: pointer;
  opacity: 0.62;
}

.cdt-16__tglbtn:hover {
  opacity: 1;
}

.cdt-16__tgl:focus-visible + .cdt-16__tglbtn {
  outline: 2px solid currentColor;
  outline-offset: 2px;
  opacity: 1;
}

.cdt-16__tglbtn svg {
  flex: none;
}

.cdt-16__moon,
.cdt-16__darktext {
  display: none;
}

.cdt-16:has(.cdt-16__tgl:checked) .cdt-16__sun,
.cdt-16:has(.cdt-16__tgl:checked) .cdt-16__lighttext {
  display: none;
}

.cdt-16:has(.cdt-16__tgl:checked) .cdt-16__moon {
  display: block;
}

.cdt-16:has(.cdt-16__tgl:checked) .cdt-16__darktext {
  display: inline;
}

@media (max-width: 460px) {
  .cdt-16__tglbtn {
    padding: 12px;
  }

  .cdt-16__darktext,
    .cdt-16__lighttext,
    .cdt-16:has(.cdt-16__tgl:checked) .cdt-16__darktext,
    .cdt-16:has(.cdt-16__tgl:checked) .cdt-16__lighttext {
    display: none;
  }
}
/* toggle in the system-dark case */

@media (prefers-color-scheme: dark) {
  .cdt-16:has(.cdt-16__tgl:checked) {
    --page: #fbf6ef;
    --card: #ffffff;
    --ink: #241a12;
    --muted: #7c6a58;
    --rule: #ece2d5;
    --accent: #c25c00;
    --glow: 0.25;
  }

  .cdt-16:has(.cdt-16__tgl:checked) .cdt-16__btn {
    color: #fff;
  }

  .cdt-16:has(.cdt-16__tgl:checked) .cdt-16__btn--ghost {
    color: #241a12;
  }
}

@media (prefers-color-scheme: light) {
  .cdt-16 {
    --page: #fbf6ef;
    --card: #ffffff;
    --ink: #241a12;
    --muted: #7c6a58;
    --rule: #ece2d5;
    --accent: #c25c00;
    --glow: 0.25;
  }

  .cdt-16__btn {
    color: #fff;
  }

  .cdt-16__btn--ghost {
    color: #241a12;
  }
  /* mirror flip-back: checked means the opposite of the system preference */

  .cdt-16:has(.cdt-16__tgl:checked) {
    --page: oklch(18% 0.016 60);
    --card: oklch(23% 0.02 60);
    --ink: oklch(95% 0.02 75);
    --muted: oklch(71% 0.04 65);
    --rule: oklch(30% 0.022 60);
    --accent: oklch(76% 0.17 62);
    --glow: 0.45;
  }

  .cdt-16:has(.cdt-16__tgl:checked) .cdt-16__btn {
    color: #17130f;
  }

  .cdt-16:has(.cdt-16__tgl:checked) .cdt-16__btn--ghost {
    color: var(--ink);
  }
}

[data-theme="dark"] .cdt-16 {
  --page: #17130f;
  --card: #201a15;
  --ink: #f7efe4;
  --muted: #a3907c;
  --rule: #2f2620;
  --accent: #ff9a2e;
  --glow: 0.45;
}

[data-theme="dark"] .cdt-16 .cdt-16__btn {
  color: #17130f;
}
```

## JavaScript
```js
const root = document.querySelector('.cdt-16');
if (root) {
  const q = (s) => root.querySelector(s);
  const clock = q('[data-clock]'), live = q('[data-live]'), risk = q('[data-risk]');
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  q('[data-zone]').textContent = 'at midnight · ' + zone;
  const nextMidnight = () => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1, 0, 0, 0, 0); };
  let target = nextMidnight(), id = 0, seen = null;
  const pad = (n) => String(n).padStart(2, '0');
  const tick = () => {
    let ms = target - Date.now();
    if (ms <= 0) { target = nextMidnight(); ms = target - Date.now(); seen = null; }
    const s = Math.floor(ms / 1000), h = Math.floor(s / 3600);
    clock.textContent = h + ':' + pad(Math.floor(s / 60) % 60) + ':' + pad(s % 60);
    clock.dateTime = target.toISOString();
    risk.hidden = ms > 6 * 3600e3;
    const b = ms < 600e3 ? 'm10' : ms < 3600e3 ? 'h1' : ms < 6 * 3600e3 ? 'h6' : 'far';
    if (b !== seen) { seen = b; live.textContent = { far: '', h6: 'Six hours left to keep your streak.', h1: 'One hour left to keep your streak.', m10: 'Ten minutes left to keep your streak.' }[b]; }
    id = setTimeout(tick, 1000 - (Date.now() % 1000));
  };
  tick();
  root.cleanup = () => clearTimeout(id);
}
```
