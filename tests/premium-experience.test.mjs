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
    css.includes('.nav-tab-btn {') && css.includes('will-change: width, padding;'),
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
  assert.ok(settings.includes('ff-grad-tile'), 'Gradient presets must render as premium tiles');
  assert.ok(settings.includes('role="radiogroup"'), 'Gradient picker must stay an accessible radiogroup');
  assert.ok(css.includes('.ff-grad-tile') && css.includes('.ff-dock-mock'), 'Premium CSS helpers must exist');

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
