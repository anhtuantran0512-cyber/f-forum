# Kiến Trúc "Full Quality + Full Performance" (Adaptive Quality Architecture)

> **Triết lý cốt lõi:**
> *"Không cắt giảm NỘI DUNG — chỉ thay đổi CÁCH THỨC và THỜI ĐIỂM giao nội dung đó, tùy theo khả năng thiết bị của từng user."*
>
> Không một user thuộc bất kỳ Tier nào bị tước bỏ tính năng (Mythic vẫn là Mythic, Gacha vẫn đẹp, Decoration vẫn động) — chỉ khác nhau về độ phân giải/mật độ hạt tùy thiết bị, và ngay cả ở Tier C vẫn đạt chuẩn **"dùng tốt"**.

---

## 1. Device Capability Detection & 3-Tier Classification (`src/utils/adaptiveQuality.ts`)

Khi ứng dụng khởi động, `AdaptiveQualityProvider` (`src/context/AdaptiveQualityContext.tsx`) thu thập hồ sơ phần cứng và mạng (`collectDeviceProfile()`):

- `memory`: `navigator.deviceMemory || 4` (GB RAM ước tính)
- `cores`: `navigator.hardwareConcurrency || 4` (số luồng CPU)
- `connection`: `navigator.connection?.effectiveType` (`'4g'`, `'3g'`, `'2g'`, `'slow-2g'`)
- `saveData`: `Boolean(navigator.connection?.saveData)`
- `gpu`: `await detectGPUTier()` (WebGL / WebGL2 renderer + đo FPS thực tế)
- `screenSize`: `window.screen.width * window.screen.height`
- `prefersReducedMotion`: `window.matchMedia('(prefers-reduced-motion: reduce)').matches`

### Bảng phân loại 3 Tier

| Tier | Điều kiện nhận diện | Video Decoration | Particle System | Concurrent Animations | Preload Strategy |
|---|---|---|---|---|---|
| **TIER A (High-end)** | RAM ≥ 8GB, CPU ≥ 6 luồng, GPU mạnh, 4G/WiFi, `saveData=false` | `4k` WebM (VP9 Alpha) | 100% hạt (WebGL 1 draw call + Worker) | Tối đa 48 hiệu ứng phụ + 100% hiệu ứng cá nhân | `aggressive` (preload + prefetch) |
| **TIER B (Mid-range)** | RAM 4–8GB, GPU trung bình | `hd` WebM (VP9 Alpha) | 65% hạt (WebGL/Canvas + Worker) | Tối đa 18 hiệu ứng phụ + 100% hiệu ứng cá nhân | `viewport` (IntersectionObserver + idle prefetch) |
| **TIER C (Low-end)** | RAM < 4GB, hoặc GPU yếu/Software, hoặc mạng 2G/3G, hoặc `saveData=true` | `sd` WebM / APNG tối ưu | 35% hạt (WebGL/Canvas + Worker) | Ưu tiên tuyệt đối chính user (`priority="high"`), tối đa 6 hiệu ứng phụ đồng thời; vượt ngưỡng hiển thị **1 khung hình tĩnh chất lượng cao (`fullAssetUrl`)** | `self-priority` (chỉ ưu tiên tài nguyên của chính user) |

---

## 2. GPU-Accelerated Rendering (`src/**/*.css`, `src/components/effects/GpuParticleCanvas.tsx`)

### 2.1 Nguyên tắc vàng cho CSS Animation
- **CHỈ ĐƯỢC PHÉP** animate 2 thuộc tính chạy trên GPU Compositor Thread:
  - `transform` (`translate3d`, `translateX`, `translateY`, `scale`, `scaleX`, `scaleY`, `rotate`)
  - `opacity`
- **CẤM TUYỆT ĐỐI** animate các thuộc tính gây Layout Reflow hoặc Paint nặng trong `@keyframes`:
  - `width`, `height`, `top`, `left`, `right`, `bottom`, `margin`, `padding`, `box-shadow`.
- Bộ kiểm thử tự động (`tests/adaptive-quality-architecture.test.mjs`) quét toàn bộ `src/**/*.css` để đảm bảo **0 vi phạm** trong mọi `@keyframes`.

### 2.2 Sử dụng `will-change` có chủ đích
- Chỉ gắn `will-change: transform, opacity` cho phần tử đang thực sự chuyển động (`.decoration-mythic`, `.awd--animating .awd__slot`, hoặc qua `attachTransientWillChange()`).
- Gỡ về `will-change: auto` ngay khi animation kết thúc để giải phóng VRAM.

### 2.3 & 2.4 Hệ hạt WebGL + Offscreen Worker (`GpuParticleCanvas.tsx` & `particlePhysicsWorker.ts`)
- Thay vì tạo hàng chục thẻ `<div>` riêng lẻ, toàn bộ hệ hạt được lưu trong `Float32Array` liên tục (`PARTICLE_STRIDE = 9`), tính toán vật lý trên **Web Worker** và vẽ trong **1 draw call (`gl.drawArrays(gl.POINTS, 0, count)`)** trên `<canvas>` duy nhất.

---

## 3. Adaptive Media Delivery (`DecorationMedia.tsx`, `ProgressiveImage.tsx`, `mediaPipeline.ts`)

1. **Multi-quality Video Decoration (`buildAdaptiveVideoSources`)**:
   - Cung cấp 3 nguồn `<source>` (`4k` cho `min-width: 1200px`, `hd` cho `min-width: 600px`, `sd` mặc định) kèm pipeline `encodeMultiQualityWebm` trong `scripts/decorations/lib/ffmpeg.mjs`.
2. **Priority Hints (`fetchpriority="high"` vs `"low"`)**:
   - Avatar và trang trí của **chính user** luôn gắn `fetchPriority="high"` và `priority="high"`.
   - Avatar và trang trí của **user khác** gắn `fetchPriority="low"` và đi qua `animationBudget`.
