/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React, { useState, useMemo } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Sparkles,
  ArrowRight,
  Atom,
} from 'lucide-react';

export interface StepSolutionItem {
  stepNumber: number;
  title: string;
  subtitle: string;
  content: string;
}

export interface StepSolutionAccordionProps {
  solutionText?: string;
  solutionRaw?: string;
  subject?: string;
  formula?: string;
  className?: string;
}

function parseStepsFromContent(text: string): StepSolutionItem[] {
  const stepRegex = /(?:Bước|Step)\s*([1-9])\s*[:.-]\s*([^\n]+(?:\n(?:(?!Bước|Step\s*[1-9]).)*)*)/gi;
  const matches = [...text.matchAll(stepRegex)];
  if (matches.length >= 2) {
    return matches.map((m) => {
      const num = parseInt(m[1], 10);
      const lines = m[2].trim().split('\n');
      const firstLine = lines[0].trim();
      const body = lines.slice(1).join('\n').trim() || firstLine;
      const title = firstLine.length < 50 ? firstLine : `Triển khai bước ${num}`;
      return {
        stepNumber: num,
        title: `Bước ${num}: ${title}`,
        subtitle: num === 1 ? 'Phân tích dữ kiện & điều kiện bài toán' : num === 2 ? 'Thiết lập phương trình & tính toán' : 'Biện luận kết quả & kết luận',
        content: body,
      };
    });
  }

  const paragraphs = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  if (paragraphs.length >= 3) {
    return [
      {
        stepNumber: 1,
        title: 'Bước 1: Phân tích đề & Dữ kiện bài toán',
        subtitle: 'Xác định đại lượng đã biết, ẩn số và phạm vi bài toán',
        content: paragraphs[0],
      },
      {
        stepNumber: 2,
        title: 'Bước 2: Thiết lập phương trình & Biến đổi đại số',
        subtitle: 'Áp dụng định lý trọng tâm và triển khai hệ thức giải',
        content: paragraphs.slice(1, -1).join('\n\n'),
      },
      {
        stepNumber: 3,
        title: 'Bước 3: Biện luận kết quả & Kết luận đáp số',
        subtitle: 'So sánh điều kiện nghiệm và rút ra kết luận chuẩn xác',
        content: paragraphs[paragraphs.length - 1],
      },
    ];
  }

  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length >= 3) {
    const p1 = Math.max(1, Math.floor(lines.length / 3));
    const p2 = Math.max(p1 + 1, Math.floor((lines.length * 2) / 3));
    return [
      {
        stepNumber: 1,
        title: 'Bước 1: Phân tích đề & Dữ kiện bài toán',
        subtitle: 'Tìm hiểu yêu cầu trọng tâm và các giả thiết cho trước',
        content: lines.slice(0, p1).join('\n'),
      },
      {
        stepNumber: 2,
        title: 'Bước 2: Thiết lập phương trình & Phương pháp giải',
        subtitle: 'Vận dụng công thức then chốt vào quá trình tính toán',
        content: lines.slice(p1, p2).join('\n'),
      },
      {
        stepNumber: 3,
        title: 'Bước 3: Biện luận kết quả & Đáp số chính xác',
        subtitle: 'Đánh giá tính hợp lý và ghi nhận phương án đúng',
        content: lines.slice(p2).join('\n'),
      },
    ];
  }

  return [
    {
      stepNumber: 1,
      title: 'Bước 1: Phân tích đề & Định hướng tư duy',
      subtitle: 'Nắm chắc kiến thức nền tảng để tự giải đáp độc lập',
      content: text,
    },
  ];
}

function resolveCoreFormula(text: string, subject?: string, explicitFormula?: string): string {
  if (explicitFormula && explicitFormula.trim()) {
    return explicitFormula.trim();
  }
  const mathFormulaRegex = /(?:công thức|formula|áp dụng|ta có|hệ thức)[:\s]*([^\n.]+)/i;
  const match = text.match(mathFormulaRegex);
  if (match && match[1] && match[1].length > 4 && match[1].length < 100) {
    return match[1].trim();
  }
  const s = (subject || '').toLowerCase();
  if (s.includes('toán')) return 'Δ = b² - 4ac · Định lý Viète: x₁ + x₂ = -b/a, x₁·x₂ = c/a';
  if (s.includes('lý') || s.includes('lí')) return 'Định luật II Newton: F = m·a · Công cơ học: A = F·s·cos(α)';
  if (s.includes('hóa') || s.includes('hoá')) return 'n = m/M = V/22.4 · Nồng độ mol: C_M = n/V';
  if (s.includes('sinh')) return 'Nguyên tắc bổ sung ADN: A = T, G = X · Tổng số nu: N = 2A + 2G';
  if (s.includes('tin')) return 'Độ phức tạp thuật toán O(n log n) · Đệ quy & Quy hoạch động';
  return 'Phương pháp phân tích bài toán: Giả thiết → Định lý → Kết luận';
}

