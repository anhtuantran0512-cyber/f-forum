/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Send,
} from 'lucide-react';
import { handleVideoError } from '../../utils/mediaFallback';
import { LIGHT_TUNNEL_VIDEO_URL, toWebmVideoUrl } from '../../utils/chatVideos';
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
      setCooldown(5);
    }, 400);
  };

  const webmUrl = toWebmVideoUrl(LIGHT_TUNNEL_VIDEO_URL);

  return (
    <section className={`relative w-full ${isEmbedded ? 'min-h-[850px]' : 'min-h-screen'} flex flex-col pt-20 sm:pt-24 pb-16 px-4 sm:px-8`}>
      {/* Background Cosmic Atmosphere Video Engine (WebM + 18fps + soft blur optimization) */}
      <div className="ff-video-bg absolute inset-0 z-0 pointer-events-none overflow-hidden bg-neutral-950">
        <video
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          onError={(e) => handleVideoError(e, LIGHT_TUNNEL_VIDEO_URL)}
          onLoadedMetadata={(e) => {
            e.currentTarget.playbackRate = 0.72;
          }}
          className={`w-full h-full object-cover scale-[1.05] ${webmUrl ? '' : 'blur-[3px]'} opacity-45`}
        >
          {webmUrl ? <source src={webmUrl} type="video/webm" /> : null}
          <source src={LIGHT_TUNNEL_VIDEO_URL} type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-[#0b0d12]/88" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-[#151a26]/80 via-[#0b0d12]/90 to-[#0b0d12]" />
        <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-[#e07a5f]/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-[#81b29a]/10 rounded-full blur-[140px] pointer-events-none" />
      </div>

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-5xl mx-auto flex-1 flex flex-col space-y-8 pb-16">
        
        {/* Header */}
        <div className="flex items-center justify-between gap-4 pb-3 border-b border-dashed border-[#f4f1de]/15 shrink-0">
          <h1 className="ff-typo-poster !text-xl sm:!text-2xl text-[#f4f1de] flex items-center gap-2.5 flex-wrap">
            <BookOpen className="w-5 h-5 text-[#f2cc8f]" />
            <span>Về Chúng Tôi</span>
          </h1>
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
        <div className="ff-bento-cell !p-6 sm:!p-8 liquid-glass">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#e07a5f]/20 border border-[#e07a5f]/45 flex items-center justify-center text-[#f2cc8f]">
                <Send className="w-4 h-4 text-[#f2cc8f]" />
              </div>
              <div>
                <h3 className="font-bold text-sm sm:text-base text-[#f4f1de]">
                  Góp ý &amp; Phản hồi
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono text-[#9a978e]">
              <a
                href="https://www.facebook.com/TuanNotTun/"
                target="_blank"
                rel="noopener noreferrer"
                className="ff-tactile-btn px-3 py-1.5 rounded-lg bg-[#0b0d12] hover:bg-white/[0.08] border border-[#f4f1de]/18 text-[#f4f1de] font-bold transition-colors"
              >
                Facebook
              </a>
              <a
                href="https://discord.gg/GMDCnxxJwX"
                target="_blank"
                rel="noopener noreferrer"
                className="ff-tactile-btn px-3 py-1.5 rounded-lg bg-[#0b0d12] hover:bg-white/[0.08] border border-[#f4f1de]/18 text-[#f4f1de] font-bold transition-colors"
              >
                Discord
              </a>
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
                <label htmlFor="f-1-ho-va-ten-nguoi-gui" className="block text-xs font-semibold text-[#f4f1de] mb-1.5">
                  Họ tên <span className="text-red-400">*</span>
                </label>
                <input id="f-1-ho-va-ten-nguoi-gui"
                  type="text"
                  required
                  maxLength={80}
                  value={name}
                  onChange={e => setUserNameInput(e.target.value)}
                  placeholder="Nhập họ tên..."
                  className="w-full bg-[#0b0d12] border border-[#f4f1de]/18 rounded-xl px-3.5 py-2.5 text-xs text-[#f4f1de] placeholder-[#84817a] focus:outline-none focus:border-[#f2cc8f] transition-colors"
                />
              </div>

              <div>
                <label htmlFor="f-2-email-lien-he" className="block text-xs font-semibold text-[#f4f1de] mb-1.5">
                  Email <span className="text-red-400">*</span>
                </label>
                <input id="f-2-email-lien-he"
                  type="email"
                  required
                  maxLength={120}
                  value={email}
                  onChange={e => setUserEmailInput(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-[#0b0d12] border border-[#f4f1de]/18 rounded-xl px-3.5 py-2.5 text-xs text-[#f4f1de] placeholder-[#84817a] focus:outline-none focus:border-[#f2cc8f] transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#f4f1de] mb-1.5">
                Phân loại <span className="text-red-400">*</span>
              </label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full bg-[#0b0d12] border border-[#f4f1de]/18 rounded-xl px-3.5 py-2.5 text-xs text-[#f4f1de] focus:outline-none focus:border-[#f2cc8f] transition-colors cursor-pointer"
              >
                <option value="Báo lỗi giao diện" className="bg-[#0b0d12] text-[#f4f1de]">Báo lỗi giao diện</option>
                <option value="Đề xuất tính năng" className="bg-[#0b0d12] text-[#f4f1de]">Đề xuất tính năng</option>
                <option value="Khiếu nại nội dung" className="bg-[#0b0d12] text-[#f4f1de]">Khiếu nại nội dung</option>
                <option value="Góp ý khác" className="bg-[#0b0d12] text-[#f4f1de]">Góp ý khác</option>
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="f-4-noi-dung-chi-tiet-toi-thieu-20" className="text-xs font-semibold text-[#f4f1de]">
                  Nội dung <span className="text-red-400">*</span>
                </label>
                <span className="text-[10px] font-mono text-[#9a978e]">
                  {content.length}/1000
                </span>
              </div>
              <textarea id="f-4-noi-dung-chi-tiet-toi-thieu-20"
                required
                rows={4}
                maxLength={1000}
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="Nhập nội dung góp ý..."
                className="w-full bg-[#0b0d12] border border-[#f4f1de]/18 rounded-xl p-3.5 text-xs text-[#f4f1de] placeholder-[#84817a] focus:outline-none focus:border-[#f2cc8f] transition-colors resize-none leading-relaxed"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-[#9a978e] font-mono">
                {cooldown > 0 ? `Chờ ${cooldown}s...` : ''}
              </span>

              {/* Gửi ý kiến đóng góp */}
              <button
                type="submit"
                disabled={isSubmitting || cooldown > 0}
                className="ff-tactile-btn bg-[#f4f1de] hover:bg-[#f2cc8f] text-[#0b0d12] border-2 border-[#0b0d12] font-extrabold px-6 py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-xs"
              >
                <Send className="w-4 h-4 text-[#e07a5f]" />
                <span>
                  {isSubmitting ? 'Đang gửi...' : 'Gửi góp ý'}
                </span>
              </button>
            </div>
          </form>
        </div>

      </div>
    </section>
  );
};
