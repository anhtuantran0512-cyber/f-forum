/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React, { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  AlertCircle,
  Cpu,
  Database,
  Gauge,
  Layers,
  RefreshCw,
  Server,
  Sparkles,
  Wifi,
  Zap,
} from 'lucide-react';
import { useAdaptiveQuality, type AdaptiveQualityTier } from '../../utils/adaptiveQuality';
import { authHeaders } from '../../utils/session';
import './PerformanceTiersDashboard.css';

interface MetricSummary {
  samples: number;
  average: number | null;
}
interface TierMetricRow {
  tier: AdaptiveQualityTier;
  label: string;
  reports: number;
  metrics: {
    lcpMs: MetricSummary;
    firstInputDelayMs: MetricSummary;
    jsHeapMb: MetricSummary;
    activeAnimations: MetricSummary;
  };
}
interface PerformanceTiersReport {
  generatedAt: string;
  tiers: Record<AdaptiveQualityTier, TierMetricRow>;
  cache: {
    l1Hits: number;
    l2Hits: number;
    conditional304Hits: number;
    misses: number;
    invalidations: number;
    totalKeys: number;
    hitRatePercent: number | null;
    backend: 'in-process-memory';
  };
  dataAccess: {
    readOperations: number;
    writeOperations: number;
    totalOperations: number;
    activeOperations: number;
  };
  processLocal: {
    shopHandlerCalls: number;
    taskScheduler: {
      engine: string;
      durability: string;
      completedJobs: number;
      failedJobs: number;
      pendingJobs: number;
      droppedJobs: number;
    };
  };
  abQualityExperiments: Array<{ id: string; name: string; status: string }>;
}

const formatMetric = (metric: MetricSummary, unit: string, digits = 0): string => {
  if (metric.average === null) return 'Chưa có mẫu';
  return `${metric.average.toLocaleString('vi-VN', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })} ${unit}`;
};
const sampleCount = (metric: MetricSummary): string =>
  `${metric.samples.toLocaleString('vi-VN')} mẫu đo`;
const readHint = (value: number | null, unit = ''): string =>
  value === null ? 'Không được trình duyệt cung cấp' : `${value.toLocaleString('vi-VN')}${unit}`;

const MetricCard = ({ label, value, detail }: { label: string; value: string; detail: string }) => (
  <div className="ff-performance-metric">
    <div className="ff-performance-muted text-[11px]">{label}</div>
    <div className="ff-performance-title mt-1 text-base font-bold">{value}</div>
    <div className="ff-performance-muted mt-0.5 text-[10px]">{detail}</div>
  </div>
);

