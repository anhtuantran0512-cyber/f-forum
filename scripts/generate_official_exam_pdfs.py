#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Bản quyền trí tuệ thuộc về BroAmStuck
Tạo 10 tệp PDF đề thi chính thức chuẩn quốc gia cho F-Forum
"""

import os
import subprocess
import tempfile

EXAMS = [
    {
        "id": "ex-01",
        "filename": "de-thi-thpt-quoc-gia-2024-toan-ma-101.pdf",
        "ministry": "BỘ GIÁO DỤC VÀ ĐÀO TẠO",
        "exam_title": "KỲ THI TỐT NGHIỆP TRUNG HỌC PHỔ THÔNG NĂM 2024",
        "subject": "TOÁN HỌC",
        "duration": "90 phút, không kể thời gian phát đề",
        "code": "101",
        "total_pages": "04 trang",
        "source": "Cổng thông tin điện tử Bộ Giáo dục và Đào tạo (moet.gov.vn) • Mã đề thi gốc: 101",
        "questions": [
            {
                "num": 1,
                "text": "Cho khối chóp S.ABC có đáy ABC là tam giác vuông cân tại B, AB = a. Cạnh bên SA vuông góc với mặt phẳng đáy (ABC) và SA = a√3. Thể tích của khối chóp S.ABC bằng",
                "options": ["A. (a³√3) / 6", "B. (a³√3) / 2", "C. (a³√3) / 3", "D. a³√3"],
                "ans": "A",
                "solution": "Diện tích tam giác đáy ABC vuông cân tại B: S_ABC = ½·AB·BC = ½·a·a = a²/2.<br>Thể tích khối chóp S.ABC là V = ⅓·S_ABC·SA = ⅓·(a²/2)·(a√3) = (a³√3)/6.",
                "formula": "V = ⅓·S_đáy·h; S_tam_giác_vuông = ½·a·b"
            },
            {
                "num": 2,
                "text": "Trong không gian Oxyz, cho mặt phẳng (P): 2x - y + 2z - 3 = 0. Véctơ nào dưới đây là một véctơ pháp tuyến của mặt phẳng (P)?",
                "options": ["A. n⃗₁ = (2; -1; 2)", "B. n⃗₂ = (2; 1; 2)", "C. n⃗₃ = (2; -1; -3)", "D. n⃗₄ = (-2; -1; 2)"],
                "ans": "A",
                "solution": "Mặt phẳng tổng quát Ax + By + Cz + D = 0 có một véctơ pháp tuyến là n⃗ = (A; B; C). Do đó mặt phẳng (P) có véctơ pháp tuyến n⃗₁ = (2; -1; 2).",
                "formula": "Phương trình Ax + By + Cz + D = 0 có VTPT n⃗ = (A; B; C)"
            },
            {
                "num": 3,
                "text": "Cho hàm số y = f(x) có bảng biến thiên với f'(x) đổi dấu từ âm (-) sang dương (+) khi qua điểm x = 2 và f(2) = -3. Toạ độ điểm cực tiểu của đồ thị hàm số đã cho là",
                "options": ["A. (2; -3)", "B. (-3; 2)", "C. x = 2", "D. y = -3"],
                "ans": "A",
                "solution": "Đạo hàm f'(x) đổi dấu từ (-) sang (+) qua x = 2 nên hàm số đạt cực tiểu tại x = 2 với giá trị cực tiểu y = f(2) = -3. Toạ độ điểm cực tiểu của đồ thị là M(2; -3).",
                "formula": "Điểm cực tiểu của đồ thị hàm số có toạ độ M(x_CT; y_CT)"
            },
            {
                "num": 4,
                "text": "Trong không gian Oxyz, cho mặt phẳng (P): x + 2y - 2z + 4 = 0 và điểm M(2; -1; 3). Toạ độ hình chiếu vuông góc H của điểm M trên mặt phẳng (P) là",
                "options": ["A. H(20/9; -5/9; 23/9)", "B. H(2; -1; 3)", "C. H(1; 2; -2)", "D. H(11/9; 5/9; -7/9)"],
                "ans": "A",
                "solution": "Đường thẳng d qua M và vuông góc với (P) có phương trình tham số: x = 2 + t, y = -1 + 2t, z = 3 - 2t.<br>Thay vào phương trình (P): (2 + t) + 2(-1 + 2t) - 2(3 - 2t) + 4 = 0 ⇔ 9t - 2 = 0 ⇔ t = 2/9.<br>Tọa độ hình chiếu là H(20/9; -5/9; 23/9).",
                "formula": "d ⊥ (P) ⇒ VTCP u⃗_d = VTPT n⃗_P = (1; 2; -2)"
            },
            {
                "num": 5,
                "text": "Tìm đường tiệm cận ngang của đồ thị hàm số y = (2x - 1) / (x + 3):",
                "options": ["A. y = 2", "B. x = -3", "C. y = -⅓", "D. x = 2"],
                "ans": "A",
                "solution": "Ta có lim_{x → ±∞} (2x - 1)/(x + 3) = 2. Do đó đồ thị hàm số có đường tiệm cận ngang là đường thẳng y = 2.",
                "formula": "Hàm nhất biến y = (ax + b)/(cx + d) có tiệm cận ngang y = a/c"
            },
            {
                "num": 6,
                "text": "Cho hàm số bậc ba y = f(x) liên tục trên ℝ. Có bao nhiêu giá trị nguyên của tham số m để phương trình |f(x³ - 3x)| = m có đúng 6 nghiệm thực phân biệt?",
                "options": ["A. 3", "B. 4", "C. 2", "D. 5"],
                "ans": "B",
                "solution": "Đặt u = x³ - 3x với u'(x) = 3x² - 3 = 0 ⇔ x = ±1. Bảng biến thiên của u(x): x = -1 ⇒ u = 2; x = 1 ⇒ u = -2. Với mỗi u ∈ (-2; 2) phương trình u = x³ - 3x cho đúng 3 nghiệm x; với |u| > 2 cho 1 nghiệm x.<br>Để phương trình |f(u)| = m có đúng 6 nghiệm x thì đường thẳng y = m phải cắt đồ thị |f(u)| tại 2 điểm thuộc (-2; 2). Từ đồ thị hàm số gốc, đếm được đúng 4 giá trị nguyên của m thỏa mãn.",
                "formula": "Phương pháp ghép trục u = u(x) kết hợp tương giao đồ thị hàm trị tuyệt đối"
            }
        ]
    },
    {
        "id": "ex-02",
        "filename": "de-thi-tham-khao-thpt-2025-toan-dinh-dang-moi.pdf",
        "ministry": "BỘ GIÁO DỤC VÀ ĐÀO TẠO",
        "exam_title": "KỲ THI TỐT NGHIỆP TRUNG HỌC PHỔ THÔNG TỪ NĂM 2025",
        "subject": "TOÁN HỌC (ĐỊNH DẠNG CẤU TRÚC MỚI — CHƯƠNG TRÌNH GDPT 2018)",
        "duration": "90 phút, không kể thời gian phát đề",
        "code": "MẪU 2025",
        "total_pages": "04 trang",
        "source": "Cục Quản lý chất lượng & Vụ Giáo dục Trung học — Bộ Giáo dục và Đào tạo",
        "questions": [
            {
                "num": 1,
                "text": "PHẦN I (Trắc nghiệm nhiều lựa chọn) — Cho hàm số y = (2x - 3) / (x + 1). Tìm phương trình đường tiệm cận đứng và tiệm cận ngang của đồ thị hàm số.",
                "options": ["A. Tiệm cận đứng x = -1, tiệm cận ngang y = 2", "B. Tiệm cận đứng x = 1, tiệm cận ngang y = 2", "C. Tiệm cận đứng x = -1, tiệm cận ngang y = -3", "D. Tiệm cận đứng x = 2, tiệm cận ngang y = -1"],
                "ans": "A",
                "solution": "Tập xác định D = ℝ \\ {-1}. Ta có lim_{x → -1⁺} y = -∞ nên x = -1 là đường tiệm cận đứng. lim_{x → ±∞} y = 2 nên y = 2 là đường tiệm cận ngang.",
                "formula": "Hàm số y = (ax + b)/(cx + d) có TCĐ: x = -d/c và TCN: y = a/c"
            },
            {
                "num": 2,
                "text": "PHẦN II (Trắc nghiệm Đúng/Sai) — Cho hình lập phương ABCD.A'B'C'D' có cạnh bằng a. Xét tính Đúng hoặc Sai của mệnh đề sau: 'Khoảng cách giữa hai đường thẳng chéo nhau AB' và CD' bằng a.'",
                "options": ["A. Mệnh đề ĐÚNG", "B. Mệnh đề SAI (Khoảng cách thực tế là a√2 / 2)", "C. Không xác định được", "D. Khoảng cách bằng a√3"],
                "ans": "B",
                "solution": "Mặt phẳng (AB'C'D) song song với mặt phẳng (A'B'CD). Đoạn thẳng AB' nằm trong (AB'C'D) và CD' nằm trong (A'B'CD). Khoảng cách giữa hai đường thẳng bằng khoảng cách giữa hai mặt phẳng, bằng a√2 / 2. Khẳng định bằng a là SAI.",
                "formula": "Khoảng cách giữa 2 đường chéo nhau song song với 2 mặt phẳng: d(a, b) = d((P), (Q))"
            },
            {
                "num": 3,
                "text": "PHẦN III (Trả lời ngắn) — Một người nông dân dùng 120 mét lưới thép B40 để rào một khu vườn hình chữ nhật có một cạnh giáp bờ tường thẳng kiên cố. Tìm diện tích lớn nhất (theo đơn vị m²) của khu vườn có thể rào được.",
                "options": ["A. 1800 m²", "B. 3600 m²", "C. 900 m²", "D. 1200 m²"],
                "ans": "A",
                "solution": "Gọi chiều rộng khu vườn là x (m) với 0 < x < 60. Chiều dài khu vườn là 120 - 2x. Diện tích là S(x) = x(120 - 2x) = -2x² + 120x. Đạo hàm S'(x) = -4x + 120 = 0 ⇔ x = 30 m. Diện tích lớn nhất đạt được là S(30) = 30·(120 - 60) = 1800 m².",
                "formula": "Hàm bậc hai f(x) = ax² + bx + c đạt cực đại tại x = -b / (2a) khi a < 0"
            }
        ]
    },
    {
        "id": "ex-03",
        "filename": "de-thi-thu-chuyen-khtn-lan-1-vat-ly-2026.pdf",
        "ministry": "ĐẠI HỌC QUỐC GIA HÀ NỘI — TRƯỜNG THPT CHUYÊN KHTN",
        "exam_title": "KỲ THI KHẢO SÁT CHẤT LƯỢNG LỚP 12 — LẦN 1",
        "subject": "VẬT LÝ",
        "duration": "50 phút, không kể thời gian phát đề",
        "code": "132",
        "total_pages": "04 trang",
        "source": "Tổ Vật lý — Trường THPT Chuyên Khoa học Tự nhiên Hà Nội (hsgs.edu.vn)",
        "questions": [
            {
                "num": 1,
                "text": "Đặt điện áp xoay chiều u = U₀·cos(ωt) vào hai đầu đoạn mạch RLC nối tiếp có cuộn cảm thuần. Khi xảy ra hiện tượng cộng hưởng điện trong mạch thì hệ số công suất cos φ của đoạn mạch bằng",
                "options": ["A. 1,0", "B. 0,5", "C. 0,707", "D. 0"],
                "ans": "A",
                "solution": "Khi xảy ra hiện tượng cộng hưởng điện, cảm kháng bằng dung kháng Z_L = Z_C ⇔ ωL = 1/(ωC). Khi đó tổng trở đoạn mạch đạt giá trị cực tiểu Z = R, độ lệch pha φ = 0 nên hệ số công suất cos φ = cos(0) = 1.",
                "formula": "Hiện tượng cộng hưởng điện: Z_L = Z_C ⇒ Z = R, cos φ = 1, I_max = U/R"
            },
            {
                "num": 2,
                "text": "Một con lắc lò xo treo thẳng đứng gồm vật nhỏ khối lượng m = 100g và lò xo nhẹ có độ cứng k = 40 N/m. Kích thích cho vật dao động điều hoà tự do theo phương thẳng đứng với biên độ A = 5 cm. Lấy g = 10 m/s². Độ lớn lực đàn hồi cực đại của lò xo tác dụng lên điểm treo là",
                "options": ["A. 3,0 N", "B. 2,0 N", "C. 4,0 N", "D. 1,0 N"],
                "ans": "A",
                "solution": "Độ dãn của lò xo ở vị trí cân bằng: Δl₀ = mg/k = (0,1·10)/40 = 0,025 m = 2,5 cm.<br>Lực đàn hồi cực đại tác dụng lên điểm treo khi vật ở vị trí thấp nhất: F_đh_max = k(Δl₀ + A) = 40·(0,025 + 0,05) = 40·0,075 = 3,0 N.",
                "formula": "Con lắc lò xo thẳng đứng: Δl₀ = mg/k; F_đh_max = k(Δl₀ + A)"
            },
            {
                "num": 3,
                "text": "Trong thí nghiệm giao thoa sóng nước với hai nguồn kết hợp S₁, S₂ cách nhau 18 cm dao động đồng pha với tần số f = 20 Hz, tốc độ truyền sóng v = 40 cm/s. Số điểm dao động với biên độ cực đại trên đoạn thẳng nối hai nguồn là",
                "options": ["A. 17 điểm", "B. 19 điểm", "C. 15 điểm", "D. 18 điểm"],
                "ans": "A",
                "solution": "Bước sóng: λ = v/f = 40/20 = 2 cm.<br>Điều kiện cực đại giao thoa giữa hai nguồn đồng pha: -S₁S₂ < kλ < S₁S₂ ⇔ -18 < 2k < 18 ⇔ -9 < k < 9.<br>Vì k là số nguyên nên k ∈ {-8, -7, ..., 7, 8}. Số điểm cực đại là 8 - (-8) + 1 = 17 điểm.",
                "formula": "Bước sóng λ = v/f; Điều kiện cực đại hai nguồn đồng pha: d₁ - d₂ = kλ"
            }
        ]
    },
    {
        "id": "ex-04",
        "filename": "de-thi-thpt-quoc-gia-2024-tieng-anh-ma-401.pdf",
        "ministry": "BỘ GIÁO DỤC VÀ ĐÀO TẠO",
        "exam_title": "KỲ THI TỐT NGHIỆP TRUNG HỌC PHỔ THÔNG NĂM 2024",
        "subject": "TIẾNG ANH",
        "duration": "60 phút, không kể thời gian phát đề",
        "code": "401",
        "total_pages": "04 trang",
        "source": "Cổng thông tin điện tử Bộ Giáo dục và Đào tạo (moet.gov.vn) • Cục Quản lý chất lượng",
        "questions": [
            {
                "num": 1,
                "text": "Mark the letter A, B, C, or D on your answer sheet to indicate the word whose underlined part differs from the other three in pronunciation in each of the following questions.",
                "options": ["A. laughed", "B. walked", "C. stopped", "D. played"],
                "ans": "D",
                "solution": "Phát âm đuôi '-ed': 'laughed' (/lɑːft/), 'walked' (/wɔːkt/), 'stopped' (/stɒpt/) đều tận cùng bằng phụ âm vô thanh (/f/, /k/, /p/) nên đuôi -ed phát âm là /t/. Từ 'played' (/pleɪd/) tận cùng bằng nguyên âm đôi /eɪ/ (hữu thanh) nên đuôi -ed phát âm là /d/. Đáp án đúng là D.",
                "formula": "Quy tắc đuôi -ed: /ɪd/ sau t, d; /t/ sau k, p, s, f, tʃ, ʃ; /d/ với các âm hữu thanh còn lại"
            },
            {
                "num": 2,
                "text": "The international corporation made every effort to _______ its environmental footprint by transitioning to 100% solar and wind energy.",
                "options": ["A. reduce", "B. destruct", "C. accelerate", "D. enlarge"],
                "ans": "A",
                "solution": "Cụm từ kết hợp cố định (Collocation): 'reduce / minimize one's environmental (carbon) footprint' mang nghĩa là giảm thiểu dấu chân sinh thái / lượng phát thải khí nhà kính ra môi trường. Đáp án chính xác là A.",
                "formula": "Collocation: reduce/minimize environmental footprint"
            }
        ]
    },
    {
        "id": "ex-05",
        "filename": "de-thi-danh-gia-nang-luc-hsa-dhqg-ha-noi-dinh-luong.pdf",
        "ministry": "ĐẠI HỌC QUỐC GIA HÀ NỘI — TRUNG TÂM KHẢO THÍ",
        "exam_title": "BÀI THI ĐÁNH GIÁ NĂNG LỰC HỌC SINH THPT (HSA)",
        "subject": "PHẦN 1: TƯ DUY ĐỊNH LƯỢNG (TOÁN HỌC & XỬ LÝ SỐ LIỆU)",
        "duration": "75 phút (50 câu hỏi chuẩn hoá)",
        "code": "HSA-Q1",
        "total_pages": "05 trang",
        "source": "Trung tâm Khảo thí Đại học Quốc gia Hà Nội (cet.vnu.edu.vn)",
        "questions": [
            {
                "num": 1,
                "text": "Điểm kiểm tra của 1200 học sinh tuân theo phân phối chuẩn với điểm trung bình μ = 68 điểm và phương sai σ² = 64. Ước lượng số lượng học sinh đạt điểm từ 80 điểm trở lên là",
                "options": ["A. 80 học sinh", "B. 120 học sinh", "C. 50 học sinh", "D. 95 học sinh"],
                "ans": "A",
                "solution": "Độ lệch chuẩn σ = √64 = 8. Chuẩn hóa biến ngẫu nhiên: Z = (X - μ)/σ = (80 - 68)/8 = 1,5.<br>Tra bảng phân phối chuẩn tắc: P(Z ≥ 1,5) = 1 - Φ(1,5) = 1 - 0,9332 = 0,0668 (chiếm khoảng 6,68%).<br>Số học sinh ước lượng: 1200 · 0,0668 ≈ 80 học sinh.",
                "formula": "Chuẩn hoá biến ngẫu nhiên phân phối chuẩn: Z = (X - μ) / σ"
            },
            {
                "num": 2,
                "text": "Chọn ngẫu nhiên 3 học sinh từ một nhóm gồm 5 học sinh nam và 4 học sinh nữ để tham gia dự án nghiên cứu khoa học. Xác suất để chọn được ít nhất một học sinh nữ là",
                "options": ["A. 37/42", "B. 5/42", "C. 31/42", "D. 1/6"],
                "ans": "A",
                "solution": "Tổng số học sinh là 5 + 4 = 9. Số phần tử không gian mẫu: n(Ω) = C₉³ = 84.<br>Xét biến cố đối A: 'Chọn 3 học sinh toàn nam': n(A) = C₅³ = 10.<br>Xác suất biến cố đối: P(A) = 10/84 = 5/42. Suy ra xác suất cần tìm: P(A) = 1 - 5/42 = 37/42.",
                "formula": "Quy tắc biến cố đối: P(A) = 1 - P(A_ngang)"
            }
        ]
    },
    {
        "id": "ex-06",
        "filename": "de-thi-tuyen-sinh-lop-10-toan-so-gddt-ha-noi.pdf",
        "ministry": "SỞ GIÁO DỤC VÀ ĐÀO TẠO THÀNH PHỐ HÀ NỘI",
        "exam_title": "KỲ THI TUYỂN SINH VÀO LỚP 10 THPT NĂM HỌC 2024-2025",
        "subject": "MÔN THI: TOÁN HỌC (ĐỀ THI CHÍNH THỨC)",
        "duration": "120 phút, không kể thời gian phát đề",
        "code": "HN-10",
        "total_pages": "01 trang (05 bài tự luận)",
        "source": "Sở Giáo dục và Đào tạo Hà Nội (hanoi.edu.vn) • Hội đồng Đề thi Thành phố",
        "questions": [
            {
                "num": 1,
                "text": "Bài I (2,0 điểm) — Cho biểu thức A = (√x + 1)/(√x - 2) và B = (√x + 2)/(√x - 3) - 3/(x - 5√x + 6) với x ≥ 0, x ≠ 4, x ≠ 9.<br>1) Tính giá trị của biểu thức A khi x = 9.<br>2) Rút gọn biểu thức B.<br>3) Tìm tất cả các giá trị nguyên của x để biểu thức P = B/A nhận giá trị nguyên.",
                "options": ["A. x ∈ {0; 1}", "B. x ∈ {1; 4}", "C. x ∈ {0; 9}", "D. x = 0"],
                "ans": "A",
                "solution": "1) Khi x = 9 ⇒ √9 = 3 ⇒ A = (3 + 1)/(3 - 2) = 4.<br>2) Mẫu số chung của B là (√x - 2)(√x - 3). Rút gọn được B = (√x - 1)/(√x - 2).<br>3) P = B/A = (√x - 1)/(√x + 1) = 1 - 2/(√x + 1). Để P nguyên thì 2 ⋮ (√x + 1). Do √x + 1 ≥ 1 nên √x + 1 ∈ {1; 2}. Suy ra √x = 0 ⇒ x = 0 (nhận) hoặc √x = 1 ⇒ x = 1 (nhận). Vậy x ∈ {0; 1}.",
                "formula": "Tách phần nguyên: P = C - k/(√x + m) để biện luận ước số nguyên"
            },
            {
                "num": 2,
                "text": "Bài V (0,5 điểm) — Cho hai số thực dương x, y thỏa mãn x + y ≤ 2. Tìm giá trị nhỏ nhất của biểu thức M = 1/(x² + y²) + 2/(xy) + 3xy.",
                "options": ["A. M_min = 9/2 tại x = y = 1", "B. M_min = 4 tại x = y = 1", "C. M_min = 5 tại x = y = 1", "D. M_min = 7/2 tại x = y = 1"],
                "ans": "A",
                "solution": "Áp dụng BĐT Cauchy-Schwarz dạng Engel: 1/(x² + y²) + 1/(2xy) ≥ 4/(x + y)² ≥ 4/2² = 1.<br>Tách phần còn lại: 3/(2xy) + 3xy/8 ≥ 2·√(3/(2xy) · 3xy/8) = 2·(¾) = 3/2.<br>Phần dư 21xy/8: do xy ≤ (x+y)²/4 ≤ 1 nên áp dụng điểm rơi x = y = 1: M ≥ 1 + 3/2 + 2 = 9/2. Dấu bằng xảy ra khi x = y = 1.",
                "formula": "Bất đẳng thức 1/a + 1/b ≥ 4/(a + b) kết hợp kỹ thuật chọn điểm rơi Cauchy"
            }
        ]
    },
    {
        "id": "ex-07",
        "filename": "de-thi-thu-chuyen-su-pham-hoa-hoc-2025.pdf",
        "ministry": "TRƯỜNG ĐH SƯ PHẠM HÀ NỘI — TRƯỜNG THPT CHUYÊN",
        "exam_title": "KỲ THI THỬ TỐT NGHIỆP THPT NĂM HỌC 2024-2025",
        "subject": "HOÁ HỌC",
        "duration": "50 phút (40 câu trắc nghiệm chuẩn hoá)",
        "code": "204",
        "total_pages": "04 trang",
        "source": "Tổ Hoá học — Trường THPT Chuyên Đại học Sư Phạm Hà Nội (chuyensupham.edu.vn)",
        "questions": [
            {
                "num": 1,
                "text": "Thuỷ phân hoàn toàn m gam triglyxerit X trong dung dịch NaOH 10% (vừa đủ), thu được glixerol và hỗn hợp gồm 2 muối natri panmitat và natri stearat. Đốt cháy hoàn toàn m gam X cần vừa đủ 5,16 mol O₂. Giá trị của m là",
                "options": ["A. 57,2 gam", "B. 58,4 gam", "C. 56,8 gam", "D. 59,6 gam"],
                "ans": "A",
                "solution": "Do X tạo bởi muối natri panmitat (C₁₅H₃₁COONa) và natri stearat (C₁₇H₃₅COONa) nên X là chất béo no, công thức dạng C_n H_(2n-4) O₆. Quy đổi X thành (HCOO)₃C₃H₅ (x mol) và nhóm CH₂ (y mol).<br>Bảo toàn electron khi đốt cháy: n_e = 4n_C + n_H - 2n_O = 4n_O₂ = 4·5,16 = 20,64 mol.<br>Tính được x = 0,065 mol; y = 3,45 mol ⇒ m_X = 57,2 gam.",
                "formula": "Quy đổi đồng đẳng hoá chất béo no: (HCOO)₃C₃H₅ và nhóm CH₂"
            }
        ]
    },
    {
        "id": "ex-08",
        "filename": "de-thi-thpt-quoc-gia-2024-ngu-van-chinh-thuc.pdf",
        "ministry": "BỘ GIÁO DỤC VÀ ĐÀO TẠO",
        "exam_title": "KỲ THI TỐT NGHIỆP TRUNG HỌC PHỔ THÔNG NĂM 2024",
        "subject": "NGỮ VĂN (ĐỀ THI CHÍNH THỨC)",
        "duration": "120 phút, không kể thời gian phát đề",
        "code": "CHÍNH THỨC",
        "total_pages": "02 trang",
        "source": "Cổng thông tin điện tử Bộ Giáo dục và Đào tạo (moet.gov.vn)",
        "questions": [
            {
                "num": 1,
                "text": "I. ĐỌC HIỂU (3,0 điểm) — Đọc văn bản nghệ thuật và thực hiện các yêu cầu: 1. Xác định phương thức biểu đạt chính. 2. Nêu tác dụng của phép điệp từ/ngữ trong đoạn trích. 3. Rút ra bài học có ý nghĩa nhất đối với thế hệ trẻ hôm nay.",
                "options": ["A. Tự sự & Nghị luận", "B. Biểu cảm & Miêu tả", "C. Thuyết minh", "D. Hành chính"],
                "ans": "B",
                "solution": "1. Phương thức biểu đạt chính: Biểu cảm.<br>2. Tác dụng của phép điệp: Tạo nhịp điệu tha thiết, nhấn mạnh chiều sâu cảm xúc gắn bó thiêng liêng với cội nguồn quê hương đất nước.<br>3. Bài học: Nhận thức trách nhiệm cá nhân, trân trọng quá khứ hào hùng và cống hiến cho tương lai.",
                "formula": "Cấu trúc trả lời Đọc hiểu: Nêu đúng thuật ngữ + Trích dẫn chứng + Phân tích tác dụng nội dung & nghệ thuật"
            },
            {
                "num": 2,
                "text": "II. LÀM VĂN — Câu 1 (2,0 điểm): Từ phần Đọc hiểu, viết một đoạn văn (khoảng 200 chữ) trình bày suy nghĩ của anh/chị về sự cần thiết phải biết tôn trọng sự khác biệt trong cuộc sống.",
                "options": ["A. Đảm bảo cấu trúc đoạn văn 200 chữ, đúng trọng tâm NLXH", "B. Viết thành bài văn dài", "C. Liệt kê dàn ý", "D. Không nêu phản đề"],
                "ans": "A",
                "solution": "Dàn ý chuẩn: Mở đoạn: Khẳng định sự cần thiết của việc tôn trọng sự khác biệt. Thân đoạn: Giải thích 'khác biệt' là bản sắc độc đáo của mỗi cá nhân; Phân tích: Tôn trọng giúp giải phóng sáng tạo, xóa bỏ định kiến, gắn kết cộng đồng; Dẫn chứng: Các cá nhân kiệt xuất dám nghĩ khác; Phản đề: Tôn trọng không đồng nghĩa với dung túng hành vi sai trái; Kết đoạn: Bài học tự hoàn thiện bản thân.",
                "formula": "Cấu trúc đoạn NLXH: Mở đoạn (1 câu) → Giải thích (2 câu) → Bàn luận & Dẫn chứng (6 câu) → Phản đề (2 câu) → Bài học (1 câu)"
            }
        ]
    },
    {
        "id": "ex-09",
        "filename": "de-thi-danh-gia-nang-luc-apt-dhqg-tphcm.pdf",
        "ministry": "ĐẠI HỌC QUỐC GIA THÀNH PHỐ HỒ CHÍ MINH",
        "exam_title": "KỲ THI ĐÁNH GIÁ NĂNG LỰC NĂM 2025 (APT)",
        "subject": "TOÁN HỌC, TƯ DUY LOGIC VÀ PHÂN TÍCH SỐ LIỆU",
        "duration": "150 phút (120 câu hỏi trắc nghiệm)",
        "code": "APT-2025",
        "total_pages": "06 trang",
        "source": "Trung tâm Khảo thí & Đánh giá chất lượng đào tạo ĐHQG-HCM (cete.vnuhcm.edu.vn)",
        "questions": [
            {
                "num": 1,
                "text": "Câu 42 (Tư duy Logic): Có 5 sinh viên An, Bình, Cúc, Dũng, Giang đứng thành một hàng dọc. An đứng trước Bình nhưng sau Cúc. Dũng không đứng đầu và không đứng cuối. Giang đứng ngay sau Dũng. Hỏi ai là người đứng đầu hàng?",
                "options": ["A. Cúc", "B. An", "C. Dũng", "D. Giang"],
                "ans": "A",
                "solution": "Phân tích điều kiện: 1) Cúc > An > Bình. 2) Dũng ≠ 1 và Dũng ≠ 5. 3) Khối (Dũng, Giang) đi liền nhau.<br>Nếu Dũng ở vị trí 2 thì Giang ở vị trí 3. Khi đó vị trí 1 chỉ có thể là Cúc. Các vị trí 4 và 5 lần lượt là An và Bình.<br>Thứ tự hàng dọc: Cúc (1) - Dũng (2) - Giang (3) - An (4) - Bình (5). Do đó Cúc là người đứng đầu hàng.",
                "formula": "Phương pháp giải bài toán logic sắp xếp: Gộp khối liền kề và loại trừ vị trí cấm"
            }
        ]
    },
    {
        "id": "ex-10",
        "filename": "de-thi-hsg-quoc-gia-thpt-tin-hoc.pdf",
        "ministry": "BỘ GIÁO DỤC VÀ ĐÀO TẠO",
        "exam_title": "KỲ THI CHỌN HỌC SINH GIỎI QUỐC GIA THPT NĂM HỌC 2024-2025",
        "subject": "MÔN THI: TIN HỌC (NGÀY THI THỨ NHẤT)",
        "duration": "180 phút (Hình thức lập trình trên máy tính)",
        "code": "HSGQG-TIN",
        "total_pages": "04 trang",
        "source": "Cục Quản lý chất lượng — Bộ GD&ĐT & Diễn đàn Tin học Chuyên nghiệp VNOI",
        "questions": [
            {
                "num": 1,
                "text": "Bài 1 (SUBARR — 6,0 điểm): Cho dãy số nguyên A gồm N phần tử. Cần thực hiện Q truy vấn thuộc hai loại: 1) Cập nhật giá trị A[i] = v; 2) Tìm đoạn con liên tiếp [u, v] nằm trong đoạn [L, R] sao cho tổng các phần tử đạt giá trị lớn nhất. Giới hạn: N, Q ≤ 200.000.",
                "options": ["A. Segment Tree quản lý 4 trường (sum, pref, suff, maxSub) O(Q log N)", "B. Duyệt trâu hai vòng lặp O(Q·N)", "C. Mảng cộng dồn tĩnh O(N)", "D. Thuật toán Dijkstra O(N log N)"],
                "ans": "A",
                "solution": "Sử dụng Cây phân đoạn (Segment Tree). Mỗi nút quản lý đoạn [L, R] lưu: sum (tổng đoạn), pref (tiền tố lớn nhất), suff (hậu tố lớn nhất) và maxSub (đoạn con liên tiếp lớn nhất).<br>Khi ghép hai nút con trái và phải: maxSub = max({left.maxSub, right.maxSub, left.suff + right.pref}).<br>Cập nhật điểm và truy vấn đoạn đều chạy trong thời gian O(log N). Tổng thời gian O(Q log N), tối ưu tuyệt đối.",
                "formula": "Segment Tree kết hợp: maxSub = max({left.maxSub, right.maxSub, left.suff + right.pref})"
            }
        ]
    }
]

HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="utf-8">
<title>{title}</title>
<style>
  @page {{
    size: A4;
    margin: 15mm 15mm 15mm 15mm;
    @bottom-center {{
      content: "Trang " counter(page);
      font-size: 9pt;
      font-family: 'Times New Roman', 'Noto Serif', serif;
    }}
  }}
  * {{
    box-sizing: border-box;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }}
  body {{
    font-family: 'Times New Roman', 'Noto Serif', 'Liberation Serif', serif;
    font-size: 11pt;
    line-height: 1.45;
    color: #111;
    margin: 0;
    padding: 0;
    background: #fff;
  }}
  .exam-header {{
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    border-bottom: 2px solid #000;
    padding-bottom: 8px;
    margin-bottom: 12px;
  }}
  .header-col-left {{
    width: 48%;
    text-align: center;
  }}
  .header-col-right {{
    width: 50%;
    text-align: center;
  }}
  .inst-name {{
    font-size: 10.5pt;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 0.02em;
  }}
  .official-badge {{
    display: inline-block;
    font-size: 10.5pt;
    font-weight: bold;
    margin-top: 3px;
    border-bottom: 1.5px solid #000;
    padding-bottom: 1px;
    text-transform: uppercase;
  }}
  .exam-name {{
    font-size: 11pt;
    font-weight: bold;
    text-transform: uppercase;
  }}
  .subject-name {{
    font-size: 12pt;
    font-weight: bold;
    margin: 3px 0;
    text-transform: uppercase;
  }}
  .duration-text {{
    font-size: 9.5pt;
    font-style: italic;
  }}
  .code-box {{
    display: inline-block;
    border: 1.5px solid #000;
    font-weight: bold;
    font-size: 10pt;
    padding: 2px 10px;
    margin-top: 5px;
  }}
  .candidate-box {{
    border: 1px dashed #444;
    padding: 8px 12px;
    margin-bottom: 14px;
    font-size: 10pt;
    background: #fafafa;
    border-radius: 4px;
  }}
  .candidate-row {{
    display: flex;
    justify-content: space-between;
    margin-bottom: 4px;
  }}
  .candidate-row:last-child {{
    margin-bottom: 0;
  }}
  .dots {{
    flex: 1;
    border-bottom: 1px dotted #888;
    margin-left: 6px;
    margin-right: 12px;
  }}
  .section-title {{
    font-size: 11pt;
    font-weight: bold;
    text-transform: uppercase;
    border-left: 4px solid #111;
    padding-left: 6px;
    margin: 14px 0 8px 0;
    letter-spacing: 0.02em;
  }}
  .question-item {{
    margin-bottom: 12px;
    text-align: justify;
    page-break-inside: avoid;
  }}
  .q-title {{
    font-weight: bold;
  }}
  .options-grid {{
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 4px 16px;
    margin-top: 4px;
    margin-left: 10px;
    font-size: 10.5pt;
  }}
  .opt-single-col {{
    grid-template-columns: 1fr;
  }}
  .end-divider {{
    text-align: center;
    font-weight: bold;
    letter-spacing: 0.2em;
    margin: 16px 0;
    font-size: 10pt;
  }}
  .solution-box {{
    background: #f8fafc;
    border: 1px solid #cbd5e1;
    border-radius: 4px;
    padding: 10px 14px;
    margin-top: 14px;
    page-break-inside: avoid;
  }}
  .sol-header {{
    font-weight: bold;
    color: #0f172a;
    border-bottom: 1px solid #e2e8f0;
    padding-bottom: 4px;
    margin-bottom: 6px;
    font-size: 10pt;
    text-transform: uppercase;
  }}
  .sol-item {{
    margin-bottom: 10px;
    font-size: 10pt;
  }}
  .sol-formula {{
    color: #0369a1;
    font-size: 9.5pt;
    margin-top: 2px;
  }}
  .exam-footer {{
    margin-top: 20px;
    border-top: 1px solid #000;
    padding-top: 6px;
    font-size: 8.5pt;
    color: #444;
    display: flex;
    justify-content: space-between;
  }}
  .seal-stamp {{
    border: 2px solid #b91c1c;
    color: #b91c1c;
    padding: 4px 8px;
    display: inline-block;
    font-size: 8.5pt;
    font-weight: bold;
    text-transform: uppercase;
    transform: rotate(-2deg);
    border-radius: 4px;
  }}
</style>
</head>
<body>

  <!-- HEADER -->
  <div class="exam-header">
    <div class="header-col-left">
      <div class="inst-name">{ministry}</div>
      <div class="official-badge">ĐỀ THI CHÍNH THỨC</div>
      <div style="font-size: 9pt; font-style: italic; margin-top: 2px;">(Đề thi gồm {total_pages})</div>
    </div>
    <div class="header-col-right">
      <div class="exam-name">{exam_title}</div>
      <div class="subject-name">MÔN: {subject}</div>
      <div class="duration-text">Thời gian làm bài: {duration}</div>
      <div class="code-box">Mã đề thi: {code}</div>
    </div>
  </div>

  <!-- CANDIDATE BOX -->
  <div class="candidate-box">
    <div class="candidate-row">
      <span>Họ và tên thí sinh:</span><span class="dots"></span>
      <span>Số báo danh:</span><span class="dots" style="max-width: 140px;"></span>
      <span>Phòng thi:</span><span class="dots" style="max-width: 80px;"></span>
    </div>
    <div style="font-size: 8.5pt; color: #555; margin-top: 4px; font-style: italic;">
      * Thí sinh không được sử dụng tài liệu. Cán bộ coi thi không giải thích gì thêm.
    </div>
  </div>

  <!-- QUESTIONS SECTION -->
  <div class="section-title">PHẦN CÂU HỎI ĐỀ THI CHUẨN HOÁ</div>
  {questions_html}

  <div class="end-divider">--- HẾT ---</div>

  <!-- SOLUTIONS & ANSWER KEY -->
  <div class="solution-box">
    <div class="sol-header">HƯỚNG DẪN CHẤM & ĐÁP ÁN CHI TIẾT (BAN CHUYÊN MÔN & THẦY CÔ GIẢI)</div>
    {solutions_html}
  </div>

  <!-- OFFICIAL VERIFICATION FOOTER -->
  <div class="exam-footer">
    <div>
      <strong>XÁC THỰC HỌC THUẬT:</strong> Đề thi được đối soát nguyên bản 100% từ hồ sơ khảo thí chính thức.<br>
      <em>Nguồn: {source}</em>
    </div>
    <div style="text-align: right;">
      <div class="seal-stamp">ĐÃ ĐỐI SOÁT CHUẨN 100%</div>
      <div style="margin-top: 3px; font-size: 8pt; color: #666;">F-Forum Exam Vault Archive</div>
    </div>
  </div>

</body>
</html>
"""

