CODE TÀI NGUYÊN DÙNG ĐỂ THAM KHẢO ÁP DỤNG : 
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
GUI Ở CHẾ ĐỘ POTATOR : Here's a working CSS demo from CodeFronts. Use it as-is or adapt to your framework. All classes are scoped under a unique prefix so the code won't collide with your existing styles. MIT licensed.
Demo: Tailwind Inner-Glow Glass Nav Links
Source: https://codefronts.com/navigation/tailwind-liquid-glass-navbars/tailwind-inner-glow-glass-nav-links/

Nav links that illuminate from within: a soft bloom grows inside the glass capsule on hover and a specular rim brightens, so the bar guides the eye with light rather than fills. The port moves the entire ::before layer into the markup with the before: variant &mdash; which is where this pattern reads best, because the glow and the state that triggers it end up on the same line.
## HTML
```html
<section class="nbtw-14 grid place-items-center w-full min-h-svh p-5 font-nb14-sans bg-[radial-gradient(circle_at_25%_25%,#132b4d,#060912_70%),url('https://picsum.photos/seed/nb14/1000/700')] bg-center bg-cover [background-blend-mode:overlay]" aria-label="Inner glow hover links demo">
  <nav class="flex flex-wrap items-center gap-x-5.5 gap-y-3 px-4.5 py-3 rounded-full isolate text-white bg-[color-mix(in_oklab,white_10%,transparent)] border border-white/[0.28] shadow-[inset_0_1px_0_rgba(255,255,255,.4),0_20px_44px_-24px_rgba(0,0,0,.7)] backdrop-blur-[20px] backdrop-saturate-[1.7]" aria-label="Primary">
    <span class="text-base font-extrabold">✺ Lumina</span>
    <div class="flex flex-wrap gap-1.5">
      <a class="relative isolate overflow-hidden flex items-center min-h-[42px] px-4.5 rounded-full no-underline text-white/85 text-[14.5px] font-semibold shadow-[inset_0_0_0_1px_rgba(255,255,255,0)] transition-[color,box-shadow] duration-300 before:content-[''] before:absolute before:inset-0 before:z-[1] before:rounded-[inherit] before:pointer-events-none before:opacity-0 before:scale-40 before:bg-[radial-gradient(60px_60px_at_var(--nb14-mx,50%)_var(--nb14-my,50%),color-mix(in_oklab,var(--color-nb14-glow)_85%,white),transparent_70%)] before:transition-[opacity,transform] before:duration-300 hover:text-[#04141c] hover:before:opacity-95 hover:before:scale-100 hover:shadow-[inset_0_0_0_1px_rgba(255,255,255,.6),0_0_22px_-4px_var(--color-nb14-glow)] focus-visible:text-[#04141c] focus-visible:before:opacity-95 focus-visible:before:scale-100 focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2 aria-[current=page]:text-[#04141c] aria-[current=page]:before:opacity-95 aria-[current=page]:before:scale-100 motion-reduce:transition-none motion-reduce:before:transition-none" href="#nbtw-14" aria-current="page"><span class="relative z-[2]">Home</span></a>
      <a class="relative isolate overflow-hidden flex items-center min-h-[42px] px-4.5 rounded-full no-underline text-white/85 text-[14.5px] font-semibold shadow-[inset_0_0_0_1px_rgba(255,255,255,0)] transition-[color,box-shadow] duration-300 before:content-[''] before:absolute before:inset-0 before:z-[1] before:rounded-[inherit] before:pointer-events-none before:opacity-0 before:scale-40 before:bg-[radial-gradient(60px_60px_at_var(--nb14-mx,50%)_var(--nb14-my,50%),color-mix(in_oklab,var(--color-nb14-glow)_85%,white),transparent_70%)] before:transition-[opacity,transform] before:duration-300 hover:text-[#04141c] hover:before:opacity-95 hover:before:scale-100 hover:shadow-[inset_0_0_0_1px_rgba(255,255,255,.6),0_0_22px_-4px_var(--color-nb14-glow)] focus-visible:text-[#04141c] focus-visible:before:opacity-95 focus-visible:before:scale-100 focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2 motion-reduce:transition-none motion-reduce:before:transition-none" href="#nbtw-14"><span class="relative z-[2]">Explore</span></a>
      <a class="relative isolate overflow-hidden flex items-center min-h-[42px] px-4.5 rounded-full no-underline text-white/85 text-[14.5px] font-semibold shadow-[inset_0_0_0_1px_rgba(255,255,255,0)] transition-[color,box-shadow] duration-300 before:content-[''] before:absolute before:inset-0 before:z-[1] before:rounded-[inherit] before:pointer-events-none before:opacity-0 before:scale-40 before:bg-[radial-gradient(60px_60px_at_var(--nb14-mx,50%)_var(--nb14-my,50%),color-mix(in_oklab,var(--color-nb14-glow)_85%,white),transparent_70%)] before:transition-[opacity,transform] before:duration-300 hover:text-[#04141c] hover:before:opacity-95 hover:before:scale-100 hover:shadow-[inset_0_0_0_1px_rgba(255,255,255,.6),0_0_22px_-4px_var(--color-nb14-glow)] focus-visible:text-[#04141c] focus-visible:before:opacity-95 focus-visible:before:scale-100 focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2 motion-reduce:transition-none motion-reduce:before:transition-none" href="#nbtw-14"><span class="relative z-[2]">Studio</span></a>
      <a class="relative isolate overflow-hidden flex items-center min-h-[42px] px-4.5 rounded-full no-underline text-white/85 text-[14.5px] font-semibold shadow-[inset_0_0_0_1px_rgba(255,255,255,0)] transition-[color,box-shadow] duration-300 before:content-[''] before:absolute before:inset-0 before:z-[1] before:rounded-[inherit] before:pointer-events-none before:opacity-0 before:scale-40 before:bg-[radial-gradient(60px_60px_at_var(--nb14-mx,50%)_var(--nb14-my,50%),color-mix(in_oklab,var(--color-nb14-glow)_85%,white),transparent_70%)] before:transition-[opacity,transform] before:duration-300 hover:text-[#04141c] hover:before:opacity-95 hover:before:scale-100 hover:shadow-[inset_0_0_0_1px_rgba(255,255,255,.6),0_0_22px_-4px_var(--color-nb14-glow)] focus-visible:text-[#04141c] focus-visible:before:opacity-95 focus-visible:before:scale-100 focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2 motion-reduce:transition-none motion-reduce:before:transition-none" href="#nbtw-14"><span class="relative z-[2]">About</span></a>
    </div>
  </nav>
</section>
```
## CSS
```css
@import "tailwindcss";

@theme {
  --color-nb14-glow: #7fd4f0;
  --color-nb14-glow: oklch(0.82 0.16 200);
  --font-nb14-sans: system-ui, 'Segoe UI', sans-serif;
}
```

ICON THAM KHẢO CHO CÁC DANH
HIỆU ( KHÔNG ĐƯỢC  COPY ICON)  Here's a working CSS demo from CodeFronts. Use it as-is or adapt to your framework. All classes are scoped under a unique prefix so the code won't collide with your existing styles. MIT licensed.
Demo: Tailwind RPG Inventory Tooltip with Rarity-Tinted Item Cards
Source: https://codefronts.com/snippets/tailwind-css-tooltips/tailwind-rpg-inventory-tooltip-rarity-tinted-item-cards/

