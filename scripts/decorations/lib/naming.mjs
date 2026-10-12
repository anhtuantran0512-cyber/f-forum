/* Bản quyền trí tuệ thuộc về BroAmStuck */
/*
 * Đặt tên & phân loại trang trí:
 *  - slugify: kebab-case, bỏ dấu tiếng Việt, loại ký tự lạ (dùng cho tên thư mục).
 *  - proposeDisplayName: tên tiếng Việt (bản thân file Discord đã đặt tên "sạch"),
 *    nguồn: bảng tay VI_NAMES → từ điển VI_WORDS ghép lại → giữ nguyên tiếng Anh.
 *  - classifyAvatarDecoration: khung (avatar_frame) hay hào quang (avatar_aura).
 *  - deriveTags: nhãn chủ đề tiếng Việt + franchise, tối đa 5.
 */

const DEACENT = (s) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');

export const slugify = (name) =>
  DEACENT(String(name || ''))
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64) || 'asset';

export const tokenize = (name) =>
  String(name || '')
    .toLowerCase()
    .replace(/['’]/g, ' ')
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 1 || /^[a-z]$/.test(token));

/* Tên thương hiệu / IP: viết hoa đúng chính tả, không máy móc Title Case. */
const ENGLISH_TITLE_SPECIAL = {
  'cote-dlvoire': "Côte D'Ivoire", 'cote-d-lvoire': "Côte D'Ivoire",

  macbook: 'MacBook', iphone: 'iPhone', ipad: 'iPad', imac: 'iMac', ipod: 'iPod',
  airpods: 'AirPods', galaxy: 'Galaxy', nba: 'NBA', f1: 'F1', f22: 'F22',
  r2d2: 'R2-D2', r2d1: 'R2-D1', bb8: 'BB-8', droid: 'Droid',
  fortnite: 'Fortnite', minecraft: 'Minecraft', roblox: 'Roblox',
  pokemon: 'Pokémon', pikachu: 'Pikachu', charizard: 'Charizard', eevee: 'Eevee',
  anime: 'Anime', kpop: 'K-Pop', vaporwave: 'Vaporwave', lofi: 'Lo-Fi',
  cyberpunk: 'Cyberpunk', matrix: 'Matrix', marvel: 'Marvel', dc: 'DC',
  avengers: 'Avengers', spiderman: 'Spider-Man', venom: 'Venom', joker: 'Joker',
  batman: 'Batman', superman: 'Superman', ironman: 'Iron Man',
  halloween: 'Halloween', christmas: 'Christmas', valentine: 'Valentine',
  hulk: 'Hulk', thor: 'Thor', thanos: 'Thanos',
  dragon: 'Rồng', ghost: 'Ma', skeleton: 'Xương', vampire: 'Dracula',
  pizza: 'Pizza', sushi: 'Sushi', boba: 'Boba', bubbletea: 'Trà Sữa',
  coffee: 'Cà Phê', coffeebeans: 'Hạt Cà Phê', donut: 'Donut', cake: 'Bánh',
  rocket: 'Tàu Vũ Trụ', saturn: 'Sao Thổ', jupiter: 'Sao Mộc', mars: 'Sao Hỏa',
  venus: 'Sao Kim', moon: 'Mặt Trăng', sun: 'Mặt Trời',
  snowflakes: 'Đông Trù', aurora: 'Cực Quang', rainbow: 'Cầu Vồng',
  fire: 'Lửa', water: 'Nước', wind: 'Gió', earth: 'Đất',
};

export function englishTitle(name) {
  const words = String(name || '').split(/[_\s-]+/).filter(Boolean);
  const out = words.map((word) => {
    const lower = word.toLowerCase();
    if (ENGLISH_TITLE_SPECIAL[lower]) return ENGLISH_TITLE_SPECIAL[lower];
    /* con số kẹp giữa chữ (r2d2) đã có trong bảng tay; chữ thường 1 ký tự giữ nguyên */
    return word.length <= 2 && /^[a-z0-9]+$/.test(word) ? word.toUpperCase() : word[0].toUpperCase() + word.slice(1);
  });
  return out.join(' ');
}

/* Bảng tay — tên tiếng Việt cho các bộ theo chủ đề (cờ, cung hoàng đạo, nhân vật…). */
const VI_NAMES = {
  /* Quốc kỳ */
  vietnam: 'Việt Nam', japan: 'Nhật Bản', korea: 'Hàn Quốc', 'south-korea': 'Hàn Quốc', china: 'Trung Quốc',
  france: 'Pháp', italy: 'Ý', brazil: 'Brazil', germany: 'Đức', spain: 'Tây Ban Nha',
  england: 'Anh', 'united-kingdom': 'Anh', russia: 'Nga', usa: 'Hoa Kỳ', 'united-states': 'Hoa Kỳ',
  mexico: 'Mexico', canada: 'Canada', egypt: 'Ai Cập', egyptian: 'Ai Cập', india: 'Ấn Độ',
  cuba: 'Cuba', argentina: 'Argentina', australia: 'Úc', newzealand: 'New Zealand',
  'cote-dlvoire': 'Bờ Biển Ngà', ivory: 'Bờ Biển Ngà',
  /* Cung hoàng đạo */
  aries: 'Bạch Dương', taurus: 'Kim Ngưu', gemini: 'Song Tử', cancer: 'Cung Cự Giải',
  leo: 'Sư Tử', virgo: 'Xử Nữ', libra: 'Thiên Bình', scorpio: 'Thiên Yết',
  sagittarius: 'Nhân Mã', capricorn: 'Ma Kết', aquarius: 'Bảo Bình', pisces: 'Song Ngư',
  /* Nhân vật / IP */
  zuko: 'Zuko', azula: 'Azula', sokka: 'Sokka', tokito: 'Toki Toki',
  'the-moon': 'Vầng Trăng', moon: 'Trăng',
  'joker-card': 'Thẻ Joker',
  'hulk-smash': 'Hulk Smash',
  'black-phone-2': 'Black Phone 2',
  'bad-guys-2': 'Bad Guys 2',
  '2035': '2035',
  '28-years-later': '28 Years Later',
  'curious-bb8': 'Curious BB-8',
  'co-jordan': 'Cờ Jordan',
  'co-na-uy': 'Cờ Na Uy',
  'cung-xu-nu': 'Cung Xử Nữ',
  'r2d2-on-tatooine': 'R2-D2 on Tatooine',
  "cote_d'lvoire": "Côte D'Ivoire",
  'cote-d-lvoire': "Côte D'Ivoire",
  'bảo-thu': 'Bảo Thu',
  'kho-bau-chia-kho': 'Kho Báu & Chia Khoé',
  'hoa-giot-tuyet': 'Hoa Giọt Tuyết',
  'ho-ca-koi': 'Hồ Cá Koi',
  'con-mat-tien-tri': 'Con Mắt Tiền Tri',
  'cotu-phat-sang': 'Cột Trụ Phát Sáng',
  'binh-cay-thuy-tinh': 'Bình Cây Thủy Tinh',
  'binh-thuoc-phap': 'Bình Thuốc Phép',
  'con-quay-hoi-chuyen-x': 'Con Quay Hội Chuyển X',
  'mu-sieu-toc-hong': 'Mũ Siêu Tốc Hồng',
  'cay-canh-bonsai': 'Cây Cảnh Bonsai',
  'hoa-anh-dao': 'Hoa Anh Đào',
  'akuma': 'Akuma',
  'dau-lau-tinh-quai': 'Đầu Lâu Tinh Quái',
  'rong-anh-ba-chieu': 'Rồng Ảnh Ba Chiều',
  'the-conjuring-last-rites': 'The Conjuring: Last Rites',
  'shoto-todoroki': 'Shoto Todoroki',
  'dua-phap-xanh-la': 'Đũa Phép Xanh Lá',
  'tin-linh-tien': 'Tinh Linh Tiền',
  'marvel-snap-venom': 'Marvel Snap Venom',
  'bua-anh-trang': 'Bùa Ánh Trắng',
  'kiem-anh-sang-xanh': 'Kiếm Ánh Sáng Xanh',
  'la-thu-do-tuoi': 'Lá Thư Đỏ Tươi',
  'qua-cau-pha-le': 'Quả Cầu Pha Lê',
  'an-hao-hong': 'Anh Đào Hồng',
  'good-ol-pepper': 'Good Ol\' Pepper',
  'sleepy-chilledcow': 'Sleepy Chilledcow',
  'khe-mau-xanh-la': 'Khét Máu Xanh Lá',
  'mokoko': 'Mokoko',
  'slurp-barrel': 'Slurp Barrel',
  'friend-of-dex': 'Friend of Dex',
  'chong-pho-dem': 'Cảnh Phố Đêm',
  'cherry-blossoms': 'Hoa Anh Đào',
  'soul-leaving-body': 'Hồn Lìa Khỏi Xác',
  'soul-leaving-body-blue': 'Hồn Lìa Khỏi Xác Xanh Lam',
  'black-hole': 'Hố Đen',
  'head-in-the-clouds': 'Đầu Trên Mây',
  'head-in-the-clouds-sunset': 'Đầu Trên Mây Hoàng Hôn',
  'the-thing': 'The Thing',
  'exoborne': 'Exo-Borne',

  'chant-vang': 'Chạng Vạng',
};

/* Từ điển ghép: token → tiếng Việt (dùng khi không có tên tay). */
const VI_WORDS = {
  cherry: 'Anh Đào', blossoms: 'Hoa Anh Đào', blossom: 'Hoa Anh Đào', sakura: 'Anh Đào',
  flower: 'Hoa', flowers: 'Hoa', petal: 'Cánh Hoa', petals: 'Cánh Hoa',
  heart: 'Trái Tim', hearts: 'Trái Tim', love: 'Yêu Thương',
  fire: 'Lửa', flame: 'Ngọn Lửa', flames: 'Ngọn Lửa', ice: 'Băng', snow: 'Tuyết',
  snowflakes: 'Tiếng Tuyết', snowfall: 'Tuyết Rơi',
  star: 'Ngôi Sao', stars: 'Ngôi Sao', stardust: 'Bụi Sao', sparkle: 'Lấp Lánh', sparkles: 'Lấp Lánh',
  moon: 'Trăng', sun: 'Mặt Trời', rainbow: 'Cầu Vồng', aurora: 'Cực Quang',
  magic: 'Phép Thuật', wand: 'Gậy Phép', crystal: 'Thủy Tinh', crystals: 'Thủy Tinh',
  dragon: 'Rồng', phoenix: 'Phượng Hoại', butterfly: 'Cánh Bướm', butterflies: 'Cánh Bướm',
  angel: 'Thiên Thần', angels: 'Thiên Thần', ghost: 'Ma', ghosts: 'Ma',
  skull: 'Đầu Lâu', skulls: 'Đầu Lâu', pumpkin: 'Bí Đỏ', spider: 'Nhện',
  crown: 'Vương Miện', crown_s: 'Vương Miện',
  wing: 'Cánh', wings: 'Cánh', feathers: 'Lông Vũ',
  aura: 'Hào Quang', glow: 'Ánh Sáng', shine: 'Rực Rỡ', shimmer: 'Lấp Lánh',
  portal: 'Cổng', gate: 'Cổng', tunnel: 'Hầm Đạo',
  mana: 'Mana', energy: 'Năng Lượng', lightning: 'Tia Chớp', thunder: 'Sấm Sét',
  rain: 'Mưa', clouds: 'Mây', cloud: 'Mây', storm: 'Bão',
  leaves: 'Lá', leaf: 'Lá', tree: 'Cây', forest: 'Rừng', garden: 'Vườn',
  fish: 'Cá', koi: 'Cá Koi', fishbowl: 'Bình Cá',
  phone: 'Điện Thoại', black: 'Đen', blue: 'Xanh Lam', pink: 'Hồng', red: 'Đỏ',
  green: 'Xanh Lá', yellow: 'Vàng', purple: 'Tím', white: 'Trắng', orange: 'Cam',
  gold: 'Vàng', silver: 'Bạc', diamond: 'Kim Cương', gem: 'Kỳ Lân', gems: 'Kỳ Lân',
  ring: 'Nhẫn', necklace: 'Hạt Dưa',
  phone_1: 'Điện Thoại',
  phone_2: 'Điện Thoại',
  phone_3: 'Điện Thoại',
  vintage: 'Cổ Điển', retro: 'Retro', neon: 'Neon',
  space: 'Vũ Trụ', galaxy: 'Hành Tinh', cosmos: 'Vũ Trụ',
  halloween: 'Halloween', spooky: 'Kinh Dị',
  santa: 'Ông già Noel', christmas: 'Giáng Sinh',
  birthday: 'Sinh Nhật', party: 'Đổ Mẻ',
  music: 'Nhạc', notes: 'Nốt Nhạc',
  book: 'Sách', books: 'Sách', star_1: 'Ngôi Sao',
  coffee: 'Cà Phê', tea: 'Trà', boba: 'Boba',
  bubble: 'Bong Bóng', bubbles: 'Bong Bóng',
  flame_1: 'Ngọn Lửa', flame_2: 'Ngọn Lửa',
  ember: 'Tàn Lửa', embers: 'Tàn Lửa',
  mist: 'Sương Mù', mists: 'Sương Mù',
  wave: 'Sóng', waves: 'Sóng',
  swirl: 'Xoáy', swirls: 'Xoáy',
  portal_1: 'Cổng', portal_2: 'Cổng',
  rune: 'Chữ Rốt', runes: 'Chữ Rốt',
  sigil: 'Ấn', sigils: 'Ấn',
  talisman: 'Bùa Hộ Mệnh', amulet: 'Bùa Hộ Mệnh',
  orb: 'Cầu', sphere: 'Cầu',
  feather: 'Lông Vũ', plume: 'Lông Vũ',
  butterfly_1: 'Cánh Bướm', butterfly_2: 'Cánh Bướm',
  lantern: 'Đèn', lanterns: 'Đèn',
  lotus: 'Hoa Sen',
  dandelion: 'Xoài Trổ',
  maple: 'Cây Vàng', autumn: 'Thu',
  spring: 'Xuân', summer: 'Hè', winter: 'Đông',
  night: 'Đêm', dawn: 'Bình Minh', dusk: 'Hoàng Hôn', sunset: 'Hoàng Hôn',
  ocean: 'Đại Dương', sea: 'Biển', wave_1: 'Sóng',
  bird: 'Chim', birds: 'Chim', owl: 'Cú',
  fox: 'Cáo', panda: 'Gấu Trúc',
  corgi: 'Corgi', cat: 'Mèo', dog: 'Chó', bunny: 'Thỏ',
  crown_1: 'Vương Miện',
  scepter: 'Cây Đỉnh', sceptre: 'Cây Đỉnh',
  sword: 'Kiếm', dagger: 'Đao',
  potion: 'Thuốc Phép', flask: 'Lọ',
  scroll: 'Cuộn Giấy', parchment: 'Da Bò',
  crown_2: 'Vương Miện',
  tiara: 'Miện Vương',
  mask: 'Mặt Nạ', masks: 'Mặt Nạ',
  joker_1: 'Joker',
  tarot: 'Thẻ Bói',
  card: 'Thẻ', cards: 'Thẻ',
  die: 'Xương', dice: 'Xương',
  trophy: 'Cúp', medal: 'Huy Chương',
  laurel: 'Lá Rẻ', wreath: 'Vương Vọng',
  clock: 'Đồng Hồ', hourglass: 'Cát',
  hourglass_s: 'Cát',
  hourglass_1: 'Cát',
  hourglass_2: 'Cát',
  key: 'Chìa Khoé', lock: 'Khoá',
  treasure: 'Kho Báu', chest: 'Rương',
  gem_1: 'Kỳ Thạch',
  crown_3: 'Vương Miện',
  coin: 'Xu', coins: 'Xu',
  money: 'Tiền', cash: 'Tiền',
  star_2: 'Ngôi Sao', star_3: 'Ngôi Sao',
  shooting: 'Sao Chổi', meteor: 'Sao Chổi', comet: 'Sao Chổi',
  ufo: 'Bay Đĩa', alien: 'Người Ngoài Hành Tinh',
  rocket_1: 'Tàu Vũ Trụ',
  planet: 'Hành Tinh',
  saturn_1: 'Sao Thổ',
  earth_1: 'Địa Cầu',
  mars_1: 'Sao Hỏa',
  venus_1: 'Sao Kim',
  jupiter_1: 'Sao Mộc',
  mercury: 'Sao Thủy',
  neptune: 'Neptune',
  uranus: 'Uranus',
  moon_1: 'Trăng',
  moon_2: 'Trăng',
  crescent: 'Trăng Non',
  eclipse: 'Nhật Thực',
  halo: 'Vầng Quang',
  angel_1: 'Thiên Thần', angel_2: 'Thiên Thần',
  halo_1: 'Vầng Quang',
  wings_1: 'Cánh', wings_2: 'Cánh',
  butterfly_3: 'Cánh Bướm',
  firefly: 'Đom Đóm', fireflies: 'Đom Đóm',
  butterfly_4: 'Cánh Bướm',
  luna: 'Trăng', luna_moths: 'Bướm Đêm Luna',
  moon_3: 'Trăng',
  star_4: 'Ngôi Sao',
  star_5: 'Ngôi Sao',
  shooting_star: 'Sao Chổi',
  stardust_1: 'Bụi Sao',
  cosmic: 'Vũ Trụ',
  galaxy_1: 'Hành Tinh',
  nebula: 'Tinh Vân',
  comet_1: 'Sao Chổi',
  meteor_1: 'Sao Chổi',
  ufo_1: 'Bay Đĩa',
  alien_1: 'Người Ngoài Hành Tinh',
  robot: 'Robo', robot_1: 'Robo',
  mech: 'Cơ Khí',
  android: 'Andrôit',
  cyber: 'Cyber',
  neon_1: 'Neon', neon_2: 'Neon',
  laser: 'Lazer',
  plasma: 'Plasma',
  energy_1: 'Năng Lượng', energy_2: 'Năng Lượng',
  mana_1: 'Mana', mana_2: 'Mana', mana_3: 'Mana',
  ki: 'Khí Công', ki_energy: 'Khí Công',
  lightning_1: 'Tia Chớp', lightning_2: 'Tia Chớp',
  thunder_1: 'Sấm Sét',
  storm_1: 'Bão', storm_2: 'Bão',
  rain_1: 'Mưa', rain_2: 'Mưa',
  clouds_1: 'Mây', clouds_2: 'Mây',
  mist_1: 'Sương Mù', mist_2: 'Sương Mù',
  snow_1: 'Tuyết', snow_2: 'Tuyết',
  snowflake: 'Tiếng Tuyết', snowflakes_1: 'Tiếng Tuyết',
  frost: 'Sương Giá',
  ice_1: 'Băng', ice_2: 'Băng',
  icicle: 'Nhũ Băng', icicles: 'Nhũ Băng', icicle_snowing: 'Nhũ Băng Tuyết Rơi',
  crystal_1: 'Thủy Tinh', crystal_2: 'Thủy Tinh',
  gem_2: 'Kỳ Thạch', gem_3: 'Kỳ Thạch',
  diamond_1: 'Kim Cương',
  gold_1: 'Vàng', silver_1: 'Bạc',
  bronze: 'Đồng',
  copper: 'Đồng',
  iron: 'Sắt',
  steel: 'Thép',
  stone: 'Đá', stone_1: 'Đá',
  rock: 'Đá',
  crystal_3: 'Thủy Tinh',
  crystal_4: 'Thủy Tinh',
  crystal_5: 'Thủy Tinh',
  crystal_6: 'Thủy Tinh',
  crystal_7: 'Thủy Tinh',
  crystal_8: 'Thủy Tinh',
  crystal_9: 'Thủy Tinh',
  crystal_10: 'Thủy Tinh',
  crystal_11: 'Thủy Tinh',
  crystal_12: 'Thủy Tinh',
  crystal_13: 'Thủy Tinh',
  crystal_14: 'Thủy Tinh',
  crystal_15: 'Thủy Tinh',
  crystal_16: 'Thủy Tinh',
  crystal_17: 'Thủy Tinh',
  crystal_18: 'Thủy Tinh',
  crystal_19: 'Thủy Tinh',
  crystal_20: 'Thủy Tinh',
};

const VI_MULTI = [
  ['black-phone-2', 'Black Phone 2'],
  ['bad-guys-2', 'Bad Guys 2'],
  ['28-years-later', '28 Years Later'],
  ['curious-bb8', 'Curious BB-8'],
  ['r2-d2-on-tatooine', 'R2-D2 on Tatooine'],
  ['con-mat-tien-tri', 'Con Mắt Tiền Tri'],
  ['cotu-phat-sang', 'Cột Trụ Phát Sáng'],
  ['binh-cay-thuy-tinh', 'Bình Cây Thủy Tinh'],
  ['binh-thuoc-phap', 'Bình Thuốc Phép'],
  ['con-quay-hoi-chuyen-x', 'Con Quay Hội Chuyển X'],
  ['mu-sieu-toc-hong', 'Mũ Siêu Tốc Hồng'],
  ['cay-canh-bonsai', 'Cây Cảnh Bonsai'],
  ['hoa-giot-tuyet', 'Hoa Giọt Tuyết'],
  ['ho-ca-koi', 'Hồ Cá Koi'],
  ['dua-phap-xanh-la', 'Đũa Phép Xanh Lá'],
  ['tin-linh-tien', 'Tinh Linh Tiền'],
  ['buu-anh-trang', 'Bùa Ánh Trắng'],
  ['bùa-ánh-trắng', 'Bùa Ánh Trắng'],
  ['kiem-anh-sang-xanh', 'Kiếm Ánh Sáng Xanh'],
  ['la-thu-do-tuoi', 'Lá Thư Đỏ Tươi'],
  ['qua-cau-pha-le', 'Quả Cầu Pha Lê'],
  ['dong-xu-nu', 'Cung Xử Nữ'],
  ['cung-xu-nu', 'Cung Xử Nữ'],
  ['dau-lau-tinh-quai', 'Đầu Lâu Tinh Quái'],
  ['rong-anh-ba-chieu', 'Rồng Ảnh Ba Chiều'],
  ['the-conjuring-last-rites', 'The Conjuring: Last Rites'],
  ['marvel-snap-venom', 'Marvel Snap Venom'],
  ['good-ol-pepper', "Good Ol' Pepper"],
  ['kho-bau-chia-kho', 'Kho Báu & Chia Khoé'],
  ['an-hao-hong', 'Anh Đào Hồng'],
  ['chong-pho-dem', 'Cảnh Phố Đêm'],
  ['chant-vang', 'Chạng Vạng'],
  ['bảo-thu', 'Bảo Thu'],
  ['bảo-hộ-mệnh', 'Bùa Hộ Mệnh'],
  ['bảo-bình', 'Bảo Bình'],
  ['song-ngu', 'Song Ngư'],
  ['song-tử', 'Song Tử'],
  ['thiên-yết', 'Thiên Yết'],
  ['thiên-bình', 'Thiên Bình'],
  ['nhân-mã', 'Nhân Mã'],
  ['ma-kết', 'Ma Kết'],
  ['sư-tử', 'Sư Tử'],
  ['kim-ngưu', 'Kim Ngưu'],
  ['bạch-dương', 'Bạch Dương'],
  ['cự-giải', 'Cung Cự Giải'],
];

/* Phân loại khung/hào quang: từ khóa "quang cảnh" (nền, aura, mana…) → aura; còn lại → khung. */
const AURA_TOKENS = new Set([
  'aura', 'aurora', 'mana', 'smoke', 'energy', 'radiating', 'lightning', 'fire', 'embers', 'mists', 'mist', 'runes',
  'sigil', 'constellations', 'stardust', 'confetti', 'fireflies', 'fairies', 'sprites', 'butterflies', 'moths',
  'snowfall', 'snowing', 'swirl', 'lightshow', 'orbit', 'water', 'air', 'earth', 'clouds', 'rainy', 'portal',
  'glitch', 'shimmer', 'chromawave', 'fireworks', 'firecrackers', 'storm', 'ki', 'blossomburst', 'flux',
]);
const AURA_PHRASES = ['black_hole', 'soul_leaving_body', 'head_in_the_clouds', 'viper_poison_cloud', 'blade_storm', 'dream_dive'];
const FRAME_OVERRIDES = new Set(['flux_alchemy', 'string_lights', 'string_lights_aurora', 'string_lights_dusk', 'string_lights_ember', 'string_lights_mix', 'autumns_arbor_aurora', 'hex_tiles', 'magic_portal_blue', 'magic_portal_purple']);

export function classifyAvatarDecoration(original) {
  if (FRAME_OVERRIDES.has(original)) return 'avatar_frame';
  if (AURA_PHRASES.some((phrase) => original.includes(phrase))) return 'avatar_aura';
  return tokenize(original).some((token) => AURA_TOKENS.has(token)) ? 'avatar_aura' : 'avatar_frame';
}

const TAG_RULES = [
  ['halloween', ['ghost', 'ghosts', 'pumpkin', 'skull', 'spider', 'witch', 'graveyard', 'spooky', 'zombie', 'trick', 'treat', 'jack', 'crossbones', 'devil', 'skully', 'conjuring', 'saw', 'phone', 'bloodthirsty', 'nevermore', 'entity']],
  ['giáng sinh', ['santa', 'christmas', 'noel', 'gingerbread', 'candy-cane', 'reindeer']],
  ['sinh nhật', ['birthday', 'balloon', 'party', 'confetti']],
  ['anime', ['akuma', 'shoto', 'todoroki', 'pikachu', 'charizard', 'eevee', 'ryomen', 'sukuna', 'zuko', 'azula', 'sokka']],
  ['phim ảnh', ['conjur', 'black-phone', 'bad-guys', '28-years', 'venom', 'joker', 'hulk', 'batman', 'spider', 'avengers', 'ironman', 'marvel']],
  ['game', ['fortnite', 'minecraft', 'roblox', 'nba', 'fifa', '2035', 'bb8', 'droid']],
  ['cổ trang', ['vintage', 'retro', 'cổ', 'classic']],
  ['hoa', ['cherry', 'blossom', 'sakura', 'flower', 'petal', 'lotus', 'dandelion', 'maple', 'daisy', 'tulip', 'rose', 'orchid', 'sunflower', 'blossoms']],
  ['thiên nhiên', ['leaf', 'leaves', 'tree', 'forest', 'garden', 'mountain', 'river', 'rain', 'clouds', 'storm']],
  ['vũ trụ', ['star', 'stars', 'moon', 'galaxy', 'cosmic', 'nebula', 'comet', 'meteor', 'ufo', 'alien', 'rocket', 'planet', 'astral', 'cosmos']],
  ['phép thuật', ['magic', 'wand', 'crystal', 'mana', 'rune', 'runes', 'sigil', 'talisman', 'potion', 'arcane', 'spell', 'enchant', 'wizard', 'witch', 'alchemy', 'flux']],
  ['năng lượng', ['lightning', 'thunder', 'energy', 'plasma', 'neon', 'laser', 'electric', 'voltage', 'spark', 'ki']],
  ['lửa', ['fire', 'flame', 'ember', 'burning', 'inferno', 'lava', 'volcano']],
  ['băng giá', ['ice', 'snow', 'frost', 'icicle', 'winter', 'freeze']],
  ['rồng', ['dragon', 'phoenix', 'serpent', 'snake']],
  ['sâu biển', ['fish', 'koi', 'octopus', 'whale', 'coral', 'ocean', 'sea', 'jellyfish']],
  ['chân dung', ['portrait', 'face', 'mask', 'skull', 'skeleton']],
];

export function deriveTags(original, type) {
  const tokens = new Set(tokenize(original));
  const tags = [];
  const push = (tag) => {
    if (!tags.includes(tag) && tags.length < 5) tags.push(tag);
  };
  for (const [tag, keys] of TAG_RULES) if (keys.some((k) => tokens.has(k))) push(tag);
  if (type === 'avatar_aura') push('hào quang');
  else if (type === 'nameplate') push('bảng tên');
  else push('khung avatar');
  return tags;
}

/**
 * Tên hiển thị tiếng Việt. Nguồn:
 *  1. manual-vi — bảng tay VI_NAMES / VI_MULTI (đặt bằng tay, tin cậy nhất);
 *  2. auto-vi   — ghép từ từ điển VI_WORDS;
 *  3. original-en — giữ nguyên tiếng Anh (viết hoa đúng kiểu).
 */
export function proposeDisplayName(original) {
  const key = String(original || '').toLowerCase();
  const kebab = key.replace(/[_\s-]+/g, '-');
  const manual = VI_NAMES[key] || VI_NAMES[kebab] || VI_MULTI.find(([m]) => m === key || m === kebab)?.[1];
  if (manual) return { name: manual, nameEn: englishTitle(original), nameSource: 'manual-vi' };
  const auto = buildAutoVi(key);
  if (auto) return { name: auto, nameEn: englishTitle(original), nameSource: 'auto-vi' };
  return { name: englishTitle(original), nameEn: englishTitle(original), nameSource: 'original-en' };
}

function titleWord(w) {
  const lower = w.toLowerCase();
  if (ENGLISH_TITLE_SPECIAL[lower]) return ENGLISH_TITLE_SPECIAL[lower];
  return /^[0-9]+$/.test(w) ? w : (w.length <= 2 ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1));
}

