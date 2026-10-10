import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const read = (rel) => fs.readFileSync(path.resolve(rel), 'utf8');

test('1. Bảng lệnh nhanh (⌘K) — tính năng ẩn được gắn đầy đủ vào App', () => {
  const app = read('src/App.tsx');
  const palette = read('src/components/CommandPalette.tsx');

  assert.ok(app.includes('<CommandPalette'), 'App must render the CommandPalette');
  assert.ok(app.includes('paletteCommands'), 'App must build the palette command catalogue');
  assert.ok(
    app.includes("e.key.toLowerCase() === 'k'") || app.includes('.toLowerCase() === \'k\''),
    'App must expose the ⌘/Ctrl + K shortcut',
  );
  assert.ok(
    app.includes("window.addEventListener('fforum_open_palette'"),
    'App must listen for the fforum_open_palette event',
  );

  // Tìm kiếm không dấu cho người dùng Việt
  assert.ok(palette.includes("normalize('NFD')"), 'Palette search must strip Vietnamese diacritics');
  assert.ok(palette.includes('ArrowDown') && palette.includes('ArrowUp'), 'Palette must support arrow-key navigation');
  assert.ok(palette.includes('data-palette-index'), 'Palette rows must be addressable for keyboard scrolling');
  assert.ok(palette.includes('role="dialog"'), 'Palette must be a dialog for accessibility + wheel isolation');
});

test('2. Sổ tay nhanh & nhắc nghỉ mắt 20-20-20 (tính năng ẩn hữu dụng)', () => {
  const app = read('src/App.tsx');
  const notes = read('src/components/QuickNotesDock.tsx');
  const coach = read('src/components/StudyCareCoach.tsx');
  const settings = read('src/components/SettingsModal.tsx');

  assert.ok(app.includes('<QuickNotesDock'), 'App must render the QuickNotesDock');
  assert.ok(app.includes('<StudyCareCoach'), 'App must render the study-care coach');
  assert.ok(
    notes.includes("QUICK_NOTES_KEY = 'fforum_focus_scratchpad'"),
    'Quick notes must share the notebook with Focus Sanctuary',
  );
  assert.ok(notes.includes('maxLength={5000}'), 'Quick notes textarea must keep a maxLength boundary');
  assert.ok(coach.includes('20-20-20'), 'Coach must implement the 20-20-20 eye-rest rule');
  assert.ok(
    settings.includes('Nhắc nghỉ mắt 20-20-20') && settings.includes("fforum_eye_rest_now"),
    'Settings must expose the eye-rest toggle and manual trigger',
  );
});

test('3. Radial menu: hub 64px, item 53px (+20%) và ngọn lửa streak nằm BÊN TRONG menu', () => {
  const radial = read('src/components/RadialQuickMenu.tsx');
  const navbar = read('src/components/Navbar.tsx');
  const css = read('src/index.css');

  assert.ok(radial.includes('w-16 h-16'), 'Radial hub must grow to 64px (+20% from 53px)');
  assert.ok(radial.includes('w-[53px] h-[53px]'), 'Radial satellite items must grow to 53px (+20% from 44px)');
  assert.ok(radial.includes("data-tier"), 'Radial items must use staggered tiers for an overlap-free fan');
  assert.ok(radial.includes("id: 'streak'"), 'Streak check-in must live inside the radial menu');
  assert.ok(radial.includes('ccm-02__badge'), 'Radial streak item must show the streak counter badge');

  assert.ok(!navbar.includes('StreakFlameWidget'), 'Navbar must no longer render the floating streak flame');
  assert.ok(
    !/streakWidgetPosClass/.test(navbar),
    'The floating streak widget positioning rules must be removed from Navbar',
  );

  assert.ok(css.includes('--ccm-r: 132px') && css.includes('--ccm-r-alt: 164px'), 'Radial radii must scale up 20%+');
});

