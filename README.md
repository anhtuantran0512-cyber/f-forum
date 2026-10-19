# F-Forum

**Diễn đàn học tập cho học sinh, sinh viên** — đặt câu hỏi, chia sẻ lời giải, sinh hoạt câu lạc bộ và lưu lại kỷ niệm học đường.

<div align="center">

![React](https://img.shields.io/badge/React_19-20232A?style=flat&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript_5-007ACC?style=flat&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite_6-646CFF?style=flat&logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS_v4-38B2AC?style=flat&logo=tailwind-css&logoColor=white)

[Website](https://f-forum.vercel.app) · [Đặc tả](docs/SPEC.md) · [Bảo mật](docs/SECURITY.md) · [Thiết kế](docs/UI_UX_10_STYLE_ARCHITECTURE.md)

</div>

---

## Giới thiệu

F-Forum gom việc học và sinh hoạt cộng đồng vào một chỗ: hỏi đáp theo môn, chat thời gian thực, câu lạc bộ, kho đề thi, điểm danh và trang trí hồ sơ. Giao diện kính mờ, chạy tốt trên máy tính lẫn điện thoại, có chế độ sáng/tối và các tùy chọn tiết kiệm tài nguyên.

## Tính năng

**Học tập**
- Hỏi đáp theo môn (Toán, Lý, Hóa, Văn, Anh, Tin...) với công cụ soạn ký hiệu toán, đính kèm ảnh và thưởng Coin cho câu trả lời hay.
- Lưu câu hỏi, sắp xếp theo mới nhất / thưởng cao / sôi nổi / chưa giải, tự lưu bản nháp khi đang soạn.
- Kho đề thi có đề chính thức, trình xem PDF, flashcard và nộp bài.

**Cộng đồng**
- Chat thời gian thực, nhắc tên, reaction và tố cáo vi phạm.
- Câu lạc bộ: gửi hồ sơ thành lập, duyệt thành viên, đăng hoạt động.
- Miền Ký Ức, Khu Vinh Danh và bảng xếp hạng.

**Động lực học**
- Điểm danh 15 ngày, câu hỏi vui mỗi ngày và chuỗi streak.
- 8 cấp bậc học đường theo Coin.
- Boutique trang trí: khung avatar, hiệu ứng, bảng tên; gacha, mua lẻ, tủ đồ và wishlist.

**Trải nghiệm**
- Kính mờ, sáng/tối, thanh điều hướng 4 vị trí, bảng lệnh nhanh (`Ctrl/⌘ + K`), sổ tay nhanh, Focus Mode và nhắc nghỉ mắt.
- Chế độ tiết kiệm tài nguyên (Potator) và hiệu ứng Fabulous — tùy chọn, mặc định tắt.

**Quản trị**
- Bảng điều khiển, duyệt CLB, xử lý tố cáo, phân quyền Giáo viên/Moderator và nhật ký kiểm duyệt.
- Insights Bento về truy cập và hoạt động cộng đồng.

## Công nghệ

React 19 · TypeScript · Vite 6 · Tailwind CSS v4 · WebSocket · Node.js Test Runner · Oxlint · Vercel Functions

## Cài đặt

Yêu cầu **Node.js 18+**.

```bash
git clone https://github.com/anhtuantran0512-cyber/f-forum.git
cd f-forum
npm install
cp .env.example .env
npm run dev
```

Mở `http://localhost:5173`.

> Không có tài khoản quản trị mặc định. Trước khi đăng nhập Super Admin, đặt `FFORUM_ADMIN_PASSWORD` (tối thiểu 16 ký tự) trong `.env` hoặc secret manager.

### Lệnh thường dùng

| Lệnh | Việc |
| --- | --- |
| `npm run dev` | Chạy dev server |
| `npm run build` | Build production (`tsc -b` + Vite) |
| `npm test` | Chạy bộ kiểm thử |
| `npm run lint` | Quét lỗi bằng Oxlint |
| `npm run public` | Hosting công khai nhanh — không dùng cho production |

## Kiểm thử & chất lượng

```bash
npm test
npx tsc -b
npm run lint
node scripts/generate-light-adapter.mjs --check
```

Bộ kiểm thử chạy trên Node Test Runner, phủ giao diện, luồng nghiệp vụ, bảo mật, responsive và các trạng thái theme.

## Cấu trúc

```text
src/        Giao diện React (components, views, store, utils)
server/     API + WebSocket (auth, moderation, economy, analytics)
shared/     Kiểu dữ liệu dùng chung client & server
public/     Tài nguyên tĩnh (trang trí, video, âm thanh)
api/        Vercel serverless entry
tests/      Bộ kiểm thử tự động
docs/       Đặc tả, bảo mật, thiết kế và tài liệu kỹ thuật
scripts/    Công cụ build và xử lý tài nguyên
```

## Triển khai

- **Production**: Vercel — cấu hình trong `vercel.json`, serverless functions trong `api/`. Push lên `main` là bản mới được build và phát hành.
- **GitHub Pages**: workflow trong `.github/workflows/`.
- **Dữ liệu**: trỏ `FFORUM_DATA_DIR` vào ổ lưu bền vững và chạy sau HTTPS.

## Bảo mật

- Mật khẩu băm `scrypt` + salt; phiên đăng nhập ký `HMAC-SHA256`.
- Máy chủ xác thực quyền và dữ liệu nhạy cảm; không tin vai trò do client khai.
- Giới hạn tần suất chống brute-force; WebSocket phải xác thực trước khi truy cập dữ liệu.
- Đăng nhập Google/Facebook được kiểm chứng token phía máy chủ.

Chi tiết: [docs/SECURITY.md](docs/SECURITY.md).

## Tài liệu

- [docs/SPEC.md](docs/SPEC.md) — đặc tả hệ thống
- [docs/SECURITY.md](docs/SECURITY.md) — kiểm định an ninh
- [docs/BRAND_GUIDELINE.md](docs/BRAND_GUIDELINE.md) — nhận diện thương hiệu
- [docs/UI_UX_10_STYLE_ARCHITECTURE.md](docs/UI_UX_10_STYLE_ARCHITECTURE.md) — kiến trúc giao diện
- [docs/decorations/README.md](docs/decorations/README.md) — pipeline tài nguyên trang trí

## Bản quyền

**Bản quyền trí tuệ thuộc về BroAmStuck.** Vui lòng không sao chép, phân phối lại hoặc dùng cho mục đích thương mại khi chưa có sự đồng ý bằng văn bản.