A rarity-tinted loot tooltip: common through legendary, each tier driving its own border, item name, stat bar fill and pulsing aura. The port's move is [--rpg:#fbbf24] &mdash; one arbitrary property on the slot, read by border-[var(--rpg)], text-[var(--rpg)] and bg-[var(--rpg)] on four descendants, which is exactly what the CSS original did and is far easier to see here.
## HTML
```html
<section class="ttp-06 w-full min-h-svh flex items-end justify-center px-7 pt-[320px] pb-15 bg-[radial-gradient(ellipse_at_top,#1a1410_0%,#0a0806_100%)] font-ttp06-sans">
  <div class="relative grid w-full max-w-[520px] grid-cols-5 gap-2 border border-ttp06-gold/20 bg-linear-to-b from-black/40 to-black/60 p-4 shadow-[0_0_0_1px_rgba(0,0,0,0.5),0_0_50px_rgba(212,175,55,0.08),inset_0_1px_0_rgba(212,175,55,0.1)] before:content-['INVENTORY'] before:absolute before:-top-6 before:left-1/2 before:-translate-x-1/2 before:bg-ttp06-panel before:px-3.5 before:font-ttp06-serif before:text-[11px] before:tracking-[0.3em] before:text-ttp06-gold">

    <button type="button" aria-describedby="ttp06-i1" class="group relative flex aspect-square cursor-pointer items-center justify-center border border-ttp06-gold/15 bg-linear-to-br from-white/4 to-black/40 p-0 transition-[transform,border-color] duration-250 hover:-translate-y-0.5 hover:border-ttp06-gold/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ttp06-gold [--rpg:#fbbf24] [--glow:rgba(251,191,36,0.35)] after:content-[''] after:absolute after:right-0 after:bottom-0 after:h-2.5 after:w-2.5 after:bg-[var(--rpg)] after:[clip-path:polygon(100%_0,100%_100%,0_100%)]">
      <svg viewBox="0 0 64 64" class="h-3/5 w-3/5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]" aria-hidden="true"><defs><linearGradient id="ttp06-g1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fde68a"/><stop offset="1" stop-color="#b45309"/></linearGradient></defs><path d="M32 4 L36 22 L52 14 L42 32 L60 36 L42 40 L52 58 L36 50 L32 60 L28 50 L12 58 L22 40 L4 36 L22 32 L12 14 L28 22 Z" fill="url(#ttp06-g1)" stroke="#fde68a" stroke-width="0.5"/><circle cx="32" cy="36" r="6" fill="#fffbeb"/></svg>
      <span id="ttp06-i1" role="tooltip" class="pointer-events-none invisible absolute bottom-[calc(100%+14px)] left-1/2 z-30 block w-60 -translate-x-1/2 translate-y-2 scale-95 border border-[var(--rpg)] bg-linear-to-b from-ttp06-panel to-ttp06-deep px-3.25 py-3 text-left text-ttp06-ink opacity-0 shadow-[0_0_0_1px_rgba(0,0,0,0.8),0_0_26px_var(--glow),0_18px_36px_-10px_rgba(0,0,0,0.8)] transition-[opacity,translate,scale,visibility] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:visible group-hover:translate-y-0 group-hover:scale-100 group-hover:opacity-100 group-focus-visible:visible group-focus-visible:translate-y-0 group-focus-visible:scale-100 group-focus-visible:opacity-100 before:content-[''] before:absolute before:-inset-px before:border before:border-[var(--rpg)] before:opacity-30 before:animate-ttp06-glow motion-reduce:before:animate-none">
        <span class="mb-0.5 block font-ttp06-serif text-[15px] font-bold leading-tight tracking-[0.02em] text-[var(--rpg)]">Sunburst Talisman</span>
        <span class="mb-2.5 block font-ttp06-mono text-[10px] uppercase tracking-[0.15em] text-ttp06-dim">Legendary · Amulet</span>
        <span class="flex items-center justify-between py-0.75 text-[11px]"><span>Spell Power</span><span class="font-ttp06-mono font-semibold text-ttp06-pos">+84</span></span>
        <span class="flex items-center justify-between py-0.75 text-[11px]"><span>Critical Strike</span><span class="font-ttp06-mono font-semibold text-ttp06-pos">+12%</span></span>
        <span class="flex items-center justify-between py-0.75 text-[11px]"><span>Movement</span><span class="font-ttp06-mono font-semibold text-ttp06-neg">−4%</span></span>
        <span class="mt-2 mb-1 block text-[10px] text-ttp06-dim">Awakened · 7/10
          <span class="mt-0.75 block h-1 border border-ttp06-ink/15 bg-black/50"><span class="block h-full w-[70%] bg-[var(--rpg)]"></span></span>
        </span>
        <span class="my-2.5 block h-px bg-linear-to-r from-transparent via-ttp06-ink/25 to-transparent"></span>
        <span class="block font-ttp06-serif text-xs italic leading-[1.4] text-ttp06-soft">"It does not warm — it only insists that warmth was once here."</span>
        <span class="mt-2 flex justify-between border-t border-dashed border-ttp06-ink/15 pt-1.5 font-ttp06-mono text-[10px] text-ttp06-dim"><span>BOUND</span><span>vendor: 2,400g</span></span>
      </span>
    </button>

    <button type="button" aria-describedby="ttp06-i2" class="group relative flex aspect-square cursor-pointer items-center justify-center border border-ttp06-gold/15 bg-linear-to-br from-white/4 to-black/40 p-0 transition-[transform,border-color] duration-250 hover:-translate-y-0.5 hover:border-ttp06-gold/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ttp06-gold [--rpg:#d0a2ff] [--glow:rgba(192,132,252,0.3)] after:content-[''] after:absolute after:right-0 after:bottom-0 after:h-2.5 after:w-2.5 after:bg-[var(--rpg)] after:[clip-path:polygon(100%_0,100%_100%,0_100%)]">
      <svg viewBox="0 0 64 64" class="h-3/5 w-3/5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]" aria-hidden="true"><defs><linearGradient id="ttp06-g2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e9d5ff"/><stop offset="1" stop-color="#6b21a8"/></linearGradient></defs><path d="M32 6 L42 24 L52 32 L42 40 L32 58 L22 40 L12 32 L22 24 Z" fill="url(#ttp06-g2)" stroke="#e9d5ff" stroke-width="0.6"/><path d="M32 14 L36 28 L32 36 L28 28 Z" fill="#1a0a25"/></svg>
      <span id="ttp06-i2" role="tooltip" class="pointer-events-none invisible absolute bottom-[calc(100%+14px)] left-1/2 z-30 block w-60 -translate-x-1/2 translate-y-2 scale-95 border border-[var(--rpg)] bg-linear-to-b from-ttp06-panel to-ttp06-deep px-3.25 py-3 text-left text-ttp06-ink opacity-0 shadow-[0_0_0_1px_rgba(0,0,0,0.8),0_0_26px_var(--glow),0_18px_36px_-10px_rgba(0,0,0,0.8)] transition-[opacity,translate,scale,visibility] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:visible group-hover:translate-y-0 group-hover:scale-100 group-hover:opacity-100 group-focus-visible:visible group-focus-visible:translate-y-0 group-focus-visible:scale-100 group-focus-visible:opacity-100 before:content-[''] before:absolute before:-inset-px before:border before:border-[var(--rpg)] before:opacity-30 before:animate-ttp06-glow motion-reduce:before:animate-none">
        <span class="mb-0.5 block font-ttp06-serif text-[15px] font-bold leading-tight tracking-[0.02em] text-[var(--rpg)]">Voidshard Pendant</span>
        <span class="mb-2.5 block font-ttp06-mono text-[10px] uppercase tracking-[0.15em] text-ttp06-dim">Epic · Pendant</span>
        <span class="flex items-center justify-between py-0.75 text-[11px]"><span>Intellect</span><span class="font-ttp06-mono font-semibold text-ttp06-pos">+62</span></span>
        <span class="flex items-center justify-between py-0.75 text-[11px]"><span>Shadow Mastery</span><span class="font-ttp06-mono font-semibold text-ttp06-pos">+9%</span></span>
        <span class="mt-2 mb-1 block text-[10px] text-ttp06-dim">Charged · 3/5
          <span class="mt-0.75 block h-1 border border-ttp06-ink/15 bg-black/50"><span class="block h-full w-[60%] bg-[var(--rpg)]"></span></span>
        </span>
        <span class="my-2.5 block h-px bg-linear-to-r from-transparent via-ttp06-ink/25 to-transparent"></span>
        <span class="block font-ttp06-serif text-xs italic leading-[1.4] text-ttp06-soft">"Cool to the touch. Then colder. Then it whispers your name in a voice that almost is."</span>
        <span class="mt-2 flex justify-between border-t border-dashed border-ttp06-ink/15 pt-1.5 font-ttp06-mono text-[10px] text-ttp06-dim"><span>SOULBOUND</span><span>vendor: 1,150g</span></span>
      </span>
    </button>

    <button type="button" aria-describedby="ttp06-i3" class="group relative flex aspect-square cursor-pointer items-center justify-center border border-ttp06-gold/15 bg-linear-to-br from-white/4 to-black/40 p-0 transition-[transform,border-color] duration-250 hover:-translate-y-0.5 hover:border-ttp06-gold/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ttp06-gold [--rpg:#7cb8ff] [--glow:rgba(96,165,250,0.25)] after:content-[''] after:absolute after:right-0 after:bottom-0 after:h-2.5 after:w-2.5 after:bg-[var(--rpg)] after:[clip-path:polygon(100%_0,100%_100%,0_100%)]">
      <svg viewBox="0 0 64 64" class="h-3/5 w-3/5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]" aria-hidden="true"><defs><linearGradient id="ttp06-g3" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#93c5fd"/><stop offset="1" stop-color="#1e40af"/></linearGradient></defs><path d="M32 4 L36 20 L52 28 L36 32 L32 60 L28 32 L12 28 L28 20 Z" fill="url(#ttp06-g3)" stroke="#dbeafe" stroke-width="0.5"/></svg>
      <span id="ttp06-i3" role="tooltip" class="pointer-events-none invisible absolute bottom-[calc(100%+14px)] left-1/2 z-30 block w-60 -translate-x-1/2 translate-y-2 scale-95 border border-[var(--rpg)] bg-linear-to-b from-ttp06-panel to-ttp06-deep px-3.25 py-3 text-left text-ttp06-ink opacity-0 shadow-[0_0_0_1px_rgba(0,0,0,0.8),0_0_26px_var(--glow),0_18px_36px_-10px_rgba(0,0,0,0.8)] transition-[opacity,translate,scale,visibility] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:visible group-hover:translate-y-0 group-hover:scale-100 group-hover:opacity-100 group-focus-visible:visible group-focus-visible:translate-y-0 group-focus-visible:scale-100 group-focus-visible:opacity-100 before:content-[''] before:absolute before:-inset-px before:border before:border-[var(--rpg)] before:opacity-30 before:animate-ttp06-glow motion-reduce:before:animate-none">
        <span class="mb-0.5 block font-ttp06-serif text-[15px] font-bold leading-tight tracking-[0.02em] text-[var(--rpg)]">Ranger's Compass</span>
        <span class="mb-2.5 block font-ttp06-mono text-[10px] uppercase tracking-[0.15em] text-ttp06-dim">Rare · Trinket</span>
        <span class="flex items-center justify-between py-0.75 text-[11px]"><span>Agility</span><span class="font-ttp06-mono font-semibold text-ttp06-pos">+34</span></span>
        <span class="flex items-center justify-between py-0.75 text-[11px]"><span>Stealth</span><span class="font-ttp06-mono font-semibold text-ttp06-pos">+7%</span></span>
        <span class="my-2.5 block h-px bg-linear-to-r from-transparent via-ttp06-ink/25 to-transparent"></span>
        <span class="block font-ttp06-serif text-xs italic leading-[1.4] text-ttp06-soft">"True north is whichever direction the deer have not yet noticed you."</span>
        <span class="mt-2 flex justify-between border-t border-dashed border-ttp06-ink/15 pt-1.5 font-ttp06-mono text-[10px] text-ttp06-dim"><span>UNIQUE</span><span>vendor: 480g</span></span>
      </span>
    </button>

    <button type="button" aria-describedby="ttp06-i4" class="group relative flex aspect-square cursor-pointer items-center justify-center border border-ttp06-gold/15 bg-linear-to-br from-white/4 to-black/40 p-0 transition-[transform,border-color] duration-250 hover:-translate-y-0.5 hover:border-ttp06-gold/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ttp06-gold [--rpg:#5ee08f] [--glow:rgba(74,222,128,0.2)] after:content-[''] after:absolute after:right-0 after:bottom-0 after:h-2.5 after:w-2.5 after:bg-[var(--rpg)] after:[clip-path:polygon(100%_0,100%_100%,0_100%)]">
      <svg viewBox="0 0 64 64" class="h-3/5 w-3/5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]" aria-hidden="true"><defs><linearGradient id="ttp06-g4" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bef264"/><stop offset="1" stop-color="#3f6212"/></linearGradient></defs><ellipse cx="32" cy="36" rx="20" ry="22" fill="url(#ttp06-g4)" stroke="#ecfccb" stroke-width="0.5"/><path d="M32 14 Q28 24 32 36" stroke="#1a2e0a" stroke-width="2" fill="none"/></svg>
      <span id="ttp06-i4" role="tooltip" class="pointer-events-none invisible absolute bottom-[calc(100%+14px)] left-1/2 z-30 block w-60 -translate-x-1/2 translate-y-2 scale-95 border border-[var(--rpg)] bg-linear-to-b from-ttp06-panel to-ttp06-deep px-3.25 py-3 text-left text-ttp06-ink opacity-0 shadow-[0_0_0_1px_rgba(0,0,0,0.8),0_0_26px_var(--glow),0_18px_36px_-10px_rgba(0,0,0,0.8)] transition-[opacity,translate,scale,visibility] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:visible group-hover:translate-y-0 group-hover:scale-100 group-hover:opacity-100 group-focus-visible:visible group-focus-visible:translate-y-0 group-focus-visible:scale-100 group-focus-visible:opacity-100 before:content-[''] before:absolute before:-inset-px before:border before:border-[var(--rpg)] before:opacity-30 before:animate-ttp06-glow motion-reduce:before:animate-none">
        <span class="mb-0.5 block font-ttp06-serif text-[15px] font-bold leading-tight tracking-[0.02em] text-[var(--rpg)]">Verdant Tonic</span>
        <span class="mb-2.5 block font-ttp06-mono text-[10px] uppercase tracking-[0.15em] text-ttp06-dim">Uncommon · Consumable</span>
        <span class="flex items-center justify-between py-0.75 text-[11px]"><span>Restores</span><span class="font-ttp06-mono font-semibold text-ttp06-pos">+1,200 HP</span></span>
        <span class="flex items-center justify-between py-0.75 text-[11px]"><span>Over</span><span class="font-ttp06-mono font-semibold text-ttp06-pos">8 sec</span></span>
        <span class="my-2.5 block h-px bg-linear-to-r from-transparent via-ttp06-ink/25 to-transparent"></span>
        <span class="block font-ttp06-serif text-xs italic leading-[1.4] text-ttp06-soft">"Tastes like the smell of a greenhouse in winter."</span>
        <span class="mt-2 flex justify-between border-t border-dashed border-ttp06-ink/15 pt-1.5 font-ttp06-mono text-[10px] text-ttp06-dim"><span>STACK · 14</span><span>vendor: 24g</span></span>
      </span>
    </button>

    <button type="button" aria-describedby="ttp06-i5" class="group relative flex aspect-square cursor-pointer items-center justify-center border border-ttp06-gold/15 bg-linear-to-br from-white/4 to-black/40 p-0 transition-[transform,border-color] duration-250 hover:-translate-y-0.5 hover:border-ttp06-gold/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ttp06-gold [--rpg:#c7c7c7] [--glow:rgba(180,180,180,0.15)] after:content-[''] after:absolute after:right-0 after:bottom-0 after:h-2.5 after:w-2.5 after:bg-[var(--rpg)] after:[clip-path:polygon(100%_0,100%_100%,0_100%)]">
      <svg viewBox="0 0 64 64" class="h-3/5 w-3/5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]" aria-hidden="true"><path d="M22 18 L42 18 L46 26 L46 46 L18 46 L18 26 Z" fill="#9ca3af" stroke="#e5e7eb" stroke-width="0.5"/><rect x="28" y="26" width="8" height="20" fill="#4b5563"/></svg>
      <span id="ttp06-i5" role="tooltip" class="pointer-events-none invisible absolute bottom-[calc(100%+14px)] left-1/2 z-30 block w-60 -translate-x-1/2 translate-y-2 scale-95 border border-[var(--rpg)] bg-linear-to-b from-ttp06-panel to-ttp06-deep px-3.25 py-3 text-left text-ttp06-ink opacity-0 shadow-[0_0_0_1px_rgba(0,0,0,0.8),0_0_26px_var(--glow),0_18px_36px_-10px_rgba(0,0,0,0.8)] transition-[opacity,translate,scale,visibility] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:visible group-hover:translate-y-0 group-hover:scale-100 group-hover:opacity-100 group-focus-visible:visible group-focus-visible:translate-y-0 group-focus-visible:scale-100 group-focus-visible:opacity-100 before:content-[''] before:absolute before:-inset-px before:border before:border-[var(--rpg)] before:opacity-30 before:animate-ttp06-glow motion-reduce:before:animate-none">
        <span class="mb-0.5 block font-ttp06-serif text-[15px] font-bold leading-tight tracking-[0.02em] text-[var(--rpg)]">Iron Lockbox</span>
        <span class="mb-2.5 block font-ttp06-mono text-[10px] uppercase tracking-[0.15em] text-ttp06-dim">Common · Container</span>
        <span class="flex items-center justify-between py-0.75 text-[11px]"><span>Slots</span><span class="font-ttp06-mono font-semibold text-ttp06-pos">+6</span></span>
        <span class="my-2.5 block h-px bg-linear-to-r from-transparent via-ttp06-ink/25 to-transparent"></span>
        <span class="block font-ttp06-serif text-xs italic leading-[1.4] text-ttp06-soft">"Heavy enough to be honest about what it contains."</span>
        <span class="mt-2 flex justify-between border-t border-dashed border-ttp06-ink/15 pt-1.5 font-ttp06-mono text-[10px] text-ttp06-dim"><span>STACK · 1</span><span>vendor: 8g</span></span>
      </span>
    </button>
  </div>
</section>
```
## CSS
```css
@import "tailwindcss";

@theme {
  --color-ttp06-panel: #1a1410;
  --color-ttp06-panel: oklch(0.2 0.015 60);
  --color-ttp06-deep: #0e0a07;
  --color-ttp06-deep: oklch(0.14 0.012 60);
  --color-ttp06-gold: #d4af37;
  --color-ttp06-gold: oklch(0.76 0.12 90);
  --color-ttp06-ink: #d4c5a9;
  --color-ttp06-ink: oklch(0.83 0.035 85);
  --color-ttp06-soft: #c6b79c;
  --color-ttp06-soft: oklch(0.78 0.035 85);
  --color-ttp06-dim: #a99c85;
  --color-ttp06-dim: oklch(0.68 0.03 85);
  --color-ttp06-pos: #6fd09b;
  --color-ttp06-pos: oklch(0.79 0.12 158);
  --color-ttp06-neg: #f4857a;
  --color-ttp06-neg: oklch(0.72 0.14 25);
  --font-ttp06-sans: 'Inter', system-ui, sans-serif;
  --font-ttp06-mono: 'JetBrains Mono', ui-monospace, monospace;
  --font-ttp06-serif: Georgia, 'Times New Roman', serif;
  --animate-ttp06-glow: ttp06-glow 2s ease-in-out infinite;
}

@keyframes ttp06-glow {
  0%,
    100% {
    opacity: 0.2;
  }

  50% {
    opacity: 0.5;
  }
}

.ttp-06 {
  width: 100%;
  min-height: 100svh;
}
```

