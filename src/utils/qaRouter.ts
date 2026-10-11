/* Bản quyền trí tuệ thuộc về BroAmStuck */
import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import type { DimensionView } from '../types';
import { QA_BASE_PATH, buildQuestionPath, isQaPath, parseQaPath, type QaRoute } from './qaRoute.ts';
import { readSharedQuestionId, stripSharedQuestionParam } from './shareLinks.ts';

/* ==========================================================================
   ĐỊNH TUYẾN HỎI ĐÁP (History API) — phần có DOM của utils/qaRoute.ts
   --------------------------------------------------------------------------
   App này điều hướng giữa các phân khu bằng STATE (`currentView`), không có
   bộ định tuyến nào. Thay vì thay cả kiến trúc, Hỏi đáp được cắm thêm đúng
   một lớp URL:
     • vào Hỏi đáp        → thanh địa chỉ là `/hoi-dap`
     • mở một câu hỏi     → `pushState` sang `/hoi-dap/<id>-<slug>` (có mục lịch sử riêng)
     • sang phân khu khác → trả thanh địa chỉ về `/`
   Các phân khu khác giữ nguyên hành vi cũ (không thêm mục lịch sử).

   Mỗi mục lịch sử mang một ít `history.state` để quay lại đúng chỗ:
     ffView    phân khu đang hiển thị (để Forward/Back qua ranh giới Hỏi đáp biết về đâu)
     ffQaDepth số trang chi tiết nối tiếp sau danh sách (mở câu liên quan → +1), để nút
               "← Quay lại Hỏi đáp" nhảy thẳng về danh sách thay vì lần ngược từng câu
     ffQaList  bộ lọc + vị trí cuộn của danh sách, lưu NGAY trên mục lịch sử của danh sách
               (giống cách trình duyệt tự khôi phục cuộn), sống sót cả khi tải lại trang
   ========================================================================== */

const NAV_EVENT = 'fforum:navigate';

/** Vị trí & bộ lọc của danh sách tại lúc rời đi — để Back trả về đúng chỗ. */
export interface QaListMemory {
  tag: string;
  search: string;
  savedOnly: boolean;
  scrollTop: number;
  /** Câu hỏi vừa mở (để trả tiêu điểm bàn phím về đúng thẻ). */
  focusId?: string;
}

interface FForumHistoryState {
  ffNav?: true;
  ffView?: string;
  ffQaDepth?: number;
  ffQaList?: QaListMemory;
}

const readState = (): FForumHistoryState => {
  if (typeof window === 'undefined') return {};
  const state = window.history.state as unknown;
  return state && typeof state === 'object' ? (state as FForumHistoryState) : {};
};

/* Biên dịch kiểm tra đủ: thêm phân khu vào `DimensionView` mà quên ở đây là lỗi tsc. */
const VIEW_FLAGS: Record<DimensionView, true> = {
  landing: true,
  home: true,
  clubs: true,
  qa: true,
  chat: true,
  memory: true,
  chronicles: true,
  'coming-soon': true,
};
const isKnownView = (value: unknown): value is DimensionView =>
  typeof value === 'string' && Object.hasOwn(VIEW_FLAGS, value);

export interface NavigateOptions {
  /** Thay mục lịch sử hiện tại thay vì thêm mục mới. */
  replace?: boolean;
  /** Bỏ hết state cũ của mục này (đổi phân khu): bộ nhớ danh sách của lần trước không được "sống lại" ở lần vào sau. */
  reset?: boolean;
  state?: FForumHistoryState;
}

export function navigateTo(path: string, options: NavigateOptions = {}): void {
  if (typeof window === 'undefined') return;
  const nextState: FForumHistoryState = { ...options.state, ffNav: true };
  const here = `${window.location.pathname}${window.location.search}`;
  if (options.replace || path === here) {
    /* Mặc định gộp với state cũ: chỉ thay URL (vd. chuẩn hoá slug) không được làm mất bộ nhớ danh sách. */
    window.history.replaceState(options.reset ? nextState : { ...readState(), ...nextState }, '', path);
  } else {
    window.history.pushState(nextState, '', path);
  }
  window.dispatchEvent(new Event(NAV_EVENT));
}

/** Số trang chi tiết nối tiếp phía sau danh sách ở mục lịch sử hiện tại (0 = vào thẳng bằng link). */
export const getQaDepth = (): number => {
  const depth = readState().ffQaDepth;
  return typeof depth === 'number' && Number.isInteger(depth) && depth > 0 ? depth : 0;
};

/** Ghi bộ nhớ danh sách lên mục lịch sử HIỆN TẠI (gọi ngay trước khi mở một câu hỏi). */
export function rememberQaList(memory: QaListMemory): void {
  if (typeof window === 'undefined') return;
  window.history.replaceState({ ...readState(), ffNav: true, ffQaList: memory }, '');
}

