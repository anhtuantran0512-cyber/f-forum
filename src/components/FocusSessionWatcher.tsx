/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Timer, Pause, CheckCircle2, Coffee, ArrowUpRight, AlertTriangle, Coins } from 'lucide-react';
import { playChime } from '../utils/audio';
import {
  computeStudyTotals,
  formatDuration,
  logStudyMinutes,
  readStudySessions,
  sessionsForOwner,
} from '../utils/studyLog';
import type { RewardApiResponse, StudyRewardMilestone } from '../types/rewards';
import {
  FOCUS_STALE_GRACE_MS,
  FOCUS_STOP_REQUEST_EVENT,
  announceFocusCredited,
  clearFocusSession,
  focusClockLabel,
  focusElapsedMinutes,
  focusProgressPercent,
  readFocusSession,
  readFocusSessionOwner,
  subscribeFocusSession,
  type FocusSessionState,
} from '../utils/focusSession';

/**
 * Người giữ nhịp cho Phòng Tập Trung (chạy ở cấp App, không nằm trong HUD).
 * • Học là stopwatch tự do; mọi phiên từ 1 phút đều được ghi khi dừng.
 * • Coin dựa trên tổng phút học thật trong ngày, không phụ thuộc cách chia phiên.
 * • Đóng HUD, đổi phân khu hay chạy tab nền không làm đồng hồ sai lệch.
 */
interface FocusSessionWatcherProps {
  userEmail?: string;
  onStudySessionStart?: () => Promise<RewardApiResponse | null>;
  onStudyHeartbeat?: (sessionId: string) => Promise<RewardApiResponse | null>;
  onStudySessionStop?: (sessionId: string) => Promise<RewardApiResponse | null>;
  isHudOpen: boolean;
  onOpenHud: () => void;
}

interface FocusToast {
  id: number;
  kind: 'credited' | 'partial' | 'break' | 'lost' | 'reward';
  title: string;
  detail: string;
}

const rewardSummary = (rewards: StudyRewardMilestone[]): string =>
  rewards.map(reward => `${reward.minutes}′ +${reward.coins} Coin`).join(' · ');

