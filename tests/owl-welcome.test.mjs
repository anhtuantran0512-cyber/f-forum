/* Bản quyền trí tuệ thuộc về BroAmStuck */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { enterAuthForm, morphTransform } from '../src/components/auth/WelcomeFlow.ts';
const read = file => fs.readFileSync(file, 'utf8');

test('double-click và click giữa đường bay không thể mở form hai lần', () => {
  let step = 'welcome';
  let transitions = 0;
  const click = () => {
    const next = enterAuthForm(step);
    if (next !== step) transitions++;
    step = next;
  };
  click(); click(); click();
  assert.equal(step, 'form');
  assert.equal(transitions, 1);
  const source = read('src/components/AuthModal.tsx');
  assert.match(source, /if \(introHandled\.current \|\| !introOpen\) return;/);
  assert.match(source, /introHandled\.current = true;/);
  assert.match(source, /inert=\{introOpen\}/, 'form chỉ không tương tác khi còn ở welcome');
  assert.match(source, /if \(event\.target === event\.currentTarget\) setMorph\(null\)/,
    'animation chữ kết thúc sớm không được xoá ghost trước khi bảng biến hình xong');
});

test('FLIP board-to-form dùng đo toạ độ thực: mobile/desktop, không đổi width/height mỗi frame', () => {
  for (const [from, to] of [
    [{ left: 500, top: 280, width: 226, height: 99 }, { left: 680, top: 100, width: 480, height: 580 }],
    [{ left: 78, top: 180, width: 210, height: 88 }, { left: 12, top: 340, width: 350, height: 430 }],
  ]) {
    const result = morphTransform(from, to);
    assert.ok(Object.values(result).every(Number.isFinite));
    assert.ok(result.scaleX > 1 && result.scaleY > 1);
    assert.equal(from.left + from.width / 2 + result.x, to.left + to.width / 2);
    assert.equal(from.top + from.height / 2 + result.y, to.top + to.height / 2);
  }
  const css = read('src/components/auth/WelcomeSequence.css');
  assert.match(css, /@keyframes owlFLIPArc/);
  assert.match(css, /@keyframes owlBoardMorph/);
  assert.match(css, /transform:translate\(var\(--morph-x\),var\(--morph-y\)\) scale\(var\(--morph-sx\),var\(--morph-sy\)\)/);
});

