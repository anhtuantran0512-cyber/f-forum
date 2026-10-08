# Bảo mật & Toàn vẹn dữ liệu — F-Forum

Tài liệu này ghi lại các lỗ hổng thật đã tìm thấy trong mã nguồn, cách chúng bị
lợi dụng, và cách đã vá. Mỗi mục đều có bài kiểm thử tương ứng trong
`tests/security-hardening.test.mjs` chạy trên **máy chủ thật** qua HTTP/WebSocket.

---

## 1. Đăng nhập bỏ qua mật khẩu (chiếm tài khoản)

**Mức độ:** Nghiêm trọng · **Vị trí:** `POST /api/auth/login`

```ts
// TRƯỚC
const registeredPassword = store.passwords[email];
if (registeredPassword && registeredPassword !== password) { /* từ chối */ }
```

Tài khoản tạo qua Google/Facebook **không có bản ghi mật khẩu**, nên
`registeredPassword` là `undefined` → cả điều kiện bị bỏ qua → **mọi mật khẩu đều
được chấp nhận**.

```bash
# Tạo tài khoản qua social, rồi đăng nhập bằng mật khẩu bịa — vẫn nhận token:
curl -X POST /api/auth/social -d '{"provider":"google","email":"nannhan@gmail.com"}'
curl -X POST /api/auth/login  -d '{"email":"nannhan@gmail.com","password":"bat-ky"}'
# => 200 { success: true, token: "f_token_..." }   ← TRƯỚC KHI VÁ
```

**Đã vá:** không có bản ghi mật khẩu = không đăng nhập được bằng form; người dùng
được hướng dẫn sang đăng nhập mạng xã hội. So khớp dùng `crypto.timingSafeEqual`.

---

## 2. Mật khẩu lưu plaintext

**Mức độ:** Cao · **Vị trí:** `data/forum-data.json`

Toàn bộ mật khẩu được ghi thẳng ra đĩa (`"admin123"`). Ai đọc được tệp dữ liệu là
đọc được mọi mật khẩu.

**Đã vá:** băm `scrypt` (N=16384, r=8, p=1, 32 byte, salt 16 byte) dạng
`scrypt$<salt>$<hash>`. Dữ liệu cũ được **tự động băm lại lúc khởi động**, và bản
ghi plaintext còn sót được nâng cấp ngay lần đăng nhập thành công kế tiếp. Mật
khẩu Super Admin mẫu từng có trong mã nguồn đã bị loại; cả plaintext lẫn hash cũ
đều bị thu hồi. Cài mới không có mật khẩu quản trị nếu thiếu
`FFORUM_ADMIN_PASSWORD` đủ mạnh (tối thiểu 16 ký tự), hoặc OAuth server đã xác minh.

---

## 3. Tự phong SUPER_ADMIN qua WebSocket

**Mức độ:** Nghiêm trọng · **Vị trí:** WS `SYNC_USER`

```js
// TRƯỚC: ghi thẳng payload của client vào sổ tài khoản, không kiểm tra gì
case 'SYNC_USER':
  store.users[payload.email.toLowerCase()] = payload;
```

Bất kỳ client nào mở WebSocket đều tự tạo được tài khoản quản trị:

```js
ws.send(JSON.stringify({ type: 'SYNC_USER', payload: {
  email: 'hacker@x.com', role: 'SUPER_ADMIN', coin: 9999999, level: 150
}}));
// => /api/sync trả về role = "SUPER_ADMIN", coin = 9999999   ← TRƯỚC KHI VÁ
```

**Đã vá:** kết nối WS phải gửi `AUTH` kèm token hợp lệ; chỉ **chủ tài khoản** mới
sửa được hồ sơ của mình; `role` / `id` / `email`, `staffRole`, Premium và
`scopedClubIds` là trường server sở hữu, bị loại khỏi payload; `level` luôn được
tính lại từ `xp`.

---

## 4. Chiếm quyền quản trị qua đăng nhập xã hội

**Mức độ:** Nghiêm trọng · **Vị trí:** `POST /api/auth/social`

Endpoint nhận `email` **do client tự khai** và cấp tài khoản tương ứng — kể cả tài
khoản Super Admin — mà không hề kiểm chứng với Google/Facebook.

```bash
curl -X POST /api/auth/social -d '{"provider":"google","email":"BroAmStuck@gmail.com"}'
# => 200 { user: { role: "SUPER_ADMIN", level: 150 }, token: "f_token_..." }  ← TRƯỚC KHI VÁ
```

**Đã vá:** `server/socialAuth.ts` kiểm chứng access token với chính nhà cung cấp
(Google: `/oauth2/v3/userinfo`, Facebook: `/me` hoặc `/debug_token`) rồi **so khớp
email trong phản hồi với email client khai**. Email quản trị **bắt buộc** xác minh
thành công; tài khoản thường vẫn đăng nhập được ở chế độ demo chưa cấu hình OAuth.

---

## 5. Cổng quản trị chỉ nhìn `adminEmail` trong body

**Mức độ:** Nghiêm trọng · **Vị trí:** `/api/admin/about`, `/api/questions/delete`,
`/api/questions/edit`, `/api/solutions/delete`, `/api/chat/delete`,
`/api/solutions/best`, `/api/users/update`

```js
// TRƯỚC
if (adminEmail !== 'BroAmStuck@gmail.com') return 403;
```

`adminEmail` nằm trong body — ai cũng gõ được chuỗi đó. Tương tự,
`/api/solutions/best` tin `currentUserId`/`currentUserEmail` do client gửi.

**Đã vá:** mọi cổng này đòi token phiên có chữ ký HMAC, và email trong token phải
khớp tài khoản đang thao tác. Token giả/sửa một ký tự là vô hiệu.

---

## 6. In Coin vô hạn qua tiền thưởng

**Mức độ:** Cao · **Vị trí:** `POST /api/questions`, WS `MARK_BEST_SOLUTION`

- Đặt câu hỏi treo thưởng **không kiểm tra số dư**: tài khoản 100 Coin đặt được vô
  hạn câu thưởng 100 Coin (`Math.max(0, ...)` chỉ kẹp số dư về 0, câu hỏi vẫn tồn
  tại và người giải vẫn được trả thưởng).
- WS `MARK_BEST_SOLUTION` **không kiểm quyền và không idempotent**: gọi lại 5 lần
  là cộng 5 lần XP.
- WS `NEW_QUESTION` / `NEW_SOLUTION` cộng XP theo `authorId` client khai, không khử
  trùng → phát lại bao nhiêu lần cũng được.

**Đã vá:** kiểm tra số dư (thiếu thì `402`); email chưa đăng ký thì `bountyCoin = 0`;
chọn đáp án chuẩn đòi đúng tác giả hoặc Super Admin và chỉ phát thưởng **một lần**;
các bản ghi WS được khử trùng theo `id`; XP chỉ cấp qua đường HTTP đã xác thực.

---

## 7. Token phiên không kiểm chứng được

**Mức độ:** Cao · **Vị trí:** `f_token_${Date.now()}_${Math.random()...}`

Token chỉ là chuỗi ngẫu nhiên, server không lưu và không kiểm tra được → không
dùng để xác thực bất cứ thứ gì.

**Đã vá:** token có chữ ký `HMAC-SHA256` với khoá lấy từ `FFORUM_SESSION_SECRET`
(hoặc tệp `data/session-key` quyền `0600`), kèm hạn dùng 30 ngày. Vẫn giữ tiền tố
`f_token_` nên client cũ không bị đăng xuất.

---

## 8. Không chặn brute-force

**Đã vá:** `SlidingWindowRateLimiter` theo `IP + email` cho đăng nhập (12 lượt/10
phút), theo IP cho đăng ký (30/10 phút) và social (30/10 phút). Vượt ngưỡng trả
`429` kèm header `Retry-After`.

---

## 9. Rò rỉ timer ở luồng SSE

**Mức độ:** Trung bình · **Vị trí:** `GET /api/events`

```js
// TRƯỚC
req.on('close', () => sseClients.delete(res));   // không dọn interval
const heartbeat = setInterval(...);              // chạy mãi sau khi client ngắt
```

Mỗi lần reload trang rò một `setInterval` vĩnh viễn. `res.write` trên response đã
đóng **không ném lỗi** nên nhánh `catch` không bao giờ chạy.

**Đã vá:** dọn ở cả `req.close`, `req.error` và `res.close`, kiểm tra
`writableEnded`/`destroyed` trước khi ghi, và `unref()` timer. Test #15 đếm số kết
nối qua `/api/health` để chứng minh bộ đếm về 0.

---

