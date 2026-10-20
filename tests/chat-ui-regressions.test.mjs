import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const chatView = read('src/components/views/ChatView.tsx');
const chatDock = read('src/components/ChatDock.tsx');
const chatActions = read('src/components/chat/ChatMessageActions.tsx');
const design = read('src/styles/forumDesignSystem.css');
const admin = read('src/components/AdminInsightsModal.css');
const charts = read('src/components/admin/AdminCharts.css');
const avatar = read('src/components/decorations/AvatarWithDecoration.tsx');
const decoratedNames = read('src/components/decorations/DecoratedAvatar.tsx');
const decorationStore = read('src/utils/decorationStore.ts');
const roleMark = read('src/components/RoleMark.tsx');
const chatRoleIcon = read('src/components/chat/ChatRoleIcon.tsx');

test('full-page chat and dock reserve separate lanes for avatars, message text, and actions', () => {
  for (const [name, source] of [['ChatView', chatView], ['ChatDock', chatDock]]) {
    assert.match(source, /ff-chat-message-row/, `${name} message rows have a dedicated layout hook`);
    assert.match(source, /ff-chat-message-content/, `${name} separates bubble content from its row`);
    assert.match(source, /ChatMessageActions/, `${name} keeps actions in their own shared control group`);
  }
  assert.match(chatActions, /ff-chat-message-actions/, 'shared message actions keep the layout hook');

  assert.match(design, /\.ff-chat-message-row\s*\{[^}]*display:\s*grid/s);
  assert.match(design, /\.ff-chat-message-row--mine\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s+36px/s);
  assert.match(design, /\.ff-chat-message-bubble\s*\{[^}]*overflow-wrap:\s*anywhere/s);
  assert.match(design, /\.ff-chat-message-body\s*\{[^}]*max-width:\s*100%\s*!important/s);
});

test('both chat composers use a responsive input grid and never overlay counters or send controls', () => {
  assert.match(chatView, /ff-chat-composer-input-row/);
  assert.match(chatDock, /ff-chat-composer-input-row/);
  assert.match(chatView, /ff-chat-composer-meta/);
  assert.match(chatDock, /ff-chat-composer-meta/);
  assert.match(chatView, /aria-label="Gửi tin nhắn"/);
  assert.match(chatDock, /aria-label="Gửi tin nhắn"/);
  assert.match(design, /\.ff-chat-composer-shell\s*\{[^}]*grid-template-areas:\s*"input send"\s*"meta send"/s);
  assert.match(design, /\.ff-chat-composer-input-row\s*\{[^}]*position:\s*relative/);
  assert.match(design, /@media\s*\(max-width:\s*640px\)[\s\S]*?\.ff-chat-composer-shell/);
  assert.match(design, /@media\s*\(max-width:\s*767px\)[\s\S]*?ff-chat-sidebar-pane[\s\S]*?display:\s*none\s*!important/);
  assert.match(design, /@media\s*\(min-width:\s*1024px\)[\s\S]*?ff-chat-roster-pane[\s\S]*?display:\s*flex/);
  assert.match(design, /\.ff-chat-mention-picker\s*\{[^}]*z-index:\s*80/s);
});

test('close and reply controls center their icons, with touch-device message actions still reachable', () => {
  assert.match(design, /\.ff-icon-button\s*\{[^}]*display:\s*inline-grid[^}]*place-items:\s*center/s);
  assert.match(design, /\.ff-chat-close-button\s*\{[^}]*width:\s*36px[^}]*height:\s*36px/s);
  assert.match(chatView, /ff-icon-button ff-chat-close-button/);
  assert.match(chatDock, /ff-icon-button ff-chat-close-button/);
  assert.match(design, /@media\s*\(hover:\s*none\)\s*\{[^}]*\.ff-chat-message-actions\s*\{\s*opacity:\s*1/s);
  assert.doesNotMatch(
    design,
    /ff-chat-message-row--continuation[^{]*\{[^}]*display:\s*none/,
    'no message row may lose its actions on touch devices'
  );
  assert.match(design, /\.ff-chat-actions-menu\s*\{[^}]*position:\s*fixed/s);
});

