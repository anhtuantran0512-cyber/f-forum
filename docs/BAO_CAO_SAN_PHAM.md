# BÁO CÁO SẢN PHẨM PHẦN MỀM
## ĐỀ TÀI: F-FORUM — NỀN TẢNG DIỄN ĐÀN HỌC THUẬT, TỰ HỌC TẬP TRUNG VÀ KẾT NỐI CỘNG ĐỒNG HỌC ĐƯỜNG

---

## I. THÔNG TIN TỔNG QUAN SẢN PHẨM

- **Tên sản phẩm**: F-Forum (Diễn đàn Học thuật & Cộng đồng Học sinh)
- **Loại hình sản phẩm**: Ứng dụng Web toàn diện (Full-stack Real-time Web Application) hoạt động đa nền tảng trên máy tính và thiết bị di động.
- **Đối tượng sử dụng**: Học sinh THCS/THPT, Ban chủ nhiệm các câu lạc bộ học thuật, Giáo viên cố vấn và Ban quản trị nhà trường.
- **Định hướng cốt lõi**: Xây dựng môi trường trao đổi học tập có cấu trúc, kết hợp cơ chế trò chơi hóa (Gamification) mang bản sắc văn hóa Việt Nam (*Hệ thống cấp bậc Tre Việt*) và công cụ tự học tập trung nhằm nâng cao tinh thần tự giác học tập của học sinh.

---

## II. ĐẶT VẤN ĐỀ VÀ LÝ DO CHỌN ĐỀ TÀI

### 1. Thực trạng học tập và trao đổi trực tuyến của học sinh hiện nay
Trong bối cảnh chuyển đổi số giáo dục, học sinh có nhu cầu rất lớn trong việc hỏi bài, thảo luận kiến thức ngoài giờ học và sinh hoạt câu lạc bộ. Tuy nhiên, phần lớn học sinh đang phải sử dụng các nền tảng mạng xã hội hoặc ứng dụng nhắn tin đại chúng (Facebook, Messenger, Zalo, Discord). Thực tế này dẫn đến 5 vấn đề lớn:

1. **Thất lạc tri thức và khó tra cứu lại**: Trong các nhóm chat, câu hỏi và lời giải bị trôi liên tục theo dòng tin nhắn hàng ngày. Học sinh khóa sau hoặc các bạn có cùng thắc mắc không thể tìm lại lời giải cũ theo từng môn học hay chuyên đề.
2. **Thiếu công cụ soạn thảo khoa học chuyên biệt**: Các mạng xã hội giải trí không hỗ trợ thanh ký hiệu Toán học, Vật lý, Hóa học ($\sqrt{x}, \int, \Delta, \pi, \Rightarrow, \dots$), khiến học sinh phải chụp ảnh viết tay mờ nhòe hoặc diễn đạt công thức khó hiểu.
3. **Môi trường gây xao nhãng cao**: Khi mở mạng xã hội để hỏi một bài tập, học sinh dễ bị cuốn vào luồng video ngắn, tin tức giải trí hoặc quảng cáo, làm giảm hiệu suất tự học.
4. **Thiếu cơ chế ghi nhận và tạo động lực**: Những học sinh tích cực giải bài giúp bạn bè không được ghi nhận thành tích lâu dài, dẫn đến việc phong trào hỗ trợ học tập trong trường nhanh chóng lắng xuống.
5. **Khó khăn trong công tác kiểm duyệt học đường**: Các bình luận spam, trả lời đối phó để lấy điểm hoặc ngôn từ thiếu chuẩn mực rất khó kiểm soát nếu thiếu bộ lọc tự động và công cụ quản trị tập trung.

### 2. So sánh với các giải pháp hiện có

