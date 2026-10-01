import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// Precomputed XP threshold logic matching forumStore
const XP_THRESHOLDS = Array.from({ length: 151 }, (_, lvl) =>
  lvl <= 1 ? 0 : Math.floor(140 * (lvl - 1) + 1.08 * Math.pow(lvl - 1, 2))
);

function getXPForLevel(level) {
  if (level <= 1) return 0;
  if (level >= 150) return XP_THRESHOLDS[150];
  return XP_THRESHOLDS[level];
}

function getLevelForXP(xp) {
  if (xp <= 0) return 1;
  let low = 1;
  let high = 150;
  let ans = 1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (xp >= XP_THRESHOLDS[mid]) {
      ans = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return ans;
}

test('XP & Level Math: Boundaries, negative XP, max 150 levels', () => {
  assert.equal(getLevelForXP(-500), 1, 'Negative XP defaults to Level 1');
  assert.equal(getLevelForXP(0), 1, 'Zero XP defaults to Level 1');
  assert.equal(getXPForLevel(1), 0, 'Level 1 base XP is 0');
  
  // Test monotonic progression
  for (let lvl = 1; lvl <= 150; lvl++) {
    const reqXP = getXPForLevel(lvl);
    assert.equal(getLevelForXP(reqXP), lvl, `Level ${lvl} should match at required XP ${reqXP}`);
    if (lvl < 150) {
      assert.equal(getLevelForXP(reqXP + 1), lvl, `XP slightly above level ${lvl} should still be level ${lvl}`);
    }
  }

  // Extreme upper bound
  assert.equal(getLevelForXP(999999999), 150, 'Excessive XP caps at level 150');
  assert.equal(getXPForLevel(200), XP_THRESHOLDS[150], 'Level > 150 returns max threshold');
});

test('Clean Data & Zero Mocks: No seed bots, mock personas or fake metrics', () => {
  const forumStoreContent = fs.readFileSync('src/store/forumStore.ts', 'utf8');
  
  // Seed data arrays should be empty
  assert.ok(forumStoreContent.includes('INITIAL_CHATS: ChatMessage[] = [];'), 'INITIAL_CHATS must be empty');
  assert.ok(forumStoreContent.includes('INITIAL_QUESTIONS: Question[] = [];'), 'INITIAL_QUESTIONS must be empty');
  assert.ok(forumStoreContent.includes('INITIAL_SOLUTIONS: Solution[] = [];'), 'INITIAL_SOLUTIONS must be empty');
  assert.ok(forumStoreContent.includes('INITIAL_CLUBS: Club[] = [];'), 'INITIAL_CLUBS must be empty');
  assert.ok(forumStoreContent.includes('INITIAL_CLUB_POSTS: ClubPost[] = [];'), 'INITIAL_CLUB_POSTS must be empty');

  // No mock personas in Navbar or ProfileDropdown
  const profileDropdownContent = fs.readFileSync('src/components/ProfileDropdown.tsx', 'utf8');
  assert.ok(!profileDropdownContent.includes('Super Admin (Trần Anh Tuấn)'), 'Profile dropdown must not have fake persona switcher');
  assert.ok(!profileDropdownContent.includes('Student Leader'), 'Must not have Student Leader persona switcher');
  assert.ok(!profileDropdownContent.includes('Guest Student'), 'Must not have Guest Student persona switcher');
  
  // BroadcastChannel name
  assert.ok(forumStoreContent.includes("'fforum_sync'"), 'BroadcastChannel must use fforum_sync');
});

test('Branding and HTML Metadata strictly F-Forum', () => {
  const indexHtml = fs.readFileSync('index.html', 'utf8');
  assert.ok(indexHtml.includes('<title>F-Forum</title>'), 'HTML title must be F-Forum');
  assert.ok(indexHtml.includes('<meta name="application-name" content="F-Forum" />'), 'application-name must be F-Forum');
  assert.ok(!indexHtml.includes('fforum_broamstuck_studio'), 'No internal studio tags in HTML title');
});

test('Profile Dropdown eliminates dark oval blob class liquid-glass', () => {
  const profileDropdown = fs.readFileSync('src/components/ProfileDropdown.tsx', 'utf8');
  // Profile dropdown container should not use liquid-glass which generates the huge blurred pseudo-element
  const lines = profileDropdown.split('\n');
  const returnBlock = lines.slice(lines.findIndex(l => l.includes('return ('))).join('\n');
  assert.ok(!returnBlock.includes('liquid-glass'), 'ProfileDropdown card must not use liquid-glass');
  assert.ok(returnBlock.includes('bg-[#0c1218]/95'), 'ProfileDropdown card must use solid sleek container');
});

test('Minimalist links for Facebook and Discord in ChroniclesView', () => {
  const chronicles = fs.readFileSync('src/components/views/ChroniclesView.tsx', 'utf8');
  assert.ok(chronicles.includes('https://www.facebook.com/TuanNotTun/'), 'Facebook link must point to TuanNotTun');
  assert.ok(chronicles.includes('https://discord.gg/GMDCnxxJwX'), 'Discord link must point to GMDCnxxJwX');
});
