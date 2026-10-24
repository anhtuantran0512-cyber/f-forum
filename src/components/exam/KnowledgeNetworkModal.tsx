import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Share2,
  BookOpen,
  AlertTriangle,
  Filter,
  TrendingUp,
  Compass,
  ArrowRight,
} from 'lucide-react';

export type ThinkingLevel = 'Tất cả' | 'Nhận biết' | 'Thông hiểu' | 'Vận dụng' | 'Vận dụng cao';

export interface KnowledgeNode {
  id: string;
  label: string;
  subject: 'Toán học' | 'Vật lý' | 'Hóa học';
  category: string;
  level: 'Nhận biết' | 'Thông hiểu' | 'Vận dụng' | 'Vận dụng cao';
  examFrequency: number;
  trapProbability: number;
  examCount: number;
  interdisciplinaryNotes: string;
  x: number;
  y: number;
}

export interface KnowledgeEdge {
  from: string;
  to: string;
  label: string;
}

const KNOWLEDGE_NODES: KnowledgeNode[] = [
  {
    id: 'math-derivative',
    label: 'Đạo hàm & Tiếp tuyến',
    subject: 'Toán học',
    category: 'Giải tích 12',
    level: 'Thông hiểu',
    examFrequency: 96,
    trapProbability: 42,
    examCount: 38,
    interdisciplinaryNotes: 'Cung cấp nền tảng vi phân vận tốc v(t) = x\'(t) và gia tốc a(t) = v\'(t) trong dao động cơ.',
    x: 210,
    y: 130,
  },
  {
    id: 'math-integral',
    label: 'Tích phân & Diện tích',
    subject: 'Toán học',
    category: 'Giải tích 12',
    level: 'Vận dụng',
    examFrequency: 94,
    trapProbability: 48,
    examCount: 35,
    interdisciplinaryNotes: 'Tính nhiệt lượng, công suất dòng điện xoay chiều biến thiên và quãng đường chuyển động.',
    x: 320,
    y: 260,
  },
  {
    id: 'math-oxyz',
    label: 'Hình học Không gian Oxyz',
    subject: 'Toán học',
    category: 'Hình học 12',
    level: 'Vận dụng cao',
    examFrequency: 88,
    trapProbability: 54,
    examCount: 29,
    interdisciplinaryNotes: 'Mô hình hóa vectơ lan truyền của điện trường và từ trường vuông góc trong sóng điện từ.',
    x: 180,
    y: 390,
  },
  {
    id: 'math-calculus',
    label: 'Khảo sát Hàm số & Cực trị',
    subject: 'Toán học',
    category: 'Giải tích 12',
    level: 'Nhận biết',
    examFrequency: 100,
    trapProbability: 35,
    examCount: 42,
    interdisciplinaryNotes: 'Tìm cực trị cộng hưởng RLC và giá trị biên độ dao động cực đại trong cơ học.',
    x: 120,
    y: 240,
  },
  {
    id: 'phys-oscillation',
    label: 'Dao động Cơ điều hòa',
    subject: 'Vật lý',
    category: 'Vật lý 12',
    level: 'Thông hiểu',
    examFrequency: 95,
    trapProbability: 46,
    examCount: 36,
    interdisciplinaryNotes: 'Sử dụng đạo hàm cấp 1 và cấp 2 để khảo sát pha ban đầu và năng lượng bảo toàn.',
    x: 460,
    y: 110,
  },
  {
    id: 'phys-ac',
    label: 'Dòng điện xoay chiều RLC',
    subject: 'Vật lý',
    category: 'Vật lý 12',
    level: 'Vận dụng cao',
    examFrequency: 92,
    trapProbability: 52,
    examCount: 32,
    interdisciplinaryNotes: 'Liên kết sang hiện tượng điện phân Faraday trong Hóa học thông qua điện lượng q = I*t.',
    x: 520,
    y: 250,
  },
  {
    id: 'phys-waves',
    label: 'Sóng điện từ & Giao thoa',
    subject: 'Vật lý',
    category: 'Vật lý 12',
    level: 'Vận dụng',
    examFrequency: 89,
    trapProbability: 39,
    examCount: 28,
    interdisciplinaryNotes: 'Tương tác quang phổ nguyên tử và bước sóng hấp thụ liên quan đến cấu tạo vỏ electron.',
    x: 440,
    y: 400,
  },
  {
    id: 'chem-electrolysis',
    label: 'Điện phân & Pin điện hóa',
    subject: 'Hóa học',
    category: 'Hóa vô cơ 12',
    level: 'Vận dụng cao',
    examFrequency: 86,
    trapProbability: 58,
    examCount: 26,
    interdisciplinaryNotes: 'Ứng dụng định luật Faraday dòng điện I và hiệu điện thế U từ Vật lý để tính khối lượng kết tủa.',
    x: 740,
    y: 160,
  },
  {
    id: 'chem-ester',
    label: 'Hóa hữu cơ Este - Lipit',
    subject: 'Hóa học',
    category: 'Hóa hữu cơ 12',
    level: 'Thông hiểu',
    examFrequency: 98,
    trapProbability: 44,
    examCount: 40,
    interdisciplinaryNotes: 'Cân bằng nhiệt lượng phản ứng xà phòng hóa và bảo toàn khối lượng liên môn.',
    x: 760,
    y: 310,
  },
  {
    id: 'chem-inorganic',
    label: 'Kim loại kiềm & Hợp chất',
    subject: 'Hóa học',
    category: 'Hóa vô cơ 12',
    level: 'Nhận biết',
    examFrequency: 91,
    trapProbability: 32,
    examCount: 33,
    interdisciplinaryNotes: 'Cơ sở điện tích ion và tương tác tĩnh điện Coulomb trong mạng tinh thể ion.',
    x: 690,
    y: 430,
  },
];

