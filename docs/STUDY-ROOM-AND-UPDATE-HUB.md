# 🧠 F-Forum v2.4.0 — Phòng Ôn Tập & Bảng tin Cập nhật

> Tài liệu ghi lại **hai phân khu mới** của F-Forum: **Phòng Ôn Tập** (flashcard + luyện đề theo nhịp lặp lại ngắt quãng)
> và **Bảng tin Cập nhật** (thay thế hoàn toàn trang placeholder “Comming soon”).
> Ngày thực hiện: 04/10/2026 · Nhánh: `arena/01a1055a-f-forum`

---

## 1. Vì sao thêm hai phân khu này?

| Vấn đề trước đây | Cách giải quyết trong v2.4.0 |
|---|---|
| Học sinh chỉ có thể **hỏi đáp** nhưng không có công cụ **tự ôn** trước kỳ kiểm tra. | **Phòng Ôn Tập**: bộ thẻ ghi nhớ + lịch ôn ngắt quãng + luyện đề trắc nghiệm. |
| Trang **UPDATE** chỉ hiển thị “Comming soon!!!” — không cho học sinh biết dự án đang thay đổi điều gì. | **Bảng tin Cập nhật**: nhật ký phát hành theo phiên bản, lộ trình minh bạch và biểu mẫu đề xuất tính năng. |
| Tiến độ học tập không được lưu ở đâu ngoài XP tổng. | Mỗi lượt ôn/luyện đề đều được lưu thành **phiên ôn tập** có mốc thời gian, điểm số và XP nhận được. |

---

## 2. Phòng Ôn Tập (route `study`)

### 2.1. Mô hình dữ liệu

```ts
interface StudyCard {
  id: string;
  front: string;            // câu hỏi / khái niệm
  back: string;             // đáp án
  hint?: string;            // gợi ý tuỳ chọn
  box: number;              // hộp Leitner 0..5
  dueAt: number;            // mốc thời gian được ôn lại (epoch ms)
  lapses: number;           // số lần tự nhận “quên”
  reviews: number;          // tổng số lượt đã ôn
  lastReviewedAt?: number;
  createdAt: number;
}

interface StudyDeck {
  id: string; title: string; description: string;
  subject: SubjectTag;      // dùng chung nhãn môn học với sàn Hỏi đáp
  ownerId: string; ownerName: string; ownerAvatar?: string;
  cards: StudyCard[];
  isPublic: boolean;        // cho phép học sinh khác xem & sao chép
  starredBy?: string[];     // danh sách người đã lưu
  createdAt: number; updatedAt: number;
}

interface StudySession {
  id: string; deckId: string; deckTitle: string;
  userId: string; userName: string;
  mode: 'review' | 'quiz';
  correct: number; total: number; scorePct: number;
  xpAwarded: number; createdAt: number;
}
```

### 2.2. Động cơ lặp lại ngắt quãng (`src/store/studyLogic.ts`)

- **6 hộp Leitner** với khoảng cách: `0 phút → 10 phút → 1 ngày → 3 ngày → 7 ngày → 21 ngày`.
- Chấm điểm 4 mức:

| Mức | Hộp sau khi chấm | Lịch ôn kế tiếp | XP |
|---|---|---|---|
| Quên rồi | 0 | +1 phút (và xuất hiện lại ngay trong phiên) | 0 |
| Khó | giữ nguyên, tối thiểu hộp 1 | ít nhất 5 phút | 1 |
| Được | +1 hộp (trần hộp 5) | theo khoảng cách hộp mới | 2 |
| Dễ | +2 hộp (trần hộp 5) | theo khoảng cách hộp mới | 3 |

- Thẻ ở hộp 5 được coi là **đã thuộc** và hiển thị trên vòng tiến độ của bộ thẻ.
- Toàn bộ hàm là **hàm thuần**: `createStudyCard`, `reviewStudyCard`, `getDeckStats`, `estimateNextIntervalMs`,
  `buildQuizQuestions`, `computeQuizScore`, `calculateReviewXP`, `calculateQuizXP`, `parseBulkCards`, `sanitizeDeck`,
  `getStudyDayWindow`, `formatInterval`, `formatDueLabel`.