export function readQaListMemory(): QaListMemory | null {
  const memory = readState().ffQaList;
  if (!memory || typeof memory !== 'object') return null;
  const { tag, search, savedOnly, scrollTop, focusId } = memory;
  if (typeof tag !== 'string' || typeof search !== 'string' || typeof savedOnly !== 'boolean') return null;
  if (typeof scrollTop !== 'number' || !Number.isFinite(scrollTop) || scrollTop < 0) return null;
  return { tag, search, savedOnly, scrollTop, focusId: typeof focusId === 'string' ? focusId : undefined };
}

/**
 * "← Quay lại Hỏi đáp": về danh sách và để trình duyệt khôi phục đúng vị trí cũ.
 * Đi từ danh sách vào thì lùi đúng số bước đã đi (không để lịch sử phình ra những mục "danh sách" thừa);
 * vào thẳng bằng link thì mở danh sách như một lần điều hướng bình thường.
 */
export function leaveQaDetail(): void {
  if (typeof window === 'undefined') return;
  const depth = getQaDepth();
  if (depth > 0) window.history.go(-depth);
  else navigateTo(QA_BASE_PATH);
}

/**
 * Click thường bằng chuột trái (không Ctrl/⌘/Shift/Alt, không phải tab mới) → để app tự điều hướng (SPA);
 * mọi trường hợp khác trả về false để trình duyệt xử lý link như thường (mở tab mới, sao chép liên kết…).
 */
export const isPlainLeftClick = (event: {
  button: number;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  defaultPrevented?: boolean;
}): boolean =>
  !event.defaultPrevented && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;

/* ───────────────────────── React ───────────────────────── */

const subscribe = (notify: () => void): (() => void) => {
  window.addEventListener('popstate', notify);
  window.addEventListener(NAV_EVENT, notify);
  return () => {
    window.removeEventListener('popstate', notify);
    window.removeEventListener(NAV_EVENT, notify);
  };
};
const getPathname = (): string => window.location.pathname;
const getServerPathname = (): string => '/';

export const useQaPathname = (): string => useSyncExternalStore(subscribe, getPathname, getServerPathname);

const LIST_ROUTE: QaRoute = { kind: 'list' };

/** Tuyến hiện tại của Hỏi đáp; địa chỉ chưa kịp chuyển sang `/hoi-dap` vẫn coi là danh sách. */
export const useQaRoute = (): QaRoute => {
  const pathname = useQaPathname();
  return useMemo(() => parseQaPath(pathname) ?? LIST_ROUTE, [pathname]);
};

/**
 * Giữ thanh địa chỉ khớp với `currentView` và xử lý Back/Forward đi qua ranh giới Hỏi đáp.
 * Gọi MỘT lần ở App.
 */
export function useQaUrlSync(currentView: DimensionView, showView: (view: DimensionView) => void): void {
  const viewRef = useRef(currentView);
  const showRef = useRef(showView);
  useEffect(() => {
    viewRef.current = currentView;
    showRef.current = showView;
  });

  useEffect(() => {
    const { pathname, search, href, origin } = window.location;
    if (currentView === 'qa') {
      const legacyId = readSharedQuestionId(search);
      if (legacyId) {
        /* Liên kết đã chia sẻ trước đây (`?q=<id>`) vẫn mở đúng câu hỏi: đổi sang đường dẫn mới,
           giữ các tham số/hash khác. Slug được trang chi tiết bổ sung khi đã biết tiêu đề. */
        const rest = new URL(stripSharedQuestionParam(href), origin);
        navigateTo(`${buildQuestionPath(legacyId)}${rest.search}${rest.hash}`, { replace: true, reset: true, state: { ffView: 'qa' } });
      } else if (!isQaPath(pathname)) {
        navigateTo(QA_BASE_PATH, { replace: true, reset: true, state: { ffView: 'qa' } });
      } else if (parseQaPath(pathname)?.kind === 'list' && pathname !== QA_BASE_PATH) {
        /* `/hoi-dap/` hoặc `/hoi-dap/<đoạn hỏng>` đều hiển thị danh sách → đưa thanh địa chỉ về dạng chuẩn. */
        navigateTo(QA_BASE_PATH, { replace: true });
      }
    } else if (isQaPath(pathname)) {
      navigateTo('/', { replace: true, reset: true, state: { ffView: currentView } });
    }
  }, [currentView]);

  useEffect(() => {
    const onPopState = () => {
      const inQa = isQaPath(window.location.pathname);
      if (inQa && viewRef.current !== 'qa') {
        showRef.current('qa');
      } else if (!inQa && viewRef.current === 'qa') {
        const remembered = readState().ffView;
        showRef.current(isKnownView(remembered) && remembered !== 'qa' ? remembered : 'home');
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);
}