export const StepSolutionAccordion: React.FC<StepSolutionAccordionProps> = ({
  solutionText,
  solutionRaw,
  subject,
  formula,
  className = '',
}) => {
  const effectiveText = solutionRaw ?? solutionText ?? '';
  const steps = useMemo(() => parseStepsFromContent(effectiveText), [effectiveText]);
  const coreFormula = useMemo(
    () => resolveCoreFormula(effectiveText, subject, formula),
    [effectiveText, subject, formula],
  );

  const [unlockedStep, setUnlockedStep] = useState<number>(1);
  const [expandedSteps, setExpandedSteps] = useState<Record<number, boolean>>({ 1: true });

  const toggleStep = (stepNumber: number) => {
    if (stepNumber > unlockedStep) return;
    setExpandedSteps((prev) => ({
      ...prev,
      [stepNumber]: !prev[stepNumber],
    }));
  };

  const unlockNextStep = () => {
    const next = Math.min(steps.length, unlockedStep + 1);
    setUnlockedStep(next);
    setExpandedSteps((prev) => ({
      ...prev,
      [next]: true,
    }));
  };

  return (
    <div className={`space-y-3.5 select-text ${className}`}>
      {coreFormula && (
        <div className="card-hard rounded-2xl p-3.5 bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-transparent border border-amber-400/30 text-amber-200">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="text-[11px] font-mono uppercase tracking-wider font-bold text-amber-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              Gợi Ý Công Thức Trọng Tâm
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-amber-400/15 border border-amber-400/25 text-amber-300 font-semibold">
              Khắc sâu lý thuyết
            </span>
          </div>
          <p className="font-mono text-xs sm:text-[13px] font-bold text-amber-100 bg-black/30 p-2.5 rounded-xl border border-amber-400/20 leading-relaxed">
            {coreFormula}
          </p>
        </div>
      )}

      <div className="space-y-2.5">
        <div className="flex items-center justify-between text-xs px-1">
          <span className="font-bold text-white/80 font-mono flex items-center gap-1.5">
            <Atom className="w-3.5 h-3.5 text-[#81b29a]" />
            Lời Giải Khai Phóng Từng Bước ({unlockedStep}/{steps.length} đã mở)
          </span>
          {unlockedStep < steps.length && (
            <span className="text-[11px] text-amber-300/80 italic font-mono">
              Tự tư duy trước khi mở bước tiếp
            </span>
          )}
        </div>

        {steps.map((step) => {
          const isUnlocked = step.stepNumber <= unlockedStep;
          const isExpanded = isUnlocked && Boolean(expandedSteps[step.stepNumber]);

          return (
            <div
              key={step.stepNumber}
              className={`card-hard rounded-2xl border transition-all ${
                isUnlocked
                  ? 'bg-white/[0.03] border-white/12 shadow-sm'
                  : 'bg-black/20 border-white/5 opacity-55'
              }`}
            >
              <button
                type="button"
                onClick={() => toggleStep(step.stepNumber)}
                disabled={!isUnlocked}
                className="w-full p-3.5 sm:p-4 text-left flex items-center justify-between gap-3 cursor-pointer disabled:cursor-not-allowed"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`w-7 h-7 rounded-xl flex items-center justify-center font-mono font-bold text-xs shrink-0 border ${
                      isUnlocked
                        ? 'bg-amber-400/20 text-amber-300 border-amber-400/35'
                        : 'bg-white/5 text-white/40 border-white/10'
                    }`}
                  >
                    {isUnlocked ? step.stepNumber : `${step.stepNumber}`}
                  </span>
                  <div className="min-w-0">
                    <h4 className="text-xs sm:text-sm font-bold text-white truncate">
                      {step.title}
                    </h4>
                    <p className="text-[11px] text-neutral-400 truncate">
                      {step.subtitle}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {isUnlocked ? (
                    isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-amber-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-neutral-400" />
                    )
                  ) : (
                    <span className="text-[10px] font-mono text-neutral-500 uppercase px-2 py-0.5 rounded bg-white/5">
                      Chưa mở
                    </span>
                  )}
                </div>
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 pt-1 border-t border-white/10 animate-fade-in">
                  <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 text-xs sm:text-sm text-slate-100 leading-relaxed whitespace-pre-line font-medium">
                    {step.content}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {unlockedStep < steps.length && (
          <div className="pt-2 flex justify-center">
            <button
              type="button"
              onClick={unlockNextStep}
              className="btn-feastables ff-tactile-pop px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-[#0b0d12] font-black text-xs sm:text-sm flex items-center gap-2 cursor-pointer shadow-md hover:from-amber-300 hover:to-amber-400 transition-all"
              title="Kích thích phản xạ tư duy độc lập trước khi xem bước tiếp theo"
            >
              <span>Mở Bước Tiếp Theo (Bước {unlockedStep + 1})</span>
              <ArrowRight className="w-4 h-4 text-[#0b0d12]" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
