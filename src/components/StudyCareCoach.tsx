/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Eye, X, Sparkles, Coffee } from 'lucide-react';

/**
 * Nghỉ mắt 20-20-20 (tính năng ẩn, hữu dụng cho người học nhiều giờ)
 * ------------------------------------------------------------------
 * Cứ mỗi 20 phút: nhìn ra xa 20 feet (~6m) trong 20 giây.
 * Hiển thị một lớp phủ "thở" dịu nhẹ, đếm ngược 20 giây rồi tự tắt,
 * giúp mắt không bị mỏi khi ôn bài/chat cùng F-Forum quá lâu.
 */
export interface StudyCareCoachProps {
  enabled: boolean;
  onToast?: (title: string, subtitle: string) => void;
  intervalMinutes?: number;
}

const EYE_REST_SECONDS = 20;
const TIPS = [
  'Nhìn ra cửa sổ hoặc một vật ở xa khoảng 6m để cơ mi mắt giãn ra.',
  'Chớp mắt chậm và đều để tuyến nước mắt phủ đều giác mạc.',
  'Thả lỏng vai, hạ cằm xuống một chút và hít thở sâu 4 nhịp.',
  'Nếu đeo kính áp tròng, đây là lúc tốt để nhỏ nước mắt nhân tạo.',
];

export const StudyCareCoach: React.FC<StudyCareCoachProps> = ({
  enabled,
  onToast,
  intervalMinutes = 20,
}) => {
  const [isResting, setIsResting] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(EYE_REST_SECONDS);
  const tipIndexRef = useRef(0);
  const [tip, setTip] = useState(TIPS[0]);
  const timerRef = useRef<number | null>(null);
  /* Mốc kết thúc theo ĐỒNG HỒ THẬT: tab bị treo/bóp nhịp thì lúc quay lại
     lớp phủ cũng tự đóng ngay, không thể kẹt lại chặn cả trang. */
  const endsAtRef = useRef<number>(0);

  const finish = useCallback(
    (announce: boolean) => {
      setIsResting(false);
      setSecondsLeft(EYE_REST_SECONDS);
      if (announce) {
        onToast?.('Mắt đã được nghỉ 20 giây 👁️', 'Quay lại bài học với một tinh thần tỉnh táo hơn nhé!');
      }
    },
    [onToast],
  );

  const start = useCallback(() => {
    if (isResting) return;
    tipIndexRef.current = (tipIndexRef.current + 1) % TIPS.length;
    setTip(TIPS[tipIndexRef.current]);
    setSecondsLeft(EYE_REST_SECONDS);
    endsAtRef.current = Date.now() + EYE_REST_SECONDS * 1000;
    setIsResting(true);
  }, [isResting]);

  /* Vòng lặp nhắc nhở */
  useEffect(() => {
    if (!enabled) return;
    const intervalMs = Math.max(1, intervalMinutes) * 60 * 1000;
    const id = window.setInterval(() => {
      if (document.hidden || isResting) return;
      start();
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [enabled, intervalMinutes, start, isResting]);

  /* Cho phép kích hoạt thủ công từ Bảng lệnh / Cài đặt (kể cả khi nhắc tự động đang tắt) */
  useEffect(() => {
    const handler = () => start();
    window.addEventListener('fforum_eye_rest_now', handler as EventListener);
    return () => window.removeEventListener('fforum_eye_rest_now', handler as EventListener);
  }, [start]);

  /* Đếm ngược 20 giây theo mốc thời gian thật (không cộng/trừ dồn) */
  useEffect(() => {
    if (!isResting) return;
    if (!endsAtRef.current) endsAtRef.current = Date.now() + EYE_REST_SECONDS * 1000;
    const sync = () => setSecondsLeft(Math.max(0, Math.ceil((endsAtRef.current - Date.now()) / 1000)));
    sync();
    timerRef.current = window.setInterval(sync, 500);
    /* Quay lại tab là tính lại ngay — hết giờ thì lớp phủ biến mất tức thì */
    document.addEventListener('visibilitychange', sync);
    window.addEventListener('focus', sync);
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      document.removeEventListener('visibilitychange', sync);
      window.removeEventListener('focus', sync);
    };
  }, [isResting]);

  useEffect(() => {
    if (isResting && secondsLeft <= 0) {
      finish(true);
    }
  }, [isResting, secondsLeft, finish]);

  /* Esc luôn thoát được lớp phủ nghỉ mắt */
  useEffect(() => {
    if (!isResting) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finish(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isResting, finish]);

  if (!isResting) return null;

  const progress = (EYE_REST_SECONDS - secondsLeft) / EYE_REST_SECONDS;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Nghỉ mắt 20-20-20"
      className="fixed inset-0 z-[96] flex items-center justify-center px-4 ff-eye-rest"
    >
      <div
        className="absolute inset-0 bg-[#03070c]/92 backdrop-blur-xl"
        style={{
          backgroundImage:
            'radial-gradient(circle at 50% 35%, rgba(34,211,238,0.16), transparent 62%), radial-gradient(circle at 50% 80%, rgba(245,158,11,0.12), transparent 60%)',
        }}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-md text-center text-white">
        <div className="relative mx-auto w-40 h-40 mb-6">
          <span className="ff-eye-rest__ring absolute inset-0 rounded-full border border-cyan-300/30" aria-hidden="true" />
          <span
            className="ff-eye-rest__breath absolute inset-4 rounded-full bg-gradient-to-br from-cyan-400/25 via-emerald-400/15 to-transparent border border-white/15 flex items-center justify-center"
            aria-hidden="true"
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <Eye className="w-6 h-6 text-cyan-300 mb-1" />
            <span className="text-3xl font-mono font-bold text-white">{secondsLeft}s</span>
          </div>
        </div>

        <h2 className="text-lg font-bold tracking-tight">Nghỉ mắt 20-20-20</h2>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-white/70 max-w-sm mx-auto">{tip}</p>

        <div className="mt-5 h-1.5 w-56 mx-auto rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full ff-aurora-bar transition-[width] duration-1000 ease-linear"
            style={{ width: `${Math.min(100, progress * 100)}%` }}
          />
        </div>

        <div className="mt-6 flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => finish(false)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold bg-white/10 hover:bg-white/20 border border-white/15 transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            Bỏ qua lần này
          </button>
          <button
            type="button"
            onClick={() => {
              finish(false);
              window.dispatchEvent(new CustomEvent('fforum_open_daily'));
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/35 text-amber-200 transition-colors cursor-pointer"
          >
            <Coffee className="w-3.5 h-3.5" />
            Điểm danh luôn
          </button>
        </div>

        <p className="mt-5 text-[10px] text-white/40 inline-flex items-center gap-1.5">
          <Sparkles className="w-3 h-3 text-amber-300" />
          Mẹo này bật/tắt được trong Cài đặt → Trải nghiệm
        </p>
      </div>
    </div>
  );
};

export default StudyCareCoach;
