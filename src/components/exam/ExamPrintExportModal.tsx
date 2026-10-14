/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React, { useState } from 'react';
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
}

export const ExamPrintExportModal: React.FC<ExamPrintExportModalProps> = ({
  paper,
  onClose,
}) => {
  const [columns, setColumns] = useState<1 | 2>(2);
  const [fontSize, setFontSize] = useState<'sm' | 'md' | 'lg'>('md');
  const [includeSolutions, setIncludeSolutions] = useState<'none' | 'full' | 'answer-key'>('answer-key');
  const [includeStudentHeader, setIncludeStudentHeader] = useState(true);

  const cbtQuestions = getExamCBTQuestions(paper);

  /* Xử lý gọi in trang */
  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="print-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-fade-in select-none"
    >
      <div className="ff-exam-modal w-full max-w-4xl rounded-3xl p-5 sm:p-7 max-h-[94vh] flex flex-col justify-between overflow-hidden relative shadow-[0_25px_80px_rgba(0,0,0,0.85)]">
        {/* ======================================================== */}
        {/* 1. MODAL HEADER                                          */}
        {/* ======================================================== */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-400/20 text-amber-300 border border-amber-400/30">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 id="print-modal-title" className="text-base font-extrabold text-white">
                Tuỳ Chọn Định Dạng In &amp; Xuất Bản Đề Thi
              </h2>
              <span className="text-xs text-white/50">
                Chuẩn hoá khổ giấy A4 cho học sinh và giáo viên làm bài trực tiếp
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-neutral-400 hover:text-white bg-white/5 hover:bg-white/10 cursor-pointer"
            aria-label="Đóng bảng tuỳ chọn in"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ======================================================== */}
        {/* 2. BODY: CONFIGURATION & LIVE PAPER PREVIEW               */}
        {/* ======================================================== */}
        <div className="flex-1 overflow-y-auto no-scrollbar py-4 space-y-4">
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
                  className={`flex-1 py-1.5 rounded-lg border text-center font-bold cursor-pointer transition-colors ${
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
                  className={`flex-1 py-1.5 rounded-lg border text-center font-bold cursor-pointer transition-colors ${
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
                    className={`flex-1 py-1.5 rounded-lg border text-center font-bold uppercase cursor-pointer transition-colors ${
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
                className={`w-full py-1.5 rounded-lg border text-center font-bold cursor-pointer transition-colors ${
                  includeStudentHeader
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                    : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                }`}
              >
                {includeStudentHeader ? 'Có khung tên học sinh & điểm' : 'Không kèm khung'}
              </button>
            </div>
          </div>

          {/* Paper Live Preview Container (Will be targeted by @media print) */}
          <div className="border border-white/15 rounded-2xl p-4 sm:p-6 bg-white text-slate-900 shadow-xl overflow-x-auto select-text">
            <div id="ff-printable-exam-paper" data-columns={columns} className="w-full max-w-3xl mx-auto space-y-4">
              {/* Official Academic Header */}
              {includeStudentHeader && (
                <div className="border-b-2 border-slate-800 pb-3">
                  <div className="flex items-start justify-between gap-4 text-xs font-serif">
                    <div className="text-center font-bold leading-tight">
                      <div>SỞ GIÁO DỤC VÀ ĐÀO TẠO</div>
                      <div className="uppercase underline decoration-1 underline-offset-2">{paper.school}</div>
                      <div className="text-[10px] font-normal text-slate-600 mt-1">Năm học: {paper.schoolYear}</div>
                    </div>

                    <div className="text-center leading-tight">
                      <div className="font-bold text-sm uppercase">KIỂM TRA {paper.examType.toUpperCase()}</div>
                      <div className="font-bold text-xs uppercase">MÔN: {paper.subject.toUpperCase()} — KHỐI {paper.grade}</div>
                      <div className="text-[10px] text-slate-600 mt-0.5">Thời gian làm bài: {paper.duration || 60} phút (không kể thời gian phát đề)</div>
                    </div>
                  </div>

                  {/* Student Info & Score Box */}
                  <div className="grid grid-cols-12 gap-2 mt-3 pt-2 border-t border-slate-300 text-xs">
                    <div className="col-span-8 space-y-1">
                      <div>Họ và tên thí sinh: ........................................................................................</div>
                      <div className="flex gap-4">
                        <span>Lớp: ........................</span>
                        <span>Số báo danh: ........................</span>
                        <span>Phòng thi: ...........</span>
                      </div>
                    </div>

                    <div className="col-span-4 border-2 border-slate-800 rounded p-1 text-center flex flex-col justify-between">
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
                    <div className="grid grid-cols-2 gap-1 text-slate-800 text-xs pl-2">
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
              <div className="pt-3 border-t border-slate-300 text-[10px] text-slate-500 flex items-center justify-between">
                <span>Bản quyền trí tuệ thuộc về BroAmStuck — F-Forum 2027</span>
                <span>Học sinh tải và in trực tiếp từ f-forum.edu.vn</span>
              </div>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* 3. MODAL FOOTER                                          */}
        {/* ======================================================== */}
        <div className="pt-3 border-t border-white/10 flex items-center justify-between shrink-0 flex-wrap gap-2">
          <span className="text-xs text-white/50">
            Khuyên dùng: Chọn <strong>2 cột</strong> và khổ giấy <strong>A4</strong> trong cài đặt in để tối ưu trang giấy.
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-white/15 text-white/70 hover:text-white hover:bg-white/5 text-xs font-semibold cursor-pointer"
            >
              Đóng
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-[#0b0d12] text-xs font-extrabold flex items-center gap-1.5 shadow-[0_4px_16px_rgba(245,158,11,0.35)] cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>In Ngay / Xuất PDF</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExamPrintExportModal;
