import { safeStorage } from '../utils/storage';

export interface CbtExamSavedState {
  paperId: string;
  answers: Record<number, 'A' | 'B' | 'C' | 'D' | Record<string, boolean> | string | number>;
  secondsLeft: number;
  currentIndex: number;
  flagged: number[];
  savedAt: number;
}

const CBT_AUTOSAVE_PREFIX = 'fforum_cbt_autosave_';

export const saveCbtExamState = (paperId: string, state: CbtExamSavedState): void => {
  try {
    safeStorage.setItem(`${CBT_AUTOSAVE_PREFIX}${paperId}`, JSON.stringify(state));
  } catch {
  }
};

export const loadCbtExamState = (paperId: string): CbtExamSavedState | null => {
  try {
    const raw = safeStorage.getItem(`${CBT_AUTOSAVE_PREFIX}${paperId}`);
    if (!raw) return null;
    return JSON.parse(raw) as CbtExamSavedState;
  } catch {
    return null;
  }
};

export const clearCbtExamState = (paperId: string): void => {
  try {
    safeStorage.removeItem(`${CBT_AUTOSAVE_PREFIX}${paperId}`);
  } catch {
  }
};

export interface ExamSecurityOptions {
  onViolation: (count: number, reason: string) => void;
  isActive: boolean;
}

export const setupExamSecurityGuard = (options: ExamSecurityOptions): (() => void) => {
  if (typeof window === 'undefined') return () => {};

  let violationCount = 0;

  const triggerViolation = (reason: string) => {
    if (!options.isActive) return;
    violationCount += 1;
    options.onViolation(violationCount, reason);
  };

  const handleBlur = () => {
    triggerViolation('Rời khỏi cửa sổ bài thi');
  };

  const handleVisibilityChange = () => {
    if (document.hidden) {
      triggerViolation('Chuyển sang tab hoặc ứng dụng khác');
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!options.isActive) return;

    if (e.key === 'F12') {
      e.preventDefault();
      triggerViolation('Cố gắng mở công cụ nhà phát triển (F12)');
      return;
    }

    const isCtrlOrMeta = e.ctrlKey || e.metaKey;
    const isShift = e.shiftKey;
    const key = e.key.toLowerCase();

    if (isCtrlOrMeta && isShift && (key === 'i' || key === 'c' || key === 'j')) {
      e.preventDefault();
      triggerViolation('Cố gắng mở tổ hợp phím kiểm tra mã');
      return;
    }

    if (isCtrlOrMeta && key === 'u') {
      e.preventDefault();
      triggerViolation('Cố gắng xem mã nguồn trang');
    }
  };

  const handleContextMenu = (e: MouseEvent) => {
    if (!options.isActive) return;
    e.preventDefault();
  };

  window.addEventListener('blur', handleBlur);
  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('keydown', handleKeyDown, true);
  window.addEventListener('contextmenu', handleContextMenu, true);

  return () => {
    window.removeEventListener('blur', handleBlur);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('keydown', handleKeyDown, true);
    window.removeEventListener('contextmenu', handleContextMenu, true);
  };
};
