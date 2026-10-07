# TÀI LIỆU ĐẶC TẢ & BẢN PROMPT TOÀN DIỆN CHO AI ARENA / KỸ SƯ PHÁT TRIỂN
## HỆ THỐNG TRANG CÁ NHÂN (PROFILE), TỐ CÁO VI PHẠM, BẢNG XẾP HẠNG & HIỆU ỨNG THIẾT KẾ ĐẲNG CẤP F-FORUM

---

### MỤC TIÊU DỰ ÁN
Xây dựng và nâng cấp toàn diện cơ chế **Trang cá nhân (User Profile Modal)** thế hệ mới phong cách mạng xã hội học tập sáng tạo, tích hợp cơ chế **Tố cáo người dùng vi phạm gửi trực tiếp về Gmail Super Admin (`anhtuantran0512@gmail.com`)**, **Bảng xếp hạng thành viên hăng hái nhất**, cùng bộ hiệu ứng UI/UX cao cấp chuẩn CodeFronts (Healthcare Loading, Like Heart Button, Magnetic Mercury Ripple Button, Metallic Gold Shimmer, và Staggered Grid Reveal).

---

## I. KIẾN TRÚC TƯƠNG TÁC TẠI MỤC CHAT & CÁC VÙNG TRÊN HỆ THỐNG

### 1. Tương tác khi click vào Avatar hoặc Tên người dùng trong Chat / Forum
Khi người dùng bấm vào ảnh đại diện hoặc tên của:
- **Người dùng khác**
- **Bản thân người dùng**
- **Admin diễn đàn**
- **Menu tài khoản (ProfileDropdown) trên thanh điều hướng Navbar**

Hệ thống lập tức hiển thị Popover / Modal điều hướng với 2 lựa chọn chiến lược:
1. **Trang Cá Nhân (Profile Modal)**:
   - Mở cửa sổ hồ sơ cá nhân đầy đủ của người được bấm (hoặc của chính mình).
   - Hiển thị toàn bộ thông tin, danh hiệu, cấp độ, coin, túi đồ ảo Chill Box, biểu đồ radar 5 trục thế mạnh và lịch sử giải đáp.
2. **Tố Cáo Tài Khoản Vi Phạm (Report User)**:
   - Mở modal biểu mẫu tố cáo vi phạm chuyên nghiệp.
   - Các trường dữ liệu: Đối tượng tố cáo, Danh mục vi phạm (Toxic/Gây war, Spam/Lừa đảo, Nội dung phản cảm, Gian lận điểm/Hack Coin, Khác), Chi tiết chứng cứ (textarea kèm maxLength=500).
   - Khi gửi: Bắn dữ liệu về endpoint `POST /api/reports`, lưu trữ dữ liệu tại server `server/forumServer.ts`, phát thông báo hệ thống qua WebSocket (`NEW_REPORT`), và thông báo gửi trực tiếp về Gmail Admin: **`anhtuantran0512@gmail.com`**.

---

## II. ĐẶC TẢ CHI TIẾT GIAO DIỆN HỒ SƠ CÁ NHÂN (USER PROFILE CARD)

### A. Khối Đầu Trang (Header Thông Tin Cá Nhân)
- **Ảnh đại diện (Avatar)**: Hình vuông bo góc 2xl (`rounded-2xl`) viền phát sáng cyan/amber kèm TierBadge cấp độ ở góc dưới.
- **Tên hiển thị & Huy hiệu nhóm**:
  - Tên tài khoản in đậm màu xanh dương đặc trưng `#0284C7`.
  - Icon giá sách/tủ sách màu nâu gỗ cạnh tên.
  - Role Badge: Viên thuốc bo tròn nền xanh ngọc (`#0D9488` / `#14B8A6`), chữ trắng in hoa (ví dụ: `👤 INTERVIEWER TEAM` hoặc `👤 SUPER ADMIN TEAM`).