## 10. Body quá lớn và JSON hỏng

**Đã vá:** `parseJsonBody` đếm byte và huỷ socket **ngay khi vượt 25 MB** (bản cũ
vẫn nạp hết vào RAM rồi mới huỷ), trả `413`; JSON hỏng trả `400` thay vì `500`;
thông điệp lỗi không còn rò `err.message` nội bộ.

---

## 11. Tác dụng phụ trong state updater (phía client)

**Mức độ:** Trung bình · **Vị trí:** `addXP()` trong `src/store/forumStore.ts`

`setCurrentUser`, `fetch`, `playChime`, `setToastMessage`, `pushNotification` đều
nằm **bên trong** `setUsers(prev => ...)`. React StrictMode gọi updater hai lần →
mỗi lần thưởng gửi **2 request** và hiện **2 thông báo**.

**Đã vá:** updater chỉ còn là phép tính thuần; mọi tác dụng phụ chạy đúng một lần
bên ngoài. Đồng thời toàn bộ sổ tài khoản đi qua cổng `commitUsers` để `usersRef`
khớp trạng thái mới **ngay trong cùng một tick** — bản nháp trước đó đọc snapshot
cũ và âm thầm hoàn lại số Coin vừa trừ khi treo thưởng.

---

## 12. Phiên đăng nhập không được kiểm tra lại

**Mức độ:** Trung bình · **Vị trí:** `src/store/forumStore.ts`

Client khôi phục phiên từ `localStorage` và **không bao giờ hỏi lại server**. Token
hết hạn, tài khoản bị xoá, hoặc quyền bị thu hồi thì giao diện vẫn hiện "đã đăng
nhập" trong khi mọi lệnh ghi đều bị `401` — người dùng không hiểu vì sao bấm gì
cũng không được.

**Đã vá:** thêm `GET /api/auth/session`. Lúc khởi động, nếu `401` thì xoá token,
xoá email đã lưu, đưa về chế độ khách và báo "Phiên đăng nhập đã hết hạn". `role`
luôn đọc từ bản ghi thật chứ không từ token, nên thu hồi quyền có hiệu lực ngay.

---

## 13. Mất dữ liệu Khu Vinh Danh

**Mức độ:** Cao · **Vị trí:** WS `SYNC_ABOUT`, `POST /api/admin/about`

```js
// TRƯỚC: ghi đè NGUYÊN KHỐI tài liệu bằng payload client gửi
store.about = payload;
```

Một payload chỉ chứa `{ headline }` sẽ **xoá sạch `founder` và toàn bộ
`milestones`**, rồi `persistStoreToDisk` ghi luôn xuống đĩa — hỏng dữ liệu cho mọi
lần khởi động về sau, kể cả ở tiến trình khác. Đã tái hiện được: tệp
`data/forum-data.json` chỉ còn đúng `{"headline":"Realtime WebSocket About Update"}`.

Đây cũng là nguyên nhân làm `tests/admin-moderation-about` test 2 fail **thất
thường ở lần chạy thứ hai trở đi** — không phải lỗi của test.

**Đã vá:** gộp vào tài liệu hiện có (`mergeAboutData`). `founder` null và
`milestones` rỗng bị coi là "không gửi" nên không thể thổi bay hai khối lõi.

---

## 14. Tố cáo vi phạm rơi vào khoảng không

**Mức độ:** Cao · **Vị trí:** `loadStoreFromDisk`, `/api/sync`, UI

Nút "Tố Cáo Tài Khoản" có ở hồ sơ, phòng chat và sàn Q&A, nhưng:

1. `loadStoreFromDisk` dựng lại `store` mà **bỏ quên `reports`** → mọi báo cáo đã
   ghi xuống đĩa bị vứt đi mỗi lần khởi động lại.
2. Không có cổng nào **đọc** danh sách báo cáo; `NEW_REPORT` được broadcast nhưng
   không client nào xử lý. Tố cáo được ghi vào rồi không ai xem được.

```
[1] POST /api/reports: 200
[2] reports trong tệp đĩa: 1 bản ghi      ← có ghi xuống đĩa
[3] SAU KHỞI ĐỘNG LẠI: server còn giữ?  không   ← TRƯỚC KHI VÁ
```

**Đã vá:** khôi phục `reports` khi nạp từ đĩa; thêm `GET /api/admin/reports` và
`POST /api/admin/reports/resolve` (chỉ Super Admin); thêm hộp thư
`ReportInboxModal` + huy hiệu số báo cáo chờ xử lý; `NEW_REPORT` đẩy thông báo cho
Super Admin đang trực; tố cáo trùng (cùng người, cùng mục, cùng lý do, đang chờ)
được gộp để không làm ngập hộp thư.

---

## 15. `FFORUM_DATA_DIR` bị chốt lúc import

**Mức độ:** Thấp · **Vị trí:** `server/forumServer.ts`

Đường dẫn thư mục dữ liệu được tính bằng `const` ở đầu module, nên việc đặt
`FFORUM_DATA_DIR` **sau khi** nạp module bị bỏ qua âm thầm — rất dễ gây nhầm khi
chạy nhiều bộ test trong một tiến trình.

**Đã vá:** chuyển thành hàm `dataDir()` / `dataFilePath()`, đọc biến môi trường
tại thời điểm dùng.

---

## 16. Server tin `maxLength` của client

**Mức độ:** Cao · **Vị trí:** `POST /api/chat`, `POST /api/feedback`

Ô nhập có `maxLength={300}`, nhưng `maxLength` chỉ là thuộc tính HTML — một
request thủ công gửi được body tới 25 MB. Nội dung đó được lưu vào kho rồi phát
cho **mọi** client đang kết nối.

`authorLevel` cũng lấy thẳng từ body, nên ai cũng tự khai "cấp 150" cho tin nhắn
của mình.

**Đã vá:** cắt nội dung ở server (chat 500 ký tự, góp ý 4000), chặn `400` khi quá
dài hoặc chỉ có khoảng trắng, rate limit theo IP, và `authorLevel` đọc từ bản ghi
thật. Đường WS `NEW_CHAT_MESSAGE` cũng bị bỏ sót trong lần vá đầu — test #24 bắt
được.

---

## 17. Kho dữ liệu phình vô hạn

**Mức độ:** Trung bình · **Vị trí:** `store.chatMessages`, `store.feedbacks`, `store.reports`

`store.chatMessages.push(...)` không có trần. Mảng này được serialize **toàn bộ**
mỗi lần ghi đĩa và trả về **nguyên khối** cho mọi client qua `/api/sync`, nên
diễn đàn chạy càng lâu thì cả hai đường càng chậm.

**Đã vá:** trần 500 bản ghi mới nhất cho mỗi kho, áp dụng cho cả đường HTTP lẫn WS.

---

## 18. Bốn endpoint câu lạc bộ không tồn tại

**Mức độ:** Cao (mất dữ liệu) · **Vị trí:** `POST /api/clubs`, `/approve`, `/reject`, `/posts`

Client gọi bốn địa chỉ này cho mọi thao tác CLB, nhưng server **không có route
nào** — tất cả trả `404`. Mỗi lời gọi lại kết thúc bằng `.catch(() => {})`, nuốt
lặng lỗi, nên giao diện vẫn báo "Hồ sơ thành lập CLB đã gửi!".

Phần còn lại đi qua `BroadcastChannel`, chỉ tới các tab **cùng trình duyệt**.
Handler WS cho CLB ở server thì có sẵn nhưng client không bao giờ gửi loại thông
điệp đó. Kết quả: lập CLB trên điện thoại thì mọi thiết bị khác và mọi người dùng
khác đều không thấy gì, và dữ liệu biến mất khi xoá bộ nhớ đệm.

Xác nhận bằng HTTP thật trước khi sửa:

```
POST /api/clubs          -> HTTP 404
POST /api/clubs/approve  -> HTTP 404
POST /api/clubs/reject   -> HTTP 404
POST /api/clubs/posts    -> HTTP 404
```

**Đã vá:** thêm đủ bốn route, có xác thực và kiểm quyền:

| Route | Quyền | Ghi chú |
|---|---|---|
| `POST /api/clubs` | Đã đăng nhập | Người sáng lập lấy **thuần từ token**; hồ sơ mới luôn `PENDING` |
| `POST /api/clubs/approve` | Super Admin | Thăng cấp chủ nhiệm lên `CLUB_LEADER` + 250 XP |
| `POST /api/clubs/reject` | Super Admin | Ghi `rejectReason`, trả `404` nếu CLB không tồn tại |
| `POST /api/clubs/posts` | Đã đăng nhập | Tác giả lấy từ phiên, không từ body |

