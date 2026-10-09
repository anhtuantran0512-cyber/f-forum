import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('1. Navbar Architecture & Notification Center Isolation', () => {
  const navbarContent = fs.readFileSync(path.resolve('src/components/Navbar.tsx'), 'utf8');
  const notifModalContent = fs.readFileSync(path.resolve('src/components/NotificationsModal.tsx'), 'utf8');

  // Verify Navbar has the mandatory floating glass-capsule layout (iOS-style, dock-adaptive)
  assert.ok(
    navbarContent.includes('ff-nav-capsule fixed top-5 inset-x-0 mx-auto z-50 w-[94%] max-w-[1180px] h-14 liquid-glass rounded-full'),
    'Navbar MUST use the fixed h-14 liquid-glass capsule container'
  );

  // Verify the capsule collapses to icon-only when the pointer leaves
  assert.ok(
    navbarContent.includes('data-compact'),
    'Navbar must implement the data-compact collapse state'
  );

  // Verify that NotificationsModal is rendered
  assert.ok(
    navbarContent.includes('<NotificationsModal'),
    'Navbar must render NotificationsModal'
  );

  // Verify NotificationsModal anchors via the dock-aware popover hook
  assert.ok(
    notifModalContent.includes('liquid-glass') && notifModalContent.includes('usePopoverPosition'),
    'NotificationsModal must be anchored to the bell via usePopoverPosition'
  );

  // Verify outside click transparent backdrop is present
  assert.ok(
    notifModalContent.includes('fixed inset-0') && notifModalContent.includes('bg-transparent'),
    'NotificationsModal must render an invisible full-viewport backdrop'
  );
});

test('2. Wheel-Scroll Tab Switching must be REMOVED (EPIC 4 — cuộn chuột chỉ để cuộn nội dung)', () => {
  const appContent = fs.readFileSync(path.resolve('src/App.tsx'), 'utf8');

  // Tính năng lăn chuột tự chuyển tab gây khó chịu → đã xóa hoàn toàn theo spec.
  assert.ok(
    !appContent.includes('CORE_SCROLL_VIEWS'),
    'App.tsx must not keep the wheel-navigation view pipeline'
  );
  assert.ok(
    !appContent.includes('SCROLL_COOLDOWN_MS'),
    'App.tsx must not keep the wheel cooldown constant'
  );
  assert.ok(
    !appContent.includes('isInsideScrollable'),
    'App.tsx must not keep the wheel scrollable-detection helper'
  );
  assert.ok(
    !appContent.includes('lastWheelTimeRef') && !appContent.includes('lastScrollTimeRef'),
    'App.tsx must not keep wheel timing refs'
  );
  assert.ok(
    !appContent.includes("addEventListener('wheel'"),
    'App.tsx must not register any wheel listener for view switching'
  );

  // Navbar vẫn phải hiện ở phân khu UPDATE (coming-soon) — không còn rule wheel cũ
  assert.ok(
    appContent.includes("currentView !== 'chronicles' && (") &&
    !appContent.includes("currentView !== 'coming-soon' && currentView !== 'chronicles' && ("),
    'Navbar must remain visible on coming-soon (UPDATE) view'
  );
});

test('3. Invariants & Preserved Systems Integrity', () => {
  const appContent = fs.readFileSync(path.resolve('src/App.tsx'), 'utf8');
  const homeContent = fs.readFileSync(path.resolve('src/components/views/HomeView.tsx'), 'utf8');

  // Super Admin guard isolation — so khớp KHÔNG phân biệt hoa thường (record có thể
  // lưu email dạng chữ thường; so sánh chính xác với 'BroAmStuck@...' từng làm
  // Super Admin mất các nút quản trị).
  assert.ok(
    appContent.includes("isMasterAdmin(currentUser?.email) && !isAdminConsoleOpen") &&
    appContent.includes("isMasterAdmin(currentUser?.email) && !isReportInboxOpen"),
    'App.tsx must strictly preserve Super Admin guard (case-insensitive)'
  );

  // Dynamic Homepage Title with Diễn Đàn Học Sinh
  assert.ok(
    homeContent.includes('Diễn Đàn Học Sinh'),
    'HomeView must contain Diễn Đàn Học Sinh'
  );
  assert.ok(
    homeContent.includes('headlinePhase'),
    'HomeView must keep dynamic alternating title state machine'
  );

  // Global radiant cursor
  assert.ok(
    appContent.includes('<GlobalCursor />'),
    'App.tsx must preserve global soft luminous dot cursor'
  );
});

test('4. Modal Dialog & Bell Trigger Toggle Isolation Verification', () => {
  const navbarContent = fs.readFileSync(path.resolve('src/components/Navbar.tsx'), 'utf8');
  const notifModalContent = fs.readFileSync(path.resolve('src/components/NotificationsModal.tsx'), 'utf8');
  const qaForumContent = fs.readFileSync(path.resolve('src/components/views/QAForumView.tsx'), 'utf8');
  const clubsContent = fs.readFileSync(path.resolve('src/components/views/ClubsView.tsx'), 'utf8');

  // Verify Bell trigger has data-notif-trigger attribute
  assert.ok(
    navbarContent.includes('data-notif-trigger="true"'),
    'Navbar Bell button must specify data-notif-trigger="true" to prevent mousedown clash'
  );

  // Verify NotificationsModal bypasses trigger clicks in handleMouseDown
  assert.ok(
    notifModalContent.includes("target.closest('[data-notif-trigger]')"),
    'NotificationsModal must ignore mousedown on data-notif-trigger'
  );

  // Verify NotificationsModal popover has role="dialog"
  assert.ok(
    notifModalContent.includes('role="dialog"'),
    'NotificationsModal must include role="dialog" for accessibility and wheel isolation'
  );

  // Verify QAForumView modals have role="dialog"
  assert.ok(
    qaForumContent.includes('role="dialog"'),
    'QAForumView modals must have role="dialog" to prevent page switch while reading questions'
  );

  // Verify ClubsView modals have role="dialog"
  assert.ok(
    clubsContent.includes('role="dialog"'),
    'ClubsView modals must have role="dialog" to prevent page switch while reading club posts'
  );
});
