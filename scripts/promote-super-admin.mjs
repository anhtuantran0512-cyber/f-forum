#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const requestedEmail = process.argv[2]?.trim().toLowerCase();

if (!requestedEmail || requestedEmail === '--help' || requestedEmail === '-h') {
  console.log('Usage: npm run admin:bootstrap -- <registered-email>');
  console.log('Promotes one existing password-enabled account to the first super_admin.');
  process.exit(requestedEmail ? 0 : 2);
}

if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(requestedEmail)) {
  console.error('Invalid email address.');
  process.exit(2);
}

const configuredDir = process.env.FFORUM_DATA_DIR ? path.resolve(process.env.FFORUM_DATA_DIR) : '';
const relativePath = configuredDir ? path.relative(projectRoot, configuredDir) : '';
const isInsideProject = Boolean(configuredDir) && (
  relativePath === '' ||
  (relativePath !== '..' && !relativePath.startsWith(`..${path.sep}`) && !path.isAbsolute(relativePath))
);
if (isInsideProject) {
  console.error('FFORUM_DATA_DIR must be outside the project root; refusing to touch project files.');
  process.exit(2);
}

const dataDir = configuredDir || path.join(os.homedir(), '.local', 'share', 'f-forum');
const dataFile = path.join(dataDir, 'forum-data.json');
const lockFile = `${dataFile}.bootstrap.lock`;
let lockDescriptor;
try {
  fs.mkdirSync(dataDir, { recursive: true, mode: 0o700 });
  try { fs.chmodSync(dataDir, 0o700); } catch { /* best-effort on platforms without POSIX modes */ }
  lockDescriptor = fs.openSync(lockFile, 'wx', 0o600);
  fs.writeFileSync(lockDescriptor, `${process.pid}\n`, 'utf8');
} catch {
  console.error('Could not obtain the exclusive bootstrap lock. Another bootstrap may be running; inspect and remove a stale lock only after verifying no command is active.');
  process.exit(1);
}
process.on('exit', () => {
  try { fs.closeSync(lockDescriptor); } catch { /* already closed */ }
  try { fs.unlinkSync(lockFile); } catch { /* no lock file to remove */ }
});

let parsed;
try {
  const pathStat = fs.lstatSync(dataFile);
  if (!pathStat.isFile() || pathStat.isSymbolicLink()) throw new Error('Not a regular file');
  const noFollow = fs.constants.O_NOFOLLOW || 0;
  const dataDescriptor = fs.openSync(dataFile, fs.constants.O_RDONLY | noFollow);
  try {
    const fileStat = fs.fstatSync(dataDescriptor);
    if (!fileStat.isFile()) throw new Error('Not a regular file');
    try { fs.fchmodSync(dataDescriptor, 0o600); } catch { /* enclosing directory remains private */ }
    parsed = JSON.parse(fs.readFileSync(dataDescriptor, 'utf8'));
  } finally {
    fs.closeSync(dataDescriptor);
  }
} catch {
  console.error(`Could not safely read ${dataFile}. Start the forum once to migrate/create its private data file, then stop the server and retry.`);
  process.exit(1);
}

if (!parsed || typeof parsed !== 'object' || !parsed.users || typeof parsed.users !== 'object' || Array.isArray(parsed.users)) {
  console.error('The forum data file is invalid; no changes were made.');
  process.exit(1);
}

const user = parsed.users[requestedEmail];
const encodedPassword = parsed.passwords?.[requestedEmail];
if (!user || typeof user !== 'object' || Array.isArray(user) || typeof user.email !== 'string' || user.email.trim().toLowerCase() !== requestedEmail) {
  console.error('No matching registered account was found. Register through the normal app first; no account was created.');
  process.exit(1);
}
if (typeof encodedPassword !== 'string' || !/^pbkdf2-sha256\$\d{6,7}\$[a-f0-9]{32,128}\$[a-f0-9]{64}$/.test(encodedPassword)) {
  console.error('This account does not have a supported password hash. Use an account registered with a password before bootstrapping the first Super Admin.');
  process.exit(1);
}

const superAdmins = Object.values(parsed.users).filter(account => account?.role === 'super_admin');
if (superAdmins.length > 0) {
  console.error('A Super Admin already exists. First-admin bootstrap is closed; use the authenticated Admin Panel for later role changes.');
  process.exit(1);
}

user.role = 'super_admin';
user.updatedAt = new Date().toISOString();
parsed.schemaVersion = Math.max(Number.isSafeInteger(parsed.schemaVersion) ? parsed.schemaVersion : 0, 3);

let descriptor;
const temporaryFile = `${dataFile}.bootstrap-${process.pid}-${randomUUID()}`;
try {
  fs.mkdirSync(dataDir, { recursive: true, mode: 0o700 });
  descriptor = fs.openSync(temporaryFile, 'wx', 0o600);
  fs.writeFileSync(descriptor, JSON.stringify(parsed, null, 2), 'utf8');
  fs.fsyncSync(descriptor);
  fs.closeSync(descriptor);
  descriptor = undefined;
  fs.renameSync(temporaryFile, dataFile);
  try {
    const directoryFd = fs.openSync(dataDir, 'r');
    fs.fsyncSync(directoryFd);
    fs.closeSync(directoryFd);
    fs.chmodSync(dataDir, 0o700);
    fs.chmodSync(dataFile, 0o600);
  } catch {
    // Permission hardening is best-effort on platforms without chmod/fsync support.
  }
} catch {
  if (descriptor !== undefined) fs.closeSync(descriptor);
  try { fs.unlinkSync(temporaryFile); } catch { /* no temporary file to remove */ }
  console.error('Could not safely write the forum data file; no role change was confirmed.');
  process.exit(1);
}

console.log(`Bootstrapped the first Super Admin for ${requestedEmail}. Restart the server to clear old sessions and load the new role.`);
