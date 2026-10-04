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

test('8. Cuộn chuột & màn hình chờ được nối vào App', () => {
  const app = read('src/App.tsx');

  assert.ok(app.includes('<ViewTransitionLoader'), 'App must mount the vinyl transition loader');
  assert.ok(app.includes('VIEW_LOADERS') && app.includes("variant: 'vinyl'"), 'Per-tab loader metadata must exist');
  assert.ok(app.includes('LOADER_MIN_MS') && app.includes('LOADER_REVISIT_MS'), 'First visit and revisit must have different waits');
  assert.ok(app.includes('LOADER_HARD_CAP_MS'), 'Loader must always terminate (no infinite spin)');
  assert.ok(app.includes('ViewReadySignal') && app.includes('setReadyView'), 'Loader must wait for the lazy chunk to be mounted');
  assert.ok(app.includes('transitionActiveRef'), 'Wheel navigation must be paused while the loader runs');
  assert.ok(app.includes('ff-view-slide-up') && app.includes('ff-view-slide-down'), 'Tab changes must slide in the matching direction');
  assert.ok(app.includes('onOpenFocusMode={() => setIsFocusModeOpen(true)}'), 'Focus mode must be reachable from the board');
  assert.ok(app.includes('isSynced={isSynced}'), 'Sync flag must still be forwarded to chat + forum surfaces');
  assert.ok(
    app.includes('isInsideScrollable') && app.includes('if (isInsideScrollable(target, deltaY)) return;'),
    'Wheel navigation must yield to inner scroll areas (QA sidebar, long lists)',
  );
  assert.ok(
    app.includes('if (v === currentView)') && app.includes("behavior: 'smooth'"),
    'Clicking the tab you are already on must just scroll up, not replay the loader',
  );
});

test('9. Ghi nhận giờ học thật từ Phòng Tập Trung + quà tặng liên quan', () => {
  const focus = read('src/components/FocusSanctuary.tsx');
  const qa = read('src/components/views/QAForumView.tsx');

  assert.ok(focus.includes("logStudyMinutes(25, 'focus')"), 'Completing a 25-minute Pomodoro must log real study minutes');
  assert.ok(focus.includes('onRewardXP(25)'), 'XP reward must stay intact next to the study log');
  assert.ok(qa.includes('onOpenFocusMode?: () => void'), 'Forum view must accept the Focus opener');
  assert.ok(qa.includes('onOpenFocusMode={onOpenFocusMode}'), 'Forum view must pass it to the leaderboard widget');
});
