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

test('2. Wheel-Scroll Transition Controller & Pipeline Logic', () => {
  const appContent = fs.readFileSync(path.resolve('src/App.tsx'), 'utf8');

  // Verify scroll sequence pipeline: home -> clubs -> qa -> coming-soon
  assert.ok(
    appContent.includes("const CORE_SCROLL_VIEWS: DimensionView[] = ['home', 'clubs', 'qa', 'coming-soon'];"),
    'App.tsx must define core scroll views pipeline: home, clubs, qa, coming-soon'
  );

  // Verify 650ms cooldown lock
  assert.ok(
    appContent.includes('const SCROLL_COOLDOWN_MS = 650;'),
    'App.tsx must define SCROLL_COOLDOWN_MS = 650'
  );

  // Verify wheel listener threshold of Math.abs(deltaY) > 30
  assert.ok(
    appContent.includes('Math.abs(deltaY) <= 30') || appContent.includes('Math.abs(deltaY) > 30'),
    'Wheel controller must enforce 30px delta threshold'
  );

  // Verify strict single-page advancement in down direction
  assert.ok(
    appContent.includes('currentIndex < CORE_SCROLL_VIEWS.length - 1') &&
    appContent.includes('handleViewChange(CORE_SCROLL_VIEWS[currentIndex + 1])'),
    'Scrolling down must advance strictly to next index'
  );

  // Verify strict single-page return in up direction
  assert.ok(
    appContent.includes('currentIndex > 0') &&
    appContent.includes('handleViewChange(CORE_SCROLL_VIEWS[currentIndex - 1])'),
    'Scrolling up must return strictly to previous index'
  );

  // Verify exclusions for chat, memory, and chronicles
  assert.ok(
    appContent.includes("currentView === 'chat' || currentView === 'memory' || currentView === 'chronicles'"),
    'Wheel transition must strictly bypass chat, memory, and chronicles'
  );

  // Verify modal and input scroll protection
  assert.ok(
    appContent.includes("target.closest('input, textarea, select, [role=\"dialog\"]')"),
    'Wheel controller must ignore events inside inputs, textareas, and open dialogs'
  );

  // Verify Navbar visibility on UPDATE (coming-soon)
  assert.ok(
    appContent.includes("currentView !== 'chronicles' && (") &&
    !appContent.includes("currentView !== 'coming-soon' && currentView !== 'chronicles' && ("),
    'Navbar must remain visible on coming-soon (UPDATE) view'
  );
});

test('3. Simulation of Transition State Machine & Edge Cases', () => {
  const CORE_SCROLL_VIEWS = ['home', 'clubs', 'qa', 'coming-soon'];
  const SCROLL_COOLDOWN = 650;

  class ScrollEngine {
    constructor() {
      this.currentView = 'home';
      this.lastScrollTime = 0;
    }

    onWheel(deltaY, time, targetTag = 'div', openModals = false) {
      if (['chat', 'memory', 'chronicles'].includes(this.currentView)) {
        return; // Excluded views
      }
      if (openModals) return;
      if (['input', 'textarea', 'select'].includes(targetTag)) return;

      const currentIndex = CORE_SCROLL_VIEWS.indexOf(this.currentView);
      if (currentIndex === -1) return;
      if (Math.abs(deltaY) <= 30) return;
      if (time - this.lastScrollTime < SCROLL_COOLDOWN) return;

      if (deltaY > 30) {
        if (currentIndex < CORE_SCROLL_VIEWS.length - 1) {
          this.lastScrollTime = time;
          this.currentView = CORE_SCROLL_VIEWS[currentIndex + 1];
        }
      } else if (deltaY < -30) {
        if (currentIndex > 0) {
          this.lastScrollTime = time;
          this.currentView = CORE_SCROLL_VIEWS[currentIndex - 1];
        }
      }
    }
  }

  const engine = new ScrollEngine();

  // Test Boundary: Scrolling up on home (index 0) should remain home
  engine.onWheel(-50, 1000);
  assert.equal(engine.currentView, 'home', 'Cannot scroll up past home');

  // Test Down from home -> clubs
  engine.onWheel(45, 2000);
  assert.equal(engine.currentView, 'clubs', 'Wheel down from home switches to clubs');

  // Test Rapid Inertia Flick: Events before 650ms must be rejected
  engine.onWheel(55, 2200);
  assert.equal(engine.currentView, 'clubs', 'Flick inertia within 650ms cooldown ignored');
  engine.onWheel(65, 2500);
  assert.equal(engine.currentView, 'clubs', 'Flick inertia within 650ms cooldown ignored');

  // Test Down from clubs -> qa (after cooldown)
  engine.onWheel(40, 2700);
  assert.equal(engine.currentView, 'qa', 'Wheel down from clubs switches to qa');

  // Test Down from qa -> coming-soon (UPDATE)
  engine.onWheel(60, 3400);
  assert.equal(engine.currentView, 'coming-soon', 'Wheel down from qa switches to coming-soon (UPDATE)');

  // Test Boundary: Scrolling down on coming-soon (index 3) should remain coming-soon
  engine.onWheel(80, 4100);
  assert.equal(engine.currentView, 'coming-soon', 'Cannot scroll down past coming-soon');

  // Test Up from coming-soon -> qa
  engine.onWheel(-50, 4800);
  assert.equal(engine.currentView, 'qa', 'Wheel up from coming-soon returns to qa');

  // Test Up from qa -> clubs
  engine.onWheel(-40, 5500);
  assert.equal(engine.currentView, 'clubs', 'Wheel up from qa returns to clubs');

  // Test Up from clubs -> home
  engine.onWheel(-60, 6200);
  assert.equal(engine.currentView, 'home', 'Wheel up from clubs returns to home');

  // Test Input/Modal Protection
  engine.onWheel(50, 7000, 'textarea');
  assert.equal(engine.currentView, 'home', 'Wheel inside textarea must not advance page');

  engine.onWheel(50, 8000, 'div', true);
  assert.equal(engine.currentView, 'home', 'Wheel while modal is open must not advance page');

  // Test Threshold: deltaY under 30 must not trigger
  engine.onWheel(25, 9000);
  assert.equal(engine.currentView, 'home', 'Sub-threshold wheel delta (25) ignored');
});

test('4. Invariants & Preserved Systems Integrity', () => {
  const appContent = fs.readFileSync(path.resolve('src/App.tsx'), 'utf8');
  const homeContent = fs.readFileSync(path.resolve('src/components/views/HomeView.tsx'), 'utf8');

  // Super Admin guard isolation
  assert.ok(
    appContent.includes("currentUser?.email === 'BroAmStuck@gmail.com' &&"),
    'App.tsx must strictly preserve Super Admin guard'
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

test('5. Modal Dialog & Bell Trigger Toggle Isolation Verification', () => {
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

