# Kiến Trúc Giao Diện F-Forum — Hệ Thống 10 Phong Cách Thiết Kế (UI/UX Overhaul 2026)

Tài liệu này mô tả bản phác thảo kiến trúc (wireframe) và lý do lựa chọn từng phong cách trong **10 Phong Cách Thiết Kế Chủ Đạo** cho từng phân khu chức năng của F-Forum, đảm bảo:
1. **Không trùng lặp vô hồn**: Mỗi khu vực (Q&A, Thread, Club, Chat, Home) mang một cấu trúc hình học, chất liệu bề mặt và nhịp điệu thị giác riêng biệt đúng với bản chất sử dụng.
2. **Nhất quán toàn hệ thống**: Liên kết bằng quy tắc màu **60-30-10 Eye-Safe Warm Dark Mode** (`#0b0d12` / `#151a26` / `#f4f1de` / `#e07a5f` / `#81b29a` / `#f2cc8f`), hệ thống font phân cấp (`Fraunces` Serif + `Plus Jakarta Sans` + `JetBrains Mono`) và tương tác vật lý **Tactile Squishy UI**.

---

## 1. Bảng Phân Phối 10 Phong Cách Theo Từng Khu Vực

| # | Phong cách thiết kế | Vai trò trong hệ thống | Khu vực áp dụng chính |
|---|---|---|---|
| **1** | **Typography-Led** | Tiêu đề Serif (`Fraunces`) cỡ lớn, câu dẫn bài viết (pull-quote), độ rộng dòng đọc chuẩn `65ch` | Tiêu đề trang, Tiêu đề câu hỏi Q&A, Câu dẫn mở đầu Thread, Tên CLB |
| **2** | **Bento Grid + Community Cards** | Bố cục lưới bất đối xứng phân tách dữ liệu cộng đồng rõ ràng | Sảnh Chính (`HomeView`), Lưới 4 Lĩnh Vực & Thẻ CLB (`ClubsView`), Thống kê |
| **3** | **Neo-Brutalism** | Góc vuông sắc nét (`6px`), viền dày (`2px solid`), bóng đổ lệch cứng (`4px 4px 0px #04060a`), tag phân loại | Sàn Hỏi Đáp Học Thuật (`QAForumView`), Tag môn học, Ô đếm lời giải |
| **4** | **Glassmorphism + Depth Layering** | Kính mờ đa lớp (`backdrop-filter: blur(18px)`), viền phản quang cạnh trên, tạo chiều sâu | Phòng Đàm Thoại (`ChatView`), `Navbar`, `ChatDock`, Modal, Popover |
| **5** | **Kinetic Typography + Scroll Story** | Gạch chân co giãn theo con trỏ, dịch chuyển chữ mượt bằng GPU `transform`/`opacity` | Danh sách câu hỏi Q&A, Tiêu đề bài viết Thread, Thẻ CLB |
| **6** | **Sci-Fi Gradient + Dark Mode Default** | Nền tối ấm bảo vệ mắt (`#0b0d12`), quầng sáng aurora tinh tế, thanh tiến độ phát sáng nhẹ | Toàn bộ nền hệ thống, Thanh năng lượng XP, Kênh Chat đang hoạt động |
| **7** | **Raw Aesthetic (Monospace + Grid Exposed)** | Lưới kỹ thuật lộ thiên, đường kẻ đứt nét (`dashed`), thông tin hệ thống bằng `JetBrains Mono` | Thanh Telemetry đầu bảng Q&A & Chat, `#ID` bài viết, Bộ đếm, Bảng xếp hạng |
| **8** | **Tactile Maximalism (Squishy UI)** | Nút bấm có độ nổi vật lý, bóng đổ rõ, hiệu ứng lún (`scale(0.97) translate3d`) khi nhấn | Toàn bộ nút tương tác: Đăng bài, Giải bài, Thả cảm xúc, Tham gia CLB, Gửi tin |
| **9** | **Holographic / Iridescent Accent** | Ánh kim đa sắc tiết chế (chỉ xuất hiện ở phần tử thật sự đặc biệt) | Huy hiệu **Đã giải**, **Đáp án chuẩn**, **Bài viết đáng đọc**, **CLB tiêu biểu tháng**, **Admin** |
| **10** | **Organic + Hand-drawn Accents** | Nét vẽ tay SVG lượn sóng, viền khâu chỉ đứt nét, góc sổ tay Zine bất đối xứng, bảng màu ấm | Sổ tay Góc Tâm Sự (`ThreadsView`), 4 Lĩnh vực CLB (`ClubsView`), Trạng thái trống |

---

## 2. Phác Thảo Kiến Trúc (Wireframes) & Lý Giải Từng Khu Vực

### Khu Vực A: Sàn Hỏi Đáp Học Thuật (`QAForumView.tsx`)
**Phong cách phối hợp**: `#3 Neo-Brutalism` + `#7 Raw Aesthetic (Exposed Grid)` + `#1 Typography-Led` + `#8 Tactile Squishy` + `#9 Holographic Solved`

