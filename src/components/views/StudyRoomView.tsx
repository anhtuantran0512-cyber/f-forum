/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React, { useMemo, useState } from 'react';
import {
  BookOpen,
  Plus,
  Search,
  Sparkles,
  Layers,
  Star,
  Copy,
  Pencil,
  Trash2,
  Play,
  Target,
  Clock,
  History,
  Flame,
  GraduationCap,
  ChevronRight,
  Info,
} from 'lucide-react';
import type { StudyCard, StudyDeck, StudySession, SubjectTag, User } from '../../types';
import {
  MASTERED_BOX,
  STUDY_BOX_INTERVALS_MS,
  SUBJECT_LABELS,
  formatDueLabel,
  formatInterval,
  getDeckStats,
  getStudyDayWindow,
  type StudyGrade,
} from '../../store/studyLogic';
import { DeckEditorModal } from '../study/DeckEditorModal';
import { ReviewSessionModal } from '../study/ReviewSessionModal';
import { QuizSessionModal } from '../study/QuizSessionModal';

interface StudyRoomViewProps {
  currentUser: User | null;
  decks: StudyDeck[];
  sessions: StudySession[];
  onOpenLoginModal: () => void;
  onCreateDeck: (input: {
    title: string;
    description?: string;
    subject: SubjectTag;
    isPublic?: boolean;
    cards?: { front: string; back: string; hint?: string }[];
  }) => StudyDeck | null;
  onUpdateDeck: (
    deckId: string,
    updates: Partial<Pick<StudyDeck, 'title' | 'description' | 'subject' | 'isPublic' | 'cards'>>,
  ) => StudyDeck | null;
  onDeleteDeck: (deckId: string) => boolean;
  onImportCards: (deckId: string, rawText: string) => number;
  onGradeCard: (deckId: string, cardId: string, grade: StudyGrade) => { card: StudyCard; xp: number } | null;
  onSyncDeck: (deckId: string) => boolean;
  onRecordSession: (input: {
    deckId: string;
    mode: 'review' | 'quiz';
    correct: number;
    total: number;
    xpAwarded: number;
  }) => StudySession | null;
  onToggleStar: (deckId: string) => boolean;
  onCloneDeck: (deckId: string) => StudyDeck | null;
}

type TabId = 'mine' | 'explore' | 'starred' | 'history';

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'mine', label: 'Bộ thẻ của tôi', icon: <BookOpen className="w-3.5 h-3.5" /> },
  { id: 'explore', label: 'Khám phá', icon: <Search className="w-3.5 h-3.5" /> },
  { id: 'starred', label: 'Đã lưu', icon: <Star className="w-3.5 h-3.5" /> },
  { id: 'history', label: 'Lịch sử ôn tập', icon: <History className="w-3.5 h-3.5" /> },
];

const formatDateTime = (ms: number) => {
  const date = new Date(ms);
  const time = date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  return `${time} • ${date.getDate()}/${date.getMonth() + 1}`;
};

/** Vòng tròn tiến độ thuộc bài (SVG, không dùng thư viện ngoài). */
const MasteryRing: React.FC<{ percent: number; size?: number }> = ({ percent, size = 52 }) => {
  const radius = (size - 6) / 2;
  const circumference = 2 * Math.PI * radius;
  const safePercent = Math.max(0, Math.min(100, percent));
  const dash = (safePercent / 100) * circumference;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" className="shrink-0">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={4} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="url(#masteryGradient)"
        strokeWidth={4}
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circumference}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <defs>
        <linearGradient id="masteryGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#34d399" />
        </linearGradient>
      </defs>
      <text
        x="50%"
        y="52%"
        textAnchor="middle"
        dominantBaseline="middle"
        className="fill-white"
        style={{ fontSize: size * 0.26, fontWeight: 700 }}
      >
        {safePercent}%
      </text>
    </svg>
  );
};

