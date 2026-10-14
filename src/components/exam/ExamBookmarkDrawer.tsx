/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React, { useState, useMemo } from 'react';
import {
  X,
  Bookmark,
  Search,
  Trash2,
  Timer,
  Eye,
  Printer,
  School,
  Star,
  HardDrive,
} from 'lucide-react';
import type { ExamPaper } from '../../types';

export interface ExamBookmarkDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  savedExamIds: string[];
  allPapers: ExamPaper[];
  cachedExamIds?: string[];
  onRemoveBookmark: (examId: string) => void;
  onClearAllBookmarks: () => void;
  onSelectPreview: (paper: ExamPaper) => void;
  onStartCBT: (paper: ExamPaper) => void;
  onOpenPrint: (paper: ExamPaper) => void;
}

export const ExamBookmarkDrawer: React.FC<ExamBookmarkDrawerProps> = ({
  isOpen,
  onClose,
  savedExamIds,
  allPapers,
  cachedExamIds,
  onRemoveBookmark,
  onClearAllBookmarks,
  onSelectPreview,
  onStartCBT,
  onOpenPrint,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('Tất cả');

  /* Lấy danh sách đề thi đã lưu đầy đủ thông tin */
  const savedPapers = useMemo(() => {
    return allPapers.filter((p) => savedExamIds.includes(p.id));
  }, [allPapers, savedExamIds]);

  /* Lọc theo từ khoá và môn học */
  const filteredSavedPapers = useMemo(() => {
    return savedPapers.filter((p) => {
      const matchSearch =
        !searchTerm.trim() ||
        p.title.toLowerCase().includes(searchTerm.toLowerCase().trim()) ||
        p.school.toLowerCase().includes(searchTerm.toLowerCase().trim()) ||
        p.subject.toLowerCase().includes(searchTerm.toLowerCase().trim());
      const matchSub = selectedSubject === 'Tất cả' || p.subject === selectedSubject;
      return matchSearch && matchSub;
    });
  }, [savedPapers, searchTerm, selectedSubject]);

  /* Danh sách các môn có trong đề đã lưu */
  const subjectList = useMemo(() => {
    const set = new Set<string>();
    savedPapers.forEach((p) => set.add(p.subject));
    return ['Tất cả', ...Array.from(set)];
  }, [savedPapers]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="bookmark-drawer-title"
      className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm animate-fade-in select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md h-full ff-exam-modal flex flex-col justify-between p-4 sm:p-6 shadow-[-20px_0_60px_rgba(0,0,0,0.85)] border-l border-white/15 animate-slide-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ======================================================== */}
        {/* 1. DRAWER HEADER                                         */}
        {/* ======================================================== */}
        <div className="pb-3 border-b border-white/10 shrink-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-amber-400/20 text-amber-300 border border-amber-400/30">
                <Bookmark className="w-4 h-4 fill-amber-400" />
              </div>
              <div>
                <h2 id="bookmark-drawer-title" className="text-base font-extrabold text-white flex items-center gap-2">
                  <span>Đề Thi Đã Lưu</span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-400 text-[#0b0d12] font-black">
                    {savedPapers.length}
                  </span>
                </h2>
                <span className="text-[10px] text-white/50">Kho lưu trữ cá nhân để ôn tập lại sau</span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-neutral-400 hover:text-white bg-white/5 hover:bg-white/10 cursor-pointer"
              aria-label="Đóng ngăn kéo"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search inside Bookmarks */}
          {savedPapers.length > 0 && (
            <div className="space-y-2 mt-3">
              <div className="relative flex items-center w-full">
                <Search className="w-4 h-4 text-white/40 absolute left-3 pointer-events-none" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Tìm trong danh sách đã lưu..."
                  className="w-full ff-exam-input rounded-xl pl-9 pr-8 py-2 text-xs placeholder-white/35 focus:outline-none"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2.5 text-white/40 hover:text-white cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Subject quick filters */}
              {subjectList.length > 2 && (
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                  {subjectList.map((sub) => (
                    <button
                      key={sub}
                      type="button"
                      onClick={() => setSelectedSubject(sub)}
                      className={`px-2.5 py-0.5 rounded-lg text-[10px] font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                        selectedSubject === sub
                          ? 'bg-amber-400 text-[#0b0d12]'
                          : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      {sub}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ======================================================== */}
        {/* 2. DRAWER BODY: LIST OF BOOKMARKED EXAMS                 */}
        {/* ======================================================== */}
        <div className="flex-1 overflow-y-auto no-scrollbar py-3 space-y-3">
          {savedPapers.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/30">
                <Bookmark className="w-7 h-7" />
              </div>
              <h3 className="text-sm font-bold text-white">Chưa có đề thi nào được lưu</h3>
              <p className="text-xs text-white/50 leading-relaxed max-w-xs">
                Khi tra cứu đề thi, bạn bấm biểu tượng Bookmark trên góc mỗi thẻ đề để đưa vào danh sách này và luyện tập lại sau nhé!
              </p>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-[#0b0d12] text-xs font-bold transition-colors cursor-pointer mt-2"
              >
                Khám phá kho đề thi ngay
              </button>
            </div>
          ) : filteredSavedPapers.length === 0 ? (
            <div className="p-8 text-center text-xs text-white/40">
              Không tìm thấy đề thi phù hợp với từ khoá tìm kiếm trong mục đã lưu.
            </div>
          ) : (
            filteredSavedPapers.map((paper) => (
              <div
                key={paper.id}
                className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-amber-400/30 transition-all duration-200 space-y-2 group"
              >
                {/* Badges row */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-400/15 text-amber-300 border border-amber-400/25">
                      {paper.subject}
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-white/10 text-white/80">
                      Lớp {paper.grade}
                    </span>
                    <span className="px-1.5 py-0.5 rounded-md text-[10px] text-white/50">
                      {paper.examType}
                    </span>
                    {cachedExamIds?.includes(paper.id) && (
                      <span className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold ff-cached-pill flex items-center gap-1">
                        <HardDrive className="w-2.5 h-2.5" /> Offline
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => onRemoveBookmark(paper.id)}
                    className="p-1 rounded-lg text-white/40 hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer transition-colors"
                    title="Bỏ lưu đề thi này"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Title */}
                <h4
                  onClick={() => onSelectPreview(paper)}
                  className="text-xs font-bold text-white group-hover:text-amber-200 cursor-pointer line-clamp-2 leading-snug"
                >
                  {paper.title}
                </h4>

                {/* Meta info */}
                <div className="flex items-center gap-2 text-[10px] text-white/50">
                  <span className="flex items-center gap-1 truncate max-w-[150px]">
                    <School className="w-3 h-3 text-amber-400/80 shrink-0" /> {paper.school}
                  </span>
                  <span>·</span>
                  <span>{paper.schoolYear}</span>
                  {paper.rating && (
                    <>
                      <span>·</span>
                      <span className="flex items-center gap-0.5 text-amber-300 font-semibold">
                        <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                        <span>{paper.rating}</span>
                      </span>
                    </>
                  )}
                </div>

                {/* Quick actions buttons */}
                <div className="flex items-center justify-between pt-2 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => onSelectPreview(paper)}
                    className="text-[11px] text-white/60 hover:text-white flex items-center gap-1 cursor-pointer"
                  >
                    <Eye className="w-3 h-3" /> Xem nhanh
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onOpenPrint(paper)}
                      className="p-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white cursor-pointer"
                      title="Tuỳ chọn in ấn &amp; PDF"
                    >
                      <Printer className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onStartCBT(paper)}
                      className="px-2.5 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-[#0b0d12] text-[11px] font-extrabold flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Timer className="w-3 h-3" /> Thi thử CBT
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* ======================================================== */}
        {/* 3. DRAWER FOOTER                                         */}
        {/* ======================================================== */}
        {savedPapers.length > 0 && (
          <div className="pt-3 border-t border-white/10 flex items-center justify-between shrink-0 text-xs">
            <span className="text-white/50">
              Tổng số: <strong className="text-amber-300">{savedPapers.length}</strong> đề đã lưu
            </span>
            <button
              type="button"
              onClick={onClearAllBookmarks}
              className="text-rose-400 hover:text-rose-300 hover:underline flex items-center gap-1 cursor-pointer text-[11px]"
            >
              <Trash2 className="w-3 h-3" /> Xoá tất cả
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExamBookmarkDrawer;
