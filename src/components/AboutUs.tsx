/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  Edit3,
  Trash2,
  Camera,
  Plus,
  X,
  Sparkles,
  Maximize2,
  Save,
  RotateCcw,
  Check,
  Upload,
  MapPin,
  Globe,
  LayoutGrid,
  Minimize2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AdminVerifiedBadge } from './Badges10Tier';
import {
  type MilestoneItem,
  type AboutData,
  DEFAULT_ABOUT_DATA,
  getSavedAboutData,
  saveAboutDataToServer,
  saveAboutDataLocally,
} from '../store/adminStore';
import { DEFAULT_AVATAR, handleImageError } from '../utils/mediaFallback';
import { optimizeImageFile } from '../utils/imageOptimize';
import { safeStorage } from '../utils/storage';

export type { MilestoneItem };

interface AboutUsProps {
  customAboutData?: AboutData;
  onUpdateAbout?: (data: AboutData) => void;
  className?: string;
  isEmbedded?: boolean;
}

const N = 21;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

interface FibonacciPoint {
  index: number;
  x: number;
  y: number;
  z: number;
  lat: number;
  lon: number;
}

const FIBONACCI_POINTS: FibonacciPoint[] = Array.from({ length: N }, (_, i) => {
  const y = 1 - (i / (N - 1)) * 2;
  const rad = Math.sqrt(Math.max(0, 1 - y * y));
  const theta = i * GOLDEN_ANGLE;
  const x = Math.cos(theta) * rad;
  const z = Math.sin(theta) * rad;
  const lat = Math.asin(y) * (180 / Math.PI);
  const lon = Math.atan2(x, z) * (180 / Math.PI);
  return { index: i, x, y, z, lat, lon };
});

