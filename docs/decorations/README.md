# Nhiệm vụ 10 — Hệ thống trang trí Discord import (Boutique)

Thay thế bộ cosmetic SVG vẽ tay bằng **873 asset Discord import thật**:
569 avatar frame · 68 avatar aura · 236 nameplate (khung động WebM VP9-alpha + ảnh tĩnh fallback).

| Tài liệu | Nội dung |
|---|---|
| `ASSET_AUDIT.md` / `asset-audit.json` | Bước 1.1 — audit 637 PNG + 236 WebM gốc (kích thước, FPS, dung lượng, file hỏng) |
| `TEST_REPORT.md` | Bước 6 — checklist test, kết quả, screenshot, rollback |
| `screenshots/*.png` | Minh chứng hình ảnh (composite pixel thật từ chính asset) |
| `scripts/decorations/pipeline.mjs` | Bước 1.2/1.3 — audit → slug → optimize → catalog |
| `scripts/decorations/migrate-decorations.mjs` | Bước 2.3 — migration A/B (**chưa chạy**, chờ user chọn) |
| `scripts/decorations/make-demo-screenshots.mjs` | Tạo lại `screenshots/*.png` từ catalog |

## 1. Cấu trúc asset (spec Bước 1)

```
public/assets/decorations/
├── decorations-catalog.json      # metadata 873 item (rarity, price, tags, assetPath…)
├── avatar-frames/{slug}/
│   ├── preview.png / preview.webp    # ~128px, < 100KB
│   ├── full.png / full.webp          # ảnh đầy đủ (WebP chính, PNG palette fallback)
│   └── animated.webm                 # VP9 + alpha 240px (chỉ item động)
└── nameplates/{slug}/
    ├── preview.png / preview.webp
    ├── static.png                    # ảnh tĩnh (nếu nguồn tĩnh)
    └── animated.webm                 # VP9 + alpha (nguồn WebM Discord)
```

Tổng 3.878 file, ~122 MB. Slug kebab-case không dấu (`black-mana`, `airona-fireworks`).
Rarity: item tĩnh → `common`; item động theo điểm số (độ phong phú frame + độ phủ alpha) → top 10% `mythic`, 25% `epic`, 35% `rare`.
Giá Coin quy từ giá VND tham khảo (×4100 / 79000 Coin/VND, làm tròn 50):
Common 2.000 / Rare 3.050 / Epic 4.100 / Mythic 6.200 (frame·aura); nameplate giảm ~30%.

## 2. Schema (spec Bước 2)

`ShopItem` (src/types/index.ts) bổ sung:

| Trường | Giá trị |
|---|---|
| `assetType` | `svg_custom` (item cũ) · `image_static` · `image_animated` |
| `previewUrl` / `fullAssetUrl` / `animatedAssetUrl` | path `/assets/decorations/…` (nullable) |
| `originalSource` | `fforum_svg` · `discord_import` |
| `rarity`, `price`, `category` | giữ nguyên hệ cũ; category: `Avatar Frame` / `Avatar Aura` / `Nameplate` |

Không thêm bảng DB mới: `server/decorationRegistry.ts` đọc catalog từ disk (cache theo mtime),
ghép chung 35 item SVG cũ + 873 item mới thành 1 registry.

### Migration (spec Bước 2.3) — **CHƯA CHẠY, ĐỢI USER CHỌN**

- 35 item SVG cũ **vẫn bán bình thường** cho đến khi migration chạy (test security 9e yêu cầu).
- Script: `node scripts/decorations/migrate-decorations.mjs` — mặc định **DRY-RUN** (chỉ báo cáo
  inventory đang giữ item cũ, tổng Coin hoàn, danh sách item đổi).
- Apply (khi user đã chọn): `… --apply --plan=A --confirm` (hoàn 100% Coin theo giá catalog)
  hoặc `… --apply --plan=B --confirm` (đổi 1 item Discord cùng độ hiếm, chọn tất định theo hash).
- Apply sẽ: backup `forum-data.json` → đổi inventory/coin → gỡ `equippedBadge` cũ →
  ghi thông báo in-app (`userNotices`, id `server-migration-…`) → ghi marker
  `public/assets/decorations/decorations-migration.json` (server đọc marker để soft-delete item cũ)
  + `store.migrations['decoration-replacement']` (idempotent, chạy trùng không làm gì).
- **Không tự động chạy ở bất kỳ bước nào** — cần `--apply --plan=… --confirm` do người vận hành thực hiện.

## 3. Component (spec Bước 3)

`src/components/decorations/`:

| File | Vai trò |
|---|---|
| `useDecorationMedia.ts` | `useReducedMotion` (prefers-reduced-motion), `useInViewOnce` (IntersectionObserver, rootMargin 120px) |
| `DecorationMedia.tsx` | WebM (blob URL từ cache RAM) khi được phép, ngược lại ảnh tĩnh; `onError` của video → fallback tĩnh |
| `AvatarWithDecoration.tsx` | avatar + `frameAsset` (trên ảnh, z3, box 112%) + `auraAsset` (sau ảnh, z1, box 118%) + nameplate; `overflow: visible` để cánh/tia không bị cắt |
| `NameplateDisplay.tsx` | bảng tên nằm SAU tên user; contrast bằng text-shadow |
| `DecoratedAvatar.tsx` | tiện ích resolve user → asset (dùng ở comment/solution/leaderboard/navbar) |

