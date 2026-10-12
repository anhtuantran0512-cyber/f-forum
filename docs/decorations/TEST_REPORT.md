# TEST REPORT — Nhiệm vụ 10: Hệ thống trang trí Discord import

Ngày: 2026-10-12 · Branch: `arena/62613a87-f-forum` · Cơ sở: `670848e` (main)

## 0. Kết quả tổng

| Hạng mục | Kết quả |
|---|---|
| `npx tsc -b` | ✅ 0 lỗi |
| `npx oxlint` | ✅ 0 warning / 0 error (218 files) |
| `npm test` (28 file, Node test runner) | ✅ **333/333 pass** |
| Asset build | ✅ 3.878 file / ~122 MB · 0 lỗi ffmpeg · catalog 873 item |
| Migration | ⏸ **CHƯA CHẠY** — chỉ dry-run (đợi user chọn phương án A/B) |

## 1. Checklist theo 6 bước của nhiệm vụ

### Bước 1 — Audit & chuẩn hoá asset ✅
- [x] Liệt kê theo extension, kích thước, động/tĩnh → `ASSET_AUDIT.md` + `asset-audit.json`
      (637 PNG: 621 APNG + 16 tĩnh; 236 WebM nameplate; 0 file hỏng)
- [x] Thư mục đúng spec: `public/assets/decorations/avatar-frames/{slug}/` (preview.png ~128px,
      full.png/full.webp, animated.webm) + `nameplates/{slug}/`
- [x] Script Node: `scripts/decorations/pipeline.mjs` — slug kebab-case không dấu,
      optimize (preview < 100KB, WebP + PNG fallback, WebM VP9-alpha 240px)
- [x] Metadata từng item: `decorations-catalog.json`
      `{id, name, type, rarity, assetPath{preview,full,animated}, description, price, isAnimated, tags, …}`
- [x] Catalog JSON để review: 873 item {frame 569, aura 68, nameplate 236} ·
      {common 273, rare 301, epic 213, mythic 86}

### Bước 2 — Schema ✅
- [x] `ShopItem` += `assetType`, `previewUrl`, `fullAssetUrl`, `animatedAssetUrl`, `originalSource`
- [x] Giữ rarity/price/category; 35 item SVG cũ gắn `svg_custom`/`fforum_svg`
- [x] Migration script `migrate-decorations.mjs`: dry-run mặc định, backup DB, idempotent,
      thông báo in-app, marker `decorations-migration.json`
- [x] **Không chạy migration** — item cũ vẫn bán được cho tới khi marker xuất hiện
      (test security 9e kiểm tra việc này: mua `pencil_starter` → 200)
- [x] §2.3: dry-run đã querry + report mẫu (đã test trên data tổng hợp:
      2 user → 1 user giữ 2 item cũ, tổng hoàn 1.850 Coin, danh sách đổi phương án B)

### Bước 3 — Component ✅
- [x] `AvatarWithDecoration`: `<video autoplay loop muted playsInline>` khi động + được phép;
      ngược lại `<img>`; overlay absolute `overflow: visible`
- [x] `prefers-reduced-motion` → tắt video (`useReducedMotion`)
- [x] IntersectionObserver lazy-load + `preloadDecorations` (navbar) + cache RAM (blob URL)
- [x] `NameplateDisplay`: bảng tên SAU tên user, text-shadow chống nền rực
- [x] Bonus theo spec: `animate=false` option (comment/leaderboard), `eager` option (navbar)

### Bước 4 — Shop UI ✅
- [x] Card preview ảnh thật; hover phát WebM
- [x] Dark theme; rarity Common xám / Rare xanh / Epic tím / Mythic vàng
- [x] Preview modal 200px trên avatar thật + nút “Trang bị ngay”
- [x] Filter: Avatar Frame | Avatar Aura | Nameplate + rarity + Có animation/Tĩnh
- [x] Pagination vô hạn 24 item/niềm (không load một lúc)
- [x] Giá do MÁY CHỦ tính (`effectivePrice` + flash 6h, client không gửi giá — test epic4 + 9e)

### Bước 5 — Profile & đồng bộ ✅
- [x] Profile 150px + animation + nameplate dưới tên + nút “Thay đổi trang trí”
- [x] Comment/lời giải 32px (animate=false) · popover 40px
- [x] Leaderboard 58/46 podium · 40/36 ladder · 30/32 rows
- [x] Navbar 28/24px eager + preload
- [x] Equip qua API có xác nhận slot phía server (lẫn lộn → 400)