export const PerformanceTiersDashboard: React.FC = () => {
  const { tier, detectedTier, overrideTier, setOverrideTier, profile, capabilities, reasons, isReady } =
    useAdaptiveQuality();
  const [report, setReport] = useState<PerformanceTiersReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadReport = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/performance-tiers', { headers: authHeaders() });
      const data = await response.json().catch(() => null);
      if (response.status !== 200 || !data?.success) {
        setError(data?.message || `Không tải được báo cáo (HTTP ${response.status}).`);
        return;
      }
      setReport(data as PerformanceTiersReport);
      setError(null);
    } catch {
      setError('Không kết nối được máy chủ để tải báo cáo.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadReport(), 0);
    return () => window.clearTimeout(timer);
  }, [loadReport]);

  const tierRows = report
    ? [report.tiers['tier-a'], report.tiers['tier-b'], report.tiers['tier-c']]
    : [];

  return (
    <div className="ff-performance-dashboard space-y-4 p-1">
      <section className="ff-performance-panel rounded-2xl p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="ff-performance-chip inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold">
                <Zap size={12} /> ADAPTIVE QUALITY
              </span>
              <span className="ff-performance-muted text-[11px]">Prototype · browser hints, not a capacity guarantee</span>
            </div>
            <h3 className="ff-performance-title mt-2 text-lg font-bold sm:text-xl">Hiệu năng, có số đo mới nói</h3>
            <p className="ff-performance-muted mt-1 max-w-3xl text-xs leading-relaxed">
              Tier điều khiển ngân sách hiệu ứng và hạt. Trình duyệt có thể giấu hoặc làm tròn tín hiệu; thiếu dữ liệu sẽ hiện rõ, không tự đoán.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="ff-performance-control inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs">
              <span>Mức hiệu ứng</span>
              <select
                value={overrideTier}
                onChange={(event) => setOverrideTier(event.target.value as AdaptiveQualityTier | 'auto')}
                aria-label="Chọn mức hiệu ứng thích ứng"
                className="ff-performance-select rounded-lg px-2 py-1 font-bold"
              >
                <option value="auto">Tự động · {detectedTier.toUpperCase()}</option>
                <option value="tier-a">Đầy đủ</option>
                <option value="tier-b">Cân bằng</option>
                <option value="tier-c">Tiết kiệm</option>
              </select>
            </label>
            <button
              type="button"
              onClick={() => void loadReport()}
              className="ff-performance-button inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold"
              aria-label="Làm mới báo cáo hiệu năng"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Làm mới
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <div className="ff-performance-subpanel rounded-xl p-3">
            <div className="ff-performance-muted flex items-center gap-2 text-[11px]"><Sparkles size={13} /> Tier đang chạy</div>
            <div className="ff-performance-title mt-1 text-sm font-bold">{capabilities.badgeText}</div>
            <div className="ff-performance-muted mt-1 text-[10px]">{isReady ? `Được suy ra: ${reasons.join(' · ') || 'cấu hình mặc định cân bằng'}` : 'Đang đọc tín hiệu thiết bị'}</div>
          </div>
          <div className="ff-performance-subpanel rounded-xl p-3">
            <div className="ff-performance-muted flex items-center gap-2 text-[11px]"><Cpu size={13} /> CPU & bộ nhớ</div>
            <div className="ff-performance-title mt-1 text-sm font-bold">
              {isReady ? `${readHint(profile.cores)} nhân · ${readHint(profile.memory, ' GB')}` : 'Đang đọc'}
            </div>
            <div className="ff-performance-muted mt-1 text-[10px]">deviceMemory là tín hiệu thô, không phải RAM khả dụng.</div>
          </div>
          <div className="ff-performance-subpanel rounded-xl p-3">
            <div className="ff-performance-muted flex items-center gap-2 text-[11px]"><Gauge size={13} /> GPU & hiệu ứng</div>
            <div className="ff-performance-title mt-1 truncate text-sm font-bold" title={profile.gpu.renderer || undefined}>
              {!isReady ? 'Đang kiểm tra' : profile.gpu.renderer || 'Tên GPU không được cung cấp'}
            </div>
            <div className="ff-performance-muted mt-1 text-[10px]">
              {isReady ? `WebGL${profile.gpu.webgl2 ? '2' : profile.gpu.webgl ? '' : ' · không khả dụng'} · particle ×${capabilities.particleScale}` : 'Chờ kiểm tra'}
            </div>
          </div>
          <div className="ff-performance-subpanel rounded-xl p-3">
            <div className="ff-performance-muted flex items-center gap-2 text-[11px]"><Wifi size={13} /> Kết nối</div>
            <div className="ff-performance-title mt-1 text-sm font-bold">
              {!isReady ? 'Đang đọc' : `${profile.connection.toUpperCase()} · ${readHint(profile.downlinkMbps, ' Mbps')}`}
            </div>
            <div className="ff-performance-muted mt-1 text-[10px]">
              Save-Data: {!isReady || profile.saveData === null ? 'không rõ' : profile.saveData ? 'bật' : 'tắt'} · giảm chuyển động: {!isReady || profile.prefersReducedMotion === null ? 'không rõ' : profile.prefersReducedMotion ? 'bật' : 'tắt'}
            </div>
          </div>
        </div>
      </section>

      {error && (
        <div className="ff-performance-warning flex items-start gap-2 rounded-xl p-3 text-xs" role="alert">
          <AlertCircle size={15} className="mt-0.5 shrink-0" /> {error}
        </div>
      )}

      <section className="ff-performance-panel rounded-2xl p-4 sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h4 className="ff-performance-title flex items-center gap-2 text-sm font-bold"><Activity size={15} /> Real-user observations</h4>
            <p className="ff-performance-muted mt-1 text-[11px]">Trung bình theo mẫu đã gửi, không phải percentile hay benchmark lab.</p>
          </div>
          {report && <time className="ff-performance-muted text-[10px]" dateTime={report.generatedAt}>Cập nhật {new Date(report.generatedAt).toLocaleString('vi-VN')}</time>}
        </div>
        {loading && !report ? (
          <div className="ff-performance-muted mt-4 rounded-xl p-5 text-center text-sm">Đang tải số liệu…</div>
        ) : tierRows.length === 0 ? (
          <div className="ff-performance-muted mt-4 rounded-xl p-5 text-center text-sm">Chưa có dữ liệu để hiển thị.</div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
            {tierRows.map((row) => (
              <article key={row.tier} className={`ff-performance-tier rounded-xl p-3 ${row.tier === tier ? 'is-current' : ''}`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h5 className="ff-performance-title text-sm font-bold">{row.label}</h5>
                    <p className="ff-performance-muted mt-0.5 text-[10px]">{row.reports.toLocaleString('vi-VN')} báo cáo có ít nhất một số đo · tier do client chọn</p>
                  </div>
                  <span className="ff-performance-tier-tag rounded-full px-2 py-0.5 text-[10px] font-bold">{row.tier.toUpperCase()}</span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <MetricCard label="Largest Contentful Paint · mean" value={formatMetric(row.metrics.lcpMs, 'ms')} detail={sampleCount(row.metrics.lcpMs)} />
                  <MetricCard label="First input delay · mean" value={formatMetric(row.metrics.firstInputDelayMs, 'ms')} detail={sampleCount(row.metrics.firstInputDelayMs)} />
                  <MetricCard label="JS heap · Chromium" value={formatMetric(row.metrics.jsHeapMb, 'MB', 1)} detail={sampleCount(row.metrics.jsHeapMb)} />
                  <MetricCard label="Active decoration slots" value={formatMetric(row.metrics.activeAnimations, 'slots', 1)} detail={sampleCount(row.metrics.activeAnimations)} />
                </div>
              </article>
            ))}
          </div>
        )}
        <p className="ff-performance-muted mt-3 text-[10px] leading-relaxed">
          Mẫu ẩn danh do client gửi, không gắn tài khoản; số client gửi chưa được xác minh độc lập và chỉ nằm trong tiến trình máy chủ hiện tại.
        </p>
      </section>

      {report && (
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
          <section className="ff-performance-panel rounded-2xl p-4">
            <h4 className="ff-performance-title flex items-center gap-2 text-xs font-bold"><Layers size={14} /> Application cache</h4>
            <p className="ff-performance-muted mt-1 text-[10px]">Hai Map trong cùng tiến trình Node; không có client Redis.</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <MetricCard label="L1 hits" value={String(report.cache.l1Hits)} detail="Map bộ nhớ thứ nhất" />
              <MetricCard label="L2-memory hits" value={String(report.cache.l2Hits)} detail="Map bộ nhớ thứ hai" />
              <MetricCard label="Conditional 304" value={String(report.cache.conditional304Hits)} detail="Phản hồi của ứng dụng" />
              <MetricCard label="Hit rate · lookup" value={report.cache.hitRatePercent === null ? 'Chưa có mẫu' : `${report.cache.hitRatePercent}%`} detail={`${report.cache.misses} misses`} />
            </div>
          </section>
          <section className="ff-performance-panel rounded-2xl p-4">
            <h4 className="ff-performance-title flex items-center gap-2 text-xs font-bold"><Database size={14} /> Selected store wrappers</h4>
            <p className="ff-performance-muted mt-1 text-[10px]">Đếm thao tác đọc/ghi đi qua wrapper; không có replica hay physical sharding.</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <MetricCard label="Reads" value={String(report.dataAccess.readOperations)} detail="Các route được bọc" />
              <MetricCard label="Writes" value={String(report.dataAccess.writeOperations)} detail="Các route được bọc" />
              <MetricCard label="Operations" value={String(report.dataAccess.totalOperations)} detail={`${report.dataAccess.activeOperations} đang chạy`} />
              <MetricCard label="Invalidations" value={String(report.cache.invalidations)} detail={`${report.cache.totalKeys} khóa L1 hiện còn`} />
            </div>
          </section>
          <section className="ff-performance-panel rounded-2xl p-4">
            <h4 className="ff-performance-title flex items-center gap-2 text-xs font-bold"><Server size={14} /> Process-local tasks</h4>
            <p className="ff-performance-muted mt-1 text-[10px]">Callback bằng setImmediate; volatile, không độc lập với tiến trình.</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <MetricCard label="Shop handler calls" value={String(report.processLocal.shopHandlerCalls)} detail="Trong process hiện tại" />
              <MetricCard label="Completed / failed" value={`${report.processLocal.taskScheduler.completedJobs} / ${report.processLocal.taskScheduler.failedJobs}`} detail="Tác vụ chạy trong process" />
              <MetricCard label="Pending" value={String(report.processLocal.taskScheduler.pendingJobs)} detail="Hàng đợi volatile" />
              <MetricCard label="Dropped from memory" value={String(report.processLocal.taskScheduler.droppedJobs)} detail="Bị loại khi Map quá giới hạn" />
            </div>
          </section>
        </div>
      )}

      <section className="ff-performance-panel rounded-2xl p-4 sm:p-5">
        <h4 className="ff-performance-title flex items-center gap-2 text-sm font-bold"><Activity size={15} /> Quality experiments</h4>
        {report?.abQualityExperiments.length ? (
          <ul className="mt-2 space-y-1 text-xs">{report.abQualityExperiments.map((experiment) => <li key={experiment.id}>{experiment.name} · {experiment.status}</li>)}</ul>
        ) : (
          <p className="ff-performance-muted mt-1 text-xs">Chưa có thử nghiệm A/B được xác minh. Tiện ích SSIM/threshold trong mã không đồng nghĩa thử nghiệm đã chạy.</p>
        )}
        <div className="ff-performance-muted mt-3 flex items-start gap-2 rounded-xl p-3 text-[10px] leading-relaxed">
          <AlertCircle size={13} className="mt-0.5 shrink-0" />
          Không có Redis, database replicas/shards, dịch vụ tách tiến trình hay durable queue trong triển khai này. Báo cáo mô tả prototype một tiến trình; không chứng minh năng lực tải production.
        </div>
      </section>
    </div>
  );
};