test('4. Chuyển GUI lớn ↔ GUI nhỏ mượt hơn (morph + nhãn co giãn)', () => {
  const navbar = read('src/components/Navbar.tsx');
  const css = read('src/index.css');

  assert.ok(navbar.includes('isMorphing'), 'Navbar must track a morphing state when dock position changes');
  assert.ok(navbar.includes('ff-nav-morphing'), 'Dock container must receive the ff-nav-morphing class');
  assert.ok(css.includes('.dock-container.ff-nav-morphing > nav'), 'CSS must animate the morphing dock');
  assert.ok(css.includes('interpolate-size: allow-keywords'), 'CSS must allow keyword size interpolation');
  assert.ok(
    css.includes('.nav-tab-btn {') && css.includes('will-change: width, min-width, padding;'),
    'Nav tab buttons must transition width/padding smoothly',
  );
  assert.ok(
    !/\.dock-pos-top \.ff-nav-capsule\[data-compact="true"\] \.nav-tab-btn,\n\.dock-pos-bottom \.ff-nav-capsule\[data-compact="true"\] \.nav-tab-btn \{\n  width: 36px;/.test(
      css,
    ),
    'Compact tab buttons must not hard-lock width (that caused the janky jump)',
  );
});

test('5. Drawer mobile: thay chữ dài dòng bằng icon nhỏ đúng chủ đề', () => {
  const navbar = read('src/components/Navbar.tsx');

  assert.ok(
    (navbar.match(/ff-explore-tile/g) || []).length >= 8,
    'Explore drawer must render an icon-centric tile grid',
  );
  ['<Film', '<Trophy', '<Rocket', '<Sparkles', '<Flame', '<NotebookPen', '<Command', '<Timer'].forEach((icon) => {
    assert.ok(navbar.includes(icon), `Explore tiles must use the themed icon ${icon}`);
  });
  assert.ok(
    navbar.includes("window.dispatchEvent(new CustomEvent('fforum_open_notes'))") &&
      navbar.includes("window.dispatchEvent(new CustomEvent('fforum_open_palette'))"),
    'Explore tiles must open the hidden quick-notes and command palette layers',
  );
});

test('6. Settings: 3 tab cao cấp, bỏ hàng nút ▲▼◀▶ thô, gradient dạng tile', () => {
  const settings = read('src/components/SettingsModal.tsx');
  const css = read('src/index.css');

  assert.ok(settings.includes("'appearance'") && settings.includes("'experience'") && settings.includes("'system'"));
  assert.ok(settings.includes('Trung tâm điều khiển'), 'Settings header must be upgraded to the premium control center');

  ['▲', '▼', '◀', '▶'].forEach((glyph) => {
    assert.ok(!settings.includes(glyph), `Legacy dock glyph button ${glyph} must be removed from Settings`);
  });
  assert.ok(settings.includes('ff-dock-mock') && settings.includes('ff-dock-zone'), 'Navbar picker must use the mini-screen mockup');
  assert.ok(
    settings.includes('onSelectNavbarPosition?.(zone.id)'),
    'Mockup edge zones must still commit the chosen navbar position',
  );
  assert.ok(settings.includes('<GradientSwatchPicker'), 'Gradient presets must use the shared swatch component');
  assert.ok(read('src/components/GradientSwatchPicker.tsx').includes('role="radiogroup"'), 'Gradient picker must stay an accessible radiogroup');
  assert.ok(read('src/components/GradientSwatchPicker.css').includes('.gradient-swatch') && css.includes('.ff-dock-mock'), 'Premium CSS helpers must exist');

  // Các bất biến cũ của settings test vẫn phải được giữ
  assert.ok(settings.includes('w-[84px] h-[42px]'), 'Cartoon switch geometry must be preserved');
  assert.ok(settings.includes('animate-[spin_10s_linear_infinite]'), 'Cartoon sun rays must be preserved');
  assert.ok(settings.includes('usePopoverPosition'), 'Settings must stay anchored via usePopoverPosition');
});

test('7. Sao lưu dữ liệu học tập bằng safeStorage (không truy cập localStorage thô)', () => {
  const settings = read('src/components/SettingsModal.tsx');
  const storage = read('src/utils/storage.ts');

  assert.ok(settings.includes('entriesWithPrefix'), 'Settings must export data through the safe storage helper');
  assert.ok(settings.includes('removeWithPrefix'), 'Settings must reset data through the safe storage helper');
  assert.ok(!settings.includes('window.localStorage.'), 'Settings must not touch raw localStorage directly');
  assert.ok(storage.includes('entriesWithPrefix') && storage.includes('removeWithPrefix'));
  assert.ok(settings.includes('type="file"'), 'Import must use a hidden file input');
});

test('8. Giao diện "ôn tập" dư thừa đã bị gỡ khỏi DailyEngagementModal', () => {
  const daily = read('src/components/DailyEngagementModal.tsx');
  const content = read('src/components/landing/landingContent.ts');

  assert.ok(!daily.includes('reviewMode'), 'Quiz review (ôn tập) mode must be removed');
  assert.ok(!daily.includes('Xem lại câu hỏi'), 'The "Xem lại câu hỏi" button must be gone');
  assert.ok(!daily.includes('StreakFlameWidget'), 'The detached streak widget must be deleted with the floating flame');
  assert.ok(!content.includes('ôn tập'), 'Landing copy must not advertise the redundant revision feature');
});

test('9. F-Forum về Trang chủ; Giới thiệu nằm trong Khám phá', () => {
  const navbar = read('src/components/Navbar.tsx');
  const app = read('src/App.tsx');

  assert.ok(
    !navbar.includes("{ id: 'landing', label: 'GIỚI THIỆU' }"),
    'Navbar must not render the redundant "GIỚI THIỆU" text tab',
  );
  assert.equal((navbar.match(/aria-label="Về trang chủ F-Forum"/g) || []).length, 2,
    'both desktop and mobile brand buttons announce Home');
  assert.ok(navbar.includes('title="F-Forum — Trang chủ"'), 'brand tooltip points at Home');
  assert.equal((navbar.match(/onViewChange\('home'\)/g) || []).length, 2,
    'both F-Forum buttons navigate home');
  assert.equal((navbar.match(/onViewChange\('landing'\)/g) || []).length, 1,
    'Explore still contains the sole link to the introduction');
  assert.ok(app.includes("currentView === 'landing'"), 'Landing route remains available');
});

test('10. Miền Ký Ức / Khu Vinh Danh / Update luôn ở dạng icon', () => {
  const navbar = read('src/components/Navbar.tsx');
  const css = read('src/index.css');

  assert.ok(
    navbar.includes("{ id: 'memory', label: 'MIỀN KÝ ỨC', iconOnly: true }") &&
      navbar.includes("{ id: 'chronicles', label: 'KHU VINH DANH', iconOnly: true }") &&
      navbar.includes("{ id: 'coming-soon', label: 'UPDATE', iconOnly: true }"),
    'The three utility tabs must be flagged iconOnly',
  );
  assert.ok(navbar.includes('nav-tab-btn--icon-only'), 'Icon-only tabs must carry the dedicated class');
  assert.ok(navbar.includes('data-icon-only'), 'Icon-only tabs must expose data-icon-only for styling/tests');
  assert.ok(navbar.includes('nav-dock-divider'), 'A slim divider must separate text tabs from icon tabs');
  assert.ok(
    navbar.includes("item.iconOnly ? 'ff-tip-always' : ''"),
    'Icon-only tabs must keep their hover tooltip even when the navbar is expanded',
  );

  assert.ok(
    css.includes('.ff-nav-capsule .nav-tab-btn--icon-only .ff-nav-label') &&
      css.includes('max-width: 0 !important;'),
    'CSS must hide labels permanently for icon-only tabs',
  );
  assert.ok(
    css.includes('.dock-pos-top .ff-nav-capsule[data-compact="false"] .nav-tab-btn--icon-only .ff-nav-tab-icon-wrap'),
    'CSS must keep the icon visible for icon-only tabs in expanded mode',
  );
  assert.ok(css.includes('.ff-nav-capsule .ff-tip-always'), 'CSS must force tooltips for icon-only tabs');
});

test('11. Nhịp thu nhỏ / phóng to navbar chậm và mượt hơn', () => {
  const navbar = read('src/components/Navbar.tsx');
  const css = read('src/index.css');

  assert.ok(navbar.includes('scheduleCompact(760)'), 'Collapse grace period must be slowed to 760ms');
  assert.ok(navbar.includes('delay = 760'), 'scheduleCompact default must be 760ms');
  assert.ok(!navbar.includes('scheduleCompact(500)'), 'The old snappy 500ms collapse must be gone');

  assert.ok(css.includes('width 0.78s cubic-bezier(0.32, 0.72, 0, 1)'), 'Capsule width must ease over 0.78s');
  assert.ok(css.includes('max-width 0.76s cubic-bezier(0.32, 0.72, 0, 1)'), 'Label shrink must ease over 0.76s');
  assert.ok(css.includes('animation: ffNavMorph 620ms cubic-bezier(0.32, 0.72, 0, 1) both'), 'Dock morph must slow down');
  assert.ok(css.includes('transition: top 0.46s cubic-bezier(0.32, 0.72, 0, 1)') || css.includes('top 0.46s'), 'Popovers must glide when the dock shifts');
});

test('12. Hiệu ứng hiện ra của panel Cài đặt được làm mượt', () => {
  const settings = read('src/components/SettingsModal.tsx');
  const css = read('src/index.css');

  assert.ok(settings.includes('isRendered') && settings.includes('isClosing'), 'Settings must keep an enter/exit state machine');
  assert.ok(settings.includes("setTimeout(() => {\n      setIsRendered(false);"), 'Exit must wait before unmounting so the fade-out can play');
  assert.ok(settings.includes('ff-settings-panel--in') && settings.includes('ff-settings-panel--out'), 'Panel must swap between in/out animation classes');
  assert.ok(settings.includes('ff-settings-panel--settled') && settings.includes('settledRafRef'), 'Panel position updates must be transition-enabled after first paint');
  assert.ok(settings.includes('ff-backdrop-in') && settings.includes('ff-backdrop-out'), 'Backdrop must fade in and out');
  assert.ok(settings.includes("'--ff-settings-origin'"), 'Panel must expose a dock-aware transform origin');

  assert.ok(css.includes('@keyframes ffSettingsIn') && css.includes('@keyframes ffSettingsOut'), 'Settings keyframes must exist');
  assert.ok(css.includes('@keyframes ffBackdropIn') && css.includes('@keyframes ffBackdropOut'), 'Backdrop keyframes must exist');
  assert.ok(css.includes('.ff-settings-panel--settled'), 'Settled transition rule must exist');
  assert.ok(css.includes('animation: ffSettingsIn 480ms cubic-bezier(0.22, 1, 0.36, 1) both'), 'Panel reveal must be a soft 480ms spring');
});

test('13. Navbar surface: một viền sáng duy nhất, không xếp lớp gradient', () => {
  const css = read('src/index.css');
  const navbar = read('src/components/Navbar.tsx');

  // Tắt vòng gradient ::before của liquid-glass riêng cho navbar
  assert.ok(css.includes('.ff-nav-capsule.liquid-glass::before'), 'Navbar must disable the inherited gradient ring');
  assert.ok(css.includes('content: none !important;'), 'The ring must be switched off with content: none');
  assert.ok(css.includes('.ff-nav-capsule.liquid-glass::after'), 'Navbar must draw ONE hairline gradient instead');
  assert.ok(
    css.includes('mask-composite: exclude;') && css.includes('-webkit-mask-composite: xor;'),
    'The single hairline must be masked to the border ring only',
  );

  // Chỉ báo tab đang mở nằm TRONG nút — không đo bằng JS nên không bao giờ
  // lệch khung hay "nhảy" khi navbar phóng to / thu nhỏ (pill cũ đã bị loại bỏ)
  assert.ok(!navbar.includes('nav-liquid-drop'), 'The overlapping droplet beads must be removed from the navbar');
  assert.ok(!css.includes('nav-liquid-glow'), 'The pulsing pill glow (double effect) must be removed');
  assert.ok(
    !navbar.includes('liquidPillRef') && !navbar.includes('--liquid-pill-x') && !css.includes('.nav-liquid-pill'),
    'The JS-measured sliding pill must be fully replaced by the in-button indicator',
  );
  assert.ok(
    navbar.includes('nav-tab-btn__indicator') && navbar.includes('nav-tab-btn__indicator--on'),
    'Each tab button must render its own active indicator layer',
  );
  assert.ok(
    css.includes('.nav-tab-btn__indicator {') && css.includes('.nav-tab-btn__indicator--on'),
    'CSS must animate the in-button indicator in when the tab is active',
  );
  assert.ok(
    css.includes('.nav-tab-btn--active .ff-nav-tab-icon'),
    'The active tab icon must be the single soft-glow highlight (no doubled background box)',
  );
});

test('14. Brand lockup: huy hiệu F + chữ vàng tĩnh, hết aurora loè/méo', () => {
  const navbar = read('src/components/Navbar.tsx');
  const css = read('src/index.css');

  assert.ok(navbar.includes('ff-nav-brand') && navbar.includes('ff-nav-logo__core'), 'Navbar must use the new brand lockup');
  assert.ok(!navbar.includes('ff-aurora-text'), 'The navbar wordmark must not use the rainbow aurora animation anymore');
  assert.ok(!navbar.includes('drop-shadow-[0_2px_12px_rgba(245,158,11,0.3)]'), 'The heavy blurred drop-shadow must be gone');
  assert.ok(css.includes('.ff-nav-brand-title'), 'A dedicated, legible wordmark style must exist');
  assert.ok(css.includes('@keyframes ffBrandSweep'), 'The wordmark keeps a subtle specular sweep');
  assert.ok(css.includes('html.light .ff-nav-brand-title'), 'Light mode needs a darker gold gradient for contrast');
  assert.ok(css.includes('.ff-nav-logo__core'), 'The F monogram core must be styled as a crisp badge');
});

test('15. Bố cục navbar cân đối + icon không bao giờ biến mất', () => {
  const navbar = read('src/components/Navbar.tsx');
  const css = read('src/index.css');

  // Lưới 3 cột: thương hiệu | tab căn giữa | tiện ích
  assert.ok(
    navbar.includes('grid grid-cols-[auto_minmax(0,1fr)_auto] items-center'),
    'Navbar must use a 3-column grid so tabs are truly centred',
  );
  assert.ok(navbar.includes('justify-center gap-1 overflow-x-auto'), 'Tab strip must centre its content');
  assert.ok(css.includes('justify-content: safe center;'), 'Centring must be overflow-safe (no clipped leading tab)');
  assert.ok(navbar.includes('nav-actions-divider'), 'Utility cluster must be separated from the account cluster');

  // Nhịp chuyển đổi icon/nhãn chống "nút rỗng"
  assert.ok(
    css.includes('transition: max-width 0.5s cubic-bezier(0.32, 0.72, 0, 1) 0.22s,'),
    'Icon collapse must be delayed so buttons are never empty while expanding',
  );
  assert.ok(
    css.includes('transition: max-width 0.66s cubic-bezier(0.32, 0.72, 0, 1),'),
    'Labels must expand before their text fades in (no clipped glyphs)',
  );
  assert.ok(
    !/\.nav-tab-btn \{[^}]*transform: translateZ\(0\)/.test(css),
    'Tab buttons must not create a containing block (would break fixed tooltips)',
  );
  assert.ok(css.includes('.nav-icon-btn--on'), 'Navbar utility buttons must share one consistent active style');
});

test('16. Aura navbar tách lớp đúng: nằm sau nội dung, không đè chữ/icon', () => {
  const navbar = read('src/components/Navbar.tsx');
  const css = read('src/index.css');

  assert.ok(navbar.includes('ff-nav-aura'), 'Navbar must render the ambient aura layer');
  assert.ok(
    navbar.indexOf('ff-nav-aura') < navbar.indexOf('ff-nav-brand'),
    'The aura span must be rendered before the brand/content, as a background layer',
  );
  assert.ok(
    css.includes('.ff-nav-capsule.liquid-glass > * {') && css.includes('z-index: 1;'),
    'Navbar content must sit above the aura layer',
  );
  assert.ok(
    css.includes('z-index: 0 !important;') && css.includes('@keyframes ffNavAuraSweep'),
    'Aura layer must stay at z-index 0 with its own slow sweep animation',
  );
  assert.ok(css.includes('@media (prefers-reduced-motion: reduce)'), 'Reduced motion support must remain');
  assert.ok(
    css.includes('.reduce-motion .ff-nav-aura::before') && css.includes('.reduce-motion .ff-nav-brand-title'),
    'Reduced-motion class must also disable the aura and brand sweep',
  );
});

test('Navbar, bảng phối màu và typography trang chủ giữ phân cấp rõ ràng', () => {
  const nav = read('src/components/Navbar.tsx');
  const settings = read('src/components/SettingsModal.tsx');
  const home = read('src/components/views/HomeView.tsx');
  const title = read('src/components/views/HomeHeroTitle.css');
  assert.doesNotMatch(nav, /\{ id: 'home', label:/, 'desktop has no duplicate Home tab');
  assert.doesNotMatch(nav, /aria-label="Trang Chủ"/, 'mobile dock has no duplicate Home button');
  assert.match(nav, /type DockView = Exclude<DimensionView, 'landing' \| 'home'>/);
  assert.match(nav, /\{ id: 'qa', label: 'Hỏi Đáp' \}/);
  assert.match(settings, /<GradientSwatchPicker/, 'gradient picker uses the shared palette');
  assert.match(settings, /label="Bảng chọn Gradient"/);
  assert.match(read('src/components/GradientSwatchPicker.tsx'), /style=\{\{ background: g\.css \}\}/, 'swatches display the actual gradient');
  const top = home.indexOf('home-hero-title__top');
  const focus = home.indexOf('home-hero-title__focus');
  const bottom = home.indexOf('home-hero-title__bottom');
  assert.ok(top > 0 && focus > top && bottom > focus, 'hero reads top to bottom in deliberate lines');
  assert.match(title, /\.home-hero-title \{[^}]*flex-direction:\s*column/);
  assert.match(title, /\.home-hero-title__word \{[^}]*linear-gradient\(105deg,\s*#c2f1ff/);
});

test('Miền Ký Ức: dock trở lại mà không đổi containing block hoặc bóp méo lưới', () => {
  const nav = read('src/components/Navbar.tsx');
  const app = read('src/App.tsx');
  const css = read('src/index.css');
  assert.match(app, /rect\.bottom > window\.innerHeight/, 'cinema boundary still controls dock visibility');
  const dock = nav.slice(nav.indexOf('className={`hidden md:block fixed inset-0'), nav.indexOf('<ScrollProgressRail position={navbarPosition} />'));
  assert.match(dock, /transition-opacity/);
  assert.match(dock, /inert=\{isDockHidden\}/, 'hidden dock cannot steal focus or pointer events');
  assert.doesNotMatch(dock, /transform:\s*isDockHidden/, 'never transform the full-screen parent of fixed controls');
  assert.match(css, /\.dock-pos-top \.ff-nav-capsule\[data-compact="true"\],[\s\S]*?width: min\(94vw, 700px\)/);
  assert.doesNotMatch(css, /width: max-content !important/, 'no intrinsic-width reflow as labels expand');
  assert.doesNotMatch(css.match(/\.dock-pos-top > nav \{[^}]+\}/)?.[0] || '', /transition: all/);
});

test('Tiềm Năng uốn lượn với chữ Việt nguyên vẹn, có phương án giảm chuyển động', () => {
  const home = read('src/components/views/HomeView.tsx');
  const css = read('src/components/views/HomeHeroTitle.css');
  assert.match(home, /home-hero-title__word">Tiềm<\/span>\{' '\}[\s\S]*?home-hero-title__word">Năng<\/span>/,
    'keep whole NFC Vietnamese words and their dấu together');
  assert.match(home, /home-hero-title__wave[^>]*aria-hidden="true"/);
  assert.match(css, /font-family: system-ui, "Segoe UI", "Noto Sans", Arial, sans-serif/);
  assert.match(css, /@keyframes home-title-flow/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /html\.reduce-motion \.home-hero-title__word/);
  assert.match(css, /html\.potator-mode \.home-hero-title__word/);
});
