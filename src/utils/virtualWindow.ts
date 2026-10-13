/* Bản quyền trí tuệ thuộc về BroAmStuck */
/**
 * VIRTUAL WINDOWING & NODE RECYCLER (Discord & Facebook Web Architecture)
 *
 * Tối ưu hoá cuộn danh sách lớn (Boutique Shop 873 items, Forum feeds hàng trăm câu hỏi):
 *  - Không mount đồng thời hàng trăm thẻ video/ảnh/DOM phức tạp.
 *  - Chỉ kích hoạt hiển thị đầy đủ (hydrate) cho các thẻ nằm trong vùng nhìn (viewport)
 *    cộng thêm một khoảng đệm an toàn (overscan buffer).
 *  - Các thẻ ngoài vùng nhìn được thay thế bằng thẻ vỏ rỗng (recycled stub) giữ nguyên
 *    chiều cao chính xác (contain: strict), giúp thanh cuộn ổn định 100%, không giật khung hình
 *    và không gây dịch chuyển giao diện (Zero CLS).
 *  - Tương thích liền mạch với cả Window scroll lẫn inner scroll containers (overflow-y: auto).
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { rafThrottle } from './rafThrottle.ts';

export interface VirtualWindowOptions {
  totalItems: number;
  itemHeight: number;
  columns?: number;
  overscan?: number;
  containerRef?: React.RefObject<HTMLElement | null>;
  rootRef?: React.RefObject<HTMLElement | null>;
  disabled?: boolean;
}

export interface VirtualWindowResult {
  startIndex: number;
  endIndex: number;
  isItemVisible: (index: number) => boolean;
  totalEstimatedHeight: number;
  topSpacerHeight: number;
  bottomSpacerHeight: number;
  visibleCount: number;
}

export interface VirtualRangeCalculation {
  startIndex: number;
  endIndex: number;
  startRow: number;
  endRow: number;
}

/* Tính toán thuần túy vùng hiển thị ảo (dùng cho cả runtime và kiểm thử tự động) */
export function calculateVirtualRange({
  scrolledPast,
  viewportHeight,
  itemHeight,
  columns = 1,
  totalItems,
  overscan = 6,
}: {
  scrolledPast: number;
  viewportHeight: number;
  itemHeight: number;
  columns?: number;
  totalItems: number;
  overscan?: number;
}): VirtualRangeCalculation {
  const activeColumns = Math.max(1, columns);
  const totalRows = Math.ceil(totalItems / activeColumns);
  if (totalItems <= 0 || viewportHeight <= 0) {
    return { startIndex: 0, endIndex: totalItems, startRow: 0, endRow: totalRows };
  }
  const safeScrolled = Math.max(0, scrolledPast);
  const startRow = Math.max(0, Math.floor(safeScrolled / itemHeight) - overscan);
  const endRow = Math.min(totalRows, Math.ceil((safeScrolled + viewportHeight) / itemHeight) + overscan);
  const startIndex = Math.max(0, startRow * activeColumns);
  const endIndex = Math.min(totalItems, endRow * activeColumns);
  return { startIndex, endIndex, startRow, endRow };
}

/* Tìm phần tử cuộn gần nhất (scroll container) bao bọc một node */
export function getScrollContainer(element: HTMLElement | null): HTMLElement | Window {
  if (!element || typeof window === 'undefined') return window;
  let curr = element.parentElement;
  while (curr && curr !== document.body && curr !== document.documentElement) {
    const style = window.getComputedStyle(curr);
    const overflowY = style.overflowY || style.overflow;
    if (overflowY === 'auto' || overflowY === 'scroll') {
      return curr;
    }
    curr = curr.parentElement;
  }
  return window;
}