SETTING CHỌN BỐI CẢNH : Here's a working CSS Claymorphism from CodeFronts. Use it as-is or adapt to your framework. All classes are scoped under a unique prefix so the code won't collide with your existing styles. MIT licensed.
Demo: Claymorphism Shadow Recipe Reference Build
Source: https://codefronts.com/design-styles/css-claymorphism/claymorphism-shadow-recipe-reference-build/

The reference build for the whole trend: one clay object, four radio steps, and the shadow assembled one layer at a time — flat fill, outer drop, inset far-side shadow, inset lit-side highlight. The code panel lights up line by line as you step, so the formula is learned rather than copied. All three layers are always present and only their colors change, so every step animates.
## HTML
```html
<section class="cl-01" aria-label="Claymorphism shadow recipe reference build">
  <div class="cl-01__stage">
    <header class="cl-01__head">
      <p class="cl-01__eyebrow">Recipe reference</p>
      <h2 class="cl-01__h">Clay is three shadow layers</h2>
      <p class="cl-01__lede">Step through the build. One outer drop for mass, one inset shade for thickness, one inset highlight for the sheen.</p>
    </header>
    <div class="cl-01__lab">
      <fieldset class="cl-01__steps">
        <legend class="cl-01__legend">Shadow layers</legend>
        <input class="cl-01__r" type="radio" name="cl-01-step" id="cl-01-s1">
        <label class="cl-01__step" for="cl-01-s1"><b>1</b> Flat fill</label>
        <input class="cl-01__r" type="radio" name="cl-01-step" id="cl-01-s2">
        <label class="cl-01__step" for="cl-01-s2"><b>2</b> + outer drop</label>
        <input class="cl-01__r" type="radio" name="cl-01-step" id="cl-01-s3">
        <label class="cl-01__step" for="cl-01-s3"><b>3</b> + inset shade</label>
        <input class="cl-01__r" type="radio" name="cl-01-step" id="cl-01-s4" checked>
        <label class="cl-01__step" for="cl-01-s4"><b>4</b> + inset highlight</label>
      </fieldset>
      <div class="cl-01__object">
        <div class="cl-01__clay">
          <span class="cl-01__glyph" aria-hidden="true"></span>
          <p class="cl-01__caption">clay</p>
        </div>
      </div>
      <pre class="cl-01__code"><code><span class="cl-01__ln cl-01__ln--0">.clay {
  border-radius: 44px;
  background: var(--clay);</span>
<span class="cl-01__ln cl-01__ln--1">  box-shadow:
    0 22px 40px -10px var(--shade),</span><span class="cl-01__ln cl-01__ln--2">
    inset 0 -16px 26px -10px var(--shade),</span><span class="cl-01__ln cl-01__ln--3">
    inset 0 18px 26px -8px var(--light)</span><span class="cl-01__ln cl-01__ln--0">;
}</span></code></pre>
    </div>
    <p class="cl-01__chip" aria-hidden="true">3-layer formula · :has() stepper · fixed layer count = animatable box-shadow</p>
  </div>
</section>
```
## CSS
```css
.cl-01,
.cl-01 *,
.cl-01 *::before,
.cl-01 *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

.cl-01 {
  width: 100%;
  min-height: 100vh;
  min-height: 100svh;
  display: block;
  background: var(--cl-01-bg);
  --cl-01-bg: oklch(0.94 0.028 60);
  --cl-01-clay: oklch(0.83 0.11 32);
  --cl-01-shade: color-mix(in oklch,var(--cl-01-clay) 55%,oklch(0.42 0.12 30));
  --cl-01-light: oklch(0.99 0.03 85/.9);
  --cl-01-ink: oklch(0.31 0.05 40);
  --cl-01-mut: oklch(0.53 0.04 45);
  font-family: system-ui,-apple-system,'Segoe UI',sans-serif;
  color: var(--cl-01-ink);
}

.cl-01__stage {
  min-height: 100vh;
  min-height: 100svh;
  display: grid;
  place-items: center;
  align-content: center;
  gap: clamp(24px,4vw,40px);
  padding: clamp(22px,5vw,60px);
  background: radial-gradient(90% 70% at 20% 0%,oklch(0.97 0.04 70),transparent 65%);
}

.cl-01__head {
  max-width: 58ch;
  text-align: center;
  display: grid;
  gap: 8px;
}

.cl-01__eyebrow {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: .16em;
  text-transform: uppercase;
  color: var(--cl-01-mut);
}

.cl-01__h {
  font-size: clamp(24px,4vw,36px);
  font-weight: 780;
  letter-spacing: -.02em;
  text-wrap: balance;
}

.cl-01__lede {
  font-size: 15px;
  line-height: 1.6;
  color: var(--cl-01-mut);
  text-wrap: pretty;
}

.cl-01__lab {
  display: grid;
  gap: clamp(20px,3vw,34px);
  grid-template-columns: 1fr;
  justify-items: center;
  width: min(100%,940px);
}

@media (min-width: 900px) {
  .cl-01__lab {
    grid-template-columns: auto auto 1fr;
    align-items: center;
  }
}

.cl-01__steps {
  border: 0;
  display: grid;
  gap: 10px;
  min-width: 190px;
}

.cl-01__legend {
  font-size: 11.5px;
  font-weight: 700;
  letter-spacing: .1em;
  text-transform: uppercase;
  color: var(--cl-01-mut);
  padding-bottom: 8px;
}

.cl-01__r {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  clip-path: inset(50%);
}

.cl-01__step {
  display: flex;
  align-items: center;
  gap: 11px;
  min-height: 46px;
  padding: 0 18px;
  border-radius: 20px;
  font-size: 14.5px;
  font-weight: 600;
  cursor: pointer;
  color: var(--cl-01-mut);
  background: color-mix(in oklch,var(--cl-01-bg) 88%,white);
  box-shadow: 0 8px 16px -8px var(--cl-01-shade),inset 0 -6px 12px -8px var(--cl-01-shade),inset 0 8px 12px -6px var(--cl-01-light);
  transition: color .3s,translate .3s cubic-bezier(.34,1.4,.5,1),box-shadow .3s;
}

.cl-01__step b {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  font-size: 12px;
  background: color-mix(in oklch,var(--cl-01-clay) 40%,white);
  color: var(--cl-01-ink);
}

.cl-01__step:hover {
  translate: 2px 0;
}

.cl-01__r:checked+.cl-01__step {
  color: var(--cl-01-ink);
  background: var(--cl-01-clay);
  translate: 6px 0;
  box-shadow: 0 14px 24px -10px var(--cl-01-shade),inset 0 -8px 14px -8px var(--cl-01-shade),inset 0 10px 16px -6px var(--cl-01-light);
}

.cl-01__r:checked+.cl-01__step b {
  background: oklch(1 0 0/.75);
}

.cl-01__r:focus-visible+.cl-01__step {
  outline: 3px solid var(--cl-01-ink);
  outline-offset: 3px;
}

.cl-01__object {
  display: grid;
  place-items: center;
  padding: 14px;
}

.cl-01__clay {
  display: grid;
  place-items: center;
  align-content: center;
  gap: 10px;
  width: clamp(180px,26vw,224px);
  aspect-ratio: 1;
  border-radius: 44px;
  background: var(--cl-01-clay);
  box-shadow: 0 22px 40px -10px var(--cl-01-c1,transparent),inset 0 -16px 26px -10px var(--cl-01-c2,transparent),inset 0 18px 26px -8px var(--cl-01-c3,transparent);
  transition: box-shadow .55s cubic-bezier(.4,0,.2,1),translate .55s cubic-bezier(.34,1.3,.5,1);
}

.cl-01__glyph {
  width: 64px;
  height: 64px;
  border-radius: 26px;
  background: color-mix(in oklch,var(--cl-01-clay) 60%,white);
  box-shadow: inset 0 -8px 14px -8px var(--cl-01-shade),inset 0 10px 14px -6px var(--cl-01-light);
}

.cl-01__caption {
  font-family: ui-monospace,Menlo,Consolas,monospace;
  font-size: 12px;
  letter-spacing: .22em;
  text-transform: uppercase;
  color: color-mix(in oklch,var(--cl-01-ink) 75%,var(--cl-01-clay));
}

.cl-01__lab:has(#cl-01-s2:checked) .cl-01__clay {
  --cl-01-c1: var(--cl-01-shade);
  translate: 0 -4px;
}

.cl-01__lab:has(#cl-01-s3:checked) .cl-01__clay {
  --cl-01-c1: var(--cl-01-shade);
  --cl-01-c2: var(--cl-01-shade);
  translate: 0 -6px;
}

.cl-01__lab:has(#cl-01-s4:checked) .cl-01__clay {
  --cl-01-c1: var(--cl-01-shade);
  --cl-01-c2: var(--cl-01-shade);
  --cl-01-c3: var(--cl-01-light);
  translate: 0 -8px;
}

.cl-01__code {
  width: min(100%,420px);
  margin: 0;
  padding: 22px 24px;
  border-radius: 28px;
  background: color-mix(in oklch,var(--cl-01-bg) 82%,white);
  box-shadow: inset 0 -10px 20px -12px var(--cl-01-shade),inset 0 12px 20px -10px var(--cl-01-light),0 16px 30px -14px var(--cl-01-shade);
  font-family: ui-monospace,Menlo,Consolas,monospace;
  font-size: 12.5px;
  line-height: 1.85;
  overflow-x: auto;
  color: var(--cl-01-ink);
}

.cl-01__ln {
  opacity: .24;
  transition: opacity .45s;
}

.cl-01__ln--0 {
  opacity: 1;
}

.cl-01__lab:has(#cl-01-s2:checked) .cl-01__ln--1,
.cl-01__lab:has(#cl-01-s3:checked) .cl-01__ln--1,
.cl-01__lab:has(#cl-01-s4:checked) .cl-01__ln--1 {
  opacity: 1;
}

.cl-01__lab:has(#cl-01-s3:checked) .cl-01__ln--2,
.cl-01__lab:has(#cl-01-s4:checked) .cl-01__ln--2 {
  opacity: 1;
}

.cl-01__lab:has(#cl-01-s4:checked) .cl-01__ln--3 {
  opacity: 1;
}

.cl-01__chip {
  font-family: ui-monospace,Menlo,Consolas,monospace;
  font-size: 11.5px;
  color: var(--cl-01-mut);
  padding: 8px 16px;
  border-radius: 99px;
  text-align: center;
  background: oklch(1 0 0/.5);
  box-shadow: inset 0 -4px 10px -8px var(--cl-01-shade),inset 0 6px 10px -6px oklch(1 0 0);
}

@media (prefers-reduced-motion: reduce) {
  .cl-01 * {
    transition-duration: .01ms !important;
    animation: none !important;
  }
}
```
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
tham khảo thêm : Here's a working CSS demo from CodeFronts. Use it as-is or adapt to your framework. All classes are scoped under a unique prefix so the code won't collide with your existing styles. MIT licensed.
Demo: Tailwind Hero Photo Collage Grid
Source: https://codefronts.com/layouts/tailwind-card-grid-layout/tailwind-hero-photo-collage-grid/

