import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { setupForumServer } from '../server/forumServer.ts';
import { WebSocket } from 'ws';
import {
  DAY_MS,
  MASTERED_BOX,
  MINUTE_MS,
  QUIZ_MIN_CARDS,
  RELEARN_DELAY_MS,
  STUDY_BOX_INTERVALS_MS,
  buildQuizQuestions,
  calculateQuizXP,
  calculateReviewXP,
  computeQuizScore,
  createStudyCard,
  createStudyDeck,
  estimateNextIntervalMs,
  formatDueLabel,
  formatInterval,
  getDeckStats,
  getDueCards,
  getStudyDayWindow,
  isCardDue,
  isCardMastered,
  parseBulkCards,
  reviewStudyCard,
  sanitizeDeck,
  sanitizeDecks,
} from '../src/store/studyLogic.ts';

function read(file) {
  return fs.readFileSync(path.resolve(file), 'utf8');
}

function createTestServer() {
  const middlewares = [];
  const middlewareRunner = {
    use(fn) {
      middlewares.push(fn);
    },
  };

  const server = http.createServer((req, res) => {
    let index = 0;
    function next() {
      if (index < middlewares.length) {
        const fn = middlewares[index++];
        fn(req, res, next);
      } else {
        res.statusCode = 404;
        res.end('Not Found');
      }
    }
    next();
  });

  setupForumServer(server, middlewareRunner);

  return new Promise(resolve => {
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      resolve({
        server,
        port,
        baseUrl: `http://127.0.0.1:${port}`,
        wsUrl: `ws://127.0.0.1:${port}/ws`,
        close: () => new Promise(res => server.close(res)),
      });
    });
  });
}

/* ------------------------------------------------------------------ *
 * 1. Động cơ lặp lại ngắt quãng (Leitner 6 hộp)
 * ------------------------------------------------------------------ */
test('1. Leitner engine: hộp thẻ, khoảng cách ôn và trạng thái đến hạn', () => {
  const now = 1_700_000_000_000;
  const card = createStudyCard('sin²x + cos²x', '1', 'Công thức lượng giác cơ bản', now);

  assert.equal(card.box, 0, 'Thẻ mới bắt đầu ở hộp 0');
  assert.equal(card.reviews, 0);
  assert.equal(card.lapses, 0);
  assert.ok(isCardDue(card, now), 'Thẻ mới đến hạn ôn ngay');
  assert.equal(isCardMastered(card), false);

  // "Được" thăng 1 hộp và hẹn ôn sau 10 phút
  const good = reviewStudyCard(card, 'good', now);
  assert.equal(good.box, 1);
  assert.equal(good.dueAt, now + STUDY_BOX_INTERVALS_MS[1]);
  assert.equal(good.reviews, 1);
  assert.equal(isCardDue(good, now + MINUTE_MS), false, 'Thẻ vừa ôn chưa đến hạn lại');

  // "Dễ" thăng 2 hộp → hộp 2 (1 ngày)
  const easy = reviewStudyCard(card, 'easy', now);
  assert.equal(easy.box, 2);
  assert.equal(easy.dueAt, now + DAY_MS);

  // "Khó" không thăng hộp, tối thiểu hộp 1 và tối thiểu 5 phút
  const hard = reviewStudyCard(card, 'hard', now);
  assert.equal(hard.box, 1);
  assert.ok(hard.dueAt - now >= 5 * MINUTE_MS);

  // "Quên rồi" đưa về hộp 0, tăng lapses và xuất hiện lại sau 1 phút
  const again = reviewStudyCard(good, 'again', now);
  assert.equal(again.box, 0);
  assert.equal(again.lapses, 1);
  assert.equal(again.dueAt, now + RELEARN_DELAY_MS);

  // Trần hộp: không vượt quá hộp 5 dù bấm "Dễ" liên tục
  let mastered = card;
  for (let i = 0; i < 10; i += 1) {
    mastered = reviewStudyCard(mastered, 'easy', now);
  }
  assert.equal(mastered.box, MASTERED_BOX, 'Hộp tối đa là 5');
  assert.ok(isCardMastered(mastered), 'Thẻ ở hộp 5 được coi là đã thuộc');

  // Không thay đổi thẻ gốc (hàm thuần)
  assert.equal(card.reviews, 0, 'reviewStudyCard không được sửa trực tiếp thẻ đầu vào');
});

