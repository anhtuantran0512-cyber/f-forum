/* Bản quyền trí tuệ thuộc về BroAmStuck */
import { useCallback, useEffect, useMemo, useState, type CSSProperties, type FC, type ReactNode } from 'react';
import {
  Activity,
  AlertTriangle,
  Award,
  Ban,
  BarChart3,
  BadgeCheck,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Coins,
  Crown,
  Database,
  Eye,
  Filter,
  GraduationCap,
  LoaderCircle,
  MessageSquare,
  MessageSquareOff,
  MoreHorizontal,
  RefreshCw,
  Search,
  Shield,
  ShieldCheck,
  Sparkles,
  Trophy,
  UserRound,
  Users,
  CheckCircle,
  Wand2,
  X,
} from 'lucide-react';
import type { User } from '../types';
import { authHeaders, postJson } from '../utils/session';
import { useEscapeKey } from '../utils/useEscapeKey';
import { PremiumMark } from './PremiumMark';
import { isMasterAdmin } from '../config/admin';
import { capsHas, useAdminCaps } from '../utils/adminCapabilities';
import type { AdminPermission, CustomRoleDef } from '../utils/rbac';
import { RetentionGauge, SmoothAreaChart, StatusDonut, type ChartTone } from './admin/AdminCharts';
import { CustomRoleBadge } from './admin/CustomRoleBadge';
import { MemberQuickAction, type ActionResult, type QuickActionKind, type RoleChoice } from './admin/MemberQuickAction';
import { QUICK_DURATIONS } from './admin/adminConstants';
import { RoleStudio, type CustomRoleRow } from './admin/RoleStudio';
import './AdminInsightsModal.css';
import './admin/AdminStudio.css';

export type AdminInsightsRange = '24h' | '7d' | '30d' | '12m' | 'years';
export type AdminMemberRole = 'SUPER_ADMIN' | 'MODERATOR' | 'TEACHER' | 'CLUB_LEADER' | 'STUDENT' | 'PREMIUM';

interface AnalyticsPoint {
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
}

interface AdminAnalytics {
  generatedAt: string;
  trackingStartedAt: string;
  range: AdminInsightsRange;
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
    totalReports: number;
    resolvedReports: number;
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
    totalReports: number;
    resolvedReports: number;
  };
  series: AnalyticsPoint[];
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
  /** Epic 3 — số liệu quản trị bổ sung (server/analytics.ts → extras). */
  extras?: {
    reportsByStatus: { pending: number; resolved: number; dismissed: number };
    coinsIssued: number;
    topClubs: Array<{ name: string; membersCount: number; posts: number }>;
    retention7d: number;
  };
}

interface AdminMember {
  id: string;
  email: string;
  name: string;
  avatar: string;
  role: string;
  userRole: 'SUPER_ADMIN' | 'CLUB_LEADER' | 'STUDENT';
  staffRole: 'MODERATOR' | 'TEACHER' | null;
  /** Epic 3 — vai trò tùy chỉnh (ID + định nghĩa) và ngày tạo tài khoản. */
  customRole?: string | null;
  customRoleDef?: CustomRoleDef | null;
  joinedAt?: string;
  level: number;
  moderation: {
    banned: boolean;
    muted: boolean;
    bannedUntil?: number;
    mutedUntil?: number;
    reason?: string;
  };
  premium: { active: boolean; until: number | null; grantedAt: number | null };
  metrics: {
    visits: number;
    activeSeconds: number;
    pageViews: number;
    messages: number;
    questions: number;
    answers: number;
    clubsCreated: number;
    clubPosts: number;
    lastSeenAt: number;
  };
  warningCount: number;
  warnings: Array<{ id: string; at: number; reason: string; by: string }>;
  profile?: {
    bio: string;
    city: string;
    className: string;
    gender: string;
    joinedAt: string;
    bannerUrl: string;
    profileGradient: string;
  };
}

interface AdminInsightsModalProps {
  isOpen: boolean;
  currentUser: User;
  onClose: () => void;
  onOpenOperations?: () => void;
  /** Đăng xuất phiên hỏng rồi mở lại form đăng nhập (khi máy chủ từ chối token). */
  onRelogin?: () => void;
}

const RANGE_OPTIONS: Array<{ value: AdminInsightsRange; label: string }> = [
  { value: '24h', label: '24 giờ' },
  { value: '7d', label: '7 ngày' },
  { value: '30d', label: '30 ngày' },
  { value: '12m', label: '12 tháng' },
  { value: 'years', label: 'Theo năm' },
];

const ROLE_OPTIONS: Array<{ value: 'ALL' | AdminMemberRole; label: string }> = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'SUPER_ADMIN', label: 'Super Admin' },
  { value: 'MODERATOR', label: 'Moderator' },
  { value: 'TEACHER', label: 'Giáo viên' },
  { value: 'CLUB_LEADER', label: 'Chủ nhiệm CLB' },
  { value: 'STUDENT', label: 'Thành viên' },
  { value: 'PREMIUM', label: 'Premium' },
];

/* Epic 3 — mục 3.4: đúng 4 mốc 1 ngày / 3 ngày / 1 tuần / vĩnh viễn (khớp whitelist máy chủ). */
const DURATION_OPTIONS = QUICK_DURATIONS;

type MemberStatusFilter = 'ALL' | 'ACTIVE' | 'BANNED' | 'MUTED' | 'WARNED';
const STATUS_FILTERS: Array<{ value: MemberStatusFilter; label: string; tone: string }> = [
  { value: 'ALL', label: 'Tất cả', tone: 'all' },
  { value: 'ACTIVE', label: 'Hoạt động', tone: 'active' },
  { value: 'BANNED', label: 'Bị cấm', tone: 'banned' },
  { value: 'MUTED', label: 'Khoá chat', tone: 'muted' },
  { value: 'WARNED', label: 'Có cảnh cáo', tone: 'warned' },
];

type ChartMetric = 'uniqueVisitors' | 'visits' | 'activeSeconds' | 'messages' | 'newMembers';
const CHART_METRICS: Array<{ value: ChartMetric; label: string; tone: ChartTone }> = [
  { value: 'uniqueVisitors', label: 'Người dùng hoạt động', tone: 'cyan' },
  { value: 'visits', label: 'Lượt truy cập', tone: 'violet' },
  { value: 'activeSeconds', label: 'Thời gian online', tone: 'mint' },
  { value: 'messages', label: 'Tin nhắn', tone: 'amber' },
  { value: 'newMembers', label: 'Thành viên mới', tone: 'violet' },
];

const shortDate = (value?: string): string => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const PREMIUM_DURATIONS = [
  { value: 30, label: '30 ngày' },
  { value: 90, label: '3 tháng' },
  { value: 365, label: '1 năm' },
  { value: 0, label: 'Vĩnh viễn' },
] as const;

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  MODERATOR: 'Moderator',
  TEACHER: 'Giáo viên',
  CLUB_LEADER: 'Chủ nhiệm CLB',
  STUDENT: 'Thành viên',
};

const numberFmt = new Intl.NumberFormat('vi-VN');
const dateFmt = (value?: number | string | null): string => {
  if (value === undefined || value === null || value === '' || value === 0) return 'Chưa ghi nhận';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Chưa ghi nhận' : date.toLocaleString('vi-VN');
};
const durationLabel = (seconds: number): string => {
  const safe = Math.max(0, Math.floor(Number(seconds) || 0));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  if (hours > 0) return `${numberFmt.format(hours)} giờ ${minutes} phút`;
  if (minutes > 0) return `${minutes} phút`;
  return `${safe} giây`;
};
const initials = (name: string): string => name.trim().split(/\s+/).slice(-2).map((part) => part[0] || '').join('').toUpperCase() || 'FF';

const makeAvatarHue = (key: string): number => {
  let hash = 0;
  for (let index = 0; index < key.length; index += 1) hash = (hash * 31 + key.charCodeAt(index)) >>> 0;
  return hash % 360;
};

