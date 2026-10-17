/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React, { useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { CreditCard, LogOut, ChevronRight, Flag, X, Shield, CheckCircle2 } from 'lucide-react';
import { NotebookPen as GhibliQuillIcon, Sparkles as GhibliSparkleIcon } from './ui/CozyGhibliIcons';
import type { User, ShopItem } from '../types';
import { TierBadge, AdminVerifiedBadge } from './Badges10Tier';
import { useUserDecorations } from '../utils/decorationStore';
import { AvatarWithDecoration } from './decorations/AvatarWithDecoration';
import { DecoratedName } from './decorations/DecoratedAvatar';
import { useProfileProximityEffect } from './decorations/useDecorationMedia';
import { RoleMark } from './RoleMark';
import { getTierForLevel } from '../utils/tier';
import { getXPForLevel } from '../store/forumStore';
import { DEFAULT_AVATAR, handleImageError } from '../utils/mediaFallback';
import { PremiumMark } from './PremiumMark';
import { usePopoverPosition, type DockPosition } from '../utils/popover';
import { isMasterAdmin } from '../config/admin';
import { postJson } from '../utils/session';
import { describeReportResult, settleReportRequest } from '../utils/reports';

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
  const profileProximity = useProfileProximityEffect<HTMLDivElement>(dropdownRef, isOpen, 76);
  const pop = usePopoverPosition(isOpen, anchorRef, dockPosition, 340, 540);

  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState('');
  const [reportReason, setReportReason] = useState('Vi phạm tiêu chuẩn cộng đồng / Gian lận');
  const [reportDetails, setReportDetails] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [reportSuccess, setReportSuccess] = useState<string | null>(null);
  const [reportErrorMsg, setReportErrorMsg] = useState<string | null>(null);

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

  /* Nhiệm vụ 10 — PHẢI gọi trước early-return (rules of hooks).
     KHUNG + HÀO QUANG là 2 slot độc lập — truyền cả hai (không gộp 1). */
  const dropdownDecorations = useUserDecorations(currentUser);
  const toAsset = (item: ShopItem | null | undefined, type: 'avatar_frame' | 'avatar_aura') =>
    item
      ? {
          type,
          fullAssetUrl: item.fullAssetUrl,
          animatedAssetUrl: item.animatedAssetUrl,
          isAnimated: !!item.isAnimated && !!item.animatedAssetUrl,
        }
      : null;
  const dropdownFrameAsset = toAsset(dropdownDecorations.frame, 'avatar_frame');
  const dropdownAuraAsset = toAsset(dropdownDecorations.aura, 'avatar_aura');
  const hasDropdownDeco = !!(dropdownFrameAsset || dropdownAuraAsset);

  if (!isOpen) return null;

  const isSuperAdmin = isMasterAdmin(currentUser.email);
  const tier = getTierForLevel(currentUser.level);

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingReport) return;
    setIsSubmittingReport(true);
    setReportErrorMsg(null);
    try {
      /* EPIC 5: máy chủ bắt buộc đăng nhập và tự lấy danh tính người tố cáo từ phiên. */
      const outcome = describeReportResult(
        await settleReportRequest(
          postJson('/api/reports', {
            reportedUserId: reportTarget.trim() || 'violation_report',
            reportedUserName: reportTarget.trim() || 'Tài khoản vi phạm',
            reason: reportReason,
            details: reportDetails.trim(),
          }),
        ),
      );
      if (!outcome.ok) {
        setReportErrorMsg(outcome.message);
        return;
      }
      setReportSuccess(outcome.message || 'Đã gửi báo cáo vi phạm tới Ban Quản Trị.');
    } catch {
      setReportErrorMsg('Mất kết nối máy chủ — tố cáo CHƯA được gửi. Vui lòng thử lại.');
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

  return (
    <div
      ref={dropdownRef}
      role="menu"
      aria-label="Menu tài khoản"
      data-profile-active={profileProximity.dataProfileActive}
      onPointerEnter={profileProximity.onPointerEnter}
      onPointerLeave={profileProximity.onPointerLeave}
      onFocusCapture={profileProximity.onFocusCapture}
      onBlurCapture={profileProximity.onBlurCapture}
      onTouchStart={profileProximity.onTouchStart}
      className={`ff-profile-surface ff-profile-flyout z-[70] bg-[#0c1218]/95 backdrop-blur-2xl border border-white/15 rounded-2xl p-4 shadow-[0_20px_50px_rgba(0,0,0,0.8)] popover-morph-enter select-none pointer-events-auto overflow-y-auto no-scrollbar ${
        !anchorRef || !pop.ready ? 'absolute top-[calc(100%+8px)] right-0 w-[340px] max-w-[calc(100vw-28px)] max-h-[calc(100dvh-var(--safe-top,0px)-134px)]' : ''
      }`}
      style={anchorRef ? pop.style : undefined}
    >
      {/* Top Section (Current Real User — Discord Nameplate User Bar) */}
      <div className="flex flex-col">
        {/* Avatar + Info */}
        <div className="ff-discord-userbar flex items-center gap-3.5 p-3.5 rounded-2xl bg-white/[0.04] border border-white/15">
          <div className="relative z-[2] shrink-0">
            {/* Nhiệm vụ 10 — 44px; có khung/hào quang Discord → avatar tròn + trang trí thật.
                Truyền CẢ HAI slot (khung + hào quang) — không gộp 1. */}
            {hasDropdownDeco ? (
              <AvatarWithDecoration
                avatarUrl={currentUser.avatar}
                frameAsset={dropdownFrameAsset}
                auraAsset={dropdownAuraAsset}
                size={44}
                eager
                animate={profileProximity.isActive}
                className="rounded-full ring-2 ring-amber-400/50 shadow-md"
                alt={currentUser.name}
              />
            ) : (
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
            )}
            <span className="absolute -bottom-0.5 -right-0.5 z-[4] w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#0c1218] shadow-[0_0_6px_#34d399]" />
          </div>

          <div className="relative z-[2] flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-nowrap min-w-0">
              <DecoratedName
                user={currentUser}
                name={currentUser.name.replace(/ \(.*\)/, '')}
                width={168}
                height={22}
                eager
                animate={profileProximity.isActive}
                priority="high"
                className="min-w-0 shrink"
              />
              {isSuperAdmin && (
                <AdminVerifiedBadge size={14} tooltipPosition="bottom" />
              )}
              <PremiumMark user={currentUser} compact />
            </div>

            <p className="text-[11px] text-white/75 truncate mt-1 font-mono drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)]">
              {currentUser.email}
            </p>
          </div>
        </div>

        {/* Rank & Level Badge */}
        <div className="ff-profile-rank mt-3 flex items-center justify-between px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10">
          <div className="flex items-center gap-2">
            <TierBadge level={currentUser.level} size={20} showTooltip={false} />
            <div className="flex flex-col">
              <span className="ff-profile-tier-name text-xs font-mono font-bold text-[#f2cc8f]">
                {`${tier.name} · Lv.${currentUser.level}`}
              </span>
            </div>
          </div>
          <span className="ff-profile-role-chip text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-400/25 font-semibold flex items-center gap-1">
            <RoleMark user={currentUser} size={10} />
            {currentUser.role === 'SUPER_ADMIN'
              ? 'ADMIN'
              : currentUser.staffRole === 'MODERATOR'
              ? 'MODERATOR'
              : currentUser.staffRole === 'TEACHER'
              ? 'GIÁO VIÊN'
              : currentUser.role === 'CLUB_LEADER'
              ? 'TRƯỞNG CLB'
              : 'HỌC SINH'}
          </span>
        </div>

        {/* Mini Coin Progress Bar */}
        <div className="mt-3 space-y-1">
          <div className="flex items-center justify-between text-[11px] font-mono">
            <span className="text-white/60">Coin tích lũy</span>
            <span className="ff-profile-coin-value text-[#f2cc8f] font-semibold">
              {currentUser.level >= 150
                ? `${currentUser.xp.toLocaleString()} / MAX`
                : `${currentUser.xp.toLocaleString()} / ${nextLevelBaseXP.toLocaleString()} Coin`}
            </span>
          </div>
          <div className="ff-profile-progress h-1.5 w-full bg-white/10 rounded-full overflow-hidden relative">
            <div
              className="h-full bg-gradient-to-r from-[#e07a5f] via-[#f2cc8f] to-[#81b29a] rounded-full transition-all duration-500 relative"
              style={{ width: `${progress}%` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer" />
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            onClose();
            onOpenProfile('overview');
          }}
          className="ff-tactile-btn w-full mt-3 py-2 px-3 rounded-xl text-xs font-extrabold text-[#0b0d12] bg-[#f4f1de] hover:bg-[#f2cc8f] border-2 border-[#0b0d12] transition-all flex items-center justify-between group cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <GhibliSparkleIcon className="w-3.5 h-3.5 text-[#e07a5f] group-hover:rotate-12 transition-transform" />
            <span>Hồ sơ</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-[#0b0d12]/70 group-hover:text-[#0b0d12] group-hover:translate-x-0.5 transition-all" />
        </button>

        {/* Action Buttons: F-Pass Card & Profile Edit */}
        <div className="mt-2.5 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenProfile('card');
            }}
            className="ff-tactile-btn py-1.5 px-2.5 rounded-xl text-xs font-bold text-[#f4f1de] hover:text-[#f2cc8f] bg-[#151a26] hover:bg-[#1e2536] border border-[#f4f1de]/18 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <CreditCard className="w-3.5 h-3.5 text-[#f2cc8f]" />
            <span>F-Pass</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenProfile('edit');
            }}
            className="ff-tactile-btn py-1.5 px-2.5 rounded-xl text-xs font-bold text-[#f4f1de] hover:text-[#f2cc8f] bg-[#151a26] hover:bg-[#1e2536] border border-[#f4f1de]/18 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <GhibliQuillIcon className="w-3.5 h-3.5 text-[#f2cc8f]" />
            <span>F-ID</span>
          </button>
        </div>

        {/* Report Violation */}
        <button
          type="button"
          onClick={() => {
            setIsReportModalOpen(true);
          }}
          className="ff-profile-report w-full mt-2 py-1.5 px-3 rounded-xl text-xs font-medium text-amber-300/90 hover:text-amber-200 bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/25 hover:border-amber-400/40 transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
        >
          <Flag className="w-3.5 h-3.5 text-amber-400" />
          <span>Tố cáo</span>
        </button>

        {/* Divider */}
        <div className="ff-profile-divider h-[1px] w-full bg-white/10 my-3" />

        {/* Clean Logout Button */}
        <button
          type="button"
          onClick={() => {
            onClose();
            onLogout();
          }}
          className="ff-profile-logout w-full py-2 px-3 rounded-xl text-xs font-semibold text-red-300 hover:text-red-200 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
        >
          <LogOut className="w-3.5 h-3.5 text-red-400" />
          <span>Đăng xuất</span>
        </button>
      </div>

      {/* Report Modal — portaled to document.body so it is never trapped in dropdown bounds */}
      {isReportModalOpen && typeof document !== 'undefined' && createPortal(
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
                <h3 className="font-bold text-sm text-white">Tố cáo</h3>
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
                {reportErrorMsg && (
                  <p role="alert" className="ff-report-error">{reportErrorMsg}</p>
                )}
                <div>
                  <label htmlFor="tai-khoan-hoac-noi-dung-nghi-van" className="block text-xs font-semibold text-neutral-300 mb-1">
                    Tài khoản hoặc nội dung nghi vấn:
                  </label>
                  <input id="tai-khoan-hoac-noi-dung-nghi-van"
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
                  <label htmlFor="chi-tiet-vi-pham" className="block text-xs font-semibold text-neutral-300 mb-1">
                    Chi tiết vi phạm:
                  </label>
                  <textarea id="chi-tiet-vi-pham"
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
        </div>,
        document.body
      )}
    </div>
  );
};

export default ProfileDropdown;
