/* Bản quyền trí tuệ thuộc về BroAmStuck */
import { safeStorage } from '../utils/storage';
import { authHeaders } from '../utils/session';

export interface MilestoneItem {
  id: string;
  imgId?: string;
  title: string;
  category: string;
  place?: string;
  imageUrl: string;
  customImgUrl?: string;
  notes: string;
  note?: string;
  isTall?: boolean;
}

export interface FounderProfile {
  name: string;
  role: string;
  avatarUrl: string;
  bio: string;
  email: string;
}

export interface MemorySightCMSItem {
  kickerVie: string;
  kickerEng: string;
  titleVie: string;
  titleEng: string;
  descVie: string;
  descEng: string;
  pinUrl: string;
}

export interface MemoryRealmCMSData {
  heroTitleVie?: string;
  heroTitleEng?: string;
  introCopyVie?: string;
  introCopyEng?: string;
  heroTagsVie?: string[];
  heroTagsEng?: string[];
  bridgeTitleVie?: string;
  bridgeTitleEng?: string;
  bridgeBodyVie?: string;
  bridgeBodyEng?: string;
  fact1Title?: string;
  fact1DescVie?: string;
  fact1DescEng?: string;
  fact2TitleVie?: string;
  fact2TitleEng?: string;
  fact2DescVie?: string;
  fact2DescEng?: string;
  bazaarTitleVie?: string;
  bazaarTitleEng?: string;
  bazaarBodyVie?: string;
  bazaarBodyEng?: string;
  bazaarButtonVie?: string;
  bazaarButtonEng?: string;
  skyImg?: string;
  backFourImg?: string;
  bazaarImg?: string;
  splitLeftImg?: string;
  splitRightImg?: string;
  bridgeImg?: string;
  frameTwoImg?: string;
  sights?: MemorySightCMSItem[];
}

export interface AboutData {
  headline: string;
  subtitle: string;
  colophon?: string;
  headlineWords?: string[];
  introFilmUrl?: string;
  founder: FounderProfile;
  milestones: MilestoneItem[];
  memoryRealm?: MemoryRealmCMSData;
}

