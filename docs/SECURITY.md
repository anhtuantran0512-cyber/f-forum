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
ghi plaintext còn sót được nâng cấp ngay lần đăng nhập thành công kế tiếp.

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
sửa được hồ sơ của mình; `role` / `id` / `email` là trường server sở hữu và bị
loại khỏi payload; `level` luôn được tính lại từ `xp`.

---

## 4. Chiếm quyền quản trị qua đăng nhập xã hội

**Mức độ:** Nghiêm trọng · **Vị trí:** `POST /api/auth/social`

Endpoint nhận `email` **do client tự khai** và cấp tài khoản tương ứng — kể cả tài
khoản Super Admin — mà không hề kiểm chứng với Google/Facebook.

```bash
curl -X POST /api/auth/social -d '{"provider":"google","email":"anhtuantran0512@gmail.com"}'
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
if (adminEmail !== 'anhtuantran0512@gmail.com') return 403;
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
    email: 'anhtuantran0512@gmail.com', role: 'SUPER_ADMIN' } }) });
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

---

## Mô hình phân quyền hiện tại

| Tầng | Cơ chế |
|---|---|
| Mật khẩu | scrypt + salt, so khớp thời gian cố định, tự nâng cấp bản ghi cũ |
| Phiên | Token HMAC-SHA256, hạn 30 ngày, gửi qua `Authorization: Bearer` |
| WebSocket | Bắt tay `AUTH` → gắn `SessionClaims` cho từng kết nối |
| Hồ sơ | Chỉ chủ tài khoản; `role`/`id`/`email` do server sở hữu; `level` tính lại từ `xp` |
| Kiểm duyệt | Super Admin có token hợp lệ, hoặc chủ nội dung với nội dung của mình |
| Tiền tệ | Kiểm số dư, thưởng idempotent, khử trùng lặp bản ghi |
| Tần suất | Cửa sổ trượt theo IP/email, `429` + `Retry-After` |
| Social | Xác minh access token với nhà cung cấp, so khớp email |
| Tố cáo | Hộp thư chỉ Super Admin đọc được; báo cáo sống sót qua khởi động lại |
| Nội dung | Server tự cắt độ dài, không tin `maxLength` của client; kho dữ liệu có trần |
| Câu lạc bộ | Lập cần đăng nhập; duyệt/từ chối chỉ Super Admin; người sáng lập lấy từ token |
| Trực tuyến | `email`/`role` trong gói presence chỉ lấy từ phiên đã xác thực |
| Nội dung đăng | Tên, ảnh, cấp bậc hiển thị lấy từ bản ghi thật — không đăng dưới danh tính người khác được |
| Nền kinh tế | WS ghi câu hỏi/lời giải phải đăng nhập và bị trừ coin thật; không tự chọn đáp án của chính mình |

## Biến môi trường

Xem `.env.example`. Tất cả đều **tuỳ chọn**: không có `FFORUM_SESSION_SECRET` thì
server tự sinh và lưu vào `data/session-key`; không có credential OAuth thì tài
khoản thường vẫn đăng nhập social được, riêng quyền quản trị thì không.

## Chạy kiểm thử bảo mật

```bash
node --test tests/security-hardening.test.mjs   # 37 bài, chạy trên server thật
npm test                                        # toàn bộ 133 bài
```
