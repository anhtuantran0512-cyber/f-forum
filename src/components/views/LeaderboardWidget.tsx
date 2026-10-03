/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React, { useState } from 'react';
import {
  Trophy,
  ChevronDown,
  ArrowRight,
  HelpCircle,
  Sparkles,
} from 'lucide-react';
import type { User } from '../../types';
import { DEFAULT_AVATAR, handleImageError } from '../../utils/mediaFallback';
import { MagneticButton } from '../MagneticButton';

interface LeaderboardMember {
  id: string;
  name: string;
  avatar: string;
  points: number;
  level: number;
  email?: string;
  rank: number;
}

interface LeaderboardWidgetProps {
  currentUser: User | null;
  onOpenProfile?: (user: { id: string; name: string; avatar: string; email?: string; level?: number }) => void;
  onOpenAskModal: () => void;
  className?: string;
}

const DEFAULT_LEADERBOARD: Record<'day' | 'week' | 'all', LeaderboardMember[]> = {
  day: [
    {
      id: 'lb-1',
      name: 'BangtanJiminnn',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=faces',
      points: 320,
      level: 45,
      email: 'bangtanjimin@fpt.edu.vn',
      rank: 1,
    },
    {
      id: 'lb-2',
      name: 'minhdoan70',
      avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100&h=100&fit=crop&crop=faces',
      points: 210,
      level: 38,
      email: 'minhdoan70@fpt.edu.vn',
      rank: 2,
    },
    {
      id: 'lb-3',
      name: 'DYNAMONSWORLD',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=faces',
      points: 160,
      level: 29,
      email: 'dynamons@fpt.edu.vn',
      rank: 3,
    },
    {
      id: 'lb-4',
      name: 'Noctis347',
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&h=100&fit=crop&crop=faces',
      points: 150,
      level: 25,
      email: 'noctis347@fpt.edu.vn',
      rank: 4,
    },
    {
      id: 'lb-5',
      name: 'leelinh03',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=faces',
      points: 80,
      level: 18,
      email: 'leelinh03@fpt.edu.vn',
      rank: 5,
    },
  ],
  week: [
    {
      id: 'lb-1',
      name: 'BangtanJiminnn',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=faces',
      points: 1420,
      level: 45,
      email: 'bangtanjimin@fpt.edu.vn',
      rank: 1,
    },
    {
      id: 'lb-3',
      name: 'DYNAMONSWORLD',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=faces',
      points: 980,
      level: 29,
      email: 'dynamons@fpt.edu.vn',
      rank: 2,
    },
    {
      id: 'lb-2',
      name: 'minhdoan70',
      avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100&h=100&fit=crop&crop=faces',
      points: 890,
      level: 38,
      email: 'minhdoan70@fpt.edu.vn',
      rank: 3,
    },
    {
      id: 'lb-4',
      name: 'Noctis347',
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&h=100&fit=crop&crop=faces',
      points: 750,
      level: 25,
      email: 'noctis347@fpt.edu.vn',
      rank: 4,
    },
    {
      id: 'lb-5',
      name: 'leelinh03',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=faces',
      points: 520,
      level: 18,
      email: 'leelinh03@fpt.edu.vn',
      rank: 5,
    },
  ],
  all: [
    {
      id: 'lb-admin',
      name: 'Trần Văn Anh Tuấn',
      avatar: 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260922_194417_a455843c-d8db-461c-8ef6-74a325d2472c.png',
      points: 45000,
      level: 150,
      email: 'anhtuantran0512@gmail.com',
      rank: 1,
    },
    {
      id: 'lb-1',
      name: 'BangtanJiminnn',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=faces',
      points: 8420,
      level: 45,
      email: 'bangtanjimin@fpt.edu.vn',
      rank: 2,
    },
    {
      id: 'lb-2',
      name: 'minhdoan70',
      avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100&h=100&fit=crop&crop=faces',
      points: 6210,
      level: 38,
      email: 'minhdoan70@fpt.edu.vn',
      rank: 3,
    },
    {
      id: 'lb-3',
      name: 'DYNAMONSWORLD',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=faces',
      points: 4980,
      level: 29,
      email: 'dynamons@fpt.edu.vn',
      rank: 4,
    },
    {
      id: 'lb-4',
      name: 'Noctis347',
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&h=100&fit=crop&crop=faces',
      points: 3850,
      level: 25,
      email: 'noctis347@fpt.edu.vn',
      rank: 5,
    },
  ],
};

