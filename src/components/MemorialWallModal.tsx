/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Heart,
  Bookmark,
  Send,
  PenLine,
  Compass,
  Sparkles,
  Award,
  Mail,
  ChevronDown,
  ChevronUp,
  Star,
} from 'lucide-react';
import type { User } from '../types';
import { playChime, playUiTick } from '../utils/audio';
import { safeStorage } from '../utils/storage';
import './MemorialWallModal.css';

export interface MemorialWallModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onOpenLoginModal?: () => void;
}

export type MemorialCategory =
  | 'all'
  | 'thpt-qg'
  | 'dgnl'
  | 'ielts-sat'
  | 'hsg-olympic'
  | 'chuyen-lop10';

interface MemorialNote {
  id: string;
  authorName: string;
  authorSchool: string;
  province: string;
  category: 'thpt-qg' | 'dgnl' | 'ielts-sat' | 'hsg-olympic' | 'chuyen-lop10';
  targetGoal: string;
  message: string;
  likes: number;
  cheers: number;
  isFlagged?: boolean;
  timestamp: string;
}

interface StarParticle {
  id: number;
  x: number;
  y: number;
}

const INITIAL_MEMORIAL_NOTES: MemorialNote[] = [
  {
    id: 'memo-1',
    authorName: 'Hoàng Minh',
    authorSchool: 'THPT Chuyên Hà Nội - Amsterdam',
    province: 'Hà Nội',
    category: 'thpt-qg',
    targetGoal: 'Nguyện vọng 1: ĐH Ngoại Thương Hà Nội',
    message: 'Gửi chính tôi và các bạn 2k8: Đã đi được 99% chặng đường ôn luyện rồi, 1% còn lại là giữ vững sự điềm tĩnh và tự tin tuyệt đối khi bước chân vào phòng thi!',
    likes: 42,
    cheers: 28,
    timestamp: '10 phút trước',
  },
  {
    id: 'memo-2',
    authorName: 'Thanh Trúc',
    authorSchool: 'THPT Chuyên Trần Đại Nghĩa',
    province: 'TP. Hồ Chí Minh',
    category: 'dgnl',
    targetGoal: 'Mục tiêu 950+ ĐGNL ĐHQG TP.HCM',
    message: 'Đề thi Đánh Giá Năng Lực đòi hỏi tư duy phân tích sâu và xử lý logic nhanh gọn. Chúc toàn thể đồng môn giữ vững nhịp thở, bứt phá giới hạn bản thân!',
    likes: 35,
    cheers: 19,
    timestamp: '18 phút trước',
  },
  {
    id: 'memo-3',
    authorName: 'Bảo Trâm',
    authorSchool: 'THPT Chuyên Lê Hồng Phong',
    province: 'TP. Hồ Chí Minh',
    category: 'ielts-sat',
    targetGoal: 'Mục tiêu: 8.0 IELTS & 1520 SAT',
    message: 'Những đêm thức trắng cùng Reading và Writing sẽ đổi lại một chân trời tri thức rộng mở. Chúc cả nhà vượt ải ngoạn mục, cất cánh ước mơ du học!',
    likes: 51,
    cheers: 34,
    timestamp: '25 phút trước',
  },
  {
    id: 'memo-4',
    authorName: 'Quốc Khánh',
    authorSchool: 'THPT Chuyên Phan Bội Châu',
    province: 'Nghệ An',
    category: 'hsg-olympic',
    targetGoal: 'Đội tuyển Quốc Gia môn Toán học',
    message: 'Toán học không chỉ là những con số khô khan, nó là nghệ thuật của tư duy trừu tượng và lòng kiên định. Cùng nhau chạm đỉnh vinh quang học thuật!',
    likes: 68,
    cheers: 45,
    timestamp: '1 giờ trước',
  },
  {
    id: 'memo-5',
    authorName: 'Thành An',
    authorSchool: 'THPT Chuyên Lê Quý Đôn',
    province: 'Đà Nẵng',
    category: 'thpt-qg',
    targetGoal: 'Thủ khoa Khối A00 miền Trung',
    message: 'Mỗi đề thi thử là một lần tôi luyện bản lĩnh. Chúc 1 triệu sĩ tử mùa thi năm nay làm bài trên cả kỳ vọng, vẹn tròn ước mơ giảng đường!',
    likes: 74,
    cheers: 52,
    timestamp: '2 giờ trước',
  },
];