function buildAutoVi(key) {
  const words = key.split(/[_\s-]+/).filter(Boolean);
  const out = [];
  let i = 0;
  while (i < words.length) {
    /* thử ghép 3, 2, 1 từ với từ điển */
    let hit = null;
    for (const span of [3, 2, 1]) {
      const chunk = words.slice(i, i + span).join('-');
      if (VI_WORDS[chunk]) {
        hit = VI_WORDS[chunk];
        i += span;
        break;
      }
    }
    if (!hit) {
      hit = titleWord(words[i]);
      i += 1;
    }
    /* gộp đoạn trùng (vd. "Anh Đào Hoa Anh Đào" → "Hoa Anh Đào") */
    const prev = out[out.length - 1];
    if (prev && (prev.endsWith(hit) || hit.endsWith(prev))) {
      out[out.length - 1] = prev.length >= hit.length ? prev : hit;
      continue;
    }
    out.push(hit);
  }
  return out.join(' ');
}

export function describe({ type, isAnimated, tags, nameEn }) {
  const kind = type === 'nameplate' ? 'Bảng tên chạy phía sau tên hiển thị' : type === 'avatar_aura' ? 'Hào quang toả sau ảnh đại diện' : 'Khung trang trí ôm quanh ảnh đại diện';
  const motion = isAnimated ? ' (động)' : '';
  const theme = tags.length ? `, chủ đề ${tags.filter((t) => t !== 'hào quang' && t !== 'bảng tên' && t !== 'khung avatar').slice(0, 2).join(', ') || (nameEn ? nameEn.toLowerCase() : 'đặc sắc')}` : '';
  return `${kind}${motion}${theme}.`;
}
