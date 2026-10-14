/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Send,
  Hash,
  Users,
  HelpCircle,
  Heart,
  Shield,
  LogIn,
  Trash2,
  MessageSquareDashed,
  Flag,
  User as UserIcon,
  CheckCircle2,
} from 'lucide-react';
import type { ChatChannelId, ChatMessage, User } from '../types';
import { TierBadge, AdminVerifiedBadge } from './Badges10Tier';
import { useEscapeKey } from '../utils/useEscapeKey';
import { DEFAULT_AVATAR } from '../utils/mediaFallback';
import { useChatCooldown } from '../utils/chatCooldown';
import { MASTER_ADMIN_CONFIG, isMasterAdmin } from '../config/admin';
import { capsHas, useAdminCaps } from '../utils/adminCapabilities';
import { getTierForLevel } from '../utils/tier';
import { pushNotification } from '../utils/notifications';
import { ChatCooldownBar } from './ChatCooldownBar';
import { ThinkingBubble } from './ViewTransitionLoader';
import { postJson } from '../utils/session';
import { describeReportResult, settleReportRequest } from '../utils/reports';
import { DecoratedAvatar, DecoratedName, UserNameplateBg } from './decorations/DecoratedAvatar';

export interface ChatDockProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  users?: Record<string, User>;
  messages: ChatMessage[];
  onSendMessage: (channelId: ChatChannelId, content: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  onOpenLoginModal?: () => void;
  onOpenProfile?: (user: { id: string; name: string; avatar: string; email?: string; level?: number }) => void;
  /** False khi máy chủ chưa đồng bộ xong → hiện bong bóng "đang tải". */
  isSynced?: boolean;
}


const CHANNELS: { id: ChatChannelId; name: string; desc: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'hallway', name: 'Kết bạn bốn phương', desc: 'Làm quen và kết nối bạn học toàn trường', icon: Users },
  { id: 'quick-qa', name: 'Hỏi bài nhanh', desc: 'Hỏi đáp khẩn cấp, giải bài trong 5 phút', icon: HelpCircle },
  { id: 'confessions', name: 'Góc tâm sự', desc: 'Áp lực học tập & suy tư tuổi học trò', icon: Heart },
  { id: 'club-hub', name: 'Hội quán CLB', desc: 'Giao lưu điều phối giữa các Ban Chủ nhiệm', icon: Shield },
];

