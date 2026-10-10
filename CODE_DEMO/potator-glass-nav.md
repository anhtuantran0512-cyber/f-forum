# GUI ở chế độ Potator — Inner-Glow Glass Nav Links

> Nguồn: CodeFronts (MIT). Segment #01 — tür từ `code_yeucau.md`.
> Nhãn gốc: `GUI Ở CHẾ ĐỘ POTATOR :`


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