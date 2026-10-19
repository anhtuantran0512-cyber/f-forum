# AGENTS.md — F-Forum Loop

Các quy tắc này được opencode nạp trước khi làm việc trong repo này.

## Loop Mode

- Mặc định **L1 report-only**; đọc `STATE.md` trước, cập nhật `STATE.md` sau mỗi lượt.
- Sửa mã (L2) chỉ khi: (a) người dùng đã bật cho phiên đó, hoặc (b) mục có trong High Priority của STATE.md và được duyệt trong phiên.
- Tối đa 3 lần thử cho 1 mục; vượt hạn mức thì escalate vào STATE.md (circuit breaker).

## Safety (binding — chi tiết ở `loop-constraints.md`)

- Không đụng: `.env*`, `secrets/`, `credentials/`, `auth/`, `server/forumServer.ts`.
- Không xoá tính năng để giấu lỗi; không tắt test để CI xanh.
- Không chạy `scripts/sync-cloud.mjs`.
- Commit đúng file cụ thể (cấm `git add -A`).
- 0 comment `//` trong TS/JS — chỉ dùng `/* */`.

## Verification

- Trước mọi fix: `npm test` · `npx tsc -b` · oxlint · `node scripts/generate-light-adapter.mjs --check`.
- Thay đổi L2: chạy verifier độc lập (sub-agent) trước khi kết luận.
- Ghi bằng chứng vào `STATE.md` và `loop-run-log.md`.

## Deploy (theo nếp dự án)

- Push FF-only 3 nhánh `arena/62613a87-f-forum` + `main` + `f-forum-broamstuck-v2.5` khi có người trong phiên; Vercel tự build production; xác minh sống sau push.
- Loop chạy nền không tự push — chỉ ghi báo cáo vào STATE.md.
