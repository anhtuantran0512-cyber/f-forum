# TEST REPORT — Nhiệm vụ 10: Hệ thống trang trí Discord import

Ngày: 2026-10-12 · Branch: `arena/62613a87-f-forum` · Cơ sở: `670848e` (main)

## 0. Kết quả tổng

| Hạng mục | Kết quả |
|---|---|
| `npx tsc -b` | ✅ 0 lỗi |
| `npx oxlint` | ✅ 0 warning / 0 error (222 files) |
| `npm test` (29 file, Node test runner) | ✅ **350/350 pass** |
| Asset build | ✅ 3.878 file / ~122 MB · 0 lỗi ffmpeg · catalog 873 item |
| Quality re-tiering | ✅ 873 item chấm điểm 0–100 · 768 động / 105 tĩnh · 0 lỗi cấu trúc · giá khớp bảng rarity 100% |
| Migration | ✅ **ĐÃ CHỌN PHƯƠNG ÁN B** (Sếp chốt 12/10) — script nâng cấp (cùng hiếm thật, khớp loại, tự trang bị, payload ăn mừng) + demo end-to-end trong sandbox; marker KHÔNG commit (chạy khi triển khai) |

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
      {common 336, rare 268, epic 192, mythic 77} (sau quality re-tiering — xem mục 1.1)

### 1.1 Quality review & re-tiering giá (bổ sung 2026-10-12) ✅

User yêu cầu: *"xem xét chất lượng, animation các kiểu và sắp xếp hợp lý giá cả từ common
tới mythic, đảm bảo chất lượng"*. Thực hiện bằng `scripts/decorations/score-quality.mjs`:

- **Chấm điểm 0–100 từ chất lượng pixel thật** (sharp: vòng viền, tâm trống, Laplacian nét,
  bão hoà, tương phản + ffmpeg: motion trung bình & max trên 14 frame 64px của webm),
  percentile **trong từng nhóm** (frame·aura / nameplate) — điểm không so lệch giữa loại.
- **Phân hạng**: animated top 10% mythic · +25% epic · +35% rare · còn common; item tĩnh
  luôn common. Giá = bảng `pricing.coins[type][rarity]` (test 10.1 verify 100% khớp).
- **Chốt chất lượng động**: 89 webm "animation" mà mọi frame giống nhau (max frame-diff
  < 0.5/255) → chuyển **tĩnh** (`isAnimated:false`, webm bỏ khỏi catalog, tag
  `static-content`) → 768 động / 105 tĩnh. Safari/iOS chạy được, payload nhẹ, filter
  "Có animation" trung thực. (Ngưỡng bảo thủ: 43 item hiệu ứng nhỏ nhưng CÓ frame đổi
  vẫn giữ animation — không cắt nhầm.)
- **Lỗi cấu trúc**: rule frame tâm đặc (alpha tâm > 190) → `isActive:false`; đợt này
  **0 item dính** (đã verify trên toàn 569 frame).
- **Kết quả**: common 336 · rare 268 · epic 192 · mythic 77. Top mythic: nameplate
  *Xanh Lá Mana* (84), *Xử Nữ* (80), frame *Travel Nhẫn* (77), *Mini Supreme Kai* (76).
- **Idempotent**: chạy lần 2 cho đúng phân bố (0 convert mới) — an toàn chạy lại sau
  mọi đợt thêm asset.
- Ảnh demo (`screenshots/`) đã tái tạo theo top qualityScore mới.

### 1.2 Migration — phương án B + màn hình ăn mừng (bổ sung 2026-10-12) ✅

Sếp yêu cầu: *"chọn phương án tốt nhất, tạo điểm nhấn, ấn tượng cho người dùng"*.

**Quyết định: PHƯƠNG ÁN B (đổi item mới)** — lý do:
- Điểm nhấn TRỰC QUAN: avatar user tự đeo trang trí Discord mới ngay khi mở app
  (phương án A chỉ hoàn Coin — vô hình, user phải tự mua lại).
