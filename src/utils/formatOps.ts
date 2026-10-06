/* Bản quyền trí tuệ thuộc về BroAmStuck */

/* ==========================================================================
   ĐỊNH DẠNG SỐ LIỆU VẬN HÀNH — module THUẦN TUÝ (không import gì)
   --------------------------------------------------------------------------
   Tách khỏi AdminConsoleModal.tsx vì hai lý do:
   1. React Fast Refresh chỉ hoạt động khi một tệp chỉ export component; để hàm
      thường xen vào làm mất khả năng hot-reload của cả tệp.
   2. Để node test trực tiếp được, theo khuôn profileLikes / savedQuestions /
      questionSort sẵn có trong repo.
   ========================================================================== */

/**
 * Đọc một giá trị "có thể là số" từ API.
 *
 * Phân biệt rõ HAI trường hợp dễ nhầm: `0` là dữ liệu hợp lệ (tệp rỗng, chưa có
 * kết nối), còn `null`/`undefined`/chuỗi rác là KHÔNG CÓ DỮ LIỆU. Nếu cứ
 * `Number(x)` thì `Number(null) === 0` và bảng điều khiển sẽ báo "0 B" cho một
 * mục thực chất là chưa đọc được — quản trị tưởng nhầm hệ thống khoẻ.
 */
const toFiniteNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

/** Dung lượng dễ đọc cho người vận hành: 6199 → "6.1 KB" chứ không phải "6199 B". */
export const formatBytes = (bytes: number): string => {
  const parsed = toFiniteNumber(bytes);
  if (parsed === null || parsed < 0) return '—';
  const n = parsed;
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(2)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

/** Uptime dạng "2 ngày 3 giờ" thay vì 190.000 giây. */
export const formatUptime = (seconds: number): string => {
  const parsed = toFiniteNumber(seconds);
  if (parsed === null || parsed < 0) return '—';
  const total = Math.floor(parsed);
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (d > 0) return `${d} ngày ${h} giờ`;
  if (h > 0) return `${h} giờ ${m} phút`;
  return `${m} phút ${total % 60} giây`;
};

/**
 * Mức tải của một limiter, tính theo tỉ lệ nguồn đang bị chặn.
 * Dùng để tô màu ô trên bảng điều khiển: xanh khi im ắng, đỏ khi đang chặn.
 */
export const limiterLoadLevel = (blockedKeys: number, trackedKeys: number): 'calm' | 'busy' | 'hot' => {
  const blocked = Math.max(0, toFiniteNumber(blockedKeys) ?? 0);
  const tracked = Math.max(0, toFiniteNumber(trackedKeys) ?? 0);
  if (blocked === 0) return 'calm';
  if (tracked === 0) return 'hot';
  return blocked / tracked >= 0.5 ? 'hot' : 'busy';
};
