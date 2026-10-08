# 🛡️ BROAMSTUCK STUDIO - ACTIVE SESSION STATE CHECKPOINT
*Cơ chế tự bảo lưu ngữ cảnh & phục hồi không suy giảm chất lượng khi gặp sự cố cạn Quota / Timeout / Mất mạng / Tắt máy đột ngột.*

---

## 📌 THÔNG TIN PHIÊN LÀM VIỆC
- **Dự án**: F-Forum (Arena / BroAmStuck v2.5)
- **Thư mục làm việc**: `/home/broamstuck/f-forum`
- **Thời gian Checkpoint**: 2026-10-08T08:35:00+07:00
- **Trạng thái Git**: Đồng bộ hoàn toàn trên cả 2 nhánh `main` và `f-forum-broamstuck-v2.5` (Commit `0cfa97a`).
- **Tình trạng Kiểm thử**: 225/225 tests passed | Build thành công 100% | 0 Lint errors/warnings.

---

## 🎯 YÊU CẦU GỐC TỪ SẾP (100% RAW SCOPE)
1. Cấu trúc và nâng cấp Studio toàn diện: workflow, tận dụng 100% kho 330+ skills và repos cần thiết, phối hợp Antigravity & Freebuff song song.
2. Cơ chế tự động bảo lưu trạng thái: Khi cạn quota, timeout, mất mạng, tắt máy đột ngột, Studio phải lưu lại toàn bộ tiến độ, phiên sau mở lên là tiếp tục ngay mà không suy giảm chất lượng.
3. Hoàn thiện toàn bộ các tính năng lớn từ `code_yeucau.md` và `nhiemvuchinh.md` (Coin system, Shop 3D, Lò Coin streak lửa, Navbar giọt nước, Godray gradient, Q&A toán học, Số chạy scramble...).

---

## ✅ CÁC HẠNG MỤC ĐÃ HOÀN THÀNH & NGHIỆM THU (COMPLETED MILESTONES)
1. **User Profile Card Facebook-like**:
   - Khung thẻ cá nhân `ProfileModal.tsx` với Avatar, Role Badge, Bio.
   - Thanh 6 chỉ số thành tích (Điểm số, Cảm ơn, Hay nhất, 5 Sao, Xác thực, Đã giúp).
   - Danh hiệu của bạn + Túi đồ ảo Chill Box + Kệ sách chia sẻ bài đọc.
   - Biểu đồ mạng nhện đa giác 5 trục (KHTN, KHXH, Ngoại Ngữ, Nghệ Thuật, KHCN) tích hợp bằng `recharts`.
   - Lịch sử hoạt động dạng tabs (Câu hỏi & Câu trả lời).
2. **Sidebar Bảng Xếp Hạng & CTA**:
   - Widget "THÀNH VIÊN HĂNG HÁI NHẤT" lọc theo ngày/tuần, hiển thị Top 5 kèm ghim tài khoản cá nhân.
   - Nút Call-To-Action "ĐẶT CÂU HỎI" màu vàng cam rực rỡ bo góc 8px.
3. **Màn hình Loading Chuẩn Y Tế (CodeFronts la-08)**:
   - Component `PageResourceLoader.tsx` với thẻ lịch quét ngày và nhịp tim ECG 60bpm.
4. **Sửa Lỗi Giao Diện Light Mode & Click Profile**:
   - Khôi phục độ trong suốt của Liquid Glass trên nền sáng, giữ chữ màu `#101827` tương phản cao.
   - Khắc phục sự kiện click Avatar trong Chat & Q&A để mở Context Menu (Trang cá nhân / Tố cáo).
5. **Backend & Test Suite 225/225**:
   - Khắc phục test 9d (phần thưởng phiên tập trung 25 phút).
   - Đảm bảo 225/225 tests xanh mượt.
6. **Đồng Bộ Hoá Server Chính**:
   - Fast-forward và push đồng bộ lên cả 2 nhánh `main` và `f-forum-broamstuck-v2.5` trên GitHub.
