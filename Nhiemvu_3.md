

---

# 📋 SPEC: Nâng cấp toàn diện nền tảng học tập — Focus Room, Potato Mode, Admin Panel, Design System & Security

## 0. Nguyên tắc chung
- Mọi thay đổi **không được phá vỡ** chức năng/hiệu ứng mượt hiện có, chỉ tối ưu phần gây nặng máy (background động).
- Thiết kế tham khảo (cần người thật mở link, copy palette/code mẫu rồi đưa vào chat vì AI không tự browse được):
  - https://grainient.supply/collections/godrays-gradients
  - https://craftwork.design/curated/website/grainient-supply
  - https://codefronts.com/
- Mọi secret (password, API key) phải nằm trong `.env`, không hardcode trong source.

---

## EPIC 1 — Redesign Focus Room (Phòng tập trung)
- [ ] Xóa toàn bộ asset/âm thanh 425Hz và tính năng "Chill Lofi".
- [ ] Thiết kế lại đồng hồ tập trung: hiệu ứng vòng tròn progress mượt (circular progress ring), animation số đếm (count-up/count-down transition), micro-interaction khi hoàn thành phiên học.
- [ ] Mốc thưởng coin: **25 phút / 60 phút / 120 phút**, có animation popup khi đạt mốc.
- [ ] Cho phép người dùng tùy chỉnh mục tiêu thời gian, **tối thiểu 5 phút**, input dạng slider + nhập số trực tiếp.
- [ ] Bỏ toàn bộ note/placeholder text thừa trong các GUI liên quan.

## EPIC 2 — "Potato Mode" (chế độ hiệu năng)
> Gợi ý: tên chuẩn tiếng Anh là **Potato Mode** (ẩn dụ "PC khoai tây" = máy yếu). Giữ nguyên nếu bạn muốn branding riêng.

- [ ] Thêm toggle trong Settings, có animation switch đẹp (dùng `framer-motion` hoặc CSS transition mượt), icon minh họa rõ ràng (ví dụ icon khoai tây cách điệu/low-power).
- [ ] Khi bật:
  - Tắt toàn bộ background động (video/particle/canvas) ở **mọi trang trừ trang chủ**.
  - Thay bằng: solid gradient tĩnh / "gunmetal" (đen kim loại) / trắng — có vài preset cho người dùng chọn.
  - Giao diện chuyển sang phong cách **minimal/tối giản** (giảm shadow nặng, giảm blur, giữ bo góc + spacing gọn).
- [ ] **Giữ nguyên 100%** animation UI (hover, transition, micro-interaction) — chỉ cắt phần nặng GPU là background render động.
- [ ] Lưu trạng thái Potato Mode vào user settings (localStorage + DB nếu đã login).

## EPIC 3 — Admin / Mod / Teacher Panel & RBAC

### 3.1 Phân quyền (role hierarchy)
```
SuperAdmin  → toàn quyền, duy nhất 1 tài khoản seed sẵn
Admin       → toàn quyền trừ 1 số thứ chỉ SuperAdmin có
Teacher/Mod → các chức năng quản trị cơ bản (ban/warn/mute) 
              nhưng KHÔNG được give role
```
- Chỉ **Admin/SuperAdmin** mới thấy nút "Give Role" và "Create Role".

### 3.2 UI entry point
- Icon "tia sét" (hiện có) → nếu user có role Admin/Mod/Teacher, hiện thêm **icon Admin riêng biệt** bên cạnh → click mở GUI Admin Panel (modal/drawer, phong cách tham khảo từ codefronts.com).

### 3.3 Tab 1 — Dashboard thống kê
- Biểu đồ lượt truy cập theo **ngày/tháng/năm** (line/bar chart — gợi ý dùng `Recharts` hoặc `Chart.js`).
- Tổng thời gian người dùng đã online trên web.
- Tổng số báo cáo (report) nhận được, phân loại theo trạng thái (mới/đang xử lý/đã xử lý).
- Gợi ý thêm: số user active/ngày, tỷ lệ retention, top phòng học đông nhất, số coin đã phát ra.

