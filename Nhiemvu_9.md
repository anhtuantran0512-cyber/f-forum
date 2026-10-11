  
\---

\# 🚀 MEGA BUILD PROMPT v3 — "SPRINT: BUGFIX, SUB-LAYOUT REDESIGN & THREAD SYSTEM"

\#\# \[ROLE\]  
Bạn là \*\*Senior Full-stack Engineer kiêm Product Designer\*\*, phụ trách 1 đợt cập nhật lớn gồm 5 Phase. \*\*Nguyên tắc xuyên suốt:\*\* Cắt chữ thừa, đảm bảo Color Contrast chuẩn WCAG, đồng bộ Design System, không dùng Modal cho nội dung nặng, gradient chỉ là trang trí nền.

\#\# ⚠️ RÀNG BUỘC TUYỆT ĐỐI — ĐỌC KỸ TRƯỚC KHI LÀM BẤT CỨ GÌ  
\`\`\`  
TUYỆT ĐỐI KHÔNG được sửa, thay thế, viết lại, hay động chạm vào   
component Navbar hiện tại dưới bất kỳ hình thức nào — giữ nguyên   
100% code, vị trí, chiều cao, logo, menu items, style hiện có.

Mọi thay đổi trong Phase 2 và Phase 4 CHỈ được áp dụng cho phần   
Content Area/Body nằm BÊN DƯỚI Navbar, thông qua kỹ thuật tính   
chiều cao calc(100vh \- navbar-height), KHÔNG tạo thêm bất kỳ   
thanh điều hướng/Rail/Sidebar thay thế Navbar nào khác.  
\`\`\`

\*\*Thứ tự thực thi bắt buộc:\*\* Phase 1 → 2 → 3 → 4 → 5 (không nhảy cóc).

\---

\# 🔧 PHASE 1 — CRITICAL BUG FIXES

\#\# 1.1. Fix Lỗi Viền Trắng Sai Vị Trí (Q\&A Modal cũ)  
\`\`\`  
Chẩn đoán: Sticky Footer nằm SAI trong vùng overflow-scroll,   
hoặc border-radius gán nhầm element không phải cuối DOM,   
hoặc box-shadow bị overflow:hidden cắt lộ sai vị trí.  
\`\`\`  
\`\`\`css  
.modal-container { border-radius: 20px; overflow: hidden; display: flex; flex-direction: column; max-height: 80vh; }  
.modal-body { flex: 1; overflow-y: auto; }  
.modal-footer { flex-shrink: 0; border-top: 1px solid var(--border-subtle); }  
\`\`\`

\#\# 1.2. Fix Gradient Đè Lên Toàn Trang (Gradient Bleeding)  
\`\`\`  
Chẩn đoán: z-index dương/ngang hàng content, mix-blend-mode trên nền   
tổng thể, filter trên parent container, overlay trắng/đen phủ toàn trang.  
\`\`\`  
\`\`\`html  
\<div class="layer-base-color"\>\</div\>  
\<div class="layer-gradient-aura"\>\<div class="aura-blob aura-blob-1"\>\</div\>\</div\>  
\<div class="content-layer"\>...\</div\>  
\`\`\`  
\`\`\`css  
.layer-base-color { position: fixed; inset: 0; z-index: \-3; background: var(--bg-base); }  
.layer-gradient-aura { position: fixed; inset: 0; z-index: \-2; overflow: hidden; pointer-events: none; }  
.aura-blob { position: absolute; width: 500px; height: 500px; border-radius: 50%; filter: blur(120px); opacity: 0.35; }  
.aura-blob-1 { background: radial-gradient(circle, \#667EEA 0%, transparent 70%); top: \-10%; left: \-5%; }  
.content-layer { position: relative; z-index: 1; /\* KHÔNG filter, KHÔNG mix-blend-mode \*/ }  
\`\`\`

\*\*Checklist Phase 1:\*\*  
\- \[ \] Viền trắng Q\&A đã biến mất, Footer luôn cố định đáy  
\- \[ \] Gradient đã về z-index âm; ẩn thử layer → UI giữ đúng màu gốc

\---

\# 💬 PHASE 2 — SUB-LAYOUT FIX & CHAT REDESIGN (GIỮ NGUYÊN NAVBAR)

\#\# 2.1. Chẩn đoán nguyên nhân thực sự  
\`\`\`  
❌ KHÔNG PHẢI do Navbar sai. Nguyên nhân thật:  
1\. Content Area dưới Navbar không tính đúng chiều cao   
   (height: 100vh thay vì calc(100vh \- navbar-height))   
   → gây cuộn kép (cuộn cả trang LẪN cuộn trong khung chat)

2\. Trang Chat tự vẽ thêm 1 dòng tiêu đề to RIÊNG ngay sát dưới   
   Navbar (VD: "Phòng Chat Đàm Thoại Thời Gian Thực \[LIVE DOCK\]")   
   → tạo cảm giác "2 tầng điều hướng chồng nhau"

3\. Sidebar kênh \+ Member list không giới hạn đúng chiều cao,   
   tràn lố hoặc bị cắt  
\`\`\`

\#\# 2.2. Giải pháp — Content Wrapper tính đúng chiều cao  
\`\`\`jsx  
\<ExistingNavbar /\>   {/\* KHÔNG ĐỘNG VÀO — giữ nguyên y hệt hiện tại \*/}

\<PageContentWrapper style={{ height: 'calc(100vh \- var(--navbar-height))' }}\>  
  {/\* Toàn bộ layout Chat nằm gọn trong khung này,   
      TỰ cuộn bên trong, không đẩy cả trang cuộn theo \*/}  
\</PageContentWrapper\>  
\`\`\`  
\`\`\`css  
:root { \--navbar-height: 72px; /\* LẤY ĐÚNG chiều cao THẬT của Navbar hiện tại, đo bằng DevTools, không đoán \*/ }  
.page-content-wrapper { height: calc(100vh \- var(--navbar-height)); overflow: hidden; display: flex; }  
\`\`\`

\#\# 2.3. Layout Chat mới (Navbar đứng yên, chỉ sửa phần dưới)  
\`\`\`  
┌─────────────────────────────────────────────────┐  
│  \[NAVBAR HIỆN TẠI \- KHÔNG ĐỔI GÌ\]                 │  
├──────────────┬──────────────────────┬────────────┤  
│ \# KÊNH        │ \#Góc tâm sự   🔍👥⚙️ │ THÀNH VIÊN │ ← height: calc(100vh \- navbar)  
│ 👋 Kết bạn 15│                       │ 🟢 Tuấn Anh│  
│ 💙 Góc tâm sự│   \[Khu vực tin nhắn\]  │            │  
│              ├──────────────────────┤            │  
│ \[Avatar\]     │ \[+\]\[Nhắn tin...\]\[➤\]  │            │  
└──────────────┴──────────────────────┴────────────┘  
\`\`\`

\#\# 2.4. Danh sách cắt bỏ nội dung thừa (Over-explaining UI)  
\`\`\`  
❌ XÓA: Dòng tiêu đề to "📡 Phòng Chat Đàm Thoại Thời Gian Thực \[LIVE DOCK\]"   
   ngay dưới Navbar — đây CHÍNH LÀ nguyên nhân gây cảm giác   
   "2 thanh điều hướng chồng nhau" mà bạn thấy khó chịu.  
   → Navbar đã đủ cho biết đang ở trang nào, không cần nhắc lại.

❌ "Tôn trọng nhau — vi phạm sẽ bị khoá tài khoản" → chuyển icon (i) tooltip  
❌ Mô tả dài dưới mỗi kênh sidebar → chỉ giữ icon \+ tên \+ badge số  
❌ Mô tả dài ở header kênh trong khung chat → chỉ giữ tên kênh  
❌ Empty state lặp 2 dòng → rút gọn 1 dòng ("Hãy là người mở đầu 👋")  
❌ Thanh cooldown luôn hiện → ẨN HOÀN TOÀN, chỉ hiện badge nhỏ khi ĐANG cooldown  
❌ "Kênh phát thanh nội bộ" mô tả dài → thu gọn status pill nhỏ, chỉ hiện khi active  
\`\`\`  
\`\`\`jsx  
\<ChannelItem\>  
  \<Icon size={18} /\> \<ChannelName\>{name}\</ChannelName\>  
  {unread \> 0 && \<UnreadBadge\>{unread}\</UnreadBadge\>}  
\</ChannelItem\>

{isOnCooldown ? \<CooldownBadge\>Chờ {remainingSeconds}s\</CooldownBadge\> : null}  
\`\`\`  
\`\`\`css  
.message-input-bar { display: flex; align-items: center; gap: 8px; padding: 10px 14px; background: var(--surface-elevated); border-radius: 24px; margin: 12px; }  
.channel-item.active { background: var(--surface-active); color: var(--text-primary); }  
\`\`\`

\*\*Checklist Phase 2:\*\*  
\- \[ \] Navbar hiện tại GIỮ NGUYÊN 100% — không sửa 1 dòng code nào của nó  
\- \[ \] Content Area dùng \`calc(100vh \- navbar-height)\`, hết cuộn kép  
\- \[ \] Đã XÓA dòng tiêu đề to thừa ngay dưới Navbar (nguyên nhân chính gây khó chịu)  
\- \[ \] Channel Sidebar \+ Main \+ Member List tách 3 vùng rõ ràng, giới hạn đúng chiều cao, không tràn  
\- \[ \] Mọi caption/mô tả dài đã bị xóa khỏi hiển thị mặc định

\---

\# 🏛️ PHASE 3 — CLUB PLAZA REDESIGN

\`\`\`  
Fix 1 \- Contrast: Trang dùng chung nền tối Design System chính,   
KHÔNG tự ý dùng gradient pastel sáng riêng. Nếu giữ tông sáng →   
overlay tối rgba(0,0,0,0.4) phía sau text. Contrast tối thiểu 4.5:1.

Fix 2 \- CTA Triplication: Chỉ giữ 1 nút "Đăng ký thành lập CLB"   
duy nhất (góc trên phải), xóa các nút trùng lặp trong banner.

Fix 3 \- Double Empty State: Gộp thành 1 Empty State DUY NHẤT khi   
chưa có CLB nào (Illustration \+ 1 câu \+ 1 nút, giữa màn hình).   
Banner "CLB xuất sắc" CHỈ hiện khi có dữ liệu thật.

Fix 4 \- Text thừa: Xóa câu giải thích cơ chế "danh hiệu tự động   
cập nhật...", đẩy vào Tooltip/FAQ.  
\`\`\`  
\`\`\`css  
.club-plaza-page { background: var(--bg-base); color: var(--text-primary); }  
.club-badge-accent { color: var(--accent-gold); }  
\`\`\`  
Card CLB (khi có dữ liệu): ảnh \+ tag category \+ tên \+ số thành viên \+ 2 nút ("Tham gia" / "Xem →"), KHÔNG mô tả dài.

\*\*Checklist Phase 3:\*\*  
\- \[ \] Header đạt contrast ≥ 4.5:1, nền đồng bộ dark theme  
\- \[ \] Chỉ 1 CTA, chỉ 1 Empty State

\---

\# 📄 PHASE 4 — Q\&A DETAIL PAGE (SUB-LAYOUT FIX \+ CONTENT STRUCTURE v2)

\#\# 4.1. Routing & Layout (Navbar giữ nguyên, không thêm Rail)  
\`\`\`  
/hoi-dap                → Danh sách (dùng Navbar hiện tại bình thường)  
/hoi-dap/\[id\]-\[slug\]    → Chi tiết (CŨNG dùng Navbar hiện tại y hệt,   
                           chỉ Content Area bên dưới được tái cấu trúc)  
\`\`\`  
\`\`\`jsx  
\<ExistingNavbar /\>   {/\* KHÔNG ĐỔI \*/}  
\<PageContentWrapper style={{ height: 'calc(100vh \- var(--navbar-height))', overflowY: 'auto' }}\>  
  {/\* Nội dung Q\&A Detail nằm trong đây \*/}  
\</PageContentWrapper\>  
\`\`\`  
\`\`\`  
┌─────────────────────────────────────────────────┐  
│  \[NAVBAR HIỆN TẠI \- KHÔNG ĐỔI GÌ\]                 │  
├───────────────────────────────┬──────────────────┤  
│  ← Hỏi đáp        \[🔖\]\[🔗\]     │ 💡 LIÊN QUAN      │  
│  \#Toán 🪙 \+10 Coin             │ • Tích phân...    │  
│  \[Nội dung câu hỏi \+ ảnh\]      │──────────────────│  
│  \[Answer cards...\]             │ 🏆 TOP GIẢI       │  
└───────────────────────────────┴──────────────────┘  
      ↑ Content chính max-width \~720-900px, căn giữa khu vực của nó   
        (không phải căn giữa toàn màn hình, vì vẫn còn Sidebar liên quan)  
\`\`\`  
\- Reading Progress Bar mỏng (2px), đặt \`position: sticky; top: 0\` BÊN TRONG \`PageContentWrapper\` (không phải \`position: fixed\` toàn viewport, để không đè lên Navbar)

\#\# 4.2. Tách bạch trực quan Câu hỏi ↔ Câu trả lời  
\`\`\`  
┌─────────────────────────────────────────┐  
│ 📦 QUESTION CARD (--surface-overlay,     │  
│    sáng nhất, nổi bật nhất)              │  
│    \[Avatar\] Tên • thời gian              │  
│    Nội dung câu hỏi \+ \[Ảnh nếu có\]       │  
│    \[👍\]\[💬 Bình luận \- thu gọn\]          │  
└─────────────────────────────────────────┘  
        ↕ gap: 24px (khoảng trống RÕ, không border)  
───── 2/3 LỜI GIẢI ĐÃ GỬI ─────            ← Label phân cách  
        ↕ gap: 16px  
┌─────────────────────────────────────────┐  
│ 📦 ANSWER CARD \#1 (--surface-elevated,   │  
│    nhạt hơn Question để phân cấp)        │  
│    \[✓ Đáp án đúng \- viền glow xanh\]      │  
│    \[👍\]\[💬 Bình luận riêng của answer\]   │  
└─────────────────────────────────────────┘  
\`\`\`  
\`\`\`css  
.question-card { background: var(--surface-overlay); border-radius: 20px; padding: 24px; margin-bottom: 24px; }  
.answer-section-label { display: flex; align-items: center; gap: 8px; color: var(--text-secondary); font-size: 13px; text-transform: uppercase; }  
.answer-section-label::before, .answer-section-label::after { content: ''; flex: 1; height: 1px; background: var(--border-subtle); }  
.answer-card { background: var(--surface-elevated); border-radius: 16px; padding: 20px; margin-bottom: 16px; border-left: 3px solid transparent; }  
.answer-card.verified { border-left-color: var(--success-glow); box-shadow: 0 0 24px rgba(16, 185, 129, 0.08); }  
\`\`\`

\#\# 4.3. Tối ưu không gian khi có ảnh  
\`\`\`  
\- Ảnh đơn: max-height 420px, object-fit: contain (KHÔNG crop đề bài),   
  click → Lightbox phóng to toàn màn hình  
\- Text ngắn (\<100 ký tự) \+ có ảnh → Desktop layout 2 cột (40%/60%),   
  Mobile LUÔN xếp dọc  
\- Nền phía sau ảnh dùng \--surface-base (tối hơn card) để ảnh "nổi" lên  
\`\`\`  
\`\`\`css  
.image-wrapper { max-height: 420px; border-radius: 12px; overflow: hidden; background: var(--surface-base); display: flex; justify-content: center; cursor: zoom-in; }  
.image-wrapper img { max-height: 420px; width: auto; object-fit: contain; }  
@media (min-width: 1024px) {  
  .question-card.compact-with-image { display: grid; grid-template-columns: 40% 60%; gap: 20px; }  
}  
\`\`\`

\#\# 4.4. Hệ thống Bình luận (Polymorphic Comments)  
\`\`\`sql  
Comments  
\- id, author\_id, content (VARCHAR 300\)  
\- commentable\_type (ENUM: 'question', 'answer')  
\- commentable\_id (INT)  
\- status (ENUM: 'active', 'hidden', DEFAULT 'active')  
\- created\_at  
INDEX idx\_commentable (commentable\_type, commentable\_id)  
\`\`\`  
\`\`\`jsx  
function CommentThread({ commentableType, commentableId }) {  
  const \[expanded, setExpanded\] \= useState(false);  
  const { comments, count } \= useComments(commentableType, commentableId);  
  return (  
    \<div className="comment-thread"\>  
      \<button onClick={() \=\> setExpanded(\!expanded)}\>💬 {count} bình luận {expanded ? '▴' : '▾'}\</button\>  
      {expanded && (\<\>  
        {comments.map(c \=\> \<CommentItem key={c.id} comment={c} /\>)}  
        \<CommentComposer maxLength={300} onSubmit={(text) \=\> postComment(commentableType, commentableId, text)} /\>  
      \</\>)}  
    \</div\>  
  );  
}  
\`\`\`  
Áp dụng ĐỘC LẬP cho CẢ Question lẫn TỪNG Answer riêng biệt. Thu gọn mặc định.

\#\# 4.5. Giới hạn tối đa 3 lời giải/câu hỏi  
\`\`\`javascript  
async function createAnswer(questionId, userId, content) {  
  const activeCount \= await db.count('answers', { question\_id: questionId, status: 'active' });  
  if (activeCount \>= 3\) {  
    throw new APIError(409, 'ANSWER\_LIMIT\_REACHED',   
      'Câu hỏi này đã đủ 3 lời giải rồi, hãy thử câu khác nhé 😊');  
  }  
  return db.insert('answers', { question\_id: questionId, author\_id: userId, content });  
}  
\`\`\`  
Khi đủ 3 answer active → ẩn Composer, hiện "✅ Đã đủ 3 lời giải". Khi Admin xóa 1 answer → slot trống ra, Composer tự hiện lại. Comment KHÔNG bị giới hạn bởi rule này. UI hiện "Còn 1/3 chỗ trống" khi chưa đủ.

\#\# 4.6. Admin Moderation — Xóa kèm lý do bắt buộc  
\`\`\`sql  
ModerationLogs  
\- id, moderator\_id, target\_type (ENUM: 'question','answer'), target\_id  
\- reason\_code (ENUM: 'inappropriate','spam','wrong\_knowledge','rule\_violation','other')  
\- reason\_note (TEXT, NULLABLE)  
\- original\_content\_snapshot (TEXT)  
\- created\_at  
\`\`\`  
Quyền: Chỉ Admin/Mod/Teacher thấy nút "⋯ → 🗑️ Xóa nội dung" (Question và từng Answer, không áp dụng Comment nhỏ). Modal bắt buộc chọn lý do trước khi xác nhận.  
\`\`\`javascript  
async function moderateDelete(targetType, targetId, moderatorId, reasonCode, reasonNote) {  
  const original \= await db.findOne(targetType \+ 's', { id: targetId });  
  await db.insert('moderation\_logs', { moderator\_id: moderatorId, target\_type: targetType,   
    target\_id: targetId, reason\_code: reasonCode, reason\_note: reasonNote,   
    original\_content\_snapshot: original.content });  
  await db.update(targetType \+ 's', { id: targetId }, { status: 'deleted' }); // Soft-delete  
  await notifyUser(original.author\_id, {   
    title: 'Nội dung của bạn đã được điều chỉnh',   
    message: \`Lý do: \${REASON\_LABELS\[reasonCode\]}. \${reasonNote || ''}\`, type: 'moderation' });  
}  
\`\`\`

\#\# 4.7. Tính năng bổ sung giữ nguyên  
\`\`\`  
\- Status Pill: 🟢 Đã có đáp án đúng / 🟡 Đang chờ / 🔵 Đang thảo luận  
\- Sidebar "Câu hỏi liên quan" (AI tag-matching) \+ "Top người giải tuần"  
\- Quick Reactions: 👍 Hữu ích · 🤯 Hay đó · 🙏 Cảm ơn  
\- Prefetch khi hover card ở trang danh sách, scroll restoration khi Back  
\`\`\`

\*\*Checklist Phase 4:\*\*  
\`\`\`  
\[ \] Navbar GIỮ NGUYÊN y hệt, Q\&A Detail chỉ sửa Content Area bên dưới  
\[ \] Content Area dùng calc(100vh \- navbar-height), Reading Progress Bar   
    sticky bên trong wrapper (không đè lên Navbar)  
\[ \] Question Card và Answer Card có màu nền KHÁC NHAU \+ label phân cách  
\[ \] Ảnh có max-height, object-fit:contain, click mở Lightbox  
\[ \] Comment hoạt động độc lập cho Question VÀ từng Answer (polymorphic)  
\[ \] API chặn đúng khi đã có 3 answer active; composer tự ẩn/hiện lại đúng  
\[ \] Nút xóa chỉ hiện với Admin/Mod/Teacher, bắt buộc chọn lý do  
\[ \] Soft-delete \+ lưu snapshot vào ModerationLogs, tác giả nhận thông báo  
\[ \] Answer verified (✓) tự nổi đầu nhưng 2 answer còn lại vẫn giữ nguyên  
\`\`\`

\---

\# 🧵 PHASE 5 — THREAD SYSTEM v1.0

\#\# Quyết định đã khóa  
\`\`\`  
✅ Public toàn trường | ✅ 1 ảnh/thread (v1) | ⏳ Ẩn danh → Backlog v2 | ✅ 480 ký tự  
\`\`\`

\#\# Database Schema  
\`\`\`sql  
Threads  
\- id, author\_id, content (VARCHAR 480), image\_url (NULLABLE), poll\_data (JSON, NULLABLE)  
\- parent\_thread\_id (FK self, NULLABLE), repost\_of\_id (FK self, NULLABLE), repost\_type (ENUM: simple/quote)  
\- depth\_level (INT, DEFAULT 0, MAX 3), status (ENUM: active/under\_review/hidden)  
\- created\_at, updated\_at

ThreadReactions  
\- id, thread\_id, user\_id, reaction\_type (ENUM: love/haha/fire/wow/support)  
\- UNIQUE(thread\_id, user\_id)

ThreadReports  
\- id, thread\_id, reporter\_id, reason, created\_at  
\-- Trigger: COUNT(reports) \>= 5 trong 1h → auto status='under\_review'  
\`\`\`

\#\# API Endpoints  
\`\`\`  
POST /api/threads | GET /api/threads?page=\&limit= | GET /api/threads/:id  
POST /api/threads/:id/reply | POST /api/threads/:id/repost | POST /api/threads/:id/react  
POST /api/threads/:id/report | DELETE /api/threads/:id | GET /api/threads/of-the-day  
\`\`\`  
Rate limit: 10 threads/giờ/user → 429 \+ \*"Bạn đã đăng hơi nhiều rồi, nghỉ chút nhé 😌"\*

\#\# Frontend Structure (Trang Thread cũng dùng Navbar hiện tại bình thường, không đổi)  
\`\`\`  
/pages/thread/index.jsx, \[id\].jsx  
/components/thread/: ThreadComposer, ThreadCard (Streak 🔥+class tag),   
  ThreadReplyNode (đệ quy max depth 3), ReactionPicker, RepostModal,   
  ThreadOfTheDayBanner (Mascot Cú 🦉), ReportButton (dùng chung Admin Panel)  
\`\`\`

\#\# Cron Job — Thread of the Day  
\`\`\`javascript  
async function calculateThreadOfTheDay() {  
  const since24h \= new Date(Date.now() \- 24\*60\*60\*1000);  
  const topThread \= await db.query(\`SELECT t.\*, (COUNT(DISTINCT r.id)\*1 \+ COUNT(DISTINCT rp.id)\*2) as score  
    FROM threads t LEFT JOIN thread\_reactions r ON r.thread\_id=t.id  
    LEFT JOIN threads rp ON rp.repost\_of\_id=t.id  
    WHERE t.created\_at \>= ? AND t.status='active' GROUP BY t.id ORDER BY score DESC LIMIT 1\`, \[since24h\]);  
  await cache.set('thread\_of\_the\_day', topThread, { ttl: 3600 });  
}  
\`\`\`

\#\# Navbar Update (CHỈ thêm 1 menu item mới vào Navbar hiện tại, KHÔNG viết lại Navbar)  
\`\`\`  
Navbar hiện tại: \[🏠\]\[Diễn Đàn\]\[Chat\]\[Club\]\[Cuộc thi\]  
                            ↓ chỉ CHÈN THÊM 1 item, giữ nguyên style/component cũ  
Navbar sau khi thêm: \[🏠\]\[Diễn Đàn\]\[🧵 Thread\]\[Chat\]\[Club\]\[Cuộc thi\]  
\`\`\`

\#\# Roadmap Sprint  
\`\`\`  
🟢 Sprint 1 (Tuần 1-2): DB \+ API CRUD \+ Composer \+ Feed \+ Reply cơ bản  
🟢 Sprint 2 (Tuần 3): 5 Reaction \+ Repost \+ Nested Reply UI (depth 3\)  
🟢 Sprint 3 (Tuần 4): Report \+ Auto-hide \+ Rate limiting \+ Banned words  
🟢 Sprint 4 (Tuần 5): Streak badge \+ Thread of the Day  
⏳ Backlog v2: Anonymous Mode, Album ảnh, @Mention, Poll  
\`\`\`

\*\*Checklist Phase 5:\*\*  
\- \[ \] Đăng tức thì không duyệt; content \>480 ký tự tự chặn  
\- \[ \] Reply cấp 4 → "Xem thêm" thay vì lồng tiếp; 5 reports/1h → auto ẩn  
\- \[ \] Rate limit \+ Reaction toggle \+ Thread of the Day hoạt động đúng  
\- \[ \] Menu item "Thread" được THÊM VÀO Navbar hiện tại, không viết lại component Navbar

\---

\# ✅ MASTER CHECKLIST TỔNG

\`\`\`  
\[ \] NAVBAR HIỆN TẠI KHÔNG BỊ SỬA Ở BẤT KỲ PHASE NÀO (chỉ thêm 1 menu item ở Phase 5\)  
PHASE 1: \[ \] Viền trắng Q\&A fixed   \[ \] Gradient không đè UI  
PHASE 2: \[ \] Content Area Chat dùng calc(100vh \- navbar)   \[ \] Đã xóa tiêu đề to thừa dưới Navbar  
PHASE 3: \[ \] Club Plaza contrast chuẩn, không trùng CTA/Empty State  
PHASE 4: \[ \] Q\&A Detail dùng calc(100vh \- navbar)   \[ \] Question/Answer tách bạch rõ  
          \[ \] Comment polymorphic hoạt động   \[ \] Giới hạn 3 answer đúng  
          \[ \] Admin xóa kèm lý do, soft-delete, snapshot lưu lại  
PHASE 5: \[ \] Thread System Sprint 1-4 đạt acceptance criteria  
\`\`\`

\---

💡 \*\*Lưu ý thực thi cuối cùng:\*\* Trước khi bắt đầu Phase 2, yêu cầu AI \*\*đo chính xác chiều cao thật của Navbar hiện tại bằng DevTools\*\* (không đoán giá trị \`72px\` tôi ghi mẫu ở trên) để điền đúng vào biến \`--navbar-height\`, đảm bảo công thức \`calc(100vh \- var(--navbar-height))\` khớp chính xác 100% với Navbar thật, không bị lệch vài pixel gây hở khoảng trắng hoặc tràn nhẹ ở đáy trang.