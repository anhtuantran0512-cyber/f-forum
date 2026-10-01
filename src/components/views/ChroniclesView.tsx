import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Send,
} from 'lucide-react';
import { handleVideoError } from '../../utils/mediaFallback';
import type { User } from '../../types';
import { AboutUs } from '../AboutUs';
import type { AboutData } from '../../store/adminStore';

interface ChroniclesViewProps {
  onSubmitFeedback: (data: { name: string; email: string; category?: string; content: string }) => void;
  isEmbedded?: boolean;
  currentUser?: User | null;
  aboutData?: AboutData;
  onUpdateAbout?: (data: AboutData) => void;
}

export const ChroniclesView: React.FC<ChroniclesViewProps> = ({
  onSubmitFeedback,
  isEmbedded = false,
  currentUser = null,
  aboutData,
  onUpdateAbout,
}) => {
  const [userNameInput, setUserNameInput] = useState<string | null>(null);
  const [userEmailInput, setUserEmailInput] = useState<string | null>(null);

  const name = userNameInput !== null ? userNameInput : (currentUser?.name || '');

  const email = userEmailInput !== null ? userEmailInput : (currentUser?.email || '');

  const [category, setCategory] = useState<string>('Báo lỗi giao diện');
  const [content, setContent] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (cooldown > 0 || isSubmitting) return;

    if (!name.trim()) {
      setFormError('Vui lòng nhập họ và tên của bạn.');
      return;
    }
    if (!email.trim()) {
      setFormError('Vui lòng nhập địa chỉ email liên hệ.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setFormError('Vui lòng nhập địa chỉ email hợp lệ.');
      return;
    }

    if (content.trim().length < 20) {
      setFormError('Nội dung góp ý cần tối thiểu 20 ký tự để mô tả chi tiết vấn đề.');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      onSubmitFeedback({
        name: name.trim().slice(0, 80),
        email: email.trim().slice(0, 120),
        category,
        content: content.trim().slice(0, 1000),
      });
      setContent('');
      setIsSubmitting(false);
      setCooldown(5); // 5-second anti-spam lock
    }, 400);
  };

  return (
    <section className={`relative w-full ${isEmbedded ? 'min-h-[850px]' : 'min-h-screen'} flex flex-col pt-20 sm:pt-24 pb-16 px-4 sm:px-8`}>
      {/* Background Cosmic Atmosphere Video Engine */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden bg-neutral-950">
        <video
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260627_094019_4214ea73-b963-46a4-8327-61489192de99.mp4"
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          onError={handleVideoError}
          className="w-full h-full object-cover scale-[1.05] opacity-45"
        />
        <div className="absolute inset-0 bg-neutral-950/80 backdrop-blur-[2px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-indigo-950/60 via-neutral-950/90 to-black" />
        <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-purple-600/15 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-cyan-600/15 rounded-full blur-[140px] pointer-events-none" />
      </div>

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-5xl mx-auto flex-1 flex flex-col space-y-8 pb-16">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-white/10 shrink-0">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-purple-400" />
              <span>Khu Vinh Danh & Biên Niên Sử F-Forum</span>
              <span className="text-xs font-mono font-normal text-purple-300 px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/30">
                KHU VINH DANH • CHRONICLES
              </span>
            </h1>
            <p className="text-xs text-neutral-300 mt-1">
              Không gian tôn vinh tri thức, nhà sáng lập Trần Văn Anh Tuấn, BroAmStuck Studio và 21 cột mốc lịch sử F-Forum.
            </p>
          </div>

          {/* Minimalist Social Icons */}
          <div className="flex items-center gap-2.5">
            {/* Facebook Minimalist Icon */}
            <a
              href="https://www.facebook.com/TuanNotTun/"
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 rounded-xl liquid-glass bg-blue-600/20 hover:bg-blue-600/35 border border-blue-500/40 text-blue-300 hover:text-white flex items-center justify-center transition-all shadow-[0_0_15px_rgba(59,130,246,0.25)] hover:scale-105 active:scale-95"
              title="Facebook Admin"
              aria-label="Facebook Admin"
            >
              <svg className="w-5 h-5 fill-[#1877F2]" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
            </a>

            {/* Discord Minimalist Icon with subtle void aura */}
            <a
              href="https://discord.gg/GMDCnxxJwX"
              target="_blank"
              rel="noopener noreferrer"
              className="relative w-10 h-10 rounded-xl liquid-glass bg-[#5865F2]/20 hover:bg-[#5865F2]/35 border border-[#5865F2]/50 text-indigo-200 hover:text-white flex items-center justify-center transition-all void-discord-glow hover:scale-105 active:scale-95 group overflow-hidden"
              title="Discord F-Forum"
              aria-label="Discord F-Forum"
            >
              <div className="absolute inset-0 pointer-events-none animate-meteor-orbit flex items-center justify-center">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-300 shadow-[0_0_8px_#22d3ee]" />
              </div>
              <svg className="w-5 h-5 fill-[#5865F2] group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
              </svg>
            </a>
          </div>
        </div>

        {/* 3D Cinematic "Khu Vinh Danh" (Founder Spotlight & Milestones Archive) */}
        <div className="w-full">
          <AboutUs
            customAboutData={aboutData}
            onUpdateAbout={onUpdateAbout}
            isEmbedded={isEmbedded}
          />
        </div>

        {/* Hộp Thư Góp Ý (Redesigned Feedback Form) */}
        <div className="p-6 sm:p-8 rounded-3xl liquid-glass bg-neutral-950/85 border border-white/20 shadow-2xl backdrop-blur-2xl">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center text-cyan-300">
              <Send className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-white uppercase tracking-wider">
                HỘP THƯ GÓP Ý & PHẢN HỒI
              </h3>
              <p className="text-[11px] text-neutral-400">
                Ý kiến đóng góp sẽ được chuyển trực tiếp tới Ban Quản Trị qua: 
                <span className="text-cyan-300 font-mono ml-1">anhtuantran0512@gmail.com</span>
              </p>
            </div>
          </div>

          {formError && (
            <div className="my-3 p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-xs text-red-300">
              {formError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  1. Họ và tên người gửi <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={80}
                  value={name}
                  onChange={e => setUserNameInput(e.target.value)}
                  placeholder="Ví dụ: Trần Văn Nam"
                  className="w-full bg-neutral-900 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-cyan-400 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  2. Email liên hệ <span className="text-red-400">*</span>
                </label>
                <input
                  type="email"
                  required
                  maxLength={120}
                  value={email}
                  onChange={e => setUserEmailInput(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-neutral-900 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-cyan-400 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                3. Phân loại góp ý <span className="text-red-400">*</span>
              </label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full bg-neutral-900 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-400 transition-colors cursor-pointer"
              >
                <option value="Báo lỗi giao diện" className="bg-neutral-900 text-white">Báo lỗi giao diện</option>
                <option value="Đề xuất tính năng" className="bg-neutral-900 text-white">Đề xuất tính năng</option>
                <option value="Khiếu nại nội dung" className="bg-neutral-900 text-white">Khiếu nại nội dung</option>
                <option value="Góp ý khác" className="bg-neutral-900 text-white">Góp ý khác</option>
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-neutral-300">
                  4. Nội dung chi tiết (tối thiểu 20 ký tự) <span className="text-red-400">*</span>
                </label>
                <span className="text-[10px] font-mono text-neutral-400">
                  {content.length}/1000 ký tự
                </span>
              </div>
              <textarea
                required
                rows={4}
                maxLength={1000}
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="Mô tả cụ thể ý kiến đóng góp, vị trí phát sinh lỗi hoặc đề xuất tính năng hữu ích cho diễn đàn..."
                className="w-full bg-neutral-900 border border-white/15 rounded-xl p-3.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-cyan-400 transition-colors resize-none leading-relaxed"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-neutral-400 font-mono">
                {cooldown > 0 ? `Vui lòng đợi ${cooldown}s để gửi tiếp...` : 'Phản hồi sẽ được xem xét trong 24h'}
              </span>

              <button
                type="submit"
                disabled={isSubmitting || cooldown > 0}
                className="bg-white text-neutral-900 font-semibold px-6 py-3 rounded-xl hover:scale-105 active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-xs"
              >
                <Send className="w-4 h-4 text-neutral-900" />
                <span>
                  {isSubmitting ? 'Đang gửi ý kiến...' : 'Gửi ý kiến đóng góp'}
                </span>
              </button>
            </div>
          </form>
        </div>

      </div>
    </section>
  );
};
