# Thêm — CSS Notification Badge Clip Path

> Nguồn: CodeFronts (MIT). Segment #14 — tür từ `code_yeucau.md`.
> Nhãn gốc: `THAM KHẢO :`


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