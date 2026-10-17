import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { WebSocket } from 'ws';
import {
  buildChatMentionCandidates,
  findActiveChatMention,
  searchChatMentionCandidates,
} from '../src/utils/chatMentions.ts';

const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'fforum-chat-mentions-'));
process.env.FFORUM_DATA_DIR = DATA_DIR;
const { setupForumServer, resetRateLimitersForTest } = await import('../server/forumServer.ts');
const TEST_PASSWORD = `chat-test-${randomUUID()}-Aa1!`;

test.after(() => fs.rmSync(DATA_DIR, { recursive: true, force: true }));

function createTestServer() {
  const middlewares = [];
  const middlewareRunner = { use: (fn) => middlewares.push(fn) };
  const server = http.createServer((req, res) => {
    let index = 0;
    const next = () => {
      if (index < middlewares.length) middlewares[index++](req, res, next);
      else { res.statusCode = 404; res.end('Not Found'); }
    };
    next();
  });
  setupForumServer(server, middlewareRunner);
  const sockets = new Set();
  server.on('connection', (socket) => {
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => {
    const port = server.address().port;
    resolve({
      server,
      baseUrl: `http://127.0.0.1:${port}`,
      wsUrl: `ws://127.0.0.1:${port}/ws`,
      close: () => new Promise((done) => {
        server.close(done);
        for (const socket of sockets) socket.destroy();
        sockets.clear();
      }),
    });
  }));
}