`leaderEmail` / `authorEmail` / `adminEmail` trong body đều **bị bỏ qua** — không ai
mạo danh người khác hay tự duyệt hồ sơ của mình được. Kho CLB có trần 300, bài
viết 800. Client nay gửi `authHeaders()`.

Kiểm chứng end-to-end trên dev server (11 bước, toàn bộ đúng kỳ vọng): khách bị
`401`, tự duyệt bằng `adminEmail` bị `403`, học sinh tự duyệt bị `403`, admin duyệt
`200` → chủ nhiệm lên `CLUB_LEADER` với 250 XP và `scopedClubIds`, `/api/sync` trả
CLB lẫn bài viết về cho thiết bị khác.

---

## 19. Mạo danh qua gói presence

**Mức độ:** Trung bình · **Vị trí:** `POST /api/presence`, WS `PRESENCE_PING`

Server nhận `body.user` rồi `broadcastServerEvent('PRESENCE_PING', body.user)` —
**nguyên khối**, không lọc một trường nào. Client tự khai được `email`, nên:

```js
// Một request duy nhất làm "Super Admin" hiện là đang trực tuyến
// trên màn hình của MỌI người đang kết nối:
fetch('/api/presence', { method: 'POST', headers: {'Content-Type':'application/json'},
  body: JSON.stringify({ user: { id: 'x', name: 'Admin Rởm',
    email: 'BroAmStuck@gmail.com', role: 'SUPER_ADMIN' } }) });
```

`ChatView` tính `isMasterAdminOnline` từ `onlineUsers.some(u => isMasterAdmin(u.email))`,
tức đúng trường vừa mạo danh được — chấm "Ban Quản Trị đang trực tuyến" sáng lên.
Khai `name`/`avatar` tuỳ ý thì hiện ra thành bất kỳ ai. Ngoài ra gói này phát tới
mọi kết nối nên không giới hạn là vừa mạo danh vừa khuếch đại, và cũng không có
rate limit nên bắn ngập được danh sách trực tuyến.

**Đã vá:** thêm `sanitizePresence()` dùng chung cho cả hai đường. Chỉ `id`, `name`,
`avatar`, `level`, `rank` được giữ (cắt độ dài); **`email` và `role` chỉ lấy từ
phiên đã xác thực**, đọc từ bản ghi thật trên server — khách chưa đăng nhập thì
hai trường đó bị bỏ hẳn. Thêm `presenceLimiter` 40 lần/phút theo IP (client thật
ping mỗi 15 giây). Client nay gửi kèm token ở đường HTTP fallback.

Xác nhận end-to-end trên dev server:

```
[1] mạo danh (chưa đăng nhập): email=undefined role=undefined level=150
[2] đã đăng nhập, khai email admin: email=e2e…@example.com role=STUDENT
[3] tên 5000 ký tự → còn 12 ký tự
[4] thiếu id: 400
[5] flood bị chặn 429 ở lượt 40
```

---

## 20. Đăng bài dưới danh tính người khác

**Mức độ:** Trung bình · **Vị trí:** `POST /api/questions`, `POST /api/solutions`

Ngay cả khi token hợp lệ, các trường hiển thị vẫn lấy thẳng từ body:

```js
authorId:     body.authorId,
authorName:   body.authorName,
authorAvatar: body.authorAvatar || DEFAULT_AVATAR,
authorLevel:  body.authorLevel || author?.level || 1,
```

Nghĩa là một tài khoản thật vẫn đăng được câu hỏi hoặc lời giải hiện ra dưới tên,
ảnh đại diện và cấp bậc của bất kỳ ai — kể cả tên Super Admin, làm nội dung trông
như do Ban Quản Trị viết. `subject` và `imageUrl` cũng không bị cắt độ dài.

**Đã vá:** đã đăng nhập thì `authorId` / `authorName` / `authorAvatar` /
`authorLevel` lấy từ bản ghi thật trên server (giống cách đã làm cho chat, presence
và CLB). Khách chưa đăng nhập vẫn được tự nhập tên vì diễn đàn cho phép hỏi ẩn
danh. Thêm cắt độ dài cho `subject` (40), `imageUrl` (2000), `anonymousAlias` /
`anonymousMask` (40).

Xác nhận end-to-end trên dev server:

```
[1] đặt câu hỏi: 200 | tên="E2E Người Hỏi" level=1   (body khai tên giả, level 150)
[2] gửi lời giải: 200 | tên="E2E Người Giải" level=1
[3] title=200/200 content=20000/20000 subject=40/40 imageUrl=2000/2000
```

### Hồi quy do chính bản vá này gây ra (đã sửa)

Lấy `authorName` từ bản ghi thật đã **phá tính năng hỏi ẩn danh**. Diễn đàn cho
phép đặt câu hỏi mà không lộ tên; giao diện render chính trường `authorName` làm bí
danh ("Pháp sư Ghibli"), nên ghi đè bằng tên thật là làm lộ danh tính người hỏi:

```
[1] tên đăng ký thật     = "Tên Thật Của Tôi"
[2] client gửi bí danh   = "Pháp Sư Ghibli"
[3] server lưu authorName = "Tên Thật Của Tôi"     ← LỘ
[4] isAnonymous = true
```

**Đã sửa:** khi `isAnonymous` thì `authorName`/`authorAvatar` giữ bí danh và mặt nạ
client gửi (`anonymousAlias`/`anonymousMask`, có cắt độ dài); danh tính thật vẫn nằm
ở `authorEmail`/`authorId` nên quyền chọn đáp án chuẩn không đổi. Cả hai đường HTTP
và WS. Test #38 khoá cả hai chiều: ẩn danh giữ bí danh, **và** câu hỏi không ẩn danh
vẫn không mạo danh được.

---

## 21. Bơm coin vô hạn qua WebSocket

**Mức độ:** Nghiêm trọng · **Vị trí:** WS `NEW_QUESTION`, `NEW_SOLUTION`

Hai nhánh này ghi **nguyên payload** của client vào kho, không đòi phiên đăng nhập
và không kiểm số dư — trong khi `MARK_BEST_SOLUTION` lại trả thưởng theo
`bountyCoin` của câu hỏi (`thưởng = bounty*0.5 + 100`).

Đường HTTP kiểm số dư và trừ coin; đường WS thì không. Chuỗi khai thác:

```js
ws.send({ type: 'AUTH', payload: { token } })                      // tài khoản mới, 100 coin
ws.send({ type: 'NEW_QUESTION', payload: {
  id: 'q-bom', title: 'x', content: 'x',
  authorEmail: '<email của mình>', bountyCoin: 999999 }})          // không kiểm số dư
ws.send({ type: 'NEW_SOLUTION', payload: {
  id: 's-bom', questionId: 'q-bom', authorEmail: '<email của mình>', content: 'x' }})
ws.send({ type: 'MARK_BEST_SOLUTION', payload: { questionId: 'q-bom', solutionId: 's-bom' }})
```

Xác nhận bằng repro trên dev server, **trước khi vá**:

```
[1] coin ban đầu = 100
[2] coin sau = 500199 | xp = 500099 | level = 150
[3] coin tạo từ hư không = +500099
```

Một tài khoản mới tự biến thành 500.199 coin và cấp 150 trong chưa tới một giây.
(Biến thể *không* gửi `AUTH` thì ra `+0` — vì `MARK_BEST_SOLUTION` đã đòi phiên —
nhưng câu hỏi bơm vẫn nằm trong kho với `bountyCoin: 999999`.)

**Đã vá:** cả hai nhánh nay đòi phiên đăng nhập (không có thì trả `FORBIDDEN`),
danh tính lấy từ bản ghi thật, `bountyCoin` đi qua `normalizeBounty()` và **bị kiểm
số dư + trừ thật** như đường HTTP. Vẫn không cộng XP ở đường WS.

Sau khi vá, cùng một repro:

```
[2] coin sau = 150 | xp = 150 | level = 2
[4] bountyCoin = 100        (999999 bị kẹp về trần)
```

---

## 22. Tự hỏi rồi tự chọn đáp án để cày coin

**Mức độ:** Cao · **Vị trí:** `POST /api/solutions/best`, WS `MARK_BEST_SOLUTION`

Việc kiểm quyền chỉ hỏi "có phải tác giả câu hỏi không", nên người hỏi **tự chọn
câu trả lời của chính mình** làm đáp án chuẩn và tự nhận thưởng. Mỗi vòng bỏ túi
`+50` coin và `+225` XP, lặp vô hạn và tự động hoá được.

Xác nhận bằng repro trên dev server, **trước khi vá**:

```
[0] khởi điểm: coin = 100 | xp = 0   | level = 1
[1] vòng 1:    coin = 150 | xp = 225 | level = 2
[2] vòng 2:    coin = 200 | xp = 450 | level = 4
[3] vòng 3:    coin = 250 | xp = 675 | level = 5
```

**Đã vá:** từ chối khi email tác giả lời giải trùng email người đang thao tác —
`409` ở HTTP, `FORBIDDEN` ở WS. Ngoài chuyện kinh tế, về nghiệp vụ cũng vô nghĩa:
không ai tự chấm mình là người giải đúng. Luồng bình thường (chọn đáp án của
người khác) vẫn hoạt động và vẫn trả thưởng — test #32 kiểm cả hai chiều.

Sau khi vá, cùng một repro:

```
[1] vòng 1: chọn đáp án của chính mình → 409 | coin = 0 | xp = 75
[2] đặt câu hỏi thất bại: Số dư không đủ để treo thưởng 100 Coin. Hiện có 0 Coin.
```

---

## 23. Tự duyệt câu lạc bộ qua WebSocket

**Mức độ:** Cao · **Vị trí:** WS `NEW_CLUB`, `NEW_CLUB_POST`

Cùng một kiểu lỗi như mục 21: hai nhánh này ghi **nguyên payload** vào kho và không
đòi phiên đăng nhập. Một client chưa xác thực chèn được câu lạc bộ có sẵn
`status: 'APPROVED'`, kèm `followerCount` / `membersCount` / `leaderName` tự đặt —
vòng qua toàn bộ quy trình duyệt của Ban Quản Trị.

Xác nhận bằng repro trên dev server, **trước khi vá**:

```
[1] CLB chèn qua WS (không auth) có trong kho? true
[2] status = APPROVED
[3] followerCount = 9999 | membersCount = 9999 | leaderName = "Lãnh đạo giả"
```

**Đã vá:** cả hai nhánh đòi phiên đăng nhập (không có thì `FORBIDDEN`); `status`
luôn bị ép về `PENDING`; `leaderId`/`leaderName` (và `authorId`/`authorName` của bài
viết) lấy từ bản ghi thật; `followerCount` khởi tạo 1, `membersCount` tính từ
`foundingMembers` thật, `likes` khởi tạo 0; mọi trường tự do bị cắt độ dài; bài
viết chỉ ghi được khi CLB tồn tại.

Sau khi vá, cùng một repro:

```
[1] CLB chèn qua WS (không auth) có trong kho? false
```

---

## 24. Ghi đè trường cấm qua cửa sửa bài (mass-assignment)

**Mức độ:** Trung bình · **Vị trí:** `POST /api/questions/edit`, WS `EDIT_QUESTION`

Cả hai đường sửa bài đều gộp thô:

```js
store.questions = store.questions.map(q => q.id === questionId ? { ...q, ...updates } : q);
```

`updates` là object client gửi nguyên khối, nên payload sửa bài kèm thêm trường nào
cũng được ghi. Cổng này chỉ Super Admin qua được, nhưng hai trường bị ghi đè nguy
hiểm nhất lại chính là hai trường điều khiển quyền và tiền:

- `authorEmail` — quyết định ai được chọn đáp án chuẩn và xoá bài; đổi được là
  **đổi chủ câu hỏi**.
- `bountyCoin` — quyết định tiền thưởng (`bounty*0.5 + 100`); thổi được là thổi
  tiền thưởng cho bất kỳ ai được chọn làm đáp án chuẩn.

Một token admin lộ ra, hay một nút bấm gửi nhầm payload, là đủ.

**Đã vá:** thêm `sanitizeQuestionUpdates()` dùng chung cho cả HTTP lẫn WS, chỉ giữ
`title` (200), `content` (20000), `subject` (40) — đúng ba trường client thật gửi.
Payload chỉ chứa trường cấm thì trả `400`; câu hỏi không tồn tại thì `404`.

---

## 25. Không có trần kết nối, khung WebSocket quá rộng

**Mức độ:** Trung bình · **Vị trí:** `GET /api/events`, WebSocket `/ws`

Cả hai kênh giữ kết nối mở và không giới hạn số lượng. Mỗi kết nối SSE chiếm một
socket và một `setInterval` nhịp tim, nên một vòng lặp mở kết nối là đủ làm cạn tài
nguyên. Ngoài ra `new WebSocketServer({ noServer: true })` không đặt `maxPayload`,
tức dùng mặc định của thư viện `ws` — **100 MiB cho mỗi khung**, trong khi payload
lớn nhất ứng dụng thực sự cần chỉ vài chục KB.

**Đã vá:**

| Giới hạn | Giá trị |
|---|---|
| Kết nối SSE đồng thời | 300 (vượt thì `503`) |
| Kết nối WebSocket đồng thời | 300 (vượt thì gửi `SERVER_FULL` rồi đóng) |
| Kích thước khung WebSocket | 256 KiB (vượt thì đóng kết nối) |

---

## 26. Giao diện báo thành công khi máy chủ từ chối

**Mức độ:** Trung bình (che giấu lỗi) · **Vị trí:** `src/store/forumStore.ts`, `src/components/views/ClubsView.tsx`

Tám thao tác ghi dữ liệu kết thúc bằng `.catch(() => {})` và **không đọc mã trạng
thái**:

```js
void fetch('/api/clubs/approve', { … }).catch(() => {});
playChime('send');
setToastMessage({ title: 'Đã duyệt câu lạc bộ', type: 'success' });
```

Máy chủ trả `401` (phiên hết hạn), `403` (không còn quyền), `404` hay `500` — hoặc
mạng đứt — thì người dùng **vẫn thấy thông báo thành công** và bản cập nhật lạc
quan vẫn nằm trên màn hình, cho tới lần đồng bộ sau mới âm thầm biến mất.

Chính kiểu nuốt lỗi này đã che giấu mục 18: bốn endpoint câu lạc bộ trả `404` suốt
thời gian dài mà không ai phát hiện, vì không lời gọi nào đọc kết quả.

`createClubPost` còn một lỗi kèm theo: `ClubsView` gọi nó **đồng bộ**
(`const ok = onCreateClubPost(...)`), nên chỉ cần đổi sang `async` mà không sửa nơi
gọi là `ok` trở thành một Promise luôn truthy — form tự xoá nội dung và bật
cooldown kể cả khi bài viết bị từ chối.

**Đã vá:**

- Thêm `runServerAction()`: POST qua `postJson()` (có token), kiểm tra mã trạng
  thái, và dịch mã lỗi thành thông báo tiếng Việt (`401` phiên hết hạn, `403`
  không có quyền, `404` không tồn tại, `429` thao tác quá nhanh, `0` mất mạng).
- Cả tám thao tác nay đi qua helper này: thất bại thì **hoàn tác** bản cập nhật lạc
  quan và hiện toast lỗi.
- Thêm biến thể `'error'` cho toast (icon `AlertCircle` màu đỏ hồng).
- `createClub` / `createClubPost` / `approveClub` / `rejectClub` thành `async`;
  `ClubsView` `await` đúng chỗ và prop type nhận `Promise`.

Test #37 khoá chặt: mọi đường ghi quan trọng phải qua `runServerAction` và phải có
nhánh báo lỗi, để không quay lại kiểu gọi rồi bỏ mặc.

### Đợt hai: các đường tạo nội dung

Bốn đường còn lại cũng nuốt lỗi, trong đó `createQuestion` là chỗ nặng nhất vì nó
**trừ coin của người dùng trước khi gửi**:

```js
setCurrentUser({ ...currentUser, coin: prevCoin - bountyCoin });   // trừ trước
fetch('/api/questions', { … }).catch(() => {});                    // rồi bỏ mặc
addXP(50);                                                          // và cộng XP
```

Máy chủ có thể từ chối vì số dư theo sổ cái thật không đủ (`402`), thao tác quá
nhanh (`429`), hay phiên hết hạn (`401`). Khi đó người dùng **mất coin mà câu hỏi
không được đăng**, và vẫn được cộng 50 XP.

Xác nhận bằng HTTP thật rằng máy chủ trả đúng các mã đó:

```
[1] số dư sau khi rút: 0 coin
[2] đặt câu hỏi vượt số dư: HTTP 402 | "Số dư không đủ để treo thưởng 100 Coin. Hiện có 0 Coin."
[3] số dư sau khi bị từ chối: 0 coin (server không trừ)
[4] chat bị chặn 429 ở lượt 121
```