- **Châm ngôn cá nhân (Bio)**: Dòng chữ nghiêng màu xám thanh lịch: `❝ TG_Call me went you need :D ❞`.
- **Thanh 6 Chỉ Số Thành Tích Nhanh (Stats Grid)**:
  1. **Điểm số**: Nhãn "Điểm số", icon chữ H hai màu vàng - xanh kèm chỉ số XP.
  2. **Cảm ơn**: Nhãn "Cảm ơn", icon trái tim đỏ ❤️ kèm số lượt tim nhận được.
  3. **Hay nhất**: Nhãn "Hay nhất", icon ngôi sao vàng ⭐ kèm số câu trả lời hay nhất.
  4. **5 Sao**: Nhãn "5 Sao", icon ngôi sao lớn ★ kèm số đánh giá 5 sao.
  5. **Xác thực**: Nhãn "Xác thực", icon dấu tích xanh lục ✔ kèm số bài kiểm duyệt.
  6. **Đã giúp**: Nhãn "Đã giúp", icon hai người bạn màu xanh lam 👥 kèm số học sinh đã được hỗ trợ.
- **Nút Thả Tim Hồ Sơ (LikeHeartButton)**:
  - Hiệu ứng tim nảy lò xo (`tb-11-pop`), 8 tia hạt sáng bùng nổ xoay tròn (`tb-11-spark`), bộ đếm lật số mượt mà khi bấm like.

### B. Khối Danh Hiệu & Túi Đồ Ảo (Badges & Chill Box)
- **DANH HIỆU CỦA BẠN**:
  - Tiêu đề in hoa đậm kèm icon `Award`.
  - Huy hiệu chính tròn viền đôi xanh lục + nhánh mầm 3 lá xòe màu xanh lục (`🌱`) + nhãn danh hiệu "Tích Cực".
  - Lưới hiển thị tất cả các huy hiệu hệ thống (Tích Cực, Tiên Phong, Cố Vấn Tri Thức, Học Bá F-Forum, Đại Sứ Tri Thức, Thần Đồng FPT).
- **CHILL BOX (Kho Đồ Trang Bị Ảo)**:
  - Hiển thị danh sách vật phẩm ảo dạng ô mini bo góc (`ac-01__card`) có hiệu ứng Staggered Entrance Reveal:
    - Vật phẩm 1: Ruy băng tròn hồng đính ngọc quý (`🎀`), badge số lượng `x1`.
    - Vật phẩm 2: Ruy băng tròn đính huy hiệu thiền tâm linh (`🏵️`), badge số lượng `x1`.
    - Vật phẩm 3: Bút chì khởi đầu (`✏️`), badge số lượng `x1`.
    - Vật phẩm 4: Thẻ thư viện đọc sách (`🔖`), badge số lượng `x1`.
- **KỆ SÁCH CÁ NHÂN**:
  - Tiêu đề `KỆ SÁCH`, mô tả: *"Đọc sách gì hay, chia sẻ ngay cùng cộng đồng Hoidap247!"*.
  - Nút bấm *"Viết chia sẻ"* màu xanh dương `#0284C7`.

### C. Khối Biểu Đồ Mạng Nhện (Radar Spider Chart)
- **Tiêu đề**: `CÁC MÔN ĐÃ GIÚP ĐỠ BẠN BÈ`.
- **Cột trái (Biểu đồ Radar đa giác SVG 5 đỉnh trục)**:
  - 5 đỉnh trục: **KHTN** (Đỉnh trên), **KHXH** (Đỉnh phải), **Ngoại Ngữ** (Đáy phải), **Nghệ Thuật** (Đáy trái), **KHCN** (Đỉnh trái).
  - Vùng phủ dữ liệu: Đa giác viền vàng kim `#EAB308`, đổ màu xanh ngọc biển nhạt `rgba(14, 165, 233, 0.25)`, các đỉnh trục có chấm tròn xanh cyan `#06b6d4`.
- **Cột phải (Danh sách môn học chi tiết)**:
  - Khoa Học Tự Nhiên (KHTN): Toán Học (1), Hóa Học (1).
  - Khoa Học Xã Hội (KHXH): Ngữ Văn (21), Địa Lý (1).
  - Khoa Học Công Nghệ (KHCN): Tin Học (15), Công Nghệ (1).
  - Ngoại Ngữ & Nghệ Thuật: Tiếng Anh (2), Âm Nhạc / Hội Họa (1).

