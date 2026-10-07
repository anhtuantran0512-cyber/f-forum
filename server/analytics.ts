/* Bản quyền trí tuệ thuộc về BroAmStuck */
import { createHash } from 'node:crypto';

export interface AnalyticsBucket {
  visitorKeys: string[];
  visits: number;
  activeSeconds: number;
  pageViews: number;
  messages: number;
  questions: number;
  answers: number;
  clubsCreated: number;
  clubPosts: number;
  newMembers: number;
}

export interface AnalyticsAggregate {
  firstSeenAt: number;
  lastSeenAt: number;
  visits: number;
  activeSeconds: number;
  pageViews: number;
  messages: number;
  questions: number;
  answers: number;
  clubsCreated: number;
  clubPosts: number;
  signups: number;
}

export interface AnalyticsVisitor extends AnalyticsAggregate {
  /** Lưu riêng việc browser từng có hoạt động khách; không gắn cố định một tài khoản vào thiết bị dùng chung. */
  hadAnonymousActivity: boolean;
}

export interface AnalyticsSession {
  visitorKey: string;
  email?: string;
  lastSeenAt: number;
  /** Heartbeat riêng để lượt xem/truy cập không thể dùng làm đồng hồ giả. */
  lastHeartbeatAt: number;
  eventIds: string[];
  visitIdentities: string[];
}

export interface AnalyticsStore {
  trackingStartedAt: number;
  totals: Omit<AnalyticsBucket, 'visitorKeys'>;
  visitors: Record<string, AnalyticsVisitor>;
  members: Record<string, AnalyticsAggregate>;
  sessions: Record<string, AnalyticsSession>;
  daily: Record<string, AnalyticsBucket>;
  hourly: Record<string, AnalyticsBucket>;
}

export type AnalyticsActivity = 'messages' | 'questions' | 'answers' | 'clubsCreated' | 'clubPosts';
export type AnalyticsRange = '24h' | '7d' | '30d' | '12m' | 'years';

const HOUR_MS = 60 * 60 * 1000;
const SESSION_IDLE_MS = 30 * 60 * 1000;
const MAX_DAILY_BUCKETS = 3650;
const MAX_HOURLY_BUCKETS = 90 * 24;
const MAX_SESSION_EVENT_IDS = 160;
const MAX_SESSION_VISIT_IDENTITIES = 20;
const MAX_STORED_SESSIONS = 20_000;
const KEEP_STORED_SESSIONS = 18_000;
const METRIC_KEYS = [
  'visits', 'activeSeconds', 'pageViews', 'messages', 'questions', 'answers',
  'clubsCreated', 'clubPosts', 'newMembers',
] as const;

const cleanCount = (value: unknown): number => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
};

const cleanTimestamp = (value: unknown, fallback: number): number => {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
};

const normalizeEmail = (value?: string | null): string => String(value || '').trim().toLowerCase();

const safeObject = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};

export const hashAnalyticsId = (value: string): string =>
  createHash('sha256').update(String(value)).digest('hex');

const accountIdentity = (email: string): string => `account:${hashAnalyticsId(email)}`;
const guestIdentity = (visitorKey: string): string => `browser:${visitorKey}`;

const emptyBucket = (): AnalyticsBucket => ({
  visitorKeys: [],
  visits: 0,
  activeSeconds: 0,
  pageViews: 0,
  messages: 0,
  questions: 0,
  answers: 0,
  clubsCreated: 0,
  clubPosts: 0,
  newMembers: 0,
});

const emptyAggregate = (now: number): AnalyticsAggregate => ({
  firstSeenAt: now,
  lastSeenAt: now,
  visits: 0,
  activeSeconds: 0,
  pageViews: 0,
  messages: 0,
  questions: 0,
  answers: 0,
  clubsCreated: 0,
  clubPosts: 0,
  signups: 0,
});

