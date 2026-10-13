# BÁO CÁO KHOA HỌC & KỸ THUẬT SẢN PHẨM PHẦN MỀM
## ĐỀ TÀI: F-FORUM — NỀN TẢNG DIỄN ĐÀN HỌC THUẬT, TỰ HỌC TẬP TRUNG VÀ KẾT NỐI CỘNG ĐỒNG HỌC ĐƯỜNG

---

## I. THÔNG TIN TỔNG QUAN SẢN PHẨM

- **Tên sản phẩm**: F-Forum (Diễn đàn Học thuật & Cộng đồng Học sinh)
- **Lĩnh vực**: Phần mềm Hệ thống & Ứng dụng Công nghệ Thông tin trong Giáo dục (EdTech / Academic Social Platform)
- **Loại hình sản phẩm**: Ứng dụng Web toàn diện thời gian thực (Full-stack Real-time Web Application) hoạt động đa nền tảng trên máy tính để bàn, máy tính bảng và điện thoại thông minh.
- **Đối tượng sử dụng**:
  - Học sinh THCS/THPT cần môi trường hỏi đáp bài tập, ôn luyện và tự học tập trung.
  - Ban chủ nhiệm các Câu lạc bộ học thuật & ngoại khóa trong nhà trường.
  - Giáo viên cố vấn và Ban quản trị nhà trường trong công tác theo dõi, định hướng phong trào tự học.
- **Giá trị cốt lõi**: Chuẩn hóa việc trao đổi tri thức học đường, kết hợp cơ chế trò chơi hóa (Gamification) mang bản sắc văn hóa Việt Nam (*Hệ thống 8 bậc danh hiệu Tre Việt*) và công cụ tự học tập trung (Pomodoro) trên một kiến trúc kỹ thuật tối ưu, bảo mật và miễn phí 100% cho học sinh.

---

## II. ĐẶT VẤN ĐỀ VÀ LÝ DO CHỌN ĐỀ TÀI

### 1. Thực trạng và các hạn chế của phương thức trao đổi học tập hiện nay
Trong bối cảnh chuyển đổi số giáo dục, học sinh có nhu cầu rất lớn trong việc hỏi bài, thảo luận kiến thức ngoài giờ học và sinh hoạt câu lạc bộ. Tuy nhiên, phần lớn học sinh đang phải sử dụng các nền tảng mạng xã hội hoặc ứng dụng nhắn tin đại chúng (Facebook, Messenger, Zalo, Discord). Thực tế này bộc lộ 5 hạn chế lớn:

1. **Thất lạc tri thức và không thể tái sử dụng**: Trong các nhóm chat, câu hỏi và lời giải hay bị trôi liên tục theo hàng trăm tin nhắn mỗi ngày. Học sinh khóa sau hoặc các bạn có cùng thắc mắc không thể tra cứu lại lời giải cũ theo từng môn học hay chuyên đề.
2. **Thiếu công cụ soạn thảo khoa học chuyên biệt**: Các mạng xã hội giải trí không hỗ trợ thanh ký hiệu Toán học, Vật lý, Hóa học ($\sqrt{x}, \int, \sum, \Delta, \pi, \Rightarrow, \dots$), khiến học sinh phải chụp ảnh viết tay thiếu ánh sáng hoặc gõ văn bản rời rạc, khó hiểu.
3. **Môi trường gây xao nhãng cao**: Khi mở mạng xã hội để hỏi một bài tập, thuật toán đề xuất video ngắn, tin tức giải trí và quảng cáo dễ dàng kéo học sinh rời khỏi mục tiêu học tập ban đầu.
4. **Thiếu cơ chế ghi nhận đóng góp học thuật**: Những học sinh tích cực giải bài giúp bạn bè không được ghi nhận thành tích lâu dài, dẫn đến việc phong trào hỗ trợ học tập trong trường nhanh chóng lắng xuống.
5. **Khó khăn trong công tác kiểm duyệt học đường**: Các bình luận spam, trả lời đối phó để lấy điểm hoặc ngôn từ thiếu chuẩn mực rất khó kiểm soát nếu thiếu bộ lọc tự động phía máy chủ và công cụ quản trị tập trung.