- Không phình kinh tế Coin; câu chuyện "nâng cấp miễn phí" mạnh hơn "hoàn tiền".

**Nâng cấp script** (`migrate-decorations.mjs`):
- **Bugfix 1**: `LEGACY_SVG_ITEMS` không có trường `rarity` — script cũ tặng **common
  cho mọi user** (kể cả người giữ item top 4.000 Coin). Giờ suy từ `tierColor`
  (`RARITY_OF_TIER`).
- **Bugfix 2**: bậc cao nhất hệ cũ là `legendary`, catalog mới là `mythic` — chưa map
  → user giữ item top nhận "KHÔNG có item cùng hiếm!". Đã map `legendary`→`mythic`.
- **Khớp loại**: khung avatar → frame/aura · hiệu ứng/theme → aura · góc hồ sơ →
  nameplate (hash tất định, ưu tiên item ĐỘNG, qualityScore cao).
- **Tự trang bị** gift vào slot trống (`equippedDecorations`) — không ghi đè item mới.
- **Payload thông báo** (global: showcase 3 viên ngọc mythic; cá nhân: gifts + cờ
  `equipped`) → `MigrationCelebrationModal`: confetti + card preview thật + huy hiệu
  "ĐÃ TRANG BỊ" + CTA Boutique. Hiện 1 lần, Escape/backdrop đóng, reduced-motion.

**Test e2e (10.7)**: 2 user giả (1 giữ item top + common, 1 giữ 2 common) → apply →
assert gift đúng bậc hiếm (mythic/common), đúng loại, item active thật, tự trang bị
khớp slot, payload đủ trường, idempotent re-run. **Demo sandbox thật**: server đang
chạy với data đã migrate (2 user demo, 5 gift, 3 notices) — registry verify: 35 legacy
SVG → 0 active (soft-delete qua marker), 873 item mới active.

**Điểm nhấn bổ sung (tự update thêm)**:
- **Ruy-băng "KHAI TRƯƠNG"** trên Boutique — hiện khi migration đã chạy ở môi
  trường đó (client đọc marker tĩnh qua `resolveAssetUrl`): shimmer vàng + spark,
  reduced-motion an toàn.
- **Confetti khi trang bị** — mỗi lần đeo trang trí thành công (bất kỳ đâu:
  Boutique try-on, unbox gacha, hồ sơ) bắn CelebrationBurst gold + headline
  "Đã trang bị: {tên item}" (chỉ khi đeo, không khi gỡ).

**Triển khai (mỗi môi trường, server TẮT)**: chạy dry-run xem trước, rồi
`node scripts/decorations/migrate-decorations.mjs --apply --plan=B --confirm`.
Marker gitignore — không commit, không deploy nhầm.

### 1.3 ĐẠI CẬP NHẬT — Boutique "Sống động" (bổ sung 2026-10-12) ✅

Sếp yêu cầu: *"tự update thêm, làm 1 update đại cập nhật"*. Ba khối mới trên Boutique
(đều pure client, giá LUÔN khớp server vì dùng đúng `effectivePrice`):

1. **DEAL HÔM NAY** (`getDailyDeal` — pure, test 10.9): item NỔI BẬT của ngày
   từ nhóm đang sale (flash 6h + ưu đãi tuần), chỉ lấy TOP 12 CHẤT LƯỢNG
   (qualityScore), chọn tất định theo NGÀY VIỆT NAM (cả hệ thống xem cùng 1 deal,
   xoay mỗi ngày). Card riêng: preview + −X% + giá gạch/giá mới + đồng hồ đếm
   ngược khung sale. Click → modal xem trên avatar thật.
2. **BỘ SƯU TẬP CỦA BẠN** (`getCollectionStats` — pure, test 10.10): tổng
   X/873 + thanh tiến độ, 4 thanh mini theo độ hiếm (màu rarity), "Vinh danh
   Huyền thoại" — 6 viên ngọc mythic đã sưu tầm (top qualityScore, click xem).
   Empty state: số mythic đang chờ khám phá.