export const AboutUs: React.FC<AboutUsProps> = ({
  customAboutData,
  onUpdateAbout,
  className = '',
  isEmbedded = false,
}) => {
  const { currentUser } = useAuth();
  const isSuperAdmin = currentUser?.email?.toLowerCase() === 'anhtuantran0512@gmail.com';

  const [localAboutData, setLocalAboutData] = useState<AboutData>(() => {
    return customAboutData || getSavedAboutData();
  });

  const aboutData = customAboutData || localAboutData;

  const [viewMode, setViewMode] = useState<'sphere' | 'grid'>('sphere');
  const [isFullscreenStage, setIsFullscreenStage] = useState(false);
  const [sphereRadius, setSphereRadius] = useState(360);

  const [activeLightboxMilestone, setActiveLightboxMilestone] = useState<MilestoneItem | null>(null);
  const [lightboxSourceRect, setLightboxSourceRect] = useState<DOMRect | null>(null);
  const [lightboxMilestoneIndex, setLightboxMilestoneIndex] = useState<number | null>(null);
  const [isLightboxEntering, setIsLightboxEntering] = useState(false);

  const [isEditingInLightbox, setIsEditingInLightbox] = useState(false);
  const [editingMilestoneData, setEditingMilestoneData] = useState<MilestoneItem | null>(null);

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<AboutData>(aboutData);
  const [isSaving, setIsSaving] = useState(false);
  const [saveToast, setSaveToast] = useState(false);

  const [isAvatarPromptOpen, setIsAvatarPromptOpen] = useState(false);
  const [avatarInputUrl, setAvatarInputUrl] = useState('');
  const avatarFileInputRef = useRef<HTMLInputElement | null>(null);

  const [quickFieldTarget, setQuickFieldTarget] = useState<'name' | 'role' | 'bio' | null>(null);
  const [quickFieldValue, setQuickFieldValue] = useState('');

  const stageRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const orbRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);
  const dotRef = useRef<HTMLDivElement>(null);

  const engineState = useRef({
    spin: 0,
    tilt: -4,
    camZ: 0,
    wheelCamZ: 0,
    dragX: 0,
    dragY: 0,
    velX: 0,
    velY: 0,
    isDragging: false,
    lastPointerX: 0,
    lastPointerY: 0,
    mousePos: { x: -100, y: -100 },
    dotPos: { x: -100, y: -100 },
    R: 360,
    cw: 140,
    hasFinePointer: true,
  });


  useEffect(() => {
    let bc: BroadcastChannel | null = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        bc = new BroadcastChannel('fforum_sync');
        bc.onmessage = (event) => {
          if (event.data?.type === 'SYNC_ABOUT' && event.data?.payload) {
            setLocalAboutData(event.data.payload);
          }
        };
      } catch {
        /* ignore */
      }
    }

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'fforum_about_data' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed && typeof parsed === 'object') {
            setLocalAboutData(parsed);
          }
        } catch {
          /* ignore */
        }
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isEditorOpen) setIsEditorOpen(false);
        else if (isAvatarPromptOpen) setIsAvatarPromptOpen(false);
        else if (quickFieldTarget) setQuickFieldTarget(null);
        else if (activeLightboxMilestone) {
          setActiveLightboxMilestone(null);
          setIsEditingInLightbox(false);
        } else if (isFullscreenStage) {
          setIsFullscreenStage(false);
        }
      }
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      bc?.close();
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isEditorOpen, isAvatarPromptOpen, quickFieldTarget, activeLightboxMilestone, isFullscreenStage]);

  useEffect(() => {
    if (activeLightboxMilestone && isLightboxEntering) {
      const raf = requestAnimationFrame(() => {
        setIsLightboxEntering(false);
      });
      return () => cancelAnimationFrame(raf);
    }
  }, [activeLightboxMilestone, isLightboxEntering]);

  const updateEngineDimensions = useCallback(() => {
    const stage = stageRef.current;
    const width = stage ? stage.clientWidth : window.innerWidth;
    const height = stage ? stage.clientHeight : window.innerHeight;

    const hr = width <= 380 ? 0.38 : width <= 640 ? 0.42 : 0.46;
    const wr = width <= 380 ? 0.48 : width <= 640 ? 0.52 : 0.58;
    const floor = 180;
    const R = Math.max(floor, Math.min(480, height * hr, width * wr));

    const scale = width <= 380 ? 0.36 : width <= 640 ? 0.40 : 0.44;
    const cw = Math.round(Math.max(72, R * scale));

    engineState.current.R = R;
    engineState.current.cw = cw;
    setSphereRadius(R);

    FIBONACCI_POINTS.forEach((pt, i) => {
      const cardEl = cardsRef.current[i];
      if (!cardEl) return;
      const ms = aboutData.milestones[i] || DEFAULT_ABOUT_DATA.milestones[i % DEFAULT_ABOUT_DATA.milestones.length];
      const isTall = Boolean(ms?.isTall);
      const cardW = cw;
      const cardH = isTall ? Math.round(cw * 1.42) : Math.round(cw / 1.5);
      const marginX = -Math.round(cardW / 2);
      const marginY = isTall ? -Math.round(cardH / 2) : -Math.round(cardW / 3);

      cardEl.style.width = `${cardW}px`;
      cardEl.style.height = `${cardH}px`;
      cardEl.style.marginLeft = `${marginX}px`;
      cardEl.style.marginTop = `${marginY}px`;
      cardEl.style.transform = `rotateY(${pt.lon}deg) rotateX(${-pt.lat}deg) translateZ(${R}px)`;
    });
  }, [aboutData.milestones]);

  useEffect(() => {
    let animId: number;

    const checkFinePointer = () => {
      engineState.current.hasFinePointer = window.matchMedia('(pointer: fine)').matches;
    };
    checkFinePointer();

    updateEngineDimensions();
    window.addEventListener('resize', updateEngineDimensions);

    const tick = () => {
      const state = engineState.current;
      const { R } = state;

      if (!state.isDragging) {
        if (Math.abs(state.velX) > 0.002 || Math.abs(state.velY) > 0.002) {
          state.spin += state.velX;
          state.tilt = Math.max(-32, Math.min(32, state.tilt + state.velY));
          state.velX *= 0.94;
          state.velY *= 0.94;
        } else {
          state.spin += 0.07;
        }
      }

      let scrollDolly = 0;
      if (typeof window !== 'undefined') {
        const scrollProg = Math.max(0, Math.min(1, window.scrollY / (Math.max(1, window.innerHeight) * 0.16)));
        scrollDolly = scrollProg * (R * 0.35);
      }
      state.camZ = Math.max(-R * 0.35, Math.min(R * 0.65, state.wheelCamZ + scrollDolly));

      const sx = state.tilt;
      const sy = state.spin;
      const camZ = state.camZ;

      if (worldRef.current) {
        worldRef.current.style.transform = `translateZ(${camZ}px) rotateY(${sy}deg) rotateX(${sx}deg)`;
      }

      if (headlineRef.current) {
        headlineRef.current.style.transform = `rotateX(${-sx}deg) rotateY(${-sy}deg) translateZ(${R * 0.62}px)`;
      }

      const sxRad = (sx * Math.PI) / 180;
      const syRad = (sy * Math.PI) / 180;
      const cosX = Math.cos(sxRad);
      const sinX = Math.sin(sxRad);
      const cosY = Math.cos(syRad);
      const sinY = Math.sin(syRad);

      FIBONACCI_POINTS.forEach((pt, i) => {
        const cardEl = cardsRef.current[i];
        if (!cardEl) return;

        const z1 = -pt.y * sinX + pt.z * cosX;
        const x1 = pt.x;

        const z2 = -x1 * sinY + z1 * cosY;

        const zf = z2;
        const d = Math.max(0, Math.min(0.85, (1 - zf) * 0.45));

        cardEl.style.setProperty('--d', d.toFixed(3));
        cardEl.style.zIndex = Math.round((zf + 1) * 100).toString();
        cardEl.style.pointerEvents = zf < -0.2 ? 'none' : 'auto';
      });

      if (dotRef.current && state.hasFinePointer) {
        const { mousePos, dotPos } = state;
        dotPos.x += (mousePos.x - dotPos.x) * 0.18;
        dotPos.y += (mousePos.y - dotPos.y) * 0.18;
        dotRef.current.style.transform = `translate3d(${dotPos.x}px, ${dotPos.y}px, 0)`;
      }

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', updateEngineDimensions);
    };
  }, [updateEngineDimensions]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    engineState.current.isDragging = true;
    engineState.current.lastPointerX = e.clientX;
    engineState.current.lastPointerY = e.clientY;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const state = engineState.current;
    state.mousePos.x = e.clientX;
    state.mousePos.y = e.clientY;

    if (!state.isDragging) return;

    const dx = e.clientX - state.lastPointerX;
    const dy = e.clientY - state.lastPointerY;
    state.lastPointerX = e.clientX;
    state.lastPointerY = e.clientY;

    state.velX = dx * 0.13;
    state.velY = -dy * 0.13;

    state.spin += state.velX;
    state.tilt = Math.max(-32, Math.min(32, state.tilt + state.velY));
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    engineState.current.isDragging = false;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const state = engineState.current;
    const { R } = state;
    state.wheelCamZ = Math.max(-R * 0.35, Math.min(R * 0.5, state.wheelCamZ - e.deltaY * 0.22));
  };

  const handleCardClick = (ms: MilestoneItem, index: number, e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setLightboxSourceRect(rect);
    setLightboxMilestoneIndex(index);
    setActiveLightboxMilestone(ms);
    setIsEditingInLightbox(false);
    setIsLightboxEntering(true);

    if (ms.imageUrl) {
      const img = new Image();
      img.src = ms.imageUrl;
      if ('decode' in img) {
        img.decode().catch(() => {
          /* ignore */
        });
      }
    }
  };

  const handleGridCardMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -6;
    const rotateY = ((x - centerX) / centerX) * 6;
    card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
  };

  const handleGridCardMouseLeave = (e: React.MouseEvent<HTMLElement>) => {
    e.currentTarget.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
  };

  const handleFileToDataUrl = (file: File, callback: (dataUrl: string) => void) => {
    if (!file || !file.type.startsWith('image/')) return;
    if (file.size > 15 * 1024 * 1024) {
      alert('Kích thước ảnh vượt quá 15MB. Vui lòng chọn ảnh nhỏ hơn!');
      return;
    }
    /* Nén & thu nhỏ ảnh trước khi lưu để không vượt hạn mức localStorage/máy chủ */
    optimizeImageFile(file, { maxDimension: 1600, targetBytes: 500 * 1024 })
      .then(callback)
      .catch(() => {
        const reader = new FileReader();
        reader.onload = (event) => {
          const result = event.target?.result as string;
          if (result) callback(result);
        };
        reader.readAsDataURL(file);
      });
  };

  const handleOpenEditor = () => {
    setEditFormData(JSON.parse(JSON.stringify(aboutData)));
    setIsEditorOpen(true);
  };

  const handleSaveAboutData = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentUser || !isSuperAdmin) return;

    setIsSaving(true);
    const updated = await saveAboutDataToServer(editFormData, currentUser.email);
    setLocalAboutData(updated);
    if (onUpdateAbout) {
      onUpdateAbout(updated);
    }
    saveAboutDataLocally(updated);
    safeStorage.setItem('fforum_vinhdanh_records', JSON.stringify(updated.milestones));

    setIsSaving(false);
    setIsEditorOpen(false);
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 3000);
  };

  const handleSaveMilestoneInLightbox = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !isSuperAdmin || !editingMilestoneData || lightboxMilestoneIndex === null) return;

    const nextMilestones = [...aboutData.milestones];
    nextMilestones[lightboxMilestoneIndex] = editingMilestoneData;

    const nextData: AboutData = {
      ...aboutData,
      milestones: nextMilestones,
    };

    setIsSaving(true);
    const updated = await saveAboutDataToServer(nextData, currentUser.email);
    setLocalAboutData(updated);
    if (onUpdateAbout) onUpdateAbout(updated);
    saveAboutDataLocally(updated);
    safeStorage.setItem('fforum_vinhdanh_records', JSON.stringify(updated.milestones));

    setActiveLightboxMilestone(editingMilestoneData);
    setIsEditingInLightbox(false);
    setIsSaving(false);
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 3000);
  };

  const handleQuickAvatarSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !isSuperAdmin || !avatarInputUrl.trim()) return;

    const nextData: AboutData = {
      ...aboutData,
      founder: {
        ...aboutData.founder,
        avatarUrl: avatarInputUrl.trim(),
      },
    };
    setIsSaving(true);
    const updated = await saveAboutDataToServer(nextData, currentUser.email);
    setLocalAboutData(updated);
    if (onUpdateAbout) onUpdateAbout(updated);
    saveAboutDataLocally(updated);

    setIsSaving(false);
    setIsAvatarPromptOpen(false);
    setAvatarInputUrl('');
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 3000);
  };

  const handleOpenQuickField = (field: 'name' | 'role' | 'bio') => {
    setQuickFieldTarget(field);
    setQuickFieldValue(aboutData.founder[field]);
  };

  const handleQuickFieldSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !isSuperAdmin || !quickFieldTarget) return;

    const nextData: AboutData = {
      ...aboutData,
      founder: {
        ...aboutData.founder,
        [quickFieldTarget]: quickFieldValue.trim(),
      },
    };
    setIsSaving(true);
    const updated = await saveAboutDataToServer(nextData, currentUser.email);
    setLocalAboutData(updated);
    if (onUpdateAbout) onUpdateAbout(updated);
    saveAboutDataLocally(updated);

    setIsSaving(false);
    setQuickFieldTarget(null);
    setQuickFieldValue('');
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 3000);
  };

  const handleAddMilestone = () => {
    const newMs: MilestoneItem = {
      id: `ms-${Date.now()}`,
      title: 'Cột Mốc Phát Triển Mới',
      category: 'Hệ Thống & Kiến Trúc',
      place: 'BroAmStuck Studio • F-Forum Node',
      imageUrl: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1200&h=800&fit=crop',
      notes: 'Mô tả chi tiết những cải tiến đột phá và ghi chú kỹ thuật...',
      isTall: false,
    };
    setEditFormData(prev => ({
      ...prev,
      milestones: [...prev.milestones, newMs],
    }));
  };

  const handleRemoveMilestone = (id: string) => {
    setEditFormData(prev => ({
      ...prev,
      milestones: prev.milestones.filter(m => m.id !== id),
    }));
  };

  const handleMilestoneFieldChange = (
    id: string,
    field: keyof MilestoneItem,
    value: any
  ) => {
    setEditFormData(prev => ({
      ...prev,
      milestones: prev.milestones.map(m => (m.id === id ? { ...m, [field]: value } : m)),
    }));
  };

  const handleResetDefaults = () => {
    setEditFormData(DEFAULT_ABOUT_DATA);
  };

  return (
    <div
      className={`khu-vinh-danh-scope relative w-full bg-[#000000] text-[#f4f2ef] select-none ${
        isFullscreenStage
          ? 'fixed inset-0 z-50 h-screen w-screen overflow-hidden'
          : isEmbedded
          ? 'h-[750px] sm:h-[820px] rounded-3xl border border-white/15 shadow-2xl overflow-hidden'
          : 'h-[780px] sm:h-[860px] rounded-3xl border border-white/15 shadow-2xl overflow-hidden'
      } ${viewMode === 'grid' ? '!h-auto !min-h-0 !overflow-visible' : ''} ${className}`}
      style={{
        fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      {/* Scoped CSS Tokens matching exact specification */}
      <style>{`
        .khu-vinh-danh-scope {
          --bg: #000000;
          --ink: #f4f2ef;
          --dim: #8c8783;
          --line: rgba(244, 242, 239, 0.28);
          --pad: clamp(14px, 2.6vw, 34px);
          --ease: cubic-bezier(0.22, 0.61, 0.36, 1);
          --hw: min(56vw, 640px);
          --persp: 1150px;
        }
        #headline {
          font-family: "Playfair Display", "Times New Roman", serif;
          font-weight: 400;
          font-size: clamp(24px, 4.8vw, 48px);
        }
        @media (max-width: 900px) {
          .lightbox-meta { grid-template-columns: 1fr; }
          .bento-grid { grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); }
        }
        @media (max-width: 768px) {
          #headline {
            font-size: clamp(22px, 6.4vw, 34px);
            margin-left: calc(var(--hw) / -2);
          }
        }
        @media (max-width: 640px) {
          .bio-avatar { width: 42px; height: 42px; }
          .scroll-cue { display: none !important; }
          .lightbox-dialog { max-width: 560px; overflow-y: auto; }
        }
        @media (max-width: 380px) {
          .khu-vinh-danh-scope { --hw: min(88vw, 320px); }
          .bento-grid { grid-template-columns: 1fr; }
        }
        @media (max-height: 520px) and (orientation: landscape) {
          .bio, .colophon, .scroll-cue { display: none !important; }
          #headline { font-size: clamp(18px, 4.8vh, 28px); }
        }
        .transform-style-3d {
          transform-style: preserve-3d;
        }
        .card-figure::after {
          content: '';
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: rgba(0, 0, 0, var(--d, 0));
          border-radius: inherit;
          transition: background 0.08s linear;
        }
      `}</style>

      {/* Custom smooth cursor #dot lerp */}
      <div
        id="dot"
        ref={dotRef}
        className="fixed top-0 left-0 w-2.5 h-2.5 rounded-full bg-[#f4f2ef] pointer-events-none z-50 -ml-[5px] -mt-[5px] mix-blend-difference hidden md:block shadow-[0_0_12px_#ffffff]"
      />

      {/* Vignette .vig: radial-gradient ellipse 88% 92% */}
      <div
        className="vig fixed inset-0 z-12 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 88% 92% at 50% 50%, transparent 48%, rgba(0,0,0,.26) 80%, rgba(0,0,0,.72) 100%)',
        }}
      />

      {/* Top Floating Utility Bar (View Mode Toggle & Fullscreen Switcher) */}
      <div className="absolute top-[var(--pad)] right-[var(--pad)] z-30 flex items-center gap-2">
        <div className="flex items-center rounded-full bg-black/60 border border-white/20 p-1 backdrop-blur-md">
          <button
            type="button"
            onClick={() => setViewMode('sphere')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono transition-all cursor-pointer ${
              viewMode === 'sphere'
                ? 'bg-white/20 text-[#f4f2ef] font-semibold border border-white/30 shadow-sm'
                : 'text-[#8c8783] hover:text-[#f4f2ef]'
            }`}
            title="Chế độ 3D Fibonacci Sphere"
          >
            <Globe className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Quả Cầu 3D</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono transition-all cursor-pointer ${
              viewMode === 'grid'
                ? 'bg-white/20 text-[#f4f2ef] font-semibold border border-white/30 shadow-sm'
                : 'text-[#8c8783] hover:text-[#f4f2ef]'
            }`}
            title="Chế độ danh sách lưới phẳng (Bento Grid)"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Lưới Phẳng</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => setIsFullscreenStage(!isFullscreenStage)}
          className="p-2 rounded-full bg-black/60 hover:bg-black/90 border border-white/20 text-[#8c8783] hover:text-[#f4f2ef] backdrop-blur-md transition-all cursor-pointer"
          title={isFullscreenStage ? 'Thu nhỏ hiển thị' : 'Mở rộng toàn màn hình 3D'}
        >
          {isFullscreenStage ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Founder Bio Card (.bio) at top-left */}
      <div className="bio absolute top-[var(--pad)] left-[var(--pad)] z-20 max-w-[340px] pointer-events-auto">
        <div className="obsidian-glass rounded-2xl p-3 sm:p-4 border border-white/15 shadow-2xl backdrop-blur-xl space-y-2.5">
          <div className="flex items-center gap-3">
            {/* Avatar with blue tick sweep and admin trigger */}
            <div className="relative shrink-0 group/avatar">
              <img
                src={aboutData.founder.avatarUrl}
                alt={aboutData.founder.name}
                onError={e => handleImageError(e, DEFAULT_AVATAR)}
                loading="lazy"
                decoding="async"
                width={56}
                height={56}
                className="bio-avatar w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover border border-cyan-400/50 shadow-lg"
              />
              {isSuperAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    setAvatarInputUrl(aboutData.founder.avatarUrl);
                    setIsAvatarPromptOpen(true);
                  }}
                  className="absolute inset-0 bg-black/70 rounded-full opacity-0 group-hover/avatar:opacity-100 flex items-center justify-center text-cyan-300 transition-opacity cursor-pointer"
                  title="Thay đổi ảnh đại diện Admin"
                >
                  <Camera className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h2 className="text-xs sm:text-sm font-bold text-white tracking-wide truncate">
                  {aboutData.founder.name}
                </h2>
                {/* Facebook Blue Verified Tick sweep */}
                <AdminVerifiedBadge size={16} />
                {isSuperAdmin && (
                  <button
                    type="button"
                    onClick={() => handleOpenQuickField('name')}
                    className="text-[10px] text-amber-400 hover:text-amber-300 ml-1 cursor-pointer"
                    title="Sửa tên Admin"
                  >
                    <Edit3 className="w-3 h-3" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1 mt-0.5">
                <p className="text-[11px] font-mono text-cyan-300 truncate flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>{aboutData.founder.role}</span>
                </p>
                {isSuperAdmin && (
                  <button
                    type="button"
                    onClick={() => handleOpenQuickField('role')}
                    className="text-[10px] text-cyan-400 hover:text-cyan-300 cursor-pointer"
                    title="Sửa chức danh"
                  >
                    <Edit3 className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="relative group/bio">
            <p className="text-[11px] sm:text-xs text-neutral-300 italic font-sans leading-relaxed line-clamp-3">
              &ldquo;{aboutData.founder.bio}&rdquo;
            </p>
            {isSuperAdmin && (
              <button
                type="button"
                onClick={() => handleOpenQuickField('bio')}
                className="text-[10px] text-amber-300/80 hover:text-amber-300 mt-1 inline-flex items-center gap-1 cursor-pointer"
                title="Sửa tiểu sử"
              >
                <Edit3 className="w-2.5 h-2.5" />
                <span>Sửa tuyên ngôn</span>
              </button>
            )}
          </div>

          {/* Minimalist Founder links */}
          <div className="flex items-center gap-3 pt-1 border-t border-white/10 text-[10px] font-mono text-neutral-400">
            <a
              href="https://www.facebook.com/TuanNotTun/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-blue-400 transition-colors"
            >
              Facebook
            </a>
            <span>•</span>
            <a
              href="https://discord.gg/GMDCnxxJwX"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-indigo-400 transition-colors"
            >
              Discord
            </a>
            <span>•</span>
            <span className="text-cyan-400 truncate">F-Forum Founder</span>
          </div>
        </div>
      </div>

      {/* 2. THE 3D SPHERE ARCHITECTURE & MATHEMATICAL ENGINE */}
      {/* Exact DOM Structure: The Circle and its Center are the exact same 0x0 point */}
      <div
        id="stage"
        ref={stageRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onWheel={handleWheel}
        className={`${
          isFullscreenStage ? 'fixed inset-0 z-50' : 'absolute inset-0 z-10'
        } overflow-hidden perspective-[var(--persp)] cursor-grab active:cursor-grabbing ${
          viewMode === 'grid' ? '!hidden' : ''
        }`}
        style={{
          perspective: 'var(--persp)',
        }}
      >
        {/* World (origin 0,0, transform-style: preserve-3d, NO translateX/Y) */}
        <div
          id="world"
          ref={worldRef}
          className="absolute top-1/2 left-1/2 w-0 h-0 transform-style-3d will-change-transform"
        >
          {/* Orb: 21 Milestone Cards mapped on Fibonacci coordinates */}
          <div
            id="orb"
            ref={orbRef}
            className="absolute top-0 left-0 w-0 h-0 transform-style-3d opacity-100"
          >
            {FIBONACCI_POINTS.map((pt, i) => {
              const ms = aboutData.milestones[i] || DEFAULT_ABOUT_DATA.milestones[i % DEFAULT_ABOUT_DATA.milestones.length];
              return (
                <div
                  key={ms?.id || `card-${i}`}
                  ref={el => {
                    cardsRef.current[i] = el;
                  }}
                  onClick={e => ms && handleCardClick(ms, i, e)}
                  className="card group absolute top-0 left-0 transform-style-3d cursor-pointer transition-shadow hover:shadow-[0_0_30px_rgba(6,182,212,0.4)]"
                  style={{
                    transformStyle: 'preserve-3d',
                    transform: `rotateY(${pt.lon}deg) rotateX(${-pt.lat}deg) translateZ(${sphereRadius}px)`,
                  }}
                >
                  <figure className="card-figure relative w-full h-full rounded-xl overflow-hidden bg-neutral-900 border border-white/20 shadow-2xl">
                    <img
                      src={ms?.imageUrl}
                      alt={ms?.title || `Milestone ${i + 1}`}
                      onError={e => handleImageError(e, DEFAULT_AVATAR)}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      loading="lazy"
                      decoding="async"
                      width={280}
                      height={200}
                    />

                    {/* Milestone Index Pill */}
                    <span className="absolute top-2 left-2 z-10 px-1.5 py-0.5 rounded text-[9px] font-mono bg-black/75 text-cyan-300 border border-cyan-400/40 backdrop-blur-md">
                      {String(i + 1).padStart(2, '0')}
                    </span>

                    {/* Gradient Overlay & Title */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent flex flex-col justify-end p-2 pointer-events-none">
                      <span className="text-[8px] font-mono text-cyan-300 uppercase tracking-wider truncate">
                        {ms?.category}
                      </span>
                      <p className="text-[10px] font-bold text-white truncate leading-tight mt-0.5">
                        {ms?.title}
                      </p>
                    </div>
                  </figure>
                </div>
              );
            })}
          </div>

          {/* Headline: Strictly set rotateX(-sx deg) rotateY(-sy deg) translateZ(R * 0.62 px) */}
          <h1
            id="headline"
            ref={headlineRef}
            className="absolute top-0 left-0 w-[var(--hw)] -ml-[calc(var(--hw)/2)] text-center font-['Playfair_Display'] text-white select-none pointer-events-none font-playfair tracking-tight"
            style={{
              fontFamily: '"Playfair Display", "Times New Roman", Georgia, serif',
              fontWeight: 400,
            }}
          >
            <span className="inner absolute top-0 left-0 w-full -translate-y-1/2 drop-shadow-[0_4px_24px_rgba(0,0,0,0.9)]">
              <span>BroAmStuck</span> <span>Studio</span> <span>•</span> <span>Trần</span> <span>Văn</span> <span>Anh</span> <span>Tuấn</span>
            </span>
          </h1>
        </div>
      </div>

      {/* Flat Bento Grid View Alternative */}
      {viewMode === 'grid' && (
        <div className="relative z-10 w-full max-w-6xl mx-auto px-4 py-24 sm:py-28 space-y-8 animate-fade-up">
          <div className="text-center space-y-2 border-b border-white/10 pb-6">
            <h1
              className="text-2xl sm:text-4xl font-normal text-white font-playfair tracking-tight"
              style={{ fontFamily: '"Playfair Display", serif' }}
            >
              {aboutData.headline}
            </h1>
            <p className="text-xs sm:text-sm text-[#8c8783] max-w-2xl mx-auto">
              {aboutData.subtitle}
            </p>
          </div>

          <div className="bento-grid grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {aboutData.milestones.map((ms, idx) => (
              <button
                type="button"
                key={ms.id}
                onClick={e => handleCardClick(ms, idx, e)}
                onMouseMove={handleGridCardMouseMove}
                onMouseLeave={handleGridCardMouseLeave}
                className="text-left w-full group cursor-pointer rounded-2xl obsidian-glass border border-white/10 p-3.5 transition-all duration-300 hover:border-cyan-400/50 hover:shadow-[0_15px_40px_rgba(6,182,212,0.15)] flex flex-col justify-between"
              >
                <div className="space-y-2.5">
                  <div className={`relative w-full ${ms.isTall ? 'aspect-[3/4]' : 'aspect-video'} rounded-xl overflow-hidden bg-neutral-900 border border-white/10`}>
                    <img
                      src={ms.imageUrl}
                      alt={ms.title}
                      onError={e => handleImageError(e, DEFAULT_AVATAR)}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                      decoding="async"
                      width={360}
                      height={200}
                    />
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-mono bg-black/75 text-cyan-300 border border-cyan-400/30 backdrop-blur-md">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider block">
                      {ms.category}
                    </span>
                    <h3 className="text-xs sm:text-sm font-bold text-white group-hover:text-cyan-300 transition-colors mt-0.5">
                      {ms.title}
                    </h3>
                    {ms.place && (
                      <div className="flex items-center gap-1 text-[10px] font-mono text-neutral-400 mt-1">
                        <MapPin className="w-3 h-3 text-amber-400 shrink-0" />
                        <span className="truncate">{ms.place}</span>
                      </div>
                    )}
                  </div>

                  <p className="text-[11px] text-neutral-300 line-clamp-3 leading-relaxed">
                    {ms.notes}
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-[10px] text-neutral-400 font-mono">
                  <span>Chi tiết</span>
                  <span className="text-cyan-400 group-hover:translate-x-1 transition-transform">→</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Scroll Cue & Controls */}
      <div className="scroll-cue absolute bottom-[var(--pad)] right-[var(--pad)] z-20 pointer-events-none text-right">
        <p className="text-[11px] font-mono text-[#8c8783] tracking-widest uppercase">
          Kéo để xoay • Cuộn để phóng to
        </p>
        <p className="text-[9px] font-mono text-cyan-400/80 mt-0.5">
          21 Fibonacci Coordinates • 3D Optical Invariance
        </p>
      </div>

      {/* Colophon at bottom-left */}
      <div className="colophon absolute bottom-[var(--pad)] left-[var(--pad)] z-20 pointer-events-none">
        <p className="text-[10px] font-mono text-[#8c8783]">
          BroAmStuck Studio • F-Forum Khu Vinh Danh 2026
        </p>
      </div>

      {/* 4. FLIP LIGHTBOX MODAL PLATE INSPECTION */}
      {activeLightboxMilestone && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Chi tiết dấu mốc lịch sử"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-fade-up"
        >
          {/* Backdrop dismiss button */}
          <button
            type="button"
            tabIndex={-1}
            aria-label="Đóng xem chi tiết"
            className="fixed inset-0 bg-transparent border-none outline-none cursor-default"
            onClick={() => {
              setActiveLightboxMilestone(null);
              setIsEditingInLightbox(false);
            }}
          />
          <div
            className="plate lightbox-dialog relative z-10 w-full max-w-3xl rounded-3xl obsidian-glass border border-cyan-400/40 p-6 sm:p-8 shadow-[0_30px_90px_rgba(0,0,0,0.95)] max-h-[92vh] overflow-y-auto"
            style={{
              transition: isLightboxEntering
                ? 'none'
                : 'transform 0.4s cubic-bezier(0.22, 0.61, 0.36, 1), opacity 0.35s ease',
              transform: isLightboxEntering && lightboxSourceRect
                ? `translate3d(${lightboxSourceRect.left + lightboxSourceRect.width / 2 - (typeof window !== 'undefined' ? window.innerWidth / 2 : 0)}px, ${lightboxSourceRect.top + lightboxSourceRect.height / 2 - (typeof window !== 'undefined' ? window.innerHeight / 2 : 0)}px, 0) scale(${Math.min(0.4, lightboxSourceRect.width / Math.min(typeof window !== 'undefined' ? window.innerWidth * 0.9 : 600, 768))})`
                : 'translate3d(0, 0, 0) scale(1)',
              opacity: isLightboxEntering ? 0.3 : 1,
              transformOrigin: lightboxSourceRect
                ? `${lightboxSourceRect.left + lightboxSourceRect.width / 2}px ${lightboxSourceRect.top + lightboxSourceRect.height / 2}px`
                : 'center',
            }}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => {
                setActiveLightboxMilestone(null);
                setIsEditingInLightbox(false);
              }}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-neutral-300 hover:text-white transition-colors cursor-pointer z-10"
              title="Đóng modal"
            >
              <X className="w-5 h-5" />
            </button>

            {!isEditingInLightbox ? (
              <div className="space-y-6">
                {/* High-res Full Plate Image */}
                <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-neutral-900 border border-white/15 shadow-2xl">
                  <img
                    src={activeLightboxMilestone.imageUrl}
                    alt={activeLightboxMilestone.title}
                    onError={e => handleImageError(e, DEFAULT_AVATAR)}
                    loading="lazy"
                    decoding="async"
                    width={800}
                    height={450}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent pointer-events-none" />
                  <div className="absolute bottom-4 left-4 right-4">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className="text-xs font-mono text-cyan-300 uppercase tracking-widest px-2.5 py-1 rounded bg-black/60 border border-cyan-400/30 backdrop-blur-md">
                        {activeLightboxMilestone.category}
                      </span>
                      {activeLightboxMilestone.place && (
                        <span className="text-xs font-mono text-amber-300 px-2.5 py-1 rounded bg-black/60 border border-amber-400/30 backdrop-blur-md flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-amber-400" />
                          <span>{activeLightboxMilestone.place}</span>
                        </span>
                      )}
                    </div>
                    <h3 className="text-xl sm:text-2xl font-bold text-white mt-1">
                      {activeLightboxMilestone.title}
                    </h3>
                  </div>
                </div>

                {/* Development Chronicle Notes */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-mono font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Ghi Chú Phát Triển & Kiến Trúc — Field Notes</span>
                    </h4>

                    {isSuperAdmin && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingMilestoneData({ ...activeLightboxMilestone });
                          setIsEditingInLightbox(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-400/40 text-xs font-semibold transition-all cursor-pointer"
                        title="Chỉnh sửa cột mốc này"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Chỉnh sửa thẻ này</span>
                      </button>
                    )}
                  </div>

                  <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 text-xs sm:text-sm text-neutral-200 leading-relaxed font-sans whitespace-pre-line">
                    {activeLightboxMilestone.notes}
                  </div>

                  {activeLightboxMilestone.place && (
                    <div className="flex items-center gap-2 text-xs font-mono text-neutral-300 pt-1">
                      <span className="text-amber-400">📍 Địa điểm / Phạm vi:</span>
                      <span>{activeLightboxMilestone.place}</span>
                    </div>
                  )}

                  <div className="pt-2 flex items-center justify-between text-xs text-neutral-400 font-mono border-t border-white/10">
                    <span>BroAmStuck Studio Archive</span>
                    <span className="text-cyan-400">Verified System Chronicle</span>
                  </div>
                </div>
              </div>
            ) : (
              /* In-Place Milestone Editor inside Lightbox */
              <form onSubmit={handleSaveMilestoneInLightbox} className="space-y-4 pt-2">
                <div className="flex items-center gap-2 pb-2 border-b border-white/10">
                  <Edit3 className="w-4 h-4 text-amber-400" />
                  <h3 className="font-bold text-sm text-white">
                    Chỉnh Sửa Thẻ Cột Mốc Vinh Danh
                  </h3>
                </div>

                <div>
                  <label className="block text-xs text-neutral-300 mb-1">Tiêu đề cột mốc (*):</label>
                  <input
                    type="text"
                    required
                    maxLength={100}
                    value={editingMilestoneData?.title || ''}
                    onChange={e =>
                      setEditingMilestoneData(prev => prev ? { ...prev, title: e.target.value } : null)
                    }
                    className="w-full bg-neutral-900 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-neutral-300 mb-1">Phân loại (*):</label>
                    <input
                      type="text"
                      required
                      maxLength={100}
                      value={editingMilestoneData?.category || ''}
                      onChange={e =>
                        setEditingMilestoneData(prev => prev ? { ...prev, category: e.target.value } : null)
                      }
                      className="w-full bg-neutral-900 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-neutral-300 mb-1">Địa điểm (Place):</label>
                    <input
                      type="text"
                      maxLength={150}
                      value={editingMilestoneData?.place || ''}
                      onChange={e =>
                        setEditingMilestoneData(prev => prev ? { ...prev, place: e.target.value } : null)
                      }
                      placeholder="Ví dụ: Da Nang · Vietnam"
                      className="w-full bg-neutral-900 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs text-neutral-300">URL hình ảnh hoặc Tải ảnh từ máy (*):</label>
                    <label className="text-[11px] text-cyan-400 hover:text-cyan-300 cursor-pointer inline-flex items-center gap-1 font-mono">
                      <Upload size={12} />
                      <span>Chọn file từ máy</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleFileToDataUrl(file, dataUrl => {
                              setEditingMilestoneData(prev => prev ? { ...prev, imageUrl: dataUrl } : null);
                            });
                          }
                        }}
                      />
                    </label>
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={500}
                    value={editingMilestoneData?.imageUrl || ''}
                    onChange={e =>
                      setEditingMilestoneData(prev => prev ? { ...prev, imageUrl: e.target.value } : null)
                    }
                    placeholder="https://..."
                    className="w-full bg-neutral-900 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
                  />
                </div>

                <div className="flex items-center gap-2 py-1">
                  <input
                    type="checkbox"
                    id="lightbox-is-tall"
                    checked={Boolean(editingMilestoneData?.isTall)}
                    onChange={e =>
                      setEditingMilestoneData(prev => prev ? { ...prev, isTall: e.target.checked } : null)
                    }
                    className="rounded border-white/20 text-amber-500 focus:ring-0 cursor-pointer"
                  />
                  <label htmlFor="lightbox-is-tall" className="text-xs text-neutral-300 cursor-pointer">
                    Thẻ dạng dọc (Tall Card • Portrait Aspect Ratio)
                  </label>
                </div>

                <div>
                  <label className="block text-xs text-neutral-300 mb-1">Ghi chú phát triển & câu chuyện (*):</label>
                  <textarea
                    rows={4}
                    required
                    maxLength={800}
                    value={editingMilestoneData?.notes || ''}
                    onChange={e =>
                      setEditingMilestoneData(prev => prev ? { ...prev, notes: e.target.value } : null)
                    }
                    className="w-full bg-neutral-900 border border-white/15 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-amber-400 resize-none leading-relaxed"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setIsEditingInLightbox(false)}
                    className="px-4 py-2 rounded-xl text-xs text-neutral-400 hover:text-white cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs shadow-md disabled:opacity-50 cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{isSaving ? 'Đang lưu...' : 'Lưu Thay Đổi Thẻ'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* 5. EXCLUSIVE ADMIN CONTROLS (Only rendered if isSuperAdmin) */}
      {isSuperAdmin && (
        <div className="fixed bottom-6 right-6 z-40">
          <button
            type="button"
            onClick={handleOpenEditor}
            className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-bold text-xs shadow-[0_10px_30px_rgba(245,158,11,0.4)] transition-all hover:scale-105 active:scale-95 cursor-pointer"
            title="Bảng Quản Trị Vinh Danh & Cột Mốc 3D"
          >
            <span>⚙️</span>
            <span>Quản trị Vinh Danh (Admin) • Chỉnh sửa trang Vinh danh</span>
          </button>
        </div>
      )}

      {/* Master Content Editor Modal (Admin Only) */}
      {isSuperAdmin && isEditorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-fade-up">
          <div className="relative w-full max-w-3xl rounded-3xl obsidian-glass border border-amber-400/40 p-6 sm:p-8 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
              <div className="flex items-center gap-2">
                <span className="text-lg">⚙️</span>
                <h3 className="font-bold text-base sm:text-lg text-white">
                  Bảng Quản Trị & Chỉnh Sửa "Khu Vinh Danh"
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditorOpen(false)}
                className="p-1.5 rounded-full text-neutral-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAboutData} className="space-y-6">
              {/* Header Title & Subtitle */}
              <div className="space-y-3 p-4 rounded-2xl bg-white/[0.03] border border-white/10">
                <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider font-mono">
                  1. Tiêu Đề & Lời Dẫn Trang
                </h4>

                <div>
                  <label className="block text-xs text-neutral-300 mb-1">Tiêu đề chính (*):</label>
                  <input
                    type="text"
                    required
                    maxLength={150}
                    value={editFormData.headline}
                    onChange={e => setEditFormData({ ...editFormData, headline: e.target.value })}
                    className="w-full bg-neutral-900 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs text-neutral-300 mb-1">Mô tả phụ (*):</label>
                  <input
                    type="text"
                    required
                    maxLength={200}
                    value={editFormData.subtitle}
                    onChange={e => setEditFormData({ ...editFormData, subtitle: e.target.value })}
                    className="w-full bg-neutral-900 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              {/* Founder Spotlight Info */}
              <div className="space-y-3 p-4 rounded-2xl bg-white/[0.03] border border-white/10">
                <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider font-mono">
                  2. Thông Tin Nhà Sáng Lập & Quản Trị
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-neutral-300 mb-1">Họ và tên (*):</label>
                    <input
                      type="text"
                      required
                      maxLength={80}
                      value={editFormData.founder.name}
                      onChange={e =>
                        setEditFormData({
                          ...editFormData,
                          founder: { ...editFormData.founder, name: e.target.value },
                        })
                      }
                      className="w-full bg-neutral-900 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-neutral-300 mb-1">Chức danh / Danh xưng (*):</label>
                    <input
                      type="text"
                      required
                      maxLength={120}
                      value={editFormData.founder.role}
                      onChange={e =>
                        setEditFormData({
                          ...editFormData,
                          founder: { ...editFormData.founder, role: e.target.value },
                        })
                      }
                      className="w-full bg-neutral-900 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs text-neutral-300">URL hoặc Tải lên Ảnh Đại Diện (*):</label>
                    <label className="text-[11px] text-cyan-400 hover:text-cyan-300 cursor-pointer inline-flex items-center gap-1 font-mono">
                      <Upload size={12} />
                      <span>Chọn file từ máy</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleFileToDataUrl(file, dataUrl => {
                              setEditFormData(prev => ({
                                ...prev,
                                founder: { ...prev.founder, avatarUrl: dataUrl },
                              }));
                            });
                          }
                        }}
                      />
                    </label>
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={500}
                    value={editFormData.founder.avatarUrl}
                    onChange={e =>
                      setEditFormData({
                        ...editFormData,
                        founder: { ...editFormData.founder, avatarUrl: e.target.value },
                      })
                    }
                    placeholder="https://..."
                    className="w-full bg-neutral-900 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs text-neutral-300 mb-1">Tiểu sử & Tuyên ngôn sứ mệnh (*):</label>
                  <textarea
                    rows={3}
                    required
                    maxLength={1000}
                    value={editFormData.founder.bio}
                    onChange={e =>
                      setEditFormData({
                        ...editFormData,
                        founder: { ...editFormData.founder, bio: e.target.value },
                      })
                    }
                    className="w-full bg-neutral-900 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400 resize-none leading-relaxed"
                  />
                </div>
              </div>

              {/* Milestones Manager */}
              <div className="space-y-4 p-4 rounded-2xl bg-white/[0.03] border border-white/10">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider font-mono">
                    3. Danh Sách Cột Mốc ({editFormData.milestones.length})
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddMilestone}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Thêm cột mốc</span>
                  </button>
                </div>

                <div className="space-y-4">
                  {editFormData.milestones.map((ms, index) => (
                    <div
                      key={ms.id}
                      className="p-3.5 rounded-xl bg-black/40 border border-white/10 space-y-3 relative group/item"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-mono text-cyan-300 font-bold">
                          Cột mốc #{index + 1}
                        </span>
                        {editFormData.milestones.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveMilestone(ms.id)}
                            className="p-1 rounded-md text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors cursor-pointer"
                            title="Xóa cột mốc này"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[11px] text-neutral-400 mb-0.5">Tiêu đề:</label>
                          <input
                            type="text"
                            required
                            maxLength={100}
                            value={ms.title}
                            onChange={e => handleMilestoneFieldChange(ms.id, 'title', e.target.value)}
                            className="w-full bg-neutral-900 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] text-neutral-400 mb-0.5">Phân loại:</label>
                          <input
                            type="text"
                            required
                            maxLength={100}
                            value={ms.category}
                            onChange={e => handleMilestoneFieldChange(ms.id, 'category', e.target.value)}
                            className="w-full bg-neutral-900 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 items-center">
                        <div>
                          <label className="block text-[11px] text-neutral-400 mb-0.5">Địa điểm / Phạm vi (Place):</label>
                          <input
                            type="text"
                            maxLength={150}
                            value={ms.place || ''}
                            onChange={e => handleMilestoneFieldChange(ms.id, 'place', e.target.value)}
                            placeholder="Ví dụ: Da Nang · Vietnam"
                            className="w-full bg-neutral-900 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
                          />
                        </div>

                        <div className="flex items-center gap-2 pt-4">
                          <input
                            type="checkbox"
                            id={`tall-card-${ms.id}`}
                            checked={Boolean(ms.isTall)}
                            onChange={e => handleMilestoneFieldChange(ms.id, 'isTall', e.target.checked)}
                            className="rounded border-white/20 text-amber-500 focus:ring-0 cursor-pointer"
                          />
                          <label htmlFor={`tall-card-${ms.id}`} className="text-xs text-neutral-300 cursor-pointer">
                            Thẻ dọc (Tall card aspect-ratio)
                          </label>
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-0.5">
                          <label className="text-[11px] text-neutral-400">URL hoặc Tải lên Hình ảnh:</label>
                          <label className="text-[10px] text-cyan-400 hover:text-cyan-300 cursor-pointer inline-flex items-center gap-1 font-mono">
                            <Upload size={11} />
                            <span>Tải ảnh từ máy</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={e => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  handleFileToDataUrl(file, dataUrl => {
                                    handleMilestoneFieldChange(ms.id, 'imageUrl', dataUrl);
                                  });
                                }
                              }}
                            />
                          </label>
                        </div>
                        <input
                          type="text"
                          required
                          maxLength={500}
                          value={ms.imageUrl}
                          onChange={e => handleMilestoneFieldChange(ms.id, 'imageUrl', e.target.value)}
                          className="w-full bg-neutral-900 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] text-neutral-400 mb-0.5">Ghi chú phát triển:</label>
                        <textarea
                          rows={2}
                          required
                          maxLength={800}
                          value={ms.notes}
                          onChange={e => handleMilestoneFieldChange(ms.id, 'notes', e.target.value)}
                          className="w-full bg-neutral-900 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400 resize-none"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={handleResetDefaults}
                  className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Khôi phục mặc định ban đầu</span>
                </button>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsEditorOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs text-neutral-400 hover:text-white transition-colors cursor-pointer"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs shadow-lg transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>{isSaving ? 'Đang lưu...' : 'Lưu Thay Đổi'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Avatar URL / File Upload Modal (Admin Only) */}
      {isSuperAdmin && isAvatarPromptOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-up">
          <div className="w-full max-w-md rounded-2xl obsidian-glass border border-cyan-400/40 p-6 shadow-2xl">
            <h3 className="font-bold text-sm text-white mb-2 flex items-center gap-2">
              <Camera className="w-4 h-4 text-cyan-400" />
              <span>Cập Nhật Ảnh Đại Diện Admin</span>
            </h3>
            <p className="text-xs text-neutral-400 mb-4">
              Dán URL hình ảnh chất lượng cao hoặc tải ảnh trực tiếp từ thiết bị của bạn:
            </p>

            <form onSubmit={handleQuickAvatarSave} className="space-y-4">
              <div>
                <label className="block text-[11px] text-neutral-300 mb-1">Dán URL hình ảnh:</label>
                <input
                  type="text"
                  required
                  maxLength={500}
                  value={avatarInputUrl}
                  onChange={e => setAvatarInputUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-neutral-900 border border-white/20 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
                />
              </div>

              <div>
                <input
                  type="file"
                  ref={avatarFileInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleFileToDataUrl(file, dataUrl => {
                        setAvatarInputUrl(dataUrl);
                      });
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => avatarFileInputRef.current?.click()}
                  className="w-full py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-xs text-cyan-300 font-mono flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Hoặc Tải ảnh lên từ máy tính</span>
                </button>
              </div>

              {avatarInputUrl && (
                <div className="flex items-center gap-3 p-2 rounded-xl bg-black/40 border border-white/10">
                  <img
                    src={avatarInputUrl}
                    alt="Preview"
                    onError={e => handleImageError(e, DEFAULT_AVATAR)}
                    loading="lazy"
                    decoding="async"
                    width={48}
                    height={48}
                    className="w-12 h-12 rounded-full object-cover border border-cyan-400/40"
                  />
                  <span className="text-[11px] text-neutral-300 truncate">Ảnh xem trước</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsAvatarPromptOpen(false)}
                  className="px-3.5 py-1.5 text-xs text-neutral-400 hover:text-white cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSaving || !avatarInputUrl.trim()}
                  className="px-4 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {isSaving ? 'Đang lưu...' : 'Cập nhật ảnh'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Spotlight Field Editor Modal (Admin Only) */}
      {isSuperAdmin && quickFieldTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-up">
          <div className="w-full max-w-md rounded-2xl obsidian-glass border border-amber-400/40 p-6 shadow-2xl">
            <h3 className="font-bold text-sm text-white mb-2 flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-amber-400" />
              <span>
                {quickFieldTarget === 'name' && 'Chỉnh Sửa Tên Nhà Sáng Lập'}
                {quickFieldTarget === 'role' && 'Chỉnh Sửa Chức Danh / Danh Xưng'}
                {quickFieldTarget === 'bio' && 'Chỉnh Sửa Tiểu Sử & Sứ Mệnh'}
              </span>
            </h3>

            <form onSubmit={handleQuickFieldSave} className="space-y-4">
              {quickFieldTarget === 'bio' ? (
                <textarea
                  rows={4}
                  required
                  maxLength={1000}
                  value={quickFieldValue}
                  onChange={e => setQuickFieldValue(e.target.value)}
                  className="w-full bg-neutral-900 border border-white/20 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-amber-400 resize-none leading-relaxed"
                />
              ) : (
                <input
                  type="text"
                  required
                  maxLength={quickFieldTarget === 'name' ? 80 : 120}
                  value={quickFieldValue}
                  onChange={e => setQuickFieldValue(e.target.value)}
                  className="w-full bg-neutral-900 border border-white/20 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setQuickFieldTarget(null)}
                  className="px-3.5 py-1.5 text-xs text-neutral-400 hover:text-white cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSaving || !quickFieldValue.trim()}
                  className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Save Success Toast Banner */}
      {saveToast && (
        <div className="fixed top-20 right-6 z-50 animate-fade-up">
          <div className="px-4 py-3 rounded-2xl bg-neutral-950/95 border border-cyan-400/40 text-cyan-300 text-xs font-semibold shadow-2xl backdrop-blur-xl flex items-center gap-2">
            <Check className="w-4 h-4 text-cyan-400" />
            <span>Nội dung Khu Vinh Danh đã được lưu và đồng bộ thành công!</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default AboutUs;