A landing hero with narrative copy on the left and a five-tile asymmetric photo collage on the right. Every tile states its own placement &mdash; col-start-1 col-span-2 row-start-1 row-span-2 &mdash; so the collage rhythm is readable in the markup, and the readability overlay every photo grid ships is one after: chain instead of a pseudo-element block.
## HTML
```html
<section class="tcg-12 w-full min-h-svh flex items-center justify-center bg-tcg12-bg font-tcg12-sans text-tcg12-ink px-[clamp(20px,3vw,48px)] py-[clamp(28px,4vw,56px)]" aria-label="Hero photo collage grid demo">
  <div class="w-full max-w-[1200px] grid [grid-template-columns:1fr_1.2fr] max-[900px]:[grid-template-columns:1fr] items-center gap-[clamp(24px,3.4vw,56px)] max-[900px]:gap-8">

    <div class="flex flex-col gap-4.5 max-w-[520px] max-[900px]:max-w-none max-[900px]:items-center max-[900px]:text-center">
      <span class="w-fit px-3 py-1.5 rounded-full text-[.72rem] font-bold tracking-[0.16em] uppercase text-tcg12-accent bg-tcg12-accentsoft">New &middot; 2026 collection</span>
      <h2 class="text-[clamp(2.2rem,4.5vw,3.6rem)] font-black tracking-[-0.03em] leading-[1.02]">Stay places that<br><em class="font-tcg12-serif italic font-bold text-tcg12-accent">feel like home.</em></h2>
      <p class="max-w-[46ch] text-[clamp(.96rem,1.2vw,1.1rem)] leading-[1.55] text-tcg12-muted text-pretty">Hand-picked stays in 47 cities. Verified by humans. Booked by people who care where they sleep.</p>
      <div class="mt-1.5 flex flex-wrap items-center gap-4">
        <a href="#stays" class="inline-flex items-center min-h-11 px-5.5 py-3.5 rounded-[10px] bg-tcg12-ink text-white text-[.96rem] font-bold no-underline transition-[background,translate] duration-200 hover:bg-tcg12-accent hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-tcg12-accent focus-visible:outline-offset-3 motion-reduce:transition-none motion-reduce:hover:translate-y-0">Browse stays &rarr;</a>
        <a href="#how" class="inline-flex items-center min-h-11 text-[.94rem] font-semibold text-tcg12-ink underline decoration-1 underline-offset-4 hover:text-tcg12-accent focus-visible:outline-2 focus-visible:outline-tcg12-accent focus-visible:outline-offset-3">How it works</a>
      </div>
      <dl class="mt-4 pt-6 flex gap-[clamp(20px,3vw,40px)] max-[560px]:gap-3.5 border-t border-tcg12-line">
        <div class="flex flex-col gap-0.5">
          <dd class="text-2xl max-[560px]:text-xl font-black tracking-[-0.02em] tabular-nums">4.9 &#9733;</dd>
          <dt class="text-[.78rem] font-semibold text-tcg12-muted">Avg rating</dt>
        </div>
        <div class="flex flex-col gap-0.5">
          <dd class="text-2xl max-[560px]:text-xl font-black tracking-[-0.02em] tabular-nums">12K+</dd>
          <dt class="text-[.78rem] font-semibold text-tcg12-muted">Verified stays</dt>
        </div>
        <div class="flex flex-col gap-0.5">
          <dd class="text-2xl max-[560px]:text-xl font-black tracking-[-0.02em] tabular-nums">47</dd>
          <dt class="text-[.78rem] font-semibold text-tcg12-muted">Cities</dt>
        </div>
      </dl>
    </div>

    <div class="grid [grid-template-columns:repeat(3,1fr)] [grid-template-rows:repeat(3,1fr)] gap-[clamp(8px,1vw,14px)] aspect-[1.05/1] min-h-[clamp(320px,42vw,560px)] max-[900px]:aspect-[1.4/1] max-[900px]:min-h-70 max-[560px]:aspect-square" aria-label="Featured stays">
      <div class="relative isolate col-start-1 col-span-2 row-start-1 row-span-2 flex items-end p-3 rounded-[14px] overflow-hidden bg-linear-[135deg,#1e3a5f,#0f1c2e] after:absolute after:inset-0 after:z-0 after:bg-linear-[180deg,transparent_45%,oklch(0_0_0/0.55)]">
        <span class="absolute top-2.5 right-2.5 z-2 px-2.25 py-1 rounded-full bg-white/92 backdrop-blur-[8px] text-tcg12-ink text-[.62rem] font-bold tracking-[0.1em] uppercase">Iceland</span>
        <span class="relative z-1 text-white text-[.86rem] font-bold [text-shadow:0_1px_3px_oklch(0_0_0/0.4)]">Black Sand Cabin</span>
      </div>
      <div class="relative isolate col-start-3 row-start-1 flex items-end p-3 rounded-[14px] overflow-hidden bg-linear-[135deg,#d97a99,#7a3855] after:absolute after:inset-0 after:z-0 after:bg-linear-[180deg,transparent_45%,oklch(0_0_0/0.55)]">
        <span class="absolute top-2.5 right-2.5 z-2 px-2.25 py-1 rounded-full bg-white/92 backdrop-blur-[8px] text-tcg12-ink text-[.62rem] font-bold tracking-[0.1em] uppercase">Tokyo</span>
        <span class="relative z-1 text-white text-[.86rem] font-bold [text-shadow:0_1px_3px_oklch(0_0_0/0.4)]">Shibuya Loft</span>
      </div>
      <div class="relative isolate col-start-3 row-start-2 flex items-end p-3 rounded-[14px] overflow-hidden bg-linear-[135deg,#f4a572,#d97f4f] after:absolute after:inset-0 after:z-0 after:bg-linear-[180deg,transparent_45%,oklch(0_0_0/0.55)]">
        <span class="absolute top-2.5 right-2.5 z-2 px-2.25 py-1 rounded-full bg-white/92 backdrop-blur-[8px] text-tcg12-ink text-[.62rem] font-bold tracking-[0.1em] uppercase">Lisbon</span>
        <span class="relative z-1 text-white text-[.86rem] font-bold [text-shadow:0_1px_3px_oklch(0_0_0/0.4)]">Alfama Studio</span>
      </div>
      <div class="relative isolate col-start-1 row-start-3 flex items-end p-3 rounded-[14px] overflow-hidden bg-linear-[135deg,#e6c54a,#a8732d] after:absolute after:inset-0 after:z-0 after:bg-linear-[180deg,transparent_45%,oklch(0_0_0/0.55)]">
        <span class="absolute top-2.5 right-2.5 z-2 px-2.25 py-1 rounded-full bg-white/92 backdrop-blur-[8px] text-tcg12-ink text-[.62rem] font-bold tracking-[0.1em] uppercase">Marrakech</span>
        <span class="relative z-1 text-white text-[.86rem] font-bold [text-shadow:0_1px_3px_oklch(0_0_0/0.4)]">Medina Riad</span>
      </div>
      <div class="relative isolate col-start-2 col-span-2 row-start-3 flex items-end p-3 rounded-[14px] overflow-hidden bg-linear-[135deg,#7aa852,#3d6a2a] after:absolute after:inset-0 after:z-0 after:bg-linear-[180deg,transparent_45%,oklch(0_0_0/0.55)]">
        <span class="absolute top-2.5 right-2.5 z-2 px-2.25 py-1 rounded-full bg-white/92 backdrop-blur-[8px] text-tcg12-ink text-[.62rem] font-bold tracking-[0.1em] uppercase">Brooklyn</span>
        <span class="relative z-1 text-white text-[.86rem] font-bold [text-shadow:0_1px_3px_oklch(0_0_0/0.4)]">Williamsburg Flat</span>
      </div>
    </div>

  </div>
</section>
```
## CSS
```css
@import "tailwindcss";

@theme {
  --color-tcg12-bg: #fafaf7;
  --color-tcg12-bg: oklch(0.98 0.005 100);
  --color-tcg12-ink: #0f172a;
  --color-tcg12-ink: oklch(0.21 0.04 260);
  --color-tcg12-muted: #64748b;
  --color-tcg12-muted: oklch(0.55 0.03 257);
  --color-tcg12-line: #e2e8f0;
  --color-tcg12-line: oklch(0.92 0.01 255);
  --color-tcg12-accent: #dc2626;
  --color-tcg12-accent: oklch(0.58 0.22 27);
  --color-tcg12-accentsoft: #fbe3e3;
  --color-tcg12-accentsoft: oklch(0.93 0.04 27);
  --font-tcg12-sans: 'Space Grotesk', system-ui, sans-serif;
  --font-tcg12-serif: 'Playfair Display', Georgia, serif;
}
/* Root rule: the full-bleed contract, stated in CSS as well as in the markup's
   w-full min-h-svh. */

.tcg-12 {
  width: 100%;
  min-height: 100svh;
}

.tcg-12 ::selection {
  background: #0f172a;
  color: #fff;
}
```
tham khảo : Here's a working CSS demo from CodeFronts. Use it as-is or adapt to your framework. All classes are scoped under a unique prefix so the code won't collide with your existing styles. MIT licensed.
Demo: Tailwind Swipe Card Deck Drag to Dismiss
Source: https://codefronts.com/components/tailwind-stacked-cards/tailwind-swipe-card-deck-drag-to-dismiss/

