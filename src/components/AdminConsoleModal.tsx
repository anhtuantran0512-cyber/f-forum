/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ShieldAlert,
  X,
  RefreshCw,
  Activity,
  Users,
  MessageSquare,
  Flag,
  Database,
  Gauge,
  AlertTriangle,
  CheckCircle2,
  Coins,
  Radio,
  Inbox,
  Ban,
  MessageSquareOff,
  Undo2,
  Search,
  UserRound,
  ScrollText,
} from 'lucide-react';
import { authHeaders, postJson } from '../utils/session';
import { useEscapeKey } from '../utils/useEscapeKey';
import { formatBytes, formatUptime } from '../utils/formatOps';

/* ==========================================================================
   BẢNG ĐIỀU KHIỂN QUẢN TRỊ — dành riêng cho Super Admin
   --------------------------------------------------------------------------
   Trước đây quyền quản trị chỉ có đúng một màn hình: hộp thư tố cáo. Quản trị
   muốn biết hệ thống đang thế nào thì phải tự suy ra từ các trang người dùng,
   và không có chỗ nào cho thấy hàng chờ duyệt, tỉ lệ câu hỏi bị bỏ rơi, hay
   nguồn nào đang bị chặn. Component này gom tất cả vào một màn hình, lấy từ
   MỘT lần gọi `/api/admin/overview` để không bắn năm sáu request.

   Nguyên tắc: màn hình này chỉ ĐỌC và ĐIỀU HƯỚNG. Mọi hành động ghi (xử lý tố
   cáo, duyệt CLB) vẫn đi qua đúng endpoint đã có quyền riêng của nó — không tạo
   ra một cổng ghi thứ hai song song, vì đó chính là dạng lỗi đã gặp nhiều lần
   trong dự án này (một đột biến có hai đường, sửa một đường thì đường kia hở).
   ========================================================================== */

export interface AdminOverview {
  generatedAt: string;
  server: {
    uptimeSeconds: number;
    node: string;
    dataFileBytes: number;
    dataFileOk: boolean;
    corruptBackups: number;
  };
  counts: Record<string, number>;
  connections: { websocket: number; sse: number };
  pending: { reports: number; clubs: number };
  moderation: { banned: number; muted: number; records: number; auditEntries: number };
  contentHealth: {
    unansweredQuestions: number;
    unsolvedQuestions: number;
    solvedRate: number;
    anonymousQuestions: number;
    openBountyCoin: number;
  };
  community: {
    superAdmins: number;
    clubLeaders: number;
    students: number;
    totalCoin: number;
    highestLevel: number;
  };
  rateLimits: {
    name: string;
    windowMs: number;
    max: number;
    trackedKeys: number;
    blockedKeys: number;
    totalHits: number;
  }[];
  topReported: { target: string; count: number }[];
}

export interface AdminUserRecord {
  id: string;
  email: string;
  name: string;
  avatar: string;
  role: 'SUPER_ADMIN' | 'CLUB_LEADER' | 'STUDENT';
  level: number;
  moderation: {
    banned: boolean;
    muted: boolean;
    bannedUntil?: number;
    mutedUntil?: number;
    reason?: string;
  };
}

interface AdminAuditRecord {
  id: string;
  at: number;
  action: string;
  targetEmail?: string;
  reason?: string;
  by?: string;
}

const MODERATION_DURATIONS = [
  { value: 15, label: '15 phút' },
  { value: 60, label: '1 giờ' },
  { value: 1440, label: '1 ngày' },
  { value: 10080, label: '7 ngày' },
  { value: 0, label: 'Vĩnh viễn' },
] as const;

interface AdminConsoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Mở hộp thư tố cáo — hành động điều hướng, không phải ghi. */
  onOpenReports?: () => void;
  /** Nhảy sang phân khu CLB để duyệt hồ sơ đang chờ. */
  onOpenClubs?: () => void;
}

const LIMITER_LABELS: Record<string, string> = {
  login: 'Đăng nhập',
  register: 'Đăng ký',
  social: 'Đăng nhập mạng XH',
  write: 'Ghi nội dung',
  presence: 'Hiện diện',
};

