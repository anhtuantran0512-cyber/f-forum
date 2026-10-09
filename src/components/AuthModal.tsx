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
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { X, LogIn, UserPlus, AlertCircle, CheckCircle } from 'lucide-react';
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
import { CelebrationBurst } from './CelebrationBurst';
import './auth/AuthExperience.css';

/** Hồ sơ social kèm access token — server cần token để tự kiểm chứng danh tính. */
export type SocialLoginPayload = SocialUserProfile;

export interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin?: (provider: 'google' | 'facebook', data: SocialLoginPayload) => void;
  onLoginSocial?: (provider: 'google' | 'facebook', data: SocialLoginPayload) => Promise<User>;
  onLoginWithPassword?: (email: string, password: string) => Promise<User>;
  onRegister?: (name: string, email: string, password: string) => Promise<User>;
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

const STARS = Array.from({ length: 18 }, (_, index) => ({
  left: `${(index * 53) % 100}%`,
  top: `${(index * 37) % 62}%`,
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
  initialTab = 'login',
}) => {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>(initialTab);
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
  const [mascotFlash, setMascotFlash] = useState<'sad' | 'celebrate' | null>(null);
  const [invalidField, setInvalidField] = useState<'name' | 'email' | 'password' | 'confirm' | null>(null);
  const [burstTick, setBurstTick] = useState(0);
  const [succeeded, setSucceeded] = useState(false);
  const [phase] = useState<DayPhase>(() => dayPhaseOf(new Date().getHours()));
  const flashTimer = useRef<number | null>(null);
  const closeTimer = useRef<number | null>(null);

  useEffect(() => () => {
    if (flashTimer.current) window.clearTimeout(flashTimer.current);
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
  }, []);

  const handleTorchChange = useCallback((mode: FlashlightMode) => setTorchMode(mode), []);

  if (!isOpen) return null;

  const resetFormState = () => {
    setErrorMsg(null);
    setIsSubmitting(false);
    setFallbackProvider(null);
    setFallbackCustomName('');
    setFallbackCustomEmail('');
  };

  const handleClose = () => {
    if (flashTimer.current) window.clearTimeout(flashTimer.current);
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    resetFormState();
    onClose();
  };

  const flashMascot = (next: 'sad' | 'celebrate', ms: number) => {
    if (flashTimer.current) window.clearTimeout(flashTimer.current);
    setMascotFlash(next);
    flashTimer.current = window.setTimeout(() => setMascotFlash(null), ms);
  };

  const fail = (message: string, field: typeof invalidField = null) => {
    setErrorMsg(friendlyError(message));
    setInvalidField(field);
    flashMascot('sad', 2400);
  };

  /** Thành công: Cú Bông ăn mừng + pháo hoa, rồi mới đóng (đủ thấy "khoảnh khắc"). */
  const succeed = () => {
    setSucceeded(true);
    setErrorMsg(null);
    setInvalidField(null);
    if (flashTimer.current) window.clearTimeout(flashTimer.current);
    setMascotFlash('celebrate');
    setBurstTick((tick) => tick + 1);
    closeTimer.current = window.setTimeout(() => handleClose(), 1300);
  };

  const handleExecuteSocialLogin = async (
    provider: 'google' | 'facebook',
    profile: SocialLoginPayload
  ) => {
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      if (onLoginSocial) {
        await onLoginSocial(provider, profile);
      } else if (onLogin) {
        onLogin(provider, profile);
      }
      succeed();
    } catch (err: any) {
      fail(err.message || 'Xác thực tài khoản thất bại');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleAuth = async () => {
    setErrorMsg(null);

    if (!isGoogleConfigured()) {
      setFallbackProvider('google');
      return;
    }

    setIsSubmitting(true);
    try {
      const profile = await loginWithGooglePopup();
      await handleExecuteSocialLogin('google', profile);
    } catch (err: any) {
      if (err.message === 'POPUP_CLOSED') {
        return;
      }
      if (err.message === 'MISSING_GOOGLE_CLIENT_ID' || err.message === 'GOOGLE_SDK_UNAVAILABLE') {
        setFallbackProvider('google');
      } else {
        fail(err.message || 'Đăng nhập Google thất bại');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFacebookAuth = async () => {
    setErrorMsg(null);

    if (!isFacebookConfigured()) {
      setFallbackProvider('facebook');
      return;
    }

    setIsSubmitting(true);
    try {
      const profile = await loginWithFacebookPopup();
      await handleExecuteSocialLogin('facebook', profile);
    } catch (err: any) {
      if (err.message === 'POPUP_CLOSED') {
        return;
      }
      if (err.message === 'MISSING_FACEBOOK_APP_ID' || err.message === 'FACEBOOK_SDK_UNAVAILABLE') {
        setFallbackProvider('facebook');
      } else {
        fail(err.message || 'Đăng nhập Facebook thất bại');
      }
    } finally {
      setIsSubmitting(false);
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

    setIsSubmitting(true);
    try {
      if (onLoginWithPassword) {
        await onLoginWithPassword(email, password);
      } else {
        const isSuperAdmin = isMasterAdmin(email);
        if (!isSuperAdmin) {
          throw new Error('Tài khoản không tồn tại. Vui lòng đăng ký trước!');
        }
      }
      succeed();
    } catch (err: any) {
      const message = String(err?.message || 'Tài khoản không tồn tại. Vui lòng đăng ký trước!');
      fail(message, /Mật khẩu/i.test(message) ? 'password' : 'email');
    } finally {
      setIsSubmitting(false);
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

    setIsSubmitting(true);
    try {
      if (onRegister) {
        await onRegister(name, email, password);
      } else if (onLogin) {
        onLogin('google', { name, email });
      }
      succeed();
    } catch (err: any) {
      fail(err.message || 'Đăng ký chưa thành công. Thử lại giúp tớ nha!', 'email');
    } finally {
      setIsSubmitting(false);
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
  const lookX = focusField === 'email' || focusField === 'name'
    ? Math.min(1, typingValue.length / 26) * 2 - 1
    : 0;
  const mood: CuBongMood = mascotFlash
    ?? (torchMode === 'beam' ? 'peek'
      : torchMode === 'reveal' || focusField === 'password' ? 'shy'
        : focusField ? 'attentive' : 'idle');
  const bubble = mascotFlash === 'celebrate'
    ? (activeTab === 'register' ? 'Chào thành viên mới! 🎉' : 'Chào mừng cậu quay lại! 🎉')
    : mascotFlash === 'sad' ? 'Hic, chưa đúng rồi… Thử lại nha, tớ tin cậu!'
      : torchMode === 'beam' ? 'Ơ kìa… soi đèn pin à? Tớ thấy hết rồi nha 👀'
        : torchMode === 'reveal' ? 'Hiện hết luôn hả? Tớ nhắm mắt đây! 🙈'
          : focusField === 'password' ? 'Tớ không nhìn đâu… thật mà! 🙈'
            : focusField === 'email' ? (typingValue.includes('@') ? 'Ghi nhớ rồi nè ✍️' : 'Email của cậu là gì nhỉ?')
              : focusField === 'name' ? 'Tên cậu đẹp ghê! Để tớ ghi lại ✍️'
                : activeTab === 'register' ? 'Làm quen nhé! Tớ là Cú Bông 🦉' : 'Tớ là Cú Bông! Vào học tiếp thôi?';

  const lightsOut = torchMode === 'beam';

  return (
    <div
      className="auth-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-title"
      onKeyDown={(event) => { if (event.key === 'Escape') handleClose(); }}
      onMouseDown={(event) => { if (event.target === event.currentTarget && !isSubmitting) handleClose(); }}
    >
      <div className={`auth-card ${lightsOut ? 'is-lights-out' : ''}`}>
        {/* Sân khấu linh vật — bầu trời theo giờ trong ngày */}
        <aside className={`auth-stage auth-stage--${phase}`} aria-hidden="true">
          <div className="auth-sky">
            {(phase === 'morning' || phase === 'day' || phase === 'dusk') && <span className="auth-sun" />}
            {phase === 'night' && <span className="auth-moon" />}
            {(phase === 'morning' || phase === 'day') && (
              <>
                <span className="auth-cloud auth-cloud--1" />
                <span className="auth-cloud auth-cloud--2" />
                <span className="auth-cloud auth-cloud--3" />
              </>
            )}
            {(phase === 'night' || phase === 'dusk') && STARS.slice(0, phase === 'night' ? 18 : 8).map((star, index) => (
              <span key={index} className="auth-star" style={{ left: star.left, top: star.top, animationDelay: star.delay }} />
            ))}
            {phase === 'night' && FIREFLIES.map((fly, index) => (
              <span key={index} className="auth-firefly" style={{ left: fly.left, bottom: fly.bottom, animationDelay: fly.delay }} />
            ))}
          </div>
          <p key={bubble} className="auth-bubble">{bubble}</p>
          <CuBong mood={mood} lookX={lookX} size={150} className="auth-mascot" decorative />
          <span className="auth-ground" />
        </aside>

        <section className="auth-panel">
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
            <button type="button" onClick={handleClose} className="auth-close" aria-label="Đóng">
              <X className="w-4 h-4" />
            </button>
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
                  <button type="submit" disabled={isSubmitting || succeeded} className="auth-submit">
                    <CheckCircle className="w-4 h-4" />
                    <span>{isSubmitting ? 'Đang xác thực…' : 'Liên kết & vào lớp'}</span>
                  </button>
                </div>
              </form>
            </>
          ) : (
            <>
              <div className="auth-tabs" role="tablist" aria-label="Chọn đăng nhập hoặc đăng ký" data-tab={activeTab}>
                <span className="auth-tabs__indicator" aria-hidden="true" />
                <button type="button" role="tab" aria-selected={activeTab === 'login'} onClick={() => switchTab('login')}>
                  <LogIn className="w-3.5 h-3.5" /> Đăng nhập
                </button>
                <button type="button" role="tab" aria-selected={activeTab === 'register'} onClick={() => switchTab('register')}>
                  <UserPlus className="w-3.5 h-3.5" /> Đăng ký
                </button>
              </div>

              {errorMsg && (
                <div className="auth-alert" role="alert"><AlertCircle className="w-4 h-4 shrink-0" /><span>{errorMsg}</span></div>
              )}

              {activeTab === 'login' && (
                <form onSubmit={handleLoginSubmit} className="auth-form" key="login" noValidate>
                  <div className="auth-field">
                    <label htmlFor="field" className="auth-label">Email</label>
                    <input id="field"
                      type="email"
                      required
                      autoFocus
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
                  <button type="submit" disabled={isSubmitting || succeeded} className="auth-submit">
                    {isSubmitting
                      ? <><span className="auth-dots" aria-hidden="true"><i /><i /><i /></span> Cú Bông đang kiểm tra…</>
                      : <><LogIn className="w-4 h-4" /> Vào lớp thôi!</>}
                  </button>
                </form>
              )}

              {activeTab === 'register' && (
                <form onSubmit={handleRegisterSubmit} className="auth-form" key="register" noValidate>
                  <div className="auth-field">
                    <label htmlFor="field-3" className="auth-label">Tên hiển thị</label>
                    <input id="field-3"
                      type="text"
                      required
                      autoFocus
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
                  <button type="submit" disabled={isSubmitting || succeeded} className="auth-submit">
                    {isSubmitting
                      ? <><span className="auth-dots" aria-hidden="true"><i /><i /><i /></span> Đang chuẩn bị chỗ ngồi…</>
                      : <><UserPlus className="w-4 h-4" /> Tạo tài khoản</>}
                  </button>
                </form>
              )}

              <div className="auth-divider">hoặc đi đường tắt</div>
              <div className="auth-social">
                <button
                  type="button"
                  onClick={handleGoogleAuth}
                  disabled={isSubmitting || succeeded}
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
                  disabled={isSubmitting || succeeded}
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
      <CelebrationBurst trigger={burstTick} tone="gold" count={56} />
    </div>
  );
};

export default AuthModal;
