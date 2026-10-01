# 🏛️ F-Forum — Next-Gen University Digital Campus & Community Hub

<div align="center">

![F-Forum Banner](https://img.shields.io/badge/F--Forum-v2.0_Production_Master-amber?style=for-the-badge&logo=react&logoColor=black)
![React](https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript_5-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite_6-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS_v4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

**Đồ án Nền tảng Diễn đàn & Không gian Số Sinh viên Đại học FPT**  
*Kiến trúc Giao diện Tương tác Cao cấp • Thiết kế Xu hướng 2026 Liquid Glass • Hiệu ứng Đồ họa 3D Fibonacci Sphere & Parallax Storytelling*

[Trải nghiệm Ngay](#-cài-đặt--chạy-thử-quickstart) • [Tính năng Nổi bật](#-tính-năng-cốt-lõi-core-features) • [Kiến trúc Kỹ thuật](#-kiến-trúc-hệ-thống) • [Tác giả](#-tác-giả--bản-quyền)

</div>

---

## 📖 Giới thiệu Dự án (About F-Forum)

**F-Forum** là nền tảng mạng xã hội và diễn đàn thông tin toàn diện dành cho sinh viên trường Đại học FPT, được định hình theo chuẩn mực trải nghiệm số hiện đại của năm 2026. 

Không chỉ dừng lại ở các bài đăng trao đổi thông thường, F-Forum tích hợp các công nghệ tương tác đồ họa hàng đầu: quả cầu ký ức 3D Fibonacci Photo Sphere, chuỗi hành trình cuộn trang siêu mượt (Mostar 3700px Parallax Storytelling), hệ thống telemetry trạm đo khuôn viên trường thời gian thực, phòng chat trực tuyến đa luồng âm thanh - hình ảnh, và bộ điều khiển giao diện kính mờ quang học **Crystalline Liquid Glass**.

Dự án được xây dựng với phương châm **Zero-Defect Logic, Pixel-Perfect Aesthetics, và Mobile-First Responsiveness**.

---

## ✨ Tính năng Cốt lõi (Core Features)

### 💎 1. Ngôn ngữ Thiết kế Kính Crystalline Liquid Glass 2026 & Dual Themes
- **Liquid Glass Original (Light Mode)**: Lớp kính thủy tinh pha lê trong suốt quang học cao cấp với độ mờ vi mô (`backdrop-blur-md`), viền sáng khúc xạ ngọc bích, và độ bão hòa ánh sáng rực rỡ chuẩn thiết kế iOS thế hệ mới.
- **Obsidian Liquid Glass (Dark Mode)**: Chế độ nền tối đá vỏ chai sâu thẳm (`#0a0f14`), tăng cường độ tập trung ban đêm, chống mỏi mắt và bảo vệ pin OLED.
- **Playful Cartoon Theme Switcher**: Nút chuyển đổi phong cách hoạt hình với hoạt ảnh chuyển động mềm mại, đàn hồi (spring physics) và âm thanh click xúc giác.

### 🌐 2. Ethan Vale 3D Fibonacci Photo Sphere & Intro Eye Film
- Trực quan hóa những khoảnh khắc đẹp nhất của sinh viên dưới dạng mạng lưới Fibonacci hình cầu 3D tương tác.
- Tự động xoay quanh quỹ đạo không gian thực, hỗ trợ kéo chuột xoay 360 độ và phóng to khi rê chuột.
- Hiệu ứng mở đầu ấn tượng với màng mắt cơ học (Eye Iris Film) tự động thu mở mượt mà khi vào trang.

### 📜 3. Mostar Miền Ký Ức (3700px Sticky Parallax Storytelling)
- Tuyến cuộn hồi tưởng lịch sử và dấu ấn thanh xuân qua chiều sâu 3700 pixel.
- Tận dụng kỹ thuật ghim vị trí dính (Sticky Pinning) kết hợp chuyển tiếp mờ dần và dịch chuyển thị sai nhiều lớp (Multi-layer Parallax).

### 🚀 4. Động cơ Điều hướng Bánh xe Cuộn Toàn Màn Hình (Wheel-Scroll Transition Engine)
- Tự động bám khớp (locked-viewport) và chuyển đổi mượt mà 650ms giữa 4 phân vùng chính:
  $$\text{[TRANG CHỦ]} \longrightarrow \text{[CÂU LẠC BỘ]} \longrightarrow \text{[HỎI ĐÁP]} \longrightarrow \text{[UPDATE]}$$
- Khắc phục triệt để hiện tượng văng giật (scroll jitter) và mở rộng tràn container định hướng.

### 💬 5. Phòng Chat Thời Gian Thực Đa Kênh & Khử Trùng Lặp Idempotent
- Phòng chat tích hợp bộ ba video nền luân chuyển (Tri-Video Crossfade) theo tâm trạng người dùng.
- Cơ chế khử trùng lặp tin nhắn thời gian thực dựa trên UUIDv4 và bộ lọc Set-Based Reducer.
- Danh sách người dùng trực tuyến động (Presence System) hiển thị trạng thái sinh động.

### 📊 6. Campus Telemetry Glass HUD (Trung tâm Dữ liệu Khuôn viên)
- Bảng điều khiển kính nổi theo dõi trực tiếp:
  - ⚡ CPU Load & FPS đồ họa thời gian thực
  - 🌐 Độ trễ mạng (Network Latency Ping)
  - 👥 Số lượng sinh viên đang trực tuyến trong khuôn viên
  - 📡 Trạng thái kênh đồng bộ máy chủ

### 🎵 7. Web Audio Procedural Soundscape
- Tích hợp động cơ âm thanh tổng hợp đa tầng thông qua Web Audio API (White noise, Pink noise, Biquad Filter).
- Âm thanh môi trường tập trung học tập (Focus Ambient Audio: Mưa rơi, Sóng biển, Không gian thư viện) hoàn toàn không phụ thuộc tệp âm thanh tĩnh nặng nề.

### 📱 8. Kiến trúc Đa Nền tảng (Desktop Pill & Native Mobile Dock)
- **Desktop (>= 768px)**: Thanh định hướng kính nổi dạng viên thuốc (Floating Glass Pill) nằm ngang nghiêm ngặt không bị rớt dòng (`whitespace-nowrap`).
- **Mobile (< 768px)**: Tách biệt hoàn hảo giữa Thanh tiêu đề trên (Top Bar) và Thanh phím tắt dưới đáy (Bottom Tab Dock) chuẩn trải nghiệm ứng dụng bản địa (Native App UX).

### 🛡️ 9. Xác thực Google OAuth & Quyền Quản trị Admin
- Hỗ trợ đăng nhập một chạm qua Google Identity Services.
- Cấp quyền quản trị viên tối cao (Master Admin) độc quyền cho tài khoản `anhtuantran0512@gmail.com` với huy hiệu phát sáng và bảng công cụ kiểm duyệt bài viết.

---

## 🛠️ Ngăn xếp Công nghệ (Tech Stack)

| Lớp (Layer) | Công nghệ | Mục đích |
|---|---|---|
| **Frontend Framework** | React 19 (TypeScript) | Lập trình thành phần giao diện khai báo hiện đại |
| **Build Tool & HMR** | Vite 6 | Đóng gói siêu tốc với Hot Module Replacement dưới 50ms |
| **Styling & Effects** | Tailwind CSS v4 + Liquid Glass CSS | Hệ màu 2026, kính quang học và hiệu ứng ánh sáng |
| **Canvas & 3D Math** | HTML5 Canvas 2D + Spherical Trigonometry | Tính toán quỹ đạo khối cầu Fibonacci 3D |
| **Audio Engine** | Web Audio API | Bộ dao động sóng âm và bộ lọc thời gian thực |
| **Backend & Sync** | Node.js + WebSocket / BroadcastChannel | Đồng bộ hóa dữ liệu thời gian thực và sự kiện phòng chat |
| **Icons** | Lucide React | Thư viện biểu tượng vector sắc nét, tối giản |
| **Code Quality** | Oxlint + Node Test Runner | Kiểm tra cú pháp siêu nhanh và 45/45 bài test tự động |

---

## 📁 Cấu trúc Thư mục (Project Architecture)

```bash
f-forum/
├── public/                 # Tài nguyên tĩnh (ảnh khuôn viên, logo, video nền)
├── src/
│   ├── components/         # Các thành phần giao diện hạt nhân
│   │   ├── Navbar.tsx      # Thanh định hướng Kính mờ Single-line + Popups
│   │   ├── SettingsModal.tsx # Bảng điều khiển cài đặt giao diện hoạt hình
│   │   ├── EthanValeSphere.tsx # Quả cầu ảnh 3D Fibonacci Canvas
│   │   ├── MostarParallax.tsx  # Tuyến cuộn 3700px Miền Ký Ức
│   │   ├── CampusHUD.tsx   # Glass Telemetry HUD giám sát hệ thống
│   │   ├── ChatRoom.tsx    # Phòng chat thời gian thực khử trùng lặp
│   │   ├── ClubDirectory.tsx # Danh bạ các CLB trường ĐH FPT
│   │   └── QAFourm.tsx     # Phân hệ Hỏi - Đáp và Diễn đàn sinh viên
│   ├── contexts/           # Quản lý trạng thái toàn cục (Theme, Auth, Audio)
│   ├── hooks/              # Custom hooks (useAudio, usePresence, useWheelScroll)
│   ├── types/              # Định nghĩa kiểu dữ liệu TypeScript chặt chẽ
│   ├── App.tsx             # Điều phối luồng trang và chuyển đổi thiết bị
│   ├── index.css           # Cấu hình Tailwind v4 & Liquid Glass Filters
│   └── main.tsx            # Điểm khởi chạy ứng dụng
├── tests/                  # Bộ kiểm thử tự động (Navbar, Themes, Logic)
├── vite.config.ts          # Cấu hình biên dịch Vite
└── package.json            # Danh mục gói phụ thuộc & scripts
```

---

## 🚀 Cài đặt & Chạy thử (Quickstart)

### 1. Yêu cầu Hệ thống
- **Node.js**: Phiên bản `>= 18.0.0` (Khuyến nghị `v20+` hoặc `v22 LTS`)
- **Trình quản lý gói**: `npm`, `yarn`, `pnpm` hoặc `bun`

### 2. Các bước Cài đặt

```bash
# 1. Sao chép kho mã nguồn về máy
git clone https://github.com/anhtuantran0512-cyber/f-forum.git

# 2. Điều hướng vào thư mục dự án
cd f-forum

# 3. Cài đặt các gói phụ thuộc
npm install

# 4. Cấu hình biến môi trường (tùy chọn)
cp .env.example .env

# 5. Khởi chạy máy chủ phát triển (Development Server)
npm run dev
```

Mở trình duyệt và truy cập `http://localhost:5173` để trải nghiệm F-Forum.

### 3. Kiểm tra Mã nguồn & Kiểm thử (Tests & Linting)

```bash
# Kiểm tra tĩnh siêu tốc với Oxlint
npx oxlint

# Chạy toàn bộ 45 bài test tự động (Navbar, Wheel-Scroll, Theme Engine)
npm test
node --test tests/navbar-wheel-navigation.test.mjs tests/settings-theme.test.mjs

# Biên dịch gói sản phẩm hoàn thiện (Production Build)
npm run build
```

---

## 🎨 Trải nghiệm Người dùng & Hình ảnh Minh họa

<div align="center">

| Thanh Định hướng Kính Crystalline | Quả cầu Ký ức 3D Fibonacci |
| :---: | :---: |
| *Thanh điều hướng nổi không tràn dòng, kính phản chiếu đa lớp* | *Tương tác xoay 360 độ các khung hình hoạt động sinh viên* |

| Tuyến cuộn Ký ức Mostar 3700px | Campus Telemetry Glass HUD |
| :---: | :---: |
| *Thị sai đa tầng tái hiện dấu ấn thanh xuân qua từng bước cuộn* | *Theo dõi thông số CPU, FPS, sinh viên trực tuyến trực quan* |

</div>

---

## 👨‍💻 Tác giả & Bản quyền (Author & License)

- **Trưởng nhóm Phát triển & Kiến trúc sư Hệ thống**: **Trần Văn Anh Tuấn**
  - **GitHub**: [@anhtuantran0512-cyber](https://github.com/anhtuantran0512-cyber)
  - **Email**: `anhtuantran0512@gmail.com`
  - **Đơn vị phát triển**: BroAmStuck Studio

Dự án được phát hành theo giấy phép **MIT License**. Mọi quyền được bảo lưu © 2026 BroAmStuck Studio.
