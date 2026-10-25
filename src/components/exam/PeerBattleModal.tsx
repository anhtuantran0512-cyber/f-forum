import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Swords,
  Trophy,
  Heart,
  Volume2,
  VolumeX,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Award,
  Flame,
  User as UserIcon,
} from 'lucide-react';
import type { User } from '../../types';
import { safeStorage } from '../../utils/storage';
import {
  playCrystalComboChime,
  playHeartbeatPulse,
  playFeastablesTactilePop,
  playVictoryFanfare,
  playEnergyDeplete,
  isTactileSoundActive,
  toggleTactileSound,
} from '../../utils/tactileAudio';

export interface BattleQuestion {
  id: string;
  subject: 'Toán học' | 'Vật lý' | 'Hóa học' | 'Tiếng Anh' | 'Sinh học';
  grade: '10' | '11' | '12' | 'THPTQG';
  question: string;
  options: [string, string, string, string];
  correctIndex: number;
  explanation: string;
}

export interface DuelistRecord {
  id: string;
  name: string;
  school: string;
  avatar: string;
  victories: number;
  winRate: number;
  bountyScore: number;
  title: string;
  recentTimestamp: number;
}

export interface PeerBattleModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onNavigateToLeaderboard?: () => void;
}

const BATTLE_QUESTIONS_POOL: BattleQuestion[] = [
  {
    id: 'bq-m1',
    subject: 'Toán học',
    grade: '12',
    question: 'Hàm số y = x^3 - 3x^2 + 2 đạt cực tiểu tại điểm nào?',
    options: ['x = 0', 'x = 2', 'x = 1', 'x = -1'],
    correctIndex: 1,
    explanation: 'y\' = 3x^2 - 6x = 0 <=> x=0 hoặc x=2. y\'\'(2) = 6 > 0 nên x=2 là điểm cực tiểu.',
  },
  {
    id: 'bq-m2',
    subject: 'Toán học',
    grade: 'THPTQG',
    question: 'Tích phân từ 0 đến 1 của hàm số e^(2x) dx bằng bao nhiêu?',
    options: ['(e^2 - 1)/2', 'e^2 - 1', '(e^2 + 1)/2', 'e^2/2'],
    correctIndex: 0,
    explanation: 'Nguyên hàm của e^(2x) là (1/2)e^(2x). Thay cận từ 0 đến 1 được (e^2 - 1)/2.',
  },
  {
    id: 'bq-p1',
    subject: 'Vật lý',
    grade: '12',
    question: 'Chu kỳ dao động điều hòa của con lắc lò xo độ cứng k, vật nặng m là:',
    options: ['T = 2pi*căn(m/k)', 'T = 2pi*căn(k/m)', 'T = (1/2pi)*căn(m/k)', 'T = 2pi*căn(g/l)'],
    correctIndex: 0,
    explanation: 'Tần số góc omega = căn(k/m), do đó chu kỳ T = 2pi / omega = 2pi*căn(m/k).',
  },
  {
    id: 'bq-p2',
    subject: 'Vật lý',
    grade: 'THPTQG',
    question: 'Hiện tượng quang điện ngoài xảy ra khi ánh sáng kích thích có:',
    options: ['Bước sóng nhỏ hơn giới hạn quang điện', 'Bước sóng lớn hơn giới hạn quang điện', 'Cường độ rất lớn', 'Tần số nhỏ hơn tần số giới hạn'],
    correctIndex: 0,
    explanation: 'Điều kiện xảy ra hiện tượng quang điện là lambda <= lambda_0 (bước sóng ánh sáng kích thích nhỏ hơn hoặc bằng giới hạn quang điện).',
  },
  {
    id: 'bq-c1',
    subject: 'Hóa học',
    grade: '12',
    question: 'Thủy phân este etyl axetat trong dung dịch NaOH đun nóng thu được:',
    options: ['CH3COONa và C2H5OH', 'C2H5COONa và CH3OH', 'HCOONa và C2H5OH', 'CH3COONa và CH3OH'],
    correctIndex: 0,
    explanation: 'CH3COOC2H5 + NaOH -> CH3COONa + C2H5OH.',
  },
  {
    id: 'bq-c2',
    subject: 'Hóa học',
    grade: 'THPTQG',
    question: 'Kim loại nào sau đây có tính khử mạnh nhất trong dãy điện hóa?',
    options: ['K', 'Fe', 'Cu', 'Ag'],
    correctIndex: 0,
    explanation: 'Trong dãy điện hóa, Kali (K) đứng đầu dãy nên có tính khử mạnh nhất trong các kim loại trên.',
  },
  {
    id: 'bq-e1',
    subject: 'Tiếng Anh',
    grade: 'THPTQG',
    question: 'Choose the word whose underlined part is pronounced differently: "watched", "stopped", "looked", "wanted":',
    options: ['wanted', 'watched', 'stopped', 'looked'],
    correctIndex: 0,
    explanation: '"wanted" phát âm đuôi -ed là /id/, các từ còn lại phát âm là /t/.',
  },
  {
    id: 'bq-b1',
    subject: 'Sinh học',
    grade: '12',
    question: 'Một bộ ba mã sao (codon) trên mARN gồm bao nhiêu ribonucleotit?',
    options: ['3', '2', '4', '6'],
    correctIndex: 0,
    explanation: 'Mã di truyền là mã bộ ba: mỗi 3 ribonucleotit kế tiếp quy định một axit amin.',
  },
];