export function useVirtualWindow({
  totalItems,
  itemHeight,
  columns = 1,
  overscan = 10,
  containerRef,
  rootRef,
  disabled = false,
}: VirtualWindowOptions): VirtualWindowResult {
  const activeColumns = Math.max(1, columns);
  const [range, setRange] = useState<{ start: number; end: number }>(() => ({
    start: 0,
    end:
      disabled || totalItems <= 36
        ? totalItems
        : Math.min(totalItems, Math.max(36, overscan * 4 * activeColumns)),
  }));

  const totalRows = Math.ceil(totalItems / activeColumns);
  const totalEstimatedHeight = totalRows * itemHeight;

  const updateRange = useCallback(() => {
    if (disabled || totalItems <= 36 || typeof window === 'undefined') {
      setRange((prev) => (prev.start === 0 && prev.end === totalItems ? prev : { start: 0, end: totalItems }));
      return;
    }

    const containerEl = containerRef?.current;
    const rootEl = rootRef?.current;
    const scrollTarget = containerEl || (rootEl ? getScrollContainer(rootEl) : null);

    let scrolledPast = 0;
    let viewportHeight = window.innerHeight || 900;

    if (scrollTarget && scrollTarget !== window && 'clientHeight' in scrollTarget) {
      const container = scrollTarget as HTMLElement;
      viewportHeight = container.clientHeight || viewportHeight;

      if (viewportHeight <= 0) {
        setRange({ start: 0, end: totalItems });
        return;
      }

      if (rootEl && typeof rootEl.getBoundingClientRect === 'function' && typeof container.getBoundingClientRect === 'function') {
        /* Tính toán khoảng cách đã cuộn dựa trên chênh lệch vị trí DOM thực tế */
        const listRect = rootEl.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        scrolledPast = Math.max(0, containerRect.top - listRect.top);
      } else {
        scrolledPast = Math.max(0, container.scrollTop);
      }
    } else {
      /* Cuộn theo Window / Document */
      viewportHeight = window.innerHeight || 900;
      if (rootEl && typeof rootEl.getBoundingClientRect === 'function') {
        const listRect = rootEl.getBoundingClientRect();
        scrolledPast = Math.max(0, -listRect.top);
      } else {
        scrolledPast = Math.max(0, window.scrollY || document.documentElement?.scrollTop || 0);
      }
    }

    if (viewportHeight <= 0) {
      setRange({ start: 0, end: totalItems });
      return;
    }

    const { startIndex, endIndex } = calculateVirtualRange({
      scrolledPast,
      viewportHeight: viewportHeight + 640,
      itemHeight,
      columns: activeColumns,
      totalItems,
      overscan,
    });

    setRange((prev) => {
      if (prev.start === startIndex && prev.end === endIndex) {
        return prev;
      }
      return { start: startIndex, end: endIndex };
    });
  }, [containerRef, rootRef, disabled, totalItems, itemHeight, overscan, activeColumns]);

  useEffect(() => {
    if (disabled || typeof window === 'undefined') {
      return;
    }

    const throttledUpdate = rafThrottle(updateRange);
    throttledUpdate();

    const targetContainer = containerRef?.current || (rootRef?.current ? getScrollContainer(rootRef.current) : null);

    /* Bắt sự kiện scroll toàn cục với capture: true để xử lý mọi container cuộn bên trong (modal, feed tabs) */
    window.addEventListener('scroll', throttledUpdate, { passive: true, capture: true });
    window.addEventListener('resize', throttledUpdate, { passive: true });

    if (targetContainer && targetContainer !== window && 'addEventListener' in targetContainer) {
      (targetContainer as HTMLElement).addEventListener('scroll', throttledUpdate, { passive: true });
    }

    return () => {
      throttledUpdate.cancel();
      window.removeEventListener('scroll', throttledUpdate, { capture: true } as EventListenerOptions);
      window.removeEventListener('resize', throttledUpdate);
      if (targetContainer && targetContainer !== window && 'removeEventListener' in targetContainer) {
        (targetContainer as HTMLElement).removeEventListener('scroll', throttledUpdate);
      }
    };
  }, [containerRef, rootRef, disabled, totalItems, updateRange]);

  const isItemVisible = useCallback(
    (index: number) => {
      if (disabled) return true;
      return index >= range.start && index < range.end;
    },
    [disabled, range.start, range.end],
  );

  const startRow = Math.floor(range.start / activeColumns);
  const endRow = Math.ceil(range.end / activeColumns);
  const topSpacerHeight = startRow * itemHeight;
  const bottomSpacerHeight = Math.max(0, (totalRows - endRow) * itemHeight);
  const visibleCount = Math.max(0, range.end - range.start);

  return useMemo(
    () => ({
      startIndex: range.start,
      endIndex: range.end,
      isItemVisible,
      totalEstimatedHeight,
      topSpacerHeight,
      bottomSpacerHeight,
      visibleCount,
    }),
    [
      range.start,
      range.end,
      isItemVisible,
      totalEstimatedHeight,
      topSpacerHeight,
      bottomSpacerHeight,
      visibleCount,
    ],
  );
}