### 2. Bảng đối chiếu giải pháp F-Forum với các công cụ hiện có

| Tiêu chí đánh giá | Nhóm Chat (Zalo / Messenger) | Diễn đàn Hỏi Đáp Đại Trà | **Nền tảng F-Forum** |
| :--- | :--- | :--- | :--- |
| **Phân loại & Lưu trữ tri thức** | Không có (trôi theo dòng chat) | Phân loại theo môn học | **Phân loại 9 môn học, lọc trạng thái giải, độ khó, mức thưởng & lưu bài cá nhân** |
| **Bộ gõ ký hiệu Toán - Lý - Hóa** | Không hỗ trợ | Hạn chế / khó thao tác trên di động | **Thanh ký hiệu khoa học trực quan, chèn công thức 1 chạm** |
| **Giao diện đọc & giải bài** | Ô chat hẹp, khó đọc đề dài | Nhiều quảng cáo che khuất | **Trang câu hỏi toàn màn hình 2 cột (1380px), tách rõ Lời giải hay nhất & Thảo luận** |
| **Đồng bộ thời gian thực** | Nhanh nhưng hỗn loạn | Phải tải lại trang thủ công | **Đồng bộ tức thời qua WebSocket (Câu hỏi mới, Lời giải, Trao thưởng, Chat)** |
| **Động lực học tập (Gamification)** | Không có | Điểm số đơn điệu | **Hệ thống 8 bậc "Tre Việt" (150 cấp), XP, Coin, Nhiệm vụ ngày, Chuỗi ngày học** |
| **Không gian tự học (Pomodoro)** | Không có | Không có | **Tích hợp đồng hồ Pomodoro, thống kê giờ tự học tuần & âm thanh tập trung** |
| **Kiểm duyệt nội dung & An toàn** | Thủ công hoàn toàn | Nhiều câu trả lời rác / quảng cáo | **Kiểm duyệt liên quan đề bài phía máy chủ + Hệ thống báo cáo Quản trị viên** |
| **Tối ưu thiết bị cấu hình thấp** | Tốn bộ nhớ khi nhiều ảnh/video | Nặng do kịch bản quảng cáo | **Kiến trúc Đồ họa Thích ứng 3 cấp độ (Tier A/B/C), tự dừng hiệu ứng khi khuất** |

### 3. Mục tiêu nghiên cứu và xây dựng sản phẩm
- **Về mặt học thuật**: Xây dựng không gian hỏi - đáp có cấu trúc chặt chẽ cho 9 môn học phổ thông, hỗ trợ tự động lưu nháp lời giải và vinh danh *Lời giải hay nhất*.
- **Về mặt rèn luyện kỹ năng**: Hình thành thói quen tự học mỗi ngày thông qua phòng học Pomodoro, hệ thống Nhiệm vụ hằng ngày (Daily Quests) và Chuỗi ngày học tập (Fire Streak).
- **Về mặt kỹ thuật**: Thiết kế hệ thống Full-stack TypeScript hiện đại, bảo mật cao, đạt chuẩn kiểm thử tự động và vận hành mượt mà trên mọi thiết bị của học sinh.

---

## III. KIẾN TRÚC HỆ THỐNG, CÔNG NGHỆ VÀ NGÔN NGỮ LẬP TRÌNH

### 1. Kiến trúc tổng thể (System Architecture)
F-Forum được thiết kế theo mô hình **Client – Server kết hợp truyền thông thời gian thực hai chiều (Hybrid REST API + WebSocket)** gồm 4 tầng rõ rệt:

```text
┌────────────────────────────────────────────────────────────────────────────┐
│                        TẦNG GIAO DIỆN (CLIENT TIER)                        │
│  React 19.2 + TypeScript 6.0 + Tailwind CSS 4.3 + Adaptive Quality Engine  │
│  [QAForumView] [ThreadsView] [ChatView/Dock] [FocusSanctuary] [ClubsView]  │
└──────────────────────┬─────────────────────────────────┬───────────────────┘
                       │ HTTPS REST API                  │ WebSocket (ws)
                       ▼                                 ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                 TẦNG BẢO MẬT & KIỂM DUYỆT (SECURITY TIER)                  │
│  AuthGuard (HttpOnly Cookie + Bearer) · Rate Limiter · Input/URL Sanitizer │
│  CSP Middleware · Anti-CSWSH Origin Check · Relevance AI Content Filter    │
└──────────────────────────────────────┬─────────────────────────────────────┘
                                       │
                                       ▼
┌────────────────────────────────────────────────────────────────────────────┐
│             TẦNG NGHIỆP VỤ & XỬ LÝ ĐA PHƯƠNG TIỆN (SERVICE TIER)           │
│  Q&A Engine · Gamification & XP/Coin Ledger · Boutique Gacha & Wardrobe    │
│  Sharp Image Pipeline (EXIF Strip + WebP 3-Size Generator) · Report Engine │
└──────────────────────────────────────┬─────────────────────────────────────┘
                                       │
                                       ▼
┌────────────────────────────────────────────────────────────────────────────┐
│               TẦNG LƯU TRỮ & ĐỒNG BỘ (PERSISTENCE & CACHE TIER)            │
│  Multi-Layer Cache (Smart Invalidation) + Atomic JSON/File Store + Backup  │
└────────────────────────────────────────────────────────────────────────────┘
```

### 2. Danh mục Ngôn ngữ lập trình và Công nghệ sử dụng

| Phân lớp | Công nghệ / Thư viện | Phiên bản | Vai trò kỹ thuật trong sản phẩm |
| :--- | :--- | :--- | :--- |
| **Ngôn ngữ chính** | **TypeScript** | `~6.0.2` | Kiểm tra kiểu dữ liệu tĩnh nghiêm ngặt cho cả Frontend và Backend, loại bỏ lỗi bất đồng bộ dữ liệu giữa Client và Server. |
| **Ngôn ngữ kịch bản** | **JavaScript (ESNext / ESM)** | ES2024 | Viết bộ kịch bản kiểm thử tích hợp tự động (`tests/*.test.mjs`) và công cụ biên dịch bộ chuyển đổi giao diện Sáng/Tối. |
| **Thư viện Giao diện** | **React & React DOM** | `^19.2.8` | Xây dựng giao diện hướng thành phần, tách gói tải lười (`React.lazy`) và kết xuất cửa sổ độc lập (`createPortal`). |
| **Định kiểu & Thẩm mỹ** | **Tailwind CSS + CSS3** | `^4.3.3` | Hệ thống thiết kế đáp ứng đa màn hình, hiệu ứng kính mờ (Liquid Glass) và tự động sinh bộ quy tắc Light Mode (`generate-light-adapter.mjs`). |
| **Biểu tượng & Phông chữ** | **Lucide React & Geist Mono** | `^1.48.0` | Bộ biểu tượng vector đồng nhất và phông chữ kỹ thuật hỗ trợ hiển thị số liệu, cấp bậc và công thức rõ nét. |
| **Công cụ Đóng gói** | **Vite** | `^8.3.0` | Máy chủ phát triển tốc độ cao (HMR) và đóng gói phân mảnh mã nguồn (Code-splitting) tối ưu dung lượng tải trang. |
| **Máy chủ & Thời gian thực** | **Node.js HTTP + `ws`** | `^8.22.0` | Xử lý toàn bộ REST API nghiệp vụ và duy trì kênh truyền sự kiện thời gian thực qua WebSocket. |
| **Xử lý Hình ảnh** | **Sharp + HTML5 Canvas** | `^0.34.5` | Xóa siêu dữ liệu nhạy cảm (EXIF), làm nét cạnh (Unsharp Mask) và xuất 3 kích cỡ ảnh (`thumb`, `medium`, `original`) chuẩn `.webp`. |
| **Mã hóa & Xác thực** | **Node `crypto.scrypt` + `bcryptjs`** | `^3.0.3` | Băm mật khẩu một chiều kèm muối ngẫu nhiên, ký xác thực token phiên và bảo vệ mật khẩu Super Admin bằng biến môi trường. |
| **Kiểm tra Chất lượng** | **Oxlint & Node Test Runner** | `^1.81.0` | Phân tích tĩnh 237 tệp mã nguồn trong `< 1 giây` và thực thi hơn 30 bộ kiểm thử tích hợp tự động. |

