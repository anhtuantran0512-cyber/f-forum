/* Bản quyền trí tuệ thuộc về BroAmStuck */
export const VIDEO_TARGET_FPS = 18;
export const LOW_FPS_PLAYBACK_RATE = 0.72;

const CDN = 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/';

export const HOME_HERO_VIDEO_URL = `${CDN}hf_20260611_183632_c311af08-e4b7-458f-81e7-79847a49b3d3.mp4`;
export const LIGHT_TUNNEL_VIDEO_URL = `${CDN}hf_20260627_094019_4214ea73-b963-46a4-8327-61489192de99.mp4`;
export const COMING_SOON_VIDEO_URL = `${CDN}hf_20260314_131748_f2ca2a28-fed7-44c8-b9a9-bd9acdd5ec31.mp4`;

/*
  Bản WebM nhẹ TỰ HOST (VP9, 960px, 18fps, đã làm mờ sẵn gblur σ=2 ≈ blur 3px
  CSS ở màn 1440px). CloudFront KHÔNG có file .webm cùng tên (trả 403) — đổi đuôi
  .mp4→.webm như trước đây chỉ sinh request hỏng và, qua onError nổi bọt của
  <source>, làm ẩn luôn video → màn hình đen. MP4 gốc vẫn giữ làm nguồn dự phòng.
*/
const WATER_WAVE_VIDEO_URL = `${CDN}hf_20260629_030107_874273ea-684a-4e90-bb96-8fdfde48d53d.mp4`;
const GRIDWAVE_VIDEO_URL = `${CDN}hf_20260629_032424_3c9c2a9d-807b-4482-80e6-dd6d9dfd4545.mp4`;

const LOCAL_WEBM: Record<string, string> = {
  [HOME_HERO_VIDEO_URL]: '/assets/video/home-hero.webm',
  [LIGHT_TUNNEL_VIDEO_URL]: '/assets/video/light-tunnel.webm',
  [COMING_SOON_VIDEO_URL]: '/assets/video/coming-soon.webm',
  [WATER_WAVE_VIDEO_URL]: '/assets/video/light-tunnel.webm',
  [GRIDWAVE_VIDEO_URL]: '/assets/video/home-hero.webm',
};

export const toWebmVideoUrl = (url: string): string | null => LOCAL_WEBM[url] ?? null;

/* Video đang phát từ bản WebM đã làm mờ sẵn thì không cần thêm filter blur CSS (đắt trên GPU). */
export const isPreBlurredSource = (currentSrc: string): boolean => currentSrc.endsWith('.webm');

export const TRI_CHAT_VIDEOS = [
  {
    id: 0,
    label: '01 / LIGHT TUNNEL',
    url: LIGHT_TUNNEL_VIDEO_URL,
  },
  {
    id: 1,
    label: '02 / WATER WAVE',
    url: WATER_WAVE_VIDEO_URL,
  },
  {
    id: 2,
    label: '03 / GRIDWAVE',
    url: GRIDWAVE_VIDEO_URL,
  },
];
