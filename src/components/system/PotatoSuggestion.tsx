/* Bản quyền trí tuệ thuộc về BroAmStuck */
/**
 * PotatoSuggestion — GỢI Ý bật Potato Mode trên máy yếu (EPIC 5 · KHÔNG ép buộc).
 *
 * Chờ trang tải xong và rảnh (~3,5 giây + requestIdleCallback) rồi mới đo, để
 * không nhầm "đang tải nặng" với "máy yếu". Chỉ hiện khi src/utils/deviceTier.ts
 * chấm máy ở mức `low`; máy mạnh không bao giờ thấy gì. Người dùng chọn:
 *  - Bật Potato Mode → Navbar bật chế độ (nền tĩnh, giữ 100% hiệu ứng UI);
 *  - Để sau → hỏi lại sau 3 ngày;
 *  - Không hỏi lại → không bao giờ hiện nữa.
 */
import React, { useEffect, useState } from 'react';
import { Gauge } from 'lucide-react';
import { safeStorage } from '../../utils/storage';
import {
  POTATO_HINT_KEY,
  POTATO_SNOOZE_MS,
  assessDeviceTier,
  parsePotatoHint,
  shouldSuggestPotato,
  type TierAssessment,
} from '../../utils/deviceTier';
import './SystemToasts.css';

const potatoIsOn = () => safeStorage.getItem('fforum_potator_mode') === 'true';

export const PotatoSuggestion: React.FC = () => {
  const [assessment, setAssessment] = useState<TierAssessment | null>(null);

  useEffect(() => {
    const initialHint = parsePotatoHint(safeStorage.getItem(POTATO_HINT_KEY));
    if (potatoIsOn() || !shouldSuggestPotato({ tier: 'low' }, initialHint, false)) return undefined;

    let cancelled = false;
    let idleHandle: number | null = null;
    const win = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (handle: number) => void;
    };
    const run = async () => {
      const result = await assessDeviceTier();
      if (cancelled) return;
      const hint = parsePotatoHint(safeStorage.getItem(POTATO_HINT_KEY));
      if (shouldSuggestPotato(result, hint, potatoIsOn())) setAssessment(result);
    };
    const timer = window.setTimeout(() => {
      if (typeof win.requestIdleCallback === 'function') {
        idleHandle = win.requestIdleCallback(() => void run(), { timeout: 4000 });
      } else {
        void run();
      }
    }, 3500);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      if (idleHandle !== null) win.cancelIdleCallback?.(idleHandle);
    };
  }, []);

  useEffect(() => {
    if (!assessment) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        safeStorage.setItem(POTATO_HINT_KEY, String(Date.now() + POTATO_SNOOZE_MS));
        setAssessment(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [assessment]);

  if (!assessment) return null;

  const enable = () => {
    window.dispatchEvent(new CustomEvent('fforum_potator_request', { detail: { mode: true } }));
    safeStorage.setItem(POTATO_HINT_KEY, 'never');
    setAssessment(null);
  };
  const later = () => {
    safeStorage.setItem(POTATO_HINT_KEY, String(Date.now() + POTATO_SNOOZE_MS));
    setAssessment(null);
  };
  const never = () => {
    safeStorage.setItem(POTATO_HINT_KEY, 'never');
    setAssessment(null);
  };

  return (
    <aside className="ff-sys-toast ff-sys-toast--potato" role="dialog" aria-modal="false" aria-labelledby="ff-potato-title">
      <span className="ff-sys-toast__icon" aria-hidden="true">
        <Gauge className="w-4 h-4" />
      </span>
      <div className="ff-sys-toast__body">
        <p id="ff-potato-title" className="ff-sys-toast__title">
          Máy của cậu có vẻ hơi “đuối” nè
        </p>
        <p className="ff-sys-toast__text">
          Tớ gợi ý bật <strong>Potato Mode</strong>: nền động được thay bằng nền tĩnh nhẹ hơn, còn mọi hiệu ứng nút
          và hover vẫn giữ nguyên.
        </p>
        {assessment.reasons.length > 0 && (
          <ul className="ff-sys-toast__reasons">
            {assessment.reasons.slice(0, 2).map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        )}
        <div className="ff-sys-toast__actions">
          <button type="button" className="ff-sys-toast__btn ff-sys-toast__btn--primary" onClick={enable}>
            Bật Potato Mode
          </button>
          <button type="button" className="ff-sys-toast__btn" onClick={later}>
            Để sau
          </button>
          <button type="button" className="ff-sys-toast__btn ff-sys-toast__btn--ghost" onClick={never}>
            Không hỏi lại
          </button>
        </div>
      </div>
    </aside>
  );
};

export default PotatoSuggestion;