3. **SỰ KIỆN KHAI TRƯƠNG 72H** *(đã gỡ 2026-10-12 theo yêu cầu sếp — thừa, không cần thiết)*:
   ruy-băng đếm ngược từ mốc migration (`at` trong marker).

Kỹ thuật: hàm thuần trong `src/utils/decorations.ts` (import `effectivePrice`
từ shopData — không vòng lặp import); Boutique tick 1s sẵn có điều khiển cả 3 đồng hồ;
CSS co-located (Boutique.css), reduced-motion + mobile responsive.

### 1.4 ĐẠI CẬP NHẬT #2 — "Tủ đồ của bạn" (bổ sung 2026-10-12) ✅

Sếp yêu cầu: *"tiếp tục làm những đợt đại cập nhật toàn diện"* — đợt này tập
trung vào **quản lý 873 item** (chức năng, không phải hiệu ứng):

1. **YÊU THÍCH (wishlist)** — nút trái tim trên từng card, lưu SERVER
   (`POST /api/shop/wishlist`, toggle, ≤100 item, validate id qua registry,
   broadcast `SYNC_USER` cho cả nhà + tab mở khác). `User.wishlist` được
   sanitize khi đọc từ disk (id hợp lệ, unique). Client: `toggleWishlist`
   trong store; card là `div role=button` để nút trái tim (button thật) không
   vi phạm HTML.
2. **LỌC ĐÃ CÓ / CHƯA CÓ** — 2 nút trong panel Bộ sưu tập, đếm số thật
   (collection.owned / total−owned), bấm lần 2 bỏ lọc. Ghép với bộ lọc
   type/rarity/motion/sort có sẵn → ví dụ: chỉ xem Mythic chưa sở hữu.
3. **DÒNG RARITY BẤM ĐƯỢC** — 4 thanh mini trong Bộ sưu tập giờ là nút:
   bấm = lọc Boutique theo độ hiếm đó (bấm lại = bỏ), `aria-pressed` +
   viền sáng rarity cho trạng thái active.
4. **BỘ LỌC NHỚ QUA PHIÊN** — type/rarity/motion/sort tự lưu
   `localStorage` (key `fforum_boutique_filters_v1`, 1 const dùng cho cả
   đọc + ghi), khôi phục khi mở lại Boutique.

Kỹ thuật: server persist + broadcast (đúng pattern `equip`); client ghi
localStorage event-driven (khi bấm, không effect); phát hiện & sửa lỗi TDZ
thực (`now` dùng trước khai báo khi ruy-băng hoạt động) trong lúc ghép.

### 1.5 Đợt #3 — "Mua đúng túi tiền" (bổ sung 2026-10-12) ✅

Ba thêm nhỏ, đều phục vụ vòng lặp mua (873 item, coin hữu hạn):

1. **GIÁ TỐI ĐA** — select trong thanh tìm: ≤2.500 / ≤3.500 / ≤5.000 Coin.
   Lọc theo **giá thực tế đang hiển thị** (min của ưu đãi tuần + flash 6h,
   cùng `effectivePrice` với card/server) — item đang sale rớt xuống ngưỡng
   xuất hiện đúng lúc. Lưu cùng bộ lọc.
2. **CHIP YÊU THÍCH** — "Yêu thích (n)" cạnh filter loại: chỉ hiện item đã
   bookmark (hoàn tất vòng lặp wishlist: đánh dấu → duyệt lại → xoá).
3. **XOÁ BỘ LỌC** — nút chỉ hiện khi đang có lọc (type/hiếm/chuyển động/
   sở hữu/giá/yêu thích/từ khoá); về mặc định, giữ nguyên sắp xếp,
   đồng bộ localStorage.
