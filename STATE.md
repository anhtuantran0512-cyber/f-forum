# Loop State — F-Forum

Last run: 2026-10-20 (Đợt 8 hotfix + Đợt 9 — chat redesign: nhóm tin 5 phút, menu tác vụ portal, mobile toàn màn hình, composer tối, tên hồ sơ; hotfix chặn seed ghi đè Supabase khi hydrate lỗi; 479/479 test · tsc 0 · oxlint src 0 · light-adapter khớp · verifier độc lập PASS 2 vòng · deploy sống `79691a9`)

## High Priority (loop is acting or waiting on human)

- [ ] **Lộ thông tin đăng nhập Super Admin trong repo public (19/10) — ĐÃ XỬ LÝ MÃ HOÁ; Sếp chốt 20/10: GIỮ REPO PUBLIC** (không cần private/rewrite lịch sử). Việc còn lại (khuyến nghị, chờ Sếp): rotate mật khẩu admin khi thuận tiện — mật khẩu mặc định cũ ai từng đọc repo trước 19/10 đều biết.
- [x] **Avatar admin 10.4MB — ĐÃ XỬ LÝ (Đợt 8, Sếp duyệt c)**: avatar tự host `public/assets/brand/admin-avatar.jpg` (512×512 JPEG ~32KB, cắt từ ảnh Sếp đưa) thay PNG CloudFront 10.9MB; thay đủ 3 seed server + src/config + adminStore + KhuVinhDanh (founder + vd-21) + cache registry/phiên; có migration dữ liệu cũ (localStorage, store Supabase) và test 22 chặn hồi quy. Ghi chú: có đụng `server/forumServer.ts` đúng 3 literal avatar theo phê duyệt trực tiếp của Sếp (mục c).
- [x] **og-cover đúng brand — ĐÃ XỬ LÝ (Đợt 8, Sếp duyệt e)**: bỏ ảnh stock người lạ, thay thiết kế 1200×630 JPEG 95KB (hexagon F-Forum + tagline "Hỏi rõ bản chất, giải tường tận từng bước."); og:image/twitter:image thêm `?v=2` bust cache.
- [x] **Supabase — ĐÃ NỐI ENV (Đợt 8, Sếp duyệt a)**: đã set `SUPABASE_SERVICE_ROLE_KEY` · `VITE_SUPABASE_URL` · `VITE_SUPABASE_ANON_KEY` trên Vercel (production+preview+development); store Supabase nén 6.692.048 → 496.971 bytes (ảnh founder data-URL 6,2MB → avatar tự host — né giới hạn 4,5MB của Vercel Functions); dữ liệu 4 user + 21 milestone giữ nguyên; backup tại `~/.local/share/fforum-backups/2026-10-20/`.
- [x] **Lỗi phiên hết hạn tự đăng xuất — ĐÃ SỬA GỐC (Đợt 8)**: nguyên nhân duy nhất: thiếu `FFORUM_SESSION_SECRET` trên Vercel → mỗi cold start sinh khoá HMAC mới → token cũ bị 401 → client tự dọn phiên. Đã tạo khoá 64-hex cố định, set Vercel 3 target (backup 600 ngoài repo, không vào mã nguồn). Lưu ý: đổi khoá = một đợt đăng nhập lại 1 lần; sau đó phiên bền qua cold start/redeploy.
- [x] **Đợt 8 deploy xác minh — XONG 20/10**: `/api/sync` 200 (4 user + 21 milestone, founder avatar `/assets/brand/admin-avatar.jpg`); avatar 200 · 32.424B; og-cover 200 · 95.525B; login 200 + `/api/auth/session` 200; hydrate lỗi không ghi seed đè cloud (test 23); deploy `dpl_Hf3AQ3tJiSnAaxa861QiCB6VE394` READY. Ghi chú: object Supabase từng đo 499.027B sau proof chat write/delete, vẫn 4 user/21 milestone.
- [x] **Đợt 9 — đại tu giao diện chat (20/10, `79691a9`, nhánh `f-forum_v9` → FF main)**: gộp tin cùng tác giả ≤5 phút **tính từ đầu cụm** (timestamp không đọc được/qua ngày mới mở cụm; test 5/6 phút, chuỗi 10:00→10:04→10:08, đổi tác giả/kênh, timestamp lỗi); menu tác vụ dùng chung `ChatMessageActions` render portal `position:fixed`, tự lật trên/dưới + kẹp viewport, đóng khi scroll/click ngoài/focus rời, chặn Escape đóng cả ChatDock, Arrow/Home/End/Tab + trả focus; mobile giữ trigger 24px trên **mọi** hàng (kể cả continuation); chat mobile full-bleed `x=0 w=390`, composer tối, ẩn FAB quick-action + XP dock, nút đổi kênh 32px; header ẩn subtitle/InfoTip < xl + search `w-36` nên 768–1024 không vỡ; tên tác giả lấy tên hồ sơ (không lộ email), bỏ Lv chip/nameplate theo yêu cầu "plain names"; light mode chat + tab dock mobile đủ tương phản, "Thu hồi tin nhắn" giữ đỏ. **Bằng chứng sống**: `index-Bf4yAJtk.css` có `.ff-chat-actions-menu{...position:fixed;min-width:176px}` + `.ff-chat-mobile-channel{...32px}`, shared chunk `chatTimeline-DcPaCXzO.js` có "Thao tác tin nhắn"/"Thu hồi tin nhắn"; đo prod: menu 176×78 (desktop x839 y642; mobile top602 left124 right300/390), 10/10 continuation actions hiện, quick FAB `false`, 1024 header không tràn. ChatDock là đường dẫn legacy không còn mở (chat icon luôn vào ChatView) nhưng vẫn được cập nhật dùng component chung.

## Branch Convention (19/10)

- Nhánh làm việc: `f-forum_v1` (từ `f-forum-broamstuck-v2.5`), `f-forum_v2` (từ `fix_4`), `f-forum_v3` (từ `arena/62613a87-f-forum`), `f-forum_v4` (nâng phụ thuộc), `f-forum_v5` (font self-host + lint), `f-forum_v6` (Đợt 6 tinh chỉnh UI), `f-forum_v7` (Đợt 7: 6 đề chính thức THPT 2026 + Góc học tập), `f-forum_v8` (Đợt 8 + hotfix hydrate), `f-forum_v9` (Đợt 9: đại tu chat). `main` là nhánh phát hành.
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
- CI 6/6 xanh · 0 issue · 0 PR mở · test 479/479 · tsc 0 · oxlint 0 (1.88, `src` sạch — 2 cảnh báo purity cũ đã sửa) · light-adapter khớp.
- Bundle gzip: CSS 93KB / JS 128KB — khỏe, không hành động.
- 19/10 chiều: vòng nâng cấp theo kế hoạch — icon 8 bậc (`e2c4523`, prod đã đổi asset `index-CuHKhWZB.css`, class `ff-rank-aura/leaf/rays/sway` xác nhận sống) · deps (`7534565`) · font self-host + lint sạch (`30a3ed6`).
- 19/10 tối: Đợt 6 tinh chỉnh UI `b57891c` — audit ảnh before/after → sửa đúng 4 điểm xác nhận bằng ảnh cận cảnh; các nghi vấn khác (gạch chân pill "Học bền bỉ", "Bảng xếp hạng", swatch nền tràn mép, podium ellipsis ~128px) kiểm 3× zoom → KHÔNG phải lỗi, giữ nguyên.

---

Run log: xem `loop-run-log.md`
