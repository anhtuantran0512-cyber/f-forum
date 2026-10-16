/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React from 'react';
import {
  BookOpen,
  BookOpenCheck,
  Bookmark,
  FileText,
  HelpCircle,
  Home,
  MessageSquare,
  Paperclip,
  Search,
  Users,
} from 'lucide-react';

/* Lightweight illustrative product surfaces; all sample content is labelled. */

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

const ExampleLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="rounded-full border border-amber-400/25 bg-amber-500/10 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-amber-300">
    {children}
  </span>
);

/** The hero uses an illustrative Q&A view, not live community content. */
export const AppWindowMock: React.FC = () => (
  <div className="relative w-full">
    <div
      aria-hidden="true"
      className="absolute -inset-10 rounded-[48px] opacity-70 blur-3xl"
      style={{
        background:
          'radial-gradient(60% 55% at 30% 25%, rgba(251,191,36,0.26), transparent 65%), radial-gradient(50% 50% at 75% 70%, rgba(129,178,154,0.18), transparent 68%)',
      }}
    />

    <div className="ff-glass ff-card relative overflow-hidden rounded-[24px] p-2 shadow-2xl sm:rounded-[28px] sm:p-3">
      <div className="mb-2 flex items-center gap-2 px-2 pt-1">
        <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-rose-400/80" />
        <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
        <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
        <div className="mx-auto hidden max-w-[280px] flex-1 items-center gap-2 rounded-full border border-[var(--ff-border)] bg-[var(--ff-surface)] px-3 py-1 sm:flex">
          <Search className="h-3 w-3 text-[var(--ff-text-dim)]" />
          <span className="truncate font-mono text-[10px] text-[var(--ff-text-dim)]">F-Forum / Hỏi đáp</span>
        </div>
        <span className="ml-auto sm:ml-0">
          <ExampleLabel>Nội dung minh họa</ExampleLabel>
        </span>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[132px_1fr]">
        <div className="hidden flex-col gap-1 rounded-2xl border border-[var(--ff-border)] bg-[var(--ff-surface)]/60 p-2 sm:flex">
          <div className="mb-1 flex items-center gap-2 px-1 py-1">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-tr from-amber-500 to-yellow-200 text-[11px] font-bold text-black">
              F
            </span>
            <span className="ff-brand-serif text-[13px] text-[var(--ff-text)]">F-Forum</span>
          </div>
          <MockSidebarItem icon={<Home />} label="Trang chủ" />
          <MockSidebarItem icon={<HelpCircle />} label="Hỏi đáp" active />
          <MockSidebarItem icon={<BookOpen />} label="Kho đề" />
          <MockSidebarItem icon={<Users />} label="Câu lạc bộ" />
          <MockSidebarItem icon={<Bookmark />} label="Đã lưu" />
          <div className="mt-1 rounded-xl border border-[var(--ff-border)] bg-[var(--ff-surface-2)] p-2.5">
            <BookOpenCheck className="h-4 w-4 text-amber-400" aria-hidden="true" />
            <p className="mt-2 text-[10px] font-semibold text-[var(--ff-text)]">Cùng học, cùng kiểm tra</p>
            <p className="mt-1 text-[9px] leading-relaxed text-[var(--ff-text-dim)]">
              Trao đổi là điểm bắt đầu; hãy đối chiếu với tài liệu môn học.
            </p>
          </div>
        </div>

        <div className="relative min-h-[316px] rounded-2xl border border-[var(--ff-border)] bg-[var(--ff-surface)] p-3 sm:min-h-[352px]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-[10px] font-semibold text-amber-300 ring-1 ring-amber-400/25">
                #tin-học
              </span>
              <span className="rounded-full bg-[#81b29a]/15 px-2.5 py-1 text-[10px] font-semibold text-[#81b29a] ring-1 ring-[#81b29a]/35">
                #cấu-trúc-dữ-liệu
              </span>
            </div>
            <ExampleLabel>Câu hỏi mẫu</ExampleLabel>
          </div>

          <div className="mt-3 rounded-2xl border border-[var(--ff-border)] bg-[var(--ff-surface-2)] p-3">
            <p className="text-[13px] font-semibold leading-snug text-[var(--ff-text)]">
              Vì sao tìm kiếm nhị phân cần dữ liệu đã được sắp xếp?
            </p>
            <p className="mt-2 text-[11px] leading-relaxed text-[var(--ff-text-soft)]">
              Mình hiểu mỗi bước có thể bỏ qua một nửa dãy, nhưng chưa rõ điều gì cho phép chọn đúng nửa cần giữ lại.
            </p>
          </div>

          <div className="mt-2 rounded-2xl border border-emerald-400/25 bg-emerald-400/[0.07] p-3">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
              <BookOpenCheck className="h-3.5 w-3.5" aria-hidden="true" />
              Một cách giải thích
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-[var(--ff-text-soft)]">
              Thứ tự cho biết giá trị cần tìm nằm về phía nào sau mỗi lần so sánh. Nếu dãy chưa sắp xếp, loại bỏ một nửa
              có thể đồng nghĩa với bỏ luôn đáp án.
            </p>
          </div>

          <div className="mt-2 flex items-center gap-2 rounded-2xl border border-[var(--ff-border)] bg-[var(--ff-surface-2)] px-3 py-2">
            <MessageSquare className="h-4 w-4 shrink-0 text-[var(--ff-text-dim)]" aria-hidden="true" />
            <span className="flex-1 text-[11px] text-[var(--ff-text-dim)]">Thêm một cách giải thích…</span>
            <span className="rounded-full bg-gradient-to-r from-amber-300 to-amber-500 px-2.5 py-1 text-[10px] font-bold text-black">
              Gửi
            </span>
          </div>
        </div>
      </div>
    </div>

    <div className="ff-glass absolute -left-3 bottom-8 hidden w-[208px] rounded-2xl p-3 lg:block">
      <div className="flex items-start gap-2">
        <BookOpenCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" aria-hidden="true" />
        <p className="text-[11px] leading-relaxed text-[var(--ff-text-soft)]">
          Một lời giải tốt cho thấy <span className="font-semibold text-[var(--ff-text)]">vì sao</span>, không chỉ nêu đáp án.
        </p>
      </div>
    </div>

    <div className="ff-glass absolute -right-3 top-16 hidden max-w-[176px] rounded-2xl p-3 lg:block">
      <div className="flex items-center gap-2">
        <Paperclip className="h-4 w-4 text-[#81b29a]" aria-hidden="true" />
        <p className="text-[10px] leading-relaxed text-[var(--ff-text-soft)]">Đính kèm đề bài khi cần thêm ngữ cảnh.</p>
      </div>
    </div>
  </div>
);