7. **Hạ Tầng Đồng Bộ Song Song Antigravity & Freebuff**:
   - Khởi tạo `.agents/rules/studio-sync-protocol.md` và `docs/STUDIO_SYNC.md`.

---

## ⏳ CÁC HẠNG MỤC TIẾP TỤC TRIỂN KHAI (PENDING ROADMAP & BACKLOG)

### Đợt 1: Trải Nghiệm Giao Diện Cốt Lõi & Navbar Giọt Nước
- [ ] **Liquid Navbar**: Animation giọt nước trượt theo tab đang chọn, hiệu ứng tuồn ra từ pill.
- [ ] **Setting Điều Khiển Navbar**:
  - Tự động ẩn: Chuột rời 1 giây tự ẩn, đưa chuột lại gần hiện ra.
  - Hoán đổi vị trí (Swap position): Trái, Phải, Dưới, Trên.
- [ ] **Tối Ưu Hoá Settings**: Gộp thanh chỉnh SFX & Giảm chuyển động thành 1 dòng; gộp cỡ chữ & độ mờ kính.
- [ ] **Dọn Dẹp Text Rác**: Xóa các chuỗi "f-forum v3.0 coin era", "apple ios liquid glass"; chuẩn hóa thông báo nội quy nhà trường.

### Đợt 2: Kinh Tế Học F-Forum (Coin, Q&A, Điểm Danh Streak)
- [ ] **Hệ Coin Thống Nhất**: Thay thế toàn bộ hiển thị XP bằng Coin. Người dùng mới tặng 100 Coin.
- [ ] **Tiền Cược Q&A**: Cho phép đặt cược 10-100 Coin khi hỏi. Đáp án chuẩn: Người giải nhận 50% + 100 Coin danh dự, 50% thuế hệ thống.
- [ ] **Lò Coin Học Đường**: Widget streak ngọn lửa cháy động (animated SVG lửa + aura), chu kỳ 7 ngày, hiệu ứng nổ Coin khi nhận.
- [ ] **Q&A Pro**: Upload ảnh tối đa 20MB kèm thanh nhập liệu 38 ký tự toán học (√, π, ∑, ∫, ≤, ≥, α, β...).

### Đợt 3: Đồ Họa 2026, Shop 3D & Trang Giới Thiệu
- [ ] **8 Danh Hiệu Học Sinh Việt Nam**: (Học Sinh -> Học Sinh Giỏi -> Học Sinh Xuất Sắc -> Thông Thái -> Tài Năng -> Thiên Tài -> Bậc Thầy -> Chuyên Gia) với 8 icon SVG độc bản tự vẽ 100%.
- [ ] **Shop 3D Holographic**: Thẻ bài 3D phản chiếu ánh sáng khi rê chuột, 12 vật phẩm SVG vẽ tay phân theo thang màu Xanh lá -> Xanh dương -> Đỏ -> Tím.
- [ ] **Trang Giới Thiệu**: Hiệu ứng số chạy lộn xộn rồi khóa số (Slot Counter scramble) + chữ gradient bay vào.
- [ ] **Godray Gradients**: 6 preset ánh sáng hào quang toàn trang (lấy cảm hứng từ Grainient).

---

## 🔄 KỊCH BẢN PHỤC HỒI TỰ ĐỘNG (FAIL-SAFE RESUME RECIPE)
Nếu phiên bị ngắt do bất kỳ nguyên nhân nào (cạn quota, timeout, shutdown máy):
1. **Bước 1**: Khi mở session mới, Agent lập tức đọc file `docs/STUDIO_CHECKPOINT.md` này.
2. **Bước 2**: Chạy kiểm tra nhanh `git status` và `npm test` để xác nhận working tree sạch.
3. **Bước 3**: Tiến hành thực thi tiếp ngay lập tức từ **Đợt 1** (Liquid Navbar & Tối ưu Settings).
4. **Bước 4**: Sau mỗi đợt, chạy kiểm thử, commit, cập nhật lại Checkpoint này và push lên GitHub.
