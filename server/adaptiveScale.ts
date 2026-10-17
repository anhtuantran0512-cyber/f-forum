/* Bản quyền trí tuệ thuộc về BroAmStuck */
/**
 * Process-local cache, selected store-operation counters, volatile task callbacks,
 * and browser-reported RUM. These single-process helpers are not Redis,
 * database replicas/shards, independent services, or a durable message queue.
 */
import crypto from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';

export type ServerQualityTier = 'tier-a' | 'tier-b' | 'tier-c';
type CacheLayer = 'L1' | 'L2-memory' | 'loader';

interface CacheEntry<T = unknown> {
  key: string;
  value: T;
  etag: string;
  tags: string[];
  createdAt: number;
  expiresAt: number;
  hits: number;
}

export interface CacheStatsSnapshot {
  l1Hits: number;
  l2Hits: number;
  conditional304Hits: number;
  misses: number;
  invalidations: number;
  totalKeys: number;
  hitRatePercent: number | null;
  backend: 'in-process-memory';
}

/** Two bounded Maps in this Node process; the second map is not a Redis client. */
export class MultiLayerCache {
  private l1 = new Map<string, CacheEntry>();
  private l2MemoryStore = new Map<string, string>();
  private maxEntries: number;
  private maxL2Entries: number;
  private l1Hits = 0;
  private l2Hits = 0;
  private conditional304Hits = 0;
  private misses = 0;
  private invalidations = 0;

  constructor(maxEntries = 1000) {
    this.maxEntries = Math.max(1, Math.floor(maxEntries));
    this.maxL2Entries = Math.max(this.maxEntries, this.maxEntries * 4);
  }

  private computeEtag(payload: unknown): string {
    const raw = typeof payload === 'string' ? payload : JSON.stringify(payload);
    return `"ff-${crypto.createHash('sha1').update(raw).digest('hex').slice(0, 16)}"`;
  }

  async getOrLoad<T>(
    key: string,
    loader: () => Promise<T> | T,
    options: { ttlMs?: number; tags?: string[] } = {},
  ): Promise<{ value: T; etag: string; layer: CacheLayer }> {
    const now = Date.now();
    const ttlMs = Math.max(0, options.ttlMs ?? 30_000);
    const tags = options.tags ?? [];
    const l1Entry = this.l1.get(key);

    if (l1Entry && l1Entry.expiresAt > now) {
      l1Entry.hits += 1;
      this.l1Hits += 1;
      return { value: l1Entry.value as T, etag: l1Entry.etag, layer: 'L1' };
    }

    const l2Raw = this.l2MemoryStore.get(key);
    if (l2Raw) {
      try {
        const parsed = JSON.parse(l2Raw) as CacheEntry<T>;
        if (parsed.expiresAt > now) {
          this.l2Hits += 1;
          this.l1.set(key, parsed);
          this.trimMap(this.l1);
          return { value: parsed.value, etag: parsed.etag, layer: 'L2-memory' };
        }
        this.l2MemoryStore.delete(key);
      } catch {
        this.l2MemoryStore.delete(key);
      }
    }

    this.misses += 1;
    const value = await loader();
    this.set(key, value, { ttlMs, tags });
    const fresh = this.l1.get(key);
    if (!fresh) return { value, etag: this.computeEtag(value), layer: 'loader' };
    return { value, etag: fresh.etag, layer: 'loader' };
  }

  private trimMap<T>(map: Map<string, T>, limit = this.maxEntries): void {
    while (map.size > limit) {
      const oldestKey = map.keys().next().value as string | undefined;
      if (oldestKey === undefined) return;
      map.delete(oldestKey);
    }
  }

  set<T>(key: string, value: T, options: { ttlMs?: number; tags?: string[] } = {}): CacheEntry<T> {
    const now = Date.now();
    const entry: CacheEntry<T> = {
      key,
      value,
      etag: this.computeEtag(value),
      tags: options.tags ?? [],
      createdAt: now,
      expiresAt: now + Math.max(0, options.ttlMs ?? 30_000),
      hits: 0,
    };
    this.l1.set(key, entry);
    this.trimMap(this.l1);
    try {
      this.l2MemoryStore.set(key, JSON.stringify(entry));
      this.trimMap(this.l2MemoryStore, this.maxL2Entries);
    } catch {
      /* Keep the L1 entry; a payload that cannot serialize has no L2 copy. */
    }
    return entry;
  }

  invalidateKey(key: string): boolean {
    const removed = this.l1.delete(key) || this.l2MemoryStore.delete(key);
    /* Ensure both levels are deleted even when L1 already contained the key. */
    this.l1.delete(key);
    this.l2MemoryStore.delete(key);
    if (removed) this.invalidations += 1;
    return removed;
  }

