/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React, { useCallback, useEffect, useState } from 'react';
import { ShieldAlert, X, CheckCircle2, XCircle, Trash2, RefreshCw, Flag } from 'lucide-react';
import { authHeaders, postJson } from '../utils/session';
import { pushNotification } from '../utils/notifications';

/* ==========================================================================
   Hộp thư báo cáo vi phạm — dành riêng cho Super Admin
   --------------------------------------------------------------------------
   Nút "Tố Cáo Tài Khoản" đã có ở hồ sơ, phòng chat và sàn Q&A, nhưng trước đây
   báo cáo chỉ được POST lên server rồi nằm đó: không có màn hình nào đọc lại,
   và `reports` còn bị vứt mỗi lần khởi động server. Component này là nửa còn
   thiếu để quy trình tố cáo thực sự khép kín.
   ========================================================================== */

export interface ReportRecord {
  id: string;
  reporterId?: string;
  reporterName?: string;
  reporterEmail?: string;
  reportedUserId?: string;
  reportedUserName?: string;
  reason?: string;
  details?: string;
  status?: 'PENDING' | 'RESOLVED' | 'DISMISSED';
  createdAt?: string;
  resolvedAt?: string;
  resolutionNote?: string;
}

interface ReportInboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Số báo cáo chưa xử lý, dùng cho huy hiệu trên nút mở. */
  onPendingCountChange?: (count: number) => void;
}

type FilterKey = 'PENDING' | 'RESOLVED' | 'DISMISSED' | 'ALL';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'PENDING', label: 'Chờ xử lý' },
  { key: 'RESOLVED', label: 'Đã xử lý' },
  { key: 'DISMISSED', label: 'Đã bỏ qua' },
  { key: 'ALL', label: 'Tất cả' },
];

