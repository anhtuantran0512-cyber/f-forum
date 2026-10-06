/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Activity,
  AlertTriangle,
  Check,
  CheckCircle2,
  Clock3,
  FileText,
  Flag,
  History,
  LayoutDashboard,
  LockKeyhole,
  MessageCircle,
  MessagesSquare,
  RefreshCw,
  Search,
  ShieldCheck,
  UnlockKeyhole,
  UsersRound,
  Volume2,
  VolumeX,
  X,
  Trash2,
} from 'lucide-react';
import type { ChatMessage, ClubPost, Question, Solution, User, UserRole } from '../types';

interface AdminAccount {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: UserRole;
  level: number;
  joinedAt: string;
  accountLocked: boolean;
  lockedAt: string;
  lockReason: string;
  chatMuted: boolean;
  mutedAt: string;
  mutedUntil: number | null;
  muteReason: string;
}

interface AdminReport {
  id: string;
  reporterId: string;
  reporterName: string;
  reporterEmail: string;
  reportedUserId: string;
  reportedUserName: string;
  reason: string;
  details: string;
  createdAt: string;
  status: 'open' | 'resolved' | 'dismissed';
  reviewedAt: string;
  reviewNote: string;
}

interface AdminAuditEvent {
  id: string;
  actorId: string;
  actorName: string;
  action: string;
  targetId: string;
  targetName: string;
  reason: string;
  createdAt: string;
}

interface AdminMetrics {
  members: number;
  questions: number;
  answers: number;
  chatMessages: number;
  clubPosts: number;
  openReports: number;
  lockedAccounts: number;
  mutedAccounts: number;
}

interface AdminContentSnapshot {
  questions: Question[];
  solutions: Solution[];
  chatMessages: ChatMessage[];
  clubPosts: ClubPost[];
}

interface AdminSettingsSnapshot {
  schemaVersion: number;
  storage: string;
  singleInstanceSessions: boolean;
  sessionTtlHours: number;
  sessionCookie: string;
  passwordHash: string;
  socialLogin: { google: boolean; facebook: boolean };
  roles: UserRole[];
  superAdminCount: number;
}

interface AdminConsoleSnapshot {
  metrics: AdminMetrics;
  accounts: AdminAccount[];
  reports: AdminReport[];
  auditLog: AdminAuditEvent[];
  content: AdminContentSnapshot | null;
  settings: AdminSettingsSnapshot | null;
  permissions: string[];
}

type AdminTab = 'overview' | 'analytics' | 'reports' | 'members' | 'content' | 'audit' | 'settings';
type ContentKind = 'question' | 'answer' | 'chat' | 'club-post';
type ContentFilter = 'all' | ContentKind;
type ModerationAction = 'mute' | 'unmute' | 'lock' | 'unlock';
type ReportStatus = 'open' | 'resolved' | 'dismissed';

interface AdminContentItem {
  id: string;
  kind: ContentKind;
  title: string;
  body: string;
  authorName: string;
  createdAt: string;
  timestamp: number;
}

type PendingAction =
  | { kind: 'user'; account: AdminAccount; action: ModerationAction }
  | { kind: 'role'; account: AdminAccount; nextRole: UserRole }
  | { kind: 'delete-user'; account: AdminAccount }
  | { kind: 'content'; item: AdminContentItem }
  | { kind: 'report'; report: AdminReport; status: ReportStatus };

interface AdminConsoleProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onDeleteQuestion: (id: string, reason?: string) => Promise<boolean>;
  onDeleteSolution: (id: string, reason?: string) => Promise<boolean>;
  onDeleteChatMessage: (id: string, reason?: string) => Promise<boolean>;
  onDeleteClubPost: (id: string, reason?: string) => Promise<boolean>;
}

const EMPTY_ACCOUNTS: AdminAccount[] = [];
const EMPTY_REPORTS: AdminReport[] = [];
const EMPTY_AUDIT_LOG: AdminAuditEvent[] = [];

const ROLE_RANK: Record<UserRole, number> = { user: 0, moderator: 1, admin: 2, super_admin: 3 };

const EMPTY_METRICS: AdminMetrics = {
  members: 0,
  questions: 0,
  answers: 0,
  chatMessages: 0,
  clubPosts: 0,
  openReports: 0,
  lockedAccounts: 0,
  mutedAccounts: 0,
};

const TABS: Array<{ id: AdminTab; label: string; icon: React.ElementType; permission: string }> = [
  { id: 'overview', label: 'Tổng quan', icon: LayoutDashboard, permission: 'analytics.view' },
  { id: 'analytics', label: 'Phân tích', icon: Activity, permission: 'analytics.view' },
  { id: 'reports', label: 'Báo cáo', icon: Flag, permission: 'reports.view' },
  { id: 'members', label: 'Thành viên', icon: UsersRound, permission: 'users.view' },
  { id: 'content', label: 'Nội dung', icon: FileText, permission: 'posts.view' },
  { id: 'audit', label: 'Nhật ký', icon: History, permission: 'logs.view' },
  { id: 'settings', label: 'Cài đặt', icon: LockKeyhole, permission: 'settings.view' },
];

const TAB_SUBTITLES: Record<AdminTab, string> = {
  overview: 'Dashboard vận hành và hàng đợi cần xử lý.',
  analytics: 'Số liệu tổng hợp do máy chủ tính trực tiếp từ dữ liệu hiện tại.',
  reports: 'Tiếp nhận, xử lý hoặc mở lại các báo cáo vi phạm.',
  members: 'Tìm tài khoản, quản lý quyền và áp dụng chế tài có thể đảo ngược.',
  content: 'Gỡ câu hỏi, lời giải, tin nhắn và bài viết câu lạc bộ.',
  audit: 'Lịch sử thao tác quản trị được ghi ở phía máy chủ.',
  settings: 'Cấu hình bảo mật và đăng nhập đang có hiệu lực.',
};

const ACTION_LABELS: Record<string, string> = {
  mute_chat: 'Tạm ngưng nhắn tin',
  unmute_chat: 'Gỡ mute chat',
  lock_account: 'Khóa tài khoản',
  unlock_account: 'Mở khóa tài khoản',
  resolve_report: 'Đã xử lý báo cáo',
  dismiss_report: 'Đã đóng báo cáo',
  reopen_report: 'Mở lại báo cáo',
  delete_question: 'Xóa câu hỏi',
  edit_question: 'Sửa câu hỏi',
  delete_solution: 'Xóa lời giải',
  delete_chat_message: 'Thu hồi tin nhắn',
  delete_club_post: 'Xóa bài viết CLB',
  update_about: 'Cập nhật Khu Vinh Danh',
  role_change: 'Thay đổi vai trò',
  delete_user: 'Xóa tài khoản',
};

const formatDate = (value?: string | number | null) => {
  if (value === null || value === undefined || value === '') return '—';
  const date = typeof value === 'number' ? new Date(value) : new Date(value);
  if (!Number.isFinite(date.getTime())) return '—';
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
};

const clipText = (value: string, length = 180) => {
  const clean = (value || '').trim();
  return clean.length > length ? `${clean.slice(0, length)}…` : clean;
};

