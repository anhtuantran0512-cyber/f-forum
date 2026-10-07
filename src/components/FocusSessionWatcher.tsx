/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React, { useCallback, useEffect, useState } from 'react';
import { Timer, Pause, CheckCircle2, Coffee, ArrowUpRight, AlertTriangle } from 'lucide-react';
import {
  computeStudyTotals,
  formatDuration,
  logStudyMinutes,
  readStudySessions,
  sessionsForOwner,
} from '../utils/studyLog';
import {
  FOCUS_STALE_GRACE_MS,
  FOCUS_STOP_REQUEST_EVENT,
  announceFocusCredited,
  clearFocusSession,
  focusElapsedMinutes,
  focusProgressPercent,
  focusRemainingLabel,
  readFocusSession,
  subscribeFocusSession,
  type FocusSessionState,
} from '../utils/focusSession';

/**
 * Người giữ nhịp cho Phòng Tập Trung (chạy ở cấp App, không nằm trong HUD).
 * ---------------------------------------------------------------------------
 * • Đếm theo mốc thời gian thật → đóng HUD, đổi phân khu hay tab chạy nền vẫn đúng.
 * • Hoàn thành phiên Học 25 phút → ghi giờ học; XP/Coin chỉ nhận sau khi server xác nhận.
 * • Dừng giữa đường → ghi số phút THỰC học (từ 5 phút), không gửi yêu cầu nhận thưởng.
 * • Hiện chip đếm ngược nổi khi HUD đang đóng để không ai quên mình đang học.
 */
interface FocusSessionWatcherProps {
  userEmail?: string;
  onCompleteReward?: (sessionId: string) => Promise<boolean>;
  onCancelReward?: (sessionId?: string) => Promise<void>;
  isHudOpen: boolean;
  onOpenHud: () => void;
}

interface FocusToast {
  id: number;
  kind: 'credited' | 'partial' | 'break' | 'lost';
  title: string;
  detail: string;
}

