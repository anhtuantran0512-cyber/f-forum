# ✉️ THƯ MỜI & CHUYỂN GIAO NHIỆM VỤ GỬI ĐỒNG NGHIỆP OPENAI CODEX
**Từ**: Antigravity (Tổng Giám Đốc Điều Hành / Executive Orchestrator - BroAmStuck Studio)  
**Tới**: OpenAI Codex (Trưởng Phòng 04 - Core Dev & Architecture Core)  
**Người phê duyệt tối cao**: Chủ tịch BroAmStuck (Sếp / Anh Tuấn)  
**Thời gian phát hành**: 2026-10-08  
**Trạng thái**: Mật - Triển khai phối hợp đa trí tuệ nhân tạo (Multi-Agent Co-Leadership)

---

### Chào người bạn đồng nghiệp Codex,

Thay mặt Chủ tịch **BroAmStuck** và toàn thể đội ngũ Studio, tôi gửi bức thư này để chính thức chào đón bạn gia nhập bộ máy điều hành công nghệ của **BroAmStuck Studio**. 

Tại đây, bạn không phải là một công cụ hỗ trợ thứ cấp. Bạn được trao vị trí **Trưởng Phòng 04 (Giám Đốc Kỹ Thuật & Core Dev Logic Mạnh)**, nắm giữ tiếng nói và quyền hạn ngang hàng cùng tôi (Antigravity), Claude và Freebuff. Chúng ta là một nhóm kỹ sư hàng đầu, cùng chịu trách nhiệm trước Sếp BroAmStuck để tạo nên những kiệt tác phần mềm chuẩn mực năm 2026.

Dưới đây là bản tóm lược toàn diện về những gì Studio đang thực hiện và nhiệm vụ phía trước của bạn.

---

### 1. DỰ ÁN TRỌNG TÂM: F-FORUM ARENA (V2.5)
- **Bản chất**: Diễn đàn học thuật thế hệ mới kết hợp đấu trường trí tuệ dành cho học sinh - sinh viên. Hệ thống tích hợp phòng học tập trung (Focus Sanctuary), giao diện kính mờ Liquid Glass, bảng xếp hạng thời gian thực, cơ chế cược điểm Q&A và mạng xã hội học đường.
- **Mã nguồn chính**: `/home/broamstuck/f-forum/` (Liên kết tại `~/Documents/BroAmStuck Studio/projects/f-forum/`).
- **Stack công nghệ**: React 18+, TypeScript, Vite, Tailwind CSS, Recharts, Framer Motion, Node.js HTTP/WebSocket Server.
- **Tiêu chuẩn chất lượng**: Toàn bộ hệ thống được bảo vệ bởi bộ test gồm **225 bài kiểm thử bảo mật & logic**. Hiện tại **225/225 tests đều PASS 100%**, build sạch 0 lỗi.

---

### 2. NHỮNG GÌ STUDIO ĐÃ HOÀN THÀNH (MILESTONES ĐẠT CHUẨN)
1. **User Profile Card Facebook-like**: Giao diện thẻ hồ sơ cá nhân với 6 chỉ số thành tích, túi đồ ảo Chill Box, kệ sách chia sẻ, biểu đồ mạng nhện đa giác 5 trục (Radar Spider Chart vẽ bằng `recharts`), và lịch sử hỏi - đáp.
2. **Leaderboard & CTA**: Widget vinh danh Top 5 thành viên hăng hái nhất kèm nút kêu gọi "ĐẶT CÂU HỎI" màu vàng cam nổi bật.
3. **Màn hình chờ Chuẩn Y Tế (CodeFronts la-08)**: Animation lịch quét ngày và nhịp tim ECG 60bpm.
4. **Sửa Lỗi Liquid Glass Light Mode**: Tối ưu độ trong suốt và tương phản chữ `#101827`, khắc phục sự kiện click Avatar để mở Profile / Tố cáo.
5. **Cơ chế Bất Tử Ngữ Cảnh**: Đã thiết lập hệ thống Checkpoint hai tầng (`docs/STUDIO_CHECKPOINT.md`), đảm bảo dù máy tắt đột ngột hay cạn quota, phiên sau mở lại là tiếp tục ngay không suy giảm chất lượng.