4. **CHIP "GIÁ THẤP → CAO"** (bổ sung theo yêu cầu sếp) — 1 chạm bật/tắt
   sắp xếp giá tăng ngay hàng filter (không phải mở dropdown), active
   đồng bộ 2 chiều với ô sắp xếp, lưu cùng bộ lọc.

Kỹ thuật: mở rộng `filtered` memo 1 chỗ (deps đầy đủ — kiểm tra bằng test),
CSS co-located, reduced-motion an toàn.

### 1.6 FIX CHUẨN DISCORD — nameplate / aura / preview / filter (bổ sung 2026-10-12) ✅

Sếp chỉ ra code hiểu sai cơ chế Nameplate (tràn chữ, lặp chữ) — sửa đúng
chuẩn Discord, có test khoá (10.14):

1. **NAMEPLATE** — asset là ẢNH NỀN THUẦN TÚY; tên user = lớp HTML riêng
   (z2) trên nền (z1). Container height CỐ ĐỊNH (aspect-ratio 448:84,
   overflow hidden) + `nowrap/ellipsis/max-width` → tên dài không bao giờ
   tràn. Nameplate CHỈ render ở Profile Card đầy đủ (`DecoratedName`);
   `AvatarWithDecoration` bị GIẸT prop nameplate → mọi context nhỏ
   (navbar 24px, comment, leaderboard, shop preview) không thể lẫn nameplate.
   Shop preview nameplate → note "chỉ hiển thị trên Hồ Sơ đầy đủ".
2. **SAFE ZONE (aura/frame)** — `decorationSafeZones.ts`: config theo id
   `{dx, dy, scale}` % (mặc định 1.0) vì artwork mỗi file lệch tâm khác nhau;
   `AvatarWithDecoration` áp `translate+scale` cho slot aura (z1, SAU ảnh,
   overflow visible). Entry đầu: `frame-air` (vòng sáng lệch → re-center).
3. **1 MODAL PREVIEW DUY NHẤT** — bỏ nút "Xem thử trên Avatar" riêng ở banner
   Mythic; bấm BẤT KỲ ĐÂU banner → mở modal `gb-inspect` chung.
4. **GỌN FILTER & STATS** — 2 hàng filter gộp 1 hàng (Loại = dropdown +
   pill Rarity/Sở hữu/Motion/Gia, flex + scroll ngang); header không còn
   "873 trang trí" (chỉ "Bộ sưu tập" hiển thị tổng); 4 khối rarity →
   **1 stacked bar** compact (màu=rarity, fill=đã sở hữu, bấm được) + legend
   1 dòng; toggle "Đã có/Chưa có" gộp thành pill trong hàng filter (1 bộ lọc
   sở hữu duy nhất).
5. **"XEM KHI ĐEO"** — preview context THẬT: avatar 40px chuẩn
   `AvatarWithDecoration` (comment/list); nameplate ở context nhỏ → thông
   báo, không render.
6. **Typo "Trận→Trần"** — rà toàn bộ nguồn: data + mọi string hardcode đều
   đúng "Trần Văn Anh Tuấn", không có slice/substring cắt hỏng unicode
   (slice JS an toàn code-unit với tiếng Việt); thêm font smoothing +
   text-rendering cho lớp tên nameplate.

Kỹ thuật: CSS co-located (decorations.css + Boutique.css), reduced-motion an
toàn, ARIA (aria-pressed, role=note, label).

### 1.7 Đợt #4 — "Quay lại nhanh + không bỏ lỡ sale" (bổ sung 2026-10-12) ✅

1. **"VỪA XEM"** — 8 item gần nhất mở preview (localStorage
   `fforum_boutique_recent_v1`, helper pure `pushRecentItem`), dải thumbnail
   ngay dưới header, bấm → mở lại modal. Mọi điểm mở preview (card, hero,
   deal, gem mythic) đều đi qua 1 helper `inspectItem` → không sót, không
   trùng; item đã khỏi catalog tự loại.
