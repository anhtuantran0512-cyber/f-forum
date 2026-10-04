/* Bản quyền trí tuệ thuộc về BroAmStuck */
import { createPortal } from 'react-dom';
import React, { useRef, useEffect, useState } from 'react';
import { CreditCard, UserPen, Award, LogOut, Sparkles, ChevronRight, Flag, X, Shield, CheckCircle2 } from 'lucide-react';
import type { User } from '../types';
import { TierBadge, AdminVerifiedBadge } from './Badges10Tier';
import { getTierForLevel } from '../utils/tier';
import { getXPForLevel } from '../store/forumStore';
import { DEFAULT_AVATAR, handleImageError } from '../utils/mediaFallback';
import { usePopoverPosition, type DockPosition } from '../utils/popover';

export interface ProfileDropdownProps {
  currentUser: User;
  isOpen: boolean;
  onClose: () => void;
  onOpenProfile: (tab?: 'overview' | 'card' | 'stats' | 'shop' | 'activity' | 'edit') => void;
  onLogout: () => void;
  dockPosition?: DockPosition;
  anchorRef?: React.RefObject<HTMLElement | null>;
}

export const ProfileDropdown: React.FC<ProfileDropdownProps> = ({
  currentUser,
  isOpen,
  onClose,
  onOpenProfile,
  onLogout,
  dockPosition = 'top',
  anchorRef,
}) => {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pop = usePopoverPosition(isOpen, anchorRef, dockPosition, 320, 540);

  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState('');
  const [reportReason, setReportReason] = useState('Vi phạm tiêu chuẩn cộng đồng / Gian lận');
  const [reportDetails, setReportDetails] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [reportSuccess, setReportSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (isReportModalOpen) {
          setIsReportModalOpen(false);
          setReportSuccess(null);
        } else {
          onClose();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, isReportModalOpen]);

  if (!isOpen) return null;

  const isSuperAdmin = currentUser.email === 'anhtuantran0512@gmail.com';
  const tier = getTierForLevel(currentUser.level);

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingReport) return;
    setIsSubmittingReport(true);
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reporterId: currentUser.id,
          reporterName: currentUser.name,
          reporterEmail: currentUser.email,
          reportedUserId: reportTarget.trim() || 'violation_report',
          reportedUserName: reportTarget.trim() || 'Tài khoản vi phạm',
          reason: reportReason,
          details: reportDetails.trim(),
        }),
      });
      const data = await res.json();
      setReportSuccess(data.message || 'Đã gửi báo cáo vi phạm tới Ban Quản Trị.');
    } catch {
      setReportSuccess('Đã gửi báo cáo vi phạm tới Ban Quản Trị.');
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const currentLevelBaseXP = getXPForLevel(currentUser.level);
  const nextLevelBaseXP = getXPForLevel(Math.min(150, currentUser.level + 1));
  const range = Math.max(1, nextLevelBaseXP - currentLevelBaseXP);
  const progress =
    currentUser.level >= 150
      ? 100
      : Math.min(100, Math.max(0, Math.round(((currentUser.xp - currentLevelBaseXP) / range) * 100)));

  return createPortal(
    <div
      ref={dropdownRef}
      role="menu"
      aria-label="Menu tài khoản"
      data-ff-popover="true"
        className={`z-[70] bg-[#0c1218]/95 backdrop-blur-2xl border border-white/15 rounded-2xl p-4 shadow-[0_20px_50px_rgba(0,0,0,0.8)] popover-morph-enter select-none pointer-events-auto transition-all overflow-y-auto no-scrollbar ${
        !anchorRef || !pop.ready ? 'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] max-w-[calc(100vw-28px)]' : ''
      }`}
      style={anchorRef ? pop.style : undefined}
    >
      {/* Top Section (Current Real User) */}
      <div className="flex flex-col">
        {/* Avatar + Info */}
        <div className="flex items-start gap-3">
          <div className="relative shrink-0">
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              onError={(e) => handleImageError(e, DEFAULT_AVATAR)}
              loading="lazy"
              decoding="async"
              width={44}
              height={44}
              className="w-11 h-11 rounded-xl object-cover ring-2 ring-amber-400/50 shadow-md"
            />
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#0c1218] shadow-[0_0_6px_#34d399]" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span
                className={`text-sm font-semibold truncate ${
                  isSuperAdmin ? 'discord-admin-name' : 'text-white'
                }`}
                title={currentUser.name}
              >
                {currentUser.name}
              </span>
              {isSuperAdmin && (
                <AdminVerifiedBadge size={14} tooltipPosition="bottom" />
              )}
            </div>

            <p className="text-[11px] text-white/50 truncate mt-0.5 font-mono">
              {currentUser.email}
            </p>
          </div>
        </div>

        {/* Rank & Level Badge */}
        <div className="mt-3 flex items-center justify-between px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10">
          <div className="flex items-center gap-2">
            <TierBadge level={currentUser.level} size={20} showTooltip={false} />
            <div className="flex flex-col">
              <span className="text-xs font-mono font-bold text-amber-300">
                {`${tier.name} • Level ${currentUser.level}`}
              </span>
            </div>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-400/25 font-semibold flex items-center gap-1">
            <Award className="w-3 h-3 text-amber-400" />
            {currentUser.role === 'SUPER_ADMIN'
              ? 'ADMIN'
              : currentUser.role === 'CLUB_LEADER'
              ? 'LEADER'
              : 'STUDENT'}
          </span>
        </div>

        {/* Mini Coin Progress Bar */}
        <div className="mt-3 space-y-1">
          <div className="flex items-center justify-between text-[11px] font-mono">
            <span className="text-white/60">Coin tích lũy</span>
            <span className="text-amber-300 font-semibold">
              {currentUser.level >= 150
                ? `${currentUser.xp.toLocaleString()} / MAX`
                : `${currentUser.xp.toLocaleString()} / ${nextLevelBaseXP.toLocaleString()} Coin`}
            </span>
          </div>
          <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden relative">
            <div
              className="h-full bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-300 rounded-full transition-all duration-500 relative"
              style={{ width: `${progress}%` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer" />
            </div>
          </div>
        </div>

        {/* Full Profile & Badges Link */}
        <button
          type="button"
          onClick={() => {
            onClose();
            onOpenProfile('overview');
          }}
          className="w-full mt-3 py-2 px-3 rounded-xl text-xs font-bold text-white hover:text-cyan-300 bg-gradient-to-r from-cyan-500/15 via-blue-500/10 to-indigo-500/15 hover:from-cyan-500/25 hover:to-indigo-500/25 border border-cyan-400/30 hover:border-cyan-400/50 transition-all flex items-center justify-between group cursor-pointer active:scale-98 shadow-sm"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400 group-hover:rotate-12 transition-transform" />
            <span>Cá nhân</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-white/50 group-hover:text-cyan-300 group-hover:translate-x-0.5 transition-all" />
        </button>

        {/* Action Buttons: F-Pass Card & Profile Edit */}
        <div className="mt-2.5 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenProfile('card');
            }}
            className="py-1.5 px-2.5 rounded-xl text-xs font-semibold text-white/90 hover:text-amber-300 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-amber-400/30 transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
          >
            <CreditCard className="w-3.5 h-3.5 text-amber-400" />
            <span>Thẻ F-Pass</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenProfile('edit');
            }}
            className="py-1.5 px-2.5 rounded-xl text-xs font-semibold text-white/90 hover:text-amber-300 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-amber-400/30 transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
          >
            <UserPen className="w-3.5 h-3.5 text-amber-400" />
            <span>Cài đặt hồ sơ</span>
          </button>
        </div>

        {/* Report Violation */}
        <button
          type="button"
          onClick={() => {
            setIsReportModalOpen(true);
          }}
          className="w-full mt-2 py-1.5 px-3 rounded-xl text-xs font-medium text-amber-300/90 hover:text-amber-200 bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/25 hover:border-amber-400/40 transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
        >
          <Flag className="w-3.5 h-3.5 text-amber-400" />
          <span>Tố cáo</span>
        </button>

        {/* Divider */}
        <div className="h-[1px] w-full bg-white/10 my-3" />

        {/* Clean Logout Button */}
        <button
          type="button"
          onClick={() => {
            onClose();
            onLogout();
          }}
          className="w-full py-2 px-3 rounded-xl text-xs font-semibold text-red-300 hover:text-red-200 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
        >
          <LogOut className="w-3.5 h-3.5 text-red-400" />
          <span>Đăng xuất</span>
        </button>
      </div>

      {/* Report Modal */}
      {isReportModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Tố cáo tài khoản vi phạm"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsReportModalOpen(false);
              setReportSuccess(null);
            }
          }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-up select-auto"
        >
          <div className="w-full max-w-md rounded-2xl bg-[#0c1218]/95 border border-red-500/30 shadow-2xl p-5 relative text-left">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <div className="flex items-center gap-2 text-red-400">
                <Flag className="w-4 h-4 text-red-400" />
                <h3 className="font-bold text-sm text-white">Tố Cáo Tài Khoản Vi Phạm</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsReportModalOpen(false);
                  setReportSuccess(null);
                }}
                className="p-1 rounded-full text-neutral-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {reportSuccess ? (
              <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                <p className="text-xs text-emerald-200">{reportSuccess}</p>
                <button
                  type="button"
                  onClick={() => {
                    setIsReportModalOpen(false);
                    setReportSuccess(null);
                  }}
                  className="px-4 py-1.5 rounded-xl bg-emerald-500 text-black text-xs font-bold cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            ) : (
              <form onSubmit={handleReportSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Tài khoản hoặc nội dung nghi vấn:
                  </label>
                  <input
                    type="text"
                    maxLength={100}
                    value={reportTarget}
                    onChange={(e) => setReportTarget(e.target.value)}
                    placeholder="Tên tài khoản, email hoặc đường dẫn bài viết..."
                    className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Lý do vi phạm (*):
                  </label>
                  <select
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="w-full bg-[#131b24] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-400 cursor-pointer"
                  >
                    <option value="Vi phạm tiêu chuẩn cộng đồng / Gian lận">Vi phạm tiêu chuẩn cộng đồng / Gian lận</option>
                    <option value="Toxic / Gây war / Xúc phạm bạn học">Toxic / Gây war / Xúc phạm bạn học</option>
                    <option value="Spam / Lừa đảo / Quảng cáo trái phép">Spam / Lừa đảo / Quảng cáo trái phép</option>
                    <option value="Nội dung phản cảm / Đồi trụy">Nội dung phản cảm / Đồi trụy</option>
                    <option value="Lý do khác">Lý do khác</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Chi tiết vi phạm:
                  </label>
                  <textarea
                    value={reportDetails}
                    onChange={(e) => setReportDetails(e.target.value)}
                    maxLength={500}
                    rows={3}
                    placeholder="Mô tả cụ thể hành vi hoặc bằng chứng vi phạm..."
                    className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-400 resize-none"
                  />
                </div>

                <div className="p-2.5 rounded-xl bg-red-950/30 border border-red-500/20 text-[10px] text-red-300 flex items-start gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                  <p>
                    Báo cáo sẽ được chuyển tới Ban Quản Trị để xử lý theo nội quy.
                  </p>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setIsReportModalOpen(false)}
                    className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 text-xs cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingReport}
                    className="px-4 py-1.5 rounded-xl bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-xs font-bold cursor-pointer transition-colors"
                  >
                    {isSubmittingReport ? 'Đang gửi...' : 'Gửi Tố Cáo'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  , document.body);
};

export default ProfileDropdown;
