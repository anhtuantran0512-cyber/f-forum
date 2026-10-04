/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React, { useMemo, useState } from 'react';
import {
  Rocket,
  Sparkles,
  Bug,
  ShieldCheck,
  Wrench,
  Send,
  CheckCircle2,
  Compass,
  Layers,
  Users,
  HelpCircle,
  BookOpen,
  MessageSquare,
  ChevronRight,
  CircleDot,
} from 'lucide-react';
import type { DimensionView, FeedbackSubmission, ReleaseHighlight, User } from '../../types';
import {
  CURRENT_RELEASE_DATE,
  CURRENT_VERSION,
  RELEASES,
  RELEASE_KIND_META,
  ROADMAP,
  ROADMAP_STATUS_META,
} from '../../data/changelog';

interface UpdateHubViewProps {
  currentUser: User | null;
  onOpenAuth: () => void;
  onNavigate: (view: DimensionView) => void;
  stats: {
    members: number;
    questions: number;
    solutions: number;
    clubs: number;
    decks: number;
    sessions: number;
  };
  feedbacks: FeedbackSubmission[];
  onSubmitFeedback: (data: { name: string; email: string; category?: string; content: string }) => void;
}

type KindFilter = 'all' | ReleaseHighlight['kind'];

const KIND_ICONS: Record<ReleaseHighlight['kind'], React.ReactNode> = {
  feature: <Sparkles className="w-3 h-3" />,
  improvement: <Wrench className="w-3 h-3" />,
  fix: <Bug className="w-3 h-3" />,
  security: <ShieldCheck className="w-3 h-3" />,
};

const FEATURE_CATEGORIES = ['Đề xuất tính năng', 'Báo lỗi', 'Góp ý giao diện', 'Ý tưởng học tập', 'Góp ý khác'];

