import React from 'react';
import {
  BadgeCheck,
  Bell,
  Compass,
  Flame,
  GraduationCap,
  Heart,
  HelpCircle,
  Home,
  MessageSquare,
  Search,
  Sparkles,
  Trophy,
  Users,
} from 'lucide-react';

/* ==========================================================================
   Lightweight in-browser product mocks (no image payload, fully responsive)
   ========================================================================== */

const Monogram: React.FC<{ label: string; from: string; to: string; size?: string }> = ({
  label,
  from,
  to,
  size = 'h-8 w-8 text-[11px]',
}) => (
  <span
    aria-hidden="true"
    className={`inline-flex shrink-0 items-center justify-center rounded-full font-bold text-black/80 ${size}`}
    style={{ backgroundImage: `linear-gradient(135deg, ${from}, ${to})` }}
  >
    {label}
  </span>
);

const MockSidebarItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}> = ({ icon, label, active }) => (
  <div
    className={`flex items-center gap-2 rounded-xl px-2.5 py-2 text-[11px] font-medium transition-colors ${
      active
        ? 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-400/30'
        : 'text-[var(--ff-text-dim)]'
    }`}
  >
    <span className="shrink-0 [&>svg]:h-3.5 [&>svg]:w-3.5">{icon}</span>
    <span className="truncate">{label}</span>
  </div>
);

/**
 * The hero product mock: a glass "browser window" rendering the F-Forum Q&A
 * surface, with floating chat + level-up cards to convey depth.
 */