const DeckCard: React.FC<{
  deck: StudyDeck;
  isOwner: boolean;
  starred: boolean;
  currentUserId: string;
  onReview: (deck: StudyDeck) => void;
  onQuiz: (deck: StudyDeck) => void;
  onEdit: (deck: StudyDeck) => void;
  onClone: (deck: StudyDeck) => void;
  onDelete: (deck: StudyDeck) => void;
  onToggleStar: (deck: StudyDeck) => void;
}> = ({ deck, isOwner, starred, currentUserId, onReview, onQuiz, onEdit, onClone, onDelete, onToggleStar }) => {
  const stats = useMemo(() => getDeckStats(deck), [deck]);

  return (
    <article className="liquid-glass rounded-3xl border border-white/12 bg-[#0c1218]/80 p-4 flex flex-col gap-3 hover:border-amber-400/30 transition-colors">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-amber-300/90">
            {SUBJECT_LABELS[deck.subject] || 'Tổng hợp'}
          </span>
          <h3 className="text-sm font-bold text-white truncate mt-0.5">{deck.title}</h3>
          <p className="text-[11px] text-neutral-400 truncate mt-0.5">
            {deck.description || `${deck.cards.length} thẻ ghi nhớ`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onToggleStar(deck)}
          aria-label={starred ? 'Bỏ lưu bộ thẻ' : 'Lưu bộ thẻ'}
          className={`w-8 h-8 rounded-full border flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
            starred
              ? 'bg-amber-500/20 border-amber-400/40 text-amber-300'
              : 'bg-white/5 border-white/10 text-neutral-400 hover:text-amber-300'
          }`}
        >
          <Star className="w-3.5 h-3.5" fill={starred ? 'currentColor' : 'none'} />
        </button>
      </header>

      <div className="flex items-center gap-3">
        <MasteryRing percent={stats.masteredPct} />
        <div className="flex-1 min-w-0 grid grid-cols-2 gap-1.5 text-[11px]">
          <span className="text-neutral-300">
            <strong className="text-white">{stats.total}</strong> thẻ
          </span>
          <span className={stats.due > 0 ? 'text-amber-300' : 'text-neutral-400'}>
            <strong>{stats.due}</strong> đến hạn
          </span>
          <span className="text-emerald-300">
            <strong>{stats.mastered}</strong> đã thuộc
          </span>
          <span className="text-neutral-400">
            {stats.accuracyPct > 0 ? `${stats.accuracyPct}% nhớ đúng` : 'chưa ôn lần nào'}
          </span>
          <span className="text-neutral-400 col-span-2 inline-flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {stats.due > 0
              ? 'Có thẻ cần ôn ngay hôm nay'
              : stats.nextDueAt
              ? `Lịch ôn kế tiếp: ${formatDueLabel(stats.nextDueAt)}`
              : 'Chưa có lịch ôn'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1.5 text-[10px] text-neutral-400">
        <GraduationCap className="w-3 h-3 text-cyan-300" />
        <span className="truncate">
          {isOwner ? 'Bộ thẻ của bạn' : `Tạo bởi ${deck.ownerName}`} • {(deck.starredBy ?? []).length} lượt lưu
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2 mt-auto pt-1">
        <button
          type="button"
          onClick={() => onReview(deck)}
          disabled={deck.cards.length === 0}
          className="text-[11px] px-3 py-1.5 rounded-full bg-white text-neutral-900 font-bold hover:bg-neutral-200 transition-colors cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-40"
        >
          <Play className="w-3 h-3" />
          Ôn tập{stats.due > 0 ? ` (${stats.due})` : ''}
        </button>
        <button
          type="button"
          onClick={() => onQuiz(deck)}
          disabled={deck.cards.length === 0}
          className="text-[11px] px-3 py-1.5 rounded-full border border-cyan-400/35 text-cyan-200 hover:bg-cyan-500/15 transition-colors cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-40"
        >
          <Target className="w-3 h-3" />
          Luyện đề
        </button>

        {isOwner ? (
          <>
            <button
              type="button"
              onClick={() => onEdit(deck)}
              className="text-[11px] px-3 py-1.5 rounded-full border border-white/15 text-neutral-200 hover:bg-white/10 transition-colors cursor-pointer inline-flex items-center gap-1.5"
            >
              <Pencil className="w-3 h-3" />
              Sửa
            </button>
            <button
              type="button"
              onClick={() => onDelete(deck)}
              aria-label={`Xoá bộ thẻ ${deck.title}`}
              className="w-7 h-7 rounded-full border border-white/10 text-neutral-400 hover:text-rose-300 hover:border-rose-400/40 flex items-center justify-center transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => onClone(deck)}
            className="text-[11px] px-3 py-1.5 rounded-full border border-white/15 text-neutral-200 hover:bg-white/10 transition-colors cursor-pointer inline-flex items-center gap-1.5"
          >
            <Copy className="w-3 h-3" />
            Sao chép về thư viện
          </button>
        )}

        {isOwner && deck.ownerId === currentUserId && (
          <span className="ml-auto text-[10px] text-neutral-500 hidden sm:inline">đồng bộ đa thiết bị</span>
        )}
      </div>
    </article>
  );
};