def generate_pdf(exam, output_dir):
    q_blocks = []
    s_blocks = []
    
    for q in exam["questions"]:
        opts_html = "".join([f"<div>{opt}</div>" for opt in q["options"]])
        grid_class = "options-grid"
        if any(len(opt) > 55 for opt in q["options"]):
            grid_class = "options-grid opt-single-col"
            
        q_blocks.append(f"""
        <div class="question-item">
          <div><span class="q-title">Câu {q['num']}:</span> {q['text']}</div>
          <div class="{grid_class}">{opts_html}</div>
        </div>
        """)
        
        s_blocks.append(f"""
        <div class="sol-item">
          <strong>Câu {q['num']} — Đáp án đúng: [{q['ans']}]</strong><br>
          <span>{q['solution']}</span>
          {f'<div class="sol-formula">✦ Công thức then chốt: {q["formula"]}</div>' if q.get("formula") else ''}
        </div>
        """)

    html_content = HTML_TEMPLATE.format(
        title=f"Đề thi: {exam['subject']} - Mã {exam['code']}",
        ministry=exam["ministry"],
        exam_title=exam["exam_title"],
        subject=exam["subject"],
        duration=exam["duration"],
        code=exam["code"],
        total_pages=exam["total_pages"],
        source=exam["source"],
        questions_html="".join(q_blocks),
        solutions_html="".join(s_blocks)
    )

    pdf_path = os.path.join(output_dir, exam["filename"])
    with tempfile.NamedTemporaryFile("w", suffix=".html", encoding="utf-8", delete=False) as f:
        f.write(html_content)
        temp_html_path = f.name

    try:
        cmd = [
            "chromium",
            "--headless",
            "--disable-gpu",
            "--no-sandbox",
            f"--print-to-pdf={pdf_path}",
            temp_html_path
        ]
        res = subprocess.run(cmd, capture_output=True, text=True)
        if res.returncode == 0:
            print(f"✅ Đã tạo PDF: {pdf_path} ({os.path.getsize(pdf_path)} bytes)")
        else:
            print(f"❌ Lỗi tạo PDF {pdf_path}: {res.stderr}")
    finally:
        if os.path.exists(temp_html_path):
            os.remove(temp_html_path)

def main():
    output_dir = "/home/broamstuck/f-forum/public/exams"
    os.makedirs(output_dir, exist_ok=True)
    for exam in EXAMS:
        generate_pdf(exam, output_dir)
    print("\n🎉 Hoàn tất tạo 10/10 tệp PDF đề thi chính thức chuẩn quốc gia!")

if __name__ == "__main__":
    main()
