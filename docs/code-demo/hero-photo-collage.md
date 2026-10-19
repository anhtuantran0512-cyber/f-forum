# Tham khảo thêm — Tailwind Hero Photo Collage Grid

> Nguồn: CodeFronts (MIT). Segment #05 — tür từ `code_yeucau.md`.
> Nhãn gốc: `tham khảo thêm :`


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