export const ChatDock: React.FC<ChatDockProps> = ({
  isOpen,
  onClose,
  currentUser,
  users = {},
  messages,
  onSendMessage,
  onDeleteMessage,
  onOpenLoginModal,
  onOpenProfile,
  isSynced = true,
}) => {
  const usersById = useMemo(() => {
    const map = new Map<string, User>();
    for (const u of Object.values(users)) {
      if (u && u.id) map.set(u.id, u);
    }
    return map;
  }, [users]);

  const resolveChatUser = useCallback(
    (email?: string | null, id?: string | null): User | null => {
      const cleanEmail = email ? email.trim().toLowerCase() : '';
      if (cleanEmail && users[cleanEmail]) return users[cleanEmail];
      if (isMasterAdmin(cleanEmail) && users['broamstuck@gmail.com']) {
        return users['broamstuck@gmail.com'];
      }
      if (
        currentUser &&
        ((cleanEmail && currentUser.email.toLowerCase() === cleanEmail) ||
          (id && currentUser.id === id) ||
          ((id === 'admin-master' || id === 'user-admin') && isMasterAdmin(currentUser.email)))
      ) {
        return currentUser;
      }
      if ((id === 'admin-master' || id === 'user-admin') && users['broamstuck@gmail.com']) {
        return users['broamstuck@gmail.com'];
      }
      if (id) {
        return usersById.get(id) || null;
      }
      return null;
    },
    [users, usersById, currentUser],
  );
  /* Epic 3 — thu hồi tin nhắn: Super Admin hoặc vai trò tùy chỉnh có quyền edit_content. */
  const adminCaps = useAdminCaps();
  const canRecallMessages = capsHas(adminCaps, 'edit_content');
  const [activeChannel, setActiveChannel] = useState<ChatChannelId>('hallway');
  const [inputText, setInputText] = useState('');
  const cooldown = useChatCooldown();
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const [activeAuthorCard, setActiveAuthorCard] = useState<{
    id: string;
    name: string;
    avatar: string;
    email?: string;
    level: number;
  } | null>(null);
  const [authorAnchorPos, setAuthorAnchorPos] = useState<{ x: number; y: number }>({ x: 240, y: 180 });



  const [reportUser, setReportUser] = useState<{ id: string; name: string } | null>(null);
  const [reportReason, setReportReason] = useState<string>('Toxic / Gây war / Xúc phạm bạn học');
  const [reportDetails, setReportDetails] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [reportSuccessMsg, setReportSuccessMsg] = useState<string | null>(null);
  const [reportErrorMsg, setReportErrorMsg] = useState<string | null>(null);

  /* Hộp thoại tố cáo khai báo aria-modal="true" mà không có đường thoát bằng
     phím. Chỉ bật khi hộp thoại đang mở để không giành phím Escape của lớp khác. */
  useEscapeKey(() => {
    setReportUser(null);
    setReportSuccessMsg(null);
  }, Boolean(reportUser));

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportUser || isSubmittingReport) return;
    setIsSubmittingReport(true);
    setReportErrorMsg(null);
    try {
      /* EPIC 5: máy chủ bắt buộc đăng nhập và tự lấy danh tính người tố cáo từ phiên. */
      const outcome = describeReportResult(
        await settleReportRequest(
          postJson('/api/reports', {
            reportedUserId: reportUser.id,
            reportedUserName: reportUser.name,
            reason: reportReason,
            details: reportDetails.trim(),
          }),
        ),
      );
      if (!outcome.ok) {
        setReportErrorMsg(outcome.message);
        return;
      }
      setReportSuccessMsg(outcome.message || 'Đã gửi tố cáo tài khoản tới Ban Quản Trị.');
      pushNotification({
        type: 'system',
        category: 'system',
        title: 'Đã Tiếp Nhận Báo Cáo',
        body: `Tố cáo đối với "${reportUser.name}" đã được chuyển tới Ban Giám Hiệu và Super Admin.`,
        targetView: 'chat',
      });
    } catch {
      setReportErrorMsg('Mất kết nối máy chủ — tố cáo CHƯA được gửi. Vui lòng thử lại.');
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const currentMessages = useMemo(
    () => messages.filter(m => m.channelId === activeChannel),
    [messages, activeChannel],
  );

  const renderedDockMessages = useMemo(
    () =>
      currentMessages.map(msg => {
        const isMe = currentUser ? msg.authorId === currentUser.id : false;
        const isSuperAdminMsg = isMasterAdmin(msg.authorEmail);
        const isSuperAdmin = currentUser ? isMasterAdmin(currentUser.email) : false;
        const authorDisplayName = isSuperAdminMsg ? MASTER_ADMIN_CONFIG.name : msg.authorName;
        const authorDisplayAvatar = isSuperAdminMsg ? MASTER_ADMIN_CONFIG.avatar : msg.authorAvatar;
        const resolvedDockUser = resolveChatUser(
          isSuperAdminMsg ? MASTER_ADMIN_CONFIG.email : msg.authorEmail,
          msg.authorId,
        );

        return (
          <div
            key={msg.id}
            className={`flex items-start gap-2.5 group/msg ${isMe ? 'flex-row-reverse' : ''}`}
          >
            <button
              type="button"
              onClick={(e) => {
                setAuthorAnchorPos({ x: e.clientX, y: e.clientY });
                if (isMe && currentUser) {
                  setActiveAuthorCard({
                    id: currentUser.id,
                    name: currentUser.name,
                    avatar: currentUser.avatar,
                    email: currentUser.email,
                    level: currentUser.level || 1,
                  });
                } else {
                  setActiveAuthorCard({
                    id: msg.authorId,
                    name: authorDisplayName,
                    avatar: authorDisplayAvatar,
                    email: isSuperAdminMsg ? MASTER_ADMIN_CONFIG.email : msg.authorEmail,
                    level: isSuperAdminMsg ? 150 : msg.authorLevel,
                  });
                }
              }}
              className="relative shrink-0 cursor-pointer focus:outline-none"
              title={`Xem thông tin của ${authorDisplayName}`}
            >
              <DecoratedAvatar
                user={resolvedDockUser}
                fallbackSrc={authorDisplayAvatar}
                size={34}
                animate={isOpen}
                alt={authorDisplayName}
                className={`rounded-full shadow-md ${
                  isSuperAdminMsg ? 'ring-2 ring-amber-400' : 'ring-1 ring-white/20'
                }`}
              />
              <span className="absolute -bottom-1 -right-1 z-[4]">
                <TierBadge level={isSuperAdminMsg ? 150 : msg.authorLevel} size={15} showTooltip={false} />
              </span>
            </button>

            <div className={`max-w-[78%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
              <div className="flex items-center gap-1.5 mb-1.5 text-[11px] text-neutral-400 flex-wrap">
                <button
                  type="button"
                  onClick={(e) => {
                    setAuthorAnchorPos({ x: e.clientX, y: e.clientY });
                    if (isMe && currentUser) {
                      setActiveAuthorCard({
                        id: currentUser.id,
                        name: currentUser.name,
                        avatar: currentUser.avatar,
                        email: currentUser.email,
                        level: currentUser.level || 1,
                      });
                    } else {
                      setActiveAuthorCard({
                        id: msg.authorId,
                        name: authorDisplayName,
                        avatar: authorDisplayAvatar,
                        email: isSuperAdminMsg ? MASTER_ADMIN_CONFIG.email : msg.authorEmail,
                        level: isSuperAdminMsg ? 150 : msg.authorLevel,
                      });
                    }
                  }}
                  className="inline-flex items-center cursor-pointer hover:opacity-95 focus:outline-none"
                >
                  <DecoratedName
                    user={resolvedDockUser}
                    name={authorDisplayName.replace(/ \(.*\)/, '')}
                    width={136}
                    height={26}
                    animate={isOpen}
                    showFallbackTag
                  />
                </button>
                {isSuperAdminMsg && <AdminVerifiedBadge size={12} />}
                <span className="text-[10px] text-neutral-500 font-mono">• {msg.timestamp}</span>

                {/* Thu hồi tin nhắn (Super Admin / quyền edit_content) */}
                {(isSuperAdmin || canRecallMessages) && (
                  <button
                    type="button"
                    onClick={() => onDeleteMessage?.(msg.id)}
                    className="opacity-0 group-hover/msg:opacity-100 transition-opacity ml-1.5 px-1.5 py-0.5 text-red-400 hover:text-red-300 rounded bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 cursor-pointer inline-flex items-center gap-1"
                    title="Thu hồi tin nhắn vi phạm"
                  >
                    <Trash2 className="w-2.5 h-2.5" />
                    <span className="text-[9px]">Thu hồi tin nhắn</span>
                  </button>
                )}
              </div>

              <div
                className={`px-3.5 py-2 rounded-2xl text-xs leading-relaxed break-words shadow-sm ${
                  isMe
                    ? 'bg-amber-500/20 text-white border border-amber-400/30 rounded-tr-none'
                    : 'bg-white/10 text-neutral-100 rounded-tl-none border border-white/10'
                }`}
              >
                {msg.content}
              </div>
            </div>
          </div>
        );
      }),
    [currentMessages, currentUser, canRecallMessages, resolveChatUser, onDeleteMessage, isOpen],
  );

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeChannel, isOpen]);

  const handleSend = () => {
    if (!currentUser) return;
    if (cooldown.isCooling) {
      cooldown.nudge();
      return;
    }
    const text = inputText.trim();
    if (!text) return;
    onSendMessage(activeChannel, text);
    setInputText('');
    cooldown.startCooldown();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const currentChannelObj = CHANNELS.find(c => c.id === activeChannel) || CHANNELS[0];

  return (
    <>
      <div
      className={`fixed top-20 bottom-4 right-0 sm:right-4 z-40 w-full sm:w-[450px] md:w-[480px] p-2 sm:p-0 flex flex-col chat-dock-panel ${
        isOpen
          ? 'translate-x-0 opacity-100 pointer-events-auto'
          : 'translate-x-full opacity-0 pointer-events-none'
      }`}
    >
      {/* Background glass container */}
      <div className="w-full h-full rounded-3xl liquid-glass bg-black/35 backdrop-blur-xl border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.9)] flex flex-col overflow-hidden">
        
        {/* Dock Header */}
        <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between bg-black/30">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_#34d399] animate-pulse" />
            <h2 className="text-sm font-bold text-white tracking-wide flex items-center gap-1.5">
              <span>PHÒNG CHAT ĐÀM THOẠI</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                LIVE
              </span>
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-neutral-400 hover:text-white transition-colors cursor-pointer"
            title="Đóng Dock Chat"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Channel Switcher Pills: Organic non-clipping flex container */}
        <div className="p-2 border-b border-white/10 bg-black/20">
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-1.5 p-1 bg-black/40 rounded-xl overflow-x-auto no-scrollbar">
            {CHANNELS.map(ch => {
              const Icon = ch.icon;
              const isActive = activeChannel === ch.id;
              return (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => setActiveChannel(ch.id)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-1.5 shrink-0 transition-all font-medium focus:outline-none cursor-pointer ${
                    isActive
                      ? 'bg-white/15 text-white font-medium shadow-sm border border-white/20'
                      : 'text-neutral-400 hover:text-white hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-amber-400' : 'text-neutral-400'}`} />
                  <span className="whitespace-nowrap">#{ch.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Channel Subheader */}
        <div className="px-4 py-2 bg-black/20 border-b border-white/5 flex items-center justify-between text-[11px] text-neutral-400">
          <div className="flex items-center gap-1.5 min-w-0">
            <Hash className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="text-neutral-200 font-medium shrink-0">{currentChannelObj.name}</span>
            <span className="text-neutral-600">—</span>
            <span className="truncate">{currentChannelObj.desc}</span>
          </div>
          <span className="font-mono text-neutral-500 shrink-0 ml-2">{currentMessages.length} tin</span>
        </div>

        {/* Messages Feed Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5" role="log" aria-live="polite" aria-relevant="additions" aria-label="Danh sách tin nhắn">
          {!isSynced && currentMessages.length === 0 ? (
            /* Đang đồng bộ máy chủ → bong bóng suy nghĩ (CodeFronts la-05) */
            <div className="space-y-3 pt-1" aria-busy="true">
              <ThinkingBubble phase="Đang kết nối máy chủ F-Forum…" compact />
              <ThinkingBubble phase={`Đang tải tin nhắn #${currentChannelObj.name}…`} compact />
            </div>
          ) : currentMessages.length === 0 ? (
            /* Authentic Empty State with MessageSquareDashed */
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2.5 text-neutral-400">
              <div className="relative">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <MessageSquareDashed className="w-6 h-6 text-amber-300" />
                </div>
              </div>
              <h3 className="text-xs font-semibold text-white font-mono">Hãy là người mở đầu cuộc trò chuyện</h3>
            </div>
          ) : (
            renderedDockMessages
          )}
          <div ref={messagesEndRef} />
        </div>

        <ChatCooldownBar
          isCooling={cooldown.isCooling}
          remainingMs={cooldown.remainingMs}
          nudgeKey={cooldown.nudgeKey}
          variant="dock"
        />

        {/* Input Bar or Login Prompt */}
        {!currentUser ? (
          <div className="p-3 bg-black/35 border-t border-white/10 flex items-center justify-between gap-3">
            <span className="text-xs text-neutral-400">Vui lòng đăng nhập để gửi tin nhắn</span>
            <button
              type="button"
              onClick={onOpenLoginModal}
              className="px-3.5 py-1.5 rounded-xl bg-white text-neutral-900 font-semibold text-xs hover:bg-neutral-200 transition-colors shadow-sm cursor-pointer shrink-0 flex items-center gap-1.5"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Đăng nhập</span>
            </button>
          </div>
        ) : (
          <div className="p-3 bg-black/35 border-t border-white/10 flex items-center gap-2">
            <input
              type="text"
              value={inputText}
              maxLength={300}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Nhắn vào #${currentChannelObj.name}...`}
              className="flex-1 bg-black/40 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-400 transition-colors disabled:opacity-50"
            />

            <button
              onClick={handleSend}
              disabled={!inputText.trim() || cooldown.isCooling}
              className={`relative p-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-400/40 font-semibold active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-md ${
                cooldown.isCooling ? 'ff-cd-btn is-cooling' : ''
              }`}
              title={cooldown.isCooling ? `Còn ${cooldown.secondsLeft}s trước tin tiếp theo` : 'Gửi tin nhắn'}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>

      {/* Compact Floating Author Context Popover — portaled to document.body */}
      {activeAuthorCard && typeof document !== 'undefined' && createPortal(
        <div
          role="dialog"
          aria-modal="false"
          aria-label="Thông tin người dùng"
          onClick={(e) => {
            if (e.target === e.currentTarget) setActiveAuthorCard(null);
          }}
          className="fixed inset-0 z-[100] bg-transparent"
        >
          <div
            style={{
              position: 'fixed',
              left:
                typeof window !== 'undefined'
                  ? Math.max(12, Math.min(authorAnchorPos.x - 290, window.innerWidth - 332))
                  : 24,
              top:
                typeof window !== 'undefined'
                  ? Math.max(12, Math.min(authorAnchorPos.y - 20, window.innerHeight - 245))
                  : 120,
            }}
            className="pc-12-shell w-[320px] max-w-[calc(100vw-24px)] rounded-2xl p-4 shadow-[0_18px_48px_rgba(0,0,0,0.85)] popover-morph-enter"
          >
            <button
              type="button"
              onClick={() => setActiveAuthorCard(null)}
              className="absolute top-2.5 right-2.5 z-[5] p-1 rounded-full text-neutral-300 hover:text-white cursor-pointer"
              aria-label="Đóng"
            >
              <X className="w-3.5 h-3.5" />
            </button>

            <div className="ff-discord-userbar flex items-center gap-3.5 p-3 rounded-xl bg-white/[0.04] border border-white/15 pr-6">
              <UserNameplateBg
                user={resolveChatUser(activeAuthorCard.email, activeAuthorCard.id)}
                width={268}
                eager
                animate
                priority="high"
              />
              <div className="relative z-[2] shrink-0">
                <DecoratedAvatar
                  user={resolveChatUser(activeAuthorCard.email, activeAuthorCard.id)}
                  fallbackSrc={activeAuthorCard.avatar || DEFAULT_AVATAR}
                  size={44}
                  eager
                  animate
                  alt={activeAuthorCard.name}
                  className="rounded-full ring-1 ring-amber-400/60 shadow-md"
                />
                <span className="absolute -bottom-1 -right-1 z-[4]">
                  <TierBadge level={activeAuthorCard.level} size={16} showTooltip={false} />
                </span>
              </div>

              <div className="relative z-[2] min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <DecoratedName
                    user={resolveChatUser(activeAuthorCard.email, activeAuthorCard.id)}
                    name={activeAuthorCard.name.replace(/ \(.*\)/, '')}
                    width={176}
                    height={33}
                    eager
                    animate
                    priority="high"
                    showFallbackTag
                  />
                  {isMasterAdmin(activeAuthorCard.email) && <AdminVerifiedBadge size={12} />}
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/25 text-amber-200 border border-amber-400/40 text-[9.5px] font-mono font-bold shadow-sm">
                    {getTierForLevel(activeAuthorCard.level).titleVi}
                  </span>
                  <span className="text-[10px] text-white/85 font-mono drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)]">
                    Lv.{activeAuthorCard.level}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-2.5 flex flex-col gap-1.5">
              {onOpenProfile && (
                <button
                  type="button"
                  onClick={() => {
                    const user = activeAuthorCard;
                    setActiveAuthorCard(null);
                    onOpenProfile(user);
                  }}
                  className="pc-12-btn w-full py-2 px-3 rounded-xl text-cyan-200 hover:text-white text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <UserIcon className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Trang cá nhân</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  const user = activeAuthorCard;
                  setActiveAuthorCard(null);
                  setReportUser({ id: user.id, name: user.name });
                }}
                className="pc-12-btn w-full py-2 px-3 rounded-xl text-red-200 hover:text-red-100 text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Flag className="w-3.5 h-3.5 text-red-400" />
                <span>Tố cáo</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal: Tố cáo tài khoản — portaled to document.body */}
      {reportUser && typeof document !== 'undefined' && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Tố cáo tài khoản vi phạm"
          onClick={e => {
            if (e.target === e.currentTarget) {
              setReportUser(null);
              setReportSuccessMsg(null);
            }
          }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-up"
        >
          <div className="liquid-glass w-full max-w-md rounded-3xl bg-neutral-950/95 border border-red-500/40 shadow-2xl p-6 relative">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <div className="flex items-center gap-2 text-red-400">
                <Flag className="w-5 h-5 text-red-400" />
                <h3 className="font-bold text-sm sm:text-base text-white">Tố Cáo Tài Khoản Vi Phạm</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setReportUser(null);
                  setReportSuccessMsg(null);
                }}
                className="p-1 rounded-full text-neutral-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {reportSuccessMsg ? (
              <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                <p className="text-xs text-emerald-200">{reportSuccessMsg}</p>
                <button
                  type="button"
                  onClick={() => {
                    setReportUser(null);
                    setReportSuccessMsg(null);
                  }}
                  className="px-4 py-1.5 rounded-xl bg-emerald-500 text-black text-xs font-bold cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            ) : (
              <form onSubmit={handleReportSubmit} className="space-y-3.5">
                {reportErrorMsg && (
                  <p role="alert" className="ff-report-error">{reportErrorMsg}</p>
                )}
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-neutral-300">
                  Đối tượng tố cáo: <strong className="text-white">{reportUser.name}</strong>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Lý do vi phạm (*):
                  </label>
                  <select
                    value={reportReason}
                    onChange={e => setReportReason(e.target.value)}
                    className="w-full bg-neutral-900 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-400 cursor-pointer"
                  >
                    <option value="Toxic / Gây war / Xúc phạm bạn học">Toxic / Gây war / Xúc phạm bạn học</option>
                    <option value="Spam / Quảng cáo / Lừa đảo">Spam / Quảng cáo / Lừa đảo</option>
                    <option value="Nội dung phản cảm / Đồi trụy">Nội dung phản cảm / Đồi trụy</option>
                    <option value="Gian lận điểm / Hack Coin">Gian lận điểm / Hack Coin</option>
                    <option value="Khác">Lý do khác</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="chi-tiet-vi-pham" className="block text-xs font-semibold text-neutral-300 mb-1">
                    Chi tiết vi phạm:
                  </label>
                  <textarea id="chi-tiet-vi-pham"
                    value={reportDetails}
                    onChange={e => setReportDetails(e.target.value)}
                    maxLength={500}
                    rows={3}
                    placeholder="Mô tả cụ thể hành vi hoặc bằng chứng vi phạm..."
                    className="w-full bg-neutral-900 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-400 resize-none"
                  />
                </div>

                <div className="p-2.5 rounded-xl bg-red-950/30 border border-red-500/20 text-[10px] text-red-300 space-y-1">
                  <span className="font-bold flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5 text-red-400" />
                    Kỷ luật trường học nghiêm ngặt:
                  </span>
                  <p>
                    Báo cáo vi phạm sẽ được chuyển tới Ban Quản Trị để xử lý theo nội quy.
                  </p>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setReportUser(null)}
                    className="px-4 py-2 rounded-xl text-xs text-neutral-400 hover:text-white cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingReport}
                    className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-md disabled:opacity-50 cursor-pointer"
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
    </>
  );
};

export default ChatDock;