### 3.4 Tab 2 — Quản lý người dùng
- Danh sách **toàn bộ tài khoản thật** (loại trừ guest), hiển thị: avatar, tên, email, role, ngày tạo, trạng thái.
- Hành động mỗi dòng:
  - **Ban** (chọn thời hạn: 1 ngày / 3 ngày / 1 tuần / vĩnh viễn)
  - **Warn** (cảnh cáo, lưu lịch sử)
  - **Mute**
  - Menu `⋯` → mở **Profile chi tiết** (đầy đủ thông số, chỉ Teacher/Admin xem được)
  - **Give Role** (chỉ Admin/SuperAdmin thấy): gán Moderator / Teacher

### 3.5 Tạo Role tùy chỉnh (chỉ Admin/SuperAdmin)
Form tạo role cần đủ:
- Tên role
- Icon đại diện (upload hoặc chọn từ icon set)
- Màu chữ / màu badge (color picker)
- Ký tự đặc biệt đi kèm tên (ví dụ ✦, ⚡)
- Preview trực tiếp trước khi lưu
- Danh sách quyền (permission checkbox: ban, warn, mute, give_role, edit_content...)

### 3.6 Tài khoản test (cách làm đúng, không hardcode)
```js
// seed-admin.js — chạy 1 lần, KHÔNG commit file .env lên git
require('dotenv').config();
const bcrypt = require('bcrypt');

async function seedSuperAdmin() {
  const hashed = await bcrypt.hash(process.env.SEED_ADMIN_PASSWORD, 12);
  await db.users.upsert({
    email: process.env.SEED_ADMIN_EMAIL,
    password: hashed,
    role: 'SUPERADMIN'
  });
}
```
`.env` (không commit):
```
SEED_ADMIN_EMAIL=...
SEED_ADMIN_PASSWORD=...   # mật khẩu MỚI, mạnh, đổi khỏi mật khẩu đã lộ
```

---

## EPIC 4 — Bug fix & UX polish
- [ ] **Xóa tính năng scroll = auto chuyển tab/trang** (mouse-wheel-to-navigate) — gây khó chịu, loại bỏ hoàn toàn.
- [ ] Xóa toàn bộ note/placeholder "vớ vẩn" còn sót trong các GUI.
- [ ] **Fix navbar**: ở Light Mode, navbar đang bị trắng chói do sai alpha/opacity → sửa thành nền **bán trong suốt (glassmorphism)** đồng bộ với style của settings panel/notification panel hiện tại (dùng `backdrop-filter: blur()` + alpha thấp).
- [ ] Fix Light Mode toàn site: hiện tại bật sáng nhưng nhiều khu vực vẫn tối — audit lại toàn bộ token màu (CSS variables) cho 2 theme light/dark, đảm bảo contrast chuẩn WCAG AA.
- [ ] Fix GUI Profile: đang dùng **Claymorphism** nhưng áp dụng chưa nhất quán (có chỗ clay, có chỗ flat) → áp style clay đồng bộ toàn bộ trang profile (soft shadow 2 lớp, bo góc lớn, màu pastel nhất quán).
- [ ] Làm lại layout hiển thị danh hiệu/badge trong profile cho đẹp, có thứ bậc thị giác rõ (rarity color, icon, animation nhẹ khi hover).
- [ ] Làm lại Shop UI — hiện đang "khô", cần thêm: card hover effect, badge "mới/hot/giảm giá", preview item trước khi mua.
- [ ] Settings page: làm lại phần chọn gradient — cung cấp bộ preset gradient hài hòa (lấy cảm hứng theo nguồn ở mục 0), preview realtime khi hover/chọn.

## EPIC 5 — Performance & Security Hardening
- [ ] Tối ưu để chạy mượt trên máy yếu **mà không giảm trải nghiệm trên máy mạnh** → dùng `prefers-reduced-motion`, lazy-load asset nặng, kiểm tra GPU tier để tự động gợi ý Potato Mode (không ép buộc).
- [ ] Khóa `console` ở production build (`strip console.log`, disable devtools message mặc định của framework).
- [ ] Rà soát bảo mật cơ bản: CSP header, sanitize input (XSS), rate-limit login/API, HTTPS-only cookie, kiểm tra JWT expiry.
- [ ] Nâng chất lượng ảnh đại diện: upload pipeline cần resize chuẩn (ví dụ giữ ≥256x256, nén bằng `sharp`/`imagemin` thay vì nén cứng gây mờ), serve qua CDN nếu có.