const BOT_OPPONENTS = [
  { name: 'Nguyễn Đăng Khoa', school: 'THPT Chuyên Lê Hồng Phong, TP.HCM', winRate: 78 },
  { name: 'Trần Minh Hoàng', school: 'THPT Chuyên Hà Nội - Amsterdam', winRate: 82 },
  { name: 'Lê Thảo Vy', school: 'THPT Chuyên Quốc Học Huế', winRate: 75 },
  { name: 'Vũ Đức Thịnh', school: 'THPT Chuyên Phan Bội Châu, Nghệ An', winRate: 84 },
  { name: 'Đặng Tuấn Kiệt', school: 'THPT Chuyên Trần Phú, Hải Phòng', winRate: 80 },
];

export const DUELISTS_STORAGE_KEY = 'fforum_duelists_records';

export const saveDuelistVictory = (record: DuelistRecord) => {
  try {
    const raw = safeStorage.getItem(DUELISTS_STORAGE_KEY);
    const existing: DuelistRecord[] = raw ? JSON.parse(raw) : [];
    const idx = existing.findIndex((r) => r.id === record.id);
    if (idx >= 0) {
      existing[idx].victories += 1;
      existing[idx].bountyScore += record.bountyScore;
      existing[idx].recentTimestamp = Date.now();
    } else {
      existing.unshift(record);
    }
    safeStorage.setItem(DUELISTS_STORAGE_KEY, JSON.stringify(existing.slice(0, 50)));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('fforum_duelist_updated', { detail: record }));
    }
  } catch {
  }
};