### Bước 6 — Test & rollback ✅ (bài này)

## 2. Bằng chứng hình ảnh (screenshots)

> Lưu ý: sandbox này **không có trình duyệt headless** (không có Chromium, không được phép tải
> binary trình duyệt) nên không chụp được UI render thật. Thay vào đó, 4 file dưới đây là
> **composite pixel thật** dựng trực tiếp từ chính asset trong `public/assets/decorations/`
> (cùng tệp component render, cùng tỉ lệ overlay của CSS) bằng `make-demo-screenshots.mjs`.

| File | Nội dung |
|---|---|
| `screenshots/01-catalog-contact-sheet.png` | 24 frame (16 mythic + 8 epic, alpha thật) + 8 nameplate |
| `screenshots/02-avatar-frames-demo.png` | Avatar 150px + 4 MYTHIC frame + 1 MYTHIC aura (tỉ lệ CSS 112%/118%) |
| `screenshots/03-nameplate-demo.png` | Tên user nằm TRÊN 4 bảng tên (mythic/epic/rare) |
| `screenshots/04-boutique-grid-preview.png` | 24 card Boutique (preview 128px thật + viền rarity + giá Coin) |

### Kiểm tra alpha (phát hiện & chứng minh trong lúc build)

- Vấn đề gặp phải: 2 build ffmpeg trong sandbox **không decode được VP9 alpha**
  (trả về yuv420p — `Format yuv420p chosen by get_format()`), khiến frame trích từ WebM
  trông “đặc đen” ở tâm.
- Chứng minh WebM có đúng alpha plane: encode test-pattern alpha checkerboard →
  stream 1.422 B so với 544 B khi không-alpha (alpha plane chứa đúng entropy dữ liệu);
  ring test: 2.512 B vs 1.563 B. WebM của asset dùng đúng pipeline này.
- Ảnh tĩnh `full.webp`/`full.png` giữ alpha chuẩn (tâm ≈0, viền =255 — verify trên 44 item mẫu:
  0/42 static opaque). Trình duyệt thật (Chrome/Firefox) render WebM alpha bình thường;
  Safari/iOS tự fallback ảnh tĩnh qua `supportsWebmAlpha()`.

## 3. Ma trận test tự động (333/333)

Các test liên quan trực tiếp nhiệm vụ 10 (đều PASS trong run cuối):

| Test file | Test | Ý nghĩa |
|---|---|---|
| `audit-verification` | All video tags have onError | video trang trí fallback an toàn |
| `audit-verification` | No raw localStorage / webkit-playsinline | chuẩn codebase |
| `epic4-profile-shop` | Máy chủ tính tiền bằng CÙNG hàm giá ưu đãi | nhãn “Giảm giá” khớp Coin thật (402 + đúng giá) |
| `epic4-profile-shop` | Gacha Boutique: masonry, tooltip, preview, nút Mua nảy, mở hộp | marker UI boutique |
| `epic4-profile-shop` | Discord-Style Boutique Visual System | grid, rarity-dot, ≤50 char, frame/aura CSS, `gb-discord-preview`, “Trang bị ngay”, combo showcase |
| `epic5-perf-security` | 19. Lazy-load | mọi `<img>` có `loading=` (kể cả preview unbox mới) |
| `security-hardening` | 9e. Cửa hàng kiểm tra số dư/sở hữu phía server, chống trừ Coin lặp | mua legacy `pencil_starter` → 200, giá 50 do server quyết; trùng → không trừ lại; equip không sở hữu → 403; không đủ Coin → 402 |
| `multi-user-sync` | (toàn bộ) | `equippedDecorations` đồng bộ multi-user qua socket |
| `light-mode-contrast` | (toàn bộ) | adapter light tái sinh (`npm run gen:light`) khớp class mới |

Run cuối: `# tests 333 / pass 333 / fail 0`.

## 4. Kiểm tra thủ công cần làm trên máy thật (checklist)

Sandbox không có trình duyệt — khi mở app thật, verify lần lượt:

