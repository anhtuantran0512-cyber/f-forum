/* Bản quyền trí tuệ thuộc về BroAmStuck */
/**
 * Epic 4 — Profile Clay 2.0 · Gacha Boutique · Kệ huy hiệu · Preset gradient Settings.
 * Kiểm chứng: độ hiếm, nhãn Mới/Hot/Giảm giá có cơ sở THẬT (máy chủ trừ đúng giá ưu đãi),
 * xem trước/mở hộp/zero-clutter, Clay 2.0 đồng bộ cả 2 chế độ, xem thử gradient realtime.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';

const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'fforum-epic4-'));
process.env.FFORUM_DATA_DIR = DATA_DIR;
const { setupForumServer, resetRateLimitersForTest, flushPendingSave } = await import('../server/forumServer.ts');
const shop = await import('../src/utils/shopData.ts');
const { GODRAY_PRESETS } = await import('../src/utils/godrays.ts');
const { GRADIENT_PRESETS, GRADIENT_GROUPS, resolveGodrayId } = await import('../src/utils/gradients.ts');

const read = (rel) => fs.readFileSync(path.resolve(rel), 'utf8');
const DAY = 24 * 60 * 60 * 1000;

test('Epic 4 · Độ hiếm: 4 bậc Thường → Huyền thoại ánh xạ từ tierColor (không đổi dữ liệu đã lưu)', () => {
  assert.deepEqual(shop.RARITY_OF_TIER, { green: 'common', blue: 'rare', red: 'epic', purple: 'legendary' });
  assert.deepEqual(Object.values(shop.RARITY_META).map((meta) => meta.label), ['Thường', 'Hiếm', 'Sử thi', 'Huyền thoại']);
  for (const item of shop.SHOP_ITEMS) assert.ok(shop.RARITY_META[shop.rarityOf(item)], `${item.id} có độ hiếm`);
  const svg = read('src/components/ShopItemSvg.tsx');
  for (const item of shop.SHOP_ITEMS) {
    assert.ok(svg.includes(`case '${item.iconType}':`), `ShopItemSvg phải có icon tự thiết kế cho "${item.iconType}"`);
  }
  assert.equal(new Set(shop.SHOP_ITEMS.map((item) => item.id)).size, shop.SHOP_ITEMS.length, 'id vật phẩm không trùng');
});

test('Epic 4 · Ưu đãi tuần: tất định theo tuần (giờ VN), chỉ Sử thi/Huyền thoại, giảm đúng 20%', () => {
  const monday = Date.parse('2026-10-05T00:00:00+07:00');
  const a = shop.getWeeklyDeal(monday + 1000);
  const b = shop.getWeeklyDeal(monday + 6 * DAY + 23 * 3600 * 1000);
  assert.equal(a.itemId, b.itemId, 'cả tuần cùng một món');
  assert.equal(a.endsAt, Date.parse('2026-10-12T00:00:00+07:00'), 'kết thúc đúng thứ Hai kế tiếp 00:00 giờ VN');
  const next = shop.getWeeklyDeal(monday + 7 * DAY + 1000);
  assert.notEqual(next.itemId, a.itemId, 'tuần sau đổi món');

  const seen = new Set();
  for (let week = 0; week < 30; week += 1) {
    const deal = shop.getWeeklyDeal(monday + week * 7 * DAY + 1000);
    const item = shop.SHOP_ITEMS.find((entry) => entry.id === deal.itemId);
    assert.ok(['epic', 'legendary'].includes(shop.rarityOf(item)), 'không bao giờ giảm giá hạng Thường/Hiếm');
    seen.add(deal.itemId);
    assert.equal(shop.effectivePrice(item, monday + week * 7 * DAY + 1000), Math.round(item.price * 0.8));
  }
  assert.ok(seen.size >= 5, 'vòng quay phủ nhiều món');
  const cheap = shop.SHOP_ITEMS.find((item) => item.id === 'pencil_starter');
  assert.equal(shop.effectivePrice(cheap, monday), cheap.price, 'món không ưu đãi giữ nguyên giá');
});

test('Epic 4 · Nhãn "Mới" dựa vào ngày phát hành thật (addedAt), hết hạn sau 30 ngày', () => {
  const fresh = shop.SHOP_ITEMS.filter((item) => item.addedAt);
  assert.ok(fresh.length >= 2, 'có vật phẩm mới ra mắt');
  const launch = Date.parse(`${fresh[0].addedAt}T00:00:00+07:00`);
  assert.equal(shop.isNewItem(fresh[0], launch + DAY), true);
  assert.equal(shop.isNewItem(fresh[0], launch + 31 * DAY), false, 'quá 30 ngày thì hết "Mới"');
  assert.equal(shop.isNewItem(fresh[0], launch - DAY), false, 'chưa phát hành thì không "Mới"');
  assert.equal(shop.isNewItem({}, launch), false, 'không có ngày phát hành thì không bịa nhãn');
});

test('Epic 4 · Máy chủ tính tiền bằng CÙNG hàm giá ưu đãi (nhãn "Giảm giá" khớp số Coin thật)', async () => {
  const middleware = [];
  const server = http.createServer((req, res) => {
    let index = 0;
    const next = () => {
      if (index < middleware.length) middleware[index++](req, res, next);
      else { res.statusCode = 404; res.end('Not Found'); }
    };
    next();
  });
  setupForumServer(server, { use(fn) { middleware.push(fn); } });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const post = async (route, body, token) => {
    const response = await fetch(`${baseUrl}${route}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(body),
    });
    return { status: response.status, data: await response.json().catch(() => null) };
  };
  try {
    resetRateLimitersForTest();
    const account = await post('/api/auth/register', { name: 'Người Săn Ưu Đãi', email: `deal.${Date.now()}@example.test`, password: 'mat-khau-deal-123' });
    assert.equal(account.status, 200, JSON.stringify(account.data));
    const deal = shop.getWeeklyDeal(Date.now());
    const item = shop.SHOP_ITEMS.find((entry) => entry.id === deal.itemId);
    const price = shop.effectivePrice(item, Date.now());
    assert.notEqual(price, item.price);
    const attempt = await post('/api/shop/purchase', { itemId: item.id, price: 1 }, account.data.token);
    assert.equal(attempt.status, 402, 'tài khoản mới 100 Coin không đủ mua món Sử thi/Huyền thoại');
    assert.match(attempt.data.message, new RegExp(`Bạn cần ${price} Coin`), 'máy chủ báo đúng GIÁ ƯU ĐÃI, không phải giá niêm yết');
  } finally {
    server.close();
    flushPendingSave();
  }
  const serverSource = read('server/forumServer.ts');
  assert.match(serverSource, /const price = effectivePrice\(item, Date\.now\(\)\);/);
  assert.match(serverSource, /item: \{ id: item\.id, name: item\.name, price, listPrice: item\.price \}/);
});

test('Epic 4 · Gacha Boutique: masonry, tooltip kính trượt lên, xem trước, nút Mua nảy, mở hộp, chế độ trưng bày', () => {
  const boutique = read('src/components/shop/GachaBoutique.tsx');
  const css = read('src/components/shop/Boutique.css');
  const profile = read('src/components/ProfileModal.tsx');
  const app = read('src/App.tsx');

  assert.match(css, /\.gb-masonry \{ columns: 3 196px;/, 'layout Masonry so le');
  assert.match(css, /\.gb-card--legendary \.gb-card__stage \{ height: 168px; \}/, 'Huyền thoại cao nhất');
  assert.match(css, /\.gb-card--common \.gb-card__stage \{ height: 92px; \}/, 'Thường gọn nhất');
  assert.match(boutique, /className="gb-card__tip" id=\{tipId\} role="tooltip"/, 'mô tả nằm trong tooltip (zero-clutter)');
  assert.match(css, /\.gb-card:hover \.gb-card__tip,\n\.gb-card:focus-visible \.gb-card__tip \{ opacity: 1; transform: none; filter: none; \}/, 'tooltip trượt lên khi hover/focus');
  assert.match(css, /-webkit-backdrop-filter: blur\(16px\) saturate\(150%\)/, 'tooltip kính mờ');
  /* Nhiemvu_5: hiệu ứng theo bậc */
  assert.match(css, /\.gb-card--epic \.gb-card__shine,\n\.gb-card--legendary \.gb-card__shine \{/, 'Sử thi có shimmer loop');
  assert.match(css, /animation: gbSpin 4\.5s linear infinite;/, 'Huyền thoại có viền gradient xoay');
  assert.match(css, /@property --gb-angle/);
  assert.match(css, /\.gb-card--rare:hover,/, 'Hiếm phát sáng khi hover');
  assert.ok(!/\.gb-card--common:hover \{[^}]*0 0 34px/.test(css), 'Thường không có glow');
  /* Mua + mở hộp */
  assert.match(css, /\.gb-buy:active:not\(:disabled\) \{ transform: translateY\(2px\) scale\(0\.93\);/, 'nút Mua nhấn xuống');
  assert.match(css, /cubic-bezier\(0\.34, 1\.9, 0\.5, 1\)/, 'nảy lên khi thả');
  for (const piece of ['gb-unbox__box', 'gb-unbox__lid', 'gb-unbox__item', 'gb-unbox__rays']) assert.ok(boutique.includes(piece), `mở hộp có ${piece}`);
  assert.match(css, /@keyframes gbShake/);
  assert.match(css, /@keyframes gbLid/);
  assert.match(boutique, /playChime\('level-up'\)/, 'Huyền thoại có âm thanh khi mở khoá');
  assert.match(boutique, /<CelebrationBurst/, 'bắn confetti khi mua');
  assert.match(boutique, /Xem khi đeo/, 'xem trước trước khi mua');
  assert.match(boutique, /aria-modal="true"/);
  assert.match(boutique, /event\.nativeEvent\.stopImmediatePropagation\(\)/, 'Esc chỉ đóng lớp shop trên cùng');
  /* Nhãn thật */
  assert.match(boutique, /isNewItem\(item, now\)/);
  assert.match(boutique, /\.filter\(\(\[, count\]\) => count >= 2\)/, '"Hot" cần ít nhất 2 người sở hữu thật');
  assert.match(boutique, /effectivePrice\(item, now\)/);
  assert.match(app, /const shopOwnership = useMemo/, 'đếm sở hữu từ kho đồ thật');
  /* Tích hợp hồ sơ */
  assert.match(profile, /<GachaBoutique/);
  assert.match(profile, /readOnly=\{!isOwnProfile\}/, 'hồ sơ người khác chỉ trưng bày, không mua hộ');
  assert.match(profile, /<TrophyShelf/);
  assert.ok(!profile.includes('getTierColorStyles'), 'lưới shop cũ đã thay');
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.ok(!fs.existsSync(path.resolve('src/components/MasonryShopGrid.tsx')), 'component masonry chết đã xoá');
});