const KNOWLEDGE_EDGES: KnowledgeEdge[] = [
  { from: 'math-derivative', to: 'phys-oscillation', label: 'Vi phân vận tốc & gia tốc' },
  { from: 'math-integral', to: 'phys-ac', label: 'Tích phân nhiệt lượng & công suất' },
  { from: 'math-calculus', to: 'phys-oscillation', label: 'Cực trị năng lượng cơ' },
  { from: 'math-oxyz', to: 'phys-waves', label: 'Hình học vectơ sóng E-B' },
  { from: 'phys-ac', to: 'chem-electrolysis', label: 'Dòng điện Faraday & điện tích e' },
  { from: 'chem-electrolysis', to: 'chem-ester', label: 'Bảo toàn electron & khối lượng' },
  { from: 'phys-waves', to: 'chem-inorganic', label: 'Quang phổ hấp thụ & liên kết ion' },
  { from: 'math-integral', to: 'math-derivative', label: 'Đạo hàm ngược' },
  { from: 'phys-oscillation', to: 'phys-ac', label: 'Dao động điện từ LC tương đương' },
];

export interface KnowledgeNetworkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFilterTopic?: (topic: string, subject: string) => void;
}

export const KnowledgeNetworkModal: React.FC<KnowledgeNetworkModalProps> = ({
  isOpen,
  onClose,
  onFilterTopic,
}) => {
  const [selectedLevel, setSelectedLevel] = useState<ThinkingLevel>('Tất cả');
  const [activeNodeId, setActiveNodeId] = useState<string>('math-derivative');
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  const activeNode = useMemo(
    () => KNOWLEDGE_NODES.find((n) => n.id === activeNodeId) || KNOWLEDGE_NODES[0],
    [activeNodeId]
  );

  const filteredNodes = useMemo(() => {
    if (selectedLevel === 'Tất cả') return KNOWLEDGE_NODES;
    return KNOWLEDGE_NODES.filter((n) => n.level === selectedLevel);
  }, [selectedLevel]);

  const activeConnectedIds = useMemo(() => {
    const currentId = hoveredNodeId || activeNodeId;
    const ids = new Set<string>([currentId]);
    KNOWLEDGE_EDGES.forEach((edge) => {
      if (edge.from === currentId) ids.add(edge.to);
      if (edge.to === currentId) ids.add(edge.from);
    });
    return ids;
  }, [hoveredNodeId, activeNodeId]);

  if (!isOpen) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Bản đồ mạng lưới tri thức liên môn"
      className="fixed inset-0 z-[125] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="card-hard w-full max-w-5xl bg-[#FBF2E1] border-2 border-[#2B2331] text-[#2B2331] rounded-2xl shadow-[6px_6px_0px_#2B2331] flex flex-col max-h-[92vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b-2 border-[#2B2331] bg-[#F7EBD3]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-400 border-2 border-[#2B2331] flex items-center justify-center shadow-[2px_2px_0px_#2B2331]">
              <Share2 className="w-5 h-5 text-[#2B2331]" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black tracking-tight text-[#2B2331]">
                Bản Đồ Mạng Lưới Tri Thức Liên Môn 2027
              </h3>
              <p className="text-xs font-semibold text-[#5A4D61]">
                Toán học · Vật lý · Hóa học · Ma trận đề 5 năm chuẩn Bộ GD&amp;ĐT
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng bản đồ tri thức"
            className="ff-tactile-pop btn-feastables p-2 rounded-xl bg-[#FBF2E1] hover:bg-white text-[#2B2331] border-2 border-[#2B2331] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center justify-between px-5 py-2.5 border-b-2 border-[#2B2331] bg-[#EFE3CA] overflow-x-auto no-scrollbar gap-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#2B2331]">
            <Filter className="w-3.5 h-3.5" />
            <span>Mức độ tư duy:</span>
          </div>

          <div className="flex items-center gap-1.5">
            {(['Tất cả', 'Nhận biết', 'Thông hiểu', 'Vận dụng', 'Vận dụng cao'] as ThinkingLevel[]).map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => setSelectedLevel(lvl)}
                className={`ff-tactile-pop btn-feastables px-2.5 py-1 rounded-lg text-xs font-extrabold cursor-pointer border transition-all ${
                  selectedLevel === lvl
                    ? 'bg-[#2B2331] text-[#FBF2E1] border-[#2B2331] shadow-[1.5px_1.5px_0px_#2B2331]'
                    : 'bg-[#FBF2E1] text-[#2B2331] border-[#2B2331]/30 hover:bg-white'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 overflow-y-auto">
          <div className="lg:col-span-8 p-3 sm:p-5 flex flex-col items-center justify-center bg-[#FDF9F0] border-b-2 lg:border-b-0 lg:border-r-2 border-[#2B2331] relative select-none">
            <svg
              viewBox="0 0 900 520"
              className="w-full h-auto max-h-[460px] drop-shadow-sm"
            >
              <defs>
                <linearGradient id="edgeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#2B2331" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#2B2331" stopOpacity="0.8" />
                </linearGradient>
                <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="2" dy="2" stdDeviation="0" floodColor="#2B2331" />
                </filter>
              </defs>

              {KNOWLEDGE_EDGES.map((edge) => {
                const source = KNOWLEDGE_NODES.find((n) => n.id === edge.from);
                const target = KNOWLEDGE_NODES.find((n) => n.id === edge.to);
                if (!source || !target) return null;
                const isConnected = activeConnectedIds.has(edge.from) && activeConnectedIds.has(edge.to);

                return (
                  <g key={`${edge.from}-${edge.to}`}>
                    <path
                      d={`M ${source.x} ${source.y} Q ${(source.x + target.x) / 2} ${(source.y + target.y) / 2 - 25} ${target.x} ${target.y}`}
                      fill="none"
                      stroke={isConnected ? '#2B2331' : '#A39BA8'}
                      strokeWidth={isConnected ? 3 : 1.5}
                      strokeDasharray={isConnected ? 'none' : '4 4'}
                    />
                  </g>
                );
              })}

              {filteredNodes.map((node) => {
                const isSelected = activeNodeId === node.id;
                const isConnected = activeConnectedIds.has(node.id);
                const color =
                  node.subject === 'Toán học'
                    ? '#38bdf8'
                    : node.subject === 'Vật lý'
                    ? '#fbbf24'
                    : '#34d399';

                return (
                  <g
                    key={node.id}
                    className="cursor-pointer transition-transform duration-200"
                    onClick={() => setActiveNodeId(node.id)}
                    onMouseEnter={() => setHoveredNodeId(node.id)}
                    onMouseLeave={() => setHoveredNodeId(null)}
                    opacity={isConnected ? 1 : 0.8}
                  >
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={isSelected ? 32 : 26}
                      fill={color}
                      stroke="#2B2331"
                      strokeWidth={isSelected ? 3.5 : 2.5}
                      filter="url(#softGlow)"
                    />
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={isSelected ? 10 : 6}
                      fill="#2B2331"
                    />
                    <text
                      x={node.x}
                      y={node.y + 44}
                      textAnchor="middle"
                      className="text-[11px] font-black fill-[#2B2331] select-none"
                    >
                      {node.label}
                    </text>
                    <text
                      x={node.x}
                      y={node.y + 57}
                      textAnchor="middle"
                      className="text-[9px] font-bold fill-[#5A4D61] select-none"
                    >
                      {node.subject} · {node.examFrequency}%
                    </text>
                  </g>
                );
              })}
            </svg>

            <div className="absolute bottom-3 left-4 flex items-center gap-3 text-[11px] font-extrabold text-[#2B2331]">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-sky-400 border border-[#2B2331]" /> Toán học
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-amber-400 border border-[#2B2331]" /> Vật lý
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-emerald-400 border border-[#2B2331]" /> Hóa học
              </span>
            </div>
          </div>

          <div className="lg:col-span-4 p-5 flex flex-col justify-between bg-[#FBF2E1]">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-white border border-[#2B2331] text-[#2B2331]">
                  {activeNode.subject}
                </span>
                <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-amber-400 border border-[#2B2331] text-[#2B2331]">
                  {activeNode.level}
                </span>
              </div>

              <div>
                <h4 className="text-lg font-black text-[#2B2331] leading-snug">
                  {activeNode.label}
                </h4>
                <p className="text-xs font-bold text-[#5A4D61] mt-0.5">
                  Chuyên đề: {activeNode.category}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-bold">
                <div className="p-3 rounded-xl bg-white border border-[#2B2331] shadow-[2px_2px_0px_#2B2331]">
                  <div className="flex items-center gap-1 text-[#5A4D61] text-[10px] mb-0.5">
                    <TrendingUp className="w-3 h-3 text-cyan-600" />
                    <span>Xuất hiện 5 năm</span>
                  </div>
                  <div className="text-base font-black text-cyan-700">
                    {activeNode.examFrequency}%
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-white border border-[#2B2331] shadow-[2px_2px_0px_#2B2331]">
                  <div className="flex items-center gap-1 text-[#5A4D61] text-[10px] mb-0.5">
                    <AlertTriangle className="w-3 h-3 text-rose-600" />
                    <span>Tỷ lệ bẫy sai</span>
                  </div>
                  <div className="text-base font-black text-rose-700">
                    {activeNode.trapProbability}%
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#F7EBD3] border border-[#2B2331] text-xs leading-relaxed">
                <strong className="block text-[11px] font-black text-[#2B2331] mb-1 flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-amber-600" />
                  Mắt xích liên môn thực chiến:
                </strong>
                <p className="text-[#3A3241] font-medium">
                  {activeNode.interdisciplinaryNotes}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-white border border-[#2B2331] flex items-center justify-between text-xs font-bold">
                <span className="text-[#5A4D61] flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-[#2B2331]" />
                  Đề thi có chủ đề này:
                </span>
                <span className="font-black text-[#2B2331]">
                  {activeNode.examCount} đề
                </span>
              </div>
            </div>

            <div className="pt-4 border-t border-[#2B2331]/20">
              <button
                type="button"
                onClick={() => {
                  onFilterTopic?.(activeNode.label, activeNode.subject);
                  onClose();
                }}
                className="ff-tactile-pop btn-feastables w-full py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-[#2B2331] border-2 border-[#2B2331] font-black text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer shadow-[3px_3px_0px_#2B2331]"
              >
                <span>Xem {activeNode.examCount} Đề Thực Chiến Chuyên Đề Này</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