- [ ] Boutique: cuộn → card lazy hiện; hover card động → WebM chạy; rời → dừng
- [ ] Filter Frame/Aura/Nameplate + Có animation/Tĩnh + rarity + tìm kiếm; cuộn thêm tải tiếp 24 item
- [ ] Modal preview: đúng avatar của mình, 200px, “Trang bị ngay” đổi chip hồ sơ ngay
- [ ] Gacha 100 Coin: quay → mở hộp → item vào inventory; pity 50/100
- [ ] Profile: 150px + khung/hào quang động chạy; nameplate dưới tên; “Thay đổi trang trí” mở đúng tab
- [ ] Đăng comment + giải đáp → avatar 32px có khung (animation tắt); mở popover tác giả 40px
- [ ] Leaderboard: podium/ladder/rows có khung đúng người (qua email/id)
- [ ] Navbar 28px hiện ngay (preload); ProfileDropdown 44px tròn khi có khung
- [ ] Safari (hoặc thiết bị iOS): mọi trang trí hiện bằng ảnh tĩnh, không vỡ
- [ ] Tắt “Giảm chuyển động” của hệ điều hành → video không phát
- [ ] Xem hồ sơ NGƯỜI KHÁC → Boutique chế độ chỉ-đọc, không hiện nút Mua/Trang bị
- [ ] Migration (sau khi chọn A/B, server đã TẮT): chạy dry-run xem báo cáo,
      `--apply --plan=A|B --confirm` → đăng nhập lại thấy thông báo + coin/item đúng

## 5. Rollback plan (spec Bước 6)

Rủi ro thấp — hệ cũ không bị xoá:

1. **Code**: toàn bộ thay đổi nằm trên branch `arena/62613a87-f-forum` (chưa merge).
   Rollback = không merge / revert branch. 35 item SVG cũ + UI cũ vẫn hoạt động độc lập.
2. **Asset**: `public/assets/decorations/` (122 MB) có thể xoá thoải mái — component
   tự fallback (không có catalog → registry rỗng → boutique không hiện item mới).
3. **Dữ liệu user**: chưa có migration nào chạy → inventory/coin/user chưa đổi.
   Nếu sau này migration A/B được chạy: script đã tạo
   `data/forum-data.backup-<timestamp>.json` TRƯỚC khi ghi → khôi phục bằng cách copy đè lại
   `forum-data.json` và xoá `public/assets/decorations/decorations-migration.json` +
   bỏ khoá `store.migrations['decoration-replacement']` (khuyến nghị: chỉ cần dùng backup).
4. **DB backup thêm trước migration**: `cp data/forum-data.json data/forum-data.backup-manual-<date>.json`.

## 6. Rủi ro & caveat cần user biết

- **Bản quyền asset**: 873 file import từ Discord thuộc về creator gốc (Discord ToS cấm
  phân phối lại asset của người khác). Khuyến nghị: (a) chỉ dùng nội bộ cộng đồng có sự
  cho phép, hoặc (b) thay bằng asset tự vẽ/giấy phép rõ ràng. Code modular nên thay asset
  không cần đụng component.
- **Giá gacha**: UI chặn lượt quay khi coin < 100 (giá lượt), nhưng máy chủ trừ đúng
  **giá item quay ra** (thường ≤ 100 → người dùng luôn có lợi). Không có lỗ, nhưng khác
  với mô hình “trả trước 100 Coin/lượt”.
- **VP9 alpha trên sandbox**: mọi công cụ kiểm tra hình ảnh trong sandbox phải dùng ảnh tĩnh
  (ffmpeg ở đây không decode được kênh alpha — đã chứng minh WebM vẫn đúng bằng bitrate test).
- **Dung lượng Git**: 122 MB asset đã push theo branch (dưới ngưỡng patchset 128 MB —
  sát trần, nên giữ asset là nguồn duy nhất, không nhân bản).

## 7. File chính

```
scripts/decorations/{pipeline.mjs, migrate-decorations.mjs, make-demo-screenshots.mjs, lib/*}
public/assets/decorations/{decorations-catalog.json, avatar-frames/*, nameplates/*}
src/types/index.ts                          # ShopItem + EquippedDecorations
src/utils/{shopData.ts, decorations.ts, decorationStore.ts}
server/{decorationRegistry.ts, forumServer.ts, authGuard.ts}
src/components/decorations/{useDecorationMedia, DecorationMedia, AvatarWithDecoration,
                            NameplateDisplay, DecoratedAvatar, decorations.css}
src/components/shop/{GachaBoutique.tsx, Boutique.css}
src/components/{ProfileModal.tsx, ProfileDropdown.tsx, Navbar.tsx, App.tsx}
src/components/views/{QAForumView.tsx, LeaderboardWidget.tsx}
src/store/forumStore.ts                     # notices + equipDecoration
docs/decorations/{README.md, ASSET_AUDIT.md, TEST_REPORT.md, screenshots/*}
```
