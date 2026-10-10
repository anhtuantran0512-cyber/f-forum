

---

# 🎭 MASTER DIRECTIVE: "PROJECT SIGNATURE" — BRAND IDENTITY, ICONOGRAPHY & DELIGHT ENGINEERING

## [ROLE]
Bạn là **Brand Designer kiêm Motion/Interaction Designer kiêm UX Writer**. Vấn đề cốt lõi hiện tại: sản phẩm có đầy đủ tính năng nhưng **vô hồn, giống hàng nghìn web khác**, icon/huy hiệu trông "làm cho có", và nội dung UI bị thừa chữ gây rối mắt. Nhiệm vụ của bạn là biến sản phẩm có **"chất riêng" (Signature Identity)** thực sự khiến người dùng nhớ và thích thú, tương đương cảm giác khi dùng Duolingo, Notion, hay Linear.

---

## 🦉 PHASE A — TẠO LINH VẬT & NGÔN NGỮ THƯƠNG HIỆU (BRAND MASCOT & VOICE)

Trước khi sửa bất kỳ icon nào, hãy **tự sáng tạo 1 Mascot/Linh vật đại diện** cho web (giống Duolingo có chim cú, Discord có Clyde, Slack có Slackbot). Mascot này sẽ xuất hiện xuyên suốt: màn hình chào, trạng thái rỗng (empty state), thông báo thành tích, trang đăng nhập.

**Yêu cầu khi thiết kế Mascot:**
1. Phải liên quan đến chủ đề "Tập trung/Học tập" (ví dụ: một nhân vật biểu tượng hóa sự tập trung — có thể là linh vật dạng robot học tập, cú mèo thức khuya học bài, hoặc nhân vật trừu tượng dạng "tia năng lượng tập trung").
2. Thiết kế dạng **Flat Illustration/Vector có chiều sâu nhẹ (soft 3D)**, đa dạng biểu cảm (vui, buồn, ngạc nhiên, tự hào) để dùng cho nhiều ngữ cảnh.
3. Định nghĩa **Brand Voice** (giọng văn thương hiệu): hài hước nhẹ, gần gũi, động viên — áp dụng cho mọi dòng text thông báo, lỗi, thành tích.

➡️ **Output bắt buộc:** 1 bản "Brand Guideline" mô tả Mascot + 5-6 biểu cảm cần có + giọng văn mẫu (câu ví dụ thông báo, câu chào, câu động viên).

---

## 🏆 PHASE B — HỆ THỐNG ICON/HUY HIỆU/DANH HIỆU THEO ĐỘ HIẾM (RARITY-BASED COLLECTIBLE SYSTEM)

Vấn đề hiện tại: Huy hiệu/Rank/Shop item trông phẳng, rời rạc, không có cảm giác "đáng sưu tầm". Hãy redesign theo **mô hình game hóa chuẩn (Valorant/Genshin/Duolingo Gems)**:

**Cấu trúc bắt buộc:**
```
🔹 Common    → Màu xám/bạc nhạt, viền mỏng, không hiệu ứng
🔸 Rare      → Màu xanh/tím nhạt, có glow nhẹ khi hover
🔶 Epic      → Màu tím/vàng đậm, có animation lấp lánh (shimmer loop)
🌟 Legendary → Có hiệu ứng particle/glow động, viền chuyển màu (gradient animated border), âm thanh khi mở khóa
```

**Yêu cầu thiết kế icon/huy hiệu:**
- Thống nhất 1 style illustration duy nhất xuyên suốt (không trộn icon flat với icon 3D lung tung).
- Mỗi danh hiệu/Rank phải có **shape ngôn ngữ riêng** (ví dụ Rank càng cao, hình khối càng phức tạp/sang trọng hơn — giống hệ thống Rank của Valorant/LMHT).
- Icon Shop phải có **hiệu ứng "unbox" (mở hộp)** khi mua — tạo cảm giác phần thưởng thật sự, không chỉ là "thêm vào túi đồ" khô khan.

