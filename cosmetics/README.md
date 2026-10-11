# F-Forum Cosmetics Assets (Tài nguyên trang trí F-Forum)

Bộ tài nguyên đồ họa trang trí hồ sơ người dùng (Discord-style Cosmetic System) dành cho F-Forum:

## 1. Danh mục tài nguyên

- **`avatar_border/`**: Bộ khung viền trang trí đại diện (Avatar Decoration Frames).
  - Định dạng gốc: **Animated APNG (288×288)** gồm 638 khung viền hoạt cảnh cao cấp.
  - Được chia nhỏ thành 23 tệp (`avatar_1.zip` đến `avatar_23.zip`, mỗi tệp ≤ 25 MB) để tuân thủ giới hạn tệp của GitHub.
- **`nameplate.zip`**: Bộ bảng tên / banner hồ sơ động (Animated Nameplates).
  - Dung lượng: ~24 MB.
  - Định dạng: 236 video **WebM** chất lượng cao (các hiệu ứng vũ trụ, hào quang, cờ, chủ đề công nghệ).

## 2. Hướng dẫn ghép lại `avatar_border.zip`

Để ghép 23 phần nhỏ thành file `avatar_border.zip` nguyên vẹn 100%:

### Trên Linux / macOS:
```bash
cat cosmetics/avatar_border/avatar_{1..23}.zip > avatar_border.zip
```

### Trên Windows (PowerShell):
```powershell
Get-Content (1..23 | ForEach-Object { "cosmetics\avatar_border\avatar_$_.zip" }) -Encoding Byte -ReadCount 0 | Set-Content avatar_border.zip -Encoding Byte
```

Sau khi ghép, bạn có thể giải nén `avatar_border.zip` để lấy toàn bộ 638 tệp khung avatar PNG.