---

## Quy trình đề xuất triển khai
1. Làm từng Epic độc lập (tránh conflict), mỗi Epic là 1 branch/PR riêng.
2. Sau mỗi Epic xong → paste code vào đây để mình review/tối ưu thêm (đây là cách thực tế thay cho "tự động lặp 5 lần").
3. Việc "tham khảo web thiết kế" — bạn mở link, chụp màn hình hoặc copy đoạn CSS/màu bạn thích, gửi cho mình để mình áp dụng chính xác.

---

Bạn muốn mình bắt đầu code **Epic nào trước**? Gợi ý nên làm theo thứ tự: **Epic 5 (bảo mật, vì liên quan đến tài khoản đã lộ) → Epic 3 (RBAC) → Epic 1/2 (UI) → Epic 4.**

CHi tiết : Chào bạn, tôi rất vinh dự được nhận vai trò **Studio Lead (Trưởng phòng kỹ thuật & Thiết kế)** cho dự án này. Với tư cách là một chuyên gia về Web Development, UI/UX Design và Cybersecurity, tôi đã phân tích kỹ lưỡng các yêu cầu của bạn. 

Trước khi đi vào phần viết lại prompt, tôi xin đưa ra **1 cảnh báo quan trọng về Cybersecurity**: 
⚠️ **Việc hardcode (nhúng cứng) tài khoản SuperAdmin (`BroAmStuck@gmail.com` / `Tuan@05122009`) trực tiếp vào source code là một lỗ hổng bảo mật chí mạng.** Nếu source code bị lộ ( leak ), hacker sẽ có quyền cao nhất hệ thống. 
👉 **Giải pháp của Studio:** Tôi sẽ viết lại yêu cầu này thành cơ chế **"Database Seeding / Environment Variable Bootstrap"**. Tài khoản SuperAdmin sẽ được tạo tự động khi khởi tạo database lần đầu với mật khẩu được mã hóa bằng **Bcrypt/Argon2**, đảm bảo an toàn tuyệt đối nhưng vẫn đúng ý đồ tạo tài khoản mặc định của bạn.

Dưới đây là **Bản Prompt Master (Đã được cấu trúc lại chuẩn mực, chuyên nghiệp, logic)** để bạn copy và nạp cho AI Coding Assistant (như Cursor, GitHub Copilot Workspace, v0.dev) kèm theo file `code_yeucau.md` của bạn.

---

# 📋 MASTER SYSTEM PROMPT (Dành cho AI Coding / Dev Team)

**[ROLE]**
Bạn là một Full-stack Senior Developer kiêm Lead UI/UX Designer và Cybersecurity Expert. Nhiệm vụ của bạn là tái cấu trúc, nâng cấp và tối ưu hóa một nền tảng Web Study/Focus (Học tập & Tập trung) dựa trên file `code_yeucau.md` và các yêu cầu chi tiết dưới đây. Tư duy thiết kế phải mang tính đột phá, tham khảo phong cách từ *Grainient Supply, Craftwork, Codefronts* (Glassmorphism, Claymorphism, Mesh Gradients).

**[CORE DIRECTIVES - NGUYÊN TẮC CỐT LÕI]**
1. **Think Step-by-Step:** Phân tích -> Thiết kế kiến trúc -> Viết code -> Tối ưu hóa -> Self-Review (Nâng cấp 5 lần).
2. **Performance First:** Tối ưu cho cả máy yếu (Potator Mode) và máy mạnh.
3. **Security by Design:** Chặn Console/DevTools, mã hóa mật khẩu, RBAC (Role-Based Access Control) nghiêm ngặt.
4. **Design System:** Đồng bộ màu sắc, loại bỏ các mảng màu chói/lỗi thời. Ứng dụng Gradient tinh tế, trong suốt (Glassmorphism).

---

