# Project Signature v1.1 · Kết quả Nhiemvu_7

## 1. Đèn pin

Nguồn tại miệng icon. Với hướng đơn vị **u** từ nguồn S tới chuột, pháp tuyến **n** vuông góc u và độ xa d: **w(d) = khẩu độ/2 + d × tan(π/11)**. Bốn góc đa giác là S ± n × (khẩu độ/2), và S + u × D ± n × w(D), trong đó D = 2 × đường chéo viewport. Vị trí chuột **không** giới hạn tầm chiếu: đèn rọi qua mọi vùng viewport theo hướng đó. Lớp sáng portaled vào body, không bị khung form cắt. Đa giác được tái sử dụng làm clip cho chữ mật khẩu; chữ chỉ lộ khi tia giao với ô. Nhấn đúp / Space / Enter vẫn hỗ trợ xem toàn bộ.

## 2. Đăng nhập / đăng ký (Welcome Sequence thay thế cảnh cũ)

Cảnh cửa và nhân vật cũ đã xoá. Bản mới **The Owl's Welcome** được triển khai trong `src/components/auth/WelcomeSequence.css` (timeline), `AuthModal.tsx` (welcome → form), và `OwlOutcome.tsx` (kết quả sau xác thực). Đăng xuất vẫn trực tiếp. Form đóng *trước khi* cảnh kết quả chạy; cảnh mới chỉ trang trí, có Skip và tự rời sau tối đa 1,55 giây, không che tương tác của ứng dụng.

## 3. 30 danh hiệu

| # | Tên | Hình icon | Độ hiếm | Cấp mở |
|---:|---|---|---|---:|
| 1 | Học Sinh | sách mở (`BookOpen`) | Thường | 1 |
| 2 | Người Mở Sổ | bút chì (`Pencil`) | Thường | 6 |
| 3 | Bạn Đồng Bàn | đôi bạn (`Users`) | Thường | 11 |
| 4 | Người Ghi Chép | sổ ghi (`NotebookPen`) | Thường | 16 |
| 5 | Người Đặt Câu Hỏi | dấu hỏi (`MessageCircleQuestionMark`) | Thường | 21 |
| 6 | Bạn Học Chủ Động | dấu kiểm (`CircleCheck`) | Thường | 26 |
| 7 | Người Giữ Nhịp | đồng hồ (`Clock3`) | Thường | 31 |
| 8 | Bạn Học Đều Đặn | lịch học (`CalendarDays`) | Thường | 36 |
| 9 | Người Ôn Bài | sách đánh dấu (`BookMarked`) | Hiếm | 41 |
| 10 | Người Tìm Tòi | kính lúp (`Search`) | Hiếm | 46 |
| 11 | Bạn Học Kiên Trì | bước chân (`Footprints`) | Hiếm | 51 |
| 12 | Người Giải Bài | bút giải (`SquarePen`) | Hiếm | 56 |
| 13 | Người Xếp Ý | danh sách (`ListChecks`) | Hiếm | 61 |
| 14 | Người Đọc Sâu | trang sách (`BookText`) | Hiếm | 66 |
| 15 | Bạn Học Bền Bỉ | bộ đếm (`Timer`) | Hiếm | 71 |
| 16 | Người Kết Nối | mạng kết nối (`Network`) | Hiếm | 76 |
| 17 | Người Chia Sẻ | mũi tên chia sẻ (`Share2`) | Sử thi | 81 |
| 18 | Người Phản Biện | đối thoại (`MessagesSquare`) | Sử thi | 86 |
| 19 | Người Thực Hành | bình thí nghiệm (`FlaskConical`) | Sử thi | 91 |
| 20 | Người Dẫn Nhóm | nhóm học (`UsersRound`) | Sử thi | 96 |
| 21 | Người Giải Thích | bóng đèn (`Lightbulb`) | Sử thi | 101 |
| 22 | Người Hướng Dẫn | bảng giảng (`Presentation`) | Sử thi | 106 |
| 23 | Người Nghiên Cứu | kính hiển vi (`Microscope`) | Sử thi | 111 |
| 24 | Người Tổng Hợp | tầng ghi chú (`Layers3`) | Sử thi | 116 |
| 25 | Cố Vấn Học Tập | mũ tốt nghiệp (`GraduationCap`) | Huyền thoại | 121 |
| 26 | Người Soạn Bài | thư viện (`LibraryBig`) | Huyền thoại | 126 |
| 27 | Người Thẩm Định | khung kiểm tra (`ScanSearch`) | Huyền thoại | 131 |
| 28 | Người Truyền Cảm Hứng | tia sáng (`Sparkles`) | Huyền thoại | 136 |
| 29 | Người Dẫn Đường | la bàn (`Compass`) | Huyền thoại | 141 |
| 30 | Chuyên Gia | huy hiệu (`Award`) | Huyền thoại | 146 |