test('chat grouping stops after five minutes from the group start and never guesses unknown clocks', async () => {
  const { isChatContinuation, getChatGroupStarts } = await import('../src/utils/chatTimeline.ts');
  const message = (authorId, timestamp, channelId = 'ket-ban') => ({ authorId, timestamp, channelId });

  assert.equal(isChatContinuation(null, message('u1', '10:00'), null), false);
  assert.equal(isChatContinuation(message('u1', '10:00'), message('u1', '10:05'), '10:00'), true);
  assert.equal(isChatContinuation(message('u1', '10:04'), message('u1', '10:06'), '10:00'), false);
  assert.equal(
    isChatContinuation(message('u1', '10:04'), message('u1', '10:08'), '10:00'),
    false,
    'a chain of short gaps must not extend one group past five minutes'
  );
  assert.equal(isChatContinuation(message('u1', '10:00'), message('u2', '10:02'), '10:00'), false);
  assert.equal(isChatContinuation(message('u1', '10:00', 'a'), message('u1', '10:02', 'b'), '10:00'), false);
  assert.equal(isChatContinuation(message('u1', '10:00'), message('u1', '09:58'), '10:00'), false);
  assert.equal(isChatContinuation(message('u1', '10:00'), message('u1', 'không rõ'), '10:00'), false);
  assert.equal(isChatContinuation(message('u1', 'không rõ'), message('u1', '10:00'), 'không rõ'), false);

  assert.deepEqual(
    getChatGroupStarts([
      message('u1', '10:00'),
      message('u1', '10:04'),
      message('u1', '10:08'),
      message('u2', '10:09'),
    ]),
    [true, false, true, true]
  );

  const dated = (authorId, timestamp, timestampMs) => ({ authorId, timestamp, timestampMs, channelId: 'ket-ban' });
  const dayOne = Date.UTC(2026, 9, 19, 9, 0);
  const dayTwo = Date.UTC(2026, 9, 20, 9, 2);
  assert.equal(
    isChatContinuation(dated('u1', '09:00', dayOne), dated('u1', '09:04', dayOne + 4 * 60000), dated('u1', '09:00', dayOne)),
    true
  );
  assert.equal(
    isChatContinuation(dated('u1', '09:00', dayOne), dated('u1', '09:02', dayTwo), dated('u1', '09:00', dayOne)),
    false,
    'same clock time on another day must not group'
  );
});

test('equipped avatar aura and frame render independently; nameplates resolve without duplicating a painted bar', () => {
  assert.match(decorationStore, /const aura = slots\.avatar_aura \?/);
  assert.doesNotMatch(decorationStore, /if\s*\(out\.avatar_frame\s*&&\s*out\.avatar_aura\)/);
  assert.match(avatar, /const aura = auraAsset \|\|/);
  assert.doesNotMatch(avatar, /const aura = !frame/);
  assert.match(decoratedNames, /const \{ nameplate \} = useUserDecorations\(user\)/);
  assert.match(decoratedNames, /showNameplate\s*=\s*true/);
  assert.match(decoratedNames, /showFallbackTag/);
  for (const path of [
    'src/components/Navbar.tsx',
    'src/components/ProfileDropdown.tsx',
    'src/components/UserQuickCard.tsx',
    'src/components/views/ChatView.tsx',
    'src/components/ChatDock.tsx',
    'src/components/views/QAForumView.tsx',
    'src/components/views/LeaderboardWidget.tsx',
  ]) {
    const source = read(path);
    if (source.includes('<UserNameplateBg')) {
      assert.match(source, /showNameplate=\{false\}/, `${path} opts out of a duplicate nameplate over UserNameplateBg`);
    }
  }
});

test('chat and forum role marks share one role identity component', () => {
  assert.match(chatRoleIcon, /<RoleMark user=\{user\}/);
  assert.match(roleMark, /getRoleDetails\(/);
  assert.match(roleMark, /ff-role-mark--\$\{details\.key\}/);
  for (const path of [
    'src/components/views/ChatView.tsx',
    'src/components/ChatDock.tsx',
    'src/components/views/ThreadsView.tsx',
    'src/components/views/QAForumView.tsx',
    'src/components/views/ClubsView.tsx',
    'src/components/AdminInsightsModal.tsx',
    'src/components/ProfileModal.tsx',
    'src/components/Navbar.tsx',
  ]) {
    assert.match(read(path), /RoleMark|ChatRoleIcon/, `${path} displays canonical built-in role marks`);
  }
});

test('Insights chart tips escape card clipping and remain above adjacent GUI; detail layer has priority', () => {
  assert.match(admin, /\.faa-tile--chart\s*\{[^}]*overflow:\s*visible[^}]*z-index:\s*2/s);
  assert.match(admin, /\.faa-tile--chart:hover,[\s\S]*?:focus-within\s*\{[^}]*z-index:\s*8/s);
  assert.match(admin, /\.faa-tile--chart \.ffc-area__tip\s*\{[^}]*z-index:\s*12/s);
  assert.match(admin, /\.faa-detail-backdrop\s*\{[^}]*z-index:\s*30/s);
  assert.match(charts, /@keyframes ffcTipIn\s*\{[^}]*translateX\(var\(--ffc-tip-shift/s);
});
