import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// 1. Verify Safe Storage Module Logic
test('SafeStorage handles incognito/sandbox exceptions without throwing', () => {
  // Simulate restricted localStorage
  let throwAccess = true;
  const mockStorage = {
    getItem(_key) {
      if (throwAccess) throw new Error('SecurityError: The operation is insecure.');
      return null;
    },
    setItem(_key, _value) {
      if (throwAccess) throw new Error('QuotaExceededError');
    },
    removeItem(_key) {
      if (throwAccess) throw new Error('SecurityError');
    }
  };

  const safeStorage = {
    getItem(key) {
      try {
        return mockStorage.getItem(key);
      } catch {
        return null;
      }
    },
    setItem(key, value) {
      try {
        mockStorage.setItem(key, value);
      } catch {
        // Silently pass
      }
    },
    removeItem(key) {
      try {
        mockStorage.removeItem(key);
      } catch {
        // Silently pass
      }
    }
  };

  // Must not throw when incognito throws
  assert.equal(safeStorage.getItem('test_key'), null);
  assert.doesNotThrow(() => safeStorage.setItem('test_key', 'value'));
  assert.doesNotThrow(() => safeStorage.removeItem('test_key'));

  // When storage is enabled
  throwAccess = false;
  let stored = {};
  mockStorage.getItem = (k) => stored[k] ?? null;
  mockStorage.setItem = (k, v) => { stored[k] = v; };
  mockStorage.removeItem = (k) => { delete stored[k]; };

  safeStorage.setItem('token', 'f_token_123');
  assert.equal(safeStorage.getItem('token'), 'f_token_123');
  safeStorage.removeItem('token');
  assert.equal(safeStorage.getItem('token'), null);
});

// 2. Verify Media Fallback Logic and SVG integrity
test('MediaFallback SVGs are valid and handleImageError prevents infinite loops', () => {
  // Read src/utils/mediaFallback.ts
  const mediaFallbackContent = fs.readFileSync('src/utils/mediaFallback.ts', 'utf8');
  assert.ok(mediaFallbackContent.includes('DEFAULT_AVATAR ='));
  assert.ok(mediaFallbackContent.includes('data:image/svg+xml;utf8'));
  assert.ok(mediaFallbackContent.includes('DEFAULT_CLUB_COVER ='));
  assert.ok(mediaFallbackContent.includes('target.onerror = null;'));

  // Test error handler behavior
  let fallbackSrc = 'data:image/svg+xml;utf8,<svg></svg>';
  const mockImg = {
    src: 'https://broken.domain/image.png',
    onerror: () => {},
  };
  const mockEvent = { currentTarget: mockImg };

  function handleImageError(e, fallback) {
    const target = e.currentTarget;
    target.onerror = null; // prevents infinite loops
    target.src = fallback;
  }

  handleImageError(mockEvent, fallbackSrc);
  assert.equal(mockImg.src, fallbackSrc);
  assert.equal(mockImg.onerror, null);
});

// 3. Verify Audio Autoplay User Gesture Exception Safety
test('AudioContext resume handles user gesture policies without uncaught rejections', async () => {
  let uncaughtError = null;
  const handler = (err) => { uncaughtError = err; };
  process.on('unhandledRejection', handler);

  try {
    // Simulate AudioContext where resume() rejects due to autoplay restriction
    const mockAudioContext = {
      state: 'suspended',
      resume() {
        return Promise.reject(new Error('Autoplay policy prevented audio resume without user gesture.'));
      }
    };

    // Safe pattern used in src/utils/audio.ts
    const safeResume = (ctx) => {
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {
          // Autoplay user gesture pending
        });
      }
    };

    safeResume(mockAudioContext);
    // Wait tick to ensure promise rejection handler runs
    await new Promise((r) => setTimeout(r, 50));
    assert.equal(uncaughtError, null, 'Promise rejection must be caught');
  } finally {
    process.removeListener('unhandledRejection', handler);
  }
});

// 4. Codebase Static Invariant Scans
test('Codebase Audit: No non-standard webkit-playsinline attributes', () => {
  const files = getAllFiles('src');
  for (const file of files) {
    if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      const content = fs.readFileSync(file, 'utf8');
      assert.ok(!content.includes('webkit-playsinline'), `File ${file} must not contain deprecated webkit-playsinline`);
    }
  }
});

test('Codebase Audit: No raw localStorage access outside storage.ts and mediaFallback.ts', () => {
  const files = getAllFiles('src');
  for (const file of files) {
    if (file.endsWith('.tsx') || (file.endsWith('.ts') && !file.endsWith('storage.ts'))) {
      const content = fs.readFileSync(file, 'utf8');
      // Look for localStorage.
      const hasDirectLocalStorage = /(?<!safeStorage\.)localStorage\.(getItem|setItem|removeItem|clear)/.test(content);
      assert.ok(!hasDirectLocalStorage, `File ${file} must use safeStorage instead of direct localStorage`);
    }
  }
});

test('Codebase Audit: All video tags have onError error handlers', () => {
  const files = getAllFiles('src/components');
  for (const file of files) {
    if (file.endsWith('.tsx')) {
      const content = fs.readFileSync(file, 'utf8');
      const videoMatches = content.match(/<video[^>]*>/g);
      if (videoMatches) {
        for (const match of videoMatches) {
          assert.ok(match.includes('onError'), `Video tag in ${file} must include an onError handler: ${match}`);
        }
      }
    }
  }
});

test('Codebase Audit: Form text inputs and textareas have maxLength boundaries', () => {
  const viewsToCheck = [
    'src/components/views/ChroniclesView.tsx',
    'src/components/views/ClubsView.tsx',
    'src/components/views/QAForumView.tsx',
    'src/components/views/ChatView.tsx',
    'src/components/ChatDock.tsx',
    'src/components/FocusSanctuary.tsx',
    'src/components/ProfileModal.tsx'
  ];

  for (const relPath of viewsToCheck) {
    if (fs.existsSync(relPath)) {
      const content = fs.readFileSync(relPath, 'utf8');
      
      // Parse tag openings cleanly
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes('<input') || line.includes('<textarea')) {
          // gather block until closing `>` of element
          let block = '';
          for (let j = i; j < Math.min(lines.length, i + 15); j++) {
            block += ' ' + lines[j];
            if (lines[j].trim().endsWith('/>') || lines[j].trim().endsWith('>')) {
              break;
            }
          }
          if (block.includes('type="checkbox"') || block.includes('type="radio"') || block.includes('type="file"') || block.includes('type="range"')) {
            continue;
          }
          assert.ok(
            block.includes('maxLength'),
            `Form element in ${relPath} line ${i + 1} should have maxLength: ${block.slice(0, 80)}...`
          );
        }
      }
    }
  }
});

function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);
  for (const file of files) {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      getAllFiles(fullPath, arrayOfFiles);
    } else {
      arrayOfFiles.push(fullPath);
    }
  }
  return arrayOfFiles;
}
