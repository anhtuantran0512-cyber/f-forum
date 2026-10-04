# F-Forum — Diễn Đàn Học Sinh & Sinh Viên

<div align="center">

![React](https://img.shields.io/badge/React_19-20232A?style=flat&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript_5-007ACC?style=flat&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite_6-646CFF?style=flat&logo=vite&logoColor=white)
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
- Cho phép đính kèm hình ảnh tài liệu bài tập (hỗ trợ tệp dung lượng tối đa 20MB và tự động tối ưu hóa).
- Cơ chế tiền thưởng Coin: Người hỏi có thể đặt mức thưởng từ 10 đến 100 Coin để khuyến khích câu trả lời nhanh và chất lượng.
- Người giải đáp được chọn "Đáp Án Chuẩn" sẽ nhận 50% tiền thưởng cược cộng thêm 100 Coin danh dự.

### 2. Câu Lạc Bộ & Hoạt Động Ngoại Khóa
- Danh sách các câu lạc bộ học thuật, thể thao, nghệ thuật và tình nguyện.
- **Nộp hồ sơ thành lập CLB** — học sinh đăng nhập gửi hồ sơ, hồ sơ luôn ở trạng
  thái *Chờ duyệt* cho tới khi Ban Quản Trị chấp thuận. Chủ nhiệm được thăng cấp
  `CLUB_LEADER` kèm 250 XP và gắn CLB vào phạm vi quản lý của mình.
- **Duyệt / từ chối hồ sơ** trong trang quản trị, kèm lý do từ chối ghi lại trên
  hồ sơ để người nộp biết cần bổ sung gì.
- Đăng bài thông báo lịch sinh hoạt, tuyển thành viên và hình ảnh hoạt động.
- Thành viên có thể theo dõi và tham gia câu lạc bộ yêu thích.
- Toàn bộ hồ sơ và bài viết CLB **lưu trên máy chủ**, nên dữ liệu hiện ra giống
  nhau trên mọi thiết bị và không mất khi xoá bộ nhớ đệm trình duyệt.

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
- **Nhắc nghỉ mắt 20-20-20**: Cứ 20 phút hiện lớp phủ thư giãn 20 giây với vòng thở dịu mắt (bật/tắt trong Cài đặt → Trải nghiệm).
- **Sao lưu & khôi phục**: Xuất/nhập toàn bộ dữ liệu học tập trên trình duyệt thành một tệp JSON trong Cài đặt → Hệ thống.
- **Phím tắt**: ⌘/Ctrl + K (bảng lệnh), ⌘/Ctrl + I (sổ tay), ⌘/Ctrl + Shift + L (theme), ⌘/Ctrl + Shift + F (Focus Mode).

### 7. Trung Tâm Điều Khiển (Cài đặt)
- Ba nhóm tab cao cấp: **Giao diện** (theme, gradient không gian dạng tile, cỡ chữ, độ mờ kính), **Trải nghiệm** (mockup chọn vị trí navbar bằng cách chạm vào cạnh khung, tự ẩn, chế độ chỉ hiện icon, âm thanh, chuyển động, không gian tập trung, phím tắt) và **Hệ thống** (sao lưu, xóa cache, đặt lại dữ liệu).

### 8. Hồ Sơ Cá Nhân & Báo Cáo Vi Phạm
- Hiển thị 6 chỉ số hoạt động: Tổng Coin, Lượt cảm ơn, Câu trả lời hay nhất, Đánh giá 5 sao, Xác thực và Số người đã giúp đỡ.
- Biểu đồ mạng nhện (Radar Chart) thể hiện thế mạnh giải bài theo 6 nhóm môn học.
- Nút **Tố Cáo Tài Khoản**: Cho phép người dùng báo cáo các hành vi vi phạm (spam, quấy rối, ngôn từ độc hại) về ban quản trị để xử lý kịp thời.

### 9. Hộp Thư Tố Cáo Dành Cho Ban Quản Trị
- Nút **Tố Cáo Tài Khoản** ở hồ sơ, phòng chat và sàn Q&A gửi báo cáo về máy chủ.
- **Hộp thư tố cáo** (chỉ Super Admin) liệt kê báo cáo kèm huy hiệu số vụ chờ xử lý, cho phép đánh dấu *Đã xử lý*, *Bỏ qua* hoặc *Xoá* kèm ghi chú.
- Báo cáo được lưu bền vững (không mất khi khởi động lại), tố cáo trùng tự gộp, và Super Admin đang trực nhận thông báo ngay khi có vụ mới.

### 10. Hệ Thống 8 Cấp Bậc Học Đường
Hệ thống cấp bậc được đặt tên gần gũi với học sinh theo tiến trình tích lũy Coin:
1. 🌱 **Học Sinh** (0 Coin)
2. 🌿 **Học Sinh Giỏi** (150 Coin)
3. ☘️ **Học Sinh Xuất Sắc** (400 Coin)
4. 🍃 **Thông Thái** (800 Coin)
5. ⭐ **Tài Năng** (1,500 Coin)
6. 🌾 **Thiên Tài** (3,000 Coin)
7. 👑 **Bậc Thầy** (6,000 Coin)
8. 🔮 **Chuyên Gia** (12,000 Coin)

### 11. Giao Diện & Tùy Chọn Hiển Thị
- Hỗ trợ cả 2 chế độ: Giao diện Sáng (Light Mode) và Giao diện Tối (Dark Mode).
- **Thanh điều hướng linh hoạt**: Có thể đặt ở 4 vị trí: Trên cùng, Dưới cùng, Cạnh trái hoặc Cạnh phải màn hình.
- **Nút F (logo) là lối vào trang Giới thiệu** — không còn tab chữ "GIỚI THIỆU" cho thanh gọn hơn.
- **Miền Ký Ức · Khu Vinh Danh · Update luôn ở dạng icon** (có vạch phân cách và tooltip khi rê chuột), kể cả khi thanh đang mở rộng.
- Nhịp thu nhỏ / phóng to thanh điều hướng được kéo dài (0.78s) với đường cong êm, panel Cài đặt lướt theo thay vì nhảy từng nấc.
- Các cửa sổ thông báo, cài đặt và tài khoản tự động điều chỉnh hướng mở tương ứng để không bị che khuất; panel Cài đặt có hoạt ảnh mở/đóng mềm mại kèm lớp phủ mờ dần.
- Tính năng tự động ẩn thanh điều hướng sau khoảng 1.2 giây khi không di chuột để tăng diện tích hiển thị nội dung.
- Tích hợp âm thanh nền nhẹ nhàng hỗ trợ tập trung học tập (Ambient Audio) và hẹn giờ học tập (Focus Mode).

---

## 🔐 Bảo Mật & Toàn Vẹn Dữ Liệu

Máy chủ không tin dữ liệu client gửi lên. Toàn bộ tầng xác thực nằm ở
`server/authGuard.ts` và `server/socialAuth.ts`:

- **Mật khẩu**: băm `scrypt` + salt, so khớp thời gian cố định, tự nâng cấp bản ghi plaintext cũ.
- **Phiên đăng nhập**: token ký `HMAC-SHA256`, hạn 30 ngày, gửi qua `Authorization: Bearer`.
- **WebSocket**: bắt tay `AUTH` trước khi được đụng tới dữ liệu nhạy cảm.
- **Hồ sơ**: `role` / `id` / `email` do server sở hữu; `level` luôn tính lại từ `xp`.
- **Tiền Coin**: kiểm tra số dư khi treo thưởng, thưởng đáp án chuẩn chỉ phát một lần.
- **Chặn brute-force**: cửa sổ trượt theo IP + email, trả `429` kèm `Retry-After`.
- **Đăng nhập Google/Facebook**: máy chủ tự kiểm chứng access token với nhà cung cấp.

Chi tiết từng lỗ hổng đã tìm thấy và cách vá: **[docs/SECURITY.md](docs/SECURITY.md)**.

```bash
# 52 bài kiểm thử bảo mật, chạy trên máy chủ thật qua HTTP/WebSocket
node --test tests/security-hardening.test.mjs
```

---

## 🛠️ Công Nghệ Sử Dụng

- **Frontend**: React 19, TypeScript
- **Styling**: Tailwind CSS v4, hiệu ứng kính mờ (Liquid Glass)
- **Công cụ xây dựng**: Vite 6
- **Thời gian thực**: WebSocket, BroadcastChannel API
- **Âm thanh**: Web Audio API
- **Biểu tượng**: Lucide React và icon SVG tự thiết kế
- **Kiểm thử & Chất lượng mã nguồn**: Node.js Test Runner, Oxlint

---

## 🚀 Cài Đặt & Khởi Chạy

### Yêu cầu hệ thống
- Đã cài đặt **Node.js** (phiên bản 18 trở lên).
- Trình quản lý gói: `npm` (hoặc `yarn`, `pnpm`).

### Các bước thực hiện

```bash
# 1. Tải mã nguồn về máy
git clone https://github.com/anhtuantran0512-cyber/f-forum.git

# 2. Đi vào thư mục dự án
cd f-forum

# 3. Cài đặt các thư viện cần thiết
npm install

# 4. Chạy dự án ở môi trường phát triển
npm run dev
```

Sau khi chạy lệnh, mở trình duyệt web và truy cập địa chỉ: `http://localhost:5173`

### Chạy kiểm thử & Đóng gói sản phẩm

```bash
# Kiểm tra lỗi cú pháp với Oxlint
npx oxlint

# Chạy toàn bộ 148 bài kiểm thử tự động
npm test

# Biên dịch mã nguồn cho môi trường sản xuất
npm run build
```

---

## 📁 Cấu Trúc Thư Mục

```text
f-forum/
├── public/                 # Tệp tĩnh (ảnh, icon)
├── server/                 # Mã nguồn máy chủ WebSocket và API phụ trợ
│   ├── forumServer.ts      # Định tuyến API + WebSocket
│   ├── authGuard.ts        # Băm mật khẩu, token HMAC, rate limit, lọc payload
│   └── socialAuth.ts       # Kiểm chứng đăng nhập Google / Facebook
├── src/
│   ├── components/         # Các thành phần giao diện (Navbar, Modal, View...)
│   │   ├── landing/        # Trang giới thiệu
│   │   └── views/          # Màn hình chính: Hỏi đáp, Câu lạc bộ, Chat, Vinh danh...
│   ├── store/              # Quản lý trạng thái ứng dụng (forumStore)
│   ├── context/            # AuthContext — tài khoản đang đăng nhập
│   ├── types/              # Định nghĩa kiểu dữ liệu TypeScript
│   ├── utils/              # Các hàm tiện ích (âm thanh, thông báo, lưu trữ, cấp bậc)
│   ├── App.tsx             # Thành phần gốc điều hướng giao diện
│   ├── index.css           # Cấu hình giao diện và hiệu ứng kính
│   └── main.tsx            # Điểm khởi động ứng dụng
├── docs/                   # Tài liệu thiết kế & bảo mật
├── tests/                  # Bộ bài kiểm thử tự động (148 bài)
└── package.json            # Thông tin dự án và danh sách thư viện
```

---

## ⚖️ Bản Quyền Trí Tuệ

**Bản quyền trí tuệ thuộc về BroAmStuck.**  
Toàn bộ mã nguồn, thiết kế giao diện và ý tưởng hệ thống được bảo hộ và phát triển bởi BroAmStuck.
