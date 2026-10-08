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
  Crown,
  Database,
  Eye,
  Filter,
  GraduationCap,
  LoaderCircle,
  MessageSquare,
  MessageSquareOff,
  RefreshCw,
  Search,
  Shield,
  ShieldCheck,
  Sparkles,
  UserRound,
  Users,
  CheckCircle,
  X,
} from 'lucide-react';
import type { User } from '../types';
import { authHeaders, postJson } from '../utils/session';
import { useEscapeKey } from '../utils/useEscapeKey';
import { PremiumMark } from './PremiumMark';
import './AdminInsightsModal.css';

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
}

interface AdminMember {
  id: string;
  email: string;
  name: string;
  avatar: string;
  role: string;
  userRole: 'SUPER_ADMIN' | 'CLUB_LEADER' | 'STUDENT';
  staffRole: 'MODERATOR' | 'TEACHER' | null;
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

const DURATION_OPTIONS = [
  { value: 15, label: '15 phút' },
  { value: 60, label: '1 giờ' },
  { value: 1440, label: '1 ngày' },
  { value: 10080, label: '7 ngày' },
  { value: 0, label: 'Vĩnh viễn' },
] as const;

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
}) => {
  const isSuperAdmin = currentUser.email.toLowerCase() === 'BroAmStuck@gmail.com' || currentUser.role === 'SUPER_ADMIN';
  const canModerate = isSuperAdmin || currentUser.staffRole === 'MODERATOR' || currentUser.staffRole === 'TEACHER';
  const [tab, setTab] = useState<'overview' | 'members'>(isSuperAdmin ? 'overview' : 'members');
  const [range, setRange] = useState<AdminInsightsRange>('7d');
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [chartMetric, setChartMetric] = useState<'uniqueVisitors' | 'messages' | 'activeSeconds'>('uniqueVisitors');
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | AdminMemberRole>('ALL');
  const [page, setPage] = useState(1);
  const [members, setMembers] = useState<AdminMember[]>([]);
  const [memberTotal, setMemberTotal] = useState(0);
  const [memberPages, setMemberPages] = useState(1);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState<string | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null);
  const [moderationDuration, setModerationDuration] = useState<number>(60);
  const [moderationReason, setModerationReason] = useState('');
  const [warningReason, setWarningReason] = useState('');
  const [staffRoleChoice, setStaffRoleChoice] = useState<'NONE' | 'MODERATOR' | 'TEACHER'>('NONE');
  const [premiumDuration, setPremiumDuration] = useState<number>(90);
  const [premiumReason, setPremiumReason] = useState('');
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const [manualRefreshing, setManualRefreshing] = useState(false);

  const selectedMember = useMemo(
    () => members.find((member) => member.email === selectedEmail) || null,
    [members, selectedEmail],
  );

  const loadAnalytics = useCallback(async () => {
    if (!isSuperAdmin) return;
    setAnalyticsLoading(true);
    try {
      const response = await fetch(`/api/admin/analytics?range=${encodeURIComponent(range)}`, {
        headers: authHeaders(),
      });
      const data = await response.json().catch(() => null);
      if (response.status !== 200 || !data?.success || !data.analytics) {
        setAnalyticsError(data?.message || `Không tải được thống kê (HTTP ${response.status}).`);
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
  }, [isSuperAdmin, range]);

  const loadMembers = useCallback(async (cancelled?: () => boolean) => {
    if (!canModerate) return;
    setMembersLoading(true);
    try {
      const params = new URLSearchParams({
        q: query.trim(),
        role: roleFilter,
        page: String(page),
        limit: '50',
      });
      const response = await fetch(`/api/admin/members?${params.toString()}`, { headers: authHeaders() });
      const data = await response.json().catch(() => null);
      if (cancelled?.()) return;
      if (response.status !== 200 || !data?.success) {
        setMembersError(data?.message || `Không tải được danh sách (HTTP ${response.status}).`);
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
  }, [canModerate, page, query, roleFilter]);

  useEffect(() => {
    if (!isOpen || tab !== 'overview' || !isSuperAdmin) return undefined;
    const initialTimer = window.setTimeout(() => { void loadAnalytics(); }, 0);
    const timer = window.setInterval(() => { void loadAnalytics(); }, 30_000);
    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(timer);
    };
  }, [isOpen, isSuperAdmin, loadAnalytics, tab]);

  useEffect(() => {
    if (!isOpen || tab !== 'members' || !canModerate) return undefined;
    let cancelled = false;
    const timer = window.setTimeout(() => { void loadMembers(() => cancelled); }, query ? 220 : 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [canModerate, isOpen, loadMembers, query, refreshTick, roleFilter, tab]);

  useEscapeKey(() => {
    if (selectedEmail) setSelectedEmail(null);
    else onClose();
  }, isOpen);

  const refreshAll = () => {
    setManualRefreshing(true);
    if (tab === 'overview' && isSuperAdmin) void loadAnalytics();
    if (tab === 'members') setRefreshTick((tick) => tick + 1);
  };

  const updateSelected = (email: string) => {
    setSelectedEmail(email);
    const member = members.find((row) => row.email === email);
    setStaffRoleChoice(member?.staffRole || 'NONE');
    setModerationReason('');
    setWarningReason('');
    setPremiumReason('');
    setActionError(null);
    setActionNotice(null);
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
    try {
      const { status, data } = await postJson('/api/admin/moderate', {
        email: selectedMember.email,
        action,
        durationMinutes: applying ? moderationDuration : undefined,
        reason: applying ? reason : '',
      });
      if (status !== 200 || !data?.success) {
        setActionError(data?.message || `Không thực hiện được thao tác (HTTP ${status}).`);
        return;
      }
      setActionNotice(data.changed ? 'Đã cập nhật trạng thái kiểm duyệt và ghi nhật ký.' : data.message || 'Trạng thái không đổi.');
      setModerationReason('');
      setRefreshTick((tick) => tick + 1);
    } catch {
      setActionError('Không kết nối được máy chủ; hãy tải lại trạng thái trước khi thử lại.');
    } finally {
      setActionBusy(null);
    }
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
    try {
      const { status, data } = await postJson('/api/admin/warn', { email: selectedMember.email, reason });
      if (status !== 200 || !data?.success) {
        setActionError(data?.message || `Không gửi được cảnh cáo (HTTP ${status}).`);
        return;
      }
      setWarningReason('');
      setActionNotice('Đã gửi cảnh cáo riêng cho thành viên và lưu nhật ký.');
      setRefreshTick((tick) => tick + 1);
    } catch {
      setActionError('Không kết nối được máy chủ để gửi cảnh cáo.');
    } finally {
      setActionBusy(null);
    }
  };

  const saveStaffRole = async () => {
    if (!selectedMember || !isSuperAdmin || actionBusy) return;
    setActionBusy('role');
    setActionError(null);
    setActionNotice(null);
    try {
      const { status, data } = await postJson('/api/admin/role', {
        email: selectedMember.email,
        staffRole: staffRoleChoice === 'NONE' ? null : staffRoleChoice,
        reason: staffRoleChoice === 'NONE' ? 'Thu hồi vai trò kiểm duyệt.' : `Cấp vai trò ${staffRoleChoice}.`,
      });
      if (status !== 200 || !data?.success) {
        setActionError(data?.message || `Không cập nhật được vai trò (HTTP ${status}).`);
        return;
      }
      setActionNotice(data.changed ? 'Đã cập nhật vai trò thành viên.' : 'Vai trò hiện tại không thay đổi.');
      setRefreshTick((tick) => tick + 1);
    } catch {
      setActionError('Không kết nối được máy chủ để cập nhật vai trò.');
    } finally {
      setActionBusy(null);
    }
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

  const maxChartValue = useMemo(() => {
    if (!analytics?.series.length) return 1;
    const values = analytics.series.map((point) => chartMetric === 'activeSeconds'
      ? point.activeSeconds
      : point[chartMetric]);
    return Math.max(1, ...values);
  }, [analytics, chartMetric]);

  if (!isOpen || !canModerate) return null;

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
          {isSuperAdmin && (
            <button type="button" className={tab === 'overview' ? 'is-active' : ''} onClick={() => setTab('overview')}>
              <Activity size={15} /> Tổng quan
            </button>
          )}
          <button type="button" className={tab === 'members' ? 'is-active' : ''} onClick={() => setTab('members')}>
            <Users size={15} /> Thành viên
            <span>{numberFmt.format(memberTotal)}</span>
          </button>
          <div className="faa-tabs__right">
            {tab === 'overview' && analytics && (
              <span className="faa-updated">Cập nhật {new Date(analytics.generatedAt).toLocaleTimeString('vi-VN')}</span>
            )}
            {!isSuperAdmin && <span className="faa-permission"><ShieldCheck size={13} /> {ROLE_LABELS[currentUser.staffRole || ''] || 'Nhân sự'}</span>}
          </div>
        </nav>

        <div className="faa-content">
          {tab === 'overview' && isSuperAdmin && (
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
                    <MetricTile
                      icon={<CalendarDays size={17} />}
                      tone="cyan"
                      label="Lượt mở site"
                      value={numberFmt.format(analytics.totals.visits)}
                      note={`${numberFmt.format(analytics.period.visits)} trong kỳ đang chọn`}
                      index={5}
                    />
                    <MetricTile
                      icon={<Eye size={17} />}
                      tone="blue"
                      label="Lượt xem phân khu"
                      value={numberFmt.format(analytics.totals.pageViews)}
                      note={`${numberFmt.format(analytics.period.pageViews)} trong kỳ đang chọn`}
                      index={6}
                    />

                    <article className="faa-tile faa-tile--chart cdl-01__tile cdl-01__wide" style={{ '--i': 7 } as CSSProperties}>
                      <div className="faa-chart-head">
                        <div>
                          <h3>Hoạt động theo thời gian</h3>
                          <p>{analytics.rangeLabel} · {numberFmt.format(analytics.period.uniqueVisitors)} lượt duy nhất</p>
                        </div>
                        <label className="faa-chart-select">
                          <span className="sr-only">Chọn dữ liệu biểu đồ</span>
                          <select value={chartMetric} onChange={(event) => setChartMetric(event.target.value as typeof chartMetric)}>
                            <option value="uniqueVisitors">Khách</option>
                            <option value="messages">Tin nhắn</option>
                            <option value="activeSeconds">Thời gian</option>
                          </select>
                        </label>
                      </div>
                      {analytics.series.length === 0 ? (
                        <div className="faa-chart-empty">Chưa có dữ liệu trong khoảng thời gian này.</div>
                      ) : (
                        <div className="faa-chart" role="img" aria-label={`Biểu đồ ${chartMetric} ${analytics.rangeLabel}`}>
                          {analytics.series.map((point) => {
                            const value = chartMetric === 'activeSeconds' ? point.activeSeconds : point[chartMetric];
                            const height = value > 0 ? Math.max(5, Math.round((value / maxChartValue) * 100)) : 2;
                            const titleValue = chartMetric === 'activeSeconds' ? durationLabel(value) : numberFmt.format(value);
                            return (
                              <div className="faa-chart__col" key={point.key} title={`${point.label}: ${titleValue}`}>
                                <span className="faa-chart__bar" style={{ height: `${height}%` }} />
                                <small>{point.label}</small>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      <div className="faa-chart-legend">
                        <span><i className="faa-dot faa-dot--cyan" /> Khách duy nhất</span>
                        <span><i className="faa-dot faa-dot--mint" /> {analytics.rangeLabel}</span>
                        <b>{numberFmt.format(analytics.period.messages)} tin nhắn</b>
                      </div>
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

              <div className="faa-member-table ct-03" aria-busy={membersLoading}>
                <div className="faa-member-head ct-03__head" aria-hidden="true">
                  <span>Thành viên</span><span>Vai trò & trạng thái</span><span>Hoạt động đã ghi nhận</span><span>Hồ sơ</span>
                </div>
                {membersLoading && members.length === 0 ? (
                  <div className="faa-loading"><LoaderCircle className="faa-spin" /> Đang tải danh sách thành viên…</div>
                ) : members.length === 0 ? (
                  <div className="faa-empty"><Users size={24} /><b>Chưa tìm thấy thành viên</b><span>Thử từ khoá khác hoặc bỏ bộ lọc vai trò.</span></div>
                ) : (
                  <div className="faa-member-list ct-03__body">
                    {members.map((member) => (
                      <article className="faa-member-row ct-03__row" key={member.email}>
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
                          {member.staffRole && (
                            <span className={`faa-role-pill faa-role-pill--${member.userRole.toLowerCase()}`}>
                              {ROLE_LABELS[member.userRole] || member.userRole}
                            </span>
                          )}
                          {member.premium.active && <PremiumMark user={{ premiumUntil: member.premium.until ?? undefined }} compact />}
                          {member.moderation.banned && <span className="faa-status-pill faa-status-pill--ban"><Ban size={12} /> Cấm đăng</span>}
                          {member.moderation.muted && <span className="faa-status-pill faa-status-pill--mute"><MessageSquareOff size={12} /> Khoá chat</span>}
                          {member.warningCount > 0 && <span className="faa-status-pill faa-status-pill--warning"><AlertTriangle size={12} /> {member.warningCount} cảnh cáo</span>}
                        </div>
                        <div className="faa-member-metrics ct-03__cell">
                          <span><Clock3 size={13} />{durationLabel(member.metrics.activeSeconds)}</span>
                          <span><MessageSquare size={13} />{numberFmt.format(member.metrics.messages)} tin</span>
                          <small>{member.metrics.visits} lượt · gần nhất {member.metrics.lastSeenAt ? dateFmt(member.metrics.lastSeenAt) : 'chưa ghi nhận'}</small>
                        </div>
                        <div className="faa-member-action ct-03__cell ct-03__actions">
                          <button type="button" className="faa-button faa-button--member" onClick={() => updateSelected(member.email)}>
                            <UserRound size={14} /> Quản lý
                          </button>
                        </div>
                      </article>
                    ))}
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
              <p className="faa-permission-note"><Shield size={13} /> Super Admin xem hồ sơ chi tiết và cấp vai trò/Premium. Giáo viên, Moderator được cảnh cáo, cấm đăng hoặc khoá chat; không thể cấp vai trò.</p>
            </div>
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
                  {selectedMember.profile?.bannerUrl && <img className="faa-profile-card__banner" src={selectedMember.profile.bannerUrl} alt="" />}
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
                  {(selectedMember.role === 'SUPER_ADMIN' || selectedMember.email.toLowerCase() === 'BroAmStuck@gmail.com') ? (
                    <p className="faa-protected"><ShieldCheck size={15} /> Tài khoản Super Admin được bảo vệ.</p>
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
                        {selectedMember.moderation.banned ? (
                          <button type="button" className="faa-action-button faa-action-button--good" disabled={Boolean(actionBusy)} onClick={() => void runModeration('unban')}>
                            {actionBusy === 'unban' ? <LoaderCircle className="faa-spin" size={14} /> : <Check size={14} />} Gỡ cấm đăng
                          </button>
                        ) : (
                          <button type="button" className="faa-action-button faa-action-button--danger" disabled={Boolean(actionBusy)} onClick={() => void runModeration('ban')}>
                            {actionBusy === 'ban' ? <LoaderCircle className="faa-spin" size={14} /> : <Ban size={14} />} Cấm đăng
                          </button>
                        )}
                        {selectedMember.moderation.muted ? (
                          <button type="button" className="faa-action-button faa-action-button--good" disabled={Boolean(actionBusy)} onClick={() => void runModeration('unmute')}>
                            {actionBusy === 'unmute' ? <LoaderCircle className="faa-spin" size={14} /> : <Check size={14} />} Mở khoá chat
                          </button>
                        ) : (
                          <button type="button" className="faa-action-button faa-action-button--warn" disabled={Boolean(actionBusy)} onClick={() => void runModeration('mute')}>
                            {actionBusy === 'mute' ? <LoaderCircle className="faa-spin" size={14} /> : <MessageSquareOff size={14} />} Khoá chat
                          </button>
                        )}
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
                  <button type="button" className="faa-button faa-button--warning" disabled={Boolean(actionBusy) || selectedMember.role === 'SUPER_ADMIN'} onClick={() => void sendWarning()}>
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

                {isSuperAdmin && selectedMember.role !== 'SUPER_ADMIN' && (
                  <>
                    <section className="faa-detail-section">
                      <h4><BadgeCheck size={15} /> Cấp vai trò</h4>
                      <p className="faa-explainer">Chỉ Super Admin có quyền cấp/thu hồi; không thể tạo thêm Super Admin từ giao diện này.</p>
                      <div className="faa-inline-form">
                        <label className="faa-form-field">
                          <span>Vai trò kiểm duyệt</span>
                          <select value={staffRoleChoice} onChange={(event) => setStaffRoleChoice(event.target.value as typeof staffRoleChoice)}>
                            <option value="NONE">Thành viên thường</option>
                            <option value="TEACHER">Giáo viên</option>
                            <option value="MODERATOR">Moderator</option>
                          </select>
                        </label>
                        <button type="button" className="faa-action-button faa-action-button--accent" disabled={Boolean(actionBusy)} onClick={() => void saveStaffRole()}>
                          {actionBusy === 'role' ? <LoaderCircle className="faa-spin" size={14} /> : <Check size={14} />} Lưu vai trò
                        </button>
                      </div>
                      <p className="faa-explainer">Giáo viên/Moderator được cấm đăng, khoá chat và cảnh cáo thành viên; không thể cấp vai trò hoặc xem thống kê riêng.</p>
                    </section>

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
                  </>
                )}

                {actionError && <p role="alert" className="faa-alert faa-alert--error"><AlertTriangle size={15} />{actionError}</p>}
                {actionNotice && <p role="status" className="faa-alert faa-alert--success"><Check size={15} />{actionNotice}</p>}
              </div>
            </aside>
          </div>
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