### 2.3. Luyện đề trắc nghiệm

- Sinh đề **tất định theo seed** (mulberry32) nên có thể kiểm thử: cùng seed → cùng đề.
- Cần tối thiểu **3 thẻ có mặt sau khác nhau** để tạo 3 phương án nhiễu + 1 đáp án đúng.
- Mỗi câu có **20 giây**, phím tắt `1–4` để chọn, `Enter` để sang câu tiếp; hết giờ tự khoá và tính là câu sai.
- Thưởng XP: `4 × số câu đúng`, cộng thêm **+25 XP** khi đạt ≥ 80% và **+25 XP** nữa khi đạt 100%.

### 2.4. Phiên ôn tập & đồng bộ

- `gradeStudyCard` cập nhật **cục bộ** trong suốt phiên để không làm gián đoạn trải nghiệm.
- Khi kết thúc phiên (hoặc rời giữa chừng), `recordStudySession` sẽ:
  1. Lưu `StudySession` vào lịch sử (giới hạn 200 phiên gần nhất ở máy khách, 500 ở máy chủ).
  2. Đẩy bộ thẻ lên máy chủ qua `POST /api/study/deck` và phát `SYNC_DECK` cho các thiết bị khác.
  3. Cộng XP + Coin cho chính người học và đồng bộ qua `POST /api/users/update`.
- Trần XP mỗi phiên ôn thẻ là **120 XP** để tránh việc “cày” thẻ dễ quá nhanh.

### 2.5. Điểm cuối máy chủ

| Phương thức | Đường dẫn | Chức năng |
|---|---|---|
| `GET` | `/api/study` | Trả về toàn bộ bộ thẻ và phiên ôn tập |
| `POST` | `/api/study/deck` | Tạo/cập nhật bộ thẻ, phát sóng `SYNC_DECK` |
| `POST` | `/api/study/deck/delete` | Xoá bộ thẻ (chỉ chủ sở hữu hoặc Super Admin), phát sóng `DELETE_DECK` |
| `POST` | `/api/study/session` | Lưu phiên ôn tập, phát sóng `STUDY_SESSION` |
| `GET` | `/api/sync` | Nay bao gồm `studyDecks` và `studySessions` |

> **Lưu ý tránh cộng trùng XP**: phần thưởng do máy khách cộng và đẩy qua `/api/users/update`;
> `/api/study/session` chỉ lưu lịch sử và phát sóng, **không** cộng thêm XP.

### 2.6. Giao diện

- `src/components/views/StudyRoomView.tsx` — thư viện bộ thẻ (4 tab: *Bộ thẻ của tôi*, *Khám phá*, *Đã lưu*, *Lịch sử ôn tập*),
  thống kê tổng quan, biểu đồ XP 7 ngày, bảng nhịp ôn 6 hộp, danh sách bộ thẻ cộng đồng.
- `src/components/study/DeckEditorModal.tsx` — soạn bộ thẻ, sửa từng thẻ, nhập nhanh hàng loạt, chọn môn, bật/tắt chia sẻ.
- `src/components/study/ReviewSessionModal.tsx` — thẻ lật 3D, 4 nút tự đánh giá kèm mốc ôn dự kiến, phím tắt `Space`/`1–4`.
  Modal được mount mới cho mỗi bộ thẻ (`key={deck.id}`) nên state phiên luôn sạch.
- `src/components/study/QuizSessionModal.tsx` — luyện đề có đồng hồ, phản hồi đúng/sai tức thì và bảng xem lại câu sai.

---

## 3. Bảng tin Cập nhật (route `coming-soon`, nhãn navbar `CẬP NHẬT`)