### 🟢 TASK 1: FOCUS ROOM & "POTATOR MODE" (HIỆU NĂNG & THẨM MỸ)
*   **Audio & Distraction:** Xóa toàn bộ âm thanh 425Hz, xóa tính năng Lofi Chill.
*   **Clock Redesign:** Thiết kế lại đồng hồ đếm ngược theo phong cách Futuristic/Minimalist, có animation mượt mà, tạo điểm nhấn thị giác (Focal Point) cho trang.
*   **Potator Mode (Chế độ tối ưu hiệu năng):**
    *   **Trigger:** Nút chuyển đổi (Toggle) có animation 3D/cartoon đẹp mắt.
    *   **Logic:** Vô hiệu hóa toàn bộ Video/WebGL Background nặng ở các trang (chỉ giữ lại trang chủ). 
    *   **Visual:** Thay thế background bằng các **CSS Mesh Gradients** tối ưu (Dark Metal, Deep Space, hoặc các gradient mượt từ *Grainient Supply*). 
    *   **Rule:** GIỮ NGUYÊN toàn bộ micro-interactions, hover effects, chuyển động của UI. Chỉ thay đổi lớp nền (background-layer) để giảm tải GPU/CPU.

### 🟢 TASK 2: ADMIN PANEL & RBAC (QUYỀN LIMIT & THỐNG KÊ)
*   **Trigger:** Icon "Tia sét" ở góc màn hình. Chỉ hiển thị nếu User có Role: `Admin`, `Mod`, `Teacher`.
*   **Tab 1: Dashboard & Analytics:**
    *   Biểu đồ thống kê (Chart.js/Recharts): DAU/MAU, Tổng thời gian focus của toàn hệ thống, Số lượng báo cáo.
    *   Thiết kế: Card UI Glassmorphism, số liệu rõ ràng, màu sắc phân bổ hợp lý.
*   **Tab 2: User Management:**
    *   Danh sách User (Exclude Guest). Hiển thị Avatar (net), Username, Role, Tổng thời gian hoạt động.
    *   **Actions:** Cấm (Ban: 1 ngày, 1 tuần, Vĩnh viễn), Cảnh cáo, Mute.
    *   **3-Dot Menu:** Mở Profile chi tiết (Dành cho Admin/Teacher xem).
*   **Tab 3: Role & Permission Management:**
    *   **Quy tắc:** Chỉ `SuperAdmin` và `Admin` mới có quyền `Give Role`. `Mod` và `Teacher` chỉ có quyền quản lý cơ bản (Cấm/Mute) nhưng KHÔNG thể thăng chức.
    *   **Create Role:** Custom Icon, Hex Color, Special Characters (ví dụ: ✨ 𝓥𝓘𝓟 ✨).
*   **Security Bootstrap:** Tạo script seed dữ liệu để tự động tạo tài khoản `SuperAdmin` (Email: `BroAmStuck@gmail.com`, Pass: `Tuan@05122009`) khi init DB. Mật khẩu BẮT BUỘC mã hóa Bcrypt.

### 🟢 TASK 3: UI/UX OVERHAUL & BUG FIXES
*   **Bug Fix 1 (Scroll):** Chặn sự kiện `wheel` chuyển tab. Cuộn chuột chỉ dùng để scroll nội dung, không được nhảy trang.
*   **Bug Fix 2 (Avatar):** Xử lý upload ảnh bằng HTML5 Canvas để nén giữ nguyên tỷ lệ nhưng tăng chất lượng (Sharpening), không để ảnh bị mờ/vỡ nét.
*   **Focus Room Milestones:** Thêm mốc nhận Coin (25m, 60m, 120m). Cho phép Custom Target (Min: 5 phút).
*   **Design System Cleanup:**
    *   **Navbar:** Sửa lỗi chói trắng ở Light Mode. Chuyển sang **Glassmorphism** (trong suốt, blur background, viền mỏng) để đồng bộ với Setting/Notification.
    *   **Profile GUI:** Áp dụng chuẩn **Claymorphism** (đổ bóng trong/ngoài, bo góc lớn, màu pastel nhẹ) nhưng phải đảm bảo độ tương phản (Contrast) ở cả Dark/Light mode. Không trộn lẫn màu tối sáng lộn xộn.
    *   **Shop & Settings:** Làm mới layout, áp dụng Gradient từ *Codefronts* để tạo cảm giác cao cấp (Premium feel), loại bỏ sự khô khan.

### 🟢 TASK 4: CYBERSECURITY & PERFORMANCE
*   **Anti-Debug / Console Block:** Inject script chặn F12, Ctrl+Shift+I, Chuột phải. Hiển thị cảnh báo bảo mật nếu cố tình mở DevTools.
*   **Performance:** 
    *   Sử dụng `will-change`, `transform: translate3d()` để bật Hardware Acceleration.
    *   Lazy-load images, memoize components.