**Đã vá:** `createQuestion`, `addSolution`, `sendChatMessage`, `submitFeedback` nay
đi qua `runServerAction`. `createQuestion` **hoàn lại coin** và rút câu hỏi về khi
thất bại; `addSolution`/`sendChatMessage` rút bản ghi lạc quan khỏi màn hình;
`submitFeedback` giữ bản nháp trong localStorage và báo rõ là chưa lên được máy
chủ. Test #37 mở rộng bao cả bốn đường này.

`submitFeedback` còn một lỗi kèm được sửa: `JSON.parse(saved)` không bọc
`try/catch` và không kiểm `Array.isArray`, nên một giá trị hỏng trong localStorage
làm ném lỗi và mất luôn góp ý.

### Đợt ba: chọn đáp án chuẩn cộng thưởng trước khi hỏi máy chủ

`markBestSolution` cộng thưởng **cục bộ** và hiện toast *"✓ Đã xác nhận Đáp Án
Chuẩn! … đã nhận thưởng +N Coin danh dự"* rồi mới gửi request, và nuốt kết quả.

Sau khi mục 22 được vá (máy chủ trả `409` khi tự chọn đáp án của chính mình), thứ
tự ngược đó lộ ra rõ ràng: người dùng tự chọn vẫn thấy thông báo nhận thưởng,
nhưng máy chủ từ chối nên thưởng không bao giờ đến, và mọi thứ âm thầm quay về ở
lần đồng bộ sau.

**Đã vá:**

- Chặn tự chọn ngay phía client với thông báo rõ ràng, khớp với `409` của máy chủ.
- Đổi thứ tự: **hỏi máy chủ trước, cộng thưởng sau**. Thất bại thì hoàn tác cả
  `questions` lẫn `solutions` và hiện toast lỗi.
- Test #37 nay kiểm cả thứ tự này (`addXP` phải nằm **sau** `runServerAction`).

### Đợt bốn: lưu hồ sơ

`updateProfile` cũng nuốt lỗi rồi vô điều kiện báo *"Hồ sơ đã lưu thành công!"*.
Máy chủ loại bỏ các trường nó sở hữu (`role`/`id`/`email`) và kẹp các trường còn
lại, nên lời gọi này hoàn toàn có thể bị từ chối (`401` phiên hết hạn, `429`). Nay
đi qua `runServerAction`: thất bại thì hoàn tác cả `currentUser`, sổ người dùng lẫn
phần đồng bộ danh tính vào nội dung, và hiện toast lỗi.

---

## 27. Hai kênh realtime cùng sống sau khi rớt mạng

**Mức độ:** Trung bình · **Vị trí:** `src/store/forumStore.ts` (effect kết nối)

Ứng dụng dùng WebSocket làm kênh chính và SSE (`/api/events`) làm kênh dự phòng.
Khi WS rớt thì `ws.onclose` bật SSE và đặt lịch nối lại WS sau 4 giây. Nhưng
`ws.onopen` **không đóng SSE**, và SSE chỉ bị đóng khi chính nó lỗi hoặc khi
component unmount.

Kết quả: sau bất kỳ lần rớt mạng thoáng qua nào, **cả hai kênh cùng sống**. Mỗi sự
kiện máy chủ phát ra được `handleServerBroadcast` xử lý **hai lần** — hai thông
báo, hai tiếng chuông, hai toast cho cùng một tin; tố cáo mới báo hai lần cho Super
Admin; và tin chat hiển thị trùng.

Kèm theo một lỗi nhỏ: `reconnectTimer` là biến đơn, mỗi lần `onclose` lại ghi đè,
nên nhiều socket đóng liên tiếp sẽ để lại timer mồ côi không thể huỷ khi unmount.

**Đã vá:** `ws.onopen` đóng và giải phóng SSE ngay khi WS nối lại thành công;
`ws.onclose` gọi `clearTimeout` trước khi đặt timer mới. `startSSE` vốn đã có guard
`if (isDisposed || sse) return` chống tạo EventSource trùng — giữ nguyên. Test #39
khoá cả ba điểm.

---

## 28. Tin chat đếm chưa đọc trùng, và closure chốt người dùng cũ

**Mức độ:** Trung bình · **Vị trí:** `src/store/forumStore.ts` — hai nhánh `NEW_CHAT_MESSAGE`

**Lỗi 1 — badge nhân đôi.** Cùng một tin nhắn tới được **hai lần**: qua
`BroadcastChannel` (từ tab khác của cùng trình duyệt) và qua broadcast của máy chủ
(tới mọi client, gồm cả các tab khác của cùng người đó). Phần dedupe chỉ chặn việc
thêm trùng vào danh sách, còn `setUnreadChatCount(c => c + 1)` và `playChime('send')`
nằm **ngoài** phần đó:

```js
setChatMessages(prev => { if (prev.some(...)) return prev; return [...prev, newMsg]; });
if (newMsg.authorId !== currentUser?.id) { setUnreadChatCount(c => c + 1); playChime('send'); }
//                                        ↑ chạy cho CẢ HAI lần nhận cùng một tin
```

**Lỗi 2 — closure chốt người dùng cũ.** `handleServerBroadcast` nằm trong
`useEffect(..., [])`, nên `currentUser` bị chốt ở lần render đầu — tức `null` khi
chưa đăng nhập, và không bao giờ cập nhật. Điều kiện
`newMsg.authorId !== currentUser?.id` vì thế luôn đúng, nên **tin của chính mình**
cũng bị tính là chưa đọc. Nhánh `BroadcastChannel` ngay bên dưới lại dùng đúng
`currentUserRef.current` — hai nhánh cùng một việc nhưng viết khác nhau.

**Đã vá:**

- Thêm `noteChatMessage(id)`: trả về `true` nếu mã tin đã gặp, và ghi nhận mã mới.
  Cả hai nhánh đều hỏi hàm này; số chưa đọc và tiếng chuông chỉ chạy khi tin là
  **mới thật**.
- Lần gọi đầu gieo tập bằng các tin có sẵn (nạp từ localStorage) để tin cũ không
  bị tính là mới.
- Cả hai nhánh chuyển sang `currentUserRef.current`.
- `chatMessagesRef` được đồng bộ **trong `useEffect`**, không gán lúc render — gán
  `ref.current` lúc render vi phạm quy tắc `react(refs)` (dự án đã có sẵn 3 chỗ như
  vậy ở mức baseline, không thêm chỗ thứ tư).

---

## 29. Bản ghi người dùng kiểu cũ làm dở dang luồng duyệt câu lạc bộ

**Mức độ:** Cao · **Vị trí:** `sanitizeUsers()`, WS `APPROVE_CLUB`

`sanitizeUsers` chỉ spread thô bản ghi nạp từ đĩa:

```js
out[email] = { ...raw, email };
```

Tệp dữ liệu viết ra từ bản cũ thiếu hẳn những trường thêm về sau — ví dụ
`scopedClubIds`. Bản ghi đó đi thẳng vào store với trường `undefined`, và nhánh WS
`APPROVE_CLUB` thì spread nó mà không phòng bị:

```js
creator.scopedClubIds = Array.from(new Set([...creator.scopedClubIds, clubId]));
//                                           ^^^ TypeError: not iterable
```

Điều nguy hiểm không phải là lỗi bị ném, mà là **trạng thái bị áp dụng dở dang**.
Thứ tự mutate trong nhánh đó là:

| Bước | Kết quả khi lỗi |
|---|---|
| `store.clubs` → `APPROVED` | đã chạy |
| `creator.role = 'CLUB_LEADER'` | đã chạy |
| `creator.scopedClubIds = [...]` | **ném `TypeError`** |
| `creator.xp += 250` | không bao giờ chạy |
| `broadcastServerEvent('SYNC_USER', …)` | không bao giờ chạy |
| `persistStoreToDisk()` | không bao giờ chạy |

Xác nhận bằng repro:

```
[Forum Server WS] Error handling message: TypeError: creator.scopedClubIds is not iterable
    at WebSocket.<anonymous> (server/forumServer.ts:826:74)
[2] sau APPROVE_CLUB qua WS: role = CLUB_LEADER | scopedClubIds = undefined | xp = 400
[3] status CLB = APPROVED
```

CLB hiện là `APPROVED` trong RAM nhưng vẫn `PENDING` trên đĩa, chủ nhiệm đã lên cấp
nhưng không có XP và không có quyền phạm vi CLB — và mọi client khác không nhận
được `SYNC_USER`.

**Đã vá hai lớp:**

1. `sanitizeUsers` lấp giá trị mặc định cho `role`/`avatar`/`level`/`xp`/`fPoints`/
   `coin`/`scopedClubIds` ngay khi nạp, nên trường `undefined` không lọt được vào
   store.
