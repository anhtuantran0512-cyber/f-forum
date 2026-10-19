# GUI Admin — CSS Table Admin Dashboard Data Grid

> Nguồn: CodeFronts (MIT). Segment #12 — tür từ `code_yeucau.md`.
> Nhãn gốc: `ICON NÊN HỌC CÁI NÀY :`


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