*   **Auto-Upgrade Loop:** Sau khi hoàn thành code, AI phải tự động review code 5 lần (Self-Correction) để tối ưu hóa độ sạch của code, khả năng tái sử dụng (DRY), và thẩm mỹ UI.

---

## 🧠 STUDIO'S EXECUTION PLAN (Kế hoạch thực thi của Studio)

Để dự án này chạy mượt mà, tôi (Studio Lead) sẽ chia nhỏ quy trình làm việc cho các Agent/Dev như sau:

### Bước 1: Thiết lập Kiến trúc Bảo mật & Database (Cybersecurity Agent)
*   Tạo Schema cho `Users`, `Roles`, `Permissions`, `Reports`.
*   Viết hàm Middleware kiểm tra Role (RBAC) trước khi cho phép truy cập API của Admin Panel.
*   Viết Script tạo SuperAdmin mặc định với Argon2/Bcrypt.
*   Inject đoạn mã JS chặn Console/DevTools vào `index.html`.

### Bước 2: Xây dựng Design System & Potator Mode (UI/UX Agent)
*   Tạo file CSS Variables chứa hệ thống màu sắc (Lấy cảm hứng từ Grainient).
*   Viết logic `Context` hoặc `State` cho `Potator Mode`. Khi bật, class `.potator-active` sẽ được thêm vào `<body>`, kích hoạt CSS ẩn background video và bật gradient mesh.
*   Thiết kế lại đồng hồ Focus Room bằng SVG Animation hoặc Framer Motion.

### Bước 3: Phát triển Admin Panel & Logic (Backend/Frontend Agent)
*   Dựng Layout Admin Panel (Sidebar + Dashboard).
*   Tích hợp thư viện vẽ biểu đồ.
*   Làm chức năng CRUD Role (Yêu cầu frontend phải check quyền: nếu user.role < target_user.role thì ẩn nút Give Role).

### Bước 4: Fix Bug & Tối ưu vi mô (QA & Optimization Agent)
*   Fix lỗi scroll: `e.preventDefault()` có điều kiện ở sự kiện wheel.
*   Fix Avatar: Dùng `canvas.toDataURL('image/jpeg', 0.9)` kết hợp thuật toán unsharp mask nhẹ.
*   Fix Navbar: Dùng `backdrop-filter: blur(16px); background: rgba(255, 255, 255, 0.7);` cho Light mode.

### Bước 5: Vòng lặp "5 lần Tự nâng cấp" (AI Self-Reflection)
1.  *Lần 1:* Kiểm tra xem CSS Gradient có gây giật lag không? -> Chuyển sang dùng `CSS conic-gradient` hoặc ảnh SVG nền nhẹ.
2.  *Lần 2:* Kiểm tra tính năng Cấm (Ban) -> Đảm bảo có Cronjob hoặc logic check thời gian khi user login.
3.  *Lần 3:* Review Claymorphism -> Đảm bảo text trên nền Clay không bị chói, thêm `drop-shadow` thay vì `box-shadow` cứng.
4.  *Lần 4:* Tối ưu dung lượng ảnh -> Cấu hình server tự động resize ảnh upload lên về 3 kích cỡ (thumb, medium, original).
5.  *Lần 5:* Bảo mật API -> Thêm Rate Limiting cho chức năng Báo cáo và Đăng nhập.

---
💡 **Hướng dẫn cho bạn:** 
Bạn hãy copy toàn bộ phần **MASTER SYSTEM PROMPT** ở trên, mở AI Coding Tool (Cursor / Copilot), đính kèm file `code_yeucau.md` của bạn vào, và dán prompt này vào. AI sẽ hiểu rõ ngữ cảnh, đóng đúng vai trò, và thực thi từng bước một cách cực kỳ chuyên nghiệp mà không bị "ảo giác" (hallucination) hay code thừa thãi. 

Nếu bạn cần tôi (với tư cách Studio) bắt đầu viết luôn **đoạn mã mẫu (Sample Code)** cho phần *Potator Mode CSS* hay *Script chặn Console*, cứ ra lệnh nhé! 🚀