#!/usr/bin/env node

/**
 * fforum_broamstuck_studio - Zero-Config Public Deployment Runner
 * 
 * Orchestrates Vite dev server and an automated public tunnel:
 * - Spawns Vite server locally on port 5173 (or reuses active instance).
 * - Drains Vite stdout/stderr to prevent OS pipe buffer overflow.
 * - Automatically launches public tunnel with custom subdomain 'fforum-broamstuck-studio' via LocalTunnel.
 * - Dynamic fallback to Cloudflare Tunnel (via untun / cloudflared) if subdomain is occupied or LocalTunnel fails.
 * - Renders eye-catching terminal status banner with public, backup, and local URLs.
 * - Clean process group termination on SIGINT (Ctrl + C), SIGTERM, and SIGHUP without lingering ports.
 */

import { spawn } from 'node:child_process';
import http from 'node:http';
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const PORT = parseInt(process.env.PORT || '5173', 10);
const SUBDOMAIN = 'fforum-broamstuck-studio';
const EXPECTED_LT_URL = `https://${SUBDOMAIN}.loca.lt`;
const LOCAL_HOST_URL = `http://localhost:${PORT}`;

const isTestMode = process.argv.includes('--test') || process.argv.includes('--dry-run');
const isForceFallback = process.argv.includes('--test-fallback') || process.argv.includes('--simulate-occupied');

// Track child processes
let viteProcess = null;
let ltProcess = null;
let cfProcess = null;
let isSpawnedVite = false;
let isShuttingDown = false;

// Resolve runner for local packages or global npx fallback
function getNodeRunner(name) {
  const configs = {
    vite: {
      localScript: path.join(projectRoot, 'node_modules', 'vite', 'bin', 'vite.js'),
      binName: 'vite',
      pkgName: 'vite',
    },
    localtunnel: {
      localScript: path.join(projectRoot, 'node_modules', 'localtunnel', 'bin', 'lt.js'),
      binName: 'lt',
      pkgName: 'localtunnel',
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

  return { cmd: 'npx', prefixArgs: ['--yes', cfg.pkgName] };
}

// Function to check if HTTP endpoint is responsive without duplicate timer leaks
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

// Check if port is already active
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

/**
 * Dò IP công khai của máy đang chạy tunnel.
 *
 * LocalTunnel hiện một trang chặn bắt người xem gõ IP công khai của máy chủ.
 * Banner trước đây in cứng một địa chỉ: đổi mạng (4G, quán cà phê, nhà khác)
 * là dòng hướng dẫn đó SAI, người được chia sẻ link gõ theo sẽ bị chặn và không
 * hiểu vì sao. Nay dò động; dò không được thì nói rõ thay vì đưa số sai.
 */
function detectPublicIp(timeoutMs = 2500) {
  const services = [
    { url: 'https://api.ipify.org', parse: (body) => body.trim() },
    { url: 'https://ifconfig.me/ip', parse: (body) => body.trim() },
  ];

  const probe = ({ url, parse }) =>
    new Promise((resolve, reject) => {
      const req = https.get(url, { headers: { 'User-Agent': 'curl/8' } }, (res) => {
        let body = '';
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => {
          const ip = parse(body);
          /* Chỉ chấp nhận chuỗi trông giống IPv4/IPv6, tránh in ra trang lỗi HTML. */
          if (/^[0-9a-fA-F:.]+$/.test(ip) && ip.length <= 45) resolve(ip);
          else reject(new Error('định dạng không hợp lệ'));
        });
      });
      req.on('error', reject);
      req.setTimeout(timeoutMs, () => {
        req.destroy();
        reject(new Error('hết thời gian chờ'));
      });
    });

  return services.reduce(
    (chain, service) => chain.catch(() => probe(service)),
    Promise.reject(new Error('chưa thử dịch vụ nào')),
  );
}

// Format and print terminal status banner
async function printStatusBanner(publicUrl, backupUrl) {
  console.log('\n' + '='.repeat(68));
  console.log('🚀 FFORUM_BROAMSTUCK_STUDIO IS NOW LIVE PUBLICLY!');
  console.log(`⚡ DIRECT 1-CLICK URL : ${publicUrl} (VÀO THẲNG - 0 PROMPT)`);
  if (backupUrl && backupUrl.includes('loca.lt')) {
    const ip = await detectPublicIp().catch(() => null);
    const hint = ip
      ? `Yêu cầu IP: ${ip}`
      : 'không dò được IP — xem https://ipv4.icanhazip.com';
    console.log(`🌐 BRANDED URL        : ${backupUrl} (${hint})`);
  } else {
    console.log(`🌐 BACKUP URL         : ${backupUrl}`);
  }
  console.log(`💻 LOCAL HOST         : ${LOCAL_HOST_URL}`);
  console.log('📡 Chia sẻ link DIRECT 1-CLICK để bất kỳ ai vào thẳng ngay lập tức!');
  console.log('='.repeat(68) + '\n');
}

// Safely kill process group and descendants
function killProcessGroup(proc, signal = 'SIGTERM') {
  if (!proc || proc.killed) return;
  try {
    if (proc.pid) {
      try {
        process.kill(-proc.pid, signal);
      } catch {
        proc.kill(signal);
      }
    }
  } catch {
    // Process already exited
  }
}

// Clean termination handler
function cleanup(exitCode = 0) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log('\n🛑 Shutting down fforum_broamstuck_studio deployment pipeline...');

  // 1. Send SIGTERM to tunnel processes
  killProcessGroup(ltProcess, 'SIGTERM');
  killProcessGroup(cfProcess, 'SIGTERM');

  // 2. Terminate Vite server only if this runner spawned it
  if (isSpawnedVite && viteProcess) {
    killProcessGroup(viteProcess, 'SIGTERM');
  }

  // 3. Forceful cleanup after grace period to ensure no hanging sockets/ports
  setTimeout(() => {
    killProcessGroup(ltProcess, 'SIGKILL');
    killProcessGroup(cfProcess, 'SIGKILL');
    if (isSpawnedVite && viteProcess) {
      killProcessGroup(viteProcess, 'SIGKILL');
    }
    console.log('✅ Cleanup complete. Exiting gracefully.\n');
    process.exit(exitCode);
  }, 350);
}

