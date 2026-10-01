import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  PlusCircle,
  HelpCircle,
  CheckCircle2,
  Eye,
  MessageSquare,
  Award,
  Sparkles,
  Send,
  EyeOff,
  Filter,
  X,
  Check,
  Wand2,
  Trash2,
  Edit3,
  MoreVertical,
  AlertTriangle,
} from 'lucide-react';
import type { Question, Solution, SubjectTag, User } from '../../types';
import { TierBadge, AdminVerifiedBadge } from '../Badges10Tier';
import { ForumPostModeration } from '../ForumPost';
import {
  generateGhibliAlias,
  getRandomGhibliMask,
} from '../../utils/ghibliMasks';
import { DEFAULT_AVATAR, handleImageError, handleVideoError } from '../../utils/mediaFallback';
import { MASTER_ADMIN_CONFIG } from '../../config/admin';

interface QAForumViewProps {
  currentUser: User | null;
  questions: Question[];
  solutions: Solution[];
  onCreateQuestion: (data: {
    title: string;
    subject: SubjectTag;
    content: string;
    isAnonymous: boolean;
  }) => void;
  onAddSolution: (questionId: string, content: string) => void;
  onMarkBestSolution: (questionId: string, solutionId: string) => void;
  onDeleteQuestion?: (questionId: string) => void;
  onEditQuestion?: (questionId: string, updates: { title?: string; content?: string; subject?: SubjectTag }) => void;
  onDeleteSolution?: (solutionId: string) => void;
  onOpenLoginModal?: () => void;
  isEmbedded?: boolean;
}


