import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'fforum-exam-submissions-'));
const ADMIN_PASSWORD = `exam-submission-test-${randomBytes(24).toString('base64url')}-Secure!`;
process.env.FFORUM_DATA_DIR = DATA_DIR;
process.env.FFORUM_ADMIN_PASSWORD = ADMIN_PASSWORD;
const { setupForumServer, resetRateLimitersForTest, flushPendingSave } = await import('../server/forumServer.ts');

test.after(() => fs.rmSync(DATA_DIR, { recursive: true, force: true }));

function createTestServer() {
  resetRateLimitersForTest();
  const middlewares = [];
  const runner = { use(fn) { middlewares.push(fn); } };
  const server = http.createServer((req, res) => {
    let index = 0;
    const next = () => {
      if (index < middlewares.length) middlewares[index++](req, res, next);
      else { res.statusCode = 404; res.end('Not Found'); }
    };
    next();
  });
  setupForumServer(server, runner);
  const sockets = new Set();
  server.on('connection', (socket) => {
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const baseUrl = `http://127.0.0.1:${server.address().port}`;
      resolve({
        baseUrl,
        close: () => new Promise((done) => {
          server.close(done);
          for (const socket of sockets) socket.destroy();
          sockets.clear();
        }),
      });
    });
  });
}

const post = async (baseUrl, endpoint, body, token) => {
  const response = await fetch(`${baseUrl}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  return { response, data: await response.json().catch(() => null) };
};

const get = async (baseUrl, endpoint, token) => {
  const response = await fetch(`${baseUrl}${endpoint}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return { response, data: await response.json().catch(() => null) };
};

const register = async (baseUrl, name, email) => {
  const result = await post(baseUrl, '/api/auth/register', { name, email, password: 'secure-test-password-123' });
  assert.equal(result.response.status, 200, JSON.stringify(result.data));
  return result.data.token;
};

const loginAdmin = async (baseUrl) => {
  const result = await post(baseUrl, '/api/auth/login', {
    email: 'broamstuck@gmail.com',
    password: ADMIN_PASSWORD,
  });
  assert.equal(result.response.status, 200, JSON.stringify(result.data));
  return result.data.token;
};

const dataUrl = (mimeType, buffer) => `data:${mimeType};base64,${buffer.toString('base64')}`;

test('Exam Vault upload persists and securely serves image, PDF, DOCX/DOC, and Markdown attachments', async () => {
  let app = await createTestServer();
  try {
    const anonymousUpload = await post(app.baseUrl, '/api/exam-submissions', {
      title: 'Đề không đăng nhập',
      attachments: [],
    });
    assert.equal(anonymousUpload.response.status, 401, 'upload must require an authenticated account');

    const studentToken = await register(app.baseUrl, 'Học sinh thử nghiệm', 'exam-student@example.vn');
    const otherToken = await register(app.baseUrl, 'Người xem khác', 'other-student@example.vn');
    const adminToken = await loginAdmin(app.baseUrl);

    const files = [
      { name: 'scan.png', bytes: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]), mimeType: 'image/png', format: 'IMAGE' },
      { name: 'exam.pdf', bytes: Buffer.from('%PDF-1.4\nexam paper\n%%EOF\n'), mimeType: 'application/pdf', format: 'PDF' },
      { name: 'answers.docx', bytes: Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00, 0x00, 0x00]), mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', format: 'DOCX' },
      { name: 'legacy.doc', bytes: Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0x00]), mimeType: 'application/msword', format: 'DOC' },
      { name: 'notes.md', bytes: Buffer.from('# Ôn tập\n\nPhương trình bậc hai.\n', 'utf8'), mimeType: 'text/markdown', format: 'MD' },
    ];
    const submissionBody = {
      title: 'Đề kiểm tra cuối kỳ Toán',
      subject: 'Toán học',
      grade: 12,
      examType: 'Đề cuối kỳ 1',
      province: 'Thừa Thiên Huế',
      school: 'THPT Quốc Học Huế',
      schoolYear: '2026-2027',
      difficulty: 'Vận dụng',
      notes: 'Ghi chú riêng cho nhóm kiểm duyệt.',
      status: 'approved',
      verified: true,
      uploaderName: 'Tài khoản giả mạo',
      attachments: files.map((file) => ({
        name: file.name,
        size: file.bytes.length,
        mimeType: file.mimeType,
        dataUrl: dataUrl(file.mimeType, file.bytes),
      })),
    };

    const badFile = await post(app.baseUrl, '/api/exam-submissions', {
      ...submissionBody,
      attachments: [{ name: 'not-a-pdf.pdf', size: 8, dataUrl: dataUrl('application/pdf', Buffer.from('<html>')) }],
    }, studentToken);
    assert.equal(badFile.response.status, 400, 'server must inspect file signatures, not trust extensions');

    const uploaded = await post(app.baseUrl, '/api/exam-submissions', submissionBody, studentToken);
    assert.equal(uploaded.response.status, 201, JSON.stringify(uploaded.data));
    const submission = uploaded.data.submission;
    assert.equal(submission.status, 'pending', 'client cannot self-approve a submission');
    assert.equal(submission.verified, false, 'client cannot self-verify a submission');
    assert.equal(submission.uploader.name, 'Học sinh thử nghiệm', 'uploader identity must come from the session');
    assert.deepEqual(submission.attachments.map((file) => file.format), files.map((file) => file.format));
    assert.ok(submission.attachments.every((file) => file.id && file.size > 0));

    const publicInteractionsBeforeApproval = await get(app.baseUrl, '/api/exam-interactions');
    assert.equal(publicInteractionsBeforeApproval.response.status, 200);
    assert.equal(publicInteractionsBeforeApproval.data.interactions['ex-01'].likeCount, 0, 'empty metrics are actual server state, not seeded community counts');
    assert.equal(publicInteractionsBeforeApproval.data.interactions['ex-01'].averageRating, null);
    assert.equal(publicInteractionsBeforeApproval.data.interactions[submission.id], undefined, 'pending-paper activity must not be disclosed');
    const pendingLike = await post(app.baseUrl, `/api/exam-interactions/${submission.id}/like`, { liked: true }, studentToken);
    assert.equal(pendingLike.response.status, 404, 'pending submissions cannot receive community interactions');

    const ownList = await get(app.baseUrl, '/api/exam-submissions', studentToken);
    assert.equal(ownList.response.status, 200);
    assert.equal(ownList.data.submissions.length, 1);
    assert.equal(ownList.data.approvedSubmissions.length, 0);

    const otherList = await get(app.baseUrl, '/api/exam-submissions', otherToken);
    assert.equal(otherList.data.submissions.length, 0, 'pending submissions must not leak to other students');
    const privateFile = await fetch(
      `${app.baseUrl}/api/exam-submissions/${submission.id}/attachments/${submission.attachments[0].id}`,
      { headers: { Authorization: `Bearer ${otherToken}` } },
    );
    assert.equal(privateFile.status, 404, 'other students cannot download a pending attachment');

    for (let index = 0; index < files.length; index += 1) {
      const attachment = submission.attachments[index];
      const response = await fetch(
        `${app.baseUrl}/api/exam-submissions/${submission.id}/attachments/${attachment.id}`,
        { headers: { Authorization: `Bearer ${studentToken}` } },
      );
      assert.equal(response.status, 200, `${files[index].name} must be downloadable by its owner`);
      assert.deepEqual(Buffer.from(await response.arrayBuffer()), files[index].bytes, `${files[index].name} bytes must be stored intact`);
      assert.match(response.headers.get('content-disposition') || '', /attachment/);
    }

    const inlinePdf = await fetch(
      `${app.baseUrl}/api/exam-submissions/${submission.id}/attachments/${submission.attachments[1].id}?inline=1`,
      { headers: { Authorization: `Bearer ${studentToken}` } },
    );
    assert.equal(inlinePdf.status, 200);
    assert.match(inlinePdf.headers.get('content-type') || '', /application\/pdf/);
    assert.match(inlinePdf.headers.get('content-disposition') || '', /^inline;/, 'PDFs must be embeddable in the exam reader');
    assert.deepEqual(Buffer.from(await inlinePdf.arrayBuffer()), files[1].bytes);

    const inlineWord = await fetch(
      `${app.baseUrl}/api/exam-submissions/${submission.id}/attachments/${submission.attachments[2].id}?inline=1`,
      { headers: { Authorization: `Bearer ${studentToken}` } },
    );
    assert.match(inlineWord.headers.get('content-disposition') || '', /^attachment;/, 'Word files remain downloads rather than being served as active inline content');

    const unprivilegedReview = await post(
      app.baseUrl,
      `/api/exam-submissions/${submission.id}/review`,
      { status: 'approved' },
      otherToken,
    );
    assert.equal(unprivilegedReview.response.status, 403, 'students cannot approve submissions');

    const adminList = await get(app.baseUrl, '/api/exam-submissions', adminToken);
    assert.equal(adminList.data.submissions.length, 1, 'moderators must receive the review queue');
    const approved = await post(
      app.baseUrl,
      `/api/exam-submissions/${submission.id}/review`,
      { status: 'approved' },
      adminToken,
    );
    assert.equal(approved.response.status, 200, JSON.stringify(approved.data));
    assert.equal(approved.data.submission.status, 'approved');

    const publicList = await get(app.baseUrl, '/api/exam-submissions');
    assert.equal(publicList.data.approvedSubmissions.length, 1, 'approved exams become public');
    assert.equal(publicList.data.approvedSubmissions[0].summary, 'Tài liệu được cộng đồng đóng góp và đã qua kiểm duyệt.', 'private notes must not be exposed publicly');
    const publicFile = await fetch(
      `${app.baseUrl}/api/exam-submissions/${submission.id}/attachments/${submission.attachments[1].id}`,
    );
    assert.equal(publicFile.status, 200, 'approved files can be shared publicly');
    assert.deepEqual(Buffer.from(await publicFile.arrayBuffer()), files[1].bytes);
    const publicInlineFile = await fetch(
      `${app.baseUrl}/api/exam-submissions/${submission.id}/attachments/${submission.attachments[1].id}?inline=1`,
    );
    assert.equal(publicInlineFile.status, 200);
    assert.match(publicInlineFile.headers.get('content-disposition') || '', /^inline;/, 'approved PDFs are readable in the browser without a bearer header');

    const anonymousLike = await post(app.baseUrl, '/api/exam-interactions/ex-01/like', { liked: true });
    assert.equal(anonymousLike.response.status, 401, 'community actions require an authenticated account');
    const firstLike = await post(app.baseUrl, '/api/exam-interactions/ex-01/like', { liked: true }, studentToken);
    assert.equal(firstLike.response.status, 200);
    assert.equal(firstLike.data.interaction.likeCount, 1);
    const repeatedLike = await post(app.baseUrl, '/api/exam-interactions/ex-01/like', { liked: true }, studentToken);
    assert.equal(repeatedLike.data.interaction.likeCount, 1, 'repeated like requests from one account are idempotent');
    const secondAccountLike = await post(app.baseUrl, '/api/exam-interactions/ex-01/like', { liked: true }, otherToken);
    assert.equal(secondAccountLike.data.interaction.likeCount, 2, 'likes are unique per account, not per click');
    const removeFirstLike = await post(app.baseUrl, '/api/exam-interactions/ex-01/like', { liked: false }, studentToken);
    assert.equal(removeFirstLike.data.interaction.likeCount, 1);
    await post(app.baseUrl, '/api/exam-interactions/ex-01/like', { liked: true }, studentToken);

    const firstRating = await post(app.baseUrl, '/api/exam-interactions/ex-01/rating', { rating: 2 }, studentToken);
    assert.equal(firstRating.response.status, 200);
    const updatedRating = await post(app.baseUrl, '/api/exam-interactions/ex-01/rating', { rating: 5 }, studentToken);
    assert.equal(updatedRating.data.interaction.ratingCount, 1, 'changing a rating updates one account slot');
    assert.equal(updatedRating.data.interaction.averageRating, 5);
    const otherRating = await post(app.baseUrl, '/api/exam-interactions/ex-01/rating', { rating: 3 }, otherToken);
    assert.equal(otherRating.data.interaction.ratingCount, 2);
    assert.equal(otherRating.data.interaction.averageRating, 4);

    const firstReview = await post(app.baseUrl, '/api/exam-interactions/ex-01/reviews', {
      content: 'Lời giải rõ ràng, trình bày dễ theo dõi.',
      rating: 4,
      authorName: 'Danh tính giả do client gửi',
    }, studentToken);
    assert.equal(firstReview.response.status, 200, JSON.stringify(firstReview.data));
    assert.equal(firstReview.data.interaction.hasReviewed, true);
    assert.equal(firstReview.data.interaction.reviews[0].authorName, 'Học sinh thử nghiệm', 'review name comes from authenticated server profile');
    assert.equal(firstReview.data.interaction.ratingCount, 2);
    assert.equal(firstReview.data.interaction.averageRating, 3.5, 'review rating updates the same account rating instead of adding a second vote');
    const duplicateReview = await post(app.baseUrl, '/api/exam-interactions/ex-01/reviews', {
      content: 'Gửi nhận xét lần hai.', rating: 5,
    }, studentToken);
    assert.equal(duplicateReview.response.status, 409, 'one account can submit only one review per paper');
    const secondReview = await post(app.baseUrl, '/api/exam-interactions/ex-01/reviews', {
      content: 'Đề phù hợp để ôn tập.', rating: 5,
    }, otherToken);
    assert.equal(secondReview.response.status, 200);
    assert.equal(secondReview.data.interaction.reviews.length, 2);
    assert.equal(secondReview.data.interaction.averageRating, 4.5);

    const approvedPaperLike = await post(app.baseUrl, `/api/exam-interactions/${submission.id}/like`, { liked: true }, studentToken);
    assert.equal(approvedPaperLike.response.status, 200, 'an approved submission becomes eligible for community activity');
    assert.equal(approvedPaperLike.data.interaction.likeCount, 1);

    flushPendingSave();
    await app.close();
    app = await createTestServer();
    const persisted = await get(app.baseUrl, '/api/exam-submissions', adminToken);
    assert.equal(persisted.response.status, 200);
    assert.equal(persisted.data.submissions[0].status, 'approved', 'review state must survive a server restart');
    const dataFile = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'forum-data.json'), 'utf8'));
    assert.equal(dataFile.examSubmissions[0].attachments.length, files.length);
    assert.equal(dataFile.examInteractions['ex-01'].likes.length, 2, 'account-level likes persist through restart');
    assert.equal(dataFile.examInteractions['ex-01'].reviews.length, 2, 'community reviews persist through restart');
    assert.equal(dataFile.examInteractions[submission.id].likes.length, 1, 'approved-submission interactions persist through restart');
    assert.ok(!JSON.stringify(dataFile.examSubmissions).includes('dataUrl'), 'only attachment metadata is kept in the JSON store');
  } finally {
    await app.close();
  }
});