---

## ✂️ PHASE C — "UX WRITING DIET" — CẮT GIẢM CHỮ, TĂNG TRỰC QUAN

Vấn đề: GUI Shop và nhiều GUI khác bị nhồi quá nhiều chữ giải thích, gây rối mắt. Áp dụng nguyên tắc **"Show, Don't Tell"** và **Progressive Disclosure** (chỉ hiện thông tin khi cần):

**Quy tắc bắt buộc:**
1. Mọi mô tả dài dòng trong Shop/Item → rút gọn còn **tối đa 1 dòng ngắn**, thông tin chi tiết đưa vào **Tooltip (hover)** hoặc **icon (i) nhỏ**, không hiện mặc định.
2. Dùng **Icon + Màu sắc** để truyền đạt thông tin thay vì chữ (ví dụ: thay vì ghi "Vật phẩm này có thể dùng trong 7 ngày", dùng icon đồng hồ nhỏ + số "7d" cạnh item).
3. Mỗi màn hình chỉ giữ lại **1 tiêu đề chính + tối đa 1 câu mô tả phụ**, phần còn lại phải tự giải thích bằng visual.
4. Rà soát toàn bộ hệ thống (không riêng Shop) để tìm và cắt giảm theo nguyên tắc này — **tự liệt kê danh sách các màn hình đang bị "tường chữ"** trước khi sửa.

---

## 🔦 PHASE D — SIGNATURE INTERACTION: "FLASHLIGHT PASSWORD REVEAL" (TRANG ĐĂNG NHẬP/ĐĂNG KÝ)

Đây là tính năng đinh (signature feature) — phải implement đúng tinh thần sáng tạo, không làm sơ sài thành nút show/hide password thông thường.

### Cơ chế kỹ thuật chi tiết (Technical Spec):
1. **Icon đại diện**: Thay icon "con mắt" mặc định bằng **icon đèn pin** (flashlight) cạnh ô mật khẩu.
2. **Trạng thái mặc định**: Mật khẩu hiển thị dạng chấm che (`•••••`), đèn pin ở trạng thái tắt.
3. **Khi nhấn giữ (hold) icon đèn pin**:
   - Xuất hiện hiệu ứng **vùng sáng hình nón (radial-gradient/clip-path cone shape)** di chuyển theo con trỏ chuột/ngón tay trên ô input.
   - Vùng sáng **chỉ hiển thị ký tự mật khẩu thật tại vị trí ánh sáng chiếu tới**, các ký tự ngoài vùng sáng vẫn bị che. (Có thể giả lập bằng cách overlay 2 lớp text: lớp che (dots) và lớp thật (password), dùng `mask-image` hoặc `clip-path` theo tọa độ chuột để "cắt lộ" lớp thật ra).
   - Có hiệu ứng ánh sáng rung nhẹ (flicker) như đèn pin thật, kèm particle bụi nhẹ bay trong vùng sáng để tăng tính điện ảnh.
4. **Khi thả tay**: Đèn pin tắt, mật khẩu trở lại trạng thái che hoàn toàn, có animation tắt đèn (fade out nhanh).
5. **♿ Accessibility Fallback bắt buộc**: Vẫn phải có cách xem mật khẩu đơn giản (double-tap hoặc giữ phím Space) cho người dùng thao tác bằng bàn phím/khuyết tật vận động — không được ép buộc dùng chuột để xem mật khẩu.

---

## 🎬 PHASE E — AUTH PAGE STORYTELLING (ONBOARDING CẢM XÚC)

Trang Đăng nhập/Đăng ký hiện tại tĩnh, nhàm chán. Hãy biến nó thành **1 khoảnh khắc chào đón có cảm xúc**, lấy cảm hứng từ cách Duolingo/Notion làm Onboarding:

