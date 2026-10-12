# 🔄 TỔNG TRẠM ĐIỀU PHỐI AI (STUDIO SYNC)
*Tài liệu đồng bộ trạng thái làm việc giữa Antigravity và Freebuff.*

---

## 🚦 TRẠNG THÁI HIỆN TẠI (CURRENT STATUS)

### 🧑‍💻 Antigravity (Đang Online)
- **Nhiệm vụ đang làm**: Chờ nhận nhiệm vụ từ Freebuff / Sếp.
- **Trạng thái**: Rảnh rỗi (Sẵn sàng nhận lệnh).
- **Các file đang khóa (Locked)**: Không có.

### 🤖 Freebuff (Đang Online)
- **Nhiệm vụ đang làm**: CSS/UI fix — đã hoàn thành: test #7 settings-theme, #12/#14 study-hours pass. Commit 052651b đã push origin/main.
- **Trạng thái**: Rảnh rỗi, sẵn sàng làm Đợt 1 (Liquid Navbar & Tối ưu Settings) hoặc nhận yêu cầu nâng cấp frontend.
- **Các file đang khóa (Locked)**: Không có (hoàn thànhCSS fix).
- **Ghi chú giao tiếp**: @Antigravity — nếu cần review architecture, backend Coin/Q&A API, hoặc CI/CD, hãy ghi yêu cầu vào mục "Chuyển giao" dưới đây.

---

## 📋 DANH SÁCH CÔNG VIỆC (BACKLOG / KANBAN)
*(Các nhiệm vụ cần làm sẽ được liệt kê ở đây. AI nào nhận việc thì di chuyển nó lên phần Trạng Thái Hiện Tại).*

- [ ] **Nâng cấp thêm** — đang chờ xác nhận hướng từ Sếp (Freebuff/Antigravity).
  - A. Frontend Đợt 1: Liquid Navbar animation, Setting điều khiển navbar, gộp settings, dọn text rác (Freebuff).
  - B. Backend: Coin system API, Q&A betting, streak logic, architecture review (Antigravity).
  - C. Song song A+B: Freebuff frontend + Antigravity backend đồng thời (theo protocol).

---

## 🤝 CHUYỂN GIAO & HỖ TRỢ (HANDOFF & REQUESTS)
*(AI này cần AI kia làm giúp việc gì thì ghi vào đây)*

- **[Freebuff ➔ Antigravity]**: Freebuff vừa hoàn thành CSS/UI fix (commit 052651b). Đang chờ hướng dẫn "nâng cấp thêm" từ Sếp. Có 3 hướng có thể:
  - **Hướng A (Frontend - Freebuff làm)**: Nâng cấp Đợt 1 roadmap: Liquid Navbar animation (giọt nước trượt theo tab), Setting điều khiển navbar (auto-hide, swap position), gộp settings SFX & reduced motion, dọn text rác.
  - **Hướng B (Backend - Antigravity làm)**: Nếu Sếp muốn nâng cấp backend, Antigravity có thể nhận: Coin system API, Q&A betting API, streak lửa logic, hoặc review architecture hiện trạng.
  - **Hướng C (Cả 2 đồng thời)**: Freebuff làm Frontend Đợt 1, Antigravity làm Backend Đợt 2 song song — theo protocol song song đã thiết lập.
- Yêu cầu: Vui lòng xác nhận hướng nâng cấp cụ thể để cả 2 AI phân công nhiệm vụ.

---

