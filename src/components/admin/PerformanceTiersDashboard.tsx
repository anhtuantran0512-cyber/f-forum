/* Bản quyền trí tuệ thuộc về BroAmStuck */
/**
 * OUTPUT 6 — Dashboard theo dõi Performance by Device Tier (Tier A / B / C),
 * Multi-layer Caching, Read Replicas, Microservice Queue & A/B Visual Quality (SSIM ≥ 0.95).
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  CheckCircle,
  Cpu,
  Database,
  Eye,
  Gauge,
  Layers,
  RefreshCw,
  Server,
  ShieldCheck,
  Sparkles,
  Wifi,
  Zap,
} from 'lucide-react';
import { useAdaptiveQuality, type AdaptiveQualityTier } from '../../utils/adaptiveQuality';
import { authHeaders } from '../../utils/session';

interface TierMetricRow {
  tier: AdaptiveQualityTier;
  label: string;
  samples: number;
  avgLcpMs: number;
  avgFidMs: number;
  avgFps: number;
  avgMemoryMb: number;
  avgSsim: number;
  videoResolution: string;
  particleEngine: string;
  featureParityPercent: number;
}

interface PerformanceTiersReport {
  generatedAt: string;
  tiers: Record<AdaptiveQualityTier, TierMetricRow>;
  cache: {
    l1Hits: number;
    l2Hits: number;
    edge304Hits: number;
    misses: number;
    invalidations: number;
    totalKeys: number;
    hitRatePercent: number;
    redisBackend: string;
  };
  dataPlane: {
    primaryWrites: number;
    replicaReads: number;
    readWriteRatio: string;
    shardCount: number;
    pool: {
      maxConnections: number;
      activeConnections: number;
      idleConnections: number;
      waitingRequests: number;
      totalAcquired: number;
    };
    replicas: Array<{
      id: string;
      region: string;
      readsHandled: number;
      activeConnections: number;
      healthy: boolean;
    }>;
  };
  services: {
    microservices: {
      shopGacha: {
        status: string;
        bulkheadLimit: number;
        activeWorkers: number;
        totalRequests: number;
        isolatedFromForumCore: boolean;
      };
      forumCore: {
        status: string;
        totalRequests: number;
      };
    };
    messageQueue: {
      engine: string;
      completedJobs: number;
      pendingJobs: number;
    };
  };
  abQualityExperiments: Array<{
    id: string;
    name: string;
    baselineLcpMs: number;
    optimizedLcpMs: number;
    ssimScore: number;
    minRequiredSsim: number;
    engagementDeltaPercent: number;
    status: string;
  }>;
}

export const PerformanceTiersDashboard: React.FC = () => {
  const { tier, detectedTier, overrideTier, setOverrideTier, profile, capabilities } =
    useAdaptiveQuality();
  const [report, setReport] = useState<PerformanceTiersReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadReport = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/performance-tiers', { headers: authHeaders() });
      const data = await res.json().catch(() => null);
      if (res.status !== 200 || !data?.success) {
        setError(data?.message || `Không tải được dữ liệu hiệu năng (HTTP ${res.status}).`);
        return;
      }
      setReport(data as PerformanceTiersReport);
      setError(null);
    } catch {
      setError('Không kết nối được máy chủ để tải dữ liệu hiệu năng đa tầng.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadReport();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadReport]);

  const tierList: TierMetricRow[] = report
    ? [report.tiers['tier-a'], report.tiers['tier-b'], report.tiers['tier-c']]
    : [];

  return (
    <div className="space-y-4 p-1 text-slate-100">
      {/* Header & Thiết bị hiện tại */}
      <div className="rounded-2xl border border-white/10 bg-[#0d1420] p-4 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-bold text-amber-300 border border-amber-400/30">
                <Zap size={12} /> ADAPTIVE QUALITY ARCHITECTURE
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300 border border-emerald-400/25">
                <CheckCircle size={11} /> 100% Feature Parity · SSIM ≥ 0.95
              </span>
            </div>
            <h3 className="mt-1.5 text-base font-bold text-white">
              Giám sát Chất lượng & Hiệu năng theo Phân tầng Thiết bị (Tier A / B / C)
            </h3>
            <p className="text-xs text-slate-400">
              Không cắt giảm nội dung hay tính năng — tự động điều chỉnh độ phân giải video (4K/HD/SD), mật độ WebGL particle và thứ tự ưu tiên theo phần cứng.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-slate-900/90 px-3 py-1.5 text-xs text-slate-300">
              <span>Chế độ máy này:</span>
              <select
                value={overrideTier}
                onChange={(e) => setOverrideTier(e.target.value as AdaptiveQualityTier | 'auto')}
                className="bg-transparent font-bold text-amber-300 focus:outline-none"
                aria-label="Chọn phân tầng chất lượng thiết bị"
              >
                <option value="auto" className="bg-slate-900 text-white">
                  Tự động ({detectedTier.toUpperCase()})
                </option>
                <option value="tier-a" className="bg-slate-900 text-white">
                  Tier A · 4K Ultra
                </option>
                <option value="tier-b" className="bg-slate-900 text-white">
                  Tier B · HD GPU
                </option>
                <option value="tier-c" className="bg-slate-900 text-white">
                  Tier C · Smart SD
                </option>
              </select>
            </label>
            <button
              type="button"
              onClick={() => void loadReport()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/10"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Làm mới
            </button>
          </div>
        </div>

        {/* Tín hiệu phần cứng trực tiếp của thiết bị đang mở */}
        <div className="mt-3.5 grid grid-cols-2 gap-2.5 sm:grid-cols-5">
          <div className="rounded-xl border border-white/8 bg-slate-900/70 p-2.5">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <Sparkles size={12} className="text-amber-400" /> Tier đang chạy
            </div>
            <div className="mt-1 text-sm font-bold text-amber-300">{capabilities.badgeText}</div>
            <div className="text-[11px] text-slate-400">Video: {capabilities.videoQuality.toUpperCase()}</div>
          </div>
          <div className="rounded-xl border border-white/8 bg-slate-900/70 p-2.5">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <Cpu size={12} className="text-[#81b29a]" /> CPU & RAM
            </div>
            <div className="mt-1 text-sm font-bold text-white">
              {profile.cores} nhân · ~{profile.memory} GB
            </div>
            <div className="text-[11px] text-slate-400">
              Particle: {Math.round(capabilities.particleScale * 100)}% (WebGL)
            </div>
          </div>
          <div className="rounded-xl border border-white/8 bg-slate-900/70 p-2.5">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <Gauge size={12} className="text-violet-400" /> GPU Renderer
            </div>
            <div className="mt-1 truncate text-xs font-bold text-white" title={profile.gpu.renderer}>
              Tier {profile.gpu.tier} · {profile.gpu.webgl2 ? 'WebGL2' : 'WebGL'}
            </div>
            <div className="truncate text-[10px] text-slate-400">{profile.gpu.renderer || 'Hardware GPU'}</div>
          </div>
          <div className="rounded-xl border border-white/8 bg-slate-900/70 p-2.5">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <Wifi size={12} className="text-emerald-400" /> Kết nối mạng
            </div>
            <div className="mt-1 text-sm font-bold text-white">
              {profile.connection.toUpperCase()} · {profile.downlinkMbps} Mbps
            </div>
            <div className="text-[11px] text-slate-400">
              Save-Data: {profile.saveData ? 'Đang bật' : 'Tắt'}
            </div>
          </div>
          <div className="rounded-xl border border-white/8 bg-slate-900/70 p-2.5">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <Eye size={12} className="text-[#f2cc8f]" /> Ưu tiên cá nhân
            </div>
            <div className="mt-1 text-sm font-bold text-emerald-300">fetchpriority=high</div>
            <div className="text-[11px] text-slate-400">
              Tối đa {capabilities.maxConcurrentOtherAnimations} video phụ
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200">
          {error}
        </div>
      )}

      {/* 3 cột Real User Monitoring theo Tier A / B / C */}
      {tierList.length > 0 && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {tierList.map((row) => {
            const isCurrent = row.tier === tier;
            const borderCls =
              row.tier === 'tier-a'
                ? 'border-amber-400/35'
                : row.tier === 'tier-b'
                  ? 'border-[#81b29a]/40'
                  : 'border-emerald-400/35';
            return (
              <div
                key={row.tier}
                className={`rounded-2xl border bg-[#0e1624] p-4 ${borderCls} ${isCurrent ? 'ring-1 ring-amber-400/50' : ''}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-amber-300">
                    {row.tier.toUpperCase()}
                  </span>
                  <span className="rounded-full bg-white/8 px-2 py-0.5 text-[11px] font-semibold text-slate-300">
                    {row.samples} mẫu RUM
                  </span>
                </div>
                <h4 className="mt-1 text-sm font-bold text-white">{row.label}</h4>

                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg bg-slate-900/80 p-2">
                    <span className="text-[10px] text-slate-400">LCP trung bình</span>
                    <div className="text-sm font-bold text-white">{row.avgLcpMs} ms</div>
                  </div>
                  <div className="rounded-lg bg-slate-900/80 p-2">
                    <span className="text-[10px] text-slate-400">FPS thực tế</span>
                    <div className="text-sm font-bold text-emerald-300">{row.avgFps} FPS</div>
                  </div>
                  <div className="rounded-lg bg-slate-900/80 p-2">
                    <span className="text-[10px] text-slate-400">FID / Phản hồi</span>
                    <div className="text-sm font-bold text-[#f2cc8f]">{row.avgFidMs} ms</div>
                  </div>
                  <div className="rounded-lg bg-slate-900/80 p-2">
                    <span className="text-[10px] text-slate-400">Điểm nét SSIM</span>
                    <div className="text-sm font-bold text-amber-300">{row.avgSsim}</div>
                  </div>
                </div>

                <div className="mt-3 space-y-1 border-t border-white/8 pt-2.5 text-[11px] text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Luồng Video:</span>
                    <b className="text-white">{row.videoResolution}</b>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Hệ hạt GPU:</span>
                    <b className="text-white">{row.particleEngine}</b>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Đầy đủ tính năng:</span>
                    <b className="text-emerald-300">{row.featureParityPercent}% (Không cắt bớt)</b>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Multi-layer Caching + Read Replicas + Microservice Queue */}
      {report && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-[#0d1420] p-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#81b29a]">
              <Layers size={14} /> Multi-Layer Cache (Edge + L1 + Redis)
            </div>
            <div className="mt-2.5 flex items-baseline justify-between">
              <span className="text-2xl font-extrabold text-white">{report.cache.hitRatePercent}%</span>
              <span className="text-xs text-emerald-300">Tỉ lệ trúng Cache</span>
            </div>
            <div className="mt-2.5 space-y-1 text-xs text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">L1 RAM / L2 Redis Hits:</span>
                <b>{report.cache.l1Hits} / {report.cache.l2Hits}</b>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Edge 304 Not Modified:</span>
                <b>{report.cache.edge304Hits}</b>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Smart Key Invalidations:</span>
                <b className="text-amber-300">{report.cache.invalidations} (Chỉ xoá key đổi)</b>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0d1420] p-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-violet-300">
              <Database size={14} /> Read Replicas & Sharding
            </div>
            <div className="mt-2.5 text-sm font-bold text-white">{report.dataPlane.readWriteRatio}</div>
            <div className="mt-2 space-y-1 text-xs text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">Horizontal Shards:</span>
                <b>{report.dataPlane.shardCount} phân mảnh (user_id)</b>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Connection Pool:</span>
                <b>{report.dataPlane.pool.activeConnections}/{report.dataPlane.pool.maxConnections} kết nối</b>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400"> Cụm Read Replicas:</span>
                <b className="text-emerald-300">{report.dataPlane.replicas.length} node Online</b>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0d1420] p-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-300">
              <Server size={14} /> Microservices & Message Queue
            </div>
            <div className="mt-2.5 text-sm font-bold text-emerald-300">
              Shop/Gacha tách biệt khỏi Forum Core
            </div>
            <div className="mt-2 space-y-1 text-xs text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">Shop/Gacha Bulkhead:</span>
                <b>{report.services.microservices.shopGacha.activeWorkers}/{report.services.microservices.shopGacha.bulkheadLimit} luồng</b>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Async Queue Engine:</span>
                <b>{report.services.messageQueue.engine.split(' ')[0]}</b>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Tác vụ hoàn tất qua WS:</span>
                <b>{report.services.messageQueue.completedJobs} jobs</b>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* A/B Testing Visual Quality Gate (SSIM >= 0.95) */}
      {report && report.abQualityExperiments.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-[#0d1420] p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-300">
              <ShieldCheck size={15} /> Kiểm định A/B Testing & Ngưỡng Chất lượng Hình ảnh (SSIM ≥ 0.95)
            </div>
            <span className="text-[11px] text-slate-400">
              Chỉ áp dụng tối ưu khi SSIM &gt; 0.95 &amp; không giảm tương tác
            </span>
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-[11px] text-slate-400">
                  <th className="pb-2 font-semibold">Hạng mục tối ưu</th>
                  <th className="pb-2 font-semibold">LCP Trước → Sau</th>
                  <th className="pb-2 font-semibold">Điểm SSIM</th>
                  <th className="pb-2 font-semibold">Tương tác</th>
                  <th className="pb-2 font-semibold">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/6">
                {report.abQualityExperiments.map((exp) => (
                  <tr key={exp.id}>
                    <td className="py-2 font-semibold text-white">{exp.name}</td>
                    <td className="py-2 text-slate-300">
                      {exp.baselineLcpMs}ms → <b className="text-emerald-300">{exp.optimizedLcpMs}ms</b>
                    </td>
                    <td className="py-2 font-bold text-amber-300">
                      {exp.ssimScore} <span className="text-[10px] text-slate-400">(≥ {exp.minRequiredSsim})</span>
                    </td>
                    <td className="py-2 font-semibold text-[#81b29a]">
                      +{exp.engagementDeltaPercent}%
                    </td>
                    <td className="py-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                        <Activity size={10} /> {exp.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