const FORUM_VIDEOS = [
  { id: 0, label: '01 / WATER WAVE', url: 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260629_030107_874273ea-684a-4e90-bb96-8fdfde48d53d.mp4' },
  { id: 1, label: '02 / GRIDWAVE', url: 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260629_032424_3c9c2a9d-807b-4482-80e6-dd6d9dfd4545.mp4' },
  { id: 2, label: '03 / LIGHT TUNNEL', url: 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260627_094019_4214ea73-b963-46a4-8327-61489192de99.mp4' },
];

const SUBJECTS: { tag: SubjectTag | 'all'; label: string; group: 'academic' | 'life' }[] = [
  { tag: 'all', label: 'Tất cả', group: 'academic' },
  { tag: 'toan', label: '#toan', group: 'academic' },
  { tag: 'ly', label: '#ly', group: 'academic' },
  { tag: 'hoa', label: '#hoa', group: 'academic' },
  { tag: 'sinh', label: '#sinh', group: 'academic' },
  { tag: 'anh', label: '#anh', group: 'academic' },
  { tag: 'tin', label: '#tin', group: 'academic' },
  { tag: 'van', label: '#van', group: 'academic' },
  { tag: 'su', label: '#su', group: 'academic' },
  { tag: 'hotro', label: '#hotro', group: 'life' },
  { tag: 'kinhnghiem', label: '#kinhnghiem', group: 'life' },
  { tag: 'share', label: '#share', group: 'life' },
  { tag: 'tamsu', label: '#tamsu', group: 'life' },
  { tag: 'tamly', label: '#tamly', group: 'life' },
];

export const QAForumView: React.FC<QAForumViewProps> = ({
  currentUser,
  questions,
  solutions,
  onCreateQuestion,
  onAddSolution,
  onMarkBestSolution,
  onDeleteQuestion,
  onEditQuestion,
  onDeleteSolution,
  onOpenLoginModal,
  isEmbedded = false,
}) => {
  const [activeVideoIdx, setActiveVideoIdx] = useState(0);
  const [isAutoCycle, setIsAutoCycle] = useState(true);
  const [selectedTag, setSelectedTag] = useState<SubjectTag | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isAskModalOpen, setIsAskModalOpen] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);

  const [askCooldown, setAskCooldown] = useState(0);
  const [isSubmittingAsk, setIsSubmittingAsk] = useState(false);
  const [solCooldown, setSolCooldown] = useState(0);
  const [isSubmittingSol, setIsSubmittingSol] = useState(false);

  // Admin Moderation States
  const [questionToDelete, setQuestionToDelete] = useState<Question | null>(null);
  const [questionToEdit, setQuestionToEdit] = useState<Question | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editSubject, setEditSubject] = useState<SubjectTag>('toan');
  const [editContent, setEditContent] = useState('');
  const [openMenuQuestionId, setOpenMenuQuestionId] = useState<string | null>(null);

  const isSuperAdmin = currentUser?.email?.toLowerCase() === 'anhtuantran0512@gmail.com';

  const handleAdminDeletePost = (questionId: string) => {
    const q = questions.find(item => item.id === questionId);
    if (q) setQuestionToDelete(q);
  };

  const handleConfirmDelete = () => {
    if (questionToDelete && onDeleteQuestion) {
      onDeleteQuestion(questionToDelete.id);
      if (selectedQuestion?.id === questionToDelete.id) {
        setSelectedQuestion(null);
      }
      setQuestionToDelete(null);
    }
  };

  const handleAdminEditPost = (questionId: string) => {
    const q = questions.find(item => item.id === questionId);
    if (q) {
      setQuestionToEdit(q);
      setEditTitle(q.title);
      setEditSubject(q.subject);
      setEditContent(q.content);
    }
  };

  const handleConfirmEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (questionToEdit && onEditQuestion) {
      onEditQuestion(questionToEdit.id, {
        title: editTitle.trim(),
        subject: editSubject,
        content: editContent.trim(),
      });
      if (selectedQuestion?.id === questionToEdit.id) {
        setSelectedQuestion(prev =>
          prev
            ? {
                ...prev,
                title: editTitle.trim(),
                subject: editSubject,
                content: editContent.trim(),
              }
            : null
        );
      }
      setQuestionToEdit(null);
    }
  };

  useEffect(() => {
    if (askCooldown <= 0) return;
    const timer = setInterval(() => {
      setAskCooldown(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [askCooldown]);

  useEffect(() => {
    if (solCooldown <= 0) return;
    const timer = setInterval(() => {
      setSolCooldown(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [solCooldown]);

  // Automatic ambient timer
  useEffect(() => {
    if (!isAutoCycle) return;
    const interval = setInterval(() => {
      setActiveVideoIdx(prev => (prev + 1) % FORUM_VIDEOS.length);
    }, 20000);
    return () => clearInterval(interval);
  }, [isAutoCycle]);

  // New Question Form
  const [newTitle, setNewTitle] = useState('');
  const [newSubject, setNewSubject] = useState<SubjectTag>('toan');
  const [newContent, setNewContent] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);

  // Ghibli disguise preview when anonymous toggled
  const previewAlias = useMemo(
    () => (isAnonymous ? generateGhibliAlias(newSubject) : ''),
    [isAnonymous, newSubject]
  );
  const previewMask = useMemo(
    () => (isAnonymous ? getRandomGhibliMask(newSubject) : ''),
    [isAnonymous, newSubject]
  );

  // New Solution Form inside detail view
  const [solutionText, setSolutionText] = useState('');

  // Filter questions

  const filteredQuestions = questions.filter(q => {
    const matchesTag = selectedTag === 'all' || q.subject === selectedTag;
    const matchesSearch =
      q.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.subject.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesTag && matchesSearch;
  });

  const handleAskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (askCooldown > 0 || isSubmittingAsk) return;
    if (!currentUser) {
      alert('Vui lòng đăng nhập để đặt câu hỏi!');
      onOpenLoginModal?.();
      return;
    }

    if (!newTitle.trim() || !newContent.trim()) {
      alert('Vui lòng nhập tiêu đề và nội dung câu hỏi!');
      return;
    }

    setIsSubmittingAsk(true);

    onCreateQuestion({
      title: newTitle.trim().slice(0, 150),
      subject: newSubject,
      content: newContent.trim().slice(0, 1500),
      isAnonymous,
    });

    setNewTitle('');
    setNewContent('');
    setIsAnonymous(false);
    setIsAskModalOpen(false);
    setIsSubmittingAsk(false);
    setAskCooldown(5); // 5-second anti-spam cooldown lock
  };

  const handleSolutionSubmit = (questionId: string) => {
    if (solCooldown > 0 || isSubmittingSol) return;
    if (!solutionText.trim()) return;
    if (!currentUser) {
      alert('Vui lòng đăng nhập để gửi câu trả lời!');
      onOpenLoginModal?.();
      return;
    }

    setIsSubmittingSol(true);
    onAddSolution(questionId, solutionText.trim().slice(0, 1500));
    setSolutionText('');
    setIsSubmittingSol(false);
    setSolCooldown(3); // 3-second anti-spam cooldown lock
  };

  return (
    <section className={`relative w-full ${isEmbedded ? 'min-h-screen' : 'h-[100dvh] md:h-screen overflow-hidden'} flex flex-col pt-[calc(54px+var(--safe-top)+12px)] md:pt-24 pb-[calc(56px+var(--safe-bottom)+12px)] md:pb-8 px-4 sm:px-8`}>
      
      {/* Triple Video Crossfade Switcher Background Engine */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        {FORUM_VIDEOS.map((vid, idx) => (
          <video
            key={vid.id}
            src={vid.url}
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
            onError={handleVideoError}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-[1200ms] ease-in-out ${
              activeVideoIdx === idx ? 'opacity-100' : 'opacity-0'
            }`}
          />
        ))}
        {/* Subtle Dark 40% Overlay */}
        <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />
      </div>

      {/* Main Container */}
      <div className={`relative z-10 w-full max-w-7xl mx-auto flex-1 flex flex-col ${isEmbedded ? '' : 'overflow-hidden'}`}>
        
        {/* Header Bar with Ambient Video Switcher Pills */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4 pb-3 border-b border-white/10 shrink-0">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
              <HelpCircle className="w-6 h-6 text-cyan-400" />
              <span>Sàn Giao Lưu Tri Thức Q&A</span>
              <span className="text-xs font-mono font-normal text-cyan-300 px-2 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-500/30">
                HOIDAP247 NEXT-GEN
              </span>
            </h1>
            <p className="text-xs text-neutral-300 mt-0.5">
              Hỏi bài tập ẩn danh, thảo luận học thuật chuyên sâu và nhận huy hiệu đáp án chuẩn.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Ambient Video Switcher Pills */}
            <div className="hidden sm:flex items-center gap-1 bg-black/50 p-1 rounded-full border border-white/10">
              {FORUM_VIDEOS.map(v => (
                <button
                  key={v.id}
                  onClick={() => setActiveVideoIdx(v.id)}
                  className={`px-2.5 py-1 text-[10px] font-mono font-semibold rounded-full transition-all ${
                    activeVideoIdx === v.id
                      ? 'bg-cyan-500 text-black shadow-[0_0_10px_rgba(6,182,212,0.8)]'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                  title={`Chuyển phông nền: ${v.label}`}
                >
                  {v.label}
                </button>
              ))}
              <button
                onClick={() => setIsAutoCycle(prev => !prev)}
                className={`px-2 py-1 text-[9px] font-mono rounded-full border transition-all ${
                  isAutoCycle
                    ? 'border-cyan-500/40 text-cyan-300 bg-cyan-950/40'
                    : 'border-white/10 text-neutral-400'
                }`}
                title={
                  isAutoCycle
                    ? 'Đang bật tự động đổi nền sau 20s'
                    : 'Đã tạm dừng tự động đổi nền'
                }
              >
                {isAutoCycle ? 'Auto' : 'Static'}
              </button>
            </div>

            {/* Glowing + Đặt Câu Hỏi Mới (+50 XP) Button */}
            <button
              onClick={() => {
                if (!currentUser) {
                  onOpenLoginModal?.();
                } else {
                  setIsAskModalOpen(true);
                }
              }}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-400 to-blue-500 text-black hover:opacity-95 active:scale-95 transition-all shadow-[0_0_20px_rgba(6,182,212,0.5)] flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 text-black" />
              <span>+ Đặt Câu Hỏi Mới (+50 XP)</span>
            </button>
          </div>
        </div>

        {/* 14 Subject & Life Filter Pills + Search */}
        <div className="shrink-0 mb-4 space-y-2">
          {/* Search bar */}
          <div className="relative w-full">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              maxLength={100}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Tìm kiếm câu hỏi theo tiêu đề, nội dung, chủ đề #toan, #tin, #tamly..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl text-xs bg-neutral-950/80 border border-white/15 text-white placeholder-neutral-400 focus:outline-none focus:border-cyan-400 transition-colors shadow-inner"
            />
          </div>

          {/* 14 Subject Pills scrollable row */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <Filter className="w-3.5 h-3.5 text-neutral-400 shrink-0 mr-1" />
            {SUBJECTS.map(subj => {
              const isActive = selectedTag === subj.tag;
              const isAcademic = subj.group === 'academic';
              return (
                <button
                  key={subj.tag}
                  onClick={() => setSelectedTag(subj.tag)}
                  className={`px-3 py-1 rounded-full text-xs font-mono font-medium whitespace-nowrap transition-all focus:outline-none ${
                    isActive
                      ? 'bg-cyan-400 text-neutral-950 font-bold shadow-[0_0_12px_rgba(6,182,212,0.6)]'
                      : isAcademic
                      ? 'bg-white/5 text-neutral-300 hover:bg-white/15 border border-white/10'
                      : 'bg-purple-950/40 text-purple-300 hover:bg-purple-900/60 border border-purple-500/20'
                  }`}
                >
                  {subj.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Questions Feed (Scrollable when standalone) */}
        <div className={`flex-1 ${isEmbedded ? '' : 'overflow-y-auto pr-1'} space-y-3 pb-12`}>
          {filteredQuestions.length === 0 ? (
            <div className="h-56 flex flex-col items-center justify-center text-center p-6 text-neutral-400 rounded-2xl liquid-glass bg-white/5 border border-white/10 space-y-2">
              <HelpCircle className="w-10 h-10 text-neutral-500 mb-1" />
              <p className="text-sm font-semibold text-white">Chưa có câu hỏi nào trên sàn thảo luận</p>
              <p className="text-xs text-neutral-400 max-w-sm">
                Hãy là người đầu tiên đặt câu hỏi để cùng thảo luận bài học và nhận giải đáp từ cộng đồng!
              </p>
              <button
                type="button"
                onClick={() => {
                  if (!currentUser) {
                    onOpenLoginModal?.();
                  } else {
                    setIsAskModalOpen(true);
                  }
                }}
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-400/30 text-xs font-semibold transition-all cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Đặt câu hỏi đầu tiên</span>
              </button>
            </div>
          ) : (
            filteredQuestions.map(q => {
              const qSolutions = solutions.filter(s => s.questionId === q.id);
              const bestSol = qSolutions.find(s => s.isBest);

              return (
                <div
                  key={q.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedQuestion(q)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      const target = e.target as HTMLElement;
                      if (!target.closest('button')) {
                        e.preventDefault();
                        setSelectedQuestion(q);
                      }
                    }
                  }}
                  aria-label={`Xem chi tiết câu hỏi: ${q.title}`}
                  className={`cursor-pointer rounded-2xl liquid-glass p-4 border transition-all duration-200 group hover:scale-[1.008] ${
                    q.isSolved
                      ? 'bg-neutral-950/70 border-amber-500/40 hover:border-amber-400 shadow-[0_4px_20px_rgba(245,158,11,0.1)]'
                      : 'bg-neutral-950/60 border-white/10 hover:border-cyan-400/50'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Solved Badge */}
                        {q.isSolved ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-[10px] font-bold text-amber-300 font-mono">
                            <CheckCircle2 className="w-3 h-3 text-amber-400" />
                            ĐÃ GIẢI QUYẾT
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-500/30 text-[10px] font-bold text-cyan-300 font-mono">
                            ĐANG CHỜ LỜI GIẢI
                          </span>
                        )}

                        <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-white/10 text-neutral-300 border border-white/10">
                          #{q.subject}
                        </span>

                        <span className="text-[10px] text-neutral-500 font-mono">{q.createdAt}</span>
                      </div>

                      <h3 className="text-sm sm:text-base font-bold text-white group-hover:text-cyan-300 transition-colors">
                        {q.title}
                      </h3>

                      <p className="text-xs text-neutral-300 line-clamp-2 leading-relaxed">
                        {q.content}
                      </p>
                    </div>

                    <div className="flex items-center sm:flex-col sm:items-end gap-2 shrink-0">
                      <div className="flex items-center gap-1.5 text-xs text-neutral-400 font-mono">
                        <span className="flex items-center gap-1">
                          <Eye className="w-3.5 h-3.5" />
                          {q.views}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-cyan-400 font-bold">
                          <MessageSquare className="w-3.5 h-3.5" />
                          {qSolutions.length} lời giải
                        </span>

                        {/* Super Admin 3-dots Menu Button */}
                        {isSuperAdmin && (
                          <div className="relative ml-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuQuestionId(prev => (prev === q.id ? null : q.id));
                              }}
                              className="p-1 rounded-md bg-white/5 hover:bg-white/15 text-neutral-400 hover:text-white border border-white/10 transition-colors cursor-pointer"
                              title="Tùy chọn quản trị bài viết"
                              aria-label="Tùy chọn quản trị bài viết"
                            >
                              <MoreVertical size={13} />
                            </button>

                            {openMenuQuestionId === q.id && (
                              <div className="absolute right-0 top-full mt-1.5 w-44 rounded-xl obsidian-glass bg-[#0c1218] border border-cyan-500/30 shadow-2xl p-1.5 z-30 space-y-1 animate-fade-up">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenMenuQuestionId(null);
                                    handleAdminEditPost(q.id);
                                  }}
                                  className="w-full px-2.5 py-1.5 text-left text-xs text-amber-300 hover:bg-amber-500/20 rounded-lg flex items-center gap-2 transition-colors cursor-pointer"
                                >
                                  <Edit3 size={12} />
                                  <span>[Chỉnh sửa bài viết]</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenMenuQuestionId(null);
                                    handleAdminDeletePost(q.id);
                                  }}
                                  className="w-full px-2.5 py-1.5 text-left text-xs text-red-400 hover:bg-red-500/20 rounded-lg flex items-center gap-2 transition-colors cursor-pointer"
                                >
                                  <Trash2 size={12} />
                                  <span>[Xóa bài viết]</span>
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 mt-1">
                        <img
                          src={q.authorAvatar}
                          alt={q.authorName}
                          onError={e => handleImageError(e, DEFAULT_AVATAR)}
                          loading="lazy"
                          decoding="async"
                          width={20}
                          height={20}
                          className={`w-5 h-5 rounded-full object-cover border ${
                            q.isAnonymous
                              ? 'border-purple-400 p-0.5 shadow-[0_0_8px_rgba(168,85,247,0.5)]'
                              : 'border-white/20'
                          }`}
                        />
                        <span
                          className={`text-xs truncate max-w-[140px] ${
                            q.isAnonymous
                              ? 'text-purple-300 font-medium'
                              : 'text-neutral-400'
                          }`}
                        >
                          {q.authorName}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Best Answer Preview Callout */}
                  {bestSol && (
                    <div className="mt-3 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs text-amber-200">
                      <div className="flex items-center gap-2 truncate">
                        <Award className="w-4 h-4 text-amber-400 shrink-0" />
                        <span className="font-bold text-amber-300">Đáp Án Chuẩn:</span>
                        <span className="truncate italic text-neutral-200">{bestSol.content}</span>
                      </div>
                      <span className="text-[10px] font-mono text-amber-400 font-bold ml-2 shrink-0">
                        ✓ HOIDAP247 BEST
                      </span>
                    </div>
                  )}

                  {/* Super Admin Moderation Bar on Question Card */}
                  <ForumPostModeration
                    postId={q.id}
                    onDeletePost={handleAdminDeletePost}
                    onEditPost={handleAdminEditPost}
                    isSuperAdmin={isSuperAdmin}
                  />
                </div>
              );

            })
          )}
        </div>
      </div>

      {/* Modal: Đặt Câu Hỏi Mới (+50 XP) */}
      {isAskModalOpen && (
        <div role="dialog" aria-modal="true" aria-label="Đặt câu hỏi mới" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-up">
          <div className="liquid-glass w-full max-w-lg rounded-3xl bg-neutral-950/95 border border-cyan-400/40 shadow-2xl p-6 relative">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-cyan-400" />
                <h3 className="font-bold text-base text-white">Đặt Câu Hỏi Học Thuật Mới</h3>
              </div>
              <button
                onClick={() => setIsAskModalOpen(false)}
                className="p-1 rounded-full text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAskSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Chủ đề môn học / đời sống (*):
                </label>
                <select
                  value={newSubject}
                  onChange={e => setNewSubject(e.target.value as SubjectTag)}
                  className="w-full bg-neutral-900 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
                >
                  {SUBJECTS.filter(s => s.tag !== 'all').map(s => (
                    <option key={s.tag} value={s.tag}>
                      {s.label} ({s.group === 'academic' ? 'Học thuật' : 'Đời sống'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Tiêu đề câu hỏi (*):
                </label>
                <input
                  type="text"
                  required
                  maxLength={150}
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="VD: Cách giải phương trình vi phân cấp 2 bài tập số 3..."
                  className="w-full bg-neutral-900 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Nội dung chi tiết & thắc mắc (*):
                </label>
                <textarea
                  required
                  rows={4}
                  maxLength={1500}
                  value={newContent}
                  onChange={e => setNewContent(e.target.value)}
                  placeholder="Ghi rõ đề bài, dữ kiện đã cho và phần em đang vướng mắc để các bạn trợ giúp nhanh nhất..."
                  className="w-full bg-neutral-900 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 resize-none"
                />
              </div>

              {/* Incognito / Anonymous Toggle Switch with Ghibli Wizard Disguise */}
              <div className="space-y-2">
                <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg ${isAnonymous ? 'bg-purple-500/20 text-purple-300' : 'bg-neutral-800 text-neutral-400'}`}>
                      <EyeOff className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white block">Đăng bài ẩn danh</span>
                      <span className="text-[10px] text-neutral-400">
                        Hóa trang thành Pháp sư Tri thức Ghibli bí ẩn
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsAnonymous(prev => !prev)}
                    className={`w-11 h-6 rounded-full transition-colors relative focus:outline-none ${
                      isAnonymous ? 'bg-purple-600' : 'bg-neutral-700'
                    }`}
                  >
                    <span
                      className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                        isAnonymous ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Ghibli Wizard Disguise Preview Card */}
                {isAnonymous && (
                  <div className="p-3 rounded-2xl bg-purple-950/40 border border-purple-500/30 flex items-center gap-3 animate-fade-up">
                    {previewMask && (
                      <img
                        src={previewMask}
                        alt="Ghibli Wizard Mask"
                        onError={e => handleImageError(e, DEFAULT_AVATAR)}
                        loading="lazy"
                        decoding="async"
                        width={40}
                        height={40}
                        className="w-10 h-10 rounded-full border border-purple-400/50 p-0.5 shadow-[0_0_12px_rgba(168,85,247,0.4)]"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-purple-300 truncate">
                          {previewAlias}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-purple-500/20 text-purple-200 border border-purple-400/30 flex items-center gap-1 shrink-0">
                          <Wand2 className="w-3 h-3 text-purple-400" />
                          GHIBLI MASK
                        </span>
                      </div>
                      <p className="text-[10px] text-neutral-400 mt-0.5">
                        Tên thật & avatar của bạn sẽ được bảo mật tuyệt đối sau lớp mặt nạ pháp sư.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-white/10">
                <span className="text-[11px] font-mono text-cyan-300 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  Nhận ngay +50 XP khi đăng bài
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAskModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs text-neutral-400 hover:text-white"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={askCooldown > 0 || isSubmittingAsk}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 text-black font-bold text-xs shadow-md disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {askCooldown > 0 ? `Chờ ${askCooldown}s...` : isSubmittingAsk ? 'Đang gửi...' : 'Đăng Câu Hỏi (+50 XP)'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Chi Tiết Câu Hỏi & Solutions Feed */}
      {selectedQuestion && (
        <div role="dialog" aria-modal="true" aria-label="Chi tiết câu hỏi" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-up">
          <div className="liquid-glass w-full max-w-2xl rounded-3xl bg-neutral-950/95 border border-white/20 shadow-2xl p-6 relative max-h-[92vh] overflow-y-auto">
            
            {/* Header */}
            <div className="flex items-start justify-between pb-3 border-b border-white/10 mb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    #{selectedQuestion.subject}
                  </span>
                  {selectedQuestion.isSolved && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Đã Giải Quyết
                    </span>
                  )}
                </div>
                <h3 className="font-bold text-base sm:text-lg text-white">
                  {selectedQuestion.title}
                </h3>
              </div>

              <button
                onClick={() => setSelectedQuestion(null)}
                className="p-1 rounded-full text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Author bar & Question Content */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 mb-5">
              <div className="flex items-center gap-2 mb-2 text-xs text-neutral-400">
                <img
                  src={selectedQuestion.authorAvatar}
                  alt={selectedQuestion.authorName}
                  onError={e => handleImageError(e, DEFAULT_AVATAR)}
                  loading="lazy"
                  decoding="async"
                  width={24}
                  height={24}
                  className={`w-6 h-6 rounded-full object-cover border ${
                    selectedQuestion.isAnonymous
                      ? 'border-purple-400 p-0.5 shadow-[0_0_8px_rgba(168,85,247,0.5)]'
                      : 'border-white/20'
                  }`}
                />
                <span
                  className={`font-semibold ${
                    selectedQuestion.isAnonymous ? 'text-purple-300' : 'text-white'
                  }`}
                >
                  {selectedQuestion.authorName}
                </span>
                {selectedQuestion.isAnonymous && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-purple-500/20 text-purple-200 border border-purple-400/30 flex items-center gap-1">
                    <Wand2 className="w-3 h-3 text-purple-400" />
                    Pháp sư Ghibli
                  </span>
                )}
                <span>•</span>
                <span>{selectedQuestion.createdAt}</span>
              </div>
              <p className="text-xs sm:text-sm text-neutral-200 leading-relaxed whitespace-pre-line">
                {selectedQuestion.content}
              </p>

              <ForumPostModeration
                postId={selectedQuestion.id}
                onDeletePost={handleAdminDeletePost}
                onEditPost={handleAdminEditPost}
                isSuperAdmin={isSuperAdmin}
              />
            </div>


            {/* Solutions Section */}
            <div className="space-y-3 mb-5">
              <h4 className="font-bold text-xs sm:text-sm text-white flex items-center justify-between">
                <span>CÁC BÀI GIẢI ĐÃ ĐÓNG GÓP ({solutions.filter(s => s.questionId === selectedQuestion.id).length})</span>
                <span className="text-[10px] text-neutral-400 font-normal">
                  Chỉ tác giả hoặc Super Admin mới có quyền xác nhận đáp án chuẩn
                </span>
              </h4>

              {solutions.filter(s => s.questionId === selectedQuestion.id).length === 0 ? (
                <p className="text-neutral-500 text-xs italic text-center py-4">
                  Chưa có bạn nào trợ giúp giải câu này. Hãy là người đầu tiên đưa ra đáp án chính xác!
                </p>
              ) : (
                solutions
                  .filter(s => s.questionId === selectedQuestion.id)
                  .sort((a, b) => (b.isBest ? 1 : 0) - (a.isBest ? 1 : 0))
                  .map(sol => {
                    const isSuperAdminSolver = sol.authorEmail?.toLowerCase() === 'anhtuantran0512@gmail.com';
                    const solverName = isSuperAdminSolver ? MASTER_ADMIN_CONFIG.name : sol.authorName;
                    const solverAvatar = isSuperAdminSolver ? MASTER_ADMIN_CONFIG.avatar : sol.authorAvatar;
                    // HOIDAP247 confirmation button permission check
                    const canConfirmBest =
                      isSuperAdmin || currentUser?.id === selectedQuestion.authorId;

                    return (
                      <div
                        key={sol.id}
                        className={`p-4 rounded-2xl transition-all ${
                          sol.isBest
                            ? 'bg-amber-950/30 border-2 border-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.25)]'
                            : 'bg-white/5 border border-white/10'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="relative">
                              <img
                                src={solverAvatar}
                                alt={solverName}
                                onError={e => handleImageError(e, DEFAULT_AVATAR)}
                                loading="lazy"
                                decoding="async"
                                width={28}
                                height={28}
                                className={`w-7 h-7 rounded-full object-cover ${
                                  isSuperAdminSolver ? 'border border-amber-400' : ''
                                }`}
                              />
                              <span className="absolute -bottom-1 -right-1">
                                <TierBadge level={isSuperAdminSolver ? 150 : sol.authorLevel} size={14} showTooltip={false} />
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`text-xs ${
                                  isSuperAdminSolver ? 'discord-admin-name' : 'font-bold text-white'
                                }`}
                              >
                                {solverName}
                              </span>
                              {isSuperAdminSolver && <AdminVerifiedBadge size={13} />}
                              <span className="text-[10px] text-neutral-500 font-mono">
                                • Lv.{sol.authorLevel}
                              </span>
                            </div>
                          </div>

                          {sol.isBest && (
                            <span className="px-2.5 py-1 rounded-full bg-amber-500 text-black text-[10px] font-extrabold flex items-center gap-1 shadow-md">
                              <Award className="w-3 h-3" />
                              ĐÁP ÁN CHUẨN (+100 XP)
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-neutral-200 leading-relaxed whitespace-pre-line">
                          {sol.content}
                        </p>

                        <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between text-xs text-neutral-400">
                          <span className="text-[10px] font-mono">{sol.createdAt}</span>

                          <div className="flex items-center gap-2">
                            {/* Super Admin Delete Solution */}
                            {isSuperAdmin && (
                              <button
                                type="button"
                                onClick={() => onDeleteSolution?.(sol.id)}
                                className="inline-flex items-center gap-1 text-[11px] text-red-400 hover:text-red-300 transition-colors px-2 py-0.5 rounded bg-red-500/10 border border-red-500/20 cursor-pointer"
                                title="Xóa phản hồi vi phạm"
                              >
                                <Trash2 size={11} /> Xóa phản hồi vi phạm
                              </button>
                            )}

                            {/* HOIDAP247 BEST ANSWER CONFIRMATION BUTTON */}
                            {canConfirmBest && !sol.isBest && (
                              <button
                                onClick={() => onMarkBestSolution(selectedQuestion.id, sol.id)}
                                className="px-3 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-black font-bold text-[11px] border border-amber-400/40 transition-all flex items-center gap-1 cursor-pointer"
                                title="Xác nhận đáp án chính xác nhất để ghim lên đầu và thưởng +100 XP"
                              >
                                <Check className="w-3.5 h-3.5" />
                                ✓ Xác nhận Đáp Án Chuẩn (+100 XP)
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>

            {/* Submit New Solution (+25 XP) */}
            <div className="pt-3 border-t border-white/10">
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5 flex items-center justify-between">
                <span>Đóng góp lời giải của bạn:</span>
                <span className="text-[10px] font-mono text-cyan-300">+25 XP khi gửi lời giải</span>
              </label>

              <textarea
                rows={3}
                maxLength={1500}
                value={solutionText}
                onChange={e => setSolutionText(e.target.value)}
                placeholder="Nhập chi tiết từng bước giải bài, định lý hoặc lời khuyên học tập..."
                className="w-full bg-neutral-900 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 resize-none mb-2"
              />

              <div className="flex justify-end">
                <button
                  onClick={() => handleSolutionSubmit(selectedQuestion.id)}
                  disabled={!solutionText.trim() || solCooldown > 0 || isSubmittingSol}
                  className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-neutral-950 font-bold text-xs flex items-center gap-1.5 shadow-md disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{solCooldown > 0 ? `Chờ ${solCooldown}s...` : isSubmittingSol ? 'Đang gửi...' : '+ Trợ Giúp Giải Bài (+25 XP)'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Xác nhận xóa bài viết (Admin Only) */}
      {isSuperAdmin && questionToDelete && (
        <div role="dialog" aria-modal="true" aria-label="Xác nhận xóa câu hỏi" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-up">
          <div className="w-full max-w-md rounded-2xl bg-neutral-950 border border-red-500/40 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-red-400">
              <Trash2 className="w-5 h-5" />
              <h3 className="font-bold text-sm text-white">Xác nhận xóa bài viết</h3>
            </div>
            <p className="text-xs text-neutral-300 leading-relaxed">
              Bạn có chắc chắn muốn xóa vĩnh viễn bài viết <strong>"{questionToDelete.title}"</strong> không? Toàn bộ các câu trả lời liên quan cũng sẽ bị xóa khỏi hệ thống.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setQuestionToDelete(null)}
                className="px-3.5 py-1.5 rounded-xl text-xs text-neutral-400 hover:text-white transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
              >
                Xác nhận xóa vĩnh viễn
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Chỉnh sửa bài viết (Admin Only) */}
      {isSuperAdmin && questionToEdit && (
        <div role="dialog" aria-modal="true" aria-label="Chỉnh sửa câu hỏi" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-up">
          <div className="w-full max-w-lg rounded-2xl bg-neutral-950 border border-amber-500/40 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center gap-2 text-amber-400">
                <Edit3 className="w-4 h-4" />
                <h3 className="font-bold text-sm text-white">Chỉnh sửa bài viết Q&A</h3>
              </div>
              <button
                type="button"
                onClick={() => setQuestionToEdit(null)}
                className="p-1 rounded-full text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmEdit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">Môn học / Nhãn (*):</label>
                <select
                  value={editSubject}
                  onChange={e => setEditSubject(e.target.value as SubjectTag)}
                  className="w-full bg-neutral-900 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
                >
                  {SUBJECTS.filter(s => s.tag !== 'all').map(s => (
                    <option key={s.tag} value={s.tag}>
                      {s.label} ({s.group === 'academic' ? 'Học thuật' : 'Đời sống'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">Tiêu đề câu hỏi (*):</label>
                <input
                  type="text"
                  required
                  maxLength={150}
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  className="w-full bg-neutral-900 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1 flex-wrap gap-1">
                  <label className="text-xs font-semibold text-neutral-300">Nội dung chi tiết (*):</label>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        const warning = '\n\n[⚠️ CẢNH BÁO TỪ BQT: Bài viết cần tuân thủ văn hóa ứng xử và quy định của diễn đàn F-Forum]';
                        if (!editContent.includes(warning.trim())) {
                          setEditContent(prev => (prev + warning).slice(0, 1500));
                        }
                      }}
                      className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-red-500/15 text-red-300 hover:bg-red-500/25 border border-red-500/30 transition-colors cursor-pointer"
                      title="Gắn cảnh báo vi phạm nội quy"
                    >
                      <AlertTriangle size={10} />
                      <span>Cảnh báo nội quy</span>
                    </button>
                  </div>
                </div>
                <textarea
                  required
                  rows={4}
                  maxLength={1500}
                  value={editContent}
                  onChange={e => setEditContent(e.target.value)}
                  className="w-full bg-neutral-900 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setQuestionToEdit(null)}
                  className="px-4 py-2 rounded-xl text-xs text-neutral-400 hover:text-white"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs shadow-md cursor-pointer"
                >
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};
