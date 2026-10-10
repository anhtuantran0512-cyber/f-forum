# Đồng hồ countdown — Retro Flip Clock Countdown Timer

> Nguồn: CodeFronts (MIT). Segment #08 — tür từ `code_yeucau.md`.
> Nhãn gốc: `đồng hồ countdown:`


đồng hồ countdown: Here's a working CSS Countdown Timer from CodeFronts. Use it as-is or adapt to your framework. All classes are scoped under a unique prefix so the code won't collide with your existing styles. MIT licensed.
Demo: Retro Flip Clock Countdown Timer
Source: https://codefronts.com/snippets/css-countdown-timers/retro-flip-clock-timers/

A split-flap countdown with the hinge line down the middle of each card and a real flap rotation on every change. It is framed as a deadline mechanism — the last posting time for a print run — rather than a decorative odometer, and under reduced motion the flaps settle instantly while still showing the correct digit.
## HTML
```html
<section class="cdt-22" aria-labelledby="cdt-22-title">
  <input class="cdt-22__tgl" type="checkbox" id="cdt-22-theme">
  <label class="cdt-22__tglbtn" for="cdt-22-theme">
    <svg class="cdt-22__moon" viewBox="0 0 20 20" width="15" height="15" aria-hidden="true"><path d="M15.7 12.8A6.5 6.5 0 0 1 7.2 4.3a6.6 6.6 0 1 0 8.5 8.5Z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>
    <svg class="cdt-22__sun" viewBox="0 0 20 20" width="15" height="15" aria-hidden="true"><circle cx="10" cy="10" r="3.7" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M10 1.8v2.1M10 16.1v2.1M1.8 10h2.1M16.1 10h2.1M4.2 4.2l1.5 1.5M14.3 14.3l1.5 1.5M15.8 4.2l-1.5 1.5M5.7 14.3l-1.5 1.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
    <span class="cdt-22__darktext">Dark mode</span><span class="cdt-22__lighttext">Light mode</span>
  </label>
  <div class="cdt-22__stage">
    <div class="cdt-22__head">
      <p class="cdt-22__brand">Quill Press · plate room</p>
      <h2 class="cdt-22__title" id="cdt-22-title">Last posting for the autumn run</h2>
      <p class="cdt-22__sub">Files in before the flaps stop moving make Thursday's press. After that the next slot is in eleven days.</p>
    </div>

    <div class="cdt-22__clock" role="timer" data-clock>
      <div class="cdt-22__group">
        <div class="cdt-22__cards">
          <span class="cdt-22__digit" data-digit><b class="cdt-22__top">0</b><b class="cdt-22__bot">0</b><b class="cdt-22__flap cdt-22__flap--t">0</b><b class="cdt-22__flap cdt-22__flap--b">0</b></span>
          <span class="cdt-22__digit" data-digit><b class="cdt-22__top">6</b><b class="cdt-22__bot">6</b><b class="cdt-22__flap cdt-22__flap--t">6</b><b class="cdt-22__flap cdt-22__flap--b">6</b></span>
        </div>
        <p class="cdt-22__label">hours</p>
      </div>
      <span class="cdt-22__sep" aria-hidden="true"></span>
      <div class="cdt-22__group">
        <div class="cdt-22__cards">
          <span class="cdt-22__digit" data-digit><b class="cdt-22__top">2</b><b class="cdt-22__bot">2</b><b class="cdt-22__flap cdt-22__flap--t">2</b><b class="cdt-22__flap cdt-22__flap--b">2</b></span>
          <span class="cdt-22__digit" data-digit><b class="cdt-22__top">4</b><b class="cdt-22__bot">4</b><b class="cdt-22__flap cdt-22__flap--t">4</b><b class="cdt-22__flap cdt-22__flap--b">4</b></span>
        </div>
        <p class="cdt-22__label">minutes</p>
      </div>
      <span class="cdt-22__sep" aria-hidden="true"></span>
      <div class="cdt-22__group">
        <div class="cdt-22__cards">
          <span class="cdt-22__digit" data-digit><b class="cdt-22__top">1</b><b class="cdt-22__bot">1</b><b class="cdt-22__flap cdt-22__flap--t">1</b><b class="cdt-22__flap cdt-22__flap--b">1</b></span>
          <span class="cdt-22__digit" data-digit><b class="cdt-22__top">8</b><b class="cdt-22__bot">8</b><b class="cdt-22__flap cdt-22__flap--t">8</b><b class="cdt-22__flap cdt-22__flap--b">8</b></span>
        </div>
        <p class="cdt-22__label">seconds</p>
      </div>
    </div>

    <p class="cdt-22__target">Cut-off <time datetime="" data-time>—</time> · <span class="cdt-22__sr" data-sentence></span></p>
    <div class="cdt-22__done" data-done hidden role="status"><strong>Posting closed</strong><span>Next press slot opens in eleven days</span></div>
    <output class="cdt-22__sr" aria-live="polite" data-live></output>
  </div>
</section>
```
## CSS
```css
.cdt-22 {
  --page: #17120d;
  --card: #f2e3c8;
  --cardlow: #e4d2b4;
  --ink: #211812;
  --muted: #a08c72;
  --accent: #e0952f;
  --card-w: clamp(46px, 13vw, 82px);
  --flap: 0.32s;
  --font-display: "Rockwell", "Bookman Old Style", Georgia, ui-serif, serif;
  width: 100%;
  min-height: 100vh;
  display: block;
  box-sizing: border-box;
  background: var(--page);
  color: var(--card);
  font-family: system-ui, -apple-system, sans-serif;
}

@supports (color: oklch(50% 0.1 20)) {
  .cdt-22 {
    --page: oklch(18% 0.02 55);
    --card: oklch(91% 0.04 85);
    --cardlow: oklch(85% 0.045 85);
    --ink: oklch(20% 0.02 50);
    --muted: oklch(68% 0.04 75);
    --accent: oklch(74% 0.14 70);
  }
}

.cdt-22 *,
.cdt-22 *::before,
.cdt-22 *::after {
  box-sizing: border-box;
}

.cdt-22__stage {
  display: grid;
  gap: 26px;
  align-content: center;
  justify-items: center;
  min-height: 100vh;
  max-inline-size: 760px;
  margin-inline: auto;
  padding: clamp(18px, 5vw, 52px);
  text-align: center;
}

.cdt-22__brand {
  margin: 0 0 8px;
  font: 600 10.5px/1 system-ui, sans-serif;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: var(--accent);
}

.cdt-22__title {
  margin: 0 0 8px;
  font: 400 clamp(23px, 4.6vw, 36px)/1.12 var(--font-display);
  letter-spacing: -0.01em;
  text-wrap: balance;
}

.cdt-22__sub {
  margin: 0;
  max-inline-size: 48ch;
  font-size: 13.5px;
  line-height: 1.6;
  color: var(--muted);
  text-wrap: pretty;
}

.cdt-22__clock {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: flex-start;
  gap: clamp(6px, 2vw, 14px);
}

.cdt-22__clock[hidden] {
  display: none;
}

.cdt-22__group {
  display: grid;
  gap: 9px;
  justify-items: center;
}

.cdt-22__cards {
  display: flex;
  gap: 5px;
}

.cdt-22__digit {
  position: relative;
  display: block;
  inline-size: var(--card-w);
  block-size: calc(var(--card-w) * 1.34);
  perspective: 420px;
  font: 400 calc(var(--card-w) * 0.86)/1 var(--font-display);
  font-variant-numeric: tabular-nums;
  color: var(--ink);
  border-radius: 7px;
  background: var(--cardlow);
  box-shadow: 0 8px 18px -8px rgba(0, 0, 0, 0.6), inset 0 0 0 1px rgba(0, 0, 0, 0.12);
}

.cdt-22__digit b {
  position: absolute;
  inset-inline: 0;
  display: grid;
  overflow: hidden;
  backface-visibility: hidden;
}

.cdt-22__top,
.cdt-22__flap--t {
  inset-block-start: 0;
  block-size: 50%;
  align-items: end;
  border-radius: 7px 7px 0 0;
  background: var(--card);
  border-block-end: 1px solid rgba(33, 24, 18, 0.28);
}

.cdt-22__bot,
.cdt-22__flap--b {
  inset-block-end: 0;
  block-size: 50%;
  align-items: start;
  border-radius: 0 0 7px 7px;
  background: var(--cardlow);
}

.cdt-22__top > *,
.cdt-22__bot > * {
  justify-self: center;
}

.cdt-22__top,
.cdt-22__flap--t {
  line-height: 0;
  padding-block-start: calc(var(--card-w) * 0.6);
}

.cdt-22__bot,
.cdt-22__flap--b {
  line-height: 0;
  padding-block-start: 1px;
}

.cdt-22__top,
.cdt-22__flap--t,
.cdt-22__bot,
.cdt-22__flap--b {
  justify-content: center;
}

.cdt-22__flap--t {
  transform-origin: bottom center;
  z-index: 3;
  opacity: 0;
}

.cdt-22__flap--b {
  transform-origin: top center;
  z-index: 2;
  opacity: 0;
}

.cdt-22__digit[data-flip] .cdt-22__flap--t {
  opacity: 1;
  animation: cdt22-fall var(--flap) ease-in forwards;
}

.cdt-22__digit[data-flip] .cdt-22__flap--b {
  opacity: 1;
  animation: cdt22-rise var(--flap) ease-out var(--flap) forwards;
}

@keyframes cdt22-fall {
  from {
    transform: rotateX(0deg);
  }

  to {
    transform: rotateX(-90deg);
  }
}

@keyframes cdt22-rise {
  from {
    transform: rotateX(90deg);
  }

  to {
    transform: rotateX(0deg);
  }
}

.cdt-22__label {
  margin: 0;
  font: 600 10px/1 system-ui, sans-serif;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--muted);
}

.cdt-22__sep {
  align-self: center;
  inline-size: 5px;
  block-size: 5px;
  margin-block-start: calc(var(--card-w) * 0.6);
  border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 calc(var(--card-w) * -0.3) 0 0 var(--accent);
}

.cdt-22__target {
  margin: 0;
  font-size: 12.5px;
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}

.cdt-22__done {
  padding: 22px 26px;
  border: 1px solid rgba(242, 227, 200, 0.22);
  border-radius: 10px;
}

.cdt-22__done[hidden] {
  display: none;
}

.cdt-22__done strong {
  display: block;
  font: 400 clamp(22px, 5vw, 30px)/1.1 var(--font-display);
  color: var(--accent);
}

.cdt-22__done span {
  font-size: 12.5px;
  color: var(--muted);
}

.cdt-22__sr {
  position: absolute;
  inline-size: 1px;
  block-size: 1px;
  overflow: hidden;
  clip-path: inset(50%);
}

@media (prefers-reduced-motion: reduce) {
  .cdt-22__digit[data-flip] .cdt-22__flap--t,
    .cdt-22__digit[data-flip] .cdt-22__flap--b {
    animation: none;
    opacity: 0;
  }
}
/* --- pure-CSS theme toggle ------------------------------------------- */

.cdt-22 {
  position: relative;
}

.cdt-22__tgl {
  position: absolute;
  inline-size: 1px;
  block-size: 1px;
  overflow: hidden;
  clip-path: inset(50%);
}

.cdt-22__tglbtn {
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

.cdt-22__tglbtn:hover {
  opacity: 1;
}

.cdt-22__tgl:focus-visible + .cdt-22__tglbtn {
  outline: 2px solid currentColor;
  outline-offset: 2px;
  opacity: 1;
}

.cdt-22__tglbtn svg {
  flex: none;
}

.cdt-22__moon,
.cdt-22__darktext {
  display: none;
}

.cdt-22:has(.cdt-22__tgl:checked) .cdt-22__sun,
.cdt-22:has(.cdt-22__tgl:checked) .cdt-22__lighttext {
  display: none;
}

.cdt-22:has(.cdt-22__tgl:checked) .cdt-22__moon {
  display: block;
}

.cdt-22:has(.cdt-22__tgl:checked) .cdt-22__darktext {
  display: inline;
}

@media (max-width: 460px) {
  .cdt-22__tglbtn {
    padding: 12px;
  }

  .cdt-22__darktext,
    .cdt-22__lighttext,
    .cdt-22:has(.cdt-22__tgl:checked) .cdt-22__darktext,
    .cdt-22:has(.cdt-22__tgl:checked) .cdt-22__lighttext {
    display: none;
  }
}
/* toggle in the system-dark case */

@media (prefers-color-scheme: dark) {
  .cdt-22:has(.cdt-22__tgl:checked) {
    --page: #efe7d9;
    --card: #2a2118;
    --cardlow: #221a13;
    --ink: #f5e9d2;
    --muted: #6f6151;
    --accent: #a2620d;
  }

  .cdt-22:has(.cdt-22__tgl:checked) {
    color: var(--card);
  }

  .cdt-22:has(.cdt-22__tgl:checked) .cdt-22__digit {
    color: var(--ink);
    box-shadow: 0 8px 18px -10px rgba(42, 33, 24, 0.5), inset 0 0 0 1px rgba(245, 233, 210, 0.14);
  }

  .cdt-22:has(.cdt-22__tgl:checked) .cdt-22__top,
    .cdt-22:has(.cdt-22__tgl:checked) .cdt-22__flap--t {
    border-block-end-color: rgba(245, 233, 210, 0.22);
  }

  .cdt-22:has(.cdt-22__tgl:checked) .cdt-22__done {
    border-color: rgba(42, 33, 24, 0.2);
  }
}

@media (prefers-color-scheme: light) {
  .cdt-22 {
    --page: #efe7d9;
    --card: #2a2118;
    --cardlow: #221a13;
    --ink: #f5e9d2;
    --muted: #6f6151;
    --accent: #a2620d;
  }

  .cdt-22 {
    color: var(--card);
  }

  .cdt-22__digit {
    color: var(--ink);
    box-shadow: 0 8px 18px -10px rgba(42, 33, 24, 0.5), inset 0 0 0 1px rgba(245, 233, 210, 0.14);
  }

  .cdt-22__top,
    .cdt-22__flap--t {
    border-block-end-color: rgba(245, 233, 210, 0.22);
  }

  .cdt-22__done {
    border-color: rgba(42, 33, 24, 0.2);
  }
  /* mirror flip-back: checked means the opposite of the system preference */

  .cdt-22:has(.cdt-22__tgl:checked) {
    --page: oklch(18% 0.02 55);
    --card: oklch(91% 0.04 85);
    --cardlow: oklch(85% 0.045 85);
    --ink: oklch(20% 0.02 50);
    --muted: oklch(68% 0.04 75);
    --accent: oklch(74% 0.14 70);
  }

  .cdt-22:has(.cdt-22__tgl:checked) {
    color: var(--card);
  }

  .cdt-22:has(.cdt-22__tgl:checked) .cdt-22__digit {
    color: var(--ink);
    box-shadow: 0 8px 18px -8px rgba(0, 0, 0, 0.6), inset 0 0 0 1px rgba(0, 0, 0, 0.12);
  }

  .cdt-22:has(.cdt-22__tgl:checked) .cdt-22__top,
    .cdt-22:has(.cdt-22__tgl:checked) .cdt-22__flap--t {
    border-block-end-color: rgba(33, 24, 18, 0.28);
  }

  .cdt-22:has(.cdt-22__tgl:checked) .cdt-22__done {
    border-color: rgba(242, 227, 200, 0.22);
  }
}

[data-theme="dark"] .cdt-22 {
  --page: #17120d;
  --card: #f2e3c8;
  --cardlow: #e4d2b4;
  --ink: #211812;
  --muted: #a08c72;
  --accent: #e0952f;
  color: var(--card);
}

[data-theme="dark"] .cdt-22 .cdt-22__digit {
  color: var(--ink);
}
```

