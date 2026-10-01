import { safeStorage } from '../utils/storage';

export interface MilestoneItem {
  id: string;
  title: string;
  category: string;
  place?: string;
  imageUrl: string;
  notes: string;
  isTall?: boolean;
}

export interface FounderProfile {
  name: string;
  role: string;
  avatarUrl: string;
  bio: string;
  email: string;
}

export interface AboutData {
  headline: string;
  subtitle: string;
  founder: FounderProfile;
  milestones: MilestoneItem[];
}

export const DEFAULT_ABOUT_DATA: AboutData = {
  headline: 'BroAmStuck Studio • Trần Văn Anh Tuấn',
  subtitle: 'Khu Vinh Danh • 3D Fibonacci Sphere Chronicles & System Archive',
  founder: {
    name: 'Trần Văn Anh Tuấn',
    role: 'Admin F-Forum • Owner BroAmStuck Studio',
    avatarUrl: 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260922_194417_a455843c-d8db-461c-8ef6-74a325d2472c.png',
    bio: 'Xây dựng F-Forum từ những dòng code đầu tiên. Không gian kết nối thực, dữ liệu thực, tôn vinh tri thức và lưu giữ ký ức học trò.',
    email: 'anhtuantran0512@gmail.com',
  },
  milestones: [
    {
      id: 'ms-1',
      title: 'Khởi sinh F-Forum',
      category: 'Kiến trúc Zero-Cost',
      place: 'Da Nang · Vietnam',
      imageUrl: 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260922_194349_26ffdbfd-ac5e-49e9-a07d-c06d3f7cb4cb.png',
      notes: 'Hệ thống máy chủ tự chủ toàn quốc không phụ thuộc cloud đắt đỏ. Khởi sinh từ khát vọng kết nối học trò FPT trên không gian mạng tự do, công bằng.',
      isTall: false,
    },
    {
      id: 'ms-2',
      title: 'BroAmStuck Studio',
      category: 'Creative Lab',
      place: 'Creative Lab',
      imageUrl: 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260922_194350_5546ea3d-6336-42c7-a59f-06165c5802be.png',
      notes: 'Nghiên cứu giao diện tương tác và nghệ thuật thị giác thế hệ mới. Khởi xướng phong trào thiết kế tương tác Awwwards và obsidian glass cho ứng dụng học đường.',
      isTall: false,
    },
    {
      id: 'ms-3',
      title: 'Miền Ký Ức',
      category: 'Interactive Canvas',
      place: 'Mostar Heritage',
      imageUrl: 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260922_194349_b4533691-cb49-41d4-b56c-51f0fdcbe250.png',
      notes: 'Tái hiện dòng chảy thời gian và các cột mốc trường xưa bằng kỹ thuật cuộn đa tầng 3700px và hiệu ứng parallax ánh sáng.',
      isTall: true,
    },
    {
      id: 'ms-4',
      title: 'Quảng Trường CLB',
      category: 'Cộng Đồng',
      place: 'FPT Virtual Campus',
      imageUrl: 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260922_194349_e588abd3-1bfa-4918-894f-05632cc51ccc.png',
      notes: 'Không gian kết nối hơn 50 câu lạc bộ học sinh, hỗ trợ tuyển thành viên, đăng ký sự kiện và cấp quyền Leader tự quản.',
      isTall: false,
    },
    {
      id: 'ms-5',
      title: 'Sàn Q&A Ẩn Danh',
      category: 'Học Thuật',
      place: 'Knowledge Vault',
      imageUrl: 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260922_194350_28d92c80-de66-41cb-911e-b3b44aebe1f5.png',
      notes: 'Bảo mật danh tính qua thuật toán mặt nạ Ghibli ngẫu nhiên, giúp học sinh đặt câu hỏi học tập thoải mái không rào cản.',
      isTall: false,
    },
    {
      id: 'ms-6',
      title: 'Hệ Thống Rank 10 Tier',
      category: 'Gamification',
      place: 'Game Engine Node',
      imageUrl: 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260922_194349_04e89718-4214-4aff-bac5-490462bbfe2f.png',
      notes: 'Thuật toán tính điểm XP lũy tiến 150 Level từ Tân Binh tới Thần Thoại Huyền Thoại Cổ Đại với huy hiệu La Mã vàng ròng.',
      isTall: true,
    },
    {
      id: 'ms-7',
      title: 'Focus Sanctuary 432Hz',
      category: 'Tâm Lý Học',
      place: 'Zen Sanctuary',
      imageUrl: 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260922_194417_2c031e22-2fad-4c81-a544-83cd6bba1c33.png',
      notes: 'Không gian tập trung Pomodoro tích hợp máy phát âm thanh sóng não Alpha 432Hz hỗ trợ ôn thi hiệu quả cao.',
      isTall: false,
    },
    {
      id: 'ms-8',
      title: 'Thẻ F-ID Hologram 3D',
      category: 'Thiết Kế 2026',
      place: 'UI/UX Lab',
      imageUrl: 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260922_194349_a39c3226-7848-4b15-b840-98ad8aec467b.png',
      notes: 'Thẻ học sinh kỹ thuật số Hologram phản chiếu ánh sáng quang học theo góc nghiêng con trỏ chuột và cảm biến con quay hồi chuyển.',
      isTall: false,
    },
    {
      id: 'ms-9',
      title: 'Phòng Chat Thời Gian Thực',
      category: 'WebSockets',
      place: 'Hallway Stream',
      imageUrl: 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260922_194417_555e4d90-f35f-4a1a-8c75-def1e8b71988.png',
      notes: 'Kênh chat trực tuyến đa phòng ban kết nối học sinh 3 miền Bắc - Trung - Nam với độ trễ thấp dưới 20ms.',
      isTall: false,
    },
    {
      id: 'ms-10',
      title: 'Bảo Mật Zero-Defect',
      category: 'An Ninh Mạng',
      place: 'Security Vault',
      imageUrl: 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260922_194417_e525a243-03c8-454b-83b4-60f541baf70a.png',
      notes: 'Cơ chế phòng thủ XSS, Rate Limiting, xác thực OAuth 2.0 đa nền tảng và kiểm định dữ liệu nghiêm ngặt.',
      isTall: true,
    },
    {
      id: 'ms-11',
      title: 'Cột Mốc 10.000 Học Sinh',
      category: 'Cộng Đồng',
      place: 'Toàn Quốc',
      imageUrl: 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260922_194349_ec830e6f-b8e6-4569-8540-ee7f33902c53.png',
      notes: 'Cột mốc tăng trưởng kỷ lục minh chứng cho sức sống mãnh liệt của một nền tảng học đường phi lợi nhuận do học sinh xây dựng.',
      isTall: false,
    },
    {
      id: 'ms-12',
      title: 'Kho Tri Thức Mở',
      category: 'Học Thuật',
      place: 'Digital Archive',
      imageUrl: 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260922_194417_35a9af5f-bd07-45a7-bb73-08b47d19d530.png',
      notes: 'Hàng ngàn bộ tài liệu, lời giải chuẩn mực và chuyên đề ôn thi đại học được tuyển chọn từ các thủ khoa.',
      isTall: false,
    },
    {
      id: 'ms-13',
      title: 'Bento Grid Cinematic',
      category: 'Thiết Kế Đột Phá',
      place: 'BroAmStuck Studio',
      imageUrl: 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260922_194416_30e307a9-1265-45c3-a1a0-5c6fa5bb9f8d.png',
      notes: 'Ứng dụng ngôn ngữ thiết kế Bento 2026 kết hợp obsidian glass và micro-interactions mượt mà trên nền đen sâu.',
      isTall: false,
    },
    {
      id: 'ms-14',
      title: 'Đồng Bộ Đa Thiết Bị',
      category: 'Realtime Sync',
      place: 'Edge Network',
      imageUrl: 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260922_194417_ff5cb9f8-8eed-4bfb-bb08-11256da92eae.png',
      notes: 'Đồng bộ tức thời trạng thái bài viết, bình luận và tin nhắn qua BroadcastChannel và WebSocket đa thiết bị.',
      isTall: true,
    },
    {
      id: 'ms-15',
      title: 'Mặt Nạ Ẩn Danh Ghibli',
      category: 'Văn Hóa Nghệ Thuật',
      place: 'Anime Aesthetics',
      imageUrl: 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260922_194418_1d9bff4a-4971-4944-9e49-d72e755ceeb0.png',
      notes: 'Bộ sưu tập 12 mặt nạ phong cách Studio Ghibli: Vô Diện, Totoro, Haku... mang nét thơ mộng vào diễn đàn.',
      isTall: false,
    },
    {
      id: 'ms-16',
      title: 'AI Mentor Trợ Giảng',
      category: 'Trí Tuệ Nhân Tạo',
      place: 'Neural Lab',
      imageUrl: 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260922_194349_75e53821-0807-4ebc-992d-34bae0ec2ce6.png',
      notes: 'Thuật toán học máy gợi ý câu hỏi liên quan và định hướng câu lạc bộ thông minh theo sở thích và thế mạnh học sinh.',
      isTall: false,
    },
    {
      id: 'ms-17',
      title: 'Hội Đồng Quản Trị Học Sinh',
      category: 'Tự Trị Học Đường',
      place: 'Student Council',
      imageUrl: 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260922_194417_5a227847-3796-4438-805d-7e66e9538205.png',
      notes: 'Trao quyền tự quyết nội dung cho các Admin học sinh, loại bỏ tiêu cực và xây dựng văn hóa giao tiếp văn minh.',
      isTall: false,
    },
    {
      id: 'ms-18',
      title: 'Hackathon F-Code 2026',
      category: 'Sự Kiện Công Nghệ',
      place: 'Hackathon Arena',
      imageUrl: 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260922_194350_b49aa67e-0401-4029-af4f-f6ac3ee83398.png',
      notes: 'Sân chơi thi tài lập trình sáng tạo 48 giờ liên tục dành cho các bạn trẻ đam mê AI, Web3 và Interactive Design.',
      isTall: true,
    },
    {
      id: 'ms-19',
      title: 'Tri Ân Mái Trường FPT',
      category: 'Văn Hóa Học Đường',
      place: 'Heritage Campus',
      imageUrl: 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260922_194349_89b82779-3a46-4c55-b7c5-f4a0fd955874.png',
      notes: 'Khu lưu bút số lưu giữ những kỷ niệm quý giá, tình bạn và lời tri ấn gửi tới các thầy cô giáo tâm huyết.',
      isTall: false,
    },
    {
      id: 'ms-20',
      title: 'Tự Chủ Công Nghệ & Mã Nguồn',
      category: 'R&D',
      place: 'Da Nang · Tech Center',
      imageUrl: 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260922_194416_47e18c62-253a-42e1-97a9-9e5f6a6b8d59.png',
      notes: '100% kiến trúc phần mềm do Trần Văn Anh Tuấn và đội ngũ BroAmStuck Studio nghiên cứu và làm chủ hoàn toàn.',
      isTall: true,
    },
    {
      id: 'ms-21',
      title: 'Kỷ Nguyên F-Forum 2026',
      category: 'Tầm Nhìn Tương Lai',
      place: 'Global Horizon',
      imageUrl: 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260922_194417_a455843c-d8db-461c-8ef6-74a325d2472c.png',
      notes: 'Định vị F-Forum là diễn đàn học đường 3D tương tác hàng đầu, mở rộng kết nối các thế hệ học sinh Việt Nam.',
      isTall: false,
    },
  ],
};

