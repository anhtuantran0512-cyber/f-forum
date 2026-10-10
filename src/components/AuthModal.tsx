/* Bản quyền trí tuệ thuộc về BroAmStuck */
/**
 * Đăng nhập / Đăng ký "điện ảnh" (Epic 5 · Nhiemvu_4 Task 3 · Nhiemvu_5 Phase D/E).
 *  - Cú Bông phản ứng theo hành vi: gõ email → đeo kính cầm bút; gõ mật khẩu → che mắt;
 *    bật đèn pin → hé mắt nheo nhìn; sai → lắc đầu đổ mồ hôi; thành công → nhảy mừng.
 *  - Ô mật khẩu "đèn pin soi mật khẩu" (FlashlightPasswordField) + fallback trợ năng.
 *  - Nền sân khấu đổi theo giờ trong ngày (sáng/trưa/hoàng hôn/đêm).
 *  - Lời thoại theo Brand Voice: gần gũi, hài hước nhẹ, động viên (docs/BRAND_GUIDELINE.md).
 * Logic xác thực giữ nguyên: mật khẩu qua máy chủ, Google/Facebook OAuth thật,
 * form dự phòng khi môi trường chưa cấu hình OAuth.
 */
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { X, LogIn, UserPlus, AlertCircle, CheckCircle, RotateCcw } from 'lucide-react';
import type { User } from '../types';
import {
  isGoogleConfigured,
  isFacebookConfigured,
  loginWithGooglePopup,
  loginWithFacebookPopup,
  type SocialUserProfile,
} from '../utils/oauth';
import { isMasterAdmin } from '../config/admin';
import { CuBong, type CuBongMood } from './mascot/CuBong';
import { FlashlightPasswordField, type FlashlightMode } from './auth/FlashlightPasswordField';
import { GalaxySky } from './auth/GalaxySky';
import { AuthTypewriter } from './auth/AuthTypewriter';
import { enterAuthForm, morphTransform, type MorphRect } from './auth/WelcomeFlow';
import { passwordStrength } from '../utils/passwordRules';
import './auth/AuthExperience.css';
import './auth/WelcomeSequence.css';

/** Hồ sơ social kèm access token — server cần token để tự kiểm chứng danh tính. */
export type SocialLoginPayload = SocialUserProfile;

export interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin?: (provider: 'google' | 'facebook', data: SocialLoginPayload) => void;
  onLoginSocial?: (provider: 'google' | 'facebook', data: SocialLoginPayload) => Promise<User>;
  onLoginWithPassword?: (email: string, password: string) => Promise<User>;
  onRegister?: (name: string, email: string, password: string) => Promise<User>;
  onSuccess?: (flow: 'login' | 'register') => void;
  /** Tab shown when the dialog opens (marketing CTAs open the register tab). */
  initialTab?: 'login' | 'register';
}

export type LoginModalProps = AuthModalProps;

type DayPhase = 'morning' | 'day' | 'dusk' | 'night';
type FocusField = 'name' | 'email' | 'password' | null;

const dayPhaseOf = (hour: number): DayPhase => {
  if (hour >= 5 && hour < 10) return 'morning';
  if (hour >= 10 && hour < 16) return 'day';
  if (hour >= 16 && hour < 19) return 'dusk';
  return 'night';
};

/** Chuyển thông báo khô khan của máy chủ sang giọng Cú Bông (giữ nguyên nghĩa). */
const friendlyError = (message: string): string => {
  if (/Mật khẩu không chính xác/i.test(message)) return 'Ối, mật khẩu chưa đúng rồi. Soi đèn pin xem gõ nhầm chỗ nào nhé?';
  if (/Tài khoản không tồn tại/i.test(message)) return 'Tớ chưa thấy email này đâu — cậu đăng ký mới nhé?';
  if (/đã tồn tại|đã được sử dụng|đã đăng ký/i.test(message)) return 'Email này có chủ rồi nè — cậu thử đăng nhập xem?';
  return message;
};

