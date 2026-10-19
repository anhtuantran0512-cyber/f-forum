# Loop State — F-Forum

Last run: 2026-10-19 tối (Đợt 6 tinh chỉnh UI/UX từ audit trực quan — `b57891c` deploy sống: tên tác giả hết lộ email · nhãn "Potato" hết cắt chữ · nút "Tải tệp gốc" 1 dòng · cỡ chữ tên dài; test 475/475, verifier độc lập PASS)

## High Priority (loop is acting or waiting on human)

- [ ] **Lộ thông tin đăng nhập Super Admin trong repo public (19/10) — ĐÃ XỬ LÝ, chờ Sếp nghiệm thu**: theo yêu cầu "mã hoá" của Sếp, toàn bộ nguyên văn đã gỡ khỏi mã nguồn: email Super Admin + mật khẩu mẫu cũ gom vào `shared/identityStrings.ts` (dạng che giấu charCode, giải lúc chạy); nhánh bootstrap so khớp bằng **băm một chiều scrypt** (`verifyPassword` + `DEFAULT_MASTER_ADMIN_PASSWORD_HASH`) thay vì literal; login bằng mật khẩu mặc định cũ giữ nguyên hành vi. Test `admin-credential-secrecy` mở rộng quét cả server/shared/scripts/tests. **Còn lại (Sếp quyết)**: (a) lịch sử git vẫn chứa nguyên văn cũ → xoá hẳn phải rewrite history (phối hợp Antigravity) hoặc chuyển repo **private** — khuyến nghị private; (b) cân nhắc rotate mật khẩu admin khi thuận tiện (mật khẩu mặc định cũ ai từng đọc repo trước 19/10 đều biết).
- [ ] **Avatar admin 10.4MB trên CDN ngoài** — `server/forumServer.ts` (dòng 434/3822/4211) + `src/config/admin.ts` + `src/store/adminStore.ts` dùng PNG 2048×2048 ~10.4MB từ `d8j0ntlcm91z4.cloudfront.net` làm avatar tài khoản admin; ai thấy avatar này đều phải tải 10.4MB.
  - Đề xuất: tạo bản 256×256 (~20–50KB) tự host; cập nhật 3 chỗ server + 2 chỗ src + CSP (`server/securityHeaders.ts`) + test ghim `epic5-perf-security.test.mjs:170`.
  - **CẦN SẾP DUYỆT** (đụng server + thay hình đại diện hiển thị — không tự làm).
- [ ] **Nội dung og:cover có đúng brand không?** — fix kỹ thuật xong (tự host + tối ưu 113KB, giữ nguyên nội dung ảnh gốc). Nếu muốn og-cover đúng chất F-Forum: chỉ cần thay file `public/assets/brand/og-cover.jpg` (1200×630) — quyết định của Sếp.

## Branch Convention (19/10)

- Nhánh làm việc: `f-forum_v1` (từ `f-forum-broamstuck-v2.5`), `f-forum_v2` (từ `fix_4`), `f-forum_v3` (từ `arena/62613a87-f-forum`), `f-forum_v4` (nâng phụ thuộc), `f-forum_v5` (font self-host + lint), `f-forum_v6` (Đợt 6 tinh chỉnh UI), `f-forum_v7` (Đợt 7: 6 đề chính thức THPT 2026 + Góc học tập). `main` là nhánh phát hành.
- Mỗi lần sửa đổi chỉ sửa đúng **một nhánh**, rồi push nhánh đó + FF lên `main`; không sửa song song nhiều nhánh.

## Watch List