const emptyVisitor = (now: number): AnalyticsVisitor => ({
  ...emptyAggregate(now),
  hadAnonymousActivity: false,
});

export const createEmptyAnalytics = (now: number = Date.now()): AnalyticsStore => ({
  trackingStartedAt: now,
  totals: {
    visits: 0,
    activeSeconds: 0,
    pageViews: 0,
    messages: 0,
    questions: 0,
    answers: 0,
    clubsCreated: 0,
    clubPosts: 0,
    newMembers: 0,
  },
  visitors: {},
  members: {},
  sessions: {},
  daily: {},
  hourly: {},
});

const sanitizeBucket = (value: unknown): AnalyticsBucket => {
  const raw = safeObject(value);
  const visitorKeys = Array.isArray(raw.visitorKeys)
    ? Array.from(new Set(raw.visitorKeys.filter((key): key is string =>
        typeof key === 'string' && /^(?:account|browser):[a-f0-9]{64}$/.test(key),
      )))
    : [];
  const bucket = emptyBucket();
  bucket.visitorKeys = visitorKeys;
  METRIC_KEYS.forEach((key) => {
    bucket[key] = cleanCount(raw[key]);
  });
  return bucket;
};

const sanitizeAggregate = (value: unknown, now: number): AnalyticsAggregate => {
  const raw = safeObject(value);
  const aggregate = emptyAggregate(now);
  aggregate.firstSeenAt = cleanTimestamp(raw.firstSeenAt, now);
  aggregate.lastSeenAt = cleanTimestamp(raw.lastSeenAt, aggregate.firstSeenAt);
  (Object.keys(aggregate) as Array<keyof AnalyticsAggregate>).forEach((key) => {
    if (key === 'firstSeenAt' || key === 'lastSeenAt') return;
    aggregate[key] = cleanCount(raw[key]);
  });
  return aggregate;
};

function sanitizeBucketMap(rawValue: unknown, kind: 'daily' | 'hourly'): Record<string, AnalyticsBucket> {
  const raw = safeObject(rawValue);
  const pattern = kind === 'daily' ? /^\d{4}-\d{2}-\d{2}$/ : /^\d{4}-\d{2}-\d{2}T\d{2}$/;
  const max = kind === 'daily' ? MAX_DAILY_BUCKETS : MAX_HOURLY_BUCKETS;
  const entries = Object.entries(raw)
    .filter(([key, value]) => pattern.test(key) && value && typeof value === 'object' && !Array.isArray(value))
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-max);
  return Object.fromEntries(entries.map(([key, value]) => [key, sanitizeBucket(value)]));
}

