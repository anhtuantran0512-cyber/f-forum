/* Bản quyền trí tuệ thuộc về BroAmStuck */
/**
 * Cú Bông — linh vật F-Forum (Epic 5 · Nhiemvu_5 Phase A, Nhiemvu_4 Task 3.2).
 * Cú mèo thức khuya học bài: thông thái nhưng hơi hậu đậu, đội mũ tốt nghiệp lệch.
 * Vector SVG + CSS animation (không GIF, không thư viện ngoài), 7 biểu cảm:
 *   idle      — đứng chờ, chớp mắt, nhún nhẹ
 *   attentive — nhỏm dậy, đeo kính, cầm bút (khi bạn gõ email/tên)
 *   shy       — lấy cánh che mắt (khi bạn gõ mật khẩu — tôn trọng riêng tư)
 *   peek      — hé một mắt nheo nheo (khi bạn bật đèn pin soi mật khẩu)
 *   sad       — lắc đầu, rũ mi, đổ mồ hôi hột (đăng nhập lỗi)
 *   celebrate — nhảy cẫng, giơ cánh, giơ bảng "Chào mừng!" (thành công)
 *   sleepy    — ngủ gật, Zzz (trạng thái trống)
 */
import { useId, type CSSProperties, type FC } from 'react';
import './CuBong.css';

export type CuBongMood = 'idle' | 'attentive' | 'shy' | 'peek' | 'sad' | 'celebrate' | 'sleepy';

const MOOD_LABEL: Record<CuBongMood, string> = {
  idle: 'Cú Bông đang đứng chờ',
  attentive: 'Cú Bông đeo kính, cầm bút chăm chú',
  shy: 'Cú Bông lấy cánh che mắt',
  peek: 'Cú Bông hé mắt nheo nhìn',
  sad: 'Cú Bông lắc đầu, đổ mồ hôi',
  celebrate: 'Cú Bông nhảy mừng, giơ bảng chào mừng',
  sleepy: 'Cú Bông đang ngủ gật',
};

interface CuBongProps {
  mood?: CuBongMood;
  size?: number;
  /** -1 (nhìn trái) … 1 (nhìn phải) — mắt dõi theo chữ bạn đang gõ. */
  lookX?: number;
  className?: string;
  /** Chữ trên bảng khi ăn mừng. */
  signText?: string;
  decorative?: boolean;
}

