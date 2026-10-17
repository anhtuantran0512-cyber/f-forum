import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = async (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const [chatCss, dailyCss, quizCss, adminCss, studioCss, chartsCss, fabulousCss] = await Promise.all([
  read('src/styles/forumDesignSystem.css'),
  read('src/components/engagement/DailyEngagementModal.css'),
  read('src/components/engagement/DailyQuiz.css'),
  read('src/components/AdminInsightsModal.css'),
  read('src/components/admin/AdminStudio.css'),
  read('src/components/admin/AdminCharts.css'),
  read('src/styles/fabulousTheme.css'),
]);

test('all changed UI surfaces have base and light-theme treatments', () => {
  assert.match(chatCss, /\.ff-chat-workspace\s*\{/);
  assert.match(chatCss, /html\.light \.ff-chat-workspace/);
  assert.match(dailyCss, /\.ff-daily-attendance\s*\{/);
  assert.match(dailyCss, /html\.light \.ff-daily-attendance/);
  assert.match(quizCss, /\.ff-daily-quiz-intro\s*,\s*\n\.ff-daily-quiz-question/);
  assert.match(adminCss, /\.faa-shell\s*\{/);
  assert.match(adminCss, /html\.light \.faa-shell/);
  assert.match(studioCss, /html\.light \.faa-backdrop \.ffr-card/);
  assert.match(chartsCss, /html\.light \.faa-backdrop \.ffc-area__tip/);
});

test('chat, attendance, and admin surfaces participate in both Fabulous palettes', () => {
  for (const selector of [
    'html.dark.fabulous-mode .ff-chat-workspace',
    'html.light.fabulous-mode .ff-chat-workspace',
    "html.dark.fabulous-mode [role='dialog'] .ff-daily-panel.liquid-glass",
    "html.light.fabulous-mode [role='dialog'] .ff-daily-panel.liquid-glass",
    'html.dark.fabulous-mode .faa-shell',
    'html.light.fabulous-mode .faa-shell',
  ]) {
    assert.ok(fabulousCss.includes(selector), `missing Fabulous theme rule: ${selector}`);
  }
});

test('responsive and reduced-motion rules cover the redesigned surfaces', () => {
  assert.match(chatCss, /@media \(max-width: 480px\)/);
  assert.match(chatCss, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(dailyCss, /@media \(max-width: 440px\)/);
  assert.match(dailyCss, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(adminCss, /@container \(max-width: 650px\)/);
  assert.match(studioCss, /@container \(max-width: 650px\)/);
});

test('attendance rendering preserves server milestones, status semantics, and account isolation', async () => {
  const modal = await read('src/components/DailyEngagementModal.tsx');
  const helper = await read('src/utils/dailyAttendance.ts');
  assert.match(helper, /ATTENDANCE_BOX_MILESTONES = \[5, 10, 15\]/);
  assert.match(modal, /role="progressbar"/);
  assert.match(modal, /aria-current=\{isCurrent \? 'step' : undefined\}/);
  assert.match(modal, /encodeURIComponent\(currentUserEmail\.trim\(\)\.toLowerCase\(\)\)/);
});
