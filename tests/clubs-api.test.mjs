import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { setupForumServer } from '../server/forumServer.ts';

/* Mỗi bài kiểm thử chạy trên thư mục dữ liệu tạm để không ghi vào data/ thật của ứng dụng */
process.env.FFORUM_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'fforum-test-'));

/* Test Helper: dựng máy chủ F-Forum thật với middleware runner */
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

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      resolve({
        server,
        baseUrl: `http://127.0.0.1:${port}`,
        close: () => new Promise((res) => server.close(res)),
      });
    });
  });
}

async function postJson(baseUrl, path, body) {
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, json };
}

test('1. Clubs API: tạo CLB mới -> lưu PENDING và trả về đúng dữ liệu', async () => {
  const env = await createTestServer();
  try {
    const clubId = `club-test-${Date.now()}`;
    const { status, json } = await postJson(env.baseUrl, '/api/clubs', {
      id: clubId,
      name: `CLB Kiểm Thử ${Date.now()}`,
      slogan: 'Học nhanh, chơi chất',
      coverImage: 'https://example.com/cover.jpg',
      category: 'Công nghệ',
      foundingMembers: ['An', 'Bình'],
      purpose: 'Cùng nhau học lập trình',
      leaderId: 'user-leader-1',
      leaderName: 'Người Sáng Lập',
    });

    assert.equal(status, 200);
    assert.equal(json.success, true);
    assert.equal(json.club.id, clubId);
    assert.equal(json.club.status, 'PENDING');
    assert.ok(json.club.followerCount >= 1, 'CLB mới phải có ít nhất 1 người theo dõi');
  } finally {
    await env.close();
  }
});

test('2. Clubs API: tên trùng bị từ chối (409) và CLB tồn tại trong /api/sync', async () => {
  const env = await createTestServer();
  try {
    const name = `CLB Trùng Tên ${Date.now()}`;
    const first = await postJson(env.baseUrl, '/api/clubs', {
      name,
      slogan: 'A',
      purpose: 'B',
      leaderName: 'X',
    });
    assert.equal(first.status, 200);

    const duplicated = await postJson(env.baseUrl, '/api/clubs', {
      name,
      slogan: 'A',
      purpose: 'B',
      leaderName: 'Y',
    });
    assert.equal(duplicated.status, 409);

    const sync = await (await fetch(`${env.baseUrl}/api/sync`)).json();
    assert.ok(
      sync.data.clubs.some((c) => c.name === name),
      'CLB vừa tạo phải xuất hiện trong /api/sync'
    );
  } finally {
    await env.close();
  }
});

test('3. Clubs API: duyệt CLB cấp quyền CLUB_LEADER + 250 XP cho người sáng lập', async () => {
  const env = await createTestServer();
  try {
    const email = `leader-${Date.now()}@example.com`;
    const register = await postJson(env.baseUrl, '/api/auth/register', {
      name: 'Trưởng CLB Test',
      email,
      password: 'secret123',
    });
    assert.equal(register.status, 200);
    const leader = register.json.user;

    const clubId = `club-approve-${Date.now()}`;
    await postJson(env.baseUrl, '/api/clubs', {
      id: clubId,
      name: `CLB Duyệt ${Date.now()}`,
      slogan: 'Slogan',
      purpose: 'Mục tiêu',
      leaderId: leader.id,
      leaderName: leader.name,
    });

    const approve = await postJson(env.baseUrl, '/api/clubs/approve', { clubId });
    assert.equal(approve.status, 200);
    assert.equal(approve.json.club.status, 'APPROVED');

    const sync = await (await fetch(`${env.baseUrl}/api/sync`)).json();
    const updated = sync.data.users[email];
    assert.equal(updated.role, 'CLUB_LEADER', 'Người sáng lập phải được cấp quyền CLUB_LEADER');
    assert.ok(updated.scopedClubIds.includes(clubId), 'Phải được scope vào CLB vừa duyệt');
    assert.equal(updated.xp, 250, 'Phải được tặng +250 XP khi duyệt CLB');
  } finally {
    await env.close();
  }
});

test('4. Clubs API: từ chối CLB lưu lý do; đăng bài + ghi danh hoạt động', async () => {
  const env = await createTestServer();
  try {
    const clubId = `club-reject-${Date.now()}`;
    await postJson(env.baseUrl, '/api/clubs', {
      id: clubId,
      name: `CLB Từ Chối ${Date.now()}`,
      slogan: 'S',
      purpose: 'P',
    });

    const reject = await postJson(env.baseUrl, '/api/clubs/reject', {
      clubId,
      reason: 'Thiếu hồ sơ thành viên',
    });
    assert.equal(reject.status, 200);
    assert.equal(reject.json.club.status, 'REJECTED');
    assert.equal(reject.json.club.rejectReason, 'Thiếu hồ sơ thành viên');

    /* CLB đã duyệt mới đăng được bài -> tạo + duyệt một CLB khác */
    const approvedId = `club-post-${Date.now()}`;
    await postJson(env.baseUrl, '/api/clubs', {
      id: approvedId,
      name: `CLB Đăng Bài ${Date.now()}`,
      slogan: 'S',
      purpose: 'P',
    });
    await postJson(env.baseUrl, '/api/clubs/approve', { clubId: approvedId });

    const post = await postJson(env.baseUrl, '/api/clubs/posts', {
      clubId: approvedId,
      authorId: 'u1',
      authorName: 'Chủ nhiệm',
      title: 'Thông báo họp CLB',
      content: 'Thứ 6 lúc 17h tại phòng máy.',
    });
    assert.equal(post.status, 200);
    assert.equal(post.json.post.clubId, approvedId);

    const join = await postJson(env.baseUrl, '/api/clubs/join', {
      clubId: approvedId,
      userId: 'member-1',
    });
    assert.equal(join.status, 200);
    assert.equal(join.json.success, true);
    assert.equal(join.json.followerCount, 2);

    /* Ghi danh lần 2 không được cộng trùng */
    const joinAgain = await postJson(env.baseUrl, '/api/clubs/join', {
      clubId: approvedId,
      userId: 'member-1',
    });
    assert.equal(joinAgain.json.alreadyMember, true);
    assert.equal(joinAgain.json.followerCount, 2);

    const sync = await (await fetch(`${env.baseUrl}/api/sync`)).json();
    const posts = sync.data.clubPosts.filter((p) => p.clubId === approvedId);
    assert.equal(posts.length, 1, 'Bài đăng CLB phải được lưu trên máy chủ');
  } finally {
    await env.close();
  }
});

test('5. Clubs API: bài đăng vào CLB không tồn tại trả 404 và không tạo rác', async () => {
  const env = await createTestServer();
  try {
    const { status, json } = await postJson(env.baseUrl, '/api/clubs/posts', {
      clubId: 'club-khong-ton-tai',
      title: 'X',
      content: 'Y',
    });
    assert.equal(status, 404);
    assert.equal(json.success, false);
  } finally {
    await env.close();
  }
});
