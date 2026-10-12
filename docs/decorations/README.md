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

### Chất lượng & phân hạng (rarity) — quy tắc hiện hành

Rarity được `scripts/decorations/score-quality.mjs` chấm **từ chất lượng thực của asset**
(chạy lại sau mọi đợt thêm asset; idempotent, ~40s):

- **Điểm chất lượng 0–100** (percentile trong nhóm frame·aura / nameplate) từ các chỉ số đo:
  - *Frame*: độ phủ vòng viền ngoài 30% · tâm trống (tỷ lệ alpha trung tâm — bắt buộc) 20% ·
    độ nét (Laplacian) 15% · độ bão hoà màu 15% · độ chuyển động 20%.
  - *Aura*: vòng sáng 30% · motion 25% · màu 25% · nét 10% · tương phản 10% (tâm không tính —
    nằm sau avatar).
  - *Nameplate*: nét 35% · màu 30% · motion 25% · tương phản 10%.
- **Cắt hạng trong nhóm ANIMATED**: top 10% → `mythic`, tiếp 25% → `epic`, 35% → `rare`,
  còn lại `common`.
- **Item tĩnh → luôn `common`.**
- **"Animation đứng hình"**: webm mà mọi frame giống nhau (max frame-diff < 0.5/255 trên
  14 frame 64px) → chuyển về **static** (`isAnimated:false`, bỏ webm, tag `static-content`) —
  Safari chạy được, payload nhẹ, filter "Có animation" trung thực.
- **Lỗi cấu trúc**: frame có tâm đặc (alpha trung bình tâm > 190) → `isActive:false`
  + tags `low-quality`/`opaque-center` (ngừng bán, chờ asset thay thế).
- Giá Coin theo đúng bảng `pricing.coins[type][rarity]` — common→mythic tăng đều:
  frame·aura 2.000 / 3.050 / 4.100 / 6.200 · nameplate 1.550 / 2.350 / 3.050 / 4.600.

Kết quả đợt 2026-10-12: **common 336 · rare 268 · epic 192 · mythic 77** ·
768 item động / 105 tĩnh (89 "animation đứng hình" đã chuyển tĩnh) · 0 lỗi cấu trúc.

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

### Migration (spec Bước 2.3) — **ĐÃ CHỌN PHƯƠNG ÁN B** (chạy khi triển khai)

Sếp chốt 2026-10-12: chọn **phương án B — đổi item mới** (tạo điểm nhấn trực quan:
avatar tự có trang trí mới ngay, thay vì chỉ nhận Coin) + màn hình ăn mừng.

- 35 item SVG cũ **vẫn bán bình thường** cho đến khi migration chạy ở môi trường đó
  (test security 9e yêu cầu; test hermetic qua env `FFORUM_MIGRATION_MARKER`).
- Script: `node scripts/decorations/migrate-decorations.mjs` — mặc định **DRY-RUN**
  (báo cáo: ai giữ item gì, sẽ đổi thành item nào, badge sẽ gỡ).
- **Apply (tắt server trước khi chạy):**
  `node scripts/decorations/migrate-decorations.mjs --apply --plan=B --confirm`
  (phương án A hoàn 100% Coin vẫn còn trong script nếu cần).
- Phương án B làm gì cho mỗi user giữ item cũ:
  1. Gỡ item SVG cũ khỏi inventory, tặng **1 item Discord cùng bậc hiếm**
     (`legendary`→`mythic`), **khớp loại** với hạng mục item cũ (khung → frame/aura,
     hiệu ứng → aura, góc hồ sơ → nameplate…), **ưu tiên item ĐỘNG + chất lượng cao**,
     chọn tất định theo `hash(email+id)` (chạy lại cho cùng kết quả).
  2. **Tự động trang bị** gift vào slot CÒN TRỐNG (`equippedDecorations`) — không ghi
     đè item mới user đã đeo → avatar mới ngay khi mở app.
  3. Gỡ `equippedBadge` cũ.
- **Điểm nhấn cho user — màn hình ăn mừng**: thông báo in-app `server-migration-…`
  (toàn hệ thống + cá nhân) kèm `payload` (gifts/showcase có preview thật) → client mở
  `MigrationCelebrationModal`: confetti (CelebrationBurst), card item được tặng kèm huy
  hiệu "ĐÃ TRANG BỊ", CTA "Khám phá Boutique". Hiện 1 lần (notices đánh dấu đọc khi lấy).
- Apply sẽ: backup `forum-data.json` → đổi data → ghi atomic → thông báo ăn mừng →
  marker `public/assets/decorations/decorations-migration.json` (server đọc để
  soft-delete item cũ) + `store.migrations['decoration-replacement']` (idempotent).
- **Marker là artifact triển khai — KHÔNG commit** (đã gitignore). Mỗi môi trường
  (dev/prod) chạy migration trên data của chính nó. Sandbox đã demo end-to-end:
  2 user demo giữ 5 item cũ → nhận 5 gift (2 mythic), tự trang bị, 3 notices payload.

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
  sort · **pagination vô hạn 24 item/mặt** (sentinel; đổi filter → reset ở event handler).
- Modal xem trước: avatar THẬT của user 200px + trang trí + nút **“Trang bị ngay”** (try-on).
- **Đại cập nhật — Boutique "Sống động"**: **DEAL HÔM NAY** (item sale chất lượng cao, xoay
  theo ngày VN — `getDailyDeal`, giá = `effectivePrice` khớp server) · **BỘ SƯU TẬP CỦA BẠN**
  (tiến độ X/873 + thanh theo rarity + vinh danh 6 mythic — `getCollectionStats`) · ruy-băng
  **SỰ KIỆN KHAI TRƯƠNG 72H** đếm ngược (hiện khi migration đã chạy) · confetti khi trang bị.
  Xem chi tiết: TEST_REPORT §1.2–1.3.
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
3. `node scripts/decorations/score-quality.mjs` — chấm chất lượng, phân hạng, gán giá
   (idempotent; `--limit=30` để chạy nhanh khi dev).
4. Chạy `node scripts/decorations/make-demo-screenshots.mjs` (tùy chọn) + `npm test`.

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