test('kết quả chỉ chạy sau xác thực, đóng form trước, có skip & hard cap, không chặn ứng dụng', () => {
  const auth = read('src/components/AuthModal.tsx');
  const app = read('src/App.tsx');
  const scene = read('src/components/auth/OwlOutcome.tsx');
  const css = read('src/components/auth/OwlOutcome.css');
  assert.match(auth, /const succeed = \(\) => \{\s*handleClose\(\);\s*onSuccess\?\.\(/);
  assert.match(app, /onSuccess=\{handleAuthSuccess\}/);
  assert.match(app, /outcomeTimer\.current = setTimeout\(dismissAuthOutcome, lite \? 850 : 1550\)/);
  assert.match(scene, /onClick=\{onSkip\}/);
  assert.match(css, /\.owl-outcome \{[^}]*pointer-events:none/);
  assert.match(css, /\.owl-outcome__skip \{[^}]*pointer-events:auto/);
  assert.match(scene, /flow === 'register'/);
  assert.match(scene, /owl-outcome__gift/);
});

test('Skip & Lite: mỗi lần mở đều có Cú Bông, không có khung cửa ở đăng xuất', () => {
  const auth = read('src/components/AuthModal.tsx');
  const css = read('src/components/auth/WelcomeSequence.css');
  assert.match(auth, /const \[introOpen, setIntroOpen\] = useState\(true\)/);
  assert.doesNotMatch(auth, /fforum_auth_intro_seen/, 'legacy seen flag must not hide the owl');
  assert.match(auth, /onClick=\{\(\) => openForm\(true\)\}/);
  assert.match(auth, /setIntroOpen\(true\);\s*setActiveTab\(initialTab\);\s*introHandled\.current = false;/);
  assert.match(css, /html\.potator-mode \.auth-card--morphed \.auth-stage/);
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.match(read('src/App.tsx'), /onLogout=\{\(\) => logout\(\)\}/);
});

test('Galaxy Reveal: viewport canvas có sao lệch pha, DPR giới hạn, Lite là 1 box-shadow', async () => {
  const { createGalaxyStars, GALAXY_SMALL_STARS, GALAXY_NEAR_STARS, GALAXY_LITE_STARS,
    galaxyDpr, nextShootingDelay, liteGalaxyShadow } = await import('../src/components/auth/galaxyField.ts');
  let seed = 31415;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const stars = createGalaxyStars(random);
  assert.equal(stars.length, 208);
  assert.equal(GALAXY_SMALL_STARS, 190);
  assert.equal(GALAXY_NEAR_STARS, 18);
  assert.ok(stars.every(s => s.period >= 2 && s.period <= 5 && s.phase >= 0 && s.phase <= Math.PI * 2));
  assert.ok(new Set(stars.map(s => s.period.toFixed(2))).size > 100, 'each star has varied twinkle period');
  assert.ok(stars.slice(GALAXY_SMALL_STARS).some(s => s.sparkle));
  assert.equal(galaxyDpr(3), 1.5);
  assert.equal(galaxyDpr(0), 1);
  assert.equal(nextShootingDelay(() => 0), 8000);
  assert.equal(nextShootingDelay(() => 1), 15000);
  assert.equal((liteGalaxyShadow().match(/rgba\(/g) || []).length, GALAXY_LITE_STARS);
  const css = read('src/components/auth/GalaxySky.css');
  const component = read('src/components/auth/GalaxySky.tsx');
  assert.match(css, /\.galaxy-sky \{ position:fixed; inset:0; z-index:0;[^}]*pointer-events:none/);
  assert.match(css, /\.auth-overlay > \.auth-card \{ position:relative; z-index:1/);
  assert.match(css, /filter:blur\(68px\)/);
  assert.match(css, /\.galaxy-sky--lite \.galaxy-sky__nebula,\.galaxy-sky--lite \.galaxy-sky__canvas \{ display:none/);
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.match(component, /document\.addEventListener\('visibilitychange'/);
  assert.match(component, /1000 \/ 30/, 'canvas capped at 30 FPS');
  assert.match(read('src/components/AuthModal.tsx'), /<GalaxySky active=\{lightsOut\} \/>/);
});

test('Cú Bông xuất hiện mượt: transform/opacity, không SVG filter, không React render theo mỗi pointer', () => {
  const css = read('src/components/auth/WelcomeSequence.css');
  const auth = read('src/components/AuthModal.tsx');
  const svg = read('src/components/mascot/CuBong.tsx');
  const entrance = css.split('@keyframes owlWelcomeLand {')[1].split('@keyframes owlWelcomeFlap')[0];
  assert.ok(entrance);
  assert.doesNotMatch(entrance, /(?:top|left|width|height|margin|filter|box-shadow)\s*:/);
  assert.match(entrance, /translate3d/);
  assert.match(entrance, /scale\(1\.035\)/, 'subtle landing overshoot');
  assert.match(css, /\.auth-welcome-owl \{[^}]*cubic-bezier\(\.16,1,\.3,1\)/);
  assert.match(css, /\.auth-welcome-board \{[^}]*owlBoardRise \.44s \.17s/);
  assert.match(css, /\.auth-welcome-owl:not\(\.is-landed\) \{ will-change:transform,opacity; \}/);
  assert.match(css, /\.auth-welcome-owl \.auth-mascot \{ margin:0; \}/, 'no per-frame SVG drop-shadow filter');
  assert.doesNotMatch(css, /@keyframes owlBoardBreathe/, 'no animated box-shadow repaint');
  assert.match(css, /\.auth-overlay--welcome \{[^}]*backdrop-filter:none/);
  assert.doesNotMatch(auth, /setWelcomeLook/);
  assert.match(auth, /welcomeEyeFrame\.current = window\.requestAnimationFrame/);
  assert.match(auth, /classList\.add\('is-landed'\)/);
  assert.match(auth, /!introOpen && <div className="auth-sky">/, '64 invisible stars deferred until form');
  assert.match(svg, /return \(\s*<svg/, 'owl is inline SVG, not a late-loading image/Lottie');
});
