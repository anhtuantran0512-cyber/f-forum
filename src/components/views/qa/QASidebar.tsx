/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React from 'react';
import { CheckCircle2, Lightbulb, MessageSquare, Trophy } from 'lucide-react';
import type { Question } from '../../../types';
import { MASTER_ADMIN_CONFIG, isMasterAdmin } from '../../../config/admin';
import { DEFAULT_AVATAR, handleImageError } from '../../../utils/mediaFallback';
import { buildQuestionPath } from '../../../utils/qaRoute';
import type { TopSolver } from '../../../utils/qaDetail';
import { isPlainLeftClick } from '../../../utils/qaRouter';
import type { OpenAuthor } from './authors';

/* ───────────── Câu hỏi liên quan ───────────── */

interface RelatedItemProps {
  question: Question;
  solutionCount: number;
  onOpen: (question: Question) => void;
  /** `rail`: thẻ rộng cố định cho dải cuộn ngang (máy tính bảng / điện thoại). */
  variant: 'list' | 'rail';
}

const RelatedItem: React.FC<RelatedItemProps> = ({ question, solutionCount, onOpen, variant }) => (
  <a
    href={buildQuestionPath(question.id, question.title)}
    /* Link thật: chuột giữa / Ctrl+click vẫn mở tab mới; click thường thì điều hướng trong app. */
    onClick={(e) => {
      if (!isPlainLeftClick(e)) return;
      e.preventDefault();
      onOpen(question);
    }}
    className={`group block rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-cyan-400/40 transition-colors p-3 ${
      variant === 'rail' ? 'w-64 shrink-0 snap-start' : ''
    }`}
  >
    <span className="block text-sm font-semibold text-white group-hover:text-cyan-300 transition-colors line-clamp-2 [overflow-wrap:anywhere]">
      {question.title}
    </span>
    <span className="mt-1.5 flex items-center gap-2 text-[11px] text-neutral-400 font-mono">
      <span className="px-1.5 py-0.5 rounded bg-white/10 text-neutral-300">#{question.subject}</span>
      <span className="inline-flex items-center gap-1">
        <MessageSquare className="w-3 h-3" aria-hidden="true" />
        {solutionCount}
      </span>
      {question.isSolved && (
        <span className="inline-flex items-center gap-1 text-emerald-300">
          <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
          Đã giải
        </span>
      )}
    </span>
  </a>
);

interface RelatedQuestionsProps {
  questions: Question[];
  solutionCounts: Record<string, number>;
  onOpen: (question: Question) => void;
  variant: 'list' | 'rail';
}

export const RelatedQuestions: React.FC<RelatedQuestionsProps> = ({ questions, solutionCounts, onOpen, variant }) => (
  <section aria-labelledby={`qa-related-${variant}`} className="space-y-2.5">
    <h2 id={`qa-related-${variant}`} className="flex items-center gap-2 text-sm font-bold text-white uppercase tracking-wide">
      <Lightbulb className="w-4 h-4 text-amber-400" aria-hidden="true" />
      {variant === 'rail' ? (
        <>
          <span className="md:hidden">Có thể bạn quan tâm</span>
          <span className="hidden md:inline">Câu hỏi liên quan</span>
        </>
      ) : (
        'Câu hỏi liên quan'
      )}
    </h2>
    {questions.length === 0 ? (
      <p className="text-xs text-neutral-400 leading-relaxed">
        Chưa có câu hỏi nào cùng chủ đề. Khi cộng đồng đặt thêm câu hỏi, gợi ý sẽ xuất hiện ở đây.
      </p>
    ) : variant === 'rail' ? (
      /* scroll-px: snap căn thẻ đầu theo lề trang (nếu không nó dính sát mép màn hình) */
      <div className="-mx-4 px-4 scroll-px-4 sm:-mx-8 sm:px-8 sm:scroll-px-8 flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 scrollbar-none">
        {questions.map((question) => (
          <RelatedItem key={question.id} question={question} solutionCount={solutionCounts[question.id] || 0} onOpen={onOpen} variant="rail" />
        ))}
      </div>
    ) : (
      <ul className="space-y-2">
        {questions.map((question) => (
          <li key={question.id}>
            <RelatedItem question={question} solutionCount={solutionCounts[question.id] || 0} onOpen={onOpen} variant="list" />
          </li>
        ))}
      </ul>
    )}
  </section>
);

/* ───────────── Top người giải tuần này ───────────── */

const RANK_STYLE = [
  'bg-amber-400 text-neutral-950',
  'bg-slate-300 text-neutral-900',
  'bg-orange-400 text-neutral-950',
];

interface TopSolversProps {
  solvers: TopSolver[];
  onOpenAuthor: OpenAuthor;
  idSuffix: string;
}

export const TopSolvers: React.FC<TopSolversProps> = ({ solvers, onOpenAuthor, idSuffix }) => (
  <section aria-labelledby={`qa-top-${idSuffix}`} className="space-y-2.5">
    <h2 id={`qa-top-${idSuffix}`} className="flex items-center gap-2 text-sm font-bold text-white uppercase tracking-wide">
      <Trophy className="w-4 h-4 text-amber-400" aria-hidden="true" />
      Top người giải tuần này
    </h2>
    {solvers.length === 0 ? (
      <p className="text-xs text-neutral-400 leading-relaxed">
        Tuần này chưa có ai gửi lời giải. Hãy là người đầu tiên lên bảng!
      </p>
    ) : (
      <ol className="space-y-1.5">
        {solvers.map((solver, index) => {
          const isAdmin = isMasterAdmin(solver.email);
          const name = isAdmin ? MASTER_ADMIN_CONFIG.name : solver.name;
          const avatar = isAdmin ? MASTER_ADMIN_CONFIG.avatar : solver.avatar;
          return (
            <li key={solver.key}>
              <button
                type="button"
                onClick={(e) =>
                  onOpenAuthor(
                    { id: solver.authorId, name, avatar, email: solver.email, level: isAdmin ? 150 : solver.level },
                    { x: e.clientX, y: e.clientY },
                  )
                }
                className="w-full flex items-center gap-2.5 rounded-xl px-2 py-1.5 text-left hover:bg-white/10 transition-colors cursor-pointer"
                title="Xem hồ sơ người giải bài"
              >
                <span
                  className={`shrink-0 w-6 h-6 rounded-full grid place-items-center text-[11px] font-extrabold ${
                    RANK_STYLE[index] ?? 'bg-white/10 text-neutral-300'
                  }`}
                  aria-label={`Hạng ${index + 1}`}
                >
                  {index + 1}
                </span>
                <img
                  src={avatar}
                  alt=""
                  onError={(e) => handleImageError(e, DEFAULT_AVATAR)}
                  loading="lazy"
                  decoding="async"
                  width={28}
                  height={28}
                  className="w-7 h-7 rounded-full object-cover shrink-0"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-white">{name}</span>
                  <span className="block text-[11px] text-neutral-400 font-mono">
                    {solver.solved} lời giải{solver.best > 0 ? ` · ${solver.best} đáp án chuẩn` : ''}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    )}
  </section>
);