export const AppWindowMock: React.FC = () => (
  <div className="relative w-full">
    {/* Ambient glow behind the window */}
    <div
      aria-hidden="true"
      className="absolute -inset-10 rounded-[48px] opacity-70 blur-3xl"
      style={{
        background:
          'radial-gradient(60% 55% at 30% 25%, rgba(251,191,36,0.28), transparent 65%), radial-gradient(50% 50% at 75% 70%, rgba(34,211,238,0.22), transparent 68%)',
      }}
    />

    <div className="ff-glass ff-card relative overflow-hidden rounded-[24px] p-2 shadow-2xl sm:rounded-[28px] sm:p-3">
      {/* Browser chrome */}
      <div className="mb-2 flex items-center gap-2 px-2 pt-1">
        <span className="h-2.5 w-2.5 rounded-full bg-rose-400/80" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
        <div className="mx-auto hidden max-w-[280px] flex-1 items-center gap-2 rounded-full border border-[var(--ff-border)] bg-[var(--ff-surface)] px-3 py-1 sm:flex">
          <Search className="h-3 w-3 text-[var(--ff-text-dim)]" />
          <span className="truncate font-mono text-[10px] text-[var(--ff-text-dim)]">
            f-forum.fpt.edu.vn/hoi-dap
          </span>
        </div>
        <span className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 sm:ml-0">
          <span className="relative flex h-1.5 w-1.5">
            <span className="ff-ping-ring absolute inline-flex h-full w-full rounded-full bg-emerald-400" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
          </span>
          <span className="font-mono text-[9px] font-semibold tracking-widest text-emerald-300">LIVE</span>
        </span>
      </div>

      {/* App shell */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[132px_1fr]">
        {/* Left rail */}
        <div className="hidden flex-col gap-1 rounded-2xl border border-[var(--ff-border)] bg-[var(--ff-surface)]/60 p-2 sm:flex">
          <div className="mb-1 flex items-center gap-2 px-1 py-1">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-tr from-amber-500 to-yellow-200 text-[11px] font-bold text-black">
              F
            </span>
            <span className="ff-brand-serif text-[13px] text-[var(--ff-text)]">F-Forum</span>
          </div>
          <MockSidebarItem icon={<Home />} label="Trang chủ" />
          <MockSidebarItem icon={<HelpCircle />} label="Hỏi đáp" active />
          <MockSidebarItem icon={<Users />} label="Câu lạc bộ" />
          <MockSidebarItem icon={<MessageSquare />} label="Phòng chat" />
          <MockSidebarItem icon={<Compass />} label="Khám phá" />
          <div className="mt-1 rounded-xl border border-[var(--ff-border)] bg-[var(--ff-surface-2)] p-2">
            <div className="flex items-center gap-1.5">
              <Trophy className="h-3 w-3 text-amber-400" />
              <span className="font-mono text-[9px] font-semibold tracking-wider text-amber-300">
                LEVEL 12
              </span>
            </div>
            <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-[var(--ff-border-strong)]">
              <div className="h-full w-[68%] rounded-full bg-gradient-to-r from-amber-300 to-amber-500" />
            </div>
            <p className="mt-1.5 text-[9px] text-[var(--ff-text-dim)]">820 / 1.200 XP</p>
          </div>
        </div>

        {/* Main surface */}
        <div className="relative min-h-[316px] rounded-2xl border border-[var(--ff-border)] bg-[var(--ff-surface)] p-3 sm:min-h-[352px]">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-[10px] font-semibold text-amber-300 ring-1 ring-amber-400/25">
                #toán
              </span>
              <span className="rounded-full bg-sky-500/15 px-2.5 py-1 text-[10px] font-semibold text-sky-300 ring-1 ring-sky-400/25">
                #tin-học
              </span>
              <span className="hidden rounded-full bg-[var(--ff-surface)] px-2.5 py-1 text-[10px] text-[var(--ff-text-dim)] ring-1 ring-[var(--ff-border)] sm:inline-flex">
                Đã giải
              </span>
            </div>
            <Bell className="h-3.5 w-3.5 text-[var(--ff-text-dim)]" />
          </div>

          <div className="mt-3 rounded-2xl border border-[var(--ff-border)] bg-[var(--ff-surface-2)] p-3">
            <div className="flex items-center gap-2">
              <Monogram label="MA" from="#fbbf24" to="#f97316" />
              <div className="min-w-0">
                <p className="flex items-center gap-1 text-[11px] font-semibold text-[var(--ff-text)]">
                  Minh Anh
                  <BadgeCheck className="h-3 w-3 text-sky-400" />
                </p>
                <p className="font-mono text-[9px] text-[var(--ff-text-dim)]">2 phút trước · 46 lượt xem</p>
              </div>
            </div>
            <p className="mt-2.5 text-[13px] font-semibold leading-snug text-[var(--ff-text)]">
              Làm sao để tối ưu thuật toán tìm kiếm nhị phân cho mảng 10⁶ phần tử?
            </p>
            <p className="mt-1.5 line-clamp-2 text-[11px] leading-relaxed text-[var(--ff-text-soft)]">
              Mình đang làm bài tập lớn môn Cấu trúc dữ liệu, thầy yêu cầu tối ưu bộ nhớ đệm khi truy vấn
              liên tục…
            </p>
          </div>

          <div className="mt-2 rounded-2xl border border-emerald-400/25 bg-emerald-400/[0.07] p-3">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                <Sparkles className="h-3 w-3" /> Lời giải hay nhất
              </span>
              <span className="inline-flex items-center gap-1 font-mono text-[10px] text-[var(--ff-text-dim)]">
                <Heart className="h-3 w-3 text-rose-400" /> 128
              </span>
            </div>
            <div className="mt-2 flex items-start gap-2">
              <Monogram label="KB" from="#34d399" to="#22d3ee" size="h-6 w-6 text-[9px]" />
              <p className="text-[11px] leading-relaxed text-[var(--ff-text-soft)]">
                Dùng tìm kiếm nhị phân trên mảng đã sắp xếp kèm bộ nhớ đệm <span className="font-mono text-[10px] text-emerald-300">O(log n)</span> —
                mình gửi kèm snippet và giải thích từng bước nhé.
              </p>
            </div>
          </div>

          <div className="mt-2 flex items-center gap-2 rounded-2xl border border-[var(--ff-border)] bg-[var(--ff-surface-2)] px-3 py-2">
            <Monogram label="+" from="#94a3b8" to="#475569" size="h-5 w-5 text-[10px]" />
            <span className="flex-1 text-[11px] text-[var(--ff-text-dim)]">Viết câu trả lời của bạn…</span>
            <span className="rounded-full bg-gradient-to-r from-amber-300 to-amber-500 px-2.5 py-1 text-[10px] font-bold text-black">
              Gửi
            </span>
          </div>
        </div>
      </div>
    </div>

    {/* Floating card — live chat */}
    <div className="ff-glass ff-float absolute -left-3 bottom-10 hidden w-[196px] rounded-2xl p-3 lg:block">
      <div className="flex items-center gap-1.5">
        <MessageSquare className="h-3 w-3 text-amber-400" />
        <span className="font-mono text-[9px] font-semibold tracking-widest text-[var(--ff-text-dim)]">
          #HÀNH-LANG
        </span>
      </div>
      <div className="mt-2 space-y-1.5">
        <div className="flex items-center gap-1.5">
          <Monogram label="TN" from="#f472b6" to="#a855f7" size="h-5 w-5 text-[9px]" />
          <span className="rounded-xl rounded-bl-sm bg-[var(--ff-surface-2)] px-2 py-1 text-[10px] text-[var(--ff-text-soft)]">
            Ai rủ đi học nhóm không?
          </span>
        </div>
        <div className="flex items-center justify-end gap-1.5">
          <span className="rounded-xl rounded-br-sm bg-amber-500/20 px-2 py-1 text-[10px] text-amber-200">
            Có mình! 19h nhé 🔥
          </span>
        </div>
      </div>
    </div>

    {/* Floating card — XP reward */}
    <div className="ff-glass ff-float-delayed absolute -right-4 top-16 hidden w-[176px] rounded-2xl p-3 lg:block">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-amber-400 to-yellow-200 text-[13px] font-bold text-black">
          <Flame className="h-4 w-4" />
        </span>
        <div>
          <p className="text-[11px] font-bold text-[var(--ff-text)]">Chuỗi 7 ngày!</p>
          <p className="font-mono text-[9px] text-[var(--ff-text-dim)]">+120 XP · Bậc Roman II</p>
        </div>
      </div>
    </div>
  </div>
);

/* ==========================================================================
   Showcase step mocks
   ========================================================================== */

export const QAMock: React.FC = () => (
  <div className="ff-glass ff-card h-full rounded-[22px] p-4">
    <div className="flex items-center gap-2">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-2.5 py-1 text-[10px] font-semibold text-amber-300 ring-1 ring-amber-400/25">
        <HelpCircle className="h-3 w-3" /> Sàn hỏi đáp
      </span>
      <span className="font-mono text-[10px] text-[var(--ff-text-dim)]">13 chủ đề · 4 môn học</span>
    </div>
    <div className="mt-3 space-y-2">
      {[
        { tag: 'Toán', title: 'Chứng minh bất đẳng thức Cauchy bằng quy nạp?', meta: '3 lời giải · 12 phút', from: '#fbbf24', to: '#f97316', label: 'HN' },
        { tag: 'Anh văn', title: 'Mẹo nhớ 200 từ vựng IELTS trong 2 tuần?', meta: 'Lời giải hay nhất · 1 giờ', from: '#38bdf8', to: '#818cf8', label: 'TL' },
        { tag: 'Tin học', title: 'Node.js hay Python cho đồ án web học kỳ này?', meta: 'Đang tranh luận · 24 phút', from: '#34d399', to: '#22d3ee', label: 'QA' },
      ].map((row) => (
        <div
          key={row.title}
          className="flex items-start gap-3 rounded-2xl border border-[var(--ff-border)] bg-[var(--ff-surface-2)] p-3"
        >
          <Monogram label={row.label} from={row.from} to={row.to} size="h-7 w-7 text-[10px]" />
          <div className="min-w-0">
            <p className="truncate text-[12px] font-semibold text-[var(--ff-text)]">{row.title}</p>
            <p className="mt-0.5 font-mono text-[9.5px] text-[var(--ff-text-dim)]">
              #{row.tag} · {row.meta}
            </p>
          </div>
        </div>
      ))}
    </div>
    <div className="mt-3 flex items-center gap-2 rounded-2xl border border-dashed border-[var(--ff-border-strong)] px-3 py-2 text-[11px] text-[var(--ff-text-dim)]">
      <Sparkles className="h-3.5 w-3.5 text-amber-400" />
      Hỏi ẩn danh với bút danh Ghibli nếu bạn ngại ngùng
    </div>
  </div>
);

export const ClubsMock: React.FC = () => (
  <div className="ff-glass ff-card h-full rounded-[22px] p-4">
    <div className="flex items-center gap-2">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-500/15 px-2.5 py-1 text-[10px] font-semibold text-sky-300 ring-1 ring-sky-400/25">
        <Users className="h-3 w-3" /> Câu lạc bộ
      </span>
      <span className="font-mono text-[10px] text-[var(--ff-text-dim)]">Công nghệ · Nghệ thuật · Thể thao</span>
    </div>
    <div className="mt-3 grid grid-cols-2 gap-2">
      {[
        { name: 'CLB Lập trình', members: '128 thành viên', from: '#fbbf24', to: '#f97316' },
        { name: 'CLB Truyền thông', members: '96 thành viên', from: '#f472b6', to: '#a855f7' },
        { name: 'CLB Bóng rổ', members: '74 thành viên', from: '#38bdf8', to: '#22d3ee' },
        { name: 'CLB Học thuật', members: '152 thành viên', from: '#34d399', to: '#4ade80' },
      ].map((club) => (
        <div
          key={club.name}
          className="overflow-hidden rounded-2xl border border-[var(--ff-border)] bg-[var(--ff-surface-2)]"
        >
          <div
            className="h-14 w-full"
            style={{ backgroundImage: `linear-gradient(135deg, ${club.from}33, ${club.to}55)` }}
          />
          <div className="p-2.5">
            <p className="truncate text-[11.5px] font-semibold text-[var(--ff-text)]">{club.name}</p>
            <p className="mt-0.5 font-mono text-[9px] text-[var(--ff-text-dim)]">{club.members}</p>
            <span className="mt-2 inline-flex items-center rounded-full bg-[var(--ff-surface)] px-2 py-0.5 text-[9px] font-semibold text-[var(--ff-text-soft)] ring-1 ring-[var(--ff-border)]">
              Tham gia
            </span>
          </div>
        </div>
      ))}
    </div>
    <div className="mt-3 flex items-center gap-2 rounded-2xl border border-[var(--ff-border)] bg-[var(--ff-surface-2)] p-3">
      <GraduationCap className="h-4 w-4 shrink-0 text-amber-400" />
      <p className="text-[11px] text-[var(--ff-text-soft)]">
        Ban Quản Trị duyệt câu lạc bộ trong 24h — minh bạch, có phản hồi lý do.
      </p>
    </div>
  </div>
);

export const ArenaMock: React.FC = () => (
  <div className="ff-glass ff-card h-full rounded-[22px] p-4">
    <div className="flex items-center gap-2">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-500/15 px-2.5 py-1 text-[10px] font-semibold text-violet-300 ring-1 ring-violet-400/25">
        <Trophy className="h-3 w-3" /> Đấu trường tri thức
      </span>
      <span className="font-mono text-[10px] text-[var(--ff-text-dim)]">8 danh hiệu · 150 cấp độ</span>
    </div>

    <div className="mt-3 space-y-1.5">
      {[
        { rank: '01', name: 'Trần Văn Anh Tuấn', xp: '18.420 Coin', badge: 'Chuyên Gia', from: '#fbbf24', to: '#f97316', label: 'TA' },
        { rank: '02', name: 'Nguyễn Khánh Linh', xp: '16.980 Coin', badge: 'Bậc Thầy', from: '#38bdf8', to: '#818cf8', label: 'KL' },
        { rank: '03', name: 'Lê Minh Quân', xp: '15.310 Coin', badge: 'Thiên Tài', from: '#34d399', to: '#22d3ee', label: 'MQ' },
      ].map((row) => (
        <div
          key={row.rank}
          className="flex items-center gap-2.5 rounded-2xl border border-[var(--ff-border)] bg-[var(--ff-surface-2)] p-2.5"
        >
          <span className="font-mono text-[11px] font-bold text-amber-300">{row.rank}</span>
          <Monogram label={row.label} from={row.from} to={row.to} size="h-7 w-7 text-[10px]" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11.5px] font-semibold text-[var(--ff-text)]">{row.name}</p>
            <p className="font-mono text-[9px] text-[var(--ff-text-dim)]">{row.badge}</p>
          </div>
          <span className="font-mono text-[10px] font-semibold text-[var(--ff-text-soft)]">{row.xp}</span>
        </div>
      ))}
    </div>

    <div className="mt-3 grid grid-cols-3 gap-2">
      {[
        { icon: <Flame className="h-3.5 w-3.5" />, label: 'Chuỗi ngày', value: '12' },
        { icon: <Trophy className="h-3.5 w-3.5" />, label: 'Huy hiệu', value: '08' },
        { icon: <Sparkles className="h-3.5 w-3.5" />, label: 'Điểm F', value: '640' },
      ].map((stat) => (
        <div
          key={stat.label}
          className="rounded-2xl border border-[var(--ff-border)] bg-[var(--ff-surface-2)] p-2 text-center"
        >
          <span className="mx-auto flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/15 text-amber-300">
            {stat.icon}
          </span>
          <p className="mt-1 text-[13px] font-bold text-[var(--ff-text)]">{stat.value}</p>
          <p className="font-mono text-[8.5px] text-[var(--ff-text-dim)]">{stat.label}</p>
        </div>
      ))}
    </div>
  </div>
);
