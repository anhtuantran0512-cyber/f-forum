# 📘 SPEC.md — BẢN ĐẶC TẢ CHÍNH F-FORUM (phiên bản 1.0)
*Tư liệu tách ra từ `code_yeucau.md` gốc (3787 dòng) — code demo material đã tách sang `CODE_DEMO/`
chỉ dùng khi cần. File `code_yeucau.md` gốc vẫn giữ nguyên như bản backup. Tài liệu này là bản
CHÍNH THỨC mới thay thế cho file code_yeucau.md dạng raw-paste, giảm 70% số token cho mọi lần nạp context.*

---

## 1. MỤC TIÊU
Xây dựng & nâng cấp ~F-Forum Arena v2.5+ hiện đại, thẩm mỹ cấp cao 2026, hiệu năng tốt, bảo mật chặt,
cho trải nghiệm học sinh cấp 3 vui vẻ – có tính tương tác cao (Coin, Rank XP, Q&A, Focus Sanctuary ...).
Phong cách: Liquid Glass, Bento Grid, Claymorphism/Clay, Masonry, Godray gradients (Grainient).

## 2. NUẬT TAY CẤM KỴ (Invariants — Không hệ thống nào được vi phạm)
1. **Nghiêm cấm comment** `//` trong mã chức năng JS/TS (chỉ bao bọc `/* ... */` ghi chú đặc biệt).
2. **Thương hiệu không đổi**: BroAmStuck Studio, phím tắt **Ctrl+E**, Dynamic Island.
3. **Không dùng emoji trong icon/huy hiệu** — chỉ SVG hand-made vector.
4. Mọi mã code trong dự án phải tuân theo protocol trong `Documents/BroAmStuck Studio/ORCHESTRATION.md`
   và `IO_CONTRACT.md` + SECURITY_CHARTER (không hardcode secret, `audit_secrets.py` phải PASS).
5. Test 100% pass trước khi ship; các hạng mục công việc ghi trong mục "Cần phê duyệt" **phải được
   Chủ tịch duyệt** (Agent không tự tick `[x]`).

## 3. THIẾT KẾ CHUẨN (Design Tokens)
- Font chuẩn: 'Inter Tight' body, 'Bricolage Grotesque' display, Georgia serif cho italic êm ái.
- Màu vàng cam cam cam → xanh tím tím → mỗi mục edit dùng màu nền oklch; dùng
  `color-mix(in oklch, ...)` để mix thời điểm runtime.
- Bo góc (radius): 16px (chips) → 24px (input) → 32px (card) → 44px (hero object), puffy shape
  có `corner-shape: squircle` (nếu trình duyệt hỗ trợ) + fallback `border-radius: 38%`.
- Motion curve chuẩn: `cubic-bezier(.34,1.56,.64,1)` boomeage spring (10% overshoot).
- Background layers: `radial-gradient` nền + `backdrop-blur-[20px] backdrop-saturate-[1.7]` cho glass.

## 4. BỘ DEMO CODE THAM KHẢO — CodeFronts (MIT) 🎨
Chi tiết từng demo → đọc file tương ứng trong `CODE_DEMO/`:

| Slug | Mô tả |
|---|---|
| `resource-card-depth` | Tài nguyên thẻ Depth Parallax Landscape |
| `potator-glass-nav` | GUI ở chế độ Potator — Inner-Glow Glass Nav Links |
| `icon-rpg-tooltip` | Icon tham khảo danh hiệu — RPG Inventory Tooltip (KHÔNG copy icon) |
| `clay-shadow-recipe` | Setting chọn bối cảnh — Claymorphism Shadow Recipe |
| `clay-radius-scale` | Thêm — Border Radius Scale cho puffy shapes |
| `hero-photo-collage` | Tham khảo thêm — Tailwind Hero Photo Collage Grid |
| `swipe-card-drag` | Tham khảo — Tailwind Swipe Card Deck Drag to Dismiss |
| `streak-countdown` | Tham khảo — Daily Streak Reset Countdown Widget |
| `flip-clock` | Đồng hồ countdown — Retro Flip Clock Countdown Timer |
| `masonry-feed` | Câu hỏi & bài đăng sườn — CSS Masonry Social Media Feed Cards |
| `masonry-dashboard` | Thêm — CSS Masonry Dashboard Widget Layout |
| `social-share-buttons` | Icon nên học — Tailwind Social Share Buttons Brand Hover & Copy Link |
| `admin-data-grid` | GUI Admin — CSS Table Admin Dashboard Data Grid |
| `popover-entry-exit` | Tham khảo — Tailwind Popover Entry and Exit Animation |
| `notification-badge` | Thêm — CSS Notification Badge Clip Path |
| `demo-15` | thêm : |

---

## 5. TÍNH NĂNG PHÂN CÔNG (mỗi mục → dùng demo nào)
- **Navbar liquid + sét linkload, glass nav hover glow** → `CODE_DEMO/potator-glass-nav.md`
- **Thẻ bài tài nguyên (栏目 học tập) depth parallax 4-layer** → `CODE_DEMO/resource-card-depth.md`
- **Tooltip danh hiệu rarity-tinted RPS (Xanh → tím → đỏ...)** → `CODE_DEMO/icon-rpg-tooltip.md`
- **Setting modal nền bối cảnh thay** → `CODE_DEMO/clay-shadow-recipe.md` + `clay-radius-scale.md`
- **Trang giới thiệu hero: photo collage** → `CODE_DEMO/hero-photo-collage.md`
- **Thẻ bài swipe trong "Mẹo hằng ngày"** → `CODE_DEMO/swipe-card-drag.md`
- **Widget streak lửa + countdown flip clock** → `CODE_DEMO/streak-countdown.md` + `flip-clock.md`
- **Dòng bài feed & Q&A dạng masonry 3 cột** → `CODE_DEMO/masonry-feed.md` + `masonry-dashboard.md`
- **Hàng chia sẻ social 44×44** → `CODE_DEMO/social-share-buttons.md`
- **GUI Admin tổng quan** → `CODE_DEMO/admin-data-grid.md`
- **Popover chọn sức khoẻ / hành động nhanh** → `CODE_DEMO/popover-entry-exit.md`
- **Badge thông báo má violetan clip-path khoét hốc** → `CODE_DEMO/notification-badge.md`

## 6. RELEASE & KIẾN HÀNH
Mỗi feature ship phải: (1) test PASS, (2) `audit_secrets.py` PASS, (3) HITL-2 được duyệt,
(4) commit convention `feat/fix/docs/chore(scope): mô tả` ngắn gọn, (5) Kaizen ghi bài học nếu có sự cố.
Version+changelog nằm tại repo `f-forum` nhánh `main`.

---

*Phiên bản 1.0 — 10/10/2026. Chỉnh sửa của các agent khác CẦN qua HITL quy trình; SPEC này là Single Source of Truth.*
