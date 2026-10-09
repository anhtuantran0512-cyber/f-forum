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
const { GODRAY_PRESETS, GODRAY_MOODS } = await import('../src/utils/godrays.ts');

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
  assert.match(section, /html\.light \.pc-12-card \{\n  background: linear-gradient\(155deg, #fffdf8, #f3f0fb\);/, 'pastel nhất quán ở chế độ sáng');
  assert.match(section, /html\.light \.pc-12-stat \{/, 'ô số liệu có bản sáng');
  assert.match(clay, /className=\{`pc-12-stat text-center/, 'ClayStat dùng class clay chung');
  assert.match(clay, /className=\{`pc-12-card relative overflow-hidden/, 'ClaymorphismCard dùng class clay chung');
  assert.ok(!clay.includes("boxShadow: `"), 'không còn inline shadow lệch tông');
});

test('Epic 4 · Preset gradient Settings: hài hoà nhiều chùm tia, nhóm cảm xúc, xem thử realtime', () => {
  const settings = read('src/components/SettingsModal.tsx');
  const app = read('src/App.tsx');
  const ids = ['godray-gold', 'godray-aurora', 'godray-cosmic', 'godray-cyber', 'godray-sunset', 'godray-crystal', 'godray-ocean', 'godray-emerald',
    'godray-ember', 'godray-peach', 'godray-neon', 'godray-mint', 'godray-midnight', 'godray-solar', 'godray-twilight', 'godray-ruby'];
  assert.deepEqual(GODRAY_PRESETS.map((preset) => preset.id).sort(), [...ids].sort(), 'giữ nguyên id → lựa chọn đã lưu không mất');
  assert.deepEqual(GODRAY_MOODS.map((mood) => mood.id), ['warm', 'cool', 'mystic']);
  for (const preset of GODRAY_PRESETS) {
    assert.equal((preset.gradient.match(/radial-gradient\(/g) || []).length, 3, `${preset.id}: 3 chùm tia chồng lớp`);
    assert.ok(GODRAY_MOODS.some((mood) => mood.id === preset.mood), `${preset.id} có nhóm cảm xúc`);
  }
  assert.match(settings, /new CustomEvent\('fforum_godray_preview', \{ detail: \{ id \} \}\)/);
  assert.match(settings, /onMouseEnter=\{\(\) => previewGodray\(p\.id\)\}/, 'hover xem thử');
  assert.match(settings, /onFocus=\{\(\) => previewGodray\(p\.id\)\}/, 'bàn phím cũng xem thử được');
  assert.match(settings, /style=\{\{ background: `\$\{p\.gradient\}, linear-gradient/, 'ô màu vẽ đúng gradient thật');
  assert.match(app, /window\.addEventListener\('fforum_godray_preview', handlePreview\)/);
  assert.match(app, /GODRAY_PRESETS\.find\(p => p\.id === \(previewGodrayId \|\| godrayPreset\)\)/, 'nền trang đổi theo bản xem thử');
});
