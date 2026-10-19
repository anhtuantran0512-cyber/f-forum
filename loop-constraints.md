# Loop Constraints — F-Forum

> The `loop-constraints` skill reads this file verbatim at the start of every run. Constraints here are **binding** — the agent MUST follow them.

## Push & Merge

- Không tự merge PR; không mở PR mới trừ khi được lệnh.
- Push FF-only (arena/main/v2.5) được phép khi có người trong phiên; loop nền chỉ báo cáo.
- Không đóng issue/PR nào.

## Paths (cấm đụng)

- `.env`, `.env.*`, `secrets/`, `credentials/`, `auth/`
- `server/forumServer.ts` (bất khả xâm phạm)
- Cấm chạy: `scripts/sync-cloud.mjs`

## Code (bắt buộc)

- 0 comment `//` trong TS/JS — chỉ `/* */`
- Không xoá tính năng để giấu lỗi; không disable test
- 1 fix mỗi lượt; không refactor lan rộng ngoài phạm vi
- Tối đa 3 lần thử cho 1 mục — quá thì escalate vào STATE.md
- Trước mỗi commit: `npm test` · `npx tsc -b` · oxlint · `node scripts/generate-light-adapter.mjs --check`
- Commit đúng file cụ thể — CẤM `git add -A`

## Communication

- Trong phiên: nói rõ định làm gì trước khi làm.
- Chỉ Chủ tịch được tick checkbox HITL (`DANH-SACH-CHO-DUYET.md`).
- Báo cáo qua `feedback_XX.md` + `docs/STUDIO_SYNC.md` theo nếp studio.

## Budget & Resources

- 2 lượt/ngày, trần ~100k token/ngày; chạm 80% → chuyển report-only.
- Đĩa hệ thống < 3GB trống → dừng sửa, escalate (chỉ được dọn cache tái tạo được).
- `loop-pause-all` đang bật → thoát ngay.