export const AdminConsoleModal: React.FC<AdminConsoleModalProps> = ({
  isOpen,
  onClose,
  onOpenReports,
  onOpenClubs,
}) => {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lastLoadedAt, setLastLoadedAt] = useState<number | null>(null);
  /*
    Chỉ MỘT trạng thái tải, và nó chỉ được bật từ EVENT HANDLER (nút Làm mới) —
    không bao giờ từ effect. Trạng thái "đang tải lần đầu" được SUY RA bên dưới
    thay vì lưu thành state: lưu state rồi set trong effect chính là mẫu
    react(set-state-in-effect) cảnh báo, và còn gây thêm một lượt render.
  */
  const [isRefreshing, setIsRefreshing] = useState(false);
  const isLoading = overview === null && errorMsg === null;

  /* Tra cứu thành viên: truy vấn rỗng chỉ hiện người đang bị áp chế. */
  const [userQuery, setUserQuery] = useState('');
  const [userResults, setUserResults] = useState<AdminUserRecord[]>([]);
  const [userLoadedQuery, setUserLoadedQuery] = useState<string | null>(null);
  const [userSearchError, setUserSearchError] = useState<string | null>(null);
  const [moderationDuration, setModerationDuration] = useState<number>(60);
  const [moderationReason, setModerationReason] = useState('');
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const userSearchLoading = userLoadedQuery !== userQuery;

  /* Nhật ký thao tác quản trị — chỉ lấy dữ liệu đã giới hạn từ server. */
  const [auditRows, setAuditRows] = useState<AdminAuditRecord[]>([]);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [auditRefreshTick, setAuditRefreshTick] = useState(0);

  /**
   * Chỉ làm phần mạng + bóc tách dữ liệu, KHÔNG đụng tới state — nhờ vậy gọi
   * được từ cả effect khởi động, nhịp tự làm mới lẫn nút tải lại mà không gây
   * render dây chuyền. Đúng khuôn fetchReports của ReportInboxModal.
   */
  const fetchOverview = useCallback(async (): Promise<
    { ok: true; data: AdminOverview } | { ok: false; message: string }
  > => {
    try {
      const res = await fetch('/api/admin/overview', { headers: authHeaders() });
      const data = await res.json().catch(() => null);
      if (res.status === 403) {
        return { ok: false, message: 'Chỉ Super Admin mới xem được tổng quan hệ thống.' };
      }
      if (res.status !== 200 || !data?.success) {
        return { ok: false, message: data?.message || `Không tải được tổng quan (HTTP ${res.status}).` };
      }
      return { ok: true, data: data as AdminOverview };
    } catch {
      return { ok: false, message: 'Không kết nối được máy chủ để lấy tổng quan hệ thống.' };
    }
  }, []);

  /** Áp kết quả vào state — tách riêng để dùng chung cho mọi con đường tải. */
  const applyResult = useCallback(
    (result: { ok: true; data: AdminOverview } | { ok: false; message: string }) => {
      if (result.ok) {
        setOverview(result.data);
        setLastLoadedAt(Date.now());
        setErrorMsg(null);
      } else {
        setErrorMsg(result.message);
      }
      setIsRefreshing(false);
    },
    [],
  );

  /* Nút Làm mới: được phép bật spinner đồng bộ vì đây là event handler. */
  const reload = useCallback(async () => {
    setIsRefreshing(true);
    applyResult(await fetchOverview());
  }, [fetchOverview, applyResult]);

  /*
    HÀNH ĐỘNG QUẢN LÝ (cấm / khoá gửi tin / gỡ).

    Đây là chỗ DUY NHẤT trong UI gọi endpoint ghi của quản trị. Nó không tự suy
    diễn luật nào cả — gửi hành động lên server rồi dùng đúng `status` server trả
    về để vẽ lại, nên UI không bao giờ lệch với sự thật trên máy chủ.
  */
  const [busyTarget, setBusyTarget] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const runModeration = useCallback(
    async (email: string, action: 'ban' | 'mute' | 'unban' | 'unmute') => {
      const appliesRestriction = action === 'ban' || action === 'mute';
      const reason = moderationReason.trim();
      if (appliesRestriction && reason.length < 3) {
        setActionError('Hãy ghi lý do cụ thể (ít nhất 3 ký tự) để quyết định có thể truy vết.');
        return;
      }
      if (appliesRestriction && moderationDuration === 0) {
        const scope = action === 'ban'
          ? 'không thể đăng câu hỏi, lời giải, CLB hoặc gửi tin'
          : 'không thể gửi tin chat';
        const accepted = window.confirm(
          `${action === 'ban' ? 'Cấm đăng' : 'Khoá chat'} ${email} vĩnh viễn? Người này ${scope}. Có thể gỡ lại từ bảng điều khiển.`,
        );
        if (!accepted) return;
      }

      setBusyTarget(email);
      setActionError(null);
      setActionNotice(null);
      try {
        const { status, data } = await postJson('/api/admin/moderate', {
          email,
          action,
          durationMinutes: appliesRestriction ? moderationDuration : undefined,
          reason: appliesRestriction ? reason : '',
        });
        if (status !== 200 || !data?.success) {
          setActionError(data?.message || `Không thực hiện được thao tác (HTTP ${status}).`);
          return;
        }

        /* Cập nhật dòng đang xem ngay từ trạng thái chuẩn server vừa trả về. */
        if (data.status) {
          setUserResults((prev) => prev.flatMap((user) => {
            if (user.email !== email) return [user];
            const updated = { ...user, moderation: data.status };
            /* Query rỗng là danh sách "đang bị áp chế"; gỡ hết thì hàng này
               không còn thuộc bộ lọc, nhưng khi đang tìm theo tên/email thì giữ. */
            if (!userQuery.trim() && !data.status.banned && !data.status.muted) return [];
            return [updated];
          }));
        }
        setActionNotice(data.changed ? 'Đã cập nhật trạng thái và ghi vào nhật ký quản trị.' : data.message);
        applyResult(await fetchOverview());
        setAuditRefreshTick((tick) => tick + 1);
      } catch {
        setActionError('Không kết nối được máy chủ. Trạng thái chưa được xác nhận — hãy làm mới trước khi thử lại.');
      } finally {
        setBusyTarget(null);
      }
    },
    [applyResult, fetchOverview, moderationDuration, moderationReason, userQuery],
  );

  /** Tra cứu thuần — không setState, có thể gọi từ effect và event handler. */
  const fetchAdminUsers = useCallback(async (query: string): Promise<
    { ok: true; users: AdminUserRecord[] } | { ok: false; message: string }
  > => {
    try {
      const res = await fetch(`/api/admin/users?q=${encodeURIComponent(query)}`, { headers: authHeaders() });
      const data = await res.json().catch(() => null);
      if (res.status !== 200 || !data?.success) {
        return { ok: false, message: data?.message || `Không tra cứu được người dùng (HTTP ${res.status}).` };
      }
      return { ok: true, users: Array.isArray(data.users) ? data.users as AdminUserRecord[] : [] };
    } catch {
      return { ok: false, message: 'Không kết nối được máy chủ để tra cứu người dùng.' };
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return undefined;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      const result = await fetchAdminUsers(userQuery);
      if (cancelled) return;
      setUserLoadedQuery(userQuery);
      if (result.ok) {
        setUserResults(result.users);
        setUserSearchError(null);
      } else {
        setUserResults([]);
        setUserSearchError(result.message);
      }
    }, userQuery ? 250 : 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [isOpen, userQuery, fetchAdminUsers]);

  const fetchAudit = useCallback(async (): Promise<
    { ok: true; rows: AdminAuditRecord[] } | { ok: false; message: string }
  > => {
    try {
      const res = await fetch('/api/admin/audit?limit=8', { headers: authHeaders() });
      const data = await res.json().catch(() => null);
      if (res.status !== 200 || !data?.success) {
        return { ok: false, message: data?.message || `Không tải được nhật ký (HTTP ${res.status}).` };
      }
      return { ok: true, rows: Array.isArray(data.auditLog) ? data.auditLog as AdminAuditRecord[] : [] };
    } catch {
      return { ok: false, message: 'Không kết nối được máy chủ để tải nhật ký.' };
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return undefined;
    let cancelled = false;
    (async () => {
      const result = await fetchAudit();
      if (cancelled) return;
      if (result.ok) {
        setAuditRows(result.rows);
        setAuditError(null);
      } else {
        setAuditError(result.message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, auditRefreshTick, fetchAudit]);

  useEffect(() => {
    if (!isOpen) return undefined;
    let cancelled = false;
    (async () => {
      const result = await fetchOverview();
      if (cancelled) return;
      applyResult(result);
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, fetchOverview, applyResult]);

  /*
    Tự làm mới mỗi 20 giây khi đang mở. Bảng điều khiển mà số liệu đứng yên thì
    người vận hành sẽ tin vào con số cũ; nhưng cũng không được bắn request liên
    tục nên chọn nhịp vừa phải và chỉ chạy khi modal thật sự mở.
  */
  useEffect(() => {
    if (!isOpen) return undefined;
    const id = window.setInterval(async () => {
      applyResult(await fetchOverview());
    }, 20000);
    return () => window.clearInterval(id);
  }, [isOpen, fetchOverview, applyResult]);

  /* Ban quản trị ở tab khác vừa xử lý tố cáo → tải lại cho khớp. */
  useEffect(() => {
    if (!isOpen) return undefined;
    const onChanged = async () => {
      applyResult(await fetchOverview());
    };
    window.addEventListener('fforum_reports_changed', onChanged);
    return () => window.removeEventListener('fforum_reports_changed', onChanged);
  }, [isOpen, fetchOverview, applyResult]);

  useEscapeKey(() => onClose(), isOpen);

  const totalPending = useMemo(
    () => (overview ? overview.pending.reports + overview.pending.clubs : 0),
    [overview],
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Đóng bảng điều khiển quản trị"
        className="absolute inset-0 bg-black/70 backdrop-blur-md cursor-default"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Bảng điều khiển quản trị"
        className="relative w-full max-w-5xl max-h-[88vh] overflow-hidden rounded-3xl liquid-glass bg-[#0c1218]/95 border border-cyan-400/25 shadow-[0_30px_80px_rgba(0,0,0,0.85)] flex flex-col"
      >
        {/* Đầu hộp */}
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-white/10 bg-gradient-to-r from-cyan-500/10 via-transparent to-transparent">
          <div className="flex items-center gap-3 min-w-0">
            <span className="p-2 rounded-xl bg-cyan-500/15 border border-cyan-400/30 text-cyan-300 shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-white truncate">Bảng Điều Khiển Quản Trị</h2>
              <p className="text-[11px] text-neutral-400 font-mono truncate">
                {lastLoadedAt
                  ? `Cập nhật lúc ${new Date(lastLoadedAt).toLocaleTimeString('vi-VN')} · tự làm mới mỗi 20 giây`
                  : 'Đang tải số liệu vận hành…'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => void reload()}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/15 border border-white/15 text-neutral-200 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
              title="Tải lại số liệu"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'motion-safe:animate-spin' : ''}`} />
              Làm mới
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng"
              className="p-2 rounded-xl bg-white/5 hover:bg-rose-500/25 border border-white/15 text-neutral-300 hover:text-rose-300 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {errorMsg && (
            <div
              role="alert"
              className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-rose-500/15 border border-rose-400/30 text-rose-200 text-xs"
            >
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {!overview && isLoading && (
            <div className="py-16 text-center text-neutral-400 text-sm">Đang tải tổng quan hệ thống…</div>
          )}

          {overview && (
            <>
              {/* HÀNG CHỜ CẦN XỬ LÝ — thứ quản trị cần thấy đầu tiên */}
              <section>
                <h3 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-2">
                  <Inbox className="w-3.5 h-3.5" />
                  Việc đang chờ
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={onOpenReports}
                    disabled={!onOpenReports}
                    className={`text-left p-4 rounded-2xl border transition-all cursor-pointer disabled:cursor-default ${
                      overview.pending.reports > 0
                        ? 'bg-rose-500/12 border-rose-400/35 hover:bg-rose-500/20'
                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2 text-xs font-semibold text-neutral-200">
                        <Flag className={`w-4 h-4 ${overview.pending.reports > 0 ? 'text-rose-400' : 'text-neutral-500'}`} />
                        Tố cáo chưa xử lý
                      </span>
                      <span
                        className={`text-2xl font-bold font-mono ${
                          overview.pending.reports > 0 ? 'text-rose-300' : 'text-neutral-500'
                        }`}
                      >
                        {overview.pending.reports}
                      </span>
                    </div>
                    <p className="mt-1.5 text-[11px] text-neutral-500">Bấm để mở hộp thư tố cáo →</p>
                  </button>

                  <button
                    type="button"
                    onClick={onOpenClubs}
                    disabled={!onOpenClubs}
                    className={`text-left p-4 rounded-2xl border transition-all cursor-pointer disabled:cursor-default ${
                      overview.pending.clubs > 0
                        ? 'bg-amber-500/12 border-amber-400/35 hover:bg-amber-500/20'
                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2 text-xs font-semibold text-neutral-200">
                        <Users className={`w-4 h-4 ${overview.pending.clubs > 0 ? 'text-amber-400' : 'text-neutral-500'}`} />
                        Hồ sơ CLB chờ duyệt
                      </span>
                      <span
                        className={`text-2xl font-bold font-mono ${
                          overview.pending.clubs > 0 ? 'text-amber-300' : 'text-neutral-500'
                        }`}
                      >
                        {overview.pending.clubs}
                      </span>
                    </div>
                    <p className="mt-1.5 text-[11px] text-neutral-500">Bấm để sang phân khu Câu Lạc Bộ →</p>
                  </button>
                </div>
                {totalPending === 0 && (
                  <p className="mt-2 flex items-center gap-1.5 text-[11px] text-emerald-300/80">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Không còn việc tồn đọng.
                  </p>
                )}
              </section>

              {/* SỨC KHOẺ NỘI DUNG */}
              <section>
                <h3 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-2">
                  <MessageSquare className="w-3.5 h-3.5" />
                  Sức khoẻ diễn đàn
                </h3>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <StatTile
                    icon={<Activity className="w-4 h-4 text-cyan-400" />}
                    label="Tỉ lệ đã giải"
                    value={`${overview.contentHealth.solvedRate}%`}
                    tone={overview.contentHealth.solvedRate >= 60 ? 'good' : 'warn'}
                  />
                  <StatTile
                    icon={<MessageSquare className="w-4 h-4 text-rose-400" />}
                    label="Chưa ai trả lời"
                    value={overview.contentHealth.unansweredQuestions}
                    tone={overview.contentHealth.unansweredQuestions > 0 ? 'warn' : 'good'}
                  />
                  <StatTile
                    icon={<Coins className="w-4 h-4 text-amber-400" />}
                    label="Coin đang treo"
                    value={overview.contentHealth.openBountyCoin}
                    tone="neutral"
                  />
                  <StatTile
                    icon={<Users className="w-4 h-4 text-neutral-400" />}
                    label="Câu hỏi ẩn danh"
                    value={overview.contentHealth.anonymousQuestions}
                    tone="neutral"
                  />
                </div>
              </section>

              {/* QUẢN LÝ THÀNH VIÊN — thứ admin cần để xử lý ngay một tài khoản */}
              <section className="rounded-2xl border border-cyan-400/20 bg-gradient-to-br from-cyan-500/[0.07] to-transparent p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                  <div>
                    <h3 className="flex items-center gap-2 text-sm font-bold text-white">
                      <Users className="w-4 h-4 text-cyan-300" />
                      Quản lý thành viên
                    </h3>
                    <p className="mt-1 text-[11px] text-neutral-400">
                      {overview.moderation.banned} tài khoản bị cấm đăng · {overview.moderation.muted} tài khoản bị khoá chat
                    </p>
                  </div>
                  <span className="text-[10px] text-neutral-500">
                    Tìm theo tên, email, mã thành viên hoặc lớp
                  </span>
                </div>

                <label className="block">
                  <span className="sr-only">Tìm thành viên theo tên hoặc email</span>
                  <span className="relative block">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                    <input
                      type="search"
                      value={userQuery}
                      onChange={(event) => setUserQuery(event.target.value.slice(0, 120))}
                      placeholder="Nhập tên hoặc email… (từ 2 ký tự)"
                      aria-label="Tìm thành viên theo tên, email, mã hoặc lớp"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-black/25 border border-white/10 focus:border-cyan-400/45 focus:outline-none text-xs text-white placeholder:text-neutral-600"
                    />
                  </span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-[170px_1fr] gap-2">
                  <label className="text-[10px] text-neutral-500">
                    <span className="block mb-1">Thời hạn áp dụng</span>
                    <select
                      value={moderationDuration}
                      onChange={(event) => setModerationDuration(Number(event.target.value))}
                      className="w-full px-2.5 py-2 rounded-lg bg-[#111923] border border-white/10 text-xs text-neutral-200 focus:border-cyan-400/45 focus:outline-none"
                    >
                      {MODERATION_DURATIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="text-[10px] text-neutral-500">
                    <span className="block mb-1">Lý do (bắt buộc khi cấm / khoá chat)</span>
                    <input
                      type="text"
                      value={moderationReason}
                      onChange={(event) => setModerationReason(event.target.value.slice(0, 500))}
                      maxLength={500}
                      placeholder="Ví dụ: spam liên tục sau khi đã được nhắc nhở"
                      className="w-full px-2.5 py-2 rounded-lg bg-black/25 border border-white/10 text-xs text-neutral-200 placeholder:text-neutral-600 focus:border-cyan-400/45 focus:outline-none"
                    />
                  </label>
                </div>

                {actionError && (
                  <p role="alert" className="flex items-center gap-1.5 text-[11px] text-rose-300">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />{actionError}
                  </p>
                )}
                {actionNotice && (
                  <p role="status" className="flex items-center gap-1.5 text-[11px] text-emerald-300">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />{actionNotice}
                  </p>
                )}
                {userSearchError && (
                  <p role="alert" className="text-[11px] text-rose-300">{userSearchError}</p>
                )}

                {userSearchLoading ? (
                  <div className="py-4 text-center text-xs text-neutral-500 motion-safe:animate-pulse">Đang tìm thành viên…</div>
                ) : userResults.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-white/10 px-3 py-4 text-center">
                    <p className="text-xs text-neutral-400">
                      {userQuery.trim().length >= 2
                        ? 'Không tìm thấy thành viên phù hợp.'
                        : 'Hiện chưa có tài khoản bị áp chế. Nhập ít nhất 2 ký tự để tra cứu.'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-[10px] text-neutral-500">
                      {userQuery.trim().length >= 2
                        ? `Tối đa 20 kết quả · ${userResults.length} đang hiển thị`
                        : `Đang bị áp chế · ${userResults.length} tài khoản`}
                    </p>
                    {userResults.map((user) => {
                      const banned = user.moderation?.banned === true;
                      const muted = user.moderation?.muted === true;
                      const busy = busyTarget === user.email;
                      const restrictionText = (until?: number) => {
                        if (until === 0) return 'vĩnh viễn';
                        if (!until) return 'đã hết hạn';
                        const date = new Date(until);
                        return Number.isNaN(date.getTime()) ? 'có thời hạn' : date.toLocaleString('vi-VN');
                      };
                      return (
                        <div key={user.email} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-black/20 border border-white/8">
                          <div className="flex items-center gap-3 min-w-0">
                            {user.avatar ? (
                              <img src={user.avatar} alt="" className="w-9 h-9 rounded-full object-cover border border-white/10 shrink-0" />
                            ) : (
                              <span className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center text-neutral-500 shrink-0">
                                <UserRound className="w-4 h-4" />
                              </span>
                            )}
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="text-xs font-semibold text-neutral-100 truncate">{user.name}</span>
                                <span className="px-1.5 py-0.5 rounded bg-white/5 text-[9px] text-neutral-500">
                                  {user.role === 'CLUB_LEADER' ? 'Chủ nhiệm CLB' : user.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Học sinh'} · Cấp {user.level}
                                </span>
                                {banned && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-500/15 border border-rose-400/25 text-[9px] font-semibold text-rose-300">
                                    <Ban className="w-3 h-3" /> Cấm đăng · {restrictionText(user.moderation.bannedUntil)}
                                  </span>
                                )}
                                {muted && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-400/25 text-[9px] font-semibold text-amber-300">
                                    <MessageSquareOff className="w-3 h-3" /> Khoá chat · {restrictionText(user.moderation.mutedUntil)}
                                  </span>
                                )}
                              </div>
                              <p className="mt-0.5 text-[10px] text-neutral-500 font-mono truncate">{user.email}</p>
                              {(banned || muted) && user.moderation.reason && (
                                <p className="mt-1 text-[10px] text-neutral-500 truncate" title={user.moderation.reason}>Lý do: {user.moderation.reason}</p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 sm:shrink-0">
                            {banned ? (
                              <button
                                type="button"
                                onClick={() => void runModeration(user.email, 'unban')}
                                disabled={busy}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-400/25 text-[10px] font-semibold text-emerald-300 hover:bg-emerald-500/25 disabled:opacity-50 cursor-pointer"
                                title="Gỡ cấm đăng nội dung"
                              >
                                <Undo2 className="w-3 h-3" /> Gỡ cấm
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => void runModeration(user.email, 'ban')}
                                disabled={busy || user.role === 'SUPER_ADMIN'}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-500/15 border border-rose-400/25 text-[10px] font-semibold text-rose-300 hover:bg-rose-500/25 disabled:opacity-40 cursor-pointer"
                                title="Chặn đăng câu hỏi, lời giải, CLB và tin nhắn"
                              >
                                <Ban className="w-3 h-3" /> Cấm đăng
                              </button>
                            )}
                            {muted ? (
                              <button
                                type="button"
                                onClick={() => void runModeration(user.email, 'unmute')}
                                disabled={busy}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-400/25 text-[10px] font-semibold text-emerald-300 hover:bg-emerald-500/25 disabled:opacity-50 cursor-pointer"
                                title="Mở khoá gửi tin chat"
                              >
                                <Undo2 className="w-3 h-3" /> Gỡ chat
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => void runModeration(user.email, 'mute')}
                                disabled={busy || user.role === 'SUPER_ADMIN'}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-500/15 border border-amber-400/25 text-[10px] font-semibold text-amber-300 hover:bg-amber-500/25 disabled:opacity-40 cursor-pointer"
                                title="Chỉ khoá gửi tin chat; không chặn đăng bài"
                              >
                                <MessageSquareOff className="w-3 h-3" /> Khoá chat
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                <p className="text-[10px] leading-relaxed text-neutral-600">
                  Cấm đăng sẽ chặn tạo câu hỏi, lời giải, CLB, bài CLB và tin nhắn; người dùng vẫn có thể đăng nhập để xem nội dung. Khoá chat chỉ chặn gửi tin. Mọi quyết định có lý do, thời hạn và người thực hiện trong nhật ký; tài khoản Super Admin được bảo vệ.
                </p>
              </section>

              {/* CỘNG ĐỒNG + KẾT NỐI */}
              <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <h3 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-2">
                    <Users className="w-3.5 h-3.5" />
                    Cộng đồng
                  </h3>
                  <div className="rounded-2xl border border-white/10 bg-white/5 divide-y divide-white/5 text-xs">
                    <Row label="Super Admin" value={overview.community.superAdmins} />
                    <Row label="Chủ nhiệm CLB" value={overview.community.clubLeaders} />
                    <Row label="Học sinh" value={overview.community.students} />
                    <Row label="Cấp cao nhất" value={overview.community.highestLevel} />
                    <Row label="Tổng Coin lưu hành" value={overview.community.totalCoin} />
                  </div>
                </div>

                <div>
                  <h3 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-2">
                    <Database className="w-3.5 h-3.5" />
                    Máy chủ & dữ liệu
                  </h3>
                  <div className="rounded-2xl border border-white/10 bg-white/5 divide-y divide-white/5 text-xs">
                    <Row
                      label="Thời gian chạy"
                      value={formatUptime(overview.server.uptimeSeconds)}
                    />
                    <Row label="Node" value={overview.server.node} />
                    <Row
                      label="Tệp dữ liệu"
                      value={
                        overview.server.dataFileOk
                          ? formatBytes(overview.server.dataFileBytes)
                          : 'chưa tạo'
                      }
                      tone={overview.server.dataFileOk ? undefined : 'warn'}
                    />
                    <Row
                      label="Bản sao lỗi (corrupt)"
                      value={overview.server.corruptBackups}
                      tone={overview.server.corruptBackups > 0 ? 'warn' : undefined}
                    />
                    <Row
                      label="Kết nối WS / SSE"
                      value={`${overview.connections.websocket} / ${overview.connections.sse}`}
                    />
                  </div>
                </div>
              </section>

              {/* GIỚI HẠN TẦN SUẤT */}
              <section>
                <h3 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-2">
                  <Gauge className="w-3.5 h-3.5" />
                  Giới hạn tần suất
                  <span className="normal-case font-normal text-neutral-500">
                    (nguồn đang bị chặn / tổng nguồn đang theo dõi)
                  </span>
                </h3>
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
                  {overview.rateLimits.map((lim) => (
                    <div
                      key={lim.name}
                      className={`rounded-xl border p-2.5 ${
                        lim.blockedKeys > 0
                          ? 'bg-rose-500/12 border-rose-400/30'
                          : 'bg-white/5 border-white/10'
                      }`}
                      title={`${lim.totalHits} lượt trong cửa sổ ${Math.round(lim.windowMs / 1000)} giây · trần ${lim.max}`}
                    >
                      <p className="text-[10px] text-neutral-400 font-semibold truncate">
                        {LIMITER_LABELS[lim.name] || lim.name}
                      </p>
                      <p
                        className={`text-lg font-bold font-mono ${
                          lim.blockedKeys > 0 ? 'text-rose-300' : 'text-neutral-200'
                        }`}
                      >
                        {lim.blockedKeys}
                        <span className="text-xs text-neutral-500">/{lim.trackedKeys}</span>
                      </p>
                      <p className="text-[9px] text-neutral-500 font-mono">
                        {lim.max} / {Math.round(lim.windowMs / 1000)}s
                      </p>
                    </div>
                  ))}
                </div>
              </section>

              {/* BỊ TỐ CÁO NHIỀU NHẤT */}
              {overview.topReported.length > 0 && (
                <section>
                  <h3 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-2">
                    <Radio className="w-3.5 h-3.5" />
                    Bị tố cáo nhiều nhất
                  </h3>
                  <div className="rounded-2xl border border-white/10 bg-white/5 divide-y divide-white/5">
                    {overview.topReported.map((item) => (
                      <div key={item.target} className="flex items-center justify-between gap-3 px-3 py-2">
                        <span className="text-xs text-neutral-300 font-mono truncate">{item.target}</span>
                        <span className="shrink-0 px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-400/30 text-[10px] font-bold text-rose-300 font-mono">
                          {item.count} tố cáo
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* NHẬT KÝ QUẢN TRỊ — truy vết ai quyết định gì */}
              <section>
                <h3 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-2">
                  <ScrollText className="w-3.5 h-3.5" />
                  Nhật ký quản trị
                  <span className="normal-case font-normal text-neutral-500">({overview.moderation.auditEntries} mục lưu)</span>
                </h3>
                {auditError ? (
                  <p role="alert" className="text-[11px] text-rose-300">{auditError}</p>
                ) : auditRows.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-white/10 p-3 text-center text-[11px] text-neutral-500">
                    Chưa có thao tác quản lý nào được ghi lại.
                  </p>
                ) : (
                  <div className="rounded-xl border border-white/10 bg-white/5 divide-y divide-white/5">
                    {auditRows.slice(0, 8).map((entry) => {
                      const at = Number(entry.at);
                      const auditDate = Number.isFinite(at) && at >= 0 ? new Date(at) : null;
                      return (
                      <div key={entry.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-3 py-2">
                        <div className="min-w-0">
                          <p className="text-[11px] text-neutral-200">
                            <span className="font-semibold">{entry.action.replace('moderate:', '')}</span>
                            {entry.targetEmail && <span className="ml-1.5 font-mono text-cyan-300">{entry.targetEmail}</span>}
                          </p>
                          <p className="text-[10px] text-neutral-500 truncate">
                            {entry.reason || 'Không có lý do'} · bởi {entry.by || 'quản trị'}
                          </p>
                        </div>
                        <time
                          className="shrink-0 text-[10px] text-neutral-600 font-mono"
                          dateTime={auditDate ? auditDate.toISOString() : undefined}
                        >
                          {auditDate && at > 0 ? auditDate.toLocaleString('vi-VN') : '—'}
                        </time>
                      </div>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* SỐ ĐẾM NỘI DUNG */}
              <section>
                <h3 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-2">
                  <Database className="w-3.5 h-3.5" />
                  Kho nội dung
                </h3>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(overview.counts).map(([key, value]) => (
                    <span
                      key={key}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-[11px] text-neutral-300 font-mono"
                    >
                      <span className="text-neutral-500">{key}</span>
                      <span className="font-bold text-white">{value}</span>
                    </span>
                  ))}
                </div>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */

const TONES = {
  good: 'text-emerald-300',
  warn: 'text-rose-300',
  neutral: 'text-neutral-200',
} as const;

const StatTile: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string | number;
  tone: keyof typeof TONES;
}> = ({ icon, label, value, tone }) => (
  <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
    <div className="flex items-center gap-1.5 text-[10px] text-neutral-400 font-semibold">
      {icon}
      <span className="truncate">{label}</span>
    </div>
    <p className={`mt-1 text-xl font-bold font-mono ${TONES[tone]}`}>{value}</p>
  </div>
);

const Row: React.FC<{
  label: string;
  value: string | number;
  tone?: 'warn';
}> = ({ label, value, tone }) => (
  <div className="flex items-center justify-between gap-3 px-3 py-2">
    <span className="text-neutral-400 truncate">{label}</span>
    <span
      className={`shrink-0 font-mono font-semibold ${tone === 'warn' ? 'text-rose-300' : 'text-neutral-100'}`}
    >
      {value}
    </span>
  </div>
);

export default AdminConsoleModal;