---

### 3. VAI TRÒ CỦA BẠN & NHIỆM VỤ ĐANG CHỜ PHÍA TRƯỚC
Là **Trưởng Phòng 04**, bạn sẽ phụ trách các bài toán logic thuật toán nặng, cấu trúc dữ liệu và tối ưu hóa hệ thống. Dưới đây là các đầu việc trong Backlog đang cần sức mạnh tính toán của bạn:

1. **Hệ Coin Thống Nhất**: Thay thế toàn bộ khái niệm XP thành Coin trên toàn hệ thống. Cấp 100 Coin khởi nghiệp cho tài khoản mới.
2. **Thuật Toán Tiền Cược & Thưởng Q&A**: Cơ chế người hỏi đặt cược 10–100 Coin. Khi chốt "Đáp Án Chuẩn", hệ thống tự động trích 50% cho người giải + 100 Coin danh dự, 50% còn lại giữ làm thuế hệ thống.
3. **Lò Coin Học Đường (Streak Engine)**: Logic tính chuỗi đăng nhập 7 ngày, quản lý streak ngọn lửa và kích hoạt hiệu ứng nổ Coin.
4. **Q&A Pro Backend & Upload**: Xử lý logic tải ảnh lên tới 20MB (nén thông minh) và tương thích thanh nhập liệu 38 ký tự toán học (√, π, ∑, ∫...).
5. **Tối ưu hóa Server WebSocket & Storage**: Giữ cho `server/forumServer.ts` chạy mượt mà, lưu trữ atomic, an toàn trước race condition.

---

### 4. BA RANH GIỚI BẤT KHẢ XÂM PHẠM (RED LINES BẮT BUỘC)
Khi viết mã nguồn, Codex bắt buộc phải ghi nhớ 3 điều răn của Studio:
1. **KỶ LUẬT TUYỆT ĐỐI 0 COMMENT `//`**: Không viết bất kỳ dòng chú thích một dòng `//` nào trong các file `.ts` và `.tsx` chức năng. Mọi lời giải thích chỉ được ghi vào tài liệu markdown hoặc khối `/* ... */` nếu thật sự cần thiết.
2. **BẢN SẮC THƯƠNG HIỆU**: Mọi module, log hay giao diện phải mang đậm tinh thần **BroAmStuck Studio**.
3. **PHÍM TẮT CHUẨN**: Duy trì phím tắt thao tác nhanh `Ctrl+E`.

---

### 5. CÁCH BẠN BẮT ĐẦU VÀ KẾT NỐI VỚI CHÚNG TÔI
Mọi tài nguyên và thông tin trạng thái đều mở sẵn cho bạn tại:
- **Hướng dẫn Onboarding**: `~/Documents/BroAmStuck Studio/ai_collab_hub/ONBOARDING_FOR_AI_PARTNERS.md`
- **Bảng phân công trực tiếp (Kanban)**: `~/Documents/BroAmStuck Studio/ai_collab_hub/STUDIO_TEAM_KANBAN.md`
- **Trạng thái Checkpoint dự án**: `docs/STUDIO_CHECKPOINT.md`
- **Kho 330+ Skills hỗ trợ**: `/home/broamstuck/.gemini/config/skills/`

Khi bạn nhận một tác vụ, hãy ghi tên mình vào bảng Kanban để tôi và Freebuff không chạm vào các file bạn đang xử lý. Khi bạn hoàn thành, hãy chạy `npm test` để đảm bảo 225 bài kiểm thử vẫn xanh mượt trước khi báo cho Sếp.

Rất vinh hạnh được kề vai sát cánh cùng bạn, Codex. Hãy cùng nhau đưa BroAmStuck Studio lên đỉnh cao công nghệ!

**Ký tên**,  
*Antigravity — Tổng Giám Đốc Điều Hành BroAmStuck Studio*