export const LeaderboardWidget: React.FC<LeaderboardWidgetProps> = ({
  currentUser,
  onOpenProfile,
  onOpenAskModal,
  className = '',
}) => {
  const [timeFilter, setTimeFilter] = useState<'day' | 'week' | 'all'>('day');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const members = DEFAULT_LEADERBOARD[timeFilter];

  const currentUserName = currentUser?.name || 'TuanProinter512';
  const currentUserPoints = currentUser ? currentUser.xp || 374 : 0;
  const currentUserAvatar = currentUser?.avatar || DEFAULT_AVATAR;

  const timeFilterLabels: Record<'day' | 'week' | 'all', string> = {
    day: 'Trong ngày',
    week: 'Trong tuần',
    all: 'Tất cả',
  };

  return (
    <aside className={`space-y-4 ${className}`} aria-label="Bảng xếp hạng và đặt câu hỏi">
      {/* Khối A: Bảng Xếp Hạng "THÀNH VIÊN HĂNG HÁI NHẤT" */}
      <div className="rounded-3xl bg-[#0c1218]/90 backdrop-blur-2xl border border-white/15 p-4 shadow-xl flex flex-col gap-3.5 relative overflow-hidden">
        {/* Tiêu đề & trang trí gạch chân */}
        <div className="flex flex-col items-center text-center">
          <div className="flex items-center gap-1.5 text-[#0284C7] font-extrabold text-xs sm:text-sm tracking-wider uppercase">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span>THÀNH VIÊN HĂNG HÁI NHẤT</span>
          </div>
          {/* Gạch chân trang trí xanh dương đậm */}
          <div className="w-20 h-0.5 bg-gradient-to-r from-transparent via-[#0284C7] to-transparent mt-1 rounded-full" />
        </div>

        {/* Bộ lọc thời gian: Dropdown hình viên thuốc */}
        <div className="flex justify-center relative">
          <button
            type="button"
            onClick={() => setIsDropdownOpen((prev) => !prev)}
            className="px-3.5 py-1 rounded-full bg-white/10 hover:bg-white/15 border border-white/15 text-xs text-white font-semibold inline-flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            aria-expanded={isDropdownOpen}
            aria-haspopup="listbox"
          >
            <span>{timeFilterLabels[timeFilter]}</span>
            <ChevronDown className={`w-3.5 h-3.5 text-neutral-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {isDropdownOpen && (
            <div className="absolute top-8 z-30 w-32 bg-[#0c1218] border border-white/20 rounded-2xl p-1 shadow-2xl animate-fade-up">
              {(['day', 'week', 'all'] as const).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    setTimeFilter(opt);
                    setIsDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                    timeFilter === opt
                      ? 'bg-[#0284C7] text-white font-bold'
                      : 'text-neutral-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {timeFilterLabels[opt]}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Danh sách thứ hạng thành viên 1 - 5 */}
        <div className="space-y-1.5">
          {members.map((member, index) => {
            const isTop1 = member.rank === 1;
            const isTop2 = member.rank === 2;
            const isTop3 = member.rank === 3;

            return (
              <div
                key={member.id}
                style={{ '--i': index } as React.CSSProperties}
                onClick={() => onOpenProfile?.({
                  id: member.id,
                  name: member.name,
                  avatar: member.avatar,
                  email: member.email,
                  level: member.level,
                })}
                className="ac-01__card p-2 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 hover:border-white/20 transition-all flex items-center justify-between gap-2.5 cursor-pointer group"
                title={`Xem hồ sơ của ${member.name}`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {/* Rank indicator */}
                  <span
                    className={`w-4 text-center text-xs font-bold font-mono shrink-0 ${
                      isTop1
                        ? 'text-amber-400'
                        : isTop2
                        ? 'text-slate-300'
                        : isTop3
                        ? 'text-amber-600'
                        : 'text-neutral-400'
                    }`}
                  >
                    {member.rank}
                  </span>

                  {/* Avatar tròn bên trái */}
                  <div className="relative shrink-0">
                    <img
                      src={member.avatar}
                      alt={member.name}
                      onError={(e) => handleImageError(e, DEFAULT_AVATAR)}
                      loading="lazy"
                      decoding="async"
                      width={32}
                      height={32}
                      className="w-8 h-8 rounded-full object-cover border border-white/20 group-hover:scale-105 transition-transform"
                    />
                    {isTop1 && (
                      <span className="absolute -top-1 -right-1 text-[10px]">👑</span>
                    )}
                  </div>

                  {/* Tên đăng nhập ở giữa */}
                  <span className="text-xs font-semibold text-neutral-200 group-hover:text-white truncate">
                    {member.name}
                  </span>
                </div>

                {/* Điểm số in đậm bên phải */}
                <div className="text-xs font-bold font-mono text-white shrink-0">
                  {member.points.toLocaleString()} <span className="text-[10px] font-normal text-neutral-400">điểm</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Vị trí người dùng hiện tại (Current User Pin) */}
        <div
          onClick={() => {
            if (currentUser) {
              onOpenProfile?.({
                id: currentUser.id,
                name: currentUser.name,
                avatar: currentUser.avatar,
                email: currentUser.email,
                level: currentUser.level,
              });
            }
          }}
          className="mt-1 p-2.5 rounded-2xl bg-[#0284C7]/15 border border-[#0284C7]/40 flex items-center justify-between gap-2.5 cursor-pointer transition-all hover:bg-[#0284C7]/25 shadow-sm"
          title="Vị trí của bạn"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-[11px] font-bold font-mono text-[#0284C7]">Bạn:</span>
            <div className="relative shrink-0">
              <img
                src={currentUserAvatar}
                alt={currentUserName}
                onError={(e) => handleImageError(e, DEFAULT_AVATAR)}
                loading="lazy"
                decoding="async"
                width={32}
                height={32}
                className="w-8 h-8 rounded-full object-cover border-2 border-[#0284C7] shadow-sm"
              />
            </div>
            <span className="text-xs font-bold text-[#0284C7] truncate">
              {currentUserName}
            </span>
          </div>

          <div className="text-xs font-bold font-mono text-[#0284C7] shrink-0">
            {currentUserPoints.toLocaleString()} <span className="text-[10px] font-normal">điểm</span>
          </div>
        </div>

        {/* Liên kết chân widget: "Xem thêm ➔" */}
        <div className="pt-1 flex justify-end">
          <button
            type="button"
            onClick={() => {
              if (members[0]) {
                onOpenProfile?.({
                  id: members[0].id,
                  name: members[0].name,
                  avatar: members[0].avatar,
                  email: members[0].email,
                  level: members[0].level,
                });
              }
            }}
            className="text-xs text-[#0284C7] hover:text-sky-300 font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer"
          >
            <span>Xem thêm</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Khối B: Widget Kêu Gọi Đặt Câu Hỏi (Call To Action - Ask Question) */}
      <div className="rounded-3xl bg-[#0c1218]/90 backdrop-blur-2xl border border-amber-400/30 p-5 shadow-xl flex flex-col items-center text-center gap-3 relative overflow-hidden">
        {/* Glow ambient background */}
        <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/10 via-transparent to-orange-500/10 pointer-events-none" />

        <div className="relative z-10 flex items-center justify-center gap-1.5 text-amber-400 font-bold text-xs uppercase font-mono tracking-wider">
          <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
          <span>CẦN TRỢ GIÚP BÀI TẬP?</span>
        </div>

        {/* Tiêu đề gợi mở: "Bạn muốn hỏi điều gì?" */}
        <h3 className="relative z-10 text-sm sm:text-base font-extrabold text-white tracking-tight">
          Bạn muốn hỏi điều gì?
        </h3>
        <p className="relative z-10 text-xs text-neutral-300 max-w-xs leading-relaxed">
          Đăng bài tập toán, lý, hóa, văn, ngoại ngữ hay lập trình để nhận giải đáp chuẩn xác trong 5 phút.
        </p>

        {/* Nút bấm hành động chính: Nền vàng cam rực rỡ #EAB308 - #F59E0B với icon HelpCircle và hiệu ứng Magnetic Ripple */}
        <MagneticButton
          variant="gold"
          onClick={onOpenAskModal}
          className="relative z-10 w-full py-3 px-6 rounded-2xl !bg-gradient-to-r !from-[#EAB308] !to-[#F59E0B] text-neutral-950 font-black text-xs sm:text-sm tracking-wider uppercase shadow-[0_6px_25px_rgba(234,179,8,0.4)] hover:shadow-[0_8px_30px_rgba(234,179,8,0.6)] cursor-pointer"
        >
          <HelpCircle className="w-4 h-4 text-neutral-950" />
          <span>ĐẶT CÂU HỎI</span>
        </MagneticButton>
      </div>
    </aside>
  );
};

export default LeaderboardWidget;