export const StudyRoomView: React.FC<StudyRoomViewProps> = ({
  currentUser,
  decks,
  sessions,
  onOpenLoginModal,
  onCreateDeck,
  onUpdateDeck,
  onDeleteDeck,
  onImportCards,
  onGradeCard,
  onSyncDeck,
  onRecordSession,
  onToggleStar,
  onCloneDeck,
}) => {
  const [activeTab, setActiveTab] = useState<TabId>('mine');
  const [query, setQuery] = useState('');
  const [subjectFilter, setSubjectFilter] = useState<SubjectTag | 'all'>('all');
  const [editorDeck, setEditorDeck] = useState<StudyDeck | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [reviewDeck, setReviewDeck] = useState<StudyDeck | null>(null);
  const [quizDeck, setQuizDeck] = useState<StudyDeck | null>(null);

  const myId = currentUser?.id || '';

  const scopedDecks = useMemo(() => {
    const term = query.trim().toLowerCase();
    return decks
      .filter(deck => {
        if (activeTab === 'mine') return deck.ownerId === myId;
        if (activeTab === 'starred') return (deck.starredBy ?? []).includes(myId);
        if (activeTab === 'explore') return deck.isPublic;
        return false;
      })
      .filter(deck => (subjectFilter === 'all' ? true : deck.subject === subjectFilter))
      .filter(deck =>
        term
          ? deck.title.toLowerCase().includes(term) ||
            deck.description.toLowerCase().includes(term) ||
            deck.ownerName.toLowerCase().includes(term)
          : true,
      )
      .sort((a, b) => {
        const dueA = getDeckStats(a).due;
        const dueB = getDeckStats(b).due;
        if (dueA !== dueB) return dueB - dueA;
        return b.updatedAt - a.updatedAt;
      });
  }, [decks, activeTab, myId, subjectFilter, query]);

  const myDecks = useMemo(() => decks.filter(deck => deck.ownerId === myId), [decks, myId]);

  const overall = useMemo(() => {
    const totalCards = myDecks.reduce((sum, deck) => sum + deck.cards.length, 0);
    const due = myDecks.reduce((sum, deck) => sum + getDeckStats(deck).due, 0);
    const mastered = myDecks.reduce((sum, deck) => sum + getDeckStats(deck).mastered, 0);
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const weekSessions = sessions.filter(session => session.userId === myId && session.createdAt >= startOfDay.getTime() - 6 * 86400000);
    const xpThisWeek = weekSessions.reduce((sum, session) => sum + session.xpAwarded, 0);
    const today = getStudyDayWindow();
    const todaySessions = sessions.filter(
      session => session.userId === myId && session.createdAt >= today.start && session.createdAt < today.end,
    );
    return { totalCards, due, mastered, xpThisWeek, todaySessions: todaySessions.length };
  }, [myDecks, sessions, myId]);

  const reviewQueueDeck = useMemo(() => {
    const candidates = myDecks.filter(deck => getDeckStats(deck).due > 0);
    return candidates.sort((a, b) => getDeckStats(b).due - getDeckStats(a).due)[0] || null;
  }, [myDecks]);

  /* Biểu đồ cột XP 7 ngày gần nhất dựa trên lịch sử ôn tập thật */
  const weeklyChart = useMemo(() => {
    const days: { label: string; xp: number; isToday: boolean }[] = [];
    for (let offset = 6; offset >= 0; offset -= 1) {
      const day = new Date();
      day.setHours(0, 0, 0, 0);
      day.setDate(day.getDate() - offset);
      const dayStart = day.getTime();
      const dayEnd = dayStart + 86400000;
      const xp = sessions
        .filter(session => session.userId === myId && session.createdAt >= dayStart && session.createdAt < dayEnd)
        .reduce((sum, session) => sum + session.xpAwarded, 0);
      days.push({
        label: ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][day.getDay()],
        xp,
        isToday: offset === 0,
      });
    }
    const max = Math.max(1, ...days.map(day => day.xp));
    return { days, max };
  }, [sessions, myId]);

  const mySessions = useMemo(
    () => sessions.filter(session => session.userId === myId).sort((a, b) => b.createdAt - a.createdAt).slice(0, 40),
    [sessions, myId],
  );

  const openCreate = () => {
    if (!currentUser) {
      onOpenLoginModal();
      return;
    }
    setEditorDeck(null);
    setIsEditorOpen(true);
  };

  const openEdit = (deck: StudyDeck) => {
    setEditorDeck(deck);
    setIsEditorOpen(true);
  };

  const handleEditorSubmit = (payload: {
    title: string;
    description: string;
    subject: SubjectTag;
    isPublic: boolean;
    cards: { id?: string; front: string; back: string; hint?: string }[];
  }) => {
    if (editorDeck) {
      const existing = editorDeck.cards;
      const cards = payload.cards.map((draft, index) => {
        const existingCard = draft.id ? existing.find(card => card.id === draft.id) : existing[index];
        if (existingCard) {
          return { ...existingCard, front: draft.front, back: draft.back, hint: draft.hint || undefined };
        }
        return {
          id: `card-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`,
          front: draft.front,
          back: draft.back,
          hint: draft.hint || undefined,
          box: 0,
          dueAt: Date.now(),
          lapses: 0,
          reviews: 0,
          createdAt: Date.now(),
        };
      });
      onUpdateDeck(editorDeck.id, {
        title: payload.title,
        description: payload.description,
        subject: payload.subject,
        isPublic: payload.isPublic,
        cards,
      });
    } else {
      onCreateDeck({
        title: payload.title,
        description: payload.description,
        subject: payload.subject,
        isPublic: payload.isPublic,
        cards: payload.cards,
      });
    }
  };

  const handleDelete = (deck: StudyDeck) => {
    if (!window.confirm(`Xoá vĩnh viễn bộ thẻ «${deck.title}» cùng lịch sử ôn tập của bộ thẻ này?`)) return;
    onDeleteDeck(deck.id);
  };

  return (
    <section className="relative min-h-screen w-full text-white px-3 sm:px-6 pt-24 sm:pt-28 pb-28">
      {/* Nền aurora nhẹ */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-32 -left-24 w-[420px] h-[420px] rounded-full bg-amber-500/10 blur-[120px]" />
        <div className="absolute top-40 -right-24 w-[380px] h-[380px] rounded-full bg-cyan-500/10 blur-[120px]" />
      </div>

      <div className="relative max-w-6xl mx-auto space-y-5">
        {/* ---------------------------- Hero ---------------------------- */}
        <header className="liquid-glass rounded-3xl border border-white/12 bg-[#0c1218]/80 p-5 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.25em] text-amber-300/90 border border-amber-400/25 bg-amber-500/10 rounded-full px-3 py-1">
                <Sparkles className="w-3 h-3" />
                Phòng Ôn Tập • Leitner 6 hộp
              </span>
              <h1 className="text-2xl sm:text-3xl font-bold mt-3 leading-tight">
                Ghi nhớ công thức{' '}
                <span className="bg-gradient-to-r from-amber-200 via-amber-300 to-cyan-200 bg-clip-text text-transparent">
                  theo nhịp khoa học
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-neutral-300 mt-2 leading-relaxed">
                Tạo bộ thẻ ghi nhớ cho từng môn, để hệ thống xếp lịch ôn lại đúng lúc bạn sắp quên. Mỗi lượt ôn
                được cộng XP và Coin, tiến độ đồng bộ tức thì giữa các thiết bị.
              </p>

              <div className="flex flex-wrap items-center gap-2 mt-4">
                <button
                  type="button"
                  onClick={openCreate}
                  className="text-xs px-4 py-2 rounded-full bg-white text-neutral-900 font-bold hover:bg-neutral-200 transition-colors cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Tạo bộ thẻ mới
                </button>
                <button
                  type="button"
                  onClick={() => reviewQueueDeck && setReviewDeck(reviewQueueDeck)}
                  disabled={!reviewQueueDeck}
                  className="text-xs px-4 py-2 rounded-full border border-amber-400/35 text-amber-200 hover:bg-amber-500/15 transition-colors cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-40"
                >
                  <Flame className="w-3.5 h-3.5" />
                  {reviewQueueDeck
                    ? `Ôn ngay ${getDeckStats(reviewQueueDeck).due} thẻ đến hạn`
                    : 'Không có thẻ đến hạn'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:gap-3 w-full sm:w-auto">
              {[
                { label: 'Bộ thẻ của tôi', value: myDecks.length, tone: 'text-white' },
                { label: 'Tổng thẻ', value: overall.totalCards, tone: 'text-cyan-300' },
                { label: 'Đến hạn hôm nay', value: overall.due, tone: 'text-amber-300' },
                { label: 'Đã thuộc', value: overall.mastered, tone: 'text-emerald-300' },
              ].map(stat => (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 min-w-[124px]"
                >
                  <p className="text-[10px] uppercase tracking-wider text-neutral-400">{stat.label}</p>
                  <p className={`text-xl font-bold ${stat.tone}`}>{stat.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-4 text-[11px] text-neutral-400">
            <span className="inline-flex items-center gap-1.5">
              <History className="w-3 h-3 text-cyan-300" /> {overall.todaySessions} phiên hôm nay
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-amber-300" /> +{overall.xpThisWeek} XP trong 7 ngày
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Info className="w-3 h-3" /> Cần đăng nhập để lưu tiến độ lên máy chủ
            </span>
          </div>
        </header>

        {/* ---------------------------- Bảng lịch ôn ---------------------------- */}
        <div className="grid lg:grid-cols-[1.6fr_1fr] gap-5">
          <div className="liquid-glass rounded-3xl border border-white/12 bg-[#0c1218]/70 p-4 sm:p-5">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 bg-white/[0.06] border border-white/10 rounded-2xl p-1">
                {TABS.map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    aria-pressed={activeTab === tab.id}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-colors cursor-pointer inline-flex items-center gap-1.5 ${
                      activeTab === tab.id
                        ? 'bg-amber-400 text-neutral-950'
                        : 'text-neutral-300 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {tab.icon}
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                ))}
              </div>

              {activeTab !== 'history' && (
                <div className="flex items-center gap-2 ml-auto flex-wrap">
                  <label className="relative">
                    <span className="sr-only">Tìm bộ thẻ</span>
                    <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="search"
                      value={query}
                      maxLength={80}
                      onChange={e => setQuery(e.target.value)}
                      placeholder="Tìm bộ thẻ, người tạo..."
                      className="rounded-full bg-white/5 border border-white/12 focus:border-amber-400/50 outline-none pl-8 pr-3 py-1.5 text-[11px] text-white placeholder:text-neutral-500 w-44"
                    />
                  </label>
                  <label>
                    <span className="sr-only">Lọc theo môn</span>
                    <select
                      value={subjectFilter}
                      onChange={e => setSubjectFilter(e.target.value as SubjectTag | 'all')}
                      className="rounded-full bg-white/5 border border-white/12 focus:border-amber-400/50 outline-none px-3 py-1.5 text-[11px] text-white [&>option]:bg-[#0c1218]"
                    >
                      <option value="all">Mọi môn học</option>
                      {(Object.keys(SUBJECT_LABELS) as SubjectTag[]).map(tag => (
                        <option key={tag} value={tag}>
                          {SUBJECT_LABELS[tag]}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              )}
            </div>

            {/* Danh sách */}
            <div className="mt-4">
              {activeTab === 'history' ? (
                mySessions.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-white/15 p-8 text-center">
                    <History className="w-7 h-7 text-neutral-500 mx-auto" />
                    <p className="text-xs text-neutral-400 mt-2">
                      Chưa có phiên ôn tập nào. Hãy hoàn thành một phiên để theo dõi tiến độ tại đây.
                    </p>
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {mySessions.map(session => (
                      <li
                        key={session.id}
                        className="rounded-2xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 flex items-center gap-3"
                      >
                        <span
                          className={`w-8 h-8 rounded-2xl border flex items-center justify-center shrink-0 ${
                            session.mode === 'quiz'
                              ? 'bg-cyan-500/15 border-cyan-400/30 text-cyan-300'
                              : 'bg-amber-500/15 border-amber-400/30 text-amber-300'
                          }`}
                        >
                          {session.mode === 'quiz' ? <Target className="w-4 h-4" /> : <Layers className="w-4 h-4" />}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-white truncate">{session.deckTitle}</p>
                          <p className="text-[11px] text-neutral-400">
                            {session.mode === 'quiz'
                              ? `Luyện đề • đúng ${session.correct}/${session.total} (${session.scorePct}%)`
                              : `Ôn thẻ • nhớ đúng ${session.scorePct}%`}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs font-bold text-amber-300">+{session.xpAwarded} XP</p>
                          <p className="text-[10px] text-neutral-500">{formatDateTime(session.createdAt)}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )
              ) : scopedDecks.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-white/15 p-8 text-center space-y-2">
                  <BookOpen className="w-7 h-7 text-neutral-500 mx-auto" />
                  <p className="text-sm font-semibold text-white">
                    {activeTab === 'mine'
                      ? 'Bạn chưa có bộ thẻ nào'
                      : activeTab === 'starred'
                      ? 'Chưa lưu bộ thẻ nào'
                      : 'Chưa có bộ thẻ công khai phù hợp'}
                  </p>
                  <p className="text-[11px] text-neutral-400 max-w-md mx-auto">
                    {activeTab === 'mine'
                      ? 'Tạo bộ thẻ đầu tiên cho môn bạn đang cần ôn — ví dụ công thức, từ vựng hoặc mốc sự kiện lịch sử.'
                      : 'Thử đổi từ khoá tìm kiếm hoặc bộ lọc môn học để xem thêm bộ thẻ của học sinh khác.'}
                  </p>
                  {activeTab === 'mine' && (
                    <button
                      type="button"
                      onClick={openCreate}
                      className="text-xs px-4 py-2 rounded-full bg-white text-neutral-900 font-bold hover:bg-neutral-200 transition-colors cursor-pointer inline-flex items-center gap-1.5 mt-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Tạo bộ thẻ mới
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-3">
                  {scopedDecks.map(deck => (
                    <DeckCard
                      key={deck.id}
                      deck={deck}
                      isOwner={deck.ownerId === myId}
                      starred={(deck.starredBy ?? []).includes(myId)}
                      currentUserId={myId}
                      onReview={setReviewDeck}
                      onQuiz={setQuizDeck}
                      onEdit={openEdit}
                      onClone={deckToClone => onCloneDeck(deckToClone.id)}
                      onDelete={handleDelete}
                      onToggleStar={deckToStar => onToggleStar(deckToStar.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ---------------------------- Cột phải ---------------------------- */}
          <div className="space-y-5">
            {/* XP 7 ngày */}
            <div className="liquid-glass rounded-3xl border border-white/12 bg-[#0c1218]/70 p-4 sm:p-5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                XP ôn tập 7 ngày gần nhất
              </h2>
              <div className="mt-4 flex items-end gap-2 h-28">
                {weeklyChart.days.map((day, index) => (
                  <div key={index} className="flex-1 flex flex-col items-center gap-1.5">
                    <span className="text-[10px] text-neutral-400 font-mono">{day.xp > 0 ? day.xp : ''}</span>
                    <div
                      className={`w-full rounded-t-lg transition-all duration-500 ${
                        day.isToday ? 'bg-gradient-to-t from-amber-500 to-amber-200' : 'bg-white/15'
                      }`}
                      style={{ height: `${Math.max(4, (day.xp / weeklyChart.max) * 76)}px` }}
                    />
                    <span className={`text-[10px] ${day.isToday ? 'text-amber-300 font-bold' : 'text-neutral-500'}`}>
                      {day.label}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-neutral-400 mt-3">
                Mỗi lượt ôn thẻ đúng được +2 XP, câu trắc nghiệm đúng được +4 XP, thêm thưởng khi đạt từ 80%.
              </p>
            </div>

            {/* Cách hoạt động */}
            <div className="liquid-glass rounded-3xl border border-white/12 bg-[#0c1218]/70 p-4 sm:p-5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
                <Info className="w-3.5 h-3.5 text-cyan-300" />
                Nhịp ôn tập của bạn
              </h2>
              <ul className="mt-3 space-y-1.5 text-[11px]">
                {STUDY_BOX_INTERVALS_MS.map((interval, box) => (
                  <li
                    key={box}
                    className="flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.03] px-3 py-1.5"
                  >
                    <span className="text-neutral-300">
                      Hộp {box} {box === MASTERED_BOX && <span className="text-emerald-300">• đã thuộc</span>}
                    </span>
                    <span className="font-mono text-neutral-200">
                      {box === 0 ? 'ôn lại ngay' : formatInterval(interval)}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="text-[11px] text-neutral-400 mt-3 leading-relaxed">
                Trả lời “Được” hoặc “Dễ” để đẩy thẻ lên hộp cao hơn, “Quên rồi” sẽ đưa thẻ về hộp 0 và xuất hiện
                lại ngay trong phiên hiện tại.
              </p>
            </div>

            {/* Học sinh khác */}
            <div className="liquid-glass rounded-3xl border border-white/12 bg-[#0c1218]/70 p-4 sm:p-5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-emerald-300" />
                Bộ thẻ cộng đồng mới nhất
              </h2>
              <ul className="mt-3 space-y-2">
                {decks
                  .filter(deck => deck.isPublic && deck.ownerId !== myId)
                  .sort((a, b) => b.updatedAt - a.updatedAt)
                  .slice(0, 4)
                  .map(deck => (
                    <li key={deck.id}>
                      <button
                        type="button"
                        onClick={() => setActiveTab('explore')}
                        className="w-full text-left rounded-2xl border border-white/10 bg-white/[0.03] hover:border-amber-400/30 px-3 py-2 transition-colors cursor-pointer flex items-center gap-2"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block text-xs font-semibold text-white truncate">{deck.title}</span>
                          <span className="block text-[10px] text-neutral-400 truncate">
                            {deck.ownerName} • {deck.cards.length} thẻ
                          </span>
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                      </button>
                    </li>
                  ))}
                {decks.filter(deck => deck.isPublic && deck.ownerId !== myId).length === 0 && (
                  <li className="rounded-2xl border border-dashed border-white/12 px-3 py-4 text-center text-[11px] text-neutral-400">
                    Chưa có bộ thẻ công khai nào khác. Bộ thẻ bạn đánh dấu “chia sẻ cho cộng đồng” sẽ xuất hiện tại
                    đây cho các bạn khác.
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* ---------------------------- Modals ---------------------------- */}
      {isEditorOpen && (
        <DeckEditorModal
          key={editorDeck?.id || 'new-deck'}
          onClose={() => setIsEditorOpen(false)}
          deck={editorDeck}
          onSubmit={handleEditorSubmit}
          onBulkImport={onImportCards}
          onDelete={deckId => onDeleteDeck(deckId)}
        />
      )}

      {reviewDeck && (
        <ReviewSessionModal
          key={reviewDeck.id}
          deck={reviewDeck}
          onClose={() => setReviewDeck(null)}
          onGradeCard={onGradeCard}
          onFinish={result =>
            onRecordSession({
              deckId: result.deckId,
              mode: 'review',
              correct: result.correct,
              total: result.total,
              xpAwarded: result.xpAwarded,
            })
          }
          onSyncProgress={deckId => onSyncDeck(deckId)}
        />
      )}

      {quizDeck && (
        <QuizSessionModal
          key={quizDeck.id}
          deck={quizDeck}
          onClose={() => setQuizDeck(null)}
          onFinish={result =>
            onRecordSession({
              deckId: result.deckId,
              mode: 'quiz',
              correct: result.correct,
              total: result.total,
              xpAwarded: result.xpAwarded,
            })
          }
        />
      )}
    </section>
  );
};

export default StudyRoomView;
