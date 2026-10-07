import React, { useMemo, useState } from 'react';

export type CelebrationTone = 'gold' | 'emerald' | 'violet' | 'rose';

interface CelebrationBurstProps {
  /** Số tăng dần mỗi lần cần bắn hiệu ứng; 0 nghĩa là chưa bắn lần nào. */
  trigger: number;
  tone?: CelebrationTone;
  /** Nhãn hiện giữa màn hình, ví dụ "Lên cấp 12!". */
  headline?: string;
  count?: number;
}

const PALETTES: Record<CelebrationTone, string[]> = {
  gold: ['#fbbf24', '#fde68a', '#f59e0b', '#fffbeb', '#fcd34d'],
  emerald: ['#34d399', '#a7f3d0', '#10b981', '#ecfdf5', '#6ee7b7'],
  violet: ['#a78bfa', '#ddd6fe', '#8b5cf6', '#f5f3ff', '#c4b5fd'],
  rose: ['#fb7185', '#fecdd3', '#f43f5e', '#fff1f2', '#fda4af'],
};

interface Particle {
  id: number;
  left: number;
  delay: number;
  duration: number;
  size: number;
  color: string;
  drift: number;
  spin: number;
  shape: 'square' | 'circle' | 'bar';
}

/**
 * Bắn hoa giấy từ mép trên khi người dùng đạt một mốc (lên cấp, được chọn đáp
 * án chuẩn, duyệt CLB…).
 *
 * Hạt sinh ngẫu nhiên MỘT lần cho mỗi lượt kích hoạt rồi giữ trong memo, nên
 * hoạt ảnh chạy thuần bằng CSS, không có vòng lặp JS nào khi đang rơi — rẻ hơn
 * canvas animation nhiều cho một hiệu ứng ngắn.
 *
 * Trạng thái "đang bắn" được SUY RA từ `trigger` ngay trong lúc render thay vì
 * đặt bằng setState trong effect, nhờ vậy không gây chuỗi render dây chuyền.
 * Việc dọn phần tử do chính sự kiện `animationend` của một phần tử canh giờ
 * đảm nhiệm, không dùng setTimeout.
 *
 * Tôn trọng `prefers-reduced-motion`: khi đó không bắn hạt, chỉ hiện nhãn chữ.
 */
export const CelebrationBurst: React.FC<CelebrationBurstProps> = ({
  trigger,
  tone = 'gold',
  headline,
  count = 44,
}) => {
  /* Lượt bắn nào đã chạy xong — cập nhật từ event handler, không phải effect. */
  const [finishedTick, setFinishedTick] = useState(0);

  const active = trigger !== 0 && trigger !== finishedTick;

  /* Hạt sinh từ `trigger` để mỗi lượt có bố cục khác nhau mà vẫn tái lập được
     (không đổi giữa các lần render), và không gọi Math.random lúc render. */
  const particles = useMemo<Particle[]>(() => {
    if (!active) return [];
    if (typeof window === 'undefined') return [];
    if (
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ||
      document.documentElement.classList.contains('reduce-motion')
    ) {
      return [];
    }
    const palette = PALETTES[tone];
    const shapes: Particle['shape'][] = ['square', 'circle', 'bar'];
    let x = (trigger * 9301 + 49297) % 233280;
    const rnd = () => {
      x = (x * 9301 + 49297) % 233280;
      return x / 233280;
    };
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      left: rnd() * 100,
      delay: rnd() * 260,
      duration: 1000 + rnd() * 500,
      size: 6 + rnd() * 7,
      color: palette[Math.floor(rnd() * palette.length)],
      drift: (rnd() - 0.5) * 180,
      spin: (rnd() - 0.5) * 720,
      shape: shapes[Math.floor(rnd() * shapes.length)],
    }));
  }, [active, count, tone, trigger]);

  if (!active) return null;

  const reducedMotion = particles.length === 0;

  return (
    <div className="ff-celebrate" aria-live="polite" role="status">
      <span className="ff-celebrate__field" aria-hidden="true">
        {particles.map((p) => (
          <i
            key={p.id}
            className={`ff-confetti ff-confetti--${p.shape}`}
            style={{
              left: `${p.left}%`,
              width: p.shape === 'bar' ? p.size * 0.42 : p.size,
              height: p.shape === 'bar' ? p.size * 1.7 : p.size,
              backgroundColor: p.color,
              animationDelay: `${p.delay}ms`,
              animationDuration: `${p.duration}ms`,
              ['--ff-drift' as string]: `${p.drift}px`,
              ['--ff-spin' as string]: `${p.spin}deg`,
            }}
          />
        ))}
      </span>

      {headline && (
        <span
          className={`ff-celebrate__headline${reducedMotion ? ' ff-celebrate__headline--still' : ''}`}
        >
          {headline}
        </span>
      )}

      {/* Phần tử canh giờ vô hình: hoạt ảnh của nó dài hơn mọi hạt, nên khi nó
          kết thúc là cả đợt bắn đã xong — dọn một lần, đúng một lần. */}
      <i
        className="ff-celebrate__sentinel"
        aria-hidden="true"
        onAnimationEnd={() => setFinishedTick(trigger)}
      />
    </div>
  );
};

export default CelebrationBurst;
