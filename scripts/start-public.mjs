#!/usr/bin/env node

/**
 * fforum_broamstuck_studio - Temporary Production Preview Runner
 *
 * Builds and serves the production bundle before an explicitly requested public tunnel:
 * - Never exposes Vite's development server, source modules, or HMR endpoint.
 * - Uses a dedicated preview port and fails closed if another process owns it.
 * - Test/dry-run mode builds and checks locally but never opens a public tunnel.
 * - Uses the maintained untun / cloudflared tunnel runner.
 * - Clean process-group termination on SIGINT, SIGTERM, and SIGHUP.
 */

import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const PORT = Number.parseInt(process.env.PORT || '4173', 10);
if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65_535) {
  throw new Error('PORT must be an integer between 1 and 65535.');
}
const LOCAL_HOST_URL = `http://localhost:${PORT}`;

const isTestMode = process.argv.includes('--test') || process.argv.includes('--dry-run');

/* Track child processes */
let buildProcess = null;
let previewProcess = null;
let cfProcess = null;
let isSpawnedPreview = false;
let isShuttingDown = false;

/* Resolve runner for local packages or global npx fallback */
function getNodeRunner(name) {
  const configs = {
    vite: {
      localScript: path.join(projectRoot, 'node_modules', 'vite', 'bin', 'vite.js'),
      binName: 'vite',
      pkgName: 'vite',
    },
    untun: {
      localScript: path.join(projectRoot, 'node_modules', 'untun', 'dist', 'cli.mjs'),
      binName: 'untun',
      pkgName: 'untun',
    },
  };

  const cfg = configs[name] || { binName: name, pkgName: name };

  if (cfg.localScript && fs.existsSync(cfg.localScript)) {
    return { cmd: process.execPath, prefixArgs: [cfg.localScript] };
  }

  const binPath = path.join(projectRoot, 'node_modules', '.bin', cfg.binName);
  if (fs.existsSync(binPath)) {
    return { cmd: binPath, prefixArgs: [] };
  }

  throw new Error(`Required local package "${cfg.pkgName}" is missing. Run npm ci before starting the public preview.`);
}

function runProductionBuild() {
  return new Promise((resolve, reject) => {
    const npmCli = process.env.npm_execpath;
    const command = npmCli ? process.execPath : process.platform === 'win32' ? 'npm.cmd' : 'npm';
    const args = npmCli ? [npmCli, 'run', 'build'] : ['run', 'build'];
    buildProcess = spawn(command, args, {
      cwd: projectRoot,
      detached: process.platform !== 'win32',
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'production' },
      shell: !npmCli && process.platform === 'win32',
    });

    let settled = false;
    const finish = (error) => {
      if (settled) return;
      settled = true;
      buildProcess = null;
      if (error) reject(error);
      else resolve();
    };

    buildProcess.once('error', (error) => finish(error));
    buildProcess.once('exit', (code, signal) => {
      if (code === 0) finish();
      else finish(new Error(`Production build failed${signal ? ` (${signal})` : ` with exit code ${code}`}.`));
    });
  });
}

/* Function to check if HTTP endpoint is responsive without duplicate timer leaks */
function checkHttpReady(url, maxWaitMs = 25000, intervalMs = 250) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    let settled = false;
    let timerId = null;

    const cleanupTimers = () => {
      if (timerId) {
        clearTimeout(timerId);
        timerId = null;
      }
    };

    const probe = () => {
      if (settled) return;

      const req = http.get(url, (res) => {
        if (!settled) {
          settled = true;
          cleanupTimers();
          res.resume();
          resolve(true);
        }
      });

      const handleFailure = () => {
        if (settled) return;
        if (Date.now() - start > maxWaitMs) {
          settled = true;
          cleanupTimers();
          reject(new Error(`Timed out waiting for ${url} to respond within ${maxWaitMs}ms`));
        } else {
          timerId = setTimeout(probe, intervalMs);
        }
      };

      req.on('error', handleFailure);

      req.setTimeout(1500, () => {
        req.destroy();
      });
    };

    probe();
  });
}

/* Check if port is already active */
function isPortActive(port) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (result) => {
      if (!settled) {
        settled = true;
        resolve(result);
      }
    };

    const req = http.get(`http://127.0.0.1:${port}`, (res) => {
      res.resume();
      finish(true);
    });

    req.on('error', () => finish(false));

    req.setTimeout(800, () => {
      req.destroy();
      finish(false);
    });
  });
}

function getLanIp() {
  try {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name] || []) {
        if (iface.family === 'IPv4' && !iface.internal) {
          return iface.address;
        }
      }
    }
  } catch {
    /* bỏ qua lỗi đọc mạng */
  }
  return null;
}

