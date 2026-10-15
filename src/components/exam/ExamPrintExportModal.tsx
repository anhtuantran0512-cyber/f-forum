/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Printer,
  Columns,
  Type,
  CheckCircle2,
  School,
} from 'lucide-react';
import type { ExamPaper } from '../../types';
import { getExamCBTQuestions } from './cbtData';

export interface ExamPrintExportModalProps {
  paper: ExamPaper;
  onClose: () => void;
  onPrint?: () => void;
}

export const ExamPrintExportModal: React.FC<ExamPrintExportModalProps> = ({
  paper,
  onClose,
  onPrint,
}) => {
  const [columns, setColumns] = useState<1 | 2>(2);
  const [fontSize, setFontSize] = useState<'sm' | 'md' | 'lg'>('md');
  const [includeSolutions, setIncludeSolutions] = useState<'none' | 'full' | 'answer-key'>('answer-key');
  const [includeStudentHeader, setIncludeStudentHeader] = useState(true);

  const cbtQuestions = getExamCBTQuestions(paper);

  const handlePrint = () => {
    onPrint?.();
    window.print();
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="print-modal-title"
      className="ff-exam-dialog-overlay z-[100] bg-black/80 backdrop-blur-md animate-fade-in select-none"
      onClick={onClose}
    >
      <div
        className="ff-exam-modal ff-exam-dialog-panel ff-exam-print-panel w-full max-w-4xl min-h-0 rounded-3xl p-4 sm:p-7 flex flex-col overflow-hidden relative shadow-[0_25px_80px_rgba(0,0,0,0.85)]"
        onClick={(event) => event.stopPropagation()}
      >
        {/* ======================================================== */}
        {/* 1. MODAL HEADER                                          */}
        {/* ======================================================== */}
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-white/10 shrink-0">
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <div className="shrink-0 rounded-xl border border-amber-400/30 bg-amber-400/20 p-2 text-amber-300">
              <Printer className="w-5 h-5" />
            </div>
            <h2 id="print-modal-title" className="min-w-0 text-sm font-extrabold leading-tight text-white sm:text-base">
              In &amp; xuất đề thi
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="ff-tactile-btn ff-exam-icon-button inline-flex min-h-10 min-w-10 shrink-0 items-center justify-center rounded-xl bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-white cursor-pointer"
            aria-label="Đóng bảng tuỳ chọn in"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ======================================================== */}
        {/* 2. BODY: CONFIGURATION & LIVE PAPER PREVIEW               */}
        {/* ======================================================== */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain no-scrollbar py-4 space-y-4">
          {/* Controls Bar */}
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {/* Columns selector */}
            <div>
              <label className="block text-white/70 font-semibold mb-1 flex items-center gap-1">
                <Columns className="w-3.5 h-3.5 text-amber-400" /> Bố cục cột
              </label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setColumns(1)}
                  className={`ff-tactile-btn flex-1 py-1.5 rounded-lg border text-center font-bold cursor-pointer transition-colors ${
                    columns === 1
                      ? 'bg-amber-400 text-[#0b0d12] border-amber-400'
                      : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                  }`}
                >
                  1 Cột (Thoáng)
                </button>
                <button
                  type="button"
                  onClick={() => setColumns(2)}
                  className={`ff-tactile-btn flex-1 py-1.5 rounded-lg border text-center font-bold cursor-pointer transition-colors ${
                    columns === 2
                      ? 'bg-amber-400 text-[#0b0d12] border-amber-400'
                      : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                  }`}
                >
                  2 Cột (Tiết kiệm)
                </button>
              </div>
            </div>

            {/* Font Size selector */}
            <div>
              <label className="block text-white/70 font-semibold mb-1 flex items-center gap-1">
                <Type className="w-3.5 h-3.5 text-amber-400" /> Cỡ chữ in
              </label>
              <div className="flex items-center gap-1">
                {(['sm', 'md', 'lg'] as const).map((sz) => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => setFontSize(sz)}
                    className={`ff-tactile-btn flex-1 py-1.5 rounded-lg border text-center font-bold uppercase cursor-pointer transition-colors ${
                      fontSize === sz
                        ? 'bg-amber-400 text-[#0b0d12] border-amber-400'
                        : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                    }`}
                  >
                    {sz === 'sm' ? 'Nhỏ' : sz === 'md' ? 'Vừa' : 'Lớn'}
                  </button>
                ))}
              </div>
            </div>

            {/* Solutions mode */}
            <div>
              <label className="block text-white/70 font-semibold mb-1 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" /> Kèm đáp án
              </label>
              <select
                value={includeSolutions}
                onChange={(e) => setIncludeSolutions(e.target.value as typeof includeSolutions)}
                className="w-full ff-exam-select rounded-lg px-2.5 py-1.5 focus:outline-none cursor-pointer"
              >
                <option value="none">Chỉ in đề (Không đáp án)</option>
                <option value="answer-key">Bảng đáp án A-B-C-D ở cuối</option>
                <option value="full">Lời giải chi tiết từng bước</option>
              </select>
            </div>

            {/* Student Header Toggle */}
            <div>
              <label className="block text-white/70 font-semibold mb-1 flex items-center gap-1">
                <School className="w-3.5 h-3.5 text-amber-400" /> Khung bài làm
              </label>
              <button
                type="button"
                onClick={() => setIncludeStudentHeader(!includeStudentHeader)}
                className={`ff-tactile-btn w-full py-1.5 rounded-lg border text-center font-bold cursor-pointer transition-colors ${
                  includeStudentHeader
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                    : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                }`}
              >
                {includeStudentHeader ? 'Có khung tên học sinh & điểm' : 'Không kèm khung'}
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-[#81b29a]/30 bg-[#81b29a]/[0.08] px-3 py-2 text-[11px] leading-relaxed text-white/65">
            Bản xem trước bên dưới được tạo sẵn để in; chọn “In / Lưu thành PDF” rồi chọn “Lưu dưới dạng PDF” trong hộp thoại trình duyệt.
          </div>

          {/* Paper Live Preview Container (Will be targeted by @media print) */}
          <div className="border border-white/15 rounded-2xl p-4 sm:p-6 bg-white text-slate-900 shadow-xl overflow-x-auto select-text">
            <div id="ff-printable-exam-paper" data-columns={columns} className="w-full max-w-3xl mx-auto space-y-4">
              {/* Official Academic Header */}
              {includeStudentHeader && (
                <div className="border-b-2 border-slate-800 pb-3">
                  <div className="flex flex-col items-center justify-between gap-3 text-xs font-serif sm:flex-row sm:items-start sm:gap-4">
                    <div className="w-full min-w-0 text-center font-bold leading-tight sm:flex-1">
                      <div>SỞ GIÁO DỤC VÀ ĐÀO TẠO</div>
                      <div className="break-words uppercase underline decoration-1 underline-offset-2">{paper.school}</div>
                      <div className="text-[10px] font-normal text-slate-600 mt-1">Năm học: {paper.schoolYear}</div>
                    </div>

                    <div className="w-full min-w-0 text-center leading-tight sm:flex-1">
                      <div className="font-bold text-sm uppercase">KIỂM TRA {paper.examType.toUpperCase()}</div>
                      <div className="font-bold text-xs uppercase">MÔN: {paper.subject.toUpperCase()} — KHỐI {paper.grade}</div>
                      <div className="text-[10px] text-slate-600 mt-0.5">Thời gian làm bài: {paper.duration || 60} phút (không kể thời gian phát đề)</div>
                    </div>
                  </div>

                  {/* Student Info & Score Box */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 mt-3 pt-2 border-t border-slate-300 text-xs">
                    <div className="min-w-0 space-y-1 sm:col-span-8">
                      <div className="flex min-w-0 items-end gap-2">
                        <span className="shrink-0">Họ và tên:</span>
                        <span className="min-w-0 flex-1 border-b border-dotted border-slate-500" aria-hidden="true">&nbsp;</span>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1">
                        <span className="inline-flex items-end gap-1 whitespace-nowrap">Lớp:<span className="w-16 border-b border-dotted border-slate-500" aria-hidden="true">&nbsp;</span></span>
                        <span className="inline-flex items-end gap-1 whitespace-nowrap">Số báo danh:<span className="w-20 border-b border-dotted border-slate-500" aria-hidden="true">&nbsp;</span></span>
                        <span className="inline-flex items-end gap-1 whitespace-nowrap">Phòng thi:<span className="w-14 border-b border-dotted border-slate-500" aria-hidden="true">&nbsp;</span></span>
                      </div>
                    </div>

                    <div className="flex w-32 flex-col justify-between justify-self-end rounded border-2 border-slate-800 p-1 text-center sm:col-span-4 sm:w-auto sm:justify-self-auto">
                      <div className="font-bold text-[10px] uppercase border-b border-slate-300 pb-0.5">
                        Điểm số &amp; Lời phê
                      </div>
                      <div className="h-6 text-[11px] font-bold text-slate-400 flex items-center justify-center">
                        / 10
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Exam Content Questions */}
              <div
                className={`ff-print-columns gap-4 ${columns === 2 ? 'columns-1 sm:columns-2' : 'columns-1'} ${
                  fontSize === 'sm' ? 'text-xs' : fontSize === 'lg' ? 'text-base' : 'text-sm'
                }`}
              >
                {cbtQuestions.map((q) => (
                  <div key={q.id} className="break-inside-avoid mb-4 space-y-1">
                    <p className="font-bold text-slate-900 leading-snug">
                      <span>Câu {q.number}: </span>
                      <span className="font-normal">{q.question}</span>
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-slate-800 text-xs pl-2">
                      {q.options.map((opt) => (
                        <div key={opt.id}>
                          <strong className="font-bold">{opt.id}.</strong> {opt.text}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Answer Key Matrix (if requested) */}
              {includeSolutions === 'answer-key' && (
                <div className="pt-4 mt-6 border-t-2 border-slate-800 break-inside-avoid">
                  <h4 className="font-bold text-xs uppercase text-slate-800 mb-1">
                    BẢNG ĐÁP ÁN TRẮC NGHIỆM THAM KHẢO
                  </h4>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {cbtQuestions.map((q) => (
                      <div key={q.id} className="border border-slate-400 px-2 py-0.5 rounded font-mono">
                        <span className="text-slate-500">{q.number}:</span>{' '}
                        <strong className="text-slate-900">{q.correctAnswer}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Full Detailed Solutions (if requested) */}
              {includeSolutions === 'full' && (
                <div className="pt-4 mt-6 border-t-2 border-slate-800 space-y-3 break-inside-avoid">
                  <h4 className="font-bold text-xs uppercase text-slate-800 mb-1">
                    HƯỚNG DẪN GIẢI CHI TIẾT TỪNG BƯỚC
                  </h4>
                  {cbtQuestions.map((q) => (
                    <div key={q.id} className="text-xs text-slate-800 border-b border-slate-200 pb-2">
                      <div className="font-bold text-slate-900 mb-0.5">
                        Câu {q.number} (Đáp án: {q.correctAnswer}):
                      </div>
                      <p className="leading-relaxed text-slate-700">{q.explanation}</p>
                      {q.keyFormula && (
                        <div className="font-mono text-[11px] text-sky-800 mt-1">
                          * Công thức then chốt: {q.keyFormula}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Footer Watermark */}
              <div className="pt-3 border-t border-slate-300 text-[10px] text-slate-500 flex flex-col items-start gap-1 sm:flex-row sm:items-center sm:justify-between">
                <span>Bản quyền BroAmStuck — F-Forum 2027</span>
                <span>f-forum.edu.vn</span>
              </div>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* 3. MODAL FOOTER                                          */}
        {/* ======================================================== */}
        <div className="flex shrink-0 flex-col gap-2 border-t border-white/10 pt-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-xl text-[11px] leading-relaxed text-white/55">
            Trong hộp thoại trình duyệt, chọn “Lưu dưới dạng PDF” để tải tệp về máy.
          </p>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="ff-tactile-btn inline-flex min-h-10 items-center justify-center rounded-xl border border-white/15 bg-white/[0.04] px-4 py-2 text-xs font-semibold text-white/75 hover:bg-white/[0.08] hover:text-white cursor-pointer"
            >
              Đóng
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="ff-tactile-btn inline-flex min-h-10 items-center gap-1.5 rounded-xl border-2 border-[#0b0d12] bg-[#f4f1de] px-5 py-2 text-xs font-extrabold text-[#0b0d12] hover:bg-[#f2cc8f] cursor-pointer"
            >
              <Printer className="w-4 h-4 text-[#e07a5f]" />
              <span>In / Lưu thành PDF</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default ExamPrintExportModal;
