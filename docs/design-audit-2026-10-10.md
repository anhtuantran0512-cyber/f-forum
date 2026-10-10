# Kiểm toán giao diện F-Forum · 10/10/2026

## Phạm vi và mức độ tin cậy

Quét cấu trúc **mã nguồn** và stylesheet của landing, điều hướng, các view chính (Home, Hỏi Đáp, CLB, Chat, Miền Ký Ức, Coming Soon), Auth, Profile, Daily, Focus, Settings, Admin và CSS nền chung. Đọc sâu các khu vực landing/pricing/FAQ, thanh ký hiệu Hỏi Đáp, font, light adapter và view Coming Soon; những khu vực còn lại mới được sàng lọc tĩnh, **chưa** duyệt từng trạng thái. Kiểm tra số học độ tương phản với nền đại diện và chạy build/lint/test. Đây là **kiểm toán tĩnh + smoke HTTP**, không phải tuyên bố mọi route đã được nhìn thấy trên thiết bị thật. Đã thử chạy Chromium để chụp dark/light desktop/mobile nhưng hệ điều hành sandbox thiếu `libnspr4.so` / `libnss3.so`; vì vậy không có ảnh chụp đáng tin và chưa thể kết luận pixel-perfect. Một số view cần đăng nhập, quyền admin và dữ liệu thực; phải kiểm tra tiếp trên trình duyệt thật.

## Lỗi xác nhận được và đã sửa

| Mức | Vị trí | Bằng chứng / tác động | Sửa |
|---|---|---|---|
| Cao | Landing Hero, CTA | Gradient chữ vàng cũ `#fde68a` trên nền sáng `#f6f7fb` chỉ **1,16:1**, điểm cam `#fb923c` ~**2,11:1**: headline thiếu tương phản. | Light gradient dùng các màu `#78350f`, `#92400e`, `#7c2d12` (**≥6,6:1** trên nền sáng); fallback khi không hỗ trợ clipping. |
| Cao | Landing Pricing | Tiêu đề gói và nút gói thường dùng `text-white` trên kính sữa trong light mode (trên nền trắng ~**1:1**); giá `0₫` chứa điểm gradient vàng gần trắng. | Chữ theo token `--ff-text`, nút ghost có tương phản theo theme, gradient giá sáng chuyển nâu đậm; CTA cao tối thiểu 44px. |
| Cao | Bảng giá, trạng thái gói | Toggle “Theo tháng / Theo năm −20%” thay đổi state nhưng **không đổi giá 0₫**; dữ liệu còn ghi Pro 49.000/470.000₫ trong khi giao diện hứa miễn phí và nút “Kích Hoạt” chỉ mở đăng ký tài khoản. | Bỏ toggle khuyến mãi giả và giá chưa công bố; gói đang mở có giá rõ ràng, Pro ghi “Sắp ra mắt” và không có nút kích hoạt, gói Sinh viên đang dùng được mới là thẻ được nhấn mạnh; CTA khác ghi đúng hành động “Tạo tài khoản miễn phí”. |
| Cao | Font mono toàn trang | `src/index.css` tải hai tên font từ `static.figma.com` nhưng CSP `font-src` không cho domain này; chữ rơi về fallback, dễ đổi chiều rộng và dấu tiếng Việt. | Tự host Geist Mono Variable qua Fontsource (có subset Vietnamese), thống nhất font-family; build xác nhận xuất tệp `.woff2` nội bộ. |
| Vừa | Landing FAQ, proof/features, status | Accent `text-amber-200/300`, xanh/violet pastel dùng trực tiếp trên kính sáng; các vùng chữ/counter không theo một quy tắc semantic. | Token màu chữ theo vai trò amber = thương hiệu/hành động, blue = thông tin, green = hoàn thành, violet = bộ sưu tập, rose = lỗi; các ink sáng/tối kiểm tra **≥4,5:1** trên nền trắng hoặc nền tối gốc. |
| Vừa | Landing nav/Highlights/Footer | Hai section cùng `id="tinh-nang"`; mục “Năng lực” cuộn tới nhầm “Tính năng”, trạng thái active nav cũng sai. | `nang-luc` là ID riêng, cập nhật nav và footer. |
| Vừa | Hỏi Đáp, thanh ký hiệu | Nút ký hiệu 24×24px, chú thích 9px và chỉ dẫn “Click” gây khó thao tác trên mobile. | Nút 44×44px, font ký hiệu 14px, focus-visible, vùng cuộn rộng hơn, chữ “Chạm để chèn”. |
| Thẩm mỹ | Landing card/CTA, Coming Soon | Các card nâng 5px, bóng phát sáng mạnh; CTA bóng + tia quét dễ tạo cảm giác nhựa. Trang Coming Soon ghi “Comming soon!!!” và footer quảng bá phiên bản không cần thiết. | Hover/bóng tiết chế, bỏ tia quét trên nút chính; headline “Sắp ra mắt”, nền tối có chủ đích cả trong light mode, font tiếng Việt nhất quán. |