/* Format and print terminal status banner */
function printStatusBanner(publicUrl) {
  const lanIp = getLanIp();
  console.log('\n' + '='.repeat(68));
  console.log('🚀 F-FORUM ĐANG CHẠY HOSTING CÔNG KHAI (PRODUCTION PREVIEW)');
  console.log(`⚡ LINK TRUY CẬP (INTERNET) : ${publicUrl}`);
  if (lanIp) {
    console.log(`📱 MẠNG NỘI BỘ (LAN/WI-FI)  : http://${lanIp}:${PORT}`);
  }
  console.log(`💻 MÁY CHỦ NỘI BỘ (LOCAL)   : ${LOCAL_HOST_URL}`);
  console.log('📡 Bất kỳ ai mở link Cloudflare trên đều có thể vào web bình thường!');
  console.log('='.repeat(68) + '\n');
}

/* Safely kill process group and descendants */
function killProcessGroup(proc, signal = 'SIGTERM') {
  if (!proc || proc.exitCode !== null || proc.signalCode !== null) return;
  try {
    if (proc.pid) {
      try {
        process.kill(-proc.pid, signal);
      } catch {
        proc.kill(signal);
      }
    }
  } catch {
/* Process already exited */
  }
}

/* Clean termination handler */
function cleanup(exitCode = 0) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log('\n🛑 Shutting down fforum_broamstuck_studio deployment pipeline...');

/* Stop the public tunnel before shutting down the production preview. */
  killProcessGroup(cfProcess, 'SIGTERM');
  if (buildProcess) killProcessGroup(buildProcess, 'SIGTERM');
  if (isSpawnedPreview && previewProcess) killProcessGroup(previewProcess, 'SIGTERM');

/* Forceful cleanup after grace period to avoid lingering child processes. */
  setTimeout(() => {
    killProcessGroup(cfProcess, 'SIGKILL');
    if (buildProcess) killProcessGroup(buildProcess, 'SIGKILL');
    if (isSpawnedPreview && previewProcess) killProcessGroup(previewProcess, 'SIGKILL');
    console.log('✅ Cleanup complete. Exiting gracefully.\n');
    process.exit(exitCode);
  }, 350);
}

/* Register signal handlers */
process.on('SIGINT', () => cleanup(0));
process.on('SIGTERM', () => cleanup(0));
process.on('SIGHUP', () => cleanup(0));
process.on('uncaughtException', (err) => {
  console.error('\n❌ Uncaught Exception:', err.message);
  cleanup(1);
});
process.on('unhandledRejection', (reason) => {
  console.error('\n❌ Unhandled Rejection:', reason);
  cleanup(1);
});

/* Build and launch Vite's production preview; never tunnel the dev server. */
async function ensureProductionPreviewServer() {
  if (await isPortActive(PORT)) {
    throw new Error(`Port ${PORT} is already in use. Stop that server or choose another PORT before opening a tunnel.`);
  }

  console.log('📦 [Build] Creating a fresh production bundle before exposing the app...');
  await runProductionBuild();

  console.log(`🚀 [Preview] Starting the production bundle on port ${PORT}...`);
  const runner = getNodeRunner('vite');
  const allowLan = process.env.FFORUM_LAN === '1' || process.env.HOST === '0.0.0.0' || process.argv.includes('--lan');
  const previewArgs = [
    ...runner.prefixArgs,
    'preview',
    '--host', '127.0.0.1',
    '--port', String(PORT),
    '--strictPort',
  ];
  if (allowLan) {
    const hostIndex = previewArgs.indexOf('--host');
    if (hostIndex !== -1) {
      previewArgs[hostIndex + 1] = '0.0.0.0';
    }
  }
  previewProcess = spawn(runner.cmd, previewArgs, {
    cwd: projectRoot,
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      NODE_ENV: 'production',
      /* This runner exposes only a Cloudflare Tunnel origin, so the edge-provided
         CF-Connecting-IP header is a trusted client address for audit/rate limits. */
      FFORUM_TRUST_CLOUDFLARE_PROXY: process.env.FFORUM_TRUST_CLOUDFLARE_PROXY ?? 'true',
    },
  });

  isSpawnedPreview = true;
  previewProcess.stdout.resume();
  previewProcess.stderr.on('data', (data) => {
    const text = data.toString();
    if (text.toLowerCase().includes('error')) console.error(`[Preview Error] ${text.trim()}`);
  });
  previewProcess.on('exit', (code) => {
    if (!isShuttingDown && code !== 0 && code !== null) {
      console.error(`\n❌ [Preview] Server exited unexpectedly with code ${code}`);
      cleanup(1);
    }
  });

  await checkHttpReady(`http://127.0.0.1:${PORT}`, 20000);
  console.log(`✅ [Preview] Production app is live at ${LOCAL_HOST_URL}`);
}

