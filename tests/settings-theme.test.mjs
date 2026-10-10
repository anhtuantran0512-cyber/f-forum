import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('1. Settings button and iOS Liquid Glass Settings Modal Integration in Navbar', () => {
  const navbarContent = fs.readFileSync(path.resolve('src/components/Navbar.tsx'), 'utf8');
  const settingsModalContent = fs.readFileSync(path.resolve('src/components/SettingsModal.tsx'), 'utf8');

  // Verify Settings button on the capsule navbar
  assert.ok(
    navbarContent.includes('aria-label="Cài đặt hệ thống"'),
    'Navbar Settings button must exist with an accessible label'
  );

  // Verify Settings icon from lucide-react is used
  assert.ok(
    navbarContent.includes('<Settings'),
    'Navbar must render Settings icon'
  );

  // Ambient 432Hz is intentionally removed from the navigation settings.
  assert.ok(
    !navbarContent.includes('toggleFocusAudio') && !navbarContent.includes('audioCtxRef'),
    'Navbar must not retain the removed ambient audio controls'
  );

  // Verify SettingsModal is rendered
  assert.ok(
    navbarContent.includes('<SettingsModal'),
    'Navbar must render SettingsModal'
  );

  // Verify transparent outside-click backdrop
  assert.ok(
    settingsModalContent.includes('fixed inset-0') && settingsModalContent.includes('bg-transparent'),
    'SettingsModal must have transparent outside-click backdrop'
  );

  // Verify liquid-glass popover anchored to the Settings button via the dock-aware hook
  assert.ok(
    settingsModalContent.includes('liquid-glass') && settingsModalContent.includes('usePopoverPosition'),
    'SettingsModal must use liquid-glass anchored via usePopoverPosition'
  );
});

test('2. Playful Cartoon Light/Dark Theme Switch Specifications', () => {
  const settingsModalContent = fs.readFileSync(path.resolve('src/components/SettingsModal.tsx'), 'utf8');

  // Verify cartoon sun face and rotating rays
  assert.ok(
    settingsModalContent.includes('animate-[spin_10s_linear_infinite]'),
    'Cartoon sun must feature spinning rotating rays'
  );

  // Verify cartoon moon face with crater dots and sleepy face
  assert.ok(
    settingsModalContent.includes('bg-amber-500/25') || settingsModalContent.includes('Crater'),
    'Cartoon moon must contain crater dots'
  );

  // Verify starry midnight sky vs morning cloud morphing
  assert.ok(
    settingsModalContent.includes('bg-gradient-to-r from-[#0a0f1d]') || settingsModalContent.includes('bg-gradient-to-r from-[#38bdf8]'),
    'Switch track must morph between midnight starry sky and sunny clouds'
  );

  // Verify cubic-bezier elastic spring bounce easing
  assert.ok(
    settingsModalContent.includes('cubic-bezier(0.34, 1.56, 0.64, 1)'),
    'Toggle knob must use cubic-bezier elastic spring easing'
  );
});