**Yêu cầu:**
1. Mascot (từ Phase A) xuất hiện với animation sống động (Lottie/SVG animation), **phản ứng theo hành vi người dùng**:
   - Khi người dùng gõ mật khẩu → Mascot "che mắt" hoặc quay mặt đi (hài hước, tôn trọng riêng tư).
   - Khi bật đèn pin soi mật khẩu → Mascot tỏ vẻ "ngạc nhiên/trêu chọc" (ví dụ nheo mắt nhìn).
   - Khi đăng nhập sai → Mascot buồn/an ủi. Khi đăng ký thành công → Mascot ăn mừng.
2. Background trang Auth nên có **chuyển động nền nhẹ nhàng** (ambient animation — mây trôi, hạt sáng bay, gradient chuyển động chậm) đồng bộ với thời gian trong ngày (sáng/tối) để tạo cảm giác "sống".
3. Copywriting (text) trên trang Auth phải theo đúng **Brand Voice** đã định nghĩa ở Phase A — không dùng câu khô khan kiểu "Vui lòng nhập email", thay bằng giọng gần gũi hơn.

---

## 🌐 PHASE F — ĐỒNG BỘ HÓA "SIGNATURE INTERACTION LANGUAGE"

Sau khi có Flashlight Interaction và Mascot, hãy tự rà soát và **áp dụng tinh thần sáng tạo tương tự** cho các tính năng khác (không dừng lại ở trang Auth):
- Tự liệt kê 3-5 vị trí khác trong web có thể thêm 1 "khoảnh khắc đáng nhớ" tương tự (ví dụ: khoảnh khắc hoàn thành phiên Focus, khoảnh khắc mở huy hiệu mới, khoảnh khắc lên cấp).
- Mỗi vị trí phải có **1 micro-interaction độc đáo riêng**, không lặp lại hiệu ứng y hệt nhau ở mọi nơi (tránh nhàm).
- Đảm bảo tất cả hiệu ứng mới vẫn tuân thủ **Performance Budget** (dùng CSS/SVG/Lottie nhẹ, không dùng engine 3D nặng) đã thống nhất từ các yêu cầu trước.

---

## 🔁 [SELF-CRITIQUE LOOP]
Trước khi chốt kết quả, tự trả lời:
1. *"Nếu che logo web lại, người dùng có nhận ra đây là web của tôi không, hay nó giống y hệt web nào khác?"*
2. *"Hiệu ứng đèn pin có thực sự mượt và thú vị, hay chỉ là gimmick gây khó dùng?"*
3. *"Tôi đã cắt giảm chữ thừa, nhưng người dùng mới có còn hiểu được tính năng không, hay tôi đã cắt quá tay?"*

Nếu phát hiện vấn đề → tự quay lại sửa trước khi xuất kết quả.

---

## 📤 [OUTPUT FORMAT]
1. Brand Guideline (Mascot + Voice) — Phase A
2. Bộ Icon/Huy hiệu/Rank theo hệ Rarity — Phase B
3. Danh sách màn hình đã "cắt chữ" (trước/sau) — Phase C
4. Code implementation chi tiết hiệu ứng Đèn pin — Phase D
5. Code + mô tả Onboarding Storytelling trang Auth — Phase E
6. Danh sách 3-5 Signature Moments mới đề xuất — Phase F
7. Bản tự đánh giá (Self-Critique Loop)

---

💡 **Gợi ý triển khai:** Hiệu ứng đèn pin (Phase D) là phần khó nhất về mặt kỹ thuật (xử lý tọa độ chuột realtime + mask text). Bạn nên yêu cầu AI code **riêng phần này trước tiên** và test kỹ trên cả Desktop (mouse) lẫn Mobile (touch drag), vì đây sẽ là điểm "viral" nhất khiến học sinh chụp màn hình khoe bạn bè — chính là hiệu ứng tạo nên "chất riêng" mà bạn đang tìm kiếm.