2. **"ITEM YÊU THÍCH ĐANG SALE"** — đếm item wishlist có giá thực tế
   (min weekly+flash) < giá niêm yết; note cam "N item yêu thích đang sale —
   xem ngay" → 1 chạm bật filter Yêu thích. Tắt tự động khi hết sale.

Kỹ thuật: đặt memo đúng thứ tự khai báo (bắt + tránh 1 lỗi TDZ thật trong
lúc ghép), CSS co-located + reduced-motion, ARIA label.

### 1.8 Đợt #5 — "Trong ngân sách + mua đúng giá trị" (bổ sung 2026-10-12) ✅
1. **CHIP "TÔI MUA ĐƯỢC (N)"** — lọc chỉ hiện item có giá thực tế
   (min weekly+flash) ≤ số Coin HIỆN TẠI; count live trên chip (mỗi lần
   sale đổi giá / Coin đổi là tự cập nhật); lựa chọn lưu theo bộ lọc
   (`afford` key, khôi phục khi mở lại Boutique).
2. **SORT "GIÁ TRỊ TỐT NHẤT"** — xếp theo `qualityScore/price` giảm dần
   (chất lượng cao nhất cho mỗi Coin), hoà → theo bậc hiếm; thêm vào
   dropdown Sắp xếp + restore được.
3. **EMPTY STATE YÊU THÍCH** — đang lọc "Yêu thích" mà wishlist trống
   → CTA "bấm ♡ trên card để lưu" thay vì thông báo trống chung chung.
4. **XOÁ "VỪA XEM"** — nút ✕ đầu cuối dải (xoá cả state lẫn
   `fforum_boutique_recent_v1`), "Xoá bộ lọc" giờ gồm cả lọc ngân sách.

Kỹ thuật: giá so Coin dùng đúng công thức giá thực tế của lưới
(không lệch với số Coin hiển thị trên card), ARIA label/pressed,
CSS accent xanh lá cho chip ngân sách + nút xoá, reduced-motion.

### 1.9 FIX "Giao diện vừa gặp lỗi / Failed to fetch dynamically imported module" (bổ sung 2026-10-12) ✅
1. **GỐC LỖI (đã fix)**: `Boutique.css` để sót 1 dấu `}` thừa (dòng 1558,
   còn lại từ thao tác xoá khối cũ) → Vite trả **500** cho file CSS → mọi
   lazy chunk import nó (`GachaBoutique` → `ProfileModal`…) fetch fail →
   màn "Giao diện vừa gặp lỗi". Đã xoá; thêm test 15c rà cân bằng ngoặc
   TẤT CẢ CSS trong `src/` (sai một dấu là đỏ — không thể bị lại).
2. **Lớp tự hồi phục** cho lỗi chunk nhất thời (mạng gián đoạn qua proxy
   preview, dev server trả 500 khi file đang sửa dở, module graph cũ sau
   cập nhật phiên bản):
   - `isChunkLoadError()` (test 15b): nhận diện đúng message của
     Chrome/Firefox/Vite, không bắt nhầm runtime/API error.
   - **Ngân sách reload chung** `fforum_chunk_err_budget`: tối đa 3 lần
     tự tải trong 60s, cả `lazyWithRetry` lẫn error boundary cùng tiêu —
     chống vòng lặp reload vô hạn khi lỗi là THẬT SỰ; bấm nút thủ công
     reset ngân sách (ý định rõ ràng).
   - Error boundary: lỗi chunk → màn "Mất kết nối khi tải giao diện"
     (thay message tiếng Anh khó hiểu) + **tự tải lại 1 nhịp** kèm dòng
     "Đang tự động tải lại…" — user không cần bấm gì.
   - `main.tsx`: boot xong xoá cờ chunk cũ nếu ngân sách còn "nóng"
     (vừa tự tải) → các chunk khác được hồi phục tiếp, ngân sách vẫn giữ
     vai trò chặn lặp.

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

