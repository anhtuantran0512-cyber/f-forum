/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React from 'react';

export interface CozyIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  className?: string;
}

function resolveSize(size?: number | string): number | string {
  return size ?? 18;
}

/* Hỏi Đáp — Cuộn thư Cú Bông & dấu hỏi ấm áp */
export const HelpCircle: React.FC<CozyIconProps> = ({ size, className = '', ...rest }) => {
  const s = resolveSize(size);
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`ff-cozy-icon ${className}`.trim()}
      {...rest}
    >
      <path
        d="M12 3.2c5.1 0 8.8 3.5 8.8 8.4 0 4.9-3.7 8.8-8.8 8.8-1.6 0-3.1-.35-4.4-1.05L4.1 20.4l1.05-3.2C4.1 15.7 3.2 13.8 3.2 11.6 3.2 6.7 6.9 3.2 12 3.2Z"
        fill="currentColor"
        fillOpacity="0.15"
      />
      <path d="M9.6 9.4a2.5 2.5 0 0 1 4.75.9c0 1.65-2.15 2.05-2.35 3.35" />
      <circle cx="12" cy="16.8" r="0.95" fill="currentColor" stroke="none" />
    </svg>
  );
};

/* Thread / Sổ chung — Trang sổ khâu chỉ & bút lông vũ */
export const MessageCircleMore: React.FC<CozyIconProps> = ({ size, className = '', ...rest }) => {
  const s = resolveSize(size);
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`ff-cozy-icon ${className}`.trim()}
      {...rest}
    >
      <path
        d="M5.5 4.2h11.2a3.1 3.1 0 0 1 3.1 3.1v7.4a3.1 3.1 0 0 1-3.1 3.1H9.8l-4.1 2.6v-2.6H5.5a2.3 2.3 0 0 1-2.3-2.3V6.5a2.3 2.3 0 0 1 2.3-2.3Z"
        fill="currentColor"
        fillOpacity="0.15"
      />
      <path d="M7.6 9.3h7.8" />
      <path d="M7.6 12.8h5.2" />
      <circle cx="15.8" cy="12.8" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
};

/* Phòng Chat — Đôi bong bóng trò chuyện ấm cúng */
export const MessageSquare: React.FC<CozyIconProps> = ({ size, className = '', ...rest }) => {
  const s = resolveSize(size);
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`ff-cozy-icon ${className}`.trim()}
      {...rest}
    >
      <path
        d="M6.2 4.5h11.6a3.2 3.2 0 0 1 3.2 3.2v6.6a3.2 3.2 0 0 1-3.2 3.2h-6.1l-4.3 3.1v-3.1H6.2A3.2 3.2 0 0 1 3 14.3V7.7a3.2 3.2 0 0 1 3.2-3.2Z"
        fill="currentColor"
        fillOpacity="0.16"
      />
      <circle cx="8.8" cy="11" r="1.05" fill="currentColor" stroke="none" />
      <circle cx="12" cy="11" r="1.05" fill="currentColor" stroke="none" />
      <circle cx="15.2" cy="11" r="1.05" fill="currentColor" stroke="none" />
    </svg>
  );
};

/* Câu Lạc Bộ & Thành Viên — Đôi bạn đồng hành */
export const Users: React.FC<CozyIconProps> = ({ size, className = '', ...rest }) => {
  const s = resolveSize(size);
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`ff-cozy-icon ${className}`.trim()}
      {...rest}
    >
      <circle cx="9.2" cy="8.2" r="3.2" fill="currentColor" fillOpacity="0.16" />
      <path
        d="M3.6 19.2c0-2.9 2.5-5.1 5.6-5.1s5.6 2.2 5.6 5.1"
        fill="currentColor"
        fillOpacity="0.12"
      />
      <circle cx="16.4" cy="9.2" r="2.4" fill="currentColor" fillOpacity="0.14" />
      <path d="M15.8 14.5c2.4.2 4.4 1.9 4.6 4.5" />
    </svg>
  );
};

/* Kho Đề Thi — Cuốn sách học thuật mở & dải ruy-băng */
export const BookOpen: React.FC<CozyIconProps> = ({ size, className = '', ...rest }) => {
  const s = resolveSize(size);
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`ff-cozy-icon ${className}`.trim()}
      {...rest}
    >
      <path
        d="M12 6.2C10.2 4.9 7.4 4.5 4.2 5a1.2 1.2 0 0 0-1 1.2v11.2c0 .7.55 1.2 1.25 1.15 3-.2 5.6.3 7.55 1.65 1.95-1.35 4.55-1.85 7.55-1.65.7.05 1.25-.45 1.25-1.15V6.2a1.2 1.2 0 0 0-1-1.2c-3.2-.5-6-.1-7.8 1.2Z"
        fill="currentColor"
        fillOpacity="0.15"
      />
      <path d="M12 6.2v14" />
      <path d="M6.5 9.2h2.8" />
      <path d="M14.7 9.2h2.8" />
    </svg>
  );
};

