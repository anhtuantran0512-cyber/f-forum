/* Bản quyền trí tuệ thuộc về BroAmStuck */
/**
 * EPIC 5 — diễn giải kết quả gửi tố cáo (POST /api/reports).
 *
 * Máy chủ giờ BẮT BUỘC đăng nhập và tự lấy danh tính người tố cáo từ phiên, nên
 * client không gửi reporterId/Name/Email nữa (trước đây tự khai → giả mạo được).
 *
 * Sửa luôn lỗi trung thực cũ: cả 5 form tố cáo từng hiện "Đã tiếp nhận tố cáo"
 * kể cả khi mất mạng hoặc máy chủ từ chối — người dùng tưởng đã báo cáo xong.
 */
export type ReportOutcome =
  | { ok: true; message: string; duplicated: boolean }
  | { ok: false; status: number; message: string; needsLogin: boolean };

export const describeReportResult = (
  result: { status: number; data: any } | null,
): ReportOutcome => {
  if (!result) {
    return {
      ok: false,
      status: 0,
      needsLogin: false,
      message: 'Mất kết nối máy chủ — tố cáo CHƯA được gửi. Vui lòng thử lại.',
    };
  }
  const { status, data } = result;
  if (status === 200 && data?.success) {
    return {
      ok: true,
      duplicated: Boolean(data.duplicated),
      message: String(data.message || 'Đã gửi tố cáo tới Ban Quản Trị.'),
    };
  }
  if (status === 401) {
    return {
      ok: false,
      status,
      needsLogin: true,
      message: 'Cậu cần đăng nhập để gửi tố cáo — để Ban Quản Trị biết ai báo và chặn tố cáo giả mạo.',
    };
  }
  if (status === 429) {
    return {
      ok: false,
      status,
      needsLogin: false,
      message: String(data?.message || 'Cậu đã gửi quá nhiều tố cáo, vui lòng thử lại sau ít phút.'),
    };
  }
  return {
    ok: false,
    status,
    needsLogin: false,
    message: String(data?.message || 'Chưa gửi được tố cáo. Vui lòng thử lại.'),
  };
};

/** Gọi an toàn: lỗi mạng → null để describeReportResult báo đúng "chưa gửi". */
export const settleReportRequest = async (
  request: Promise<{ status: number; data: any }>,
): Promise<{ status: number; data: any } | null> => {
  try {
    return await request;
  } catch {
    return null;
  }
};
