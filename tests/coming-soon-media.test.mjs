import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import sharp from 'sharp';

const posterPath = 'public/assets/video/coming-soon-poster.webp';

test('Coming Soon uses its optimized WebP poster and visible local video', async () => {
  assert.ok(fs.existsSync(posterPath), 'WebP poster is present');
  const poster = await sharp(posterPath).metadata();
  assert.equal(poster.format, 'webp');
  assert.equal(poster.width, 1600);
  assert.equal(poster.height, 900);
  assert.ok(fs.statSync(posterPath).size < 100 * 1024, 'poster remains lightweight');

  const view = fs.readFileSync('src/components/views/ComingSoonView.tsx', 'utf8');
  const videoPath = 'public/assets/video/coming-soon.webm';
  assert.ok(fs.existsSync(videoPath) && fs.statSync(videoPath).size > 0, 'the local WebM source exists');
  assert.match(view, /poster="\/assets\/video\/coming-soon-poster\.webp"/);
  assert.match(view, /preload="metadata"/);
  assert.match(view, /opacity-60/);
  assert.match(view, /COMING_SOON_VIDEO_URL/);
  assert.match(view, /truncate whitespace-nowrap/, 'roadmap titles and status notes stay on one line');
});