/* Miền Ký Ức — Khung ảnh kỷ niệm đồi nắng */
export const Film: React.FC<CozyIconProps> = ({ size, className = '', ...rest }) => {
  const s = resolveSize(size);
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`ff-cozy-icon ${className}`.trim()}
      {...rest}
    >
      <rect
        x="3.5"
        y="3.5"
        width="17"
        height="17"
        rx="4.2"
        fill="currentColor"
        fillOpacity="0.14"
      />
      <path d="M4 15.4l4.6-4.4c.85-.8 2.15-.8 3 0l5.9 5.7" />
      <path d="M13.8 14.6l1.6-1.5c.78-.72 2.02-.72 2.8 0l2.3 2.2" />
      <circle cx="8.5" cy="8.5" r="1.55" fill="currentColor" fillOpacity="0.35" />
    </svg>
  );
};

/* Khu Vinh Danh — Cúp nguyệt quế ấm áp */
export const Trophy: React.FC<CozyIconProps> = ({ size, className = '', ...rest }) => {
  const s = resolveSize(size);
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`ff-cozy-icon ${className}`.trim()}
      {...rest}
    >
      <path d="M6.2 8.8H4.6a2.3 2.3 0 0 1 0-4.6h1.6" />
      <path d="M17.8 8.8h1.6a2.3 2.3 0 0 0 0-4.6h-1.6" />
      <path
        d="M6.2 4h11.6a1 1 0 0 1 1 1v3.8c0 3.7-2.95 6.7-6.8 6.7S5.2 12.5 5.2 8.8V5a1 1 0 0 1 1-1Z"
        fill="currentColor"
        fillOpacity="0.16"
      />
      <path d="M10.2 15.3v2.3c0 .5-.4.9-.9.9H8v3h8v-3h-1.3c-.5 0-.9-.4-.9-.9v-2.3" />
      <path d="M5.5 21.5h13" />
    </svg>
  );
};

/* Cài Đặt — Bánh răng đồng hồ thủ công */
export const Settings: React.FC<CozyIconProps> = ({ size, className = '', ...rest }) => {
  const s = resolveSize(size);
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`ff-cozy-icon ${className}`.trim()}
      {...rest}
    >
      <circle cx="12" cy="12" r="3.3" fill="currentColor" fillOpacity="0.2" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.08a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.08a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </svg>
  );
};

/* Thông Báo — Chuông gió hiên nhà ấm áp */
export const Bell: React.FC<CozyIconProps> = ({ size, className = '', ...rest }) => {
  const s = resolveSize(size);
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`ff-cozy-icon ${className}`.trim()}
      {...rest}
    >
      <path
        d="M6.2 9.5a5.8 5.8 0 0 1 11.6 0c0 5.2 2.2 6.8 2.2 6.8H4s2.2-1.6 2.2-6.8Z"
        fill="currentColor"
        fillOpacity="0.16"
      />
      <path d="M10.2 19.6a2.1 2.1 0 0 0 3.6 0" />
      <path d="M12 2.6v1.1" />
    </svg>
  );
};

/* Khám Phá — La bàn sao phương hướng */
export const Compass: React.FC<CozyIconProps> = ({ size, className = '', ...rest }) => {
  const s = resolveSize(size);
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`ff-cozy-icon ${className}`.trim()}
      {...rest}
    >
      <circle cx="12" cy="12" r="8.8" fill="currentColor" fillOpacity="0.14" />
      <polygon
        points="15.8 8.2 13.5 13.5 8.2 15.8 10.5 10.5 15.8 8.2"
        fill="currentColor"
        fillOpacity="0.28"
      />
    </svg>
  );
};

/* Ngôi sao lấp lánh Ghibli */
export const Sparkles: React.FC<CozyIconProps> = ({ size, className = '', ...rest }) => {
  const s = resolveSize(size);
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`ff-cozy-icon ${className}`.trim()}
      {...rest}
    >
      <path
        d="M12 3.2l2.1 5.4 5.4 2.1-5.4 2.1-2.1 5.4-2.1-5.4-5.4-2.1 5.4-2.1L12 3.2Z"
        fill="currentColor"
        fillOpacity="0.18"
      />
      <path d="M19 3.5v3" />
      <path d="M17.5 5h3" />
      <path d="M5.5 17.5v2.5" />
      <path d="M4.25 18.75h2.5" />
    </svg>
  );
};

/* Điểm danh / Ngọn lửa Calcifer ấm áp */
export const Flame: React.FC<CozyIconProps> = ({ size, className = '', ...rest }) => {
  const s = resolveSize(size);
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`ff-cozy-icon ${className}`.trim()}
      {...rest}
    >
      <path
        d="M12.3 3.2c.5 3.2 3.6 4.8 4.9 7.6 1.2 2.6.6 5.9-1.7 7.8a6.2 6.2 0 0 1-8.4-.5c-1.8-2-2.1-5.1-.5-7.4.8 1.2 2 1.7 2.8 1.5-.3-2.9 1.2-6.2 2.9-9Z"
        fill="currentColor"
        fillOpacity="0.18"
      />
      <path d="M12 19.6a2.4 2.4 0 0 0 2.2-3.3c-.5-1.1-1.7-1.7-2.1-2.9-.5 1.1-1.8 1.9-2.1 3.1a2.3 2.3 0 0 0 2 3.1Z" />
    </svg>
  );
};

