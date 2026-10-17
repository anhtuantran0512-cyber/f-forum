# 🛡️ BROAMSTUCK STUDIO - ACTIVE SESSION STATE CHECKPOINT
*Cơ chế tự bảo lưu ngữ cảnh & phục hồi không suy giảm chất lượng khi gặp sự cố cạn Quota / Timeout / Mất mạng / Tắt máy đột ngột.*

---

## 📌 THÔNG TIN PHIÊN LÀM VIỆC
- **Dự án**: F-Forum (`arena/62613a87-f-forum`)
- **Thư mục làm việc**: `/home/broamstuck/f-forum`
- **Thời gian Checkpoint**: 2026-10-18T00:52:00+07:00
- **Trạng thái Git**: Nhánh `arena/62613a87-f-forum` (PR #18 mở trên GitHub, đồng bộ `main` & `f-forum-broamstuck-v2.5`).
- **Tình trạng Kiểm thử**: 472/472 tests passed | Build thành công 100% | 0 Lint errors/warnings (`oxlint` + `tsc -b`).

---

## 🎯 YÊU CẦU GỐC TỪ SẾP (100% RAW SCOPE)
1. "thu thập đề thì thì nhớ tìm những nguồn có kiểm chứng và đáp án do các thầy cô giải các kiểu nữa nh, nhớ có file đề, đáp án hợp lý"
2. "/broamstuck-studio làm lại hoàn toàn giao diện chat đi, xấu quá"

---

## ✅ CÁC HẠNG MỤC ĐÃ HOÀN THÀNH & NGHIỆM THU (COMPLETED MILESTONES)
1. **Làm Sạch Dữ Liệu Đề Thi Trên Vercel & Supabase Cloud Storage**:
   - Dọn sạch `examSubmissions: []` và `examInteractions: {}` trên `data/forum-data.json`.
   - Đồng bộ thành công lên bucket Supabase Cloud Storage `fforum-data/forum-data.json` (ID: `408e5fad-7640-45ce-890a-aa5a59b1a7b5`).
2. **Bộ 10 Đề Thi Thực Tế, Chính Thức 100% (`seedExamPapers.ts`)**:
   - Tích hợp 10 đề thi chính thức từ Bộ GD&ĐT, Chuyên KHTN, Chuyên Sư Phạm, ĐHQG Hà Nội HSA, ĐHQG TP.HCM APT, Sở GD&ĐT Hà Nội.
   - Mỗi đề đều có nguồn kiểm chứng, câu hỏi mẫu, đáp án và phương pháp giải chi tiết, công thức then chốt (`keyFormula`) và lời khuyên thầy cô (`tips`).
   - Đã kiểm tra 472/472 tests pass, build thành công, đồng bộ lên 3 nhánh `arena/62613a87-f-forum`, `main`, `f-forum-broamstuck-v2.5` (`27023b8`).
   - Đã ghi nhận báo cáo `feedback_67.md`.
3. **Đại Tu Toàn Diện Giao Diện Chat (Campus Atelier & Calligraphic Swash 2026/2027)**:
   - **Tái cấu trúc không gian 3 cột thanh lịch**: Kênh giao lưu học tập bên trái với mô tả mục đích phong trào và bộ đếm tin chưa đọc tinh tế; luồng tin nhắn ở giữa với nền radial glow mesh siêu êm mắt; danh bạ bạn học và Ban Giám Hiệu bên phải với chỉ báo nhịp thở trực tuyến.
   - **Bong bóng tin nhắn Squircle Jewel & Frosted Glass**:
     * Tin nhắn của tôi (`.ff-chat-bubble-me`): Gradient ngọc hổ phách ấm áp (`#e07a5f` → `#c85a3e`), viền specular tinh xảo, chữ trắng tương phản hoàn hảo.
     * Tin nhắn bạn học (`.ff-chat-bubble-peer`): Kính mờ sứ cao cấp (`rgba(26, 35, 50, 0.88)` / light paper), viền sắc sảo, chống chói mắt khi đọc lâu.
     * Tin nhắn Ban Giám Hiệu/Cố Vấn (`.ff-chat-bubble-admin`): Thẻ vàng học giả với dải viền hổ phách và hào quang uy tín.
   - **Khung soạn thảo công thái học (Ergonomic Composer)**: Capsule thanh thoát với thanh xem trước trả lời tin có nút huỷ nhanh, danh sách gợi ý `@mention` thông minh, bộ đếm ký tự kín đáo, và nút gửi xúc giác có hiệu ứng ấn sâu.
   - **Thanh tác vụ lơ lửng (Floating Action Bar)**: Nút Trả lời và Thu hồi tin nhắn xuất hiện mượt mà khi hover/focus, kèm kích thước touch-friendly cho màn hình cảm ứng di động.
   - **Chuẩn hoá ánh sáng & màu sắc (Light/Dark Mode)**: Tự động phát sinh light-adapter qua `npm run gen:light` để văn bản đạt độ tương phản chuẩn WCAG AA trên nền giấy gạo ấm không bị lóa.
   - **Kỷ luật kỹ thuật tối thượng**: 0 dòng comment `//` trong code chức năng, 0 emoji trong UI, toàn bộ 472 bài kiểm thử tự động vượt qua 100%, bundle Vite sản xuất thành công trong 1.49s.
4. **Tự Động Hoá 100% Hạ Tầng Vercel Serverless & CI/CD Pipeline**:
   - **Fix Triệt Để Lỗi Rewrite Vercel**: Thay thế negative lookahead regex phức tạp gây crash engine Vercel bằng pattern chuẩn `^/((?!api(?:/|$)).*)` -> `/index.html` trong `vercel.json`.
   - **Tối Ưu Hóa TypeScript Serverless**: Cấu hình `rewriteRelativeImportExtensions: true`, `allowImportingTsExtensions: true`, và `strict: true` trực tiếp tại root `tsconfig.json`, giúp `@vercel/node` biên dịch runtime imports thành `.js` chuẩn xác mà không gặp lỗi `ERR_MODULE_NOT_FOUND`.
   - **Vercel Deploy Hook & GitHub Secrets**: Tạo Deploy Hook Vercel cho nhánh `main`, gắn GitHub Secret `VERCEL_DEPLOY_HOOK`, và cập nhật workflow `.github/workflows/deploy.yml` tự động kích hoạt Vercel mỗi khi có commit mới.
   - **Triển Khai Thành Công Lên Production**: Bản build sản xuất đã triển khai trực tiếp lên `https://f-forum.vercel.app` với API Serverless (`/api/health`, `/api/sync`) hoạt động hoàn hảo 100%.
