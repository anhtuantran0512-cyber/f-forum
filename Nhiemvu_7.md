---

# 🛠️ UPDATE DIRECTIVE: "PROJECT SIGNATURE v1.1" — FIX & POLISH PASS

## [ROLE]
Bạn là Senior Frontend Engineer kiêm Motion Designer. Nhiệm vụ: fix các lỗi animation còn thô, redesign toàn bộ hệ thống Rank/Shop/Profile theo chuẩn **Premium Brand Identity**, loại bỏ hoàn toàn cảm giác "nhựa, làm cho có". Mọi thứ phải mang **chất riêng của server**, tuân thủ **Color Theory** nghiêm ngặt.

---

## 🔦 TASK 1 — FIX FLASHLIGHT BEAM EFFECT (ĐÈN PIN)

### Vấn đề hiện tại:
Hiệu ứng ánh sáng hiện đi theo chuột nhưng chỉ là **1 chấm tròn cố định kích thước**, không có cảm giác thật của đèn pin.

### Yêu cầu kỹ thuật chính xác (Physics-based Flashlight Beam):
1. **Nguồn sáng (Light Source):** Xuất phát từ vị trí icon đèn pin (điểm cố định), KHÔNG xuất phát từ vị trí con trỏ chuột.
2. **Hình dạng chùm sáng (Beam Shape):** Phải là hình **nón/phễu (cone)** thật sự:
   - Tại điểm gốc (sát đèn pin): độ rộng chùm sáng = độ rộng vật lý của icon đèn pin (hẹp).
   - Càng xa nguồn sáng: chùm sáng càng **mở rộng dần (diverging)**, giống tia sáng thật chiếu ra xa.
   - Con trỏ chuột chỉ quyết định **góc chiếu (angle)** của chùm sáng, không quyết định kích thước vùng sáng.
3. **Kỹ thuật implement đề xuất:** Dùng `clip-path: polygon()` động (tính toán 3 điểm: 1 điểm tại nguồn, 2 điểm mở rộng tại vị trí xa theo hướng chuột) kết hợp `radial-gradient` để làm mềm viền sáng (soft falloff), tránh viền cứng như hình tam giác thô.
4. **Hiệu ứng ánh sáng thật:** Thêm `filter: blur()` nhẹ ở viền chùm sáng + lớp `radial-gradient` trắng-vàng nhạt dần từ tâm ra viền để mô phỏng độ sáng giảm dần tự nhiên.
5. **Giữ lại & tối ưu:** Hiệu ứng chuyển cảnh sang "bầu trời sao + trăng" khi bật đèn pin — đây là ý tưởng hay, chỉ cần làm **transition mượt hơn** (dùng `transition`/easing phù hợp, tránh giật cảnh đột ngột).
6. **Logic soi sáng mật khẩu:** Ký tự mật khẩu chỉ hiện rõ khi nằm trong vùng hình nón ánh sáng (dùng `mask-image` trùng với `clip-path` của chùm sáng).

---

## 🚪 TASK 2 — AUTH SUCCESS/LOGOUT ANIMATION (STICKMAN DOOR ENTRANCE)

### Đăng nhập/Đăng ký thành công:
- Hiển thị animation nhân vật dạng **Stickman cách điệu** (có thể thêm chi tiết nhỏ như mũ, balo sách để mang "chất học sinh") đi bộ từ mép màn hình **đi vào** một cánh cửa, cửa mở ra rồi khép lại, kèm hiệu ứng ánh sáng hắt ra từ khe cửa khi nhân vật bước vào.
- Thời lượng animation: 1.5-2 giây, không gây cảm giác chờ đợi khó chịu.

### Đăng xuất:
- **Không dùng lại animation giống hệt lúc đăng nhập.** Sáng tạo kịch bản ngược lại nhưng khác biệt: ví dụ nhân vật Stickman **đi RA từ cửa**, quay lại vẫy tay, cửa đóng lại, có thể kèm hiệu ứng ánh đèn trong phòng tắt dần (fade to dark) tạo cảm giác "kết thúc phiên làm việc" thay vì chỉ tua ngược animation đăng nhập.

---

## 🏅 TASK 3 — HỆ THỐNG 30 DANH HIỆU (RANK/TITLE SYSTEM)

Thiết kế lại hoàn chỉnh **30 danh hiệu**, từ `Học Sinh` → `Chuyên Gia`, theo tiến trình hợp lý (không khoa trương, không đặt tên sến/quá đà kiểu "Thần Thánh Tối Cao").

**Yêu cầu bắt buộc:**
1. Mỗi danh hiệu có **1 icon riêng biệt**, thiết kế theo **1 hệ ngôn ngữ hình khối thống nhất** (progression rõ ràng: hình khối càng phức tạp/tinh xảo khi rank càng cao).
2. Icon phải có **animation nhẹ khi hiển thị** (hover hoặc khi đạt được lần đầu) — không phải ảnh tĩnh.
3. Tên danh hiệu phải **thực tế, gắn với hành trình học tập** (gợi ý nhóm: Khởi đầu → Chăm chỉ → Kiên trì → Xuất sắc → Chuyên gia), tự đặt tên cụ thể cho từng bậc sao cho tạo được bản sắc riêng của server, tránh trùng với tên rank phổ biến ở game khác.
4. Phân chia theo *Rarity Tier* (tham khảo hệ thống đã thống nhất ở bản trước: Common → Rare → Epic → Legendary) để tạo động lực phấn đấu.

