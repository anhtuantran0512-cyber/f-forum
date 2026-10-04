/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React, { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';

/* ==========================================================================
   CodeFronts la-09 — Music Player Vinyl Spin Loading Animation
   --------------------------------------------------------------------------
   Đã lược bỏ các nút demo (đổi theme / xong) và gắn nhãn phân khu thật:
   đĩa than quay, tay cần hạ xuống theo chu kỳ, dải equalizer nhấp nhô,
   dòng trạng thái đọc như một "now loading" row thật.
   ========================================================================== */
export interface ViewTransitionLoaderProps {
  visible: boolean;
  /** Nhãn phân khu đích, ví dụ "Khu Vinh Danh". */
  targetLabel?: string;
  /** Câu trạng thái đổi dần để người dùng biết hệ thống đang làm gì. */
  hints?: string[];
  variant?: 'vinyl' | 'dots';
  /** Bấm phím/chuột để bỏ qua màn chờ (lưới an toàn nếu tải lâu). */
  onSkip?: () => void;
}

const DEFAULT_HINTS = [
  'Đang kết nối máy chủ F-Forum',
  'Đang tải tài nguyên phân khu',
  'Đang dựng giao diện',
  'Chuẩn bị xong — mời bạn vào',
];

export const ViewTransitionLoader: React.FC<ViewTransitionLoaderProps> = ({
  visible,
  targetLabel,
  hints = DEFAULT_HINTS,
  variant = 'vinyl',
  onSkip,
}) => {
  const [hintIndex, setHintIndex] = useState(0);

  /* Bấm chuột hoặc Esc là thoát màn chờ ngay — không bao giờ kẹt ở màn hình này */
  useEffect(() => {
    if (!visible || !onSkip) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter') onSkip();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible, onSkip]);

  /* Chỉ chạy đồng hồ đổi câu trạng thái khi màn hình chờ đang hiện */
  useEffect(() => {
    if (!visible) return;
    const id = window.setInterval(() => {
      setHintIndex((prev) => prev + 1);
    }, 1100);
    return () => window.clearInterval(id);
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      className={`la-09 ff-transition-loader la-09--${variant}`}
      data-state="loading"
      aria-hidden={false}
      onPointerDown={onSkip}
      title={onSkip ? 'Bấm để vào ngay' : undefined}
    >
      <div
        className="la-09__veil"
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(70% 55% at 22% 12%, rgba(123,92,255,0.22), transparent 62%), radial-gradient(60% 50% at 82% 88%, rgba(255,45,149,0.18), transparent 62%), rgba(4,6,11,0.94)',
          backdropFilter: 'blur(10px)',
        }}
      />

      <section
        className="la-09__card"
        role="status"
        aria-live="polite"
        aria-label={`Đang tải ${targetLabel || 'phân khu'}`}
      >
        <div className="la-09__deck" aria-hidden="true">
          <span className="la-09__disc">
            <span className="la-09__label" />
            <span className="la-09__spindle" />
          </span>
          <span className="la-09__gloss" />
          <span className="la-09__arm">
            <i className="la-09__post" />
            <i className="la-09__head" />
          </span>
        </div>

        <div className="la-09__copy">
          <p className="la-09__title inline-flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-300" />
            {targetLabel ? `Đang mở ${targetLabel}` : 'Đang tải phân khu'}
          </p>
          <p className="la-09__state">{hints[hintIndex % hints.length]}</p>
        </div>

        <p className="la-09__eq" aria-hidden="true">
          {Array.from({ length: 12 }).map((_, i) => (
            <i key={i} style={{ ['--i' as string]: i } as React.CSSProperties} />
          ))}
        </p>

        <div className="la-09__bar" aria-hidden="true">
          <span className="la-09__bar-fill" />
        </div>
      </section>
    </div>
  );
};

/* ==========================================================================
   CodeFronts la-05 — AI Chat Thinking Dots Loading Animation
   --------------------------------------------------------------------------
   Bong bóng "đang soạn tin" với 3 chấm nảy theo đường cong linear() thật,
   dòng trạng thái đổi theo từng giai đoạn kết nối.
   ========================================================================== */
export interface ThinkingBubbleProps {
  /** Nội dung câu trạng thái đang chạy. */
  phase?: string;
  authorName?: string;
  avatarUrl?: string;
  compact?: boolean;
}

export const ThinkingBubble: React.FC<ThinkingBubbleProps> = ({
  phase = 'Đang kết nối máy chủ…',
  authorName = 'F-Forum',
  avatarUrl,
  compact = false,
}) => (
  <div className="la-05__row" role="status" aria-live="polite" aria-label="Đang tải tin nhắn">
    <span className="la-05__avatar" aria-hidden="true">
      {avatarUrl ? (
        <img src={avatarUrl} alt="" width={32} height={32} className="w-full h-full rounded-full object-cover" />
      ) : (
        <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
          <path d="M12 4.5 13.8 9l4.7 1.7-4.7 1.7L12 17l-1.8-4.6L5.5 10.7 10.2 9z" />
        </svg>
      )}
    </span>

    <div className={`la-05__bubble ${compact ? 'la-05__bubble--compact' : ''}`}>
      <span className="la-05__tail" aria-hidden="true" />
      <span className="la-05__dots" aria-hidden="true">
        <i className="la-05__dot" />
        <i className="la-05__dot" />
        <i className="la-05__dot" />
      </span>
      <p className="la-05__phase">{phase}</p>
      <p className="la-05__who">{authorName}</p>
    </div>
  </div>
);

export default ViewTransitionLoader;
