/* Bản quyền trí tuệ thuộc về BroAmStuck */
/**
 * Epic 5 — Đăng nhập "điện ảnh": Đèn pin soi mật khẩu (+ fallback trợ năng), linh vật Cú Bông
 * phản ứng theo hành vi, nền theo giờ trong ngày, Brand Voice, Zero-Clutter (InfoTip),
 * và nút tắt âm thanh hiệu ứng hoạt động thật.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const read = (rel) => fs.readFileSync(path.resolve(rel), 'utf8');

test('Epic 5 · Đèn pin: 2 lớp chữ cắt lộ bằng nón đèn theo hướng con trỏ, flicker, bụi sáng, nón sáng', () => {
  const field = read('src/components/auth/FlashlightPasswordField.tsx');
  const css = read('src/components/auth/AuthExperience.css');
  assert.match(field, /className="ffl__mask ffl__mask--dots"/, 'lớp chấm');
  assert.match(field, /className="ffl__mask ffl__mask--real"/, 'lớp chữ thật');
  assert.match(css, /\.ffl__mask--real \{[\s\S]*?clip-path: var\(--ffl-cone/, 'chữ thật chỉ hiện trong nón');
  assert.match(field, /flashlightCone\(source, target, reach\)/, 'nón bắt nguồn ở đèn, mở rộng tới mép màn hình');
  assert.match(css, /\.ffl__dot \{ display: inline-block; width: 1ch; margin-right: var\(--ffl-ls\);/, 'chấm trùng khít từng ô ký tự');
  assert.match(css, /@keyframes fflFlicker/, 'ánh sáng rung nhẹ như đèn pin thật');
  assert.match(css, /@keyframes fflMote/, 'bụi sáng bay trong vùng sáng');
  assert.match(css, /\.ffl__viewport-beam \{[\s\S]*?filter: blur\(8px\)/, 'viền sáng mềm và phủ toàn màn hình');
  assert.match(field, /box\.style\.setProperty\('--ffl-x'/, 'cập nhật toạ độ bằng biến CSS (không re-render khi rê)');
  assert.match(field, /setPointerCapture\(event\.pointerId\)/, 'giữ-rê bằng chuột lẫn ngón tay');
  assert.match(css, /touch-action: none/, 'không cuộn trang khi kéo đèn trên cảm ứng');
  assert.match(field, /input\.scrollLeft/, 'đồng bộ cuộn ngang khi mật khẩu dài');
  assert.ok(!/from 'lucide-react'/.test(field), 'icon đèn pin tự vẽ, không dùng icon mặc định');
  const auth = read('src/components/AuthModal.tsx');
  assert.ok(!/\bEye\b|\bEyeOff\b/.test(auth + field), 'không còn icon con mắt nhàm chán');
});

test('Epic 5 · Đèn pin: fallback trợ năng bắt buộc — nhấn đúp, giữ phím Cách, Enter; thông báo cho trình đọc màn hình', () => {
  const field = read('src/components/auth/FlashlightPasswordField.tsx');
  assert.match(field, /const DOUBLE_TAP_MS = 320;/);
  assert.match(field, /now - lastTap\.current < DOUBLE_TAP_MS[\s\S]*?setMode\(\(current\) => \(current === 'reveal' \? 'off' : 'reveal'\)\)/, 'nhấn đúp → hiện toàn bộ');
  assert.match(field, /if \(event\.key === ' ' \|\| event\.key === 'Spacebar'\) \{\s*event\.preventDefault\(\);\s*if \(!event\.repeat && mode !== 'reveal'\)/, 'giữ Space → hiện');
  assert.match(field, /const onTorchKeyUp[\s\S]*?if \(mode === 'reveal'\) turnOff\(\);/, 'thả Space → ẩn');
  assert.match(field, /event\.key === 'Enter'/, 'Enter bật/tắt');
  assert.match(field, /aria-pressed=\{mode !== 'off'\}/);
  assert.match(field, /aria-live="polite"/);
  assert.match(field, /type=\{mode === 'off' \? 'password' : 'text'\}/, 'mặc định che bằng type=password');
  assert.match(field, /autoComplete=\{autoComplete\}/, 'giữ tương thích trình quản lý mật khẩu');
  assert.match(field, /if \(!wrapRef\.current\?\.contains\(event\.relatedTarget as Node \| null\)\)[\s\S]*?turnOff\(false\)/, 'rời ô là tắt đèn');
});

test('Epic 5 · Cú Bông: 7 biểu cảm SVG + CSS, đủ trạng thái cho mọi ngữ cảnh', () => {
  const mascot = read('src/components/mascot/CuBong.tsx');
  const css = read('src/components/mascot/CuBong.css');
  for (const mood of ['idle', 'attentive', 'shy', 'peek', 'sad', 'celebrate', 'sleepy']) {
    assert.ok(mascot.includes(`'${mood}'`), `có biểu cảm ${mood}`);
    if (mood !== 'idle') assert.ok(css.includes(`.cb--${mood} `), `CSS cho biểu cảm ${mood}`);
  }
  assert.match(mascot, /className="cb-glasses"/, 'đeo kính khi chăm chú');
  assert.match(mascot, /className="cb-pen"/, 'cầm bút');
  assert.match(mascot, /className="cb-sweat"/, 'đổ mồ hôi hột khi lỗi');
  assert.match(mascot, /className="cb-sign"/, 'giơ bảng chào mừng');
  assert.match(mascot, /className="cb-cap"/, 'mũ tốt nghiệp — dấu hiệu nhận diện');
  assert.match(css, /\.cb--shy \.cb-cover \{ opacity: 1; transform: none; \}/, 'che mắt khi gõ mật khẩu');
  assert.match(css, /\.cb--peek \.cb-lid--r \{ transform: scaleY\(0\.45\); \}/, 'nheo một mắt khi soi đèn');
  assert.match(css, /prefers-reduced-motion/);
  assert.ok(!/\.gif|lottie/i.test(mascot), 'SVG/CSS thuần, không GIF giật');
});

test('Epic 5 · Trang Auth: mascot phản ứng theo hành vi, nền theo giờ, đóng ngay khi xác thực thành công', () => {
  const auth = read('src/components/AuthModal.tsx');
  assert.match(auth, /<CuBong mood=\{mood\}/);
  assert.match(auth, /torchMode === 'beam' \? 'peek'/, 'bật đèn pin → hé mắt');
  assert.match(auth, /focusField === 'password' \? 'shy'/, 'gõ mật khẩu → che mắt');
  assert.match(auth, /focusField \? 'attentive'/, 'gõ email → đeo kính cầm bút');
  assert.match(auth, /flashMascot\('sad', 2400\)/, 'sai → buồn');
  assert.match(auth, /handleClose\(\);\s*onSuccess\?\.\(/, 'thành công → đóng form trước khi chạy cảnh mới');
  assert.doesNotMatch(auth, /SessionDoor|CelebrationBurst|closeTimer/, 'không chặn giao diện bằng lớp phủ hay timer');
  assert.match(auth, /const dayPhaseOf = \(hour: number\): DayPhase/, 'nền đồng bộ thời gian trong ngày');
  for (const phase of ['morning', 'day', 'dusk', 'night']) assert.ok(read('src/components/auth/AuthExperience.css').includes(`.auth-stage--${phase}`));
  assert.match(auth, /<FlashlightPasswordField\s+id="field-2"/, 'ô mật khẩu đăng nhập dùng đèn pin');
  assert.equal((auth.match(/<FlashlightPasswordField/g) || []).length, 3, 'đăng ký: cả mật khẩu và nhập lại');
  assert.match(auth, /handleGoogleAuth/);
  assert.match(auth, /handleFacebookAuth/);
  assert.ok(!/password\s*===\s*['"]/.test(auth), 'không mật khẩu hardcode');
  /* Brand Voice */
  assert.match(auth, /Mừng cậu quay lại!/);
  assert.match(auth, /Đăng nhập thôi!/);
  assert.match(auth, /Ối, mật khẩu chưa đúng rồi\. Soi đèn pin xem gõ nhầm chỗ nào nhé\?/);
  assert.ok(!auth.includes('Vui lòng nhập đầy đủ'), 'bỏ câu khô cứng');
});

