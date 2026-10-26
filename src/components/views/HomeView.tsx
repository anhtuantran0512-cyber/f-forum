import React, { useState, useEffect } from 'react';
import { ArrowRight, ArrowUpRight, Compass, HelpCircle, BookOpen, PenLine, Flame, TrendingUp } from 'lucide-react';
import type { DimensionView } from '../../types';
import { BoomerangVideoBg } from '../BoomerangVideoBg';
import './HomeHeroTitle.css';

interface HomeViewProps {
  onNavigate: (view: DimensionView) => void;
  onOpenLanding?: () => void;
  totalClubs?: number;
  totalQuestions?: number;
  solvedQuestionsCount?: number;
  onlineCount?: number;
  onlineUsersCount?: number;
  resolvedQuestionsCount?: number;
  totalClubsCount?: number;
  chatMessagesTodayCount?: number;
  streakCount?: number;
  onOpenDaily?: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  onNavigate,
  onOpenLanding,
  totalQuestions = 1420,
  solvedQuestionsCount = 1180,
  onlineUsersCount = 248,
}) => {
  const [headlinePhase, setHeadlinePhase] = useState<0 | 1>(0);

  useEffect(() => {
    const duration = 7500;
    const timer = setTimeout(() => {
      setHeadlinePhase((prev) => (prev === 0 ? 1 : 0));
    }, duration);
    return () => clearTimeout(timer);
  }, [headlinePhase]);

  return (
    <section className="relative w-full min-h-screen overflow-y-auto overflow-x-hidden flex flex-col items-center justify-start py-8 sm:py-12 bg-[#FAF7F2] text-[#2C2623]">
      <BoomerangVideoBg />

      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 flex flex-col items-center pt-2 sm:pt-4">
        <header className="w-full border-b-[3px] border-double border-[#2C2623] pb-4 mb-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 text-xs font-mono uppercase text-[#8C827A] border-b border-[#2C2623]/20 pb-2">
            <span>SỐ PHÁT HÀNH ĐẶC BIỆT // MÙA THI 2026</span>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#2E5A44] animate-pulse" />
              <span>HỆ THỐNG TRỰC TUYẾN 24/7 // GDPT 2018</span>
            </div>
            <span>ẤN BẢN HỌC THUẬT QUỐC GIA</span>
          </div>

          <div className="pt-4 flex flex-col items-center text-center">
            <div className="relative min-h-[90px] sm:min-h-[110px] flex items-center justify-center w-full">
              <h1
                className={`text-3xl sm:text-5xl md:text-6xl font-serif text-[#2C2623] font-bold tracking-tight text-center leading-tight max-w-4xl flex flex-col items-center justify-center gap-y-1 ${
                  headlinePhase === 0
                    ? 'opacity-100 pointer-events-auto'
                    : 'opacity-0 pointer-events-none absolute inset-0'
                }`}
                style={{ transition: 'opacity 0.6s cubic-bezier(0.2, 0.8, 0.2, 1)' }}
              >
                <span className="flex flex-wrap items-baseline justify-center gap-x-3 gap-y-1">
                  <span>Diễn Đàn Học Sinh</span>{' '}
                  <span className="editorial-swash">
                    <span className="ff-swash-cap">F</span>-Forum
                  </span>
                </span>
                <span className="text-xs sm:text-base font-serif italic font-normal tracking-normal text-[#5C534E]">
                  Khởi nguồn lập luận bản chất và không gian đồng học toàn quốc
                </span>
              </h1>

              <h1
                className={`home-hero-title ${
                  headlinePhase === 1
                    ? 'opacity-100 pointer-events-auto'
                    : 'opacity-0 pointer-events-none absolute inset-0'
                }`}
                style={{
                  transition: 'opacity 0.7s cubic-bezier(0.22, 1, 0.36, 1)',
                }}
              >
                <span className="home-hero-title__top">
                  <svg className="home-hero-title__swash" viewBox="0 0 48 18" aria-hidden="true">
                    <path d="M2 14 C14 2, 28 2, 46 11" />
                  </svg>
                  <span>Nơi Khai Phóng</span>
                  <svg className="home-hero-title__swash home-hero-title__swash--right" viewBox="0 0 48 18" aria-hidden="true">
                    <path d="M2 14 C14 2, 28 2, 46 11" />
                  </svg>
                </span>
                <span className="home-hero-title__focus">
                  <span className="home-hero-title__word">Tiềm</span>{' '}
                  <span className="home-hero-title__word">Năng</span>
                  <svg className="home-hero-title__wave" viewBox="0 0 320 18" preserveAspectRatio="none" aria-hidden="true" focusable="false">
                    <path d="M1 10 C28 -1 52 -1 80 10 S132 21 160 10 S212 -1 240 10 S292 21 319 10" />
                  </svg>
                </span>
                <span className="home-hero-title__bottom"><i aria-hidden="true" />Tuổi Trẻ Việt Nam<i aria-hidden="true" /></span>
              </h1>
            </div>
          </div>
        </header>

        <div className="w-full grid grid-cols-1 lg:grid-cols-12 border-[1.5px] border-[#2C2623] bg-[#FAF7F2] shadow-[4px_4px_0px_#2C2623]">
          <div className="lg:col-span-7 p-6 sm:p-8 lg:border-r-[1.5px] lg:border-[#2C2623] flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="brutalist-stamp">BÀI VIẾT TIÊU BIỂU</span>
                <span className="font-mono text-xs text-[#8C827A] uppercase">CHUYÊN ĐỀ SỐ 12 // TOÁN 12 GDPT</span>
              </div>

              <div className="editorial-frame relative my-3">
                <img
                  src="/textures/planets/galaxy_starfield.png"
                  alt="Không gian học thuật"
                  loading="lazy"
                  className="w-full h-48 sm:h-64 object-cover"
                />
                <div className="absolute top-4 right-4 brutalist-stamp bg-[#E6AA28] text-[#2C2623]">
                  CHỌN LỌC
                </div>
              </div>

              <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#2C2623] leading-snug">
                Phương pháp giải bài toán thực tế cực trị hàm số bằng{' '}
                <span className="editorial-swash">Mô Hình Toán</span>
              </h2>

              <p className="editorial-dropcap-para text-xs sm:text-sm text-[#5C534E] leading-relaxed">
                Trong chương trình GDPT 2018, các bài toán tối ưu hóa chi phí sản xuất, thể tích bể chứa và quỹ đạo chuyển động đòi hỏi người học thấu suốt bản chất đạo hàm thay vì ghi nhớ công thức máy móc.
              </p>
            </div>

            <div className="pt-6 border-t border-[#2C2623]/20 mt-6 flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full border border-[#2C2623] bg-[#E6AA28] flex items-center justify-center font-serif font-bold text-xs">
                  T
                </div>
                <div className="text-[11px] font-mono">
                  <span className="font-bold block text-[#2C2623]">Thầy Minh Tuấn</span>
                  <span className="text-[#8C827A]">Tổ Toán F-Forum</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onNavigate('qa')}
                className="tactile-brutal-btn px-4 py-2 bg-[#D95D39] text-[#FAF7F2] font-mono text-xs font-bold rounded-[4px] flex items-center gap-2 cursor-pointer"
              >
                <span>Hỏi Bài Tập</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="lg:col-span-5 flex flex-col justify-between bg-[#F2ECE1]">
            <div className="p-5 sm:p-6 border-b-[1.5px] border-[#2C2623]">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-[#D95D39]" />
                  <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#2C2623]">CHỦ ĐỀ NÓNG</span>
                </div>
                <span className="font-mono text-[10px] text-[#8C827A]">THỜI GIAN THỰC</span>
              </div>

              <div className="space-y-4">
                <div
                  onClick={() => onNavigate('threads')}
                  className="group cursor-pointer flex items-start gap-3 p-2 rounded hover:bg-[#EBE3D5] transition-colors"
                >
                  <span className="swiss-numeral shrink-0">01</span>
                  <div>
                    <h3 className="text-xs sm:text-sm font-serif font-bold text-[#2C2623] group-hover:text-[#D95D39] transition-colors line-clamp-1">
                      Kinh nghiệm làm bài trắc nghiệm đúng/sai môn Toán 12
                    </h3>
                    <p className="text-[11px] text-[#5C534E] line-clamp-1 mt-0.5">
                      Phân tích 5 bẫy tâm lý thường gặp trong đề thi thử tốt nghiệp...
                    </p>
                  </div>
                </div>

                <div
                  onClick={() => onNavigate('qa')}
                  className="group cursor-pointer flex items-start gap-3 p-2 rounded hover:bg-[#EBE3D5] transition-colors"
                >
                  <span className="swiss-numeral shrink-0">02</span>
                  <div>
                    <h3 className="text-xs sm:text-sm font-serif font-bold text-[#2C2623] group-hover:text-[#D95D39] transition-colors line-clamp-1">
                      Giải bài tập cảm ứng điện từ bằng định luật Faraday
                    </h3>
                    <p className="text-[11px] text-[#5C534E] line-clamp-1 mt-0.5">
                      3 bước xác định chiều dòng điện cảm ứng không thể nhầm lẫn...
                    </p>
                  </div>
                </div>

                <div
                  onClick={() => onNavigate('exam-vault')}
                  className="group cursor-pointer flex items-start gap-3 p-2 rounded hover:bg-[#EBE3D5] transition-colors"
                >
                  <span className="swiss-numeral shrink-0">03</span>
                  <div>
                    <h3 className="text-xs sm:text-sm font-serif font-bold text-[#2C2623] group-hover:text-[#D95D39] transition-colors line-clamp-1">
                      Bộ đề kiểm tra giữa kỳ 1 Hóa học 11 có đáp án chi tiết
                    </h3>
                    <p className="text-[11px] text-[#5C534E] line-clamp-1 mt-0.5">
                      Tuyển tập 15 đề các trường THPT chuyên trên toàn quốc...
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-5 sm:p-6 border-b-[1.5px] border-[#2C2623] bg-[#FAF7F2]">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-[#2E5A44]" />
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#2C2623]">NHỊP ĐẬP DIỄN ĐÀN</span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center font-mono">
                <div className="p-2 border border-[#2C2623] bg-[#F2ECE1]">
                  <span className="block text-lg font-bold text-[#2C2623]">{totalQuestions}</span>
                  <span className="text-[10px] text-[#8C827A] uppercase">BÀI TOÁN</span>
                </div>
                <div className="p-2 border border-[#2C2623] bg-[#F2ECE1]">
                  <span className="block text-lg font-bold text-[#2E5A44]">{solvedQuestionsCount}</span>
                  <span className="text-[10px] text-[#8C827A] uppercase">ĐÃ GIẢI</span>
                </div>
                <div className="p-2 border border-[#2C2623] bg-[#F2ECE1]">
                  <span className="block text-lg font-bold text-[#D95D39]">{onlineUsersCount}</span>
                  <span className="text-[10px] text-[#8C827A] uppercase">ĐỒNG HỌC</span>
                </div>
              </div>
            </div>

            <div className="p-5 sm:p-6 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => onNavigate('clubs')}
                className="tactile-brutal-btn w-full py-2.5 px-4 bg-[#FAF7F2] border-[1.5px] border-[#2C2623] font-mono text-xs font-bold text-[#2C2623] rounded-[4px] flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Compass className="w-4 h-4 text-[#D95D39]" />
                  <span>Câu Lạc Bộ</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => onNavigate('exam-vault')}
                className="tactile-brutal-btn w-full py-2.5 px-4 bg-[#E6AA28] border-[1.5px] border-[#2C2623] font-mono text-xs font-bold text-[#2C2623] rounded-[4px] flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-[#2C2623]" />
                  <span>Kho Đề Thi</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        <div className="w-full mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4" aria-label="Ba nhịp Học, Hỏi, Chia sẻ">
          <div
            onClick={() => onNavigate('exam-vault')}
            className="ticket-card ff-atelier-card cursor-pointer hover:bg-[#F2ECE1] transition-colors"
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="font-mono text-xs font-bold text-[#D95D39] uppercase">[VÉ THI // 2026]</span>
              <BookOpen className="w-4 h-4 text-[#2C2623]" />
            </div>
            <h4 className="text-sm font-serif font-bold text-[#2C2623]">Phòng Thi Thử CBT</h4>
            <p className="text-xs text-[#5C534E] mt-1">Luyện đề chuẩn ma trận tốt nghiệp GDPT 2018 với đồng hồ cơ học.</p>
          </div>

          <div
            onClick={() => onNavigate('qa')}
            className="ticket-card ff-atelier-card cursor-pointer hover:bg-[#F2ECE1] transition-colors"
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="font-mono text-xs font-bold text-[#2E5A44] uppercase">[HỎI ĐÁP // BẢN CHẤT]</span>
              <HelpCircle className="w-4 h-4 text-[#2C2623]" />
            </div>
            <h4 className="text-sm font-serif font-bold text-[#2C2623]">Giải Bài Đa Ngành</h4>
            <p className="text-xs text-[#5C534E] mt-1">Soạn công thức toán lý hóa trực quan, đối chiếu từng bước lập luận.</p>
          </div>

          <div
            onClick={() => onNavigate('threads')}
            className="ticket-card ff-atelier-card cursor-pointer hover:bg-[#F2ECE1] transition-colors"
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="font-mono text-xs font-bold text-[#2B4C7E] uppercase">[SỔ CHUNG // BẠN HỌC]</span>
              <PenLine className="w-4 h-4 text-[#2C2623]" />
            </div>
            <h4 className="text-sm font-serif font-bold text-[#2C2623]">Góc Chia Sẻ Ý Tưởng</h4>
            <p className="text-xs text-[#5C534E] mt-1">Kinh nghiệm tự học, tài liệu chọn lọc và chuyên đề nghiên cứu.</p>
          </div>
        </div>

        {onOpenLanding && (
          <div className="mt-8 text-center">
            <button
              type="button"
              onClick={onOpenLanding}
              className="tactile-brutal-btn px-4 py-2 bg-[#FAF7F2] border-[1.5px] border-[#2C2623] rounded-[4px] font-mono text-xs font-bold text-[#2C2623] inline-flex items-center gap-1.5 cursor-pointer"
            >
              <span>Về dự án</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </section>
  );
};

export default HomeView;
