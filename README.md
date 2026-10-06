# F-Forum — Diễn Đàn Học Sinh & Sinh Viên

<div align="center">

![React](https://img.shields.io/badge/React_19-20232A?style=flat&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript_6-007ACC?style=flat&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite_8-646CFF?style=flat&logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS_v4-38B2AC?style=flat&logo=tailwind-css&logoColor=white)
![License](https://img.shields.io/badge/Bản_quyền-BroAmStuck-amber?style=flat)

**Nền tảng diễn đàn trao đổi học tập, kết nối câu lạc bộ và chia sẻ tài liệu dành cho học sinh - sinh viên.**

[Cài đặt & Chạy](#-cài-đặt--khởi-chạy) • [Chức năng Chính](#-chức-năng-chính) • [Công nghệ Sử dụng](#-công-nghệ-sử-dụng) • [Bản quyền](#-bản-quyền-trí-tuệ)

</div>

---

## 📖 Giới thiệu

**F-Forum** là diễn đàn trực tuyến hỗ trợ học tập và sinh hoạt cộng đồng dành cho học sinh, sinh viên. Dự án cung cấp không gian để các bạn đặt câu hỏi bài tập, trao đổi kiến thức, sinh hoạt câu lạc bộ, nhắn tin trao đổi trực tiếp và lưu giữ các kỷ niệm học đường.

Hệ thống được thiết kế theo giao diện kính mờ hiện đại, hỗ trợ đầy đủ cả máy tính (Desktop) và điện thoại di động (Mobile).

---

## ✨ Chức năng Chính

### 1. Diễn đàn Hỏi Đáp Học Tập (Q&A)
- Đăng câu hỏi theo các môn học: Toán học, Vật lý, Hóa học, Ngữ văn, Tiếng Anh, Tin học...
- Hỗ trợ công cụ soạn thảo với bảng 38 ký hiệu toán học phổ biến (`√`, `π`, `∑`, `∫`, `≤`, `≥`, `α`, `β`...).
- Cho phép đính kèm ảnh bài tập định dạng PNG, JPG hoặc WebP, tối đa 8MB/tệp.
- Cơ chế tiền thưởng Coin: Người hỏi có thể đặt mức thưởng từ 10 đến 100 Coin để khuyến khích câu trả lời nhanh và chất lượng.
- Người giải đáp được chọn "Đáp Án Chuẩn" sẽ nhận 50% tiền thưởng cược cộng thêm 100 Coin danh dự.

### 2. Câu Lạc Bộ & Hoạt Động Ngoại Khóa
- Danh sách các câu lạc bộ học thuật, thể thao, nghệ thuật và tình nguyện.
- Đăng bài thông báo lịch sinh hoạt, tuyển thành viên và hình ảnh hoạt động.
- Thành viên có thể theo dõi và tham gia câu lạc bộ yêu thích.

### 3. Phòng Chat Trực Tuyến (Live Chat)
- Trò chuyện và thảo luận bài học trực tiếp theo thời gian thực (Real-time).
- Cửa sổ chat dạng dock thu gọn hoặc toàn màn hình, hỗ trợ hiển thị danh sách người dùng đang trực tuyến.
- Nhấp vào tên hoặc ảnh đại diện để xem nhanh hồ sơ cá nhân của người chat.

### 4. Điểm Danh & Câu Hỏi Vui Hàng Ngày
- **Điểm danh 15 ngày**: Đăng nhập mỗi ngày để nhận Coin tích lũy. Hoàn thành các mốc ngày 5, 10, 15 để nhận thêm hộp quà.
- **Kho quà**: Mở các hộp quà ảo để nhận vật phẩm lưu niệm và điểm thưởng.
- **Câu hỏi vui (Trivia Quiz)**: Mỗi ngày có một câu đố kiến thức ngắn trong 15 giây. Trả lời đúng được thưởng Coin ngay trong ngày (không cần chế độ ôn lại — hôm sau đã có câu mới).
- **Ngọn lửa Streak** nằm trong menu tia sét ở góc dưới bên trái, hiển thị số ngày điểm danh liên tiếp.

### 5. Cửa Hàng Vật Phẩm Ảo (Chill Box)
- Sử dụng điểm Coin tích lũy được từ việc giải bài tập và điểm danh để đổi vật phẩm trang trí.
- 12 vật phẩm ảo thiết kế riêng được chia theo các cấp độ màu sắc: Xanh lá, Xanh lam, Đỏ và Tím.
- Các vật phẩm đã sở hữu có thể trang bị trực tiếp lên trang cá nhân.

### 6. Lớp Tiện Ích Ẩn (Premium Layer)
- **Bảng lệnh nhanh (⌘/Ctrl + K)**: Gõ không dấu để tìm và nhảy tới mọi phân khu, hoặc chạy tác vụ (đổi theme, điểm danh, mở Focus, bật/tắt chat, nghỉ mắt...).
- **Sổ tay nhanh (⌘/Ctrl + I)**: Ghi chú tức thì ở bất kỳ phân khu nào, tự động lưu và dùng chung một cuốn sổ với Focus Sanctuary. Có mẫu nhanh cho hạn chót, ý tưởng và công thức.
- **Đồng hồ Focus split-flap**: Phiên học đếm thời gian thực và dừng tự do; phiên nghỉ đếm ngược. Nhật ký ghi thời lượng thật, không ép đủ 25 phút; các mốc thưởng 25/60/120 phút do máy chủ xác nhận và giới hạn tối đa 120 Coin/ngày.
- **Nhắc nghỉ mắt 20-20-20**: Cứ 20 phút hiện lớp phủ thư giãn 20 giây với vòng thở dịu mắt (bật/tắt trong Cài đặt → Trải nghiệm).
- **Trạng thái ngoại tuyến & đồng bộ lại**: Báo khi trình duyệt mất kết nối; khi mạng trở lại, ứng dụng thử đồng bộ trạng thái máy chủ (nếu bạn đã đăng nhập). Thao tác chưa hoàn tất cần được kiểm tra và gửi lại.
- **Sao lưu & khôi phục**: Xuất/nhập toàn bộ dữ liệu học tập trên trình duyệt thành một tệp JSON trong Cài đặt → Hệ thống.
- **Phím tắt**: ⌘/Ctrl + K (bảng lệnh), ⌘/Ctrl + I (sổ tay), ⌘/Ctrl + Shift + L (theme), ⌘/Ctrl + Shift + F (Focus Mode).

### 7. Trung Tâm Điều Khiển (Cài đặt)
- Ba nhóm tab cao cấp: **Giao diện** (theme, gradient không gian dạng tile, cỡ chữ, độ mờ kính), **Trải nghiệm** (mockup chọn vị trí navbar bằng cách chạm vào cạnh khung, tự ẩn, chế độ chỉ hiện icon, hiệu ứng âm thanh giao diện, chuyển động, không gian tập trung, phím tắt) và **Hệ thống** (sao lưu, xóa cache, đặt lại dữ liệu).

### 8. Hồ Sơ Cá Nhân & Báo Cáo Vi Phạm
- Hiển thị 6 chỉ số hoạt động: Tổng Coin, Lượt cảm ơn, Câu trả lời hay nhất, Đánh giá 5 sao, Xác thực và Số người đã giúp đỡ.
- Biểu đồ mạng nhện (Radar Chart) thể hiện thế mạnh giải bài theo 6 nhóm môn học.
- Nút **Tố Cáo Tài Khoản**: Cho phép người dùng báo cáo các hành vi vi phạm (spam, quấy rối, ngôn từ độc hại) về ban quản trị để xử lý kịp thời.

### 9. Hệ Thống 8 Cấp Bậc Học Đường
Hệ thống cấp bậc được đặt tên gần gũi với học sinh và tăng theo **XP** (Coin là đơn vị thưởng riêng):
1. 🌱 **Học Sinh** — cấp 1 (0 XP)
2. 🌿 **Học Sinh Giỏi** — cấp 6 (727 XP)
3. ☘️ **Học Sinh Xuất Sắc** — cấp 16 (2.343 XP)
4. 🍃 **Thông Thái** — cấp 31 (5.172 XP)
5. ⭐ **Tài Năng** — cấp 51 (9.700 XP)
6. 🌾 **Thiên Tài** — cấp 76 (16.575 XP)
7. 👑 **Bậc Thầy** — cấp 106 (26.607 XP)
8. 🔮 **Chuyên Gia** — cấp 131 (36.452 XP)

### 10. Giao Diện & Tùy Chọn Hiển Thị
- Hỗ trợ cả 2 chế độ: Giao diện Sáng (Light Mode) và Giao diện Tối (Dark Mode).
- **Thanh điều hướng linh hoạt**: Có thể đặt ở 4 vị trí: Trên cùng, Dưới cùng, Cạnh trái hoặc Cạnh phải màn hình.
- **Nút F (logo) là lối vào trang Giới thiệu** — không còn tab chữ "GIỚI THIỆU" cho thanh gọn hơn.
- **Miền Ký Ức · Khu Vinh Danh · Update luôn ở dạng icon** (có vạch phân cách và tooltip khi rê chuột), kể cả khi thanh đang mở rộng.
- Nhịp thu nhỏ / phóng to thanh điều hướng được đồng bộ trong 0.86s với đường cong êm; nhãn và biểu tượng chuyển tiếp theo để thanh không nhảy từng nấc.
- Các cửa sổ thông báo, cài đặt và tài khoản tự động điều chỉnh hướng mở tương ứng để không bị che khuất; panel Cài đặt có hoạt ảnh mở/đóng mềm mại kèm lớp phủ mờ dần.
- Tính năng tự động ẩn thanh điều hướng sau khoảng 1.2 giây khi không di chuột để tăng diện tích hiển thị nội dung.

---

## 🛠️ Công Nghệ Sử Dụng

- **Frontend**: React 19, TypeScript
- **Styling**: Tailwind CSS v4, hiệu ứng kính mờ (Liquid Glass)
- **Công cụ xây dựng**: Vite 8
- **Thời gian thực**: WebSocket, BroadcastChannel API
- **Hiệu ứng âm thanh giao diện**: Web Audio API
- **Biểu tượng**: Lucide React và icon SVG tự thiết kế
- **Kiểm thử & Chất lượng mã nguồn**: Node.js Test Runner, Oxlint

---

## 🚀 Cài Đặt & Khởi Chạy

### Yêu cầu hệ thống
- Đã cài đặt **Node.js 20.19 trở lên** hoặc **Node.js 22.12 trở lên** (theo yêu cầu của Vite 8).
- Dùng `npm` và `package-lock.json` để cài dependency đúng phiên bản của dự án.

### Các bước thực hiện

```bash
# 1. Tải mã nguồn về máy
git clone https://github.com/anhtuantran0512-cyber/f-forum.git

# 2. Đi vào thư mục dự án
cd f-forum

# 3. Cài đặt đúng dependency đã khóa trong package-lock.json
npm ci

# 4. Chạy dự án ở môi trường phát triển
npm run dev
```

Sau khi chạy lệnh, mở trình duyệt web và truy cập địa chỉ: `http://localhost:5173`

### Chạy kiểm thử & Đóng gói sản phẩm

```bash
# Kiểm tra lỗi cú pháp với Oxlint
npm run lint

# Chạy toàn bộ bài kiểm thử tự động
npm test

# Biên dịch mã nguồn cho môi trường sản xuất
npm run build

# Bản demo tạm thời qua Cloudflare Quick Tunnel (chỉ khi chủ động chia sẻ)
npm run public

# Kiểm tra bản production cục bộ, không mở tunnel công khai
npm run public -- --test
```

`npm run public` tạo bundle production mới rồi phục vụ bằng Vite Preview trên cổng 4173; lệnh không đưa Vite dev server/HMR ra Internet. Quick Tunnel chỉ phù hợp demo ngắn hạn, không thay thế hạ tầng hosting production; dừng bằng Ctrl+C. Dữ liệu tài khoản vẫn nằm trong thư mục dữ liệu riêng của máy chủ.

### Authentication, phân quyền và bootstrap Admin

- Đăng ký tài khoản bình thường tạo role `user`; phản hồi đăng ký được thống nhất để hạn chế dò email, sau đó người dùng đăng nhập riêng. Đăng nhập/đăng xuất và profile được xác thực bằng API server. Mật khẩu lưu bằng PBKDF2-SHA256 salted hash, không lưu plaintext.
- Session là cookie `HttpOnly`, `SameSite=Lax`, hết hạn sau 12 giờ, được xoay khi đăng nhập và thu hồi khi logout, khóa tài khoản, đổi role hoặc xóa tài khoản (kể cả SSE/WebSocket đang mở). Cookie dùng `Secure` ở production/HTTPS. Các request ghi dữ liệu kiểm tra `Origin` để chống CSRF; production bật HSTS và frame protection.
- Roles: `user`, `moderator`, `admin`, `super_admin`. Quyền được tính hoàn toàn ở server; email, role, permission hay trạng thái trong browser không cấp quyền. Bảng quyền hiện có gồm `users.view/edit/delete/role`, `posts.view/edit/delete`, `reports.view/resolve`, `analytics.view`, `logs.view`, `settings.view/edit`.
- Admin Panel riêng gồm dashboard, analytics, thành viên, nội dung, báo cáo, nhật ký và cấu hình bảo mật chỉ đọc. Các thao tác nhạy cảm ghi lý do; đổi role/xóa tài khoản yêu cầu nhập lại password; xóa tài khoản còn yêu cầu gõ lại email.
- Audit log ghi actor, action, target, timestamp, IP/User-Agent phù hợp và result; đăng nhập thất bại, từ chối authorization và thao tác Admin đều được ghi. Login/register bị rate-limit theo IP và tài khoản. Chỉ tin `CF-Connecting-IP` khi `FFORUM_TRUST_CLOUDFLARE_PROXY=true` ở sau Cloudflare proxy/tunnel đã lọc header; không bật nếu origin nhận được request trực tiếp. Response production không trả stack trace.

**Cấp Super Admin đầu tiên:**

1. Khởi chạy app để tạo/migrate file dữ liệu riêng; đăng ký tài khoản qua form bằng mật khẩu mạnh (không dùng OAuth-only cho tài khoản bootstrap).
2. Dừng server hoàn toàn. Với dữ liệu mặc định, file là `~/.local/share/f-forum/forum-data.json`; nếu dùng `FFORUM_DATA_DIR`, chạy CLI với cùng biến môi trường.
3. Chạy `npm run admin:bootstrap -- <email-đã-đăng-ký>`. CLI chỉ nâng một tài khoản đã tồn tại, có password hash hợp lệ và chỉ khi chưa có `super_admin`; nó không tạo tài khoản/mật khẩu, không có email mặc định và ghi file nguyên tử với permission riêng tư.
4. Khởi động lại server. Việc cấp các role tiếp theo thực hiện từ Admin Panel; chỉ `super_admin` được đổi role và phải xác minh lại password.

Không commit hoặc đặt secret trong `VITE_*`; `FFORUM_DATA_DIR` nên trỏ đến thư mục riêng nằm ngoài repository. Mẫu biến môi trường có trong `.env.example`. Chạy `npm test` để kiểm tra API/auth/authorization, session, kiểm duyệt và bảo vệ dữ liệu.

---

## 📁 Cấu Trúc Thư Mục

```text
f-forum/
├── public/                 # Tệp tĩnh (ảnh, icon)
├── server/                 # Mã nguồn máy chủ WebSocket và API phụ trợ
│   └── forumServer.ts
├── src/
│   ├── components/         # Các thành phần giao diện (Navbar, Modal, View...)
│   │   ├── landing/        # Trang giới thiệu
│   │   └── views/          # Màn hình chính: Hỏi đáp, Câu lạc bộ, Chat, Vinh danh...
│   ├── store/              # Quản lý trạng thái ứng dụng (forumStore)
│   ├── types/              # Định nghĩa kiểu dữ liệu TypeScript
│   ├── utils/              # Các hàm tiện ích (phản hồi giao diện, thông báo, lưu trữ, cấp bậc)
│   ├── App.tsx             # Thành phần gốc điều hướng giao diện
│   ├── index.css           # Cấu hình giao diện và hiệu ứng kính
│   └── main.tsx            # Điểm khởi động ứng dụng
├── tests/                  # Bộ bài kiểm thử tự động
└── package.json            # Thông tin dự án và danh sách thư viện
```

---

## ⚖️ Bản Quyền Trí Tuệ

**Bản quyền trí tuệ thuộc về BroAmStuck.**  
Toàn bộ mã nguồn, thiết kế giao diện và ý tưởng hệ thống được bảo hộ và phát triển bởi BroAmStuck.
