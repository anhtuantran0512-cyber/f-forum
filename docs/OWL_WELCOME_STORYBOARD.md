# The Owl's Welcome · Storyboard kỹ thuật

Đây là sequence **mới**, không khôi phục `SessionDoor` cũ. Cảnh kết quả dùng người hoạt hình có thân/áo/tóc/mặt/chân/balo; không phải stickman trần. Cú Bông có ngôi sao nhỏ màu đồng trên cánh, lặp ở sân khấu form và cảnh kết quả.

| Mốc | Hình ảnh | Cơ chế |
|---|---|---|
| 0–0,66s | Cú lấy đà, đáp xuống với overshoot nhẹ rồi settle | `translate3d`/opacity, easing `cubic-bezier(.16,1,.3,1)`; SVG inline |
| 0,7–1,06s | Cánh vỗ sau khi thân đã đáp | keyframe trên hai cánh, không chồng transform lên thân |
| 0,17–0,61s | Bảng đồng xuất hiện sau Cú 0,17s | translate/opacity; nút HTML có thể click/Enter ngay |
| Chờ | Cú chớp mắt, mắt theo chuột; bảng thở sáng | 1 RAF tối đa cho mắt theo chuột (không React render theo pointer); glow opacity trên pseudo |
| Click → 0,15s | Bảng nén nhẹ | `scale(.95)`, phản hồi nhấn |
| Click → 0,82s | Cú về sân khấu trái theo cung; bảng thành form | **FLIP**: đo `board`/`panel` bằng DOMRect một lần, ghost `pointer-events:none` chỉ `translate/scale/opacity`; cùng Cú SVG không remount |
| 0,3–0,8s | Header, tabs, các ô nhập xếp hàng hiện | stagger 80ms bằng transform + opacity; form đã tương tác được từ lúc click, không phải chờ animation |
| Focus | Cú chăm chú nhìn email/tên, che mắt khi gõ mật khẩu | callback `focusField`/`torchMode` giữ nguyên; input có viền đồng chuyển động |
| Hover nút | Gõ chữ / xóa ngược | 38ms gõ, 30ms xóa; nút có aria-label cố định |
| Thành công đăng nhập | Cú vẫy cánh, người học bước vào cửa, cú nhìn theo | form **đóng ngay** rồi cảnh trang trí tồn tại tối đa 1,55s; click trang bên dưới vẫn được |
| Thành công đăng ký | Cú tặng sao, confetti nhỏ rồi dẫn người học qua cửa | kịch bản riêng, cùng cơ chế không chặn tương tác |

**Điều hướng & an toàn:** Ngay tại bảng chào có nút đổi Đăng nhập/Đăng ký; trên form có nút **Lời chào** để xem lại intro mà không xóa dữ liệu đang nhập. Tab form hỗ trợ mũi tên/Home/End. Form đăng ký báo độ mạnh và trạng thái khớp mật khẩu (gợi ý, không thay luật phía máy chủ). Focus bắt đầu ở bảng chào hoặc ô đầu tiên, Tab được giữ trong dialog và trả về nút mở khi đóng. Mỗi lần bấm mở Đăng nhập/Đăng ký đều gặp Cú Bông và bảng chào (kể cả người dùng từng xem); `Bỏ qua intro` vẫn đưa thẳng vào form khi muốn đi nhanh. Double-click được chặn bởi ref trước khi set state, click giữa transition không khởi tạo thêm ghost. Đóng dialog xóa mật khẩu; phản hồi xác thực đến trễ không được kích hoạt cảnh kết quả hoặc lỗi sau khi đóng (tác vụ máy chủ đã bắt đầu vẫn có thể hoàn tất). Cảnh kết quả có Skip, Escape, hard timeout và tự tắt khi tab ẩn. Đăng xuất không có cảnh nào.

**Potator/Lite:** giảm chuyển động Cú còn 0,36s, bỏ ghost và glow; cảnh kết quả chỉ giữ lời chào tĩnh trong 0,85s. Với Reduce Motion, bỏ các animation nhưng giữ đúng trạng thái welcome/form và chức năng skip.

**Kiểm tra:** `tests/owl-welcome.test.mjs` kiểm tra state/FLIP; `tests/owl-welcome-dom.test.mjs` chạy click nhanh, nhập liệu và submit thật qua React + DOM mô phỏng, xác nhận ghost không cản input, đổi flow/replay, vòng focus, hướng dẫn mật khẩu, chống submit trùng/phản hồi đến trễ và Skip hoạt động; ngoài ra chạy `npm run build`, `npm run lint`, `npm test`.

## Galaxy Reveal · Đèn pin toàn viewport

Khi ô mật khẩu bật chế độ **beam** (nhấn giữ/rê hoặc bật đèn treo), `GalaxySky` vẽ lên một lớp `position:fixed` phủ **toàn viewport**, nằm giữa backdrop và card, `pointer-events:none`. Nền deep navy → purple, ba dải nebula tím/hồng/cyan trôi chậm, canvas 2D vẽ 190 sao xa + 18 sao gần nhấp nháy lệch pha (2–5s), parallax theo con trỏ và sao băng ngẫu nhiên cách nhau 8–15s. Sao băng xuất hiện trong 0,6–1s. Bật/tắt fade 1,1/1s; rời form/đóng đèn dừng canvas, không ảnh hưởng luồng xác thực. Lớp chữ mật khẩu chỉ lộ nơi tia đèn đi qua như trước.