test('2. Deck stats: đếm thẻ mới, đang học, đã thuộc và độ chính xác', () => {
  const now = 1_700_000_000_000;
  const deck = createStudyDeck({
    title: 'Từ vựng tiếng Anh Unit 3',
    subject: 'anh',
    ownerId: 'user-1',
    ownerName: 'Học Sinh A',
    now,
  });

  const cardA = createStudyCard('apple', 'quả táo', undefined, now);
  const cardB = reviewStudyCard(createStudyCard('banana', 'quả chuối', undefined, now), 'good', now);
  let cardC = createStudyCard('cherry', 'quả anh đào', undefined, now);
  for (let i = 0; i < 6; i += 1) cardC = reviewStudyCard(cardC, 'easy', now);
  const cardD = reviewStudyCard(createStudyCard('durian', 'quả sầu riêng', undefined, now), 'again', now);

  const filled = { ...deck, cards: [cardA, cardB, cardC, cardD] };
  const stats = getDeckStats(filled, now);

  assert.equal(stats.total, 4);
  assert.equal(stats.fresh, 1, 'Chỉ cardA chưa từng được ôn');
  assert.equal(stats.mastered, 1, 'cardC đạt hộp 5');
  assert.equal(stats.learning, 2, 'cardB (hộp 1) và cardD (vừa quên, hộp 0) đang trong quá trình học');
  assert.equal(stats.masteredPct, 25);
  assert.equal(stats.due, 1, 'Chỉ cardA đến hạn ngay; cardD hẹn lại sau 1 phút');
  assert.ok(stats.accuracyPct >= 0 && stats.accuracyPct <= 100);
  assert.ok(stats.nextDueAt === null || stats.nextDueAt > now);

  const empty = getDeckStats({ ...deck, cards: [] }, now);
  assert.equal(empty.total, 0);
  assert.equal(empty.masteredPct, 0);
  assert.equal(empty.accuracyPct, 0);

  const dueList = getDueCards(filled, now);
  assert.deepEqual(dueList.map(card => card.front), ['apple']);
  const dueLater = getDueCards(filled, now + 2 * MINUTE_MS);
  assert.deepEqual(dueLater.map(card => card.front).sort(), ['apple', 'durian'], 'Sau 2 phút, thẻ vừa quên trở lại lịch ôn');
});

test('3. Nhãn khoảng thời gian & lịch ôn kế tiếp hiển thị đúng tiếng Việt', () => {
  assert.equal(formatInterval(10 * MINUTE_MS), '10 phút');
  assert.equal(formatInterval(60 * MINUTE_MS), '1 giờ');
  assert.equal(formatInterval(3 * DAY_MS), '3 ngày');
  assert.equal(formatInterval(21 * DAY_MS), '21 ngày');
  assert.equal(formatInterval(60 * DAY_MS), '2 tháng');

  assert.equal(estimateNextIntervalMs('again', 4), RELEARN_DELAY_MS);
  assert.equal(estimateNextIntervalMs('good', 0), STUDY_BOX_INTERVALS_MS[1]);
  assert.equal(estimateNextIntervalMs('good', 1), STUDY_BOX_INTERVALS_MS[2]);
  assert.equal(estimateNextIntervalMs('easy', 0), STUDY_BOX_INTERVALS_MS[2]);
  assert.equal(estimateNextIntervalMs('easy', 5), STUDY_BOX_INTERVALS_MS[MASTERED_BOX]);

  const now = 1_700_000_000_000;
  assert.equal(formatDueLabel(now - 1000, now), 'Đến hạn');
  assert.equal(formatDueLabel(now + 30 * MINUTE_MS, now), '30 phút nữa');
  assert.equal(formatDueLabel(now + DAY_MS + MINUTE_MS, now), 'Ngày mai');
});