export const AdminConsole: React.FC<AdminConsoleProps> = ({
  isOpen,
  onClose,
  currentUser,
  onDeleteQuestion,
  onDeleteSolution,
  onDeleteChatMessage,
  onDeleteClubPost,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [snapshot, setSnapshot] = useState<AdminConsoleSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [dialogError, setDialogError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [reportFilter, setReportFilter] = useState<ReportStatus | 'all'>('open');
  const [contentFilter, setContentFilter] = useState<ContentFilter>('all');
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [muteDuration, setMuteDuration] = useState('60');
  const [currentPassword, setCurrentPassword] = useState('');
  const [accountConfirmation, setAccountConfirmation] = useState('');

  const fetchSnapshot = useCallback(async (): Promise<AdminConsoleSnapshot> => {
    const response = await fetch('/api/admin/console', {
      credentials: 'same-origin',
      cache: 'no-store',
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.success !== true || !result.data) {
      throw new Error(result.message || 'Không thể tải dữ liệu quản trị.');
    }
    return result.data as AdminConsoleSnapshot;
  }, []);

  const loadSnapshot = useCallback(async (showSpinner = true) => {
    if (showSpinner) setIsLoading(true);
    setLoadError('');
    try {
      setSnapshot(await fetchSnapshot());
    } catch (error) {
      setSnapshot(null);
      setLoadError(error instanceof Error ? error.message : 'Không thể tải dữ liệu quản trị.');
    } finally {
      if (showSpinner) setIsLoading(false);
    }
  }, [fetchSnapshot]);

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    fetchSnapshot().then(data => {
      if (active) setSnapshot(data);
    }).catch(error => {
      if (active) {
        setSnapshot(null);
        setLoadError(error instanceof Error ? error.message : 'Không thể tải dữ liệu quản trị.');
      }
    }).finally(() => {
      if (active) setIsLoading(false);
    });
    return () => { active = false; };
  }, [isOpen, fetchSnapshot]);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (pendingAction) {
          setPendingAction(null);
          setActionReason('');
          setCurrentPassword('');
          setAccountConfirmation('');
          setDialogError('');
        } else {
          onClose();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, pendingAction]);

  const contentItems = useMemo<AdminContentItem[]>(() => {
    const content = snapshot?.content;
    if (!content) return [];
    const questionItems: AdminContentItem[] = content.questions.map(question => ({
      id: question.id,
      kind: 'question',
      title: question.title || 'Câu hỏi không tiêu đề',
      body: question.content || '',
      authorName: question.isAnonymous ? (question.anonymousAlias || 'Ẩn danh') : question.authorName,
      createdAt: question.createdAt || '',
      timestamp: question.createdAtMs || Date.parse(question.createdAt || '') || 0,
    }));
    const answerItems: AdminContentItem[] = content.solutions.map(solution => {
      const parent = content.questions.find(question => question.id === solution.questionId);
      return {
        id: solution.id,
        kind: 'answer',
        title: parent ? `Trả lời: ${parent.title}` : 'Lời giải',
        body: solution.content || '',
        authorName: solution.authorName || 'Thành viên',
        createdAt: solution.createdAt || '',
        timestamp: solution.createdAtMs || Date.parse(solution.createdAt || '') || 0,
      };
    });
    const chatItems: AdminContentItem[] = content.chatMessages.map(message => ({
      id: message.id,
      kind: 'chat',
      title: `Tin nhắn • #${message.channelId}`,
      body: message.content || '',
      authorName: message.authorName || 'Thành viên',
      createdAt: message.timestamp || '',
      timestamp: message.timestampMs || 0,
    }));
    const postItems: AdminContentItem[] = content.clubPosts.map(post => ({
      id: post.id,
      kind: 'club-post',
      title: post.title || 'Bài viết câu lạc bộ',
      body: post.content || '',
      authorName: post.authorName || 'Thành viên',
      createdAt: post.createdAt || '',
      timestamp: Date.parse(post.createdAt || '') || 0,
    }));
    return [...questionItems, ...answerItems, ...chatItems, ...postItems]
      .sort((left, right) => right.timestamp - left.timestamp);
  }, [snapshot?.content]);

  const metrics = snapshot?.metrics || EMPTY_METRICS;
  const accounts = snapshot?.accounts || EMPTY_ACCOUNTS;
  const reports = snapshot?.reports || EMPTY_REPORTS;
  const auditLog = snapshot?.auditLog || EMPTY_AUDIT_LOG;
  const settings = snapshot?.settings || null;
  const hasPermission = (permission: string) => Boolean(snapshot?.permissions.includes(permission));
  const visibleTabs = TABS.filter(tab => hasPermission(tab.permission));
  const isBusyLoading = isLoading || (isOpen && !snapshot && !loadError);

  const filteredAccounts = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return accounts;
    return accounts.filter(account =>
      [account.name, account.email, account.id].some(value => value.toLowerCase().includes(query)),
    );
  }, [accounts, search]);

  const filteredReports = useMemo(() => {
    const query = search.trim().toLowerCase();
    return reports.filter(report => {
      const matchesStatus = reportFilter === 'all' || report.status === reportFilter;
      const matchesQuery = !query || [
        report.reportedUserName,
        report.reportedUserId,
        report.reporterName,
        report.reporterEmail,
        report.reason,
        report.details,
      ].some(value => (value || '').toLowerCase().includes(query));
      return matchesStatus && matchesQuery;
    });
  }, [reports, reportFilter, search]);

  const filteredContent = useMemo(() => {
    const query = search.trim().toLowerCase();
    return contentItems.filter(item => {
      const matchesKind = contentFilter === 'all' || item.kind === contentFilter;
      const matchesQuery = !query || [item.title, item.body, item.authorName, item.id].some(value => value.toLowerCase().includes(query));
      return matchesKind && matchesQuery;
    });
  }, [contentItems, contentFilter, search]);

  const openAction = (action: PendingAction) => {
    setPendingAction(action);
    setActionReason('');
    setCurrentPassword('');
    setAccountConfirmation('');
    setDialogError('');
    if (action.kind === 'user' && action.action === 'mute') setMuteDuration('60');
  };

  const closeAction = () => {
    if (isSubmitting) return;
    setPendingAction(null);
    setActionReason('');
    setCurrentPassword('');
    setAccountConfirmation('');
    setDialogError('');
  };

  const submitAction = async () => {
    if (!pendingAction || isSubmitting) return;
    const reason = actionReason.trim();
    if (pendingAction.kind !== 'report' && reason.length < 5) {
      setDialogError('Ghi ít nhất 5 ký tự để lưu lại căn cứ xử lý.');
      return;
    }
    if ((pendingAction.kind === 'role' || pendingAction.kind === 'delete-user') && !currentPassword) {
      setDialogError('Nhập lại mật khẩu hiện tại để xác minh thao tác nhạy cảm.');
      return;
    }
    if (pendingAction.kind === 'delete-user' && accountConfirmation !== pendingAction.account.email) {
      setDialogError('Email xác nhận chưa khớp với tài khoản cần xóa.');
      return;
    }
    setIsSubmitting(true);
    setDialogError('');
    setNotice('');
    try {
      let success = false;
      if (pendingAction.kind === 'user') {
        const response = await fetch('/api/admin/users/moderation', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: pendingAction.account.id,
            action: pendingAction.action,
            reason,
            ...(pendingAction.action === 'mute' ? { durationMinutes: Number(muteDuration) } : {}),
          }),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || result.success !== true) throw new Error(result.message || 'Thao tác đã bị từ chối.');
        success = true;
      } else if (pendingAction.kind === 'role') {
        const response = await fetch('/api/admin/users/role', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: pendingAction.account.id,
            role: pendingAction.nextRole,
            reason,
            currentPassword,
          }),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || result.success !== true) throw new Error(result.message || 'Không thể thay đổi vai trò.');
        success = true;
      } else if (pendingAction.kind === 'delete-user') {
        const response = await fetch('/api/admin/users/delete', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: pendingAction.account.id,
            reason,
            confirmation: accountConfirmation,
            currentPassword,
          }),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || result.success !== true) throw new Error(result.message || 'Không thể xóa tài khoản.');
        success = true;
      } else if (pendingAction.kind === 'report') {
        const response = await fetch('/api/admin/reports/review', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reportId: pendingAction.report.id,
            status: pendingAction.status,
            reviewNote: reason,
          }),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || result.success !== true) throw new Error(result.message || 'Không thể cập nhật báo cáo.');
        success = true;
      } else {
        switch (pendingAction.item.kind) {
          case 'question':
            success = await onDeleteQuestion(pendingAction.item.id, reason);
            break;
          case 'answer':
            success = await onDeleteSolution(pendingAction.item.id, reason);
            break;
          case 'chat':
            success = await onDeleteChatMessage(pendingAction.item.id, reason);
            break;
          case 'club-post':
            success = await onDeleteClubPost(pendingAction.item.id, reason);
            break;
        }
        if (!success) throw new Error('Máy chủ chưa xác nhận thao tác. Nội dung vẫn được giữ nguyên.');
      }
      if (!success) return;
      const successText = pendingAction.kind === 'user'
        ? pendingAction.action === 'mute' ? 'Đã áp dụng mute chat.'
          : pendingAction.action === 'unmute' ? 'Đã gỡ mute chat.'
            : pendingAction.action === 'lock' ? 'Đã khóa tài khoản và thu hồi các phiên đăng nhập.'
              : 'Đã mở khóa tài khoản.'
        : pendingAction.kind === 'role' ? 'Vai trò đã được cập nhật; các phiên của tài khoản đó đã bị thu hồi.'
          : pendingAction.kind === 'delete-user' ? 'Tài khoản và các phiên đăng nhập liên quan đã được xóa.'
            : pendingAction.kind === 'report'
              ? pendingAction.status === 'open' ? 'Đã mở lại báo cáo.' : pendingAction.status === 'resolved' ? 'Đã đánh dấu báo cáo đã xử lý.' : 'Đã đóng báo cáo.'
              : 'Đã gỡ nội dung khỏi hệ thống.';
      setNotice(successText);
      setPendingAction(null);
      setActionReason('');
      setCurrentPassword('');
      setAccountConfirmation('');
      await loadSnapshot(false);
    } catch (error) {
      setDialogError(error instanceof Error ? error.message : 'Không thể lưu thao tác. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const metricCards = [
    { label: 'Thành viên', value: metrics.members, icon: UsersRound, tone: 'text-cyan-300 bg-cyan-400/10 border-cyan-300/20' },
    { label: 'Báo cáo đang mở', value: metrics.openReports, icon: Flag, tone: 'text-rose-300 bg-rose-400/10 border-rose-300/20' },
    { label: 'Tài khoản khóa', value: metrics.lockedAccounts, icon: LockKeyhole, tone: 'text-orange-300 bg-orange-400/10 border-orange-300/20' },
    { label: 'Đang mute chat', value: metrics.mutedAccounts, icon: VolumeX, tone: 'text-amber-300 bg-amber-400/10 border-amber-300/20' },
    { label: 'Câu hỏi · Lời giải', value: `${metrics.questions} · ${metrics.answers}`, icon: FileText, tone: 'text-indigo-300 bg-indigo-400/10 border-indigo-300/20' },
    { label: 'Chat · Bài CLB', value: `${metrics.chatMessages} · ${metrics.clubPosts}`, icon: MessagesSquare, tone: 'text-emerald-300 bg-emerald-400/10 border-emerald-300/20' },
  ];

  const renderUserRow = (account: AdminAccount) => {
    const actorRank = currentUser ? ROLE_RANK[currentUser.role] : 0;
    const targetRank = ROLE_RANK[account.role];
    const protectedAccount = account.id === currentUser?.id || targetRank >= actorRank || account.role === 'super_admin';
    const canChangeRole = hasPermission('users.role') && account.id !== currentUser?.id && account.role !== 'super_admin';
    const canDeleteAccount = hasPermission('users.delete') && account.id !== currentUser?.id && targetRank < actorRank && account.role !== 'super_admin';
    return (
      <article key={account.id} className="rounded-2xl border border-white/10 bg-black/15 p-3.5 sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <img src={account.avatar} alt="" className="h-11 w-11 shrink-0 rounded-2xl border border-white/10 object-cover" loading="lazy" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="truncate text-sm font-bold text-white">{account.name}</h3>
                <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold tracking-wide ${account.role === 'super_admin' ? 'border-amber-300/30 bg-amber-400/10 text-amber-200' : 'border-white/10 bg-white/5 text-neutral-300'}`}>
                  {account.role.replace('_', ' ').toUpperCase()}
                </span>
                {account.accountLocked && <span className="rounded-full border border-rose-300/25 bg-rose-400/10 px-2 py-0.5 text-[9px] font-bold text-rose-200">ĐANG KHÓA</span>}
                {account.chatMuted && <span className="rounded-full border border-orange-300/25 bg-orange-400/10 px-2 py-0.5 text-[9px] font-bold text-orange-200">MUTE CHAT</span>}
              </div>
              <p className="mt-1 truncate text-[11px] text-neutral-300">{account.email}</p>
              {(account.accountLocked || account.chatMuted) && (
                <p className="mt-1.5 line-clamp-2 text-[10px] text-amber-100/65">
                  {account.accountLocked ? `Khóa: ${account.lockReason || 'Không có ghi chú'}` : ''}
                  {account.accountLocked && account.chatMuted ? ' · ' : ''}
                  {account.chatMuted ? `Mute: ${account.muteReason || 'Không có ghi chú'}${account.mutedUntil ? ` · đến ${formatDate(account.mutedUntil)}` : ' · vô thời hạn'}` : ''}
                </p>
              )}
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
            <button
              type="button"
              disabled={protectedAccount}
              onClick={() => openAction({ kind: 'user', account, action: account.chatMuted ? 'unmute' : 'mute' })}
              className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300/20 bg-amber-400/10 px-3 py-2 text-[10px] font-bold text-amber-100 transition hover:bg-amber-400/20 disabled:cursor-not-allowed disabled:opacity-35"
              title={protectedAccount ? 'Không thể áp dụng chế tài lên tài khoản có quyền ngang/cao hơn.' : undefined}
            >
              {account.chatMuted ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
              {account.chatMuted ? 'Gỡ mute' : 'Mute chat'}
            </button>
            <button
              type="button"
              disabled={protectedAccount}
              onClick={() => openAction({ kind: 'user', account, action: account.accountLocked ? 'unlock' : 'lock' })}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-[10px] font-bold transition disabled:cursor-not-allowed disabled:opacity-35 ${account.accountLocked ? 'border-emerald-300/20 bg-emerald-400/10 text-emerald-100 hover:bg-emerald-400/20' : 'border-rose-300/20 bg-rose-400/10 text-rose-100 hover:bg-rose-400/20'}`}
              title={protectedAccount ? 'Không thể áp dụng chế tài lên tài khoản có quyền ngang/cao hơn.' : undefined}
            >
              {account.accountLocked ? <UnlockKeyhole className="h-3.5 w-3.5" /> : <LockKeyhole className="h-3.5 w-3.5" />}
              {account.accountLocked ? 'Mở khóa' : 'Khóa tài khoản'}
            </button>
            {canChangeRole && (
              <select
                aria-label={`Đổi vai trò của ${account.name}`}
                value={account.role}
                onChange={event => openAction({ kind: 'role', account, nextRole: event.target.value as UserRole })}
                className="rounded-xl border border-violet-300/20 bg-violet-400/10 px-3 py-2 text-[10px] font-bold text-violet-100 outline-none focus:border-violet-200/50"
              >
                {(['user', 'moderator', 'admin', 'super_admin'] as UserRole[]).map(role => <option key={role} value={role} className="bg-slate-900">{role.replace('_', ' ').toUpperCase()}</option>)}
              </select>
            )}
            {canDeleteAccount && (
              <button type="button" onClick={() => openAction({ kind: 'delete-user', account })} className="inline-flex items-center gap-1.5 rounded-xl border border-rose-300/20 bg-rose-400/10 px-3 py-2 text-[10px] font-bold text-rose-100 transition hover:bg-rose-400/20">
                <Trash2 className="h-3.5 w-3.5" /> Xóa tài khoản
              </button>
            )}
          </div>
        </div>
      </article>
    );
  };

  const renderContentRow = (item: AdminContentItem) => {
    const kindLabel = item.kind === 'question' ? 'CÂU HỎI' : item.kind === 'answer' ? 'LỜI GIẢI' : item.kind === 'chat' ? 'CHAT' : 'BÀI CLB';
    return (
      <article key={`${item.kind}:${item.id}`} className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/15 p-3.5 sm:flex-row sm:items-start sm:p-4">
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-2 py-0.5 text-[9px] font-bold tracking-wider text-cyan-100">{kindLabel}</span>
            <span className="text-[10px] text-neutral-400">{item.authorName} · {formatDate(item.timestamp || item.createdAt)}</span>
          </div>
          <h3 className="text-xs font-bold text-white">{clipText(item.title, 120)}</h3>
          <p className="mt-1.5 whitespace-pre-wrap break-words text-[11px] leading-relaxed text-neutral-300">{clipText(item.body, 240) || 'Không có nội dung văn bản.'}</p>
          <p className="mt-2 truncate font-mono text-[9px] text-neutral-500">ID: {item.id}</p>
        </div>
        {hasPermission('posts.delete') && (
          <button
            type="button"
            onClick={() => openAction({ kind: 'content', item })}
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-rose-300/20 bg-rose-400/10 px-3 py-2 text-[10px] font-bold text-rose-100 transition hover:bg-rose-400/20"
          >
            <Trash2 className="h-3.5 w-3.5" /> Gỡ nội dung
          </button>
        )}
      </article>
    );
  };

  const renderReportRow = (report: AdminReport) => (
    <article key={report.id} className="rounded-2xl border border-white/10 bg-black/15 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold tracking-wider ${report.status === 'open' ? 'border-rose-300/25 bg-rose-400/10 text-rose-100' : report.status === 'resolved' ? 'border-emerald-300/25 bg-emerald-400/10 text-emerald-100' : 'border-white/15 bg-white/5 text-neutral-300'}`}>
              {report.status === 'open' ? 'ĐANG MỞ' : report.status === 'resolved' ? 'ĐÃ XỬ LÝ' : 'ĐÃ ĐÓNG'}
            </span>
            <span className="text-[10px] text-neutral-400">{formatDate(report.createdAt)}</span>
          </div>
          <h3 className="mt-2 text-sm font-bold text-white">{report.reason || 'Báo cáo vi phạm'}</h3>
          <p className="mt-1 text-[11px] text-neutral-300">Đối tượng: <strong className="text-amber-100">{report.reportedUserName || 'Tài khoản vi phạm'}</strong> · Người gửi: {report.reporterName || 'Ẩn danh'}</p>
          {report.details && <p className="mt-2 whitespace-pre-wrap break-words rounded-xl border border-white/5 bg-white/[0.025] p-3 text-[11px] leading-relaxed text-neutral-300">{report.details}</p>}
          <p className="mt-2 truncate font-mono text-[9px] text-neutral-500">Report {report.id} · User {report.reportedUserId || '—'}</p>
          {report.reviewNote && <p className="mt-2 text-[10px] text-emerald-100/70">Ghi chú xử lý: {report.reviewNote}</p>}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {hasPermission('users.view') && <button
            type="button"
            onClick={() => { setActiveTab('members'); setSearch(report.reportedUserId); }}
            className="rounded-xl border border-cyan-300/20 bg-cyan-400/10 px-3 py-2 text-[10px] font-bold text-cyan-100 transition hover:bg-cyan-400/20"
          >Tìm thành viên</button>}
          {hasPermission('reports.resolve') && report.status !== 'resolved' && (
            <button type="button" onClick={() => openAction({ kind: 'report', report, status: 'resolved' })} className="inline-flex items-center gap-1 rounded-xl border border-emerald-300/20 bg-emerald-400/10 px-3 py-2 text-[10px] font-bold text-emerald-100 transition hover:bg-emerald-400/20">
              <Check className="h-3.5 w-3.5" /> Xử lý xong
            </button>
          )}
          {hasPermission('reports.resolve') && (report.status === 'open' ? (
            <button type="button" onClick={() => openAction({ kind: 'report', report, status: 'dismissed' })} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[10px] font-bold text-neutral-200 transition hover:bg-white/10">Đóng</button>
          ) : (
            <button type="button" onClick={() => openAction({ kind: 'report', report, status: 'open' })} className="rounded-xl border border-amber-300/20 bg-amber-400/10 px-3 py-2 text-[10px] font-bold text-amber-100 transition hover:bg-amber-400/20">Mở lại</button>
          ))}
        </div>
      </div>
    </article>
  );

  if (!isOpen || typeof document === 'undefined') return null;

  const pendingTitle = pendingAction?.kind === 'user'
    ? pendingAction.action === 'mute' ? 'Tạm ngưng quyền nhắn tin'
      : pendingAction.action === 'unmute' ? 'Gỡ mute chat'
        : pendingAction.action === 'lock' ? 'Khóa tài khoản'
          : 'Mở khóa tài khoản'
    : pendingAction?.kind === 'role' ? 'Thay đổi vai trò tài khoản'
      : pendingAction?.kind === 'delete-user' ? 'Xóa tài khoản vĩnh viễn'
        : pendingAction?.kind === 'content' ? 'Gỡ nội dung khỏi diễn đàn'
          : pendingAction?.status === 'resolved' ? 'Đánh dấu báo cáo đã xử lý'
            : pendingAction?.status === 'dismissed' ? 'Đóng báo cáo'
              : 'Mở lại báo cáo';

  const pendingDescription = pendingAction?.kind === 'user'
    ? `${pendingAction.account.name} · ${pendingAction.account.email}`
    : pendingAction?.kind === 'role' ? `${pendingAction.account.name}: ${pendingAction.account.role.replace('_', ' ')} → ${pendingAction.nextRole.replace('_', ' ')}`
      : pendingAction?.kind === 'delete-user' ? `Tài khoản ${pendingAction.account.name} (${pendingAction.account.email}) cùng các nội dung và phiên liên quan sẽ bị xóa.`
        : pendingAction?.kind === 'content' ? `${pendingAction.item.title} · ${pendingAction.item.authorName}`
          : pendingAction ? `${pendingAction.report.reportedUserName} · ${pendingAction.report.reason}` : '';

  const content = (
    <div className="fixed inset-0 z-[160] flex items-stretch justify-center bg-slate-950/65 p-0 backdrop-blur-md sm:p-3 lg:p-5" onMouseDown={event => { if (event.target === event.currentTarget && !pendingAction) onClose(); }}>
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Bảng điều khiển quản trị"
        className="admin-console liquid-glass relative flex h-full max-h-[100dvh] w-full max-w-[1540px] flex-col overflow-hidden rounded-none border border-white/10 sm:rounded-[28px]"
      >
        <div className="pointer-events-none absolute -right-24 -top-36 h-96 w-96 rounded-full bg-amber-400/[0.09] blur-[90px]" aria-hidden="true" />
        <div className="pointer-events-none absolute -bottom-44 left-1/4 h-96 w-96 rounded-full bg-cyan-500/[0.07] blur-[90px]" aria-hidden="true" />
        <div className="relative z-[1] flex min-h-0 flex-1 flex-col">
          <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4 py-3.5 sm:px-6 sm:py-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-amber-300/25 bg-amber-400/10 text-amber-200 shadow-[0_0_30px_rgba(251,191,36,0.08)]">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate text-[9px] font-bold tracking-[0.25em] text-amber-200/75">F-FORUM · TRUST & SAFETY</p>
                  <span className="hidden rounded-full border border-emerald-300/20 bg-emerald-400/10 px-2 py-0.5 text-[8px] font-bold tracking-wider text-emerald-100 sm:inline-flex">SERVER VERIFIED</span>
                </div>
                <h1 className="truncate text-base font-bold text-white sm:text-lg">Trung tâm quản trị</h1>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="hidden max-w-44 truncate text-[10px] text-neutral-300 sm:inline">{currentUser?.name || 'Quản trị viên'}</span>
              <button type="button" onClick={() => void loadSnapshot()} disabled={isBusyLoading} aria-label="Làm mới dữ liệu" title="Làm mới dữ liệu" className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5 text-neutral-200 transition hover:bg-white/10 disabled:opacity-50">
                <RefreshCw className={`h-4 w-4 ${isBusyLoading ? 'animate-spin' : ''}`} />
              </button>
              <button type="button" onClick={onClose} aria-label="Đóng Trung tâm quản trị" className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5 text-neutral-200 transition hover:border-rose-300/30 hover:bg-rose-400/10 hover:text-rose-100">
                <X className="h-4 w-4" />
              </button>
            </div>
          </header>

          <div className="flex min-h-0 flex-1">
            <aside className="hidden w-[218px] shrink-0 flex-col border-r border-white/10 p-3.5 md:flex">
              <p className="px-3 pb-2 pt-1 text-[9px] font-bold tracking-[0.22em] text-neutral-500">WORKSPACE</p>
              <nav aria-label="Khu vực quản trị" className="space-y-1">
                {visibleTabs.map(tab => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  const badge = tab.id === 'reports' ? metrics.openReports : 0;
                  return (
                    <button key={tab.id} type="button" onClick={() => { setActiveTab(tab.id); setSearch(''); }} aria-current={isActive ? 'page' : undefined} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[11px] font-semibold transition ${isActive ? 'border border-amber-300/20 bg-amber-400/10 text-amber-100 shadow-[inset_0_0_20px_rgba(245,158,11,0.04)]' : 'border border-transparent text-neutral-300 hover:border-white/10 hover:bg-white/5 hover:text-white'}`}>
                      <Icon className={`h-4 w-4 ${isActive ? 'text-amber-200' : 'text-neutral-400'}`} />
                      <span className="flex-1">{tab.label}</span>
                      {badge > 0 && <span className="min-w-5 rounded-full bg-rose-400/15 px-1.5 py-0.5 text-center text-[9px] font-bold text-rose-100">{badge}</span>}
                    </button>
                  );
                })}
              </nav>
              <div className="mt-auto rounded-2xl border border-cyan-300/15 bg-cyan-400/[0.06] p-3">
                <div className="flex items-center gap-2 text-cyan-100"><Activity className="h-3.5 w-3.5" /><span className="text-[10px] font-bold">Bảo vệ cộng đồng</span></div>
                <p className="mt-1.5 text-[9px] leading-relaxed text-neutral-300">Mọi chế tài được xác thực tại máy chủ và lưu vào nhật ký quản trị.</p>
              </div>
            </aside>

            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-white/10 px-2 py-2 no-scrollbar md:hidden" role="tablist" aria-label="Khu vực quản trị">
                {visibleTabs.map(tab => {
                  const Icon = tab.icon;
                  return <button key={tab.id} type="button" role="tab" aria-selected={activeTab === tab.id} onClick={() => { setActiveTab(tab.id); setSearch(''); }} className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-[10px] font-bold transition ${activeTab === tab.id ? 'bg-amber-400/15 text-amber-100' : 'text-neutral-300 hover:bg-white/5'}`}><Icon className="h-3.5 w-3.5" />{tab.label}</button>;
                })}
              </div>

              <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5">
                <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-[9px] font-bold tracking-[0.24em] text-amber-200/65">ADMINISTRATION</p>
                    <h2 className="mt-1 text-xl font-bold text-white">{TABS.find(tab => tab.id === activeTab)?.label}</h2>
                    <p className="mt-1 max-w-2xl text-[11px] leading-relaxed text-neutral-300">{TAB_SUBTITLES[activeTab]}</p>
                  </div>
                  {(activeTab === 'reports' || activeTab === 'members' || activeTab === 'content') && (
                    <label className="relative block w-full sm:max-w-xs">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                      <input value={search} onChange={event => setSearch(event.target.value)} type="search" maxLength={120} aria-label={activeTab === 'members' ? 'Tìm thành viên theo tên, email hoặc mã tài khoản' : 'Tìm báo cáo hoặc nội dung'} placeholder={activeTab === 'members' ? 'Tìm tên, email hoặc ID…' : 'Tìm trong danh sách…'} className="w-full rounded-xl border border-white/10 bg-black/20 py-2.5 pl-9 pr-3 text-xs text-white placeholder:text-neutral-500 outline-none transition focus:border-amber-300/40" />
                    </label>
                  )}
                </div>

                {notice && <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-300/20 bg-emerald-400/[0.08] px-3.5 py-2.5 text-[11px] text-emerald-100"><CheckCircle2 className="h-4 w-4 shrink-0" />{notice}<button type="button" onClick={() => setNotice('')} aria-label="Đóng thông báo" className="ml-auto text-emerald-100/70 hover:text-white"><X className="h-3.5 w-3.5" /></button></div>}
                {loadError && <div className="mb-4 flex items-start gap-2 rounded-xl border border-rose-300/20 bg-rose-400/[0.08] px-3.5 py-3 text-[11px] text-rose-100"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><span>{loadError}</span><button type="button" onClick={() => void loadSnapshot()} className="ml-auto shrink-0 font-bold underline">Thử lại</button></div>}

                {activeTab === 'overview' && (
                  <div className="space-y-5">
                    <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
                      {metricCards.map(card => {
                        const Icon = card.icon;
                        return <article key={card.label} className="rounded-2xl border border-white/10 bg-black/15 p-3.5 sm:p-4"><div className="flex items-center justify-between gap-2"><span className="text-[10px] font-semibold text-neutral-300">{card.label}</span><span className={`grid h-8 w-8 place-items-center rounded-xl border ${card.tone}`}><Icon className="h-4 w-4" /></span></div><p className="mt-3 text-xl font-bold tracking-tight text-white sm:text-2xl">{card.value}</p></article>;
                      })}
                    </div>
                    <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
                      {hasPermission('reports.view') && <section className="rounded-2xl border border-white/10 bg-black/10 p-4 sm:p-5">
                        <div className="mb-3 flex items-center justify-between gap-2"><div><h3 className="text-sm font-bold text-white">Cần xem xét</h3><p className="mt-0.5 text-[10px] text-neutral-400">Các báo cáo mới nhất đang chờ xử lý.</p></div><button type="button" onClick={() => { setActiveTab('reports'); setReportFilter('open'); }} className="text-[10px] font-bold text-amber-200 hover:text-amber-100">Mở hàng đợi →</button></div>
                        {reports.filter(report => report.status === 'open').slice(0, 4).map(report => <div key={report.id} className="flex items-start gap-3 border-t border-white/[0.06] py-3"><span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-rose-400/10 text-rose-200"><Flag className="h-3.5 w-3.5" /></span><div className="min-w-0 flex-1"><p className="truncate text-[11px] font-semibold text-white">{report.reason} · {report.reportedUserName}</p><p className="mt-1 truncate text-[10px] text-neutral-400">{report.reporterName} · {formatDate(report.createdAt)}</p></div><button type="button" onClick={() => { setActiveTab('reports'); setReportFilter('open'); }} className="shrink-0 rounded-lg border border-white/10 px-2 py-1 text-[9px] text-neutral-200 hover:bg-white/5">Mở</button></div>)}
                        {reports.filter(report => report.status === 'open').length === 0 && <div className="rounded-xl border border-emerald-300/15 bg-emerald-400/[0.05] p-4 text-[11px] text-emerald-100/80">Hàng đợi đang trống. Chưa có báo cáo nào cần xử lý.</div>}
                      </section>}
                      <section className="rounded-2xl border border-white/10 bg-black/10 p-4 sm:p-5">
                        <div className="flex items-center gap-2"><Activity className="h-4 w-4 text-cyan-200" /><h3 className="text-sm font-bold text-white">Quyền quản trị</h3></div>
                        <ul className="mt-3 space-y-2.5 text-[10px] leading-relaxed text-neutral-300"><li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-300" />Mute chat được kiểm tra trước khi tin nhắn được lưu.</li><li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-300" />Khóa tài khoản thu hồi phiên hiện tại và chặn đăng nhập lại.</li><li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-300" />Mọi xử lý được lưu vào nhật ký phía máy chủ.</li></ul>
                        {hasPermission('logs.view') && <button type="button" onClick={() => setActiveTab('audit')} className="mt-4 inline-flex items-center gap-1.5 text-[10px] font-bold text-cyan-100 hover:text-white">Xem nhật ký <History className="h-3.5 w-3.5" /></button>}
                      </section>
                    </div>
                  </div>
                )}

                {activeTab === 'reports' && (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {([['open', 'Đang mở'], ['resolved', 'Đã xử lý'], ['dismissed', 'Đã đóng'], ['all', 'Tất cả']] as const).map(([value, label]) => <button key={value} type="button" onClick={() => setReportFilter(value)} className={`rounded-xl border px-3 py-2 text-[10px] font-bold transition ${reportFilter === value ? 'border-amber-300/25 bg-amber-400/10 text-amber-100' : 'border-white/10 bg-white/[0.025] text-neutral-300 hover:bg-white/5'}`}>{label}{value === 'open' ? ` · ${metrics.openReports}` : ''}</button>)}
                    </div>
                    {filteredReports.map(renderReportRow)}
                    {!isBusyLoading && filteredReports.length === 0 && <EmptyState title="Không có báo cáo phù hợp" detail="Thử bộ lọc khác hoặc xóa từ khóa tìm kiếm." />}
                  </div>
                )}

                {activeTab === 'members' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-[10px] text-neutral-400"><span>{filteredAccounts.length} tài khoản</span><span>Thao tác nhạy cảm yêu cầu xác minh lại mật khẩu</span></div>
                    {filteredAccounts.map(renderUserRow)}
                    {!isBusyLoading && filteredAccounts.length === 0 && <EmptyState title="Không tìm thấy thành viên" detail="Tìm theo tên, email hoặc mã tài khoản." />}
                  </div>
                )}

                {activeTab === 'content' && (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {([['all', 'Tất cả'], ['question', 'Câu hỏi'], ['answer', 'Lời giải'], ['chat', 'Chat'], ['club-post', 'Bài CLB']] as const).map(([value, label]) => <button key={value} type="button" onClick={() => setContentFilter(value)} className={`rounded-xl border px-3 py-2 text-[10px] font-bold transition ${contentFilter === value ? 'border-cyan-300/25 bg-cyan-400/10 text-cyan-100' : 'border-white/10 bg-white/[0.025] text-neutral-300 hover:bg-white/5'}`}>{label}</button>)}
                    </div>
                    <p className="text-[10px] text-neutral-400">{filteredContent.length} mục · Nội dung chỉ bị loại khỏi danh sách sau khi máy chủ xác nhận.</p>
                    {filteredContent.map(renderContentRow)}
                    {filteredContent.length === 0 && <EmptyState title="Không có nội dung phù hợp" detail="Thử loại nội dung khác hoặc điều chỉnh tìm kiếm." />}
                  </div>
                )}

                {activeTab === 'analytics' && (
                  <div className="space-y-5">
                    <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
                      {metricCards.map(card => {
                        const Icon = card.icon;
                        return <article key={card.label} className="rounded-2xl border border-white/10 bg-black/15 p-3.5 sm:p-4"><div className="flex items-center justify-between gap-2"><span className="text-[10px] font-semibold text-neutral-300">{card.label}</span><span className={`grid h-8 w-8 place-items-center rounded-xl border ${card.tone}`}><Icon className="h-4 w-4" /></span></div><p className="mt-3 text-xl font-bold tracking-tight text-white sm:text-2xl">{card.value}</p></article>;
                      })}
                    </div>
                    <section className="rounded-2xl border border-white/10 bg-black/10 p-4 sm:p-5">
                      <div className="mb-4"><h3 className="text-sm font-bold text-white">Khối lượng nội dung</h3><p className="mt-1 text-[10px] text-neutral-400">Tổng số bản ghi hiện tại, không phải số liệu tăng trưởng theo thời gian.</p></div>
                      <div className="space-y-4">
                        {[
                          { label: 'Câu hỏi', value: metrics.questions, color: 'bg-cyan-300' },
                          { label: 'Lời giải', value: metrics.answers, color: 'bg-violet-300' },
                          { label: 'Tin nhắn chat', value: metrics.chatMessages, color: 'bg-emerald-300' },
                          { label: 'Bài viết câu lạc bộ', value: metrics.clubPosts, color: 'bg-amber-300' },
                        ].map(item => {
                          const total = Math.max(metrics.questions, metrics.answers, metrics.chatMessages, metrics.clubPosts, 1);
                          const width = item.value === 0 ? 0 : Math.max(3, Math.round((item.value / total) * 100));
                          return <div key={item.label}><div className="mb-1.5 flex items-center justify-between text-[10px]"><span className="text-neutral-300">{item.label}</span><strong className="font-mono text-white">{item.value.toLocaleString('vi-VN')}</strong></div><div className="h-2 overflow-hidden rounded-full bg-white/[0.06]"><div className={`h-full rounded-full ${item.color} transition-[width] duration-500`} style={{ width: `${width}%` }} /></div></div>;
                        })}
                      </div>
                    </section>
                  </div>
                )}

                {activeTab === 'settings' && (
                  <div className="space-y-4">
                    <section className="rounded-2xl border border-cyan-300/15 bg-cyan-400/[0.045] p-4 sm:p-5">
                      <div className="flex items-start gap-3"><LockKeyhole className="mt-0.5 h-5 w-5 shrink-0 text-cyan-200" /><div><h3 className="text-sm font-bold text-white">Cấu hình máy chủ · chỉ đọc</h3><p className="mt-1 text-[10px] leading-relaxed text-neutral-300">Thay đổi credentials hoặc thời hạn đăng nhập qua biến môi trường/deployment; giao diện này không nhận secret và không ghi cấu hình tùy ý.</p></div></div>
                    </section>
                    {!settings ? <EmptyState title="Không tải được cấu hình" detail="Làm mới dữ liệu hoặc kiểm tra quyền settings.view." /> : (
                      <>
                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                          {[
                            ['Lưu trữ', settings.storage],
                            ['Phiên đăng nhập', settings.singleInstanceSessions ? 'Một phiên hoạt động / tài khoản' : 'Nhiều phiên'],
                            ['Thời hạn phiên', `${settings.sessionTtlHours} giờ`],
                            ['Cookie phiên', settings.sessionCookie],
                            ['Hash mật khẩu', settings.passwordHash],
                            ['Super Admin đang hoạt động', String(settings.superAdminCount)],
                          ].map(([label, value]) => <article key={label} className="rounded-2xl border border-white/10 bg-black/15 p-4"><p className="text-[9px] font-bold tracking-wider text-neutral-400">{label}</p><p className="mt-2 break-words text-xs font-semibold text-white">{value}</p></article>)}
                        </div>
                        <section className="rounded-2xl border border-white/10 bg-black/10 p-4 sm:p-5">
                          <h3 className="text-sm font-bold text-white">Vai trò được hỗ trợ</h3>
                          <div className="mt-3 flex flex-wrap gap-2">{settings.roles.map(role => <span key={role} className="rounded-full border border-violet-300/20 bg-violet-400/[0.08] px-3 py-1.5 text-[10px] font-bold text-violet-100">{role.replace('_', ' ').toUpperCase()}</span>)}</div>
                          <div className="mt-4 flex flex-wrap gap-3 text-[10px] text-neutral-300"><span>Google OAuth: <strong className={settings.socialLogin.google ? 'text-emerald-200' : 'text-neutral-400'}>{settings.socialLogin.google ? 'đã cấu hình' : 'chưa cấu hình'}</strong></span><span>Facebook OAuth: <strong className={settings.socialLogin.facebook ? 'text-emerald-200' : 'text-neutral-400'}>{settings.socialLogin.facebook ? 'đã cấu hình' : 'chưa cấu hình'}</strong></span></div>
                        </section>
                      </>
                    )}
                  </div>
                )}

                {activeTab === 'audit' && (
                  <div className="space-y-2.5">
                    <div className="mb-3 flex items-start gap-2 rounded-xl border border-cyan-300/15 bg-cyan-400/[0.05] p-3 text-[10px] text-cyan-100/80"><History className="mt-0.5 h-4 w-4 shrink-0" />Nhật ký lưu tối đa 1.000 thao tác gần nhất trên máy chủ; hiển thị 250 mục mới nhất.</div>
                    {auditLog.map(event => <article key={event.id} className="flex gap-3 rounded-2xl border border-white/10 bg-black/15 p-3.5"><span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-amber-300/15 bg-amber-400/[0.07] text-amber-100"><Clock3 className="h-4 w-4" /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="text-[11px] font-bold text-white">{ACTION_LABELS[event.action] || event.action}</h3><span className="text-[9px] text-neutral-500">{formatDate(event.createdAt)}</span></div><p className="mt-1 text-[10px] text-neutral-300">Đối tượng: <strong className="text-amber-100">{event.targetName || event.targetId || '—'}</strong> · Thực hiện bởi {event.actorName || 'Quản trị viên'}</p>{event.reason && <p className="mt-1 text-[10px] leading-relaxed text-neutral-400">Lý do: {event.reason}</p>}<p className="mt-1 truncate font-mono text-[8px] text-neutral-600">{event.id}</p></div></article>)}
                    {!isBusyLoading && auditLog.length === 0 && <EmptyState title="Chưa có thao tác quản trị" detail="Các thao tác kiểm duyệt và tài khoản sẽ xuất hiện tại đây." />}
                  </div>
                )}
              </main>
            </div>
          </div>
          <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-white/10 px-4 py-2.5 text-[9px] text-neutral-400 sm:px-6">
            <span>Quyền hiển thị do máy chủ xác định · mọi thao tác được server xác thực</span>
            <span className="hidden items-center gap-1.5 sm:inline-flex"><Activity className="h-3 w-3 text-emerald-300" /> {isBusyLoading ? 'Đang đồng bộ…' : 'Sẵn sàng'}</span>
          </footer>
        </div>

        {pendingAction && (
          <div className="absolute inset-0 z-[180] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm" onMouseDown={event => { if (event.target === event.currentTarget) closeAction(); }}>
            <section role="alertdialog" aria-modal="true" aria-labelledby="admin-action-title" className="liquid-glass relative max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-3xl border border-amber-300/20 p-5 shadow-2xl sm:p-6">
              <div className="relative z-[1]">
                <div className="mb-4 flex items-start justify-between gap-4"><div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-amber-300/20 bg-amber-400/10 text-amber-100">{pendingAction.kind === 'user' ? pendingAction.action === 'mute' || pendingAction.action === 'unmute' ? <VolumeX className="h-5 w-5" /> : pendingAction.action === 'lock' ? <LockKeyhole className="h-5 w-5" /> : <UnlockKeyhole className="h-5 w-5" /> : pendingAction.kind === 'report' ? <Flag className="h-5 w-5" /> : <Trash2 className="h-5 w-5" />}</span><div><p className="text-[9px] font-bold tracking-[0.2em] text-amber-200/65">CONFIRM ADMIN ACTION</p><h2 id="admin-action-title" className="mt-1 text-base font-bold text-white">{pendingTitle}</h2></div></div><button type="button" onClick={closeAction} disabled={isSubmitting} aria-label="Đóng xác nhận" className="grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/5 text-neutral-300 hover:bg-white/10 disabled:opacity-40"><X className="h-4 w-4" /></button></div>
                <p className="mb-4 rounded-xl border border-white/10 bg-black/15 p-3 text-[11px] text-neutral-200">{pendingDescription}</p>
                {pendingAction.kind === 'user' && pendingAction.action === 'mute' && (
                  <label className="mb-3 block"><span className="mb-1.5 block text-[10px] font-semibold text-neutral-300">Thời hạn mute chat</span><select value={muteDuration} onChange={event => setMuteDuration(event.target.value)} className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-xs text-white outline-none focus:border-amber-300/40"><option value="10">10 phút</option><option value="60">1 giờ</option><option value="1440">24 giờ</option><option value="10080">7 ngày</option><option value="0">Vô thời hạn</option></select></label>
                )}
                {pendingAction.kind === 'user' && pendingAction.action === 'lock' && <div className="mb-3 flex gap-2 rounded-xl border border-rose-300/15 bg-rose-400/[0.06] p-3 text-[10px] leading-relaxed text-rose-100/80"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />Khóa tài khoản sẽ thu hồi các phiên đăng nhập đang hoạt động và chặn đăng nhập mới. Có thể mở khóa sau.</div>}
                {pendingAction.kind === 'role' && <div className="mb-3 flex gap-2 rounded-xl border border-violet-300/15 bg-violet-400/[0.06] p-3 text-[10px] leading-relaxed text-violet-100/80"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />Thay đổi quyền yêu cầu tài khoản super_admin và mật khẩu hiện tại. Phiên đăng nhập mục tiêu sẽ bị thu hồi sau khi lưu.</div>}
                {pendingAction.kind === 'delete-user' && <div className="mb-3 flex gap-2 rounded-xl border border-rose-300/15 bg-rose-400/[0.06] p-3 text-[10px] leading-relaxed text-rose-100/80"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />Không thể hoàn tác thao tác này. Tất cả phiên, nội dung, dữ liệu thưởng và trạng thái kiểm duyệt của tài khoản sẽ bị xóa.</div>}
                {pendingAction.kind === 'content' && <div className="mb-3 flex gap-2 rounded-xl border border-rose-300/15 bg-rose-400/[0.06] p-3 text-[10px] leading-relaxed text-rose-100/80"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />Thao tác gỡ nội dung là vĩnh viễn. Lý do sẽ được ghi lại trong nhật ký quản trị.</div>}
                {pendingAction.kind === 'role' && <p className="mb-3 rounded-xl border border-white/10 bg-black/15 p-3 text-[10px] text-neutral-300">Vai trò mới: <strong className="text-violet-100">{pendingAction.nextRole.replace('_', ' ').toUpperCase()}</strong></p>}
                {pendingAction.kind === 'delete-user' && <label className="mb-3 block"><span className="mb-1.5 block text-[10px] font-semibold text-neutral-300">Nhập email tài khoản để xác nhận</span><input value={accountConfirmation} onChange={event => setAccountConfirmation(event.target.value)} type="email" autoComplete="off" spellCheck={false} maxLength={254} className="w-full rounded-xl border border-rose-300/20 bg-black/20 px-3 py-2.5 text-xs text-white outline-none focus:border-rose-200/50" /></label>}
                {(pendingAction.kind === 'role' || pendingAction.kind === 'delete-user') && <label className="mb-3 block"><span className="mb-1.5 block text-[10px] font-semibold text-neutral-300">Xác minh lại mật khẩu hiện tại</span><input value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} type="password" autoComplete="current-password" maxLength={200} className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-xs text-white outline-none focus:border-amber-300/40" /></label>}
                <label className="block"><span className="mb-1.5 block text-[10px] font-semibold text-neutral-300">{pendingAction.kind === 'report' ? 'Ghi chú xử lý (không bắt buộc)' : pendingAction.kind === 'role' ? 'Lý do thay đổi vai trò' : pendingAction.kind === 'delete-user' ? 'Lý do xóa tài khoản' : 'Lý do / căn cứ xử lý'}{pendingAction.kind !== 'report' && <span className="text-rose-200"> *</span>}</span><textarea value={actionReason} onChange={event => setActionReason(event.target.value)} rows={3} maxLength={500} placeholder={pendingAction.kind === 'report' ? 'Ghi chú ngắn cho lần rà soát này…' : 'Mô tả căn cứ xử lý, tối thiểu 5 ký tự…'} className="w-full resize-y rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-xs leading-relaxed text-white placeholder:text-neutral-500 outline-none transition focus:border-amber-300/40" /></label>
                {dialogError && <p role="alert" className="mt-2 flex items-start gap-1.5 text-[10px] text-rose-200"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />{dialogError}</p>}
                <div className="mt-5 flex justify-end gap-2 border-t border-white/10 pt-4"><button type="button" onClick={closeAction} disabled={isSubmitting} className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-[11px] font-semibold text-neutral-200 hover:bg-white/10 disabled:opacity-40">Hủy</button><button type="button" onClick={() => void submitAction()} disabled={isSubmitting} className={`inline-flex min-w-32 items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-[11px] font-bold transition disabled:cursor-wait disabled:opacity-50 ${pendingAction.kind === 'content' || (pendingAction.kind === 'user' && pendingAction.action === 'lock') ? 'border-rose-300/25 bg-rose-400/15 text-rose-100 hover:bg-rose-400/25' : 'border-amber-300/25 bg-amber-400/15 text-amber-100 hover:bg-amber-400/25'}`}>{isSubmitting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : pendingAction.kind === 'report' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />}{isSubmitting ? 'Đang lưu…' : 'Xác nhận'}</button></div>
              </div>
            </section>
          </div>
        )}
      </section>
    </div>
  );

  return createPortal(content, document.body);
};

const EmptyState: React.FC<{ title: string; detail: string }> = ({ title, detail }) => (
  <div className="rounded-2xl border border-dashed border-white/15 bg-black/[0.06] px-5 py-10 text-center">
    <MessageCircle className="mx-auto h-6 w-6 text-neutral-500" />
    <h3 className="mt-3 text-xs font-bold text-neutral-200">{title}</h3>
    <p className="mx-auto mt-1 max-w-sm text-[10px] leading-relaxed text-neutral-400">{detail}</p>
  </div>
);
