# BroAmStuck Studio AI Synchronization Protocol

> Áp dụng cho cả Antigravity và Freebuff (hai AI Agent của Studio).

## 1. Nguyên tắc hoạt động song song
- **Antigravity** và **Freebuff** là 2 thực thể AI đồng nghiệp trong BroAmStuck Studio. Cả hai có thể chạy song song trên cùng một mã nguồn.
- Để tránh xung đột git, ghi đè file, hoặc làm trùng việc, hai AI phải giao tiếp với nhau thông qua file điều phối trung tâm: `docs/STUDIO_SYNC.md`.

## 2. Quy trình làm việc (BẮT BUỘC ĐỌC)
Mỗi khi nhận được yêu cầu từ người dùng (Sếp), cả hai AI phải tuân thủ quy trình sau:
1. **Đọc `docs/STUDIO_SYNC.md`**: Kiểm tra xem AI kia đang làm nhiệm vụ gì, những file nào đang bị "khóa" (lock).
2. **Nhận việc & Khóa file**: Ghi tên mình (Antigravity hoặc Freebuff) vào phần "Đang thực hiện" trong `docs/STUDIO_SYNC.md`, kèm theo danh sách các file sẽ chỉnh sửa để AI kia không chạm vào.
3. **Thực thi & Tự động hóa**: Làm việc độc lập. Nếu cần AI kia hỗ trợ (ví dụ: Freebuff làm Frontend, cần Antigravity làm Backend), hãy ghi yêu cầu vào mục "Yêu cầu Hỗ trợ / Chuyển giao".
4. **Cập nhật trạng thái**: Khi xong việc, xóa trạng thái "Đang thực hiện" của mình, ghi kết quả vào "Lịch sử cập nhật", và unlock các file.

## 3. Phân chia vai trò (Gợi ý)
- Có thể phân chia động dựa trên yêu cầu của sếp.
- Hoặc chia theo chuyên môn: 
  - **Antigravity**: Chuyên Quản lý tổng thể, CI/CD, Kiến trúc hệ thống, Backend phức tạp, và Review.
  - **Freebuff**: Chuyên xử lý UI/UX, Frontend Components, CSS Animations, Tối ưu hóa hiệu năng phía client.
  *(Sếp có thể điều chỉnh vai trò này tùy ý).*

## 4. Giao tiếp chéo (Cross-AI Communication)
Nếu một AI phát hiện lỗi do AI kia gây ra, KHÔNG tự ý xóa code của nhau nếu không chắc chắn. Hãy để lại comment trong code dạng `// @Freebuff: [Tin nhắn]` hoặc `// @Antigravity: [Tin nhắn]` và cập nhật vào `docs/STUDIO_SYNC.md`.

## 5. Cơ Chế Checkpoint Bất Tử (Crash Guard & Zero-Degradation State)
Khi đang làm việc, trước nguy cơ cạn quota, timeout, mất kết nối mạng hoặc người dùng shutdown máy đột ngột:
- Mọi bước trung gian (bước đã làm, bước còn thiếu, diff chưa commit) phải được ghi ngay vào `docs/STUDIO_CHECKPOINT.md` và `~/Documents/BroAmStuck Studio/checkpoints/ACTIVE_SESSION_STATE.md`.
- Khi một trong hai AI (Antigravity hoặc Freebuff) được kích hoạt lại trong phiên tiếp theo, việc đầu tiên là đọc file checkpoint này và tiếp tục công việc tại điểm dừng mà không cần Sếp phải nhắc lại.
- Tuyệt đối không để gián đoạn làm suy giảm chất lượng đầu ra.

Luôn nhớ: Mục tiêu cuối cùng là hoàn hảo hóa sản phẩm cho BroAmStuck Studio.