/* ------------------------------------------------------------------ *
 * 4. Sinh đề trắc nghiệm từ bộ thẻ
 * ------------------------------------------------------------------ */
test('4. Quiz builder: cần >= 3 đáp án khác nhau, 4 lựa chọn, tất định theo seed', () => {
  const now = Date.now();
  assert.equal(QUIZ_MIN_CARDS, 3, 'Luyện đề cần tối thiểu 3 đáp án khác nhau');
  const tinyDeck = createStudyDeck({ title: 'Bộ thẻ nhỏ', subject: 'toan', ownerId: 'u1', ownerName: 'A', now });
  tinyDeck.cards = [
    createStudyCard('1 + 1', '2', undefined, now),
    createStudyCard('2 + 2', '4', undefined, now),
  ];
  assert.equal(buildQuizQuestions(tinyDeck, 10, 1).length, 0, 'Thiếu đáp án nhiễu thì không tạo đề');

  // Đủ số thẻ nhưng mặt sau trùng nhau vẫn không tạo được phương án nhiễu
  const duplicateDeck = { ...tinyDeck, cards: tinyDeck.cards.map(card => ({ ...card, back: '2' })) };
  assert.equal(buildQuizQuestions(duplicateDeck, 10, 1).length, 0, 'Đáp án trùng nhau không dùng làm phương án nhiễu');

  const deck = createStudyDeck({ title: 'Công thức Vật lý 11', subject: 'ly', ownerId: 'u1', ownerName: 'A', now });
  deck.cards = [
    createStudyCard('Đơn vị đo cường độ dòng điện', 'Ampe (A)', 'SI', now),
    createStudyCard('Đơn vị đo hiệu điện thế', 'Vôn (V)', undefined, now),
    createStudyCard('Đơn vị đo điện trở', 'Ôm (Ω)', undefined, now),
    createStudyCard('Đơn vị đo công suất', 'Oát (W)', undefined, now),
    createStudyCard('Đơn vị đo điện dung', 'Fara (F)', undefined, now),
  ];

  const questions = buildQuizQuestions(deck, 4, 42);
  assert.equal(questions.length, 4, 'Sinh đúng số câu yêu cầu');
  for (const question of questions) {
    assert.equal(question.options.length, 4, 'Mỗi câu có 4 lựa chọn');
    assert.equal(new Set(question.options).size, 4, 'Các lựa chọn không trùng nhau');
    assert.ok(question.answerIndex >= 0 && question.answerIndex < 4);
    const card = deck.cards.find(item => item.id === question.cardId);
    assert.equal(question.prompt, card.front);
    assert.equal(question.options[question.answerIndex], card.back, 'Đáp án đúng khớp mặt sau thẻ');
  }

  // Tất định: cùng seed → cùng đề
  const again = buildQuizQuestions(deck, 4, 42);
  assert.deepEqual(again, questions, 'Cùng seed phải cho cùng đề');
  const shuffled = buildQuizQuestions(deck, 4, 99);
  assert.notDeepEqual(shuffled, questions, 'Seed khác nên cho thứ tự khác');

  // Chấm điểm
  const answers = questions.map(question => question.answerIndex);
  assert.deepEqual(computeQuizScore(questions, answers), { correct: 4, total: 4, scorePct: 100 });
  const wrong = questions.map((question, index) => (index === 0 ? (question.answerIndex + 1) % 4 : question.answerIndex));
  assert.equal(computeQuizScore(questions, wrong).correct, 3);
  assert.equal(computeQuizScore([], []).scorePct, 0);
});

test('5. Thưởng XP: ôn tập có trần, luyện đề có thưởng mốc 80% và 100%', () => {
  assert.equal(calculateReviewXP(['good', 'good']), 4);
  assert.equal(calculateReviewXP(['again', 'hard']), 1);
  assert.equal(calculateReviewXP(Array(200).fill('easy')), 120, 'Trần XP phiên ôn là 120');

  assert.equal(calculateQuizXP(5, 10), 20, 'Không thưởng khi dưới 80%');
  assert.equal(calculateQuizXP(8, 10), 8 * 4 + 25);
  assert.equal(calculateQuizXP(10, 10), 10 * 4 + 50);
  assert.equal(calculateQuizXP(0, 0), 0);
});