```text
+-----------------------------------------------------------------------------------+
| ZONE // 01_ACADEMIC_QA | DISPLAY_NODES // 12 CÂU | SOLVED // 08/12 | POOL // +240C | <- #7 Raw Telemetry Strip
+-----------------------------------------------------------------------------------+
| [?] Hỏi Đáp Bài Tập  [12 câu · 8 đã giải]       [Đã lưu] [Mới nhất v] [+ ĐẶT CÂU HỎI] | <- #1 Serif + #8 Tactile CTA
| ~~~~~~~~~~~~~~~~~~~ (Nét vẽ tay SVG)                                              |
| [Tất cả] [Toán] [Lý] [Hóa] [Sinh] [Văn] [Anh] [Sử] [Địa] [Tin học]                | <- #3 Neo-Brutalist Tags
+-----------------------------------------------------------------------------------+
| CỘT CHÍNH (8/12): DANH SÁCH CÂU HỎI                 | CỘT PHỤ (4/12): BẢNG XẾP HẠNG |
| +-----------+-------------------------------------+ | +-------------------------+ |
| |   #01     | [TOÁN] [✦ Đã giải] [ID:9F2A1]  [Lưu]| | | BẢNG XẾP HẠNG HỌC TẬP   | |
| |           |                                     | | | [Học chăm] [Giải bài]   | |
| | +-------+ | Cách biện luận số nghiệm phương     | | | #1 Minh Anh    14h 20p  | |
| | |  2/3  | | trình chứa tham số bằng đồ thị?     | | | #2 Hoàng Nam   11h 05p  | |
| | |ĐÃ GIẢI| | Em đang vướng ở bước cô lập m...    | | +-------------------------+ |
| | +-------+ | - - - - - - - - - - - - - - - - - - | |                             |
| |   +20C    | (@) Minh Khoa · 10p trước  [2/3 ->] | |                             |
| |           | [✦ Đáp án chuẩn: Cô lập m về vế...] | |                             |
| +-----------+-------------------------------------+ |                             |
+-----------------------------------------------------------------------------------+
```
* **Vì sao phù hợp**: Hỏi đáp bài tập cần sự minh bạch, kỷ luật và quét thông tin cực nhanh. Cột trái lộ lưới kỹ thuật (`#01`, ô đếm `2/3 LỜI GIẢI`, thưởng `+20C`) giúp học sinh nhận diện ngay câu nào đang cần giải gấp; cột phải dùng font Serif cỡ lớn giúp đề bài nổi bật, dễ đọc.

---

### Khu Vực B: Góc Tâm Sự — Sổ Tay Zine Cộng Đồng (`ThreadsView.tsx`)
**Phong cách phối hợp**: `#1 Typography-Led` + `#10 Organic + Hand-drawn Accents` + `#5 Kinetic Typography` + `#8 Tactile Squishy` + `#9 Holographic Spotlight`

```text
+-----------------------------------------------------------------------+
| ZINE // ISSUE 2026 · EDITORIAL DIARY           LIVE_STREAM · 18 BÀI   | <- #7 Zine Masthead
| Góc Tâm Sự  (18 bài · 42 phản hồi)             [Tìm bài viết, #tag…]  | <- #1 Poster Serif
| [Mới nhất] [Sôi nổi] [Có ảnh] [Đã lưu] [Của tôi]                      |
| Xu hướng: [#HọcTập 8] [#TâmSựĐêm 5] [#TìmĐồngĐội 4]                   |
| +-------------------------------------------------------------------+ |
| | [✦ ĐÁNG ĐỌC] Minh Anh: “Đêm trước kỳ thi thử…”          Mở đọc -> | | <- #9 Holographic Spotlight
| +-------------------------------------------------------------------+ |
+-----------------------------------------------------------------------+
| || (@) Hoàng Anh  [✦ Nổi bật] [Lv.12] · 15 phút trước · #4A9C         | <- Góc sổ tay Zine (4px 18px 16px 4px)
| ||                                                                    |    + Gáy sách đóng sổ bên trái
| || “Có những buổi chiều ngồi lại thư viện một mình mới thấy…”         | <- #1 Câu dẫn Fraunces Serif
| || Hôm nay mình vừa hoàn thành xong đề cương môn Lý, cảm giác nhẹ     |
| || nhõm hẳn. Chúc cả trường tuần ôn thi thật bình tĩnh nhé! #HọcTập   |
| || - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  |
| || [♥ 6] [☺ 2] [🔥 4]       [Phản hồi 3] [Chia sẻ lại] [Đọc chi tiết] | <- #8 Nút bấm Squishy + Modal Đọc
+-----------------------------------------------------------------------+
```
* **Vì sao phù hợp**: Góc Tâm Sự là nơi chia sẻ cảm xúc, câu chuyện đời thường. Thay vì đóng khung cứng như bảng bài tập, mỗi thẻ bài viết được thiết kế như một trang sổ tay Zine với gáy màu ấm bên trái, miếng dán washi-tape phía trên, câu mở đầu bằng chữ Serif truyền cảm hứng và hộp thoại **Đọc chi tiết** dành riêng cho các mạch chuyện dài.

---