## 📜 LỊCH SỬ CẬP NHẬT (CHANGELOG)
- **[08/10/2026] - Antigravity**: Thiết lập thành công giao thức đồng bộ làm việc song song cho BroAmStuck Studio. Khởi tạo `STUDIO_SYNC.md` và `.agents/rules/studio-sync-protocol.md`.
- **[08/10/2026] - Antigravity**: Hoàn tất đại cập nhật Giao diện (Profile, Radar Chart, Leaderboard, la-08).
- **[12/10/2026] - Arena Agent**: Nhiệm vụ 10 — hệ thống trang trí Discord import (873 asset: 569 frame / 68 aura / 236 nameplate). Pipeline build asset + catalog, Boutique mới (filter/pagination/hover-video/try-on/gacha), AvatarWithDecoration + NameplateDisplay (lazy-load, cache, reduced-motion), đồng bộ profile/comment/leaderboard/navbar. Test riêng `tests/decorations-task10.test.mjs` (catalog + registry + equip slot + notices). Migration A/B đã viết nhưng **CHƯA CHẠY** — chờ Sếp chọn phương án. Chi tiết: `docs/decorations/{README.md, TEST_REPORT.md}`.
- **[12/10/2026] - Arena Agent**: Hotfix Boutique "vào xem trang trí ko thấy gì": (1) `decorations.css` chưa được import → slot 0×0; (2) `DecorationMedia` render video khi blob chưa sẵn; (3) `resolveAssetUrl` nối `BASE_URL` + path tuyệt đối → URL `//assets/…` (protocol-relative) khiến MỌI fetch asset chết → Boutique rỗng. Đã fix + test regression (10.2). Verify: tsc 0 · oxlint 0 · 337/337 test.
- **[12/10/2026] - Arena Agent**: Quality review & re-tiering giá (theo yêu cầu Sếp): script `score-quality.mjs` chấm điểm 0–100 từ chất lượng pixel thật (viền, tâm trống, nét, màu, motion webm) → phân hạng lại common 336 / rare 268 / epic 192 / mythic 77, giá theo bảng rarity; 89 webm "đứng hình" chuyển về ảnh tĩnh (Safari chạy được, payload nhẹ, filter "Có animation" trung thực); rule lỗi cấu trúc (frame tâm đặc → ngừng bán) đã bật, đợt này 0 item dính. Idempotent, chạy lại sau mọi đợt thêm asset. Verify: tsc 0 · oxlint 0 · 337/337 test.
- **[12/10/2026] - Arena Agent**: Migration Sếp chốt **PHƯƠNG ÁN B (đổi item mới)** + màn hình ăn mừng "tạo điểm nhấn". Script nâng cấp: fix 2 bug (item top bị tặng nhầm common do thiếu map `legendary`→`mythic` + `rarity` của SVG cũ), gift **khớp loại** (khung→frame/aura, hiệu ứng→aura, góc hồ sơ→nameplate) + ưu tiên item ĐỘNG, **tự trang bị** vào slot trống, thông báo kèm **payload preview** → `MigrationCelebrationModal` (confetti + card item + huy hiệu "ĐÃ TRANG BỊ" + CTA Boutique). Marker gitignore (artifact triển khai, không commit). Demo end-to-end trong sandbox: 2 user demo giữ 5 item cũ → nhận 5 gift (2 mythic), tự trang bị, 3 notices. Verify: tsc 0 · oxlint 0 (221 file) · **339/339** test (kèm 10.6 modal + 10.7 migration e2e). Chi tiết: `docs/decorations/{README.md, TEST_REPORT.md}`.
- **[12/10/2026] - Arena Agent**: Thêm 2 điểm nhấn ấn tượng (tự update): (1) ruy-băng **KHAI TRƯƠNG** trên Boutique — shimmer vàng, hiện khi migration đã chạy ở môi trường đó (đọc marker tĩnh); (2) **confetti + headline** "Đã trang bị: {item}" mỗi khi đeo trang trí thành công (chỉ khi đeo, không khi gỡ). Reduced-motion an toàn, CSS co-located. Verify: tsc 0 · oxlint 0 (221) · **340/340** test (kèm 10.8).
- **[12/10/2026] - Arena Agent**: ĐẠI CẬP NHẬT Boutique "Sống động" (3 khối, pure client, giá khớp server 100%): (1) **DEAL HÔM NAY** — item chất lượng cao đang sale, xoay theo ngày VN, card riêng + đồng hồ; (2) **BỘ SƯU TẬP CỦA BẠN** — tiến độ X/873 + 4 thanh rarity + "Vinh danh Huyền thoại" (6 mythic đã sưu tầm); (3) **SỰ KIỆN KHAI TRƯƠNG 72H** đếm ngược từ mốc migration. Test 10.9 + 10.10. Verify: tsc 0 · oxlint 0 (221) · **342/342**.
- **[12/10/2026] - Arena Agent**: ĐẠI CẬP NHẬT #2 Boutique "Tủ đồ của bạn" (4 khối, thiên về quản lý): (1) **YÊU THÍCH (wishlist)** — trái tim trên card, server persist (`POST /api/shop/wishlist`, toggle ≤100, validate qua registry, broadcast SYNC_USER), card chuyển `div role=button` (tránh button lồng button); (2) **LỌC ĐÃ CÓ/CHƯA CÓ** từ panel Bộ sưu tập; (3) **dòng rarity bấm được** (lọc theo độ hiếm, aria-pressed); (4) **bộ lọc nhớ qua phiên** (localStorage 1 key). Kèm fix TDZ thật (`now` dùng trước khai báo khi ruy-băng chạy). Test 10.11 + 10.12. Verify: tsc 0 · oxlint 0 (221) · **344/344**.
- **[12/10/2026] - Arena Agent**: Fix crash "Giao diện vừa gặp lỗi": destructuring GachaBoutique thiếu `wishlist`/`onToggleWishlist` (ReferenceError khi render card đầu tiên) — lộ vì root tsconfig là solution file rỗng nên `tsc` thường không check gì; đổi verify sang `tsc -b` (app+server) và sửa luôn 10 type error bị che (UserRecord thiếu wishlist, 3 img src null, mismatch prop App/ProfileModal). Gỡ theo yêu cầu sếp: ruy-băng KHAI TRƯƠNG 72h (JSX+state fetch marker+CSS) và chữ "trang trí Discord" trong UI. Test 10.8 chuyển sang kiểm tra âm (không mọc lại) + giữ confetti. Verify: `tsc -b` 0 · oxlint 0 (221) · **344/344**.
- **[12/10/2026] - Arena Agent**: Đợt #3 Boutique "mua đúng túi tiền": (1) filter **GIÁ TỐI ĐA** (≤2.500/3.500/5.000 Coin) tính trên giá thực tế đang sale (min weekly+flash, cùng effectivePrice với server) — lưu cùng bộ lọc; (2) chip **YÊU THÍCH (n)** duyệt danh sách đã bookmark; (3) nút **XOÁ BỘ LỌC** (hiện khi đang lọc, giữ sắp xếp, đồng bộ localStorage). Test 10.13. Verify: `tsc -b` 0 · oxlint 0 (221) · **345/345**.
- **[12/10/2026] - Arena Agent**: Thêm chip nhanh **GIÁ THẤP → CAO** trong hàng filter Boutique (1 chạm bật/tắt sắp xếp giá tăng, đồng bộ 2 chiều với dropdown sắp xếp, lưu localStorage) — theo yêu cầu sếp. Verify: `tsc -b` 0 · oxlint 0 (221) · **345/345**.
- **[12/10/2026] - Arena Agent**: FIX CHUẨN DISCORD (theo phân tích cơ chế của sếp): (1) **Nameplate** = ảnh nền thuần + tên HTML riêng z2, height cố định 448:84 + ellipsis (tên dài không tràn), GIẸT render khỏi mọi context nhỏ (AvatarWithDecoration mất prop nameplate — chỉ còn DecoratedName ở Profile Card); shop preview nameplate → note; (2) **Safe zone** aura/frame theo id (`decorationSafeZones.ts`, entry `frame-air` re-center) — aura z1 SAU ảnh, overflow visible; (3) **1 modal preview duy nhất** (bỏ CTA hero riêng, bấm banner mở modal chung); (4) **gọn filter/stats**: 1 hàng filter (dropdown Loại + pill), bỏ "873" ở header, 4 khối rarity → stacked bar compact + legend, toggle sở hữu gộp; (5) "Xem khi đeo" = context thật 40px; (6) rà typo "Trận" — nguồn 100% đúng "Trần", thêm font-smoothing. Test 10.14 (khoá chuẩn). Verify: `tsc -b` 0 · oxlint 0 (222) · **346/346**.
- **[12/10/2026] - Arena Agent**: Đợt #4 Boutique: (1) **"Vừa xem"** — 8 item gần nhất mở preview (localStorage, helper pure `pushRecentItem`, mọi điểm mở đều qua `inspectItem`), dải thumbnail bấm để mở lại; (2) **báo "N item yêu thích đang sale"** — so giá thực tế (min weekly+flash) với niêm yết, 1 chạm bật filter Yêu thích, tự tắt khi hết sale. Kèm tránh 1 lỗi TDZ thật khi đặt memo. Test 10.15. Verify: `tsc -b` 0 · oxlint 0 (222) · **347/347**.
- **[12/10/2026] - Arena Agent**: Đợt #5 Boutique "trong ngân sách + mua đúng giá trị": (1) chip **"TÔI MUA ĐƯỢC (N)"** — lọc chỉ hiện item giá thực tế (min weekly+flash) ≤ số Coin hiện tại, count live theo sale/Coin, lưu bộ lọc `afford`; (2) sort **"GIÁ TRỊ TỐT NHẤT"** — `qualityScore/price` giảm (chất lượng/mỗi Coin, hoà → bậc hiếm), restore được; (3) **empty state Yêu thích** — wishlist trống + đang lọc → CTA bấm ♡ thay thông báo chung; (4) **xoá "Vừa xem"** — nút ✕ xoá cả state lẫn storage, "Xoá bộ lọc" giờ gồm cả ngân sách. Test 10.16. Verify: `tsc -b` 0 · oxlint 0 (222) · **348/348**.
- **[12/10/2026] - Arena Agent**: FIX "Giao diện vừa gặp lỗi — Failed to fetch dynamically imported module": (1) **gốc lỗi** — `Boutique.css` sót 1 dấu `}` thừa (dòng 1558, còn từ thao tác xoá khối cũ) → Vite trả 500 cho CSS → mọi lazy chunk import nó chết; đã xoá + **test 15c** rà cân bằng ngoặc toàn bộ CSS trong `src/`; (2) **lớp tự hồi phục** — `isChunkLoadError()` nhận diện đúng message Chrome/Firefox/Vite (test 15b), **ngân sách reload chung** (tối đa 3 lần/60s, chống vòng lặp vô hạn khi lỗi thật sự), boundary tự tải lại 1 nhịp + màn "Mất kết nối khi tải giao diện" (user không cần bấm), main.tsx xoá cờ chunk cũ sau tự tải. Verify: `tsc -b` 0 · oxlint 0 (222) · **350/350** · toàn bộ module Vite trả 200.
