/* Bản quyền trí tuệ thuộc về BroAmStuck */
/*
 * Định giá (Bước 1.3) — tỉ lệ mẫu trong Nhiemvu_10: 79.000đ → 4.100 Coin
 * (≈ 0,0519 Coin/đồng, làm tròn đến bội số 50). Giá theo độ hiếm, riêng bảng tên
 * thấp hơn khung một chút (diện tích hiển thị nhỏ hơn).
 */

export const REFERENCE_VND = {
  avatar_frame: { common: 38000, rare: 58000, epic: 79000, mythic: 119000 },
  avatar_aura: { common: 38000, rare: 58000, epic: 79000, mythic: 119000 },
  nameplate: { common: 29000, rare: 45000, epic: 58000, mythic: 88000 },
};

export const COIN_PER_VND = 4100 / 79000;

export const vndToCoin = (vnd) => Math.ceil((vnd * COIN_PER_VND) / 50) * 50;

export const priceFor = (type, rarity) => {
  const table = REFERENCE_VND[type] || REFERENCE_VND.avatar_frame;
  const vnd = table[rarity] || table.common;
  return { price: vndToCoin(vnd), originalPriceNote: `${vnd.toLocaleString('vi-VN')}đ (tỉ lệ mẫu trong Nhiemvu_10: 79.000đ → 4.100 Coin)` };
};

/*
 * Xếp độ hiếm theo điểm phân vị (không dùng ngưỡng tuyệt đối → không phụ thuộc
 * một file ngoại lệ kéo lệch cả dàn):
 *  - Ảnh tĩnh  → common (không có gì để xếp động).
 *  - Khung/hào quang: 0.45·dung lượng gốc + 0.30·độ phủ alpha + 0.25·số frame.
 *  - Bảng tên:  0.50·bitrate (B/giây) + 0.30·thời lượng + 0.20·độ phân giải.
 *  Cắt: top 10% mythic · 25% kế tiếp epic · 35% kế tiếp rare · còn lại common.
 */
function percentileRank(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return (value) => {
    let lo = 0;
    let hi = sorted.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (sorted[mid] <= value) lo = mid + 1;
      else hi = mid;
    }
    return lo / Math.max(1, sorted.length);
  };
}

function assignCutoffs(scores) {
  const sorted = [...scores].sort((a, b) => b - a);
  const n = sorted.length;
  const mythicAt = sorted[Math.max(0, Math.floor(n * 0.10) - 1)] ?? 0;
  const epicAt = sorted[Math.max(0, Math.floor(n * 0.35) - 1)] ?? 0;
  const rareAt = sorted[Math.max(0, Math.floor(n * 0.70) - 1)] ?? 0;
  return (score) => (score >= mythicAt ? 'mythic' : score >= epicAt ? 'epic' : score >= rareAt ? 'rare' : 'common');
}

function scoreRecords(records, weights, metric) {
  const rankers = {};
  for (const [key] of Object.keys(weights)) {
    rankers[key] = percentileRank(records.map((r) => metric(r, key)));
  }
  for (const record of records) {
    let score = 0;
    for (const [key, weight] of Object.entries(weights)) {
      const value = metric(record, key);
      if (!Number.isFinite(value)) continue;
      score += weight * rankers[key](value);
    }
    record.rarityScore = Math.round(score * 1000) / 1000;
  }
}

export function assignRarities(records, weights) {
  const metric = (record, key) => (record.metrics || {})[key];
  const dynamic = records.filter((r) => r.isAnimated);
  if (dynamic.length) {
    scoreRecords(dynamic, weights, metric);
    const cutoff = assignCutoffs(dynamic.map((r) => r.rarityScore));
    for (const record of dynamic) record.rarity = cutoff(record.rarityScore);
  }
  for (const record of records) if (!record.isAnimated) record.rarity = 'common';
}