export const DEFAULT_ABOUT_DATA: AboutData = {
  headline: 'BroAmStuck Studio • Trần Văn Anh Tuấn',
  subtitle: 'Khu Vinh Danh • Kỷ vật & lưu bút học đường',
  founder: {
    name: 'Trần Văn Anh Tuấn',
    role: 'Admin F-Forum • Owner BroAmStuck Studio',
    avatarUrl: 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260922_194417_a455843c-d8db-461c-8ef6-74a325d2472c.png',
    bio: 'Đồng hành cùng F-Forum từ những ngày đầu. Không gian kết nối chân thành, tôn vinh tri thức và lưu giữ ký ức học trò.',
    email: 'BroAmStuck@gmail.com',
  },
  milestones: [
    {
      id: 'ms-1',
      title: 'Khởi sinh F-Forum',
      category: 'Hành Trình Tri Thức',
      place: 'Da Nang · Vietnam',
      imageUrl: 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260922_194349_26ffdbfd-ac5e-49e9-a07d-c06d3f7cb4cb.png',
      notes: 'Không gian học tập và kết nối học sinh, thắp sáng ước mơ học đường trên khắp mọi miền.',
      isTall: false,
    },
    {
      id: 'ms-2',
      title: 'BroAmStuck Studio',
      category: 'Sáng Tạo Trẻ',
      place: 'Góc Trải Nghiệm Học Thuật',
      imageUrl: 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260922_194350_5546ea3d-6336-42c7-a59f-06165c5802be.png',
      notes: 'Nơi mỗi ý tưởng và đồ án được chăm chút tỉ mỉ, gìn giữ nét tinh khôi của tuổi học trò.',
      isTall: false,
    },
    {
      id: 'ms-3',
      title: 'Miền Ký Ức',
      category: 'Lưu Bút Số',
      place: 'Biên Niên Sử Trường Xưa',
      imageUrl: 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260922_194349_b4533691-cb49-41d4-b56c-51f0fdcbe250.png',
      notes: 'Lưu giữ những nhịp cầu tri thức, góc hành lang rêu phong và ký ức năm tháng học trò.',
      isTall: true,
    },
    {
      id: 'ms-4',
      title: 'Quảng Trường CLB',
      category: 'Cộng Đồng Học Đường',
      place: 'Hội Quán Đam Mê',
      imageUrl: 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260922_194349_e588abd3-1bfa-4918-894f-05632cc51ccc.png',
      notes: 'Không gian quy tụ các câu lạc bộ học thuật, nghệ thuật và khám phá khoa học.',
      isTall: false,
    },
    {
      id: 'ms-5',
      title: 'Hỏi Đáp Học Thuật',
      category: 'Hỏi Đáp Học Thuật',
      place: 'Góc Học Tập Mở',
      imageUrl: 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260922_194350_28d92c80-de66-41cb-911e-b3b44aebe1f5.png',
      notes: 'Nơi bạn tự do hỏi bài tập khó, cùng nhau trao đổi phương pháp và tiến bộ mỗi ngày.',
      isTall: false,
    },
    {
      id: 'ms-6',
      title: 'Bậc Thang Trưởng Thành',
      category: 'Rèn Luyện',
      place: 'Hành Trình Học Tập',
      imageUrl: 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260922_194349_04e89718-4214-4aff-bac5-490462bbfe2f.png',
      notes: 'Ghi nhận từng bước tiến học tập và tinh thần sẵn sàng tương trợ bè bạn.',
      isTall: true,
    },
    {
      id: 'ms-7',
      title: 'Phòng Tập Trung Pomodoro',
      category: 'Góc Tự Học',
      place: 'Không Gian Ôn Luyện',
      imageUrl: 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260922_194417_2c031e22-2fad-4c81-a544-83cd6bba1c33.png',
      notes: 'Nhịp học sâu bền bỉ, giúp học sinh duy trì sự tập trung tối đa cho kỳ thi.',
      isTall: false,
    },
    {
      id: 'ms-8',
      title: 'Thẻ Học Sinh F-Pass',
      category: 'Định Danh Học Đường',
      place: 'Góc Cá Nhân Hóa',
      imageUrl: 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260922_194349_a39c3226-7848-4b15-b840-98ad8aec467b.png',
      notes: 'Tấm thẻ ghi dấu những cột mốc học tập và thành tích đáng nhớ của mỗi bạn trẻ.',
      isTall: false,
    },
    {
      id: 'ms-9',
      title: 'Góc Học Chung Trực Tuyến',
      category: 'Đàm Thoại',
      place: 'Phòng Trao Đổi Bài',
      imageUrl: 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260922_194417_555e4d90-f35f-4a1a-8c75-def1e8b71988.png',
      notes: 'Trao đổi bài học, tìm bạn cùng tiến và san sẻ niềm vui học đường theo thời gian thực.',
      isTall: false,
    },
    {
      id: 'ms-10',
      title: 'Không Gian An Toàn',
      category: 'Văn Hóa Ứng Xử',
      place: 'Môi Trường Thân Thiện',
      imageUrl: 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260922_194417_e525a243-03c8-454b-83b4-60f541baf70a.png',
      notes: 'Bảo vệ sự riêng tư của học sinh, vun đắp môi trường học tập lịch sự và tôn trọng lẫn nhau.',
      isTall: true,
    },
    {
      id: 'ms-11',
      title: 'Ngôi Nhà Chung Học Sinh',
      category: 'Gắn Kết',
      place: 'Học Trò Ba Miền',
      imageUrl: 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260922_194349_ec830e6f-b8e6-4569-8540-ee7f33902c53.png',
      notes: 'Nơi kết nối các thế hệ học trò, cùng chia sẻ kinh nghiệm học tập và hướng nghiệp.',
      isTall: false,
    },
    {
      id: 'ms-12',
      title: 'Thư Viện Đề Thi & Đề Cương',
      category: 'Kho Tư Liệu',
      place: 'Tri Thức Mở',
      imageUrl: 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260922_194417_35a9af5f-bd07-45a7-bb73-08b47d19d530.png',
      notes: 'Tài liệu, đề cương và lời giải chi tiết giúp bạn tự tin trước mọi kỳ thi.',
      isTall: false,
    },
    {
      id: 'ms-13',
      title: 'Bản Sắc Trực Quan Học Đường',
      category: 'Trải Nghiệm',
      place: 'Campus Atelier',
      imageUrl: 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260922_194416_30e307a9-1265-45c3-a1a0-5c6fa5bb9f8d.png',
      notes: 'Phong cách thiết kế trang nhã, ấm áp, tạo cảm giác thư thái khi ngồi vào bàn học.',
      isTall: false,
    },
    {
      id: 'ms-14',
      title: 'Khoảnh Khắc Học Đường',
      category: 'Kỷ Niệm',
      place: 'Nhật Ký Thời Gian',
      imageUrl: 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260922_194417_ff5cb9f8-8eed-4bfb-bb08-11256da92eae.png',
      notes: 'Ghi lại những khoảnh khắc học tập và tình bạn tươi đẹp dưới mái trường mến yêu.',
      isTall: true,
    },
    {
      id: 'ms-15',
      title: 'Mặt Nạ Ẩn Danh Thơ Mộng',
      category: 'Đồng Cảm',
      place: 'Thì Thầm Học Trò',
      imageUrl: 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260922_194418_1d9bff4a-4971-4944-9e49-d72e755ceeb0.png',
      notes: 'Giúp bạn tự tin bộc bạch những khó khăn trong học tập mà không ngại ngần hay rụt rè.',
      isTall: false,
    },
    {
      id: 'ms-16',
      title: 'Người Bạn Đồng Hành',
      category: 'Tương Trợ',
      place: 'Học Nhóm Mỗi Ngày',
      imageUrl: 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260922_194349_75e53821-0807-4ebc-992d-34bae0ec2ce6.png',
      notes: 'Gợi ý các chủ đề học tập phù hợp và kết nối bạn với những người cùng chí hướng.',
      isTall: false,
    },
    {
      id: 'ms-17',
      title: 'Tiếng Nói Học Trò',
      category: 'Dân Chủ Học Đường',
      place: 'Diễn Đàn Trẻ',
      imageUrl: 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260922_194417_5a227847-3796-4438-805d-7e66e9538205.png',
      notes: 'Nơi mọi tâm tư, sáng kiến và góc nhìn học đường luôn được lắng nghe chân thành.',
      isTall: false,
    },
    {
      id: 'ms-18',
      title: 'Sân Chơi Học Thuật',
      category: 'Thi Đua',
      place: 'Bảng Vàng Thi Đua',
      imageUrl: 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260922_194350_b49aa67e-0401-4029-af4f-f6ac3ee83398.png',
      notes: 'Ngày hội giao lưu tri thức, thử thách tư duy và tôn vinh những bạn trẻ ham học hỏi.',
      isTall: true,
    },
    {
      id: 'ms-19',
      title: 'Tri Ân Thầy Cô & Mái Trường',
      category: 'Uống Nước Nhớ Nguồn',
      place: 'Góc Tri Ân',
      imageUrl: 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260922_194349_89b82779-3a46-4c55-b7c5-f4a0fd955874.png',
      notes: 'Lưu bút gửi trao tấm lòng biết ơn sâu sắc tới những người thầy, người cô tận tụy.',
      isTall: false,
    },
    {
      id: 'ms-20',
      title: 'Bản Sắc Học Trò',
      category: 'Tuổi Trẻ Sáng Tạo',
      place: 'BroAmStuck Studio',
      imageUrl: 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260922_194416_47e18c62-253a-42e1-97a9-9e5f6a6b8d59.png',
      notes: 'Lưu giữ tinh thần hiếu học, nhiệt huyết sáng tạo và ước mơ bay cao của tuổi trẻ.',
      isTall: true,
    },
    {
      id: 'ms-21',
      title: 'Người Giữ Ngọn Lửa',
      category: 'Đồng Hành',
      place: 'F-Forum Admin',
      imageUrl: 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260922_194417_a455843c-d8db-461c-8ef6-74a325d2472c.png',
      notes: 'Trần Văn Anh Tuấn — Sáng lập & đồng hành cùng học sinh trường ta.',
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

/*
  `broadcast: false` bắt buộc khi dữ liệu vừa NHẬN từ BroadcastChannel hoặc từ
  server push: BroadcastChannel giao tin cho mọi đối tượng cùng tên (kể cả trong
  cùng tab), nên phát lại ở nơi nhận tạo vòng lặp SYNC_ABOUT vô hạn — mỗi vòng
  ghi localStorage + setAboutData + render lại toàn App, làm web tụt dần về ~10fps.
*/
export function saveAboutDataLocally(data: AboutData, options: { broadcast?: boolean } = {}): void {
  const broadcast = options.broadcast !== false;
  const serialized = JSON.stringify(data);
  const current = safeStorage.getItem(STORAGE_KEY);
  if (current === serialized) {
    /* Dữ liệu không đổi — bỏ qua để chống bão render và I/O đĩa */
    return;
  }
  safeStorage.setItem(STORAGE_KEY, serialized);
  if (Array.isArray(data.milestones) && data.milestones.length > 0) {
    const normalizedMilestones = data.milestones.map((m, idx) => ({
      ...m,
      id: m.id || `vd-${idx + 1}`,
      place: m.place || m.category || '',
      category: m.category || m.place || '',
      note: m.note || m.notes || '',
      notes: m.notes || m.note || '',
      customImgUrl: m.customImgUrl || m.imageUrl || undefined,
      imageUrl: m.imageUrl || m.customImgUrl || '',
    }));
    safeStorage.setItem('fforum_vinhdanh_records', JSON.stringify(normalizedMilestones));
  }
  if (data.founder) {
    safeStorage.setItem('fforum_vinhdanh_founder', JSON.stringify(data.founder));
  }
  if (data.memoryRealm) {
    safeStorage.setItem('fforum_memory_realm_data', JSON.stringify(data.memoryRealm));
  }
  try {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('fforum_about_sync', { detail: data }));
      if (broadcast && 'BroadcastChannel' in window) {
        const bc = new BroadcastChannel('fforum_sync');
        bc.postMessage({ type: 'SYNC_ABOUT', payload: data });
        bc.close();
      }
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
        saveAboutDataLocally(json.about, { broadcast: false });
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
      headers: authHeaders(),
      body: JSON.stringify({ about: data, adminEmail }),
    });
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.about) {
        saveAboutDataLocally(json.about, { broadcast: false });
        return json.about as AboutData;
      }
    }
  } catch {
    /* ignore network issues */
  }
  return data;
}