test('3. Apple iOS Light Glass & Dark Mode CSS Rules', () => {
  const cssContent = fs.readFileSync(path.resolve('src/index.css'), 'utf8');

  // html.light biến .liquid-glass thành kính sữa "liquid" (Nhiemvu_3 Epic 4 — WCAG AA).
  // Bản cũ 3% trắng cho chữ #101827 trên nền tối chỉ 1,13:1 nên đã được thay;
  // tỷ lệ tương phản được tính đầy đủ trong tests/light-mode-contrast.test.mjs.
  assert.ok(
    cssContent.includes('html.light .liquid-glass'),
    'index.css must define html.light .liquid-glass'
  );
  assert.ok(
    cssContent.includes('html.light .liquid-glass {\n  background: linear-gradient(180deg, rgba(255, 255, 255, 0.92), rgba(246, 248, 252, 0.88));'),
    'Light liquid-glass must be milky liquid glass (≥ 0.88 alpha) so dark text stays AA even over dark backdrops'
  );
  assert.ok(
    cssContent.includes('backdrop-filter: blur(var(--glass-blur, 14px));'),
    'Light liquid-glass blur must be driven by the --glass-blur setting (default 14px)'
  );
  assert.ok(
    cssContent.includes('html.text-size-sm') &&
    cssContent.includes('html.text-size-md') &&
    cssContent.includes('html.text-size-lg'),
    'Font-size setting (Cài đặt → Giao diện) must have real html.text-size-* rules'
  );
  assert.ok(
    cssContent.includes('rgba(255, 255, 255, 0.42)') && cssContent.includes('rgba(241, 245, 249, 0.30)'),
    'Light navbar must be translucent liquid glass (no opaque white glare)'
  );
  assert.ok(
    cssContent.includes('box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.95), 0 18px 44px rgba(15, 23, 42, 0.16);\n  border: 1px solid rgba(15, 23, 42, 0.08);'),
    'Light liquid-glass must use a crisp specular top edge, soft slate shadow and hairline slate border'
  );

  // Verify dark mode defines deeper Obsidian Liquid Glass
  assert.ok(
    cssContent.includes('background: rgba(15, 20, 26, 0.75);') &&
    cssContent.includes('border: 1px solid rgba(255, 255, 255, 0.08);'),
    'Dark mode must define deeper Obsidian Liquid Glass'
  );

  // Verify glowing white/amber specular highlights on gradient border ::before
  assert.ok(
    cssContent.includes('html.light .liquid-glass::before'),
    'Light mode must define glowing specular highlights on gradient border ::before'
  );

  // Verify reduced-motion support
  assert.ok(
    cssContent.includes('.reduce-motion'),
    'index.css must provide reduced-motion support'
  );
});

