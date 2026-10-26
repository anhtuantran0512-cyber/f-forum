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
    <footer className="broadsheet-colophon w-full mt-20 border-t-[3px] border-double border-[#2C2623] bg-[#F2ECE1] text-[#2C2623] select-none">
      <div className="w-full border-b-[1.5px] border-[#2C2623] px-4 sm:px-8 py-6 bg-[#FAF7F2]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3 text-center md:text-left">
            <span className="brutalist-stamp">Châm ngôn</span>
            <p className="text-sm sm:text-base font-serif italic text-[#2C2623] max-w-xl">
              "Tri thức không phải là chiếc bình cần đổ đầy, mà là ngọn lửa cần được thắp sáng."
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex items-center gap-2 w-full md:w-auto max-w-md">
            <input
              type="text"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Ý kiến đóng góp..."
              className="flex-1 px-3 py-2 text-xs font-mono bg-[#FAF7F2] border-[1.5px] border-[#2C2623] rounded-[4px] text-[#2C2623] placeholder:text-[#8C827A] focus:outline-none focus:ring-1 focus:ring-[#2C2623]"
            />
            <button
              type="submit"
              className="tactile-brutal-btn px-4 py-2 bg-[#D95D39] text-[#FAF7F2] font-mono text-xs font-bold rounded-[4px] flex items-center gap-1.5 cursor-pointer"
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
            <span className="font-mono text-xs font-bold text-[#D95D39] tracking-wider uppercase">01 // TÔN CHỈ</span>
          </div>
          <h4 className="text-base font-serif font-bold text-[#2C2623]">Học Thuật Mở</h4>
          <p className="text-xs text-[#5C534E] leading-relaxed">
            F-Forum kiến tạo không gian đối thoại học thuật nghiêm túc, đề cao lập luận bản chất và tinh thần đồng học giữa học sinh, sinh viên toàn quốc.
          </p>
          <div className="pt-1">
            <span className="font-mono text-[10px] text-[#8C827A]">PHÁT HÀNH 2026 // SWISS GRID</span>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-[#D95D39] tracking-wider uppercase">02 // ĐIỀU HƯỚNG</span>
          </div>
          <h4 className="text-base font-serif font-bold text-[#2C2623]">Phân Khu Trọng Tâm</h4>
          <ul className="space-y-2 text-xs font-mono text-[#5C534E]">
            <li>
              <button
                type="button"
                onClick={() => onNavigate('qa')}
                className="hover:text-[#D95D39] transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <HelpCircle className="w-3 h-3 text-[#2E5A44]" />
                <span>Sàn Hỏi Đáp</span>
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => onNavigate('exam-vault')}
                className="hover:text-[#D95D39] transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <BookOpen className="w-3 h-3 text-[#E6AA28]" />
                <span>Kho Đề Thi</span>
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => onNavigate('clubs')}
                className="hover:text-[#D95D39] transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Compass className="w-3 h-3 text-[#2B4C7E]" />
                <span>Câu Lạc Bộ</span>
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => onNavigate('chronicles')}
                className="hover:text-[#D95D39] transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Trophy className="w-3 h-3 text-[#D95D39]" />
                <span>Khu Vinh Danh</span>
              </button>
            </li>
          </ul>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-[#D95D39] tracking-wider uppercase">03 // CHUẨN MỰC</span>
          </div>
          <h4 className="text-base font-serif font-bold text-[#2C2623]">Liêm Chính Khoa Học</h4>
          <ul className="space-y-1.5 text-xs text-[#5C534E]">
            <li className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2E5A44] inline-block shrink-0" />
              <span>Chuẩn hóa GDPT 2018</span>
            </li>
            <li className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2E5A44] inline-block shrink-0" />
              <span>Lời giải kèm bước lập luận</span>
            </li>
            <li className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2E5A44] inline-block shrink-0" />
              <span>Phòng thi trắc nghiệm CBT</span>
            </li>
            <li className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2E5A44] inline-block shrink-0" />
              <span>Chống đạo văn và sao chép</span>
            </li>
          </ul>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-[#D95D39] tracking-wider uppercase">04 // KẾT NỐI</span>
          </div>
          <h4 className="text-base font-serif font-bold text-[#2C2623]">Ấn Phẩm &amp; Bản Tin</h4>
          <p className="text-xs text-[#5C534E] leading-relaxed">
            Nhận tin điểm thi học kỳ, các đề án nghiên cứu khoa học học sinh và lịch giao lưu trực tuyến.
          </p>
          {onOpenAbout && (
            <button
              type="button"
              onClick={onOpenAbout}
              className="tactile-brutal-btn px-3 py-1.5 bg-[#FAF7F2] border-[1.5px] border-[#2C2623] text-xs font-mono font-bold rounded-[4px] cursor-pointer"
            >
              <span>Về diễn đàn</span>
            </button>
          )}
        </div>
      </div>

      <div className="w-full border-t-[1.5px] border-[#2C2623] py-8 px-4 sm:px-8 bg-[#FAF7F2] overflow-hidden">
        <div className="max-w-7xl mx-auto flex flex-col items-center justify-center">
          <h2 className="text-[clamp(3.5rem,13vw,10.5rem)] font-black tracking-tighter leading-none text-[#2C2623] select-none text-center">
            F-FORUM
          </h2>
          <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-2 pt-4 border-t border-[#2C2623]/20 font-mono text-[10px] text-[#8C827A]">
            <span>ARCHIVE &amp; ACADEMIC COMMUNITY // EST. 2026</span>
            <span>WARM EDITORIAL + SOFT NEO-BRUTALISM + SWISS GRID</span>
            <span>TẤT CẢ BẢN QUYỀN ĐƯỢC BẢO LƯU</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