| Tiêu chí | Nhóm Chat (Zalo / Messenger) | Web hỏi đáp đại trà | **Nền tảng F-Forum** |
| :--- | :--- | :--- | :--- |
| Phân loại môn học & tìm kiếm | Không có (trôi tin nhắn) | Có phân loại môn học | **Có phân loại 9 môn, lọc trạng thái, độ khó, mức thưởng & lưu bài** |
| Công cụ gõ ký hiệu Toán - Lý - Hóa | Không hỗ trợ | Hạn chế / khó dùng trên điện thoại | **Thanh ký hiệu khoa học trực quan, chèn 1 chạm** |
| Tương tác thời gian thực (Real-time) | Nhanh nhưng thiếu cấu trúc | Tải lại trang thủ công | **Đồng bộ tức thời qua WebSocket (Hỏi đáp, Chat, Thông báo)** |
| Động lực học tập (Gamification) | Không có | Điểm số đơn điệu | **Hệ thống 8 bậc "Tre Việt", XP, Coin, Nhiệm vụ ngày, Chuỗi ngày học** |
| Phòng tự học tập trung (Pomodoro) | Không có | Không có | **Tích hợp đồng hồ Pomodoro, thống kê giờ học & âm thanh tập trung** |
| Kiểm duyệt nội dung & An toàn | Thủ công hoàn toàn | Nhiều câu trả lời rác / quảng cáo | **Kiểm duyệt liên quan đề bài phía máy chủ + Hệ thống báo cáo Quản trị** |

### 3. Mục tiêu và tính mới của sản phẩm
- **Mục tiêu học thuật**: Tổ chức kho tri thức hỏi - đáp rõ ràng, mỗi câu hỏi mở ra một trang làm việc chuyên biệt, tách biệt rõ *Lời giải hay nhất* và *Câu trả lời từ cộng đồng*.
- **Mục tiêu giáo dục & tâm lý**: Biến việc giải bài tập và tự học mỗi ngày thành thói quen tích cực thông qua chuỗi ngày hoạt động (Streak), bảng xếp hạng tiến độ tuần và biểu đồ năng lực 6 trục.
- **Tính mới về kỹ thuật**: Ứng dụng cơ chế **Chất lượng đồ họa thích ứng (Adaptive Quality Engine)** giúp giao diện hiện đại, giàu hiệu ứng nhưng vẫn vận hành mượt mà trên cả máy tính cấu hình thấp và điện thoại học sinh.

---

## III. KIẾN TRÚC HỆ THỐNG, CÔNG NGHỆ VÀ NGÔN NGỮ LẬP TRÌNH

### 1. Kiến trúc tổng thể
F-Forum được thiết kế theo kiến trúc **Client – Server kết hợp truyền thông thời gian thực hai chiều (Hybrid REST API + WebSocket)**:
- **Tầng Giao diện (Client Tier)**: Ứng dụng trang đơn (SPA) viết bằng React 19 và TypeScript, quản lý trạng thái tập trung tại `forumStore`, tự động đồng bộ hóa giữa bộ nhớ đệm cục bộ (`SafeStorage`) và máy chủ.
- **Tầng Dịch vụ & Thời gian thực (Application & Real-time Tier)**: Máy chủ Node.js xử lý các tuyến REST API bảo mật và duy trì kênh WebSocket (`ws`) để đẩy sự kiện tức thời (`NEW_QUESTION`, `NEW_SOLUTION`, `AWARD_BEST_SOLUTION`, `CHAT_MESSAGE`, `NEW_REPORT`, `USER_UPDATED`).
- **Tầng Xử lý Đa phương tiện & Lưu trữ (Media & Persistence Tier)**: Đường ống xử lý ảnh kết hợp tiền xử lý phía trình duyệt (`Canvas Unsharp Mask` & cắt bố cục 3×3) với thư viện `Sharp` phía máy chủ để nén ảnh chuẩn `.webp`, xóa siêu dữ liệu vị trí (EXIF) và lưu trữ bền vững.

### 2. Ngôn ngữ lập trình và Công nghệ sử dụng