async function post(baseUrl, route, body, token) {
  const response = await fetch(`${baseUrl}${route}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  return { status: response.status, data: await response.json().catch(() => null) };
}

async function register(baseUrl, name, email) {
  const result = await post(baseUrl, '/api/auth/register', { name, email, password: TEST_PASSWORD });
  assert.equal(result.status, 200, `register ${email}: ${JSON.stringify(result.data)}`);
  return result.data;
}

function connectWs(wsUrl, token) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    const inbox = [];
    const waiters = [];
    ws.on('message', (raw) => {
      try {
        const message = JSON.parse(raw.toString());
        const index = waiters.findIndex((waiter) => waiter.type === message.type);
        if (index >= 0) waiters.splice(index, 1)[0].resolve(message);
        else inbox.push(message);
      } catch { /* ignore */ }
    });
    const waitFor = (type, timeoutMs = 1500) => new Promise((res, rej) => {
      const index = inbox.findIndex((message) => message.type === type);
      if (index >= 0) { res(inbox.splice(index, 1)[0]); return; }
      const waiter = { type, resolve: (message) => { clearTimeout(timer); res(message); } };
      const timer = setTimeout(() => {
        const waiterIndex = waiters.indexOf(waiter);
        if (waiterIndex >= 0) waiters.splice(waiterIndex, 1);
        rej(new Error(`timeout waiting for ${type}`));
      }, timeoutMs);
      waiters.push(waiter);
    });
    ws.on('error', reject);
    ws.on('open', async () => {
      ws.send(JSON.stringify({ type: 'AUTH', payload: { token } }));
      try {
        await waitFor('AUTH_OK');
        resolve({ ws, waitFor, inbox, send: (type, payload) => ws.send(JSON.stringify({ type, payload })) });
      } catch (error) { reject(error); }
    });
  });
}

test('mention token detection ignores email addresses and finds only the caret token', () => {
  assert.deepEqual(findActiveChatMention('Hello @nguyen'), { start: 6, end: 13, query: 'nguyen' });
  assert.deepEqual(findActiveChatMention('Bài này ( @Minh A'), { start: 10, end: 17, query: 'Minh A' });
  assert.equal(findActiveChatMention('email me@example.com'), null);
  assert.deepEqual(findActiveChatMention('@minh after', 4), { start: 0, end: 4, query: 'min' });
  assert.equal(findActiveChatMention('@minh\n'), null);
});

test('candidate list merges live presence, omits self, and searches Vietnamese names without diacritics', () => {
  const me = { id: 'me', name: 'Chủ tài khoản', email: 'me@example.test', avatar: '', role: 'STUDENT' };
  const users = {
    'me@example.test': me,
    'anh@example.test': { id: 'anh', name: 'Nguyễn Ánh', email: 'anh@example.test', avatar: '/anh.png', role: 'CLUB_LEADER' },
    'binh@example.test': { id: 'binh', name: 'Trần Bình', email: 'binh@example.test', avatar: '/binh.png', role: 'STUDENT', staffRole: 'TEACHER' },
  };
  const candidates = buildChatMentionCandidates(users, [
    { id: 'anh', name: 'Nguyễn Ánh', email: 'anh@example.test', avatar: '/live.png', level: 8 },
  ], me);
  assert.deepEqual(candidates.map((member) => member.id), ['anh', 'binh']);
  assert.equal(candidates[0].isOnline, true);
  assert.equal(candidates[0].avatar, '/live.png');
  assert.equal(candidates[1].staffRole, 'TEACHER');
  assert.deepEqual(searchChatMentionCandidates(candidates, 'nguyen anh').map((member) => member.id), ['anh']);
});

test('chat composers use an accessible textarea mention list and no visible cooldown bar', () => {
  const full = fs.readFileSync(path.resolve('src/components/views/ChatView.tsx'), 'utf8');
  const dock = fs.readFileSync(path.resolve('src/components/ChatDock.tsx'), 'utf8');
  for (const [name, source] of [['ChatView', full], ['ChatDock', dock]]) {
    assert.match(source, /<textarea[\s\S]*?role="combobox"[\s\S]*?aria-autocomplete="list"/,
      `${name} composer should be multiline and expose mention suggestions accessibly`);
    assert.match(source, /ChatMentionPicker/, `${name} should mount the mention picker`);
    assert.match(source, /role="status" aria-live="polite"/, `${name} should expose send feedback to assistive technology`);
    assert.doesNotMatch(source, /ChatCooldownBar/, `${name} should not render the old cooldown bar`);
    assert.doesNotMatch(source, /secondsLeft}s/, `${name} should not show a numeric countdown`);
  }
});

test('HTTP and WebSocket validate mention IDs and deliver targeted pings only to mentioned members', async () => {
  const env = await createTestServer();
  const sockets = [];
  try {
    resetRateLimitersForTest();
    const sender = await register(env.baseUrl, 'Người Gửi Chat', `sender.${randomUUID()}@example.test`);
    const recipient = await register(env.baseUrl, 'Nguyễn Ánh', `recipient.${randomUUID()}@example.test`);
    const outsider = await register(env.baseUrl, 'Trần Bình', `outsider.${randomUUID()}@example.test`);
    const senderWs = await connectWs(env.wsUrl, sender.token);
    const recipientWs = await connectWs(env.wsUrl, recipient.token);
    const outsiderWs = await connectWs(env.wsUrl, outsider.token);
    sockets.push(senderWs.ws, recipientWs.ws, outsiderWs.ws);

    const httpId = `chat-mention-http-${randomUUID()}`;
    const httpMessagePromise = recipientWs.waitFor('NEW_CHAT_MESSAGE');
    const httpPingPromise = recipientWs.waitFor('CHAT_MENTION');
    const httpResult = await post(env.baseUrl, '/api/chat', {
      id: httpId,
      channelId: 'hallway',
      content: `@${recipient.user.name}, mình gửi lời nhắc nhé.`,
      authorEmail: sender.user.email,
      authorId: 'spoofed-author-id',
      authorName: 'Tên giả',
      authorLevel: 150,
      mentionIds: [recipient.user.id, 'not-a-real-user', recipient.user.id],
    }, sender.token);
    assert.equal(httpResult.status, 200, JSON.stringify(httpResult.data));
    assert.equal(httpResult.data.message.authorId, sender.user.id, 'HTTP must use the authenticated author ID');
    assert.equal(httpResult.data.message.authorName, sender.user.name, 'HTTP must use the account name');
    assert.equal(httpResult.data.message.authorLevel, sender.user.level, 'HTTP must use the account level');
    assert.deepEqual(httpResult.data.message.mentionIds, [recipient.user.id]);
    const httpBroadcast = await httpMessagePromise;
    assert.equal(httpBroadcast.payload.id, httpId);
    const httpPing = await httpPingPromise;
    assert.equal(httpPing.payload.recipientId, recipient.user.id);
    assert.equal(httpPing.payload.messageId, httpId);
    await assert.rejects(outsiderWs.waitFor('CHAT_MENTION', 250), /timeout/);

    const ignoredBroadcastPromise = recipientWs.waitFor('NEW_CHAT_MESSAGE');
    const ignoredMention = await post(env.baseUrl, '/api/chat', {
      id: `chat-mention-invalid-${randomUUID()}`,
      channelId: 'hallway',
      content: 'Hôm nay học nhóm nhé.',
      authorEmail: sender.user.email,
      mentionIds: [recipient.user.id],
    }, sender.token);
    assert.equal(ignoredMention.status, 200);
    assert.deepEqual(ignoredMention.data.message.mentionIds, [], 'an ID without a visible @name must not be accepted');
    assert.deepEqual((await ignoredBroadcastPromise).payload.mentionIds, []);
    await assert.rejects(recipientWs.waitFor('CHAT_MENTION', 250), /timeout/);

    const wsId = `chat-mention-ws-${randomUUID()}`;
    const wsBroadcastPromise = recipientWs.waitFor('NEW_CHAT_MESSAGE');
    const wsPingPromise = recipientWs.waitFor('CHAT_MENTION');
    senderWs.send('NEW_CHAT_MESSAGE', {
      id: wsId,
      channelId: 'quick-qa',
      content: `@${recipient.user.name} xem giúp lời giải này nhé.`,
      authorEmail: sender.user.email,
      authorId: 'another-spoofed-id',
      authorName: 'Tên WebSocket giả',
      mentionIds: [recipient.user.id],
    });
    const wsBroadcast = await wsBroadcastPromise;
    assert.equal(wsBroadcast.payload.id, wsId);
    assert.equal(wsBroadcast.payload.authorId, sender.user.id, 'WebSocket must use authenticated author identity');
    assert.deepEqual(wsBroadcast.payload.mentionIds, [recipient.user.id]);
    const wsPing = await wsPingPromise;
    assert.equal(wsPing.payload.recipientId, recipient.user.id);
    assert.equal(wsPing.payload.messageId, wsId);
    await assert.rejects(outsiderWs.waitFor('CHAT_MENTION', 250), /timeout/);

    const sync = await fetch(`${env.baseUrl}/api/sync`).then((response) => response.json());
    const stored = sync.data.chatMessages.filter((message) => [httpId, wsId].includes(message.id));
    assert.equal(stored.length, 2);
    assert.ok(stored.every((message) => message.authorId === sender.user.id));
  } finally {
    for (const socket of sockets) socket.close();
    await env.close();
  }
});
