/* Bản quyền trí tuệ thuộc về BroAmStuck */
/**
 * identityStrings — chuỗi định danh quản trị, lưu ở dạng che giấu nhẹ
 * --------------------------------------------------------------------------
 * Vì sao: repo F-Forum là công khai. Nguyên văn email Super Admin và mật khẩu
 * mẫu cũ từng nằm rải trong mã nguồn → bất kỳ ai đọc repo cũng thấy cặp đăng
 * nhập quản trị (xử lý 19/10/2026 theo phương án "mã hoá" Chủ tịch duyệt).
 *
 * Nguyên tắc:
 *   • Đây là lớp CHE GIẤU (mã charCode đảo), KHÔNG phải mã hoá bảo mật: người
 *     đọc mã vẫn khôi phục được chuỗi. Lớp bảo vệ thật nằm ở mật khẩu một
 *     chiều scrypt trong `server/authGuard.ts` — không có nguyên văn để lộ.
 *   • Mọi nơi cần chuỗi phải import từ đây, không viết lại nguyên văn.
 *   • Muốn đổi giá trị: giải mã bằng chính hàm `decode` (đảo dấu), cập nhật mảng.
 */

/* Mã charCode đảo: khi lưu trừ SHIFT, khi đọc cộng lại SHIFT. */
const SHIFT_EMAIL = 3;
const SHIFT_PASSWORD = 5;

const decode = (codes: readonly number[], shift: number): string =>
  codes.map((code) => String.fromCharCode(code + shift)).join('');

const MASTER_ADMIN_EMAIL_CODES: readonly number[] = [
  63, 111, 108, 62, 106, 80, 113, 114, 96, 104, 61, 100,
  106, 94, 102, 105, 43, 96, 108, 106,
];

const RETIRED_ADMIN_PASSWORD_CODES: readonly number[] = [
  92, 95, 104, 100, 105, 44, 45, 46,
];

/** Email Super Admin — dạng hiển thị (hồ sơ, mailto, nhật ký). */
export const MASTER_ADMIN_EMAIL = decode(MASTER_ADMIN_EMAIL_CODES, SHIFT_EMAIL);

/** Email Super Admin — dạng chuẩn hoá lowercase (khoá user, so khớp). */
export const MASTER_ADMIN_EMAIL_LOWER = MASTER_ADMIN_EMAIL.toLowerCase();

/** Mật khẩu mẫu từng công khai trong repo — chỉ dùng để THU HỒI nếu còn sót. */
export const RETIRED_ADMIN_PASSWORD = decode(RETIRED_ADMIN_PASSWORD_CODES, SHIFT_PASSWORD);
