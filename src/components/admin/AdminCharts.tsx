/* Bản quyền trí tuệ thuộc về BroAmStuck */
/**
 * Bộ biểu đồ "Data Visualization Art" cho Bảng quản trị (Epic 3 — Nhiemvu.md):
 *  - SmoothAreaChart: đường cong Bezier mượt (monotone cubic — không bao giờ vọt
 *    xuống dưới 0), gradient fill bên dưới, tooltip trượt mượt theo con trỏ / phím mũi tên.
 *  - StatusDonut: vòng phân đoạn báo cáo theo trạng thái, nét vẽ chạy vào khi mở.
 *  - RetentionGauge: cung bán nguyệt tỷ lệ giữ chân.
 * SVG thuần, không thêm thư viện; tôn trọng prefers-reduced-motion và lớp .reduce-motion.
 */
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FC,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';
import { donutArcs, monotonePath, niceCeiling } from './adminConstants';
import './AdminCharts.css';

export interface ChartPoint {
  key: string;
  label: string;
  value: number;
}

export type ChartTone = 'cyan' | 'violet' | 'mint' | 'amber';

const TONES: Record<ChartTone, { from: string; to: string; glow: string }> = {
  cyan: { from: '#22d3ee', to: '#818cf8', glow: 'rgba(34, 211, 238, 0.55)' },
  violet: { from: '#a78bfa', to: '#f472b6', glow: 'rgba(167, 139, 250, 0.55)' },
  mint: { from: '#34d399', to: '#22d3ee', glow: 'rgba(52, 211, 153, 0.55)' },
  amber: { from: '#fbbf24', to: '#fb7185', glow: 'rgba(251, 191, 36, 0.5)' },
};

const prefersReducedMotion = (): boolean => {
  if (typeof window === 'undefined') return false;
  if (document.documentElement.classList.contains('reduce-motion')) return true;
  return Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
};

const VIEW_W = 1000;
const PAD_X = 14;
const PAD_TOP = 18;
const PAD_BOTTOM = 8;

interface SmoothAreaChartProps {
  points: ChartPoint[];
  formatValue: (value: number) => string;
  ariaLabel: string;
  tone?: ChartTone;
  height?: number;
  emptyLabel?: string;
}

