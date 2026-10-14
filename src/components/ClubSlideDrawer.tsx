/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React from 'react';
import { createPortal } from 'react-dom';
import { X, Users, Calendar, ExternalLink, Compass } from 'lucide-react';
import type { Club, DimensionView } from '../types';
import { DEFAULT_CLUB_COVER, handleImageError } from '../utils/mediaFallback';
import { useEscapeKey } from '../utils/useEscapeKey';

export interface ClubSlideDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  clubs: Club[];
  onNavigateClubsView?: (view: DimensionView) => void;
}

const FALLBACK_DRAWER_CLUBS: Array<{
  id: string;
  name: string;
  category: string;
  membersCount: number;
  upcomingEvent: string;
  coverImage: string;
  registrationUrl: string;
}> = [
  {
    id: 'clb-fcode',
    name: 'CLB Lập Trình & Thuật Toán F-Code',
    category: 'Công nghệ',
    membersCount: 142,
    upcomingEvent: 'Workshop Giải đề Tin học trẻ & Chia sẻ kinh nghiệm Hackathon (Thứ Bảy 15:00)',
    coverImage: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=700&q=80',
    registrationUrl: 'https://www.facebook.com',
  },
  {
    id: 'clb-fmusic',
    name: 'CLB Âm Nhạc Acoustic & Indie Trường',
    category: 'Nghệ thuật',
    membersCount: 98,
    upcomingEvent: 'Đêm nhạc Acoustic sân trường sau kỳ thi Giữa HK1 (Chủ Nhật 18:30)',
    coverImage: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=700&q=80',
    registrationUrl: 'https://www.facebook.com',
  },
  {
    id: 'clb-fastro',
    name: 'CLB Thiên Văn & Khoa Học Tự Nhiên',
    category: 'Học thuật',
    membersCount: 76,
    upcomingEvent: 'Đêm quan sát mưa sao băng Orionids qua kính thiên văn (Thứ Sáu 20:00)',
    coverImage: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=700&q=80',
    registrationUrl: 'https://www.facebook.com',
  },
];

export const ClubSlideDrawer: React.FC<ClubSlideDrawerProps> = ({
  isOpen,
  onClose,
  clubs,
  onNavigateClubsView,
}) => {
  useEscapeKey(onClose, isOpen);

  if (!isOpen || typeof document === 'undefined') return null;

  const displayClubs =
    clubs && clubs.length > 0
      ? clubs.slice(0, 6).map((c, idx) => ({
          id: c.id,
          name: c.name,
          category: c.category || 'Hoạt động ngoại khóa',
          membersCount: c.membersCount || 60 + idx * 18,
          upcomingEvent:
            c.purpose ||
            c.slogan ||
            'Sinh hoạt định kỳ cuối tuần sau giờ học chính khóa',
          coverImage: c.coverImage || DEFAULT_CLUB_COVER,
          registrationUrl: 'https://www.facebook.com',
        }))
      : FALLBACK_DRAWER_CLUBS;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="🏕️ Góc CLB & Sự kiện trường (Mở khi cần)"
      className="fixed inset-0 z-[130] flex justify-end items-end md:items-stretch bg-black/70 backdrop-blur-md"
      onClick={onClose}
    >
      {/* Slide-over Drawer on Desktop/Tablet, Bottom Sheet on Mobile (< 768px) */}
      <aside
        onClick={(e) => e.stopPropagation()}
        style={{ backgroundColor: 'var(--bg-warm-club, #1c1917)' }}
        className="w-full md:max-w-md lg:max-w-lg max-h-[88vh] md:max-h-full md:h-full rounded-t-2xl md:rounded-t-none md:rounded-l-2xl border-t md:border-t-0 md:border-l border-[#e07a5f]/40 shadow-2xl flex flex-col overflow-hidden text-[#f4f1de]"
      >
        {/* Header — Organic #10 + Hand-drawn Paperclip & Wavy Underline SVG (< 1KB) */}
        <div className="p-4 sm:p-5 border-b border-dashed border-[#f4f1de]/20 flex items-start justify-between gap-3 shrink-0 bg-[#231f1c]">
          <div className="space-y-1.5 min-w-0">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#e07a5f]/20 border border-[#e07a5f]/45 text-[11px] font-mono font-bold text-[#f4f1de]">
              {/* Inline SVG Paperclip (< 1KB) */}
              <svg
                className="w-3.5 h-3.5 text-[#e07a5f] shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
              </svg>
              <span>GÓC THƯ GIÃN SAU GIỜ ÔN THI</span>
            </div>

            <h3 className="text-lg sm:text-xl font-extrabold text-[#f4f1de] tracking-tight">
              🏕️ Góc CLB &amp; Sự kiện trường
            </h3>

            {/* Hand-drawn wavy underline SVG (< 1KB) */}
            <svg
              className="w-44 h-2 text-[#81b29a]"
              viewBox="0 0 180 8"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M2 5.5C32 1.5 64 7.5 96 3.5C128 0.5 154 6.5 178 3"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
            </svg>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-black/30 hover:bg-black/50 border border-[#f4f1de]/15 text-[#f4f1de] cursor-pointer shrink-0"
            aria-label="Đóng ngăn kéo CLB"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body — Streamlined Bento Club Profile Cards (#2 Bento + #10 Organic) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5">
          {displayClubs.map((club) => (
            <article
              key={club.id}
              className="min-w-0 overflow-hidden rounded-xl bg-[#26221e] border border-[#f4f1de]/15 hover:border-[#e07a5f]/55 p-3.5 space-y-3 transition"
            >
              <div className="flex items-start gap-3.5 min-w-0">
                <img
                  src={club.coverImage}
                  alt={club.name}
                  onError={(e) => handleImageError(e, DEFAULT_CLUB_COVER)}
                  loading="lazy"
                  className="w-16 h-16 rounded-lg object-cover border border-[#f4f1de]/20 shrink-0"
                />
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded bg-[#81b29a]/20 border border-[#81b29a]/40 text-[10.5px] font-mono font-bold text-[#81b29a]">
                      {club.category}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs font-mono text-[#f4f1de]/80 tabular-nums">
                      <Users className="w-3.5 h-3.5 text-[#e07a5f]" />
                      <b>{club.membersCount}</b> thành viên
                    </span>
                  </div>
                  <h4 className="text-sm sm:text-base font-extrabold text-[#f4f1de] line-clamp-2">
                    {club.name}
                  </h4>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-[#1c1917] border border-dashed border-[#f4f1de]/20 flex items-start gap-2 text-xs text-[#f4f1de]/90">
                <Calendar className="w-3.5 h-3.5 text-[#e07a5f] shrink-0 mt-0.5" />
                <span className="line-clamp-2">{club.upcomingEvent}</span>
              </div>

              <div className="flex items-center justify-between gap-2 pt-1">
                <a
                  href={club.registrationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-[#e07a5f] hover:bg-[#d96b4e] text-[#1c1917] text-xs font-extrabold inline-flex items-center gap-1.5 transition"
                >
                  <span>Form đăng ký / Fanpage CLB</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>

                {onNavigateClubsView && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onNavigateClubsView('clubs');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-[#f4f1de]/15 text-xs font-semibold text-[#f4f1de] inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Compass className="w-3.5 h-3.5 text-[#81b29a]" />
                    <span>Chi tiết</span>
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      </aside>
    </div>,
    document.body,
  );
};