/** Làm sạch dữ liệu thống kê cũ/hỏng trước khi đưa vào RAM. */
export const sanitizeAnalyticsStore = (rawValue: unknown, now: number = Date.now()): AnalyticsStore => {
  const raw = safeObject(rawValue);
  const base = createEmptyAnalytics(cleanTimestamp(raw.trackingStartedAt, now));
  const totals = safeObject(raw.totals);
  METRIC_KEYS.forEach((key) => {
    base.totals[key] = cleanCount(totals[key]);
  });

  const visitorRows = Object.entries(safeObject(raw.visitors))
    .filter(([key, value]) => /^[a-f0-9]{64}$/.test(key) && value && typeof value === 'object' && !Array.isArray(value));
  visitorRows.forEach(([key, value]) => {
    const data = safeObject(value);
    const aggregate = sanitizeAggregate(data, now);
    const legacyEmail = normalizeEmail(typeof data.email === 'string' ? data.email : '');
    const hadAnonymousActivity = typeof data.hadAnonymousActivity === 'boolean'
      ? data.hadAnonymousActivity
      : !legacyEmail;
    base.visitors[key] = { ...aggregate, hadAnonymousActivity };
  });

  Object.entries(safeObject(raw.members)).forEach(([emailValue, value]) => {
    const email = normalizeEmail(emailValue);
    if (!email || !email.includes('@') || !value || typeof value !== 'object' || Array.isArray(value)) return;
    base.members[email] = sanitizeAggregate(value, now);
  });

  const sessionRows = Object.entries(safeObject(raw.sessions))
    .filter(([key, value]) => /^[a-f0-9]{64}$/.test(key) && value && typeof value === 'object' && !Array.isArray(value));
  sessionRows.slice(-20000).forEach(([key, value]) => {
    const data = safeObject(value);
    const visitorKey = typeof data.visitorKey === 'string' && /^[a-f0-9]{64}$/.test(data.visitorKey)
      ? data.visitorKey
      : '';
    if (!visitorKey) return;
    const legacyVisitor = safeObject(safeObject(raw.visitors)[visitorKey]);
    const email = normalizeEmail(typeof data.email === 'string'
      ? data.email
      : typeof legacyVisitor.email === 'string' ? legacyVisitor.email : '');
    const visitIdentities = Array.isArray(data.visitIdentities)
      ? Array.from(new Set(data.visitIdentities.filter((identity): identity is string =>
          typeof identity === 'string' && /^(?:account|browser):[a-f0-9]{64}$/.test(identity),
        ))).slice(-MAX_SESSION_VISIT_IDENTITIES)
      : [email ? accountIdentity(email) : guestIdentity(visitorKey)];
    const lastSeenAt = cleanTimestamp(data.lastSeenAt, 0);
    base.sessions[key] = {
      visitorKey,
      ...(email ? { email } : {}),
      lastSeenAt,
      lastHeartbeatAt: cleanTimestamp(data.lastHeartbeatAt, lastSeenAt),
      eventIds: Array.isArray(data.eventIds)
        ? Array.from(new Set(data.eventIds.filter((id): id is string => typeof id === 'string' && /^[a-f0-9]{64}$/.test(id)))).slice(-MAX_SESSION_EVENT_IDS)
        : [],
      visitIdentities,
    };
  });

  base.daily = sanitizeBucketMap(raw.daily, 'daily');
  base.hourly = sanitizeBucketMap(raw.hourly, 'hourly');
  return base;
};

function partsInVietnam(timestamp: number): { year: string; month: string; day: string; hour: string } {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(timestamp));
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    year: map.year || '1970',
    month: map.month || '01',
    day: map.day || '01',
    hour: map.hour || '00',
  };
}

export const analyticsDayKey = (timestamp: number): string => {
  const p = partsInVietnam(timestamp);
  return `${p.year}-${p.month}-${p.day}`;
};

export const analyticsHourKey = (timestamp: number): string => {
  const p = partsInVietnam(timestamp);
  return `${p.year}-${p.month}-${p.day}T${p.hour}`;
};

function ensureBucket(map: Record<string, AnalyticsBucket>, key: string): AnalyticsBucket {
  if (!map[key]) map[key] = emptyBucket();
  return map[key];
}

function addVisitor(bucket: AnalyticsBucket, identity: string): void {
  if (!bucket.visitorKeys.includes(identity)) bucket.visitorKeys.push(identity);
}

function ensureMember(analytics: AnalyticsStore, email: string, now: number): AnalyticsAggregate {
  if (!analytics.members[email]) analytics.members[email] = emptyAggregate(now);
  return analytics.members[email];
}

function bumpFirstAndLast(aggregate: AnalyticsAggregate, now: number): void {
  if (!aggregate.firstSeenAt || now < aggregate.firstSeenAt) aggregate.firstSeenAt = now;
  aggregate.lastSeenAt = Math.max(aggregate.lastSeenAt || 0, now);
}

