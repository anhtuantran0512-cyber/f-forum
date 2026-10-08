/* Bản quyền trí tuệ thuộc về BroAmStuck */import React, { useMemo, useState, useRef } from 'react';

interface DataPoint {
  label: string;
  value: number;
  color?: string;
}

interface DataVizChartProps {
  data: DataPoint[];
  title?: string;
  subtitle?: string;
  height?: number;
  width?: number;
  showGrid?: boolean;
  showLabels?: boolean;
  gradientColors?: [string, string];
  className?: string;
  "aria-label"?: string;
}

export const DataVizChart: React.FC<DataVizChartProps> = ({
  data,
  title,
  subtitle,
  height = 280,
  width = 400,
  showGrid = true,
  showLabels = true,
  gradientColors = ['rgba(245,158,11,0.3)', 'rgba(244,114,182,0.1)'],
  className = '',
  "aria-label": ariaLabel = 'Biểu đồ dữ liệu',
}) => {
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    label: string;
    value: number;
  }>({ visible: false, x: 0, y: 0, label: '', value: 0 });
  
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate chart geometry
  const geometry = useMemo(() => {
    const padding = { top: 24, right: 24, bottom: 40, left: 48 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    
    const maxValue = Math.max(...data.map(d => d.value), 1);
    const minValue = Math.min(...data.map(d => d.value), 0);
    const range = maxValue - minValue || 1;
    
    const xScale = (index: number) => padding.left + (index / (data.length - 1 || 1)) * chartWidth;
    const yScale = (value: number) => padding.top + chartHeight - ((value - minValue) / range) * chartHeight;
    
    return { padding, chartWidth, chartHeight, maxValue, minValue, xScale, yScale };
  }, [width, height, data]);

  // Generate smooth bezier path using Catmull-Rom to Bezier conversion
  const pathData = useMemo(() => {
    if (data.length === 0) return '';
    
    const { xScale, yScale } = geometry;
    
    // Build smooth curve
    let path = '';
    const points = data.map((d, i) => ({ x: xScale(i), y: yScale(d.value) }));
    
    // Move to first point
    path += `M ${points[0].x} ${points[0].y}`;
    
    // Catmull-Rom spline through points
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(0, i - 1)];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[Math.min(points.length - 1, i + 2)];
      
      // Control points for smooth curve
      const tension = 0.3;
      const cp1x = p1.x + (p2.x - p0.x) * tension;
      const cp1y = p1.y + (p2.y - p0.y) * tension;
      const cp2x = p2.x - (p3.x - p1.x) * tension;
      const cp2y = p2.y - (p3.y - p1.y) * tension;
      
      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }
    
    return path;
  }, [data, geometry]);

  // Generate gradient fill path (area under curve)
  const areaPath = useMemo(() => {
    if (!pathData) return '';
    const { padding, chartHeight } = geometry;
    
    // Close the path to bottom
    return `${pathData} L ${geometry.xScale(data.length - 1)} ${padding.top + chartHeight} L ${geometry.xScale(0)} ${padding.top + chartHeight} Z`;
  }, [pathData, geometry, data]);

  // Grid lines
  const gridLines = useMemo(() => {
    if (!showGrid) return [];
    const { chartHeight, chartWidth, padding } = geometry;
    const stepCount = 5;
    
    return Array.from({ length: stepCount + 1 }, () => {
      const y = padding.top + ((stepCount - 1) / stepCount) * chartHeight;
      return (
        <line
          key={padding.top + y}
          x1={padding.left}
          y1={y}
          x2={padding.left + chartWidth}
          y2={y}
          className="data-viz-chart__grid"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth="1"
          strokeDasharray="4 4"
        />
      );
    });
  }, [showGrid, geometry]);

  // X-axis labels
  const xLabels = useMemo(() => {
    if (!showLabels) return [];
    const { xScale } = geometry;
    const step = Math.max(1, Math.floor(data.length / 6));
    
    return data
      .filter((_, i) => i % step === 0 || i === data.length - 1)
      .map((d) => {
        const originalIndex = data.indexOf(d);
        return (
          <text
            key={originalIndex}
            x={xScale(originalIndex)}
            y={height - 8}
            textAnchor="middle"
            className="data-viz-chart__axis"
            fill="rgba(255,255,255,0.4)"
            fontSize="10"
            fontFamily="ui-monospace, monospace"
          >
            {d.label}
          </text>
        );
      });
  }, [data, showLabels, geometry, height]);

  // Y-axis labels
  const yLabels = useMemo(() => {
    if (!showLabels) return [];
    const { chartHeight, padding, maxValue, minValue } = geometry;
    const steps = 5;
    
    const items: React.ReactNode[] = [];
    for (let k = 0; k <= steps; k++) {
      const val = Math.round(maxValue - (k / steps) * (maxValue - minValue));
      const y = padding.top + (k / steps) * chartHeight;
      items.push(
        <text
          key={k}
          x={padding.left - 8}
          y={y + 3}
          textAnchor="end"
          className="data-viz-chart__axis"
          fill="rgba(255,255,255,0.3)"
          fontSize="10"
          fontFamily="ui-monospace, monospace"
        >
          {val.toLocaleString()}
        </text>
      );
    }
    return items;
  }, [showLabels, geometry]);

  // Handle hover interaction
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || data.length === 0) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const { padding, chartWidth, xScale } = geometry;
    
    if (x < padding.left || x > padding.left + chartWidth) {
      setTooltip(prev => ({ ...prev, visible: false }));
      return;
    }
    
    // Find nearest data point
    const relativeX = (x - padding.left) / chartWidth;
    const index = Math.round(relativeX * (data.length - 1));
    const clampedIndex = Math.max(0, Math.min(data.length - 1, index));
    const point = data[clampedIndex];
    
    const yScale = geometry.yScale(point.value);
    
    setTooltip({
      visible: true,
      x: xScale(clampedIndex),
      y: yScale - 10,
      label: point.label,
      value: point.value,
    });
  };

  const handleMouseLeave = () => {
    setTooltip(prev => ({ ...prev, visible: false }));
  };

  // SVG defs for gradient
  const gradientId = `gradient-${Math.random().toString(36).slice(2, 9)}`;

  return (
    <div
      ref={containerRef}
      className={`data-viz-chart ${className}`}
      style={{
        height,
        position: 'relative',
        background: 'rgba(15,22,32,0.75)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '1rem',
        padding: '1.5rem',
        overflow: 'hidden',
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      role="img"
      aria-label={ariaLabel}
    >
      {/* Header */}
      {(title || subtitle) && (
        <div style={{ marginBottom: 16 }}>
          {title && (
            <div
              style={{
                color: '#f1f5f9',
                fontSize: '14px',
                fontWeight: 700,
                marginBottom: subtitle ? 4 : 0,
              }}
            >
              {title}
            </div>
          )}
          {subtitle && (
            <div
              style={{
                color: 'rgba(100,116,139,1)',
                fontSize: '11px',
                fontWeight: 400,
              }}
            >
              {subtitle}
            </div>
          )}
        </div>
      )}

      {/* SVG Chart */}
      <svg
        ref={svgRef}
        width="100%"
        height={height - (title || subtitle ? 48 : 0)}
        viewBox={`0 0 ${width} ${height}`}
        style={{ display: 'block' }}
        aria-hidden="true"
      >
        <defs>
          {/* Gradient fill for area under curve */}
          <linearGradient
            id={gradientId}
            x1="0%"
            y1="0%"
            x2="0%"
            y2="100%"
          >
            <stop
              offset="0%"
              stopColor={gradientColors[0]}
              stopOpacity={0.6}
            />
            <stop
              offset="100%"
              stopColor={gradientColors[1]}
              stopOpacity={0.1}
            />
          </linearGradient>

          {/* Glow filter for line */}
          <filter id={`glow-${gradientId}`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Grid lines */}
        {gridLines}

        {/* Gradient area fill */}
        {areaPath && (
          <path
            d={areaPath}
            fill={`url(#${gradientId})`}
            opacity={0.5}
          />
        )}

        {/* Main data line with glow */}
        {pathData && (
          <path
            d={pathData}
            fill="none"
            stroke={gradientColors[0].replace('0.3', '1').replace('0.1', '0.8')}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter={`url(#glow-${gradientId})`}
            style={{
              filter: 'drop-shadow(0 0 6px rgba(245,158,11,0.4))',
            }}
          />
        )}

        {/* Data points */}
        {data.map((d) => (        <circle
            key={`point-${d.label}`}
            cx={geometry.xScale(data.indexOf(d))}
            cy={geometry.yScale(d.value)}
            r={4}
            fill={d.color || gradientColors[0].replace('0.3', '1')}
            stroke="rgba(8,11,17,0.8)"
            strokeWidth="2"
            style={{
              filter: 'drop-shadow(0 0 4px rgba(245,158,11,0.3))',
              transition: 'r 0.2s ease, filter 0.2s ease',
            }}
            className="data-viz-chart__point"
            onMouseEnter={(_e) => {
              /* Hover handled via CSS */
            }}
            onMouseLeave={(_e) => {
              /* Hover handled via CSS */
            }}
          />
        ))}

        {/* X-axis labels */}
        {xLabels}

        {/* Y-axis labels */}
        {yLabels}
      </svg>

      {/* Tooltip */}
      {tooltip.visible && (
        <div
          className="data-viz-chart__tooltip visible"
          style={{
            left: Math.min(Math.max(tooltip.x, 60), width - 120),
            top: tooltip.y,
            transform: 'translate(-50%, -100%)',
            background: 'rgba(8,11,17,0.95)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '0.5rem',
            padding: '0.5rem 0.75rem',
            fontSize: '12px',
            color: '#f1f5f9',
            position: 'absolute',
            pointerEvents: 'none',
            zIndex: 10,
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
            whiteSpace: 'nowrap',
          }}
        >
          <div style={{ fontWeight: 600, color: 'rgba(255,255,255,0.6)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {tooltip.label}
          </div>
          <div style={{ fontWeight: 800, fontSize: '14px', color: '#f59e0b', fontFamily: 'ui-monospace, monospace' }}>
            {tooltip.value.toLocaleString()}
          </div>
        </div>
      )}

      {/* Empty state */}
      {data.length === 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: height - (title || subtitle ? 48 : 0),
            color: 'rgba(100,116,139,1)',
            fontSize: '13px',
          }}
        >
          Chưa có dữ liệu
        </div>
      )}
    </div>
  );
};

// Mini sparkline variant for inline use
interface MiniSparklineProps {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
  className?: string;
}

export const MiniSparkline: React.FC<MiniSparklineProps> = ({
  data,
  color = '#f59e0b',
  width = 60,
  height = 20,
  className = '',
}) => {
  const pathData = useMemo(() => {
    if (data.length === 0) return '';
    const max = Math.max(...data, 1);
    const min = Math.min(...data, 0);
    const range = max - min || 1;
    
    const points = data.map((v, i) => ({
      x: (i / (data.length - 1 || 1)) * width,
      y: height - ((v - min) / range) * height * 0.8 - height * 0.1,
    }));
    
    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      path += ` L ${points[i].x} ${points[i].y}`;
    }
    return path;
  }, [data, width, height]);

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      style={{ overflow: 'visible' }}
      aria-hidden="true"
    >
      <path
        d={pathData}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default DataVizChart;