| Phân lớp | Công nghệ / Thư viện | Phiên bản | Vai trò trong sản phẩm |
| :--- | :--- | :--- | :--- |
| **Ngôn ngữ chính** | **TypeScript** | `~6.0.2` | Kiểm tra kiểu tĩnh toàn diện cho cả Frontend và Backend, ngăn ngừa lỗi dữ liệu lúc chạy. |
| **Ngôn ngữ kịch bản** | **JavaScript (ESNext / ESM)** | ES2024 | Viết các kịch bản kiểm thử tự động, công cụ sinh giao diện sáng/tối và xử lý đa phương tiện. |
| **Giao diện (UI Core)** | **React & React DOM** | `^19.2.8` | Xây dựng giao diện hướng thành phần, tải lười (`lazy`/`Suspense`) và kết xuất cửa sổ độc lập (`createPortal`). |
| **Định kiểu & Thẩm mỹ** | **Tailwind CSS + CSS3** | `^4.3.3` | Thiết kế giao diện đáp ứng đa màn hình, hiệu ứng kính mờ (Liquid Glass) và hệ thống chủ đề Sáng/Tối tự động. |
| **Biểu tượng & Phông chữ** | **Lucide React & Geist Mono** | `^1.48.0` | Hệ thống biểu tượng vector sắc nét và phông chữ kỹ thuật hỗ trợ hiển thị số liệu, công thức rõ ràng. |
| **Đóng gói & Phát triển** | **Vite** | `^8.3.0` | Máy chủ phát triển tốc độ cao (HMR) và đóng gói phân mảnh mã nguồn (Code-splitting) cho môi trường thực tế. |
| **Máy chủ & Thời gian thực** | **Node.js HTTP + `ws`** | `^8.22.0` | Xử lý REST API nghiệp vụ và đồng bộ hóa dữ liệu thời gian thực qua giao thức WebSocket. |
| **Xử lý hình ảnh** | **Sharp + HTML5 Canvas** | `^0.34.5` | Xóa EXIF, nén và xuất 3 kích cỡ ảnh (`thumb`, `medium`, `original`) định dạng `.webp` chuẩn bộ nhớ đệm bất biến. |
| **Mã hóa & Bảo mật** | **Node `crypto.scrypt` + `bcryptjs`** | `^3.0.3` | Băm mật khẩu một chiều kèm muối ngẫu nhiên, ký xác thực phiên đăng nhập và bảo vệ tài khoản Quản trị viên. |
| **Kiểm tra mã nguồn** | **Oxlint & Node Test Runner** | `^1.81.0` | Phân tích tĩnh mã nguồn tốc độ cao (0 lỗi, 0 cảnh báo) và chạy hơn 30 bộ kiểm thử tích hợp tự động. |

### 3. Các giải pháp kỹ thuật nổi bật trong sản phẩm
1. **Hệ thống Đồ họa Thích ứng 3 Cấp độ (3-Tier Adaptive Quality Architecture)**:
   - Tự động đo lường số nhân CPU (`hardwareConcurrency`), bộ nhớ (`deviceMemory`), trình kết xuất đồ họa và tùy chọn giảm chuyển động (`prefers-reduced-motion`) để phân loại thiết bị thành **Tier A (Cao)**, **Tier B (Trung bình)** và **Tier C (Tiết kiệm)**.
   - Tự động tạm dừng các video/hoạt ảnh nằm ngoài vùng nhìn thấy (`IntersectionObserver`) hoặc khi người dùng chuyển tab trình duyệt (`Page Visibility API`), đảm bảo tốc độ khung hình ổn định như các nền tảng lớn (Discord, Facebook).
2. **Bảo mật đa tầng (Defense-in-Depth)**:
   - **Xác thực**: Cookie phiên `HttpOnly; SameSite` chống đánh cắp qua mã độc kịch bản, kết hợp cơ chế tự làm mới phiên ngầm (`/api/auth/refresh`) giúp học sinh không bị văng phiên khi đang soạn lời giải dài.
   - **Chống tấn công mạng**: Chính sách bảo mật nội dung (CSP) nghiêm ngặt, kiểm tra nguồn gốc kết nối WebSocket (chống CSWSH), giới hạn tần suất đăng nhập sai theo cả địa chỉ IP và tài khoản (Rate Limiting), làm sạch toàn bộ chuỗi văn bản và đường dẫn đa phương tiện.