/* Sổ tay nhanh — Sổ gáy chỉ & bút gỗ */
export const NotebookPen: React.FC<CozyIconProps> = ({ size, className = '', ...rest }) => {
  const s = resolveSize(size);
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`ff-cozy-icon ${className}`.trim()}
      {...rest}
    >
      <rect
        x="4.5"
        y="3.5"
        width="13.5"
        height="17"
        rx="2.6"
        fill="currentColor"
        fillOpacity="0.15"
      />
      <path d="M3 7.5h2.5" />
      <path d="M3 12h2.5" />
      <path d="M3 16.5h2.5" />
      <path d="M8.8 9.2h5.2" />
      <path d="M8.8 13.2h3.5" />
      <path d="M16.2 14.8l4.1-4.1a1.3 1.3 0 0 1 1.8 1.8l-4.1 4.1-2.3.5.5-2.3Z" />
    </svg>
  );
};

/* Bảng lệnh nhanh — Phím tắt thủ công */
export const Command: React.FC<CozyIconProps> = ({ size, className = '', ...rest }) => {
  const s = resolveSize(size);
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`ff-cozy-icon ${className}`.trim()}
      {...rest}
    >
      <rect x="9" y="9" width="6" height="6" fill="currentColor" fillOpacity="0.18" />
      <path d="M15 6a3 3 0 1 1 3 3H6a3 3 0 1 1 3-3v12a3 3 0 1 1-3-3h12a3 3 0 1 1-3 3V6Z" />
    </svg>
  );
};

/* Không gian tập trung — Đồng hồ bấm giờ trà chiều */
export const Timer: React.FC<CozyIconProps> = ({ size, className = '', ...rest }) => {
  const s = resolveSize(size);
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`ff-cozy-icon ${className}`.trim()}
      {...rest}
    >
      <circle cx="12" cy="13.2" r="7.5" fill="currentColor" fillOpacity="0.15" />
      <path d="M9.5 3h5" />
      <path d="M12 3v2.5" />
      <path d="M12 13.2l2.6-2.4" />
    </svg>
  );
};

/* Bản nâng cấp — Tàu bay giấy ước mơ */
export const Rocket: React.FC<CozyIconProps> = ({ size, className = '', ...rest }) => {
  const s = resolveSize(size);
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`ff-cozy-icon ${className}`.trim()}
      {...rest}
    >
      <path
        d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09Z"
        fill="currentColor"
        fillOpacity="0.2"
      />
      <path
        d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2Z"
        fill="currentColor"
        fillOpacity="0.16"
      />
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
      <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
    </svg>
  );
};

/* Trái tim Tâm sự ấm áp */
export const Heart: React.FC<CozyIconProps> = ({ size, className = '', ...rest }) => {
  const s = resolveSize(size);
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`ff-cozy-icon ${className}`.trim()}
      {...rest}
    >
      <path
        d="M19.2 5.4a4.9 4.9 0 0 0-6.9 0l-.3.3-.3-.3a4.9 4.9 0 0 0-6.9 6.9l.3.3L12 19.8l6.9-7.2.3-.3a4.9 4.9 0 0 0 0-6.9Z"
        fill="currentColor"
        fillOpacity="0.16"
      />
    </svg>
  );
};

/* Huy hiệu Khiên CLB & Quản trị */
export const Shield: React.FC<CozyIconProps> = ({ size, className = '', ...rest }) => {
  const s = resolveSize(size);
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`ff-cozy-icon ${className}`.trim()}
      {...rest}
    >
      <path
        d="M12 3.2l7 3.1v5.3c0 4.8-3 8.4-7 9.8-4-1.4-7-5-7-9.8V6.3l7-3.1Z"
        fill="currentColor"
        fillOpacity="0.15"
      />
      <path d="M9.6 12.1l1.7 1.7 3.3-3.5" />
    </svg>
  );
};

/* Ký hiệu Kênh đàm thoại (#) vẽ tay mềm mại */
export const Hash: React.FC<CozyIconProps> = ({ size, className = '', ...rest }) => {
  const s = resolveSize(size);
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.85"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`ff-cozy-icon ${className}`.trim()}
      {...rest}
    >
      <path d="M4.5 9.2h15" />
      <path d="M4.5 14.8h15" />
      <path d="M10.2 4.2L8.4 19.8" />
      <path d="M15.6 4.2l-1.8 15.6" />
    </svg>
  );
};

/* Máy bay giấy Gửi tin nhắn */
export const Send: React.FC<CozyIconProps> = ({ size, className = '', ...rest }) => {
  const s = resolveSize(size);
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`ff-cozy-icon ${className}`.trim()}
      {...rest}
    >
      <path
        d="M20.8 3.6L3.4 10.5c-.8.3-.75 1.45.05 1.7l6.8 2.2 2.2 6.8c.25.8 1.4.85 1.7.05l6.9-17.4a.5.5 0 0 0-.25-.25Z"
        fill="currentColor"
        fillOpacity="0.18"
      />
      <path d="M10.3 14.3l10.2-10.4" />
    </svg>
  );
};