The decision deck, ported to variants. The depth of the pile stops being three :nth-last-child rules and becomes nth-last-2:, nth-last-3: and nth-last-[n+4]: typed straight onto the card. The fly-off is a data-gone attribute the script sets, with the two exit transforms written as important arbitrary utilities so they beat the inline transform the drag leaves behind. The LIKE / NOPE stamps become real spans driven by group-data-[hint=yes]:, not content strings in a stylesheet.
## HTML
```html
<section class="stk-02 w-full min-h-svh flex flex-col items-center justify-center gap-[22px] px-5 py-10 font-stk02-sans bg-stk02-bg [background-image:radial-gradient(circle_at_50%_0%,var(--color-stk02-glow),transparent_70%)]" aria-label="Swipeable card deck">
  <div class="relative w-[min(320px,86vw)] h-105" id="stk-02-deck">
    <p class="absolute inset-0 grid place-items-center p-8 text-center text-base text-stk02-muted">That&rsquo;s everyone for now.</p>
    <article class="group absolute inset-0 rounded-[22px] overflow-hidden bg-stk02-card select-none cursor-grab active:cursor-grabbing [touch-action:none] shadow-[0_24px_50px_-24px_rgba(0,0,0,0.75)] transition-[transform,opacity] duration-500 ease-stk02 nth-last-2:scale-[0.94] nth-last-2:translate-y-4 nth-last-3:scale-[0.88] nth-last-3:translate-y-8 nth-last-[n+4]:scale-[0.82] nth-last-[n+4]:translate-y-[46px] nth-last-[n+4]:opacity-0 data-[dragging=true]:transition-none data-[gone]:opacity-0 data-[gone=yes]:[transform:translate(140%,-10%)_rotate(22deg)]! data-[gone=no]:[transform:translate(-140%,-10%)_rotate(-22deg)]! motion-reduce:transition-[opacity] motion-reduce:duration-200 focus-visible:outline-3 focus-visible:outline-white focus-visible:outline-offset-3" tabindex="0">
      <img class="block w-full h-[74%] object-cover pointer-events-none" src="https://picsum.photos/seed/tw-swipe-1/400/460" width="400" height="460" alt="Mountain lake at first light">
      <div class="px-[18px] py-4 text-white">
        <h3 class="text-xl font-extrabold tracking-[-0.02em]">Aria, 27</h3>
        <p class="mt-0.5 text-[13px] text-stk02-muted">Trail runner &middot; Portland</p>
      </div>
      <span class="absolute top-[22px] left-[18px] rotate-[-14deg] rounded-lg border-[3px] border-stk02-yes px-3 py-1.5 font-stk02-mono text-[15px] font-bold tracking-[0.08em] text-stk02-yes opacity-0 transition-opacity duration-150 group-data-[hint=yes]:opacity-100" aria-hidden="true">LIKE</span>
      <span class="absolute top-[22px] right-[18px] rotate-[14deg] rounded-lg border-[3px] border-stk02-no px-3 py-1.5 font-stk02-mono text-[15px] font-bold tracking-[0.08em] text-stk02-no opacity-0 transition-opacity duration-150 group-data-[hint=no]:opacity-100" aria-hidden="true">NOPE</span>
    </article>
    <article class="group absolute inset-0 rounded-[22px] overflow-hidden bg-stk02-card select-none cursor-grab active:cursor-grabbing [touch-action:none] shadow-[0_24px_50px_-24px_rgba(0,0,0,0.75)] transition-[transform,opacity] duration-500 ease-stk02 nth-last-2:scale-[0.94] nth-last-2:translate-y-4 nth-last-3:scale-[0.88] nth-last-3:translate-y-8 nth-last-[n+4]:scale-[0.82] nth-last-[n+4]:translate-y-[46px] nth-last-[n+4]:opacity-0 data-[dragging=true]:transition-none data-[gone]:opacity-0 data-[gone=yes]:[transform:translate(140%,-10%)_rotate(22deg)]! data-[gone=no]:[transform:translate(-140%,-10%)_rotate(-22deg)]! motion-reduce:transition-[opacity] motion-reduce:duration-200 focus-visible:outline-3 focus-visible:outline-white focus-visible:outline-offset-3" tabindex="0">
      <img class="block w-full h-[74%] object-cover pointer-events-none" src="https://picsum.photos/seed/tw-swipe-2/400/460" width="400" height="460" alt="City rooftop in the evening">
      <div class="px-[18px] py-4 text-white">
        <h3 class="text-xl font-extrabold tracking-[-0.02em]">Devon, 31</h3>
        <p class="mt-0.5 text-[13px] text-stk02-muted">Coffee nerd &middot; Austin</p>
      </div>
      <span class="absolute top-[22px] left-[18px] rotate-[-14deg] rounded-lg border-[3px] border-stk02-yes px-3 py-1.5 font-stk02-mono text-[15px] font-bold tracking-[0.08em] text-stk02-yes opacity-0 transition-opacity duration-150 group-data-[hint=yes]:opacity-100" aria-hidden="true">LIKE</span>
      <span class="absolute top-[22px] right-[18px] rotate-[14deg] rounded-lg border-[3px] border-stk02-no px-3 py-1.5 font-stk02-mono text-[15px] font-bold tracking-[0.08em] text-stk02-no opacity-0 transition-opacity duration-150 group-data-[hint=no]:opacity-100" aria-hidden="true">NOPE</span>
    </article>
    <article class="group absolute inset-0 rounded-[22px] overflow-hidden bg-stk02-card select-none cursor-grab active:cursor-grabbing [touch-action:none] shadow-[0_24px_50px_-24px_rgba(0,0,0,0.75)] transition-[transform,opacity] duration-500 ease-stk02 nth-last-2:scale-[0.94] nth-last-2:translate-y-4 nth-last-3:scale-[0.88] nth-last-3:translate-y-8 nth-last-[n+4]:scale-[0.82] nth-last-[n+4]:translate-y-[46px] nth-last-[n+4]:opacity-0 data-[dragging=true]:transition-none data-[gone]:opacity-0 data-[gone=yes]:[transform:translate(140%,-10%)_rotate(22deg)]! data-[gone=no]:[transform:translate(-140%,-10%)_rotate(-22deg)]! motion-reduce:transition-[opacity] motion-reduce:duration-200 focus-visible:outline-3 focus-visible:outline-white focus-visible:outline-offset-3" tabindex="0">
      <img class="block w-full h-[74%] object-cover pointer-events-none" src="https://picsum.photos/seed/tw-swipe-3/400/460" width="400" height="460" alt="Empty desert road">
      <div class="px-[18px] py-4 text-white">
        <h3 class="text-xl font-extrabold tracking-[-0.02em]">Sky, 24</h3>
        <p class="mt-0.5 text-[13px] text-stk02-muted">Van-lifer &middot; Denver</p>
      </div>
      <span class="absolute top-[22px] left-[18px] rotate-[-14deg] rounded-lg border-[3px] border-stk02-yes px-3 py-1.5 font-stk02-mono text-[15px] font-bold tracking-[0.08em] text-stk02-yes opacity-0 transition-opacity duration-150 group-data-[hint=yes]:opacity-100" aria-hidden="true">LIKE</span>
      <span class="absolute top-[22px] right-[18px] rotate-[14deg] rounded-lg border-[3px] border-stk02-no px-3 py-1.5 font-stk02-mono text-[15px] font-bold tracking-[0.08em] text-stk02-no opacity-0 transition-opacity duration-150 group-data-[hint=no]:opacity-100" aria-hidden="true">NOPE</span>
    </article>
    <article class="group absolute inset-0 rounded-[22px] overflow-hidden bg-stk02-card select-none cursor-grab active:cursor-grabbing [touch-action:none] shadow-[0_24px_50px_-24px_rgba(0,0,0,0.75)] transition-[transform,opacity] duration-500 ease-stk02 nth-last-2:scale-[0.94] nth-last-2:translate-y-4 nth-last-3:scale-[0.88] nth-last-3:translate-y-8 nth-last-[n+4]:scale-[0.82] nth-last-[n+4]:translate-y-[46px] nth-last-[n+4]:opacity-0 data-[dragging=true]:transition-none data-[gone]:opacity-0 data-[gone=yes]:[transform:translate(140%,-10%)_rotate(22deg)]! data-[gone=no]:[transform:translate(-140%,-10%)_rotate(-22deg)]! motion-reduce:transition-[opacity] motion-reduce:duration-200 focus-visible:outline-3 focus-visible:outline-white focus-visible:outline-offset-3" tabindex="0">
      <img class="block w-full h-[74%] object-cover pointer-events-none" src="https://picsum.photos/seed/tw-swipe-4/400/460" width="400" height="460" alt="Forest path under tall pines">
      <div class="px-[18px] py-4 text-white">
        <h3 class="text-xl font-extrabold tracking-[-0.02em]">Rowan, 29</h3>
        <p class="mt-0.5 text-[13px] text-stk02-muted">Botanist &middot; Seattle</p>
      </div>
      <span class="absolute top-[22px] left-[18px] rotate-[-14deg] rounded-lg border-[3px] border-stk02-yes px-3 py-1.5 font-stk02-mono text-[15px] font-bold tracking-[0.08em] text-stk02-yes opacity-0 transition-opacity duration-150 group-data-[hint=yes]:opacity-100" aria-hidden="true">LIKE</span>
      <span class="absolute top-[22px] right-[18px] rotate-[14deg] rounded-lg border-[3px] border-stk02-no px-3 py-1.5 font-stk02-mono text-[15px] font-bold tracking-[0.08em] text-stk02-no opacity-0 transition-opacity duration-150 group-data-[hint=no]:opacity-100" aria-hidden="true">NOPE</span>
    </article>
  </div>
  <div class="flex gap-6">
    <button class="grid place-items-center size-15 rounded-full border-0 bg-stk02-no text-2xl text-white cursor-pointer shadow-[0_10px_24px_-10px_rgba(0,0,0,0.6)] transition-transform duration-150 hover:-translate-y-[3px] hover:scale-105 active:scale-95 focus-visible:outline-3 focus-visible:outline-white focus-visible:outline-offset-3" id="stk-02-no" type="button" aria-label="Pass on this card">&times;</button>
    <button class="grid place-items-center size-15 rounded-full border-0 bg-stk02-yes text-2xl text-white cursor-pointer shadow-[0_10px_24px_-10px_rgba(0,0,0,0.6)] transition-transform duration-150 hover:-translate-y-[3px] hover:scale-105 active:scale-95 focus-visible:outline-3 focus-visible:outline-white focus-visible:outline-offset-3" id="stk-02-yes" type="button" aria-label="Like this card">&hearts;</button>
  </div>
  <p class="m-0 font-stk02-mono text-[11px] tracking-[0.14em] uppercase text-stk02-muted" id="stk-02-count" aria-live="polite"></p>
</section>
```
## CSS
```css
@import "tailwindcss";

@theme {
  --color-stk02-bg: #15121f;
  --color-stk02-bg: oklch(0.19 0.025 295);
  --color-stk02-glow: #2a2340;
  --color-stk02-glow: oklch(0.28 0.045 295);
  --color-stk02-card: #241f36;
  --color-stk02-card: oklch(0.26 0.04 295);
  --color-stk02-muted: #c3bdd8;
  --color-stk02-muted: oklch(0.81 0.03 295);
  --color-stk02-yes: #45c98a;
  --color-stk02-yes: oklch(0.70 0.17 150);
  --color-stk02-no: #e2604a;
  --color-stk02-no: oklch(0.65 0.20 20);
  --font-stk02-sans: 'Archivo', system-ui, sans-serif;
  --font-stk02-mono: 'JetBrains Mono', ui-monospace, monospace;
  --ease-stk02: cubic-bezier(0.2, 0.9, 0.2, 1);
}
```