## 3. Ma trận test tự động (337/337)

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
| `decorations-task10` | 10.1 Catalog: 873 item — schema, file trên disk, preview < 100KB, giá theo rarity | toàn bộ assetPath tồn tại thật, slug kebab-case, giá khớp bảng rarity, isAnimated ⇔ webm |
| `decorations-task10` | 10.2 Registry: 873 active + slot đúng loại + item SVG cũ vẫn bán | slot frame/aura/nameplate; id decoration lạ đúng hình thức vẫn giữ; id rác bị loại |
| `decorations-task10` | 10.3 Mua trang trí: 402 đúng giá effectivePrice | thông báo máy chủ khớp giá ưu đãi (tuần + flash), không phải giá niêm yết |
| `decorations-task10` | 10.4 + 10.5 Equip theo slot & thông báo in-app | lẫn lộn slot → 400; đúng slot → 200 (frame+aura+nameplate song song); gỡ → null; không sở hữu → 403; notices chỉ của mình + read |
| `decorations-task10` | 10.6 Modal ăn mừng migration | modal + wiring store/App, confetti (CelebrationBurst), keep-dark, reduced-motion, payload types |
| `decorations-task10` | 10.7 Migration e2e (phương án B) | cùng hiếm thật (bugfix legendary→mythic), khớp loại, tự trang bị, payload preview, idempotent |
| `decorations-task10` | 10.8 Boutique: confetti khi trang bị | chỉ bắn khi đeo (không khi gỡ); ruy-băng KHAI TRƯƠNG + chữ "trang trí Discord" đã Gỡ theo yêu cầu — kiểm tra âm không cho mọc lại |
| `decorations-task10` | 10.9 Deal hôm nay | tất định theo ngày VN, ứng viên chỉ từ sale, giá = effectivePrice (khớp server) |
| `decorations-task10` | 10.10 Bộ sưu tập | tiến độ theo rarity, mythic sở hữu top qualityScore, empty state |
| `decorations-task10` | 10.11 Wishlist e2e | add/remove toggle, 400 id rác, 401 khách, persist lại disk đúng |
| `decorations-task10` | 10.12 UI wishlist + lọc | trái tim SVG (không button lồng button), Đã có/Chưa có, rarity row bấm, localStorage 1 key đọc/ghi, modal chỉ profile mình |
| `decorations-task10` | 10.13 Đợt #3 | giá tối đa theo giá thực tế (min weekly+flash), chip Yêu thích (n), nút Xoá bộ lọc + reset đủ trạng thái |
| `decorations-task10` | 10.14 Chuẩn Discord | nameplate 1 vị trí (gẹt prop ở avatar nhỏ), height cố định + ellipsis, safe zone translate/scale, 1 modal preview, filter 1 hàng, stacked bar, context 40px |
| `decorations-task10` | 10.15 Đợt #4 | pushRecentItem pure (trật tự/trùng lặp/max/id rỗng), dải Vừa xem (8 item, lọc khỏi catalog), đếm wishlist đang sale + 1 chạm mở |
| `decorations-task10` | 10.16 Đợt #5 | chip "Tôi mua được (N)" theo Coin hiện tại (giá thực tế), sort "Giá trị tốt nhất" (qualityScore/price), empty state yêu thích + CTA, xoá "Vừa xem" state+storage, reset đủ lọc ngân sách |
| `multi-user-sync` | (toàn bộ) | `equippedDecorations` đồng bộ multi-user qua socket |
| `light-mode-contrast` | (toàn bộ) | adapter light tái sinh (`npm run gen:light`) khớp class mới |

Run cuối: `# tests 350 / pass 350 / fail 0` (xanh cả khi marker migration TỒN TẠI cục bộ —
test hermetic qua env `FFORUM_MIGRATION_MARKER`).

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
tests/decorations-task10.test.mjs           # hợp đồng riêng Nv10: catalog + registry + API equip/notices
docs/decorations/{README.md, ASSET_AUDIT.md, TEST_REPORT.md, screenshots/*}
```
