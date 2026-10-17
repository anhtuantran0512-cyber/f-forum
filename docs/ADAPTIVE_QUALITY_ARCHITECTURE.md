# Adaptive quality and performance reporting

This document describes the implementation in the repository, not a production-scale architecture or a benchmark result. The client uses a small set of browser hints to choose effect budgets. Missing values stay unavailable; the balanced tier is the default until enough signals are present.

## Client behavior

`src/utils/adaptiveQuality.ts` reads device memory, logical CPU count, connection hints, Save-Data, screen size, reduced-motion preference, WebGL renderer details, and—when permitted—the Battery API. Browser support varies; values can be coarse, hidden, or absent. GPU tier is a renderer-name heuristic, not a measured benchmark. The application does not run a startup FPS test.

The three quality tiers currently affect the particle-count multiplier and the maximum number of other users’ decorative animations admitted by the in-view budget. The tier labels do **not** mean that the application has separate 4K/HD/SD media files. The current catalog exposes its original media URL; no invented quality query parameters are appended.

Decorative and landing-page videos use native browser loading and playback. They are deferred until near the viewport, use conservative `preload` hints, pause when out of view or when the tab is hidden, and respect reduced-motion settings. The landing video also stays unloaded when Save-Data is enabled. Unsupported decorative video codecs use the available still asset where one exists. The code does not fetch whole videos into application-managed Blob URLs.

OAuth scripts are loaded by the relevant sign-in action rather than every page visit. CBT, flashcard, saved-paper, and print/export dialogs in the Exam Vault are split into lazy-loaded chunks.

## Server behavior

`server/adaptiveScale.ts` contains bounded in-process `Map` caches, ETag generation, targeted invalidation, a process-local wrapper counter for selected local-store reads/writes, and a small `setImmediate` task callback scheduler. These are useful single-process mechanisms only:

- The second cache `Map` is not Redis, and cache state is lost when the process exits.
- Cache headers, including `CDN-Cache-Control`, are returned by the application. This repository does not provision or verify a CDN edge.
- The local JSON store is not a relational database. There are no read replicas, physical shards, connection pool, or independently deployed shop/forum services in this code path.
- The task callback map is volatile and process-local. It is not BullMQ/RabbitMQ, durable storage, or a worker service.
- Read/write counters cover only calls routed through the wrappers, not all I/O in the application.

## Optional browser RUM

When supported, the client observes Largest Contentful Paint and the first-input delay from browser performance entries. Chromium’s `performance.memory` is included only when exposed; the current animation budget is also reported. Unsupported or invalid fields are omitted, not imputed. A page sends at most one snapshot after 12 seconds, so shorter visits and pages closed before that point are absent; this can bias the sample toward longer visits. The report is sent with `credentials: 'omit'` and is not attached to an account.

The server validates finite values and aggregates means and sample counts in memory, grouped by a tier value supplied by the client. Clients can modify that value and the sample contents; the values are **unverified observations**, not independent measurements. Aggregates reset when the process restarts. The dashboard shows no value when a metric has no samples and does not claim percentiles or a production-wide population. This implementation does not report FPS or SSIM as RUM.

`computeSSIM` and `evaluateOptimizationABTest` are standalone utilities. Their presence and unit tests do not mean an A/B experiment ran or that an optimization passed a production quality gate. No verified experiment rows are currently reported. An SSIM threshold is a configurable heuristic, not proof that an image difference is imperceptible.

## What automated tests establish

The tests cover code behavior such as classification from supplied hints, particle calculations, viewport-based loading rules, native media fallback, targeted cache invalidation, optional RUM validation, and authorization for the admin report. They are regression tests; they do not establish real-world LCP/FID/FPS, complete feature parity on every device, multi-node reliability, or production capacity.
