import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const read = (rel) => fs.readFileSync(path.resolve(rel), 'utf8');

test('1. Nhật ký giờ học — lưu qua safeStorage, có sự kiện đồng bộ toàn cục', () => {
  const log = read('src/utils/studyLog.ts');

  assert.ok(log.includes("STUDY_LOG_KEY = 'fforum_study_log'"), 'Study log must persist under fforum_study_log');
  assert.ok(log.includes("STUDY_GOAL_KEY = 'fforum_study_weekly_goal'"), 'Weekly goal key must exist');
  assert.ok(log.includes("STUDY_TARGET_KEY = 'fforum_study_daily_target'"), 'Daily target key must exist');
  assert.ok(log.includes("from './storage'") && log.includes('safeStorage'), 'Must use the shared safeStorage wrapper');
  assert.ok(!/localStorage\.(getItem|setItem|removeItem)/.test(log), 'No direct localStorage access (test #13 rule)');

  assert.ok(log.includes("CustomEvent('fforum_study_sync')"), 'Log writes must broadcast fforum_study_sync');
  assert.ok(log.includes('MAX_SESSIONS'), 'Study log must be capped so localStorage cannot explode');
  assert.ok(
    log.includes('Math.max(1, Math.min(600, Math.round(minutes)))'),
    'logStudyMinutes must clamp absurd values (1..600 minutes)',
  );

  assert.ok(log.includes('computeStudyTotals') && log.includes('streakDays'), 'Totals must expose the study streak');
  assert.ok(
    log.includes('todayMinutes') && log.includes('weekMinutes') && log.includes('monthMinutes'),
    'Totals must feed today / week / month gauges',
  );
  assert.ok(log.includes('estimateMinutesFromXp') && log.includes('buildStudyLeaderboard'), 'Hours leaderboard builder must exist');
  assert.ok(log.includes("'Tất cả'") || log.includes('formatHours') || log.includes('formatDuration'), 'Formatting helpers must exist');
});

test('2. Đồng hồ cơ Odometer — lăn tới giá trị thật, không quay vô hạn', () => {
  const odo = read('src/components/OdometerDigits.tsx');

  assert.ok(odo.includes('translateY(calc(var(--ff-odo-d'), 'Each digit column must translate by the real digit value');
  assert.ok(odo.includes('ff-odo__strip') && odo.includes('ff-odo__col'), 'Odometer drum markup must use scoped ff-odo__ classes');
  assert.ok(odo.includes('toFixed(decimals)'), 'Value must be rendered with the requested precision');
  assert.ok(odo.includes('ariaLabel') && odo.includes('role="img"'), 'Odometer must expose an accessible label');
  assert.ok(odo.includes('Number.isFinite(value)'), 'Odometer must guard against NaN input');
  assert.ok(
    odo.includes('requestAnimationFrame') && odo.includes('countUp = true'),
    'Hours odometer must count up from 0 to the real value',
  );
  assert.ok(odo.includes('finalFixed'), 'Screen-reader label must use the final value, not the mid-count number');
  assert.ok(!/infinite/.test(odo), 'Odometer must not spin forever — it shows real numbers');
});

