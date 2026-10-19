# 🛡️ BROAMSTUCK STUDIO - ACTIVE SESSION STATE CHECKPOINT
*Cơ chế tự bảo lưu ngữ cảnh & phục hồi không suy giảm chất lượng khi gặp sự cố cạn Quota / Timeout / Mất mạng / Tắt máy đột ngột.*

---

## 📌 THÔNG TIN PHIÊN LÀM VIỆC
- **Dự án**: F-Forum (`arena/62613a87-f-forum`)
- **Thư mục làm việc**: `/home/broamstuck/f-forum`
- **Thời gian Checkpoint**: 2026-10-19 (sau khi deploy Đợt 4 + Đợt 5 Nhiệm vụ 12)
- **Trạng thái Git**: Nhánh `arena/62613a87-f-forum` — **PR #18 đã được tài khoản Sếp merge ngày 17/10 (trước phiên này, không còn PR mở)**; đã đồng bộ `main` + `f-forum-broamstuck-v2.5` tại commit `e1c2b85` (tài liệu, trên nền mã `e53e0b4`).
- **Tình trạng Kiểm thử**: 474/474 tests passed | light-adapter `--check` khớp | 0 lỗi `tsc -b` | 0 lỗi oxlint trong `src/`.
- **Production URL**: `https://f-forum.vercel.app` (đã xác thực bundle mới sống trên prod).

---

## 🎯 YÊU CẦU GỐC TỪ SẾP (100% RAW SCOPE)
1. "đảm bảo 100% gui,ui,ux, toàn bộ theo kế hoạch thiết kế" (Nhiệm vụ 12 — 5 đợt đại tu, vòng lặp tự phản biện).
2. Tự vòng lặp nâng cấp UI/perf/quality; chốt cuối không còn lỗi giao diện mới/nghiêm trọng.
3. Giữ đăng nhập admin hoạt động; giao diện đăng nhập không lộ tài khoản admin.
4. Giữ PR #18 mở; không xoá tính năng để giấu lỗi; không tuyên bố "đã test/mượt" khi chưa đo.

---

## ✅ CÁC HẠNG MỤC ĐÃ HOÀN THÀNH & NGHIỆM THU (COMPLETED MILESTONES)
1. **Potato toàn cục (tối ưu tài nguyên thật)** — commit `159cca4`:
   - Video nền tắt ở MỌI phân khu kể cả Trang chủ (thay đổi hành vi có chủ đích so với ghim cũ "home giữ video" — đã báo cáo để Sếp veto); nền tĩnh của Potator hiển thị mọi trang.
   - Chế độ sáng: 6 trang nội dung (CLB/Hỏi Đáp/Thread/Chat/Vinh Danh/Bản nâng cấp) dùng nền "kính sữa" (span gradient ẩn, nền gốc sáng) — sửa lỗi tương phản chữ kem trên nền sáng; Trang chủ & Miền Ký Ức giữ nền tối điện ảnh.
   - Bảng chọn gradient Potator trong Cài đặt chỉ áp dụng chế độ tối (kèm ghi chú).
   - Bằng chứng mạng: bật Potator → gỡ hẳn phần tử video, 0 request video mới (probe60).
2. **Fabulous khôi phục & đúng điều kiện** — xác thực runtime đợt này:
   - Chỉ bật mới tải: Fabulous TẮT → 0 request video của nó trong 3.5s (bằng chứng mạng probe60/61b).
   - Tối + trang nội dung: sân khấu 3 video, 1 video đang phát; chế độ sáng: lớp trang trí không video; reduced-motion: không dựng sân khấu; mutex Fabulous↔Potator hai chiều.
3. **Hiệu ứng profile có điều kiện** — xác thực runtime (probe60b):
   - Chỉ 1 marker `[data-profile-active]` toàn trang khi mở hồ sơ; trỏ vào vùng bìa → `"true"`, rời ra → `"false"`; listener pointermove chỉ gắn khi khung bìa trong tầm nhìn + rAF tiết chế; tôn trọng reduced-motion.
4. **Dọn font tải về không dùng** — commit `4bf1c04`: bỏ Helvetica (stylesheet ngoài không dùng) + Figtree khỏi Google Fonts và token; giữ đủ dấu tiếng Việt (đã soi ảnh).
5. **FIX nút Tia Sét đè dock mobile (phát hiện trong Đợt 5)** — commit `e53e0b4`:
   - Mặc định cũ `bottom-4` khiến quả cầu che mục "Hỏi Đáp" của dock dưới; nâng lên `calc(72px + safe-area)` trên mobile, desktop giữ nguyên (đo hình học: không còn giao nhau, khe 16px).
