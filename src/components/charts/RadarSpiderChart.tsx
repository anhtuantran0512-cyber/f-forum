/* Bản quyền trí tuệ thuộc về BroAmStuck */
/**
 * RadarSpiderChart — biểu đồ mạng nhện SVG thuần (EPIC 5 · hiệu năng).
 *
 * Thay cho `recharts` (kéo theo cả d3): thư viện đó chiếm ~300 kB trong chunk
 * ProfileModal (440 kB) chỉ để vẽ MỘT biểu đồ 5 trục. Bản này giữ nguyên giao
 * diện cũ (lưới đa giác, nhãn trục, viền vàng #EAB308, nền xanh mờ, chấm cyan,
 * tooltip nền tối) và thêm:
 *  - truy cập bằng bàn phím: mỗi đỉnh focus được, tooltip hiện khi focus;
 *  - `role="img"` + aria-label tóm tắt số liệu cho trình đọc màn hình;
 *  - không có vòng lặp animation; hiệu ứng "nở" một lần, tắt khi giảm chuyển động.
 */
import React, { useId, useMemo, useState } from 'react';
import './RadarSpiderChart.css';

export interface RadarDatum {
  /** Nhãn ngắn trên trục (vd. "KHTN"). */
  name: string;
  /** Tên đầy đủ trong tooltip (vd. "Khoa Học Tự Nhiên"). */
  full?: string;
  /** Điểm 0..max. */
  score: number;
}

interface RadarSpiderChartProps {
  data: RadarDatum[];
  max?: number;
  /** Số vòng lưới đồng tâm. */
  rings?: number;
  /** Nhãn cho trình đọc màn hình. */
  title?: string;
  className?: string;
  /** Màu viền đa giác dữ liệu (mặc định vàng #EAB308 như biểu đồ cũ). */
  stroke?: string;
  /** Màu nền đa giác dữ liệu. */
  fill?: string;
  /** Màu chấm đỉnh. */
  dotFill?: string;
}

const VIEW_W = 320;
const VIEW_H = 270;
const CX = VIEW_W / 2;
const CY = VIEW_H / 2;
/* outerRadius="70%" của recharts ≈ 70% nửa cạnh ngắn. */
const RADIUS = Math.round((Math.min(VIEW_W, VIEW_H) / 2) * 0.7);

const pointAt = (index: number, count: number, ratio: number) => {
  const angle = -Math.PI / 2 + (index * 2 * Math.PI) / count;
  return { x: CX + Math.cos(angle) * RADIUS * ratio, y: CY + Math.sin(angle) * RADIUS * ratio, angle };
};

const toPath = (points: Array<{ x: number; y: number }>) =>
  points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ') + ' Z';

const RadarSpiderChartImpl: React.FC<RadarSpiderChartProps> = ({
  data,
  max = 100,
  rings = 4,
  title = 'Biểu đồ mạng nhện',
  className = '',
  stroke,
  fill,
  dotFill,
}) => {
  const [active, setActive] = useState<number | null>(null);
  const tooltipId = useId();
  const count = Math.max(3, data.length);

  const geometry = useMemo(() => {
    const safeMax = max > 0 ? max : 100;
    const ringPaths = Array.from({ length: rings }, (_, r) =>
      toPath(Array.from({ length: count }, (_, i) => pointAt(i, count, (r + 1) / rings))),
    );
    const spokes = Array.from({ length: count }, (_, i) => pointAt(i, count, 1));
    const values = data.map((d, i) => {
      const ratio = Math.min(1, Math.max(0, (Number(d.score) || 0) / safeMax));
      return { ...pointAt(i, count, ratio), datum: d };
    });
    const labels = data.map((d, i) => {
      const p = pointAt(i, count, 1.2);
      const anchor: 'start' | 'middle' | 'end' = Math.abs(p.x - CX) < 6 ? 'middle' : p.x > CX ? 'start' : 'end';
      return { x: p.x, y: p.y, anchor, text: d.name };
    });
    return { ringPaths, spokes, values, labels, area: toPath(values) };
  }, [data, max, rings, count]);

  const summary = data.map((d) => `${d.full || d.name} ${Math.round(Number(d.score) || 0)}%`).join(', ');
  const activePoint = active !== null ? geometry.values[active] : null;

  return (
    <div
      className={`ff-radar ${className}`}
      onMouseLeave={() => setActive(null)}
      style={
        {
          ...(stroke ? { '--radar-stroke': stroke } : {}),
          ...(fill ? { '--radar-fill': fill } : {}),
          ...(dotFill ? { '--radar-dot': dotFill } : {}),
        } as React.CSSProperties
      }
    >
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        width="100%"
        height="100%"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={`${title}: ${summary}`}
      >
        <g className="ff-radar__grid" aria-hidden="true">
          {geometry.ringPaths.map((d, i) => (
            <path key={`ring-${i}`} d={d} />
          ))}
          {geometry.spokes.map((p, i) => (
            <line key={`spoke-${i}`} x1={CX} y1={CY} x2={p.x} y2={p.y} />
          ))}
        </g>

        <g className="ff-radar__labels" aria-hidden="true">
          {geometry.labels.map((l, i) => (
            <text key={`label-${i}`} x={l.x} y={l.y} textAnchor={l.anchor} dominantBaseline="middle">
              {l.text}
            </text>
          ))}
        </g>

        <g className="ff-radar__series" style={{ transformOrigin: `${CX}px ${CY}px` }}>
          <path className="ff-radar__area" d={geometry.area} />
          {geometry.values.map((p, i) => (
            <circle
              key={`dot-${i}`}
              className={`ff-radar__dot${active === i ? ' is-active' : ''}`}
              cx={p.x}
              cy={p.y}
              r={active === i ? 6 : 4.5}
              tabIndex={0}
              aria-label={`${p.datum.full || p.datum.name}: ${Math.round(Number(p.datum.score) || 0)}%`}
              aria-describedby={active === i ? tooltipId : undefined}
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive((cur) => (cur === i ? null : cur))}
            />
          ))}
        </g>
      </svg>

      {activePoint && (
        <div
          id={tooltipId}
          role="tooltip"
          className="ff-radar__tooltip"
          style={{
            left: `${(activePoint.x / VIEW_W) * 100}%`,
            top: `${(activePoint.y / VIEW_H) * 100}%`,
          }}
        >
          <span className="ff-radar__tooltip-label">{activePoint.datum.name}</span>
          <span className="ff-radar__tooltip-value">
            {activePoint.datum.full || activePoint.datum.name} : {Math.round(Number(activePoint.datum.score) || 0)}%
          </span>
        </div>
      )}
    </div>
  );
};

export const RadarSpiderChart = React.memo(RadarSpiderChartImpl);