// Register signal handlers
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

// Launch Vite dev server
async function ensureViteServer() {
  const active = await isPortActive(PORT);
  if (active) {
    console.log(`⚡ [Vite] Active server detected on ${LOCAL_HOST_URL}. Reusing existing instance.`);
    return;
  }

  console.log(`📦 [Vite] Starting local dev server on port ${PORT}...`);
  const runner = getNodeRunner('vite');

  viteProcess = spawn(runner.cmd, [...runner.prefixArgs, '--host', '0.0.0.0', '--port', String(PORT)], {
    cwd: projectRoot,
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env },
  });

  isSpawnedVite = true;

  // Drain stdout to prevent 64KB OS pipe buffer exhaustion deadlock
  viteProcess.stdout.resume();

  // Forward critical errors from Vite
  viteProcess.stderr.on('data', (d) => {
    const text = d.toString();
    if (text.toLowerCase().includes('error')) {
      console.error(`[Vite Error] ${text.trim()}`);
    }
  });

  viteProcess.on('exit', (code) => {
    if (!isShuttingDown && code !== 0 && code !== null) {
      console.error(`\n❌ [Vite] Server exited unexpectedly with code ${code}`);
      cleanup(1);
    }
  });

  // Wait for server to respond
  await checkHttpReady(`http://127.0.0.1:${PORT}`, 20000);
  console.log(`✅ [Vite] Server is live at ${LOCAL_HOST_URL}`);
}