2. Chỗ spread vẫn giữ `|| []` làm lưới an toàn.

### Kèm theo: duyệt câu lạc bộ không idempotent

Khi viết test cho lỗi trên, một lần duyệt qua WS rồi một lần qua HTTP cho ra
`xp = 900` thay vì `650` — tức **mỗi lần duyệt lại cộng thêm 250 XP**. Không có
chốt nào ngăn duyệt đi duyệt lại một CLB đã `APPROVED`, nên bấm duyệt bao nhiêu
lần cũng thưởng bấy nhiêu.

**Đã vá:** cả HTTP lẫn WS thoát sớm nếu CLB đã `APPROVED` (HTTP trả
`alreadyApproved: true`). Test #41 kiểm cả XP, `scopedClubIds`, và trạng thái **trên
đĩa** sau khi duyệt.

---

## 30. fPoints bị cộng đôi khi bản ghi thiếu trường

**Mức độ:** Thấp (nay không còn tới được) · **Vị trí:** 6 chỗ cộng thưởng trong `server/forumServer.ts`

Cả sáu chỗ cộng thưởng đều viết theo cùng một mẫu sai thứ tự:

```js
solver.xp += award;
solver.fPoints = (solver.fPoints ?? solver.xp) + award;
//                                  ^^^^^^^^ XP ĐÃ bị cộng ở dòng trên
```

Nếu `fPoints` thiếu, nhánh `??` lấy XP **đã cộng** làm gốc rồi cộng thêm lần nữa —
kết quả `xp` tăng `N` nhưng `fPoints` tăng `2N`.

Sau mục 29 (`sanitizeUsers` chuẩn hoá `fPoints` khi nạp) và việc mọi đường tạo tài
khoản (`register`, `social`) đều đặt sẵn `fPoints`, nhánh `??` **không còn tới
được**. Nhưng đây vẫn là code sai tiềm ẩn: chỉ cần thêm một đường tạo tài khoản mới
mà quên trường đó là lỗi sống lại.

**Đã sửa:** đảo thứ tự ở cả sáu chỗ — tính `fPoints` từ XP **trước** khi cộng.
Test #42 kiểm bằng hành vi thật: qua ba bước thưởng (đặt câu hỏi +50, gửi lời giải
+25, đáp án chuẩn +120) thì `xp` và `fPoints` phải luôn bằng nhau.

---

## 31. Tắt tiến trình làm mất lần ghi cuối cùng

**Mức độ:** Cao (mất dữ liệu) · **Vị trí:** `persistStoreToDisk()`, `setupForumServer()`

Việc ghi xuống đĩa được debounce 200 ms và timer bị `.unref()`:

```js
saveTimeout = setTimeout(() => { fs.writeFileSync(...) }, 200);
saveTimeout.unref();          // timer KHÔNG giữ tiến trình sống
```

Server **không có bất kỳ handler tín hiệu nào** để ghi nốt. `scripts/start-public.mjs`
bắt `SIGINT`/`SIGTERM`/`SIGHUP` nhưng chỉ để kill tiến trình con, không yêu cầu
server ghi lại.

Nghĩa là tắt server trong vòng 200 ms sau một thao tác — Ctrl+C, container bị dừng,
crash — là lần ghi đó **mất**. Người dùng vừa đăng bài, người vận hành restart, và
bài viết biến mất.

Xác nhận bằng repro (khởi động server con, ghi một tin nhắn, gửi `SIGTERM` ngay):

```
── TRƯỚC khi vá ──
[1] ghi tin nhắn: 200
[2] KHÔNG có tệp dữ liệu → mất toàn bộ

── SAU khi vá ──
[1] ghi tin nhắn: 200
[2] sau SIGTERM ngay lập tức, tin nhắn có trên đĩa? CÓ — đã được ghi nốt
```

**Đã vá:** tách `flushStoreToDisk()` (ghi đồng bộ) và `flushPendingSave()` (ghi nốt
nếu đang có lần chờ); cài móc cho `SIGTERM`/`SIGINT`/`SIGHUP` và sự kiện `exit`
trong `setupForumServer()`. Móc chỉ cài một lần qua cờ `shutdownHooksInstalled` để
nhiều lần gọi `setupForumServer` (trong test) không nhân bản handler.

---

## 32. Ghi không atomic + tệp dữ liệu hỏng bị ghi đè mất

**Mức độ:** Cao (mất dữ liệu) · **Vị trí:** `flushStoreToDisk()`, `loadStoreFromDisk()`

Hai lỗi ghép lại thành mất dữ liệu vĩnh viễn.

**(a) Ghi không atomic.** `fs.writeFileSync(dataFilePath(), JSON.stringify(store))`
ghi thẳng vào tệp dữ liệu. Nếu tiến trình bị ngắt giữa chừng (kill -9, đĩa đầy,
mất điện) thì tệp còn lại là JSON **cắt cụt**.

**(b) Tệp hỏng bị ghi đè.** `loadStoreFromDisk` bọc toàn bộ trong `try/catch` chỉ để
log:

```js
} catch (err) {
  console.error('[Forum Server] Failed to load data from disk:', err);
}
```

`JSON.parse` ném lỗi → `store` giữ giá trị rỗng mặc định → lần
`persistStoreToDisk()` đầu tiên **ghi đè luôn tệp hỏng**. Dữ liệu cũ mất hẳn, không
còn gì để cứu.

Xác nhận bằng repro (gieo một tệp JSON cắt cụt, khởi động server, kích hoạt một lần
ghi):

```
── TRƯỚC khi vá ──
[1] các tệp: forum-data.json, session-key
[2] tệp hỏng có được giữ lại không? KHÔNG -> đã bị ghi đè mất

── SAU khi vá ──
[1] các tệp: forum-data.json, forum-data.json.corrupt-1791116289458, session-key
[2] tệp hỏng có được giữ lại không? CÓ
[3] nội dung gốc còn đọc được để cứu? CÒN (thấy xp:500 của user cũ)
```

**Đã vá:**

- `flushStoreToDisk()` ghi ra tệp tạm `forum-data.json.tmp-<pid>` rồi `renameSync`.
  `rename` là atomic trên cùng hệ tệp, nên tệp dữ liệu không bao giờ ở trạng thái
  viết dở: tiến trình chết giữa chừng thì hoặc bản cũ còn nguyên, hoặc bản mới đã
  xong.
- Khi nạp thất bại, tệp hỏng được đổi tên thành `forum-data.json.corrupt-<ts>` và
  đường dẫn được log ra, để người vận hành còn khôi phục tay thay vì mất trắng.

Test #44 kiểm bằng hành vi thật (gieo tệp hỏng → khẳng định bản giữ lại đúng
nguyên văn và còn đọc được `xp:500` của tài khoản cũ); test #45 khoá thứ tự
ghi-tạm-rồi-rename.

---

## 33. Giả header `X-Forwarded-For` để vượt toàn bộ rate limit

**Mức độ:** Nghiêm trọng · **Vị trí:** `clientIpOf()` trong `server/authGuard.ts`

Mọi rate limiter đều khoá theo IP lấy từ `clientIpOf(req)`, và hàm đó **luôn tin**
header `X-Forwarded-For`:

```js
const forwarded = req.headers['x-forwarded-for'];
if (first) return String(first).split(',')[0].trim();   // client tự đặt được
```

Header này client tự đặt được. Đổi giá trị mỗi request thì mỗi lần thử rơi vào một
ô đếm khác nhau — **toàn bộ chống brute-force bị vô hiệu**: đăng nhập, đăng ký,
đăng nhập mạng xã hội, gửi tin, tố cáo, đặt câu hỏi, presence.

Xác nhận bằng repro (giới hạn đăng ký 30 lượt/10 phút):

```
[1] KHÔNG đổi X-Forwarded-For: 30 thành công / 30 bị chặn  -> limiter HOẠT ĐỘNG
[2] ĐỔI X-Forwarded-For mỗi lượt: 61/61 thành công        -> BYPASS ĐƯỢC limiter
```

**Đã vá:** chỉ tin header này khi người vận hành khai báo rõ server **đứng sau
proxy** bằng `FFORUM_TRUST_PROXY=1`. Mặc định lấy địa chỉ socket thật, không giả
được. Sau khi vá:

```
[2] ĐỔI X-Forwarded-For mỗi lượt: 0/61 thành công -> không bypass được
```

> Khi triển khai sau reverse proxy (nginx, Cloudflare Tunnel…), phải đặt
> `FFORUM_TRUST_PROXY=1`, nếu không mọi người dùng sẽ dùng chung một ô đếm IP.

