import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Heart,
  Bookmark,
  Send,
  PenLine,
  Compass,
} from 'lucide-react';
import type { User } from '../types';
import { playChime, playUiTick } from '../utils/audio';
import { safeStorage } from '../utils/storage';

export interface MemorialWallModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onOpenLoginModal?: () => void;
}

export type MemorialCategory =
  | 'all'
  | 'thpt-qg'
  | 'hsg-olympic'
  | 'ielts-sat'
  | 'chuyen-lop10';

interface MemorialNote {
  id: string;
  authorName: string;
  authorSchool: string;
  province: string;
  category: 'thpt-qg' | 'hsg-olympic' | 'ielts-sat' | 'chuyen-lop10';
  targetGoal: string;
  message: string;
  likes: number;
  isFlagged?: boolean;
  timestamp: string;
}

const INITIAL_MEMORIAL_NOTES: MemorialNote[] = [
  {
    id: 'memo-1',
    authorName: 'Hoàng Minh',
    authorSchool: 'THPT Chuyên Hà Nội - Amsterdam',
    province: 'Hà Nội',
    category: 'thpt-qg',
    targetGoal: 'Nguyện vọng 1: ĐH Ngoại Thương',
    message: 'Gửi chính tôi và các bạn 2k8: Đã đi được 99% chặng đường rồi, 1% còn lại là giữ vững sự điềm tĩnh và tự tin vào phòng thi!',
    likes: 42,
    timestamp: '10 phút trước',
  },
  {
    id: 'memo-2',
    authorName: 'Bảo Trâm',
    authorSchool: 'THPT Chuyên Lê Hồng Phong',
    province: 'TP. Hồ Chí Minh',
    category: 'ielts-sat',
    targetGoal: 'Mục tiêu: 8.0 IELTS & 1500 SAT',
    message: 'Những đêm thức trắng cùng Reading và Writing sẽ đổi lại một chân trời rộng mở. Chúc cả nhà vượt ải ngoạn mục!',
    likes: 38,
    timestamp: '25 phút trước',
  },
  {
    id: 'memo-3',
    authorName: 'Quốc Khánh',
    authorSchool: 'THPT Chuyên Phan Bội Châu',
    province: 'Nghệ An',
    category: 'hsg-olympic',
    targetGoal: 'Đội tuyển Quốc Gia môn Toán',
    message: 'Toán học không chỉ là những con số khô khan, nó là nghệ thuật của tư duy và lòng kiên định. Cùng nhau chạm đỉnh vinh quang!',
    likes: 56,
    timestamp: '1 giờ trước',
  },
  {
    id: 'memo-4',
    authorName: 'Phương Linh',
    authorSchool: 'THCS Giảng Võ',
    province: 'Hà Nội',
    category: 'chuyen-lop10',
    targetGoal: 'Mục tiêu: Chuyên Sư Phạm Hà Nội',
    message: 'Dành tặng các bạn sĩ tử thi vào 10: Hãy cứ cháy hết mình với từng bài tập, cánh cổng trường chuyên đang mở rộng chờ đón chúng ta.',
    likes: 29,
    timestamp: '2 giờ trước',
  },
  {
    id: 'memo-5',
    authorName: 'Thành An',
    authorSchool: 'THPT Chuyên Lê Quý Đôn',
    province: 'Đà Nẵng',
    category: 'thpt-qg',
    targetGoal: 'Thủ khoa Khối A00',
    message: 'Mỗi đề thi thử là một lần tôi luyện. Chúc 1 triệu sĩ tử mùa thi năm nay làm bài trên cả kỳ vọng!',
    likes: 67,
    timestamp: '3 giờ trước',
  },
];

const CATEGORY_TABS: { key: MemorialCategory; label: string }[] = [
  { key: 'all', label: 'Tất cả' },
  { key: 'thpt-qg', label: 'Kỳ thi THPT Quốc Gia' },
  { key: 'hsg-olympic', label: 'Học sinh giỏi & Olympic' },
  { key: 'ielts-sat', label: 'Sĩ tử IELTS / SAT' },
  { key: 'chuyen-lop10', label: 'Luyện thi Chuyên & Lớp 10' },
];