### 3. Cấu trúc tổ chức mã nguồn dự án

```text
f-forum/
├── src/
│   ├── components/
│   │   ├── views/             # Các phân hệ chính: QAForumView, ThreadsView, ChatView, ClubsView, FocusSanctuary, ChroniclesView, AboutUs
│   │   ├── decorations/       # Hệ thống hiển thị Viền đại diện & Bảng tên động (AvatarWithDecoration, DecorationMedia, NameplateDisplay)
│   │   ├── shop/              # Cửa hàng vật phẩm Boutique, vòng quay Gacha & cửa sổ Mở hộp (GachaBoutique)
│   │   ├── effects/           # Hiệu ứng hạt tăng tốc phần cứng (GpuParticleCanvas, CelebrationBurst)
│   │   └── ...                # Navbar, ProfileModal, AdminInsightsModal, LeaderboardWidget, RadialQuickMenu, Badges10Tier
│   ├── store/
│   │   └── forumStore.ts      # Kho quản lý trạng thái trung tâm, đồng bộ REST API & WebSocket
│   ├── utils/                 # Các mô-đun lõi: tier.ts, decorationStore.ts, adaptiveQuality.ts, bannerLayout.ts, imagePipeline.ts, storage.ts
│   ├── App.tsx                # Khung điều hướng ứng dụng, quản lý phiên và phím tắt toàn cục
│   └── index.css              # Hệ thống thiết kế CSS, biến màu chủ đề và bộ chuyển đổi Sáng/Tối
├── server/
│   ├── forumServer.ts         # Máy chủ REST API, WebSocket, kiểm duyệt nội dung và quản lý dữ liệu
│   ├── authGuard.ts           # Tường lửa xác thực, phân quyền RBAC, Rate Limiter, CSP & làm sạch đầu vào
│   └── ...                    # Các dịch vụ bộ nhớ đệm, xử lý ảnh Sharp và đồng bộ nền
├── public/assets/             # Tài nguyên tĩnh: 873 vật phẩm trang trí (.webm/.webp), ảnh bìa (.svg)
├── scripts/                   # Công cụ tự động hóa: generate-light-adapter.mjs, start-public.mjs
├── tests/                     # Hơn 30 bộ kiểm thử tự động (.test.mjs) kiểm tra bảo mật, giao diện và nghiệp vụ
└── docs/                      # Tài liệu kiến trúc và báo cáo sản phẩm (BAO_CAO_SAN_PHAM.md)
```

### 4. Thiết kế Mô hình Dữ liệu Cốt lõi (Data Models)
Hệ thống quản lý 7 nhóm thực thể chính với cấu trúc chặt chẽ:
1. **`User` (Người dùng)**: Lưu định danh (`id`, `email`, `name`, `role`), chỉ số học tập (`xp`, `level`, `coins`, `streak`, `studyHours`, `weeklyXp`), cá nhân hóa (`avatar`, `bannerUrl` kèm tham số bố cục `x, y, z, fit, dim`), tủ đồ (`ownedDecorations`, `wishlist`, `equippedDecorations`) và trạng thái kiểm duyệt (`isBanned`, `warnings`).
2. **`Question` (Câu hỏi học thuật)**: Lưu thông tin đề bài (`id`, `title`, `content`, `subject`, `difficulty`, `bounty`, `tags`, `imageUrl`, `author`, `createdAt`, `isSolved`, `views`, `likes`, `solutions[]`).
3. **`Solution` (Lời giải)**: Lưu nội dung giải (`id`, `questionId`, `content`, `imageUrl`, `author`, `upvotes`, `upvotedBy[]`, `isBest`, `createdAt`).
4. **`ThreadPost` (Bài viết cộng đồng)**: Lưu bài đăng thảo luận (`id`, `content`, `images[]`, `tags[]`, `reactions`, `replies[]`, `repostOf`, `createdAt`).
5. **`ChatMessage` (Tin nhắn thời gian thực)**: Lưu tin nhắn phòng chung (`id`, `sender`, `text`, `imageUrl`, `replyTo`, `timestamp`, `deleted`).
6. **`Club` (Câu lạc bộ)**: Lưu thông tin CLB (`id`, `name`, `category`, `description`, `members[]`, `posts[]`).
7. **`ReportRecord` (Báo cáo vi phạm)**: Lưu thông tin tố cáo ẩn danh người gửi đối với người dùng thường (`id`, `targetUserId`, `targetUserName`, `reason`, `details`, `status`, `createdAt`).