export const PeerBattleModal: React.FC<PeerBattleModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onNavigateToLeaderboard,
}) => {
  const [battleState, setBattleState] = useState<'matchmaking' | 'battling' | 'finished'>('matchmaking');
  const [selectedSubject, setSelectedSubject] = useState<string>('Tất cả');
  const [selectedGrade, setSelectedGrade] = useState<string>('THPTQG');
  const [opponent, setOpponent] = useState(BOT_OPPONENTS[0]);
  const [matchmakingProgress, setMatchmakingProgress] = useState(0);

  const [currentRoundIndex, setCurrentRoundIndex] = useState(0);
  const [myEnergy, setMyEnergy] = useState(100);
  const [opponentEnergy, setOpponentEnergy] = useState(100);
  const [myScore, setMyScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);
  const [comboStreak, setComboStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(10);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [roundResolved, setRoundResolved] = useState(false);
  const [isSfxOn, setIsSfxOn] = useState(() => isTactileSoundActive());

  const battleQuestions = useMemo(() => {
    let pool = BATTLE_QUESTIONS_POOL;
    if (selectedSubject !== 'Tất cả') {
      pool = pool.filter((q) => q.subject === selectedSubject);
    }
    if (pool.length < 5) {
      pool = BATTLE_QUESTIONS_POOL;
    }
    const shuffled = [...pool].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 5);
  }, [selectedSubject, battleState]);

  const currentQ = battleQuestions[currentRoundIndex] || battleQuestions[0];

  useEffect(() => {
    const handleSfxChange = (e: Event) => {
      const detail = (e as CustomEvent<boolean>).detail;
      setIsSfxOn(detail);
    };
    window.addEventListener('fforum_sfx_toggle', handleSfxChange);
    return () => window.removeEventListener('fforum_sfx_toggle', handleSfxChange);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setBattleState('matchmaking');
    setMatchmakingProgress(0);
    setMyEnergy(100);
    setOpponentEnergy(100);
    setMyScore(0);
    setOpponentScore(0);
    setComboStreak(0);
    setCurrentRoundIndex(0);
    setSelectedOption(null);
    setRoundResolved(false);
    setTimeLeft(10);

    const randomOpponent = BOT_OPPONENTS[Math.floor(Math.random() * BOT_OPPONENTS.length)];
    setOpponent(randomOpponent);

    let progress = 0;
    const interval = window.setInterval(() => {
      progress += 18;
      setMatchmakingProgress(Math.min(100, progress));
      if (progress >= 100) {
        window.clearInterval(interval);
        playFeastablesTactilePop();
        setBattleState('battling');
      }
    }, 120);

    return () => window.clearInterval(interval);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || battleState !== 'battling' || roundResolved) return;

    if (timeLeft <= 3 && timeLeft > 0) {
      playHeartbeatPulse(4 - timeLeft);
    }

    if (timeLeft <= 0) {
      setRoundResolved(true);
      playEnergyDeplete();
      setMyEnergy((prev) => Math.max(0, prev - 20));
      setComboStreak(0);

      const botCorrect = Math.random() < 0.7;
      if (botCorrect) {
        setOpponentScore((prev) => prev + 120);
      } else {
        setOpponentEnergy((prev) => Math.max(0, prev - 20));
      }

      window.setTimeout(() => {
        advanceRound();
      }, 1600);
      return;
    }

    const timer = window.setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isOpen, battleState, timeLeft, roundResolved]);

  const advanceRound = useCallback(() => {
    if (currentRoundIndex >= 4 || myEnergy <= 0 || opponentEnergy <= 0) {
      setBattleState('finished');
      if (myScore >= opponentScore) {
        playVictoryFanfare();
        const myName = currentUser?.name || 'Sĩ Tử Vô Danh';
        saveDuelistVictory({
          id: currentUser?.id || 'guest_duelist',
          name: myName,
          school: 'Đấu Trường Tranh Tài 1vs1',
          avatar: currentUser?.avatar || '',
          victories: 1,
          winRate: 85,
          bountyScore: myScore + 150,
          title: 'Đấu Sĩ Tri Thức',
          recentTimestamp: Date.now(),
        });
      }
      return;
    }
    setCurrentRoundIndex((prev) => prev + 1);
    setSelectedOption(null);
    setRoundResolved(false);
    setTimeLeft(10);
  }, [currentRoundIndex, myEnergy, opponentEnergy, myScore, opponentScore, currentUser]);

  const handleSelectOption = (idx: number) => {
    if (roundResolved || selectedOption !== null) return;
    playFeastablesTactilePop();
    setSelectedOption(idx);
    setRoundResolved(true);

    const isCorrect = idx === currentQ.correctIndex;

    if (isCorrect) {
      const nextCombo = comboStreak + 1;
      setComboStreak(nextCombo);
      playCrystalComboChime(nextCombo);
      const speedBonus = timeLeft * 15;
      const comboMultiplier = 1 + (nextCombo - 1) * 0.4;
      const pointsEarned = Math.round((100 + speedBonus) * comboMultiplier);
      setMyScore((prev) => prev + pointsEarned);

      setOpponentEnergy((prev) => Math.max(0, prev - 25));
    } else {
      setComboStreak(0);
      playEnergyDeplete();
      setMyEnergy((prev) => Math.max(0, prev - 25));
    }

    const botCorrect = Math.random() < 0.65;
    if (botCorrect) {
      setOpponentScore((prev) => prev + Math.round(90 + Math.random() * 50));
    } else {
      setOpponentEnergy((prev) => Math.max(0, prev - 20));
    }

    window.setTimeout(() => {
      advanceRound();
    }, 1500);
  };

  const handleToggleSound = () => {
    const next = toggleTactileSound();
    setIsSfxOn(next);
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Đấu Trường Tranh Tài Học Thuật 1vs1"
      className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fade-in"
    >
      <div className="card-hard modal-container relative w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden rounded-3xl bg-[#FBF2E1] dark:bg-[#111622] text-[#2B2331] dark:text-[#f4f1de] border-[3px] border-[#2B2331] dark:border-white/20 shadow-[8px_8px_0px_#2B2331] dark:shadow-[8px_8px_0px_rgba(0,0,0,0.85)]">
        <div className="h-2 w-full bg-gradient-to-r from-amber-400 via-rose-500 to-indigo-500" />

        <div className="p-4 sm:p-5 border-b-2 border-[#2B2331]/20 dark:border-white/10 bg-[#F5E7CE] dark:bg-[#182030] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500 border-2 border-[#2B2331] dark:border-white/30 flex items-center justify-center text-white shadow-[2px_2px_0px_#2B2331]">
              <Swords className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400">
                  REALTIME 1VS1
                </span>
                <span className="text-xs font-mono font-bold text-[#2B2331]/60 dark:text-neutral-400">
                  Đấu Trường Học Thuật 2027
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black tracking-tight text-[#2B2331] dark:text-white">
                Sĩ Tử Tranh Tài Tri Thức
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggleSound}
              aria-label={isSfxOn ? 'Tắt âm thanh xúc giác' : 'Bật âm thanh xúc giác'}
              className="btn-feastables p-2 rounded-xl bg-white/60 dark:bg-white/10 border-2 border-[#2B2331] dark:border-white/20 text-[#2B2331] dark:text-white cursor-pointer"
            >
              {isSfxOn ? <Volume2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> : <VolumeX className="w-4 h-4 text-rose-500" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng đấu trường"
              className="btn-feastables p-2 rounded-xl bg-white/60 dark:bg-white/10 border-2 border-[#2B2331] dark:border-white/20 text-[#2B2331] dark:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {battleState === 'matchmaking' && (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-6 max-w-md mx-auto">
              <div className="relative">
                <div className="w-24 h-24 rounded-full border-4 border-dashed border-rose-500 animate-spin flex items-center justify-center">
                  <Swords className="w-10 h-10 text-rose-500" />
                </div>
                <div className="absolute inset-0 flex items-center justify-center font-mono font-black text-sm text-[#2B2331] dark:text-white">
                  {matchmakingProgress}%
                </div>
              </div>

              <div>
                <h3 className="text-xl font-black text-[#2B2331] dark:text-white">Đang Ghép Cặp Sĩ Tử...</h3>
                <p className="text-xs text-[#2B2331]/70 dark:text-neutral-400 mt-1">
                  Hệ thống đang tìm kiếm một đối thủ cùng cấp lớp và trình độ học vấn tương đương
                </p>
              </div>

              <div className="w-full space-y-2">
                <div className="flex justify-between text-xs font-mono font-bold">
                  <span>Môn thi đấu:</span>
                  <span className="text-rose-600 dark:text-rose-400">{selectedSubject}</span>
                </div>
                <div className="flex gap-2 justify-center flex-wrap">
                  {['Tất cả', 'Toán học', 'Vật lý', 'Hóa học', 'Tiếng Anh', 'Sinh học'].map((subj) => (
                    <button
                      key={subj}
                      type="button"
                      onClick={() => setSelectedSubject(subj)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold border-2 cursor-pointer transition-all ${
                        selectedSubject === subj
                          ? 'bg-[#2B2331] text-[#FBF2E1] border-[#2B2331] dark:bg-amber-400 dark:text-[#2B2331]'
                          : 'bg-white/40 dark:bg-white/5 text-[#2B2331] dark:text-white border-[#2B2331]/20'
                      }`}
                    >
                      {subj}
                    </button>
                  ))}
                </div>

                <div className="flex justify-between text-xs font-mono font-bold pt-2">
                  <span>Cấp lớp:</span>
                  <span className="text-amber-600 dark:text-amber-400">{selectedGrade}</span>
                </div>
                <div className="flex gap-2 justify-center flex-wrap">
                  {['10', '11', '12', 'THPTQG'].map((grd) => (
                    <button
                      key={grd}
                      type="button"
                      onClick={() => setSelectedGrade(grd)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold border-2 cursor-pointer transition-all ${
                        selectedGrade === grd
                          ? 'bg-amber-400 text-[#0b0d12] border-[#0b0d12]'
                          : 'bg-white/40 dark:bg-white/5 text-[#2B2331] dark:text-white border-[#2B2331]/20'
                      }`}
                    >
                      {grd === 'THPTQG' ? 'THPT Quốc Gia' : `Lớp ${grd}`}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {battleState === 'battling' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 items-center p-4 rounded-2xl bg-[#F5E7CE] dark:bg-[#182030] border-2 border-[#2B2331]/20 dark:border-white/10">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-amber-400 border border-[#2B2331] dark:border-white/30 flex items-center justify-center font-black text-xs text-[#2B2331]">
                      {currentUser?.name?.[0]?.toUpperCase() || <UserIcon className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-black truncate text-[#2B2331] dark:text-white">
                        {currentUser?.name || 'Bạn (Sĩ Tử)'}
                      </div>
                      <div className="text-[10px] font-mono font-bold text-amber-600 dark:text-amber-400">
                        {myScore} Bounty
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-mono font-black">
                      <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                        <Heart className="w-3 h-3 fill-current" /> Sinh lực
                      </span>
                      <span>{myEnergy}/100</span>
                    </div>
                    <div className="h-3 w-full rounded-full bg-black/20 overflow-hidden border border-[#2B2331]/30 dark:border-white/20 p-0.5">
                      <div
                        className="h-full rounded-full transition-all duration-300 bg-gradient-to-r from-emerald-500 to-emerald-400"
                        style={{ width: `${myEnergy}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2 text-right">
                  <div className="flex items-center gap-2 justify-end">
                    <div className="min-w-0">
                      <div className="text-xs font-black truncate text-[#2B2331] dark:text-white">
                        {opponent.name}
                      </div>
                      <div className="text-[10px] font-mono font-bold text-rose-500">
                        {opponentScore} Bounty
                      </div>
                    </div>
                    <div className="w-8 h-8 rounded-xl bg-rose-500 border border-[#2B2331] dark:border-white/30 flex items-center justify-center font-black text-xs text-white">
                      VS
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-mono font-black">
                      <span>{opponentEnergy}/100</span>
                      <span className="flex items-center gap-1 text-rose-500">
                        <Heart className="w-3 h-3 fill-current" /> Đối thủ
                      </span>
                    </div>
                    <div className="h-3 w-full rounded-full bg-black/20 overflow-hidden border border-[#2B2331]/30 dark:border-white/20 p-0.5">
                      <div
                        className="h-full rounded-full transition-all duration-300 bg-gradient-to-l from-rose-500 to-rose-400"
                        style={{ width: `${opponentEnergy}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white/70 dark:bg-[#161c29] border-2 border-[#2B2331]/20 dark:border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-black bg-[#2B2331] text-[#FBF2E1] dark:bg-white/10 dark:text-white">
                      CÂU {currentRoundIndex + 1} / 5
                    </span>
                    <span className="text-xs font-bold text-[#2B2331]/70 dark:text-neutral-400">
                      {currentQ.subject} ({currentQ.grade})
                    </span>
                  </div>

                  {comboStreak > 1 && (
                    <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-400/20 border border-amber-400/50 text-amber-600 dark:text-amber-400 font-mono font-black text-xs animate-pulse">
                      <Flame className="w-3.5 h-3.5 fill-current" />
                      <span>COMBO x{comboStreak}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-1.5 font-mono text-xs font-black">
                    <span className={timeLeft <= 3 ? 'text-rose-500 animate-ping' : 'text-[#2B2331] dark:text-white'}>
                      {timeLeft}s
                    </span>
                  </div>
                </div>

                <div className="h-2 w-full rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-1000 ${
                      timeLeft <= 3 ? 'bg-rose-500' : 'bg-gradient-to-r from-amber-400 to-rose-500'
                    }`}
                    style={{ width: `${(timeLeft / 10) * 100}%` }}
                  />
                </div>

                <div className="py-2">
                  <h3 className="text-base sm:text-lg font-black text-[#2B2331] dark:text-white leading-relaxed">
                    {currentQ.question}
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  {currentQ.options.map((opt, idx) => {
                    const isSelected = selectedOption === idx;
                    const isCorrect = idx === currentQ.correctIndex;
                    let styleClass = 'bg-white/80 dark:bg-white/5 border-[#2B2331]/30 dark:border-white/15 hover:border-amber-400';

                    if (roundResolved) {
                      if (isCorrect) {
                        styleClass = 'bg-emerald-500/20 border-emerald-500 text-emerald-700 dark:text-emerald-300 font-black';
                      } else if (isSelected) {
                        styleClass = 'bg-rose-500/20 border-rose-500 text-rose-700 dark:text-rose-300 font-black';
                      } else {
                        styleClass = 'opacity-50 border-transparent';
                      }
                    }

                    return (
                      <button
                        key={idx}
                        type="button"
                        disabled={roundResolved}
                        onClick={() => handleSelectOption(idx)}
                        className={`p-3.5 rounded-xl border-2 text-left transition-all cursor-pointer flex items-center justify-between gap-2 ${styleClass}`}
                      >
                        <span className="text-xs sm:text-sm font-bold">{opt}</span>
                        {roundResolved && isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
                        {roundResolved && isSelected && !isCorrect && <XCircle className="w-4 h-4 text-rose-500 shrink-0" />}
                      </button>
                    );
                  })}
                </div>

                {roundResolved && (
                  <div className="p-3 rounded-xl bg-amber-400/10 border border-amber-400/30 text-xs text-[#2B2331] dark:text-neutral-300 animate-fade-in">
                    <strong className="text-amber-600 dark:text-amber-400 font-bold block mb-0.5">Giải thích bản chất:</strong>
                    {currentQ.explanation}
                  </div>
                )}
              </div>
            </div>
          )}

          {battleState === 'finished' && (
            <div className="py-8 flex flex-col items-center justify-center text-center space-y-6 max-w-lg mx-auto">
              <div className="relative">
                <div className="w-24 h-24 rounded-3xl bg-amber-400 border-4 border-[#2B2331] dark:border-white/30 flex items-center justify-center shadow-[4px_4px_0px_#2B2331]">
                  <Trophy className="w-12 h-12 text-[#2B2331]" />
                </div>
                <div className="absolute -bottom-2 -right-2 p-1.5 rounded-xl bg-rose-500 text-white border-2 border-[#2B2331]">
                  <Award className="w-4 h-4" />
                </div>
              </div>

              <div>
                <span className="px-3 py-1 rounded-full text-xs font-mono font-black bg-amber-400/20 border border-amber-400/50 text-amber-600 dark:text-amber-400">
                  {myScore >= opponentScore ? 'CHIẾN THẮNG HUY HOÀNG' : 'THẮNG TRẦM TRỌNG BÀI HỌC'}
                </span>
                <h3 className="text-2xl font-black text-[#2B2331] dark:text-white mt-2">
                  {myScore >= opponentScore ? 'Danh Hiệu: Đấu Sĩ Tri Thức' : 'Tiếp Tục Rèn Luyện'}
                </h3>
                <p className="text-xs text-[#2B2331]/70 dark:text-neutral-400 mt-1">
                  Điểm số đã được ghi nhận tự động vào bảng vàng thi đấu Đại Sảnh Vinh Danh
                </p>
              </div>

              <div className="w-full grid grid-cols-2 gap-4 p-4 rounded-2xl bg-[#F5E7CE] dark:bg-[#182030] border-2 border-[#2B2331]/20 dark:border-white/10 font-mono">
                <div>
                  <div className="text-[10px] text-[#2B2331]/60 dark:text-neutral-400 uppercase font-black">Điểm Của Bạn</div>
                  <div className="text-xl font-black text-emerald-600 dark:text-emerald-400">{myScore} Bounty</div>
                </div>
                <div>
                  <div className="text-[10px] text-[#2B2331]/60 dark:text-neutral-400 uppercase font-black">Điểm Đối Thủ</div>
                  <div className="text-xl font-black text-rose-500">{opponentScore} Bounty</div>
                </div>
              </div>

              <div className="flex gap-3 w-full flex-col sm:flex-row">
                <button
                  type="button"
                  onClick={() => {
                    setBattleState('matchmaking');
                    setMatchmakingProgress(0);
                    setMyEnergy(100);
                    setOpponentEnergy(100);
                    setMyScore(0);
                    setOpponentScore(0);
                    setComboStreak(0);
                    setCurrentRoundIndex(0);
                    setSelectedOption(null);
                    setRoundResolved(false);
                    setTimeLeft(10);
                  }}
                  className="btn-feastables flex-1 py-3 rounded-2xl text-xs font-black bg-rose-500 text-white border-2 border-[#2B2331] dark:border-white/20 shadow-[4px_4px_0px_#2B2331] flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Tái Đấu Trận Khác</span>
                </button>

                {onNavigateToLeaderboard && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onNavigateToLeaderboard();
                    }}
                    className="btn-feastables flex-1 py-3 rounded-2xl text-xs font-black bg-[#2B2331] text-[#FBF2E1] dark:bg-amber-400 dark:text-[#2B2331] border-2 border-[#2B2331] dark:border-white/20 shadow-[4px_4px_0px_#2B2331] flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Trophy className="w-4 h-4" />
                    <span>Xem Bảng Thi Đua</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default PeerBattleModal;