/* ------------------------------------------------------------------ *
 * 6. Nhập nhanh & dữ liệu bẩn
 * ------------------------------------------------------------------ */
test('6. parseBulkCards & sanitizeDeck chống dữ liệu hỏng từ localStorage/WebSocket', () => {
  const parsed = parseBulkCards(
    'sin²x + cos²x | 1\n\n  Định lý Pytago | a² + b² = c² | tam giác vuông\nDòng thiếu đáp án |\n| chỉ có đáp án',
  );
  assert.equal(parsed.length, 2, 'Bỏ qua dòng thiếu mặt trước/mặt sau');
  assert.deepEqual(parsed[0], { front: 'sin²x + cos²x', back: '1', hint: undefined });
  assert.equal(parsed[1].hint, 'tam giác vuông');

  assert.equal(sanitizeDeck(null), null);
  assert.equal(sanitizeDeck({ title: 'Thiếu id' }), null);
  assert.equal(sanitizeDeck({ id: 'd1' }), null, 'Thiếu tiêu đề thì loại');

  const dirty = sanitizeDeck({
    id: 'deck-9',
    title: '  Bộ thẻ bẩn  ',
    subject: 'hoa',
    ownerId: 'u9',
    ownerName: 'Học Sinh 9',
    cards: [
      { id: 'c1', front: 'Fe', back: 'Sắt', box: 99, reviews: -5, lapses: 'x', dueAt: 'nope' },
      { front: 'thiếu id', back: 'bị loại' },
    ],
    starredBy: 'khong-phai-mang',
  });

  assert.equal(dirty.title, 'Bộ thẻ bẩn');
  assert.equal(dirty.cards.length, 1, 'Thẻ thiếu id bị loại bỏ');
  assert.equal(dirty.cards[0].box, MASTERED_BOX, 'Hộp bị kẹp trong 0..5');
  assert.equal(dirty.cards[0].reviews, 0);
  assert.equal(dirty.cards[0].lapses, 0);
  assert.deepEqual(dirty.starredBy, []);
  assert.equal(dirty.isPublic, true, 'Mặc định công khai khi thiếu cờ');
  assert.deepEqual(sanitizeDecks('khong-phai-mang'), []);
  assert.deepEqual(sanitizeDecks([{ id: 'ok', title: 'Hợp lệ' }]).length, 1);
});

test('7. getStudyDayWindow: cửa sổ ngày liên tiếp, chứa mốc tham chiếu', () => {
  const reference = new Date('2026-10-04T15:30:00').getTime();
  const today = getStudyDayWindow(reference);
  assert.ok(today.start <= reference && reference < today.end);
  assert.equal(today.end - today.start, DAY_MS);

  const yesterday = getStudyDayWindow(reference, -1);
  assert.equal(yesterday.end, today.start, 'Cửa sổ ngày liền kề không hở khoảng');
});

/* ------------------------------------------------------------------ *
 * 8. Đồng bộ bộ thẻ qua REST + WebSocket
 * ------------------------------------------------------------------ */
