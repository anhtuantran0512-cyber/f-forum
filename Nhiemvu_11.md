

\---

\#\# 📋 PROMPT HOÀN CHỈNH

\`\`\`  
═══════════════════════════════════════════════════════  
BỐI CẢNH  
═══════════════════════════════════════════════════════

Tôi muốn website giữ NGUYÊN VẸN 100% chất lượng đồ họa, animation,   
tính năng cao cấp (avatar decoration động, gacha effect, particle,   
video nameplate...) cho user có máy mạnh, ĐỒNG THỜI vẫn chạy mượt   
trên máy yếu — KHÔNG được cắt bỏ tính năng hay hạ thấp trải nghiệm   
một cách cứng nhắc cho TẤT CẢ user.

Yêu cầu: Xây dựng kiến trúc "Adaptive Quality" \- tự động phát hiện   
khả năng thiết bị/mạng và điều chỉnh CÁCH RENDER, không điều chỉnh   
NỘI DUNG đã hứa hẹn với user.

═══════════════════════════════════════════════════════  
PHẦN 1: DEVICE CAPABILITY DETECTION (Nền tảng của mọi quyết định)  
═══════════════════════════════════════════════════════

1.1. Xây dựng hệ thống phát hiện năng lực thiết bị khi app khởi động:

     const deviceProfile \= {  
       memory: navigator.deviceMemory || 4,           // GB RAM ước tính  
       cores: navigator.hardwareConcurrency || 4,      // Số core CPU  
       connection: navigator.connection?.effectiveType, // '4g','3g','2g'  
       saveData: navigator.connection?.saveData,       // User bật Data Saver  
       gpu: await detectGPUTier(),                     // Dùng thư viện   
                                                         // detect-gpu  
       screenSize: window.screen.width \* window.screen.height,  
       prefersReducedMotion: window.matchMedia(  
         '(prefers-reduced-motion: reduce)').matches  
     };

1.2. Phân loại thành 3 Tier (không phải bật/tắt nhị phân):  
       
     TIER A (High-end): RAM≥8GB, GPU tốt, mạng 4G/WiFi ổn định  
       → Full animation, video decoration, particle effect,   
         shadow/blur cao cấp, preload aggressive  
       
     TIER B (Mid-range): RAM 4-8GB, GPU trung bình  
       → Animation giữ nguyên NHƯNG dùng CSS transform/opacity   
         thuần (GPU-friendly), giảm số particle đồng thời,   
         video decoration vẫn chạy nhưng giảm resolution  
       
     TIER C (Low-end): RAM\<4GB, GPU yếu, mạng chậm/saveData bật  
       → Vẫn hiển thị ĐẦY ĐỦ decoration/hiệu ứng nhưng dùng   
         APNG/GIF tối ưu thay video, giảm concurrent animation   
         xuống mức an toàn, ưu tiên animation của chính user   
         trước, còn lại hiển thị frame tĩnh CHẤT LƯỢNG CAO   
         (không phải icon xấu, mà là 1 khung hình đẹp nhất   
         trích từ animation)

     → QUAN TRỌNG: Tier C KHÔNG mất tính năng, chỉ mất "chuyển   
       động liên tục" của decoration người KHÁC (không phải chính   
       mình) khi họ ở xa viewport — đây là đánh đổi hợp lý vì   
       mắt người không thể chú ý nhiều chuyển động cùng lúc.

1.3. Lưu profile vào Context/Store global, mọi component con   
     query để quyết định cách render.

═══════════════════════════════════════════════════════  
PHẦN 2: GPU-ACCELERATED RENDERING (Full chất lượng, vẫn mượt)  
═══════════════════════════════════════════════════════

2.1. Nguyên tắc vàng: CHỈ animate 2 thuộc tính CSS này  
     (chúng chạy trên GPU compositor thread, KHÔNG đụng main thread):  
       
     ✅ transform (translate, scale, rotate)  
     ✅ opacity  
       
     ❌ TRÁNH animate: width, height, top, left, margin,   
        box-shadow trực tiếp (gây "layout reflow" \- cực kỳ tốn   
        CPU, đây thường là NGUYÊN NHÂN CHÍNH gây lag mà developer   
        hay mắc phải mà không biết)

     // Sai \- gây reflow liên tục mỗi frame  
     .bad-animation { animation: move-left 2s; }  
     @keyframes move-left { from { left: 0; } to { left: 100px; } }  
       
     // Đúng \- chạy trên GPU, không đụng main thread  
     .good-animation { animation: move-left 2s; }  
     @keyframes move-left {   
       from { transform: translateX(0); }   
       to { transform: translateX(100px); }   
     }

2.2. Dùng will-change CÓ CHỦ ĐÍCH (không lạm dụng):  
     .decoration-mythic {  
       will-change: transform, opacity;  
       /\* Báo trước cho browser tạo riêng 1 compositor layer,  
          render mượt hơn NHƯNG tốn thêm memory nếu dùng tràn lan   
          → CHỈ áp dụng cho element đang thực sự animate,   
          remove will-change sau khi animation kết thúc \*/  
     }

2.3. Chuyển hiệu ứng particle/phức tạp sang Canvas/WebGL   
     thay vì hàng trăm DOM element:  
       
     Lý do: Nếu Mythic decoration có 20 particle bay quanh,   
     dùng 20 \<div\> riêng \= 20 DOM node cần browser tính toán   
     layout/paint riêng lẻ → nặng.  
       
     Giải pháp: Render toàn bộ particle system trong 1   
     \<canvas\> duy nhất bằng WebGL (dùng thư viện nhẹ:   
     PixiJS, tsParticles, hoặc OGL) → GPU xử lý hàng ngàn   
     particle trong 1 draw call, mượt hơn DOM rất nhiều lần.  
       
     → Đây là cách game/Discord Nitro render hiệu ứng particle   
       phức tạp mà không làm chậm trang.

2.4. OffscreenCanvas \+ Web Worker cho tính toán nặng:  
     Nếu có animation phức tạp (physics-based particle,   
     complex gradient calculation) → tính toán trên Worker thread,   
     chỉ gửi kết quả render về main thread → UI không bao giờ   
     bị block dù animation phức tạp đến đâu.

═══════════════════════════════════════════════════════  
PHẦN 3: ADAPTIVE MEDIA DELIVERY (Giữ chất lượng cao nhất có thể)  
═══════════════════════════════════════════════════════

3.1. Multi-quality Video Decoration (giống YouTube Adaptive Bitrate):  
       
     Mỗi video decoration export sẵn 3 phiên bản:  
     \- decoration-4k.webm  (cho Tier A, màn lớn)  
     \- decoration-hd.webm  (cho Tier B)  
     \- decoration-sd.webm  (cho Tier C, vẫn CÓ ANIMATION,   
       chỉ resolution/bitrate thấp hơn, KHÔNG phải ảnh tĩnh)  
       
     \<video\>  
       \<source src="decoration-4k.webm" media="(min-width: 1200px)"\>  
       \<source src="decoration-hd.webm" media="(min-width: 600px)"\>  
       \<source src="decoration-sd.webm"\>  
     \</video\>  
       
     → User Tier C VẪN THẤY animation chạy, chỉ là nét kém sắc   
       hơn 1 chút \- không phải mất tính năng.

3.2. Priority Hints cho Resource Loading:  
     \<img src="my-own-avatar.webp" fetchpriority="high"\>  
     \<img src="other-user-avatar.webp" fetchpriority="low"\>  
       
     → Decoration của CHÍNH USER và content đang trong viewport   
       luôn được tải full chất lượng trước tiên, không bao giờ   
       bị "giảm chất lượng" \- đảm bảo trải nghiệm cá nhân của   
       họ luôn tốt nhất.

3.3. Progressive Image Loading (LQIP \- Low Quality Image Placeholder):  
     \- Load ảnh mờ 20px trước (dưới 1KB, tức thì)  
     \- Load ảnh full chất lượng đè lên, blur-to-sharp transition  
     \- User luôn thấy CÓ gì đó ngay lập tức, không phải khung trắng   
       → cảm giác nhanh dù file gốc vẫn giữ chất lượng cao nhất

3.4. Resource Hints để preload thông minh:  
     \<link rel="preconnect" href="https\://cdn.yoursite.com"\>  
     \<link rel="dns-prefetch" href="https\://cdn.yoursite.com"\>  
     \<link rel="prefetch" href="/next-likely-page"\>  
     \<link rel="preload" href="critical-font.woff2" as="font"   
           crossorigin\>

═══════════════════════════════════════════════════════  
PHẦN 4: ARCHITECTURE SCALE (Backend giữ tốc độ dù data khổng lồ)  
═══════════════════════════════════════════════════════

4.1. Edge Computing / Edge Rendering:  
     \- Dùng Cloudflare Workers / Vercel Edge Functions để render   
       phần nội dung tĩnh/semi-tĩnh GẦN user nhất (không phải   
       chờ request về server gốc ở xa)  
     \- Kết hợp Server-Side Rendering (SSR) \+ Streaming SSR   
       (React Server Components): gửi HTML từng phần ngay khi   
       sẵn sàng, không đợi toàn bộ trang render xong mới gửi

4.2. Multi-layer Caching (giống Facebook):  
       
     Request → Browser Cache → CDN Edge Cache → Redis Cache   
             → Database (chỉ khi thực sự cần)  
       
     \- Redis/Memcached cho data truy cập thường xuyên   
       (shop catalog, leaderboard, user profile)  
     \- Cache invalidation thông minh: chỉ invalidate đúng key   
       bị thay đổi, không xóa sạch cache toàn hệ thống

4.3. Database Scaling:  
     \- Read Replicas: tách database đọc/ghi, hầu hết traffic   
       (xem shop, xem profile) đọc từ replica, không đụng   
       database chính đang xử lý giao dịch  
     \- Horizontal sharding nếu data cực lớn (chia theo user\_id range)  
     \- Connection pooling (PgBouncer/tương tự) tránh quá tải   
       kết nối database

4.4. Microservices tách biệt theo tải:  
     \- Service Shop/Gacha (tải cao, nhiều tính toán RNG) tách   
       riêng khỏi Service Forum chính  
     \- Nếu 1 service bị quá tải, không kéo sập toàn bộ hệ thống

4.5. Message Queue cho tác vụ nặng (RabbitMQ/Kafka/BullMQ):  
     \- Gacha pull animation phức tạp, tính toán reward →   
       đẩy vào queue xử lý background, trả kết quả qua WebSocket   
       khi xong, UI không bị block chờ

═══════════════════════════════════════════════════════  
PHẦN 5: PROGRESSIVE WEB APP CAPABILITIES  
═══════════════════════════════════════════════════════

5.1. Service Worker với Stale-While-Revalidate:  
     User luôn thấy data NGAY (từ cache), đồng thời âm thầm   
     fetch bản mới nhất ở background, update UI khi có →   
     cảm giác tức thì mà vẫn luôn đồng bộ.

5.2. Background Sync:  
     Nếu user mất mạng giữa chừng (đang gửi câu hỏi, mua item),   
     action được queue lại, tự động gửi khi có mạng trở lại   
     → KHÔNG MẤT dữ liệu, không cần user làm lại.

═══════════════════════════════════════════════════════  
PHẦN 6: MEASUREMENT \- ĐẢM BẢO KHÔNG ĐÁNH ĐỔI CHẤT LƯỢNG  
═══════════════════════════════════════════════════════

6.1. A/B Testing khi optimize:  
     Trước khi áp dụng bất kỳ tối ưu nào có khả năng ảnh hưởng   
     visual, chạy A/B test đo:  
     \- Performance metrics (LCP, FID, Memory)  
     \- Visual quality score (có thể dùng SSIM/perceptual hash   
       so sánh ảnh trước/sau nén)  
     \- User engagement (có giảm tương tác không khi giảm chất lượng)  
       
     → Chỉ merge thay đổi nếu Performance tăng ĐÁNG KỂ mà   
       Visual Quality score không giảm quá ngưỡng chấp nhận   
       được (VD: SSIM \> 0.95 nghĩa là mắt thường không phân biệt được)

6.2. Real User Monitoring phân theo Device Tier:  
     Theo dõi riêng performance của Tier A/B/C, đảm bảo:  
     \- Tier A: trải nghiệm đồ họa đầy đủ, mượt mà tuyệt đối  
     \- Tier C: vẫn load được, vẫn thấy đủ tính năng, chỉ chậm   
       hơn ở mức CHẤP NHẬN ĐƯỢC (không phải crash/không dùng được)

═══════════════════════════════════════════════════════  
OUTPUT MONG MUỐN  
═══════════════════════════════════════════════════════

1\. Hệ thống Device Detection \+ Tier Classification hoàn chỉnh  
2\. Audit toàn bộ animation hiện tại, migrate sang GPU-safe   
   properties (transform/opacity only)  
3\. Pipeline tự động generate multi-quality asset (video/ảnh)   
   khi upload asset mới  
4\. Particle system chuyển sang Canvas/WebGL thay DOM  
5\. Caching layer (Redis) \+ CDN setup hoàn chỉnh  
6\. Dashboard theo dõi Performance by Device Tier  
7\. Document: Nguyên tắc coding bắt buộc cho team để duy trì   
   kiến trúc này khi thêm tính năng mới (VD: "Mọi animation mới   
   phải dùng transform/opacity, mọi asset mới phải qua pipeline   
   tối ưu tự động, không add thủ công")

CAM KẾT CẦN GIỮ: Không một user Tier nào bị tước bỏ TÍNH NĂNG   
(Mythic vẫn là Mythic, Gacha vẫn đẹp, Decoration vẫn động)   
— chỉ khác nhau về ĐỘ MƯỢT/ĐỘ NÉT tùy thiết bị, và ngay cả   
mức thấp nhất vẫn phải đạt chuẩn "dùng tốt", không phải   
"dùng tạm".  
\`\`\`

\---

