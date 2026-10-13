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
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { rafThrottle } from './rafThrottle.ts';

export interface VirtualWindowOptions {
  totalItems: number;
  itemHeight: number;
  columns?: number;
  overscan?: number;
  containerRef?: React.RefObject<HTMLElement | null>;
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

export function useVirtualWindow({
  totalItems,
  itemHeight,
  columns = 1,
  overscan = 6,
  containerRef,
  disabled = false,
}: VirtualWindowOptions): VirtualWindowResult {
  const [range, setRange] = useState<{ start: number; end: number }>(() => ({
    start: 0,
    end: disabled ? totalItems : Math.min(totalItems, Math.max(12, overscan * 3)),
  }));

  const activeColumns = Math.max(1, columns);
  const totalRows = Math.ceil(totalItems / activeColumns);
  const totalEstimatedHeight = totalRows * itemHeight;

  const updateRange = useCallback(() => {
    if (disabled || typeof window === 'undefined') {
      setRange({ start: 0, end: totalItems });
      return;
    }

    const container = containerRef?.current;
    let scrollTop = 0;
    let viewportHeight = window.innerHeight || 800;

    if (container) {
      scrollTop = container.scrollTop;
      viewportHeight = container.clientHeight || viewportHeight;
    } else {
      scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
    }

    /* Nếu container có kích thước = 0 (môi trường test JSDOM hoặc chưa mount), render toàn bộ an toàn */
    if (viewportHeight <= 0) {
      setRange({ start: 0, end: totalItems });
      return;
    }

    const startRow = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endRow = Math.min(totalRows, Math.ceil((scrollTop + viewportHeight) / itemHeight) + overscan);

    const startIndex = Math.max(0, startRow * activeColumns);
    const endIndex = Math.min(totalItems, endRow * activeColumns);

    setRange((prev) => {
      if (prev.start === startIndex && prev.end === endIndex) {
        return prev;
      }
      return { start: startIndex, end: endIndex };
    });
  }, [containerRef, disabled, totalItems, itemHeight, overscan, activeColumns, totalRows]);

  useEffect(() => {
    if (disabled || typeof window === 'undefined') {
      return;
    }

    const rafId =
      typeof requestAnimationFrame === 'function'
        ? requestAnimationFrame(() => {
            updateRange();
          })
        : 0;

    const throttledUpdate = rafThrottle(updateRange);
    const target: EventTarget = containerRef?.current || window;

    target.addEventListener('scroll', throttledUpdate, { passive: true });
    window.addEventListener('resize', throttledUpdate, { passive: true });

    return () => {
      if (rafId && typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(rafId);
      }
      throttledUpdate.cancel();
      target.removeEventListener('scroll', throttledUpdate);
      window.removeEventListener('resize', throttledUpdate);
    };
  }, [containerRef, disabled, totalItems, updateRange]);

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