test('3. Màn hình chờ chuyển phân khu (la-09 vinyl) — đúng tỉ lệ, bỏ nút demo', () => {
  const loader = read('src/components/ViewTransitionLoader.tsx');
  const css = read('src/index.css');

  assert.ok(loader.includes("variant = 'vinyl'"), 'Vinyl must be the default loader variant');
  assert.ok(loader.includes('la-09__disc') && loader.includes('la-09__label'), 'Turntable disc + centre label must exist');
  assert.ok(loader.includes('la-09__arm') && loader.includes('la-09__post') && loader.includes('la-09__head'), 'Tonearm must be present');
  assert.ok(loader.includes('la-09__eq') && loader.includes('length: 12'), 'Equalizer must have 12 bars');
  assert.ok(loader.includes('la-09__bar') && loader.includes('la-09__bar-fill'), 'Progress bar must exist');
  assert.ok(loader.includes('1100'), 'Status hint must rotate every 1100ms');
  assert.ok(loader.includes('Đang mở ${targetLabel}') || loader.includes('Đang mở '), 'Loader must name the destination tab');
  assert.ok(!loader.includes('la-09__chrome'), 'Demo-only chrome (theme/done buttons) must be removed');
  assert.ok(!/onClick=\{\(\) => setTheme/.test(loader), 'No demo theme switcher may remain');

  assert.ok(css.includes('.la-09__disc') && css.includes('@keyframes laVinylSpin'), 'Vinyl must actually spin in CSS');
  assert.ok(css.includes('.la-09__bar-fill') && css.includes('@keyframes laBarRun'), 'Loader progress bar must animate');
  assert.ok(css.includes('.la-09--dots .la-09__deck { display: none; }'), 'Dots variant must drop the deck');
});

test('4. Bong bóng "đang tải" trong phòng chat (la-05)', () => {
  const loader = read('src/components/ViewTransitionLoader.tsx');
  const chatView = read('src/components/views/ChatView.tsx');
  const chatDock = read('src/components/ChatDock.tsx');
  const css = read('src/index.css');

  assert.ok(loader.includes('ThinkingBubble'), 'ThinkingBubble must be exported for the chat surfaces');
  assert.ok(loader.includes('la-05__dots') && loader.includes('la-05__bubble'), 'Bubble + three dots markup must exist');
  assert.ok(loader.includes("role=\"status\"") && loader.includes('aria-live="polite"'), 'Bubble must announce loading politely');

  assert.ok(chatView.includes('ThinkingBubble'), 'ChatView must swap the skeleton for thinking bubbles');
  assert.ok(chatDock.includes('ThinkingBubble'), 'ChatDock must use thinking bubbles while syncing');
  assert.ok(chatDock.includes('isSynced = true'), 'ChatDock must accept the isSynced flag');

  assert.ok(css.includes('.la-05__dot') && css.includes('@keyframes laDotBounce'), 'Dots must bounce with a real keyframe');
  assert.ok(css.includes('animation-delay: 0.16s') && css.includes('animation-delay: 0.32s'), 'Dots must stagger');
});

test('5. Bảng nhịp học tập (cnc-21) — nhịp đập và vệt quét suy ra từ dữ liệu thật', () => {
  const pulse = read('src/components/StudyPulsePanel.tsx');
  const css = read('src/index.css');

  assert.ok(pulse.includes("['--ff-pulse' as string]: pulse"), 'Panel must publish the bpm as a CSS variable');
  assert.ok(
    pulse.includes('Math.round(58 + todayRatio * 78)'),
    'Pulse must be derived from today minutes (58 → 148 bpm)',
  );
  assert.ok(pulse.includes('sweepSeconds') && pulse.includes('animationDuration'), 'ECG sweep speed must come from real data');
  assert.ok(pulse.includes('ff-pulse__trace') && pulse.includes("[0, 100, 200, 300, 400, 500]"), 'ECG must repeat the beat 6 times');
  assert.ok(pulse.includes("data-z=\"1\"") && pulse.includes('ff-pulse__marker'), 'Four-zone progress track + marker must exist');
  assert.ok(
    !pulse.includes('ff-pulse__log') && !pulse.includes('onLogMinutes'),
    'Manual quick-log buttons must be gone — hours only come from real Pomodoro sessions',
  );
  assert.ok(pulse.includes('onOpenFocusMode'), 'Panel must be able to jump into Focus mode');
  assert.ok(
    pulse.includes('Vào Phòng Tập Trung để ghi giờ') && pulse.includes('không cần bấm gì thêm'),
    'Panel must point users at the Focus room and explain that logging is automatic',
  );
  assert.ok(pulse.includes('weeklyGoalMinutes') && pulse.includes('dailyTargetMinutes'), 'Panel must read the goal + target settings');

  assert.ok(css.includes('.ff-pulse__heart') && css.includes('@keyframes ffPulseHeart'), 'Heart must beat in CSS');
  assert.ok(
    css.includes('animation: ffPulseHeart calc(60s / var(--ff-pulse, 72))'),
    'Heart rate animation duration must follow the bpm variable',
  );
  assert.ok(css.includes('.ff-pulse__sweep'), 'ECG sweep overlay must be styled');
});

test('6. Bảng xếp hạng giờ học — GUI mới, giữ nguyên hợp đồng giao diện cũ', () => {
  const board = read('src/components/views/LeaderboardWidget.tsx');
  const css = read('src/index.css');

  /* Hợp đồng bắt buộc của tests/user-profile-report-system.test.mjs #3 */
  for (const needle of [
    'Bảng xếp hạng',
    "week: 'Tuần'",
    "month: 'Tháng'",
    "year: 'Năm'",
    "all: 'Toàn thời gian'",
    'computeMembers',
    'Bạn muốn hỏi điều gì?',
    'Đặt câu hỏi',
    'MagneticButton',
  ]) {
    assert.ok(board.includes(needle), `LeaderboardWidget must keep the string: ${needle}`);
  }

  assert.ok(board.includes("METRIC_LABELS") && board.includes("hours: 'Giờ học'"), 'Hours ranking tab must exist');
  assert.ok(board.includes('buildStudyLeaderboard') && board.includes('readStudySessions'), 'Hours board must read the study log');
  assert.ok(board.includes("addEventListener('fforum_study_sync'"), 'Board must refresh live when a session is logged');
  assert.ok(board.includes('OdometerDigits'), 'Total must be shown on the odometer');
  assert.ok(board.includes('StudyPulsePanel'), 'Hours gauge panel must be mounted under the board');
  assert.ok(board.includes('ff-podium') && board.includes('[1, 0, 2]'), 'Podium must render silver-gold-bronze order');
  assert.ok(board.includes('ff-row__track') && board.includes('progressOf'), 'List rows must show relative progress bars');
  assert.ok(board.includes('onOpenFocusMode'), 'Board must pass the Focus hook to the gauge panel');
  assert.ok(
    !board.includes('logStudyMinutes') && !board.includes("'manual'"),
    'Board must not expose any manual study-minute logging path',
  );
  assert.ok(board.includes('estimated'), 'Estimated hours must be flagged in the UI');

  assert.ok(css.includes('.ff-board {') && css.includes('.ff-board__switch-btn.is-active'), 'New board shell must be styled');
  assert.ok(css.includes('.ff-podium__slot--1') && css.includes('@keyframes ffCrownBob'), 'Podium must be styled with a bobbing crown');
  assert.ok(css.includes('.ff-row--you'), 'The current user row must be highlighted');
  assert.ok(css.includes('.ff-board__me'), 'Personal rank footer must be styled');
});

test('7. CSS mới — có light mode + chế độ giảm chuyển động, không phá quy ước màu', () => {
  const css = read('src/index.css');

  for (const block of [
    '.ff-odo__strip',
    '.ff-pulse__zone',
    '.ff-board__total',
    '.ff-podium__plinth',
    '.la-09__card',
    '.la-05__bubble',
  ]) {
    assert.ok(css.includes(block), `Missing style block: ${block}`);
  }

  assert.ok(css.includes('html.light .ff-board'), 'Leaderboard must have a light-mode variant');
  assert.ok(css.includes('html.light .ff-pulse'), 'Gauge panel must have a light-mode variant');
  assert.ok(css.includes('html.light .la-09__card'), 'Loader must have a light-mode variant');
  assert.ok(!css.includes('#0f172a'), 'Light-mode ink must stay #101827 (test #6 rule)');
  assert.ok(css.includes('.reduce-motion .la-05__dot'), 'Reduced-motion class must also cover the chat dots');
  assert.ok(css.includes('.ff-view-slide-up') && css.includes('@keyframes ffViewSlideUp'), 'View slide animation must exist');
});

test('8. Màn hình chờ được nối vào App & wheel-nav đã bị xóa hoàn toàn', () => {
  const app = read('src/App.tsx');

  assert.ok(app.includes('<ViewTransitionLoader'), 'App must mount the vinyl transition loader');
  assert.ok(app.includes('VIEW_LOADERS') && app.includes("variant: 'vinyl'"), 'Per-tab loader metadata must exist');
  assert.ok(app.includes('LOADER_MIN_MS') && app.includes('LOADER_REVISIT_MS'), 'First visit and revisit must have different waits');
  assert.ok(app.includes('LOADER_HARD_CAP_MS'), 'Loader must always terminate (no infinite spin)');
  assert.ok(app.includes('ViewReadySignal') && app.includes('setReadyView'), 'Loader must wait for the lazy chunk to be mounted');
  assert.ok(app.includes('ff-view-slide-up') && app.includes('ff-view-slide-down'), 'Tab changes must slide in the matching direction');
  assert.ok(app.includes('onOpenFocusMode={() => setIsFocusModeOpen(true)}'), 'Focus mode must be reachable from the board');
  assert.ok(app.includes('isSynced={isSynced}'), 'Sync flag must still be forwarded to chat + forum surfaces');
  assert.ok(
    !app.includes('isInsideScrollable') && !app.includes('transitionActiveRef') && !app.includes("addEventListener('wheel'"),
    'Wheel navigation (scrollable-yield, transitionActiveRef, wheel listener) must be fully removed',
  );
  assert.ok(
    app.includes('if (v === currentView)') && app.includes("behavior: 'smooth'"),
    'Clicking the tab you are already on must just scroll up, not replay the loader',
  );
});

test('9. Phòng Tập Trung — phiên học là mốc thời gian thật, sống ngoài HUD', () => {
  const focus = read('src/components/FocusSanctuary.tsx');
  const session = read('src/utils/focusSession.ts');

  assert.ok(session.includes("FOCUS_SESSION_KEY = 'fforum_focus_session'"), 'Session must persist under a stable key');
  assert.ok(session.includes('endsAt'), 'Session must be defined by a real end timestamp');
  assert.ok(!session.includes('setInterval('), 'Session utility must not depend on interval ticks');
  assert.ok(session.includes('focusRemainingLabel') && session.includes('focusElapsedMinutes'), 'Shared time helpers must exist');
  assert.ok(session.includes('subscribeFocusSession') && session.includes("FOCUS_SYNC_EVENT"), 'Every surface must be able to follow the same session');
  assert.ok(session.includes('requestFocusStop') && session.includes('FOCUS_STOP_REQUEST_EVENT'), 'Stopping must go through one shared flow');
  assert.ok(session.includes('FOCUS_STALE_GRACE_MS'), 'Sessions that ended while the app was closed must not be credited blindly');

  assert.ok(!focus.includes('timeLeft'), 'HUD must not own a decrementing counter anymore');
  assert.ok(focus.includes('startFocusSession(') && focus.includes('readFocusSession('), 'HUD must drive the shared session');
  assert.ok(focus.includes('requestFocusStop()'), 'HUD stop button must ask the watcher to settle the session');
  assert.ok(focus.includes('Đóng cửa sổ này vẫn KHÔNG mất phiên học'), 'HUD must tell the student the session keeps running');
  assert.ok(focus.includes('Nhật ký giờ học') && focus.includes('sessionsForOwner'), 'HUD must show the real study-hours log of this account');
  assert.ok(focus.includes('FOCUS_CREDITED_EVENT'), 'HUD must react when a session is credited');
});

test('9b. Focus Room EPIC 1 — ring gradient xoay + breathing + confetti mốc 25/60/120 + nhập số trực tiếp', () => {
  const focus = read('src/components/FocusSanctuary.tsx');
  const ring = read('src/components/CircularProgressRing.tsx');

  // Confetti/particle burst khi đạt mốc (sự kiện credited được nối vào CelebrationBurst)
  assert.ok(focus.includes('<CelebrationBurst'), 'Focus HUD must render the confetti burst layer');
  assert.ok(focus.includes('minutes >= 25'), 'Milestone burst must fire at the 25-minute reward tier');
  assert.ok(focus.includes('setBurstTick((n) => n + 1)'), 'Each milestone must trigger a fresh burst');

  // Vòng ring: gradient xoay + breathing khi đang chạy
  assert.ok(ring.includes('animateTransform') && ring.includes('gradientTransform'), 'Progress ring gradient must rotate (SMIL animateTransform)');
  assert.ok(ring.includes('breathing'), 'Ring must support a breathing state while a session runs');
  assert.ok(ring.includes('ringBreath'), 'Ring must use the breathing keyframes');
  assert.ok(focus.includes("breathing={isRunning && activeMode === 'work'}"), 'Ring must breathe only during an active work session');

  // Code chết đã được dọn: không còn sự kiện không listener / hàm inject không gọi
  assert.ok(!ring.includes('fforum-milestone-reached'), 'The unlistened milestone event dispatch must be gone');
  assert.ok(!ring.includes('injectGradientAnimation'), 'The never-called keyframe injector must be removed');

  // Slider + nhập số trực tiếp, tối thiểu 5 phút
  assert.ok(focus.includes('type="range"') && focus.includes('min="5"'), 'Target slider must keep a 5-minute minimum');
  assert.ok(focus.includes('type="number"') && focus.includes('Math.max(5, v)'), 'Direct number input must clamp to the 5-minute minimum');
});

test('10. FocusSessionWatcher — giờ học được ghi cục bộ, phần thưởng do máy chủ xác nhận', () => {
  const watcher = read('src/components/FocusSessionWatcher.tsx');
  const app = read('src/App.tsx');
  const store = read('src/store/forumStore.ts');
  const session = read('src/utils/focusSession.ts');

  assert.ok(watcher.includes("logStudyMinutes(minutes, 'focus', userEmail)"), 'Completed sessions must be logged for the right account');
  assert.ok(watcher.includes('onCompleteReward?.(finished.serverSessionId)'), 'A completed reward session must be confirmed by the server');
  assert.ok(watcher.includes('onCancelReward?.(finished.serverSessionId)'), 'Early/stale sessions must be canceled server-side');
  assert.ok(!watcher.includes('onRewardXP'), 'The watcher must not grant XP directly from the client');
  assert.ok(watcher.includes('announceFocusCredited'), 'Other surfaces must be told about the study-log entry');
  assert.ok(watcher.includes('studied >= 5'), 'Stopping early must log the real minutes (from 5 minutes)');
  assert.ok(watcher.includes('ff-focus-chip'), 'A floating countdown chip must exist for when the HUD is closed');
  assert.ok(watcher.includes('setInterval'), 'The watcher is the single place allowed to tick');
  assert.ok(watcher.includes('computeStudyTotals') && watcher.includes('sessionsForOwner'), 'Today total must belong to this account');

  assert.ok(app.includes('onStartRewardSession={startFocusRewardSession}'), 'HUD must ask server to open a reward session');
  assert.ok(app.includes('onCompleteReward={completeFocusRewardSession}'), 'Watcher must complete the server session');
  assert.ok(app.includes('onCancelReward={cancelFocusRewardSession}'), 'Watcher must cancel incomplete server sessions');
  assert.ok(app.includes('<FocusSessionWatcher') && app.includes('isHudOpen={isFocusModeOpen}'), 'Watcher must stay mounted at app level');
  assert.ok(app.includes('userEmail={currentUser?.email}'), 'Focus surfaces must know whose session is running');
  assert.ok(session.includes('serverSessionId?: string'), 'Persisted focus session must retain its server-issued reward id');
  assert.ok(store.includes("postStoreAction('/api/rewards/focus/start'"), 'Focus reward session must start through authenticated API');
  assert.ok(store.includes("postStoreAction('/api/rewards/focus/complete'"), 'XP/Coin must be credited only after server completion');
  assert.ok(store.includes("postStoreAction('/api/rewards/focus/cancel'"), 'Canceled reward sessions must be closed through API');
});

test('11. Chi tiết giờ học — biểu đồ 7 ngày, thống kê, nhật ký phiên', () => {
  const detail = read('src/components/StudyHoursDetail.tsx');
  const log = read('src/utils/studyLog.ts');
  const board = read('src/components/views/LeaderboardWidget.tsx');

  assert.ok(log.includes('studyDaySeries') && log.includes('computeStudyStats'), 'Detail helpers must exist in the study log');
  assert.ok(log.includes('sessionsForOwner'), 'Study log must be filterable per account');
  assert.ok(log.includes('removeStudySession') && log.includes('STUDY_SOURCE_LABELS'), 'Removal + source labels must exist');
  assert.ok(log.includes('formatDayLabel') && log.includes('formatClock'), 'Human day/clock labels must exist');

  assert.ok(detail.includes('ff-hours__chart'), 'A 7-day chart must be rendered');
  assert.ok(detail.includes('studyDaySeries(sessions, 7)'), 'Chart must use real 7-day data');
  assert.ok(detail.includes('ff-hours__recent') && detail.includes('recentStudySessions(sessions, 6)'), 'Recent sessions list must exist');
  assert.ok(detail.includes('removeStudySession(id)'), 'Wrong sessions must be removable');
  assert.ok(detail.includes('Trung bình / ngày học') && detail.includes('Phiên dài nhất'), 'Stats tiles must be detailed');
  assert.ok(detail.includes('window.confirm'), 'Deleting a session must ask for confirmation');
  assert.ok(
    board.includes('StudyHoursDetail') && board.includes("metric === 'hours' &&"),
    'Detail panel must only show on the study-hours tab',
  );
  assert.ok(board.includes('sessionsForOwner(sessions, currentUser?.email)'), 'Personal totals must not mix accounts');
});

test('12. Navbar phóng to/thu nhỏ — bóng mờ + MỘT vệt sáng, không giật', () => {
  const navbar = read('src/components/Navbar.tsx');
  const css = read('src/index.css');

  assert.ok(navbar.includes('ff-nav-loading'), 'Navbar must render the loading layer');
  assert.ok(
    navbar.split('ff-nav-loading__sheen').length - 1 === 1,
    'There must be exactly ONE animated element (a single sheen), not a row of fake bars',
  );
  assert.ok(!navbar.includes('ff-nav-skeleton'), 'Fake skeleton bars must be gone (bad alignment + heavy)');
  assert.ok(!css.includes('ff-nav-skeleton'), 'Old skeleton CSS must be removed');

  assert.ok(navbar.includes('isMorphBusy') && navbar.includes('flashMorphLoading'), 'Layer must be driven by a morph flag');
  assert.ok(navbar.includes('NAV_MORPH_MS'), 'Morph loading must be time-boxed');
  assert.ok(navbar.includes('ff-nav-capsule--busy'), 'Capsule must expose the busy state');
  assert.ok(navbar.includes("data-morph={isMorphBusy ? 'loading' : 'ready'}"), 'Capsule must report loading → ready');
  assert.ok(navbar.includes('aria-busy={isMorphBusy}'), 'Busy state must be announced');
  assert.ok(
    navbar.includes('prefers-reduced-motion') && navbar.includes('flashMorphLoading'),
    'Reduced motion must skip the loading layer',
  );

  assert.ok(css.includes('.ff-nav-loading__sheen') && css.includes('@keyframes ffNavLoadingSheen'), 'Sheen must animate');
  assert.ok(
    css.includes('will-change: transform') && css.includes('animation-play-state: paused'),
    'Sheen must be GPU-friendly and paused while idle',
  );
  assert.ok(
    /\.ff-nav-capsule--busy \.ff-nav-loading \{[\s\S]{0,340}transition: none;/.test(css),
    'Layer must appear instantly to mask the width jump',
  );
  /* Vòng 9: icon/nhãn phải LUÔN rõ và LUÔN bấm được — hiệu ứng "bóng mờ 0.24"
     từng khiến người dùng tưởng icon biến mất, nay bị xoá hẳn. */
  assert.ok(
    css.includes('.ff-nav-capsule--busy > *:not(.ff-nav-aura):not(.ff-nav-loading)'),
    'Busy-state rule for the real content must exist',
  );
  const busyRule = css.match(
    /\.ff-nav-capsule--busy > \*:not\(\.ff-nav-aura\):not\(\.ff-nav-loading\) \{([\s\S]*?)\}/,
  );
  assert.ok(busyRule, 'Busy-state rule must be readable');
  assert.ok(!busyRule[1].includes('opacity'), 'Icons + labels must keep full opacity while morphing');
  assert.ok(!busyRule[1].includes('pointer-events'), 'Busy content must stay clickable');
  assert.ok(!css.includes('ffNavGhostBreath'), 'The dim-into-ghost effect must be gone for good');
  assert.ok(
    /\.ff-nav-loading__sheen \{[\s\S]{0,1600}mask:/.test(css),
    'The sheen must be masked to the capsule edges so it never covers icons',
  );
  assert.ok(
    css.includes('.ff-nav-capsule--busy .ff-nav-aura::before'),
    'The aura (not a veil) must carry the loading signal while morphing',
  );
  assert.ok(
    /@keyframes ffNavMorph \{[\s\S]{0,220}\}/.test(css) && !/@keyframes ffNavMorph \{[\s\S]{0,220}blur/.test(css),
    'ffNavMorph must not animate filter: blur (heavy paint + washed-out icons)',
  );
  assert.ok(!css.includes('ffNavSkReveal'), 'No double reveal animation (it re-triggered on every morph)');
  assert.ok(css.includes('html.light .ff-nav-loading__sheen'), 'Sheen must have a light-mode variant');
  assert.ok(css.includes('.reduce-motion .ff-nav-loading__sheen'), 'Reduced-motion class must cover the sheen');
  assert.ok(/\.nav-tab-btn \{[\s\S]{0,200}min-width 0\.5s/.test(css), 'Tab min-width must glide with the morph');

  /* Chống giật: chỉ báo tab nằm TRONG nút — không còn đo vị trí pill bằng JS,
     nên không thể lệch hay "nhảy" trong lúc thanh đang đổi kích thước */
  assert.ok(
    !navbar.includes('liquidPillRef') && !navbar.includes('settleTimers') && !navbar.includes('--liquid-pill-x'),
    'The JS-measured pill must be gone (no per-frame layout reads while morphing)',
  );
  assert.ok(
    navbar.includes('nav-tab-btn__indicator') && navbar.includes('nav-tab-btn__indicator--on'),
    'Active-tab indicator must live inside the tab button so it always matches the button box',
  );
  assert.ok(
    css.includes('.nav-tab-btn__indicator--on') && css.includes('transform: scale(0.55)'),
    'Indicator must animate in via CSS only (no JS measurement during morph)',
  );
});

test('13. CSS vòng 5 — chip phiên học, toast, chi tiết giờ học đều có light mode', () => {
  const css = read('src/index.css');

  for (const block of ['.ff-focus-chip', '.ff-focus-toast', '.ff-hours__chart', '.ff-hours__recent', '.ff-hours__del']) {
    assert.ok(css.includes(block), `Missing style block: ${block}`);
  }
  assert.ok(css.includes('@keyframes ffFocusChipIn') && css.includes('@keyframes ffFocusToastIn'), 'Chip + toast must animate in');
  assert.ok(css.includes('html.light .ff-focus-chip') && css.includes('html.light .ff-hours'), 'Light-mode variants required');
  assert.ok(css.includes('.reduce-motion .ff-focus-chip'), 'Reduced-motion class must cover the chip');
  assert.ok(css.includes('.ff-hours__col.is-today'), 'Today column must be highlighted in the chart');
});

test('14. Không bao giờ khoá tương tác: mọi lớp phủ đều có đường thoát', () => {
  const css = read('src/index.css');
  const navbar = read('src/components/Navbar.tsx');
  const settings = read('src/components/SettingsModal.tsx');
  const loader = read('src/components/ViewTransitionLoader.tsx');
  const app = read('src/App.tsx');
  const coach = read('src/components/StudyCareCoach.tsx');
  const pageLoader = read('src/components/PageResourceLoader.tsx');

  /* 1. Lớp loading navbar chỉ được LÀM MỜ, không được chặn chuột */
  const busyBlock = css.match(
    /\.ff-nav-capsule--busy > \*:not\(\.ff-nav-aura\):not\(\.ff-nav-loading\) \{([\s\S]*?)\}/,
  );
  assert.ok(busyBlock, 'Busy-state rule must exist');
  assert.ok(
    !busyBlock[1].includes('pointer-events'),
    'Busy navbar content must stay clickable (this caused “bấm gì cũng không mở”)',
  );
  assert.ok(
    navbar.includes('cancelMorphLoading') && navbar.includes('onPointerDownCapture={cancelMorphLoading}'),
    'The loading layer must be dismissed by the very first pointer down',
  );

  /* 2. Tấm phủ cài đặt đang tan không được giữ chuột */
  const backdropOut = css.match(/\.ff-backdrop-out \{([\s\S]*?)\}/);
  assert.ok(backdropOut && backdropOut[1].includes('pointer-events: none'), 'Fading backdrop must be click-through');
  assert.ok(
    settings.includes('const guard = window.setTimeout') && settings.includes('900'),
    'Settings must force-close itself if the exit animation ever stalls',
  );

  /* 3. Màn hình chờ chuyển phân khu phải bấm/Esc là vào được ngay */
  assert.ok(loader.includes('onSkip'), 'Transition loader must accept a skip handler');
  assert.ok(loader.includes('onPointerDown={onSkip}'), 'Clicking the loader must skip it');
  assert.ok(loader.includes("e.key === 'Escape'"), 'Escape must skip the loader');
  assert.ok(app.includes('onSkip={() => setTransition(null)}'), 'App must wire the loader skip');

  /* 4. Nghỉ mắt 20-20-20 đếm theo đồng hồ thật, không thể kẹt */
  assert.ok(coach.includes('endsAtRef'), 'Eye rest must track a real end timestamp');
  assert.ok(coach.includes('visibilitychange'), 'Returning to the tab must re-sync the countdown');
  assert.ok(coach.includes("e.key === 'Escape'"), 'Escape must dismiss the eye-rest overlay');

  /* 5. Màn hình tải tài nguyên đầu trang có trần thời gian */
  assert.ok(pageLoader.includes('hardStop') && pageLoader.includes('5200'), 'Boot loader must self-close after 5.2s max');
});

test('15. Vòng 7 — không lớp phủ vô hình nào được phép khoá cả trang', () => {
  const settings = read('src/components/SettingsModal.tsx');
  const navbar = read('src/components/Navbar.tsx');
  const css = read('src/index.css');
  const app = read('src/App.tsx');
  const main = read('src/main.tsx');

  /* 1. Bảng Cài đặt: hết cảnh panel vô hình mà tấm phủ vẫn bắt chuột */
  assert.ok(settings.includes('const isAnchored = hasAnchor && pop.ready'), 'Panel must know whether it is anchored');
  assert.ok(settings.includes('const isOnScreen = isAnchored || isFloating'), 'Panel must know whether it is on screen');
  assert.ok(
    settings.includes('{isOnScreen ? (') || settings.includes('{isOnScreen ?'),
    'The full-screen backdrop may only exist while the panel is visible',
  );
  assert.ok(settings.includes('ff-settings-panel--floating'), 'Panel must fall back to a centred sheet when unanchored');
  assert.ok(settings.includes('ff-settings-panel--ghost'), 'Panel must be click-through during the measuring grace period');
  assert.ok(settings.includes('usePopoverPosition(isRendered'), 'Anchored positioning must stay in place');

  const layerRule = css.match(/\.ff-settings-layer \{([\s\S]*?)\}/);
  assert.ok(layerRule && layerRule[1].includes('pointer-events: none'), 'The centred wrapper itself must never catch clicks');
  const floatingRule = css.match(/\.ff-settings-panel--floating \{([\s\S]*?)\}/);
  assert.ok(
    floatingRule && floatingRule[1].includes('pointer-events: auto !important'),
    'Only the centred panel receives interaction',
  );
  const ghostRule = css.match(/\.ff-settings-panel--ghost \{([\s\S]*?)\}/);
  assert.ok(ghostRule && ghostRule[1].includes('pointer-events: none'), 'Ghost panel must be click-through');

  /* 2. Dải bắt hover vô hình của navbar auto-hide đã bị xoá hẳn */
  assert.ok(!navbar.includes('z-[51]'), 'The invisible auto-hide strip (z-51, above the navbar) must be gone');
  assert.ok(navbar.includes('navbarAutoHide'), 'Auto-hide edge detection must still work via mousemove');

  /* 3. Watchdog: tự gỡ lớp phủ vô hình nuốt cú bấm */
  const watchdog = read('src/utils/interactionWatchdog.ts');
  assert.ok(app.includes('installInteractionWatchdog()'), 'App must install the interaction watchdog');
  assert.ok(watchdog.includes('document.elementFromPoint'), 'Watchdog must inspect the real top element under the cursor');
  assert.ok(watchdog.includes('VIEWPORT_COVERAGE = 0.96'), 'Only near-full-viewport layers are considered');
  assert.ok(watchdog.includes("setProperty('pointer-events', 'none', 'important')"), 'Watchdog must neutralise the veil');
  assert.ok(watchdog.includes('NEUTRALIZED_EVENT'), 'Watchdog must announce what it neutralised');

  /* 4. Lưới an toàn chunk: thử lại rồi mới tải lại trang, có màn hình khôi phục */
  const retry = read('src/utils/lazyWithRetry.ts');
  assert.ok(main.includes('AppErrorBoundary'), 'Root must be wrapped in the error boundary');
  assert.ok(retry.includes('window.location.reload()'), 'Failed chunk must trigger a single reload');
  assert.ok(retry.includes('400'), 'Failed chunk must be retried once before reloading');
  assert.ok(!app.includes('= lazy(() => import('), 'All lazy chunks must go through lazyWithRetry');

  const boundary = read('src/components/AppErrorBoundary.tsx');
  assert.ok(boundary.includes('getDerivedStateFromError'), 'Boundary must catch render errors');
  assert.ok(boundary.includes('window.location.reload()'), 'Boundary must offer a reload path');
  assert.ok(boundary.includes('fforum_chunk_reload_'), 'Boundary must be able to clear poisoned chunk flags');
});

test('16. Vòng 11 — bảng xếp hạng chỉ còn tài khoản thật + thang rank 5 bậc', () => {
  const board = read('src/components/views/LeaderboardWidget.tsx');
  const store = read('src/store/forumStore.ts');

  /* Lớp tài khoản mô phỏng đã bị xoá vĩnh viễn khỏi repo */
  assert.ok(!fs.existsSync(path.resolve('src/utils/cohort.ts')), 'The virtual cohort module must be deleted, not shimmed');
  assert.ok(!/COHORT_USERS|cohortActivityPoints|isCohortMember/.test(board), 'Board must not reference the deleted virtual accounts');
  assert.ok(!/COHORT_USERS|cohortActivityPoints|isCohortMember/.test(store), 'Store must not reference the deleted virtual accounts');

  /* Bảng chỉ đọc sổ đăng ký thật: không gộp, không cộng XP ảo */
  assert.ok(board.includes('computeMembers(users,'), 'Points board must read the real account registry directly');
  assert.ok(board.includes('buildHoursMembers(users,'), 'Hours board must read the real account registry directly');
  assert.ok(board.includes('bump(email, u.xp || 0)'), 'All-time points must come from each account real XP');
  assert.ok(board.includes('MAX_BOARD_ROWS = 100'), 'Board must show up to 100 members');
  assert.ok(board.includes('const top = members.slice(0, 5)'), 'Top 5 must sit on the big rank ladder');
  assert.ok(board.includes('ladderSteps'), 'Ranks 4 & 5 must continue the podium as ladder steps');
  assert.ok(board.includes('boardRows.slice(5)'), 'Everyone below the top 5 shows as a plain list');
  assert.ok(board.includes('isYou'), 'The current user must be flagged on the board');
  assert.ok(
    board.includes("metric === 'hours' && m.estimated"),
    'Only real accounts whose hours are derived from their own XP may be marked ≈',
  );
  assert.ok(board.includes('ff-row__est'), 'Estimated values must be visibly marked in the UI (≈ symbol)');
  assert.ok(
    /members\.sort\(\(a, b\) => b\.points - a\.points \|\|/.test(board),
    'Ties must break deterministically so ranks never flicker',
  );
  assert.ok(board.includes('meEntry.rank'), 'Your own rank must be shown even outside the top 100');
  assert.ok(
    board.includes('chỉ gồm tài khoản thật'),
    'Board footnote must state that only real accounts are ranked',
  );

  /* Vệ sinh sổ đăng ký: tài khoản mô phỏng cũ không thể quay lại (client + server) */
  const server = read('server/forumServer.ts');
  assert.ok(store.includes("RETIRED_VIRTUAL_DOMAIN = '@sv.f-forum.vn'"), 'Store must retire the virtual account domain');
  assert.ok(store.includes('sanitizeUsersRegistry'), 'Store must sanitize the registry before every read/write');
  assert.ok(server.includes("RETIRED_VIRTUAL_DOMAIN = '@sv.f-forum.vn'"), 'Server must retire the virtual account domain too');
  assert.ok(server.includes('sanitizeUsers('), 'Server must drop virtual accounts when loading its data file');
  assert.ok(
    store.includes('sanitizeUsersRegistry({ ...prev, ...data.users })'),
    'Server sync must sanitize the merged registry so virtual rows cannot survive',
  );
  assert.ok(
    store.includes("prev.email.toLowerCase() === updatedUser.email.toLowerCase() ? updatedUser : prev"),
    'Profile edits in another tab must refresh this tab (accounts stay in sync)',
  );

  const css = read('src/index.css');
  assert.ok(css.includes('.ff-ladder__step--b4') && css.includes('.ff-ladder__step--b5'), 'Ladder steps 4 & 5 must be styled');
  assert.ok(css.includes('.ff-board__count'), 'The member count badge must be styled');
  assert.ok(css.includes('html.light .ff-ladder__step'), 'Ladder must have a light-mode variant');
});

test('17. Vòng 11 — bộ icon rank 8 bậc được vẽ lại, khớp màu cấu hình tier', () => {
  const badges = read('src/components/Badges10Tier.tsx');

  assert.ok(badges.includes('const Medallion'), 'All eight ranks must share one medallion frame');
  assert.ok(badges.includes('data-rank-tier={tier}'), 'Every icon must expose its tier for styling/tests');
  for (let tier = 1; tier <= 8; tier += 1) {
    assert.ok(
      badges.includes(`<Medallion tier={${tier}}`),
      `Rank ${tier} must be drawn through the shared medallion`,
    );
  }
  for (let i = 0; i < 8; i += 1) {
    assert.ok(
      badges.includes(`TIER_CONFIGS[${i}].badgeColor`) && badges.includes(`<Glyph`),
      `Rank ${i + 1} must take its colour from TIER_CONFIGS`,
    );
  }
  assert.ok(badges.includes('ornate') && badges.includes("'diamond'"), 'Higher ranks must be more ornate than lower ones');
  assert.ok(badges.includes('export const TierSvg') && badges.includes('export const TierBadge'), 'TierSvg/TierBadge public API must stay stable');
  assert.ok(badges.includes('AdminVerifiedBadge'), 'Admin verified badge must survive the redesign');

  /* Không được tái sử dụng id gradient trùng giữa các bậc khác nhau */
  /* Id gradient phải riêng cho từng instance: render cùng bậc cũng không đụng id */
  assert.ok(badges.includes('useId()'), 'Each badge instance must derive its own unique id');
  assert.ok(badges.includes('[^a-zA-Z0-9]'), 'The unique id must be stripped to characters that are safe inside url(#…)');
  assert.ok(badges.includes('url(#${p}-glyph)'), 'Glyph gradients must use the instance prefix, not a hardcoded id');
  assert.ok(!/url\(#ffr\d-glyph\)/.test(badges), 'No hardcoded glyph gradient id may remain');

  /* Tooltip vẫn mô tả đúng bậc lấy từ utils/tier */
  assert.ok(badges.includes('getTierForLevel'), 'Badge must resolve the tier from the user level');
  assert.ok(badges.includes('tier.description'), 'Tooltip must keep the tier description');
});