---

## IV. CÁC CHỨC NĂNG CHI TIẾT CỦA SẢN PHẨM

### 1. Phân hệ Diễn đàn Hỏi Đáp Học Thuật (Q&A Forum)
- **Tạo câu hỏi theo quy trình 3 bước rõ ràng**:
  - *01 · Thông tin cơ bản*: Chọn môn học (Toán, Vật Lý, Hóa Học, Sinh Học, Ngữ Văn, Tiếng Anh, Lịch Sử, Địa Lý, Tin Học), mức độ khó và mức thưởng Coin (từ 10 đến 500 Coin).
  - *02 · Nội dung chi tiết*: Nhập tiêu đề, đề bài chi tiết và đính kèm hình ảnh chụp bài tập.
  - *03 · Công cụ hỗ trợ*: Gắn thẻ từ khóa (`#tags`) và chèn nhanh các ký hiệu Toán - Lý - Hóa từ thanh công cụ chuyên dụng.
- **Trang Câu Hỏi Chuyên Biệt Toàn Màn Hình (Dedicated Full-Page Question View)**:
  - Khi bấm vào câu hỏi, hệ thống mở trang câu hỏi riêng phủ toàn bộ màn hình với bố cục 2 cột rộng rãi (`1380px`).
  - **Cột chính**: Hiển thị đầy đủ đề bài, ảnh đính kèm (hỗ trợ phóng to toàn màn hình), danh sách lời giải được phân tách trực quan giữa **Lời giải hay nhất** (viền lục bảo kèm huy hiệu chứng nhận) và **Các câu trả lời từ cộng đồng**, cùng khung soạn thảo lời giải có tính năng **tự động lưu nháp** theo từng câu hỏi.
  - **Cột phụ**: Hiển thị bảng tóm tắt trạng thái câu hỏi, mức thưởng Coin/XP, danh sách **Câu hỏi cùng môn học** để học sinh luyện tập thêm và **Bảng xếp hạng học tập**.
- **Cơ chế bình chọn & Trao thưởng minh bạch**:
  - Học sinh có thể bình chọn hữu ích (Upvote) cho các lời giải chất lượng.
  - Người đặt câu hỏi hoặc Quản trị viên có thể chọn **1 Lời giải hay nhất duy nhất**; hệ thống lập tức chuyển thưởng Coin và điểm XP cho tác giả lời giải và phát thông báo thời gian thực.
- **Kiểm duyệt lời giải thông minh phía máy chủ**:
  - Tự động phát hiện và từ chối các câu trả lời spam ký tự vô nghĩa, quá ngắn hoặc hoàn toàn không liên quan đến môn học/câu hỏi, nhưng tuyệt đối không tự ý xóa các lời giải học thuật có lập luận riêng của học sinh.

### 2. Phân hệ Bảng tin Cộng đồng (Threads) & Trò chuyện Thời gian thực (Live Chat)
- **Bảng tin Threads học đường**:
  - Đăng bài chia sẻ kinh nghiệm ôn thi, sơ đồ tư duy, tài liệu học tập kèm hình ảnh và thẻ chủ đề.
  - Hỗ trợ 5 sắc thái tương tác học đường (*Thả tim, Vui vẻ, Nhiệt huyết, Tiếp năng lượng, Đồng cảm*), bình luận phản hồi, đăng lại bài viết kèm trích dẫn (Repost) và lưu bài viết quan trọng.