/* Illustrative showcase surfaces. None of the rows below represent live records. */
export const QAMock: React.FC = () => (
  <div className="ff-glass ff-card h-full rounded-[22px] p-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-2.5 py-1 text-[10px] font-semibold text-amber-300 ring-1 ring-amber-400/25">
        <HelpCircle className="h-3 w-3" aria-hidden="true" /> Hỏi đáp theo môn
      </span>
      <ExampleLabel>Ví dụ minh họa</ExampleLabel>
    </div>
    <div className="mt-3 space-y-2">
      {[
        { tag: 'Tin học', title: 'Vì sao tìm kiếm nhị phân cần dữ liệu có thứ tự?' },
        { tag: 'Toán', title: 'Khi nào nên dùng quy nạp để chứng minh?' },
        { tag: 'Kỹ năng học', title: 'Làm sao phân biệt luận điểm và dẫn chứng?' },
      ].map((row) => (
        <article key={row.title} className="rounded-2xl border border-[var(--ff-border)] bg-[var(--ff-surface-2)] p-3">
          <p className="text-[12px] font-semibold leading-snug text-[var(--ff-text)]">{row.title}</p>
          <p className="mt-1 font-mono text-[9.5px] text-[var(--ff-text-dim)]">#{row.tag}</p>
        </article>
      ))}
    </div>
    <div className="mt-3 flex items-start gap-2 rounded-2xl border border-dashed border-[var(--ff-border-strong)] px-3 py-2 text-[11px] leading-relaxed text-[var(--ff-text-dim)]">
      <BookOpenCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" aria-hidden="true" />
      Nêu điều bạn đã thử để cuộc trao đổi đi đúng chỗ đang vướng.
    </div>
  </div>
);