test('8. REST & WebSocket: tạo bộ thẻ, phát sóng SYNC_DECK, lưu lịch sử phiên ôn và phân quyền xoá', async () => {
  const env = await createTestServer();

  try {
    const client = new WebSocket(env.wsUrl);
    const received = [];
    client.on('message', raw => {
      try {
        const parsed = JSON.parse(raw.toString());
        received.push(parsed);
      } catch {
        /* ignore */
      }
    });
    await new Promise(res => client.on('open', res));

    const deck = {
      id: 'deck-ws-1',
      title: 'Mốc lịch sử Việt Nam',
      description: 'Các mốc cần nhớ cho kỳ thi tốt nghiệp',
      subject: 'su',
      ownerId: 'user-student-1',
      ownerName: 'Học Sinh 1',
      isPublic: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      cards: [
        { id: 'c-1', front: 'Năm 1945', back: 'Cách mạng tháng Tám thành công', box: 0, dueAt: 0, lapses: 0, reviews: 0, createdAt: Date.now() },
      ],
    };

    const createRes = await fetch(`${env.baseUrl}/api/study/deck`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deck }),
    });
    const createData = await createRes.json();
    assert.equal(createRes.status, 200);
    assert.equal(createData.success, true);

    // Máy chủ phát sóng SYNC_DECK cho mọi thiết bị đang mở
    await new Promise(res => setTimeout(res, 150));
    const syncEvent = received.find(event => event.type === 'SYNC_DECK');
    assert.ok(syncEvent, 'Thiết bị khác phải nhận được sự kiện SYNC_DECK');
    assert.equal(syncEvent.payload.id, 'deck-ws-1');

    // /api/sync trả về bộ thẻ đã lưu
    const syncRes = await fetch(`${env.baseUrl}/api/sync`);
    const syncData = await syncRes.json();
    assert.ok(Array.isArray(syncData.data.studyDecks));
    assert.ok(syncData.data.studyDecks.some(item => item.id === 'deck-ws-1'));
    assert.ok(Array.isArray(syncData.data.studySessions));

    // Bộ thẻ không hợp lệ bị từ chối
    const invalidRes = await fetch(`${env.baseUrl}/api/study/deck`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deck: { title: 'Thiếu id' } }),
    });
    assert.equal(invalidRes.status, 400);

    // Lịch sử phiên ôn tập được lưu lại
    const session = {
      id: 'sess-1',
      deckId: 'deck-ws-1',
      deckTitle: 'Mốc lịch sử Việt Nam',
      userId: 'user-student-1',
      userName: 'Học Sinh 1',
      mode: 'quiz',
      correct: 8,
      total: 10,
      scorePct: 80,
      xpAwarded: 57,
      createdAt: Date.now(),
    };
    const sessionRes = await fetch(`${env.baseUrl}/api/study/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session, userEmail: 'hocsinh1@fpt.edu.vn' }),
    });
    assert.equal(sessionRes.status, 200);
    await new Promise(res => setTimeout(res, 150));
    assert.ok(received.some(event => event.type === 'STUDY_SESSION'));

    // Người khác không được xoá bộ thẻ của chủ sở hữu
    const forbiddenRes = await fetch(`${env.baseUrl}/api/study/deck/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deckId: 'deck-ws-1', requesterId: 'ke-gian', requesterEmail: 'ke-gian@fpt.edu.vn' }),
    });
    assert.equal(forbiddenRes.status, 403);

    // Chủ sở hữu xoá thành công → có sự kiện DELETE_DECK
    const deleteRes = await fetch(`${env.baseUrl}/api/study/deck/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deckId: 'deck-ws-1', requesterId: 'user-student-1', requesterEmail: 'hocsinh1@fpt.edu.vn' }),
    });
    assert.equal(deleteRes.status, 200);
    await new Promise(res => setTimeout(res, 150));
    assert.ok(received.some(event => event.type === 'DELETE_DECK'));

    const finalSync = await (await fetch(`${env.baseUrl}/api/sync`)).json();
    assert.ok(!finalSync.data.studyDecks.some(item => item.id === 'deck-ws-1'), 'Bộ thẻ đã bị xoá khỏi máy chủ');

    client.close();
  } finally {
    await env.close();
  }
});

/* ------------------------------------------------------------------ *
 * 9. Bất biến mã nguồn
 * ------------------------------------------------------------------ */
test('9. Tích hợp mã nguồn: route Ôn Tập, navbar, store và không phá vỡ vòng cuộn cũ', () => {
  const types = read('src/types/index.ts');
  const app = read('src/App.tsx');
  const store = read('src/store/forumStore.ts');
  const navbar = read('src/components/Navbar.tsx');
  const view = read('src/components/views/StudyRoomView.tsx');
  const server = read('server/forumServer.ts');

  assert.ok(types.includes("| 'study'"), "DimensionView phải có route 'study'");
  assert.ok(app.includes("currentView === 'study'"), 'App phải định tuyến phân khu Ôn Tập');
  assert.ok(app.includes("<StudyRoomView"), 'App phải render StudyRoomView');
  assert.ok(app.includes('onGradeCard={gradeStudyCard}'), 'App phải truyền hàm chấm điểm thẻ');
  assert.ok(navbar.includes("{ id: 'study', label: 'ÔN TẬP' }"), 'Navbar phải có mục ÔN TẬP');
  assert.ok(navbar.includes('study: <Brain'), 'Navbar phải có icon cho mục Ôn Tập');

  // Vòng cuộn cũ giữ nguyên (điều kiện bất biến của bộ test điều hướng)
  assert.ok(
    app.includes("const CORE_SCROLL_VIEWS: DimensionView[] = ['home', 'clubs', 'qa', 'coming-soon'];"),
    'CORE_SCROLL_VIEWS không được thay đổi',
  );

  // Store: API đầy đủ cho phòng ôn tập
  ['createStudyDeck', 'updateStudyDeck', 'deleteStudyDeck', 'addStudyCard', 'updateStudyCard', 'deleteStudyCard',
   'importStudyCards', 'gradeStudyCard', 'syncStudyDeck', 'recordStudySession', 'toggleStudyDeckStar', 'cloneStudyDeck']
    .forEach(api => assert.ok(store.includes(api), `Store phải cung cấp ${api}`));

  assert.ok(store.includes("safeStorage.setItem('fforum_study_decks'"), 'Tiến độ phải được lưu cục bộ');
  assert.ok(store.includes("type: 'SYNC_DECK'"), 'Store phải phát sự kiện SYNC_DECK');
  assert.ok(!/(?<!safeStorage\.)localStorage\.(getItem|setItem|removeItem|clear)/.test(view), 'Không dùng localStorage trực tiếp trong view');

  // Máy chủ: lưu trữ & điểm cuối REST
  assert.ok(server.includes('studyDecks: any[]'), 'ForumDataStore phải có studyDecks');
  assert.ok(server.includes('studySessions: any[]'), 'ForumDataStore phải có studySessions');
  assert.ok(server.includes("url === '/api/study/deck'"));
  assert.ok(server.includes("url === '/api/study/deck/delete'"));
  assert.ok(server.includes("url === '/api/study/session'"));
  assert.ok(server.includes("case 'DELETE_DECK'"), 'WebSocket phải xử lý DELETE_DECK');

  // View dùng đúng bộ linh kiện con
  assert.ok(view.includes('<DeckEditorModal'), 'StudyRoomView phải có trình soạn bộ thẻ');
  assert.ok(view.includes('<ReviewSessionModal'), 'StudyRoomView phải có phiên ôn tập');
  assert.ok(view.includes('<QuizSessionModal'), 'StudyRoomView phải có phần luyện đề');
  assert.ok(view.includes('getStudyDayWindow'), 'Thống kê phiên hôm nay dùng cửa sổ ngày thuần tuý');

  // Phiên ôn tập: đủ 4 mức tự đánh giá và nhắc phím tắt
  const review = read('src/components/study/ReviewSessionModal.tsx');
  ['Quên rồi', 'Khó', 'Được', 'Dễ'].forEach(label => {
    assert.ok(review.includes(`label: '${label}'`), `Phiên ôn tập phải có mức đánh giá "${label}"`);
  });
  assert.ok(review.includes('Nhấn Space'), 'Phiên ôn tập phải nhắc phím tắt lật thẻ');
  assert.ok(review.includes('backfaceVisibility'), 'Thẻ phải lật 3D bằng backface-visibility');

  // Luyện đề: đếm ngược và tối thiểu 3 đáp án khác nhau
  const quiz = read('src/components/study/QuizSessionModal.tsx');
  assert.ok(quiz.includes('QUESTION_SECONDS = 20'), 'Mỗi câu luyện đề có 20 giây');
  assert.ok(quiz.includes('QUIZ_MIN_CARDS'), 'Luyện đề phải kiểm tra số thẻ tối thiểu');
  assert.ok(quiz.includes("['1', '2', '3', '4']"), 'Luyện đề hỗ trợ phím tắt 1-4');
});