## 34. Nhánh WS của các thao tác quản trị CLB yếu hơn bản HTTP

**Mức độ:** Trung bình · **Vị trí:** `APPROVE_CLUB`, `REJECT_CLUB` trong `server/forumServer.ts`

**(a) `APPROVE_CLUB` im lặng bỏ qua khi payload sai dạng.** Handler lấy
`const clubId = payload` — tức coi **nguyên payload** là mã CLB. Client gửi đúng
dạng đó (`payload: clubId`, chuỗi thô), nhưng `REJECT_CLUB` ngay bên cạnh lại nhận
`{ clubId, reason }`. Gửi nhầm `{ clubId }` thì `find` không thấy gì và handler
`break` **không báo lỗi nào** — người duyệt bấm mà không có chuyện gì xảy ra. Nay
nhận cả hai dạng, và luôn phản hồi: `NOT_FOUND` nếu CLB không tồn tại, phát lại
`APPROVE_CLUB` nếu đã duyệt rồi.

**(b) `REJECT_CLUB` không validate gì.** Bản HTTP của cùng thao tác kiểm thiếu mã
→ 400, CLB không tồn tại → 404, lý do cắt 500 ký tự. Nhánh WS thì:

```js
store.clubs = store.clubs.map(c =>
  c.id === clubId ? { ...c, status: 'REJECTED', rejectReason: reason } : c);
broadcastServerEvent('REJECT_CLUB', payload);   // phát ngược payload thô
```

nên `reason` thô được ghi thẳng vào store và xuống đĩa không giới hạn độ dài,
phát ngược nguyên payload client cho mọi client, và từ chối một mã không tồn tại
vẫn báo thành công.

**(c) Từ chối một CLB đã duyệt không rút lại quyền.** Chủ nhiệm vẫn giữ
`role: 'CLUB_LEADER'` và vẫn còn mã CLB trong `scopedClubIds` — tức còn quyền quản
trị phạm vi một CLB đã bị loại. Nay rút mã khỏi `scopedClubIds`, và nếu không còn
CLB nào thì hạ về `STUDENT`, kèm phát `SYNC_USER`.

> **Sửa bổ sung:** lần vá đầu chỉ sửa nhánh **WS**. Chạy lại bộ E2E — vốn đi qua
> **HTTP** `POST /api/clubs/reject` — mới lộ ra bản HTTP vẫn quên rút quyền:
>
> ```
> [1] sau khi duyệt:    role=CLUB_LEADER scopedClubIds=["club-mutut4pp-2b5d8d42"]
> [2] từ chối qua HTTP: 200
> [3] sau khi từ chối:  role=CLUB_LEADER scopedClubIds=["club-mutut4pp-2b5d8d42"]  ← LỖI
> ```
>
> Cùng một thao tác có hai đường vào thì phải vá cả hai. Test #52 khoá bản HTTP.

---

## 35. Cờ cấp module không chặn được việc cài lặp handler khi reload

**Mức độ:** Trung bình · **Vị trí:** `installShutdownFlush()` trong `server/forumServer.ts`

Mục 31 thêm móc ghi dữ liệu khi tắt tiến trình, với một cờ để chỉ cài một lần:

```js
let shutdownHooksInstalled = false;
function installShutdownFlush() {
  if (shutdownHooksInstalled) return;
  shutdownHooksInstalled = true;
  ...
}
```

Cờ này ở **cấp module**. Vite reload module server mỗi lần tệp thay đổi, nên mỗi
lần reload tạo một instance module mới với cờ đã đặt lại — trong khi bộ handler
của lần trước vẫn dính trên `process`.

Repro (nạp module 6 lần qua query string khác nhau để Node tạo instance mới):

```
trước khi sửa: SIGTERM = 1, 2, 3, 4, 5, 6
sau khi sửa:   SIGTERM = 1, 1, 1, 1, 1, 1
```

Trên dev server thật, log hiện đúng cảnh báo đó:

```
MaxListenersExceededWarning: Possible EventEmitter memory leak detected.
11 SIGTERM listeners added to [process]. MaxListeners is 10.
```

**Nguy hiểm hơn việc tràn listener:** handler của module cũ vẫn giữ closure trỏ
tới `store` của module cũ. Nếu chúng chạy thì sẽ ghi đè tệp dữ liệu bằng bản đã
lỗi thời — đúng loại mất dữ liệu mà mục 31 và 32 đang cố ngăn.

**Đã sửa:** lưu bộ handler trên `globalThis` qua `Symbol.for('fforum.shutdownHooks')`
(sống sót qua reload module), và **gỡ bộ cũ trước khi gắn bộ mới**. Test #49.

---

## 36. Phát ngược payload thô của client cho mọi người

**Mức độ:** Trung bình · **Vị trí:** WS `NEW_CHAT_MESSAGE`, `MARK_BEST_SOLUTION`

Hai nhánh WS phát ngược nguyên `payload` do client gửi, thay vì bản đã kiểm
duyệt:

```js
broadcastServerEvent('NEW_CHAT_MESSAGE', payload);
broadcastServerEvent('MARK_BEST_SOLUTION', payload);
```

**(a) Tin nhắn ma.** Nhánh xử lý tin trùng id (client gửi lại, hoặc hai kênh cùng
đưa về) không ghi vào kho nhưng vẫn phát payload thô:

```js
if (!store.chatMessages.some(m => m.id === payload.id)) { ... break; }
broadcastServerEvent('NEW_CHAT_MESSAGE', payload);   // <-- phát mà không lưu
```

Chỉ cần lấy một id có sẵn kèm nội dung tuỳ ý là đẩy được một tin **ma** lên màn
hình tất cả client: không bị cắt độ dài, không qua lọc nào, và reload là biến mất
vì nó không nằm trong store.

**(b) Trường thừa lọt qua.** `MARK_BEST_SOLUTION` chỉ cần `questionId` và
`solutionId`, nhưng phát cả payload nên mọi trường client tự bịa (`adminEmail`,
ghi chú…) đều tới tay mọi người.

**Đã sửa:** phát lại đúng bản đã lưu trong kho, và phát đúng hai trường client
dùng (khớp bản HTTP của cùng thao tác). Test #50 và #51 — cả hai **fail trước khi
vá, pass sau khi vá**.

---

## 37. Chuyển sang kênh WebSocket để vượt mọi giới hạn ghi

**Mức độ:** Cao · **Vị trí:** handler message WS trong `server/forumServer.ts`

Năm đường ghi qua WS không có rate limiter nào, trong khi bản HTTP của chính chúng
thì có:

| Thao tác | HTTP | WS (trước khi vá) |
|---|---|---|
| Gửi tin nhắn | `writeLimiter` — chặn ở lượt 121 | **không có** |
| Đặt câu hỏi | `writeLimiter` | **không có** |
| Gửi lời giải | `writeLimiter` | **không có** |
| Lập câu lạc bộ | `writeLimiter` | **không có** |
| Đăng bài CLB | `writeLimiter` | **không có** |

Nghĩa là mọi công sức giới hạn tốc độ ở tầng HTTP đều vô nghĩa: client chỉ cần đổi
kênh. Repro chỉ dùng WS, tiến trình sạch, giới hạn 120 lượt/phút:

```
trước khi vá: 200/200 được lưu, nhận 0 lần RATE_LIMITED
sau khi vá:   120/200 được lưu, nhận 80 lần RATE_LIMITED
```

Nguyên nhân gốc: `wss.emit('connection', ws, req)` **có** truyền `req` nhưng handler
`wss.on('connection', (ws) => …)` không nhận tham số thứ hai, nên server không có
cách nào biết IP của kết nối để làm khoá limiter.

**Đã vá:** thêm `wsClientIps` (WeakMap lưu IP theo kết nối, lấy từ `clientIpOf(req)`
lúc bắt tay), và kiểm tra `writeLimiter` ở đầu handler message cho cả năm thao tác —
dùng **đúng bộ limiter và đúng khoá IP** (`chat:`, `question:`, `solution:`, `club:`,
`clubpost:`) như bản HTTP nên hai kênh dùng chung một ô đếm, không thể cộng dồn để
vượt trần. Vượt trần thì trả `RATE_LIMITED` kèm `retryAfterMs`.

Test #53.

> **Bài học chung:** cùng một thao tác có hai đường vào (HTTP và WS) thì mọi chốt
> kiểm — xác thực, validate, giới hạn độ dài, giới hạn tốc độ — phải có ở CẢ HAI.
> Mục 34 và 37 đều là biến thể của cùng một lớp lỗi này.

---