export const UpdateHubView: React.FC<UpdateHubViewProps> = ({
  currentUser,
  onOpenAuth,
  onNavigate,
  stats,
  feedbacks,
  onSubmitFeedback,
}) => {
  const [kindFilter, setKindFilter] = useState<KindFilter>('all');
  const [name, setName] = useState(currentUser?.name || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [category, setCategory] = useState(FEATURE_CATEGORIES[0]);
  const [content, setContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const totalHighlights = useMemo(
    () => RELEASES.reduce((sum, release) => sum + release.highlights.length, 0),
    [],
  );

  const shippedRoadmap = useMemo(() => ROADMAP.filter(item => item.status === 'shipped').length, []);
  const activeRoadmap = useMemo(() => ROADMAP.filter(item => item.status === 'in-progress').length, []);

  const mySuggestions = useMemo(() => {
    const key = (currentUser?.email || email).toLowerCase();
    if (!key) return [];
    return feedbacks
      .filter(item => item.email.toLowerCase() === key)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      .slice(0, 5);
  }, [feedbacks, currentUser, email]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !email.trim()) {
      setError('Vui lòng nhập họ tên và email để Ban Quản Trị phản hồi lại.');
      return;
    }
    if (content.trim().length < 20) {
      setError('Nội dung cần tối thiểu 20 ký tự để Ban Quản Trị hiểu rõ mong muốn của bạn.');
      return;
    }
    onSubmitFeedback({ name: name.trim(), email: email.trim(), category, content: content.trim() });
    setContent('');
    setError(null);
    setSent(true);
  };

  const platformStats = [
    { label: 'Thành viên', value: stats.members, icon: <Users className="w-3.5 h-3.5 text-cyan-300" /> },
    { label: 'Câu hỏi', value: stats.questions, icon: <HelpCircle className="w-3.5 h-3.5 text-amber-300" /> },
    { label: 'Lời giải', value: stats.solutions, icon: <MessageSquare className="w-3.5 h-3.5 text-emerald-300" /> },
    { label: 'Câu lạc bộ', value: stats.clubs, icon: <Compass className="w-3.5 h-3.5 text-violet-300" /> },
    { label: 'Bộ thẻ ôn tập', value: stats.decks, icon: <Layers className="w-3.5 h-3.5 text-rose-300" /> },
    { label: 'Phiên ôn tập', value: stats.sessions, icon: <BookOpen className="w-3.5 h-3.5 text-sky-300" /> },
  ];

  return (
    <section className="relative min-h-screen w-full text-white px-3 sm:px-6 pt-24 sm:pt-28 pb-28">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-40 left-1/3 w-[460px] h-[460px] rounded-full bg-amber-500/10 blur-[130px]" />
        <div className="absolute bottom-0 right-0 w-[380px] h-[380px] rounded-full bg-cyan-500/10 blur-[130px]" />
      </div>

      <div className="relative max-w-6xl mx-auto space-y-5">
        {/* ------------------------------ Hero ------------------------------ */}
        <header className="liquid-glass rounded-3xl border border-white/12 bg-[#0c1218]/80 p-5 sm:p-7 overflow-hidden">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.25em] text-emerald-300 border border-emerald-400/25 bg-emerald-500/10 rounded-full px-3 py-1">
                <CircleDot className="w-3 h-3" />
                Bản phát hành {CURRENT_VERSION} • {CURRENT_RELEASE_DATE.split('-').reverse().join('/')}
              </span>
              <h1 className="text-2xl sm:text-3xl font-bold mt-3 leading-tight">
                Bảng tin{' '}
                <span className="bg-gradient-to-r from-amber-200 via-amber-300 to-emerald-200 bg-clip-text text-transparent">
                  Cập nhật F-Forum
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-neutral-300 mt-2 leading-relaxed">
                Mọi thay đổi của nền tảng đều được ghi lại công khai: đã làm gì, đang làm gì và sắp tới sẽ làm gì.
                Bạn cũng có thể gửi đề xuất trực tiếp cho Ban Quản Trị ngay tại đây.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
                {[
                  { label: 'Bản phát hành', value: RELEASES.length },
                  { label: 'Thay đổi đã ghi', value: totalHighlights },
                  { label: 'Đã hoàn thành', value: shippedRoadmap },
                  { label: 'Đang triển khai', value: activeRoadmap },
                ].map(item => (
                  <div key={item.label} className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2">
                    <p className="text-[10px] uppercase tracking-wider text-neutral-400">{item.label}</p>
                    <p className="text-lg font-bold text-white">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => onNavigate('study')}
                className="text-xs px-4 py-2.5 rounded-2xl bg-white text-neutral-900 font-bold hover:bg-neutral-200 transition-colors cursor-pointer inline-flex items-center justify-center gap-1.5"
              >
                <BookOpen className="w-3.5 h-3.5" />
                Khám phá Phòng Ôn Tập mới
              </button>
              <button
                type="button"
                onClick={() => onNavigate('home')}
                className="text-xs px-4 py-2.5 rounded-2xl border border-white/15 text-neutral-200 hover:bg-white/10 transition-colors cursor-pointer inline-flex items-center justify-center gap-1.5"
              >
                <Compass className="w-3.5 h-3.5" />
                Về trang chủ
              </button>
              {!currentUser && (
                <button
                  type="button"
                  onClick={onOpenAuth}
                  className="text-xs px-4 py-2.5 rounded-2xl border border-amber-400/35 text-amber-200 hover:bg-amber-500/15 transition-colors cursor-pointer inline-flex items-center justify-center gap-1.5"
                >
                  <Rocket className="w-3.5 h-3.5" />
                  Tạo tài khoản học sinh
                </button>
              )}
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {platformStats.map(item => (
              <div key={item.label} className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2">
                <p className="text-[10px] uppercase tracking-wider text-neutral-400 flex items-center gap-1">
                  {item.icon}
                  {item.label}
                </p>
                <p className="text-base font-bold text-white">{item.value.toLocaleString('vi-VN')}</p>
              </div>
            ))}
          </div>
        </header>

        <div className="grid lg:grid-cols-[1.5fr_1fr] gap-5">
          {/* --------------------------- Nhật ký phát hành --------------------------- */}
          <div className="liquid-glass rounded-3xl border border-white/12 bg-[#0c1218]/70 p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
                <Rocket className="w-3.5 h-3.5 text-amber-300" />
                Nhật ký phát hành
              </h2>
              <div className="flex items-center gap-1 bg-white/[0.06] border border-white/10 rounded-2xl p-1">
                {([
                  { id: 'all', label: 'Tất cả' },
                  { id: 'feature', label: 'Tính năng' },
                  { id: 'improvement', label: 'Cải tiến' },
                  { id: 'fix', label: 'Sửa lỗi' },
                  { id: 'security', label: 'Bảo mật' },
                ] as { id: KindFilter; label: string }[]).map(chip => (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => setKindFilter(chip.id)}
                    aria-pressed={kindFilter === chip.id}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold transition-colors cursor-pointer ${
                      kindFilter === chip.id
                        ? 'bg-amber-400 text-neutral-950'
                        : 'text-neutral-300 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>

            <ol className="mt-4 space-y-3 relative">
              {RELEASES.map((release, index) => {
                const highlights = release.highlights.filter(
                  item => kindFilter === 'all' || item.kind === kindFilter,
                );
                if (highlights.length === 0) return null;

                return (
                  <li key={release.version} className="relative pl-6">
                    {/* Trục thời gian */}
                    <span
                      className={`absolute left-0 top-3 w-2.5 h-2.5 rounded-full ${
                        index === 0 ? 'bg-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.8)]' : 'bg-white/25'
                      }`}
                    />
                    {index !== RELEASES.length - 1 && (
                      <span className="absolute left-[4.5px] top-6 bottom-[-14px] w-px bg-white/12" aria-hidden="true" />
                    )}

                    <article className="rounded-3xl border border-white/10 bg-white/[0.03] p-3.5 sm:p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-white font-mono">v{release.version}</span>
                        <span className="text-[10px] text-neutral-400 font-mono">
                          {release.date.split('-').reverse().join('/')}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full border border-amber-400/25 bg-amber-500/10 text-amber-200">
                          {release.codename}
                        </span>
                        {index === 0 && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full border border-emerald-400/30 bg-emerald-500/10 text-emerald-200 font-semibold">
                            Mới nhất
                          </span>
                        )}
                      </div>

                      <h3 className="text-sm font-bold text-white mt-2">{release.title}</h3>
                      <p className="text-[11px] text-neutral-300 mt-1 leading-relaxed">{release.summary}</p>

                      <ul className="mt-2.5 space-y-1.5">
                        {highlights.map((item, itemIndex) => {
                          const meta = RELEASE_KIND_META[item.kind];
                          return (
                            <li key={itemIndex} className="flex items-start gap-2">
                              <span
                                className={`shrink-0 mt-0.5 text-[9px] font-bold uppercase tracking-wider border rounded-full px-2 py-0.5 inline-flex items-center gap-1 ${meta.className}`}
                              >
                                {KIND_ICONS[item.kind]}
                                {meta.label}
                              </span>
                              <span className="text-[11px] text-neutral-200 leading-relaxed">{item.text}</span>
                            </li>
                          );
                        })}
                      </ul>
                    </article>
                  </li>
                );
              })}
            </ol>
          </div>

          {/* --------------------------- Cột phải --------------------------- */}
          <div className="space-y-5">
            {/* Lộ trình */}
            <div className="liquid-glass rounded-3xl border border-white/12 bg-[#0c1218]/70 p-4 sm:p-5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
                <Compass className="w-3.5 h-3.5 text-cyan-300" />
                Lộ trình sắp tới
              </h2>
              <p className="text-[11px] text-neutral-400 mt-1.5 leading-relaxed">
                Tiến độ được Ban Quản Trị cập nhật thủ công — không dùng số liệu ước lượng.
              </p>

              <ul className="mt-3 space-y-2.5">
                {ROADMAP.map(item => {
                  const meta = ROADMAP_STATUS_META[item.status];
                  return (
                    <li key={item.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-xs font-bold text-white">{item.title}</h3>
                        <span
                          className={`shrink-0 text-[9px] font-bold uppercase tracking-wider border rounded-full px-2 py-0.5 ${meta.className}`}
                        >
                          {meta.label}
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-400 mt-1 leading-relaxed">{item.description}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              item.status === 'shipped'
                                ? 'bg-emerald-400'
                                : item.status === 'in-progress'
                                ? 'bg-amber-400'
                                : 'bg-cyan-400/70'
                            }`}
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-mono text-neutral-300 shrink-0">{item.progress}%</span>
                      </div>
                      <p className="text-[10px] text-neutral-500 mt-1.5 flex items-center gap-1">
                        <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                        {item.horizon}
                      </p>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Đề xuất tính năng */}
            <div className="liquid-glass rounded-3xl border border-white/12 bg-[#0c1218]/70 p-4 sm:p-5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
                <Send className="w-3.5 h-3.5 text-emerald-300" />
                Đề xuất tính năng cho F-Forum
              </h2>
              <p className="text-[11px] text-neutral-400 mt-1.5 leading-relaxed">
                Ý kiến được gửi thẳng tới Ban Quản Trị và lưu lại trong hồ sơ của bạn.
              </p>

              {sent && (
                <p
                  role="status"
                  className="mt-3 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-[11px] text-emerald-200 inline-flex items-center gap-2"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Đã gửi thành công. Cảm ơn bạn đã đóng góp cho F-Forum!
                </p>
              )}

              <form onSubmit={handleSubmit} className="mt-3 space-y-2.5">
                <div className="grid sm:grid-cols-2 gap-2.5">
                  <label className="block">
                    <span className="text-[10px] font-semibold text-neutral-300 uppercase tracking-wider">Họ tên</span>
                    <input
                      type="text"
                      value={name}
                      maxLength={60}
                      onChange={e => setName(e.target.value)}
                      placeholder="Nguyễn Văn A"
                      className="mt-1 w-full rounded-2xl bg-white/5 border border-white/12 focus:border-emerald-400/50 outline-none px-3 py-2 text-xs text-white placeholder:text-neutral-500"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[10px] font-semibold text-neutral-300 uppercase tracking-wider">Email</span>
                    <input
                      type="email"
                      value={email}
                      maxLength={120}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="ban@truong.edu.vn"
                      className="mt-1 w-full rounded-2xl bg-white/5 border border-white/12 focus:border-emerald-400/50 outline-none px-3 py-2 text-xs text-white placeholder:text-neutral-500"
                    />
                  </label>
                </div>

                <label className="block">
                  <span className="text-[10px] font-semibold text-neutral-300 uppercase tracking-wider">
                    Loại góp ý
                  </span>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="mt-1 w-full rounded-2xl bg-white/5 border border-white/12 focus:border-emerald-400/50 outline-none px-3 py-2 text-xs text-white [&>option]:bg-[#0c1218]"
                  >
                    {FEATURE_CATEGORIES.map(item => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="text-[10px] font-semibold text-neutral-300 uppercase tracking-wider">
                    Nội dung ({content.trim().length}/20 ký tự tối thiểu)
                  </span>
                  <textarea
                    value={content}
                    maxLength={1200}
                    rows={4}
                    onChange={e => setContent(e.target.value)}
                    placeholder="Ví dụ: Em mong có thêm chế độ ôn thi theo đề của trường, chia theo từng chương và lưu lịch sử điểm."
                    className="mt-1 w-full rounded-2xl bg-white/5 border border-white/12 focus:border-emerald-400/50 outline-none px-3 py-2 text-xs text-white placeholder:text-neutral-500 resize-y"
                  />
                </label>

                {error && (
                  <p role="alert" className="text-[11px] text-rose-300 bg-rose-500/10 border border-rose-400/25 rounded-xl px-3 py-2">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  className="w-full text-xs px-4 py-2.5 rounded-2xl bg-white text-neutral-900 font-bold hover:bg-neutral-200 transition-colors cursor-pointer inline-flex items-center justify-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  Gửi đề xuất tới Ban Quản Trị
                </button>
              </form>

              {mySuggestions.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-[10px] font-bold uppercase tracking-wider text-neutral-300">
                    Góp ý gần đây của bạn
                  </h3>
                  <ul className="mt-2 space-y-1.5">
                    {mySuggestions.map(item => (
                      <li
                        key={item.id}
                        className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2 text-[11px] text-neutral-300"
                      >
                        <span className="text-[10px] text-amber-300 font-semibold">{item.category || 'Góp ý'}</span>
                        <p className="mt-0.5 line-clamp-2">{item.content}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Quy trình cập nhật */}
            <div className="liquid-glass rounded-3xl border border-white/12 bg-[#0c1218]/70 p-4 sm:p-5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-amber-300" />
                F-Forum được cập nhật thế nào?
              </h2>
              <ol className="mt-3 space-y-2 text-[11px] text-neutral-300">
                {[
                  'Mọi thay đổi được viết trên một nhánh phiên làm việc riêng.',
                  'Chạy bộ kiểm thử tự động và kiểm tra kiểu TypeScript trước khi phát hành.',
                  'Mở yêu cầu hợp nhất (Pull Request) để rà soát rồi mới gộp vào nhánh chính.',
                  'Nhánh chính luôn chứa phiên bản mới nhất đang chạy cho học sinh.',
                ].map((step, index) => (
                  <li key={step} className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-amber-500/20 border border-amber-400/30 text-[9px] font-bold text-amber-200 flex items-center justify-center shrink-0 mt-0.5">
                      {index + 1}
                    </span>
                    <span className="leading-relaxed">{step}</span>
                  </li>
                ))}
              </ol>
              <button
                type="button"
                onClick={() => onNavigate('chat')}
                className="mt-3 text-[11px] px-3 py-2 rounded-full border border-white/15 text-neutral-200 hover:bg-white/10 transition-colors cursor-pointer inline-flex items-center gap-1.5"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Góp ý nhanh trong phòng chat
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default UpdateHubView;