test('Epic 4 · Kệ huy hiệu: thứ bậc theo độ hiếm + trạng thái trống hoạt hình (Zero-Clutter)', () => {
  const shelf = read('src/components/shop/TrophyShelf.tsx');
  const css = read('src/components/shop/Boutique.css');
  assert.match(shelf, /RARITY_META\[rarityOf\(b\)\]\.order - RARITY_META\[rarityOf\(a\)\]\.order/, 'sắp Huyền thoại trước');
  assert.match(shelf, /const hero = rarity === 'legendary' \|\| rarity === 'epic';/);
  assert.match(css, /\.tsh-tile\.is-hero \{ grid-column: span 2;/, 'Huyền thoại/Sử thi là ô lớn');
  assert.match(shelf, /Rương đang ngủ… Hãy đi học để đánh thức nó!/);
  assert.match(css, /@keyframes tshBreathe/);
  assert.match(css, /@keyframes tshZ/);
});

test('Epic 4 · Clay 2.0 đồng bộ: cùng công thức 3 lớp cho mọi bề mặt hồ sơ, có bản sáng pastel', () => {
  const css = read('src/index.css');
  const clay = read('src/components/ClaymorphismCard.tsx');
  const section = css.slice(css.indexOf('EPIC 4 — CLAY 2.0'));
  assert.ok(section.length > 100, 'có section Clay 2.0');
  assert.match(section, /\.pc-12-card \{\n  border-radius: 28px;/, 'bo góc lớn');
  assert.match(section, /0 22px 40px -20px rgba\(0, 0, 0, 0\.88\),\n    inset 0 -14px 24px -16px rgba\(0, 0, 0, 0\.78\),\n    inset 0 14px 22px -14px rgba\(255, 255, 255, 0\.11\);/,
    'bóng ngoài + bóng tối phía xa + highlight phía sáng');
  assert.match(section, /html\.light \.pc-12-card[^{]*\{\n  background: linear-gradient\(155deg, #fffdf8, #f3f0fb\);/, 'pastel nhất quán ở chế độ sáng');
  assert.match(section, /html\.light \.pc-12-stat[^{]*\{/, 'ô số liệu có bản sáng');
  assert.match(clay, /className=\{`pc-12-stat text-center/, 'ClayStat dùng class clay chung');
  assert.match(clay, /className=\{`pc-12-card relative overflow-hidden/, 'ClaymorphismCard dùng class clay chung');
  assert.ok(!clay.includes("boxShadow: `"), 'không còn inline shadow lệch tông');
});

test('Gradient Settings: 12 mã màu chuẩn, không hover thay nền toàn trang', () => {
  const settings = read('src/components/SettingsModal.tsx');
  const app = read('src/App.tsx');
  const picker = read('src/components/GradientSwatchPicker.tsx');
  assert.equal(GRADIENT_PRESETS.length, 12);
  assert.deepEqual(GRADIENT_PRESETS.map(p => p.id), Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')));
  assert.deepEqual(GRADIENT_GROUPS.map(g => g.id), ['analogous', 'complementary', 'monochrome', 'neutral']);
  assert.equal(GODRAY_PRESETS.length, 11, 'metal black only offered inside Potator');
  for (const preset of GODRAY_PRESETS) {
    assert.equal(preset.gradient, GRADIENT_PRESETS.find(g => g.id === preset.id).css);
  }
  assert.equal(resolveGodrayId('godray-gold'), '06', 'saved choices migrate');
  assert.match(settings, /<GradientSwatchPicker/);
  assert.match(picker, /onMouseEnter=\{\(\) => setHoverId\(g\.id\)\}/);
  assert.doesNotMatch(app, /fforum_godray_preview/, 'hover must not repaint the entire page');
  assert.match(app, /<GradientSurface[\s\S]*?gradient=\{activeGodray\.gradient\}/);
});

test('Phần 1 · Modal Đặt Câu Hỏi: 3 Card Sections, MathSymbolsBar thu gọn mặc định (nút ≥ 48px), Sticky Header/Footer', () => {
  const qa = read('src/components/views/QAForumView.tsx');
  const css = read('src/index.css');
  assert.match(css, /\.ask2027-card-section \{/, 'có CSS cho 3 Card Sections');
  assert.match(qa, /01 · THÔNG TIN CƠ BẢN/);
  assert.match(qa, /02 · NỘI DUNG CHI TIẾT/);
  assert.match(qa, /03 · CÔNG CỤ HỖ TRỢ/);
  assert.match(qa, /defaultExpanded=\{false\}/, 'MathSymbolsBar thu gọn mặc định');
  assert.match(qa, /min-w-\[48px\] min-h-\[48px\]/, 'nút ký hiệu toán học đạt kích thước 48px+');
});

test('Phần 2 & Phần 5 · Chống đăng xuất đột ngột: không dựng phiên ảo, có Silent Refresh /api/auth/refresh & Auto-save nháp lời giải', () => {
  const store = read('src/store/forumStore.ts');
  const session = read('src/utils/session.ts');
  const server = read('server/forumServer.ts');
  const qa = read('src/components/views/QAForumView.tsx');
  assert.match(store, /if \(!savedEmail \|\| !hasStoredSession\(\)\) return null;/, 'không dựng phiên ảo khi thiếu token/cookie');
  assert.match(session, /export const refreshSessionSilent = async/, 'có hàm Silent Token Refresh');
  assert.match(server, /\/api\/auth\/refresh/, 'server hỗ trợ endpoint POST /api/auth/refresh');
  assert.match(qa, /fforum_draft_solution_\$\{selectedQuestion\.id\}/, 'tự động lưu nháp lời giải theo câu hỏi');
});

test('Phần 3 & Phần 4 · Boutique Gacha (Pity 50/100, Mythic ≤ 5%), Giảm giá xoay vòng 6h (10%–90%) & Color Theory Tokens', () => {
  const T0 = Date.UTC(2026, 9, 11, 0, 0, 0);
  const snap1 = shop.getDynamicDiscounts(T0);
  const snap2 = shop.getDynamicDiscounts(T0 + 6 * 3600 * 1000);
  assert.equal(snap1.list.length, 9, '25.7% (9/35) vật phẩm giảm giá mỗi khung 6h');
  assert.notDeepEqual(snap1.list.map(d => d.itemId), snap2.list.map(d => d.itemId), 'xoay vòng sau 6 giờ');
  for (const entry of snap1.list) {
    assert.ok(entry.percent >= 10 && entry.percent <= 90, 'mức giảm giá trong khoảng 10%–90%');
    assert.equal(entry.isSuperSale, entry.percent >= 81, '81%–90% gắn cờ SIÊU SALE');
  }

  for (const pool of Object.values(shop.GACHA_POOLS)) {
    assert.ok(pool.rates.legendary <= 5, `${pool.id}: tỷ lệ Mythic không bao giờ vượt quá 5%`);
    assert.equal(pool.rates.common + pool.rates.rare + pool.rates.epic + pool.rates.legendary, 100);
  }

  /* Kiểm chứng bảo hiểm Pity 50 (chắc chắn Epic+) và Pity 100 (chắc chắn Mythic) */
  const pull50 = shop.rollGachaPull('standard', { epicPity: 49, mythicPity: 49, totalPulls: 49 }, 0.99, 0.5);
  assert.ok(pull50.rarity === 'epic' || pull50.rarity === 'legendary', 'Pity 50 đảm bảo từ Epic trở lên');
  assert.equal(pull50.nextPity.epicPity, 0);

  const pull100 = shop.rollGachaPull('standard', { epicPity: 10, mythicPity: 99, totalPulls: 99 }, 0.99, 0.5);
  assert.equal(pull100.rarity, 'legendary', 'Pity 100 đảm bảo ra Mythic (legendary)');
  assert.equal(pull100.pityTriggered, 'mythic_100');
  assert.equal(pull100.nextPity.mythicPity, 0);

  const css = read('src/index.css');
  assert.match(css, /--ff-ct-primary: #5B8DEF;/);
  assert.match(css, /--ff-ct-rarity-mythic: linear-gradient\(135deg, #F59E0B 0%, #EC4899 50%, #8B5CF6 100%\);/);
});

test('Discord-Style Boutique Visual System: 4-col grid, 51px icon, rarity-dot, ≤50 char desc, live CSS frame/aura & Profile combo showcase', () => {
  const boutiqueCss = read('src/components/shop/Boutique.css');
  const boutiqueTsx = read('src/components/shop/GachaBoutique.tsx');
  const profileTsx = read('src/components/ProfileModal.tsx');

  /* 1. Icon 51x51px (-20%), 4-column grid, 14px card padding */
  assert.match(boutiqueCss, /\.shop-item-icon\s*\{[\s\S]*?width:\s*51px;\s*height:\s*51px;\s*border-radius:\s*12px;/);
  assert.match(boutiqueCss, /\.shop-grid\s*\{[\s\S]*?grid-template-columns:\s*repeat\(4,\s*1fr\);[\s\S]*?gap:\s*12px;/);
  assert.match(boutiqueCss, /\.shop-card\s*\{[\s\S]*?padding:\s*14px;/);

  /* 2. Rarity dot + corner category tooltip */
  assert.match(boutiqueCss, /\.rarity-dot\s*\{[\s\S]*?width:\s*6px;\s*height:\s*6px;\s*border-radius:\s*50%;/);
  assert.match(boutiqueCss, /\.rarity-dot\.mythic\s*\{[\s\S]*?box-shadow:\s*0 0 6px currentColor;/);
  assert.match(boutiqueTsx, /gb-card__cat-corner/);

  /* 3. Concise 1-line descriptions ≤ 50 chars */
  for (const item of shop.SHOP_ITEMS) {
    assert.ok(item.description.length <= 50, `${item.id} description <= 50 chars (${item.description.length})`);
  }

  /* 4 & 5. Real CSS Frame + Aura + Orbiting Mythic Particles & Live Avatar Preview */
  for (const cls of ['.frame-common', '.frame-rare', '.frame-epic', '.frame-mythic', '.mythic-particle']) {
    assert.ok(boutiqueCss.includes(cls), `Boutique.css defines ${cls}`);
  }
  for (const kf of ['@keyframes rotate-border', '@keyframes pulse-aura', '@keyframes hue-cycle', '@keyframes orbit']) {
    assert.ok(boutiqueCss.includes(kf), `Boutique.css defines ${kf}`);
  }
  assert.match(boutiqueTsx, /gb-discord-preview/);
  assert.match(boutiqueTsx, /Trang bị ngay/);

  /* 6. Profile Showcase combo display (Frame + Aura + Theme + Mythic title) */
  const combo = shop.resolveEquippedCombo(
    ['crown_celestial', 'effect_moon', 'talisman_focus', 'profile_archive'],
    'crown_celestial',
    'test-combo-user',
  );
  assert.equal(combo.frame?.id, 'crown_celestial');
  assert.equal(combo.aura?.id, 'effect_moon');
  assert.equal(combo.theme?.id, 'talisman_focus');
  assert.equal(combo.corner?.id, 'profile_archive');
  assert.equal(combo.highestRarity, 'legendary');
  assert.equal(combo.mythicTitle, 'Thần Thoại Tri Thức');
  assert.match(profileTsx, /(?:🎨\s*)?Đang trang bị:/);
  assert.match(profileTsx, /openShopAtCategory/);
});