const STARS = Array.from({ length: 64 }, (_, index) => ({
  left: `${(index * 73.37 + 13) % 100}%`,
  top: `${(index * 41.71 + 7) % 70}%`,
  delay: `${(index % 7) * 0.4}s`,
}));
const FIREFLIES = [
  { left: '18%', bottom: '74px', delay: '0s' },
  { left: '72%', bottom: '96px', delay: '-2.4s' },
  { left: '46%', bottom: '120px', delay: '-4.6s' },
  { left: '84%', bottom: '58px', delay: '-1.2s' },
];

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLogin,
  onLoginSocial,
  onLoginWithPassword,
  onRegister,
  onSuccess,
  initialTab = 'login',
}) => {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>(initialTab);
  // Every opening starts with Cú Bông; Skip remains available for a quick entry.
  const [introOpen, setIntroOpen] = useState(true);
  const [fromWelcome, setFromWelcome] = useState(false);
  const [introFinished, setIntroFinished] = useState(false);
  const introHandled = useRef(false);
  const authRequestEpoch = useRef(0);
  const submitInFlight = useRef(false);
  const focusFrame = useRef<number | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const boardRef = useRef<HTMLButtonElement>(null);
  const welcomeOwlRef = useRef<HTMLButtonElement>(null);
  const welcomeEyeFrame = useRef<number | null>(null);
  const welcomePointerX = useRef(0);
  const firstInputRef = useRef<HTMLInputElement>(null);
  const [morph, setMorph] = useState<{ from: MorphRect; x: number; y: number; scaleX: number; scaleY: number } | null>(null);
  const [hoveredSubmit, setHoveredSubmit] = useState<'login' | 'register' | null>(null);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState('');
  const [fallbackProvider, setFallbackProvider] = useState<'google' | 'facebook' | null>(null);
  const [fallbackCustomName, setFallbackCustomName] = useState('');
  const [fallbackCustomEmail, setFallbackCustomEmail] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  /* --- Epic 5: trạng thái điều khiển Cú Bông --- */
  const [focusField, setFocusField] = useState<FocusField>(null);
  const [torchMode, setTorchMode] = useState<FlashlightMode>('off');
  const [mascotFlash, setMascotFlash] = useState<'sad' | null>(null);
  const [invalidField, setInvalidField] = useState<'name' | 'email' | 'password' | 'confirm' | null>(null);
  const [phase] = useState<DayPhase>(() => dayPhaseOf(new Date().getHours()));
  const flashTimer = useRef<number | null>(null);

  useEffect(() => () => {
    if (flashTimer.current) window.clearTimeout(flashTimer.current);
    if (welcomeEyeFrame.current !== null) window.cancelAnimationFrame(welcomeEyeFrame.current);
  }, []);

  // Dialog keeps keyboard focus inside, and returns it to the CTA on exit.
  // Focus is scheduled rather than relying on autoFocus (which stole focus behind welcome).
  useEffect(() => {
    if (!isOpen) return undefined;
    const origin = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    focusFrame.current = window.requestAnimationFrame(() => {
      (boardRef.current ?? firstInputRef.current)?.focus({ preventScroll: true });
      focusFrame.current = null;
    });
    return () => {
      // Also invalidate pending work when the parent closes/unmounts us directly.
      authRequestEpoch.current += 1;
      submitInFlight.current = false;
      if (focusFrame.current !== null) window.cancelAnimationFrame(focusFrame.current);
      focusFrame.current = null;
      if (welcomeEyeFrame.current !== null) window.cancelAnimationFrame(welcomeEyeFrame.current);
      welcomeEyeFrame.current = null;
      if (origin?.isConnected) origin.focus({ preventScroll: true });
    };
  }, [isOpen]);

  // Parent-controlled closure may bypass handleClose (route change, global auth reset).
  useEffect(() => {
    if (isOpen) return undefined;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setLoginPassword('');
      setRegisterPassword('');
      setRegisterConfirmPassword('');
      setIsSubmitting(false);
      setErrorMsg(null);
      setInvalidField(null);
      setFallbackProvider(null);
      setTorchMode('off');
      setFocusField(null);
      setMorph(null);
      setFromWelcome(false);
      setIntroFinished(false);
      setIntroOpen(true);
      setActiveTab(initialTab);
      introHandled.current = false;
    });
    return () => { cancelled = true; };
  }, [isOpen, initialTab]);

  /* Timeline: welcome (one layout) → first click commits form immediately.
   * FLIP: measure board & panel once; animate only a pointer-transparent ghost.
   * Mascot stays mounted and flies to its normal slot. No timeout controls inputs. */
  useLayoutEffect(() => {
    if (!isOpen || !introOpen) return undefined;
    const position = () => {
      const card = cardRef.current;
      const stage = stageRef.current;
      if (!card || !stage) return;
      const rect = card.getBoundingClientRect();
      const naturalX = rect.left + stage.offsetLeft;
      const naturalY = rect.top + stage.offsetTop;
      const mobile = window.innerWidth <= 760;
      const dx = window.innerWidth / 2 - naturalX - stage.offsetWidth / 2;
      const dy = window.innerHeight / 2 - naturalY - stage.offsetHeight + (mobile ? stage.offsetHeight / 2 : 148);
      stage.style.setProperty('--welcome-x', `${dx}px`);
      stage.style.setProperty('--welcome-y', `${dy}px`);
      stage.style.setProperty('--welcome-arc-x', `${dx * .26}px`);
      stage.style.setProperty('--welcome-arc-y', `${dy * .26 - 54}px`);
      stage.style.setProperty('--welcome-arc-y-mobile', `${dy * .26 - 28}px`);
    };
    position();
    window.addEventListener('resize', position);
    return () => window.removeEventListener('resize', position);
  }, [isOpen, introOpen]);

  const openForm = (skip = false) => {
    if (introHandled.current || !introOpen) return;
    introHandled.current = true; // guards double click / overlapping pointer + keyboard events
    if (!skip && boardRef.current && panelRef.current && !document.documentElement.classList.contains('potator-mode') &&
      !document.documentElement.classList.contains('reduce-motion') && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const from = boardRef.current.getBoundingClientRect();
      const to = panelRef.current.getBoundingClientRect();
      setMorph({ from, ...morphTransform(from, to) });
    }
    setFromWelcome(!skip && !document.documentElement.classList.contains('reduce-motion') &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    setIntroFinished(skip || document.documentElement.classList.contains('reduce-motion') ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    setIntroOpen(enterAuthForm('welcome') === 'welcome');
    if (focusFrame.current !== null) window.cancelAnimationFrame(focusFrame.current);
    focusFrame.current = window.requestAnimationFrame(() => {
      firstInputRef.current?.focus({ preventScroll: true });
      focusFrame.current = null;
    });
  };

  const replayWelcome = () => {
    if (isSubmitting) return;
    introHandled.current = false;
    setMorph(null);
    setFromWelcome(false);
    setIntroFinished(false);
    setIntroOpen(true);
    if (focusFrame.current !== null) window.cancelAnimationFrame(focusFrame.current);
    focusFrame.current = window.requestAnimationFrame(() => {
      boardRef.current?.focus({ preventScroll: true });
      focusFrame.current = null;
    });
  };

  const handleDialogKeys = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') { handleClose(); return; }
    if (event.key !== 'Tab') return;
    const elements = Array.from(overlayRef.current?.querySelectorAll<HTMLElement>(
      'button:not(:disabled), input:not(:disabled), [href], [tabindex]:not([tabindex="-1"])'
    ) || []).filter((element) => !element.closest('[inert]') && element.tabIndex !== -1);
    const first = elements[0];
    const last = elements[elements.length - 1];
    if (!first || !last) return;
    if (event.shiftKey && (document.activeElement === first || !overlayRef.current?.contains(document.activeElement))) {
      event.preventDefault(); last.focus();
    } else if (!event.shiftKey && (document.activeElement === last || !overlayRef.current?.contains(document.activeElement))) {
      event.preventDefault(); first.focus();
    }
  };

  const handleWelcomePointerMove = (event: React.PointerEvent<HTMLElement>) => {
    if (!welcomeOwlRef.current?.classList.contains('is-landed') &&
      !document.documentElement.classList.contains('reduce-motion') &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    welcomePointerX.current = event.clientX;
    if (welcomeEyeFrame.current !== null) return;
    // DOM-only eye movement: a React render on every pointer event restarted work
    // across the full SVG + hidden form while the owl was landing.
    welcomeEyeFrame.current = window.requestAnimationFrame(() => {
      welcomeEyeFrame.current = null;
      const stage = stageRef.current;
      const owl = welcomeOwlRef.current?.firstElementChild as SVGSVGElement | null;
      if (!stage || !owl) return;
      const rect = stage.getBoundingClientRect();
      const look = Math.max(-1, Math.min(1, ((welcomePointerX.current - rect.left) / Math.max(rect.width, 1) - .5) * 2));
      owl.style.setProperty('--cb-look-x', `${(look * 5).toFixed(2)}px`);
    });
  };

  const handleTorchChange = useCallback((mode: FlashlightMode) => setTorchMode(mode), []);

  if (!isOpen) return null;

  const resetFormState = () => {
    setErrorMsg(null);
    setIsSubmitting(false);
    setFallbackProvider(null);
    setFallbackCustomName('');
    setFallbackCustomEmail('');
    setLoginPassword('');
    setRegisterPassword('');
    setRegisterConfirmPassword('');
    setTorchMode('off');
    setFocusField(null);
    setMascotFlash(null);
  };

  const handleClose = () => {
    authRequestEpoch.current += 1; // late auth responses cannot reopen a closed modal
    submitInFlight.current = false;
    if (focusFrame.current !== null) window.cancelAnimationFrame(focusFrame.current);
    focusFrame.current = null;
    if (flashTimer.current) window.clearTimeout(flashTimer.current);
    resetFormState();
    setMorph(null);
    setFromWelcome(false);
    setIntroFinished(false);
    setIntroOpen(true);
    setActiveTab(initialTab);
    introHandled.current = false;
    onClose();
  };

  const flashMascot = (next: 'sad', ms: number) => {
    if (flashTimer.current) window.clearTimeout(flashTimer.current);
    setMascotFlash(next);
    flashTimer.current = window.setTimeout(() => setMascotFlash(null), ms);
  };

  const fail = (message: string, field: typeof invalidField = null) => {
    setErrorMsg(friendlyError(message));
    setInvalidField(field);
    flashMascot('sad', 2400);
  };

  // Không giữ modal bằng timer: xác thực thành công là đóng ngay,
  // không có lớp phủ nào có thể kẹt trước khi trở về ứng dụng.
  const succeed = () => {
    handleClose();
    onSuccess?.(fallbackProvider ? 'login' : activeTab);
  };

  const beginRequest = (): number | null => {
    if (submitInFlight.current) return null;
    submitInFlight.current = true;
    setIsSubmitting(true);
    return authRequestEpoch.current;
  };
  const endRequest = (epoch: number) => {
    if (epoch !== authRequestEpoch.current) return;
    submitInFlight.current = false;
    setIsSubmitting(false);
  };

  const handleExecuteSocialLogin = async (
    provider: 'google' | 'facebook',
    profile: SocialLoginPayload,
    existingEpoch?: number,
  ) => {
    const epoch = existingEpoch ?? beginRequest();
    if (epoch === null || epoch !== authRequestEpoch.current) return;
    setErrorMsg(null);
    try {
      if (onLoginSocial) {
        await onLoginSocial(provider, profile);
      } else if (onLogin) {
        onLogin(provider, profile);
      }
      if (epoch === authRequestEpoch.current) succeed();
    } catch (err: any) {
      if (epoch === authRequestEpoch.current) fail(err.message || 'Xác thực tài khoản thất bại');
    } finally {
      endRequest(epoch);
    }
  };

  const handleGoogleAuth = async () => {
    setErrorMsg(null);

    if (!isGoogleConfigured()) {
      setFallbackProvider('google');
      return;
    }

    const epoch = beginRequest();
    if (epoch === null) return;
    try {
      const profile = await loginWithGooglePopup();
      if (epoch !== authRequestEpoch.current) return;
      await handleExecuteSocialLogin('google', profile, epoch);
    } catch (err: any) {
      if (epoch !== authRequestEpoch.current) return;
      if (err.message === 'POPUP_CLOSED') {
        return;
      }
      if (err.message === 'MISSING_GOOGLE_CLIENT_ID' || err.message === 'GOOGLE_SDK_UNAVAILABLE') {
        setFallbackProvider('google');
      } else {
        fail(err.message || 'Đăng nhập Google thất bại');
      }
    } finally {
      endRequest(epoch);
    }
  };

  const handleFacebookAuth = async () => {
    setErrorMsg(null);

    if (!isFacebookConfigured()) {
      setFallbackProvider('facebook');
      return;
    }

    const epoch = beginRequest();
    if (epoch === null) return;
    try {
      const profile = await loginWithFacebookPopup();
      if (epoch !== authRequestEpoch.current) return;
      await handleExecuteSocialLogin('facebook', profile, epoch);
    } catch (err: any) {
      if (epoch !== authRequestEpoch.current) return;
      if (err.message === 'POPUP_CLOSED') {
        return;
      }
      if (err.message === 'MISSING_FACEBOOK_APP_ID' || err.message === 'FACEBOOK_SDK_UNAVAILABLE') {
        setFallbackProvider('facebook');
      } else {
        fail(err.message || 'Đăng nhập Facebook thất bại');
      }
    } finally {
      endRequest(epoch);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setInvalidField(null);

    const email = loginEmail.trim().toLowerCase();
    const password = loginPassword.trim();

    if (!email || !password) {
      fail('Thiếu email hoặc mật khẩu rồi nè!', !email ? 'email' : 'password');
      return;
    }

    const epoch = beginRequest();
    if (epoch === null) return;
    try {
      if (onLoginWithPassword) {
        await onLoginWithPassword(email, password);
      } else {
        const isSuperAdmin = isMasterAdmin(email);
        if (!isSuperAdmin) {
          throw new Error('Tài khoản không tồn tại. Vui lòng đăng ký trước!');
        }
      }
      if (epoch === authRequestEpoch.current) succeed();
    } catch (err: any) {
      if (epoch !== authRequestEpoch.current) return;
      const message = String(err?.message || 'Tài khoản không tồn tại. Vui lòng đăng ký trước!');
      fail(message, /Mật khẩu/i.test(message) ? 'password' : 'email');
    } finally {
      endRequest(epoch);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setInvalidField(null);

    const name = registerName.trim();
    const email = registerEmail.trim().toLowerCase();
    const password = registerPassword.trim();
    const confirm = registerConfirmPassword.trim();

    if (!name) {
      fail('Cho tớ biết tên cậu đã nha!', 'name');
      return;
    }
    if (!email || !email.includes('@')) {
      fail('Email này trông chưa đúng lắm…', 'email');
      return;
    }
    if (password.length < 6) {
      fail('Mật khẩu cần ít nhất 6 ký tự cho an toàn nha.', 'password');
      return;
    }
    if (password !== confirm) {
      fail('Hai mật khẩu chưa khớp — soi đèn pin kiểm tra thử?', 'confirm');
      return;
    }

    const epoch = beginRequest();
    if (epoch === null) return;
    try {
      if (onRegister) {
        await onRegister(name, email, password);
      } else if (onLogin) {
        onLogin('google', { name, email });
      }
      if (epoch === authRequestEpoch.current) succeed();
    } catch (err: any) {
      if (epoch !== authRequestEpoch.current) return;
      fail(err.message || 'Đăng ký chưa thành công. Thử lại giúp tớ nha!', 'email');
    } finally {
      endRequest(epoch);
    }
  };

  const handleFallbackCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fallbackProvider) return;

    const email = fallbackCustomEmail.trim().toLowerCase();
    const name = fallbackCustomName.trim();

    if (!email || !email.includes('@')) {
      fail('Email này trông chưa đúng lắm…', 'email');
      return;
    }

    await handleExecuteSocialLogin(fallbackProvider, {
      name: name || (fallbackProvider === 'google' ? 'Google Student' : 'Facebook Student'),
      email,
    });
  };

  const switchTab = (tab: 'login' | 'register') => {
    setActiveTab(tab);
    setErrorMsg(null);
    setInvalidField(null);
    setMascotFlash(null);
  };

  /* ---------- Cú Bông: biểu cảm + lời thoại theo hành vi ---------- */
  const typingValue = focusField === 'email'
    ? (activeTab === 'login' ? loginEmail : registerEmail)
    : focusField === 'name' ? registerName : '';
  const lookX = introOpen ? 0 : focusField === 'email' || focusField === 'name'
    ? Math.min(1, typingValue.length / 26) * 2 - 1
    : 0;
  const mood: CuBongMood = mascotFlash
    ?? (torchMode === 'beam' ? 'peek'
      : torchMode === 'reveal' || focusField === 'password' ? 'shy'
        : focusField ? 'attentive' : 'idle');
  const bubble = mascotFlash === 'sad' ? 'Hic, chưa đúng rồi… Thử lại nha, tớ tin cậu!'
      : torchMode === 'beam' ? 'Ơ kìa… soi đèn pin à? Tớ thấy hết rồi nha 👀'
        : torchMode === 'reveal' ? 'Hiện hết luôn hả? Tớ nhắm mắt đây! 🙈'
          : focusField === 'password' ? 'Tớ không nhìn đâu… thật mà! 🙈'
            : focusField === 'email' ? (typingValue.includes('@') ? 'Ghi nhớ rồi nè ✍️' : 'Email của cậu là gì nhỉ?')
              : focusField === 'name' ? 'Tên cậu đẹp ghê! Để tớ ghi lại ✍️'
                : activeTab === 'register' ? 'Làm quen nhé! Tớ là Cú Bông 🦉' : 'Tớ là Cú Bông! Vào học tiếp thôi?';

  const lightsOut = torchMode === 'beam';

  return (
    <div
      ref={overlayRef}
      className={`auth-overlay ${introOpen ? 'auth-overlay--welcome' : 'auth-overlay--entered'}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby={introOpen ? undefined : 'auth-title'}
      aria-label={introOpen ? `Cú Bông chào mừng, chọn ${activeTab === 'login' ? 'đăng nhập' : 'đăng ký'}` : undefined}
      onKeyDown={handleDialogKeys}
      onMouseDown={(event) => { if (event.target === event.currentTarget && !isSubmitting) handleClose(); }}
    >
      {!introOpen && <GalaxySky active={lightsOut} />}
      {introOpen && <>
        <button type="button" className="auth-welcome-close" onClick={handleClose} aria-label="Đóng cửa sổ đăng nhập"><X size={17} /></button>
        <button type="button" className="auth-welcome-skip" onClick={() => openForm(true)}>Bỏ qua intro <span aria-hidden="true">↗</span></button>
      </>}
      <div ref={cardRef} className={`auth-card ${introOpen ? 'auth-card--welcome' : fromWelcome ? 'auth-card--morphed' : introFinished ? 'auth-card--settled' : 'auth-card--entered'} ${lightsOut ? 'is-lights-out' : ''}`}>
        {/* Sân khấu linh vật — bầu trời theo giờ trong ngày */}
        <aside ref={stageRef} className={`auth-stage auth-stage--${phase}`} aria-hidden={introOpen ? undefined : true}
          onAnimationEnd={(event) => {
            if (event.target === event.currentTarget && /^(owlFLIPArc|owlFLIPArcMobile|owlLiteMove)$/.test(event.animationName)) {
              setFromWelcome(false);
              setIntroFinished(true);
            }
          }}
          onPointerMove={introOpen ? handleWelcomePointerMove : undefined}>
          {!introOpen && <div className="auth-sky">
            {(phase === 'morning' || phase === 'day' || phase === 'dusk') && <span className="auth-sun" />}
            {(phase === 'morning' || phase === 'day') && (
              <><span className="auth-cloud auth-cloud--1" /><span className="auth-cloud auth-cloud--2" /><span className="auth-cloud auth-cloud--3" /></>
            )}
            <div className={`auth-night-sky ${phase === 'night' || lightsOut ? 'is-visible' : ''}`}>
              <span className="auth-moon"><i /><i /><i /></span>
              {STARS.map((star, index) => <span key={index} className={`auth-star auth-star--${index % 5}`}
                style={{ left: star.left, top: star.top, animationDelay: star.delay }} />)}
            </div>
            {phase === 'night' && FIREFLIES.map((fly, index) => (
              <span key={index} className="auth-firefly" style={{ left: fly.left, bottom: fly.bottom, animationDelay: fly.delay }} />
            ))}
          </div>}
          {!introOpen && <p key={bubble} className="auth-bubble">{bubble}</p>}
          {introOpen ? <button ref={welcomeOwlRef} type="button" className="auth-welcome-owl" onClick={() => openForm()}
            onAnimationEnd={(event) => {
              if (event.target === event.currentTarget && /^(owlWelcomeLand|owlWelcomeLite)$/.test(event.animationName)) {
                event.currentTarget.classList.add('is-landed'); // release will-change without a React render
              }
            }}
            aria-label={`Chạm Cú Bông để ${activeTab === 'login' ? 'đăng nhập' : 'đăng ký'}`}>
            <CuBong mood={mood} lookX={lookX} size={150} className="auth-mascot" decorative />
          </button> : <CuBong mood={mood} lookX={lookX} size={150} className="auth-mascot" decorative />}
          {introOpen && <button ref={boardRef} type="button" className="auth-welcome-board" onClick={() => openForm()}
            aria-label={`Cú Bông mời ${activeTab === 'login' ? 'đăng nhập' : 'đăng ký'}. Mở biểu mẫu`}>
            <span className="auth-welcome-board__eyebrow">LỜI MỜI TỪ CÚ BÔNG</span>
            <strong>{activeTab === 'login' ? 'ĐĂNG NHẬP' : 'ĐĂNG KÝ'}</strong>
            <span className="auth-welcome-board__action">Chạm để bước vào <span aria-hidden="true">↗</span></span>
          </button>}
          {introOpen && <button type="button" className="auth-welcome-switch"
            onClick={() => { setActiveTab(activeTab === 'login' ? 'register' : 'login'); setErrorMsg(null); setInvalidField(null); }}>
            {activeTab === 'login' ? 'Chưa có tài khoản? Đăng ký' : 'Đã có tài khoản? Đăng nhập'}
          </button>}
          {!introOpen && <span className="auth-ground" />}
        </aside>

        <section ref={panelRef} className="auth-panel" inert={introOpen} aria-hidden={introOpen}>
          <header className="auth-head">
            <div>
              <h2 id="auth-title">
                {fallbackProvider
                  ? `Liên kết ${fallbackProvider === 'google' ? 'Google' : 'Facebook'}`
                  : activeTab === 'login' ? 'Mừng cậu quay lại!' : 'Làm quen nhé!'}
              </h2>
              <p>
                {fallbackProvider
                  ? 'Môi trường này chưa bật đăng nhập mạng xã hội — điền nhanh để liên kết.'
                  : activeTab === 'login' ? 'Kho kiến thức vẫn đang chờ cậu.' : 'Một tài khoản — mở khoá cả diễn đàn.'}
              </p>
            </div>
            <div className="auth-head__actions">
              {!fallbackProvider && <button type="button" onClick={replayWelcome} className="auth-replay"
                aria-label="Xem lại lời chào của Cú Bông" title="Xem lại lời chào" disabled={isSubmitting}>
                <RotateCcw size={14} aria-hidden="true" /><span>Lời chào</span>
              </button>}
              <button type="button" onClick={handleClose} className="auth-close" aria-label="Đóng">
                <X className="w-4 h-4" />
              </button>
            </div>
          </header>

          {fallbackProvider ? (
            <>
              {errorMsg && (
                <div className="auth-alert" role="alert"><AlertCircle className="w-4 h-4 shrink-0" /><span>{errorMsg}</span></div>
              )}
              <form onSubmit={handleFallbackCustomSubmit} className="auth-form" key="fallback">
                <div className="auth-field">
                  <label htmlFor="ho-va-ten-hien-thi" className="auth-label">Tên hiển thị</label>
                  <input id="ho-va-ten-hien-thi"
                    type="text"
                    ref={firstInputRef}
                    required
                    maxLength={60}
                    value={fallbackCustomName}
                    onChange={e => setFallbackCustomName(e.target.value)}
                    onFocus={() => setFocusField('name')}
                    onBlur={() => setFocusField(null)}
                    placeholder="Ví dụ: Nguyễn Văn Nam"
                    className="auth-input"
                  />
                </div>
                <div className="auth-field">
                  <label htmlFor="dia-chi-email-fallbackprovider-g" className="auth-label">
                    Email {fallbackProvider === 'google' ? 'Google' : 'Facebook'}
                  </label>
                  <input id="dia-chi-email-fallbackprovider-g"
                    type="email"
                    required
                    maxLength={120}
                    value={fallbackCustomEmail}
                    onChange={e => setFallbackCustomEmail(e.target.value)}
                    onFocus={() => setFocusField('email')}
                    onBlur={() => setFocusField(null)}
                    placeholder={fallbackProvider === 'google' ? 'name@gmail.com' : 'name@facebook.com'}
                    aria-invalid={invalidField === 'email' || undefined}
                    className="auth-input"
                  />
                </div>
                <div className="auth-row">
                  <button type="button" onClick={() => setFallbackProvider(null)} className="auth-ghost">Quay lại</button>
                  <button type="submit" disabled={isSubmitting} className="auth-submit">
                    <CheckCircle className="w-4 h-4" />
                    <span>{isSubmitting ? 'Đang xác thực…' : 'Liên kết & vào lớp'}</span>
                  </button>
                </div>
              </form>
            </>
          ) : (
            <>
              <div className="auth-tabs" role="tablist" aria-label="Chọn đăng nhập hoặc đăng ký" data-tab={activeTab}
                onKeyDown={(event) => {
                  if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;
                  event.preventDefault();
                  const next = event.key === 'Home' ? 'login' : event.key === 'End' ? 'register'
                    : activeTab === 'login' ? 'register' : 'login';
                  switchTab(next);
                  event.currentTarget.querySelector<HTMLButtonElement>(`#auth-tab-${next}`)?.focus();
                }}>
                <span className="auth-tabs__indicator" aria-hidden="true" />
                <button id="auth-tab-login" type="button" role="tab" aria-controls="auth-panel-login" aria-selected={activeTab === 'login'} onClick={() => switchTab('login')}>
                  <LogIn className="w-3.5 h-3.5" /> Đăng nhập
                </button>
                <button id="auth-tab-register" type="button" role="tab" aria-controls="auth-panel-register" aria-selected={activeTab === 'register'} onClick={() => switchTab('register')}>
                  <UserPlus className="w-3.5 h-3.5" /> Đăng ký
                </button>
              </div>

              {errorMsg && (
                <div className="auth-alert" role="alert"><AlertCircle className="w-4 h-4 shrink-0" /><span>{errorMsg}</span></div>
              )}

              {activeTab === 'login' && (
                <form id="auth-panel-login" role="tabpanel" aria-labelledby="auth-tab-login" onSubmit={handleLoginSubmit} className="auth-form" key="login" noValidate>
                  <div className="auth-field">
                    <label htmlFor="field" className="auth-label">Email</label>
                    <input id="field"
                      type="email"
                      required
                      ref={firstInputRef}
                      maxLength={120}
                      autoComplete="email"
                      value={loginEmail}
                      onChange={e => setLoginEmail(e.target.value)}
                      onFocus={() => setFocusField('email')}
                      onBlur={() => setFocusField(null)}
                      placeholder="ten.cua.cau@gmail.com"
                      aria-invalid={invalidField === 'email' || undefined}
                      className="auth-input"
                    />
                  </div>
                  <FlashlightPasswordField
                    id="field-2"
                    label="Mật khẩu"
                    value={loginPassword}
                    onChange={setLoginPassword}
                    placeholder="Chỉ cậu biết thôi nha"
                    autoComplete="current-password"
                    required
                    invalid={invalidField === 'password'}
                    onFocusChange={(focused) => setFocusField(focused ? 'password' : null)}
                    onModeChange={handleTorchChange}
                  />
                  <button type="submit" disabled={isSubmitting} className="auth-submit"
                    aria-label={isSubmitting ? 'Đang xác thực' : 'Đăng nhập'}
                    onMouseEnter={() => setHoveredSubmit('login')} onMouseLeave={() => setHoveredSubmit(null)}
                    onFocus={() => setHoveredSubmit('login')} onBlur={() => setHoveredSubmit(null)}>
                    {isSubmitting
                      ? <><span className="auth-dots" aria-hidden="true"><i /><i /><i /></span> Cú Bông đang kiểm tra…</>
                      : <><LogIn className="w-4 h-4" /><AuthTypewriter base="Đăng nhập" expanded="Đăng nhập thôi!" active={hoveredSubmit === 'login'} /></>}
                  </button>
                </form>
              )}

              {activeTab === 'register' && (
                <form id="auth-panel-register" role="tabpanel" aria-labelledby="auth-tab-register" onSubmit={handleRegisterSubmit} className="auth-form" key="register" noValidate>
                  <div className="auth-field">
                    <label htmlFor="field-3" className="auth-label">Tên hiển thị</label>
                    <input id="field-3"
                      type="text"
                      required
                      ref={firstInputRef}
                      maxLength={60}
                      autoComplete="nickname"
                      value={registerName}
                      onChange={e => setRegisterName(e.target.value)}
                      onFocus={() => setFocusField('name')}
                      onBlur={() => setFocusField(null)}
                      placeholder="Ví dụ: Nguyễn Văn A"
                      aria-invalid={invalidField === 'name' || undefined}
                      className="auth-input"
                    />
                  </div>
                  <div className="auth-field">
                    <label htmlFor="field-4" className="auth-label">Email</label>
                    <input id="field-4"
                      type="email"
                      required
                      maxLength={120}
                      autoComplete="email"
                      value={registerEmail}
                      onChange={e => setRegisterEmail(e.target.value)}
                      onFocus={() => setFocusField('email')}
                      onBlur={() => setFocusField(null)}
                      placeholder="ten.cua.cau@gmail.com"
                      aria-invalid={invalidField === 'email' || undefined}
                      className="auth-input"
                    />
                  </div>
                  <div className="auth-row">
                    <FlashlightPasswordField
                      id="field-5"
                      label="Mật khẩu"
                      showTorch={false}
                      value={registerPassword}
                      onChange={setRegisterPassword}
                      placeholder="Ít nhất 6 ký tự"
                      autoComplete="new-password"
                      required
                      invalid={invalidField === 'password'}
                      onFocusChange={(focused) => setFocusField(focused ? 'password' : null)}
                      onModeChange={handleTorchChange}
                    />
                    <FlashlightPasswordField
                      id="field-6"
                      label="Nhập lại"
                      value={registerConfirmPassword}
                      onChange={setRegisterConfirmPassword}
                      placeholder="Gõ lại cho chắc"
                      autoComplete="new-password"
                      required
                      invalid={invalidField === 'confirm'}
                      onFocusChange={(focused) => setFocusField(focused ? 'password' : null)}
                      onModeChange={handleTorchChange}
                    />
                  </div>
                  {(registerPassword || registerConfirmPassword) && <div className="auth-password-guide"
                    aria-live="polite" aria-label="Hướng dẫn mật khẩu">
                    <div className="auth-password-guide__top">
                      <span>{registerPassword.trim().length < 6 ? `Còn ${Math.max(0, 6 - registerPassword.trim().length)} ký tự` :
                        ['Cần 6 ký tự', 'Bắt đầu tốt', 'Khá ổn', 'Rất tốt'][passwordStrength(registerPassword)]}</span>
                      {registerConfirmPassword && <span className={registerPassword === registerConfirmPassword ? 'is-match' : 'is-mismatch'}>
                        {registerPassword === registerConfirmPassword ? 'Đã khớp ✓' : 'Chưa khớp'}
                      </span>}
                    </div>
                    <div className="auth-password-guide__track" aria-hidden="true">
                      {[1, 2, 3].map(step => <i key={step} className={step <= passwordStrength(registerPassword) ? 'is-filled' : ''} />)}
                    </div>
                  </div>}
                  <button type="submit" disabled={isSubmitting} className="auth-submit"
                    aria-label={isSubmitting ? 'Đang đăng ký' : 'Đăng ký'}
                    onMouseEnter={() => setHoveredSubmit('register')} onMouseLeave={() => setHoveredSubmit(null)}
                    onFocus={() => setHoveredSubmit('register')} onBlur={() => setHoveredSubmit(null)}>
                    {isSubmitting
                      ? <><span className="auth-dots" aria-hidden="true"><i /><i /><i /></span> Đang chuẩn bị chỗ ngồi…</>
                      : <><UserPlus className="w-4 h-4" /><AuthTypewriter base="Đăng ký" expanded="Tham gia ngay!" active={hoveredSubmit === 'register'} /></>}
                  </button>
                </form>
              )}

              <div className="auth-divider">hoặc đi đường tắt</div>
              <div className="auth-social">
                <button
                  type="button"
                  onClick={handleGoogleAuth}
                  disabled={isSubmitting}
                  title="Đăng nhập với Google"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"/>
                    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24Z"/>
                    <path fill="#FBBC05" d="M5.28 14.27a7.17 7.17 0 0 1 0-4.54V6.58H1.25a11.96 11.96 0 0 0 0 10.84l4.03-3.15Z"/>
                    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98Z"/>
                  </svg>
                  <span>Google</span>
                </button>
                <button
                  type="button"
                  onClick={handleFacebookAuth}
                  disabled={isSubmitting}
                  title="Đăng nhập với Facebook"
                >
                  <svg className="w-4 h-4 fill-[#1877F2] shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  <span>Facebook</span>
                </button>
              </div>
            </>
          )}
        </section>
      </div>
      {morph && <div className="auth-board-morph" aria-hidden="true" onAnimationEnd={(event) => { if (event.target === event.currentTarget) setMorph(null); }}
        style={{ left: morph.from.left, top: morph.from.top, width: morph.from.width, height: morph.from.height,
          '--morph-x': `${morph.x}px`, '--morph-y': `${morph.y}px`,
          '--morph-sx': morph.scaleX, '--morph-sy': morph.scaleY } as CSSProperties}>
        <span>{activeTab === 'login' ? 'ĐĂNG NHẬP' : 'ĐĂNG KÝ'}</span>
      </div>}
    </div>
  );
};

export default AuthModal;