function ensureVisitor(
  analytics: AnalyticsStore,
  visitorKey: string,
  emailValue: string | undefined,
  now: number,
): { visitor: AnalyticsVisitor; identity: string; email?: string } {
  const email = normalizeEmail(emailValue) || undefined;
  let visitor = analytics.visitors[visitorKey];
  if (!visitor) {
    visitor = emptyVisitor(now);
    analytics.visitors[visitorKey] = visitor;
  }
  if (!email) visitor.hadAnonymousActivity = true;
  bumpFirstAndLast(visitor, now);
  if (email) bumpFirstAndLast(ensureMember(analytics, email, now), now);
  const identity = email ? accountIdentity(email) : guestIdentity(visitorKey);
  return { visitor, identity, email };
}

function compactSessions(analytics: AnalyticsStore, keepSessionKey: string): void {
  const entries = Object.entries(analytics.sessions);
  if (entries.length <= MAX_STORED_SESSIONS) return;
  const removeCount = entries.length - KEEP_STORED_SESSIONS;
  entries
    .filter(([key]) => key !== keepSessionKey)
    .sort((a, b) => a[1].lastSeenAt - b[1].lastSeenAt)
    .slice(0, removeCount)
    .forEach(([key]) => { delete analytics.sessions[key]; });
}

function ensureSession(
  analytics: AnalyticsStore,
  sessionKey: string,
  visitorKey: string,
  emailValue: string | undefined,
  now: number,
): AnalyticsSession | null {
  const existing = analytics.sessions[sessionKey];
  if (existing && existing.visitorKey !== visitorKey) return null;
  const isNew = !existing || now - existing.lastSeenAt > SESSION_IDLE_MS;
  if (existing && isNew) {
    existing.eventIds = [];
    existing.visitIdentities = [];
    existing.lastHeartbeatAt = now;
  } else if (existing && !Number.isFinite(existing.lastHeartbeatAt)) {
    existing.lastHeartbeatAt = existing.lastSeenAt || now;
  }
  const session = existing || {
    visitorKey,
    lastSeenAt: now,
    lastHeartbeatAt: now,
    eventIds: [],
    visitIdentities: [],
  };
  session.email = normalizeEmail(emailValue) || undefined;
  if (!Array.isArray(session.visitIdentities)) session.visitIdentities = [];
  analytics.sessions[sessionKey] = session;
  if (!existing) compactSessions(analytics, sessionKey);
  return session;
}

function countVisitForIdentity(
  analytics: AnalyticsStore,
  visitor: AnalyticsVisitor,
  session: AnalyticsSession,
  identity: string,
  email: string | undefined,
  now: number,
): void {
  if (session.visitIdentities.includes(identity)) return;
  session.visitIdentities.push(identity);
  if (session.visitIdentities.length > MAX_SESSION_VISIT_IDENTITIES) {
    session.visitIdentities.splice(0, session.visitIdentities.length - MAX_SESSION_VISIT_IDENTITIES);
  }
  visitor.visits += 1;
  addVisitor(ensureBucket(analytics.daily, analyticsDayKey(now)), identity);
  addVisitor(ensureBucket(analytics.hourly, analyticsHourKey(now)), identity);
  increment(analytics, 'visits', email, now);
}

function seenEvent(session: AnalyticsSession, eventId: string): boolean {
  const eventKey = hashAnalyticsId(eventId);
  if (session.eventIds.includes(eventKey)) return true;
  session.eventIds.push(eventKey);
  if (session.eventIds.length > MAX_SESSION_EVENT_IDS) {
    session.eventIds.splice(0, session.eventIds.length - MAX_SESSION_EVENT_IDS);
  }
  return false;
}

function increment(analytics: AnalyticsStore, key: keyof Omit<AnalyticsBucket, 'visitorKeys'>, email: string | undefined, now: number, amount = 1): void {
  const daily = ensureBucket(analytics.daily, analyticsDayKey(now));
  const hourly = ensureBucket(analytics.hourly, analyticsHourKey(now));
  daily[key] += amount;
  hourly[key] += amount;
  analytics.totals[key] += amount;

  const normalized = normalizeEmail(email);
  if (normalized) {
    const member = ensureMember(analytics, normalized, now);
    bumpFirstAndLast(member, now);
    const memberKey = key === 'newMembers' ? 'signups' : key;
    if (memberKey in member) {
      (member as unknown as Record<string, number>)[memberKey] += amount;
    }
  }
}