### 5. Các giải pháp kỹ thuật chuyên sâu trong sản phẩm
1. **Kiến trúc Chất lượng Đồ họa Thích ứng 3 Cấp độ (3-Tier Adaptive Quality Engine)**:
   - Tự động phân tích phần cứng thiết bị (số luồng CPU, dung lượng RAM, bộ giải mã WebM Alpha và tùy chọn hệ điều hành) để xếp thiết bị vào **Tier A (Cao)**, **Tier B (Trung bình)** hoặc **Tier C (Tiết kiệm)**.
   - Quản lý ngân sách hoạt ảnh đồng thời (ưu tiên tuyệt đối cho ảnh đại diện của chính người dùng đang đăng nhập) và tự động tạm dừng giải mã video khi phần tử cuộn ra khỏi màn hình (`IntersectionObserver`).
2. **Đường ống Xử lý Ảnh Kép (Client + Server Image Pipeline)**:
   - **Phía trình duyệt**: Áp dụng bộ lọc làm nét cạnh có ngưỡng (`Unsharp Mask` chỉ làm nét chữ viết/công thức trên ảnh chụp vở, giữ nguyên vùng phẳng để không làm nhiễu ảnh) và công cụ cắt bố cục lưới 3×3 trực quan.
   - **Phía máy chủ**: Thư viện `Sharp` tự động tước bỏ toàn bộ siêu dữ liệu EXIF (bảo vệ quyền riêng tư vị trí của học sinh) và sinh 3 bản ảnh `.webp` (`thumb`, `medium`, `original`) với tiêu đề `Cache-Control: public, max-age=31536000, immutable`.
3. **Bảo mật Đa tầng (Defense-in-Depth Security)**:
   - **Chống tấn công vét cạn mật khẩu (Dual Rate Limiting)**: Khóa tạm thời khi vượt ngưỡng sai mật khẩu tính theo cả địa chỉ IP (chặn rải mật khẩu qua nhiều email) và tính theo từng tài khoản (chặn dò mật khẩu từ nhiều IP).
   - **An toàn phiên đăng nhập**: Kết hợp Cookie `HttpOnly; SameSite` với cơ chế tự động gia hạn phiên ngầm (`Silent Refresh`) và chức năng *"Đăng xuất khỏi mọi thiết bị"* thu hồi tức thời toàn bộ token cũ.

---

## IV. CÁC CHỨC NĂNG CHI TIẾT CỦA SẢN PHẨM

### 1. Phân hệ Diễn đàn Hỏi Đáp Học Thuật (Q&A Forum)
- **Tạo câu hỏi theo quy trình 3 bước chuẩn hóa**:
  - *01 · Thông tin cơ bản*: Chọn 1 trong 9 môn học, độ khó (*Cơ bản, Vận dụng, Vận dụng cao*) và mức thưởng Coin (10 – 500 Coin).
  - *02 · Nội dung chi tiết*: Nhập tiêu đề, mô tả đề bài và tải lên ảnh chụp bài tập.
  - *03 · Công cụ hỗ trợ*: Gắn thẻ chuyên đề và sử dụng **Thanh ký hiệu Toán - Lý - Hóa (`MathSymbolsBar`)** với các nút bấm kích thước chuẩn cảm ứng ($\ge 48\text{px}$).
