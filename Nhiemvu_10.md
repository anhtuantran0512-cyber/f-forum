

1\. \*\*Format file trong zip là gì  
\`\`\`  
BỐI CẢNH:  
Tôi có hệ thống Boutique Shop trong forum học thuật, hiện đang dùng icon SVG   
tự vẽ đơn giản cho các vật phẩm trang trí (Avatar Frame, Avatar Aura, Nameplate).   
Tôi vừa có 2 bộ asset chất lượng cao lấy từ Discord:  
\- avatar\_1 .zip, avatar\_2.zip đến avatar \_23 .zip(khung viền )  
\- nameplate.zip (Nameplate \- thanh trang trí hiển thị dưới/cạnh tên user)

YÊU CẦU: Thay thế TOÀN BỘ hệ thống vật phẩm trang trí hiện tại bằng asset   
thật từ 2 file zip trên, tích hợp đầy đủ vào Boutique Shop \+ hệ thống   
hiển thị trên Avatar/Profile.

═══════════════════════════════════════  
BƯỚC 1: PHÂN TÍCH & CHUẨN HÓA ASSET  
═══════════════════════════════════════

1.1. Giải nén và audit toàn bộ nội dung 2 file zip:  
     \- Liệt kê danh sách tất cả file, phân loại theo extension   
       (.png, .apng, .webm, .json/Lottie, .gif...)  
     \- Với avatar\_decore: xác định các size có sẵn cho mỗi item   
       (Discord thường xuất nhiều resolution: 24/48/60/80/128/180/256/336px)  
     \- Với nameplate: xác định format (thường là .webm video loop ngắn   
       2-4 giây \+ có thể kèm 1 ảnh static preview/.png thumbnail)  
     \- Note lại: các asset có animated không hay chỉ static

1.2. Chuẩn hóa cấu trúc thư mục lưu trữ (áp dụng naming convention nhất quán):  
     /public/assets/decorations/  
       /avatar-frames/  
         {item-slug}/  
           preview.png       (thumbnail cho shop card, size nhỏ \~128px)  
           full.png/.webp    (render chính lên avatar, size lớn nhất có sẵn)  
           animated.webm     (nếu có animation, dùng để render live)  
       /nameplates/  
         {item-slug}/  
           preview.png  
           animated.webm (hoặc static.png nếu nameplate đó tĩnh)  
       
     → Viết script (Node.js hoặc Python) để tự động:  
       \- Đổi tên file gốc (thường là ID số khó đọc) thành slug dễ đọc   
         (kebab-case, tiếng Việt không dấu, VD: "bao-tuyet", "hoa-hong-tinh-xao")  
       \- Optimize/nén ảnh (dùng sharp/imagemin cho PNG, ffmpeg để nén webm   
         nếu file quá nặng, mục tiêu mỗi file preview \<100KB)  
       \- Convert sang WebP cho ảnh tĩnh để giảm dung lượng (giữ PNG fallback)

1.3. Tạo file metadata JSON cho từng item (map tay hoặc bán tự động):  
     {  
       "id": "bao-tuyet",  
       "name": "Báo Tuyết",  
       "type": "avatar\_frame",  // hoặc "nameplate"  
       "rarity": "epic",         // cần tôi phân loại tay theo độ đẹp/độ hiếm gốc bên Discord  
       "assetPath": {  
         "preview": "/assets/decorations/avatar-frames/bao-tuyet/preview.webp",  
         "full": "/assets/decorations/avatar-frames/bao-tuyet/full.png",  
         "animated": null  // hoặc path nếu có  
       },  
       "description": "Tai mèo lông trắng, khăn choàng đốm báo",  
       "price": 4100,  
       "originalPriceNote": "Giá quy đổi từ 79.000đ Discord sang Coin nội bộ",  
       "isAnimated": false,  
       "tags": \["mèo", "mùa đông", "dễ thương"\]  
     }  
       
     → Script hỗ trợ: Đọc tên file gốc, đề xuất slug \+ tên hiển thị tạm,  
       xuất ra 1 file decorations-catalog.json để tôi review và chỉnh sửa   
       tay rarity/giá/tên cho chính xác trước khi import vào DB.

═══════════════════════════════════════  
BƯỚC 2: CẬP NHẬT DATABASE SCHEMA  
═══════════════════════════════════════

2.1. Cập nhật/tạo bảng ShopItem (hoặc tên tương đương trong hệ thống hiện tại):  
     \- Thêm field: assetType ENUM('svg\_custom', 'image\_static', 'image\_animated')  
     \- Thêm field: previewUrl, fullAssetUrl, animatedAssetUrl (nullable)  
     \- Thêm field: originalSource VARCHAR (note nguồn gốc 'discord\_import'   
       để phân biệt với item tự thiết kế sau này nếu có)  
     \- Giữ nguyên các field hiện có: rarity, price, category (frame/aura/nameplate...)

2.2. Viết migration script để:  
     \- XÓA (hoặc soft-delete, đánh dấu is\_active=false để backup)   
       toàn bộ item cũ dùng SVG tự vẽ  
     \- IMPORT toàn bộ item mới từ decorations-catalog.json vào DB  
     \- Đảm bảo KHÔNG BREAK dữ liệu user đã sở hữu item cũ   
       (cần có bảng mapping old\_item\_id → new\_item\_id nếu muốn migrate   
       quyền sở hữu, hoặc thông báo \+ hoàn coin cho user nếu quyết định   
       không migrate item cũ)

2.3. QUAN TRỌNG \- Xử lý dữ liệu user hiện tại:  
     Trước khi xóa item cũ, cần:  
     a) Query toàn bộ UserInventory liên kết với item cũ  
     b) Đưa ra 1 trong 2 phương án (tôi quyết định sau khi xem báo cáo):  
        \- Phương án A: Hoàn lại 100% coin đã mua cho user (an toàn, công bằng)  
        \- Phương án B: Tự động tặng 1 item tương đương rarity trong bộ mới  
     c) Gửi thông báo in-app cho user về việc thay đổi

═══════════════════════════════════════  
BƯỚC 3: COMPONENT HIỂN THỊ DECORATION (Frontend)  
═══════════════════════════════════════

3.1. Viết component \<AvatarWithDecoration /\> dùng chung toàn hệ thống:  
       
     Props cần có:  
     \- avatarUrl: string (ảnh đại diện gốc của user)  
     \- decorationAsset: { type, fullAssetUrl, animatedAssetUrl, isAnimated }  
     \- size: number (kích thước render, responsive theo nơi sử dụng:   
       32px ở comment, 64px ở profile card, 180px ở trang cá nhân chính...)  
     \- nameplateAsset: (optional, render riêng thanh nameplate dưới tên)

     Logic render:  
     \- Nếu isAnimated \= true VÀ browser hỗ trợ \+ không bật   
       "prefers-reduced-motion" → render \<video\> tag với animated.webm,   
       autoplay loop muted playsinline  
     \- Nếu isAnimated \= false HOẶC user tắt animation (accessibility)   
       → render ảnh full.png tĩnh đè lên avatar  
     \- Decoration PHẢI đè lên (overlay, position: absolute) avatar gốc,  
       không phải border-radius/CSS border như cách làm cũ  
     \- Xử lý z-index đúng: với các decoration như "Thiên Thần Sa Ngã"   
       có cánh tỏa 2 bên lớn hơn khung avatar → container cha cần   
       overflow: visible, không bị clip bởi avatar tròn

     Performance:  
     \- Lazy load video decoration (chỉ load khi scroll vào viewport,   
       dùng Intersection Observer)  
     \- Preload decoration của chính user hiện tại ngay khi app khởi động   
       (vì sẽ hiển thị nhiều nơi: header, sidebar, profile...)  
     \- Cache asset đã load trong memory để không fetch lại nhiều lần   
       khi cùng 1 decoration xuất hiện ở nhiều vị trí trên trang

3.2. Component \<NameplateDisplay /\>:  
     \- Render thanh nameplate (thường là dải màu/hiệu ứng nền) PHÍA SAU   
       username text, giống style Discord: text đè lên trên nameplate   
       background đang chạy animation  
     \- Cần xử lý contrast: đảm bảo chữ tên user luôn đọc được dù   
       nameplate nền sáng hay tối (có thể cần text-shadow hoặc   
       backdrop kiểm tra độ sáng nền)

═══════════════════════════════════════  
BƯỚC 4: CẬP NHẬT BOUTIQUE SHOP UI  
═══════════════════════════════════════

4.1. Shop Card hiển thị item:  
     \- Preview image/video chạy ngay trong card (giống ảnh Discord mẫu:   
       hover vào card có thể trigger animation nếu chưa autoplay)  
     \- Giữ giao diện dark theme nhưng dùng named asset thật thay vì icon SVG  
     \- Badge rarity vẫn theo hệ thống màu đã thống nhất trước đó   
       (Common xám \- Rare xanh \- Epic tím \- Mythic vàng)

4.2. Modal Preview khi click item (bắt buộc):  
     \- Hiển thị LIVE PREVIEW: avatar THẬT của user đang đăng nhập   
       \+ decoration được chọn, render bằng component ở Bước 3.1  
     \- Cho phép xem ở size lớn (180-256px) để thấy rõ chi tiết   
       (lông thú, vân cánh bướm, hiệu ứng lửa...)  
     \- Nút "Trang bị thử" cho xem trước khi mua (nếu business logic   
       cho phép preview miễn phí trước khi thanh toán)

4.3. Filter/Category cập nhật:  
     \- Thêm filter riêng: "Avatar Frame" | "Avatar Aura" | "Nameplate"  
     \- Giữ filter rarity hiện có  
     \- Thêm filter "Có animation" / "Tĩnh" (vì user có thể ưu tiên   
       animation cho nổi bật, hoặc ưu tiên tĩnh để nhẹ/không gây xao nhãng)

═══════════════════════════════════════  
BƯỚC 5: TRANG CÁ NHÂN \- HIỂN THỊ ĐANG TRANG BỊ  
═══════════════════════════════════════

5.1. Khu vực hiển thị chính trang cá nhân:  
     \- Avatar lớn (150-200px) với decoration full animation  
     \- Nameplate hiển thị ngay dưới/cạnh tên, full animation  
     \- Nút nhỏ "Thay đổi trang trí" dẫn nhanh về Boutique

5.2. Hiển thị ở các vị trí khác trong app (cập nhật đồng bộ):  
     \- Avatar trong danh sách bình luận/câu trả lời (size nhỏ \~32-40px,   
       animation có thể tắt ở size này để tiết kiệm performance nếu   
       list dài nhiều user)  
     \- Avatar trong bảng xếp hạng/leaderboard  
     \- Avatar trong header navbar (nếu có hiển thị avatar user đang login)

═══════════════════════════════════════  
BƯỚC 6: TESTING & VALIDATION  
═══════════════════════════════════════

6.1. Checklist cần test sau khi hoàn thành:  
     □ Tất cả asset load đúng, không broken image/video  
     □ Animation chạy mượt, không giật lag ở danh sách nhiều user cùng lúc  
     □ Decoration hiển thị đúng vị trí, không bị avatar tròn clip mất   
       phần nhô ra (cánh, tai, lông...)  
     □ Test trên mobile: video decoration có autoplay được không   
       (nhiều mobile browser chặn autoplay có âm thanh, cần đảm bảo   
       muted \+ playsinline)  
     □ Test prefers-reduced-motion: user bật chế độ giảm animation   
       hệ điều hành → asset nên fallback về static image  
     □ Test performance: đo file size tổng, thời gian load trang Shop   
       với 677 item (theo số lượng trong ảnh mẫu) \- cần pagination/  
       infinite scroll, KHÔNG load hết 677 item cùng lúc  
     □ User cũ đã mua item cũ: xác nhận coin đã hoàn hoặc item mới   
       đã được cấp đúng theo phương án đã chọn ở Bước 2.3

6.2. Rollback plan:  
     \- Backup toàn bộ DB trước khi chạy migration  
     \- Giữ branch Git riêng trước khi merge thay đổi lớn này  
     \- Có thể revert nhanh nếu phát hiện lỗi nghiêm trọng sau khi deploy

═══════════════════════════════════════  
OUTPUT MONG MUỐN TỪ BẠN (AI/Dev thực hiện)  
═══════════════════════════════════════

1\. Script phân tích \+ chuẩn hóa asset (Bước 1\)  
2\. File decorations-catalog.json đầy đủ metadata (để tôi review trước   
   khi import chính thức)  
3\. Migration script DB (Bước 2\) \- CHƯA chạy, đợi tôi xác nhận phương án   
   xử lý user cũ  
4\. Component code \<AvatarWithDecoration /\> và \<NameplateDisplay /\>   
   hoàn chỉnh (Bước 3\)  
5\. Cập nhật Shop UI \+ Modal Preview (Bước 4\)  
6\. Cập nhật trang cá nhân (Bước 5\)  
7\. Báo cáo kết quả test (Bước 6\) kèm screenshot/video demo

LƯU Ý QUAN TRỌNG:  
\- KHÔNG tự ý xóa dữ liệu user hiện tại khi chưa có xác nhận phương án   
  xử lý ở Bước 2.3  
\- Ưu tiên giữ code modular, dễ maintain vì Discord có thể cập nhật   
  asset mới theo thời gian, hệ thống cần dễ thêm item mới sau này   
  không chỉ giới hạn ở lần import này  
\- Tech stack cụ thể: \[ĐIỀN STACK CỦA BẠN \- React/Vue/Next \+   
  Node/Laravel/Django \+ MySQL/PostgreSQL/MongoDB...\]  
\`\`\`

\---  
z

zi