export const MemorialWallModal: React.FC<MemorialWallModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onOpenLoginModal,
}) => {
  const [activeCategory, setActiveCategory] = useState<MemorialCategory>('all');
  const [notes, setNotes] = useState<MemorialNote[]>(() => {
    const saved = safeStorage.getItem('fforum_memorial_notes_v1');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return INITIAL_MEMORIAL_NOTES;
      }
    }
    return INITIAL_MEMORIAL_NOTES;
  });

  const [likedIds, setLikedIds] = useState<Set<string>>(() => new Set());
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(() => new Set());
  const [isComposing, setIsComposing] = useState(false);
  const [authorName, setAuthorName] = useState(currentUser?.name || '');
  const [authorSchool, setAuthorSchool] = useState('');
  const [province, setProvince] = useState('Hà Nội');
  const [category, setCategory] = useState<'thpt-qg' | 'hsg-olympic' | 'ielts-sat' | 'chuyen-lop10'>('thpt-qg');
  const [targetGoal, setTargetGoal] = useState('');
  const [message, setMessage] = useState('');
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = setInterval(() => setCooldownSeconds((prev) => Math.max(0, prev - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  const filteredNotes = useMemo(() => {
    if (activeCategory === 'all') return notes;
    return notes.filter((n) => n.category === activeCategory);
  }, [notes, activeCategory]);

  const handleToggleLike = useCallback((id: string) => {
    playUiTick();
    setLikedIds((prev) => {
      const next = new Set(prev);
      const isCurrentlyLiked = next.has(id);
      if (isCurrentlyLiked) {
        next.delete(id);
      } else {
        next.add(id);
        playChime('xp');
      }
      setNotes((prevNotes) => {
        const updated = prevNotes.map((n) =>
          n.id === id ? { ...n, likes: Math.max(0, n.likes + (isCurrentlyLiked ? -1 : 1)) } : n
        );
        safeStorage.setItem('fforum_memorial_notes_v1', JSON.stringify(updated));
        return updated;
      });
      return next;
    });
  }, []);

  const handleTogglePin = useCallback((id: string) => {
    playUiTick();
    setPinnedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else {
        next.add(id);
        playChime('success');
      }
      return next;
    });
  }, []);

  const handleSubmitNote = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser && onOpenLoginModal) {
      onOpenLoginModal();
      return;
    }
    if (!message.trim() || cooldownSeconds > 0) return;

    playChime('level-up');
    const newNote: MemorialNote = {
      id: `memo-${Date.now()}`,
      authorName: authorName.trim() || currentUser?.name || 'Sĩ tử F-Forum',
      authorSchool: authorSchool.trim() || 'Học sinh',
      province: province.trim() || 'Toàn quốc',
      category,
      targetGoal: targetGoal.trim() || 'Đỗ nguyện vọng mơ ước',
      message: message.trim(),
      likes: 1,
      timestamp: 'Vừa xong',
    };

    setNotes((prev) => {
      const updated = [newNote, ...prev];
      safeStorage.setItem('fforum_memorial_notes_v1', JSON.stringify(updated));
      return updated;
    });

    setMessage('');
    setTargetGoal('');
    setIsComposing(false);
    setCooldownSeconds(30);
  }, [currentUser, onOpenLoginModal, message, cooldownSeconds, authorName, authorSchool, province, category, targetGoal]);

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Bức Tường Lưu Bút Mùa Thi"
      className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="card-hard w-full max-w-4xl bg-[#F7F3EA] border-2 border-[#2B2331] text-[#2B2331] rounded-2xl shadow-[6px_6px_0px_#2B2331] flex flex-col max-h-[92vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b-2 border-[#2B2331] bg-[#EFE8DA]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#E07A5F]/20 border-2 border-[#2B2331] flex items-center justify-center text-[#E07A5F] shadow-[2px_2px_0px_#2B2331]">
              <Compass className="w-5 h-5 text-[#E07A5F]" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black tracking-tight text-[#2B2331]">
                Bức Tường Lưu Bút Mùa Thi &amp; Lời Chúc Sĩ Tử
              </h3>
              <p className="text-xs font-semibold text-[#665A6E]">
                Thư tay gấp nếp · Tiếp lửa sĩ tử mọi miền tổ quốc
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsComposing(!isComposing)}
              className="ff-tactile-pop btn-feastables px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-[#2B2331] border-2 border-[#2B2331] text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-[2px_2px_0px_#2B2331]"
            >
              <PenLine className="w-3.5 h-3.5" />
              <span>Gửi lời chúc</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng bức tường lưu bút"
              className="ff-tactile-pop btn-feastables p-2 rounded-xl bg-[#F7F3EA] hover:bg-white text-[#2B2331] border-2 border-[#2B2331] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-6 py-2.5 border-b-2 border-[#2B2331] bg-[#F0E9DA] overflow-x-auto no-scrollbar">
          {CATEGORY_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => { playUiTick(); setActiveCategory(tab.key); }}
              className={`ff-tactile-pop px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all border-2 border-[#2B2331] cursor-pointer shrink-0 ${
                activeCategory === tab.key
                  ? 'bg-amber-300 text-[#2B2331] shadow-[2px_2px_0px_#2B2331]'
                  : 'bg-[#F7F3EA] text-[#665A6E] hover:text-[#2B2331]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6">
          {isComposing && (
            <form
              onSubmit={handleSubmitNote}
              className="card-hard bg-[#FFFDF8] border-2 border-[#2B2331] p-5 rounded-2xl shadow-[4px_4px_0px_#2B2331] space-y-4 animate-fade-in"
            >
              <div className="flex items-center justify-between border-b border-dashed border-[#2B2331]/30 pb-2">
                <span className="text-xs font-black uppercase text-[#2B2331] flex items-center gap-1.5">
                  <PenLine className="w-4 h-4 text-amber-600" />
                  Gấp một lá thư tay gửi sĩ tử
                </span>
                <button
                  type="button"
                  onClick={() => setIsComposing(false)}
                  className="text-xs font-bold text-[#665A6E] hover:text-[#2B2331] cursor-pointer"
                >
                  Hủy
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-[#5A4D61] block mb-1">Họ tên / Bút danh:</label>
                  <input
                    type="text"
                    required
                    maxLength={50}
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    placeholder="Nguyễn Văn A"
                    className="w-full bg-[#F7F3EA] border-2 border-[#2B2331] rounded-xl px-3 py-1.5 text-xs text-[#2B2331] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-[#5A4D61] block mb-1">Trường học:</label>
                  <input
                    type="text"
                    required
                    maxLength={60}
                    value={authorSchool}
                    onChange={(e) => setAuthorSchool(e.target.value)}
                    placeholder="THPT Chuyên..."
                    className="w-full bg-[#F7F3EA] border-2 border-[#2B2331] rounded-xl px-3 py-1.5 text-xs text-[#2B2331] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-[#5A4D61] block mb-1">Tỉnh / Thành phố:</label>
                  <input
                    type="text"
                    required
                    maxLength={40}
                    value={province}
                    onChange={(e) => setProvince(e.target.value)}
                    placeholder="Hà Nội, TP.HCM, Đà Nẵng..."
                    className="w-full bg-[#F7F3EA] border-2 border-[#2B2331] rounded-xl px-3 py-1.5 text-xs text-[#2B2331] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-[#5A4D61] block mb-1">Kỳ thi tiếp lửa:</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full bg-[#F7F3EA] border-2 border-[#2B2331] rounded-xl px-3 py-1.5 text-xs text-[#2B2331] focus:outline-none"
                  >
                    <option value="thpt-qg">Kỳ thi THPT Quốc Gia</option>
                    <option value="hsg-olympic">Học sinh giỏi &amp; Olympic</option>
                    <option value="ielts-sat">Sĩ tử IELTS / SAT</option>
                    <option value="chuyen-lop10">Luyện thi Chuyên &amp; Lớp 10</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-[#5A4D61] block mb-1">Nguyện vọng / Mục tiêu:</label>
                  <input
                    type="text"
                    required
                    maxLength={80}
                    value={targetGoal}
                    onChange={(e) => setTargetGoal(e.target.value)}
                    placeholder="Ví dụ: Đỗ Y Hà Nội, 8.5 IELTS..."
                    className="w-full bg-[#F7F3EA] border-2 border-[#2B2331] rounded-xl px-3 py-1.5 text-xs text-[#2B2331] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#5A4D61] block mb-1">Nội dung thư tay truyền cảm hứng:</label>
                <textarea
                  rows={3}
                  required
                  maxLength={280}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Gửi gắm niềm tin, kinh nghiệm ôn thi hoặc lời chúc chân thành tới các bạn bè cùng trang lứa..."
                  className="w-full bg-[#F7F3EA] border-2 border-[#2B2331] rounded-xl p-3 text-xs sm:text-sm text-[#2B2331] focus:outline-none font-serif leading-relaxed"
                />
                <span className="text-[10px] font-mono text-[#665A6E] block text-right">
                  {message.length} / 280 ký tự
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-1">
                <button
                  type="submit"
                  disabled={!message.trim() || cooldownSeconds > 0}
                  className="ff-tactile-pop btn-feastables px-5 py-2.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-[#2B2331] border-2 border-[#2B2331] text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-[2px_2px_0px_#2B2331] disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{cooldownSeconds > 0 ? `Chờ ${cooldownSeconds}s` : 'Gửi lên bức tường'}</span>
                </button>
              </div>
            </form>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredNotes.map((note) => {
              const isLiked = likedIds.has(note.id);
              const isPinned = pinnedIds.has(note.id);
              return (
                <div
                  key={note.id}
                  className={`card-hard relative p-5 rounded-2xl border-2 border-[#2B2331] flex flex-col justify-between space-y-4 shadow-[4px_4px_0px_#2B2331] transition-transform hover:-translate-y-0.5 ${
                    isPinned ? 'bg-[#FFF8EA]' : 'bg-[#FFFDF8]'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2.5">
                      <div>
                        <div className="flex items-center gap-2">
                          <strong className="text-sm font-black text-[#2B2331]">
                            {note.authorName}
                          </strong>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200 border border-[#2B2331] text-[#2B2331]">
                            {note.province}
                          </span>
                        </div>
                        <span className="text-[11px] text-[#665A6E] block mt-0.5 font-medium">
                          {note.authorSchool}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleTogglePin(note.id)}
                        className={`p-1.5 rounded-lg border-2 border-[#2B2331] cursor-pointer transition-colors ${
                          isPinned ? 'bg-amber-400 text-[#2B2331]' : 'bg-[#F7F3EA] text-[#665A6E] hover:text-[#2B2331]'
                        }`}
                        title={isPinned ? 'Bỏ cắm cờ hoa tiêu' : 'Cắm cờ hoa tiêu lưu giữ'}
                      >
                        <Bookmark className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="inline-block px-2.5 py-0.5 rounded-md bg-[#EFE8DA] text-[10.5px] font-mono font-bold text-[#5A4D61] border border-[#2B2331]/30 mb-2.5">
                      {note.targetGoal}
                    </div>

                    <p className="font-serif text-xs sm:text-sm text-[#2B2331] leading-relaxed italic bg-[#F7F3EA]/70 p-3 rounded-xl border border-dashed border-[#2B2331]/25">
                      "{note.message}"
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-dashed border-[#2B2331]/20 text-[11px] font-mono text-[#665A6E]">
                    <span>{note.timestamp}</span>

                    <button
                      type="button"
                      onClick={() => handleToggleLike(note.id)}
                      className={`ff-tactile-pop btn-feastables px-3 py-1 rounded-lg border-2 border-[#2B2331] text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
                        isLiked ? 'bg-rose-100 text-rose-800' : 'bg-[#F7F3EA] text-[#2B2331]'
                      }`}
                    >
                      <Heart className={`w-3.5 h-3.5 ${isLiked ? 'text-rose-600 fill-rose-500' : 'text-[#665A6E]'}`} />
                      <span>{note.likes}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default MemorialWallModal;