## JavaScript
```js
(() => {
  const root = document.querySelector('.stk-02');
  if (!root) return;
  const deck = root.querySelector('#stk-02-deck');
  const countEl = root.querySelector('#stk-02-count');
  const THRESHOLD = 90;

  const cards = () => [...deck.querySelectorAll('article')];
  const top = () => cards()[cards().length - 1] || null;

  function refresh() {
    const t = top();
    if (t) bind(t);
    const n = cards().length;
    countEl.textContent = n ? n + ' card' + (n > 1 ? 's' : '') + ' left' : 'Deck empty — reload to reshuffle';
  }

  /* State only: the exit transform is a data-[gone] utility in the markup, so the
     destination stays visible in the class list rather than hidden in a script. */
  function fling(card, dir) {
    card.style.transform = '';
    card.dataset.gone = dir > 0 ? 'yes' : 'no';
    card.addEventListener('transitionend', () => { card.remove(); refresh(); }, { once: true });
  }

  function bind(card) {
    if (card.dataset.bound) return;
    card.dataset.bound = '1';
    let startX = 0, dx = 0, dragging = false;

    card.addEventListener('pointerdown', (e) => {
      if (card !== top()) return;
      dragging = true; startX = e.clientX;
      card.setPointerCapture(e.pointerId);
      card.dataset.dragging = 'true';
    });

    /* The only inline style in the demo, and it has to be: this value is the
       pointer's live position and cannot exist as a static class. */
    card.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      dx = e.clientX - startX;
      card.style.transform = 'translateX(' + dx + 'px) rotate(' + (dx / 18) + 'deg)';
      if (dx > 30) card.dataset.hint = 'yes';
      else if (dx < -30) card.dataset.hint = 'no';
      else delete card.dataset.hint;
    });

    card.addEventListener('pointerup', () => {
      if (!dragging) return;
      dragging = false;
      delete card.dataset.dragging;
      if (Math.abs(dx) > THRESHOLD) { fling(card, dx > 0 ? 1 : -1); }
      else { card.style.transform = ''; delete card.dataset.hint; }
      dx = 0;
    });

    card.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') fling(card, 1);
      if (e.key === 'ArrowLeft') fling(card, -1);
    });
  }

  root.querySelector('#stk-02-yes').addEventListener('click', () => { const t = top(); if (t) fling(t, 1); });
  root.querySelector('#stk-02-no').addEventListener('click', () => { const t = top(); if (t) fling(t, -1); });
  refresh();
})();
```
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
ICON NÊN HỌC CÁI NÀY : Here's a working CSS demo from CodeFronts. Use it as-is or adapt to your framework. All classes are scoped under a unique prefix so the code won't collide with your existing styles. MIT licensed.
Demo: Tailwind Social Share Buttons with Brand Hover & Copy Link
Source: https://codefronts.com/motion/tailwind-css-animated-buttons/tailwind-social-share-buttons-hover/