## Nguyên tắc màu sau chỉnh sửa

- Nền dark: `#05070c`, chữ chính `#eef2f9`. Light: `#f6f7fb` / trắng, chữ chính `#0a1020`.
- Amber **chỉ** để biểu thị thương hiệu/CTA; blue = thông tin; green = thành công; rose = lỗi; violet chỉ cho nội dung phân loại. Không dùng tint/pastel làm màu chữ trên nền sáng.
- Màu phủ trang trí/gradient vẫn giữ nhưng không được mang thông tin quan trọng nếu chưa đạt độ tương phản. Thẻ nổi dùng viền và phân cấp chữ thay cho nhiều glow/bóng.

## Rủi ro chưa được xác nhận bằng hình ảnh — không gọi là “đã hết lỗi”

1. **Light adapter toàn app**: `src/index.css` có nhiều rule do `scripts/generate-light-adapter.mjs` sinh ra, áp dụng theo utility Tailwind và loại trừ vùng nền tối. Tính đặc hiệu cao, rất dễ xuất hiện một chỗ chữ tối trên video hoặc chữ sáng trên kính sữa khi thêm view mới. Không chỉnh trực tiếp CSS sinh tự động; kiểm tra ở từng view (Hỏi Đáp, CLB, Chat, Profile, Admin) trên trình duyệt thật, nhất là popup/overlay và trạng thái lỗi.
2. **Mật độ chữ nhỏ**: nhiều nhãn phụ trong Hỏi Đáp/Chat/Admin ở khoảng 9–11px (`QAForumView.tsx` có badge, thời gian, chú giải). Không phải nhãn nào cũng sai, nhưng cần quyết định phân cấp: nội dung cần đọc nên ≥12–13px trên mobile; badge thuần phụ có thể nhỏ hơn. Thanh ký hiệu là trường hợp đã sửa.
3. **Các bề mặt có nhiều hiệu ứng**: `src/index.css`, `AuthExperience.css`, `Boutique.css`, `AdminInsightsModal.css`, `landing.css` dùng video, blur, glow, gradient và animation. Cần duyệt cùng lúc trên màn hình yếu/reduced motion và mức blur cao; ưu tiên một điểm nhấn cho mỗi màn hình, không thêm glow chung cho mọi thẻ.
4. **Tài nguyên font/ảnh/video ngoài site**: Geist Mono đã được tự host; các font serif/Inter và nhiều video/ảnh khác vẫn phụ thuộc mạng. Cần xem fallback khi mạng chậm hoặc tải thất bại, nhất là tiêu đề có dấu tiếng Việt và UI trên video. Không thay các asset theo suy đoán.
5. **Responsive thật**: cần xem các mốc 320/390/768/1440px, zoom 200%, bàn phím và các quyền guest/member/admin. Test source và HTTP 200 **không thay cho** screenshot/đo computed style/flow trên browser. Chưa đo CLS, tương phản trên ảnh động hay phân cấp thị giác bằng mắt.

## Kế hoạch kiểm tra trực quan còn lại

1. Chụp Landing Hero → Proof → Features → Pricing → FAQ, dark/light desktop và mobile; kiểm chứng gradient chữ/price/card/nút.
2. Vào từng view chính và mở overlay (Settings, Daily, Auth, Profile, Chat, Admin), so màu chữ trên nền thật; đối chiếu trải nghiệm reduced motion.
3. Đi tab bằng bàn phím; kiểm tra vùng bấm, focus ring, thứ tự tab và màn 320px/zoom 200%; ưu tiên sửa các nhãn đọc dưới 12px và các target dưới 44px.

Kiểm thử tự động được ghi ở kết quả làm việc/PR; bộ `landing-page.test.mjs` có thêm kiểm tra WCAG AA cho token màu và gradient cùng kiểm tra liên kết section/font tự host.