`src/utils/decorationStore.ts`: cache blob URL theo URL asset (RAM, `revokeObjectURL` khi unmount),
`preloadDecorations(urls)` (navbar preload trước), `supportsWebmAlpha()` (Safari/iOS → luôn ảnh tĩnh),
`useUserDecorations(user)` → `{ frame, aura, nameplate, … }` đã ghép từ `equippedDecorations` + catalog.

Luật phát video: `isAnimated && animatedAssetUrl && animate && !reducedMotion && supportsWebmAlpha() && inView`.
`animate={false}` ở comment/leaderboard (spec: animation được phép tắt); navbar/profile `eager`.

## 4. Boutique (spec Bước 4)

`src/components/shop/GachaBoutique.tsx` (rewrite) + `Boutique.css` (section `Nv10`):

- Card preview **ảnh thật 128px**; **hover → phát WebM** (IntersectionObserver + cache blob).
- Dark theme; màu rarity: Common xám · Rare xanh · Epic tím · Mythic vàng (giữ class CSS cũ
  `.frame-common/rare/epic/mythic` + `.mythic-particle` cho showcase hồ sơ).
- Filter: **Avatar Frame | Avatar Aura | Nameplate** · rarity · **Có animation | Tĩnh** · tìm kiếm ·
  sort · **pagination vô hạn 24 item/niềm** (sentinel; đổi filter → reset ở event handler).
- Modal xem trước: avatar THẬT của user 200px + trang trí + nút **“Trang bị ngay”** (try-on).
- Gacha 100 Coin/lượt, pity 50/100, mythic ≤ 5% (chạy trên pool decoration, map mythic→legendary).
- `readOnly` khi xem hồ sơ người khác (chỉ chủ hồ sơ mua/đeo được).

## 5. Hồ sơ & đồng bộ (spec Bước 5)

| Vị trí | Kích thước | Animation |
|---|---|---|
| ProfileModal (header) | 150px | bật |
| Author popover (QA) | 40px | tắt |
| Comment / lời giải (QA) | 32px | tắt (nặc danh → avatar thường) |
| Leaderboard podium / ladder / rows | 58/46 · 40/36 · 30 (me 32) | tắt |
| Navbar (desktop / mobile) | 28/24 | bật (eager + preload) |
| ProfileDropdown | 44px (tròn khi có frame/aura) | bật |

ProfileModal: nameplate dưới tên (header), 3 chip khung/hào quang/bảng tên + nút gỡ,
nút **“Thay đổi trang trí”** (mở Boutique tab đúng category), chip legacy Theme/Góc-hồ-sơ giữ nguyên.

Equip: `POST /api/shop/equip { itemId, slot }` — server xác nhận item thuộc slot đúng trong registry
(lẫn lộn slot → 400); `equippedDecorations` do server giữ (authGuard sanitize),
`equippedBadge` (hệ cũ) không bị đụng.

## 6. Thêm asset mới sau này (modular)

1. Nạp zip vào `cosmetics/avatar_border/` (frame) hoặc `cosmetics/nameplate.zip` (nameplate) —
   đặt tên file tiếng Anh/Việt không quan trọng (pipeline tự slug + đặt tên tiếng Việt).
2. `node scripts/decorations/pipeline.mjs` (chạy lại an toàn: giữ trường user đã sửa trong catalog,
   `--reset` để gán rarity/giá lại).
3. Chạy `node scripts/decorations/make-demo-screenshots.mjs` (tùy chọn) + `npm test`.

Không cần sửa component/registry: mọi thứ đọc từ catalog; registry cache theo mtime
(server khởi động lại hoặc catalog đổi là tự nhận).

## 7. Lưu ý kỹ thuật

- **VP9 alpha**: encoder ghi đúng alpha plane (đã verify bằng bitrate test — alpha checkerboard
  tăng ~1,6× kích thước stream so với không-alpha). Sandbox này KHÔNG decode được VP9 alpha
  (2 build ffmpeg đều trả yuv420p) → mọi công cụ kiểm tra trong sandbox phải dùng ảnh tĩnh
  `full.webp` (alpha chuẩn) để composite; trình duyệt thật (Chrome/Firefox) render WebM alpha bình thường.
- **Safari/iOS**: không hỗ trợ VP9 → `supportsWebmAlpha()` false → luôn dùng ảnh tĩnh.
- **Gacha**: UI chặn khi `coin < pool.cost` (100) nhưng máy chủ trừ đúng giá item quay ra
  (thấp hơn nếu item rẻ) — ghi rõ ở TEST_REPORT.
- **Bản quyền**: asset import từ Discord thuộc về creator gốc — xem mục rủi ro trong TEST_REPORT.