- **Phòng Trò chuyện Chung (Chat View) & Cửa sổ Chat Thu gọn (Chat Dock)**:
  - Nhắn tin trao đổi tức thời qua WebSocket, hỗ trợ gửi hình ảnh, trả lời trực tiếp từng tin nhắn, xem hồ sơ nhanh của người gửi và thu hồi tin nhắn vi phạm.

### 3. Phân hệ Không gian Tự học (Focus Sanctuary), Câu lạc bộ (Clubs) & Khu Vinh Danh
- **Phòng tự học Pomodoro (Focus Sanctuary)**:
  - Cung cấp bộ đếm thời gian tập trung (Pomodoro) kết hợp ghi nhận **Số giờ tự học thực tế** vào hồ sơ cá nhân.
  - Tích hợp trình phát âm thanh nền thư giãn (Chill Box / tiếng mưa, thư viện, sóng âm tập trung) giúp học sinh duy trì sự tập trung cao độ.
- **Câu lạc bộ Học đường (Clubs)**:
  - Không gian sinh hoạt cho các câu lạc bộ (Tin học, Tiếng Anh, Khoa học tự nhiên, Văn học, Kỹ năng...), hỗ trợ đăng thông báo nội bộ và kết nối thành viên cùng đam mê.
- **Khu Vinh Danh (Chronicles / Hall of Fame)**:
  - Trưng bày trực quan bằng mô hình cầu 3D (Fibonacci Sphere) ghi nhận các cột mốc phát triển và những gương mặt học sinh tiêu biểu của diễn đàn.

### 4. Phân hệ Trò chơi hóa (Gamification), Hồ sơ Năng lực & Cửa hàng Vật phẩm (Boutique)
- **Hệ thống 8 Cấp bậc "Tre Việt"**:
  - Lấy cảm hứng từ hình tượng cây tre Việt Nam kiên cường, học sinh thăng cấp qua 8 bậc: **Mầm Tre → Búp Măng → Tre Non → Tre Xanh → Tre Phong Sương → Trúc Quân Tử → Kim Trúc → Đại Ngàn Vĩnh Cửu**.
- **Nhiệm vụ hằng ngày & Chuỗi ngày học tập (Daily Quests & Fire Streak)**:
  - Tích hợp trong nút truy cập nhanh hình tia sét (có thể kéo thả vị trí linh hoạt trên màn hình), khuyến khích học sinh duy trì chuỗi ngày học tập liên tục.
- **Hồ sơ Năng lực Cá nhân (User Profile)**:
  - Hiển thị 6 chỉ số học tập cốt lõi, **Biểu đồ Radar 6 trục (Spider Chart)** phân tích năng lực đóng góp, kệ trưng bày huy hiệu (Trophy Shelf) sắp xếp theo độ hiếm.
  - Hỗ trợ **Ảnh bìa cá nhân phủ toàn khung dọc** kèm công cụ kéo-cắt bố cục lưới 3×3 trực quan như Facebook.
- **Cửa hàng Trang trí (Boutique) & Tủ đồ Cá nhân**:
  - Học sinh sử dụng Coin kiếm được từ việc giải bài để sưu tầm **Viền đại diện (Khung / Hào quang động)** và **Bảng tên (Nameplate)** phân theo 4 bậc độ hiếm (*Thường, Hiếm, Sử thi, Huyền thoại*).
  - Tích hợp cơ chế ưu đãi theo tuần, danh sách yêu thích (Wishlist), bộ lọc thông minh *"Tôi mua được"* và quy tắc **1 vị trí Viền đại diện duy nhất** giúp giao diện luôn thẩm mỹ, gọn gàng.

### 5. Phân hệ Quản trị Hệ thống & Kiểm duyệt Học đường (Admin & Moderation)
- **Hệ thống Báo cáo Vi phạm (Report System)**:
  - Học sinh có thể báo cáo câu hỏi, lời giải, bài viết Threads hoặc tài khoản vi phạm với các nhóm lý do rõ ràng (*Xúc phạm bạn học, Spam/Quảng cáo, Nội dung phản cảm, Gian lận điểm*) kèm mô tả chi tiết.
