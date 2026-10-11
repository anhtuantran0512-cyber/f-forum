/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React, { useEffect, useState } from 'react';
import { ArrowLeft, RefreshCw, SearchX, WifiOff } from 'lucide-react';
import './QADetail.css';

/* Khung cuộn của trang chi tiết: phủ kín khu vực, nội dung trượt dưới thanh điều hướng nổi.
   KHÔNG đặt padding ở chính khung cuộn: `position: sticky` bên trong tính mép dính từ mép TRONG của padding,
   nên padding-top 112px sẽ đẩy sidebar dính xuống thêm 112px. Phần đệm nằm ở div bên trong (QA_DETAIL_PADDING_CLASS). */
export const QA_DETAIL_FRAME_CLASS = 'absolute inset-0 overflow-y-auto overscroll-contain';

/* Phần đệm tránh thanh điều hướng (điện thoại có cả thanh trên 54px lẫn thanh dưới 56px). Dùng chung cho trang thật
   và khung chờ của shell để lúc chuyển từ khung chờ sang nội dung không bị nhảy bố cục. */
export const QA_DETAIL_PADDING_CLASS =
  'px-4 sm:px-8 pt-[calc(54px+var(--safe-top)+16px)] md:pt-28 pb-[calc(56px+var(--safe-bottom)+32px)] md:pb-16';

/** Khung chờ cho trang chi tiết: đúng hình dáng trang thật (đầu bài + vài lời giải) để không bị "giật" khi nội dung tới. */
export const QADetailSkeleton: React.FC = () => (
  <div className="mx-auto w-full max-w-6xl grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] items-start" aria-busy="true" aria-label="Đang tải câu hỏi">
    <div className="space-y-5">
      <div className="h-5 w-40 rounded-md bg-white/10 animate-pulse" />
      <div className="rounded-3xl border border-white/10 bg-neutral-950/60 p-6 space-y-4">
        <div className="flex gap-2">
          <div className="h-6 w-36 rounded-full bg-white/10 animate-pulse" />
          <div className="h-6 w-16 rounded-full bg-white/10 animate-pulse" />
        </div>
        <div className="h-8 w-4/5 rounded-lg bg-white/10 animate-pulse" />
        <div className="h-4 w-48 rounded bg-white/10 animate-pulse" />
        <div className="space-y-2 pt-2">
          <div className="h-4 w-full rounded bg-white/10 animate-pulse" />
          <div className="h-4 w-11/12 rounded bg-white/10 animate-pulse" />
          <div className="h-4 w-2/3 rounded bg-white/10 animate-pulse" />
        </div>
      </div>
      {[0, 1].map((row) => (
        <div key={row} className="rounded-2xl border border-white/10 bg-neutral-950/60 p-5 space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-white/10 animate-pulse" />
            <div className="h-4 w-40 rounded bg-white/10 animate-pulse" />
          </div>
          <div className="h-4 w-3/4 rounded bg-white/10 animate-pulse" />
        </div>
      ))}
    </div>
    <div className="hidden lg:block space-y-3">
      <div className="h-5 w-44 rounded bg-white/10 animate-pulse" />
      {[0, 1, 2].map((row) => (
        <div key={row} className="h-16 rounded-xl bg-white/10 animate-pulse" />
      ))}
    </div>
  </div>
);

interface UnavailableProps {
  isSynced: boolean;
  onBack: () => void;
}

/* Chờ bấy nhiêu ms sau khi đồng bộ xong rồi mới kết luận "không có câu này":
   cờ isSynced bật ngay khi máy chủ phản hồi, TRƯỚC khi dữ liệu kịp vào state — kết luận sớm sẽ nháy lỗi oan. */
const SETTLE_MS = 450;
/* Quá ngần này mà vẫn chưa đồng bộ được → báo mất kết nối thay vì quay tròn mãi. */
const GIVE_UP_MS = 8000;

/** Câu hỏi chưa có trong dữ liệu: đang tải, đã bị xóa/sai đường dẫn, hay không kết nối được máy chủ. */
export const QADetailUnavailable: React.FC<UnavailableProps> = ({ isSynced, onBack }) => {
  const [phase, setPhase] = useState<'wait' | 'missing' | 'offline'>('wait');

  useEffect(() => {
    const timer = window.setTimeout(() => setPhase(isSynced ? 'missing' : 'offline'), isSynced ? SETTLE_MS : GIVE_UP_MS);
    return () => window.clearTimeout(timer);
  }, [isSynced]);

  /* Đổi trạng thái đồng bộ giữa chừng thì tính lại từ đầu (không "thừa hưởng" kết luận cũ). */
  const waiting = phase === 'wait' || (phase === 'missing' && !isSynced) || (phase === 'offline' && isSynced);
  if (waiting) return <QADetailSkeleton />;

  const offline = phase === 'offline';
  const Icon = offline ? WifiOff : SearchX;
  return (
    <div className="mx-auto w-full max-w-xl pt-6">
      <div role="status" className="liquid-glass rounded-3xl border border-white/15 bg-neutral-950/70 p-8 text-center space-y-3">
        <Icon className="w-12 h-12 mx-auto text-neutral-400" aria-hidden="true" />
        <h1 className="text-lg font-bold text-white">
          {offline ? 'Chưa tải được dữ liệu từ máy chủ' : 'Không tìm thấy câu hỏi này'}
        </h1>
        <p className="text-sm text-neutral-300 leading-relaxed">
          {offline
            ? 'Kiểm tra kết nối mạng rồi thử lại. Câu hỏi sẽ hiện ra ngay khi kết nối được.'
            : 'Câu hỏi có thể đã bị xóa, hoặc đường dẫn không còn đúng.'}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
          {offline && (
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-1.5 px-4 min-h-10 rounded-xl bg-white/10 hover:bg-white/20 text-neutral-100 border border-white/15 text-sm font-semibold cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" aria-hidden="true" /> Thử lại
            </button>
          )}
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 px-4 min-h-10 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-neutral-950 text-sm font-bold cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Về danh sách Hỏi đáp
          </button>
        </div>
      </div>
    </div>
  );
};