### D. Thông Tin Hoạt Động & Lịch Sử Câu Trả Lời
- **Metadata tài khoản**: Ngày tham gia: `10/07/2022` | Tuổi F-Forum: `4 năm` | Link liên kết: `Xem thêm thông tin` | Số câu trả lời: `40` | Cảnh báo: `0`.
- **Tab chuyển đổi hoạt động**: Gồm nút `[Câu hỏi]` và `[Câu trả lời]`.
- **Danh sách lịch sử câu trả lời**:
  - `ID câu hỏi: 4292916 08:30:28 07/12/2022`: "1 B cây bưởi to tướng do ông trồng thuộc giống bưởi ngon ngọt nổi tiếng / 2 C Bắt sâu tưới nước..."
  - `ID câu hỏi: 5352240 07:32:46 05/12/2022`: "xôn xao là từ láy (1 phần nguyên âm và phụ âm láy như nhau) / lúng túng là từ ghép..."
  - `ID câu hỏi: 5350818 07:31:19 05/12/2022`: "Trong cuộc đời mỗi con người, chúng ta chắc hẳn luôn có những người bạn giúp chúng ta vượt qua những khó khăn..."
  - `ID câu hỏi: 5351042 07:24:31 05/12/2022`: "Để tối ưu hóa truy vấn SQL và giải bài tập thuật toán: Sử dụng chỉ mục B-Tree..."

---

## III. WIDGET SIDEBAR: BẢNG XẾP HẠNG & NÚT ĐẶT CÂU HỎI

### A. Widget Bảng Xếp Hạng: "THÀNH VIÊN HĂNG HÁI NHẤT"
- Khung chứa bo tròn 3xl, kính mờ tối màu sang trọng.
- Tiêu đề: Chữ in hoa màu xanh dương `#0284C7` kèm gạch chân gradient phát sáng.
- Bộ lọc thời gian: Dropdown hình viên thuốc (Trong ngày ▾ / Trong tuần / Tất cả).
- Danh sách 5 vị trí dẫn đầu: Avatar tròn, tên tài khoản, điểm số in đậm.
- Vị trí người dùng hiện tại (Current User Pin): Box nổi bật màu xanh `#0284C7`, gắn avatar và điểm số của người dùng.
- Link chân trang: "Xem thêm ➔" mở trực tiếp Profile người đứng đầu.

### B. Widget Kêu Gọi Đặt Câu Hỏi (Call To Action)
- Tiêu đề: *"Bạn muốn hỏi điều gì?"*.
- Mô tả: Hỗ trợ giải đáp bài tập toán, lý, hóa, văn, ngoại ngữ, IT trong 5 phút.
- Nút bấm chính: **`MagneticButton`** hiệu ứng rực rỡ vàng cam `#EAB308 – #F59E0B`, chữ đen in hoa đậm: **`💬? ĐẶT CÂU HỎI`**, có hiệu ứng nam châm hút chuột và ripple tỏa tròn từ điểm click.

---

## IV. CÁC HIỆU ỨNG THIẾT KẾ & CODEFRONTS ADAPTATION

1. **Healthcare Appointment Confirmation Loading Animation (`.la-08`)**:
   - Tấm lịch quét ngày (`.la-08__cal`), ô chọn số 12, con dấu hoàn tất tick xanh (`.la-08__seal`), dòng điện tim ECG 72 bpm chạy đều bên dưới.
   - Cơ chế kiểm soát: Chỉ đóng sau khi kiểm tra xong `document.readyState === 'complete'` và nạp đủ font chữ hệ thống.
2. **Tailwind Like Heart Button (`.tb-11`)**:
   - Phản hồi lò xo (`animate-tb11-pop`), 8 tia hạt nổ (`animate-tb11-spark`), cuộn số đếm lật.
3. **Tailwind Magnetic Mercury Ripple Button (`.tb-15`)**:
   - Đọc tọa độ con trỏ pointer, tạo vệt sáng thủy ngân bóng bẩy và gợn sóng bung tỏa khi nhấn chuột.
4. **Metallic Gold Text Gradient Effect (`.tg-10`)**:
   - Gradient vàng kim đa điểm phản xạ ánh sáng kim loại (`tg-10-shimmer`).
   - Ứng dụng trong mục Bảng giá: Toàn bộ gói thành viên F-Pass mở **Miễn Phí 100% (0₫ / Trọn đời)**.
   - Góc ủng hộ donate: Tích hợp hình ảnh mã VietQR chuyển tiền `public/chuyentien.jpeg`, Số tài khoản `87905122009`, Chủ tài khoản `TRAN VAN ANH TUAN`.
5. **Staggered Grid Entrance Reveal (`.ac-01`)**:
   - Hiệu ứng xuất hiện so le 90ms giữa các thẻ thẻ bài vật phẩm và câu trả lời.
