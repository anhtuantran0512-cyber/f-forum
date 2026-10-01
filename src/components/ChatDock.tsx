import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Send,
  Hash,
  Users,
  HelpCircle,
  Heart,
  Shield,
  Clock,
  Sparkles,
  LogIn,
  Trash2,
  MessageSquareDashed,
} from 'lucide-react';
import type { ChatChannelId, ChatMessage, User } from '../types';
import { TierBadge, AdminVerifiedBadge } from './Badges10Tier';
import { DEFAULT_AVATAR, handleImageError } from '../utils/mediaFallback';
import { MASTER_ADMIN_CONFIG, isMasterAdmin } from '../config/admin';

export interface ChatDockProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  messages: ChatMessage[];
  onSendMessage: (channelId: ChatChannelId, content: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  onOpenLoginModal?: () => void;
}


const CHANNELS: { id: ChatChannelId; name: string; desc: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'hallway', name: 'Kết bạn bốn phương', desc: 'Đại sảnh giao lưu kết bạn toàn trường', icon: Users },
  { id: 'quick-qa', name: 'Hỏi bài nhanh', desc: 'Hỏi đáp khẩn cấp, giải bài trong 5 phút', icon: HelpCircle },
  { id: 'confessions', name: 'Góc tâm sự', desc: 'Áp lực học tập & suy tư tuổi học trò', icon: Heart },
  { id: 'club-hub', name: 'Hội quán CLB', desc: 'Giao lưu điều phối giữa các Ban Chủ nhiệm', icon: Shield },
];

export const ChatDock: React.FC<ChatDockProps> = ({
  isOpen,
  onClose,
  currentUser,
  messages,
  onSendMessage,
  onDeleteMessage,
  onOpenLoginModal,
}) => {
  const [activeChannel, setActiveChannel] = useState<ChatChannelId>('hallway');
  const [inputText, setInputText] = useState('');
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Filter messages for active channel
  const currentMessages = messages.filter(m => m.channelId === activeChannel);

  // Auto scroll to bottom on new message
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeChannel, isOpen]);

  // Cooldown countdown timer (2.0s anti-spam)
  useEffect(() => {
    if (cooldownRemaining > 0) {
      const interval = setInterval(() => {
        setCooldownRemaining(prev => Math.max(0, prev - 100));
      }, 100);
      return () => clearInterval(interval);
    }
  }, [cooldownRemaining]);

  const handleSend = () => {
    if (!inputText.trim() || cooldownRemaining > 0 || !currentUser) return;
    onSendMessage(activeChannel, inputText.trim());
    setInputText('');
    setCooldownRemaining(2000); // 2.0s anti-spam
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const currentChannelObj = CHANNELS.find(c => c.id === activeChannel) || CHANNELS[0];

  return (
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
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
          {currentMessages.length === 0 ? (
            /* Authentic Empty State with MessageSquareDashed */
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3 text-neutral-400">
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
                  <MessageSquareDashed className="w-7 h-7 text-amber-300 animate-pulse" />
                </div>
                <Sparkles className="w-3.5 h-3.5 text-amber-300 absolute -top-1 -right-1 animate-pulse" />
              </div>
              <h3 className="text-xs font-semibold text-white font-mono">Chưa có tin nhắn nào trong kênh này</h3>
              <p className="text-[11px] text-neutral-300 max-w-[260px] leading-relaxed font-light">
                Chưa có tin nhắn nào trong kênh này. Hãy là người mở đầu cuộc trò chuyện!
              </p>
            </div>
          ) : (
            currentMessages.map(msg => {
              const isMe = currentUser ? msg.authorId === currentUser.id : false;
              const isSuperAdminMsg = isMasterAdmin(msg.authorEmail);
              const isSuperAdmin = currentUser ? isMasterAdmin(currentUser.email) : false;
              const authorDisplayName = isSuperAdminMsg ? MASTER_ADMIN_CONFIG.name : msg.authorName;
              const authorDisplayAvatar = isSuperAdminMsg ? MASTER_ADMIN_CONFIG.avatar : msg.authorAvatar;

              return (
                <div
                  key={msg.id}
                  className={`flex items-start gap-2.5 group/msg ${isMe ? 'flex-row-reverse' : ''}`}
                >
                  <div className="relative shrink-0">
                    <img
                      src={authorDisplayAvatar}
                      alt={authorDisplayName}
                      onError={(e) => handleImageError(e, DEFAULT_AVATAR)}
                      className={`w-8 h-8 rounded-full object-cover shadow-md ${
                        isSuperAdminMsg ? 'border-2 border-amber-400' : 'border border-white/20'
                      }`}
                    />
                    <span className="absolute -bottom-1 -right-1">
                      <TierBadge level={isSuperAdminMsg ? 150 : msg.authorLevel} size={15} showTooltip={false} />
                    </span>
                  </div>

                  <div className={`max-w-[78%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    <div className="flex items-center gap-1.5 mb-1 text-[11px] text-neutral-400">
                      <span className={isSuperAdminMsg ? 'discord-admin-name text-xs' : 'font-semibold text-neutral-200'}>
                        {authorDisplayName}
                      </span>
                      {isSuperAdminMsg && <AdminVerifiedBadge size={12} />}
                      <span className="text-[10px] text-neutral-500 font-mono">• {msg.timestamp}</span>

                      {/* Super Admin Recall/Delete Button */}
                      {isSuperAdmin && (
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
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Anti-Spam Cooldown Indicator */}
        {cooldownRemaining > 0 && (
          <div className="px-4 py-1 bg-amber-950/40 border-t border-amber-500/20 text-[10px] text-amber-300 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-amber-400" />
              Chống spam (2.0s): Đang khóa gửi...
            </span>
            <span className="font-mono font-bold">{(cooldownRemaining / 1000).toFixed(1)}s</span>
          </div>
        )}

        {/* Cooldown progress bar */}
        {cooldownRemaining > 0 && (
          <div className="w-full bg-neutral-800 h-1 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-amber-300 animate-cooldown-shrink"
              style={{ width: `${(cooldownRemaining / 2000) * 100}%` }}
            />
          </div>
        )}

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
              disabled={cooldownRemaining > 0}
              placeholder={
                cooldownRemaining > 0
                  ? 'Đang chờ bộ đếm chống spam 2.0s...'
                  : `Nhắn vào #${currentChannelObj.name}...`
              }
              className="flex-1 bg-black/40 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-400 transition-colors disabled:opacity-50"
            />

            <button
              onClick={handleSend}
              disabled={!inputText.trim() || cooldownRemaining > 0}
              className="p-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-400/40 font-semibold active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-md"
              title={cooldownRemaining > 0 ? 'Vui lòng chờ hết thời gian đếm ngược' : 'Gửi tin nhắn'}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatDock;