export const ClubsMock: React.FC = () => (
  <div className="ff-glass ff-card h-full rounded-[22px] p-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#81b29a]/15 px-2.5 py-1 text-[10px] font-semibold text-[#81b29a] ring-1 ring-[#81b29a]/35">
        <Users className="h-3 w-3" aria-hidden="true" /> Câu lạc bộ & nhóm học
      </span>
      <ExampleLabel>Ví dụ minh họa</ExampleLabel>
    </div>
    <div className="mt-3 grid grid-cols-2 gap-2">
      {[
        { name: 'Cùng học Cấu trúc dữ liệu', note: 'Chia sẻ cách giải', from: '#fbbf24', to: '#f97316' },
        { name: 'Nhóm ôn tiếng Anh', note: 'Trao đổi học liệu', from: '#f472b6', to: '#a855f7' },
        { name: 'CLB Học thuật', note: 'Thảo luận liên môn', from: '#38bdf8', to: '#22d3ee' },
        { name: 'Góc thiết kế', note: 'Nhận góp ý bài tập', from: '#34d399', to: '#4ade80' },
      ].map((club) => (
        <article key={club.name} className="overflow-hidden rounded-2xl border border-[var(--ff-border)] bg-[var(--ff-surface-2)]">
          <div
            className="h-12 w-full"
            style={{ backgroundImage: `linear-gradient(135deg, ${club.from}33, ${club.to}55)` }}
            aria-hidden="true"
          />
          <div className="p-2.5">
            <p className="line-clamp-2 min-h-[2.25rem] text-[11px] font-semibold leading-snug text-[var(--ff-text)]">{club.name}</p>
            <p className="mt-1 text-[9px] text-[var(--ff-text-dim)]">{club.note}</p>
          </div>
        </article>
      ))}
    </div>
    <div className="mt-3 flex items-center gap-2 rounded-2xl border border-[var(--ff-border)] bg-[var(--ff-surface-2)] p-3">
      <Users className="h-4 w-4 shrink-0 text-amber-400" aria-hidden="true" />
      <p className="text-[11px] leading-relaxed text-[var(--ff-text-soft)]">
        Giữ bài viết và thảo luận bên cạnh chủ đề chung của nhóm.
      </p>
    </div>
  </div>
);

export const LibraryMock: React.FC = () => (
  <div className="ff-glass ff-card h-full rounded-[22px] p-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-500/15 px-2.5 py-1 text-[10px] font-semibold text-violet-300 ring-1 ring-violet-400/25">
        <BookOpen className="h-3 w-3" aria-hidden="true" /> Kho đề & học liệu
      </span>
      <ExampleLabel>Ví dụ minh họa</ExampleLabel>
    </div>

    <div className="mt-3 grid gap-3 sm:grid-cols-[0.9fr_1.1fr]">
      <div className="space-y-2">
        {[
          { name: 'Ôn tập Cấu trúc dữ liệu', format: 'PDF' },
          { name: 'Đề cương học phần', format: 'DOCX' },
          { name: 'Ghi chú thuật toán', format: 'Markdown' },
          { name: 'Ảnh đề bài', format: 'Hình ảnh' },
        ].map((file) => (
          <div key={file.name} className="flex items-center gap-2 rounded-xl border border-[var(--ff-border)] bg-[var(--ff-surface-2)] p-2.5">
            <FileText className="h-4 w-4 shrink-0 text-amber-400" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[10.5px] font-semibold text-[var(--ff-text)]">{file.name}</p>
              <p className="mt-0.5 font-mono text-[9px] text-[var(--ff-text-dim)]">{file.format}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-[var(--ff-border)] bg-[var(--ff-surface-2)] p-3">
        <div className="flex items-center gap-2 border-b border-[var(--ff-border)] pb-2">
          <FileText className="h-4 w-4 text-rose-300" aria-hidden="true" />
          <span className="text-[10px] font-semibold text-[var(--ff-text)]">Bản xem tài liệu</span>
          <span className="ml-auto font-mono text-[9px] text-[var(--ff-text-dim)]">PDF</span>
        </div>
        <div className="mt-3 rounded-lg border border-[var(--ff-border)] bg-[var(--ff-bg-soft)] p-3">
          <p className="font-mono text-[9px] font-bold tracking-[0.12em] text-amber-300">CẤU TRÚC DỮ LIỆU</p>
          <p className="mt-2 text-[11px] font-semibold text-[var(--ff-text)]">Tìm kiếm nhị phân</p>
          <p className="mt-2 text-[9.5px] leading-relaxed text-[var(--ff-text-dim)]">
            Tìm hiểu điều kiện áp dụng, cách thu hẹp miền tìm kiếm và trường hợp cần kiểm tra lại giả định.
          </p>
        </div>
      </div>
    </div>

    <div className="mt-3 flex items-start gap-2 rounded-2xl border border-dashed border-[var(--ff-border-strong)] px-3 py-2 text-[11px] leading-relaxed text-[var(--ff-text-dim)]">
      <Paperclip className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" aria-hidden="true" />
      PDF có thể xem trong trình duyệt; các tệp khác được mở theo định dạng tương ứng.
    </div>
  </div>
);