/** Ghi một lượt mở cho từng danh tính trong phiên; thiết bị dùng chung không gộp nhầm tài khoản. */
export const recordAnalyticsVisit = (
  analytics: AnalyticsStore,
  input: { visitorId: string; sessionId: string; eventId: string; email?: string; now?: number },
): { ok: boolean; duplicate: boolean } => {
  const now = Number(input.now ?? Date.now());
  const visitorKey = hashAnalyticsId(input.visitorId);
  const sessionKey = hashAnalyticsId(input.sessionId);
  const email = normalizeEmail(input.email) || undefined;
  const session = ensureSession(analytics, sessionKey, visitorKey, email, now);
  if (!session) return { ok: false, duplicate: false };
  const { visitor, identity } = ensureVisitor(analytics, visitorKey, email, now);
  if (seenEvent(session, input.eventId)) return { ok: true, duplicate: true };
  countVisitForIdentity(analytics, visitor, session, identity, email, now);
  session.lastSeenAt = now;
  visitor.lastSeenAt = Math.max(visitor.lastSeenAt, now);
  return { ok: true, duplicate: false };
};

/** Ghi thời gian tab đang hiển thị; eventId giúp retry/strict mode idempotent. */
export const recordAnalyticsHeartbeat = (
  analytics: AnalyticsStore,
  input: { visitorId: string; sessionId: string; eventId: string; activeSeconds: number; email?: string; now?: number },
): { ok: boolean; duplicate: boolean } => {
  const now = Number(input.now ?? Date.now());
  const visitorKey = hashAnalyticsId(input.visitorId);
  const sessionKey = hashAnalyticsId(input.sessionId);
  const email = normalizeEmail(input.email) || undefined;
  const session = ensureSession(analytics, sessionKey, visitorKey, email, now);
  if (!session) return { ok: false, duplicate: false };
  const { visitor, identity } = ensureVisitor(analytics, visitorKey, email, now);
  if (seenEvent(session, input.eventId)) return { ok: true, duplicate: true };

  countVisitForIdentity(analytics, visitor, session, identity, email, now);
  const requestedSeconds = Math.min(60, Math.max(0, Math.floor(Number(input.activeSeconds) || 0)));
  const elapsedSinceHeartbeat = Math.max(0, Math.floor((now - session.lastHeartbeatAt) / 1000));
  const seconds = Math.min(requestedSeconds, elapsedSinceHeartbeat);
  session.lastHeartbeatAt = now;
  session.lastSeenAt = now;
  visitor.lastSeenAt = Math.max(visitor.lastSeenAt, now);
  if (seconds > 0) {
    visitor.activeSeconds += seconds;
    addVisitor(ensureBucket(analytics.daily, analyticsDayKey(now)), identity);
    addVisitor(ensureBucket(analytics.hourly, analyticsHourKey(now)), identity);
    increment(analytics, 'activeSeconds', email, now, seconds);
  }
  return { ok: true, duplicate: false };
};

/** Ghi một lượt xem phân khu; chỉ nhận tên phân khu đã được kiểm tra ở route. */
export const recordAnalyticsPageView = (
  analytics: AnalyticsStore,
  input: { visitorId: string; sessionId: string; eventId: string; email?: string; now?: number },
): { ok: boolean; duplicate: boolean } => {
  const now = Number(input.now ?? Date.now());
  const visitorKey = hashAnalyticsId(input.visitorId);
  const sessionKey = hashAnalyticsId(input.sessionId);
  const email = normalizeEmail(input.email) || undefined;
  const session = ensureSession(analytics, sessionKey, visitorKey, email, now);
  if (!session) return { ok: false, duplicate: false };
  const { visitor, identity } = ensureVisitor(analytics, visitorKey, email, now);
  if (seenEvent(session, input.eventId)) return { ok: true, duplicate: true };
  countVisitForIdentity(analytics, visitor, session, identity, email, now);
  session.lastSeenAt = now;
  visitor.lastSeenAt = Math.max(visitor.lastSeenAt, now);
  visitor.pageViews += 1;
  addVisitor(ensureBucket(analytics.daily, analyticsDayKey(now)), identity);
  addVisitor(ensureBucket(analytics.hourly, analyticsHourKey(now)), identity);
  increment(analytics, 'pageViews', email, now);
  return { ok: true, duplicate: false };
};