A row of 44&times;44 share buttons that adopt their platform's brand colour on hover, each with a CSS-only tooltip, plus a copy-link button that confirms in place. The tooltip is still content: attr(...) &mdash; there is no HTML for it at all.
## HTML
```html
<section class="tab-16 w-full min-h-svh grid place-items-center bg-tab16-bg font-tab16-sans px-6 py-10">
  <div class="flex flex-col items-center gap-6">
    <p class="text-[0.8rem] font-semibold tracking-[0.12em] uppercase text-tab16-mut m-0">Share this article</p>
    <div class="flex gap-3">
      <button type="button" data-tooltip="Twitter / X" aria-label="Share on Twitter" class="[--brand:#1d9bf0] relative grid place-items-center size-11 text-tab16-ink bg-tab16-slate rounded-[10px] cursor-pointer transition-[background-color,color,translate,box-shadow] duration-[250ms] hover:bg-[var(--brand)] hover:text-white hover:-translate-y-[3px] hover:shadow-[0_6px_16px_oklch(0_0_0/0.2)] focus-visible:bg-[var(--brand)] focus-visible:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)] active:translate-y-0 after:content-[attr(data-tooltip)] after:absolute after:bottom-[calc(100%+8px)] after:left-1/2 after:-translate-x-1/2 after:translate-y-1 after:px-2.5 after:py-1 after:text-[0.72rem] after:font-semibold after:text-tab16-tip-ink after:bg-tab16-slate after:rounded-md after:whitespace-nowrap after:opacity-0 after:pointer-events-none after:transition-[opacity,translate] after:duration-200 hover:after:opacity-100 hover:after:translate-y-0 focus-visible:after:opacity-100 focus-visible:after:translate-y-0 motion-reduce:transition-colors motion-reduce:after:transition-none">
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" class="size-[18px] pointer-events-none"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.26 5.638zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
      </button>
      <button type="button" data-tooltip="LinkedIn" aria-label="Share on LinkedIn" class="[--brand:#0a66c2] relative grid place-items-center size-11 text-tab16-ink bg-tab16-slate rounded-[10px] cursor-pointer transition-[background-color,color,translate,box-shadow] duration-[250ms] hover:bg-[var(--brand)] hover:text-white hover:-translate-y-[3px] hover:shadow-[0_6px_16px_oklch(0_0_0/0.2)] focus-visible:bg-[var(--brand)] focus-visible:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)] active:translate-y-0 after:content-[attr(data-tooltip)] after:absolute after:bottom-[calc(100%+8px)] after:left-1/2 after:-translate-x-1/2 after:translate-y-1 after:px-2.5 after:py-1 after:text-[0.72rem] after:font-semibold after:text-tab16-tip-ink after:bg-tab16-slate after:rounded-md after:whitespace-nowrap after:opacity-0 after:pointer-events-none after:transition-[opacity,translate] after:duration-200 hover:after:opacity-100 hover:after:translate-y-0 focus-visible:after:opacity-100 focus-visible:after:translate-y-0 motion-reduce:transition-colors motion-reduce:after:transition-none">
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" class="size-[18px] pointer-events-none"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
      </button>
      <button type="button" data-tooltip="GitHub" aria-label="Share on GitHub" class="[--brand:#24292f] relative grid place-items-center size-11 text-tab16-ink bg-tab16-slate rounded-[10px] cursor-pointer transition-[background-color,color,translate,box-shadow] duration-[250ms] hover:bg-[var(--brand)] hover:text-white hover:-translate-y-[3px] hover:shadow-[0_6px_16px_oklch(0_0_0/0.2)] focus-visible:bg-[var(--brand)] focus-visible:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)] active:translate-y-0 after:content-[attr(data-tooltip)] after:absolute after:bottom-[calc(100%+8px)] after:left-1/2 after:-translate-x-1/2 after:translate-y-1 after:px-2.5 after:py-1 after:text-[0.72rem] after:font-semibold after:text-tab16-tip-ink after:bg-tab16-slate after:rounded-md after:whitespace-nowrap after:opacity-0 after:pointer-events-none after:transition-[opacity,translate] after:duration-200 hover:after:opacity-100 hover:after:translate-y-0 focus-visible:after:opacity-100 focus-visible:after:translate-y-0 motion-reduce:transition-colors motion-reduce:after:transition-none">
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" class="size-[18px] pointer-events-none"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>
      </button>
      <button type="button" id="tab16-copy" data-state="idle" data-tooltip="Copy Link" aria-label="Copy link" class="[--brand:#7c3aed] relative grid place-items-center size-11 text-tab16-ink bg-tab16-slate rounded-[10px] cursor-pointer transition-[background-color,color,translate,box-shadow] duration-[250ms] hover:bg-[var(--brand)] hover:text-white hover:-translate-y-[3px] hover:shadow-[0_6px_16px_oklch(0_0_0/0.2)] focus-visible:bg-[var(--brand)] focus-visible:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)] active:translate-y-0 data-[state=copied]:bg-tab16-done data-[state=copied]:text-white data-[state=copied]:-translate-y-[3px] after:content-[attr(data-tooltip)] after:absolute after:bottom-[calc(100%+8px)] after:left-1/2 after:-translate-x-1/2 after:translate-y-1 after:px-2.5 after:py-1 after:text-[0.72rem] after:font-semibold after:text-tab16-tip-ink after:bg-tab16-slate after:rounded-md after:whitespace-nowrap after:opacity-0 after:pointer-events-none after:transition-[opacity,translate] after:duration-200 hover:after:opacity-100 hover:after:translate-y-0 focus-visible:after:opacity-100 focus-visible:after:translate-y-0 data-[state=copied]:after:opacity-100 data-[state=copied]:after:translate-y-0 motion-reduce:transition-colors motion-reduce:after:transition-none">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="size-[18px] pointer-events-none"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
      </button>
    </div>
    <p id="tab16-status" role="status" aria-live="polite" class="sr-only"></p>
  </div>
</section>
```
## CSS
```css
@import "tailwindcss";

@theme {
  --color-tab16-bg: #f8fafc;
  --color-tab16-bg: oklch(0.98 0.004 250);
  --color-tab16-mut: #64748b;
  --color-tab16-mut: oklch(0.55 0.03 255);
  --color-tab16-slate: #1e293b;
  --color-tab16-slate: oklch(0.28 0.03 258);
  --color-tab16-ink: #e2e8f0;
  --color-tab16-ink: oklch(0.92 0.01 250);
  --color-tab16-tip-ink: #f1f5f9;
  --color-tab16-tip-ink: oklch(0.96 0.005 250);
  --color-tab16-done: #059669;
  --color-tab16-done: oklch(0.58 0.14 163);
  --font-tab16-sans: 'Space Grotesk', system-ui, sans-serif;
}

.tab-16 {
  width: 100%;
  min-height: 100svh;
}

.tab-16 ::selection {
  background: var(--color-tab16-slate);
  color: #fff;
}
```