  invalidateByTag(tag: string): number {
    const targets = new Set<string>();
    const matches = (key: string, tags: string[]) => tags.includes(tag) || key.startsWith(`${tag}:`);
    for (const [key, entry] of this.l1.entries()) {
      if (matches(key, entry.tags)) targets.add(key);
    }
    for (const [key, raw] of this.l2MemoryStore.entries()) {
      try {
        const entry = JSON.parse(raw) as CacheEntry;
        if (matches(key, entry.tags || [])) targets.add(key);
      } catch {
        targets.add(key);
      }
    }
    for (const key of targets) {
      this.l1.delete(key);
      this.l2MemoryStore.delete(key);
    }
    if (targets.size > 0) this.invalidations += targets.size;
    return targets.size;
  }

  recordConditional304Hit(): void {
    this.conditional304Hits += 1;
  }

  getStats(): CacheStatsSnapshot {
    const memoryHits = this.l1Hits + this.l2Hits;
    const measuredLookups = memoryHits + this.misses;
    return {
      l1Hits: this.l1Hits,
      l2Hits: this.l2Hits,
      conditional304Hits: this.conditional304Hits,
      misses: this.misses,
      invalidations: this.invalidations,
      totalKeys: this.l1.size,
      hitRatePercent: measuredLookups > 0 ? Number(((memoryHits / measuredLookups) * 100).toFixed(2)) : null,
      backend: 'in-process-memory',
    };
  }
}

export interface ProcessLocalDataAccessStats {
  readOperations: number;
  writeOperations: number;
  totalOperations: number;
  activeOperations: number;
}

/** Counts only calls routed through these local wrappers. */
export class ProcessLocalDataAccess {
  private readOperations = 0;
  private writeOperations = 0;
  private activeOperations = 0;

  executeRead<T>(fn: () => T): { result: T } {
    this.readOperations += 1;
    this.activeOperations += 1;
    try {
      return { result: fn() };
    } finally {
      this.activeOperations = Math.max(0, this.activeOperations - 1);
    }
  }

  executeWrite<T>(cache: MultiLayerCache, invalidateKeysOrTags: string[], fn: () => T): T {
    this.writeOperations += 1;
    this.activeOperations += 1;
    try {
      const result = fn();
      for (const target of invalidateKeysOrTags) {
        if (!cache.invalidateKey(target)) cache.invalidateByTag(target);
      }
      return result;
    } finally {
      this.activeOperations = Math.max(0, this.activeOperations - 1);
    }
  }

  getStats(): ProcessLocalDataAccessStats {
    return {
      readOperations: this.readOperations,
      writeOperations: this.writeOperations,
      totalOperations: this.readOperations + this.writeOperations,
      activeOperations: this.activeOperations,
    };
  }
}

export interface QueuedTask<TPayload = unknown, TResult = unknown> {
  jobId: string;
  topic: 'gacha.pull' | 'reward.compute' | 'media.transcode' | 'catalog.warm';
  payload: TPayload;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  createdAt: number;
  completedAt?: number;
  result?: TResult;
}

/** Volatile in-process setImmediate scheduler; jobs are neither durable nor isolated. */
export class ProcessLocalTaskScheduler {
  private shopHandlerCalls = 0;
  private queueJobs = new Map<string, QueuedTask>();
  private completedJobs = 0;
  private failedJobs = 0;
  private droppedJobs = 0;

  runShopHandler<T>(fn: () => T): T {
    this.shopHandlerCalls += 1;
    return fn();
  }

