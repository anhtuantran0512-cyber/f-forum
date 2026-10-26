import React, { useState } from 'react';
import { Send, BookOpen, Compass, HelpCircle, Trophy, CheckCircle2 } from 'lucide-react';
import type { DimensionView } from '../types';

interface TheColophonProps {
  onNavigate: (view: DimensionView) => void;
  onOpenAbout?: () => void;
}

export const TheColophon: React.FC<TheColophonProps> = ({ onNavigate, onOpenAbout }) => {
  const [feedback, setFeedback] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedback.trim()) return;
    setSent(true);
    setFeedback('');
    setTimeout(() => setSent(false), 3000);
  };

  return (
    <footer className="broadsheet-colophon w-full mt-20 border-t-[3px] border-double border-[var(--border-grid)] bg-[var(--bg-parchment)] text-[var(--ink-primary)] select-none">
      <div className="w-full border-b-[1.5px] border-[var(--border-grid)] px-4 sm:px-8 py-6 bg-[var(--bg-paper)]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3 text-center md:text-left">
            <span className="brutalist-stamp">Châm ngôn</span>
            <p className="text-sm sm:text-base font-serif italic text-[var(--ink-primary)] max-w-xl">
              "Tri thức không phải là chiếc bình cần đổ đầy, mà là ngọn lửa cần được thắp sáng."
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex items-center gap-2 w-full md:w-auto max-w-md">
            <input
              type="text"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Ý kiến đóng góp..."
              className="flex-1 px-3 py-2 text-xs font-mono bg-[var(--bg-paper)] border-[1.5px] border-[var(--border-grid)] rounded-[4px] text-[var(--ink-primary)] placeholder:text-[var(--ink-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--ink-primary)]"
            />
            <button
              type="submit"
              className="tactile-brutal-btn px-4 py-2 bg-[var(--accent-terracotta)] text-white font-mono text-xs font-bold rounded-[4px] flex items-center gap-1.5 cursor-pointer"
            >
              {sent ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Send className="w-3.5 h-3.5" />}
              <span>{sent ? 'Đã gửi' : 'Gửi ý kiến'}</span>
            </button>
          </form>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-[var(--accent-terracotta)] tracking-wider uppercase">01 // TÔN CHỈ</span>
          </div>
          <h4 className="text-base font-serif font-bold text-[var(--ink-primary)]">Học Thuật Mở</h4>
          <p className="text-xs text-[var(--ink-secondary)] leading-relaxed">
            F-Forum kiến tạo không gian đối thoại học thuật nghiêm túc, đề cao lập luận bản chất và tinh thần đồng học giữa học sinh, sinh viên toàn quốc.
          </p>
          <div className="pt-1">
            <span className="font-mono text-[10px] text-[var(--ink-muted)]">PHÁT HÀNH 2026 // SWISS GRID</span>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-[var(--accent-terracotta)] tracking-wider uppercase">02 // ĐIỀU HƯỚNG</span>
          </div>
          <h4 className="text-base font-serif font-bold text-[var(--ink-primary)]">Phân Khu Trọng Tâm</h4>
          <ul className="space-y-2 text-xs font-mono text-[var(--ink-secondary)]">
            <li>
              <button
                type="button"
                onClick={() => onNavigate('qa')}
                className="hover:text-[var(--accent-terracotta)] transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <HelpCircle className="w-3 h-3 text-[var(--accent-forest)]" />
                <span>Sàn Hỏi Đáp</span>
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => onNavigate('exam-vault')}
                className="hover:text-[var(--accent-terracotta)] transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <BookOpen className="w-3 h-3 text-[var(--accent-mustard)]" />
                <span>Kho Đề Thi</span>
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => onNavigate('clubs')}
                className="hover:text-[var(--accent-terracotta)] transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Compass className="w-3 h-3 text-[var(--accent-cobalt)]" />
                <span>Câu Lạc Bộ</span>
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => onNavigate('chronicles')}
                className="hover:text-[var(--accent-terracotta)] transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Trophy className="w-3 h-3 text-[var(--accent-terracotta)]" />
                <span>Khu Vinh Danh</span>
              </button>
            </li>
          </ul>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-[var(--accent-terracotta)] tracking-wider uppercase">03 // CHUẨN MỰC</span>
          </div>
          <h4 className="text-base font-serif font-bold text-[var(--ink-primary)]">Liêm Chính Khoa Học</h4>
          <ul className="space-y-1.5 text-xs text-[var(--ink-secondary)]">
            <li className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-forest)] inline-block shrink-0" />
              <span>Chuẩn hóa GDPT 2018</span>
            </li>
            <li className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-forest)] inline-block shrink-0" />
              <span>Lời giải kèm bước lập luận</span>
            </li>
            <li className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-forest)] inline-block shrink-0" />
              <span>Phòng thi trắc nghiệm CBT</span>
            </li>
            <li className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-forest)] inline-block shrink-0" />
              <span>Chống đạo văn và sao chép</span>
            </li>
          </ul>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-[var(--accent-terracotta)] tracking-wider uppercase">04 // KẾT NỐI</span>
          </div>
          <h4 className="text-base font-serif font-bold text-[var(--ink-primary)]">Ấn Phẩm &amp; Bản Tin</h4>
          <p className="text-xs text-[var(--ink-secondary)] leading-relaxed">
            Nhận tin điểm thi học kỳ, các đề án nghiên cứu khoa học học sinh và lịch giao lưu trực tuyến.
          </p>
          {onOpenAbout && (
            <button
              type="button"
              onClick={onOpenAbout}
              className="tactile-brutal-btn px-3 py-1.5 bg-[var(--bg-paper)] border-[1.5px] border-[var(--border-grid)] text-xs font-mono font-bold rounded-[4px] cursor-pointer"
            >
              <span>Về diễn đàn</span>
            </button>
          )}
        </div>
      </div>

      <div className="w-full border-t-[1.5px] border-[var(--border-grid)] py-8 px-4 sm:px-8 bg-[var(--bg-paper)] overflow-hidden">
        <div className="max-w-7xl mx-auto flex flex-col items-center justify-center">
          <h2 className="text-[clamp(3.5rem,13vw,10.5rem)] font-black tracking-tighter leading-none text-[var(--ink-primary)] select-none text-center">
            F-FORUM
          </h2>
          <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-2 pt-4 border-t border-[var(--border-grid)]/20 font-mono text-[10px] text-[var(--ink-muted)]">
            <span>ARCHIVE &amp; ACADEMIC COMMUNITY // EST. 2026</span>
            <span>WARM EDITORIAL + SOFT NEO-BRUTALISM + SWISS GRID</span>
            <span>TẤT CẢ BẢN QUYỀN ĐƯỢC BẢO LƯU</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