const STORAGE_KEY = 'fforum_about_data';

export function getSavedAboutData(): AboutData {
  const saved = safeStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === 'object' && parsed.founder) {
        return parsed as AboutData;
      }
    } catch {
      /* ignore parse error */
    }
  }
  return DEFAULT_ABOUT_DATA;
}

export function saveAboutDataLocally(data: AboutData): void {
  safeStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  safeStorage.setItem('fforum_vinhdanh_records', JSON.stringify(data.milestones));
  try {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const bc = new BroadcastChannel('fforum_sync');
      bc.postMessage({ type: 'SYNC_ABOUT', payload: data });
      bc.close();
    }
  } catch {
    /* ignore */
  }
}

export async function fetchAboutDataFromServer(): Promise<AboutData> {
  try {
    const res = await fetch('/api/admin/about');
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.about) {
        saveAboutDataLocally(json.about);
        return json.about as AboutData;
      }
    }
  } catch {
    /* fallback to local */
  }
  return getSavedAboutData();
}

export async function saveAboutDataToServer(data: AboutData, adminEmail: string): Promise<AboutData> {
  saveAboutDataLocally(data);
  try {
    const res = await fetch('/api/admin/about', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ about: data, adminEmail }),
    });
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.about) {
        saveAboutDataLocally(json.about);
        return json.about as AboutData;
      }
    }
  } catch {
    /* ignore network issues */
  }
  return data;
}