export const AdminInsightsModal: FC<AdminInsightsModalProps> = ({
  isOpen,
  currentUser,
  onClose,
  onOpenOperations,
  onRelogin,
}) => {
  /* Epic 3 — quyền đọc từ ma trận RBAC tập trung (utils/adminCapabilities); máy chủ vẫn kiểm độc lập. */
  const caps = useAdminCaps();
  const isSuperAdmin = caps.isSuperAdmin;
  const canSeeAnalytics = capsHas(caps, 'view_analytics');
  const canAssignRoles = capsHas(caps, 'give_role');
  const canModerate = caps.isSuperAdmin || Boolean(caps.staffRole)
    || (['ban', 'warn', 'mute', 'give_role'] as AdminPermission[]).some((permission) => capsHas(caps, permission));
  const [tab, setTab] = useState<'overview' | 'members' | 'roles'>(canSeeAnalytics ? 'overview' : 'members');
  const [range, setRange] = useState<AdminInsightsRange>('7d');
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [chartMetric, setChartMetric] = useState<ChartMetric>('uniqueVisitors');
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | AdminMemberRole>('ALL');
  const [page, setPage] = useState(1);
  const [members, setMembers] = useState<AdminMember[]>([]);
  const [memberTotal, setMemberTotal] = useState(0);
  const [memberPages, setMemberPages] = useState(1);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState<string | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null);
  const [moderationDuration, setModerationDuration] = useState<number>(1440);
  const [moderationReason, setModerationReason] = useState('');
  const [warningReason, setWarningReason] = useState('');
  const [staffRoleChoice, setStaffRoleChoice] = useState<RoleChoice>('NONE');
  const [premiumDuration, setPremiumDuration] = useState<number>(90);
  const [premiumReason, setPremiumReason] = useState('');
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const [manualRefreshing, setManualRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<MemberStatusFilter>('ALL');
  const [customRoles, setCustomRoles] = useState<CustomRoleRow[]>([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [rolesError, setRolesError] = useState<string | null>(null);
  const [rolesTick, setRolesTick] = useState(0);
  const [quickAction, setQuickAction] = useState<{ kind: QuickActionKind; email: string } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);

  /* API quản trị trả 401/403 → hỏi lại máy chủ xem phiên còn hợp lệ không. Nếu phiên
     hỏng, hiện hướng dẫn đăng nhập lại thay cho thông báo "thiếu quyền" gây hiểu lầm. */
  const checkSession = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/session', { headers: authHeaders() });
      if (response.status === 401) setSessionExpired(true);
    } catch {
      /* ngoại tuyến — để lần sau kiểm tra lại */
    }
  }, []);

  const selectedMember = useMemo(
    () => members.find((member) => member.email === selectedEmail) || null,
    [members, selectedEmail],
  );

  const loadAnalytics = useCallback(async () => {
    if (!canSeeAnalytics) return;
    setAnalyticsLoading(true);
    try {
      const response = await fetch(`/api/admin/analytics?range=${encodeURIComponent(range)}`, {
        headers: authHeaders(),
      });
      const data = await response.json().catch(() => null);
      if (response.status !== 200 || !data?.success || !data.analytics) {
        setAnalyticsError(data?.message || `Không tải được thống kê (HTTP ${response.status}).`);
        if (response.status === 401 || response.status === 403) void checkSession();
        return;
      }
      setAnalytics(data.analytics as AdminAnalytics);
      setAnalyticsError(null);
    } catch {
      setAnalyticsError('Không kết nối được máy chủ để tải thống kê.');
    } finally {
      setAnalyticsLoading(false);
      setManualRefreshing(false);
    }
  }, [canSeeAnalytics, checkSession, range]);

  const loadMembers = useCallback(async (cancelled?: () => boolean) => {
    if (!canModerate) return;
    setMembersLoading(true);
    try {
      const params = new URLSearchParams({
        q: query.trim(),
        role: roleFilter,
        status: statusFilter,
        page: String(page),
        limit: '50',
      });
      const response = await fetch(`/api/admin/members?${params.toString()}`, { headers: authHeaders() });
      const data = await response.json().catch(() => null);
      if (cancelled?.()) return;
      if (response.status !== 200 || !data?.success) {
        setMembersError(data?.message || `Không tải được danh sách (HTTP ${response.status}).`);
        if (response.status === 401 || response.status === 403) void checkSession();
        setMembers([]);
        setMemberTotal(0);
        setMemberPages(1);
        return;
      }
      const nextMembers = Array.isArray(data.members) ? data.members as AdminMember[] : [];
      setMembers(nextMembers);
      setMemberTotal(Number(data.total) || 0);
      setMemberPages(Math.max(1, Number(data.pages) || 1));
      setMembersError(null);
    } catch {
      if (cancelled?.()) return;
      setMembersError('Không kết nối được máy chủ để tải danh sách thành viên.');
      setMembers([]);
    } finally {
      if (!cancelled?.()) {
        setMembersLoading(false);
        setManualRefreshing(false);
      }
    }
  }, [canModerate, checkSession, page, query, roleFilter, statusFilter]);

  useEffect(() => {
    if (!isOpen || tab !== 'overview' || !canSeeAnalytics) return undefined;
    const initialTimer = window.setTimeout(() => { void loadAnalytics(); }, 0);
    const timer = window.setInterval(() => { void loadAnalytics(); }, 30_000);
    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(timer);
    };
  }, [isOpen, canSeeAnalytics, loadAnalytics, tab]);

  useEffect(() => {
    if (!isOpen || tab !== 'members' || !canModerate) return undefined;
    let cancelled = false;
    const timer = window.setTimeout(() => { void loadMembers(() => cancelled); }, query ? 220 : 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [canModerate, isOpen, loadMembers, query, refreshTick, roleFilter, statusFilter, tab]);

  /* Quyền có thể đổi khi đang mở (vd. vừa bị thu hồi vai trò) → không để kẹt ở tab không còn quyền. */
  useEffect(() => {
    if ((tab === 'overview' && !canSeeAnalytics) || (tab === 'roles' && !canAssignRoles)) {
      const timer = window.setTimeout(() => setTab(canModerate ? 'members' : 'overview'), 0);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [canAssignRoles, canModerate, canSeeAnalytics, tab]);

  /* Danh sách vai trò tùy chỉnh — cho tab Vai trò và bộ chọn "Cấp vai trò". */
  useEffect(() => {
    if (!isOpen || !canAssignRoles) return undefined;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setRolesLoading(true);
      try {
        const response = await fetch('/api/admin/roles', { headers: authHeaders() });
        const data = await response.json().catch(() => null);
        if (cancelled) return;
        if (response.status !== 200 || !data?.success) {
          setRolesError(data?.message || `Không tải được vai trò (HTTP ${response.status}).`);
          if (response.status === 401 || response.status === 403) void checkSession();
          return;
        }
        setCustomRoles(Array.isArray(data.roles) ? data.roles as CustomRoleRow[] : []);
        setRolesError(null);
      } catch {
        if (!cancelled) setRolesError('Không kết nối được máy chủ để tải vai trò.');
      } finally {
        if (!cancelled) setRolesLoading(false);
      }
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [canAssignRoles, checkSession, isOpen, rolesTick]);

  /* Thông báo nhanh sau thao tác trên dòng — tự ẩn sau 4 giây. */
  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEscapeKey(() => {
    if (quickAction) setQuickAction(null);
    else if (selectedEmail) setSelectedEmail(null);
    else onClose();
  }, isOpen);

  const refreshAll = () => {
    setManualRefreshing(true);
    if (tab === 'overview' && canSeeAnalytics) void loadAnalytics();
    if (tab === 'members') setRefreshTick((tick) => tick + 1);
    if (tab === 'roles') {
      setRolesTick((tick) => tick + 1);
      setManualRefreshing(false);
    }
  };

  const updateSelected = (email: string) => {
    setSelectedEmail(email);
    const member = members.find((row) => row.email === email);
    setStaffRoleChoice(member?.customRole ? `custom:${member.customRole}` : member?.staffRole || 'NONE');
    setModerationReason('');
    setWarningReason('');
    setPremiumReason('');
    setActionError(null);
    setActionNotice(null);
  };

  /* Epic 3 — các hàm perform* dùng chung cho drawer hồ sơ và sheet thao tác nhanh trên dòng.
     Chúng chỉ gọi API và trả kết quả; nơi gọi tự quyết định hiển thị thông báo. */
  const performModeration = async (
    member: AdminMember,
    action: 'ban' | 'mute' | 'unban' | 'unmute',
    durationMinutes: number,
    reason: string,
  ): Promise<ActionResult> => {
    const applying = action === 'ban' || action === 'mute';
    if (applying && reason.length < 3) return { ok: false, message: 'Vui lòng ghi lý do cụ thể (ít nhất 3 ký tự).' };
    try {
      const { status, data } = await postJson('/api/admin/moderate', {
        email: member.email,
        action,
        durationMinutes: applying ? durationMinutes : undefined,
        reason: applying ? reason : '',
      });
      if (status !== 200 || !data?.success) {
        return { ok: false, message: data?.message || `Không thực hiện được thao tác (HTTP ${status}).` };
      }
      setRefreshTick((tick) => tick + 1);
      return { ok: true, message: data.changed ? 'Đã cập nhật trạng thái kiểm duyệt và ghi nhật ký.' : data.message || 'Trạng thái không đổi.' };
    } catch {
      return { ok: false, message: 'Không kết nối được máy chủ; hãy tải lại trạng thái trước khi thử lại.' };
    }
  };

  const performWarning = async (member: AdminMember, reason: string): Promise<ActionResult> => {
    if (reason.length < 3) return { ok: false, message: 'Nội dung cảnh cáo cần ít nhất 3 ký tự.' };
    try {
      const { status, data } = await postJson('/api/admin/warn', { email: member.email, reason });
      if (status !== 200 || !data?.success) {
        return { ok: false, message: data?.message || `Không gửi được cảnh cáo (HTTP ${status}).` };
      }
      setRefreshTick((tick) => tick + 1);
      return { ok: true, message: 'Đã gửi cảnh cáo riêng cho thành viên và lưu nhật ký.' };
    } catch {
      return { ok: false, message: 'Không kết nối được máy chủ để gửi cảnh cáo.' };
    }
  };

  const performRoleChange = async (member: AdminMember, choice: RoleChoice): Promise<ActionResult> => {
    if (!canAssignRoles) return { ok: false, message: 'Bạn không có quyền cấp vai trò.' };
    const customId = choice.startsWith('custom:') ? choice.slice(7) : null;
    const customName = customId ? customRoles.find((role) => role.id === customId)?.name || 'tùy chỉnh' : '';
    const body = choice === 'NONE'
      ? { email: member.email, staffRole: null, customRole: null, reason: 'Thu hồi vai trò quản trị.' }
      : customId
        ? { email: member.email, customRole: customId, reason: `Cấp vai trò ${customName}.` }
        : { email: member.email, staffRole: choice, reason: `Cấp vai trò ${choice}.` };
    try {
      const { status, data } = await postJson('/api/admin/role', body);
      if (status !== 200 || !data?.success) {
        return { ok: false, message: data?.message || `Không cập nhật được vai trò (HTTP ${status}).` };
      }
      setRefreshTick((tick) => tick + 1);
      setRolesTick((tick) => tick + 1);
      return { ok: true, message: data.changed ? 'Đã cập nhật vai trò thành viên.' : 'Vai trò hiện tại không thay đổi.' };
    } catch {
      return { ok: false, message: 'Không kết nối được máy chủ để cập nhật vai trò.' };
    }
  };

  const runModeration = async (action: 'ban' | 'mute' | 'unban' | 'unmute') => {
    if (!selectedMember || actionBusy) return;
    const applying = action === 'ban' || action === 'mute';
    const reason = moderationReason.trim();
    if (applying && reason.length < 3) {
      setActionError('Vui lòng ghi lý do cụ thể (ít nhất 3 ký tự).');
      return;
    }
    if (applying && moderationDuration === 0 && !window.confirm(
      `${action === 'ban' ? 'Cấm đăng' : 'Khoá chat'} ${selectedMember.email} vĩnh viễn?`,
    )) return;
    setActionBusy(action);
    setActionError(null);
    setActionNotice(null);
    const result = await performModeration(selectedMember, action, moderationDuration, reason);
    if (result.ok) {
      setActionNotice(result.message);
      setModerationReason('');
    } else {
      setActionError(result.message);
    }
    setActionBusy(null);
  };

  const sendWarning = async () => {
    if (!selectedMember || actionBusy) return;
    const reason = warningReason.trim();
    if (reason.length < 3) {
      setActionError('Nội dung cảnh cáo cần ít nhất 3 ký tự.');
      return;
    }
    setActionBusy('warning');
    setActionError(null);
    setActionNotice(null);
    const result = await performWarning(selectedMember, reason);
    if (result.ok) {
      setWarningReason('');
      setActionNotice(result.message);
    } else {
      setActionError(result.message);
    }
    setActionBusy(null);
  };

  const saveStaffRole = async () => {
    if (!selectedMember || !canAssignRoles || actionBusy) return;
    setActionBusy('role');
    setActionError(null);
    setActionNotice(null);
    const result = await performRoleChange(selectedMember, staffRoleChoice);
    if (result.ok) setActionNotice(result.message);
    else setActionError(result.message);
    setActionBusy(null);
  };

  const setPremium = async (action: 'grant' | 'revoke') => {
    if (!selectedMember || !isSuperAdmin || actionBusy) return;
    const reason = premiumReason.trim();
    if (reason.length < 3) {
      setActionError('Cần ghi lý do cấp/thu hồi Premium (ít nhất 3 ký tự).');
      return;
    }
    if (action === 'revoke' && !window.confirm(`Thu hồi F-Forum Premium của ${selectedMember.name}?`)) return;
    setActionBusy('premium');
    setActionError(null);
    setActionNotice(null);
    try {
      const { status, data } = await postJson('/api/admin/premium', {
        email: selectedMember.email,
        action,
        durationDays: action === 'grant' ? premiumDuration : undefined,
        reason,
      });
      if (status !== 200 || !data?.success) {
        setActionError(data?.message || `Không cập nhật được Premium (HTTP ${status}).`);
        return;
      }
      setPremiumReason('');
      setActionNotice(action === 'grant' ? 'Đã cấp F-Forum Premium.' : 'Đã thu hồi F-Forum Premium.');
      setRefreshTick((tick) => tick + 1);
    } catch {
      setActionError('Không kết nối được máy chủ để cập nhật Premium.');
    } finally {
      setActionBusy(null);
    }
  };

  const chartPoints = useMemo(() => (analytics?.series || []).map((point) => ({
    key: point.key,
    label: point.label,
    value: Number(point[chartMetric]) || 0,
  })), [analytics, chartMetric]);
  const activeMetric = CHART_METRICS.find((metric) => metric.value === chartMetric) || CHART_METRICS[0];
  const formatChartValue = (value: number) => (chartMetric === 'activeSeconds'
    ? durationLabel(value)
    : numberFmt.format(Math.round(value)));

  /* Bảo vệ thao tác theo đúng luật máy chủ: không đụng Super Admin, chính mình,
     và (nếu không phải Super Admin) không đụng nhân sự kiểm duyệt khác. */
  const myEmail = currentUser.email.trim().toLowerCase();
  const isProtectedMember = (member: AdminMember) => member.role === 'SUPER_ADMIN' || isMasterAdmin(member.email);
  const canActOn = (member: AdminMember) => !isProtectedMember(member)
    && member.email.toLowerCase() !== myEmail
    && (isSuperAdmin || (!member.staffRole && !member.customRole));
  const canChangeRoleOf = (member: AdminMember) => canAssignRoles
    && !isProtectedMember(member)
    && member.email.toLowerCase() !== myEmail
    && (isSuperAdmin || !(member.customRoleDef?.permissions || []).includes('give_role'));
  /* Admin chỉ thấy các vai trò có quyền ⊆ quyền của mình (máy chủ cũng chặn). */
  const grantableRoles = customRoles.filter((role) => isSuperAdmin
    || role.permissions.every((permission) => caps.permissions.includes(permission as AdminPermission)));
  const canGrantStaffRoles = isSuperAdmin
    || (['ban', 'warn', 'mute'] as AdminPermission[]).every((permission) => caps.permissions.includes(permission));
  const quickMember = quickAction ? members.find((member) => member.email === quickAction.email) || null : null;
  const topClubs = analytics?.extras?.topClubs ?? [];
  const maxClubMembers = Math.max(1, ...topClubs.map((club) => club.membersCount));

  if (!isOpen || !(canModerate || canSeeAnalytics)) return null;

  return (
    <div className="faa-backdrop">
      <button
        type="button"
        className="faa-backdrop__dismiss"
        aria-label="Đóng bảng thống kê quản trị"
        onClick={onClose}
      />
      <section className="faa-shell" role="dialog" aria-modal="true" aria-label="Thống kê và quản lý thành viên">
        <header className="faa-topbar">
          <div className="faa-brand">
            <span className="faa-mark"><BarChart3 size={20} aria-hidden="true" /></span>
            <div className="faa-brand__copy">
              <h2>F-Forum Insights</h2>
              <p>{isSuperAdmin ? 'Bảng điều hành cộng đồng' : 'Trung tâm kiểm duyệt thành viên'}</p>
            </div>
            <span className="faa-live"><i />{analytics ? `${numberFmt.format(analytics.activeNow)} đang hoạt động` : 'Trực tiếp'}</span>
          </div>
          <div className="faa-topbar__actions">
            {isSuperAdmin && onOpenOperations && (
              <button type="button" className="faa-button faa-button--quiet faa-operations" onClick={onOpenOperations}>
                <Database size={15} /> Vận hành
              </button>
            )}
            <button type="button" className="faa-button faa-button--quiet" onClick={refreshAll} disabled={manualRefreshing}>
              <RefreshCw size={15} className={manualRefreshing ? 'faa-spin' : ''} /> Làm mới
            </button>
            <button type="button" className="faa-icon-button" aria-label="Đóng" onClick={onClose}><X size={18} /></button>
          </div>
        </header>

        <nav className="faa-tabs" aria-label="Phân khu bảng quản trị">
          {canSeeAnalytics && (
            <button type="button" className={tab === 'overview' ? 'is-active' : ''} onClick={() => setTab('overview')}>
              <Activity size={15} /> Tổng quan
            </button>
          )}
          {canModerate && (
            <button type="button" className={tab === 'members' ? 'is-active' : ''} onClick={() => setTab('members')}>
              <Users size={15} /> Thành viên
              <span>{numberFmt.format(memberTotal)}</span>
            </button>
          )}
          {canAssignRoles && (
            <button type="button" className={tab === 'roles' ? 'is-active' : ''} onClick={() => setTab('roles')}>
              <Wand2 size={15} /> Vai trò
              <span>{numberFmt.format(customRoles.length)}</span>
            </button>
          )}
          <div className="faa-tabs__right">
            {tab === 'overview' && analytics && (
              <span className="faa-updated">Cập nhật {new Date(analytics.generatedAt).toLocaleTimeString('vi-VN')}</span>
            )}
            {!isSuperAdmin && (caps.customRoleDef
              ? <CustomRoleBadge name={caps.customRoleDef.name} icon={caps.customRoleDef.icon} color={caps.customRoleDef.color} specialChar={caps.customRoleDef.specialChar} size="md" />
              : <span className="faa-permission"><ShieldCheck size={13} /> {ROLE_LABELS[caps.staffRole || currentUser.staffRole || ''] || 'Nhân sự'}</span>)}
          </div>
        </nav>

        <div className="faa-content">
          {(caps.sessionInvalid || sessionExpired) && (
            <div className="faa-session-alert" role="alert">
              <span className="faa-session-alert__icon"><AlertTriangle size={17} aria-hidden="true" /></span>
              <div>
                <b>Máy chủ chưa xác nhận phiên đăng nhập này</b>
                <span>Phiên đã hết hạn hoặc không hợp lệ — đăng nhập lại để dùng đầy đủ quyền.</span>
              </div>
              {onRelogin && (
                <button type="button" className="faa-session-alert__cta" onClick={onRelogin}>Đăng nhập lại</button>
              )}
            </div>
          )}
          {tab === 'overview' && canSeeAnalytics && (
            <div className="faa-overview cdl-01">
              {analyticsError && <div className="faa-alert faa-alert--error" role="alert"><AlertTriangle size={16} />{analyticsError}</div>}
              {!analytics && analyticsLoading && <div className="faa-loading"><LoaderCircle className="faa-spin" /> Đang tổng hợp số liệu từ máy chủ…</div>}
              {analytics && (
                <div className="cdl-01__stage">
                  <header className="cdl-01__top">
                    <span className="cdl-01__mark" aria-hidden="true" />
                    <strong>Pulse · Thống kê người dùng & hệ thống</strong>
                    <span className="cdl-01__live"><i aria-hidden="true" />Trực tiếp</span>
                  </header>

                  <div className="faa-period-row">
                    <div>
                      <p className="faa-eyebrow"><span className="faa-live-dot" /> Dữ liệu được ghi nhận từ {dateFmt(analytics.trackingStartedAt)}</p>
                      <p className="faa-period-note">Lượt duy nhất gộp theo tài khoản đăng nhập và mã browser khách; không phải danh tính người thật đã xác minh.</p>
                    </div>
                    <div className="faa-range" role="group" aria-label="Khoảng thời gian biểu đồ">
                      {RANGE_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          aria-pressed={range === option.value}
                          className={range === option.value ? 'is-active' : ''}
                          onClick={() => setRange(option.value)}
                        >{option.label}</button>
                      ))}
                    </div>
                  </div>

                  <div className="faa-bento cdl-01__board">
                    <article className="faa-tile faa-tile--hero cdl-01__tile cdl-01__hero" style={{ '--i': 0 } as CSSProperties}>
                      <div className="faa-tile__top"><span className="faa-tile__icon faa-cyan"><Eye size={17} /></span><span className="faa-tile__hint">Lượt duy nhất · toàn thời gian</span></div>
                      <div className="faa-hero-number cdl-01__big">{numberFmt.format(analytics.totals.uniqueVisitors)}</div>
                      <p className="faa-tile__caption">Người dùng duy nhất</p>
                      <div className="faa-breakdown">
                        <span><i className="faa-dot faa-dot--cyan" /> {numberFmt.format(analytics.totals.registeredVisitors)} tài khoản</span>
                        <span><i className="faa-dot faa-dot--purple" /> {numberFmt.format(analytics.totals.anonymousBrowsers)} trình duyệt khách</span>
                      </div>
                      <div className="faa-hero-wave" aria-hidden="true"><i /></div>
                    </article>

                    <MetricTile
                      icon={<Clock3 size={17} />}
                      tone="mint"
                      label="Thời gian mở web"
                      value={`${(analytics.totals.activeSeconds / 3600).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} giờ`}
                      note={`${durationLabel(analytics.period.activeSeconds)} trong ${analytics.rangeLabel}`}
                      index={1}
                    />
                    <MetricTile
                      icon={<MessageSquare size={17} />}
                      tone="violet"
                      label="Tin nhắn chat"
                      value={numberFmt.format(analytics.totals.messages)}
                      note={`${numberFmt.format(analytics.period.messages)} trong ${analytics.rangeLabel}`}
                      index={2}
                    />
                    <MetricTile
                      icon={<Users size={17} />}
                      tone="amber"
                      label="Thành viên"
                      value={numberFmt.format(analytics.totalMembers)}
                      note={`+${numberFmt.format(analytics.totals.newMembers)} đăng ký từ ngày theo dõi`}
                      index={3}
                    />
                    <MetricTile
                      icon={<Activity size={17} />}
                      tone="mint"
                      label="Đang hoạt động"
                      value={numberFmt.format(analytics.activeNow)}
                      note={`${numberFmt.format(analytics.activeMembersNow)} tài khoản · 5 phút gần nhất`}
                      index={4}
                    />
                    <article className="faa-tile faa-tile--chart faa-tile--art cdl-01__tile" style={{ '--i': 5 } as CSSProperties}>
                      <div className="faa-chart-head">
                        <div>
                          <h3>{activeMetric.label} theo thời gian</h3>
                          <p>{analytics.rangeLabel} · {numberFmt.format(analytics.period.uniqueVisitors)} người dùng duy nhất · {numberFmt.format(analytics.period.visits)} lượt truy cập</p>
                        </div>
                        <div className="faa-metric-switch" role="group" aria-label="Chọn dữ liệu biểu đồ">
                          {CHART_METRICS.map((metric) => (
                            <button
                              key={metric.value}
                              type="button"
                              data-tone={metric.tone}
                              aria-pressed={chartMetric === metric.value}
                              className={chartMetric === metric.value ? 'is-active' : ''}
                              onClick={() => setChartMetric(metric.value)}
                            >{metric.label}</button>
                          ))}
                        </div>
                      </div>
                      {analytics.series.length === 0 ? (
                        <div className="faa-chart-empty">Chưa có dữ liệu trong khoảng thời gian này.</div>
                      ) : (
                        <SmoothAreaChart
                          key={`${chartMetric}-${range}`}
                          points={chartPoints}
                          tone={activeMetric.tone}
                          formatValue={formatChartValue}
                          ariaLabel={`Biểu đồ ${activeMetric.label.toLowerCase()} — ${analytics.rangeLabel}`}
                          height={210}
                        />
                      )}
                    </article>

                    <MetricTile
                      icon={<CalendarDays size={17} />}
                      tone="cyan"
                      label="Lượt mở site"
                      value={numberFmt.format(analytics.totals.visits)}
                      note={`${numberFmt.format(analytics.period.visits)} trong kỳ đang chọn`}
                      index={6}
                    />
                    <MetricTile
                      icon={<Eye size={17} />}
                      tone="blue"
                      label="Lượt xem phân khu"
                      value={numberFmt.format(analytics.totals.pageViews)}
                      note={`${numberFmt.format(analytics.period.pageViews)} trong kỳ đang chọn`}
                      index={7}
                    />
                    <MetricTile
                      icon={<Coins size={17} />}
                      tone="amber"
                      label="Coin đã phát"
                      value={numberFmt.format(analytics.extras?.coinsIssued ?? 0)}
                      note="Tổng coin đang lưu hành trên mọi tài khoản"
                      index={8}
                    />
                    <article className="faa-tile faa-tile--metric faa-tile--gauge cdl-01__tile" style={{ '--i': 9 } as CSSProperties}>
                      <div className="faa-tile__top"><span className="faa-tile__icon faa-mint"><Activity size={17} /></span><span className="faa-tile__hint">Giữ chân 7 ngày</span></div>
                      <RetentionGauge ratio={analytics.extras?.retention7d ?? 0} caption="quay lại trong 7 ngày" />
                    </article>

                    <article className="faa-tile faa-tile--reports cdl-01__tile" style={{ '--i': 10 } as CSSProperties}>
                      <div className="faa-chart-head">
                        <div><h3>Báo cáo vi phạm</h3><p>Phân loại theo trạng thái xử lý · toàn thời gian</p></div>
                        <span className="faa-tile__icon faa-amber"><AlertTriangle size={16} /></span>
                      </div>
                      <StatusDonut
                        ariaLabel="Báo cáo vi phạm theo trạng thái"
                        centerCaption="Tổng báo cáo"
                        segments={[
                          { key: 'pending', label: 'Mới · chờ xử lý', value: analytics.extras?.reportsByStatus.pending ?? 0, color: '#fbbf24' },
                          { key: 'resolved', label: 'Đã xử lý', value: analytics.extras?.reportsByStatus.resolved ?? 0, color: '#34d399' },
                          { key: 'dismissed', label: 'Đã bỏ qua', value: analytics.extras?.reportsByStatus.dismissed ?? 0, color: '#94a3b8' },
                        ]}
                      />
                    </article>

                    <article className="faa-tile faa-tile--clubs cdl-01__tile" style={{ '--i': 11 } as CSSProperties}>
                      <div className="faa-chart-head">
                        <div><h3>Câu lạc bộ đông nhất</h3><p>Xếp theo số thành viên · kèm số bài đăng</p></div>
                        <span className="faa-tile__icon faa-gold"><Trophy size={16} /></span>
                      </div>
                      {topClubs.length === 0 ? (
                        <p className="faa-muted-empty">Chưa có câu lạc bộ nào.</p>
                      ) : (
                        <ol className="faa-club-bars">
                          {topClubs.map((club, index) => (
                            <li
                              key={`${club.name}-${index}`}
                              style={{ '--i': index, '--w': `${Math.max(6, Math.round((club.membersCount / maxClubMembers) * 100))}%` } as CSSProperties}
                            >
                              <span className="faa-club-bars__rank">{String(index + 1).padStart(2, '0')}</span>
                              <span className="faa-club-bars__name">{club.name}</span>
                              <span className="faa-club-bars__meta">{numberFmt.format(club.membersCount)} thành viên · {numberFmt.format(club.posts)} bài</span>
                              <span className="faa-club-bars__track" aria-hidden="true"><i /></span>
                            </li>
                          ))}
                        </ol>
                      )}
                    </article>

                    <article className="faa-tile faa-tile--activity cdl-01__tile cdl-01__tall" style={{ '--i': 8 } as CSSProperties}>
                      <div className="faa-chart-head">
                        <div><h3>Hoạt động cộng đồng</h3><p>Thống kê tích luỹ kể từ khi bật đo lường</p></div>
                        <span className="faa-tile__icon faa-gold"><Sparkles size={16} /></span>
                      </div>
                      <div className="faa-activity-list">
                        <ActivityRow label="Câu hỏi mới" value={analytics.totals.questions} icon={<MessageSquare size={14} />} />
                        <ActivityRow label="Lời giải" value={analytics.totals.answers} icon={<Check size={14} />} />
                        <ActivityRow label="Câu lạc bộ thành lập" value={analytics.totals.clubsCreated} icon={<Users size={14} />} />
                        <ActivityRow label="Bài viết câu lạc bộ" value={analytics.totals.clubPosts} icon={<Award size={14} />} />
                        <ActivityRow label="Tổng báo cáo" value={analytics.totals.totalReports} icon={<AlertTriangle size={14} />} />
                        <ActivityRow label="Đã xử lý" value={analytics.totals.resolvedReports} icon={<CheckCircle size={14} />} />
                      </div>
                    </article>

                    <article className="faa-tile faa-tile--top-members cdl-01__tile cdl-01__wide" style={{ '--i': 9 } as CSSProperties}>
                      <div className="faa-chart-head"><div><h3>Thành viên hoạt động nổi bật</h3><p>Sắp theo tổng thời gian truy cập đã ghi nhận</p></div><Users size={16} className="text-cyan-300" /></div>
                      {analytics.topMembers.length === 0 ? (
                        <p className="faa-muted-empty">Chưa có phiên tài khoản trong giai đoạn đo lường.</p>
                      ) : (
                        <ol className="faa-top-list">
                          {analytics.topMembers.slice(0, 5).map((member, index) => (
                            <li key={member.email}>
                              <span className="faa-top-list__rank">{String(index + 1).padStart(2, '0')}</span>
                              <Avatar name={member.name} avatar={member.avatar} email={member.email} small />
                              <span className="faa-top-list__name"><b>{member.name}</b><small>{member.email}</small></span>
                              <span className="faa-top-list__time">{durationLabel(member.activeSeconds)}</span>
                            </li>
                          ))}
                        </ol>
                      )}
                    </article>
                  </div>

                  <p className="faa-privacy-note"><Shield size={13} /> Chỉ tính thời gian khi tab đang hiển thị. Không lưu IP, dấu vân tay thiết bị hay nội dung; một người dùng khách rồi đăng nhập có thể xuất hiện ở cả hai nhóm.</p>
                </div>
              )}
            </div>
          )}

          {tab === 'members' && (
            <div className="faa-members-view">
              <div className="faa-members-heading">
                <div>
                  <p className="faa-eyebrow">DANH BẠ QUẢN TRỊ</p>
                  <h3>Thành viên <span>{numberFmt.format(memberTotal)}</span></h3>
                  <p>Hồ sơ, lượt truy cập, thời lượng sử dụng và công cụ kiểm duyệt theo quyền của bạn.</p>
                </div>
                <label className="faa-search">
                  <Search size={16} />
                  <input
                    type="search"
                    value={query}
                    onChange={(event) => { setQuery(event.target.value.slice(0, 120)); setPage(1); }}
                    placeholder="Tìm tên, email, mã, lớp…"
                    aria-label="Tìm thành viên theo tên, email, mã hoặc lớp"
                  />
                  <Filter size={14} />
                </label>
              </div>

              <div className="faa-role-filters" role="group" aria-label="Lọc thành viên theo vai trò">
                {ROLE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={roleFilter === option.value}
                    className={roleFilter === option.value ? 'is-active' : ''}
                    onClick={() => { setRoleFilter(option.value); setPage(1); }}
                  >{option.label}</button>
                ))}
              </div>

              {membersError && <div className="faa-alert faa-alert--error" role="alert"><AlertTriangle size={16} />{membersError}</div>}

              <div className="ffg-filters" role="group" aria-label="Lọc thành viên theo trạng thái">
                <span>Trạng thái</span>
                {STATUS_FILTERS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    data-tone={option.tone}
                    aria-pressed={statusFilter === option.value}
                    className={statusFilter === option.value ? 'is-active' : ''}
                    onClick={() => { setStatusFilter(option.value); setPage(1); }}
                  >
                    {option.value !== 'ALL' && <i aria-hidden="true" />}{option.label}
                  </button>
                ))}
              </div>

              {toast && <div className="ffg-toast" role="status"><Check size={14} aria-hidden="true" />{toast}</div>}

              <div className="faa-member-table faa-member-table--grid ct-03" aria-busy={membersLoading}>
                <div className="faa-member-head ct-03__head" aria-hidden="true">
                  <span>Thành viên</span>
                  <span>Vai trò</span>
                  <span className="ffg-col-status">Trạng thái</span>
                  <span className="ffg-col-joined">Ngày tạo</span>
                  <span className="ffg-col-activity">Hoạt động</span>
                  <span className="ffg-col-actions">Thao tác</span>
                </div>
                {membersLoading && members.length === 0 ? (
                  <div className="faa-loading"><LoaderCircle className="faa-spin" /> Đang tải danh sách thành viên…</div>
                ) : members.length === 0 ? (
                  <div className="faa-empty"><Users size={24} /><b>Chưa tìm thấy thành viên</b><span>Thử từ khoá khác hoặc bỏ bộ lọc vai trò/trạng thái.</span></div>
                ) : (
                  <div className="faa-member-list ct-03__body">
                    {members.map((member, index) => {
                      const actionable = canActOn(member);
                      const roleEditable = canChangeRoleOf(member);
                      const lockedHint = actionable ? '' : ' (không đủ quyền với tài khoản này)';
                      return (
                        <article className="faa-member-row ct-03__row" key={member.email} style={{ '--i': Math.min(index, 18) } as CSSProperties}>
                          <div className="faa-member-identity ct-03__cell">
                            <Avatar name={member.name} avatar={member.avatar} email={member.email} />
                            <div className="faa-member-name">
                              <b>{member.name}</b>
                              <span>{member.email}</span>
                              <small>#{member.id} · Cấp {member.level}</small>
                            </div>
                          </div>
                          <div className="faa-member-badges ct-03__cell">
                            <span className={`faa-role-pill faa-role-pill--${member.role.toLowerCase()}`}>
                              {member.role === 'TEACHER' ? <GraduationCap size={12} /> : member.role === 'SUPER_ADMIN' ? <ShieldCheck size={12} /> : member.role === 'MODERATOR' ? <Shield size={12} /> : null}
                              {ROLE_LABELS[member.role] || member.role}
                            </span>
                            {member.customRoleDef && (
                              <CustomRoleBadge
                                name={member.customRoleDef.name}
                                icon={member.customRoleDef.icon}
                                color={member.customRoleDef.color}
                                specialChar={member.customRoleDef.specialChar}
                              />
                            )}
                            {member.staffRole && (
                              <span className={`faa-role-pill faa-role-pill--${member.userRole.toLowerCase()}`}>
                                {ROLE_LABELS[member.userRole] || member.userRole}
                              </span>
                            )}
                            {member.premium.active && <PremiumMark user={{ premiumUntil: member.premium.until ?? undefined }} compact />}
                          </div>
                          <div className="ffg-status-stack ffg-col-status ct-03__cell">
                            {member.moderation.banned && <span className="ffg-status ffg-status--banned"><i aria-hidden="true" />Cấm đăng</span>}
                            {member.moderation.muted && <span className="ffg-status ffg-status--muted"><i aria-hidden="true" />Khoá chat</span>}
                            {!member.moderation.banned && !member.moderation.muted && <span className="ffg-status ffg-status--active"><i aria-hidden="true" />Hoạt động</span>}
                            {member.warningCount > 0 && <span className="faa-status-pill faa-status-pill--warning"><AlertTriangle size={12} /> {member.warningCount} cảnh cáo</span>}
                          </div>
                          <div className="ffg-joined ffg-col-joined ct-03__cell">{shortDate(member.joinedAt || member.profile?.joinedAt)}</div>
                          <div className="faa-member-metrics ffg-col-activity ct-03__cell">
                            <span><Clock3 size={13} />{durationLabel(member.metrics.activeSeconds)}</span>
                            <span><MessageSquare size={13} />{numberFmt.format(member.metrics.messages)} tin</span>
                            <small>{member.metrics.visits} lượt · gần nhất {member.metrics.lastSeenAt ? dateFmt(member.metrics.lastSeenAt) : 'chưa ghi nhận'}</small>
                          </div>
                          <div className="ffg-actions ffg-col-actions ct-03__cell ct-03__actions">
                            {isProtectedMember(member) ? (
                              <span className="ffg-protected"><ShieldCheck size={13} aria-hidden="true" /> Được bảo vệ</span>
                            ) : (
                              <>
                                {capsHas(caps, 'ban') && (
                                  <button
                                    type="button"
                                    className={`ffg-act ffg-act--ban ${member.moderation.banned ? 'is-on' : ''}`}
                                    data-tip={member.moderation.banned ? 'Gỡ cấm đăng' : 'Cấm đăng'}
                                    aria-label={`${member.moderation.banned ? 'Gỡ cấm đăng' : 'Cấm đăng'} ${member.name}${lockedHint}`}
                                    disabled={!actionable}
                                    onClick={() => setQuickAction({ kind: 'ban', email: member.email })}
                                  ><Ban size={14} aria-hidden="true" /></button>
                                )}
                                {capsHas(caps, 'warn') && (
                                  <button
                                    type="button"
                                    className="ffg-act ffg-act--warn"
                                    data-tip="Cảnh cáo"
                                    aria-label={`Cảnh cáo ${member.name}${lockedHint}`}
                                    disabled={!actionable}
                                    onClick={() => setQuickAction({ kind: 'warn', email: member.email })}
                                  ><AlertTriangle size={14} aria-hidden="true" /></button>
                                )}
                                {capsHas(caps, 'mute') && (
                                  <button
                                    type="button"
                                    className={`ffg-act ffg-act--mute ${member.moderation.muted ? 'is-on' : ''}`}
                                    data-tip={member.moderation.muted ? 'Mở khoá chat' : 'Khoá chat'}
                                    aria-label={`${member.moderation.muted ? 'Mở khoá chat' : 'Khoá chat'} ${member.name}${lockedHint}`}
                                    disabled={!actionable}
                                    onClick={() => setQuickAction({ kind: 'mute', email: member.email })}
                                  ><MessageSquareOff size={14} aria-hidden="true" /></button>
                                )}
                                {canAssignRoles && (
                                  <button
                                    type="button"
                                    className="ffg-act ffg-act--role"
                                    data-tip="Cấp vai trò"
                                    aria-label={`Cấp vai trò cho ${member.name}${roleEditable ? '' : ' (không đủ quyền với tài khoản này)'}`}
                                    disabled={!roleEditable}
                                    onClick={() => setQuickAction({ kind: 'role', email: member.email })}
                                  ><BadgeCheck size={14} aria-hidden="true" /></button>
                                )}
                              </>
                            )}
                            <button
                              type="button"
                              className="ffg-act ffg-act--more"
                              data-tip="Hồ sơ chi tiết"
                              aria-label={`Mở hồ sơ chi tiết của ${member.name}`}
                              onClick={() => updateSelected(member.email)}
                            ><MoreHorizontal size={15} aria-hidden="true" /></button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="faa-pagination">
                <span>Trang {page} / {memberPages} · {numberFmt.format(memberTotal)} thành viên</span>
                <div>
                  <button type="button" aria-label="Trang trước" disabled={page <= 1 || membersLoading} onClick={() => setPage((value) => Math.max(1, value - 1))}><ChevronLeft size={16} /></button>
                  <button type="button" aria-label="Trang sau" disabled={page >= memberPages || membersLoading} onClick={() => setPage((value) => Math.min(memberPages, value + 1))}><ChevronRight size={16} /></button>
                </div>
              </div>
              <p className="faa-permission-note"><Shield size={13} /> Super Admin & Admin (vai trò có quyền cấp vai trò) được cấp vai trò; chỉ Super Admin quản lý Premium. Giáo viên, Moderator: cảnh cáo, cấm đăng, khoá chat — không thể cấp vai trò. Mọi thao tác đều được máy chủ kiểm quyền và ghi nhật ký.</p>
            </div>
          )}

          {tab === 'roles' && canAssignRoles && (
            <RoleStudio
              caps={caps}
              currentUserEmail={currentUser.email}
              roles={customRoles}
              loading={rolesLoading}
              error={rolesError}
              onRolesChanged={() => setRolesTick((tick) => tick + 1)}
            />
          )}
        </div>

        {selectedMember && (
          <div className="faa-detail-backdrop" role="presentation" onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelectedEmail(null);
          }}>
            <aside className="faa-detail" role="dialog" aria-modal="true" aria-label={`Hồ sơ ${selectedMember.name}`}>
              <header className="faa-detail__head">
                <div>
                  <p className="faa-eyebrow">HỒ SƠ THÀNH VIÊN</p>
                  <h3>Quản lý tài khoản</h3>
                </div>
                <button type="button" className="faa-icon-button" aria-label="Đóng hồ sơ" onClick={() => setSelectedEmail(null)}><X size={17} /></button>
              </header>

              <div className="faa-detail__scroll">
                <section className="faa-profile-card">
                  {selectedMember.profile?.bannerUrl && <img loading="lazy" decoding="async" className="faa-profile-card__banner" src={selectedMember.profile.bannerUrl} alt="" />}
                  <div className="faa-profile-card__main">
                    <Avatar name={selectedMember.name} avatar={selectedMember.avatar} email={selectedMember.email} large />
                    <div className="faa-profile-card__identity">
                      <h4>{selectedMember.name}</h4>
                      <p>{selectedMember.email}</p>
                      <div className="faa-member-badges">
                        <span className="faa-role-pill">{ROLE_LABELS[selectedMember.role] || selectedMember.role}</span>
                        {selectedMember.premium.active && <PremiumMark user={{ premiumUntil: selectedMember.premium.until ?? undefined }} />}
                      </div>
                    </div>
                  </div>
                  <div className="faa-profile-card__stats">
                    <span><b>{numberFmt.format(selectedMember.metrics.visits)}</b><small>Lượt mở</small></span>
                    <span><b>{durationLabel(selectedMember.metrics.activeSeconds)}</b><small>Thời gian</small></span>
                    <span><b>{numberFmt.format(selectedMember.metrics.messages)}</b><small>Tin chat</small></span>
                  </div>
                  <p className="faa-profile-card__joined">Mã {selectedMember.id} · Cấp {selectedMember.level} · Hoạt động gần nhất {selectedMember.metrics.lastSeenAt ? dateFmt(selectedMember.metrics.lastSeenAt) : 'chưa ghi nhận'}</p>
                </section>

                {selectedMember.profile && (
                  <section className="faa-detail-section">
                    <h4><UserRound size={15} /> Thông tin hồ sơ</h4>
                    <p className="faa-bio">{selectedMember.profile.bio || 'Chưa có tiểu sử.'}</p>
                    <div className="faa-profile-fields">
                      <span><small>Lớp</small><b>{selectedMember.profile.className || 'Chưa cập nhật'}</b></span>
                      <span><small>Khu vực</small><b>{selectedMember.profile.city || 'Chưa cập nhật'}</b></span>
                      <span><small>Giới tính</small><b>{selectedMember.profile.gender || 'Chưa cập nhật'}</b></span>
                      <span><small>Tham gia</small><b>{selectedMember.profile.joinedAt ? dateFmt(selectedMember.profile.joinedAt) : 'Chưa cập nhật'}</b></span>
                    </div>
                  </section>
                )}

                <section className="faa-detail-section">
                  <h4><Shield size={15} /> Công cụ kiểm duyệt</h4>
                  {!canActOn(selectedMember) ? (
                    <p className="faa-protected">
                      <ShieldCheck size={15} />
                      {isProtectedMember(selectedMember)
                        ? 'Tài khoản Super Admin được bảo vệ.'
                        : selectedMember.email.toLowerCase() === myEmail
                          ? 'Không thể tự áp chế chính mình.'
                          : 'Chỉ Super Admin được kiểm duyệt nhân sự quản trị khác.'}
                    </p>
                  ) : (
                    <>
                      <label className="faa-form-field">
                        <span>Thời hạn áp dụng</span>
                        <select value={moderationDuration} onChange={(event) => setModerationDuration(Number(event.target.value))}>
                          {DURATION_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                        </select>
                      </label>
                      <label className="faa-form-field">
                        <span>Lý do kiểm duyệt <small>(bắt buộc, 3–500 ký tự)</small></span>
                        <textarea value={moderationReason} onChange={(event) => setModerationReason(event.target.value.slice(0, 500))} maxLength={500} rows={2} placeholder="Nêu rõ hành vi và nội dung vi phạm…" />
                      </label>
                      <div className="faa-action-grid">
                        {capsHas(caps, 'ban') && (selectedMember.moderation.banned ? (
                          <button type="button" className="faa-action-button faa-action-button--good" disabled={Boolean(actionBusy)} onClick={() => void runModeration('unban')}>
                            {actionBusy === 'unban' ? <LoaderCircle className="faa-spin" size={14} /> : <Check size={14} />} Gỡ cấm đăng
                          </button>
                        ) : (
                          <button type="button" className="faa-action-button faa-action-button--danger" disabled={Boolean(actionBusy)} onClick={() => void runModeration('ban')}>
                            {actionBusy === 'ban' ? <LoaderCircle className="faa-spin" size={14} /> : <Ban size={14} />} Cấm đăng
                          </button>
                        ))}
                        {capsHas(caps, 'mute') && (selectedMember.moderation.muted ? (
                          <button type="button" className="faa-action-button faa-action-button--good" disabled={Boolean(actionBusy)} onClick={() => void runModeration('unmute')}>
                            {actionBusy === 'unmute' ? <LoaderCircle className="faa-spin" size={14} /> : <Check size={14} />} Mở khoá chat
                          </button>
                        ) : (
                          <button type="button" className="faa-action-button faa-action-button--warn" disabled={Boolean(actionBusy)} onClick={() => void runModeration('mute')}>
                            {actionBusy === 'mute' ? <LoaderCircle className="faa-spin" size={14} /> : <MessageSquareOff size={14} />} Khoá chat
                          </button>
                        ))}
                      </div>
                      <p className="faa-explainer">Cấm đăng chặn chat, câu hỏi, lời giải và bài CLB nhưng vẫn cho đăng nhập/xem. Khoá chat chỉ chặn gửi tin.</p>
                      {selectedMember.moderation.reason && (selectedMember.moderation.banned || selectedMember.moderation.muted) && (
                        <p className="faa-current-reason">Lý do hiện tại: {selectedMember.moderation.reason}</p>
                      )}
                    </>
                  )}
                </section>

                <section className="faa-detail-section">
                  <h4><AlertTriangle size={15} /> Cảnh cáo nội dung <span>{selectedMember.warningCount}</span></h4>
                  <label className="faa-form-field">
                    <span>Nội dung cảnh cáo <small>(sẽ gửi riêng cho thành viên)</small></span>
                    <textarea value={warningReason} onChange={(event) => setWarningReason(event.target.value.slice(0, 500))} maxLength={500} rows={3} placeholder="Trích dẫn hành vi và yêu cầu khắc phục cụ thể…" />
                  </label>
                  <button type="button" className="faa-button faa-button--warning" disabled={Boolean(actionBusy) || !canActOn(selectedMember) || !capsHas(caps, 'warn')} onClick={() => void sendWarning()}>
                    {actionBusy === 'warning' ? <LoaderCircle className="faa-spin" size={14} /> : <AlertTriangle size={14} />} Gửi cảnh cáo
                  </button>
                  {selectedMember.warnings.length > 0 && (
                    <ul className="faa-warning-list">
                      {selectedMember.warnings.map((warning) => (
                        <li key={warning.id}><b>{dateFmt(warning.at)}</b><span>{warning.reason}</span><small>Bởi {warning.by}</small></li>
                      ))}
                    </ul>
                  )}
                </section>

                {canChangeRoleOf(selectedMember) && (
                    <section className="faa-detail-section">
                      <h4><BadgeCheck size={15} /> Cấp vai trò</h4>
                      <p className="faa-explainer">Chỉ Admin/Super Admin có quyền cấp/thu hồi; không thể tạo thêm Super Admin từ giao diện này.</p>
                      {selectedMember.customRoleDef && (
                        <p className="faa-explainer">Đang giữ: <CustomRoleBadge name={selectedMember.customRoleDef.name} icon={selectedMember.customRoleDef.icon} color={selectedMember.customRoleDef.color} specialChar={selectedMember.customRoleDef.specialChar} /></p>
                      )}
                      <div className="faa-inline-form">
                        <label className="faa-form-field">
                          <span>Vai trò</span>
                          <select value={staffRoleChoice} onChange={(event) => setStaffRoleChoice(event.target.value as RoleChoice)}>
                            <option value="NONE">Thành viên thường</option>
                            {canGrantStaffRoles && <option value="TEACHER">Giáo viên</option>}
                            {canGrantStaffRoles && <option value="MODERATOR">Moderator</option>}
                            {grantableRoles.map((role) => (
                              <option key={role.id} value={`custom:${role.id}`}>{role.specialChar ? `${role.specialChar} ` : ''}{role.name} · tùy chỉnh</option>
                            ))}
                          </select>
                        </label>
                        <button type="button" className="faa-action-button faa-action-button--accent" disabled={Boolean(actionBusy)} onClick={() => void saveStaffRole()}>
                          {actionBusy === 'role' ? <LoaderCircle className="faa-spin" size={14} /> : <Check size={14} />} Lưu vai trò
                        </button>
                      </div>
                      <p className="faa-explainer">Giáo viên/Moderator được cấm đăng, khoá chat và cảnh cáo thành viên; không thể cấp vai trò hoặc xem thống kê riêng. Vai trò tùy chỉnh mang đúng bộ quyền đã chọn khi tạo.</p>
                    </section>
                )}

                {isSuperAdmin && selectedMember.role !== 'SUPER_ADMIN' && (
                    <section className="faa-detail-section faa-premium-section">
                      <h4><Crown size={15} /> F-Forum Premium <span className="faa-no-charge">Cấp thủ công · không thu phí</span></h4>
                      <p className="faa-explainer">Huy hiệu Premium hiển thị trên hồ sơ. Tính năng này chưa xử lý thanh toán hay tự gia hạn.</p>
                      <label className="faa-form-field">
                        <span>Thời hạn cấp</span>
                        <select value={premiumDuration} onChange={(event) => setPremiumDuration(Number(event.target.value))}>
                          {PREMIUM_DURATIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                        </select>
                      </label>
                      <label className="faa-form-field">
                        <span>Lý do cấp/thu hồi</span>
                        <input value={premiumReason} onChange={(event) => setPremiumReason(event.target.value.slice(0, 500))} maxLength={500} placeholder="Ví dụ: tri ân đóng góp cộng đồng" />
                      </label>
                      <div className="faa-action-grid">
                        <button type="button" className="faa-action-button faa-action-button--premium" disabled={Boolean(actionBusy)} onClick={() => void setPremium('grant')}>
                          {actionBusy === 'premium' ? <LoaderCircle className="faa-spin" size={14} /> : <Crown size={14} />} Cấp Premium
                        </button>
                        {selectedMember.premium.active && (
                          <button type="button" className="faa-action-button faa-action-button--danger" disabled={Boolean(actionBusy)} onClick={() => void setPremium('revoke')}>
                            Thu hồi Premium
                          </button>
                        )}
                      </div>
                      {selectedMember.premium.active && <p className="faa-premium-until">{selectedMember.premium.until === 0 ? 'Gói vĩnh viễn' : `Hết hạn ${dateFmt(selectedMember.premium.until)}`}</p>}
                    </section>
                )}

                {actionError && <p role="alert" className="faa-alert faa-alert--error"><AlertTriangle size={15} />{actionError}</p>}
                {actionNotice && <p role="status" className="faa-alert faa-alert--success"><Check size={15} />{actionNotice}</p>}
              </div>
            </aside>
          </div>
        )}
        {quickAction && quickMember && (
          <MemberQuickAction
            kind={quickAction.kind}
            member={{ ...quickMember, customRole: quickMember.customRole ?? null }}
            roles={grantableRoles}
            allowStaffRoles={canGrantStaffRoles}
            onModerate={(action, durationMinutes, reason) => performModeration(quickMember, action, durationMinutes, reason)}
            onWarn={(reason) => performWarning(quickMember, reason)}
            onAssignRole={(choice) => performRoleChange(quickMember, choice)}
            onDone={(message) => { setQuickAction(null); setToast(message); }}
            onClose={() => setQuickAction(null)}
          />
        )}
      </section>
    </div>
  );
};

const MetricTile: FC<{
  icon: ReactNode;
  tone: 'mint' | 'violet' | 'amber' | 'cyan' | 'blue';
  label: string;
  value: string;
  note: string;
  index?: number;
}> = ({ icon, tone, label, value, note, index = 1 }) => (
  <article className="faa-tile faa-tile--metric cdl-01__tile" style={{ '--i': index } as CSSProperties}>
    <div className="faa-tile__top"><span className={`faa-tile__icon faa-${tone}`}>{icon}</span><span className="faa-tile__hint">{label}</span></div>
    <b className="faa-metric-value cdl-01__num">{value}</b>
    <p className="faa-tile__caption cdl-01__sub">{note}</p>
  </article>
);

const ActivityRow: FC<{ label: string; value: number; icon: ReactNode }> = ({ label, value, icon }) => (
  <div className="faa-activity-row"><span className="faa-activity-row__icon">{icon}</span><span>{label}</span><b>{numberFmt.format(value)}</b></div>
);

const Avatar: FC<{
  name: string;
  avatar: string;
  email: string;
  small?: boolean;
  large?: boolean;
}> = ({ name, avatar, email, small = false, large = false }) => {
  const sizeClass = large ? 'faa-avatar faa-avatar--large' : small ? 'faa-avatar faa-avatar--small' : 'faa-avatar';
  const hue = makeAvatarHue(email || name);
  return avatar ? (
    <img className={sizeClass} src={avatar} alt="" loading="lazy" />
  ) : (
    <span className={`${sizeClass} faa-avatar--fallback`} style={{ '--avatar-hue': hue } as CSSProperties} aria-hidden="true">{initials(name)}</span>
  );
};