## JavaScript
```js
const root = document.querySelector('.cdt-22');
if (root) {
  const q = (s) => root.querySelector(s);
  const digits = [...root.querySelectorAll('[data-digit]')], live = q('[data-live]');
  const target = new Date(Date.now() + 6 * 3600e3 + 24 * 60e3 + 18e3);
  let id = 0, seen = null;
  q('[data-time]').dateTime = target.toISOString();
  q('[data-time]').textContent = target.toLocaleString([], { weekday: 'short', hour: 'numeric', minute: '2-digit' });
  const set = (el, v) => {
    if (el.dataset.v === v) return;
    const prev = el.dataset.v ?? v; el.dataset.v = v;
    const [top, bot, ft, fb] = el.children;
    ft.textContent = prev; fb.textContent = v; top.textContent = v;
    el.removeAttribute('data-flip'); void el.offsetWidth; el.setAttribute('data-flip', '');
    setTimeout(() => { bot.textContent = v; }, 320);
  };
  const tick = () => {
    const ms = Math.max(0, target - Date.now()), s = Math.floor(ms / 1000);
    const str = [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60].map((n) => String(n).padStart(2, '0')).join('');
    digits.forEach((el, i) => set(el, str[i]));
    q('[data-sentence]').textContent = Math.floor(s / 3600) + ' hours ' + (Math.floor(s / 60) % 60) + ' minutes until posting closes';
    const b = ms <= 0 ? 'end' : ms < 600e3 ? 'm10' : ms < 3600e3 ? 'h1' : 'far';
    if (b !== seen) { seen = b; live.textContent = { far: '', h1: 'Under an hour until posting closes.', m10: 'Ten minutes until posting closes.', end: 'Posting is closed for the autumn run.' }[b]; }
    if (ms > 0) { id = setTimeout(tick, 1000 - (Date.now() % 1000)); } else { q('[data-clock]').hidden = true; q('[data-done]').hidden = false; }
  };
  tick();
  root.cleanup = () => clearTimeout(id);
}
```
