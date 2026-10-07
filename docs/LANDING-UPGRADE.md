# 🚀 F-Forum — Đánh giá & Nâng cấp toàn diện (Landing Page + Toàn bộ Web)

> Tài liệu này ghi lại **đánh giá hiện trạng**, **những gì còn thiếu**, và **toàn bộ nâng cấp đã thực hiện** cho F-Forum.
> Ngày thực hiện: 01/10/2026 · Nhánh: `arena/01a0f561-f-forum` · PR: [#1](https://github.com/anhtuantran0512-cyber/f-forum/pull/1)

---

## 1. Đánh giá hiện trạng (trước nâng cấp)

### ✅ Điểm mạnh đã có
- Kiến trúc SPA đa phân khu rõ ràng: Trang chủ, Câu lạc bộ, Hỏi đáp, Chat, Miền Ký Ức, Khu Vinh Danh, Update.
- Ngôn ngữ thiết kế Liquid Glass + 2 chủ đề Sáng/Tối, hệ thống XP 1–150 và 10 bậc huy hiệu.
- Nhiều "signature feature" ấn tượng: quả cầu 3D Fibonacci, parallax 3700px, wheel-scroll engine, telemetry HUD, Web Audio 432Hz.
- Nền tảng kỹ thuật tốt: React 19 + Vite + Tailwind v4, oxlint, 31 bài test tự động đang xanh.

### ⚠️ Khoảng trống so với một sản phẩm "production-ready"
| # | Thiếu sót | Ảnh hưởng |
|---|---|---|
| 1 | **Không có landing page/marketing surface** | Người mới truy cập rơi thẳng vào sản phẩm, không có hành trình thuyết phục để "chuyển đổi" |
| 2 | Thiếu cấu trúc bán hàng chuẩn: social proof, showcase, benefits, testimonials, pricing, FAQ, CTA cuối | Không truyền đạt được giá trị & độ tin cậy |
| 3 | Không có xu hướng **"scroll to explore"**: không có chỉ dấu cuộn, không có scroll reveal, không có chuyển động theo ngữ cảnh | Trải nghiệm tĩnh, khó giữ người dùng cuộn tiếp |
| 4 | SEO/metadata sơ khai (chỉ có `<title>` + application-name) | Chia sẻ link lên mạng xã hội không có preview, khó được tìm thấy |
| 5 | Accessibility chưa hệ thống: thiếu skip-link, thiếu `aria-expanded/controls` ở một số vùng, chưa có focus ring thống nhất | Rào cản với người dùng bàn phím/trình đọc màn hình |
| 6 | Không có đường quay lại trang giới thiệu từ trong app | Sau khi vào sản phẩm, người dùng "mắc kẹt" |
| 7 | Hệ chuyển động rải rác, chưa có primitive tái sử dụng (reveal, counter, marquee, spotlight) | Khó mở rộng, dễ phát sinh hiệu ứng nặng |

---

## 2. Đã nâng cấp những gì

### 2.1. Landing page mới — route `landing` (mặc định cho khách mới)
Cấu trúc 11 phân đoạn, đầy đủ theo brief:

1. **Sticky Navbar** — thanh tiến trình đọc, scrollspy (mục đang xem sáng lên), nút CTA, drawer kính mờ cho mobile (đóng bằng `Esc`, khoá cuộn nền).
2. **Hero** — badge "live", headline 2 tầng với gradient chuyển động, subheadline lợi ích, 2 CTA (đăng ký + xem sản phẩm), 3 gạch đầu dòng niềm tin, cụm avatar + số liệu online thật, **mock UI sản phẩm** có parallax theo cuộn và spotlight theo con trỏ.
3. **Social Proof** — marquee 7 "trụ cột niềm tin" + 4 ô số liệu đếm động lấy **trực tiếp từ store** (sinh viên online, câu hỏi, lời giải, câu lạc bộ) — không bịa số.
4. **Features (Bento)** — 7 phân khu với icon glow, hover spotlight theo con trỏ, lift nhẹ.
5. **Product Showcase — "Scroll to Explore"** — track ghim **320vh**: thao tác cuộn điều khiển việc chuyển giữa 3 mặt phẳng sản phẩm (Hỏi đáp → Câu lạc bộ → Đấu trường tri thức) kèm thanh tiến trình và dots; mobile tự động xếp dọc để không giấu nội dung sau hover.
6. **Benefits** — 4 thẻ lợi ích có số liệu + panel quote với 3 chỉ số đếm động.
7. **Testimonials** — 2 hàng marquee ngược chiều (dừng khi hover) + 1 quote nổi bật.
8. **Pricing** — 3 gói, toggle **Tháng / Năm (−20%)** với pill trượt, gói Pro được đánh dấu "Sắp ra mắt", ghi chú minh bạch.
9. **FAQ** — accordion 6 câu, animation `grid-template-rows`, đầy đủ `aria-expanded/controls/region`.
10. **CTA cuối** — card gradient + aurora, form nhận lời mời (validate email, trạng thái loading/done/error qua `role="status"`).
11. **Footer** — 4 nhóm liên kết, social, bản quyền, liên kết tới Facebook/GitHub/Email thật của dự án.

### 2.2. Hệ chuyển động & microinteraction (theo trend "scroll to explore")
- `Reveal` engine: **một IntersectionObserver dùng chung** cho ~190 điểm reveal (thay vì ~190 observer rời), delay theo `--ff-reveal-delay` → stagger mượt.
- Parallax hero ghi **trực tiếp vào DOM** trong `requestAnimationFrame`, không re-render React theo từng frame.
- Marquee kỹ thuật mới: hai nửa bằng nhau, mỗi nửa tịnh tiến đúng bằng chiều rộng của nó → **liền mạch trên mọi kích thước màn hình**, không hở khoảng trống ở màn hình siêu rộng.
- Aurora nền trôi chậm, grid mask, shimmer, ping-ring, chevron rơi, scroll-dot.
- Microinteraction: magnetic button (hút theo con trỏ), sheen chạy qua nút primary, spotlight card, spring hover/active, accordion + toggle có animation riêng.

### 2.3. Theme, Accessibility, SEO
- **Dual theme bằng token `--ff-*`**: landing tự đổi giữa Obsidian Dark và Crystalline Light theo nút chỉnh giao diện của app; đã tinh chỉnh độ tương phản cho chế độ sáng.
- CSS landing đặt trong **`@layer components`** (import từ `index.css`) → utility Tailwind vẫn override được, tránh xung đột cascade với hệ layer của Tailwind v4.
- **Accessibility**: skip-link, `<main>` landmark, `aria-label` cho mọi vùng, `aria-expanded/aria-controls` cho drawer & accordion, focus ring thống nhất qua `:focus-visible`, tôn trọng cả `prefers-reduced-motion` **lẫn** tuỳ chọn "Giảm chuyển động" trong app.
- **SEO**: bổ sung `description`, `keywords`, OpenGraph (`og:title/description/locale/type`), Twitter card, `theme-color` cho dark/light, `viewport-fit=cover`.

### 2.4. Tích hợp toàn hệ thống
- **Định tuyến thông minh**: khách mới → landing; người đã có phiên đăng nhập hoặc đã ghé thăm → vào thẳng sản phẩm (`fforum_landing_seen`).
- **Wheel-scroll engine** bỏ qua landing (giữ nguyên hành vi 4 phân khu cũ, có test bảo vệ).
- Ẩn navbar/dock trong app khi ở landing; navbar desktop và drawer mobile có thêm mục **GIỚI THIỆU** để quay lại landing.
- CTA marketing mở dialog xác thực ở **tab Đăng ký** (`initialTab`).
- **HomeView** thêm chỉ dấu cuộn "TRANG CHỦ → CÂU LẠC BỘ → HỎI ĐÁP → UPDATE" phù hợp với mô hình điều hướng bánh xe.

---

## 3. Kiểm thử & chất lượng

| Hạng mục | Kết quả |
|---|---|
| `npx tsc -b` | ✅ Không lỗi |
| `npm run lint` (oxlint) | ✅ 0 warning / 0 error trên 67 tệp |
| `npm test` | ✅ **51/51 pass** (thêm `tests/landing-page.test.mjs` 6 bài; đưa `navbar-wheel-navigation` và `settings-theme` vào script) |
| `npm run build` | ✅ Thành công (~27 kB CSS gzip, ~178 kB JS gzip) |
| Smoke render (SSR) | ✅ Landing render 223 KB HTML, đủ 11 phân đoạn, không có `NaN`/`undefined` lọt ra UI |

---

## 4. Cách tuỳ biến nhanh

| Muốn đổi gì | Sửa ở đâu |
|---|---|
| Nội dung/giá/FAQ/tính năng | `src/components/landing/landingContent.ts` (một nguồn duy nhất) |
| Màu sắc, ánh sáng, bo góc | Token `--ff-*` trong `src/components/landing/landing.css` |
| Nhịp độ animation, easing | `--ff-ease`, `--ff-marquee-duration`, các `@keyframes ff*` cùng tệp |
| Thêm/bớt phân đoạn | `src/components/landing/LandingPage.tsx` + thư mục `sections/` |
| Điều kiện hiển thị landing | `src/store/forumStore.ts` (`fforum_landing_seen`, `fforum_current_user_email`) |

---

## 5. Đề xuất giai đoạn tiếp theo

1. **Code-splitting**: tách landing và các view nặng (Khu Vinh Danh, Miền Ký Ức) bằng `React.lazy` để giảm bundle khởi tạo (~178 kB gzip hiện tại).
2. **Ảnh/OG image thật**: bổ sung `og:image` 1200×630 và favicon đa kích thước để preview mạng xã hội đẹp hơn.
3. **Analytics chuyển đổi**: đo tỉ lệ `hero CTA → đăng ký thành công` và điểm rơi trong form nhận lời mời.
4. **Pricing backend**: khi mở gói Pro, nối form nhận lời mời với store/DB thay vì mô phỏng phía client.
5. **i18n**: tách chuỗi trong `landingContent.ts` sang hệ thống dịch nếu muốn phục vụ cả tiếng Anh.
