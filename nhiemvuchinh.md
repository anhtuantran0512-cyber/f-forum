1)     Trong vai 1 chuyên gia coding chuyên nghiệp ,trình độ cao có hiễu rõ về : wed , thiết kế , cybersecurity  
-hãy điều hành studio làm những nhiệm vụ sau :
- nhiệm vụ 1 : làm lại giao diện của phòng tập trung , xóa âm thanh,toàn bộ âm thanh 425hz , xóa tính năng chill lofi không cần thiết, làm lại giao diện phòng tập trung , sáng tạo ,làm lại cái đồng hồ sao cho đẹp hơn sáng tạo , tạo ấn tượng với người dùng, thầy cô ,học sinh 
- setting : thêm vào trong setting 1 phần nữa là 1 nút, tên là Potator mode : chế độ này sẽ vô hiệu hóa toàn background , trừ background ở trang chủ ra, vô hiệu hóa toàn bộ background, ngoài ra giao diện sẽ có thay đổi là trở thành tối giãn ở chế độ này ( bạn có thể tham khảo code_yeucau.md để biết rõ về các phong cách thiết kế  , để mà sáng tạo đẹp hơn ) 
+ ở chế độ Potator sẽ có gì? (thanh chuyển chế độ đẹp, có animation tốt ,hiển thị rõ cartoon đẹp)
+ ở Potator mode toàn bộ giao diện sẽ  được làm lại nhằm tối ưu hiệu năng cho người dùng, vô hiệu hóa hình nền động ở các trang khác, thay vào đó là các màu sắc background theme,gradient đẹp từ wed gradient đẹp cho wed 
+ giao diện làm lại ở potator mode sao cho đẹp và ổn định nhất nha 
+ toàn bộ hiệu ứng vẫn giữ nguyên, chỉ thay đổi về hình nền vì hình nền gây lag thôi, nên thay hình nền thành 1 màu gradient hoặc sáng tạo các gradient hoặc để đen kim loại, đen, trắng,tùy chế độ và người dùng chọn
+ không được phép xóa các hiệu ứng , chuyển động mượt ở chế độ này

2)    -Update thêm ( admin panel ): admin panel , nếu là người được đánh là admin , Mod, Giáo Viên , ở trong chức năng tia sét , là cái cục tia sét ở dưới góc á , nếu là admin sẽ xuất hiện thêm 1 icon , có icon kiểu admin, bấm vào hiển thị gui admin , gui admin có thể dựa vào (code_yeucau.md để tham khảo thiết kế ) phù hợp nhất , ở trang thứ nhất trong gui admin sẽ xuất hiện trang thống kê , thống kê thông số người dùng đã vào trang theo , ngày, tháng, năm, có biểu đồ và trang trí đẹp, và thêm 1 phần thiết kế bao gồm tổng thời gian người dùng đã vào thăm wed, thông số rõ, thông số về tổng báo cáo nhận được, và các thông số admin khác thêm mà bạn thấy là cần thiết và hay 

