/* Linh Thú Học Thuật 2.5D F-Forum v5.0 — Lý Ngư Vọng Nguyệt, Cú Tuyết Athena & Trống Đồng Đông Sơn.
 * Thiết kế theo triết lý "Tối giản nhưng có hồn riêng" (Bạch Ngọc Kintsugi, Thuỷ Mặc Chu Sa),
 * chăm chút từng nhịp thở nắp mang, cái chớp mắt, tự động chúc mừng Đại Lễ Việt Nam & Sinh Nhật thành viên.
 * Không chặn click (pointer-events: none). */
(function () {
  if (window.__astralDragonCleanup) {
    try { window.__astralDragonCleanup(); } catch (e) {}
  }
  window.__astralDragon = true;
  window.__astralDragonMode = 'initializing';

  var extCfg = window.FORUM_SPIRIT_CONFIG || {};

  // Tự động phát hiện Ngày Trọng Đại Việt Nam theo ngày hệ thống nếu không truyền thủ công
    // Biểu trưng F-Forum thiết kế lại (Ấn Hoàng Gia Bát Giác + Sao Khuê 8 cánh + Cánh Chim Lạc tạo chữ F)
  var FFORUM_CREST_SVGS = {
    seal: '<svg viewBox="0 0 40 40" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><polygon points="12.5,2.5 27.5,2.5 37.5,12.5 37.5,27.5 27.5,37.5 12.5,37.5 2.5,27.5 2.5,12.5" fill="currentColor" fill-opacity="0.08" stroke-opacity="0.55"/><circle cx="20" cy="20" r="13.5" stroke-dasharray="2 2" stroke-opacity="0.4"/><path d="M13.5 28.5V11.5C13.5 11.5 19.5 10.2 27 11.5" stroke-width="2.3"/><path d="M13.5 19.5H23.5" stroke-width="2.2"/><path d="M10.8 28.5H16.2" stroke-width="1.8"/><path d="M27.5 8.5L28.6 11.4L31.5 12.5L28.6 13.6L27.5 16.5L26.4 13.6L23.5 12.5L26.4 11.4Z" fill="currentColor" stroke="none"/></svg>',
    camellia: '<svg viewBox="0 0 40 40" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><polygon points="12.5,2.5 27.5,2.5 37.5,12.5 37.5,27.5 27.5,37.5 12.5,37.5 2.5,27.5 2.5,12.5" fill="currentColor" fill-opacity="0.08" stroke-opacity="0.45"/><path d="M20 7.5C23 12 23 16 20 17C17 16 17 12 20 7.5Z" fill="currentColor" fill-opacity="0.2"/><path d="M20 32.5C23 28 23 24 20 23C17 24 17 28 20 32.5Z" fill="currentColor" fill-opacity="0.2"/><path d="M7.5 20C12 17 16 17 17 20C16 23 12 23 7.5 20Z" fill="currentColor" fill-opacity="0.2"/><path d="M32.5 20C28 17 24 17 23 20C24 23 28 23 32.5 20Z" fill="currentColor" fill-opacity="0.2"/><path d="M17.5 23.5V16.5H23.5M17.5 20H22" stroke-width="2.1"/></svg>',
    drum: '<svg viewBox="0 0 40 40" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round" stroke-linejoin="round"><circle cx="20" cy="20" r="16.5" stroke-opacity="0.5"/><circle cx="20" cy="20" r="11.5" stroke-dasharray="2.5 2" stroke-opacity="0.45"/><path d="M20 7L21.4 13.6L28 12L23 17L29 20L23 23L28 28L21.4 26.4L20 33L18.6 26.4L12 28L17 23L11 20L17 17L12 12L18.6 13.6Z" fill="currentColor" fill-opacity="0.18"/><path d="M17.5 24V16H23.5M17.5 20H22" stroke-width="2.2"/></svg>',
    lotus: '<svg viewBox="0 0 40 40" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><polygon points="12.5,2.5 27.5,2.5 37.5,12.5 37.5,27.5 27.5,37.5 12.5,37.5 2.5,27.5 2.5,12.5" stroke-opacity="0.4"/><path d="M20 8C24 14.5 25 21.5 20 28C15 21.5 16 14.5 20 8Z" fill="currentColor" fill-opacity="0.18"/><path d="M20 28C25.5 26 30 20.5 31 14C25.5 16 22 20.5 20 28Z"/><path d="M20 28C14.5 26 10 20.5 9 14C14.5 16 18 20.5 20 28Z"/><path d="M17.5 23.5V16H23M17.5 19.8H21.8" stroke-width="2.1"/></svg>',
    lantern: '<svg viewBox="0 0 40 40" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><polygon points="12.5,2.5 27.5,2.5 37.5,12.5 37.5,27.5 27.5,37.5 12.5,37.5 2.5,27.5 2.5,12.5" stroke-opacity="0.4"/><ellipse cx="20" cy="19" rx="9.5" ry="8" fill="currentColor" fill-opacity="0.14"/><path d="M15.5 11H24.5M15.5 27H24.5M20 7V11M20 27V33"/><path d="M17.5 23V15.5H23M17.5 19.2H21.8" stroke-width="2.1"/></svg>'
  };

  // Tự động phát hiện Ngày Lễ Việt Nam theo ngày hệ thống
  function detectVietnameseSpecialDay() {
    if (extCfg.isBirthday) return 'birthday';
    if (extCfg.eventMode) return extCfg.eventMode;
    var d = new Date(), m = d.getMonth() + 1, day = d.getDate();
    var key = 'vn_' + String(day).padStart(2, '0') + String(m).padStart(2, '0');
    if (EVENT_PRESETS && EVENT_PRESETS[key]) return key;
    return 'vn_2010';
  }

  // 100% ĐẦY ĐỦ TOÀN BỘ 38 NGÀY LỄ DƯƠNG LỊCH, ÂM LỊCH, LỊCH SỬ, VĂN HÓA & NGÀNH NGHỀ VIỆT NAM
  // Mỗi ngày lễ có 4 bài thơ đối ngẫu (38 x 4 = 152 bài thơ). Chân thẻ chỉ ghi gọn "Kỷ niệm DD/MM" để không lặp từ!
  var EVENT_PRESETS = {
    normal: {
      stamp: 'Tu luyện Tri thức',
      gender: 'all',
      crest: 'seal',
      centerType: 'saokhue',
      poems: [
        'Biển học mênh mông rèn chí lớn,<br>Đèn khuya sáng tỏ bậc kỳ tài.',
        'Một chữ tinh hoa ngàn năm quý,<br>Trăm trang sách mở vạn đường mây.',
        'Lý Ngư vượt sóng qua Vũ Môn,<br>Sao Khuê tỏa rạng chốn văn đàn.',
        'Mài mực đêm thu tầm chân lý,<br>Vững lòng khoa bảng dựng cơ đồ.'
      ]
    },
    // --- NHÓM I: ĐẠI LỄ LỊCH SỬ & QUỐC GIA VIỆT NAM ---
    vn_0302: {
      stamp: 'Kỷ niệm 03/02/1930',
      gender: 'all',
      crest: 'drum',
      centerType: 'drum',
      poems: [
        'Mùa xuân lịch sử bừng ánh đuốc,<br>Dẫn lối non sông vạn dặm trường.',
        'Ba tháng Hai ngời trang sử đỏ,<br>Một lòng kiến thiết nước non cao.',
        'Ngọn cờ khai sáng đường dân tộc,<br>Vững bước tương lai rạng cơ đồ.',
        'Chín mươi mùa xuân ngời lý tưởng,<br>Non sông gấm vóc mãi trường tồn.'
      ]
    },
    vn_1003_al: {
      stamp: 'Giỗ Tổ 10/03 ÂL',
      gender: 'all',
      crest: 'drum',
      centerType: 'drum',
      poems: [
        'Các Vua Hùng đã có công dựng nước,<br>Bác cháu ta phải cùng nhau giữ lấy nước.',
        'Dù ai đi ngược về xuôi,<br>Nhớ ngày Giỗ Tổ mùng Mười tháng Ba.',
        'Cội nguồn Lạc Việt ngàn năm vững,<br>Con cháu Rồng Tiên rạng sử vàng.',
        'Đền Hùng khói tỏa linh khí tụ,<br>Muôn dân hướng vọng đất Phong Châu.'
      ]
    },
    vn_3004: {
      stamp: 'Kỷ niệm 30/04/1975',
      gender: 'all',
      crest: 'drum',
      centerType: 'drum',
      poems: [
        'Non sông liền một dải gấm hoa,<br>Bắc Nam sum họp khúc ca khải hoàn.',
        'Tháng Tư lịch sử rợp cờ bay,<br>Đất nước trọn niềm vui sum vầy.',
        'Máu xương dệt gấm non sông Việt,<br>Độc lập muôn đời tỏa ánh dương.',
        'Hòa bình nở thắm từng trang sách,<br>Vững bước dựng xây nước mạnh giàu.'
      ]
    },
    vn_0705: {
      stamp: 'Kỷ niệm 07/05/1954',
      gender: 'all',
      crest: 'drum',
      centerType: 'drum',
      poems: [
        'Lừng lẫy năm châu rền Điện Biên,<br>Chấn động địa cầu trang sử thiêng.',
        'Chín năm làm một Điện Biên,<br>Nên vành hoa đỏ, nên thiên sử vàng.',
        'Mường Thanh vang vọng lời non nước,<br>Bản hùng ca sáng mãi muôn đời.',
        'Hoa ban trắng nở đồi lịch sử,<br>Khí phách Việt Nam rạng bốn phương.'
      ]
    },
    vn_1905: {
      stamp: 'Kỷ niệm 19/05/1890',
      gender: 'all',
      crest: 'lotus',
      centerType: 'lotus',
      poems: [
        'Tháp Mười đẹp nhất bông sen,<br>Việt Nam đẹp nhất có tên Bác Hồ.',
        'Hương sen Làng Sen thơm muôn thuở,<br>Đức độ Người soi sáng non sông.',
        'Tháng Năm nhớ Bác lòng thêm sáng,<br>Tu rèn tri thức dựng quê hương.',
        'Non sông ngàn dặm in dấu Bác,<br>Soi đường thế hệ bước vươn cao.'
      ]
    },
    vn_2707: {
      stamp: 'Tưởng niệm 27/07',
      gender: 'all',
      crest: 'lotus',
      centerType: 'lotus',
      poems: [
        'Uống nước nhớ nguồn ơn liệt sĩ,<br>Sen vàng thành kính gửi ngàn thu.',
        'Máu đào nhuộm thắm cờ Tổ quốc,<br>Tên các anh hùng tạc núi sông.',
        'Đời đời ghi tạc công ơn lớn,<br>Giữ trọn bình yên dải đất này.',
        'Nén tâm hương thắp mùa tri ân,<br>Anh linh bất tử cùng non nước.'
      ]
    },
    vn_1908: {
      stamp: 'Kỷ niệm 19/08/1945',
      gender: 'all',
      crest: 'drum',
      centerType: 'drum',
      poems: [
        'Mùa thu Tháng Tám bừng lịch sử,<br>Phá xiềng nô lệ dựng tự do.',
        'Muôn triệu tim chung lời thề lớn,<br>Mở kỷ nguyên độc lập non sông.',
        'Sóng trào Cách mạng vang bờ cõi,<br>Rạng rỡ non sông buổi tự cường.',
        'Cờ hồng tung bay trời thu mới,<br>Dân tộc vươn mình làm chủ quê hương.'
      ]
    },
    vn_0209: {
      stamp: 'Quốc khánh 02/09/1945',
      gender: 'all',
      crest: 'drum',
      centerType: 'drum',
      poems: [
        'Nước Việt Nam có quyền hưởng tự do và độc lập,<br>Ba Đình nắng tỏa rạng non sông.',
        'Trời thu Ba Đình vang Tuyên ngôn,<br>Sao vàng năm cánh rạng tâm hồn.',
        'Non sông gấm vóc ngàn năm vững,<br>Trí tuệ Việt Nam vươn biển khơi.',
        'Độc lập tự do ngời chân lý,<br>Muôn triệu người chung một niềm tin.'
      ]
    },
    vn_1010: {
      stamp: 'Kỷ niệm 10/10/1954',
      gender: 'all',
      crest: 'drum',
      centerType: 'drum',
      poems: [
        'Năm cửa ô đón đoàn quân tiến về,<br>Thăng Long rợp bóng cờ hoa thu.',
        'Hồ Gươm xanh biếc in bóng tháp,<br>Ngàn năm văn hiến đất kinh kỳ.',
        'Thu Hà Nội sáng trang lịch sử,<br>Khí phách Thăng Long rạng muôn đời.',
        'Ba mươi sáu phố phường rộn nắng,<br>Thủ đô hòa bình rạng sắc thu.'
      ]
    },
    vn_2212: {
      stamp: 'Kỷ niệm 22/12/1944',
      gender: 'all',
      crest: 'drum',
      centerType: 'drum',
      poems: [
        'Vì nước quên thân, vì dân phục vụ,<br>Chân đồng vai sắt giữ biên cương.',
        'Từ rừng Trần Hưng Đạo năm xưa,<br>Quân đội anh hùng giữ cõi bờ.',
        'Bộ đội Cụ Hồ ngời phẩm chất,<br>Vững tay súng giữ trọn bình yên.',
        'Biên cương hải đảo bền tay giữ,<br>Tổ quốc bình yên rạng nụ cười.'
      ]
    },

    // --- NHÓM II: PHÁI ĐẸP, GIA ĐÌNH, THIẾU NHI & THẾ HỆ TRẺ ---
    vn_0803: {
      stamp: 'Kỷ niệm 08/03',
      gender: 'female',
      crest: 'camellia',
      centerType: 'camellia',
      poems: [
        'Tựa đóa trà my ngời sương sớm,<br>Trí huệ dịu dàng rạng sắc xuân.',
        'Nét ngọc đoan trang bừng trang sách,<br>Hương lan thanh khiết tỏa văn đàn.',
        'Chúc bậc nữ lưu giàu trí sáng,<br>Mỗi bước đường xa vạn đóa hồng.',
        'Dịu dàng bản lĩnh ngời tâm ngọc,<br>Rạng rỡ mùa xuân chốn học đường.'
      ]
    },
    vn_2010: {
      stamp: 'Kỷ niệm 20/10',
      gender: 'female',
      crest: 'camellia',
      centerType: 'camellia',
      poems: [
        'Tám chữ vàng son ngời sử Việt,<br>Khí phách dịu dàng rạng nước non.',
        'Anh hùng, bất khuất, trung hậu, đảm đang,<br>Sắc tâm trí tuệ sánh trăng rằm.',
        'Sen hồng đất Việt thơm ngàn thuở,<br>Tôn vinh nữ học giả văn đàn.',
        'Đoan trang trí huệ ngời trang sử,<br>Phụ nữ Việt Nam rạng bốn phương.'
      ]
    },
    vn_2603: {
      stamp: 'Kỷ niệm 26/03/1931',
      gender: 'all',
      crest: 'seal',
      centerType: 'saokhue',
      poems: [
        'Đâu cần thanh niên có, đâu khó có thanh niên,<br>Khát vọng tuổi xanh dựng cơ đồ.',
        'Nhiệt huyết tuổi xuân bừng ngọn lửa,<br>Chinh phục đỉnh cao của tri thức.',
        'Sức trẻ tiên phong mở lối mới,<br>Rạng danh trí Việt khắp năm châu.',
        'Áo xanh tình nguyện đi muôn nẻo,<br>Dệt những mùa xuân của đất trời.'
      ]
    },
    vn_1505: {
      stamp: 'Kỷ niệm 15/05/1941',
      gender: 'all',
      crest: 'seal',
      centerType: 'saokhue',
      poems: [
        'Vì Tổ quốc xã hội chủ nghĩa,<br>Vì lý tưởng của Bác Hồ vĩ đại: Sẵn sàng!',
        'Khăn quàng đỏ thắm trên vai nhỏ,<br>Chăm ngoan học giỏi rạng tương lai.',
        'Măng non đất Việt vươn mình lớn,<br>Tiếp bước cha anh dựng nước nhà.',
        'Tiếng trống Đội vang mùa nắng hạ,<br>Ươm mầm nhân tài cho non sông.'
      ]
    },
    vn_0106: {
      stamp: 'Kỷ niệm 01/06',
      gender: 'all',
      crest: 'lantern',
      centerType: 'lantern',
      poems: [
        'Trẻ em như búp trên cành,<br>Biết ăn ngủ, biết học hành là ngoan.',
        'Trong trẻo tiếng cười vang nắng hạ,<br>Ươm mầm trí tuệ những mùa sau.',
        'Cánh diều tuổi thơ bay ngập nắng,<br>Chở bao mơ ước tới trời cao.',
        'Chúc những mầm xanh giàu ước vọng,<br>Mỗi ngày khôn lớn vạn niềm vui.'
      ]
    },
    vn_2806: {
      stamp: 'Kỷ niệm 28/06',
      gender: 'all',
      crest: 'lotus',
      centerType: 'lotus',
      poems: [
        'Gia đình là cội nguồn yêu thương,<br>Nếp nhà đầm ấm vạn bình an.',
        'Cơm sôi lửa ấm tình sum họp,<br>Thuận vợ thuận chồng tát biển Đông.',
        'Mái ấm chở che qua giông bão,<br>Bình yên nâng bước những chặng đường.',
        'Giữ gìn gia đạo thơm truyền thống,<br>Hạnh phúc đong đầy khắp mọi nhà.'
      ]
    },
    vn_0110: {
      stamp: 'Kỷ niệm 01/10',
      gender: 'all',
      crest: 'lotus',
      centerType: 'lotus',
      poems: [
        'Kính lão đắc thọ truyền gia huấn,<br>Bóng cả cây cao rợp mái nhà.',
        'Tóc bạc tâm trong ngời đức lớn,<br>Cháu con sum họp trọn niềm vui.',
        'Chúc bậc cao niên trường thọ mãi,<br>An khang phúc lộc tựa tùng bách.',
        'Lời vàng ông bà soi thế hệ,<br>Giữ trọn nếp nhà nghĩa thủy chung.'
      ]
    },
    birthday: {
      stamp: 'Khánh Tuế Sinh Nhật',
      gender: 'all',
      crest: 'lantern',
      centerType: 'lantern',
      poems: [
        'Thêm một mùa xuân thêm trí sáng,<br>Chân trời học vấn rộng thênh thang.',
        'Chúc tuổi mới ngời muôn ý đẹp,<br>Vững bước đường mây đạt sở cầu.',
        'Hoa đăng tỏa sáng mừng sinh nhật,<br>Bút sắc tâm trong rạng công thành.',
        'Vượt sóng Vũ Môn nghênh tuổi mới,<br>Học vị thăng hoa vạn sự lành.'
      ]
    },

    // --- NHÓM III: GIÁO DỤC, KHOA HỌC & NGÀNH NGHỀ VIỆT NAM ---
    vn_0901: {
      stamp: 'Kỷ niệm 09/01/1950',
      gender: 'all',
      crest: 'seal',
      centerType: 'saokhue',
      poems: [
        'Ngọn lửa Trần Văn Ơn bất diệt,<br>Sinh viên Việt Nam chí kiên cường.',
        'Giảng đường rạng sáng bầu nhiệt huyết,<br>Dùi mài kinh sử dựng tương lai.',
        'Tuổi trẻ học đường giàu khát vọng,<br>Đem nguồn tri thức giúp non sông.',
        'Rèn đức luyện tài vươn biển lớn,<br>Xứng danh sinh viên đất Lạc Hồng.'
      ]
    },
    vn_2702: {
      stamp: 'Kỷ niệm 27/02/1955',
      gender: 'all',
      crest: 'lotus',
      centerType: 'lotus',
      poems: [
        'Lương y phải như từ mẫu,<br>Tâm sáng y đức cứu muôn người.',
        'Áo trắng thanh cao lòng nhân ái,<br>Giữ nhịp sinh tồn giữa nhân gian.',
        'Hải Thượng Lãn Ông truyền y đạo,<br>Trọn đời tận tụy vì bệnh nhân.',
        'Tri ân người giữ mùa sự sống,<br>Vững tâm y thuật cứu nhân đời.'
      ]
    },
    vn_2003: {
      stamp: 'Kỷ niệm 20/03',
      gender: 'all',
      crest: 'lantern',
      centerType: 'lantern',
      poems: [
        'Tâm an vạn sự tự nhiên thành,<br>San sẻ yêu thương nở nụ cười.',
        'Hạnh phúc bắt nguồn từ tri thức,<br>Lòng nhân lan tỏa khắp muôn nơi.',
        'Mỗi ngày trao gửi điều tử tế,<br>Đời thêm tươi sáng vạn niềm vui.',
        'Giữ tâm trong sáng như mặt hồ,<br>Bình yên hạnh phúc tự tìm về.'
      ]
    },
    vn_2104: {
      stamp: 'Kỷ niệm 21/04',
      gender: 'all',
      crest: 'seal',
      centerType: 'saokhue',
      poems: [
        'Mỗi trang sách mở ngàn chân trời,<br>Kết tinh trí tuệ của muôn đời.',
        'Đọc sách để soi gương cổ kim,<br>Nuôi dưỡng tâm hồn và trí sáng.',
        'Hương giấy thơm lừng trang cổ điển,<br>Khai tâm mở trí bước đường dài.',
        'Sách quý như đèn soi đêm tối,<br>Dẫn người hiếu học tới vinh quang.'
      ]
    },
    vn_0105: {
      stamp: 'Kỷ niệm 01/05',
      gender: 'all',
      crest: 'seal',
      centerType: 'saokhue',
      poems: [
        'Bàn tay ta làm nên tất cả,<br>Có sức người sỏi đá cũng thành cơm.',
        'Tôn vinh lao động và sáng tạo,<br>Dựng xây đất nước đẹp giàu hơn.',
        'Mồ hôi ươm nở mùa quả ngọt,<br>Trí óc bàn tay dệt cơ đồ.',
        'Lao động cần cù sinh phú quý,<br>Sáng tạo không ngừng mở tương lai.'
      ]
    },
    vn_1805: {
      stamp: 'Kỷ niệm 18/05',
      gender: 'all',
      crest: 'seal',
      centerType: 'saokhue',
      poems: [
        'Khoa học và công nghệ là quốc sách hàng đầu,<br>Đổi mới sáng tạo vươn tầm cao.',
        'Khám phá quy luật của vũ trụ,<br>Thắp sáng tương lai bằng trí tuệ.',
        'Từ phòng thí nghiệm ra đời sống,<br>Trí Việt vươn mình kỷ nguyên số.',
        'Nghiên cứu chuyên sâu tầm chân lý,<br>Khoa học mở đường nước thịnh hưng.'
      ]
    },
    vn_2106: {
      stamp: 'Kỷ niệm 21/06/1925',
      gender: 'all',
      crest: 'seal',
      centerType: 'saokhue',
      poems: [
        'Bút sắc lòng trong tâm sáng mãi,<br>Chở đạo làm người trên mỗi trang.',
        'Ngòi bút chính trực soi sự thật,<br>Đồng hành nhịp đập của non sông.',
        'Trăm năm báo chí cách mạng Việt,<br>Vững vàng bản lĩnh người cầm bút.',
        'Mắt sáng, lòng trong, bút sắc bén,<br>Phụng sự nhân dân, giữ lẽ công.'
      ]
    },
    vn_1908_ca: {
      stamp: 'Kỷ niệm 19/08 (CAND)',
      gender: 'all',
      crest: 'drum',
      centerType: 'drum',
      poems: [
        'Vì nước quên thân, vì dân phục vụ,<br>Thức cho dân ngủ, gác cho dân vui chơi.',
        'Lá chắn thép giữ yên cuộc sống,<br>Bản lĩnh kiên cường trước gian nguy.',
        'Giữ bình yên trên từng góc phố,<br>Vì hạnh phúc của mọi gia đình.',
        'Danh dự là điều thiêng liêng nhất,<br>Trọn lòng tận tụy với nhân dân.'
      ]
    },
    vn_0210: {
      stamp: 'Kỷ niệm 02/10',
      gender: 'all',
      crest: 'seal',
      centerType: 'saokhue',
      poems: [
        'Hiền tài là nguyên khí của quốc gia,<br>Học tập suốt đời mở tương lai.',
        'Truyền thống hiếu học ngàn năm sáng,<br>Bồi đắp nhân tài cho nước non.',
        'Học nữa, học mãi không ngừng nghỉ,<br>Biển rộng trời cao đón bước chân.',
        'Trống khuyến học vang miền đất Việt,<br>Mở lối nhân tài giúp quốc gia.'
      ]
    },
    vn_1010_cd: {
      stamp: 'Chuyển đổi số 10/10',
      gender: 'all',
      crest: 'seal',
      centerType: 'saokhue',
      poems: [
        'Kết nối dữ liệu, kiến tạo giá trị,<br>Việt Nam bứt phá kỷ nguyên số.',
        'Hạ tầng số hóa vươn muôn nẻo,<br>Tri thức hội tụ chỉ một chạm.',
        'Công nghệ phục vụ đời sống Việt,<br>Thông minh, minh bạch và bền vững.',
        'Trí tuệ nhân tạo cùng dữ liệu,<br>Chắp cánh Việt Nam hóa rồng bay.'
      ]
    },
    vn_1310: {
      stamp: 'Kỷ niệm 13/10',
      gender: 'all',
      crest: 'seal',
      centerType: 'saokhue',
      poems: [
        'Căng buồm ra biển lớn năm châu,<br>Tâm sáng chí bền dựng nghiệp cao.',
        'Doanh nhân đất Việt giàu bản lĩnh,<br>Kiến tạo thịnh vượng cho quê hương.',
        'Chữ Tín đặt lên hàng đầu tiên,<br>Vững tay chèo lái vượt trùng khơi.',
        'Kinh bang tế thế ngời tâm sáng,<br>Đưa hàng Việt vươn khắp hoàn cầu.'
      ]
    },
    vn_0911: {
      stamp: 'Kỷ niệm 09/11',
      gender: 'all',
      crest: 'seal',
      centerType: 'saokhue',
      poems: [
        'Sống và làm việc theo Hiến pháp và Pháp luật,<br>Kỷ cương minh bạch giữ công bằng.',
        'Thượng tôn pháp luật nền thịnh trị,<br>Bảo vệ quyền lợi của nhân dân.',
        'Cán cân công lý luôn ngay thẳng,<br>Xã hội văn minh vững mạnh bền.',
        'Hiến pháp soi đường dân làm chủ,<br>Kỷ cương phép nước giữ nghiêm minh.'
      ]
    },
    vn_1811: {
      stamp: 'Kỷ niệm 18/11',
      gender: 'all',
      crest: 'drum',
      centerType: 'drum',
      poems: [
        'Đoàn kết, đoàn kết, đại đoàn kết,<br>Thành công, thành công, đại thành công.',
        'Nghĩa đồng bào keo sơn một cội,<br>Triệu bàn tay chung dựng cơ đồ.',
        'Cây có cội mới trổ cành xanh,<br>Dân đồng lòng việc khó cũng thành.',
        'Bầu ơi thương lấy bí cùng,<br>Tuy rằng khác giống nhưng chung một giàn.'
      ]
    },
    vn_2011: {
      stamp: 'Tri ân 20/11',
      gender: 'all',
      crest: 'seal',
      centerType: 'saokhue',
      poems: [
        'Muốn sang thì bắc cầu kiều,<br>Muốn con hay chữ thì yêu lấy thầy.',
        'Chữ tâm người chở qua sông rộng,<br>Gieo hạt tri thức nở mùa vàng.',
        'Bụi phấn rơi đầy trang giáo án,<br>Dẫn đường bao thế hệ vươn xa.',
        'Nhất tự vi sư ơn nghĩa nặng,<br>Trọn đời khắc cốt đạo tôn sư.'
      ]
    },
    vn_2311: {
      stamp: 'Kỷ niệm 23/11',
      gender: 'all',
      crest: 'drum',
      centerType: 'drum',
      poems: [
        'Hồn thiêng di sản ngàn năm tụ,<br>Gìn giữ tinh hoa đất Lạc Hồng.',
        'Trống đồng Ngọc Lũ vang muôn thuở,<br>Văn hiến ngàn năm rạng cõi bờ.',
        'Di sản cha ông truyền thế hệ,<br>Bản sắc Việt Nam tỏa rạng ngời.',
        'Mái đình bến nước hồn dân tộc,<br>Giữ trọn văn hóa Việt ngàn năm.'
      ]
    },

    // --- NHÓM IV: TẾT CỔ TRUYỀN & LỄ HỘI ÂM LỊCH VIỆT NAM ---
    vn_0101: {
      stamp: 'Tân Niên 01/01',
      gender: 'all',
      crest: 'lantern',
      centerType: 'lantern',
      poems: [
        'Khởi đầu năm mới tràn sinh khí,<br>Vạn dặm đường mây mở lối vàng.',
        'Chúc năm mới trí tâm bừng sáng,<br>Mọi dự định lớn đều hanh thông.',
        'Tân niên vạn sự như ý nguyện,<br>Học thuật thăng hoa đạt đỉnh cao.',
        'Trang lịch mới mở ngàn hy vọng,<br>Bình an thịnh vượng suốt bốn mùa.'
      ]
    },
    tet: {
      stamp: 'Tết Nguyên Đán 01/01 ÂL',
      gender: 'all',
      crest: 'lantern',
      centerType: 'tet',
      poems: [
        'Đào thắm mai vàng khoe sắc Tết,<br>Khai bút đầu xuân vạn chữ lành.',
        'Xuân về đất Việt bừng sức sống,<br>An khang thịnh vượng khắp muôn nhà.',
        'Mực tàu giấy đỏ đề câu đối,<br>Phúc lộc tài hoa trọn bốn mùa.',
        'Tân xuân cung chúc muôn điều phúc,<br>Đắc lộc vinh hoa vạn sự thành.'
      ]
    },
    vn_1501_al: {
      stamp: 'Nguyên Tiêu 15/01 ÂL',
      gender: 'all',
      crest: 'lantern',
      centerType: 'midautumn',
      poems: [
        'Rằm xuân lồng lộng trăng soi,<br>Sông xuân nước lẫn màu trời thêm xuân.',
        'Đêm Nguyên Tiêu ngân vang tiếng thơ,<br>Trăng rằm tháng Giêng sáng đôi bờ.',
        'Hoa đăng lấp lánh dòng sông cổ,<br>Thi hứng dâng đầy chốn văn đàn.',
        'Trăng tròn tháng Giêng soi trang sách,<br>Khai hội thơ xuân rạng ý đời.'
      ]
    },
    vn_0303_al: {
      stamp: 'Hàn Thực 03/03 ÂL',
      gender: 'all',
      crest: 'lotus',
      centerType: 'lotus',
      poems: [
        'Thân em vừa trắng lại vừa tròn,<br>Bảy nổi ba chìm với nước non.',
        'Mà em vẫn giữ tấm lòng son,<br>Hương vị cổ truyền thơm thảo mãi.',
        'Bánh trôi bánh chay dâng tổ tiên,<br>Giữ trọn đạo nhà nghĩa thảo hiền.',
        'Thanh tao hương bột mùa tháng Ba,<br>Nhớ cội nguồn xưa ấm nếp nhà.'
      ]
    },
    vn_1504_al: {
      stamp: 'Phật Đản 15/04 ÂL',
      gender: 'all',
      crest: 'lotus',
      centerType: 'lotus',
      poems: [
        'Sen nở bảy tầng hương thanh tịnh,<br>Từ bi trí tuệ chiếu muôn phương.',
        'Tâm bình thế giới tự nhiên bình,<br>Ánh đạo từ hòa soi nhân thế.',
        'Linh Sơn trầm tỏa mùa Phật Đản,<br>An lạc trong tâm vạn sự lành.',
        'Hương sen tinh khiết bừng giác ngộ,<br>Tâm sáng từ hòa độ muôn nơi.'
      ]
    },
    vn_0505_al: {
      stamp: 'Đoan Ngọ 05/05 ÂL',
      gender: 'all',
      crest: 'lotus',
      centerType: 'lotus',
      poems: [
        'Tháng Năm Đoan Ngọ nắng thuần dương,<br>Thảo dược thanh tâm tỏa ngát hương.',
        'Lá ngải, cơm rượu trừ tà khí,<br>Cầu mùa màng tốt, sức khỏe bền.',
        'Chính Ngọ dương khí bừng trời đất,<br>Thân tâm khang kiện suốt bốn mùa.',
        'Hương nếp rượu nồng ngày mùng Năm,<br>Gìn giữ phong tục cổ ngàn năm.'
      ]
    },
    vn_1507_al: {
      stamp: 'Vu Lan 15/07 ÂL',
      gender: 'all',
      crest: 'lotus',
      centerType: 'lotus',
      poems: [
        'Công cha như núi Thái Sơn,<br>Nghĩa mẹ như nước trong nguồn chảy ra.',
        'Bông hồng cài áo mùa hiếu hạnh,<br>Nguyện cầu cha mẹ mãi bình an.',
        'Một lòng thờ mẹ kính cha,<br>Cho tròn chữ hiếu mới là đạo con.',
        'Tháng Bảy mưa ngâu lòng tưởng nhớ,<br>Ơn sinh thành dưỡng dục biển trời.'
      ]
    },
    midautumn: {
      stamp: 'Tết Trung Thu 15/08 ÂL',
      gender: 'all',
      crest: 'lantern',
      centerType: 'midautumn',
      poems: [
        'Trăng thu vằng vặc soi đình viện,<br>Đèn kéo quân xoay trọn nghĩa tình.',
        'Lý Ngư vọng nguyệt đêm rằm sáng,<br>Sum họp đoàn viên ấm chén trà.',
        'Ánh nguyệt thanh cao soi trang sách,<br>Thu phong mát dịu chốn thư phòng.',
        'Trăng tròn tháng Tám tình viên mãn,<br>Phá cỗ trông trăng rộn tiếng cười.'
      ]
    },
    vn_2312_al: {
      stamp: 'Ông Công Ông Táo 23/12 ÂL',
      gender: 'all',
      crest: 'seal',
      centerType: 'saokhue',
      poems: [
        'Cá chép vượt sóng hóa Rồng thiêng,<br>Đưa Táo về trời tấu việc hiền.',
        'Bếp lửa hồng ấm tình gia đạo,<br>Khép lại năm cũ đón xuân sang.',
        'Vũ Môn sóng vỗ rền mây biếc,<br>Vượt vũ môn quan hóa cửu long.',
        'Hai ba tháng Chạp đưa ông Táo,<br>Rộn rã đường xuân khắp phố phường.'
      ]
    },
    vn_2512: {
      stamp: 'Giáng Sinh 25/12',
      gender: 'all',
      crest: 'lantern',
      centerType: 'lantern',
      poems: [
        'Chuông ngân ấm áp đêm đông lạnh,<br>An lành hạnh phúc khắp nhân gian.',
        'Tuyết hoa lấp lánh soi khung cửa,<br>Bình yên lan tỏa mọi tâm hồn.',
        'Đêm đông thắp sáng niềm hy vọng,<br>Sum vầy ấm áp bên người thân.',
        'Chúc mùa Giáng Sinh tràn hơi ấm,<br>An hòa thịnh vượng đón năm sang.'
      ]
    }
  };
  // Aliases for backward compatibility
  EVENT_PRESETS.women_20_10 = EVENT_PRESETS.vn_2010;
  EVENT_PRESETS.women_8_3 = EVENT_PRESETS.vn_0803;
  EVENT_PRESETS.vn_national = EVENT_PRESETS.vn_3004;
  EVENT_PRESETS.teachers = EVENT_PRESETS.vn_2011;

  var CFG = window.__astralDragonCfg = {
    presets: EVENT_PRESETS,
    crests: FFORUM_CREST_SVGS,
    userGender: extCfg.userGender || 'female',
    poemIdx: 0,
    species: extCfg.species || 'koi',
    skin: extCfg.skin || 'solar',       // 'solar', 'astral', 'jade', 'kintsugi' (Bạch Ngọc Vàng 24K), 'sumi' (Thuỷ Mặc Chu Sa)
    eventMode: detectVietnameseSpecialDay(),
    customWish: extCfg.customWish || '',
    scale: 1.05,
    waveAmp: 1.0,
    showGlyphs: true,
    showLotus: true,
    paused: false,
    force2D: false,
    spinDir: 1,
    typingFocus: false,
    vuMonEnergy: 0,
    dragonAscended: false,
    triggerPulse: null,
    rebuildSkin: null,
    setSpecies: null,
    setEventMode: null,
    spawnKnowledgeFood: null,
    ascendDragon: null,
    announceWish: null
  };

  var PALETTES = {
    solar: {
      name: 'Trạng Nguyên Chu Sa',
      koiHi1: '#f97316', koiHi2: '#dc2626', koiGold: '#fde047', koiBody: '#fffdf9',
      owlSpot: '#451a03', owlTint: '#fef3c7', owlEye: '#f59e0b',
      headGlow: '#fb923c', spineCore: '#fff7ed', bodyMid: '#ea580c', bodyEdge: '#be123c', horn: '#fde047',
      inkRGB: '155, 38, 34',
      moteDark: '253, 224, 71', moteGold: '251, 146, 60', moteLight: '175, 48, 36',
      ribbonDark: '251, 146, 60', ribbonAlt: '248, 113, 113'
    },
    astral: {
      name: 'Tinh Hà Nguyệt Quang',
      koiHi1: '#38bdf8', koiHi2: '#4f46e5', koiGold: '#bae6fd', koiBody: '#f8fafc',
      owlSpot: '#1e293b', owlTint: '#e0f2fe', owlEye: '#38bdf8',
      headGlow: '#67e8f9', spineCore: '#f0f9ff', bodyMid: '#0284c7', bodyEdge: '#4338ca', horn: '#fde047',
      inkRGB: '22, 65, 148',
      moteDark: '165, 243, 252', moteGold: '253, 224, 71', moteLight: '28, 78, 168',
      ribbonDark: '125, 211, 252', ribbonAlt: '167, 139, 250'
    },
    jade: {
      name: 'Thanh Ngọc Cổ Viện',
      koiHi1: '#10b981', koiHi2: '#047857', koiGold: '#a7f3d0', koiBody: '#f0fdf4',
      owlSpot: '#064e3b', owlTint: '#d1fae5', owlEye: '#10b981',
      headGlow: '#6ee7b7', spineCore: '#ecfdf5', bodyMid: '#059669', bodyEdge: '#0369a1', horn: '#fcd34d',
      inkRGB: '16, 98, 76',
      moteDark: '110, 231, 183', moteGold: '253, 224, 71', moteLight: '16, 102, 78',
      ribbonDark: '52, 211, 153', ribbonAlt: '45, 212, 191'
    },
    kintsugi: {
      name: 'Bạch Ngọc Kintsugi (Tối Giản Độc Bản)',
      koiHi1: '#fef08a', koiHi2: '#ca8a04', koiGold: '#ffffff', koiBody: '#ffffff',
      owlSpot: '#a16207', owlTint: '#fefce8', owlEye: '#eab308',
      headGlow: '#fef08a', spineCore: '#ffffff', bodyMid: '#eab308', bodyEdge: '#a16207', horn: '#fde047',
      inkRGB: '113, 63, 18',
      moteDark: '254, 249, 195', moteGold: '234, 179, 8', moteLight: '133, 77, 14',
      ribbonDark: '250, 204, 21', ribbonAlt: '254, 240, 138'
    },
    sumi: {
      name: 'Thuỷ Mặc Chu Sa (Mực Tàu & Ấn Triện)',
      koiHi1: '#334155', koiHi2: '#0f172a', koiGold: '#e2e8f0', koiBody: '#f8fafc',
      owlSpot: '#0f172a', owlTint: '#e2e8f0', owlEye: '#ef4444',
      headGlow: '#f87171', spineCore: '#f1f5f9', bodyMid: '#334155', bodyEdge: '#dc2626', horn: '#ef4444',
      inkRGB: '30, 41, 59',
      moteDark: '226, 232, 240', moteGold: '239, 68, 68', moteLight: '30, 41, 59',
      ribbonDark: '148, 163, 184', ribbonAlt: '239, 68, 68'
    },
    imperialGold: {
      name: 'Hoàng Kim Long Vương (Vượt Vũ Môn)',
      koiHi1: '#f59e0b', koiHi2: '#b45309', koiGold: '#fef08a', koiBody: '#fffbeb',
      owlSpot: '#78350f', owlTint: '#fef9c3', owlEye: '#fde047',
      headGlow: '#fde047', spineCore: '#ffffff', bodyMid: '#f59e0b', bodyEdge: '#d97706', horn: '#fef08a',
      inkRGB: '161, 98, 7',
      moteDark: '254, 240, 138', moteGold: '251, 191, 36', moteLight: '180, 83, 9',
      ribbonDark: '253, 224, 71', ribbonAlt: '245, 158, 11'
    }
  };

  var GLYPHS = ['π', '∑', '∫', 'φ', '√', '∞', 'Δ', 'λ', 'Ω', 'α', '∂', 'E=mc²', 'f(x)'];
  var FORMULAS = ['∫eˣdx = eˣ+C', 'e^(iπ) + 1 = 0', 'φ = 1.61803', '∑ 1/n² = π²/6', '∇×E = -∂B/∂t', 'O(n log n)'];

  var IW = 960, IH = 460;
  var NOSE_U = 0.075, AXIS_V = 0.5;
  var spriteCv = document.createElement('canvas');
  spriteCv.width = IW; spriteCv.height = IH;
  var inkCv = document.createElement('canvas');
  inkCv.width = IW; inkCv.height = IH;

  function organicNoise(x, y) {
    return Math.sin(x * 12.7 + y * 7.3) * 0.45 +
           Math.cos(x * 23.1 - y * 19.4) * 0.30 +
           Math.sin(x * 41.8 + y * 33.2) * 0.15 +
           Math.cos(x * 73.5 - y * 61.7) * 0.10;
  }

  function buildCreatureTextures() {
    var pal = CFG.dragonAscended ? PALETTES.imperialGold : (PALETTES[CFG.skin] || PALETTES.solar);
    var spType = CFG.species || 'koi';
    var ctx = spriteCv.getContext('2d');
    ctx.clearRect(0, 0, IW, IH);
    var cy = IH * AXIS_V;

    if (spType === 'koi') {
      drawPhotorealisticKoi(ctx, pal, cy, CFG.dragonAscended);
    } else if (spType === 'owl') {
      drawPhotorealisticOwl(ctx, pal, cy, CFG.dragonAscended);
    } else {
      drawPhotorealisticNautilusDragon(ctx, pal, cy, true);
    }

    // Nếu đang ở chế độ Sinh Nhật Thành Viên, đội thêm Vương Miện Tinh Quang nhỏ xinh trên đỉnh đầu
    if (CFG.eventMode === 'birthday') {
      drawBirthdayCrownOnHead(ctx, cy);
    } else if ((CFG.eventMode === 'vn_2010' || CFG.eventMode === 'vn_0803' || CFG.eventMode === 'women_20_10' || CFG.eventMode === 'women_8_3') && CFG.userGender === 'female') {
      drawCamelliaPinOnHead(ctx, cy);
    }

    var ic = inkCv.getContext('2d');
    ic.clearRect(0, 0, IW, IH);
    ic.drawImage(spriteCv, 0, 0);
  }

  
  function drawCamelliaPinOnHead(ctx, cy) {
    ctx.save();
    var cx = 0.152 * IW, py = cy - 22;
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.moveTo(cx - 10, py + 8);
    ctx.lineTo(cx + 22, py - 12);
    ctx.stroke();

    ctx.translate(cx, py);
    for (var i = 0; i < 5; i++) {
      ctx.save();
      ctx.rotate((i * Math.PI * 2) / 5);
      ctx.fillStyle = i % 2 === 0 ? '#f472b6' : '#fbcfe8';
      ctx.beginPath();
      ctx.ellipse(0, -6.5, 4.2, 6.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(0, 0, 2.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawBirthdayCrownOnHead(ctx, cy) {
    ctx.save();
    var cx = 0.138 * IW;
    ctx.fillStyle = '#fde047';
    ctx.strokeStyle = '#ca8a04';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx + 12, cy - 14);
    ctx.lineTo(cx - 8, cy - 18);
    ctx.lineTo(cx - 2, cy - 7);
    ctx.lineTo(cx - 14, cy);
    ctx.lineTo(cx - 2, cy + 7);
    ctx.lineTo(cx - 8, cy + 18);
    ctx.lineTo(cx + 12, cy + 14);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 3 viên ngọc Hồng Bảo Thạch trên đỉnh vương miện sinh nhật
    [-16, 0, 16].forEach(function (dy, idx) {
      ctx.fillStyle = idx === 1 ? '#f43f5e' : '#38bdf8';
      ctx.beginPath();
      ctx.arc(cx - (idx === 1 ? 15 : 9), cy + dy, 2.6, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  function drawPhotorealisticKoi(ctx, pal, cy, isDragonForm) {
    var isMinimalistKintsugi = CFG.skin === 'kintsugi' && !isDragonForm;
    function koiHalfWidth(u) {
      if (u < 0.06) return 0;
      if (u < 0.13) {
        var t = (u - 0.06) / 0.07;
        return 38 * Math.pow(Math.sin(t * Math.PI * 0.5), 0.72);
      }
      if (u < 0.24) {
        var t2 = (u - 0.13) / 0.11;
        return 38 + 18 * Math.sin(t2 * Math.PI * 0.5);
      }
      if (u < 0.42) {
        var t3 = (u - 0.24) / 0.18;
        return 56 * Math.cos(t3 * 0.35);
      }
      if (u < 0.75) {
        var t4 = (u - 0.42) / 0.33;
        return 52.5 * Math.pow(1 - t4 * 0.76, 1.18);
      }
      if (u < 0.80) return 12.6;
      return 0;
    }

    function isHiPatch(u, vNorm) {
      if (isDragonForm) return 1;
      if (isMinimalistKintsugi) return 0; // Bạch Ngọc Kintsugi: toàn thân trắng sứ tinh khiết, chỉ điểm chỉ vàng 24K & chấm Chu Sa
      var dHead = Math.hypot((u - 0.135) * 2.2, vNorm * 1.15);
      if (dHead < 0.078) return 2;
      var n1 = organicNoise(u * 1.4, vNorm * 0.9);
      if (u > 0.22 && u < 0.49 && Math.abs(vNorm) < 0.72 + n1 * 0.35) {
        if (Math.hypot((u - 0.35) * 1.3, (vNorm - 0.08 * Math.sin(u * 20)) * 0.65) + n1 * 0.16 < 0.23) return 1;
      }
      if (u > 0.54 && u < 0.72) {
        if (Math.hypot((u - 0.63) * 1.5, (vNorm + 0.05) * 0.7) + n1 * 0.14 < 0.17) return 1;
      }
      return 0;
    }

    [-1, 1].forEach(function (side) {
      ctx.save();
      var px0 = 0.215 * IW, py0 = cy + side * 36;
      ctx.beginPath();
      ctx.moveTo(px0, py0);
      ctx.bezierCurveTo(px0 - 22, py0 + side * 68, px0 + 48, py0 + side * 124, px0 + 118, py0 + side * 86);
      ctx.quadraticCurveTo(px0 + 96, py0 + side * 32, px0 + 54, py0 - side * 4);
      ctx.closePath();

      var pGrad = ctx.createRadialGradient(px0 + 20, py0 + side * 10, 6, px0 + 45, py0 + side * 58, 120);
      pGrad.addColorStop(0, isMinimalistKintsugi ? '#fef08a' : pal.koiHi1);
      pGrad.addColorStop(0.28, isDragonForm ? 'rgba(254, 240, 138, 0.9)' : 'rgba(255, 250, 242, 0.85)');
      pGrad.addColorStop(0.75, 'rgba(255, 252, 248, 0.38)');
      pGrad.addColorStop(1, 'rgba(255, 255, 255, 0.02)');
      ctx.fillStyle = pGrad;
      ctx.fill();

      ctx.clip();
      for (var r = 0; r < 22; r++) {
        var frac = r / 21;
        var ang = side * (0.42 + frac * 1.32);
        var rayLen = 125 * Math.sin(frac * Math.PI * 0.85 + 0.15);
        var rx1 = px0 + 18 + frac * 24, ry1 = py0;
        var rx2 = rx1 + Math.cos(ang - side * 0.35) * rayLen;
        var ry2 = ry1 + Math.sin(ang) * rayLen;
        ctx.strokeStyle = r === 0 ? 'rgba(255,255,255,0.94)' : 'rgba(255,248,238,0.52)';
        ctx.lineWidth = r === 0 ? 3.2 : (1.5 - frac * 0.6);
        ctx.beginPath();
        ctx.moveTo(rx1, ry1);
        ctx.quadraticCurveTo((rx1 + rx2) * 0.5 - 8, (ry1 + ry2) * 0.5 + side * 10, rx2, ry2);
        ctx.stroke();
      }
      ctx.restore();

      ctx.save();
      var vx0 = 0.45 * IW, vy0 = cy + side * 32;
      ctx.beginPath();
      ctx.moveTo(vx0, vy0);
      ctx.quadraticCurveTo(vx0 + 18, vy0 + side * 66, vx0 + 78, vy0 + side * 52);
      ctx.quadraticCurveTo(vx0 + 62, vy0 + side * 16, vx0 + 36, vy0 - side * 4);
      ctx.closePath();
      var vGrad = ctx.createLinearGradient(vx0, vy0, vx0 + 65, vy0 + side * 58);
      vGrad.addColorStop(0, 'rgba(255, 248, 240, 0.78)');
      vGrad.addColorStop(0.65, 'rgba(255, 250, 245, 0.32)');
      vGrad.addColorStop(1, 'rgba(255, 255, 255, 0.0)');
      ctx.fillStyle = vGrad;
      ctx.fill();
      ctx.clip();
      for (var vr = 0; vr < 12; vr++) {
        var vf = vr / 11;
        ctx.strokeStyle = 'rgba(255,250,242,0.48)';
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.moveTo(vx0 + vf * 18, vy0);
        ctx.lineTo(vx0 + 32 + vf * 48, vy0 + side * (28 + Math.sin(vf * Math.PI) * 32));
        ctx.stroke();
      }
      ctx.restore();

      ctx.save();
      var tx0 = 0.765 * IW;
      ctx.beginPath();
      ctx.moveTo(tx0, cy);
      ctx.bezierCurveTo(tx0 + 48, cy + side * 46, tx0 + 115, cy + side * 108, 0.985 * IW, cy + side * 68);
      ctx.quadraticCurveTo(0.92 * IW, cy + side * 18, 0.885 * IW, cy + side * 3);
      ctx.closePath();

      var tGrad = ctx.createLinearGradient(tx0, cy, 0.985 * IW, cy + side * 55);
      tGrad.addColorStop(0, isMinimalistKintsugi ? '#fef08a' : pal.koiHi1);
      tGrad.addColorStop(0.22, 'rgba(255, 248, 240, 0.82)');
      tGrad.addColorStop(0.68, 'rgba(255, 252, 248, 0.35)');
      tGrad.addColorStop(1, 'rgba(255, 255, 255, 0.0)');
      ctx.fillStyle = tGrad;
      ctx.fill();
      ctx.clip();
      for (var tr = 0; tr < 18; tr++) {
        var tf = tr / 17;
        ctx.strokeStyle = tr < 2 ? 'rgba(255,255,255,0.82)' : 'rgba(255,248,240,0.45)';
        ctx.lineWidth = tr < 2 ? 2.2 : 1.1;
        ctx.beginPath();
        ctx.moveTo(tx0, cy + side * tf * 8);
        ctx.quadraticCurveTo(tx0 + 85, cy + side * (12 + tf * 68), 0.895 * IW + tf * 85, cy + side * (6 + tf * 66));
        ctx.stroke();
      }
      ctx.restore();
    });

    ctx.save();
    ctx.beginPath();
    for (var u = 0.06; u <= 0.80; u += 0.005) {
      var x = u * IW, hw = koiHalfWidth(u);
      if (u === 0.06) ctx.moveTo(x, cy - hw);
      else ctx.lineTo(x, cy - hw);
    }
    for (u = 0.80; u >= 0.06; u -= 0.005) {
      ctx.lineTo(u * IW, cy + koiHalfWidth(u));
    }
    ctx.closePath();

    var bodyCyl = ctx.createLinearGradient(0, cy - 58, 0, cy + 58);
    bodyCyl.addColorStop(0, '#cbd5e1');
    bodyCyl.addColorStop(0.18, '#f8fafc');
    bodyCyl.addColorStop(0.5, '#ffffff');
    bodyCyl.addColorStop(0.82, '#f8fafc');
    bodyCyl.addColorStop(1, '#cbd5e1');
    ctx.fillStyle = bodyCyl;
    ctx.fill();
    ctx.clip();

    var cols = 42;
    for (var c = cols; c >= 0; c--) {
      var uSc = 0.195 + (c / cols) * 0.585;
      var sx = uSc * IW;
      var maxHw = koiHalfWidth(uSc);
      var scR = Math.max(4.5, (7.8 + Math.sin((1 - c / cols) * Math.PI) * 5.2));
      var rows = Math.ceil(maxHw / (scR * 0.68));

      for (var r2 = -rows; r2 <= rows; r2++) {
        var syOff = (r2 + (c % 2) * 0.5) * (scR * 0.72);
        if (Math.abs(syOff) > maxHw * 0.96) continue;
        var sy = cy + syOff;
        var vNorm = syOff / (maxHw || 1);
        var patch = isHiPatch(uSc, vNorm);
        var normZ = Math.sqrt(Math.max(0.05, 1 - vNorm * vNorm * 0.85));

        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(vNorm * 0.18);

        ctx.fillStyle = 'rgba(15, 23, 42, 0.16)';
        ctx.beginPath();
        ctx.ellipse(2.2, 0, scR * 1.05, scR * 0.82, 0, -Math.PI * 0.52, Math.PI * 0.52);
        ctx.fill();

        var scGrad = ctx.createRadialGradient(-scR * 0.25, -scR * 0.15 * Math.sign(vNorm || 1), scR * 0.1, 0, 0, scR * 1.1);
        if (patch > 0) {
          scGrad.addColorStop(0, pal.koiGold);
          scGrad.addColorStop(0.35, pal.koiHi1);
          scGrad.addColorStop(0.88, pal.koiHi2);
          scGrad.addColorStop(1, '#0f172a');
        } else {
          var lgt = Math.round(228 + 27 * normZ);
          scGrad.addColorStop(0, '#ffffff');
          scGrad.addColorStop(0.65, 'rgb(' + lgt + ',' + (lgt - 2) + ',' + (lgt - 5) + ')');
          scGrad.addColorStop(1, 'rgb(' + (lgt - 34) + ',' + (lgt - 28) + ',' + (lgt - 20) + ')');
        }
        ctx.fillStyle = scGrad;
        ctx.beginPath();
        ctx.ellipse(0, 0, scR * 1.08, scR * 0.80, 0, -Math.PI * 0.55, Math.PI * 0.55);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = isMinimalistKintsugi
          ? 'rgba(250, 204, 21, 0.55)'
          : (patch > 0 ? 'rgba(254, 240, 138, 0.68)' : 'rgba(255, 255, 255, 0.78)');
        ctx.lineWidth = isMinimalistKintsugi ? 1.05 : 0.95;
        ctx.beginPath();
        ctx.ellipse(0, 0, scR * 1.04, scR * 0.77, 0, -Math.PI * 0.46, Math.PI * 0.46);
        ctx.stroke();

        ctx.restore();
      }
    }

    // Nếu là phong cách Bạch Ngọc Kintsugi: Vẽ mạch vàng lá 24K tinh xảo chạy dọc sống lưng
    if (isMinimalistKintsugi) {
      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      for (var ku = 0.18; ku <= 0.76; ku += 0.015) {
        var kx = ku * IW, ky = cy + Math.sin(ku * 38) * 6;
        if (ku === 0.18) ctx.moveTo(kx, ky);
        else ctx.lineTo(kx, ky);
      }
      ctx.stroke();
    }

    var headGrad = ctx.createLinearGradient(0.06 * IW, cy, 0.21 * IW, cy);
    headGrad.addColorStop(0, isDragonForm ? '#fef08a' : '#fff7ed');
    headGrad.addColorStop(0.55, isDragonForm ? '#fde047' : '#ffffff');
    headGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = headGrad;
    ctx.fillRect(0.055 * IW, cy - 60, 0.16 * IW, 120);

    // Ấn Chu Sa đỏ thắm duy nhất trên đỉnh trán (Điểm nhấn Tối Giản Á Đông)
    var tx = 0.142 * IW;
    var tanchoGrad = ctx.createRadialGradient(tx - 4, cy - 3, 3, tx, cy, 26);
    tanchoGrad.addColorStop(0, '#ef4444');
    tanchoGrad.addColorStop(0.75, '#dc2626');
    tanchoGrad.addColorStop(0.92, 'rgba(185, 28, 28, 0.85)');
    tanchoGrad.addColorStop(1, 'rgba(185, 28, 28, 0)');
    ctx.fillStyle = tanchoGrad;
    ctx.beginPath();
    ctx.ellipse(tx, cy, 26, 22, 0, 0, Math.PI * 2);
    ctx.fill();

    [-1, 1].forEach(function (sd) {
      ctx.strokeStyle = 'rgba(100, 116, 139, 0.48)';
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.moveTo(0.165 * IW, cy + sd * 14);
      ctx.quadraticCurveTo(0.205 * IW, cy + sd * 34, 0.192 * IW, cy + sd * 46);
      ctx.stroke();

      ctx.fillStyle = 'rgba(71, 85, 105, 0.55)';
      ctx.beginPath();
      ctx.ellipse(0.095 * IW, cy + sd * 13, 3.2, 1.6, sd * 0.4, 0, Math.PI * 2);
      ctx.fill();
    });

    var wetGrad = ctx.createLinearGradient(0, cy - 18, 0, cy + 18);
    wetGrad.addColorStop(0, 'rgba(255,255,255,0)');
    wetGrad.addColorStop(0.45, 'rgba(255,255,255,0.38)');
    wetGrad.addColorStop(0.55, 'rgba(255,255,255,0.38)');
    wetGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = wetGrad;
    ctx.fillRect(0.08 * IW, cy - 18, 0.70 * IW, 36);
    ctx.restore();

    [-1, 1].forEach(function (sd) {
      var ex = 0.115 * IW, ey = cy + sd * 27.5;
      ctx.save();
      ctx.translate(ex, ey);
      ctx.rotate(sd * 0.22);
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.ellipse(0, 0, 7.5, 5.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.ellipse(0, sd * 0.6, 5.2, 3.4, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#020617';
      ctx.beginPath();
      ctx.ellipse(0, sd * 0.8, 3.5, 2.3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(-2.2, -sd * 1.1, 2.1, 1.1, -0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    ctx.save();
    var dx0 = 0.34 * IW, dx1 = 0.68 * IW;
    var dGrad = ctx.createLinearGradient(dx0, cy - 18, dx1, cy + 28);
    dGrad.addColorStop(0, 'rgba(255, 255, 255, 0.92)');
    dGrad.addColorStop(0.45, isMinimalistKintsugi ? '#fde047' : pal.koiHi1);
    dGrad.addColorStop(1, 'rgba(255, 248, 240, 0.25)');
    ctx.fillStyle = dGrad;
    ctx.beginPath();
    ctx.moveTo(dx0, cy);
    ctx.bezierCurveTo(dx0 + 35, cy - 26, dx0 + 160, cy + 24, dx1 + 28, cy - 8);
    ctx.lineTo(dx1, cy + 3);
    ctx.quadraticCurveTo((dx0 + dx1) * 0.5, cy + 6, dx0, cy);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(dx0, cy);
    ctx.lineTo(dx0 + 22, cy - 16);
    ctx.stroke();
    for (var dr = 1; dr <= 16; dr++) {
      var df = dr / 16;
      var drx = dx0 + df * (dx1 - dx0);
      var dryOff = Math.sin(df * Math.PI * 2) * 14 - 5;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.58)';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(drx, cy);
      ctx.lineTo(drx + 18, cy + dryOff);
      ctx.stroke();
    }
    ctx.restore();

    if (isDragonForm) {
      ctx.save();
      [-1, 1].forEach(function (sd) {
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 4.0;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(0.135 * IW, cy + sd * 16);
        ctx.bezierCurveTo(0.18 * IW, cy + sd * 56, 0.25 * IW, cy + sd * 62, 0.31 * IW, cy + sd * 44);
        ctx.stroke();

        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(0.195 * IW, cy + sd * 46);
        ctx.lineTo(0.235 * IW, cy + sd * 72);
        ctx.moveTo(0.24 * IW, cy + sd * 53);
        ctx.lineTo(0.285 * IW, cy + sd * 68);
        ctx.stroke();
      });
      ctx.restore();
    }
  }

  function drawPhotorealisticOwl(ctx, pal, cy, isDragonForm) {
    for (var tIdx = -5; tIdx <= 5; tIdx++) {
      var tFrac = tIdx / 5;
      ctx.save();
      var tx0 = 0.56 * IW, ty0 = cy + tFrac * 14;
      ctx.translate(tx0, ty0);
      ctx.rotate(tFrac * 0.34);
      var fLen = 195 - Math.abs(tIdx) * 8, fWid = 16;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.22)';
      ctx.beginPath();
      ctx.ellipse(fLen * 0.5 + 3, 2, fLen * 0.5, fWid, 0, 0, Math.PI * 2);
      ctx.fill();

      var tfGrad = ctx.createLinearGradient(0, -fWid, fLen, fWid);
      tfGrad.addColorStop(0, isDragonForm ? '#fef9c3' : '#f8fafc');
      tfGrad.addColorStop(0.7, '#ffffff');
      tfGrad.addColorStop(1, pal.owlTint);
      ctx.fillStyle = tfGrad;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(fLen * 0.5, -fWid * 1.15, fLen, 0);
      ctx.quadraticCurveTo(fLen * 0.5, fWid * 1.15, 0, 0);
      ctx.fill();

      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(0, 0); ctx.lineTo(fLen * 0.96, 0);
      ctx.stroke();

      ctx.fillStyle = pal.owlSpot;
      ctx.globalAlpha = 0.68;
      for (var b = 1; b <= 3; b++) {
        var bx = fLen * (0.32 + b * 0.18);
        ctx.beginPath();
        ctx.ellipse(bx, 0, 4.2, fWid * 0.65, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    [-1, 1].forEach(function (side) {
      for (var p = 8; p >= 0; p--) {
        var pf = p / 8;
        ctx.save();
        var wx0 = (0.25 + pf * 0.06) * IW;
        var wy0 = cy + side * (42 + (1 - pf) * 62);
        ctx.translate(wx0, wy0);
        var pAng = side * (1.05 - pf * 0.52);
        ctx.rotate(pAng);
        var pLen = 148 - Math.abs(p - 2.5) * 11, pWid = 13.5;

        ctx.fillStyle = 'rgba(15, 23, 42, 0.26)';
        ctx.beginPath();
        ctx.ellipse(pLen * 0.5, side * 3, pLen * 0.52, pWid, 0, 0, Math.PI * 2);
        ctx.fill();

        var pg = ctx.createLinearGradient(0, -pWid, pLen, pWid);
        pg.addColorStop(0, isDragonForm ? '#fef08a' : '#f1f5f9');
        pg.addColorStop(0.55, '#ffffff');
        pg.addColorStop(1, pal.owlTint);
        ctx.fillStyle = pg;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(pLen * 0.55, -pWid * (side > 0 ? 0.65 : 1.35), pLen, 0);
        ctx.quadraticCurveTo(pLen * 0.55, pWid * (side > 0 ? 1.35 : 0.65), 0, 0);
        ctx.fill();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(0, 0); ctx.lineTo(pLen * 0.95, 0);
        ctx.stroke();

        ctx.fillStyle = pal.owlSpot;
        ctx.globalAlpha = 0.75;
        for (var pb = 1; pb <= 4; pb++) {
          var pbx = pLen * (0.22 + pb * 0.17);
          ctx.beginPath();
          ctx.ellipse(pbx, 0, 4.5, pWid * 0.68, 0.15 * side, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      for (var s = 9; s >= 0; s--) {
        var sf = s / 9;
        ctx.save();
        var sx0 = 0.27 * IW, sy0 = cy + side * (22 + sf * 74);
        ctx.translate(sx0, sy0);
        ctx.rotate(side * (0.18 + sf * 0.26));
        var sLen = 128 - sf * 18, sWid = 15;

        ctx.fillStyle = 'rgba(15, 23, 42, 0.18)';
        ctx.beginPath();
        ctx.ellipse(sLen * 0.5 + 2, 2, sLen * 0.5, sWid, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(sLen * 0.48, 0, sLen * 0.5, sWid, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(0, 0); ctx.lineTo(sLen * 0.92, 0);
        ctx.stroke();

        ctx.fillStyle = pal.owlSpot;
        ctx.globalAlpha = 0.68;
        for (var sb = 1; sb <= 3; sb++) {
          ctx.beginPath();
          ctx.ellipse(sLen * (0.28 + sb * 0.21), 0, 4.0, sWid * 0.58, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      for (var row = 2; row >= 0; row--) {
        var nCov = 11 - row * 2;
        for (var c2 = 0; c2 < nCov; c2++) {
          var cf = c2 / (nCov - 1);
          var cx = (0.21 + row * 0.042 + cf * 0.03) * IW;
          var cy2 = cy + side * (16 + cf * (86 - row * 12));
          var cr = 18 - row * 2.5;
          ctx.save();
          ctx.translate(cx, cy2);
          ctx.rotate(side * (0.15 + cf * 0.42));
          ctx.fillStyle = row === 0 ? '#ffffff' : '#f8fafc';
          ctx.beginPath();
          ctx.ellipse(0, 0, cr * 1.35, cr * 0.78, 0, 0, Math.PI * 2);
          ctx.fill();
          if ((c2 + row) % 2 === 0) {
            ctx.fillStyle = pal.owlSpot;
            ctx.globalAlpha = 0.62;
            ctx.beginPath();
            ctx.arc(cr * 0.55, 0, 3.2, -1.1, 1.1);
            ctx.lineWidth = 2.4;
            ctx.strokeStyle = pal.owlSpot;
            ctx.stroke();
          }
          ctx.restore();
        }
      }
    });

    for (var bx2 = 0.58; bx2 >= 0.17; bx2 -= 0.024) {
      var bHw = 36 * Math.sin(((bx2 - 0.15) / 0.46) * Math.PI);
      var nRow = Math.max(2, Math.round(bHw / 9));
      for (var br = -nRow; br <= nRow; br++) {
        var by2 = cy + br * 8.5;
        ctx.save();
        ctx.translate(bx2 * IW, by2);
        ctx.fillStyle = 'rgba(15, 23, 42, 0.14)';
        ctx.beginPath();
        ctx.ellipse(2, 0, 15, 9.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(0, 0, 14, 9, 0, 0, Math.PI * 2);
        ctx.fill();
        if (Math.abs(br) > 0 && (Math.round(bx2 * 100) + br) % 2 === 0) {
          ctx.fillStyle = pal.owlSpot;
          ctx.globalAlpha = 0.55;
          ctx.beginPath();
          ctx.ellipse(5, 0, 2.6, 5.2, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
    }

    var hx = 0.145 * IW;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.24)';
    ctx.beginPath();
    ctx.ellipse(hx + 6, cy, 40, 44, 0, 0, Math.PI * 2);
    ctx.fill();

    var hGrad = ctx.createRadialGradient(hx - 6, cy, 4, hx, cy, 43);
    hGrad.addColorStop(0, '#ffffff');
    hGrad.addColorStop(0.75, '#f8fafc');
    hGrad.addColorStop(1, '#cbd5e1');
    ctx.fillStyle = hGrad;
    ctx.beginPath();
    ctx.ellipse(hx, cy, 38, 42, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = pal.owlSpot;
    ctx.globalAlpha = 0.55;
    for (var hc = -3; hc <= 3; hc++) {
      for (var hr = 0; hr < 3; hr++) {
        ctx.beginPath();
        ctx.ellipse(hx + 6 + hr * 9, cy + hc * 7.5, 2.0, 3.2, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;

    [-1, 1].forEach(function (sd) {
      var ex = hx - 16, ey = cy + sd * 17.5;
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.ellipse(ex + 2, ey, 12, 10, sd * 0.25, 0, 0, Math.PI * 2);
      ctx.fill();

      var eyeG = ctx.createRadialGradient(ex - 2, ey, 1, ex, ey, 8.5);
      eyeG.addColorStop(0, '#fef08a');
      eyeG.addColorStop(0.55, pal.owlEye);
      eyeG.addColorStop(0.9, '#78350f');
      eyeG.addColorStop(1, '#0f172a');
      ctx.fillStyle = eyeG;
      ctx.beginPath();
      ctx.ellipse(ex, ey, 7.8, 6.6, sd * 0.18, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#020617';
      ctx.beginPath();
      ctx.arc(ex - 1, ey, 4.0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ex - 3, ey - sd * 1.8, 1.8, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.moveTo(hx - 44, cy);
    ctx.quadraticCurveTo(hx - 30, cy - 7, hx - 20, cy - 5.5);
    ctx.quadraticCurveTo(hx - 30, cy + 7, hx - 44, cy);
    ctx.fill();
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(hx - 42, cy); ctx.lineTo(hx - 23, cy);
    ctx.stroke();
  }

  function drawPhotorealisticNautilusDragon(ctx, pal, cy, isDragon) {
    drawPhotorealisticKoi(ctx, pal, cy, isDragon);
    ctx.save();
    ctx.strokeStyle = pal.horn;
    ctx.lineWidth = 1.8;
    ctx.globalAlpha = 0.72;
    var gx = 0.29 * IW;
    for (var i = 1; i <= 9; i++) {
      var r = 6 * Math.pow(1.26, i);
      ctx.beginPath();
      ctx.arc(gx + r * 0.45, cy, r * 0.55, -Math.PI * 0.65, Math.PI * 0.65);
      ctx.stroke();
    }
    ctx.restore();
  }

  buildCreatureTextures();

  var VS = [
    'attribute vec2 a_pos;',
    'attribute vec2 a_uv;',
    'uniform vec2 u_res, u_off;',
    'varying vec2 v_uv;',
    'void main() {',
    '  vec2 clip = (a_pos + u_off) / u_res * 2.0 - 1.0;',
    '  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);',
    '  v_uv = a_uv;',
    '}'
  ].join('\n');

  var FS = [
    'precision mediump float;',
    'uniform sampler2D u_tex;',
    'uniform float u_ft, u_glow, u_roll, u_shadow, u_pulse, u_isKoi, u_alpha;',
    'varying vec2 v_uv;',
    'void main() {',
    '  vec2 uv = v_uv;',
    '  float rip = u_isKoi > 0.5 ? 0.0016 : 0.0007;',
    '  uv += vec2(sin(uv.y * 32.0 + u_ft * 2.2), cos(uv.x * 26.0 - u_ft * 1.7)) * rip * (0.2 + 0.8 * uv.x);',
    '  vec4 c = texture2D(u_tex, uv);',
    '  if (c.a < 0.004) discard;',
    '  if (u_shadow > 0.01) {',
    '    gl_FragColor = vec4(0.02, 0.05, 0.12, 1.0) * c.a * u_shadow * u_alpha;',
    '    return;',
    '  }',
    '  float side = (uv.y - 0.5) * 2.0;',
    '  float nz = sqrt(max(0.05, 1.0 - side * side * 0.85));',
    '  float spec = pow(max(0.0, nz - abs(side + u_roll * 0.45) * 0.5), 4.0) * 0.28 * u_isKoi;',
    '  float caust = 0.5 + 0.5 * sin(uv.x * 22.0 - u_ft * 2.8 + sin(uv.y * 14.0 + u_ft * 1.1) * 1.5);',
    '  float pulseWave = exp(-pow((uv.x - (1.0 - u_pulse)) * 5.2, 2.0)) * step(0.01, u_pulse);',
    '  float shade = (1.0 + u_roll * side * 0.28) * (1.0 + u_glow * (caust * caust * 0.22 * u_isKoi + pulseWave * 1.05));',
    '  vec3 rgb = c.rgb * shade + vec3(spec + pulseWave * 0.38) * c.a;',
    '  gl_FragColor = vec4(min(rgb, vec3(c.a)), c.a) * u_alpha;',
    '}'
  ].join('\n');

  function wrap(a) {
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;
    return a;
  }

  function start() {
    var cv = document.createElement('canvas');
    cv.setAttribute('aria-hidden', 'true');
    cv.style.cssText = 'position:fixed;left:0;top:0;width:100vw;height:100vh;pointer-events:none;z-index:2147483000';

    var gl = null, ctx2 = null;
    var glOpt = { premultipliedAlpha: true, alpha: true, antialias: true, failIfMajorPerformanceCaveat: true };
    try {
      gl = cv.getContext('webgl', glOpt) || cv.getContext('experimental-webgl', glOpt);
    } catch (err) { gl = null; }

    if (gl) {
      var dbgInfo = gl.getExtension('WEBGL_debug_renderer_info');
      var renderer = String(gl.getParameter(dbgInfo ? dbgInfo.UNMASKED_RENDERER_WEBGL : gl.RENDERER) || '');
      window.__astralDragonGpu = renderer;
      if (/swiftshader|llvmpipe|softpipe|software|basic render/i.test(renderer)) gl = null;
    }

    function shader(type, src) {
      var s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    }

    var prog = null;
    if (gl) {
      prog = gl.createProgram();
      gl.attachShader(prog, shader(gl.VERTEX_SHADER, VS));
      gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FS));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) gl = null;
    }

    var fx = document.createElement('canvas');
    fx.setAttribute('aria-hidden', 'true');
    fx.style.cssText = cv.style.cssText;
    var fc = fx.getContext('2d');

    var ux = document.createElement('canvas');
    ux.setAttribute('aria-hidden', 'true');
    ux.style.cssText = cv.style.cssText;
    var uc = ux.getContext('2d');

    document.body.appendChild(ux);
    document.body.appendChild(cv);
    document.body.appendChild(fx);

    if (gl && gl.isContextLost && gl.isContextLost()) {
      gl = null;
    }
    if (!gl) {
      var oldCv = cv;
      cv = document.createElement('canvas');
      cv.setAttribute('aria-hidden', 'true');
      cv.style.cssText = oldCv.style.cssText;
      if (oldCv.parentNode) oldCv.parentNode.replaceChild(cv, oldCv);
      ctx2 = cv.getContext('2d');
    } else {
      gl.useProgram(prog);
      cv.addEventListener('webglcontextlost', function (ev) {
        ev.preventDefault();
        gl = null;
      }, false);
    }

    window.__astralDragonMode = gl ? 'webgl' : 'canvas2d';

    var GX = 54, GY = 24, NV = (GX + 1) * (GY + 1);
    var uvs = new Float32Array(NV * 2), xy = new Float32Array(NV * 2), idx = [];
    for (var y = 0; y <= GY; y++) {
      for (var x = 0; x <= GX; x++) {
        var o = (y * (GX + 1) + x) * 2;
        uvs[o] = x / GX;
        uvs[o + 1] = y / GY;
      }
    }
    for (y = 0; y < GY; y++) {
      for (x = 0; x < GX; x++) {
        var a = y * (GX + 1) + x, b = a + 1, c = a + GX + 1, d = c + 1;
        idx.push(a, b, c, b, d, c);
      }
    }

    var posBuf = null, texGlow = null, texInk = null, U = {};
    function uploadTextures() {
      if (!gl) return;
      if (texGlow) gl.deleteTexture(texGlow);
      if (texInk) gl.deleteTexture(texInk);
      function makeTex(source) {
        var t = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, t);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        return t;
      }
      texGlow = makeTex(spriteCv);
      texInk = makeTex(inkCv);
    }

    if (gl) {
      var uvBuf = gl.createBuffer(), uvLoc = gl.getAttribLocation(prog, 'a_uv');
      gl.bindBuffer(gl.ARRAY_BUFFER, uvBuf);
      gl.bufferData(gl.ARRAY_BUFFER, uvs, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(uvLoc);
      gl.vertexAttribPointer(uvLoc, 2, gl.FLOAT, false, 0, 0);

      posBuf = gl.createBuffer();
      var posLoc = gl.getAttribLocation(prog, 'a_pos');
      gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
      gl.bufferData(gl.ARRAY_BUFFER, xy, gl.DYNAMIC_DRAW);
      gl.enableVertexAttribArray(posLoc);
      gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

      var idxBuf = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuf);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(idx), gl.STATIC_DRAW);

      uploadTextures();
      ['u_res', 'u_off', 'u_tex', 'u_ft', 'u_glow', 'u_roll', 'u_shadow', 'u_pulse', 'u_isKoi', 'u_alpha'].forEach(function (n) {
        U[n] = gl.getUniformLocation(prog, n);
      });
      gl.uniform1i(U.u_tex, 0);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    }

    CFG.rebuildSkin = function (skinKey) {
      if (skinKey) CFG.skin = skinKey;
      CFG.dragonAscended = false;
      buildCreatureTextures();
      uploadTextures();
    };
    CFG.setSpecies = function (spKey) {
      CFG.species = spKey;
      buildCreatureTextures();
      uploadTextures();
    };
    CFG.setEventMode = function (evKey) {
      CFG.eventMode = evKey;
      buildCreatureTextures();
      uploadTextures();
      pearl.glow = 1.0;
    };

    var W = 1024, H = 700, k = 1, DPR = 1, LOW = false;
    function resize() {
      var dpr = Math.min(window.devicePixelRatio || 1, LOW ? 1 : (gl ? 2 : 1.5));
      W = Math.max(320, window.innerWidth || document.documentElement.clientWidth || 1024);
      H = Math.max(240, window.innerHeight || document.documentElement.clientHeight || 700);
      cv.width = fx.width = ux.width = W * dpr;
      cv.height = fx.height = ux.height = H * dpr;
      if (gl) gl.viewport(0, 0, cv.width, cv.height);
      DPR = dpr;
      fc.setTransform(dpr, 0, 0, dpr, 0, 0);
      uc.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (ctx2) ctx2.setTransform(dpr, 0, 0, dpr, 0, 0);
      k = Math.max(0.65, Math.min(1.08, W / 1280)) * (245 * CFG.scale) / IW;
    }
    resize();
    addEventListener('resize', resize);

    var dark = true;
    function readTheme() {
      dark = document.documentElement.getAttribute('data-theme') !== 'light';
    }
    readTheme();
    new MutationObserver(readTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    function checkActiveInput() {
      var el = document.activeElement;
      if (!el) { CFG.typingFocus = false; return; }
      var tag = (el.tagName || '').toLowerCase();
      CFG.typingFocus = (tag === 'textarea' || (tag === 'input' && el.type !== 'range' && el.type !== 'button' && el.id !== 'customWishInput') || el.isContentEditable);
    }
    addEventListener('focusin', checkActiveInput, { passive: true });
    addEventListener('focusout', checkActiveInput, { passive: true });

    var lotusPads = [];
    var foodPellets = [];
    var floatingTexts = [];
    var blossomPetals = []; // Cánh hoa đào / hoa mai / hoa đăng rơi nhẹ theo mùa lễ
    function initLotusPads() {
      lotusPads = [
        { x: W * 0.14, y: H * 0.24, r: 34, rot: 0.4, vx: 0, vy: 0, hasFlower: true },
        { x: W * 0.86, y: H * 0.28, r: 28, rot: 2.1, vx: 0, vy: 0, hasFlower: false },
        { x: W * 0.18, y: H * 0.78, r: 30, rot: -1.1, vx: 0, vy: 0, hasFlower: false },
        { x: W * 0.84, y: H * 0.74, r: 36, rot: 1.2, vx: 0, vy: 0, hasFlower: true }
      ];
      for (var bp = 0; bp < 14; bp++) {
        blossomPetals.push({
          x: Math.random() * W,
          y: Math.random() * H,
          r: 3.5 + Math.random() * 3.5,
          rot: Math.random() * 6.28,
          vx: (Math.random() - 0.5) * 0.3,
          vy: 0.2 + Math.random() * 0.35,
          gold: bp % 2 === 0
        });
      }
    }
    initLotusPads();

    var M = { x: W * 0.52, y: H * 0.52, t: -1e9 }, path = [];
    var pearl = { x: W * 0.5, y: H * 0.5, glow: 0.85 };
    var Hd = { x: M.x, y: M.y, a: Math.PI, s: 2.5, w: 0 }, lastH = { x: Hd.x, y: Hd.y };
    for (var i = 0; i < 52; i++) path.push({ x: M.x + i * 8, y: M.y });

    var MV = { x: 0, y: 0 }, evGap = 16;
    var shockwaves = [], waterRipples = [], motes = [], pulseProg = 0, curAlpha = 1.0;

    function triggerScholarPulse(px, py) {
      pulseProg = 1.0;
      var cx = px !== undefined ? px : Hd.x;
      var cy2 = py !== undefined ? py : Hd.y;
      shockwaves.push({
        x: cx, y: cy2,
        r: 8, maxR: 128,
        life: 1.0,
        rot: Math.random() * Math.PI * 2
      });
      var nBurst = LOW ? 8 : 18;
      for (var k2 = 0; k2 < nBurst; k2++) {
        var ang = (k2 / nBurst) * Math.PI * 2 + Math.random() * 0.2;
        var spd = 1.1 + Math.random() * 2.5;
        motes.push({
          x: cx, y: cy2,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd,
          life: 1,
          decay: 0.012 + Math.random() * 0.009,
          r: 1.3 + Math.random() * 1.6,
          seed: Math.random() * 6.28,
          star: true,
          gold: k2 % 2 === 0,
          glyph: (CFG.showGlyphs && k2 % 3 === 0) ? GLYPHS[Math.floor(Math.random() * GLYPHS.length)] : null
        });
      }
    }
    CFG.triggerPulse = triggerScholarPulse;

    function announceWish(msgText) {
      if (msgText) CFG.customWish = msgText;
      pearl.glow = 1.0;
      triggerScholarPulse(Hd.x, Hd.y);
      floatingTexts.push({
        x: Hd.x, y: Hd.y - 28,
        text: '' + (msgText || (EVENT_PRESETS[CFG.eventMode] && (EVENT_PRESETS[CFG.eventMode].banner || EVENT_PRESETS[CFG.eventMode].stamp)) || 'Vạn Sự Hanh Thông!'),
        life: 1.25,
        gold: true
      });
    }
    CFG.announceWish = announceWish;

    function spawnKnowledgeFood(fx0, fy0) {
      var x = fx0 !== undefined ? fx0 : (W * 0.25 + Math.random() * W * 0.5);
      var y = fy0 !== undefined ? fy0 : (H * 0.25 + Math.random() * H * 0.5);
      for (var n = 0; n < 3; n++) {
        var ox = x + (Math.random() - 0.5) * 70;
        var oy = y + (Math.random() - 0.5) * 70;
        foodPellets.push({
          x: ox, y: oy,
          r: 6.5,
          glyph: GLYPHS[Math.floor(Math.random() * GLYPHS.length)],
          formula: FORMULAS[Math.floor(Math.random() * FORMULAS.length)],
          pulse: Math.random() * 6.28
        });
      }
      waterRipples.push({ x: x, y: y, r: 6, maxR: 85, life: 0.85 });
    }
    CFG.spawnKnowledgeFood = spawnKnowledgeFood;

    function ascendDragon() {
      CFG.vuMonEnergy = 100;
      CFG.dragonAscended = true;
      buildCreatureTextures();
      uploadTextures();
      triggerScholarPulse(Hd.x, Hd.y);
      floatingTexts.push({
        x: Hd.x, y: Hd.y - 25,
        text: 'VƯỢT VŨ MÔN — HÓA KIM LONG TRẠNG NGUYÊN!',
        life: 1.2,
        gold: true
      });
    }
    CFG.ascendDragon = ascendDragon;

    function aim(e) {
      if (Math.abs(e.clientX - M.x) < 3 && Math.abs(e.clientY - M.y) < 3) return;
      var now = performance.now(), dt = now - M.t;
      if (dt > 0 && dt < 200) {
        var ix = (e.clientX - M.x) / (dt / 16.67), iy = (e.clientY - M.y) / (dt / 16.67);
        var wv = Math.min(0.6, 0.35 * dt / 16.67);
        MV.x += (ix - MV.x) * wv;
        MV.y += (iy - MV.y) * wv;
        evGap = evGap * 0.8 + dt * 0.2;
      } else {
        MV.x = 0; MV.y = 0;
      }
      M.x = e.clientX; M.y = e.clientY; M.t = now;
    }

    addEventListener('pointermove', aim, { passive: true });
    addEventListener('pointerdown', function (e) {
      aim(e);
      triggerScholarPulse(e.clientX, e.clientY);
    }, { passive: true });
    addEventListener('dblclick', function (e) {
      spawnKnowledgeFood(e.clientX, e.clientY);
    }, { passive: true });

    var lastScrollY = window.scrollY || 0;
    addEventListener('scroll', function () {
      var curY = window.scrollY || 0;
      var dy = curY - lastScrollY;
      lastScrollY = curY;
      if (Math.abs(dy) > 1) {
        var pushY = -Math.max(-18, Math.min(18, dy * 0.35));
        motes.forEach(function (m) { m.vy += pushY * 0.08; });
        lotusPads.forEach(function (lp) { lp.vy += pushY * 0.05; });
      }
    }, { passive: true });

    var barbels = [
      { sd: -1, uAnchor: 0.072, sideOff: 0.032, len: 12, segL: 3.1, wScale: 1.1, p: [] },
      { sd:  1, uAnchor: 0.072, sideOff: 0.032, len: 12, segL: 3.1, wScale: 1.1, p: [] },
      { sd: -1, uAnchor: 0.088, sideOff: 0.052, len: 18, segL: 3.8, wScale: 1.4, p: [] },
      { sd:  1, uAnchor: 0.088, sideOff: 0.052, len: 18, segL: 3.8, wScale: 1.4, p: [] }
    ];
    barbels.forEach(function (rb) {
      for (var q = 0; q < rb.len; q++) rb.p.push({ x: M.x + q * 3, y: M.y });
    });

    var spX = new Float32Array(GX + 1), spY = new Float32Array(GX + 1), spA = new Float32Array(GX + 1);
    var phase = 0, sp = 0, roll = 0, prevHead = Math.PI, T = 0, last = performance.now(), rippleTimer = 0;
    var aiModeText = 'Tuần du';

    function pathAt(s) {
      for (var j = 1; j < path.length; j++) {
        var p0 = path[j - 1], p1 = path[j], L = Math.hypot(p1.x - p0.x, p1.y - p0.y);
        if (s <= L) {
          var t = L ? s / L : 0;
          return [p0.x + (p1.x - p0.x) * t, p0.y + (p1.y - p0.y) * t];
        }
        s -= L;
      }
      var e = path[path.length - 1], f = path[path.length - 2] || { x: e.x - 1, y: e.y };
      var dl = Math.hypot(e.x - f.x, e.y - f.y) || 1;
      return [e.x + (e.x - f.x) / dl * s, e.y + (e.y - f.y) / dl * s];
    }

    function emitMote(x, y, big, gold) {
      if (motes.length > (LOW ? 120 : 340)) motes.shift();
      var useGlyph = CFG.showGlyphs && big && Math.random() < 0.24;
      motes.push({
        x: x, y: y,
        vx: (Math.random() - 0.5) * 0.28,
        vy: (Math.random() - 0.5) * 0.28 - (useGlyph ? 0.15 : 0),
        life: 1,
        decay: useGlyph ? 0.005 : (0.0055 + Math.random() * 0.006),
        r: (big ? 1.05 : 0.45) + Math.random() * (big ? 1.25 : 0.7),
        seed: Math.random() * 6.28,
        star: big && !useGlyph && Math.random() < 0.55,
        gold: gold || CFG.dragonAscended || CFG.skin === 'kintsugi',
        glyph: useGlyph ? GLYPHS[Math.floor(Math.random() * GLYPHS.length)] : null
      });
    }

    function step(now) {
      var f = Math.min((now - last) / 16.67, 3);
      last = now; T = now / 1000;
      k = Math.max(0.65, Math.min(1.08, W / 1280)) * (245 * CFG.scale) / IW;

      if (pulseProg > 0) pulseProg = Math.max(0, pulseProg - 0.022 * f);

      var targetAlpha = CFG.paused ? 0.0 : (CFG.typingFocus ? 0.52 : 1.0);
      curAlpha += (targetAlpha - curAlpha) * 0.08 * f;
      if (curAlpha < 0.01 && CFG.paused) return;

      var idle = now - M.t, stopAfter = Math.max(25, Math.min(140, evGap * 1.8));
      var tx, ty, cap, cruise, chase = false, huntingFood = false;

      if (!CFG.typingFocus && foodPellets.length > 0) {
        var nearestIdx = 0, minDist = 1e9;
        for (var fi = 0; fi < foodPellets.length; fi++) {
          var fd = Math.hypot(foodPellets[fi].x - Hd.x, foodPellets[fi].y - Hd.y);
          if (fd < minDist) { minDist = fd; nearestIdx = fi; }
        }
        var targetPellet = foodPellets[nearestIdx];
        tx = targetPellet.x; ty = targetPellet.y;
        cap = 7.2; cruise = 4.2;
        huntingFood = true;
        aiModeText = 'Thưởng Thức Hạt Tri Thức (' + targetPellet.glyph + ')';

        if (minDist < 26) {
          waterRipples.push({ x: targetPellet.x, y: targetPellet.y, r: 5, maxR: 75, life: 0.9 });
          floatingTexts.push({
            x: targetPellet.x, y: targetPellet.y - 12,
            text: '+25 Linh Khí • ' + targetPellet.formula,
            life: 1.0,
            gold: false
          });
          foodPellets.splice(nearestIdx, 1);
          CFG.vuMonEnergy = Math.min(100, CFG.vuMonEnergy + 25);
          if (CFG.vuMonEnergy >= 100 && !CFG.dragonAscended) {
            ascendDragon();
          } else {
            pulseProg = 0.75;
          }
        }
      } else if (CFG.typingFocus) {
        aiModeText = 'Tĩnh Tâm (Nhường khung soạn thảo Forum)';
        var edgeR = Math.min(W, H) * 0.36;
        var edgeAng = T * 0.45 * CFG.spinDir;
        tx = W * 0.5 + Math.cos(edgeAng) * edgeR * 1.25;
        ty = H * 0.5 + Math.sin(edgeAng) * edgeR * 0.75;
        cap = 2.0; cruise = 1.8;
        pearl.glow += (0 - pearl.glow) * 0.08 * f;
      } else if (idle < stopAfter) {
        aiModeText = CFG.dragonAscended ? 'Kim Long Du Vân (Bám con trỏ)' : 'Dẫn Lộ (Bám sát con trỏ)';
        var ext = Math.min(idle, stopAfter) / 16.67;
        tx = M.x + MV.x * ext;
        ty = M.y + MV.y * ext;
        cap = 165; cruise = 2.6;
        pearl.glow += (0.25 - pearl.glow) * 0.08 * f;
        pearl.x = M.x; pearl.y = M.y;
      } else if (idle < 2000) {
        aiModeText = 'Tuần Vũ Môn (Lượn vòng quanh trỏ)';
        var R = 96 * Math.max(0.65, Math.min(1, W / 1300));
        var th = Math.atan2(Hd.y - M.y, Hd.x - M.x) + 0.72 * CFG.spinDir;
        tx = M.x + Math.cos(th) * R;
        ty = M.y + Math.sin(th) * R;
        var dm = Math.hypot(Hd.x - M.x, Hd.y - M.y);
        chase = dm > R * 1.45;
        cap = chase ? Math.min(46, 2.6 + (dm - R) * 0.09) : 2.7;
        cruise = 2.4;
        pearl.glow += (0.85 - pearl.glow) * 0.06 * f;
        pearl.x += (M.x - pearl.x) * 0.12 * f;
        pearl.y += (M.y - pearl.y) * 0.12 * f;
      } else {
        var evTitle = (EVENT_PRESETS[CFG.eventMode] && (EVENT_PRESETS[CFG.eventMode].title || EVENT_PRESETS[CFG.eventMode].stamp)) || 'Ấn Sao Khuê';
        aiModeText = 'Chầu ' + evTitle + ' (∞)';
        pearl.glow += (1 - pearl.glow) * 0.05 * f;
        var targetPx = Math.max(200, Math.min(W - 200, M.x + Math.sin(T * 0.32) * 80));
        var targetPy = Math.max(160, Math.min(H - 160, M.y + Math.cos(T * 0.26) * 55));
        pearl.x += (targetPx - pearl.x) * 0.025 * f;
        pearl.y += (targetPy - pearl.y) * 0.025 * f;

        var rx = Math.min(205, W * 0.22), ry = Math.min(120, H * 0.17);
        var omega = T * 1.08 * CFG.spinDir;
        tx = pearl.x + Math.sin(omega) * rx;
        ty = pearl.y + Math.sin(omega * 2) * ry;
        cap = 3.3; cruise = 2.9;
      }

      var ddx = tx - Hd.x, ddy = ty - Hd.y, dist = Math.hypot(ddx, ddy);
      var active = !CFG.typingFocus && !huntingFood && idle < stopAfter, da;
      if (active) {
        var kp = 0.17 + Math.min(0.15, Math.max(0, dist - 140) / 2400);
        var vdx = MV.x + ddx * kp, vdy = MV.y + ddy * kp, vd = Math.hypot(vdx, vdy);
        da = vd > 0.05 ? wrap(Math.atan2(vdy, vdx) - Hd.a) : 0;
      } else {
        da = wrap(Math.atan2(ddy, ddx) - Hd.a);
      }

      var Rmin = 0.20 * IW * k, wmax = Math.min(0.44, Math.max(Hd.s, 2.2) / Rmin);
      var wDes = Math.max(-wmax, Math.min(wmax, da * 0.5));
      Hd.w += (wDes - Hd.w) * (1 - Math.pow(0.5, f));
      Hd.a = wrap(Hd.a + Hd.w * f);

      var sDes;
      if (active) {
        var vd2 = Math.hypot(MV.x + ddx * 0.2, MV.y + ddy * 0.2);
        sDes = Math.max(0.4, Math.min(cap, vd2 * Math.max(0.15, Math.cos(da))));
      } else {
        var align = Math.max(0, Math.cos(da));
        sDes = Math.max(cruise * (0.65 + 0.35 * align), Math.min(cap, dist * 0.24 * align));
      }
      if (pulseProg > 0.3) sDes = Math.max(sDes, 5.2);

      var rate = sDes > Hd.s ? 0.34 : (active ? 0.2 : (chase || huntingFood ? 0.14 : 0.065));
      var dS = (sDes - Hd.s) * (1 - Math.pow(1 - rate, f));
      Hd.s += sDes > Hd.s ? Math.min(dS, (3.4 + Math.max(0, dist - 120) * 0.045) * f) : dS;
      Hd.x += Math.cos(Hd.a) * Hd.s * f;
      Hd.y += Math.sin(Hd.a) * Hd.s * f;

      if (CFG.showLotus) {
        lotusPads.forEach(function (lp) {
          var lx = lp.x - Hd.x, ly = lp.y - Hd.y;
          var ld = Math.hypot(lx, ly) || 1;
          var minSep = lp.r + 52;
          if (ld < minSep) {
            var push = (minSep - ld) * 0.035 * f;
            lp.vx += (lx / ld) * push;
            lp.vy += (ly / ld) * push;
          }
          lp.x += lp.vx * f; lp.y += lp.vy * f;
          lp.vx *= Math.pow(0.92, f); lp.vy *= Math.pow(0.92, f);
          lp.rot += 0.002 * f;
          if (lp.x < 50) lp.vx += 0.1;
          if (lp.x > W - 50) lp.vx -= 0.1;
          if (lp.y < 50) lp.vy += 0.1;
          if (lp.y > H - 50) lp.vy -= 0.1;
        });
      }

      // Cập nhật Cánh Hoa Đào / Hoa Mai / Hoa Đăng rơi nhẹ theo sự kiện
      blossomPetals.forEach(function (bp) {
        bp.x += (bp.vx + Math.sin(T * 1.4 + bp.rot) * 0.25) * f;
        bp.y += bp.vy * f;
        bp.rot += 0.015 * f;
        if (bp.y > H + 20) { bp.y = -15; bp.x = Math.random() * W; }
        if (bp.x < -20) bp.x = W + 15;
        if (bp.x > W + 20) bp.x = -15;
      });

      var mvd = Math.hypot(Hd.x - lastH.x, Hd.y - lastH.y);
      sp += (mvd / f - sp) * 0.2;
      lastH.x = Hd.x; lastH.y = Hd.y;

      if (path.length < 2 || Math.hypot(Hd.x - path[1].x, Hd.y - path[1].y) > 2) {
        path.unshift({ x: Hd.x, y: Hd.y });
      }
      path[0].x = Hd.x; path[0].y = Hd.y;

      var Lb = IW * k, total = 0;
      for (var j = 1; j < path.length; j++) {
        total += Math.hypot(path[j].x - path[j - 1].x, path[j].y - path[j - 1].y);
        if (total > Lb * 1.65) { path.length = j + 1; break; }
      }

      var isOwl = CFG.species === 'owl';
      var seg = Lb / GX, n0 = Math.round(NOSE_U * GX);
      var maxBend = isOwl ? 0.036 : 0.088;
      var raw = [];
      for (j = n0; j <= GX; j++) raw.push(pathAt((j - n0) * seg));
      var head = Hd.a;
      spX[n0] = Hd.x; spY[n0] = Hd.y; spA[n0] = head;

      for (j = n0 + 1; j <= GX; j++) {
        var r = raw[j - n0], want = Math.atan2(spY[j - 1] - r[1], spX[j - 1] - r[0]);
        var aj = spA[j - 1] + Math.max(-maxBend, Math.min(maxBend, wrap(want - spA[j - 1])));
        spA[j] = aj;
        spX[j] = spX[j - 1] - Math.cos(aj) * seg;
        spY[j] = spY[j - 1] - Math.sin(aj) * seg;
      }

      for (var pass = 0; pass < 4; pass++) {
        for (j = n0 + 1; j < GX; j++) {
          spA[j] = spA[j] + wrap((spA[j - 1] + spA[j + 1]) / 2 - spA[j]) * 0.5;
        }
        spA[GX] = spA[GX - 1] + wrap(spA[GX] - spA[GX - 1]) * 0.8;
      }

      for (j = n0 + 1; j <= GX; j++) {
        var st = Math.max(0, Math.min(1, (j / GX - 0.60) / 0.40));
        var sg = seg * (1 + (isOwl ? 0.12 : 0.45) * st * st * (3 - 2 * st));
        spX[j] = spX[j - 1] - Math.cos(spA[j]) * sg;
        spY[j] = spY[j - 1] - Math.sin(spA[j]) * sg;
      }
      for (j = n0 - 1; j >= 0; j--) {
        spA[j] = head;
        spX[j] = spX[j + 1] + Math.cos(head) * seg;
        spY[j] = spY[j + 1] + Math.sin(head) * seg;
      }

      var turn = wrap(head - prevHead) / f;
      prevHead = head;
      roll += (Math.max(-1, Math.min(1, turn * 9.0)) - roll) * Math.min(1, 0.12 * f);
      phase += (0.055 + Math.min(sp, 24) * 0.011) * f;

      var squash = 1 - 0.24 * Math.abs(roll);
      var owlHeadTurn = isOwl ? Math.max(-0.48, Math.min(0.48, da * 0.65)) : 0;
      // CHI TIẾT VI MÔ: Nhịp thở nắp mang (u ~ 0.16..0.22) phập phồng nhẹ theo sin(T * 3.4)
      var gillBreath = !isOwl ? (0.038 * Math.sin(T * 3.4)) : 0;

      for (j = 0; j <= GX; j++) {
        var u = j / GX;
        var localA = spA[j] + (u < 0.18 ? owlHeadTurn * Math.cos(u / 0.18 * Math.PI * 0.5) : 0);
        var ca = Math.cos(localA), sa = Math.sin(localA), nx = Math.sin(localA), ny = -Math.cos(localA);

        var lat = isOwl
          ? (0.6 * CFG.waveAmp * Math.pow(u, 2.0) * Math.sin(phase * 0.7 - u * 2.5))
          : ((2.5 + Math.min(sp, 22) * 0.25) * CFG.waveAmp * (0.08 + 0.92 * Math.pow(u, 2.15)) * Math.sin(phase - u * 4.2));

        var wingOrFinZone = isOwl
          ? Math.max(0, 1 - Math.abs(u - 0.34) / 0.22)
          : Math.max(0, 1 - Math.abs(u - 0.27) / 0.14);
        var gillZone = Math.max(0, 1 - Math.abs(u - 0.185) / 0.035);

        for (var yy = 0; yy <= GY; yy++) {
          var v = yy / GY, off = (v - AXIS_V) * IH * k, side = Math.abs(v - AXIS_V);
          var finFactor = wingOrFinZone * Math.max(0, (side - 0.11) / 0.39);
          var strokeSweep = 0;

          if (isOwl) {
            var flapAmp = (sp > 6.5 ? 0.08 : 0.26) * CFG.waveAmp;
            var flapWave = Math.sin(phase * 0.75 - side * 1.2);
            off *= squash * (1 + flapAmp * finFactor * flapWave);
            strokeSweep = finFactor * 7.5 * CFG.waveAmp * Math.cos(phase * 0.75) * (sp > 6.5 ? 0.3 : 1);
          } else {
            var sideSign = v < AXIS_V ? -1 : 1;
            off *= squash * (1 + gillZone * gillBreath + 0.22 * CFG.waveAmp * finFactor * Math.sin(phase * 0.9 + sideSign * 0.6 - side * 2.2));
            strokeSweep = finFactor * 3.8 * Math.cos(phase * 0.9);
          }

          var tailSilk = Math.max(0, (u - 0.68) / 0.32) * Math.min(1, side / 0.14);
          var wob = tailSilk * (isOwl ? 1.2 : 3.2) * CFG.waveAmp * Math.sin(T * 2.4 - u * 11 + v * 6);
          var o = (yy * (GX + 1) + j) * 2;
          xy[o] = spX[j] + nx * (off + lat + wob) - ca * strokeSweep;
          xy[o + 1] = spY[j] + ny * (off + lat + wob) - sa * strokeSweep;
        }
      }

      if (!isOwl) {
        barbels.forEach(function (rb) {
          var p = rb.p, wj = Math.round(rb.uAnchor * GX);
          var wl = rb.segL * k * IW / 245 * (CFG.dragonAscended ? 1.45 : 1.0);
          var a0 = spA[wj], side = rb.sideOff * IH * k * rb.sd;
          var ax = spX[wj] + Math.sin(a0) * side, ay = spY[wj] - Math.cos(a0) * side;
          p[0].x = ax; p[0].y = ay;
          var rxp = ax, ryp = ay;
          for (var q = 1; q < p.length; q++) {
            var pt = p[q], pr = p[q - 1];
            var spread = 1.25 - 0.82 * Math.min(1, q / 10);
            var wave = 0.16 * Math.sin(T * 2.1 - q * 0.38 + rb.sd);
            var ra = a0 + Math.PI + rb.sd * (spread + wave);
            rxp += Math.cos(ra) * wl;
            ryp += Math.sin(ra) * wl;
            var pull = 1 - Math.pow(1 - 0.34 * Math.pow(1 - q / p.length, 0.5), f);
            pt.x += (rxp - pt.x) * pull;
            pt.y += (ryp - pt.y) * pull;
            var ex = pt.x - pr.x, ey = pt.y - pr.y, el = Math.hypot(ex, ey) || 1;
            pt.x = pr.x + ex / el * wl;
            pt.y = pr.y + ey / el * wl;
          }
        });
      }

      rippleTimer += f;
      if (!isOwl && rippleTimer > (sp > 2 ? 9 : 22)) {
        rippleTimer = 0;
        var rIdx = Math.round(0.28 * GX);
        if (waterRipples.length < (LOW ? 6 : 14)) {
          waterRipples.push({
            x: spX[rIdx], y: spY[rIdx],
            r: 8 * k * IW / 245,
            maxR: (55 + Math.min(35, sp * 4)) * k * IW / 245,
            life: 0.65
          });
        }
      }
      for (i = waterRipples.length - 1; i >= 0; i--) {
        var wr = waterRipples[i];
        wr.r += (wr.maxR - wr.r) * 0.045 * f;
        wr.life -= 0.012 * f;
        if (wr.life <= 0) waterRipples.splice(i, 1);
      }

      var cnt = (0.55 + Math.min(7, sp * 0.38)) * (LOW ? 0.4 : 1);
      for (var e = 0; e < cnt * f; e++) {
        var ju = Math.min(GX, Math.round((0.18 + Math.pow(Math.random(), 0.65) * 0.78) * GX));
        var vv = (Math.random() - 0.5) * 0.52 * IH * k;
        emitMote(
          spX[ju] + Math.sin(spA[ju]) * vv,
          spY[ju] - Math.cos(spA[ju]) * vv,
          Math.random() < 0.25,
          Math.random() < 0.4
        );
      }

      for (i = motes.length - 1; i >= 0; i--) {
        var m = motes[i];
        m.x += m.vx * f; m.y += m.vy * f;
        m.vx *= Math.pow(0.984, f); m.vy *= Math.pow(0.984, f);
        m.life -= m.decay * f;
        if (m.life <= 0) motes.splice(i, 1);
      }

      for (i = shockwaves.length - 1; i >= 0; i--) {
        var sw = shockwaves[i];
        sw.r += (sw.maxR - sw.r) * 0.085 * f;
        sw.rot += 0.02 * f;
        sw.life -= 0.02 * f;
        if (sw.life <= 0) shockwaves.splice(i, 1);
      }

      for (i = floatingTexts.length - 1; i >= 0; i--) {
        var ft = floatingTexts[i];
        ft.y -= 0.62 * f;
        ft.life -= 0.012 * f;
        if (ft.life <= 0) floatingTexts.splice(i, 1);
      }
    }

    var buf2 = null, bctx = null;
    function draw2dFallback(targetCtx) {
      var x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, i;
      for (i = 0; i < xy.length; i += 2) {
        if (xy[i] < x0) x0 = xy[i];
        if (xy[i] > x1) x1 = xy[i];
        if (xy[i + 1] < y0) y0 = xy[i + 1];
        if (xy[i + 1] > y1) y1 = xy[i + 1];
      }
      x0 = Math.floor(x0 - 4); y0 = Math.floor(y0 - 4);
      var bw = Math.max(1, Math.ceil((x1 + 4 - x0) * DPR)), bh = Math.max(1, Math.ceil((y1 + 4 - y0) * DPR));
      if (!buf2) { buf2 = document.createElement('canvas'); bctx = buf2.getContext('2d'); }
      if (buf2.width < bw || buf2.height < bh) {
        buf2.width = Math.max(buf2.width, bw);
        buf2.height = Math.max(buf2.height, bh);
      }
      bctx.setTransform(1, 0, 0, 1, 0, 0);
      bctx.clearRect(0, 0, bw, bh);
      bctx.globalCompositeOperation = 'source-over';
      var sheet = spriteCv, step2 = LOW ? 4 : 2, lastRow = GY * (GX + 1) * 2;

      function tri(u0, v0, u1, v1, u2, v2, x0p, y0p, x1p, y1p, x2p, y2p) {
        var d = u0 * (v1 - v2) + u1 * (v2 - v0) + u2 * (v0 - v1);
        if (!d) return;
        var a = (x0p * (v1 - v2) + x1p * (v2 - v0) + x2p * (v0 - v1)) / d;
        var c = (x0p * (u2 - u1) + x1p * (u0 - u2) + x2p * (u1 - u0)) / d;
        var e = (x0p * (u1 * v2 - u2 * v1) + x1p * (u2 * v0 - u0 * v2) + x2p * (u0 * v1 - u1 * v0)) / d;
        var b2 = (y0p * (v1 - v2) + y1p * (v2 - v0) + y2p * (v0 - v1)) / d;
        var d2 = (y0p * (u2 - u1) + y1p * (u0 - u2) + y2p * (u1 - u0)) / d;
        var f2 = (y0p * (u1 * v2 - u2 * v1) + y1p * (u2 * v0 - u0 * v2) + y2p * (u0 * v1 - u1 * v0)) / d;
        bctx.save();
        bctx.setTransform(1, 0, 0, 1, 0, 0);
        bctx.beginPath();
        bctx.moveTo(x0p, y0p); bctx.lineTo(x1p, y1p); bctx.lineTo(x2p, y2p);
        bctx.closePath(); bctx.clip();
        bctx.setTransform(a, b2, c, d2, e, f2);
        bctx.drawImage(sheet, 0, 0);
        bctx.restore();
      }

      for (var j = 0; j < GX; j += step2) {
        var j1 = Math.min(GX, j + step2), t0 = j * 2, t1 = j1 * 2, b0 = lastRow + j * 2, b1 = lastRow + j1 * 2;
        var su0 = j * IW / GX, su1 = j1 * IW / GX;
        var X = function (o) { return (xy[o] - x0) * DPR; }, Y = function (o) { return (xy[o + 1] - y0) * DPR; };
        tri(su0, 0, su1, 0, su0, IH, X(t0), Y(t0), X(t1), Y(t1), X(b0), Y(b0));
        tri(su1, 0, su1, IH, su0, IH, X(t1), Y(t1), X(b1), Y(b1), X(b0), Y(b0));
      }

      targetCtx.save();
      targetCtx.setTransform(1, 0, 0, 1, 0, 0);
      targetCtx.globalAlpha = curAlpha;
      targetCtx.drawImage(buf2, 0, 0, bw, bh, Math.round(x0 * DPR), Math.round(y0 * DPR), bw, bh);
      targetCtx.restore();
    }

    // VẼ BIỂU TƯỢNG TRUNG TÂM THEO NGÀY TRỌNG ĐẠI VIỆT NAM & DẢI LỤA LỜI CHÚC TINH TẾ
    function drawSacredCenterpieceAndWish(fc, pal) {
      if (pearl.glow <= 0.02) return;
      var pr = (16 + 2.2 * Math.sin(T * 2.6)) * pearl.glow;
      var ev = CFG.eventMode || 'normal';
      var preset = EVENT_PRESETS[ev] || EVENT_PRESETS.normal;
      var alpha = pearl.glow * (dark ? 0.88 : 0.78) * curAlpha;

      fc.save();
      fc.translate(pearl.x, pearl.y);
      fc.globalAlpha = alpha;

      if (preset.centerType === 'drum' || ev === 'vn_national') {
        // TRỐNG ĐỒNG ĐÔNG SƠN & SAO VÀNG LẠC HỒNG (2/9, 30/4, Giỗ Tổ 10/3)
        var drumR = pr * 2.4;
        var dg = fc.createRadialGradient(0, 0, 2, 0, 0, drumR * 1.25);
        dg.addColorStop(0, 'rgba(253, 224, 71, 0.48)');
        dg.addColorStop(0.55, 'rgba(220, 38, 38, 0.24)');
        dg.addColorStop(1, 'rgba(0,0,0,0)');
        fc.fillStyle = dg;
        fc.beginPath(); fc.arc(0, 0, drumR * 1.25, 0, Math.PI * 2); fc.fill();

        fc.save();
        fc.rotate(T * 0.32);
        fc.strokeStyle = dark ? '#fde047' : '#b45309';
        fc.lineWidth = 1.2;
        // 3 vòng đồng tâm Trống Đồng Ngọc Lũ
        [0.48, 0.78, 1.0].forEach(function (ratio) {
          fc.beginPath(); fc.arc(0, 0, drumR * ratio, 0, Math.PI * 2); fc.stroke();
        });
        // Mặt trời Trống Đồng 14 tia ở tâm
        var rays = 14;
        for (var rIdx = 0; rIdx < rays; rIdx++) {
          var ra = (rIdx / rays) * Math.PI * 2;
          fc.beginPath();
          fc.moveTo(0, 0);
          fc.lineTo(Math.cos(ra) * drumR * 0.45, Math.sin(ra) * drumR * 0.45);
          fc.stroke();
        }
        // 4 Chim Lạc bay ngược chiều kim đồng hồ
        for (var bIdx = 0; bIdx < 4; bIdx++) {
          fc.save();
          fc.rotate(bIdx * Math.PI / 2 + 0.4);
          fc.beginPath();
          fc.moveTo(drumR * 0.62, -5);
          fc.lineTo(drumR * 0.66, 0);
          fc.lineTo(drumR * 0.62, 5);
          fc.stroke();
          fc.restore();
        }
        fc.restore();

      } else if (preset.centerType === 'midautumn' || ev === 'midautumn') {
        // LÝ NGƯ VỌNG NGUYỆT (Bóng Trăng Rằm Đáy Nước - Tranh Hàng Trống)
        var moonR = pr * 2.2;
        var mg = fc.createRadialGradient(0, 0, moonR * 0.1, 0, 0, moonR * 1.5);
        mg.addColorStop(0, '#fef9c3');
        mg.addColorStop(0.55, 'rgba(253, 224, 71, 0.55)');
        mg.addColorStop(1, 'rgba(253, 224, 71, 0)');
        fc.fillStyle = mg;
        fc.beginPath();
        // Mặt trăng gợn sóng nhẹ dưới đáy hồ
        for (var ma = 0; ma <= Math.PI * 2; ma += 0.12) {
          var mr = moonR + Math.sin(ma * 6 + T * 4) * 1.8;
          var mx = Math.cos(ma) * mr, my = Math.sin(ma) * mr;
          if (ma === 0) fc.moveTo(mx, my); else fc.lineTo(mx, my);
        }
        fc.closePath(); fc.fill();

      } else if (preset.centerType === 'tet' || ev === 'tet') {
        // ẤN TRIỆN CHU SA KHAI BÚT ĐẦU XUÂN & HOA ĐÀO
        var sealS = pr * 1.7;
        fc.fillStyle = 'rgba(220, 38, 38, 0.85)';
        fc.strokeStyle = '#fde047';
        fc.lineWidth = 1.6;
        fc.beginPath();
        fc.roundRect(-sealS * 0.5, -sealS * 0.5, sealS, sealS, 6);
        fc.fill(); fc.stroke();
        fc.fillStyle = '#fef08a';
        fc.font = 'bold 14px "Playfair Display", serif';
        fc.textAlign = 'center'; fc.textBaseline = 'middle';
        fc.fillText('PHÚC', 0, 1);

      } else if (preset.centerType === 'lantern' || preset.centerType === 'camellia' || preset.centerType === 'lotus' || ev === 'birthday') {
        // HOA ĐĂNG SINH NHẬT & VÒNG TINH QUANG CẦU PHÚC
        var bGrad = fc.createRadialGradient(0, 0, 2, 0, 0, pr * 2.6);
        bGrad.addColorStop(0, '#fff1f2');
        bGrad.addColorStop(0.4, '#f43f5e');
        bGrad.addColorStop(1, 'rgba(244, 63, 94, 0)');
        fc.fillStyle = bGrad;
        fc.beginPath(); fc.arc(0, 0, pr * 2.6, 0, Math.PI * 2); fc.fill();

        fc.rotate(T * 0.5);
        for (var lp2 = 0; lp2 < 8; lp2++) {
          fc.rotate(Math.PI / 4);
          fc.fillStyle = lp2 % 2 === 0 ? '#fda4af' : '#fde047';
          fc.beginPath();
          fc.ellipse(pr * 0.65, 0, pr * 0.55, pr * 0.22, 0, 0, Math.PI * 2);
          fc.fill();
        }
        fc.fillStyle = '#ffffff';
        fc.beginPath(); fc.arc(0, 0, pr * 0.28, 0, Math.PI * 2); fc.fill();

      } else {
        // ẤN SAO KHUÊ VĂN MIẾU (8 cánh chuẩn Văn Miếu Quốc Tử Giám)
        var pGrad = fc.createRadialGradient(0, 0, 2, 0, 0, pr * 2.5);
        pGrad.addColorStop(0, '#ffffff');
        pGrad.addColorStop(0.35, pal.headGlow);
        pGrad.addColorStop(1, 'rgba(0,0,0,0)');
        fc.fillStyle = pGrad;
        fc.beginPath(); fc.arc(0, 0, pr * 2.5, 0, Math.PI * 2); fc.fill();

        fc.save();
        fc.rotate(T * 0.55);
        fc.strokeStyle = pal.horn;
        fc.lineWidth = 1.3;
        for (var sq = 0; sq < 2; sq++) {
          fc.rotate(Math.PI / 4);
          fc.strokeRect(-pr * 0.9, -pr * 0.9, pr * 1.8, pr * 1.8);
        }
        fc.restore();
      }

            fc.restore();
    }

    var lastFrame = performance.now(), dtAvg = 16.7, nFrames = 0;
    function frame(now) {
      var dtTot = Math.min(now - lastFrame, 400);
      lastFrame = now;
      nFrames++;
      if (nFrames > 5) dtAvg += (dtTot - dtAvg) * 0.05;
      if (!LOW && nFrames > 90 && dtAvg > 32) {
        LOW = true; resize(); readTheme();
        window.__astralDragonMode += '-low';
      }

      var nSub = Math.max(1, Math.min(6, Math.ceil(dtTot / 25)));
      for (var si = 1; si <= nSub; si++) step(now - dtTot + dtTot * si / nSub);

      var curW = window.innerWidth || document.documentElement.clientWidth || 0;
      var curH = window.innerHeight || document.documentElement.clientHeight || 0;
      if (curW > 100 && curH > 100 && (Math.abs(curW - W) > 2 || Math.abs(curH - H) > 2)) {
        resize();
      }
      if (!Number.isFinite(Hd.x) || !Number.isFinite(Hd.y)) {
        Hd.x = W * 0.5; Hd.y = H * 0.5; Hd.a = Math.PI; Hd.s = 2.5; Hd.w = 0;
        for (var rst = 0; rst < path.length; rst++) { path[rst].x = Hd.x + rst * 8; path[rst].y = Hd.y; }
      }
      var pal = CFG.dragonAscended ? PALETTES.imperialGold : (PALETTES[CFG.skin] || PALETTES.solar);
      var useGl = Boolean(gl && (!gl.isContextLost || !gl.isContextLost()) && !CFG.force2D);
      var isOwl = CFG.species === 'owl';
      window.__astralDragonMode = (useGl ? 'webgl' : 'canvas2d') + (LOW ? '-low' : '');
      window.__astralDragonState = aiModeText;

      uc.clearRect(0, 0, W, H);
      fc.clearRect(0, 0, W, H);

      if (curAlpha < 0.01 && CFG.paused) {
        if (gl) { gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); }
        requestAnimationFrame(frame);
        return;
      }

      // 1. Vẽ Lá Sen & Hoa Sen Tịnh Tâm mặt hồ
      if (CFG.showLotus) {
        lotusPads.forEach(function (lp) {
          uc.save();
          uc.translate(lp.x, lp.y);
          uc.rotate(lp.rot);
          uc.globalAlpha = (dark ? 0.34 : 0.26) * curAlpha;

          uc.fillStyle = 'rgba(2, 6, 23, 0.35)';
          uc.beginPath();
          uc.arc(4, 6, lp.r, 0.18, Math.PI * 2 - 0.18);
          uc.lineTo(4, 6);
          uc.closePath();
          uc.fill();

          var lGrad = uc.createRadialGradient(0, 0, 2, 0, 0, lp.r);
          lGrad.addColorStop(0, CFG.skin === 'sumi' ? '#64748b' : '#34d399');
          lGrad.addColorStop(0.7, CFG.skin === 'sumi' ? '#334155' : '#059669');
          lGrad.addColorStop(1, CFG.skin === 'sumi' ? '#0f172a' : '#064e3b');
          uc.fillStyle = lGrad;
          uc.beginPath();
          uc.arc(0, 0, lp.r, 0.2, Math.PI * 2 - 0.2);
          uc.lineTo(0, 0);
          uc.closePath();
          uc.fill();

          uc.strokeStyle = 'rgba(226, 232, 240, 0.38)';
          uc.lineWidth = 0.8;
          for (var v = 1; v < 9; v++) {
            var va = v * (Math.PI * 2 / 9);
            uc.beginPath();
            uc.moveTo(0, 0);
            uc.lineTo(Math.cos(va) * lp.r * 0.88, Math.sin(va) * lp.r * 0.88);
            uc.stroke();
          }

          if (lp.hasFlower) {
            uc.globalAlpha = (dark ? 0.70 : 0.64) * curAlpha;
            for (var pet = 0; pet < 8; pet++) {
              uc.save();
              uc.rotate(pet * Math.PI / 4 + T * 0.1);
              uc.fillStyle = CFG.skin === 'kintsugi' ? '#fef9c3' : (pet % 2 === 0 ? '#f472b6' : '#fbcfe8');
              uc.beginPath();
              uc.ellipse(lp.r * 0.32, 0, lp.r * 0.32, lp.r * 0.13, 0, 0, Math.PI * 2);
              uc.fill();
              uc.restore();
            }
            uc.fillStyle = '#fde047';
            uc.beginPath();
            uc.arc(0, 0, lp.r * 0.14, 0, Math.PI * 2);
            uc.fill();
          }
          uc.restore();
        });
      }

      // Cánh Hoa Đào / Hoa Mai (dịp Tết) hoặc Cánh Sen Vàng (dịp 20/11, Đại Lễ, Sinh Nhật)
      if (CFG.eventMode !== 'normal') {
        blossomPetals.forEach(function (bp) {
          uc.save();
          uc.translate(bp.x, bp.y);
          uc.rotate(bp.rot);
          uc.globalAlpha = 0.48 * curAlpha;
          if (CFG.eventMode === 'tet') {
            uc.fillStyle = bp.gold ? '#fde047' : '#fda4af'; // Mai vàng & Đào phai
          } else if (CFG.eventMode === 'vn_national') {
            uc.fillStyle = '#fde047'; // Sao vàng & Kim quang
          } else {
            uc.fillStyle = bp.gold ? '#fde047' : '#fbcfe8';
          }
          uc.beginPath();
          uc.ellipse(0, 0, bp.r, bp.r * 0.58, 0, 0, Math.PI * 2);
          uc.fill();
          uc.restore();
        });
      }

      // 2. Vẽ vòng gợn sóng mặt hồ
      waterRipples.forEach(function (wr) {
        uc.save();
        uc.strokeStyle = dark
          ? 'rgba(186, 230, 253, ' + (wr.life * 0.28 * curAlpha) + ')'
          : 'rgba(30, 64, 175, ' + (wr.life * 0.20 * curAlpha) + ')';
        uc.lineWidth = 1.25;
        uc.beginPath();
        uc.arc(wr.x, wr.y, wr.r, 0, Math.PI * 2);
        uc.stroke();
        uc.restore();
      });

      // 3. Vẽ 4 Râu Cá Chép / Râu Kim Long
      if (!isOwl) {
        uc.lineCap = 'round';
        uc.lineJoin = 'round';
        barbels.forEach(function (rb) {
          var p = rb.p, n = p.length;
          for (var s3 = 0; s3 < 4; s3++) {
            var q0 = Math.floor(s3 * (n - 1) / 4), q1 = Math.floor((s3 + 1) * (n - 1) / 4);
            var tq = 1 - (q0 + q1) / 2 / n;
            uc.strokeStyle = 'rgba(' + pal.ribbonDark + ',' + (0.82 * Math.pow(tq, 0.7) * curAlpha) + ')';
            uc.lineWidth = (2.2 * tq + 0.5) * rb.wScale * (CFG.dragonAscended ? 1.25 : 1.0);
            uc.beginPath();
            uc.moveTo(p[q0].x, p[q0].y);
            for (var q = q0 + 1; q <= q1; q++) uc.lineTo(p[q].x, p[q].y);
            uc.stroke();
          }
        });
      }

      // 4. Vẽ cơ thể chính bằng WebGL (hoặc Canvas2D fallback)
      if (useGl) {
        cv.style.display = 'block';
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, xy);
        gl.uniform2f(U.u_res, W, H);
        gl.uniform1f(U.u_ft, T % 1000);
        gl.uniform1f(U.u_roll, roll);
        gl.uniform1f(U.u_glow, dark ? 0.95 : 0.65);
        gl.uniform1f(U.u_pulse, pulseProg);
        gl.uniform1f(U.u_isKoi, isOwl ? 0.0 : 1.0);
        gl.uniform1f(U.u_alpha, curAlpha);

        if (!LOW) {
          gl.bindTexture(gl.TEXTURE_2D, texInk);
          gl.uniform1f(U.u_shadow, dark ? 0.35 : 0.22);
          gl.uniform2f(U.u_off, isOwl ? 16 : 11, isOwl ? 24 : 17);
          gl.drawElements(gl.TRIANGLES, idx.length, gl.UNSIGNED_SHORT, 0);
        }
        gl.bindTexture(gl.TEXTURE_2D, dark ? texGlow : texInk);
        gl.uniform1f(U.u_shadow, 0);
        gl.uniform2f(U.u_off, 0, 0);
        gl.drawElements(gl.TRIANGLES, idx.length, gl.UNSIGNED_SHORT, 0);
      } else {
        cv.style.display = 'none';
        if (ctx2) ctx2.clearRect(0, 0, W, H);
        draw2dFallback(uc);
      }

      // 5. Vẽ Hạt Tri Thức đang nổi chờ cá tới ăn
      foodPellets.forEach(function (fp) {
        var sc = 1 + 0.18 * Math.sin(T * 5 + fp.pulse);
        fc.save();
        fc.translate(fp.x, fp.y);
        fc.globalAlpha = 0.92 * curAlpha;
        var fg = fc.createRadialGradient(0, 0, 1, 0, 0, fp.r * 2.4 * sc);
        fg.addColorStop(0, '#ffffff');
        fg.addColorStop(0.4, '#fde047');
        fg.addColorStop(1, 'rgba(245, 158, 11, 0)');
        fc.fillStyle = fg;
        fc.beginPath();
        fc.arc(0, 0, fp.r * 2.4 * sc, 0, Math.PI * 2);
        fc.fill();

        fc.fillStyle = '#0f172a';
        fc.font = 'bold 10px "JetBrains Mono", monospace';
        fc.textAlign = 'center';
        fc.textBaseline = 'middle';
        fc.fillText(fp.glyph, 0, 0);
        fc.restore();
      });

      // 6. Vẽ Biểu Tượng Ngày Trọng Đại Việt Nam & Dải Lụa Lời Chúc
      drawSacredCenterpieceAndWish(fc, pal);

      // 7. Vẽ Pháp Trận Sao Khuê / Trống Đồng khi click chuột
      shockwaves.forEach(function (sw) {
        fc.save();
        fc.translate(sw.x, sw.y);
        fc.rotate(sw.rot);
        var swCol = dark ? pal.moteGold : pal.moteLight;
        fc.strokeStyle = 'rgba(' + swCol + ',' + (sw.life * 0.72 * curAlpha) + ')';
        fc.lineWidth = 1.6 * sw.life;
        fc.beginPath();
        fc.arc(0, 0, sw.r, 0, Math.PI * 2);
        fc.stroke();

        var rIn = sw.r * 0.72;
        fc.lineWidth = 0.95 * sw.life;
        fc.beginPath();
        for (var k3 = 0; k3 < 8; k3++) {
          var a1 = k3 * Math.PI / 4, a2 = a1 + Math.PI * 0.75;
          fc.moveTo(Math.cos(a1) * rIn, Math.sin(a1) * rIn);
          fc.lineTo(Math.cos(a2) * rIn, Math.sin(a2) * rIn);
        }
        fc.stroke();
        fc.restore();
      });

      // 8. Vẽ hạt Tinh Quang, Ký hiệu Toán-Lý & Lời chúc bay lên
      fc.globalCompositeOperation = dark ? 'lighter' : 'source-over';
      fc.font = '600 11px "JetBrains Mono", monospace';
      fc.textAlign = 'center';
      fc.textBaseline = 'middle';
      motes.forEach(function (m) {
        var tw = 0.55 + 0.45 * Math.sin(T * 8.0 + m.seed);
        var al = m.life * tw * (dark ? 0.85 : 0.72) * curAlpha;
        var cStr = dark ? (m.gold ? pal.moteGold : pal.moteDark) : pal.moteLight;
        if (m.glyph) {
          fc.fillStyle = 'rgba(' + cStr + ',' + (al * 0.92) + ')';
          fc.fillText(m.glyph, m.x, m.y);
        } else {
          fc.fillStyle = 'rgba(' + cStr + ',' + al + ')';
          fc.beginPath();
          fc.arc(m.x, m.y, m.r * (0.7 + 0.3 * tw), 0, Math.PI * 2);
          fc.fill();
          if (m.star) {
            var L = m.r * 4.0 * tw;
            fc.strokeStyle = 'rgba(' + cStr + ',' + (al * 0.72) + ')';
            fc.lineWidth = 0.65;
            fc.beginPath();
            fc.moveTo(m.x - L, m.y); fc.lineTo(m.x + L, m.y);
            fc.moveTo(m.x, m.y - L); fc.lineTo(m.x, m.y + L);
            fc.stroke();
          }
        }
      });

      floatingTexts.forEach(function (ft) {
        fc.save();
        fc.font = ft.gold ? 'bold 13px "Inter", sans-serif' : '600 11px "JetBrains Mono", monospace';
        fc.fillStyle = ft.gold
          ? 'rgba(253, 224, 71, ' + (Math.min(1, ft.life) * curAlpha) + ')'
          : (dark ? 'rgba(165, 243, 252, ' + (ft.life * curAlpha) + ')' : 'rgba(30, 64, 175, ' + (ft.life * curAlpha) + ')');
        fc.fillText(ft.text, ft.x, ft.y);
        fc.restore();
      });

      fc.globalCompositeOperation = 'source-over';
      window.__astralDragonRaf = requestAnimationFrame(frame);
    }
    window.__astralDragonCleanup = function () {
      if (window.__astralDragonRaf) cancelAnimationFrame(window.__astralDragonRaf);
      [ux, cv, fx].forEach(function (el) { if (el && el.parentNode) el.parentNode.removeChild(el); });
    };
    window.__astralDragonRaf = requestAnimationFrame(frame);
  }

  if (document.body) start();
  else addEventListener('DOMContentLoaded', start);
})();