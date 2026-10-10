# Thêm — Border Radius Scale cho puffy shapes

> Nguồn: CodeFronts (MIT). Segment #04 — tür từ `code_yeucau.md`.
> Nhãn gốc: `THÊM :`


THÊM :Here's a working CSS Claymorphism from CodeFronts. Use it as-is or adapt to your framework. All classes are scoped under a unique prefix so the code won't collide with your existing styles. MIT licensed.
Demo: Border Radius Scale for Puffy Shapes
Source: https://codefronts.com/design-styles/css-claymorphism/border-radius-scale-for-puffy-shapes/

Radius is what makes clay clay. This is the working scale — 16px to a full pill — shown at one size so you can see exactly where a rectangle stops being a card and starts being a puffed shape, plus the two advanced corners most tutorials skip: the elliptical slash syntax and the new corner-shape: squircle, progressively enhanced with @supports.
## HTML
```html
<section class="cl-03" aria-label="Border radius scale for puffy claymorphism shapes">
  <div class="cl-03__stage">
    <header class="cl-03__head">
      <h2 class="cl-03__h">The puffy radius scale</h2>
      <p class="cl-03__lede">Same size, same shadow, same fill. Only the corner changes — watch where a card becomes clay.</p>
    </header>
    <ul class="cl-03__grid">
      <li class="cl-03__cell"><span class="cl-03__sh cl-03__sh--sm" aria-hidden="true"></span><b>16px</b><span>chips, tags</span></li>
      <li class="cl-03__cell"><span class="cl-03__sh cl-03__sh--md" aria-hidden="true"></span><b>24px</b><span>inputs</span></li>
      <li class="cl-03__cell"><span class="cl-03__sh cl-03__sh--lg" aria-hidden="true"></span><b>32px</b><span>cards, tiles</span></li>
      <li class="cl-03__cell"><span class="cl-03__sh cl-03__sh--xl" aria-hidden="true"></span><b>44px</b><span>hero objects</span></li>
      <li class="cl-03__cell"><span class="cl-03__sh cl-03__sh--blob" aria-hidden="true"></span><b>46% / 38%</b><span>elliptical blob</span></li>
      <li class="cl-03__cell"><span class="cl-03__sh cl-03__sh--sq" aria-hidden="true"></span><b>squircle</b><span>corner-shape</span></li>
    </ul>
    <div class="cl-03__ruler">
      <span class="cl-03__rlabel">flat</span>
      <span class="cl-03__track" aria-hidden="true"><i></i></span>
      <span class="cl-03__rlabel">puffy</span>
    </div>
    <p class="cl-03__chip" aria-hidden="true">radius &gt;= 18% of the short side · slash syntax · @supports (corner-shape: squircle)</p>
  </div>
</section>
```
## CSS
```css
.cl-03,
.cl-03 *,
.cl-03 *::before,
.cl-03 *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

.cl-03 {
  width: 100%;
  min-height: 100vh;
  min-height: 100svh;
  display: block;
  background: var(--cl-03-bg);
  --cl-03-bg: oklch(0.94 0.035 195);
  --cl-03-clay: oklch(0.81 0.1 205);
  --cl-03-shade: color-mix(in oklch,var(--cl-03-clay) 45%,oklch(0.4 0.1 220));
  --cl-03-light: oklch(0.99 0.02 200/.95);
  --cl-03-ink: oklch(0.29 0.05 220);
  --cl-03-mut: oklch(0.51 0.045 215);
  font-family: system-ui,-apple-system,'Segoe UI',sans-serif;
  color: var(--cl-03-ink);
}

.cl-03__stage {
  min-height: 100vh;
  min-height: 100svh;
  display: grid;
  place-items: center;
  align-content: center;
  gap: clamp(24px,4vw,40px);
  padding: clamp(22px,5vw,60px);
  background: radial-gradient(85% 60% at 50% 0%,oklch(0.97 0.035 200),transparent 68%);
}

.cl-03__head {
  text-align: center;
  max-width: 56ch;
  display: grid;
  gap: 9px;
}

.cl-03__h {
  font-size: clamp(24px,4vw,35px);
  font-weight: 780;
  letter-spacing: -.02em;
  text-wrap: balance;
}

.cl-03__lede {
  font-size: 15px;
  line-height: 1.6;
  color: var(--cl-03-mut);
  text-wrap: pretty;
}

.cl-03__grid {
  list-style: none;
  display: grid;
  grid-template-columns: repeat(auto-fit,minmax(132px,1fr));
  gap: clamp(14px,2.5vw,24px);
  width: min(100%,880px);
}

.cl-03__cell {
  display: grid;
  justify-items: center;
  gap: 5px;
  font-size: 12.5px;
  color: var(--cl-03-mut);
  text-align: center;
}

.cl-03__cell b {
  margin-top: 12px;
  font-family: ui-monospace,Menlo,Consolas,monospace;
  font-size: 13px;
  font-weight: 600;
  color: var(--cl-03-ink);
}

.cl-03__sh {
  width: 100%;
  max-width: 124px;
  aspect-ratio: 1;
  background: var(--cl-03-clay);
  box-shadow: 0 20px 34px -14px var(--cl-03-shade),inset 0 -14px 22px -10px var(--cl-03-shade),inset 0 16px 22px -8px var(--cl-03-light);
  transition: translate .35s cubic-bezier(.34,1.35,.5,1),scale .35s cubic-bezier(.34,1.35,.5,1);
}

.cl-03__cell:hover .cl-03__sh {
  translate: 0 -8px;
  scale: 1.03;
}

.cl-03__sh--sm {
  border-radius: 16px;
}

.cl-03__sh--md {
  border-radius: 24px;
}

.cl-03__sh--lg {
  border-radius: 32px;
}

.cl-03__sh--xl {
  border-radius: 44px;
}

.cl-03__sh--blob {
  border-radius: 46% 38% 44% 40% / 40% 46% 38% 44%;
}

.cl-03__sh--sq {
  border-radius: 32px;
}

@supports (corner-shape: squircle) {
  .cl-03__sh--sq {
    border-radius: 38%;
    corner-shape: squircle;
  }
}

.cl-03__ruler {
  display: flex;
  align-items: center;
  gap: 14px;
  width: min(100%,520px);
  font-size: 11.5px;
  letter-spacing: .12em;
  text-transform: uppercase;
  color: var(--cl-03-mut);
}

.cl-03__track {
  flex: 1;
  height: 12px;
  border-radius: 99px;
  background: color-mix(in oklch,var(--cl-03-bg) 84%,white);
  box-shadow: inset 0 -5px 10px -6px var(--cl-03-shade),inset 0 6px 10px -5px var(--cl-03-light);
  overflow: hidden;
}

.cl-03__track i {
  display: block;
  height: 100%;
  width: 60%;
  border-radius: 99px;
  background: var(--cl-03-clay);
  box-shadow: inset 0 6px 8px -6px var(--cl-03-light);
}

.cl-03__chip {
  font-family: ui-monospace,Menlo,Consolas,monospace;
  font-size: 11.5px;
  color: var(--cl-03-mut);
  padding: 9px 16px;
  border-radius: 99px;
  text-align: center;
  background: oklch(1 0 0/.5);
  box-shadow: inset 0 -4px 10px -8px var(--cl-03-shade),inset 0 6px 10px -6px oklch(1 0 0);
}

@media (prefers-reduced-motion: reduce) {
  .cl-03 * {
    transition-duration: .01ms !important;
  }
}
```