Mỗi danh hiệu dùng icon khác nhau, cùng khung nét mảnh; hover nảy nhẹ. Hạng 8 bậc cũ vẫn dùng cho XP/compatibility, bảng Danh hiệu hiển thị toàn bộ 30 mốc cùng huy hiệu hoạt động.

## 4. 35 vật phẩm

| # | Tên | Icon | Nhóm | Mô tả ngắn |
|---:|---|---|---|---|
| 1 | Viền Trang Vở | Frame | Khung avatar | Viền giấy kẻ ô cho ảnh đại diện. |
| 2 | Ghim Ghi Nhớ | Pin | Góc hồ sơ | Ghim một dấu nhỏ bên hồ sơ. |
| 3 | Sổ Học Kỳ | NotebookPen | Góc hồ sơ | Trang sổ lưu dấu chặng học. |
| 4 | Viền Tra Cứu | Search | Khung avatar | Viền kính trong quanh ảnh. |
| 5 | Viền Kẻ Dòng | Ruler | Khung avatar | Đường kẻ mảnh quanh ảnh. |
| 6 | Sắc Xanh Bàn Học | FlaskConical | Theme Focus | Màu dịu cho góc tập trung. |
| 7 | La Bàn Nhóm Học | Compass | Góc hồ sơ | Dấu chỉ hướng bên hồ sơ. |
| 8 | Nhịp Ôn Bài | Hourglass | Hiệu ứng | Cát chuyển động khi xem thẻ. |
| 9 | Đèn Đọc Khuya | LampDesk | Hiệu ứng | Ánh đèn dịu trên thẻ học. |
| 10 | Viền Học Kỳ Vàng | GraduationCap | Khung avatar | Nét đồng mảnh cho ảnh đại diện. |
| 11 | Focus Đêm Ấm | Moon | Theme Focus | Nền ấm cho phiên học tối. |
| 12 | Viền Lăng Kính | Gem | Khung avatar | Viền ánh sáng có tiết chế. |
| 13 | Đom Đóm Trang Sổ | Lamp | Hiệu ứng | Đốm sáng nhỏ bên ghi chú. |
| 14 | Cú Bông Canh Giờ | Bird | Góc hồ sơ | Cú Bông nhắc nghỉ đúng lúc. |
| 15 | Viền Bảng Phấn | Square | Khung avatar | Viền phấn mỏng trên bảng tối. |
| 16 | Viền Ô Ly | Grid3X3 | Khung avatar | Nếp ô ly quanh ảnh đại diện. |
| 17 | Viền Thư Viện | LibraryBig | Khung avatar | Đường sách đôi quanh chân dung. |
| 18 | Viền Sáng Sớm | Sunrise | Khung avatar | Viền nắng nhẹ đầu ngày. |
| 19 | Viền Bản Vẽ | DraftingCompass | Khung avatar | Nét vẽ kỹ thuật gọn gàng. |
| 20 | Viền Luận Văn | ScrollText | Khung avatar | Viền đồng kiểu bìa luận văn. |
| 21 | Lật Trang | BookOpen | Hiệu ứng | Chuyển trang khi mở thẻ. |
| 22 | Nét Chì | PencilLine | Hiệu ứng | Nét chì vẽ nhẹ khi mở. |
| 23 | Kim Đồng Hồ | Clock3 | Hiệu ứng | Kim nhích khẽ theo phút. |
| 24 | Mảnh Ghi Chú | StickyNote | Hiệu ứng | Một tờ giấy rung nhẹ. |
| 25 | Trăng Học Đêm | MoonStar | Hiệu ứng | Vầng trăng nhỏ bên F-Pass. |
| 26 | Focus Giấy Kem | Palette | Theme Focus | Nền giấy kem dịu mắt. |
| 27 | Focus Đá Phiến | PanelTop | Theme Focus | Nền xanh xám tĩnh lặng. |
| 28 | Focus Rêu Nhạt | Leaf | Theme Focus | Sắc rêu dịu cho buổi đọc. |
| 29 | Focus Mực Đêm | Droplets | Theme Focus | Nền mực tối ít phân tâm. |
| 30 | Focus Gỗ Sồi | Trees | Theme Focus | Sắc gỗ trầm cho giờ học. |
| 31 | Dấu Trang | Bookmark | Góc hồ sơ | Đánh dấu sách đang đọc. |
| 32 | Lịch Học | CalendarDays | Góc hồ sơ | Lịch nhỏ bên góc hồ sơ. |
| 33 | Kệ Sách | Blocks | Góc hồ sơ | Kệ sách gọn trên F-Pass. |
| 34 | Dấu Bài Tốt | Stamp | Góc hồ sơ | Con dấu trên thẻ thành tích. |
| 35 | Hộp Lưu Trữ | Archive | Góc hồ sơ | Hộp kỷ niệm cuối học kỳ. |

