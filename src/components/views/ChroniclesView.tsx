/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Send,
} from 'lucide-react';
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

  return (
    <section className={`relative w-full ${isEmbedded ? 'min-h-[850px]' : 'min-h-screen'} flex flex-col pt-20 sm:pt-24 pb-16 px-4 sm:px-8 bg-[var(--bg-paper)] text-[var(--ink-primary)]`}>
      {/* Main Container */}
      <div className="relative z-10 w-full max-w-5xl mx-auto flex-1 flex flex-col space-y-8 pb-16">
        
        {/* Header */}
        <div className="flex items-center justify-between gap-4 pb-3 border-b-[3px] border-double border-[var(--border-grid)] shrink-0">
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[var(--ink-primary)] flex items-center gap-2.5 flex-wrap">
            <BookOpen className="w-5 h-5 text-[var(--accent-terracotta)]" />
            <span>Về Chúng Tôi</span>
          </h1>
          <span className="brutalist-stamp">TÀI LIỆU // LƯU TRỮ</span>
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
        <div className="p-6 sm:p-8 bg-[var(--bg-parchment)] border-[1.5px] border-[var(--border-grid)] rounded-[6px] shadow-[var(--shadow-brutal)]">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-4 pb-3 border-b border-[var(--border-grid)]/20">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded border border-[var(--border-grid)] bg-[var(--accent-mustard)] flex items-center justify-center text-[#12100F] font-bold">
                <Send className="w-4 h-4 text-[#12100F]" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-base text-[var(--ink-primary)]">
                  Góp ý &amp; Phản hồi
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono">
              <a
                href="https://www.facebook.com/TuanNotTun/"
                target="_blank"
                rel="noopener noreferrer"
                className="tactile-brutal-btn px-3 py-1.5 rounded-[4px] bg-[var(--bg-paper)] border border-[var(--border-grid)] text-[var(--ink-primary)] font-bold transition-colors"
              >
                Facebook
              </a>
              <a
                href="https://discord.gg/GMDCnxxJwX"
                target="_blank"
                rel="noopener noreferrer"
                className="tactile-brutal-btn px-3 py-1.5 rounded-[4px] bg-[var(--bg-paper)] border border-[var(--border-grid)] text-[var(--ink-primary)] font-bold transition-colors"
              >
                Discord
              </a>
            </div>
          </div>

          {formError && (
            <div className="my-3 p-3 rounded bg-red-100 dark:bg-red-950/40 border border-red-400 dark:border-red-800 text-xs text-red-800 dark:text-red-200 font-mono">
              {formError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label htmlFor="f-1-ho-va-ten-nguoi-gui" className="block text-xs font-mono font-bold text-[var(--ink-primary)] mb-1.5 uppercase">
                  Họ tên <span className="text-red-500">*</span>
                </label>
                <input id="f-1-ho-va-ten-nguoi-gui"
                  type="text"
                  required
                  maxLength={80}
                  value={name}
                  onChange={e => setUserNameInput(e.target.value)}
                  placeholder="Nhập họ tên..."
                  className="w-full bg-[var(--bg-paper)] border-[1.5px] border-[var(--border-grid)] rounded-[4px] px-3.5 py-2 text-xs text-[var(--ink-primary)] placeholder:text-[var(--ink-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--ink-primary)]"
                />
              </div>

              <div>
                <label htmlFor="f-2-email-lien-he" className="block text-xs font-mono font-bold text-[var(--ink-primary)] mb-1.5 uppercase">
                  Email <span className="text-red-500">*</span>
                </label>
                <input id="f-2-email-lien-he"
                  type="email"
                  required
                  maxLength={120}
                  value={email}
                  onChange={e => setUserEmailInput(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-[var(--bg-paper)] border-[1.5px] border-[var(--border-grid)] rounded-[4px] px-3.5 py-2 text-xs text-[var(--ink-primary)] placeholder:text-[var(--ink-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--ink-primary)]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono font-bold text-[var(--ink-primary)] mb-1.5 uppercase">
                Phân loại <span className="text-red-500">*</span>
              </label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full bg-[var(--bg-paper)] border-[1.5px] border-[var(--border-grid)] rounded-[4px] px-3.5 py-2 text-xs text-[var(--ink-primary)] focus:outline-none cursor-pointer font-mono"
              >
                <option value="Báo lỗi giao diện">Báo lỗi giao diện</option>
                <option value="Đề xuất tính năng">Đề xuất tính năng</option>
                <option value="Khiếu nại nội dung">Khiếu nại nội dung</option>
                <option value="Góp ý khác">Góp ý khác</option>
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="f-4-noi-dung-chi-tiet-toi-thieu-20" className="text-xs font-mono font-bold text-[var(--ink-primary)] uppercase">
                  Nội dung <span className="text-red-500">*</span>
                </label>
                <span className="text-[10px] font-mono text-[var(--ink-muted)]">
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
                className="w-full bg-[var(--bg-paper)] border-[1.5px] border-[var(--border-grid)] rounded-[4px] p-3 text-xs text-[var(--ink-primary)] placeholder:text-[var(--ink-muted)] focus:outline-none resize-none leading-relaxed font-sans"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-[var(--ink-muted)] font-mono">
                {cooldown > 0 ? `Chờ ${cooldown}s...` : ''}
              </span>

              <button
                type="submit"
                disabled={isSubmitting || cooldown > 0}
                className="tactile-brutal-btn bg-[var(--accent-terracotta)] text-white font-mono font-bold px-5 py-2 rounded-[4px] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-xs"
              >
                <Send className="w-3.5 h-3.5" />
                <span>
                  {isSubmitting ? 'Đang gửi...' : 'Gửi ý kiến đóng góp'}
                </span>
              </button>
            </div>
          </form>
        </div>

      </div>
    </section>
  );
};