test('Epic 5 · Nút tắt âm thanh hiệu ứng hoạt động thật (trước đây chỉ để trang trí)', async () => {
  const audioSource = read('src/utils/audio.ts');
  assert.match(audioSource, /export function playChime\([^)]*\) \{\n  if \(!isSfxEnabled\(\)\) return;/);
  assert.match(audioSource, /export function playFlashlightClick\(on: boolean = true\): void \{\n  if \(!isSfxEnabled\(\)\) return;/);
  const { isSfxEnabled } = await import('../src/utils/audio.ts');
  const { safeStorage } = await import('../src/utils/storage.ts');
  safeStorage.removeItem('fforum_sfx');
  assert.equal(isSfxEnabled(), true, 'mặc định bật');
  safeStorage.setItem('fforum_sfx', 'false');
  assert.equal(isSfxEnabled(), false, 'tắt trong Cài đặt → im lặng');
  safeStorage.setItem('fforum_sfx', 'true');
  assert.equal(isSfxEnabled(), true);
});

test('Epic 5 · Zero-Clutter: InfoTip, cắt tường chữ, bỏ chữ chết 432Hz, Brand Guideline đầy đủ', () => {
  const tip = read('src/components/ui/InfoTip.tsx');
  const tipCss = read('src/components/ui/InfoTip.css');
  assert.match(tip, /aria-describedby=\{tipId\}/, 'chi tiết vẫn tới được trình đọc màn hình');
  assert.match(tipCss, /\.ff-infotip:focus-within \.ff-infotip__bubble/, 'mở bằng bàn phím');
  const chat = read('src/components/views/ChatView.tsx');
  assert.ok(!chat.includes('432Hz'), 'không hướng dẫn tính năng đã xoá');
  assert.match(chat, /<InfoTip label="Nội quy phòng chat"/);
  assert.match(read('src/components/DailyEngagementModal.tsx'), /Chuỗi 5 · 10 · 15 ngày = 1 hộp quà Coin thật/);
  const doc = read('docs/BRAND_GUIDELINE.md');
  for (const section of ['Linh vật', '7 biểu cảm', 'Giọng văn', 'Đèn pin soi mật khẩu', 'UX Writing Diet', 'Signature Moments', 'Tự đánh giá']) {
    assert.ok(doc.includes(section), `Brand Guideline có mục "${section}"`);
  }
  assert.ok(!/Tuan@0512/.test(doc), 'không lộ mật khẩu cũ trong tài liệu');
});

test('Đèn pin: chỉ một nút ở ô nhập lại, hướng SVG quay theo tia không nhảy ±180°', async () => {
  const auth = read('src/components/AuthModal.tsx');
  const field = read('src/components/auth/FlashlightPasswordField.tsx');
  assert.match(auth, /id="field-5"\s+label="Mật khẩu"\s+showTorch=\{false\}/);
  assert.match(field, /\{showTorch && <button/);
  assert.match(field, /currentAngle\.current = continuousTorchAngle/);
  const { torchAimDegrees, continuousTorchAngle } = await import('../src/utils/flashlightCone.ts');
  const lamp = { x: 100, y: 100 };
  assert.equal(torchAimDegrees(lamp, { x: 0, y: 100 }), 0); // icon initially points left
  assert.equal(torchAimDegrees(lamp, { x: 100, y: 0 }), 90);
  assert.equal(torchAimDegrees(lamp, { x: 100, y: 200 }), -90);
  assert.ok(Math.abs(continuousTorchAngle(179, -179) - 179) < 5);
  assert.ok(Math.abs(continuousTorchAngle(-179, 179) + 179) < 5);
});