---

## 🛍️ TASK 4 — REDESIGN TOÀN BỘ SHOP (35 VẬT PHẨM MỚI)

Thiết kế lại từ đầu **35 vật phẩm**, áp dụng nguyên tắc đã thống nhất trước đó:
1. **Ngắn gọn:** Mỗi vật phẩm chỉ cần tên + icon + 1 dòng mô tả ngắn (dùng Tooltip cho chi tiết, không hiển thị mặc định).
2. **Không khoa trương:** Tránh đặt tên/mô tả phóng đại, giữ tông giọng gần gũi, phù hợp môi trường học đường.
3. **Chất riêng của server:** Vật phẩm nên liên quan đến chủ đề học tập/tập trung (ví dụ: khung avatar theo mùa thi, hiệu ứng trang trí góc học tập, theme màu Focus Room độc quyền...) — tự sáng tạo danh sách cụ thể, phân bổ hợp lý theo các nhóm (Khung Avatar / Hiệu ứng / Theme màu / Vật phẩm trang trí Profile...).
4. Mỗi item redesign phải có **icon đồng bộ phong cách** với hệ thống Rank ở Task 3 (dùng chung 1 Design Language).

---

## 👤 TASK 5 — REDESIGN TOÀN BỘ GUI HỒ SƠ CÁ NHÂN (PREMIUM PROFILE OVERHAUL)

### 5.1 Khu vực chỉ số thành tích (Điểm số / Cảm ơn / Hay nhất / 5 sao / Xác thực / Đã giúp):
- Thiết kế lại hoàn toàn theo dạng **Stat Card Premium** (không liệt kê dạng danh sách khô khan như hiện tại).
- Mỗi chỉ số có **icon riêng + animation đếm số (count-up animation)** khi load trang.
- Bố cục dạng **Bento Grid** (kích thước card khác nhau theo độ quan trọng của chỉ số), tạo điểm nhấn thị giác thay vì dàn hàng đều nhàm chán.

### 5.2 Các khu vực: Hồ sơ / Thẻ F-Pass / Boutique / Hoạt động / F-ID:
- **Rút gọn nội dung chữ** tối đa theo nguyên tắc UX Writing Diet đã thống nhất.
- Redesign từng card/khung nhỏ theo phong cách **đồng nhất 1 hệ thống duy nhất** (cùng border-radius, cùng kiểu shadow, cùng khoảng cách spacing) để tổng thể trang Profile trông như 1 sản phẩm liền mạch, không phải ghép rời từng mảng.
- Đảm bảo **đầy đủ chức năng thật** đằng sau mỗi khu vực — nếu phát hiện phần nào đang chỉ là UI tĩnh chưa có logic, phải bổ sung logic thật, không được để trống rỗng.

### 5.3 Nguyên tắc tổng thể bắt buộc cho toàn bộ Profile:
- Tuân thủ nghiêm ngặt **Color Theory** (tối đa 1 màu chủ đạo + 1 màu nhấn + thang màu trung tính, tránh phối màu đối chọi gây rối mắt).
- Loại bỏ hoàn toàn cảm giác "nhựa" (generic UI kit mặc định) — mọi border, shadow, spacing phải được tinh chỉnh thủ công cho phù hợp bản sắc riêng.

---

## 🧭 TASK 6 — CẬP NHẬT NAVBAR

1. Mục **"Trang chủ"** → chuyển thành **chỉ icon** (Home icon), bỏ chữ.
2. Mục **"Phòng chat"** → đổi tên hiển thị thành **"Chat"**.
3. Mục **"Câu lạc bộ"** → đổi tên hiển thị thành **"Club"**.
4. Đảm bảo khi chỉ còn icon (mục Trang chủ), vẫn có **Tooltip hiển thị khi hover** để không gây khó hiểu cho người dùng mới.

---

## 🔁 [SELF-CRITIQUE LOOP — BẮT BUỘC TRƯỚC KHI HOÀN THÀNH]

Trước khi chốt, tự kiểm tra:
1. *"Chùm sáng đèn pin đã thực sự có hình nón mở rộng theo khoảng cách chưa, hay vẫn chỉ là hình tròn đổi tên?"*
2. *"30 danh hiệu + 35 vật phẩm có bị trùng ý tưởng/tên gọi với nhau không?"*
3. *"Nếu bỏ logo server đi, nhìn vào trang Profile này có còn nhận ra đây là sản phẩm của BroAmStuck không, hay giống mọi template Dashboard khác?"*
4. *"Toàn bộ text đã đủ ngắn gọn chưa, hay vẫn còn đoạn nào dài dòng sót lại?"*

Nếu còn vấn đề ở bất kỳ câu nào → tự quay lại sửa trước khi xuất kết quả cuối.

---

## 📤 [OUTPUT FORMAT]
1. Code fix hiệu ứng đèn pin (kèm giải thích công thức tính toán hình nón)
2. Code animation Stickman đăng nhập/đăng xuất (2 kịch bản riêng biệt)
3. Danh sách đầy đủ 30 Danh hiệu (tên + mô tả icon + rarity tier)
4. Danh sách đầy đủ 35 Vật phẩm Shop (tên + mô tả icon + nhóm phân loại)
5. Code redesign GUI Profile hoàn chỉnh
6. Code cập nhật Navbar
7. Bản tự đánh giá (Self-Critique Loop)