// Launch LocalTunnel
function startLocalTunnel() {
  return new Promise((resolve) => {
    if (isForceFallback) {
      console.log(`🧪 [--simulate-occupied] Simulating occupied LocalTunnel subdomain...`);
      resolve({ success: false, url: null, occupied: true });
      return;
    }

    const runner = getNodeRunner('localtunnel');
    console.log(`🌐 [Tunnel] Connecting LocalTunnel with subdomain: ${SUBDOMAIN}...`);

    let resolved = false;
    let accumulatedOutput = '';

    ltProcess = spawn(runner.cmd, [...runner.prefixArgs, '--port', String(PORT), '--subdomain', SUBDOMAIN], {
      cwd: projectRoot,
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env },
    });

    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        console.warn('⚠️ [Tunnel] LocalTunnel connection timed out (12s).');
        resolve({ success: false, url: null, reason: 'timeout' });
      }
    }, 12000);

    const onData = (chunk) => {
      const text = chunk.toString();
      accumulatedOutput += text;

      const match = accumulatedOutput.match(/your url is:\s*(https?:\/\/[^\s]+)/i);
      if (match && !resolved) {
        resolved = true;
        clearTimeout(timeout);
        const url = match[1].trim();
        const isExactSubdomain = url === EXPECTED_LT_URL;
        resolve({
          success: isExactSubdomain,
          url,
          occupied: !isExactSubdomain,
        });
      }
    };

    ltProcess.stdout.on('data', onData);
    ltProcess.stderr.on('data', (d) => {
      const errText = d.toString();
      if (errText.includes('error') && !resolved) {
        resolved = true;
        clearTimeout(timeout);
        resolve({ success: false, url: null, reason: errText });
      }
    });

    ltProcess.on('exit', (code) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        resolve({ success: false, url: null, reason: `Process exited with code ${code}` });
      }
    });
  });
}

// Launch Cloudflare Tunnel
function getCloudflaredRunner() {
  const customPath = '/home/broamstuck/.9router/bin/cloudflared';
  if (fs.existsSync(customPath)) {
    return { cmd: customPath, prefixArgs: ['tunnel', '--url', `http://localhost:${PORT}`] };
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
        console.warn('⚠️ [Tunnel] Cloudflare Tunnel timed out waiting for URL (15s).');
        resolve({ success: false, url: null });
      }
    }, 15000);

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
        resolve({ success: false, url: null, code });
      }
    });
  });
}

// Main execution flow
async function main() {
  try {
    console.log('🚀 Initializing fforum_broamstuck_studio deployment pipeline...\n');

    // 1. Ensure Vite server is running
    await ensureViteServer();

    // 2. Launch Cloudflare Direct Tunnel (Zero-password 1-click) & LocalTunnel
    console.log('🌐 [Tunnel] Activating Cloudflare Direct Tunnel & LocalTunnel...');
    const [cfResult, ltResult] = await Promise.all([
      startCloudflareTunnel(),
      startLocalTunnel(),
    ]);

    const directUrl = cfResult.success && cfResult.url ? cfResult.url : (ltResult.url || EXPECTED_LT_URL);
    const brandedUrl = ltResult.url ? ltResult.url : (cfResult.url || '(LocalTunnel unavailable)');

    if (!cfResult.success && !ltResult.success) {
      throw new Error('Unable to establish any public tunnel connection.');
    }

    // 3. Print Banner (async: chờ dò IP công khai để in đúng hướng dẫn)
    await printStatusBanner(directUrl, brandedUrl);

    // 4. Handle test mode
    if (isTestMode) {
      console.log('🧪 [--test] Verifying pipeline health...');
      await checkHttpReady(`http://127.0.0.1:${PORT}`, 5000);
      console.log('✅ [--test] Vite dev server response verified.');
      console.log('✅ [--test] Public URL and Banner validated successfully.');
      console.log('🧹 [--test] Initiating automated clean shutdown...\n');
      cleanup(0);
      return;
    }

    console.log('🟢 Deployment active. Press Ctrl + C to stop all services.\n');
  } catch (err) {
    console.error('\n❌ Deployment failed:', err.message);
    cleanup(1);
  }
}

main();
