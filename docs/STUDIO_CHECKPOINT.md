# 🛡️ BROAMSTUCK STUDIO - ACTIVE SESSION STATE CHECKPOINT
*Cơ chế tự bảo lưu ngữ cảnh & phục hồi không suy giảm chất lượng khi gặp sự cố cạn Quota / Timeout / Mất mạng / Tắt máy đột ngột.*

---

## 📌 THÔNG TIN PHIÊN LÀM VIỆC
- **Dự án**: F-Forum (`arena/62613a87-f-forum`)
- **Thư mục làm việc**: `/home/broamstuck/f-forum`
- **Thời gian Checkpoint**: 2026-10-17T22:02:30+07:00
- **Trạng thái Git**: Nhánh `arena/62613a87-f-forum` (PR #18 — giữ mở theo yêu cầu).
- **Tình trạng Kiểm thử**: 470/470 tests passed | Build thành công 100% | 0 Lint errors/warnings (`oxlint` + `tsc -b`).

---

## ✅ HOÀN THÀNH NHIỆM VỤ 12 (UI/UX REDESIGN & CRITICAL THINKING LOOP)
1. **Wave 1 — Khắc phục gốc rễ lỗi Nametag quá khổ (`DecoratedAvatar.tsx`, `decorations.css`)**:
   - Tài khoản chưa đeo bảng tên hiển thị tên gọn chuẩn chữ thường (`.npd-name`), không tạo khung giả chiếm diện tích.
   - Tài khoản đeo bảng tên inline dùng `.npd-np--tag` (`width: fit-content`, `max-height: 24px`, `padding: 1.5px 7px`), trong khi thanh hồ sơ giữ nền Discord (`UserNameplateBg`) kèm lớp phủ tương phản trên cả nền tối và sáng.
2. **Wave 2 — Bộ Icon SVG Ghibli Ấm Áp & Tinh Giản Chữ Rườm Rà (`CozyGhibliIcons.tsx`, `Navbar.tsx`, `ChatDock.tsx`, `ChatView.tsx`)**:
   - Tạo bộ 18 icon SVG vẽ tay phong cách Ghibli/Cozy duotone đồng nhất, gắn trực tiếp vào thanh điều hướng và khung chat.
   - Gỡ bỏ dòng khẩu hiệu rườm rà trên đầu `ChatDock` và chuyển nút `"Thu hồi tin nhắn"` dài dòng thành nút icon gọn có `sr-only` + `title`.
3. **Wave 3 — Hợp Nhất Cài Đặt Nền & Lý Thuyết Màu Sắc 60-30-10 (`SettingsModal.tsx`, `fabulousTheme.css`)**:
   - Đặt **Fabulous** và **Potator Mode** nằm ngang cạnh nhau (`grid-cols-2 gap-2`).
   - Gộp 3 mục nền rời rạc ("Nền tối", "Chọn giao diện nền", "Nền tĩnh") thành một khối **"Cấu hình nền"** duy nhất.
   - Giữ hiệu ứng **Liquid Glass** chuẩn xác cho **Navbar** trên cả nền sáng và nền tối; gỡ `backdrop-filter` trên các bề mặt nội dung nền sáng khác để áp bảng màu giấy ấm 60-30-10 cân đối, rõ chữ.
4. **Wave 4 — Khôi Phục Video/Hiệu Ứng Fabulous (Opt-in) & Hiệu Ứng Hồ Sơ Theo Cự Ly Chuột (`App.tsx`, `useDecorationMedia.ts`, `ProfileModal.tsx`, `UserQuickCard.tsx`, `ProfileDropdown.tsx`, `ProfileSignature.css`)**:
   - Khôi phục lớp video nền chuyển cảnh (`TriVideoCrossfadeBg`) cùng dải cực quang `.ff-fabulous-stage` chỉ khi bật `fabulousMode && !potatorMode` (người dùng thường tắt Fabulous hoàn toàn không tốn GPU/mạng).
   - Bổ sung hook `useProfileProximityEffect` và thuộc tính `data-profile-active="true" | "false"`: khi con trỏ chưa lại gần hoặc chưa lướt vào, trang cá nhân hiển thị ở trạng thái tĩnh bình thường; khi chuột tiến lại gần (`<= 88–96px`), lướt vào hoặc focus bàn phím, hiệu ứng khung/hào quang/hạt sáng mới kích hoạt mượt mà.
