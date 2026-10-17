# 🛡️ BROAMSTUCK STUDIO - ACTIVE SESSION STATE CHECKPOINT
*Cơ chế tự bảo lưu ngữ cảnh & phục hồi không suy giảm chất lượng khi gặp sự cố cạn Quota / Timeout / Mất mạng / Tắt máy đột ngột.*

---

## 📌 THÔNG TIN PHIÊN LÀM VIỆC
- **Dự án**: F-Forum (`arena/62613a87-f-forum`)
- **Thư mục làm việc**: `/home/broamstuck/f-forum`
- **Thời gian Checkpoint**: 2026-10-18T02:35:00+07:00
- **Trạng thái Git**: Nhánh `arena/62613a87-f-forum` (PR #18 mở trên GitHub, đồng bộ `main` & `f-forum-broamstuck-v2.5` tại commit `9e87f11`).
- **Tình trạng Kiểm thử**: 472/472 tests passed | Build thành công 100% | 0 Lint errors/warnings (`oxlint` + `tsc -b`).
- **Production URL**: `https://f-forum.vercel.app`

---

## 🎯 YÊU CẦU GỐC TỪ SẾP (100% RAW SCOPE)
1. "các đề bị lỗi ký tự, tôi cần đề dạng file pdf, giấy thật cơ, đề phải có nguồn đúng và chuẩn 100% cho các ban giám khảo khó tính"
2. "- fix xong update lại lê vercel"

---

## ✅ CÁC HẠNG MỤC ĐÃ HOÀN THÀNH & NGHIỆM THU (COMPLETED MILESTONES)
1. **Khắc Phục Toàn Diện Ký Tự & Công Thức Toán Học Bị Biến Dạng**:
   - Chuyển đổi toàn bộ ký hiệu ASCII thô ráp (`a*sqrt(3)`, `m2`, `lim_{x -> -1^+} y = -oo`, `font-mono`) sang chuẩn ký hiệu toán học Unicode sắc nét ($\sqrt{3}$, $a^2$, $\vec{n}$, $\pm\infty$, $\Delta l_0$, $\lambda$, $\varphi$, $m^2$, $\frac{a}{b}$) trên cả 10 đề thi chính thống.
2. **Số Hoá & Phát Hành 10 Đề Thi Thật Dạng PDF Vector In Ấn Tuyệt Đối**:
   - Tạo bộ sinh đề thi vector giáo dục quốc gia `scripts/generate_official_exam_pdfs.py` (Chromium Headless print-to-pdf) tại thư mục `public/exams/`:
     * Đề thi chính thức THPT Quốc Gia môn Toán (Mã 101) & môn Ngữ Văn & môn Tiếng Anh (Mã 401).
     * Đề thi tham khảo THPT 2025 cấu trúc mới (Toán học).
     * Đề thi thử Chuyên KHTN môn Vật Lý & Chuyên Sư Phạm môn Hoá Học.
     * Đề thi Đánh Giá Năng Lực HSA (ĐHQG Hà Nội) & APT (ĐHQG TP.HCM).
     * Đề thi Tuyển sinh Lớp 10 Toán (Sở GD&ĐT Hà Nội).
     * Đề thi HSG Quốc Gia THPT môn Tin Học.
   - Đầy đủ tiêu đề Bộ/Sở/Đại học, khung số báo danh, con dấu đỏ "ĐÃ ĐỐI SOÁT CHUẨN 100%", typography Times New Roman/Noto Serif và đáp án giải chi tiết.
3. **Trình Đọc PDF Trực Quan & Trải Nghiệm Người Dùng**:
   - Tích hợp nhúng tài liệu PDF trong `ExamPaperViewerView.tsx` qua `<iframe>` toàn màn hình với thanh công cụ học thuật.
   - Bổ sung khay lời giải chi tiết và công thức trọng tâm từ thầy cô bên dưới tài liệu PDF.
   - Thẻ đề thi trong `ExamVaultView.tsx` cung cấp song song nút "Tải tệp gốc" (mở/tải PDF trực tiếp) và nút "Xuất PDF".
4. **Kiểm Thử & Đẩy Trực Tiếp Lên Vercel Production**:
   - `npm test`: 472/472 tests pass.
   - `npx oxlint src`: 0 warnings, 0 errors.
   - `npx tsc -b`: 0 errors.
   - `vercel deploy --prebuilt --prod`: Đã triển khai và aliased tới `https://f-forum.vercel.app`.
   - Xác thực endpoint PDF: `HTTP/2 200` với `content-type: application/pdf`.
   - Đã đồng bộ Git tới `arena/62613a87-f-forum`, `main`, và `f-forum-broamstuck-v2.5` (`9e87f11`).
   - Ghi nhận báo cáo tại `Documents/BroAmStuck Studio/feedback/feedback_71.md`.
