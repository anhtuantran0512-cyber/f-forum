# Tài nguyên thẻ Depth Parallax Landscape

> Nguồn: CodeFronts (MIT). Segment #00 — tür từ `code_yeucau.md`.
> Nhãn gốc: `Không nhãn`


 Here's a working CSS demo from CodeFronts. Use it as-is or adapt to your framework. All classes are scoped under a unique prefix so the code won't collide with your existing styles. MIT licensed.
Demo: Tailwind Depth Parallax Landscape Card with Layer Multipliers
Source: https://codefronts.com/motion/tailwind-css-card-hover-effects/tailwind-depth-parallax-landscape-card/

A dawn-trek card whose ridgelines, sun and foreground hills drift at different rates as the cursor moves. The scene is four gradient layers &mdash; no images &mdash; and the depth contract lives in data-depth attributes the JS reads, so adding a layer means adding one number.
## HTML
```html
<section class="tch-15 w-full min-h-svh grid place-items-center bg-tch15-bg font-tch15-sans p-8 [perspective:1000px]">
  <article data-tch15="root" tabindex="0" class="relative w-[340px] h-[440px] rounded-[22px] overflow-hidden cursor-pointer outline-none transform-3d bg-linear-to-b from-tch15-sky to-tch15-bg shadow-[0_20px_50px_rgb(0_0_0/0.45)] transition-transform duration-200 ease-out focus-visible:outline-3 focus-visible:outline-tch15-sun focus-visible:outline-offset-4 *:absolute *:inset-0 *:transition-transform *:duration-200 *:ease-out *:will-change-transform motion-reduce:transition-none motion-reduce:*:transition-none">
    <div data-depth="8" class="opacity-90 bg-[radial-gradient(circle_at_20%_70%,#1b4a63_0_28%,transparent_29%),radial-gradient(circle_at_70%_75%,#1b4a63_0_32%,transparent_33%)]"></div>
    <div data-depth="16" class="grid place-items-center">
      <div class="size-[130px] -mt-15 rounded-full bg-[radial-gradient(circle,#ffd56b,#ff8c42)] shadow-[0_0_60px_rgb(255_170_80/0.6)]"></div>
    </div>
    <div data-depth="28" class="bg-[radial-gradient(ellipse_120%_60%_at_30%_110%,#06222e_60%,transparent_61%),radial-gradient(ellipse_120%_50%_at_80%_115%,#04161e_60%,transparent_61%)]"></div>
    <div data-depth="40" class="z-5 p-[2.2rem] flex flex-col justify-end text-tch15-ink">
      <span class="text-[0.72rem] tracking-[0.28em] uppercase text-tch15-sun">Field Notes</span>
      <h2 class="font-tch15-display font-extrabold text-[2.6rem] leading-[0.95] mt-1.5 mb-2">Valley of<br>Long Light</h2>
      <p class="text-[0.85rem] leading-[1.6] text-tch15-body">A guided dawn trek through layered ridgelines. Move your cursor to feel the depth.</p>
    </div>
  </article>
</section>
```
## CSS
```css
@import "tailwindcss";

@theme {
  --color-tch15-bg: #0b1d2a;
  --color-tch15-bg: oklch(0.23 0.04 240);
  --color-tch15-sky: #2c6e8f;
  --color-tch15-sky: oklch(0.52 0.08 235);
  --color-tch15-ink: #eaf4fa;
  --color-tch15-ink: oklch(0.96 0.01 230);
  --color-tch15-body: #b9d0dd;
  --color-tch15-body: oklch(0.83 0.03 230);
  --color-tch15-sun: #ffd56b;
  --color-tch15-sun: oklch(0.88 0.13 85);
  --font-tch15-sans: 'Inter Tight', system-ui, sans-serif;
  --font-tch15-display: 'Bricolage Grotesque', system-ui, sans-serif;
}

.tch-15 {
  width: 100%;
  min-height: 100svh;
}
```

## JavaScript
```js
(() => {
  const root = document.querySelector('.tch-15');
  if (!root) return;
  const card = root.querySelector('[data-tch15="root"]');
  if (!card) return;
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const layers = card.querySelectorAll('[data-depth]');
  let frame = 0;
  card.addEventListener('mousemove', (e) => {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform = 'rotateY(' + (x * 10) + 'deg) rotateX(' + (-y * 10) + 'deg)';
      layers.forEach((l) => {
        const d = parseFloat(l.dataset.depth);
        l.style.transform = 'translate(' + (-x * d) + 'px, ' + (-y * d) + 'px)';
      });
    });
  });
  card.addEventListener('mouseleave', () => {
    card.style.transform = 'rotateY(0deg) rotateX(0deg)';
    layers.forEach((l) => { l.style.transform = 'translate(0,0)'; });
  });
})();
```