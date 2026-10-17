import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { randomBytes } from 'node:crypto';

const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'fforum-community-ai-'));
const ADMIN_PASSWORD = `community-ai-admin-${randomBytes(24).toString('base64url')}-Secure!`;
const AI_VAULT_HEX = randomBytes(32).toString('hex');
const AI_TEST_API_KEY = `test-provider-${randomBytes(24).toString('base64url')}`;
process.env.FFORUM_DATA_DIR = DATA_DIR;
process.env.FFORUM_ADMIN_PASSWORD = ADMIN_PASSWORD;
process.env.FFORUM_AI_VAULT_KEY = AI_VAULT_HEX;

const communityRoles = await import('../src/utils/communityRoles.ts');
const aiAssistant = await import('../server/aiAssistant.ts');
const { setupForumServer, resetRateLimitersForTest, flushPendingSave } = await import('../server/forumServer.ts');

let activeServer;
test.after(async () => {
  if (activeServer) await activeServer.close();
  flushPendingSave();
  fs.rmSync(DATA_DIR, { recursive: true, force: true });
});

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

const request = async (baseUrl, method, endpoint, body, token) => {
  const response = await fetch(`${baseUrl}${endpoint}`, {
    method,
    headers: {
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return { response, data: await response.json().catch(() => null) };
};

const post = (baseUrl, endpoint, body, token) => request(baseUrl, 'POST', endpoint, body, token);

const register = async (baseUrl, name, email) => {
  const result = await post(baseUrl, '/api/auth/register', {
    name,
    email,
    password: 'community-test-password-2026',
    role: 'TEACHER',
    staffRole: 'TEACHER',
  });
  assert.equal(result.response.status, 200, JSON.stringify(result.data));
  assert.equal(result.data.user.role, 'STUDENT', 'new non-admin accounts must default to Student, ignoring client-supplied roles');
  assert.equal(result.data.user.staffRole, undefined, 'signup cannot self-assign a staff role');
  return { ...result.data.user, token: result.data.token };
};

const loginAdmin = async (baseUrl) => {
  const result = await post(baseUrl, '/api/auth/login', {
    email: 'broamstuck@gmail.com',
    password: ADMIN_PASSWORD,
  });
  assert.equal(result.response.status, 200, JSON.stringify(result.data));
  assert.equal(result.data.user.role, 'SUPER_ADMIN');
  return { ...result.data.user, token: result.data.token };
};

const dataUrl = (mime, bytes) => `data:${mime};base64,${Buffer.from(bytes).toString('base64')}`;

const configuredProvider = (protocol, baseUrl, supportsImages = true) => {
  const saved = aiAssistant.saveAIProvider([], {
    name: `${protocol} test provider`,
    protocol,
    baseUrl,
    model: protocol === 'gemini' ? 'gemini-test-vision' : 'test-vision-model',
    apiKey: AI_TEST_API_KEY,
    enabled: true,
    isDefault: true,
    supportsImages,
  }, 1700000000000, Buffer.from(AI_VAULT_HEX, 'hex'));
  assert.equal(saved.ok, true, JSON.stringify(saved));
  return saved.record;
};

test('Community role matrix separates forum posts, Q&A, exam publication, review, and teacher pins', () => {
  const { COMMUNITY_ROLE_MATRIX, canCreateForumPost, canPinQASolution, canPublishExam, canReviewExamSubmission, hasCommunityPermission } = communityRoles;
  const student = COMMUNITY_ROLE_MATRIX.find((role) => role.id === 'STUDENT');
  assert.equal(student.default, true);
  assert.ok(student.permissions.includes('ask_qa'));
  assert.ok(student.permissions.includes('answer_qa'));
  assert.ok(student.permissions.includes('comment_react'));
  assert.ok(!student.permissions.includes('create_forum_post'));
  assert.equal(canCreateForumPost({ role: 'STUDENT' }), false);
  assert.equal(canCreateForumPost({ role: 'CLUB_LEADER' }), true);
  assert.equal(canCreateForumPost({ role: 'STUDENT', staffRole: 'TEACHER' }), true);
  assert.equal(canCreateForumPost({ role: 'STUDENT', staffRole: 'MODERATOR' }), true);
  assert.equal(canPinQASolution({ role: 'STUDENT', staffRole: 'TEACHER' }), true);
  assert.equal(canPinQASolution({ role: 'STUDENT', staffRole: 'MODERATOR' }), false);
  assert.equal(canPublishExam({ role: 'STUDENT', staffRole: 'TEACHER' }), true);
  assert.equal(canPublishExam({ role: 'STUDENT', staffRole: 'MODERATOR' }), true);
  assert.equal(canReviewExamSubmission({ role: 'STUDENT', staffRole: 'TEACHER' }), true);
  assert.equal(canReviewExamSubmission({ role: 'STUDENT', staffRole: 'MODERATOR' }), true);
  assert.equal(hasCommunityPermission({ role: 'STUDENT' }, 'create_forum_post'), false);
  assert.equal(hasCommunityPermission({ role: 'SUPER_ADMIN' }, 'moderate'), true);
});

test('AI adapters encrypt keys, speak their declared protocol, and never fetch arbitrary image URLs', async () => {
  const vaultKey = Buffer.from(AI_VAULT_HEX, 'hex');
  const plaintext = AI_TEST_API_KEY;
  const encrypted = aiAssistant.encryptAiApiKey(plaintext, vaultKey);
  assert.ok(encrypted);
  assert.notEqual(encrypted.ciphertext, plaintext);
  assert.equal(aiAssistant.decryptAiApiKey(encrypted, vaultKey), plaintext);
  assert.equal(aiAssistant.decryptAiApiKey({ ...encrypted, tag: 'tampered' }, vaultKey), null);
  assert.equal(aiAssistant.publicAIProvider({
    ...configuredProvider('openai-compatible', 'https://api.openai.com/v1'),
    apiKey: encrypted,
  }).apiKey, undefined, 'public provider records must never include key ciphertext');

  for (const baseUrl of ['http://example.com', 'https://localhost/v1', 'https://127.0.0.1/v1', 'https://192.168.1.2/v1']) {
    const invalid = aiAssistant.saveAIProvider([], {
      name: 'invalid provider', protocol: 'openai-compatible', baseUrl, model: 'model', apiKey: plaintext,
    }, 1, vaultKey);
    assert.equal(invalid.ok, false, `${baseUrl} must not be accepted`);
  }
  assert.equal(aiAssistant.saveAIProvider([], {
    name: 'missing vault', protocol: 'openai-compatible', baseUrl: 'https://api.openai.com/v1', model: 'model', apiKey: plaintext,
  }, 1, null).code, 'VAULT_UNAVAILABLE');

  const image = dataUrl('image/png', Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const question = {
    id: 'q-ai-test',
    title: 'Giải phương trình',
    subject: 'Toán',
    content: 'Giải phương trình x² = 4.',
    images: [image],
    learnerAttempt: 'Em đã thử chuyển vế nhưng chưa hiểu vì sao có hai nghiệm.',
  };
  const variants = [
    { protocol: 'openai-compatible', baseUrl: 'https://api.openai.com/v1', reply: { choices: [{ message: { content: 'Gợi ý từng bước; hãy tự kiểm tra.' } }] } },
    { protocol: 'anthropic', baseUrl: 'https://api.anthropic.com/v1', reply: { content: [{ type: 'text', text: 'Gợi ý từng bước; hãy tự kiểm tra.' }] } },
    { protocol: 'gemini', baseUrl: 'https://generativelanguage.googleapis.com/v1beta', reply: { candidates: [{ content: { parts: [{ text: 'Gợi ý từng bước; hãy tự kiểm tra.' }] } }] } },
  ];
  const originalFetch = globalThis.fetch;
  const calls = [];
  try {
    globalThis.fetch = async (url, init) => {
      calls.push({ url: String(url), init, body: JSON.parse(String(init.body)) });
      return new Response(JSON.stringify(variants.find((item) => String(url).includes(item.protocol === 'gemini' ? 'generativelanguage' : item.protocol === 'anthropic' ? 'anthropic' : 'api.openai'))?.reply || variants[0].reply), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };
    for (const variant of variants) {
      const provider = configuredProvider(variant.protocol, variant.baseUrl);
      const result = await aiAssistant.generateAISuggestion([provider], question, 1700000000000);
      assert.equal(result.ok, true, JSON.stringify(result));
      assert.equal(result.suggestion.imageCount, 1);
      assert.equal(result.suggestion.answer, 'Gợi ý từng bước; hãy tự kiểm tra.');
      assert.equal(result.suggestion.mode, 'hint', 'the safe default is one progressive hint');
      assert.equal(result.suggestion.hintLevel, 1);
    }

    const hintProvider = configuredProvider('openai-compatible', 'https://api.openai.com/v1');
    const solutionResult = await aiAssistant.generateAISuggestion([hintProvider], question, 1700000000000, 'solution');
    assert.equal(solutionResult.ok, true, JSON.stringify(solutionResult));
    assert.equal(solutionResult.suggestion.mode, 'solution');
    const hintResult = await aiAssistant.generateAISuggestion([hintProvider], question, 1700000000000, 'hint', 2);
    assert.equal(hintResult.ok, true, JSON.stringify(hintResult));
    assert.equal(hintResult.suggestion.mode, 'hint');
    assert.equal(hintResult.suggestion.hintLevel, 2);

    const openAiCall = calls.find((call) => call.url.endsWith('/chat/completions'));
    assert.equal(openAiCall.init.redirect, 'error', 'provider redirects must not be followed with API-key headers');
    assert.equal(openAiCall.init.headers.Authorization, `Bearer ${plaintext}`);
    assert.match(openAiCall.body.messages[0].content, /gợi ý tham khảo/i);
    assert.match(openAiCall.body.messages[0].content, /không tự bịa/i);
    assert.match(openAiCall.body.messages[1].content[0].text, /Em đã thử chuyển vế/);
    assert.ok(openAiCall.body.messages[1].content.some((part) => part.type === 'image_url' && part.image_url.url.startsWith('data:image/png;base64,')));
    const solutionCall = calls.find((call) => call.url.endsWith('/chat/completions') && call.body.messages[0].content.includes('Chế độ lời giải'));
    assert.ok(solutionCall, 'worked solution must use its dedicated system prompt');
    const hintCall = calls.filter((call) => call.url.endsWith('/chat/completions')).at(-1);
    assert.match(hintCall.body.messages[0].content, /Chế độ gợi mở/);
    assert.match(hintCall.body.messages[0].content, /Nấc 2/);
    assert.match(hintCall.body.messages[0].content, /Không trình bày lời giải đầy đủ/);
    assert.match(hintCall.body.messages[1].content[0].text, /gợi ý ở nấc 2\/3/);

    const anthropicCall = calls.find((call) => call.url.endsWith('/messages'));
    assert.equal(anthropicCall.init.headers['x-api-key'], plaintext);
    assert.ok(anthropicCall.body.messages[0].content.some((part) => part.type === 'image' && part.source.type === 'base64'));

    const geminiCall = calls.find((call) => call.url.includes('generativelanguage'));
    assert.equal(geminiCall.init.headers['x-goog-api-key'], plaintext);
    assert.ok(geminiCall.body.contents[0].parts.some((part) => part.inlineData?.mimeType === 'image/png'));

    const countBeforeRefusal = calls.length;
    const remoteImageResult = await aiAssistant.generateAISuggestion(
      [configuredProvider('openai-compatible', 'https://api.openai.com/v1')],
      { ...question, images: ['https://images.example.test/student-upload.png'] },
    );
    assert.equal(remoteImageResult.ok, false);
    assert.equal(remoteImageResult.status, 422);
    assert.match(remoteImageResult.message, /URL bên ngoài/);
    assert.equal(calls.length, countBeforeRefusal, 'remote URLs must not be fetched by this server or forwarded to a provider');

    const tooManyImages = await aiAssistant.generateAISuggestion(
      [configuredProvider('openai-compatible', 'https://api.openai.com/v1')],
      { ...question, images: Array(5).fill(image) },
    );
    assert.equal(tooManyImages.ok, false);
    assert.match(tooManyImages.message, /tối đa 4 ảnh/);
    assert.equal(calls.length, countBeforeRefusal);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('HTTP permissions, teacher pinning, exam publication, and private AI configuration are enforced server-side', async () => {
  activeServer = await createTestServer();
  try {
    const admin = await loginAdmin(activeServer.baseUrl);
    const student = await register(activeServer.baseUrl, 'Học sinh mặc định', 'community-student@example.vn');
    const teacher = await register(activeServer.baseUrl, 'Giáo viên thử', 'community-teacher@example.vn');
    const moderator = await register(activeServer.baseUrl, 'Moderator thử', 'community-moderator@example.vn');
    const clubLeader = await register(activeServer.baseUrl, 'Trưởng CLB thử', 'community-club@example.vn');

    const studentPost = await post(activeServer.baseUrl, '/api/threads', {
      content: 'Học sinh không được tạo bài gốc diễn đàn.',
      authorEmail: teacher.email,
      role: 'TEACHER',
      token: student.token,
    }, student.token);
    assert.equal(studentPost.response.status, 403, 'forged role or author email must not unlock forum posts');

    const studentQuestion = await post(activeServer.baseUrl, '/api/questions', {
      id: 'community-qa-question',
      title: 'Giải phương trình x² = 4',
      subject: 'toan',
      content: 'Tìm tất cả nghiệm thực của phương trình x² = 4 và trình bày cách kiểm tra.',
      authorEmail: student.email,
      images: [dataUrl('image/png', Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))],
      token: student.token,
    }, student.token);
    assert.equal(studentQuestion.response.status, 200, JSON.stringify(studentQuestion.data));
    assert.equal(studentQuestion.data.question.authorEmail, student.email);

    const questionComment = await post(activeServer.baseUrl, '/api/comments', {
      commentableType: 'question',
      commentableId: studentQuestion.data.question.id,
      content: 'Mình cũng đang tìm nghiệm.',
      authorEmail: teacher.email,
      authorName: 'Tên giả mạo',
      token: student.token,
    }, student.token);
    assert.equal(questionComment.response.status, 200, JSON.stringify(questionComment.data));
    assert.equal(questionComment.data.comment.authorEmail, student.email, 'comment author must come from the authenticated account');

    const commentReaction = await post(activeServer.baseUrl, '/api/comments/react', {
      commentId: questionComment.data.comment.id,
      reactionType: 'helpful',
      token: student.token,
    }, student.token);
    assert.equal(commentReaction.response.status, 200, JSON.stringify(commentReaction.data));
    assert.deepEqual(commentReaction.data.reactions.helpful, [student.email]);

    const teacherRole = await post(activeServer.baseUrl, '/api/admin/role', {
      email: teacher.email,
      staffRole: 'TEACHER',
      reason: 'Cấp quyền Giáo viên cho kiểm thử.',
      token: admin.token,
    }, admin.token);
    assert.equal(teacherRole.response.status, 200, JSON.stringify(teacherRole.data));

    const moderatorRole = await post(activeServer.baseUrl, '/api/admin/role', {
      email: moderator.email,
      staffRole: 'MODERATOR',
      reason: 'Cấp quyền Moderator cho kiểm thử.',
      token: admin.token,
    }, admin.token);
    assert.equal(moderatorRole.response.status, 200, JSON.stringify(moderatorRole.data));

    const teacherThread = await post(activeServer.baseUrl, '/api/threads', {
      content: 'Bài chia sẻ của giáo viên.',
      token: teacher.token,
    }, teacher.token);
    assert.equal(teacherThread.response.status, 200, JSON.stringify(teacherThread.data));
    const threadId = teacherThread.data.thread.id;

    const moderatorThread = await post(activeServer.baseUrl, '/api/threads', {
      content: 'Bài chia sẻ của Moderator.',
      token: moderator.token,
    }, moderator.token);
    assert.equal(moderatorThread.response.status, 200, JSON.stringify(moderatorThread.data));
    const moderatorRepost = await post(activeServer.baseUrl, `/api/threads/${threadId}/repost`, {
      type: 'simple',
      token: moderator.token,
    }, moderator.token);
    assert.equal(moderatorRepost.response.status, 200, JSON.stringify(moderatorRepost.data));

    const studentReply = await post(activeServer.baseUrl, `/api/threads/${threadId}/reply`, {
      authorEmail: student.email,
      content: 'Em xin phép trao đổi thêm ở phần bình luận.',
      token: student.token,
    }, student.token);
    assert.equal(studentReply.response.status, 200, JSON.stringify(studentReply.data));
    assert.equal(studentReply.data.thread.authorEmail, student.email);

    const threadReaction = await post(activeServer.baseUrl, `/api/threads/${threadId}/react`, {
      authorEmail: student.email,
      type: 'love',
      token: student.token,
    }, student.token);
    assert.equal(threadReaction.response.status, 200, JSON.stringify(threadReaction.data));
    assert.deepEqual(threadReaction.data.reactions[student.email], ['love']);

    const studentRepost = await post(activeServer.baseUrl, `/api/threads/${threadId}/repost`, {
      type: 'simple',
      token: student.token,
    }, student.token);
    assert.equal(studentRepost.response.status, 403, 'reposting creates a forum post and uses the same role gate');

    const clubRequest = await post(activeServer.baseUrl, '/api/clubs', {
      id: 'community-role-club',
      name: 'CLB kiểm thử vai trò',
      purpose: 'Dùng để kiểm tra quyền tạo bài diễn đàn.',
      token: clubLeader.token,
    }, clubLeader.token);
    assert.equal(clubRequest.response.status, 200, JSON.stringify(clubRequest.data));
    const approvedClub = await post(activeServer.baseUrl, '/api/clubs/approve', {
      clubId: clubRequest.data.club.id,
      token: admin.token,
    }, admin.token);
    assert.equal(approvedClub.response.status, 200, JSON.stringify(approvedClub.data));
    assert.equal(approvedClub.data.user.role, 'CLUB_LEADER');
    const leaderThread = await post(activeServer.baseUrl, '/api/threads', {
      content: 'Bài gốc của Trưởng CLB.',
      token: clubLeader.token,
    }, clubLeader.token);
    assert.equal(leaderThread.response.status, 200, JSON.stringify(leaderThread.data));

    const solution = await post(activeServer.baseUrl, '/api/solutions', {
      id: 'community-qa-solution',
      questionId: studentQuestion.data.question.id,
      content: 'Phân tích thành nhân tử: x² - 4 = (x - 2)(x + 2) = 0, nên x = 2 hoặc x = -2. Thay từng nghiệm vào phương trình để kiểm tra.',
      authorEmail: student.email,
      token: student.token,
    }, student.token);
    assert.equal(solution.response.status, 200, JSON.stringify(solution.data));
    const answerComment = await post(activeServer.baseUrl, '/api/comments', {
      commentableType: 'answer',
      commentableId: solution.data.solution.id,
      content: 'Cảm ơn, cách thế ngược rất rõ.',
      token: student.token,
    }, student.token);
    assert.equal(answerComment.response.status, 200, JSON.stringify(answerComment.data));
    const answerCommentReaction = await post(activeServer.baseUrl, '/api/comments/react', {
      commentId: answerComment.data.comment.id,
      reactionType: 'thanks',
      token: student.token,
    }, student.token);
    assert.equal(answerCommentReaction.response.status, 200, JSON.stringify(answerCommentReaction.data));

    const teacherPin = await post(activeServer.baseUrl, '/api/solutions/react', {
      targetId: solution.data.solution.id,
      reactionType: 'helpful',
      token: teacher.token,
    }, teacher.token);
    assert.equal(teacherPin.response.status, 200, JSON.stringify(teacherPin.data));
    assert.equal(teacherPin.data.teacherPinnedSolutionId, solution.data.solution.id);
    assert.equal(teacherPin.data.teacherPinnedByRole, 'TEACHER');
    const studentReaction = await post(activeServer.baseUrl, '/api/solutions/react', {
      targetId: solution.data.solution.id,
      reactionType: 'thanks',
      token: student.token,
    }, student.token);
    assert.equal(studentReaction.response.status, 200, JSON.stringify(studentReaction.data));
    assert.equal(studentReaction.data.teacherPinnedSolutionId, solution.data.solution.id, 'student reactions must not remove a teacher pin');
    const teacherUnpin = await post(activeServer.baseUrl, '/api/solutions/react', {
      targetId: solution.data.solution.id,
      reactionType: 'helpful',
      token: teacher.token,
    }, teacher.token);
    assert.equal(teacherUnpin.response.status, 200, JSON.stringify(teacherUnpin.data));
    assert.equal(teacherUnpin.data.teacherPinnedSolutionId, null);

    const examSubmission = await post(activeServer.baseUrl, '/api/exam-submissions', {
      title: 'Đề kiểm thử xuất bản',
      subject: 'Toán học',
      grade: 12,
      examType: 'Đề cuối kỳ 1',
      province: 'Hà Nội',
      school: 'THPT Kiểm thử',
      schoolYear: '2026-2027',
      difficulty: 'Vận dụng',
      notes: '',
      attachments: [{
        name: 'exam.png',
        size: 9,
        mimeType: 'image/png',
        dataUrl: dataUrl('image/png', Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00])),
      }],
      token: student.token,
    }, student.token);
    assert.equal(examSubmission.response.status, 201, JSON.stringify(examSubmission.data));
    const submissionId = examSubmission.data.submission.id;
    const deniedReview = await post(activeServer.baseUrl, `/api/exam-submissions/${submissionId}/review`, {
      status: 'approved', token: student.token,
    }, student.token);
    assert.equal(deniedReview.response.status, 403);
    const teacherApproval = await post(activeServer.baseUrl, `/api/exam-submissions/${submissionId}/review`, {
      status: 'approved', token: teacher.token,
    }, teacher.token);
    assert.equal(teacherApproval.response.status, 200, JSON.stringify(teacherApproval.data));
    assert.equal(teacherApproval.data.submission.status, 'approved', 'teachers can review and publish submitted exam papers');

    const anonymousProviderRead = await request(activeServer.baseUrl, 'GET', '/api/admin/ai/providers');
    assert.equal(anonymousProviderRead.response.status, 403);
    const studentProviderRead = await request(activeServer.baseUrl, 'GET', '/api/admin/ai/providers', undefined, student.token);
    assert.equal(studentProviderRead.response.status, 403);
    const apiKey = `sk-test-${randomBytes(24).toString('hex')}`;
    const providerSave = await post(activeServer.baseUrl, '/api/admin/ai/providers', {
      name: 'Provider kiểm thử',
      protocol: 'openai-compatible',
      baseUrl: 'https://api.openai.com/v1',
      model: 'test-vision-model',
      apiKey,
      enabled: true,
      isDefault: true,
      supportsImages: true,
      token: admin.token,
    }, admin.token);
    assert.equal(providerSave.response.status, 200, JSON.stringify(providerSave.data));
    assert.equal(providerSave.data.providers[0].hasApiKey, true);
    assert.equal('apiKey' in providerSave.data.providers[0], false);
    assert.equal(JSON.stringify(providerSave.data).includes(apiKey), false, 'provider API key must never be returned to the browser');
    const dataFile = path.join(DATA_DIR, 'forum-data.json');
    const persistedText = fs.readFileSync(dataFile, 'utf8');
    const persisted = JSON.parse(persistedText);
    assert.equal(persistedText.includes(apiKey), false, 'provider API key must not be persisted in plaintext');
    assert.notEqual(persisted.aiProviders[0].apiKey.ciphertext, apiKey);

    const nativeFetch = globalThis.fetch;
    const providerRequests = [];
    globalThis.fetch = async (url, init) => {
      const stringUrl = String(url);
      if (stringUrl.startsWith('https://api.openai.com/v1/chat/completions')) {
        providerRequests.push({ url: stringUrl, init, body: JSON.parse(String(init.body)) });
        return new Response(JSON.stringify({ choices: [{ message: { content: 'Gợi ý tham khảo: thay hai giá trị vào phương trình để tự kiểm tra.' } }] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return nativeFetch(url, init);
    };
    try {
      const privateLearnerAttempt = 'Em nghi x = 2 nhung chua biet kiem tra nghiem am';
      const aiSuggestion = await post(activeServer.baseUrl, `/api/questions/${studentQuestion.data.question.id}/ai-suggestion`, {
        mode: 'hint',
        hintLevel: 1,
        learnerAttempt: privateLearnerAttempt,
      }, student.token);
      assert.equal(aiSuggestion.response.status, 200, JSON.stringify(aiSuggestion.data));
      assert.equal(aiSuggestion.data.suggestion.providerName, 'Provider kiểm thử');
      assert.equal(aiSuggestion.data.suggestion.imageCount, 1);
      assert.equal(aiSuggestion.data.suggestion.mode, 'hint');
      assert.equal(aiSuggestion.data.suggestion.hintLevel, 1);
      assert.match(aiSuggestion.data.suggestion.answer, /Gợi ý tham khảo/);
      assert.equal(providerRequests.length, 1);
      assert.equal(providerRequests[0].init.headers.Authorization, `Bearer ${apiKey}`);
      assert.match(providerRequests[0].body.messages[1].content[0].text, /x² = 4/);
      assert.match(providerRequests[0].body.messages[1].content[0].text, /Em nghi x = 2/);
      assert.equal(JSON.stringify(aiSuggestion.data).includes(privateLearnerAttempt), false, 'the temporary learner note is not returned in the response');
      assert.equal(fs.readFileSync(dataFile, 'utf8').includes(privateLearnerAttempt), false, 'the temporary learner note is not persisted with the question');
      assert.match(providerRequests[0].body.messages[0].content, /Chế độ gợi mở/);
      assert.ok(providerRequests[0].body.messages[1].content.some((part) => part.type === 'image_url'));

      const aiWorkedSolution = await post(activeServer.baseUrl, `/api/questions/${studentQuestion.data.question.id}/ai-suggestion`, {
        mode: 'solution',
      }, student.token);
      assert.equal(aiWorkedSolution.response.status, 200, JSON.stringify(aiWorkedSolution.data));
      assert.equal(aiWorkedSolution.data.suggestion.mode, 'solution');
      assert.match(providerRequests[1].body.messages[0].content, /Chế độ lời giải/);
      assert.equal(providerRequests.length, 2);

      const boundedHint = await post(activeServer.baseUrl, `/api/questions/${studentQuestion.data.question.id}/ai-suggestion`, {
        mode: 'hint',
        hintLevel: 99,
      }, student.token);
      assert.equal(boundedHint.response.status, 200, JSON.stringify(boundedHint.data));
      assert.equal(boundedHint.data.suggestion.hintLevel, 3, 'server clamps the hint ladder at three steps');
      assert.match(providerRequests[2].body.messages[1].content[0].text, /nấc 3\/3/);

      const remoteQuestion = await post(activeServer.baseUrl, '/api/questions', {
        id: 'community-qa-remote-image',
        title: 'Câu hỏi có ảnh ngoài',
        subject: 'toan',
        content: 'Mô tả đề trong ảnh.',
        authorEmail: student.email,
        imageUrl: 'https://images.example.test/unknown.png',
        token: student.token,
      }, student.token);
      assert.equal(remoteQuestion.response.status, 200, JSON.stringify(remoteQuestion.data));
      const remoteAi = await post(activeServer.baseUrl, `/api/questions/${remoteQuestion.data.question.id}/ai-suggestion`, {}, student.token);
      assert.equal(remoteAi.response.status, 422);
      assert.match(remoteAi.data.message, /URL bên ngoài/);
      assert.equal(providerRequests.length, 3, 'remote image URLs must not be fetched or forwarded to a provider');
    } finally {
      globalThis.fetch = nativeFetch;
    }
  } finally {
    await activeServer.close();
    activeServer = null;
    flushPendingSave();
  }
});
