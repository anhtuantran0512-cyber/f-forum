/* Bản quyền trí tuệ thuộc về BroAmStuck */
import type { User } from '../types/index.ts';
import { EARNED_BADGE_IDS } from './badges.ts';

const ADMIN_EMAIL = 'anhtuantran0512@gmail.com';
const SEEDED_INVENTORY = new Set([
  'ribbon_pink_gem',
  'ribbon_buddha_seal',
  'pencil_starter',
]);

const finiteNonNegative = (value: unknown, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, number) : fallback;
};

/**
 * Normalize records created by older builds. In particular, remove the old
 * pre-granted admin level/XP, default Coin balance, placeholder profile data,
 * and starter inventory. Real, dated activity history is retained.
 */
export function sanitizePersistedUser(value: unknown, emailKey?: string): User | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Partial<User> & Record<string, unknown>;
  const email = String(raw.email || emailKey || '').trim().toLowerCase();
  const id = String(raw.id || '').trim();
  if (!id || !email || !email.includes('@')) return null;

  const activityLog = Array.isArray(raw.activityLog)
    ? raw.activityLog.filter((entry: any) =>
        entry &&
        typeof entry.id === 'string' &&
        Number.isFinite(Number(entry.points)) &&
        typeof entry.createdAt === 'string' &&
        !Number.isNaN(Date.parse(entry.createdAt)),
      )
    : [];
  const attendanceDates: string[] = Array.isArray(raw.attendanceDates)
    ? [...new Set((raw.attendanceDates as unknown[]).filter((date: unknown): date is string =>
        typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date),
      ))].sort().slice(-60)
    : [];
  const hasDatedActivity = activityLog.length > 0;
  const isLegacyAdminSeed = email === ADMIN_EMAIL && id === 'user-admin' && !hasDatedActivity;
  const wasFreshLegacyAccount =
    !hasDatedActivity &&
    finiteNonNegative(raw.xp) === 0 &&
    finiteNonNegative(raw.coin) === 100 &&
    Number(raw.streakCount) === 1 &&
    ['Học sinh F-Forum', ''].includes(String(raw.bio || ''));

  const inventory: string[] = Array.isArray(raw.inventory)
    ? (raw.inventory as unknown[]).filter((item: unknown): item is string => typeof item === 'string')
    : [];
  const isSeedInventory = inventory.length > 0 && inventory.every((item) => SEEDED_INVENTORY.has(item));
  const boxes = raw.mysteryBoxes && typeof raw.mysteryBoxes === 'object'
    ? raw.mysteryBoxes as unknown as Record<string, unknown>
    : {};

  const xp = isLegacyAdminSeed || wasFreshLegacyAccount ? 0 : finiteNonNegative(raw.xp);
  const coin = isLegacyAdminSeed || wasFreshLegacyAccount ? 0 : finiteNonNegative(raw.coin);
  const streakCount = attendanceDates.length
    ? finiteNonNegative(raw.streakCount)
    : 0;
  const cleanDefault = (value: unknown, placeholders: string[]) => {
    const text = typeof value === 'string' ? value : '';
    return placeholders.includes(text) ? '' : text;
  };

  return {
    ...raw,
    id,
    email,
    name: String(raw.name || email.split('@')[0]),
    avatar: String(raw.avatar || ''),
    role: raw.role === 'SUPER_ADMIN' || raw.role === 'CLUB_LEADER' ? raw.role : 'STUDENT',
    level: isLegacyAdminSeed || wasFreshLegacyAccount
      ? 1
      : Math.min(150, Math.max(1, Math.floor(finiteNonNegative(raw.level, 1))),),
    xp,
    fPoints: isLegacyAdminSeed || wasFreshLegacyAccount
      ? 0
      : finiteNonNegative(raw.fPoints, xp),
    coin,
    streakCount,
    bio: isLegacyAdminSeed
      ? ''
      : cleanDefault(raw.bio, ['Học sinh F-Forum', 'F-Forum Architect & Core Administrator. Xây dựng tương lai tri thức học đường.']),
    gender: isLegacyAdminSeed
      ? ''
      : cleanDefault(raw.gender, ['Chưa cập nhật']),
    city: cleanDefault(raw.city, ['FPT Campus', 'Hà Nội']),
    className: cleanDefault(raw.className, ['Học sinh', 'K19 Software Engineering']),
    scopedClubIds: Array.isArray(raw.scopedClubIds)
      ? (raw.scopedClubIds as unknown[]).filter((clubId: unknown): clubId is string => typeof clubId === 'string')
      : [],
    inventory: isLegacyAdminSeed || wasFreshLegacyAccount || isSeedInventory ? [] : inventory,
    earnedBadges: Array.isArray(raw.earnedBadges)
      ? [...new Set((raw.earnedBadges as unknown[]).filter((badge: unknown): badge is string => typeof badge === 'string' && EARNED_BADGE_IDS.has(badge)))]
      : [],
    equippedBadge: isLegacyAdminSeed || wasFreshLegacyAccount ? '' : String(raw.equippedBadge || ''),
    activityLog,
    attendanceDates,
    mysteryBoxes: {
      blue: finiteNonNegative(boxes.blue),
      gold: finiteNonNegative(boxes.gold),
      red: finiteNonNegative(boxes.red),
    },
    lastCheckInDate: typeof raw.lastCheckInDate === 'string' ? raw.lastCheckInDate : undefined,
    lastQuizDate: typeof raw.lastQuizDate === 'string' ? raw.lastQuizDate : undefined,
    lastQuizQuestionId: typeof raw.lastQuizQuestionId === 'string' ? raw.lastQuizQuestionId : undefined,
    lastQuizCorrect: typeof raw.lastQuizCorrect === 'boolean' ? raw.lastQuizCorrect : undefined,
    lastFocusRewardAt: typeof raw.lastFocusRewardAt === 'string' ? raw.lastFocusRewardAt : undefined,
  } as User;
}

export function sanitizeUserRegistry(value: unknown): Record<string, User> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const result: Record<string, User> = {};
  for (const [key, rawUser] of Object.entries(value)) {
    const user = sanitizePersistedUser(rawUser, key);
    if (user) result[user.email] = user;
  }
  return result;
}
