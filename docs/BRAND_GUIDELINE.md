# F-Forum — Brand Guideline (Epic 5)

> Nguồn yêu cầu: `Nhiemvu_4.md` (Task 2–4) và `Nhiemvu_5.md` (Phase A–F).
> Code tham chiếu: `src/components/mascot/CuBong.tsx`, `src/components/auth/*`, `src/components/ui/InfoTip.tsx`.

---

## 1. Linh vật — **Cú Bông** 🦉

| Thuộc tính | Mô tả |
|---|---|
| Là ai | Cú mèo thức khuya học bài — **thông thái nhưng hơi hậu đậu** |
| Dấu hiệu nhận diện | Mũ tốt nghiệp **đội lệch** có tua vàng, mắt hổ phách to tròn, má hồng |
| Phong cách | Vector phẳng có chiều sâu nhẹ (soft 3D bằng radial-gradient), viền mềm, không nét đen gắt |
| Vì sao là cú | Gắn với chủ đề **tập trung / học khuya** (rank "Cú Đêm", vật phẩm "Cú Mèo Canh Đêm") |
| Kỹ thuật | 100% SVG + CSS animation — không GIF, không thư viện ngoài; tôn trọng `prefers-reduced-motion` |

### Bảng màu linh vật

| Vai trò | Màu |
|---|---|
| Lông (thân) | `#8f7cf0 → #5a45b8 → #33256e` |
| Bụng | `#fff8e8 → #f1d39c` |
| Mắt | Hổ phách `#fbbf24`, đồng tử `#1c1530` |
| Mỏ / chân | `#f59e0b` |
| Má | `#fb7185` (40–95% tuỳ cảm xúc) |

### 7 biểu cảm (prop `mood`)

| Mood | Hình ảnh | Dùng khi |
|---|---|---|
| `idle` | Đứng chờ, nhún nhẹ, chớp mắt | Mặc định |
| `attentive` | **Nhỏm dậy, đeo kính, cầm bút**; mắt dõi theo chữ đang gõ | Gõ email / tên |
| `shy` | **Lấy cánh che mắt**, má đỏ | Gõ mật khẩu, hoặc mật khẩu đang hiện toàn bộ |
| `peek` | Hé **một mắt nheo nheo** sau cánh | Bật đèn pin soi mật khẩu |
| `sad` | **Lắc đầu, rũ mi, đổ mồ hôi hột** | Đăng nhập / đăng ký lỗi |
| `celebrate` | **Nhảy cẫng, giơ cánh, giơ bảng "Chào mừng!"** + pháo hoa | Thành công |
| `sleepy` | Ngủ gật, Zzz bay lên | Trạng thái trống (empty state) |

---

## 2. Giọng văn (Brand Voice)

**Ba chữ khoá:** *gần gũi* · *hài hước nhẹ* · *động viên*.

- Xưng **"tớ"** (Cú Bông) — gọi người dùng là **"cậu"**.
- Câu ngắn, có cảm xúc; tối đa **1 emoji** mỗi câu.
- Lỗi thì **không đổ lỗi**: nói chuyện gì xảy ra + gợi ý bước tiếp theo.
- Không dùng câu khô cứng kiểu "Vui lòng nhập…".

### Câu mẫu

| Ngữ cảnh | ❌ Trước | ✅ Sau |
|---|---|---|
| Chào đăng nhập | TÀI KHOẢN F-FORUM | **Mừng cậu quay lại!** · Kho kiến thức vẫn đang chờ cậu. |
| Chào đăng ký | — | **Làm quen nhé!** · Một tài khoản — mở khoá cả diễn đàn. |
| Thiếu dữ liệu | Vui lòng nhập đầy đủ Email và Mật khẩu! | Thiếu email hoặc mật khẩu rồi nè! |
| Sai mật khẩu | Mật khẩu không chính xác. Vui lòng thử lại! | Ối, mật khẩu chưa đúng rồi. Soi đèn pin xem gõ nhầm chỗ nào nhé? |
| Chưa có tài khoản | Tài khoản không tồn tại. Vui lòng đăng ký trước! | Tớ chưa thấy email này đâu — cậu đăng ký mới nhé? |
| Mật khẩu chưa khớp | Mật khẩu xác nhận không khớp! | Hai mật khẩu chưa khớp — soi đèn pin kiểm tra thử? |
| Nút đăng nhập | Đăng nhập vào diễn đàn | **Vào lớp thôi!** |
| Đang xử lý | Đang kiểm tra... | Cú Bông đang kiểm tra… |
| Thành công | (đóng ngay) | Chào mừng cậu quay lại! 🎉 |
| Trạng thái trống | Bạn chưa có huy hiệu | Rương đang ngủ… Hãy đi học để đánh thức nó! |

---

## 3. Đèn pin soi mật khẩu (Phase D) — tóm tắt tương tác

