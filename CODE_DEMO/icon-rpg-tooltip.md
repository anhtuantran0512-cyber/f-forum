# Icon tham khảo danh hiệu — RPG Inventory Tooltip (KHÔNG copy icon)

> Nguồn: CodeFronts (MIT). Segment #02 — tür từ `code_yeucau.md`.
> Nhãn gốc: `HIỆU ( KHÔNG ĐƯỢC  COPY ICON)`


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
