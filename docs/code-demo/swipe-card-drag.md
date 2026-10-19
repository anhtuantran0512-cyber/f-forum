# Tham khảo — Tailwind Swipe Card Deck Drag to Dismiss

> Nguồn: CodeFronts (MIT). Segment #06 — tür từ `code_yeucau.md`.
> Nhãn gốc: `tham khảo :`


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