3. **Progressive Image Loading — LQIP (`src/components/ui/ProgressiveImage.tsx` & `server/mediaPipeline.ts`)**:
   - Hiển thị tức thì ảnh mờ 20px (`< 1KB`) rồi chuyển mượt blur-to-sharp bằng `transform` + `opacity` khi ảnh full chất lượng giải mã xong.
4. **Smart Resource Hints (`index.html` & `src/utils/resourceHints.ts`)**:
   - Khai báo `preconnect`, `dns-prefetch`, `preload` font trọng yếu và `prefetch` thông minh theo Tier.

---

## 4. Architecture Scale (`server/adaptiveScale.ts` & `server/forumServer.ts`)

1. **Edge Computing & Stale-While-Revalidate (`respondWithEdgeCache`)**:
   - Phản hồi kèm `ETag`, `Cache-Control: public, max-age=..., stale-while-revalidate=...`, `CDN-Cache-Control`, `Vary: Accept-Encoding, X-Device-Tier` và trả `304 Not Modified` ngay khi khớp `If-None-Match`.
2. **Multi-Layer Caching (`MultiLayerCache`)**:
   - Chuỗi truy xuất: `Browser Cache → CDN Edge → L1 Memory Cache → L2 Redis-Compatible Cache → Read Replica / Primary DB`.
   - **Smart Cache Invalidation (`invalidateKey`, `invalidateByTag`)**: chỉ xoá đúng key bị thay đổi (ví dụ `profile:<email>`), không bao giờ xoá trắng toàn bộ cache.
3. **Database Scaling (`ReadWriteDataPlane`)**:
   - Tách riêng cụm **Read Replicas** (xử lý đọc catalog, hồ sơ, bảng xếp hạng) khỏi **Primary Writer** (xử lý giao dịch).
   - **Horizontal Sharding** theo `user_id / email` (8 logical shards) + **Connection Pool** giới hạn kết nối.
4. **Microservices Isolation & Async Message Queue (`IsolatedServiceAndQueue`)**:
   - Tách riêng `shop-gacha-ms` (có Bulkhead độc lập) khỏi `forum-core`.
   - Đẩy tác vụ nặng (`gacha.pull`, `reward.compute`) vào hàng đợi bất đồng bộ và báo kết quả qua sự kiện WebSocket `QUEUE_JOB_COMPLETED`.

---

## 5. Progressive Web App (`public/sw.js` & `src/utils/backgroundSyncQueue.ts`)

- **Service Worker (`public/sw.js`)**: áp dụng chiến lược `Stale-While-Revalidate` cho catalog trang trí, ảnh media và snapshot công khai.
- **Background Sync (`src/utils/backgroundSyncQueue.ts`)**: tự động lưu các thao tác bị rớt mạng giữa chừng vào hàng đợi bền vững (`fforum_bg_sync_queue_v1`) và phát lại ngay khi có mạng trở lại (`online` / sự kiện `sync`).

---

## 6. Measurement & A/B Visual Quality Gate (`SSIM ≥ 0.95`)

- **SSIM Guard (`computeSSIM`, `evaluateOptimizationABTest`)**: mọi tối ưu hoá hình ảnh/video phải đạt chỉ số tương đồng cấu trúc **SSIM ≥ 0.95** và không làm giảm tương tác người dùng mới được phép kích hoạt.
- **Real User Monitoring theo Device Tier (`/api/analytics/performance` & `/api/admin/performance-tiers`)**:
  - Theo dõi trực tiếp LCP, FID, FPS, Memory, SSIM và tỉ lệ trúng Cache cho từng Tier A / B / C ngay trong **Bảng thống kê quản trị → Hiệu năng Đa tầng** (`PerformanceTiersDashboard.tsx`).

---

## 7. Nguyên Tắc Coding Bắt Buộc Cho Team (Team Coding Contract)

1. **Không cắt tính năng theo máy**: Mọi tính năng mới (Mythic, Gacha, Nameplate, Particle) phải hiển thị đầy đủ trên cả Tier A, B và C. Chỉ dùng `useAdaptiveQuality()` để điều chỉnh độ phân giải (`4k`/`hd`/`sd`), mật độ hạt (`particleScale`) hoặc ngân sách concurrent animation.
2. **Mọi `@keyframes` chỉ dùng `transform` và `opacity`**: Tuyệt đối không animate `width`, `height`, `top`, `left`, `margin`, hay `box-shadow`. Dùng `scaleX`/`scaleY` thay cho `width`/`height`.
3. **Quản lý `will-change` chặt chẽ**: Không đặt `will-change` tĩnh tràn lan trên hàng trăm phần tử. Chỉ bật khi đang animate và trả về `auto` khi kết thúc.
4. **Mọi asset mới phải qua Pipeline tự động**:
   - Ảnh upload đi qua `prepareImageForUpload` (client) + `processUploadedImage` (server `sharp` sinh `thumb`/`medium`/`original` + `20px LQIP`).
   - Trang trí động đi qua `scripts/decorations/pipeline.mjs` & `encodeMultiQualityWebm` (`4k`/`hd`/`sd`).
5. **Mọi thẻ `<img>` phải khai báo `loading=` và `fetchPriority`**:
   - Tài nguyên của chính user hiện tại: `loading="eager"` + `fetchPriority="high"`.
   - Tài nguyên của user khác trong danh sách: `loading="lazy"` + `fetchPriority="low"`.
6. **Cache Invalidation có mục tiêu**: Khi cập nhật dữ liệu ở server, dùng `readWriteDataPlane.executeWrite(multiLayerCache, [affectedKeys], ...)` để chỉ xoá đúng key liên quan.