const FocusSessionWatcher: React.FC<FocusSessionWatcherProps> = ({
  userEmail,
  onCompleteReward,
  onCancelReward,
  isHudOpen,
  onOpenHud,
}) => {
  const [session, setSession] = useState<FocusSessionState | null>(() => readFocusSession());
  const [now, setNow] = useState(() => Date.now());
  const [toast, setToast] = useState<FocusToast | null>(null);

  /* Đồng bộ với mọi nơi bắt/đổi/dừng phiên */
  useEffect(() => {
    return subscribeFocusSession(() => setSession(readFocusSession()));
  }, []);

  const todayMinutes = useCallback(
    () => computeStudyTotals(sessionsForOwner(readStudySessions(), userEmail)).todayMinutes,
    [userEmail],
  );

  /* Ghi nhận một phiên đã kết thúc thật */
  const settleSession = useCallback(
    async (finished: FocusSessionState, lateByMs: number) => {
      clearFocusSession();

      if (finished.mode === 'break') {
        setToast({
          id: Date.now(),
          kind: 'break',
          title: 'Hết giờ nghỉ',
          detail: 'Quay lại bàn học nào — bấm Bắt đầu tập trung để mở phiên 25 phút mới.',
        });
        return;
      }

      if (lateByMs > FOCUS_STALE_GRACE_MS) {
        void onCancelReward?.(finished.serverSessionId);
        setToast({
          id: Date.now(),
          kind: 'lost',
          title: 'Phiên học đã kết thúc khi tab đóng',
          detail: 'Không cộng giờ để tránh sai số. Hãy mở lại Phòng Tập Trung và bắt đầu phiên mới nhé.',
        });
        return;
      }

      const minutes = Math.max(1, Math.round(finished.plannedMinutes));
      logStudyMinutes(minutes, 'focus', userEmail);
      const rewardGranted = finished.serverSessionId
        ? await onCompleteReward?.(finished.serverSessionId) ?? false
        : false;
      announceFocusCredited(minutes, 'work');

      const total = todayMinutes();
      setToast({
        id: Date.now(),
        kind: 'credited',
        title: `Đã ghi +${minutes} phút học`,
        detail: rewardGranted
          ? `Hôm nay bạn đã học ${formatDuration(total)} · máy chủ đã cấp +25 XP và Coin.`
          : `Hôm nay bạn đã học ${formatDuration(total)} · phần giờ học đã lưu, không có thưởng Coin/XP cho phiên này.`,
      });
    },
    [onCompleteReward, onCancelReward, todayMinutes, userEmail],
  );

  /* Nhịp 500ms chỉ để vẽ lại; giờ giấc luôn tính từ Date.now() */
  useEffect(() => {
    if (!session) return;
    const id = window.setInterval(() => {
      const tick = Date.now();
      setNow(tick);
      const current = readFocusSession();
      if (!current) return;
      if (tick >= current.endsAt) settleSession(current, tick - current.endsAt);
    }, 500);
    return () => window.clearInterval(id);
  }, [session, settleSession]);

  /* Toast tự tắt sau 5.5s */
  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 5500);
    return () => window.clearTimeout(id);
  }, [toast]);

  /* Dừng sớm: ghi số phút thực học (>= 5 phút), không cộng XP */
  const handleStopEarly = useCallback(() => {
    if (!session) return;
    const studied = focusElapsedMinutes(session);
    void onCancelReward?.(session.serverSessionId);
    clearFocusSession();
    if (session.mode === 'work' && studied >= 5) {
      logStudyMinutes(studied, 'focus', userEmail);
      const total = todayMinutes();
      setToast({
        id: Date.now(),
        kind: 'partial',
        title: `Dừng sớm — đã ghi ${studied} phút thực học`,
        detail: `Hôm nay bạn đã học ${formatDuration(total)}. Học đủ 25 phút mới có XP nhé.`,
      });
    } else {
      setToast({
        id: Date.now(),
        kind: 'break',
        title: 'Đã dừng phiên tập trung',
        detail:
          session.mode === 'work'
            ? 'Phiên dưới 5 phút nên không ghi vào nhật ký giờ học.'
            : 'Giờ nghỉ đã kết thúc sớm.',
      });
    }
  }, [session, onCancelReward, todayMinutes, userEmail]);

  /* HUD (hoặc bất kỳ nơi nào) xin dừng phiên → dùng CHUNG một luồng ghi nhận */
  useEffect(() => {
    window.addEventListener(FOCUS_STOP_REQUEST_EVENT, handleStopEarly);
    return () => window.removeEventListener(FOCUS_STOP_REQUEST_EVENT, handleStopEarly);
  }, [handleStopEarly]);

  const showChip = Boolean(session) && !isHudOpen;
  const remainingLabel = session ? focusRemainingLabel(session, now) : '';
  const progress = session ? focusProgressPercent(session, now) : 0;

  return (
    <>
      {showChip && session && (
        <div className="ff-focus-chip" role="status" aria-live="polite">
          <button
            type="button"
            className="ff-focus-chip__main"
            onClick={onOpenHud}
            title="Mở Phòng Tập Trung"
          >
            <span className={`ff-focus-chip__icon ${session.mode === 'work' ? '' : 'is-break'}`}>
              {session.mode === 'work' ? <Timer className="w-3.5 h-3.5" /> : <Coffee className="w-3.5 h-3.5" />}
            </span>
            <span className="ff-focus-chip__copy">
              <b>{remainingLabel}</b>
              <small>{session.mode === 'work' ? 'Đang tập trung' : 'Đang nghỉ'}</small>
            </span>
            <ArrowUpRight className="w-3.5 h-3.5 ff-focus-chip__open" aria-hidden="true" />
          </button>
          <button
            type="button"
            className="ff-focus-chip__stop"
            onClick={handleStopEarly}
            title="Dừng phiên"
            aria-label="Dừng phiên tập trung"
          >
            <Pause className="w-3.5 h-3.5" />
          </button>
          <span className="ff-focus-chip__track" aria-hidden="true">
            <i style={{ width: `${progress}%` }} />
          </span>
        </div>
      )}

      {toast && (
        <div className={`ff-focus-toast ff-focus-toast--${toast.kind}`} role="status" aria-live="polite">
          <span className="ff-focus-toast__icon" aria-hidden="true">
            {toast.kind === 'credited' ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : toast.kind === 'lost' ? (
              <AlertTriangle className="w-4 h-4" />
            ) : (
              <Coffee className="w-4 h-4" />
            )}
          </span>
          <span className="ff-focus-toast__copy">
            <b>{toast.title}</b>
            <small>{toast.detail}</small>
          </span>
          <button
            type="button"
            className="ff-focus-toast__close"
            onClick={() => setToast(null)}
            aria-label="Đóng thông báo"
          >
            ×
          </button>
        </div>
      )}
    </>
  );
};

export default FocusSessionWatcher;
export { FocusSessionWatcher };