const CATEGORY_TABS: { key: MemorialCategory; label: string; short: string }[] = [
  { key: 'all', label: 'Tất cả kỳ thi', short: 'Tất cả' },
  { key: 'thpt-qg', label: 'THPT Quốc Gia', short: 'THPT QG' },
  { key: 'dgnl', label: 'Đánh Giá Năng Lực (ĐGNL)', short: 'ĐGNL' },
  { key: 'ielts-sat', label: 'Chứng Chỉ Quốc Tế (IELTS/SAT)', short: 'IELTS/SAT' },
  { key: 'hsg-olympic', label: 'Đội Tuyển Chuyên Học Sinh Giỏi', short: 'HSG & Olympic' },
];

export const MemorialWallModal: React.FC<MemorialWallModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onOpenLoginModal,
}) => {
  const [activeCategory, setActiveCategory] = useState<MemorialCategory>('all');
  const [notes, setNotes] = useState<MemorialNote[]>(() => {
    const saved = safeStorage.getItem('fforum_memorial_notes_v2');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return INITIAL_MEMORIAL_NOTES;
      }
    }
    return INITIAL_MEMORIAL_NOTES;
  });

  const [unfoldedNoteIds, setUnfoldedNoteIds] = useState<Set<string>>(() => new Set(['memo-1']));
  const [likedIds, setLikedIds] = useState<Set<string>>(() => new Set());
  const [cheeredIds, setCheeredIds] = useState<Set<string>>(() => new Set());
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(() => new Set());
  const [particles, setParticles] = useState<StarParticle[]>([]);
  const [reputationNotice, setReputationNotice] = useState<string | null>(null);

  const [isComposing, setIsComposing] = useState(false);
  const [authorName, setAuthorName] = useState(currentUser?.name || '');
  const [authorSchool, setAuthorSchool] = useState('');
  const [province, setProvince] = useState('Hà Nội');
  const [category, setCategory] = useState<'thpt-qg' | 'dgnl' | 'ielts-sat' | 'hsg-olympic'>('thpt-qg');
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

  const toggleFoldNote = useCallback((id: string) => {
    playUiTick();
    setUnfoldedNoteIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

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
        safeStorage.setItem('fforum_memorial_notes_v2', JSON.stringify(updated));
        return updated;
      });
      return next;
    });
  }, []);

  const handleSendCheer = useCallback((id: string, event: React.MouseEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    playChime('xp');

    const newParticles: StarParticle[] = Array.from({ length: 6 }).map((_, i) => ({
      id: Date.now() + i,
      x: rect.left + rect.width / 2 + (Math.random() * 40 - 20),
      y: rect.top + (Math.random() * 20 - 10),
    }));

    setParticles((prev) => [...prev, ...newParticles]);
    window.setTimeout(() => {
      setParticles((prev) => prev.filter((p) => !newParticles.some((np) => np.id === p.id)));
    }, 1200);

    setCheeredIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });

    setNotes((prevNotes) => {
      const updated = prevNotes.map((n) =>
        n.id === id ? { ...n, cheers: n.cheers + 1 } : n
      );
      safeStorage.setItem('fforum_memorial_notes_v2', JSON.stringify(updated));
      return updated;
    });

    setReputationNotice('+5 Điểm Uy Tín Học Thuật vì đã tiếp lửa sĩ tử');
    window.setTimeout(() => setReputationNotice(null), 3500);
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
      cheers: 1,
      timestamp: 'Vừa xong',
    };

    setNotes((prev) => {
      const updated = [newNote, ...prev];
      safeStorage.setItem('fforum_memorial_notes_v2', JSON.stringify(updated));
      return updated;
    });

    setUnfoldedNoteIds((prev) => new Set([...prev, newNote.id]));
    setMessage('');
    setTargetGoal('');
    setIsComposing(false);
    setCooldownSeconds(30);

    setReputationNotice('+10 Điểm Uy Tín Học Thuật vì đã viết lưu bút tiếp lửa');
    window.setTimeout(() => setReputationNotice(null), 4000);
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
      {particles.map((p) => (
        <div
          key={p.id}
          className="micro-star-particle"
          style={{ left: `${p.x}px`, top: `${p.y}px` }}
        >
          <div className="w-5 h-5 rounded-full bg-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.9)] flex items-center justify-center text-[#2B2331]">
            <Star className="w-3 h-3 fill-amber-500 text-amber-700" />
          </div>
        </div>
      ))}

      {reputationNotice && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[130] px-4 py-2 rounded-xl bg-amber-400 text-[#0b0d12] border-2 border-[#2B2331] font-mono text-xs font-black shadow-[4px_4px_0px_#2B2331] flex items-center gap-2 animate-bounce">
          <Award className="w-4 h-4 text-[#0b0d12]" />
          <span>{reputationNotice}</span>
        </div>
      )}

      <div
        className="card-hard w-full max-w-4xl bg-[#F7F3EA] border-2 border-[#2B2331] text-[#2B2331] rounded-[16px] shadow-[6px_6px_0px_#2B2331] flex flex-col max-h-[92vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b-2 border-[#2B2331] bg-[#EFE8DA]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[14px] bg-[#E07A5F]/20 border-2 border-[#2B2331] flex items-center justify-center text-[#E07A5F] shadow-[2px_2px_0px_#2B2331]">
              <Compass className="w-5 h-5 text-[#E07A5F]" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black tracking-tight text-[#2B2331] flex items-center gap-2">
                <span>Bức Tường Lưu Bút Mùa Thi &amp; Kỷ Niệm 2027</span>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-300 border border-[#2B2331] text-[#2B2331]">
                  Phong Thư Origami 3D
                </span>
              </h3>
              <p className="text-xs font-semibold text-[#665A6E]">
                Thư tay gấp nếp Origami · Tiếp lửa sĩ tử mọi miền tổ quốc
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

        <div className="flex items-center gap-2 px-6 py-2.5 border-b-2 border-[#2B2331] bg-[#F0E9DA] overflow-x-auto no-scrollbar">
          {CATEGORY_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => { playUiTick(); setActiveCategory(tab.key); }}
              className={`ff-tactile-pop px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all border-2 border-[#2B2331] cursor-pointer shrink-0 flex items-center gap-1.5 ${
                activeCategory === tab.key
                  ? 'bg-amber-300 text-[#2B2331] shadow-[2px_2px_0px_#2B2331]'
                  : 'bg-[#F7F3EA] text-[#665A6E] hover:text-[#2B2331]'
              }`}
            >
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6">
          {isComposing && (
            <form
              onSubmit={handleSubmitNote}
              className="card-hard bg-[#FFFDF8] border-2 border-[#2B2331] p-5 rounded-[16px] shadow-[4px_4px_0px_#2B2331] space-y-4 animate-fade-in"
            >
              <div className="flex items-center justify-between border-b border-dashed border-[#2B2331]/30 pb-2">
                <span className="text-xs font-black uppercase text-[#2B2331] flex items-center gap-1.5">
                  <Mail className="w-4 h-4 text-amber-600" />
                  Gấp một phong thư Origami gửi sĩ tử mùa thi
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
                    className="w-full bg-[#F7F3EA] border-2 border-[#2B2331] rounded-xl px-3 py-1.5 text-xs text-[#2B2331] focus:outline-none font-bold"
                  >
                    <option value="thpt-qg">Kỳ thi THPT Quốc Gia</option>
                    <option value="dgnl">Đánh Giá Năng Lực (ĐGNL)</option>
                    <option value="ielts-sat">Chứng Chỉ Quốc Tế (IELTS/SAT)</option>
                    <option value="hsg-olympic">Đội Tuyển Chuyên Học Sinh Giỏi</option>
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
                    placeholder="Ví dụ: Đỗ Y Hà Nội, 8.0 IELTS, 950+ ĐGNL..."
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
                  placeholder="Gửi gắm niềm tin, phương pháp ôn thi hoặc lời chúc chân thành tới các bạn bè cùng trang lứa..."
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
                  <span>{cooldownSeconds > 0 ? `Chờ ${cooldownSeconds}s` : 'Gửi lên bức tường Origami'}</span>
                </button>
              </div>
            </form>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredNotes.map((note) => {
              const isLiked = likedIds.has(note.id);
              const isCheered = cheeredIds.has(note.id);
              const isPinned = pinnedIds.has(note.id);
              const isUnfolded = unfoldedNoteIds.has(note.id);

              return (
                <div
                  key={note.id}
                  className={`card-hard origami-envelope-card relative p-5 rounded-[16px] border-2 border-[#2B2331] flex flex-col justify-between space-y-3.5 shadow-[4px_4px_0px_#2B2331] origami-fold-pattern ${
                    isPinned ? 'bg-[#FFF8EA]' : 'bg-[#FFFDF8]'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <strong className="text-sm font-black text-[#2B2331]">
                          {note.authorName}
                        </strong>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200 border border-[#2B2331] text-[#2B2331]">
                          {note.province}
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-[#EFE8DA] border border-[#2B2331]/30 text-[#5A4D61]">
                          {note.category === 'thpt-qg'
                            ? 'THPT Quốc Gia'
                            : note.category === 'dgnl'
                            ? 'ĐGNL'
                            : note.category === 'ielts-sat'
                            ? 'IELTS / SAT'
                            : 'HSG & Olympic'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
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
                    </div>

                    <div className="text-[11px] text-[#665A6E] font-medium mb-2 flex items-center justify-between">
                      <span>{note.authorSchool}</span>
                      <span className="text-[10px] font-mono text-[#8a7e93]">{note.timestamp}</span>
                    </div>

                    <div className="inline-block px-2.5 py-1 rounded-lg bg-[#EFE8DA] text-[11px] font-mono font-bold text-[#5A4D61] border border-[#2B2331]/30 mb-3 w-full">
                      Mục tiêu: {note.targetGoal}
                    </div>

                    {isUnfolded ? (
                      <div className="origami-letter-body relative bg-[#F7F3EA] p-4 rounded-xl border border-dashed border-[#2B2331]/35 shadow-inner">
                        <div className="flex items-center justify-between text-[10px] font-mono font-bold text-amber-700 mb-2">
                          <span className="flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-amber-600" />
                            Phong Thư Origami Đã Mở
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleFoldNote(note.id)}
                            className="hover:underline flex items-center gap-0.5 cursor-pointer text-[#665A6E]"
                          >
                            <span>Gập lại</span>
                            <ChevronUp className="w-3 h-3" />
                          </button>
                        </div>
                        <p className="font-serif text-xs sm:text-sm text-[#2B2331] leading-relaxed italic">
                          "{note.message}"
                        </p>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => toggleFoldNote(note.id)}
                        className="w-full text-left bg-[#F7F3EA]/70 hover:bg-[#F7F3EA] p-3 rounded-xl border border-dashed border-[#2B2331]/25 cursor-pointer transition-colors group flex items-center justify-between gap-2"
                        title="Nhấp để mở phong thư Origami 3D"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-6 h-6 rounded-md bg-amber-300 border border-[#2B2331] flex items-center justify-center shrink-0">
                            <Mail className="w-3.5 h-3.5 text-[#2B2331]" />
                          </div>
                          <span className="text-xs font-serif italic text-[#4a3f52] truncate">
                            "{note.message}"
                          </span>
                        </div>
                        <span className="shrink-0 text-[10.5px] font-bold text-amber-700 group-hover:underline flex items-center gap-0.5">
                          <span>Mở phong thư</span>
                          <ChevronDown className="w-3 h-3" />
                        </span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-dashed border-[#2B2331]/20 text-[11px] font-mono text-[#665A6E] flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={(e) => handleSendCheer(note.id, e)}
                      className={`ff-tactile-pop btn-feastables px-3 py-1.5 rounded-xl border-2 border-[#2B2331] text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-[2px_2px_0px_#2B2331] ${
                        isCheered ? 'bg-amber-300 text-[#2B2331]' : 'bg-amber-400 hover:bg-amber-300 text-[#2B2331]'
                      }`}
                      title="Thả hoa đăng sao vàng động viên sĩ tử (+5 Uy Tín)"
                    >
                      <Star className={`w-3.5 h-3.5 ${isCheered ? 'fill-amber-600 text-amber-800' : 'fill-amber-600 text-amber-700'}`} />
                      <span>Gửi Lời Động Viên ({note.cheers})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleToggleLike(note.id)}
                      className={`ff-tactile-pop btn-feastables px-3 py-1.5 rounded-xl border-2 border-[#2B2331] text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
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
