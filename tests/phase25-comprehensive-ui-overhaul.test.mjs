import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const read = (file) => fs.readFileSync(path.resolve(file), 'utf8');

test('Phase 25 - 1. Dai Tu Toan Dien Giao Dien & Surface Elevation 2027', () => {
  const css = read('src/index.css');
  assert.ok(css.includes('.ff-qa-card') && css.includes('.thread-card') && css.includes('.ff-exam-card'), 'Cac the giao dien phai co transition elevation');
  assert.ok(css.includes('::-webkit-scrollbar'), 'He thong scrollbar 2027 sieu mong tinh te');
  assert.ok(css.includes('.modal-container'), 'Modal container phai co chieu sau bong do glassmorphism');
});

test('Phase 25 - 2. Chuan Hoa Nhan Dieu Huong & Nut Thao Tac Sieu Tinh Gon (<= 3 Tu)', () => {
  const home = read('src/components/views/HomeView.tsx');
  const clubs = read('src/components/views/ClubsView.tsx');
  const hall = read('src/components/views/KhuVinhDanhView.tsx');
  const exam = read('src/components/views/ExamVaultView.tsx');
  const battle = read('src/components/exam/PeerBattleModal.tsx');
  const checkin = read('src/components/DailyCheckInModal.tsx');
  const hero = read('src/components/landing/sections/LandingHero.tsx');
  const about = read('src/components/AboutUs.tsx');
  const settings = read('src/components/SettingsModal.tsx');

  assert.ok(home.includes('<span>Hỏi Bài Tập</span>'), 'HomeView nut hoi bai phai <= 3 tu');
  assert.ok(clubs.includes('<span>Vào CLB</span>'), 'ClubsView nut vao clb phai <= 3 tu');
  assert.ok(clubs.includes('<span>Tải ảnh</span>'), 'ClubsView nut tai anh phai <= 3 tu');
  assert.ok(hall.includes('<span>Đấu Trường 1vs1</span>'), 'KhuVinhDanhView nut dau truong phai <= 3 tu');
  assert.ok(hall.includes('<span>Kho Đề Thi</span>'), 'KhuVinhDanhView nut kho de thi phai <= 3 tu');
  assert.ok(hall.includes('<span>Hỏi Đáp Bài</span>'), 'KhuVinhDanhView nut san hoi dap phai <= 3 tu');
  assert.ok(exam.includes('<span>In đề thi</span>'), 'ExamVaultView nut in de thi phai <= 3 tu');
  assert.ok(battle.includes('<span>Tái Đấu Ngay</span>'), 'PeerBattleModal nut tai dau phai <= 3 tu');
  assert.ok(battle.includes('<span>Bảng Thi Đua</span>'), 'PeerBattleModal nut bang thi dua phai <= 3 tu');
  assert.ok(checkin.includes('Bật khiên') && checkin.includes('Điểm danh ngay'), 'DailyCheckInModal nut phai <= 3 tu');
  assert.ok(hero.includes('<span>Sảnh Thi CBT</span>') && hero.includes('<span>Đấu Trường 1vs1</span>'), 'LandingHero nut phai <= 3 tu');
  assert.ok(about.includes('<span>Chọn tệp</span>') && about.includes('<span>Khôi phục gốc</span>'), 'AboutUs nut phai <= 3 tu');
  assert.ok(settings.includes('<span>Bản nâng cấp</span>'), 'SettingsModal nut phai <= 3 tu');
});

test('Phase 25 - 3. Bao Toan 100% 3 Asset 3D Nguyen Ban Va Switcher Thiet Bi Icon-Only', () => {
  const iphonePath = path.resolve('public/iphone5-showcase.html');
  const iphoneStat = fs.statSync(iphonePath);
  assert.ok(iphoneStat.size > 3000000, 'iPhone 5 showcase phai giu nguyen dung luong > 3MB');

  const machiPath = path.resolve('public/machi-mart-3d.html');
  const machiStat = fs.statSync(machiPath);
  assert.ok(machiStat.size > 900000, 'Machi Mart 3D phai giu nguyen dung luong > 900KB');

  const solarPath = path.resolve('public/solar-system-3d.html');
  const solarLines = fs.readFileSync(solarPath, 'utf8').trim().split('\n').length;
  assert.equal(solarLines, 557, 'solar-system-3d.html phai chinh xac 557 dong');

  const hardware = read('src/components/HardwareShowcase.tsx');
  assert.ok(hardware.includes('<Smartphone'), 'HardwareShowcase co nut Smartphone');
  assert.ok(hardware.includes('<Laptop'), 'HardwareShowcase co nut Laptop');
});