/** Chỉ gọi sau khi nội dung được lưu thành công ở HTTP/WS. */
export const recordAnalyticsActivity = (
  analytics: AnalyticsStore,
  activity: AnalyticsActivity,
  email?: string,
  now: number = Date.now(),
): void => {
  increment(analytics, activity, email, now);
};

/** Chỉ gọi một lần khi tài khoản mới được tạo thật sự. */
export const recordAnalyticsSignup = (
  analytics: AnalyticsStore,
  emailValue: string,
  now: number = Date.now(),
): void => {
  const email = normalizeEmail(emailValue);
  if (!email) return;
  const member = ensureMember(analytics, email, now);
  bumpFirstAndLast(member, now);
  increment(analytics, 'newMembers', email, now);
  const identity = accountIdentity(email);
  addVisitor(ensureBucket(analytics.daily, analyticsDayKey(now)), identity);
  addVisitor(ensureBucket(analytics.hourly, analyticsHourKey(now)), identity);
};

function addDays(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

function addMonths(monthKey: string, months: number): string {
  const [year, month] = monthKey.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1 + months, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function bucketAsRow(key: string, bucket: AnalyticsBucket | undefined, granularity: 'hour' | 'day' | 'month' | 'year') {
  const source = bucket || emptyBucket();
  const label = granularity === 'hour' ? key.slice(-2) + ':00'
    : granularity === 'day' ? key.slice(5)
    : key;
  return {
    key,
    label,
    uniqueVisitors: source.visitorKeys.length,
    visits: source.visits,
    activeSeconds: source.activeSeconds,
    pageViews: source.pageViews,
    messages: source.messages,
    questions: source.questions,
    answers: source.answers,
    clubsCreated: source.clubsCreated,
    clubPosts: source.clubPosts,
    newMembers: source.newMembers,
    visitorKeys: source.visitorKeys,
  };
}

function groupBucketsByPeriod(
  daily: Record<string, AnalyticsBucket>,
  keys: string[],
  granularity: 'month' | 'year',
): Array<{ key: string; bucket: AnalyticsBucket }> {
  const groups = new Map<string, AnalyticsBucket>();
  keys.forEach((dayKey) => {
    const bucket = daily[dayKey];
    if (!bucket) return;
    const key = granularity === 'month' ? dayKey.slice(0, 7) : dayKey.slice(0, 4);
    const combined = groups.get(key) || emptyBucket();
    bucket.visitorKeys.forEach((visitorKey) => addVisitor(combined, visitorKey));
    METRIC_KEYS.forEach((metric) => { combined[metric] += bucket[metric]; });
    groups.set(key, combined);
  });
  return Array.from(groups.entries()).map(([key, bucket]) => ({ key, bucket }));
}

export interface AnalyticsReport {
  generatedAt: string;
  trackingStartedAt: string;
  range: AnalyticsRange;
  rangeLabel: string;
  totalMembers: number;
  activeNow: number;
  activeMembersNow: number;
  totals: {
    uniqueVisitors: number;
    registeredVisitors: number;
    anonymousBrowsers: number;
    visits: number;
    activeSeconds: number;
    pageViews: number;
    messages: number;
    questions: number;
    answers: number;
    clubsCreated: number;
    clubPosts: number;
    newMembers: number;
  };
  period: {
    uniqueVisitors: number;
    visits: number;
    activeSeconds: number;
    pageViews: number;
    messages: number;
    questions: number;
    answers: number;
    clubsCreated: number;
    clubPosts: number;
    newMembers: number;
  };
  series: Array<{
    key: string;
    label: string;
    uniqueVisitors: number;
    visits: number;
    activeSeconds: number;
    pageViews: number;
    messages: number;
    questions: number;
    answers: number;
    clubsCreated: number;
    clubPosts: number;
    newMembers: number;
  }>;
  topMembers: Array<{
    id: string;
    email: string;
    name: string;
    avatar: string;
    visits: number;
    activeSeconds: number;
    messages: number;
    questions: number;
    answers: number;
    lastSeenAt: number;
  }>;
}

/** Tạo ảnh chụp thống kê theo giờ/ngày/tháng/năm, không lấy dữ liệu từ client. */
export const buildAnalyticsReport = (
  analytics: AnalyticsStore,
  users: Record<string, { id?: string; name?: string; avatar?: string }>,
  rangeValue: unknown,
  now: number = Date.now(),
): AnalyticsReport => {
  const validRanges: AnalyticsRange[] = ['24h', '7d', '30d', '12m', 'years'];
  const range = validRanges.includes(rangeValue as AnalyticsRange) ? rangeValue as AnalyticsRange : '7d';
  let granularity: 'hour' | 'day' | 'month' | 'year';
  let entries: Array<{ key: string; bucket: AnalyticsBucket | undefined }>;
  let rangeLabel: string;

  if (range === '24h') {
    granularity = 'hour';
    const thisHour = Math.floor(now / HOUR_MS) * HOUR_MS;
    const keys = Array.from({ length: 24 }, (_, index) => analyticsHourKey(thisHour - (23 - index) * HOUR_MS));
    entries = keys.map((key) => ({ key, bucket: analytics.hourly[key] }));
    rangeLabel = '24 giờ gần nhất';
  } else if (range === '7d' || range === '30d') {
    granularity = 'day';
    const days = range === '7d' ? 7 : 30;
    const today = analyticsDayKey(now);
    const keys = Array.from({ length: days }, (_, index) => addDays(today, index - (days - 1)));
    entries = keys.map((key) => ({ key, bucket: analytics.daily[key] }));
    rangeLabel = range === '7d' ? '7 ngày gần nhất' : '30 ngày gần nhất';
  } else if (range === '12m') {
    granularity = 'month';
    const p = partsInVietnam(now);
    const currentMonth = `${p.year}-${p.month}`;
    const keys = Array.from({ length: 12 }, (_, index) => addMonths(currentMonth, index - 11));
    const firstDay = `${keys[0]}-01`;
    const lastDay = `${keys[keys.length - 1]}-31`;
    const dayKeys = Object.keys(analytics.daily).filter((key) => key >= firstDay && key <= lastDay);
    const grouped = new Map(groupBucketsByPeriod(analytics.daily, dayKeys, 'month').map((row) => [row.key, row.bucket]));
    entries = keys.map((key) => ({ key, bucket: grouped.get(key) }));
    rangeLabel = '12 tháng gần nhất';
  } else {
    granularity = 'year';
    const currentYear = Number(partsInVietnam(now).year);
    const firstTrackingYear = Number(partsInVietnam(analytics.trackingStartedAt).year);
    const firstStoredYear = Object.keys(analytics.daily).length
      ? Math.min(...Object.keys(analytics.daily).map((key) => Number(key.slice(0, 4)) || currentYear))
      : currentYear;
    const firstYear = Math.max(firstTrackingYear, firstStoredYear, currentYear - 9);
    const keys = Array.from({ length: Math.max(1, currentYear - firstYear + 1) }, (_, index) => String(firstYear + index));
    const dayKeys = Object.keys(analytics.daily).filter((key) => Number(key.slice(0, 4)) >= firstYear && Number(key.slice(0, 4)) <= currentYear);
    const grouped = new Map(groupBucketsByPeriod(analytics.daily, dayKeys, 'year').map((row) => [row.key, row.bucket]));
    entries = keys.map((key) => ({ key, bucket: grouped.get(key) }));
    rangeLabel = `Theo năm · ${firstYear}–${currentYear}`;
  }

  const series = entries.map(({ key, bucket }) => {
    const row = bucketAsRow(key, bucket, granularity);
    const { visitorKeys: _visitorKeys, ...publicRow } = row;
    return publicRow;
  });
  const selectedKeys = new Set<string>();
  const period = {
    uniqueVisitors: 0,
    visits: 0,
    activeSeconds: 0,
    pageViews: 0,
    messages: 0,
    questions: 0,
    answers: 0,
    clubsCreated: 0,
    clubPosts: 0,
    newMembers: 0,
  };
  entries.forEach(({ bucket }) => {
    if (!bucket) return;
    bucket.visitorKeys.forEach((key) => selectedKeys.add(key));
    METRIC_KEYS.forEach((key) => { period[key] += bucket[key]; });
  });
  period.uniqueVisitors = selectedKeys.size;

  const memberRows = Object.entries(analytics.members)
    .map(([email, metrics]) => {
      const user = users[email];
      return {
        id: String(user?.id || ''),
        email,
        name: String(user?.name || email),
        avatar: String(user?.avatar || ''),
        visits: metrics.visits,
        activeSeconds: metrics.activeSeconds,
        messages: metrics.messages,
        questions: metrics.questions,
        answers: metrics.answers,
        lastSeenAt: metrics.lastSeenAt,
      };
    })
    .sort((a, b) => b.activeSeconds - a.activeSeconds || b.messages - a.messages || a.email.localeCompare(b.email))
    .slice(0, 8);

  const registeredVisitors = Object.values(analytics.members)
    .filter((member) => member.visits > 0 || member.signups > 0).length;
  const anonymousBrowsers = Object.values(analytics.visitors)
    .filter((visitor) => visitor.hadAnonymousActivity).length;
  const online = Object.values(analytics.sessions)
    .filter((session) => now - session.lastSeenAt <= 5 * 60 * 1000);
  const onlineIdentities = new Set(online.map((session) =>
    session.email ? accountIdentity(session.email) : guestIdentity(session.visitorKey),
  ));
  const onlineMembers = new Set(online.flatMap((session) => session.email ? [session.email] : []));

  return {
    generatedAt: new Date(now).toISOString(),
    trackingStartedAt: new Date(analytics.trackingStartedAt).toISOString(),
    range,
    rangeLabel,
    totalMembers: Object.keys(users).length,
    activeNow: onlineIdentities.size,
    activeMembersNow: onlineMembers.size,
    totals: {
      uniqueVisitors: registeredVisitors + anonymousBrowsers,
      registeredVisitors,
      anonymousBrowsers,
      ...analytics.totals,
    },
    period,
    series,
    topMembers: memberRows,
  };
};

/** Ghi một lượt hoạt động cộng đồng sau khi bài/tin đã lưu thành công. */
export const activityMetricFor = (event: AnalyticsActivity): keyof Omit<AnalyticsBucket, 'visitorKeys'> => event;

/* Hằng số được export để test các giới hạn/thời gian, không dùng để tin client. */
export const ANALYTICS_LIMITS = {
  heartbeatSeconds: 60,
  sessionIdleMs: SESSION_IDLE_MS,
  maxSessionEventIds: MAX_SESSION_EVENT_IDS,
  maxStoredSessions: MAX_STORED_SESSIONS,
  maxDailyBuckets: MAX_DAILY_BUCKETS,
  maxHourlyBuckets: MAX_HOURLY_BUCKETS,
} as const;