- **Bảng điều khiển Quản trị viên (Admin Insights & Console)**:
  - Chỉ dành riêng cho tài khoản Super Admin đã xác thực bảo mật.
  - Theo dõi biểu đồ hoạt động của diễn đàn, hiệu năng thiết bị người dùng theo thời gian thực, xử lý danh sách báo cáo vi phạm, chỉnh sửa hoặc xóa nội dung sai phạm và quản lý trạng thái tài khoản thành viên.

---

## V. QUY TRÌNH HOẠT ĐỘNG ĐIỂN HÌNH

```
[Học sinh A đăng câu hỏi + treo thưởng Coin]
                │
                ▼
[Máy chủ lưu trữ & phát sóng WebSocket thời gian thực]
                │
                ▼
[Học sinh B mở Trang Câu Hỏi Toàn Màn Hình & gửi lời giải kèm công thức]
                │
                ▼
[Hệ thống kiểm duyệt tự động kiểm tra tính hợp lệ & hiển thị lời giải]
                │
                ▼
[Học sinh A / Quản trị viên chọn "Lời giải hay nhất"]
                │
                ▼
[Học sinh B nhận Coin + XP → Thăng bậc "Tre Việt" → Đổi vật phẩm trang trí tại Boutique]
```

---

## VI. KẾT QUẢ KIỂM THỬ VÀ ĐÁNH GIÁ CHẤT LƯỢNG

Sản phẩm đã được kiểm tra nghiêm ngặt qua hệ thống kiểm thử tự động trước khi đóng gói:
1. **Kiểm tra kiểu dữ liệu tĩnh (`tsc -b --noEmit`)**: 100% tệp mã nguồn TypeScript biên dịch thành công, 0 lỗi kiểu dữ liệu.
2. **Phân tích tĩnh mã nguồn (`oxlint`)**: Quét 237 tệp nguồn với 116 quy tắc kiểm tra, đạt **0 cảnh báo (warnings) và 0 lỗi (errors)**.
3. **Kiểm thử tích hợp tự động (`node --test`)**: Vượt qua hơn 30 bộ kiểm thử chuyên sâu bao gồm:
   - Kiểm thử bảo mật xác thực, giới hạn tần suất đăng nhập, chống XSS/CSWSH và bảo vệ tài khoản Super Admin.
   - Kiểm thử luồng Hỏi - Đáp, trao thưởng *Lời giải hay nhất*, lưu câu hỏi và đồng bộ thời gian thực cho nhiều người dùng cùng lúc.
   - Kiểm thử hệ thống cấp bậc, cửa hàng Boutique, tủ đồ trang trí và kiến trúc đồ họa thích ứng 3 cấp độ.

---

## VII. ĐỊNH HƯỚNG PHÁT TRIỂN TƯƠNG LAI

1. **Ngân hàng Đề thi & Phòng luyện đề trực tuyến**: Mở rộng phân hệ Hỏi Đáp thành kho đề thi thử theo cấu trúc chương trình GDPT mới có chấm điểm tự động và giải thích chi tiết.
2. **Trợ lý Gợi ý Phương pháp Giải (AI Socratic Tutor)**: Khi câu hỏi chưa có người trả lời sau một khoảng thời gian, trợ lý AI sẽ đưa ra gợi ý từng bước (không giải hộ hoàn toàn) để hướng dẫn học sinh tự tư duy.
3. **Ứng dụng Di động Độc lập (PWA / Mobile App)**: Đóng gói chuẩn Progressive Web App hỗ trợ thông báo đẩy (Push Notifications) trên điện thoại ngay cả khi đóng trình duyệt.
4. **Cổng kết nối Giáo viên bộ môn**: Bổ sung vai trò *Giáo viên cố vấn* theo từng tổ bộ môn để xác thực các lời giải mẫu xuất sắc làm tài liệu ôn tập chung cho toàn trường.
