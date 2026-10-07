# f-forum — Quy trình đồng bộ GitHub (từ 02/10/2026)

Mọi thay đổi, chỉnh sửa của web f-forum được đồng bộ lên GitHub theo quy trình:

1. Commit toàn bộ thay đổi vào branch phiên làm việc `arena/01a0faab-f-forum`
2. Push branch lên GitHub
3. Tạo Pull Request vào `main` và merge (squash)
4. `main` trên GitHub luôn chứa phiên bản mới nhất của web

## Quy ước
- Mọi thay đổi thực hiện trong phiên chat Arena Agent → tự động commit + push + merge vào main.
- Thay đổi từ nơi khác (máy local, chat khác): cần push lên GitHub trước; phiên Arena sẽ tự fetch và cập nhật theo khi đồng bộ lần tới.

## Ghi chú
- Hướng dẫn handoff cũ bằng tarball (`/home/user/uploads/f-forum-source-latest.tar.gz`, `f-forum-export/push-f-forum.sh`) đã lỗi thời và không còn dùng — xem commit 368d779 nếu cần nội dung cũ.