| Thao tác | Kết quả |
|---|---|
| **Nhấn giữ** đèn pin rồi **rê** lên ô (chuột/ngón tay) | Nón sáng chạy theo con trỏ; **chỉ ký tự trong vùng sáng hiện chữ thật** |
| Thả tay | Đèn tắt (fade nhanh), mật khẩu che lại hoàn toàn |
| Chạm nhanh 1 lần | "Đèn treo": vùng sáng theo chuột trên ô; chạm lần nữa để tắt |
| ♿ **Nhấn đúp** đèn pin | Hiện toàn bộ mật khẩu (bật/tắt) |
| ♿ **Giữ phím Cách** khi đang chọn nút đèn | Hiện toàn bộ khi giữ, thả là ẩn |
| ♿ Enter | Bật/tắt hiện toàn bộ |
| Esc | Tắt đèn |

Kỹ thuật: 2 lớp chữ monospace trùng khít từng ô ký tự (lớp chấm `•` và lớp chữ thật) được cắt lộ bằng
`mask-image: radial-gradient(circle var(--ffl-r) at var(--ffl-x) var(--ffl-y), …)` — biến CSS cập nhật trực tiếp
khi rê nên không re-render. Kèm lớp bóng tối có "lỗ sáng", quầng sáng **chớp nháy** (flicker), **bụi sáng** bay,
tiếng "tách" công tắc (tôn trọng nút tắt âm thanh hiệu ứng).

---

## 4. "UX Writing Diet" (Phase C) — danh sách màn hình đã cắt chữ

Quét tự động các dòng chữ hiển thị > 95 ký tự trong `src/components` (23 dòng), đã xử lý:

| Màn hình | Trước | Sau |
|---|---|---|
| Phòng chat — nội quy | 154 ký tự hiện sẵn | 1 dòng "Tôn trọng nhau — vi phạm sẽ bị khoá tài khoản." + nút **(i)** chứa chi tiết |
| Phòng chat — hộp phát thanh | Hướng dẫn bật âm 432Hz (**tính năng đã xoá — chữ chết**) | Câu đúng sự thật: đổi nền động · âm thanh bật/tắt trong Cài đặt |
| Tạo CLB — ghi chú duyệt | 134 ký tự | ⏳ Chờ duyệt · 🎖️ huy hiệu Chủ nhiệm + 250 XP |
| Điểm danh — quà tặng | 2 câu giải thích | 🎁 Chuỗi 5 · 10 · 15 ngày = 1 hộp quà Coin thật |
| Sắp ra mắt | 169 ký tự | 1 câu ngắn theo giọng Cú Bông |
| Bảng quản trị — phiên hết hạn | 180 ký tự | 1 câu + nút "Đăng nhập lại" |
| Xưởng vai trò — mô tả | 133 ký tự | 1 dòng |
| Gacha Boutique (Epic 4) | Mô tả hiện sẵn trên mọi thẻ | Tooltip kính mờ khi hover |
| Đăng nhập / đăng ký | Tiêu đề + phụ đề dài, nhãn khô | 1 tiêu đề + 1 câu phụ, nhãn ngắn |

Còn lại (cố ý giữ): nội dung trang giới thiệu (landing — chữ marketing), ký ức/khu vinh danh (nội dung kể chuyện).

---

## 5. Signature Moments (Phase F)

| # | Khoảnh khắc | Micro-interaction riêng | Trạng thái |
|---|---|---|---|
| 1 | Đăng nhập thành công | Cú Bông nhảy cẫng, giơ bảng "Chào mừng!" + pháo hoa | ✅ Epic 5 |
| 2 | Soi mật khẩu | Nón sáng đèn pin, flicker + bụi sáng, Cú Bông hé mắt | ✅ Epic 5 |
| 3 | Mua vật phẩm | Hộp quà rung → bật nắp → vật phẩm bay lên theo màu độ hiếm (Huyền thoại có âm thanh) | ✅ Epic 4 |
| 4 | Đạt mốc tập trung 25/60/120 phút | Vòng tiến độ "thở" + mưa giấy vàng | ✅ Epic 1 |
| 5 | Trạng thái trống | Rương ngủ gật / Cú Bông ngủ gật kèm 1 câu hài hước | ✅ Epic 4–5 |

Mỗi khoảnh khắc dùng một hiệu ứng khác nhau (không lặp), toàn bộ là CSS/SVG nhẹ — đúng Performance Budget.

---

## 6. Tự đánh giá (Self-Critique Loop)

1. **Che logo có nhận ra không?** — Có: Cú Bông + mũ tốt nghiệp lệch, đèn pin soi mật khẩu và hộp quà theo độ hiếm
   là bộ nhận diện riêng, không phải component mặc định.
2. **Đèn pin có gây khó dùng?** — Không ép buộc: mật khẩu vẫn gõ bình thường; xem toàn bộ chỉ cần nhấn đúp hoặc giữ
   Space; hover vào đèn có gợi ý ngắn; trình đọc màn hình được thông báo trạng thái.
3. **Cắt chữ có quá tay?** — Chi tiết không mất mà chuyển vào nút (i)/tooltip (vẫn được liên kết `aria-describedby`).