Hiệu năng: canvas cap 30 FPS, DPR ≤ 1,5, mỗi frame chỉ vẽ sao (không có 200 DOM nodes); `visibilitychange` dừng RAF khi tab ẩn. Potator dùng **một** phần tử 60 sao `box-shadow`, không canvas/nebula/sao băng. Reduced Motion dùng gradient tĩnh, bỏ twinkle, parallax và canvas. Form giữ độ tương phản, Cú Bông và các nút nằm trên nền. Kiểm thử thuần/DOM có trong `tests/owl-welcome.test.mjs` và `tests/owl-welcome-dom.test.mjs`; **chưa xác minh CPU throttle 4× trên trình duyệt thực** trong môi trường hiện tại.

## Smooth Entrance Fix · chẩn đoán và giới hạn kiểm chứng

- **Layout thrashing:** Keyframe đáp của Cú vốn đã dùng transform/opacity, **không** animate `top/left/width/height`. Việc định vị sân khấu đo layout một lần trong `useLayoutEffect` khi mở, không ở mỗi frame. Keyframe được đổi sang `translate3d` có anticipation và overshoot nhẹ, rồi settle với easing expo.
- **Paint/composite conflict:** Welcome trước đây đồng thời fade/blur toàn viewport, `drop-shadow` SVG, box-shadow của bảng đổi mỗi frame, SVG tự nhún/chớp/vỗ cánh và 64 sao (đang ẩn) vẫn mount/animate. Đã bỏ fade/backdrop blur ở intro, bỏ filter SVG, chuyển glow bảng sang opacity trên pseudo, ngưng chuyển động thân SVG lúc đáp, dời vỗ cánh sau đáp, và chỉ mount sao/GalaxySky khi vào form. Form ẩn vẫn giữ layout để đo FLIP nhưng không chạy animation.
- **Render storm:** `setWelcomeLook` trước đây gây React re-render toàn modal theo từng `pointermove`. Mắt chỉ theo chuột **sau** khi đáp; cập nhật CSS variable tối đa một lần mỗi RAF, hủy RAF khi đóng. `will-change:transform,opacity` chỉ áp cho Cú trong lúc bay, gỡ qua `animationend` (không cần React render).
- **Asset race:** Cú là **SVG inline** trong chunk `AuthModal`, không tải ảnh/Lottie riêng; không tạo `Image()` preload giả hay timer đợi asset. Chuyển động CSS theo thời gian, không theo số frame nên không phụ thuộc màn 60/120 Hz. Lite dùng chuyển động ngắn hơn; Reduce Motion bỏ animation.

Kiểm thử DOM mô phỏng pointer flood, kết thúc animation, lần mở lại và click nhanh; test CSS chặn việc hồi quy sang keyframe layout/box-shadow. **Chưa thể khẳng định 60fps, chỉ Composite hay kết quả trên mobile thật/CPU throttle 4×:** cần kiểm tra Chrome DevTools Performance và máy Android thực tế, vì môi trường này không chạy được trình duyệt Chromium đầy đủ.

## Vòng tinh chỉnh giao diện tiếp theo

- Kiểm tra lại 5 nguyên nhân Cú xuất hiện giật: keyframe hiện tại không animate layout; easing expo với overshoot nhẹ; SVG inline không có race ảnh/Lottie; body SVG nghỉ khi bay, bảng hiện sau 0,17s, `will-change` gỡ sau `animationend`. Điểm tốn công còn lại là đo layout *một lần* trước paint để đặt stage/FLIP; không phát sinh đo liên tục theo frame. Không thêm timer/ảnh preload giả cho SVG inline.
- Đăng ký chỉ có một nút đèn pin ở **Nhập lại**. Ô **Mật khẩu** vẫn `type=password`, vẫn được kiểm tra độ dài/mức mạnh. Biểu tượng đèn xoay quanh thấu kính theo đúng hướng tia; pointermove được gộp tối đa một lần mỗi RAF, góc liên tục qua biên ±180° và hủy RAF khi tắt/đóng. Reduce Motion bỏ chuyển động xoay đèn, không bỏ chức năng soi.
- Navbar: logo F/chữ F-Forum trên desktop, mobile và trang Giới thiệu dẫn thẳng về Trang chủ; bỏ tab/icon Trang chủ trùng chức năng, nhãn **Hỏi Đáp** viết đúng kiểu chữ. Giới thiệu vẫn mở được trong menu Khám phá. Settings: ô mẫu gradient tăng độ rõ, thêm dải phối màu có tên và sắc độ, các swatch vẫn giữ preset và ID cũ. Home: câu **Nơi Khai Phóng / Tiềm Năng / Tuổi Trẻ Việt Nam** thành ba dòng chủ động căn giữa, “Tiềm Năng” chuyển gradient xanh lam.

Các kiểm tra DOM/unit/build/lint chỉ xác nhận logic và tránh hồi quy; đo FPS, Composite-only, throttle CPU 4× và máy Android thực cần chạy Chrome DevTools/thiết bị thật. Không xem các phép đo này là đã hoàn tất ở môi trường hiện tại.
