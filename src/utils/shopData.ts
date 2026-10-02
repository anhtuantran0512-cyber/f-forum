import type { ShopItem, ShopTierColor } from '../types';

export const SHOP_ITEMS: ShopItem[] = [
  {
    id: 'pencil_starter',
    name: 'Bút Chì Khởi Đầu',
    price: 50,
    tierColor: 'green',
    description: 'Cây bút chì gỗ thần kỳ với đầu chì phát quang tri thức.',
    iconType: 'pencil',
  },
  {
    id: 'seed_wisdom',
    name: 'Hạt Mầm Tri Thức',
    price: 80,
    tierColor: 'green',
    description: 'Hạt mầm sinh sôi hé nở tia sáng xanh hy vọng.',
    iconType: 'seed',
  },
  {
    id: 'journal_memories',
    name: 'Sổ Tay Ký Ức',
    price: 120,
    tierColor: 'green',
    description: 'Cuốn sổ tay bọc da cổ điển ghi dấu kỷ niệm học trò.',
    iconType: 'journal',
  },
  {
    id: 'magnifier_detective',
    name: 'Kính Lúp Thám Tử',
    price: 200,
    tierColor: 'blue',
    description: 'Kính lúp quang học phát hiện mọi ẩn số hóc búa.',
    iconType: 'magnifier',
  },
  {
    id: 'ruler_quantum',
    name: 'Thước Kẻ Không Gian',
    price: 300,
    tierColor: 'blue',
    description: 'Chiếc thước kẻ plasma đo đạc đa chiều không gian.',
    iconType: 'ruler',
  },
  {
    id: 'flask_energy',
    name: 'Bình Pha Lê Năng Lượng',
    price: 450,
    tierColor: 'blue',
    description: 'Lọ thuỷ tinh chứa dung dịch tri thức xanh biển lấp lánh.',
    iconType: 'flask',
  },
  {
    id: 'compass_galaxy',
    name: 'La Bàn Thiên Hà',
    price: 650,
    tierColor: 'red',
    description: 'Chiếc la bàn đồng cổ kim chỉ về phương bắc vinh quang.',
    iconType: 'compass',
  },
  {
    id: 'hourglass_time',
    name: 'Đồng Hồ Cát Thời Gian',
    price: 850,
    tierColor: 'red',
    description: 'Đồng hồ cát huyền bí giữ lại từng khoảnh khắc thanh xuân.',
    iconType: 'hourglass',
  },
  {
    id: 'torch_victory',
    name: 'Ngọn Đuốc Khải Hoàn',
    price: 1200,
    tierColor: 'red',
    description: 'Ngọn đuốc hồng ngọc rực cháy ngọn lửa kiên định.',
    iconType: 'torch',
  },
  {
    id: 'crown_celestial',
    name: 'Vương Miện Tinh Tú',
    price: 1800,
    tierColor: 'purple',
    description: 'Vương miện đính ngọc tím hoàng gia dành cho bậc kỳ tài.',
    iconType: 'crown',
  },
  {
    id: 'talisman_focus',
    name: 'Bùa Phong Ấn Thời Gian',
    price: 2500,
    tierColor: 'purple',
    description: 'Bùa chú tím ma thuật bảo hộ tâm trí tập trung tối đa.',
    iconType: 'talisman',
  },
  {
    id: 'prism_universe',
    name: 'Lăng Kính Vũ Trụ',
    price: 4000,
    tierColor: 'purple',
    description: 'Lăng kính quang phổ tối thượng hội tụ ánh sáng đa vũ trụ.',
    iconType: 'prism',
  },
];

export const getTierColorStyles = (tier: ShopTierColor) => {
  switch (tier) {
    case 'green':
      return {
        border: 'border-emerald-500/40 hover:border-emerald-400',
        bg: 'bg-emerald-950/30',
        glow: 'shadow-[0_0_15px_rgba(16,185,129,0.25)]',
        badge: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30',
        dot: 'bg-emerald-400 shadow-[0_0_8px_#34d399]',
        btn: 'bg-emerald-500 hover:bg-emerald-400 text-black',
      };
    case 'blue':
      return {
        border: 'border-cyan-500/40 hover:border-cyan-400',
        bg: 'bg-cyan-950/30',
        glow: 'shadow-[0_0_18px_rgba(6,182,212,0.3)]',
        badge: 'text-cyan-300 bg-cyan-500/10 border-cyan-500/30',
        dot: 'bg-cyan-400 shadow-[0_0_8px_#38bdf8]',
        btn: 'bg-cyan-500 hover:bg-cyan-400 text-black',
      };
    case 'red':
      return {
        border: 'border-rose-500/40 hover:border-rose-400',
        bg: 'bg-rose-950/30',
        glow: 'shadow-[0_0_20px_rgba(244,63,94,0.35)]',
        badge: 'text-rose-300 bg-rose-500/10 border-rose-500/30',
        dot: 'bg-rose-400 shadow-[0_0_8px_#fb7185]',
        btn: 'bg-rose-500 hover:bg-rose-400 text-white',
      };
    case 'purple':
      return {
        border: 'border-purple-500/50 hover:border-purple-400',
        bg: 'bg-purple-950/35',
        glow: 'shadow-[0_0_22px_rgba(168,85,247,0.4)]',
        badge: 'text-purple-300 bg-purple-500/10 border-purple-500/30',
        dot: 'bg-purple-400 shadow-[0_0_8px_#c084fc]',
        btn: 'bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-400 hover:to-indigo-400 text-white',
      };
  }
};