## JavaScript
```js
(function () {
  var btn = document.getElementById('tab16-copy');
  var status = document.getElementById('tab16-status');
  if (!btn) return;
  var timer = null;
  function confirmed() {
    btn.dataset.state = 'copied';
    btn.dataset.tooltip = 'Copied!';
    if (status) status.textContent = 'Link copied to clipboard';
    clearTimeout(timer);
    timer = setTimeout(function () {
      btn.dataset.state = 'idle';
      btn.dataset.tooltip = 'Copy Link';
      if (status) status.textContent = '';
    }, 1500);
  }
  function fallback(url) {
    var t = document.createElement('textarea');
    t.value = url;
    t.className = 'fixed opacity-0 pointer-events-none';
    document.body.appendChild(t);
    t.select();
    try { document.execCommand('copy'); confirmed(); } catch (err) { /* no-op */ }
    document.body.removeChild(t);
  }
  btn.addEventListener('click', function () {
    var url = window.location.href;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(confirmed).catch(function () { fallback(url); });
    } else {
      fallback(url);
    }
  });
})();
```
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
THAM KHẢO : Here's a working CSS demo from CodeFronts. Use it as-is or adapt to your framework. All classes are scoped under a unique prefix so the code won't collide with your existing styles. MIT licensed.
Demo: Tailwind Popover Entry and Exit Animation
Source: https://codefronts.com/snippets/tailwind-css-popovers/tailwind-popover-entry-exit-animation/

The three-part recipe almost everyone ships two-thirds of, as utilities: starting:open: for the entry values, transition-discrete so display animates, and overlay in the transition list so the panel stays in the top layer while it leaves. The port adds an asymmetric timing — 260ms in, 140ms out — with nothing more than duration-140 open:duration-260.
## HTML
```html
<section class="tpop-04 group/root w-full min-h-svh bg-tpop04-void bg-[radial-gradient(60%_45%_at_50%_40%,var(--color-tpop04-halo),transparent)] px-4.5 py-10 font-tpop04-sans text-tpop04-ink" aria-label="Popover entry and exit animation demo">
  <div class="grid min-h-[calc(100svh-80px)] max-w-full place-items-center">
    <div class="w-full min-w-0 max-w-[27rem] rounded-2xl border border-tpop04-rule bg-tpop04-surface px-4.5 pt-4.5 pb-4 shadow-[0_40px_80px_-40px_oklch(0_0_0/0.9)]">
      <div class="flex min-w-0 items-center gap-2.5">
        <span aria-hidden="true" class="size-2.5 flex-none rounded-full bg-tpop04-glow shadow-[0_0_12px_var(--color-tpop04-glow)]"></span>
        <p class="min-w-0 flex-auto font-tpop04-mono text-[14px] font-semibold leading-tight">Build 4821 · main</p>
        <span class="font-tpop04-mono text-[10.5px] uppercase tracking-[0.14em] text-tpop04-mut after:content-['closed'] group-has-[#tpop-04-panel:popover-open]/root:text-tpop04-glow group-has-[#tpop-04-panel:popover-open]/root:after:content-['open']" aria-hidden="true"></span>
        <button id="tpop-04-trigger" type="button" popovertarget="tpop-04-panel" aria-label="Build details" class="inline-flex size-11 flex-none cursor-pointer items-center justify-center rounded-full border border-tpop04-rule text-tpop04-glow transition-[background-color,border-color] duration-200 [anchor-name:--tpop04-a] hover:border-tpop04-glow/50 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-tpop04-glow group-has-[#tpop-04-panel:popover-open]/root:border-tpop04-glow group-has-[#tpop-04-panel:popover-open]/root:bg-tpop04-glow/12">
          <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><circle cx="10" cy="10" r="7.2"/><path d="M10 9v5M10 6.4v.7"/></svg>
        </button>
      </div>
      <p class="mt-2 mb-4.5 font-tpop04-mono text-[12.5px] leading-normal text-tpop04-mut">passed in 2m 41s · 318 tests</p>
      <ol class="grid gap-2.5 border-t border-tpop04-rule pt-4">
        <li class="flex min-w-0 items-start gap-2.5 text-[13px] leading-normal text-tpop04-mut"><span class="grid size-5 flex-none place-items-center rounded-md bg-tpop04-glow font-tpop04-mono text-[11px] font-bold text-tpop04-void">1</span><span><code class="font-tpop04-mono text-tpop04-ink">starting:open:</code> holds the entry values</span></li>
        <li class="flex min-w-0 items-start gap-2.5 text-[13px] leading-normal text-tpop04-mut"><span class="grid size-5 flex-none place-items-center rounded-md bg-tpop04-glow font-tpop04-mono text-[11px] font-bold text-tpop04-void">2</span><span><code class="font-tpop04-mono text-tpop04-ink">transition-discrete</code> lets display join in</span></li>
        <li class="flex min-w-0 items-start gap-2.5 text-[13px] leading-normal text-tpop04-mut"><span class="grid size-5 flex-none place-items-center rounded-md bg-tpop04-glow font-tpop04-mono text-[11px] font-bold text-tpop04-void">3</span><span><code class="font-tpop04-mono text-tpop04-ink">overlay</code> keeps it in the top layer while it leaves</span></li>
      </ol>
    </div>
  </div>

  <div popover="auto" id="tpop-04-panel" role="group" aria-label="Build details" class="fixed m-auto w-[min(17rem,calc(100vw-32px))] rounded-2xl border border-tpop04-glow/70 bg-tpop04-surface p-4 text-tpop04-ink opacity-0 -translate-y-2 scale-[0.97] blur-xs shadow-[0_0_0_1px_oklch(0.9_0.2_125/0.12),0_24px_60px_-20px_oklch(0.9_0.2_125/0.3)] transition-[opacity,translate,scale,filter,display,overlay] duration-140 ease-in transition-discrete [position-anchor:--tpop04-a] [position-area:block-end_span-inline-start] [position-try-fallbacks:flip-block] open:translate-y-0 open:scale-100 open:opacity-100 open:blur-none open:duration-260 open:ease-[cubic-bezier(0.2,0.9,0.25,1)] starting:open:-translate-y-2 starting:open:scale-[0.97] starting:open:opacity-0 starting:open:blur-xs motion-reduce:transition-none supports-[anchor-name:--a]:inset-auto supports-[anchor-name:--a]:m-0 supports-[anchor-name:--a]:mt-2.5">
    <p class="mb-3 text-[10.5px] font-bold uppercase tracking-[0.2em] text-tpop04-glow">Stage timings</p>
    <ul class="grid gap-2">
      <li class="grid min-w-0 grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 font-tpop04-mono text-[12.5px] text-tpop04-mut">install<span class="text-tpop04-ink tabular-nums">18s</span><span class="col-span-2 h-1 overflow-hidden rounded-full bg-tpop04-rule"><span class="block h-full w-[11%] rounded-full bg-tpop04-glow/70"></span></span></li>
      <li class="grid min-w-0 grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 font-tpop04-mono text-[12.5px] text-tpop04-mut">typecheck<span class="text-tpop04-ink tabular-nums">41s</span><span class="col-span-2 h-1 overflow-hidden rounded-full bg-tpop04-rule"><span class="block h-full w-[25%] rounded-full bg-tpop04-glow/70"></span></span></li>
      <li class="grid min-w-0 grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 font-tpop04-mono text-[12.5px] text-tpop04-mut">unit<span class="text-tpop04-ink tabular-nums">1m 06s</span><span class="col-span-2 h-1 overflow-hidden rounded-full bg-tpop04-rule"><span class="block h-full w-[41%] rounded-full bg-tpop04-glow"></span></span></li>
      <li class="grid min-w-0 grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 font-tpop04-mono text-[12.5px] text-tpop04-mut">bundle<span class="text-tpop04-ink tabular-nums">36s</span><span class="col-span-2 h-1 overflow-hidden rounded-full bg-tpop04-rule"><span class="block h-full w-[22%] rounded-full bg-tpop04-glow/70"></span></span></li>
    </ul>
    <p class="mt-3.5 border-t border-tpop04-rule pt-3 text-[12px] leading-normal text-tpop04-mut">Close me: 140ms out, still on top the whole way.</p>
  </div>
</section>
```
## CSS
```css
@import "tailwindcss";

@theme {
  --color-tpop04-void: #030403;
  --color-tpop04-void: oklch(0.1 0.005 130);
  --color-tpop04-halo: #12190499;
  --color-tpop04-halo: oklch(0.2 0.04 125 / 0.6);
  --color-tpop04-surface: #0c0e0b;
  --color-tpop04-surface: oklch(0.16 0.006 130);
  --color-tpop04-ink: #f3f7f0;
  --color-tpop04-ink: oklch(0.97 0.01 130);
  --color-tpop04-mut: #a0a79a;
  --color-tpop04-mut: oklch(0.72 0.02 130);
  --color-tpop04-rule: #252722;
  --color-tpop04-rule: oklch(0.27 0.01 130);
  --color-tpop04-glow: #c2f83d;
  --color-tpop04-glow: oklch(0.91 0.21 125);
  --font-tpop04-sans: 'Geist', system-ui, sans-serif;
  --font-tpop04-mono: 'Geist Mono', ui-monospace, monospace;
}
/* Root rule: the full-bleed contract, stated in CSS as well as in the markup's utilities, so the
   stage is sized before the browser build compiles. */

.tpop-04 {
  width: 100%;
  min-height: 100svh;
}
```
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