### Khu Vực C: Quảng Trường Câu Lạc Bộ (`ClubsView.tsx`)
**Phong cách phối hợp**: `#2 Bento Grid + Community Cards` + `#10 Organic + Hand-drawn Accents` + `#9 Holographic Spotlight` + `#1 Typography-Led`

```text
+-----------------------------------------------------------------------------------+
| [Trophy] Câu Lạc Bộ  [8 CLB hoạt động]          [Tìm tên CLB...] [+ Đăng ký CLB]  |
| +-------------------+ +-------------------+ +-------------------+ +-------------+ |
| | Công nghệ     [3] | | Nghệ thuật    [2] | | Thể thao      [2] | | Học thuật[1]| | <- #2 Bento + #10 Doodle SVG
| | Lập trình & AI ~  | | Âm nhạc & Vẽ   ~  | | Vận động & Giải ~ | | Nghiên cứu ~| |
| +-------------------+ +-------------------+ +-------------------+ +-------------+ |
+-----------------------------------------------------------------------------------+
| [✦ CLB TIÊU BIỂU THÁNG] [Công nghệ]                                               | <- #9 Holographic Banner
| CLB Lập Trình & AI Trẻ — “Biến ý tưởng thành sản phẩm thực tế”     [Tham gia] [Xem]|
+-----------------------------------------------------------------------------------+
| +---------------------------------------+ +-------------------------------------+ |
| | [Ảnh bìa CLB]      | CLB Nhiếp Ảnh    | | [Ảnh bìa CLB]    | CLB Bóng Rổ      | | <- Container Query Bento Cards
| | 42 thành viên      | “Lưu giữ thanh   | | 64 thành viên    | “Cháy hết mình   | |
| |                    |  xuân qua ống…”  | |                  |  trên sân đấu”   | |
| |                    | [Tham gia] [Xem] | |                  | [Tham gia] [Xem] | |
| +---------------------------------------+ +-------------------------------------+ |
+-----------------------------------------------------------------------------------+
```
* **Vì sao phù hợp**: Khu vực CLB cần thể hiện sức sống đa dạng của các nhóm sở thích. Lưới Bento 4 lĩnh vực kèm minh họa nét vẽ tay giúp học sinh khám phá nhanh theo cá tính, trong khi thẻ CLB tự co giãn theo `@container ff-media` giúp hiển thị cân đối trên mọi kích thước màn hình.

---

### Khu Vực D: Phòng Đàm Thoại Thời Gian Thực (`ChatView.tsx` & `ChatDock.tsx`)
**Phong cách phối hợp**: `#4 Glassmorphism + Depth Layering` + `#6 Sci-Fi Gradient + Dark Mode` + `#7 Raw Monospace Telemetry` + `#8 Tactile Squishy`

```text
+-----------------------------------------------------------------------------------+
| CỘT KÊNH (3/12 Kính mờ) | SẢNH TIN NHẮN TRUNG TÂM (6/12 Kính mờ)  | THÀNH VIÊN (3) |
| +---------------------+ | +-------------------------------------+ | +-----------+ |
| | # PHÒNG CHAT [4 KÊNH| | | CHANNEL // #SANH-CHUNG · ● SYNC:LIVE| | | THÀNH VIÊN| | <- #7 Telemetry Bar
| |                     | | +-------------------------------------+ | |           | |
| | [●] Sảnh Chung   24 | | | ● #Sảnh Chung                24 tin | | | [✦ ADMIN] | | <- #9 Holographic Admin
| |     Trò chuyện chung| | +-------------------------------------+ | | BroAmStuck| |
| | [ ] Học Tập & Thi 12| | | (@) Minh Khoa [Lv.8] · 21:14        | | |           | |
| | [ ] Giải Trí & CLB 9| | | +---------------------------------+ | | | HỘI VIÊN  | |
| | [ ] Góp Ý & Báo Lỗi | | | | Có ai đang giải đề Toán số 3    | | | | ● Lan Anh | |
| |                     | | | | câu 45 không cho mình hỏi với!  | | | | ● Tuấn Vũ | |
| | +-----------------+ | | | +---------------------------------+ | | +-----------+ |
| | | (@) Bạn • Lv.14 | | | |                                     | |               |
| | +-----------------+ | | | +---------------------------------+ | |               |
| +---------------------+ | | | [Nhắn tin vào #Sảnh Chung...] [>| | |               | <- #4 Floating Glass Dock
|                         | | +---------------------------------+ | |               |
|                         | +-------------------------------------+ |               |
+-----------------------------------------------------------------------------------+
```
* **Vì sao phù hợp**: Trò chuyện trực tiếp đòi hỏi chiều sâu không gian và sự tập trung vào luồng tin nhắn đang trôi. Việc dùng **Glassmorphism đa lớp (`ff-chat-glass-sidebar`, `ff-chat-glass-stage`, `ff-chat-floating-composer`)** kết hợp thanh trạng thái `CHANNEL // SYNC: LIVE` tạo cảm giác một trạm liên lạc hiện đại, tách biệt rõ với mặt phẳng giấy/bảng của Thread và Q&A.