test('4. Settings Menu Options: Potator Mode, SFX, and Reduced Motion', () => {
  const settingsModalContent = fs.readFileSync(path.resolve('src/components/SettingsModal.tsx'), 'utf8');
  const cssContent = fs.readFileSync(path.resolve('src/index.css'), 'utf8');

  assert.ok(
    !settingsModalContent.includes('Âm thanh Ambient (432Hz)'),
    'Settings must remove the ambient 432Hz option'
  );
  assert.ok(
    settingsModalContent.includes('Hiệu ứng âm thanh'),
    'Settings must include Sound Effects (SFX) option'
  );
  assert.ok(
    settingsModalContent.includes('Giảm chuyển động'),
    'Settings must include Reduced Motion option'
  );
  assert.ok(
    settingsModalContent.includes('Mở Focus Mode'),
    'Settings must provide direct Focus Sanctuary shortcut'
  );
  /* EPIC 2 — Potator Mode bản MỚI (chế độ hiệu năng: chỉ thay nền động bằng
     gradient tĩnh, giữ nguyên 100% animation UI). Bản cũ đã xóa, bản mới phải
     có đủ: toggle trong Settings + bảng swatch dùng chung + class html.potator-mode. */
  assert.ok(
    settingsModalContent.includes('Potator Mode') &&
    settingsModalContent.includes('onTogglePotatorMode'),
    'Settings must include the new Potator Mode toggle'
  );
  assert.ok(
    settingsModalContent.includes('<GradientSwatchPicker') &&
    settingsModalContent.includes('onSelectPotatorBg'),
    'Settings must offer selectable static-background presets for Potator Mode'
  );
  assert.ok(
    cssContent.includes('html.potator-mode .ff-app-shell:not(.ff-view-home) .ff-video-bg'),
    'Potator Mode must hide background videos on every view EXCEPT home'
  );
  assert.ok(
    fs.readFileSync(path.resolve('src/utils/gradients.ts'), 'utf8').includes("id: '10'") &&
    fs.readFileSync(path.resolve('src/App.tsx'), 'utf8').includes('getGradient(potatorBg).css'),
    'Potator Mode must use the shared static gradient palette'
  );
  assert.ok(
    cssContent.includes('html.potator-mode .ff-nav-capsule .nav-tab-btn::after'),
    'Potator Mode must enable the navbar inner-glow hover'
  );
  assert.ok(
    !cssContent.includes('html.potato-mode') &&
    !cssContent.includes('.potator-mode-active') &&
    !settingsModalContent.includes('potatoMode'),
    'The OLD potato mode (full animation kill) must stay removed'
  );
  /* QUAN TRỌNG: Potator Mode mới KHÔNG được tắt animation UI — nếu có rule
     "animation: none" toàn cục dưới potator-mode là vi phạm spec. */
  const potatorSection = cssContent.slice(cssContent.indexOf('EPIC 2 — POTATOR MODE'));
  assert.ok(
    !/html\.potator-mode[^{]*\{[^}]*animation:\s*none/.test(potatorSection),
    'Potator Mode must NOT kill UI animations (only the video background is replaced)'
  );
});

test('4b. Potator Mode wiring: persistence keys + App layer + video pause', () => {
  const navbarContent = fs.readFileSync(path.resolve('src/components/Navbar.tsx'), 'utf8');
  const appContent = fs.readFileSync(path.resolve('src/App.tsx'), 'utf8');
  const cssContent = fs.readFileSync(path.resolve('src/index.css'), 'utf8');

  assert.ok(
    navbarContent.includes("safeStorage.getItem('fforum_potator_mode')") &&
    navbarContent.includes("safeStorage.setItem('fforum_potator_mode'"),
    'Potator Mode must persist to localStorage'
  );
  assert.ok(
    navbarContent.includes("safeStorage.getItem('fforum_potator_bg')") &&
    navbarContent.includes("document.documentElement.dataset.potatorBg"),
    'Potator background preset must persist and apply to <html data-potator-bg>'
  );
  assert.ok(
    navbarContent.includes("classList.toggle('potator-mode', potatorMode)"),
    'Navbar must toggle the potator-mode class on <html>'
  );
  assert.ok(
    appContent.includes("fforum_potator_sync") && appContent.includes('ff-potator-bg'),
    'App must listen for potator sync and render the static background layer'
  );
  assert.ok(
    appContent.includes("v.pause()") && appContent.includes('ff-video-bg video'),
    'App must pause background videos while Potator Mode is on (except home)'
  );
  assert.ok(
    cssContent.includes('html.potator-mode .liquid-glass') &&
    cssContent.includes('--glass-blur: 10px'),
    'Potator Mode must slim down glass blur (minimal aesthetic) without killing motion'
  );
});

test('5. Cartoon Switch Track Masking and Sync Duration', () => {
  const settingsModalContent = fs.readFileSync(path.resolve('src/components/SettingsModal.tsx'), 'utf8');

  // Verify track has pill masking
  assert.ok(
    settingsModalContent.includes('rounded-full overflow-hidden pointer-events-none'),
    'Track sky background must be cleanly masked with rounded-full'
  );

  // Verify sun and moon transitions use 500ms sync
  assert.ok(
    settingsModalContent.includes('transition-all duration-500'),
    'Face transitions must synchronize with 500ms knob bounce'
  );
});

test('6. Original Liquid Glass Invariance (Zero Opaque White Paper Overrides & Luminous Text Preserved)', () => {
  const cssContent = fs.readFileSync(path.resolve('src/index.css'), 'utf8');

  // Verify NO white paper overrides forcing black text #0f172a exist in index.css
  assert.ok(
    !cssContent.includes('#0f172a'),
    'index.css must not force black paper ink text #0f172a'
  );
  assert.ok(
    !cssContent.includes('background-color: #f8fafc'),
    'index.css must not force white paper body background #f8fafc'
  );

  // Verify smooth transition between original Liquid Glass and Obsidian Liquid Glass
  assert.ok(
    cssContent.includes('transition: background 0.5s') ||
    cssContent.includes('transition: background 0.5s cubic-bezier(0.16, 1, 0.3, 1)'),
    'liquid-glass must transition smoothly between light crystal and dark obsidian'
  );

  // Verify dialog popovers remain crystalline liquid glass in light mode
  assert.ok(
    cssContent.includes('html.light div[role="dialog"].liquid-glass'),
    'Light mode must define crystalline depth for liquid-glass dialogs'
  );
});

test('7. Baseline Liquid Glass Definition Invariance (Original Crystalline Baseline)', () => {
  const cssContent = fs.readFileSync(path.resolve('src/index.css'), 'utf8');

  // Verify baseline .liquid-glass rule itself defines original ultra-translucent crystalline parameters
  assert.ok(
    cssContent.includes('/* Liquid Glass Component (Original Crystalline iOS Liquid Glass Baseline) */'),
    'index.css must document baseline liquid-glass as original crystalline iOS glass'
  );
  assert.ok(
    cssContent.includes('.liquid-glass {\n  background: rgba(255, 255, 255, 0.03);'),
    'Baseline .liquid-glass must default to original crystalline rgba(255, 255, 255, 0.03)'
  );

  // Verify baseline ::before provides glowing white/amber specular highlights
  assert.ok(
    cssContent.includes('rgba(251, 191, 36, 0.25) 20%'),
    'Signature gradient border must feature glowing amber specular highlights'
  );
});

test('8. Desktop and Mobile Navbar Settings Integration & Outside Click Isolation', () => {
  const navbarContent = fs.readFileSync(path.resolve('src/components/Navbar.tsx'), 'utf8');

  // Verify settingsMenuRef and mobileSettingsMenuRef are both defined
  assert.ok(
    navbarContent.includes('settingsMenuRef') && navbarContent.includes('mobileSettingsMenuRef'),
    'Navbar must manage both desktop and mobile settings refs'
  );

  // Verify outside click handler checks both desktop and mobile ref containment
  assert.ok(
    navbarContent.includes('!insideDesktop && !insideMobile'),
    'Click outside must check both desktop and mobile settings containment'
  );

  /* Vòng 7 — sửa lỗi "bấm gì cũng không mở":
     Chỉ còn MỘT bảng Cài đặt, đặt ngoài khung `hidden md:block` và ngoài mọi
     khung có transform/filter, nhờ vậy tấm phủ của bảng luôn phủ đúng toàn màn
     hình. Bản sao cho điện thoại cũ từng không có nút neo → panel nằm ở
     top:-9999 + opacity:0 nhưng tấm phủ toàn màn hình vẫn bắt chuột. */
  const settingsModalOccurrences = navbarContent.split('<SettingsModal').length - 1;
  assert.equal(
    settingsModalOccurrences,
    1,
    'Navbar must render exactly ONE SettingsModal (the duplicate had no anchor and froze the app)'
  );
  assert.ok(
    !navbarContent.includes('<SettingsModal {...sharedSettingsProps} />'),
    'The anchor-less duplicate SettingsModal must be gone',
  );
  assert.ok(
    navbarContent.includes(
      '<div ref={settingsMenuRef}>\n        <SettingsModal {...sharedSettingsProps} anchorRef={settingsTriggerRef} />',
    ),
    'SettingsModal must be mounted outside the desktop-only popover container',
  );

  const permissiveAnchor = navbarContent.includes('mobileSettingsMenuRef');
  assert.ok(permissiveAnchor, 'Mobile settings trigger must still be recognised by the outside-click guard');
});

test('9. Cartoon Switch Knob Geometry, Travel Offset & Easing Physics', () => {
  const settingsModalContent = fs.readFileSync(path.resolve('src/components/SettingsModal.tsx'), 'utf8');

  // Verify track dimensions 84x42px
  assert.ok(
    settingsModalContent.includes('w-[84px] h-[42px]'),
    'Cartoon switch button must be 84px wide by 42px high'
  );

  // Verify knob dimensions 34x34px
  assert.ok(
    settingsModalContent.includes('w-[34px] h-[34px]'),
    'Cartoon knob must be 34px diameter circular surface'
  );

  // Verify knob travel offset: 1px (dark) -> 42px (light)
  assert.ok(
    settingsModalContent.includes("theme === 'light' ? 'translate-x-[42px]' : 'translate-x-[1px]'"),
    'Knob must translate across 41px travel range between night and day states'
  );

  // Verify theme indicator badge uses valid py-0.5 padding
  assert.ok(
    settingsModalContent.includes('py-0.5 rounded-md font-mono'),
    'Theme indicator badge must use standard py-0.5 vertical padding'
  );
});