export const CuBong: FC<CuBongProps> = ({
  mood = 'idle',
  size = 160,
  lookX = 0,
  className = '',
  signText = 'Chào mừng!',
  decorative = false,
}) => {
  const uid = useId().replace(/:/g, '');
  const look = Math.max(-1, Math.min(1, Number.isFinite(lookX) ? lookX : 0));
  return (
    <svg
      className={`cb cb--${mood} ${className}`}
      width={size}
      height={size}
      viewBox="0 0 200 200"
      style={{ '--cb-look-x': `${(look * 5).toFixed(2)}px` } as CSSProperties}
      role={decorative ? undefined : 'img'}
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : MOOD_LABEL[mood]}
    >
      <defs>
        <radialGradient id={`cb-body-${uid}`} cx="38%" cy="30%" r="78%">
          <stop offset="0%" stopColor="#8f7cf0" />
          <stop offset="55%" stopColor="#5a45b8" />
          <stop offset="100%" stopColor="#33256e" />
        </radialGradient>
        <radialGradient id={`cb-belly-${uid}`} cx="45%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#fff8e8" />
          <stop offset="100%" stopColor="#f1d39c" />
        </radialGradient>
        <radialGradient id={`cb-face-${uid}`} cx="50%" cy="40%" r="70%">
          <stop offset="0%" stopColor="#a796f2" />
          <stop offset="100%" stopColor="#7462d4" />
        </radialGradient>
        <clipPath id={`cb-eye-l-${uid}`}><circle cx="78" cy="98" r="17" /></clipPath>
        <clipPath id={`cb-eye-r-${uid}`}><circle cx="122" cy="98" r="17" /></clipPath>
      </defs>

      <ellipse className="cb-shadow" cx="100" cy="188" rx="46" ry="7" />

      <g className="cb-body">
        {/* Cánh (phía sau thân) */}
        <path className="cb-wing cb-wing--l" d="M56 104 C33 116 31 150 50 168 C59 151 63 128 62 108 Z" fill="#4c3a9e" />
        <path className="cb-wing cb-wing--r" d="M144 104 C167 116 169 150 150 168 C141 151 137 128 138 108 Z" fill="#4c3a9e" />

        {/* Thân + tai */}
        <path d="M60 68 L49 38 L80 59 Z" fill="#4c3a9e" />
        <path d="M140 68 L151 38 L120 59 Z" fill="#4c3a9e" />
        <path d="M100 52 C142 52 160 90 160 124 C160 160 134 182 100 182 C66 182 40 160 40 124 C40 90 58 52 100 52 Z" fill={`url(#cb-body-${uid})`} />
        <ellipse cx="100" cy="142" rx="35" ry="33" fill={`url(#cb-belly-${uid})`} />
        <path d="M86 132 q4 4 8 0 M106 132 q4 4 8 0 M96 146 q4 4 8 0 M84 154 q4 4 8 0 M108 154 q4 4 8 0" stroke="#d9b678" strokeWidth="2" fill="none" strokeLinecap="round" />

        {/* Đĩa mặt */}
        <circle cx="78" cy="98" r="25" fill={`url(#cb-face-${uid})`} />
        <circle cx="122" cy="98" r="25" fill={`url(#cb-face-${uid})`} />

        {/* Mắt mở */}
        <g className="cb-eyes">
          <circle cx="78" cy="98" r="17" fill="#ffffff" />
          <circle cx="122" cy="98" r="17" fill="#ffffff" />
          <g className="cb-pupils">
            <circle cx="78" cy="100" r="10.5" fill="#fbbf24" />
            <circle cx="122" cy="100" r="10.5" fill="#fbbf24" />
            <circle cx="78" cy="100" r="6.4" fill="#1c1530" />
            <circle cx="122" cy="100" r="6.4" fill="#1c1530" />
            <circle cx="81" cy="96.5" r="2.6" fill="#ffffff" />
            <circle cx="125" cy="96.5" r="2.6" fill="#ffffff" />
          </g>
          <g clipPath={`url(#cb-eye-l-${uid})`}><rect className="cb-lid cb-lid--l" x="60" y="80" width="36" height="36" fill="#7462d4" /></g>
          <g clipPath={`url(#cb-eye-r-${uid})`}><rect className="cb-lid cb-lid--r" x="104" y="80" width="36" height="36" fill="#7462d4" /></g>
        </g>

        {/* Mắt cười ^ ^ (ăn mừng) và mắt nhắm (ngủ) */}
        <g className="cb-eyes-happy" stroke="#1c1530" strokeWidth="4.5" strokeLinecap="round" fill="none">
          <path d="M67 102 Q78 88 89 102" />
          <path d="M111 102 Q122 88 133 102" />
        </g>
        <g className="cb-eyes-closed" stroke="#1c1530" strokeWidth="4" strokeLinecap="round" fill="none">
          <path d="M67 98 Q78 106 89 98" />
          <path d="M111 98 Q122 106 133 98" />
        </g>

        {/* Má hồng + mỏ */}
        <ellipse className="cb-blush" cx="62" cy="120" rx="8" ry="4.5" fill="#fb7185" />
        <ellipse className="cb-blush" cx="138" cy="120" rx="8" ry="4.5" fill="#fb7185" />
        <path d="M100 108 L91.5 116.5 L100 127 L108.5 116.5 Z" fill="#f59e0b" />
        <path d="M100 108 L95 113.5 L100 114.6 L105 113.5 Z" fill="#fde68a" opacity="0.85" />

        {/* Kính (chăm chú) */}
        <g className="cb-glasses" fill="rgba(255,255,255,0.1)" stroke="#f8fafc" strokeWidth="3">
          <circle cx="78" cy="98" r="19.5" />
          <circle cx="122" cy="98" r="19.5" />
          <path d="M97.5 96 Q100 92.5 102.5 96" fill="none" />
        </g>

        {/* Cánh che mắt (ngại) */}
        <g className="cb-cover cb-cover--l">
          <ellipse cx="78" cy="99" rx="23" ry="19" fill="#4c3a9e" />
          <path d="M64 92 q14 -6 28 0 M62 100 q16 -6 32 0" stroke="#6a57c8" strokeWidth="2.4" fill="none" strokeLinecap="round" />
        </g>
        <g className="cb-cover cb-cover--r">
          <ellipse cx="122" cy="99" rx="23" ry="19" fill="#4c3a9e" />
          <path d="M108 92 q14 -6 28 0 M106 100 q16 -6 32 0" stroke="#6a57c8" strokeWidth="2.4" fill="none" strokeLinecap="round" />
        </g>

        {/* Bút chì (chăm chú) */}
        <g className="cb-pen">
          <rect x="146" y="128" width="9" height="36" rx="2" fill="#fbbf24" transform="rotate(28 150 146)" />
          <path d="M138.0 160.0 L146.0 164.2 L138.2 169.2 Z" fill="#fde68a" />
          <rect x="146" y="124" width="9" height="7" rx="2" fill="#fb7185" transform="rotate(28 150 146)" />
        </g>

        {/* Mồ hôi hột (lỗi) */}
        <path className="cb-sweat" d="M150 66 C150 66 143 76 143 80.5 C143 84.6 146.2 87.5 150 87.5 C153.8 87.5 157 84.6 157 80.5 C157 76 150 66 150 66 Z" fill="#7dd3fc" />

        {/* Bảng chào mừng (thành công) */}
        <g className="cb-sign">
          <rect x="58" y="134" width="84" height="26" rx="8" fill="#fde68a" stroke="#f59e0b" strokeWidth="2" />
          <text x="100" y="151.5" textAnchor="middle" fontSize="12" fontWeight="900" fill="#3b2a6b" fontFamily="system-ui, sans-serif">{signText}</text>
        </g>

        {/* Mũ tốt nghiệp lệch — dấu hiệu nhận diện */}
        <g className="cb-cap" transform="rotate(-9 100 46)">
          <path d="M80 50 L80 60 Q100 68 120 60 L120 50 Z" fill="#241b45" />
          <path d="M100 32 L140 46 L100 60 L60 46 Z" fill="#2f2459" stroke="#4b3c86" strokeWidth="1.5" strokeLinejoin="round" />
          <circle cx="100" cy="46" r="2.6" fill="#fbbf24" />
          <path className="cb-tassel" d="M100 46 Q118 50 128 62" stroke="#fbbf24" strokeWidth="2.4" fill="none" strokeLinecap="round" />
          <circle className="cb-tassel" cx="128.5" cy="64" r="3.4" fill="#fbbf24" />
        </g>

        {/* Dấu sao đồng trên cánh: phụ kiện nhận diện xuyên suốt mọi phiên bản Cú Bông. */}
        <path className="cb-signature-star" d="M150 126 l2.5 5.5 6 0.8 -4.5 4.2 1.2 5.8 -5.2 -3 -5.2 3 1.2 -5.8 -4.5 -4.2 6 -0.8Z" fill="#e9c57c" stroke="#55426d" strokeWidth="1.1" />
        {/* Chân */}
        <ellipse cx="86" cy="181" rx="9" ry="4.5" fill="#f59e0b" />
        <ellipse cx="114" cy="181" rx="9" ry="4.5" fill="#f59e0b" />
      </g>

      {/* Zzz (ngủ gật) */}
      <g className="cb-zzz" fill="#c7d2fe" fontFamily="system-ui, sans-serif" fontWeight="900">
        <text x="150" y="58" fontSize="14">z</text>
        <text x="161" y="42" fontSize="18">z</text>
        <text x="172" y="24" fontSize="22">Z</text>
      </g>
    </svg>
  );
};