Tất cả có ID và giá thật dùng chung với máy chủ; giữ nguyên 14 ID cũ để không mất đồ đã mua. Có lọc nhóm, tooltip, xem trước, mua bằng Coin và trang bị; theme đã trang bị đổi nền Focus Room, khung đổi viền avatar, hiệu ứng hiện trên dấu ấn hồ sơ, góc hồ sơ hiển thị icon trang bị.

## 5. GUI hồ sơ / shop / auth

Bento sáu stat (XP và Hay nhất lớn hơn), mỗi ô có icon + đếm số theo dữ liệu thật, nhấp để xem ý nghĩa. Hồ sơ, F-Pass, Boutique, Hoạt động và F-ID giữ chức năng cũ (chỉnh sửa, báo cáo, tim, đổi đồ, xem hoạt động) nhưng dùng một hệ midnight ink / warm brass / neutral paper, bán kính 10–16px, shadow nhẹ. Auth chuyển từ steampunk bóng nhựa sang bảng matte; lớp sao dày hơn và mặt trăng có vân, quầng sáng; chuyển cảnh đêm bằng opacity easing.

## 6. Navbar

Trang chủ chỉ icon Home với title và tooltip; Phòng chat → Chat; Câu lạc bộ → Club.

## 7. Tự đánh giá

- Chùm sáng là tứ giác **mở tuyến tính** theo khoảng cách, không phải hình tròn. Chiều dài vượt viewport; chỉ chữ trong vùng giao ô mật khẩu được lộ.
- 30 tên danh hiệu không lặp; 35 tên/icon shop cũng không lặp (kiểm thử). Danh hiệu là mốc học tập, shop là đồ trang trí cụ thể.
- Nhận diện còn Cú Bông, F-Pass, Focus Room và đồng ấm trên nền mực đêm; giảm màu neon đối chọi, bỏ bóng clay và độ bóng nhựa trên bề mặt chính.
- Nội dung thẻ shop là tên, giá, icon; mô tả nằm trong tooltip; stat chỉ hiển thị tên + số, lời giải thích mở khi click.

Kiểm chứng: `npm run build`, `npm run lint`, `npm test`.