- **Trang Câu Hỏi Chuyên Biệt Toàn Màn Hình (Full-Page Question View)**:
  - Mở ra một trang độc lập phủ kín màn hình (`100dvh`) theo phong cách các diễn đàn học thuật lớn (như Hoidap247), gồm thanh điều hướng cố định phía trên và bố cục 2 cột rộng `1380px`.
  - **Khu vực Đề bài & Lời giải**: Hiển thị rõ trạng thái câu hỏi (*Đã có lời giải hay nhất* / *Đang chờ lời giải*), tách biệt danh sách lời giải thành khu vực **Lời giải hay nhất** và **Các câu trả lời từ cộng đồng**.
  - **Khung soạn lời giải thông minh**: Có bộ đếm ký tự, thanh chèn ký hiệu khoa học, đính kèm ảnh bước giải và cơ chế **tự động lưu nháp (`Auto-save Draft`)** riêng cho từng câu hỏi để không bao giờ mất bài đang viết dở.
- **Kiểm duyệt tính liên quan của lời giải phía máy chủ**:
  - Sàng lọc tự động các phản hồi spam, lặp ký tự hoặc hoàn toàn lạc đề trước khi lưu, giữ cho luồng thảo luận học thuật luôn nghiêm túc.

### 2. Phân hệ Bảng tin Cộng đồng (Threads) & Trò chuyện Thời gian thực (Live Chat)
- **Bảng tin Threads học đường**:
  - Đăng tải bài viết chia sẻ phương pháp học, tài liệu ôn tập, hình ảnh hoạt động trường lớp.
  - Hỗ trợ 5 biểu cảm tương tác tích cực, bình luận phản hồi, đăng lại kèm lời bình (Repost), tìm kiếm theo từ khóa/thẻ `#hashtag` và đánh dấu lưu bài viết.
- **Phòng Trò chuyện Chung (Chat View) & Khung Chat Thu gọn (Chat Dock)**:
  - Giao tiếp trực tuyến thời gian thực qua WebSocket, hiển thị danh sách thành viên trực tuyến, gửi ảnh, trả lời tin nhắn trích dẫn và xem nhanh thẻ thông tin học sinh (`UserQuickCard`).

### 3. Phân hệ Không gian Tự học (Focus Sanctuary), Câu lạc bộ (Clubs) & Khu Vinh Danh
- **Phòng Tự học Tập trung (Focus Sanctuary)**:
  - Đồng hồ đếm giờ học theo phương pháp **Pomodoro** (chu kỳ Tập trung / Nghỉ ngắn / Nghỉ dài), tự động cộng dồn vào thống kê **Số giờ tự học** của học sinh.
  - Tích hợp hộp nhạc nền thư giãn (**Chill Box**) giúp tăng khả năng tập trung khi làm bài tập.
- **Hệ thống Câu lạc bộ Học đường (Clubs)**:
  - Cho phép học sinh tham gia các câu lạc bộ học thuật và kỹ năng, thảo luận theo nhóm chuyên đề và kết nối bạn học cùng sở thích.
- **Khu Vinh Danh 3D (Chronicles / Hall of Fame)**:
  - Trưng bày 21 cột mốc tiêu biểu và bảng vàng thành tích của cộng đồng trên mô hình khối cầu 3D tương tác (Fibonacci Sphere Engine).

### 4. Phân hệ Trò chơi hóa (Gamification), Hệ thống Cấp bậc "Tre Việt" & Hồ sơ Năng lực
- **Công thức tính Điểm kinh nghiệm (XP) & Cấp độ (Level 1 – 150)**:
  - Ngưỡng XP để đạt cấp độ $L$ được tính nhất quán trên toàn hệ thống theo công thức bậc hai tăng dần:
    $$\text{XP}(L) = \left\lfloor 140 \times (L - 1) + 1.08 \times (L - 1)^2 \right\rfloor$$
- **Bảng 8 Bậc Danh Hiệu "Tre Việt"**:

| Bậc | Ký hiệu | Tên danh hiệu | Cấp độ (Level) | Ý nghĩa biểu tượng giáo dục |
| :---: | :---: | :--- | :---: | :--- |
| **1** | **I** | **Măng Non** | Lv. 1 – 5 | Mầm măng vừa nhú khỏi đất, khởi đầu hành trình tích lũy tri thức. |
| **2** | **II** | **Măng Vươn** | Lv. 6 – 15 | Măng vươn cao, hé mở những chiếc lá non đầu tiên. |
| **3** | **III** | **Tre Non** | Lv. 16 – 30 | Hình thành thân tre mảnh với các đốt vững chắc đầu tiên. |
| **4** | **IV** | **Tre Vươn Mình** | Lv. 31 – 50 | Thân tre cao khỏe, nhiều đốt, tán lá rậm chuyển sắc xanh thanh thiên. |
| **5** | **V** | **Tre Trưởng Thành** | Lv. 51 – 75 | Thân tre cứng cáp trước gió bão, tán lá sum suê nhiều tầng. |
| **6** | **VI** | **Bụi Tre** | Lv. 76 – 105 | Các thân tre mọc thành khóm gắn kết — biểu trưng tinh thần học tập đồng đội. |
| **7** | **VII** | **Lũy Tre Làng** | Lv. 106 – 130 | Ba thân tre cổ thụ che chở cùng vầng hào quang tri thức lan tỏa. |
| **8** | **VIII** | **Lũy Tre Cổ Thụ** | Lv. 131 – 150 | Khóm tre hóa vàng kim rực rỡ — biểu trưng cho ý chí "Trúc hóa rồng" & đỉnh cao tri thức. |

- **Hồ sơ Năng lực Cá nhân & Cửa hàng Trang trí (Boutique)**:
  - **Biểu đồ Năng lực 6 Trục (Radar Spider Chart)** cùng 6 chỉ số nhanh phản ánh toàn diện hoạt động hỏi bài, giải bài, giờ tự học, chuỗi ngày hoạt động và uy tín cộng đồng.
  - **Ảnh bìa cá nhân toàn khung (Full-bleed Cover Studio)**: Cho phép tải ảnh bìa phủ dọc toàn bộ thẻ hồ sơ kèm công cụ kéo-cắt bố cục lưới 3×3 và chỉnh độ phóng/độ phủ tối trực quan.
  - **Cửa hàng Boutique & Tủ đồ hợp nhất**: Gồm 873 vật phẩm trang trí phân theo 4 bậc độ hiếm (*Thường, Hiếm, Sử thi, Huyền thoại*), áp dụng quy tắc **1 vị trí Viền đại diện duy nhất** (tự động chuyển đổi giữa Khung và Hào quang) và cửa sổ Mở hộp (Unboxing) khóa cuộn nền mượt mà.

### 5. Phân hệ Quản trị Hệ thống & Kiểm duyệt Học đường (Admin & Moderation)
- **Hệ thống Báo cáo Vi phạm (Report System)**:
  - Giao diện báo cáo rộng rãi, trực quan với các thẻ chọn nhanh lý do vi phạm (*Toxic / Xúc phạm bạn học, Spam / Quảng cáo, Nội dung phản cảm, Gian lận điểm*), giới hạn tần suất chống lạm dụng (tối đa 6 lượt / 10 phút) và bảo mật tuyệt đối danh tính người báo cáo.
- **Bảng điều khiển Quản trị viên (Admin Insights & Console)**:
  - Tích hợp trong bảng quản trị chuyên biệt dành cho Super Admin: theo dõi số liệu thời gian thực, tiếp nhận cảnh báo vi phạm tức thời qua WebSocket, chỉnh sửa/xóa câu hỏi, lời giải, bài viết hoặc tin nhắn vi phạm và quản lý khóa/mở khóa tài khoản.

---

## V. KẾT QUẢ KIỂM THỬ VÀ ĐÁNH GIÁ CHẤT LƯỢNG KỸ THUẬT

Sản phẩm được kiểm chứng tự động qua 3 lớp kiểm tra chất lượng nghiêm ngặt:

| Hạng mục kiểm tra | Công cụ thực thi | Phạm vi kiểm tra | Kết quả đạt được |
| :--- | :--- | :--- | :--- |
| **Kiểm tra kiểu tĩnh** | `npx tsc -b --noEmit` | Toàn bộ tệp `.ts` và `.tsx` (Frontend & Backend) | **Đạt 100% (0 lỗi biên dịch)** |
| **Phân tích tĩnh mã nguồn** | `npx oxlint` | 237 tệp mã nguồn với 116 quy tắc kiểm tra | **0 lỗi (Errors), 0 cảnh báo (Warnings)** |
| **Kiểm thử tích hợp & Bảo mật** | `node --test tests/*.test.mjs` | Hơn 30 bộ kiểm thử chuyên sâu (79+ kịch bản con) | **100% kịch bản vượt qua (Pass)** |
| **Kiểm tra độ tương phản Sáng/Tối** | `generate-light-adapter.mjs` + Test | Đồng bộ chủ đề Dark Mode & Pastel Light Mode | **Đạt chuẩn hiển thị & độ tương phản** |
| **Kiểm toán hiệu năng CSS GPU** | `adaptive-quality-architecture.test.mjs` | Quét toàn bộ `@keyframes` trong `src/**/*.css` | **0 hoạt ảnh gây Layout Reflow** |

---

## VI. HƯỚNG DẪN CÀI ĐẶT, TRIỂN KHAI VÀ VẬN HÀNH

### 1. Yêu cầu môi trường
- **Node.js**: Phiên bản `>= 20.x` (khuyến nghị `v22+` hoặc `v24+`).
- **Trình quản lý gói**: `npm >= 10.x`.

### 2. Các lệnh vận hành chính
```bash
# 1. Cài đặt các gói phụ thuộc
npm install

# 2. Khởi chạy máy chủ phát triển (Frontend + Backend + WebSocket trên cổng 5173)
npm run dev

# 3. Sinh tự động bộ chuyển đổi giao diện Sáng (Light Mode Adapter)
npm run gen:light

# 4. Kiểm tra lỗi mã nguồn và kiểu dữ liệu
npm run lint
npx tsc -b --noEmit

# 5. Chạy bộ kiểm thử tự động toàn diện
npm test

# 6. Đóng gói bản phát hành chính thức (Production Build)
npm run build
```

---

## VII. KẾT LUẬN VÀ ĐỊNH HƯỚNG PHÁT TRIỂN TƯƠNG LAI

### 1. Giá trị thực tiễn của sản phẩm
- **Đối với học sinh**: Cung cấp một không gian học tập số văn minh, không quảng cáo, giúp việc hỏi bài - giải bài trở nên nhanh chóng, có hệ thống và giàu cảm hứng nhờ hệ thống cấp bậc "Tre Việt" và phòng tự học Pomodoro.
- **Đối với nhà trường và câu lạc bộ**: Tạo dựng kho học liệu mở do chính học sinh đóng góp và được kiểm duyệt chặt chẽ, thúc đẩy phong trào tự học và hỗ trợ lẫn nhau trong toàn trường.

### 2. Định hướng mở rộng
1. **Ngân hàng Đề thi & Phòng luyện đề trực tuyến**: Mở rộng phân hệ Hỏi Đáp thành kho đề thi thử theo cấu trúc chương trình GDPT 2018 có chấm điểm tự động và thống kê điểm yếu theo chuyên đề.
2. **Trợ lý Gợi ý Phương pháp Giải (AI Socratic Tutor)**: Khi câu hỏi chưa có người trả lời sau một khoảng thời gian nhất định, trợ lý AI sẽ đưa ra gợi ý từng bước để dẫn dắt học sinh tự tìm ra đáp án thay vì chép lời giải có sẵn.
3. **Ứng dụng Di động Độc lập (PWA / Mobile App)**: Mở rộng chuẩn Progressive Web App hỗ trợ thông báo đẩy (Push Notifications) và xem lại các câu hỏi đã lưu ngay cả khi ngoại tuyến (Offline).
4. **Cổng xác thực Giáo viên cố vấn**: Bổ sung vai trò *Giáo viên bộ môn* để đóng dấu xác nhận các lời giải mẫu xuất sắc nhất làm tài liệu ôn tập chính thức cho học sinh toàn trường.