- thêm 1 icon chọn tab sang trang bên sẽ hiển thị thông số người dùng là toàn bộ tài khoản đang có trên server ( không tính tài khoản guest) hiển thị toàn bộ thông số về người đó , và bên cạnh là các nút chức năng như , Cấm (thời hạn 1 ngày đến 1 tuần đến  vĩnh viễn ), Cảnh cáo, mute , và 1 dấu 3 chấm khi bấm vào sẽ hiển thị profile thông số của họ ( cho giáo viên và admin coi ), thêm 1 nút setting give role : Moderator ,Giáo Viên
- Tôi liệt kê các chức năng có thể còn thiếu và tôi cần studio có thể tự đánh giá và code thêm những gì cần thiết với dự án của chúng ta 
- Chỉ tài khoản được gắn admin mới có thể give role cho người khác ,các role khác không thể có các chức năng give role cho người khác , thêm 1 nút tạo role bao gồm các setting chọn icon đại diện role, màu sắc ký tự đặc biệt, nổi bật cho role ( đảm bảo đầy đủ các setting tạo role ổn định nhất )
- Tạo riêng 1 tài khoản admin để vào test, nhớ mã hóa mạnh vào lưu vào hệ thống để sau này đăng nhập vào give role : Tên Đăng NHập : BroAmStuck@gmail.com ( mật khẩu : Tuan@05122009 ( đây cũng là tài khoản superadmin duy nhất )
- think step by step - 

- thầy cô và mod có các chức năng cơ bản của admin nhưng không được phép give role cho người khác 
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
3) 
- fix lỗi 2 : khóa tính năng lăn chuột sẽ tự động chuyển tab , ví dụ chuyển từ trang này sang trang khác, xóa cái này luôn đi 
- không gian tập trung nhớ cho thêm các mốc nhận coin ở mức 25 phút, 60 phút, 120 phút , người dùng được phép chỉnh sửa số giờ mục tiêu từ 5 phút trở lên 
- xóa các dòng note vớ vẩn ở các gui , ngoài ra đồng bộ hóa màu sắc đảm bảo màu sắc phải đẹp và đúng tiêu chuẩn không khó nhìn hoặc phối màu khó chịu đè màu gây khó nhìn , ví dụ như thanh navigate bar hiện tại cái màu nó chói trắng ,do lỗi màu ( màu sắc trắng chế độ sáng đúng là màu của thanh setting và thanh thông báo á, màu trong suốt như vậy đẹp đó )
- update tối ưu : tối ưu lại toàn bộ chất lượng gui, ví dụ ở gui giao diện bật chế độ sáng nhưng màu vẫn tối , xấu , không sáng, biết răng gui profile sử dụng phong cách claymophism , nhưng màu sáng tối lẫn lộn chưa đẹp, clay chỉ xuất hiện ở trong gui nhưng không xuất hiện ở cả gui profile đó, xắp xếp vẫn còn xấu chưa tạo ấn tượng với người dùng , học sinh 
- ngoài ra ở một số profile các cách xắp xếp danh diệu vẫn chưa được đẹp, shop vẫn chưa được đẹp, kiểu gui vẫn còn khô chưa có chút ấn tượng gì về thiết kế, ban desginer chưa hoạt động tốt lắm ,các agent chưa hiệu nghiệm ,deepcoder chưa tốt 
- ở setting, gradient vẫn chưa có tiếng nói, vẫn chưa hài hòa và chưa thấy ấn tượng lắm với người dùng, nhưng lần này bản potator đã ra đời, thì nên tận dụng cái gradient hợp lý nha ở setting đó, hài hòa màu sắc phối màu 
- yêu cầu : tham khảo các trang wed gradient open sourrce đẻ lấy màu và phong cách thiết kế
chạy lệnh /browse https://grainient.supply/collections/godrays-gradients 
để tìm thấy gradient cần thiết 
/browse : https://craftwork.design/curated/website/grainient-supply 
nhớ tự tư duy sâu và tận dụng các nguồn tài nguyên trên mạng 
- think step by step - 
/browse : https://codefronts.com/
tham khảo phong cách thiết kế, tìm prompt code,thiết kế đẹp của bạn trên này: https://codefronts.com/ 
BẠN PHẢI THAM KHẢO TRÊN WED NÀY KHÔNG ĐƯỢC TỰ Ý SÁNG TẠO THEO KIỂU KHÔ KHAN VÀ LÀM CHO CÓ
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
4) - tối ưu lại đảm bảo hoạt động tốt cả máy yếu và máy mạnh , đảm bảo giữa trải nghiệm và chất lượng mà không thay đổi gì cả, tránh gây ảnh hưởng ngầm tới người dùng 
- khóa console và  đảm bảo cybersecurity trên wed 
- file ảnh đại diện khi thêm vào thấy vẫn hơi mờ, chất lượng hơi thấp gây khó chịu với người dùng
- ~~~~~~~~~~~~~~~
sau khi làm xong tự tư duy và nâng cấp thêm 5 lần nữa , không giới hạn toàn bộ cho phép TOÀN BỘ , tự động hóa TỰ NÂNG CẤP VÀ TỰ UPDATE, TỰ SÁNG TẠO TỐT
- PHẢI ÁP DỤNG TOÀN BỘ CODE_YEUCAU.MD HỢP LÝ KHÔNG THỪA KHÔNG THIẾU 