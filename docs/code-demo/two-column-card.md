# Icon nên học — Tailwind Social Share Buttons Brand Hover & Copy Link

> Nguồn: CodeFronts (MIT). Segment #11 — tür từ `code_yeucau.md`.
> Nhãn gốc: `gợi ý thêm :`


gợi ý thêm : Here's a working CSS Two-Column Layout from CodeFronts. Use it as-is or adapt to your framework. All classes are scoped under a unique prefix so the code won't collide with your existing styles. MIT licensed.
Demo: CSS Two Column Card Layout
Source: https://codefronts.com/layouts/css-two-column-layout/css-two-column-card-layout/

Horizontal media cards — image left, content and CTA right — arranged two-up with CSS Grid, where each card is a container query component: squeeze a card below 400px and it restacks its own image on top, independent of the viewport. The 2026-correct way to build reusable card layouts for feeds and listings.
## HTML
```html
<section class="tcl-14" aria-label="Two column card layout demo">
  <header class="tcl-14__head">
    <h2>Field guides</h2>
    <span class="tcl-14__hint">Each card restacks via @container, not @media</span>
  </header>
  <div class="tcl-14__feed">
    <div class="tcl-14__cq"><article class="tcl-14__card">
      <div class="tcl-14__media tcl-14__media--a"><img src="https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=480&q=70" alt="Alpine ridge above the clouds on the Tongariro Crossing" width="480" height="480"></div>
      <div class="tcl-14__body">
        <span class="tcl-14__cat">Route guide</span>
        <h3><a href="#tongariro">Tongariro Crossing in one day</a></h3>
        <p>Transport, weather windows and the two mistakes every first-timer makes on the ridge.</p>
        <div class="tcl-14__meta"><span>12 min read</span><span>·</span><span>Updated May 2026</span></div>
      </div>
    </article></div>
    <div class="tcl-14__cq"><article class="tcl-14__card">
      <div class="tcl-14__media tcl-14__media--b"><img src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=480&q=70" alt="Golden-hour surf on an Abel Tasman beach" width="480" height="480"></div>
      <div class="tcl-14__body">
        <span class="tcl-14__cat">Packing list</span>
        <h3><a href="#coast">The 7 kg coastal weekend kit</a></h3>
        <p>Everything for two nights on the Abel Tasman track — weighed, tested, and nothing you’ll regret carrying.</p>
        <div class="tcl-14__meta"><span>8 min read</span><span>·</span><span>Updated June 2026</span></div>
      </div>
    </article></div>
    <div class="tcl-14__cq"><article class="tcl-14__card">
      <div class="tcl-14__media tcl-14__media--c"><img src="https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=480&q=70" alt="Sunlight through a dense green forest canopy" width="480" height="480"></div>
      <div class="tcl-14__body">
        <span class="tcl-14__cat">Skills</span>
        <h3><a href="#nav">Reading weather without a signal</a></h3>
        <p>Cloud sequences, wind shifts and the pressure cues that give you a six-hour warning.</p>
        <div class="tcl-14__meta"><span>15 min read</span><span>·</span><span>Updated July 2026</span></div>
      </div>
    </article></div>
    <div class="tcl-14__cq"><article class="tcl-14__card">
      <div class="tcl-14__media tcl-14__media--d"><img src="https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=480&q=70" alt="Misty hills at dusk" width="480" height="480"></div>
      <div class="tcl-14__body">
        <span class="tcl-14__cat">Gear review</span>
        <h3><a href="#stoves">Four stoves, one boil test</a></h3>
        <p>We timed 500 ml boils at altitude in wind — the winner costs half what you’d guess.</p>
        <div class="tcl-14__meta"><span>10 min read</span><span>·</span><span>Updated July 2026</span></div>
      </div>
    </article></div>
  </div>
</section>
```
## CSS
```css
.tcl-14,
.tcl-14 *,
.tcl-14 *::before,
.tcl-14 *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

.tcl-14 {
  width: 100%;
  min-height: 100vh;
  --accent: oklch(0.55 0.14 150);
  --ink: oklch(0.25 0.02 150);
  font-family: 'Segoe UI',system-ui,sans-serif;
  color: var(--ink);
  background: oklch(0.97 0.008 150);
  padding: clamp(24px,4vw,52px);
}

.tcl-14__head {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: space-between;
  align-items: baseline;
  max-width: 980px;
  margin: 0 auto 22px;
}

.tcl-14__head h2 {
  font-size: clamp(22px,3vw,30px);
  letter-spacing: -.02em;
}

.tcl-14__hint {
  font: 600 11px/1 ui-monospace,monospace;
  color: var(--accent);
  border: 1px dashed color-mix(in oklab,var(--accent) 50%,transparent);
  border-radius: 99px;
  padding: 6px 10px;
}

.tcl-14__feed {
  display: grid;
  grid-template-columns: repeat(auto-fit,minmax(300px,1fr));
  gap: 18px;
  max-width: 980px;
  margin-inline: auto;
}

.tcl-14__cq {
  container-type: inline-size;
  min-width: 0;
}

.tcl-14__card {
  position: relative;
  display: grid;
  grid-template-columns: 132px 1fr;
  background: #fff;
  border: 1px solid oklch(0.9 0.012 150);
  border-radius: 16px;
  overflow: hidden;
  height: 100%;
  transition: transform .2s,box-shadow .25s;
}

.tcl-14__card:hover {
  transform: translateY(-3px);
  box-shadow: 0 18px 36px -22px oklch(0.4 0.08 150/.7);
}

.tcl-14__card:focus-within {
  outline: 3px solid var(--accent);
  outline-offset: 2px;
}

.tcl-14__media {
  position: relative;
  min-height: 100%;
  overflow: hidden;
}

.tcl-14__media img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.tcl-14__media--a {
  background: linear-gradient(150deg,oklch(0.75 0.1 230),oklch(0.5 0.12 260));
}

.tcl-14__media--b {
  background: linear-gradient(150deg,oklch(0.85 0.08 80),oklch(0.65 0.13 40));
}

.tcl-14__media--c {
  background: linear-gradient(150deg,oklch(0.72 0.13 150),oklch(0.42 0.09 165));
}

.tcl-14__media--d {
  background: linear-gradient(150deg,oklch(0.6 0.13 300),oklch(0.35 0.09 280));
}

.tcl-14__body {
  display: grid;
  gap: 8px;
  align-content: start;
  padding: 16px 18px;
}

.tcl-14__cat {
  font: 700 10.5px/1 inherit;
  letter-spacing: .12em;
  text-transform: uppercase;
  color: var(--accent);
}

.tcl-14__body h3 {
  font-size: 16.5px;
  line-height: 1.3;
  letter-spacing: -.01em;
  text-wrap: balance;
}

.tcl-14__body h3 a {
  color: inherit;
  text-decoration: none;
}

.tcl-14__body h3 a::after {
  content: "";
  position: absolute;
  inset: 0;
}

.tcl-14__body h3 a:focus-visible {
  outline: none;
}

.tcl-14__body p {
  font-size: 13px;
  line-height: 1.6;
  color: color-mix(in oklab,var(--ink) 65%,transparent);
  text-wrap: pretty;
}

.tcl-14__meta {
  display: flex;
  gap: 6px;
  font-size: 11.5px;
  color: color-mix(in oklab,var(--ink) 50%,transparent);
  margin-top: 2px;
}

@container (max-width: 400px) {
  .tcl-14__card {
    grid-template-columns: 1fr;
  }

  .tcl-14__media {
    min-height: 110px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .tcl-14__card {
    transition: none;
  }
}
```

## JavaScript
```js
/* No JavaScript — the feed is repeat(auto-fit,minmax(300px,1fr)); each card lives in a container-type:inline-size wrapper and restacks itself with @container (max-width:400px). */
```