### 3.1. Dữ liệu (`src/data/changelog.ts`)

- `RELEASES`: 6 mốc phát hành thật của dự án (v1.0.0 → v2.4.0) với `version`, `date`, `codename`, `title`, `summary`,
  và danh sách `highlights` gắn nhãn `feature | improvement | fix | security`.
- `ROADMAP`: 8 hạng mục với `status` (`shipped | in-progress | planned | exploring`), `progress` (0–100) và `horizon`.
- `RELEASE_KIND_META`, `ROADMAP_STATUS_META`, `formatReleaseDate`, `CURRENT_VERSION`, `CURRENT_RELEASE_DATE`.

### 3.2. Giao diện (`src/components/views/UpdateHubView.tsx`)

1. **Hero**: phiên bản đang chạy, ngày phát hành, 4 ô đếm (số bản phát hành, số thay đổi đã ghi, đã hoàn thành, đang triển khai),
   6 ô số liệu nền tảng lấy trực tiếp từ store.
2. **Nhật ký phát hành** dạng dòng thời gian, lọc theo loại thay đổi.
3. **Lộ trình** dạng thẻ có thanh tiến độ và trạng thái màu.
4. **Biểu mẫu đề xuất tính năng** (tối thiểu 20 ký tự, lưu vào `fforum_feedbacks` + gửi `POST /api/feedback`,
   hiển thị lại 5 góp ý gần nhất của chính người dùng).
5. **Quy trình cập nhật** minh bạch 4 bước (nhánh riêng → kiểm thử + kiểm tra kiểu → Pull Request → nhánh chính).

### 3.3. Thay đổi kèm theo

- Xoá `src/components/views/ComingSoonView.tsx` (không còn màn hình “Comming soon”).
- Navbar: nhãn `UPDATE` → `CẬP NHẬT`, đồng thời thêm mục `ÔN TẬP` (icon `Brain`) vào thanh điều hướng.
- `RadialQuickMenu`: thêm nút **Ôn tập** cạnh các tác vụ nhanh.
- Store: thêm state `feedbacks` để giao diện hiển thị ngay góp ý vừa gửi.

---

## 4. Kiểm thử & chất lượng

- `tests/study-room.test.mjs` (9 bài): động cơ Leitner, thống kê bộ thẻ, nhãn thời gian, sinh đề trắc nghiệm & chấm điểm,
  XP thưởng, nhập nhanh/dữ liệu bẩn, cửa sổ ngày, **đồng bộ REST + WebSocket thật** (bao gồm phân quyền xoá bộ thẻ),
  và bất biến mã nguồn (giữ nguyên `CORE_SCROLL_VIEWS`).
- `tests/update-hub.test.mjs` (6 bài): tính hợp lệ của nhật ký phát hành & lộ trình, việc gỡ bỏ hoàn toàn placeholder,
  ràng buộc biểu mẫu (min 20 ký tự, `maxLength`, `role="status"`/`role="alert"`), state góp ý trong store, dòng bản quyền.
- Kết quả hiện tại: **71/71 bài kiểm thử đạt**, `oxlint` 0 lỗi (11 cảnh báo nền có từ trước), `tsc -b` sạch,
  `vite build` thành công với 2 gói lazy mới (`StudyRoomView` ~51 kB, `UpdateHubView` ~24 kB).

---

## 5. Ghi chú vận hành

- Bộ thẻ lưu ở khoá `fforum_study_decks`, phiên ôn ở `fforum_study_sessions` (đều thông qua `safeStorage`).
- Máy chủ lưu vào `data/forum-data.json` (thư mục `data/` đã nằm trong `.gitignore`), trần 1000 bộ thẻ và 500 phiên.
- Nếu chạy giao diện mà **không** có máy chủ Vite plugin (ví dụ mở tệp tĩnh), phòng ôn tập vẫn hoạt động đầy đủ ở chế độ
  một máy vì mọi thao tác đều ghi vào `safeStorage` trước.