const formatWhen = (iso?: string): string => {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const statusBadge = (status?: ReportRecord['status']) => {
  if (status === 'RESOLVED') {
    return { label: 'Đã xử lý', className: 'text-emerald-300 bg-emerald-400/10 border-emerald-400/30' };
  }
  if (status === 'DISMISSED') {
    return { label: 'Đã bỏ qua', className: 'text-neutral-300 bg-white/5 border-white/15' };
  }
  return { label: 'Chờ xử lý', className: 'text-rose-300 bg-rose-400/10 border-rose-400/30' };
};

export const ReportInboxModal: React.FC<ReportInboxModalProps> = ({
  isOpen,
  onClose,
  onPendingCountChange,
}) => {
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [filter, setFilter] = useState<FilterKey>('PENDING');
  /* Cửa sổ chỉ được mount khi mở, nên lần tải đầu là mặc định → bắt đầu ở true
     để effect không phải setState đồng bộ (tránh vòng render dây chuyền). */
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  /**
   * Chỉ làm phần mạng + bóc tách dữ liệu, KHÔNG đụng tới state — nhờ vậy gọi
   * được từ cả effect khởi động lẫn nút tải lại mà không gây render dây chuyền.
   */
  const fetchReports = useCallback(async (): Promise<
    { ok: true; list: ReportRecord[] } | { ok: false; message: string }
  > => {
    try {
      const res = await fetch('/api/admin/reports', { headers: authHeaders() });
      const json = await res.json().catch(() => null);
      if (res.status === 403) {
        return { ok: false, message: 'Chỉ Super Admin mới xem được hộp thư tố cáo.' };
      }
      if (!res.ok || !json?.success) {
        return { ok: false, message: json?.message || 'Không tải được danh sách báo cáo.' };
      }
      const list: ReportRecord[] = Array.isArray(json.reports) ? json.reports : [];
      /* Mới nhất lên đầu để báo cáo vừa gửi không bị chôn. */
      return { ok: true, list: [...list].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))) };
    } catch {
      return { ok: false, message: 'Mất kết nối tới máy chủ. Vui lòng thử lại.' };
    }
  }, []);

  const pendingOf = (list: ReportRecord[]): number =>
    list.filter((r) => r.status !== 'RESOLVED' && r.status !== 'DISMISSED').length;

  /* Nút tải lại: được phép bật spinner đồng bộ vì đây là event handler. */
  const reload = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    const result = await fetchReports();
    if (result.ok) {
      setReports(result.list);
      onPendingCountChange?.(pendingOf(result.list));
    } else {
      setErrorMsg(result.message);
    }
    setIsLoading(false);
  }, [fetchReports, onPendingCountChange]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await fetchReports();
      if (cancelled) return;
      if (result.ok) {
        setReports(result.list);
        onPendingCountChange?.(pendingOf(result.list));
      } else {
        setErrorMsg(result.message);
      }
      setIsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchReports, onPendingCountChange]);

  /* Ban quản trị ở tab/thiết bị khác vừa xử lý một báo cáo → tự tải lại. */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onChanged = () => {
      void reload();
    };
    window.addEventListener('fforum_reports_changed', onChanged);
    return () => window.removeEventListener('fforum_reports_changed', onChanged);
  }, [reload]);

  /* Đóng bằng Escape cho nhất quán với các cửa sổ khác trong app. */
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const actOn = async (report: ReportRecord, action: 'RESOLVED' | 'DISMISSED' | 'delete') => {
    setBusyId(report.id);
    setErrorMsg(null);
    try {
      const { status, data } = await postJson('/api/admin/reports/resolve', {
        reportId: report.id,
        status: action === 'delete' ? undefined : action,
        action,
      });
      if (status !== 200 || !data?.success) {
        setErrorMsg(data?.message || 'Không cập nhật được báo cáo.');
        return;
      }
      if (action === 'delete') {
        setReports((prev) => prev.filter((r) => r.id !== report.id));
      } else {
        setReports((prev) =>
          prev.map((r) =>
            r.id === report.id
              ? { ...r, status: action, resolvedAt: new Date().toISOString() }
              : r,
          ),
        );
      }
      /* Đếm lại từ danh sách vừa cập nhật — không suy diễn bằng số trừ. */
      const nextList =
        action === 'delete'
          ? reports.filter((r) => r.id !== report.id)
          : reports.map((r) => (r.id === report.id ? { ...r, status: action } : r));
      onPendingCountChange?.(
        nextList.filter((r) => r.status !== 'RESOLVED' && r.status !== 'DISMISSED').length,
      );
      pushNotification({
        type: 'system',
        category: 'system',
        title: action === 'delete' ? 'Đã xoá báo cáo' : action === 'RESOLVED' ? 'Đã xử lý báo cáo' : 'Đã bỏ qua báo cáo',
        body: `${report.reportedUserName || report.reportedUserId || 'Đối tượng'} — ${report.reason || 'không rõ lý do'}`,
        targetView: 'home',
      });
    } catch {
      setErrorMsg('Mất kết nối tới máy chủ.');
    } finally {
      setBusyId(null);
    }
  };

  if (!isOpen) return null;

  const visible = reports.filter((r) => {
    if (filter === 'ALL') return true;
    if (filter === 'PENDING') return r.status !== 'RESOLVED' && r.status !== 'DISMISSED';
    return r.status === filter;
  });
  const pendingCount = reports.filter((r) => r.status !== 'RESOLVED' && r.status !== 'DISMISSED').length;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Đóng hộp thư tố cáo"
        className="absolute inset-0 bg-black/70 backdrop-blur-md cursor-default"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Hộp thư báo cáo vi phạm"
        className="relative w-full max-w-3xl max-h-[85vh] overflow-hidden rounded-3xl liquid-glass bg-[#0c1218]/95 border border-white/15 shadow-[0_30px_80px_rgba(0,0,0,0.85)] flex flex-col"
      >
        {/* Đầu cửa sổ */}
        <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <span className="w-11 h-11 rounded-2xl bg-rose-500/15 border border-rose-400/30 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5 text-rose-300" />
            </span>
            <div>
              <h2 className="font-playfair text-xl text-white leading-tight">Hộp Thư Tố Cáo</h2>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                {pendingCount > 0 ? `${pendingCount} báo cáo đang chờ xử lý` : 'Không còn báo cáo nào chờ xử lý'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void reload()}
              className="p-2 rounded-xl border border-white/15 text-neutral-300 hover:bg-white/10 transition-colors"
              aria-label="Tải lại danh sách"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl border border-white/15 text-neutral-300 hover:bg-white/10 transition-colors"
              aria-label="Đóng"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Bộ lọc */}
        <div className="flex flex-wrap items-center gap-2 px-6 py-3 border-b border-white/10">
          {FILTERS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setFilter(item.key)}
              className={`px-3 py-1.5 rounded-full text-[11px] border transition-colors ${
                filter === item.key
                  ? 'bg-white/15 border-white/30 text-white'
                  : 'bg-white/5 border-white/10 text-neutral-400 hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Danh sách */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {errorMsg && (
            <div className="px-4 py-3 rounded-2xl bg-rose-500/10 border border-rose-400/30 text-[12px] text-rose-200">
              {errorMsg}
            </div>
          )}

          {isLoading && reports.length === 0 && (
            <div className="flex items-center justify-center py-12 text-neutral-500 text-sm">
              Đang tải danh sách báo cáo…
            </div>
          )}

          {!isLoading && visible.length === 0 && !errorMsg && (
            <div className="flex flex-col items-center justify-center py-14 text-center">
              <Flag className="w-7 h-7 text-neutral-600 mb-3" />
              <p className="text-sm text-neutral-400">Không có báo cáo nào trong mục này.</p>
            </div>
          )}

          {visible.map((report) => {
            const badge = statusBadge(report.status);
            const isPending = report.status !== 'RESOLVED' && report.status !== 'DISMISSED';
            return (
              <article
                key={report.id}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-3"
              >
                <header className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm text-white font-medium truncate">
                      {report.reportedUserName || 'Người dùng không rõ tên'}
                      <span className="text-neutral-500 font-normal"> · {report.reportedUserId || '—'}</span>
                    </p>
                    <p className="text-[11px] text-neutral-500 mt-0.5">
                      Người tố cáo: {report.reporterName || 'Ẩn danh'} · {formatWhen(report.createdAt)}
                    </p>
                  </div>
                  <span className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] border ${badge.className}`}>
                    {badge.label}
                  </span>
                </header>

                <div className="space-y-1.5">
                  <p className="text-[12px] text-amber-200/90">
                    <span className="text-neutral-500">Lý do: </span>
                    {report.reason || '—'}
                  </p>
                  {report.details && (
                    <p className="text-[12px] text-neutral-300 leading-relaxed whitespace-pre-wrap break-words">
                      {report.details}
                    </p>
                  )}
                </div>

                {report.resolutionNote && (
                  <p className="text-[11px] text-neutral-500 italic">
                    Ghi chú xử lý: {report.resolutionNote} · {formatWhen(report.resolvedAt)}
                  </p>
                )}

                {isPending && (
                  <footer className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="button"
                      disabled={busyId === report.id}
                      onClick={() => void actOn(report, 'RESOLVED')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] bg-emerald-500/15 border border-emerald-400/30 text-emerald-200 hover:bg-emerald-500/25 transition-colors disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Đã xử lý
                    </button>
                    <button
                      type="button"
                      disabled={busyId === report.id}
                      onClick={() => void actOn(report, 'DISMISSED')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] bg-white/5 border border-white/15 text-neutral-300 hover:bg-white/10 transition-colors disabled:opacity-50"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Bỏ qua
                    </button>
                    <button
                      type="button"
                      disabled={busyId === report.id}
                      onClick={() => void actOn(report, 'delete')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] bg-rose-500/10 border border-rose-400/25 text-rose-200 hover:bg-rose-500/20 transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Xoá
                    </button>
                  </footer>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ReportInboxModal;