  enqueueTask<TPayload, TResult>(
    topic: QueuedTask['topic'],
    payload: TPayload,
    processor: (payload: TPayload) => TResult,
    onCompleted?: (job: QueuedTask<TPayload, TResult>) => void,
  ): QueuedTask<TPayload, TResult> {
    const job: QueuedTask<TPayload, TResult> = {
      jobId: `job_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      topic,
      payload,
      status: 'queued',
      createdAt: Date.now(),
    };
    this.queueJobs.set(job.jobId, job);
    while (this.queueJobs.size > 200) {
      const oldestKey = this.queueJobs.keys().next().value as string | undefined;
      if (oldestKey === undefined) break;
      this.queueJobs.delete(oldestKey);
      this.droppedJobs += 1;
    }

    setImmediate(() => {
      try {
        job.status = 'processing';
        job.result = processor(payload);
        job.status = 'completed';
        job.completedAt = Date.now();
        this.completedJobs += 1;
        onCompleted?.(job);
      } catch {
        job.status = 'failed';
        job.completedAt = Date.now();
        this.failedJobs += 1;
      }
    });
    return job;
  }

  getStats() {
    return {
      shopHandlerCalls: this.shopHandlerCalls,
      taskScheduler: {
        engine: 'in-process setImmediate',
        durability: 'volatile; lost on process restart',
        completedJobs: this.completedJobs,
        failedJobs: this.failedJobs,
        pendingJobs: Array.from(this.queueJobs.values()).filter((job) => job.status === 'queued' || job.status === 'processing').length,
        droppedJobs: this.droppedJobs,
      },
    };
  }
}

interface MetricAggregate {
  count: number;
  sum: number;
}
interface TierMetricState {
  reports: number;
  lcpMs: MetricAggregate;
  firstInputDelayMs: MetricAggregate;
  jsHeapMb: MetricAggregate;
  activeAnimations: MetricAggregate;
}
export interface RumMetricSummary {
  samples: number;
  average: number | null;
}
export interface TierPerformanceBucket {
  tier: ServerQualityTier;
  label: string;
  reports: number;
  metrics: {
    lcpMs: RumMetricSummary;
    firstInputDelayMs: RumMetricSummary;
    jsHeapMb: RumMetricSummary;
    activeAnimations: RumMetricSummary;
  };
}

const emptyMetric = (): MetricAggregate => ({ count: 0, sum: 0 });
const emptyTierState = (): TierMetricState => ({
  reports: 0,
  lcpMs: emptyMetric(),
  firstInputDelayMs: emptyMetric(),
  jsHeapMb: emptyMetric(),
  activeAnimations: emptyMetric(),
});
const validMetric = (value: unknown, min: number, max: number): number | null =>
  typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max ? value : null;
const summarize = (metric: MetricAggregate, digits = 0): RumMetricSummary => ({
  samples: metric.count,
  average: metric.count > 0 ? Number((metric.sum / metric.count).toFixed(digits)) : null,
});

/** Aggregates only explicit finite browser measurements; no seeded or fallback values. */
export class AdaptivePerformanceMonitor {
  private buckets: Record<ServerQualityTier, TierMetricState> = {
    'tier-a': emptyTierState(),
    'tier-b': emptyTierState(),
    'tier-c': emptyTierState(),
  };

  recordSample(input: {
    tier?: unknown;
    lcpMs?: unknown;
    firstInputDelayMs?: unknown;
    jsHeapMb?: unknown;
    activeAnimations?: unknown;
  }): ServerQualityTier | null {
    const tier = input.tier;
    if (tier !== 'tier-a' && tier !== 'tier-b' && tier !== 'tier-c') return null;
    const values = {
      lcpMs: validMetric(input.lcpMs, 1, 120_000),
      firstInputDelayMs: validMetric(input.firstInputDelayMs, 0, 60_000),
      jsHeapMb: validMetric(input.jsHeapMb, 1, 8_192),
      activeAnimations: validMetric(input.activeAnimations, 0, 10_000),
    };
    if (Object.values(values).every((value) => value === null)) return null;
    const bucket = this.buckets[tier];
    bucket.reports += 1;
    for (const key of Object.keys(values) as Array<keyof typeof values>) {
      const value = values[key];
      if (value === null) continue;
      bucket[key].count += 1;
      bucket[key].sum += value;
    }
    return tier;
  }

  getTierReport(): Record<ServerQualityTier, TierPerformanceBucket> {
    const labels: Record<ServerQualityTier, string> = {
      'tier-a': 'Tier A · High resource hints',
      'tier-b': 'Tier B · Balanced fallback',
      'tier-c': 'Tier C · Resource-saving hints',
    };
    const build = (tier: ServerQualityTier): TierPerformanceBucket => {
      const bucket = this.buckets[tier];
      return {
        tier,
        label: labels[tier],
        reports: bucket.reports,
        metrics: {
          lcpMs: summarize(bucket.lcpMs),
          firstInputDelayMs: summarize(bucket.firstInputDelayMs),
          jsHeapMb: summarize(bucket.jsHeapMb, 1),
          activeAnimations: summarize(bucket.activeAnimations, 1),
        },
      };
    };
    return {
      'tier-a': build('tier-a'),
      'tier-b': build('tier-b'),
      'tier-c': build('tier-c'),
    };
  }
}

export const multiLayerCache = new MultiLayerCache(1200);
export const localDataAccess = new ProcessLocalDataAccess();
export const processLocalTasks = new ProcessLocalTaskScheduler();
export const adaptivePerfMonitor = new AdaptivePerformanceMonitor();

/** Set HTTP cache headers and answer conditional 304 requests in this process. */
export const respondWithCacheHeaders = (
  req: IncomingMessage,
  res: ServerResponse,
  etag: string,
  maxAgeSec = 60,
  swrSec = 300,
): boolean => {
  res.setHeader('ETag', etag);
  res.setHeader('Cache-Control', `public, max-age=${maxAgeSec}, stale-while-revalidate=${swrSec}`);
  res.setHeader('CDN-Cache-Control', `public, s-maxage=${maxAgeSec * 2}, stale-while-revalidate=${swrSec * 2}`);
  res.setHeader('Vary', 'Accept-Encoding');
  const ifNoneMatch = req.headers['if-none-match'];
  if (ifNoneMatch && String(ifNoneMatch).trim() === etag) {
    multiLayerCache.recordConditional304Hit();
    res.statusCode = 304;
    res.end();
    return true;
  }
  return false;
};
