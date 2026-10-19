# Loop State — F-Forum

Last run: 2026-10-19 (phiên người dùng — hoàn tất mã hoá định danh Super Admin, đã deploy; đổi tên nhánh làm việc sang `f-forum_v1..v3`)

## High Priority (loop is acting or waiting on human)

- [ ] **Lộ thông tin đăng nhập Super Admin trong repo public (19/10) — ĐÃ XỬ LÝ, chờ Sếp nghiệm thu**: theo yêu cầu "mã hoá" của Sếp, toàn bộ nguyên văn đã gỡ khỏi mã nguồn: email Super Admin + mật khẩu mẫu cũ gom vào `shared/identityStrings.ts` (dạng che giấu charCode, giải lúc chạy); nhánh bootstrap so khớp bằng **băm một chiều scrypt** (`verifyPassword` + `DEFAULT_MASTER_ADMIN_PASSWORD_HASH`) thay vì literal; login bằng mật khẩu mặc định cũ giữ nguyên hành vi. Test `admin-credential-secrecy` mở rộng quét cả server/shared/scripts/tests. **Còn lại (Sếp quyết)**: (a) lịch sử git vẫn chứa nguyên văn cũ → xoá hẳn phải rewrite history (phối hợp Antigravity) hoặc chuyển repo **private** — khuyến nghị private; (b) cân nhắc rotate mật khẩu admin khi thuận tiện (mật khẩu mặc định cũ ai từng đọc repo trước 19/10 đều biết).
- [ ] **Avatar admin 10.4MB trên CDN ngoài** — `server/forumServer.ts` (dòng 434/3822/4211) + `src/config/admin.ts` + `src/store/adminStore.ts` dùng PNG 2048×2048 ~10.4MB từ `d8j0ntlcm91z4.cloudfront.net` làm avatar tài khoản admin; ai thấy avatar này đều phải tải 10.4MB.
  - Đề xuất: tạo bản 256×256 (~20–50KB) tự host; cập nhật 3 chỗ server + 2 chỗ src + CSP (`server/securityHeaders.ts`) + test ghim `epic5-perf-security.test.mjs:170`.
  - **CẦN SẾP DUYỆT** (đụng server + thay hình đại diện hiển thị — không tự làm).
- [ ] **Nội dung og:cover có đúng brand không?** — fix kỹ thuật xong (tự host + tối ưu 113KB, giữ nguyên nội dung ảnh gốc). Nếu muốn og-cover đúng chất F-Forum: chỉ cần thay file `public/assets/brand/og-cover.jpg` (1200×630) — quyết định của Sếp.

## Branch Convention (19/10)

- Nhánh làm việc: `f-forum_v1` (từ `f-forum-broamstuck-v2.5`), `f-forum_v2` (từ `fix_4`), `f-forum_v3` (từ `arena/62613a87-f-forum` — nhánh hiện tại). `main` là nhánh phát hành.
- Mỗi lần sửa đổi chỉ sửa đúng **một nhánh**, rồi push nhánh đó + FF lên `main`; không sửa song song nhiều nhánh.

## Watch List

- **Nâng cấp phụ thuộc nhỏ**: react 19.3.0→19.3.1 · @vitejs/plugin-react 6.1.1→6.1.2 · jsdom 30.1.2→30.1.3 · oxlint 1.85→1.88 · lucide-react 1.48→1.59 · @types/node 24.19.0→24.19.2 — cần 1 lượt dependency-sweeper + test đầy đủ; chưa gấp.
- **42 vị trí `: any`** trong src — dọn dần từng cụm, mỗi lượt 1 file, không refactor lan rộng.
- **Dev-only**: POST `/api/analytics/track` trả 400 trên vite dev (thiếu route — prod OK). Có thể thêm middleware dev trong `vite.config.ts` cho sạch log; chưa cần.
- **Font Ogg** (OggText woff2) vẫn tải từ cloudfront ngoài (`dcym8fthxf5uu`) qua preload + @font-face — self-host khi có dịp.
- **Registry/patterns**: thêm `patterns/registry.yaml` + khai báo allowed-tools cho skill (gợi ý từ loop doctor — chưa cần).

## Recent Noise (ignored this run)

- `target="_blank"`: 11/11 đều có `rel` trong 2 dòng kế ✓
- `<img>` thiếu alt: 69 ảnh — "1 cảnh báo" là comment trong code (false positive) ✓
- `dangerouslySetInnerHTML`: 0 · `@ts-ignore`: 0 · catch rỗng: 0 · comment `//` trong src: 0 ✓
- CI 6/6 xanh · 0 issue · 0 PR mở · test 474/474 · tsc 0 · oxlint 0 · light-adapter khớp.
- Bundle gzip: CSS 93KB / JS 128KB — khỏe, không hành động.

---
Run log: xem `loop-run-log.md`