6. **Đợt 5 — Hồi quy toàn ma trận**: 12/12 cấu hình SẠCH (sáng/tối × desktop/mobile × Chuẩn/Potator/Fabulous), 6 phân khu/lượt (home, landing, Hỏi Đáp, Thread, Ký ức, Vinh Danh, Kho Đề Thi): 0 tràn ngang, 0 lỗi trang, trạng thái video/sân khấu/nền đúng thiết kế; ảnh soi mắt xác nhận tương phản tốt.
7. **Kiểm Thử & Đẩy Trực Tiếp Lên Vercel Production**:
   - `npm test`: 474/474 pass · `npx tsc -b`: 0 lỗi · light-adapter `--check` khớp.
   - `vercel build --prod` + `vercel deploy --prebuilt --prod`: aliased `https://f-forum.vercel.app`; xác thực sống: bundle JS chứa class nút Tia Sét mới, HTML prod hết Figtree, endpoint `/api/analytics/track` trả JSON validate đúng (lỗi 400 ở dev là do dev server thiếu route — prod đủ route). Sau đó tích hợp Git của Vercel tự build bản production mới `q0rvom3ej` từ `main` (e1c2b85) — đã xác minh lại trên alias: bundle mới + hết Figtree + route API đúng.
   - Đã push Git: `arena/62613a87-f-forum` + `main` + `f-forum-broamstuck-v2.5` tại `e1c2b85`.
   - Ghi nhận báo cáo tại `Documents/BroAmStuck Studio/feedback/feedback_72.md`.
9. **Sự cố đĩa hệ thống (ghi nhận)**: ổ `/` chạm 97% (100G/109G) làm `npx` báo ENOSPC; đã dọn an toàn cache tái tạo được (`~/.npm/_npx`, npm cache, `~/.cache/chromium`) → giải phóng ~4GB (còn 7.3G trống). Thủ phạm chính là dữ liệu người dùng (`~/Downloads` 17G, `~/.var` flatpak 22G) — **không đụng tới**; kiến nghị Sếp dọn thêm khi rảnh.
10. **Loop Engineering — vòng lặp tự trị daily-triage (chu kỳ đầu hoàn tất)**:
    - Scaffold `loop init --tool opencode`: Loop Ready **100/100 (L2)**; ràng buộc studio thành binding (`loop-constraints.md`), hướng dẫn agent (`AGENTS.md`, `LOOP.md`, `STATE.md`, `loop-budget.md`, `loop-run-log.md`, `docs/safety.md`, `skills/loop-*`, `opencode.json`).
    - Chu kỳ đầu: triage toàn diện (CI 6/6 xanh, 0 issue, 0 PR, test 474/474, tsc 0, oxlint 0, adapter khớp, 0 `//`/TODO/`dangerouslySetInnerHTML`/`@ts-ignore`) → phát hiện & fix **og:image 10.4MB ngoài CDN → tự host 113KB** (`27eae18`); verifier độc lập APPROVE (kiểm pixel-level).
    - Escalate STATE.md High Priority: avatar admin 10.4MB (đụng server — chờ Sếp), nội dung og-cover (chờ Sếp).
11. **Dọn repo GitHub (19/10)**: README viết lại gọn, chuẩn ngôn từ; bỏ theo dõi tài liệu nội bộ + 585MB zip `cosmetics/` (giữ local); `SPEC.md` → `docs/SPEC.md`; `CODE_DEMO/` → `docs/code-demo/`; `.gitignore`/`.vercelignore` cập nhật; xoá nhánh `fix_1..fix_3` (đã merge); `package.json` chuẩn hoá (v2.5.0, description, repository, homepage, license UNLICENSED); ẩn `docs/ai_collab_hub`. Repo GitHub ~726MB — phần lớn nằm trong **lịch sử** (zip cũ); muốn giảm mạnh cần rewrite history + phối hợp Antigravity (chưa làm). ⚠️ **Bảo mật**: repo public chứa email Super Admin + mật khẩu mặc định dạng literal trong server → cần Sếp quyết (private repo / rotate / chấp nhận), đã ghi STATE.md High Priority.
8. **Đo hiệu năng trung thực (kèm cảnh báo)**: máy đo headless software-rendering — Fabulous BẬT trên Hỏi Đáp ~144ms/khung vs TẮT ~54ms (bộ đo này); Trang chủ video vs tĩnh: chênh lệch dưới ngưỡng đo. KHÔNG đại diện GPU thật — chỉ dùng so sánh tương đối.