const FocusSessionWatcher: React.FC<FocusSessionWatcherProps> = ({
  userEmail,
  onStudySessionStart,
  onStudyHeartbeat,
  onStudySessionStop,
  isHudOpen,
  onOpenHud,
}) => {
  const [session, setSession] = useState<FocusSessionState | null>(() => readFocusSession());
  const [now, setNow] = useState(() => Date.now());
  const [toast, setToast] = useState<FocusToast | null>(null);
  const serverStudySessionIdRef = useRef<string | null>(null);
  const previousSessionModeRef = useRef<FocusSessionState['mode'] | null>(session?.mode ?? null);

  const todayMinutes = useCallback(
    (owner?: string | null) => computeStudyTotals(sessionsForOwner(readStudySessions(), owner)).todayMinutes,
    [],
  );

  const showServerStudyRewards = useCallback((result: RewardApiResponse | null) => {
    const rewards = result?.rewards ?? [];
    if (!result?.success || rewards.length === 0) return;
    const totalCoins = rewards.reduce((sum, reward) => sum + reward.coins, 0);
    playChime('success');
    setToast({
      id: Date.now(),
      kind: 'reward',
      title: `Mốc học tập · +${totalCoins} Coin`,
      detail: `${rewardSummary(rewards)} · thời lượng được máy chủ xác nhận: ${result.studyMinutes ?? 0} phút.`,
    });
  }, []);

  /* Đồng bộ phiên; dừng Coin phía máy chủ đúng lúc đồng hồ học kết thúc. */
  useEffect(() => {
    const handleFocusSessionChange = () => {
      const next = readFocusSession();
      if (previousSessionModeRef.current === 'work' && next?.mode !== 'work') {
        const sessionId = serverStudySessionIdRef.current;
        serverStudySessionIdRef.current = null;
        if (sessionId) {
          void onStudySessionStop?.(sessionId).then(showServerStudyRewards).catch(() => {});
        }
      }
      previousSessionModeRef.current = next?.mode ?? null;
      setSession(next);
    };
    return subscribeFocusSession(handleFocusSessionChange);
  }, [onStudySessionStop, showServerStudyRewards]);

  /*
   * Coin is awarded only from server time between authenticated heartbeats.
   * LocalStorage session dates, local claims and client amounts are never sent.
   */
  useEffect(() => {
    const owner = readFocusSessionOwner();
    const signedInEmail = userEmail?.trim().toLowerCase();
    if (session?.mode !== 'work' || !signedInEmail || (owner && owner !== signedInEmail)) return;

    let isDisposed = false;
    let heartbeatTimer: number | undefined;
    const startServerSession = async () => {
      const result = await onStudySessionStart?.();
      if (!result?.success || !result.sessionId || isDisposed) return;
      serverStudySessionIdRef.current = result.sessionId;
      heartbeatTimer = window.setInterval(() => {
        const sessionId = serverStudySessionIdRef.current;
        if (!sessionId) return;
        void onStudyHeartbeat?.(sessionId).then(showServerStudyRewards).catch(() => {});
      }, 30_000);
    };
    void startServerSession().catch(() => {});

    return () => {
      isDisposed = true;
      if (heartbeatTimer !== undefined) window.clearInterval(heartbeatTimer);
    };
  }, [session?.mode, userEmail, onStudySessionStart, onStudyHeartbeat, showServerStudyRewards]);

  /** Ghi phiên Học cục bộ khi người dùng chủ động dừng đồng hồ. */
  const settleWorkSession = useCallback(
    (finished: FocusSessionState) => {
      const owner = readFocusSessionOwner() || userEmail?.trim().toLowerCase() || '';
      const studiedMinutes = focusElapsedMinutes(finished);
      clearFocusSession();

      if (studiedMinutes < 1) {
        setToast({
          id: Date.now(),
          kind: 'partial',
          title: 'Đồng hồ đã dừng',
          detail: 'Phiên dưới 1 phút nên chưa thêm vào nhật ký. Không có thời lượng học tối thiểu 25 phút.',
        });
        return;
      }

      const loggedMinutes = logStudyMinutes(studiedMinutes, 'focus', owner || undefined, finished.subject);
      const total = todayMinutes(owner);
      announceFocusCredited(loggedMinutes, 'work', owner, finished.subject);
      const subjectLabel = finished.subject ? ` · ${finished.subject}` : '';
      playChime('success');
      setToast({
        id: Date.now(),
        kind: 'credited',
        title: `Đã ghi +${loggedMinutes} phút học${subjectLabel}`,
        detail: `Hôm nay bạn đã học ${formatDuration(total)}. Mọi phút học đều được ghi, không cần đủ 25 phút.`,
      });
    },
    [todayMinutes, userEmail],
  );

  /** Nhịp chỉ để vẽ lại và kiểm tra thời gian nghỉ; phần thưởng dùng đồng hồ máy chủ. */
  useEffect(() => {
    if (!session) return;
    const id = window.setInterval(() => {
      const tick = Date.now();
      setNow(tick);
      const current = readFocusSession();
      if (!current || current.mode !== 'break') return;
      if (current.endsAt && tick >= current.endsAt) {
        const lateByMs = tick - current.endsAt;
        clearFocusSession();
        setToast(
          lateByMs > FOCUS_STALE_GRACE_MS
            ? {
                id: tick,
                kind: 'lost',
                title: 'Đã hết giờ nghỉ',
                detail: 'Phiên nghỉ đã kết thúc khi ứng dụng đóng. Bạn có thể bắt đầu đồng hồ học tự do bất cứ lúc nào.',
              }
            : {
                id: tick,
                kind: 'break',
                title: 'Hết giờ nghỉ',
                detail: 'Khi sẵn sàng, hãy bắt đầu đồng hồ học tự do.',
              },
        );
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [session]);

  /* Toast tự tắt sau 5.5s */
  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 5500);
    return () => window.clearTimeout(id);
  }, [toast]);

  /* Dừng tự do: ghi mọi phút trọn vẹn, kể cả phiên ngắn hơn 25 phút. */
  const handleStop = useCallback(() => {
    const current = readFocusSession();
    if (!current) return;

    if (current.mode === 'work') {
      settleWorkSession(current);
      return;
    }

    clearFocusSession();
    setToast({
      id: Date.now(),
      kind: 'break',
      title: 'Đã dừng giờ nghỉ',
      detail: 'Đồng hồ học tự do vẫn sẵn sàng khi bạn muốn tiếp tục.',
    });
  }, [settleWorkSession]);

  /* HUD (hoặc chip nổi) xin dừng phiên → dùng CHUNG một luồng ghi nhận. */
  useEffect(() => {
    window.addEventListener(FOCUS_STOP_REQUEST_EVENT, handleStop);
    return () => window.removeEventListener(FOCUS_STOP_REQUEST_EVENT, handleStop);
  }, [handleStop]);

  const showChip = Boolean(session) && !isHudOpen;
  const clockLabel = session ? focusClockLabel(session, now) : '';
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
              <b>{clockLabel}</b>
              <small>{session.mode === 'work' ? 'Đang học tự do' : 'Đang nghỉ'}</small>
            </span>
            <ArrowUpRight className="w-3.5 h-3.5 ff-focus-chip__open" aria-hidden="true" />
          </button>
          <button
            type="button"
            className="ff-focus-chip__stop"
            onClick={handleStop}
            title="Dừng và ghi thời gian thực học"
            aria-label="Dừng đồng hồ và ghi thời gian học"
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
            {toast.kind === 'reward' ? (
              <Coins className="w-4 h-4" />
            ) : toast.kind === 'credited' ? (
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