## 38. Không có cơ chế thực thi kiểm duyệt tài khoản

**Mức độ:** Cao · **Vị trí:** `server/forumServer.ts`, toàn bộ các đường ghi HTTP/WS

Trước đây Super Admin có thể mở hộp thư tố cáo và đánh dấu báo cáo là đã xử lý,
nhưng không có thao tác nào thực sự ngăn người bị tố cáo tiếp tục đăng. Tố cáo
được "giải quyết" trên giao diện trong khi tài khoản vẫn có thể gửi chat, câu hỏi,
lời giải, hồ sơ CLB và bài đăng CLB. Cũng không có nhật ký ai đã quyết định gì.

**Đã vá:**
- `server/moderation.ts` là module thuần cho bốn hành động `ban`, `mute`, `unban`,
  `unmute`; thời hạn 15 phút / 1 giờ / 1 ngày / 7 ngày / vĩnh viễn; tự hết hạn và
  dọn bản ghi chết. `0` nghĩa là vĩnh viễn (không dùng `Infinity`, vì JSON sẽ đổi
  thành `null`). Lý do tối đa 500 ký tự; thao tác lặp cùng yêu cầu là no-op.
- `POST /api/admin/moderate` chỉ Super Admin, xác minh tài khoản mục tiêu có thật,
  từ chối tự khoá / khoá Super Admin, bắt buộc có lý do và chỉ nhận các thời hạn
  UI đã công bố. Không trả cả map moderation trong response.
- Một helper `checkCanPost` kiểm tra cả HTTP lẫn WebSocket: cấm đăng chặn chat,
  câu hỏi, lời giải, lập CLB, bài CLB; khoá chat chỉ chặn chat. Các quyết định
  được lưu bền vững qua restart, nhật ký có tối đa 300 mục và chỉ Super Admin đọc.
- `GET /api/admin/users` tìm theo tên/email/mã/lớp, không phân biệt dấu, tối đa 20
  kết quả và chỉ trả các trường cần thiết; query rỗng chỉ liệt kê người đang bị áp
  chế. `GET /api/admin/audit` giới hạn tối đa 100 mục mỗi lần đọc.
- Bảng điều khiển có thời hạn + lý do, xác nhận cấm vĩnh viễn, nút gỡ, trạng thái
  đang có hiệu lực và nhật ký ai / lúc nào / làm gì. Tài khoản Super Admin được
  bảo vệ ở cả giao diện lẫn máy chủ.

Test #55 và #56; test #55 được chứng minh fail khi tạm bỏ chốt WebSocket: cả năm
đường ghi WS lọt qua mặc dù HTTP đã chặn.

---

## 39. Chat tin email do client tự khai, cho phép mạo danh và lách kiểm duyệt

**Mức độ:** Cao · **Vị trí:** `POST /api/chat`, `NEW_CHAT_MESSAGE` qua WebSocket

HTTP nhận `authorEmail` từ body rồi tra người dùng để điền tên/cấp mà không buộc
email đó khớp phiên đăng nhập. WS chat còn phát lại payload do client tự khai.
Một tài khoản bị cấm có thể đổi `authorEmail` sang email không bị cấm; khách cũng
có thể mượn email của tài khoản thật để gửi dưới danh tính đó. Khi thêm moderation,
đây là lối lách trực tiếp qua chốt `checkCanPost`.

**Đã vá:**
- HTTP chat lấy danh tính từ Bearer token; email body khác phiên → 403. Khách vẫn
  được gửi chat công khai, nhưng không được nhận vơ email của tài khoản đã đăng ký
  (401); tin khách được lưu với email rỗng.
- WS chat dùng email từ phiên `AUTH`, từ chối payload lệch danh tính; kết nối chưa
  xác thực không được tự khai email tài khoản thật. Moderation chỉ dùng danh tính
  của phiên, không tin payload.
- Tín hiệu `USER_MODERATED` chỉ gửi đến WebSocket của chính người bị áp chế; không
  broadcast email / lý do nội bộ ra toàn cộng đồng.

Test #56 kiểm tra giả danh bằng cả HTTP và WS; tin giả không được ghi vào store.

---

## 40. Dashboard đếm nhầm người nhận báo cáo thành người bị tố

**Mức độ:** Trung bình · **Vị trí:** `GET /api/admin/overview`, thống kê `topReported`

Bản đầu của bảng điều khiển gom báo cáo theo `targetEmail`. Trường này là email
NHẬN báo cáo (Super Admin), không phải người bị tố cáo; kết quả là dashboard có
thể báo admin là người bị tố cáo nhiều nhất trong khi bỏ qua các tài khoản thật.

**Đã vá:** group theo `reportedUserId`, ánh xạ id về email tài khoản trong store;
nếu tài khoản không còn tồn tại thì dùng `reportedUserName` / id làm nhãn. Không
trả nội dung hay lý do tố cáo trong thống kê. Test #56 tạo một báo cáo tới user
kiểm thử và xác nhận `topReported` trỏ đúng email người bị tố. Đã chứng minh test
fail khi tạm khôi phục phép đếm cũ.

---

## 41. Có thể dò trạng thái/lý do cấm bằng email chưa xác thực

**Mức độ:** Trung bình · **Vị trí:** `POST /api/questions`, `POST /api/solutions`

Khi nối moderation vào các endpoint này, kiểm tra ban ban đầu đứng trước bước
xác thực token. Người ngoài chỉ cần biết email mục tiêu là phân biệt được tài
khoản bị cấm qua `403`, thậm chí đọc lý do nội bộ trong thông báo — dù họ không
đăng nhập được bằng tài khoản đó.

**Đã vá:** với tài khoản đã đăng ký, kiểm tra Bearer token khớp email trước; token
thiếu/sai chỉ nhận `401` chung. Chỉ sau đó mới trả `403` cùng lý do cho đúng chủ
phiên. Test #55 xác nhận chat/question/club của chủ tài khoản bị cấm nhận 403,
nhưng dò bằng email không token ở question/solution chỉ nhận 401 và không lộ lý do.

---

## Mô hình phân quyền hiện tại

| Tầng | Cơ chế |
|---|---|
| Mật khẩu | scrypt + salt, so khớp thời gian cố định, tự nâng cấp bản ghi cũ |
| Phiên | Token HMAC-SHA256, hạn 30 ngày, gửi qua `Authorization: Bearer` |
| WebSocket | Bắt tay `AUTH` → gắn `SessionClaims` cho từng kết nối |
| Hồ sơ | Chỉ chủ tài khoản; `role`/`id`/`email` do server sở hữu; `level` tính lại từ `xp` |
| Kiểm duyệt | Super Admin có token; cấm/khoá chat được thực thi trên cả HTTP + WS; audit tối đa 300 mục |
| Tiền tệ | Kiểm số dư, thưởng idempotent, khử trùng lặp bản ghi |
| Tần suất | Cửa sổ trượt theo IP/email, `429` + `Retry-After` |
| Social | Xác minh access token với nhà cung cấp, so khớp email |
| Tố cáo | Hộp thư chỉ Super Admin đọc được; xử lý có thể đi kèm cấm/khoá; dữ liệu sống sót qua restart |
| Nội dung | Server tự cắt độ dài, không tin `maxLength` của client; kho dữ liệu có trần |
| Câu lạc bộ | Lập cần đăng nhập; duyệt/từ chối chỉ Super Admin; người sáng lập lấy từ token |
| Trực tuyến | `email`/`role` trong gói presence chỉ lấy từ phiên đã xác thực |
| Nội dung đăng | Tên, ảnh, cấp bậc hiển thị lấy từ bản ghi thật — không đăng dưới danh tính người khác được |
| Nền kinh tế | WS ghi câu hỏi/lời giải phải đăng nhập và bị trừ coin thật; không tự chọn đáp án của chính mình |

## Biến môi trường

Xem `.env.example`. `FFORUM_SESSION_SECRET` có thể để trống vì server tự sinh và
lưu vào `data/session-key`. Không có OAuth phía máy chủ thì tài khoản thường vẫn
đăng nhập social ở chế độ demo, nhưng quyền Super Admin không được cấp qua social.
Cài mới muốn đăng nhập Super Admin bằng mật khẩu phải đặt `FFORUM_ADMIN_PASSWORD`
riêng, dài tối thiểu 16 ký tự; không có secret này thì không tồn tại mật khẩu mặc
định. Credential mẫu công khai từ bản cũ được tự động thu hồi.

## Chạy kiểm thử bảo mật

```bash
node --test tests/security-hardening.test.mjs   # 60 bài, chạy trên server thật
npm test                                        # toàn bộ 225 bài
```
