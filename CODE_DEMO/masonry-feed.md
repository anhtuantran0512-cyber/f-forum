# Câu hỏi & bài đăng sườn — CSS Masonry Social Media Feed Cards

> Nguồn: CodeFronts (MIT). Segment #09 — tür từ `code_yeucau.md`.
> Nhãn gốc: `các câu hỏi và bài đăng nên dựa vào cái này sáng tạo thêm chất riêng làm sườn :`


các câu hỏi và bài đăng nên dựa vào cái này sáng tạo thêm chất riêng làm sườn : Here's a working CSS Masonry Layout from CodeFronts. Use it as-is or adapt to your framework. All classes are scoped under a unique prefix so the code won't collide with your existing styles. MIT licensed.
Demo: CSS Masonry Social Media Feed Cards
Source: https://codefronts.com/layouts/css-masonry-layouts/css-masonry-social-media-feed-cards/

The third classic masonry engine — flex-flow: column wrap — powering a dark 'Trending now' board of social cards with wildly unequal heights: one-liners, threads, a media post, a poll. Flexbox masonry has one hard rule (the container needs a fixed block-size) and one superpower nobody mentions: overflow becomes extra columns that scroll HORIZONTALLY, which turns the constraint into a board UX on purpose.
## HTML
```html
<section class="msn-06" aria-label="CSS masonry social feed cards demo">
  <div class="msn-06__stage">
    <header class="msn-06__head">
      <div><h2>Trending now</h2><p>Design & dev · refreshed 2 min ago</p></div>
      <div class="msn-06__legend"><span>Scroll sideways for more lanes</span><span class="msn-06__dot" aria-hidden="true"></span></div>
    </header>
    <div class="msn-06__board" tabindex="0" aria-label="Trending posts board, scrolls horizontally">
      <article class="msn-06__card msn-06__card--pin"><header><i style="--a:oklch(0.75 0.12 300);--b:oklch(0.5 0.15 330)"></i><div><strong>Rhea Chen <em class="msn-06__ok" aria-label="verified"></em></strong><span>@rheabuilds · pinned</span></div></header><p>CSS masonry week on this account. Day 1: you probably don't need the library. Thread ↓</p><footer><a href="#r1">214</a><a href="#s1">1.2k</a><a href="#l1">8.4k</a></footer></article>
      <article class="msn-06__card"><header><i style="--a:oklch(0.8 0.1 150);--b:oklch(0.55 0.12 170)"></i><div><strong>Devon Park</strong><span>@devon_p · 14m</span></div></header><p>hot take: columns:230px is the most underrated line of CSS shipped this decade</p><footer><a href="#r2">89</a><a href="#s2">402</a><a href="#l2">3.1k</a></footer></article>
      <article class="msn-06__card msn-06__card--media"><header><i style="--a:oklch(0.78 0.11 40);--b:oklch(0.55 0.15 20)"></i><div><strong>Ada Okafor <em class="msn-06__ok" aria-label="verified"></em></strong><span>@ada_ships · 41m</span></div></header><p>Zero-JS masonry on the marketing site. INP went from 310ms to 96ms. Receipts:</p><figure style="--img:url('https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=800&auto=format&fit=crop');--a:oklch(0.5 0.1 260);--b:oklch(0.3 0.09 280)"></figure><footer><a href="#r3">156</a><a href="#s3">980</a><a href="#l3">5.7k</a></footer></article>
      <article class="msn-06__card"><header><i style="--a:oklch(0.72 0.09 220);--b:oklch(0.48 0.11 240)"></i><div><strong>Sam Ridley</strong><span>@samr · 1h</span></div></header><p>me: one small layout fix<br>the fix: display:flex<br>flex: no<br>me: flex-flow:column wrap<br>flex: …go on</p><footer><a href="#r4">44</a><a href="#s4">210</a><a href="#l4">1.9k</a></footer></article>
      <article class="msn-06__card msn-06__card--poll"><header><i style="--a:oklch(0.82 0.08 90);--b:oklch(0.6 0.11 70)"></i><div><strong>Frontend Pulse</strong><span>@fepulse · 2h · poll</span></div></header><p>Which masonry engine do you ship in 2026?</p><div class="msn-06__poll"><a href="#v1" style="--w:52%"><span>CSS columns</span><b>52%</b></a><a href="#v2" style="--w:31%"><span>Grid row spans</span><b>31%</b></a><a href="#v3" style="--w:11%"><span>display:masonry</span><b>11%</b></a><a href="#v4" style="--w:6%"><span>Still Masonry.js</span><b>6%</b></a></div><footer><a href="#r5">61</a><a href="#s5">340</a><a href="#l5">2.2k</a></footer></article>
      <article class="msn-06__card"><header><i style="--a:oklch(0.7 0.13 330);--b:oklch(0.45 0.14 350)"></i><div><strong>Mia Torres</strong><span>@miat · 3h</span></div></header><p>Accessibility review notes from this week: if your hover reveal doesn't also fire on :focus-within, it doesn't exist for half my testers. Free fix. Ship it.</p><footer><a href="#r6">73</a><a href="#s6">515</a><a href="#l6">4.4k</a></footer></article>
      <article class="msn-06__card"><header><i style="--a:oklch(0.76 0.1 190);--b:oklch(0.5 0.11 210)"></i><div><strong>Kit Nakamura <em class="msn-06__ok" aria-label="verified"></em></strong><span>@kitbuilds · 4h</span></div></header><p>Deleted 41KB of layout JS today.</p><footer><a href="#r7">98</a><a href="#s7">760</a><a href="#l7">6.1k</a></footer></article>
      <article class="msn-06__card"><header><i style="--a:oklch(0.8 0.09 60);--b:oklch(0.58 0.12 40)"></i><div><strong>Lena Fischer</strong><span>@lenaf · 5h</span></div></header><p>Reminder that a testimonial wall is just a masonry layout wearing a suit. Same three techniques, different copy. Full write-up on the blog — link in bio, as tradition demands.</p><footer><a href="#r8">27</a><a href="#s8">130</a><a href="#l8">1.1k</a></footer></article>
      <article class="msn-06__card"><header><i style="--a:oklch(0.74 0.11 270);--b:oklch(0.5 0.13 290)"></i><div><strong>Omar Haddad</strong><span>@omarh · 6h</span></div></header><p>Interview question I actually like: "your PM wants Pinterest. Walk me through your options and their tab order."</p><footer><a href="#r9">52</a><a href="#s9">288</a><a href="#l9">2.7k</a></footer></article>
    </div>
  </div>
</section>
```
## CSS
```css
.msn-06,
.msn-06 *,
.msn-06 *::before,
.msn-06 *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

.msn-06 {
  --headH: 64px;
  --bg: oklch(0.19 0.012 270);
  --card: oklch(0.24 0.014 270);
  --ink: oklch(0.94 0.008 270);
  --mut: oklch(0.66 0.015 270);
  --line: oklch(0.32 0.015 270);
  --acc: oklch(0.75 0.13 200);
  font-family: 'Segoe UI',system-ui,sans-serif;
  color: var(--ink);
  container-type: inline-size;
  display: block;
  width: 100%;
  min-height: 100vh;
  min-height: 100svh;
  background: var(--bg);
}

.msn-06__stage {
  width: 100%;
  container: msn06/inline-size;
  height: 100vh;
  height: 100svh;
  display: flex;
  flex-direction: column;
  background: var(--bg);
}

.msn-06__head {
  flex: none;
  height: var(--headH);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 0 clamp(16px,3cqi,26px);
  border-bottom: 1px solid var(--line);
}

.msn-06__head h2 {
  font-size: clamp(17px,2.4cqi,21px);
  letter-spacing: -.02em;
}

.msn-06__head p {
  font-size: 11.5px;
  color: var(--mut);
  margin-top: 2px;
}

.msn-06__legend {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11.5px;
  color: var(--mut);
}

.msn-06__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--acc);
  animation: msn06-pulse 2s ease-in-out infinite;
}

@keyframes msn06-pulse {
  0%,
    100% {
    opacity: 1;
    scale: 1;
  }

  50% {
    opacity: .4;
    scale: .8;
  }
}

.msn-06__board {
  flex: 1;
  display: flex;
  flex-flow: column wrap;
  align-content: start;
  gap: 12px;
  block-size: calc(100vh - var(--headH));
  block-size: calc(100svh - var(--headH));
  overflow-x: auto;
  overscroll-behavior-x: contain;
  padding: 14px clamp(16px,3cqi,26px);
  scrollbar-width: thin;
  scrollbar-color: var(--line) transparent;
}

.msn-06__board:focus-visible {
  outline: 3px solid var(--acc);
  outline-offset: -3px;
}

.msn-06__card {
  inline-size: 270px;
  max-block-size: calc(100% - 12px);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px 15px;
  border-radius: 14px;
  background: var(--card);
  border: 1px solid var(--line);
  transition: border-color .25s,translate .25s;
}

.msn-06__card:hover,
.msn-06__card:focus-within {
  border-color: oklch(0.45 0.02 270);
  translate: 0 -2px;
}

.msn-06__card--pin {
  border-color: color-mix(in oklch,var(--acc) 45%,var(--line));
}

.msn-06__card header {
  display: flex;
  align-items: center;
  gap: 10px;
}

.msn-06__card header i {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  flex: none;
  background: linear-gradient(140deg,var(--a),var(--b));
}

.msn-06__card header strong {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 13px;
  letter-spacing: -.01em;
}

.msn-06__ok {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: conic-gradient(from 40deg,var(--acc),oklch(0.6 0.14 260),var(--acc));
  position: relative;
}

.msn-06__ok::after {
  content: "";
  position: absolute;
  inset: 3.5px;
  border-radius: 2px;
  background: var(--card);
  clip-path: polygon(14% 46%,38% 68%,88% 12%,100% 24%,40% 92%,0 58%);
}

.msn-06__card header span {
  display: block;
  font-size: 11px;
  color: var(--mut);
  margin-top: 1px;
}

.msn-06__card>p {
  font-size: 13px;
  line-height: 1.55;
  text-wrap: pretty;
}

.msn-06__card figure {
  aspect-ratio: 16/9;
  border-radius: 10px;
  background-image: var(--img,none),linear-gradient(150deg,var(--a),var(--b));
  background-size: cover;
  background-position: center;
}

.msn-06__poll {
  display: grid;
  gap: 6px;
}

.msn-06__poll a {
  position: relative;
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-height: 38px;
  padding: 0 12px;
  border-radius: 9px;
  overflow: clip;
  font-size: 12px;
  font-weight: 600;
  text-decoration: none;
  color: var(--ink);
  border: 1px solid var(--line);
}

.msn-06__poll a::before {
  content: "";
  position: absolute;
  inset: 0;
  width: var(--w);
  background: color-mix(in oklch,var(--acc) 26%,transparent);
  transition: width .5s cubic-bezier(.2,.7,.2,1);
}

.msn-06__poll a:hover::before,
.msn-06__poll a:focus-visible::before {
  background: color-mix(in oklch,var(--acc) 38%,transparent);
}

.msn-06__poll a:focus-visible {
  outline: 2px solid var(--acc);
  outline-offset: 1px;
}

.msn-06__poll span,
.msn-06__poll b {
  position: relative;
}

.msn-06__card footer {
  display: flex;
  gap: 6px;
  margin-top: auto;
}

.msn-06__card footer a {
  display: grid;
  place-items: center;
  min-height: 34px;
  min-width: 44px;
  padding: 0 10px;
  border-radius: 8px;
  font-size: 11.5px;
  font-weight: 600;
  text-decoration: none;
  color: var(--mut);
  transition: color .2s,background .2s;
}

.msn-06__card footer a:hover,
.msn-06__card footer a:focus-visible {
  color: var(--acc);
  background: oklch(0.29 0.016 270);
}

.msn-06__card footer a:focus-visible {
  outline: 2px solid var(--acc);
  outline-offset: -2px;
}

@container msn06 (width < 480px) {
  .msn-06__card {
    inline-size: 82cqi;
  }

  .msn-06__legend span {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .msn-06 * {
    transition-duration: .01ms !important;
    animation: none !important;
  }
}
```