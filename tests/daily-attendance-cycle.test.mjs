import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

const source = await readFile(new URL('../src/utils/dailyAttendance.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
});
const moduleUrl = `data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`;
const { ATTENDANCE_BOX_MILESTONES, ATTENDANCE_CYCLE_DAYS, getAttendanceCycleProgress } = await import(moduleUrl);

const view = (streak, claimedToday) => {
  const { cycleNumber, cycleDay, completedDays } = getAttendanceCycleProgress(streak, claimedToday);
  return { cycleNumber, cycleDay, completedDays };
};

test('attendance cycle begins at day one before the first claim', () => {
  assert.deepEqual(view(0, false), { cycleNumber: 1, cycleDay: 1, completedDays: 0 });
});

test('next-day display lines up with the server box milestones', () => {
  assert.deepEqual(ATTENDANCE_BOX_MILESTONES, [5, 10, 15]);
  assert.deepEqual(view(4, false), { cycleNumber: 1, cycleDay: 5, completedDays: 4 });
  assert.deepEqual(view(9, false), { cycleNumber: 1, cycleDay: 10, completedDays: 9 });
  assert.deepEqual(view(14, false), { cycleNumber: 1, cycleDay: 15, completedDays: 14 });
});

test('claiming a milestone keeps the just-earned cycle day visible', () => {
  assert.deepEqual(view(5, true), { cycleNumber: 1, cycleDay: 5, completedDays: 5 });
  assert.deepEqual(view(10, true), { cycleNumber: 1, cycleDay: 10, completedDays: 10 });
  assert.deepEqual(view(15, true), { cycleNumber: 1, cycleDay: 15, completedDays: 15 });
});

test('a completed 15-day reward cycle rolls over instead of clamping at day 15', () => {
  assert.equal(ATTENDANCE_CYCLE_DAYS, 15);
  assert.deepEqual(view(15, false), { cycleNumber: 2, cycleDay: 1, completedDays: 0 });
  assert.deepEqual(view(16, true), { cycleNumber: 2, cycleDay: 1, completedDays: 1 });
  assert.deepEqual(view(19, false), { cycleNumber: 2, cycleDay: 5, completedDays: 4 });
  assert.deepEqual(view(20, true), { cycleNumber: 2, cycleDay: 5, completedDays: 5 });
});

test('invalid or fractional streaks are normalized safely', () => {
  assert.deepEqual(view(-4, false), { cycleNumber: 1, cycleDay: 1, completedDays: 0 });
  assert.deepEqual(view(3.8, false), { cycleNumber: 1, cycleDay: 4, completedDays: 3 });
  assert.deepEqual(view(Number.NaN, true), { cycleNumber: 1, cycleDay: 1, completedDays: 1 });
});

test('attendance view uses an accessible progress track and per-account cache keys', async () => {
  const component = await readFile(new URL('../src/components/DailyEngagementModal.tsx', import.meta.url), 'utf8');
  assert.match(component, /role="progressbar"/);
  assert.match(component, /aria-valuetext=/);
  assert.match(component, /aria-current=\{isCurrent \? 'step' : undefined\}/);
  assert.match(component, /fforum_daily_\$\{encodeURIComponent\(currentUserEmail\.trim\(\)\.toLowerCase\(\)\)\}/);
  assert.doesNotMatch(component, /fforum_attendance_log|fforum_mystery_boxes|fforum_last_quiz_date/);
});
