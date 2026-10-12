# Audit asset trang trí (Nhiệm vụ 10 — Bước 1.1)

Tạo: 2026-10-12T00:28:18.374Z — pipeline: `scripts/decorations/pipeline.mjs audit`

## Avatar frame (cosmetics/avatar_border/avatar_1..23.zip — zip chia phần, tự nối)

| Chỉ số | Giá trị |
|---|---|
| Tổng file PNG | 637 |
| Có animation (APNG) | 621 |
| Tĩnh (PNG thường) | 16 |
| Kích thước | 288x288 ×624, 144x144 ×8, 576x576 ×2, 500x500 ×1, 300x300 ×1 |
| FPS trung vị | 0 |
| Số frame/file | min 7 · median 60 · max 346 |
| Dung lượng gốc | median 796.1 KB · max 5.3 MB · tổng 562.8 MB |
| File hỏng | 0 |

## Bảng tên (cosmetics/nameplate.zip)

| Chỉ số | Giá trị |
|---|---|
| Tổng file WebM (VP9) | 236 (kèm alpha: 0) |
| Kích thước | 448x84 ×198, 672x126 ×38 |
| FPS trung vị | 12 |
| Thời lượng | 500–8210 ms (trung vị 4000) |
| Dung lượng | median 90.7 KB · max 472.9 KB · tổng 24.1 MB |

## Ghi chú xử lý

- Slug kebab-case không dấu; tên hiển thị tiếng Việt (bảng tay + từ điển).
- APNG → WebM VP9 alpha 240px (crf 45, retry crf 52 nếu >200KB) + ảnh tĩnh làm fallback.
- PNG tĩnh → WebP (q80) + PNG palette fallback; preview 128px, tổng 2 file < 100KB.
- Bảng tên ≤150KB giữ nguyên; lớn hơn thì re-encode 448px crf 37; preview = frame giữa có độ phủ ≥85%.
- Chi tiết từng file: `asset-audit.json`.