export const SmoothAreaChart: FC<SmoothAreaChartProps> = ({
  points,
  formatValue,
  ariaLabel,
  tone = 'cyan',
  height = 196,
  emptyLabel = 'Chưa có hoạt động trong kỳ này',
}) => {
  const uid = useId().replace(/:/g, '');
  const wrapRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<number | null>(null);
  const [reduceMotion] = useState(prefersReducedMotion);
  const palette = TONES[tone];

  const geometry = useMemo(() => {
    const n = points.length;
    const rawMax = Math.max(0, ...points.map((point) => point.value));
    const max = niceCeiling(rawMax);
    const usableH = height - PAD_TOP - PAD_BOTTOM;
    const baseY = height - PAD_BOTTOM;
    const xs = points.map((_, index) => (n <= 1 ? VIEW_W / 2 : PAD_X + (index * (VIEW_W - PAD_X * 2)) / (n - 1)));
    const ys = points.map((point) => PAD_TOP + (1 - Math.max(0, point.value) / max) * usableH);
    const line = monotonePath(xs, ys);
    const area = n > 0 ? `${line} L${xs[n - 1].toFixed(2)},${baseY} L${xs[0].toFixed(2)},${baseY} Z` : '';
    const peakIndex = rawMax > 0 ? points.findIndex((point) => point.value === rawMax) : -1;
    const grid = [0, 1 / 3, 2 / 3, 1].map((fraction) => ({
      y: PAD_TOP + (1 - fraction) * usableH,
      value: max * fraction,
    }));
    return { n, max, rawMax, xs, ys, line, area, baseY, peakIndex, grid };
  }, [height, points]);

  const isEmpty = geometry.rawMax <= 0;
  const labelStep = Math.max(1, Math.ceil(geometry.n / 7));
  const pct = (x: number) => (x / VIEW_W) * 100;

  const pickIndexAt = (clientX: number) => {
    const wrap = wrapRef.current;
    if (!wrap || geometry.n === 0) return;
    const rect = wrap.getBoundingClientRect();
    const viewX = ((clientX - rect.left) / Math.max(1, rect.width)) * VIEW_W;
    let best = 0;
    let bestDistance = Infinity;
    geometry.xs.forEach((x, index) => {
      const distance = Math.abs(x - viewX);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = index;
      }
    });
    setActive(best);
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => pickIndexAt(event.clientX);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (geometry.n === 0) return;
    const current = active ?? geometry.n - 1;
    let next = current;
    if (event.key === 'ArrowLeft') next = Math.max(0, current - 1);
    else if (event.key === 'ArrowRight') next = Math.min(geometry.n - 1, current + 1);
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = geometry.n - 1;
    else return;
    event.preventDefault();
    setActive(next);
  };

  const activePoint = active !== null ? points[active] : null;
  const activeX = active !== null ? pct(geometry.xs[active]) : 0;
  const activeY = active !== null ? geometry.ys[active] : 0;
  const previous = active !== null && active > 0 ? points[active - 1].value : null;
  const delta = activePoint && previous !== null && previous > 0
    ? Math.round(((activePoint.value - previous) / previous) * 100)
    : null;
  /* Gần mép thì lệch tooltip vào trong để không bị cắt. */
  const tipShift = activeX < 14 ? '-12%' : activeX > 86 ? '-88%' : '-50%';
  const lastIndex = geometry.n - 1;

  return (
    <div className="ffc-area" style={{ '--ffc-from': palette.from, '--ffc-to': palette.to, '--ffc-glow': palette.glow } as CSSProperties}>
      <div
        ref={wrapRef}
        className="ffc-area__plot"
        style={{ height }}
        role="group"
        aria-label={`${ariaLabel}. Dùng phím mũi tên trái/phải để duyệt từng mốc.`}
        tabIndex={0}
        onPointerMove={onPointerMove}
        onPointerDown={onPointerMove}
        onPointerLeave={() => setActive(null)}
        onFocus={() => setActive((value) => value ?? (geometry.n > 0 ? geometry.n - 1 : null))}
        onBlur={() => setActive(null)}
        onKeyDown={onKeyDown}
      >
        {geometry.grid.map((line, index) => (
          <span key={index} className="ffc-area__ylabel" style={{ top: line.y }} aria-hidden="true">
            {index === 0 ? '' : formatValue(line.value)}
          </span>
        ))}

        <svg
          className="ffc-area__svg"
          viewBox={`0 0 ${VIEW_W} ${height}`}
          preserveAspectRatio="none"
          aria-hidden="true"
          focusable="false"
        >
          <defs>
            <linearGradient id={`ffc-fill-${uid}`} gradientUnits="userSpaceOnUse" x1="0" y1={PAD_TOP} x2="0" y2={geometry.baseY}>
              <stop offset="0%" stopColor={palette.from} stopOpacity="0.42" />
              <stop offset="55%" stopColor={palette.to} stopOpacity="0.12" />
              <stop offset="100%" stopColor={palette.to} stopOpacity="0" />
            </linearGradient>
            <linearGradient id={`ffc-stroke-${uid}`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2={VIEW_W} y2="0">
              <stop offset="0%" stopColor={palette.from} />
              <stop offset="100%" stopColor={palette.to} />
            </linearGradient>
            <clipPath id={`ffc-reveal-${uid}`}>
              <rect x="0" y="0" width={reduceMotion ? VIEW_W : 0} height={height}>
                {!reduceMotion && (
                  <animate
                    attributeName="width"
                    from="0"
                    to={VIEW_W}
                    dur="1.15s"
                    fill="freeze"
                    calcMode="spline"
                    keyTimes="0;1"
                    keySplines="0.22 1 0.36 1"
                  />
                )}
              </rect>
            </clipPath>
          </defs>

          {geometry.grid.map((line, index) => (
            <line
              key={index}
              x1="0"
              x2={VIEW_W}
              y1={line.y}
              y2={line.y}
              className={index === 0 ? 'ffc-area__baseline' : 'ffc-area__grid'}
              vectorEffect="non-scaling-stroke"
            />
          ))}

          <g clipPath={`url(#ffc-reveal-${uid})`}>
            <path d={geometry.area} fill={`url(#ffc-fill-${uid})`} className="ffc-area__fill" />
            <path
              d={geometry.line}
              fill="none"
              stroke={`url(#ffc-stroke-${uid})`}
              strokeWidth="6"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="ffc-area__halo"
              vectorEffect="non-scaling-stroke"
            />
            <path
              d={geometry.line}
              fill="none"
              stroke={`url(#ffc-stroke-${uid})`}
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="ffc-area__line"
              vectorEffect="non-scaling-stroke"
            />
          </g>
        </svg>

        {/* Mốc mới nhất: chấm "trực tiếp" phập phồng nhẹ khi chưa hover. */}
        {!isEmpty && active === null && lastIndex >= 0 && (
          <span
            className="ffc-area__live"
            style={{ left: `${pct(geometry.xs[lastIndex])}%`, top: geometry.ys[lastIndex] }}
            aria-hidden="true"
          />
        )}

        {/* Nhãn đỉnh — điểm nhấn thị giác cho giá trị cao nhất. */}
        {!isEmpty && geometry.peakIndex >= 0 && active === null && (
          <span
            className="ffc-area__peak"
            style={{ left: `${pct(geometry.xs[geometry.peakIndex])}%`, top: geometry.ys[geometry.peakIndex] }}
            aria-hidden="true"
          >
            Đỉnh · {formatValue(geometry.rawMax)}
          </span>
        )}

        {isEmpty && <span className="ffc-area__empty">{emptyLabel}</span>}

        {activePoint && (
          <>
            <span className="ffc-area__guide" style={{ left: `${activeX}%` }} aria-hidden="true" />
            <span className="ffc-area__dot" style={{ left: `${activeX}%`, top: activeY }} aria-hidden="true" />
            <div
              className="ffc-area__tip"
              style={{ left: `${activeX}%`, top: Math.max(4, activeY - 70), '--ffc-tip-shift': tipShift } as CSSProperties}
              aria-hidden="true"
            >
              <small>{activePoint.label}</small>
              <b>{formatValue(activePoint.value)}</b>
              {delta !== null && (
                <em className={delta >= 0 ? 'is-up' : 'is-down'}>
                  {delta >= 0 ? '+' : ''}{delta}% so với mốc trước
                </em>
              )}
            </div>
          </>
        )}

        <span className="sr-only" aria-live="polite">
          {activePoint ? `${activePoint.label}: ${formatValue(activePoint.value)}` : ''}
        </span>
      </div>

      <div className="ffc-area__xlabels" aria-hidden="true">
        {points.map((point, index) => {
          if (index % labelStep !== 0 && index !== lastIndex) return null;
          if (index !== lastIndex && lastIndex - index < labelStep / 2) return null;
          const edge = index === 0 ? 'is-first' : index === lastIndex ? 'is-last' : '';
          return (
            <span
              key={point.key}
              className={`${edge} ${active === index ? 'is-active' : ''}`}
              style={{ left: `${pct(geometry.xs[index])}%` }}
            >
              {point.label}
            </span>
          );
        })}
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */

export interface DonutSegment {
  key: string;
  label: string;
  value: number;
  color: string;
}

interface StatusDonutProps {
  segments: DonutSegment[];
  centerCaption: string;
  ariaLabel: string;
}

const DONUT_R = 46;
const DONUT_C = 2 * Math.PI * DONUT_R;

export const StatusDonut: FC<StatusDonutProps> = ({ segments, centerCaption, ariaLabel }) => {
  const [drawn, setDrawn] = useState(prefersReducedMotion);
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const total = segments.reduce((sum, segment) => sum + Math.max(0, segment.value), 0);

  useEffect(() => {
    if (drawn) return undefined;
    const frame = window.requestAnimationFrame(() => setDrawn(true));
    return () => window.cancelAnimationFrame(frame);
  }, [drawn]);

  const gap = total > 0 && segments.filter((segment) => segment.value > 0).length > 1 ? 3 : 0;
  const arcs = donutArcs(segments, DONUT_C, gap);
  const focused = focusKey ? segments.find((segment) => segment.key === focusKey) : null;

  return (
    <div className="ffc-donut" role="img" aria-label={`${ariaLabel}: ${segments.map((segment) => `${segment.label} ${segment.value}`).join(', ')}`}>
      <div className="ffc-donut__ring">
        <svg viewBox="0 0 120 120" aria-hidden="true" focusable="false">
          <circle cx="60" cy="60" r={DONUT_R} className="ffc-donut__track" />
          {arcs.map((arc) => (
            <circle
              key={arc.key}
              cx="60"
              cy="60"
              r={DONUT_R}
              className={`ffc-donut__arc ${focusKey && focusKey !== arc.key ? 'is-dim' : ''}`}
              stroke={arc.color}
              strokeDasharray={`${drawn ? arc.visible : 0} ${DONUT_C}`}
              strokeDashoffset={-arc.offset}
              transform="rotate(-90 60 60)"
              style={{ '--ffc-arc-glow': arc.color } as CSSProperties}
            />
          ))}
        </svg>
        <div className="ffc-donut__center">
          <b>{focused ? focused.value : total}</b>
          <small>{focused ? focused.label : centerCaption}</small>
        </div>
      </div>
      <ul className="ffc-donut__legend">
        {segments.map((segment) => (
          <li
            key={segment.key}
            onMouseEnter={() => setFocusKey(segment.key)}
            onMouseLeave={() => setFocusKey(null)}
            className={focusKey === segment.key ? 'is-focus' : ''}
          >
            <i style={{ background: segment.color, boxShadow: `0 0 10px ${segment.color}` }} aria-hidden="true" />
            <span>{segment.label}</span>
            <b>{segment.value}</b>
            <small>{total > 0 ? `${Math.round((segment.value / total) * 100)}%` : '0%'}</small>
          </li>
        ))}
      </ul>
    </div>
  );
};

/* -------------------------------------------------------------------------- */

interface RetentionGaugeProps {
  /** 0..1 */
  ratio: number;
  caption: string;
}

export const RetentionGauge: FC<RetentionGaugeProps> = ({ ratio, caption }) => {
  const [drawn, setDrawn] = useState(prefersReducedMotion);
  const safe = Math.max(0, Math.min(1, Number(ratio) || 0));
  const percent = Math.round(safe * 100);
  const uid = useId().replace(/:/g, '');

  useEffect(() => {
    if (drawn) return undefined;
    const frame = window.requestAnimationFrame(() => setDrawn(true));
    return () => window.cancelAnimationFrame(frame);
  }, [drawn]);

  return (
    <div className="ffc-gauge" role="img" aria-label={`${caption}: ${percent}%`}>
      <svg viewBox="0 0 120 68" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id={`ffc-gauge-${uid}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#22d3ee" />
          </linearGradient>
        </defs>
        <path d="M10,62 A50,50 0 0 1 110,62" className="ffc-gauge__track" pathLength={100} />
        <path
          d="M10,62 A50,50 0 0 1 110,62"
          className="ffc-gauge__value"
          pathLength={100}
          stroke={`url(#ffc-gauge-${uid})`}
          strokeDasharray="100 100"
          strokeDashoffset={drawn ? 100 - percent : 100}
        />
      </svg>
      <div className="ffc-gauge__label">
        <b>{percent}%</b>
        <small>{caption}</small>
      </div>
    </div>
  );
};
