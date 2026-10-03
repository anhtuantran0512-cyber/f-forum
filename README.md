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
- Đăng bài thông báo lịch sinh hoạt, tuyển thành viên và hình ảnh hoạt động.
- Thành viên có thể theo dõi và tham gia câu lạc bộ yêu thích.

### 3. Phòng Chat Trực Tuyến (Live Chat)
- Trò chuyện và thảo luận bài học trực tiếp theo thời gian thực (Real-time).
- Cửa sổ chat dạng dock thu gọn hoặc toàn màn hình, hỗ trợ hiển thị danh sách người dùng đang trực tuyến.
- Nhấp vào tên hoặc ảnh đại diện để xem nhanh hồ sơ cá nhân của người chat.

### 4. Điểm Danh & Câu Hỏi Vui Hàng Ngày
- **Điểm danh 15 ngày**: Đăng nhập mỗi ngày để nhận Coin tích lũy. Hoàn thành các mốc ngày 5, 10, 15 để nhận thêm hộp quà.
- **Kho quà**: Mở các hộp quà ảo để nhận vật phẩm lưu niệm và điểm thưởng.
- **Câu hỏi vui (Trivia Quiz)**: Mỗi ngày có một câu đố kiến thức ngắn trong 15 giây. Trả lời đúng được thưởng Coin kèm nút "Xem lại" để đọc lời giải thích chi tiết.

### 5. Cửa Hàng Vật Phẩm Ảo (Chill Box)
- Sử dụng điểm Coin tích lũy được từ việc giải bài tập và điểm danh để đổi vật phẩm trang trí.
- 12 vật phẩm ảo thiết kế riêng được chia theo các cấp độ màu sắc: Xanh lá, Xanh lam, Đỏ và Tím.
- Các vật phẩm đã sở hữu có thể trang bị trực tiếp lên trang cá nhân.

### 6. Hồ Sơ Cá Nhân & Báo Cáo Vi Phạm
- Hiển thị 6 chỉ số hoạt động: Tổng Coin, Lượt cảm ơn, Câu trả lời hay nhất, Đánh giá 5 sao, Xác thực và Số người đã giúp đỡ.
- Biểu đồ mạng nhện (Radar Chart) thể hiện thế mạnh giải bài theo 6 nhóm môn học.
- Nút **Tố Cáo Tài Khoản**: Cho phép người dùng báo cáo các hành vi vi phạm (spam, quấy rối, ngôn từ độc hại) về ban quản trị để xử lý kịp thời.

### 7. Hệ Thống 8 Cấp Bậc Học Đường
Hệ thống cấp bậc được đặt tên gần gũi với học sinh theo tiến trình tích lũy Coin:
1. 🌱 **Học Sinh** (0 Coin)
2. 🌿 **Học Sinh Giỏi** (150 Coin)
3. ☘️ **Học Sinh Xuất Sắc** (400 Coin)
4. 🍃 **Thông Thái** (800 Coin)
5. ⭐ **Tài Năng** (1,500 Coin)
6. 🌾 **Thiên Tài** (3,000 Coin)
7. 👑 **Bậc Thầy** (6,000 Coin)
8. 🔮 **Chuyên Gia** (12,000 Coin)

### 8. Giao Diện & Tùy Chọn Hiển Thị
- Hỗ trợ cả 2 chế độ: Giao diện Sáng (Light Mode) và Giao diện Tối (Dark Mode).
- **Thanh điều hướng linh hoạt**: Có thể đặt ở 4 vị trí: Trên cùng, Dưới cùng, Cạnh trái hoặc Cạnh phải màn hình.
- Các cửa sổ thông báo, cài đặt và tài khoản tự động điều chỉnh hướng mở tương ứng để không bị che khuất.
- Tính năng tự động ẩn thanh điều hướng sau 1 giây khi không di chuột để tăng diện tích hiển thị nội dung.
- Tích hợp âm thanh nền nhẹ nhàng hỗ trợ tập trung học tập (Ambient Audio) và hẹn giờ học tập (Focus Mode).

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

# Chạy toàn bộ 51 bài kiểm thử tự động
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
│   └── forumServer.ts
├── src/
│   ├── components/         # Các thành phần giao diện (Navbar, Modal, View...)
│   │   ├── landing/        # Trang giới thiệu
│   │   └── views/          # Màn hình chính: Hỏi đáp, Câu lạc bộ, Chat, Vinh danh...
│   ├── store/              # Quản lý trạng thái ứng dụng (forumStore)
│   ├── types/              # Định nghĩa kiểu dữ liệu TypeScript
│   ├── utils/              # Các hàm tiện ích (âm thanh, thông báo, lưu trữ, cấp bậc)
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