/* Locate existing working cloudflared binary across standard local paths */
function resolveCloudflaredPath() {
  const envPath = process.env.CLOUDFLARED_BIN;
  if (envPath && fs.existsSync(envPath)) {
    return envPath;
  }

  const userHome = os.homedir();
  const searchPaths = [
    path.join(userHome, '.local', 'bin', 'cloudflared'),
    path.join(userHome, '.9router', 'bin', 'cloudflared'),
    '/usr/local/bin/cloudflared',
    '/usr/bin/cloudflared',
    '/bin/cloudflared',
  ];

  const envPaths = (process.env.PATH || '').split(path.delimiter);
  for (const p of envPaths) {
    if (p) searchPaths.push(path.join(p, 'cloudflared'));
  }

  for (const p of searchPaths) {
    if (p && fs.existsSync(p)) {
      try {
        fs.accessSync(p, fs.constants.X_OK);
        return p;
      } catch {
        try {
          fs.chmodSync(p, 0o755);
          return p;
        } catch {
          /* không cấp được quyền execute */
        }
      }
    }
  }

  return '';
}

/* Launch Cloudflare Tunnel */
function getCloudflaredRunner() {
  const resolvedPath = resolveCloudflaredPath();
  const customPath = process.env.CLOUDFLARED_BIN || resolvedPath || '';
  if (customPath && fs.existsSync(customPath)) {
    return { cmd: customPath, prefixArgs: ['tunnel', '--url', `http://127.0.0.1:${PORT}`] };
  }
  const runner = getNodeRunner('untun');
  return { cmd: runner.cmd, prefixArgs: [...runner.prefixArgs, 'tunnel', `http://localhost:${PORT}`] };
}

function startCloudflareTunnel() {
  return new Promise((resolve) => {
    const runner = getCloudflaredRunner();
    console.log(`⚡ [Tunnel] Launching Cloudflare Direct 1-Click Tunnel...`);

    let resolved = false;
    let accumulatedOutput = '';

    cfProcess = spawn(runner.cmd, runner.prefixArgs, {
      cwd: projectRoot,
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        UNTUN_ACCEPT_CLOUDFLARE_NOTICE: '1',
      },
    });

    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        console.warn('⚠️ [Tunnel] Cloudflare Tunnel timed out waiting for URL (30s).');
        if (accumulatedOutput) {
          console.warn(`[Tunnel Output]:\n${accumulatedOutput.trim()}`);
        }
        resolve({ success: false, url: null });
      }
    }, 30000);

    const checkUrl = (chunk) => {
      const text = chunk.toString();
      accumulatedOutput += text;

      const match = accumulatedOutput.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/i);
      if (match && !resolved) {
        resolved = true;
        clearTimeout(timeout);
        resolve({ success: true, url: match[0].trim() });
      }
    };

    cfProcess.stdout.on('data', checkUrl);
    cfProcess.stderr.on('data', checkUrl);

    cfProcess.on('exit', (code) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        if (code !== 0 && code !== null) {
          console.error(`\n❌ [Tunnel] Process exited unexpectedly with code ${code}.`);
          if (accumulatedOutput) {
            console.error(`[Tunnel Output]:\n${accumulatedOutput.trim()}`);
          }
        }
        resolve({ success: false, url: null, code });
      }
    });
  });
}

/* Main execution flow */
async function main() {
  try {
    console.log('🚀 Initializing fforum_broamstuck_studio deployment pipeline...\n');

/* Build and serve production assets locally before any optional exposure. */
    await ensureProductionPreviewServer();

/* Test mode is intentionally local-only; do not open any public tunnel. */
    if (isTestMode) {
      console.log('🧪 [--test] Verifying only the local production preview; public tunneling is disabled...');
      await checkHttpReady(`http://127.0.0.1:${PORT}`, 5000);
      console.log('✅ [--test] Production response verified; no public URL was created.');
      console.log('🧹 [--test] Initiating automated clean shutdown...\n');
      cleanup(0);
      return;
    }

/* 2. Expose the app only when explicitly running the public deployment command. */
    console.log('🌐 [Tunnel] Starting the Cloudflare Quick Tunnel...');
    const cfResult = await startCloudflareTunnel();
    if (!cfResult.success || !cfResult.url) {
      throw new Error('Unable to establish the Cloudflare public tunnel.');
    }

/* 3. Print the public URL */
    printStatusBanner(cfResult.url);
    console.log('🟢 Deployment active. Press Ctrl + C to stop all services.\n');
  } catch (err) {
    console.error('\n❌ Deployment failed:', err.message);
    cleanup(1);
  }
}

main();