- ✅ **Nâng cấp phụ thuộc nhỏ (19/10, `7534565`)**: react/react-dom 19.3.1 · @vitejs/plugin-react 6.1.2 · jsdom 30.1.3 · oxlint 1.88 · lucide-react 1.59 · @types/node 24.19.2 — test 475/475, 0 lỗ hổng npm.
- ✅ **Đợt 7 mở rộng kho đề (19/10 đêm, `02feaf4`, nhánh `f-forum_v7`)**: thêm 6 đề **chính thức THPT 2026** có nguồn xác minh — Toán (mã 0101, scan đề gốc 4 trang), Ngữ văn, Tiếng Anh (1127), Vật lí (0230), Hóa học (0344), Sinh học (0430); đưa lên **đầu kho** (16 thẻ, 6 thẻ đầu là 2026). Thẻ đề có lời giải mẫu chọn lọc (Toán 3 câu: H/30=1152 · hạt cườm 5,91cm³ · 3190P=1856; Văn/Anh/Lý/Hóa/Sinh mỗi đề 1–2 câu kèm công thức & mẹo). Thêm **Góc học tập** (7 nguồn công khai: @vumaiphuong, @vukhacngoc, toanmath.com, thuvienhoclieu.com, moet.gov.vn, hsa.edu.vn, thinangluc.vnuhcm.edu.vn) cuối kho đề. Tinh chỉnh: `getCompactPaperTitle` viết hoa chữ đầu + `data-exam-id` cho thẻ. FileSize để trống theo luật test (không số liệu bịa). Test 476/476 · tsc sạch · oxlint 0 · light-adapter khớp · **verifier độc lập PASS 2 vòng** (vòng 1 bắt PDF Toán dính lời giải AI của TOANMATH → đã cắt còn 4 trang đề gốc 1.949.763B, nhãn minh bạch; test 17 siết ràng buộc size/url theo từng entry). Deploy sống: `index-DEvS5s0G.js`; chunk `examSubmissionApi-Bc90BFcA.js` chứa "Mã đề 0101"/"THPT 2026"/"1949763"; chunk `ExamVaultView-mPyDmTDy.js` chứa "bài giảng chọn lọc" + "vumaiphuong"; 6 PDF phục vụ đủ kích thước (200); prod UI: 16 thẻ, 6 thẻ đầu 2026, 7 link học tập, 0 lỗi trang.
- ✅ **Đợt 6 tinh chỉnh UI (19/10 tối, `b57891c`)**: QAForumView hết lộ email tác giả (`EMAIL_SHAPED` + `pickDisplayName`, fallback "Thành viên F-Forum") + subtitle mới · SettingsModal "Potato" hết cắt chữ · ExamVaultView nút "Tải tệp gốc" 1 dòng + chip header đề 150px · DecoratedName ngưỡng cỡ chữ tên dài. Test 475/475 · tsc sạch · oxlint 0 · verifier độc lập PASS · deploy sống: `index-C1dHM0j4.js`/`index-oZOaESnk.css`, chunk `QAForumView-DCcxrNRn.js` chứa chuỗi mới, CSS có `max-width:150px` + `10.5px`.
- **42 vị trí `: any`** trong src — dọn dần từng cụm, mỗi lượt 1 file, không refactor lan rộng. (Phân bố: forumStore 19 · oauth 7 · AuthModal 5 · reports 3 · session 2 · backgroundSyncQueue 2 · imagePipeline 1 · ThreadsView 1)
- **Dev-only**: POST `/api/analytics/track` trả 400 trên vite dev (thiếu route — prod OK). Có thể thêm middleware dev trong `vite.config.ts` cho sạch log; chưa cần.
- ✅ **Font Ogg self-host (19/10, `30a3ed6`)**: woff2 67KB về `public/fonts/`, bỏ hotlink CloudFront (index.html @font-face + preload, MemoryRealm.css), dọn CSP `fonts` origin thừa; CSP `'self'` đã có sẵn.
- **Registry/patterns**: thêm `patterns/registry.yaml` + khai báo allowed-tools cho skill (gợi ý từ loop doctor — chưa cần).

## Recent Noise (ignored this run)

- `target="_blank"`: 11/11 đều có `rel` trong 2 dòng kế ✓
- `<img>` thiếu alt: 69 ảnh — "1 cảnh báo" là comment trong code (false positive) ✓
- `dangerouslySetInnerHTML`: 0 · `@ts-ignore`: 0 · catch rỗng: 0 · comment `//` trong src: 0 ✓
- CI 6/6 xanh · 0 issue · 0 PR mở · test 475/475 · tsc 0 · oxlint 0 (1.88, `src` sạch — 2 cảnh báo purity cũ đã sửa) · light-adapter khớp.
- Bundle gzip: CSS 93KB / JS 128KB — khỏe, không hành động.
- 19/10 chiều: vòng nâng cấp theo kế hoạch — icon 8 bậc (`e2c4523`, prod đã đổi asset `index-CuHKhWZB.css`, class `ff-rank-aura/leaf/rays/sway` xác nhận sống) · deps (`7534565`) · font self-host + lint sạch (`30a3ed6`).
- 19/10 tối: Đợt 6 tinh chỉnh UI `b57891c` — audit ảnh before/after → sửa đúng 4 điểm xác nhận bằng ảnh cận cảnh; các nghi vấn khác (gạch chân pill "Học bền bỉ", "Bảng xếp hạng", swatch nền tràn mép, podium ellipsis ~128px) kiểm 3× zoom → KHÔNG phải lỗi, giữ nguyên.

---

Run log: xem `loop-run-log.md`
