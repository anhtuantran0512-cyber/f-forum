/* Bản quyền trí tuệ thuộc về BroAmStuck */
import React, { useState } from 'react';
import { X, Mail, User as UserIcon, LogIn, UserPlus, Lock, AlertCircle } from 'lucide-react';
import type { User } from '../types';
import {
  isGoogleConfigured,
  isFacebookConfigured,
  loginWithGooglePopup,
  loginWithFacebookPopup,
} from '../utils/oauth';

export interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSocial?: (provider: 'google' | 'facebook', data: { accessToken: string; name: string; email: string; avatar?: string }) => Promise<User>;
  onLoginWithPassword?: (email: string, password: string) => Promise<User>;
  onRegister?: (name: string, email: string, password: string) => Promise<void>;
  /** Tab shown when the dialog opens (marketing CTAs open the register tab). */
  initialTab?: 'login' | 'register';
}

export type LoginModalProps = AuthModalProps;

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
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

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const resetFormState = () => {
    setErrorMsg(null);
    setStatusMsg(null);
    setIsSubmitting(false);
  };

  const handleClose = () => {
    resetFormState();
    onClose();
  };

  const handleExecuteSocialLogin = async (
    provider: 'google' | 'facebook',
    profile: { accessToken: string; name: string; email: string; avatar?: string }
  ) => {
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      if (!onLoginSocial) throw new Error('Đăng nhập hiện không khả dụng. Vui lòng thử lại sau.');
      await onLoginSocial(provider, profile);
      handleClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Xác thực tài khoản thất bại');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleAuth = async () => {
    setErrorMsg(null);

    if (!isGoogleConfigured()) {
      setErrorMsg('Đăng nhập Google chưa được cấu hình an toàn trên máy chủ.');
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
      setErrorMsg(err.message || 'Đăng nhập Google thất bại. Vui lòng thử lại sau.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFacebookAuth = async () => {
    setErrorMsg(null);

    if (!isFacebookConfigured()) {
      setErrorMsg('Đăng nhập Facebook chưa được cấu hình an toàn trên máy chủ.');
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
      setErrorMsg(err.message || 'Đăng nhập Facebook thất bại. Vui lòng thử lại sau.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setStatusMsg(null);

    const email = loginEmail.trim().toLowerCase();
    const password = loginPassword;

    if (!email || !password) {
      setErrorMsg('Vui lòng nhập đầy đủ Email và Mật khẩu!');
      return;
    }

    setIsSubmitting(true);
    try {
      if (!onLoginWithPassword) throw new Error('Đăng nhập hiện không khả dụng. Vui lòng thử lại sau.');
      await onLoginWithPassword(email, password);
      handleClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Tài khoản không tồn tại. Vui lòng đăng ký trước!');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const name = registerName.trim();
    const email = registerEmail.trim().toLowerCase();
    const password = registerPassword;
    const confirm = registerConfirmPassword;

    if (!name) {
      setErrorMsg('Vui lòng nhập họ và tên của bạn!');
      return;
    }
    if (!email || !email.includes('@')) {
      setErrorMsg('Vui lòng nhập địa chỉ email hợp lệ!');
      return;
    }
    if (password.length < 12 || password.length > 128) {
      setErrorMsg('Mật khẩu phải có từ 12 đến 128 ký tự!');
      return;
    }
    if (password !== confirm) {
      setErrorMsg('Mật khẩu xác nhận không khớp! Vui lòng kiểm tra lại.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (!onRegister) throw new Error('Đăng ký hiện không khả dụng. Vui lòng thử lại sau.');
      await onRegister(name, email, password);
      setLoginEmail(email);
      setLoginPassword('');
      setRegisterPassword('');
      setRegisterConfirmPassword('');
      setActiveTab('login');
      setStatusMsg('Nếu đăng ký thành công, bạn có thể đăng nhập. Nếu email đã có tài khoản, hãy dùng mật khẩu hiện có.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Đăng ký không thành công. Vui lòng thử lại!');
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md">
      <div className="w-full max-w-md rounded-3xl bg-[#0c1218]/95 border border-white/15 p-6 shadow-[0_25px_60px_rgba(0,0,0,0.85)] relative overflow-hidden backdrop-blur-2xl animate-modal-pop">
        {/* Glow ambient background aura */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px] pointer-events-none" />

        {/* Modal Header */}
        <div className="relative z-10 flex items-center justify-between pb-4 border-b border-white/10 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500/20 to-amber-600/20 border border-amber-400/30 flex items-center justify-center text-amber-300">
              <LogIn className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide">
                TÀI KHOẢN F-FORUM
              </h2>
              <p className="text-[11px] text-white/60">
                Không gian kết nối và trao đổi bài học F-Forum
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors cursor-pointer"
            title="Đóng cửa sổ"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

            {/* Primary Mode Tabs: [Đăng nhập] vs [Đăng ký] */}
            <div className="relative z-10 grid grid-cols-2 gap-1.5 p-1 bg-black/40 rounded-2xl border border-white/10 mb-4">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('login');
                  setErrorMsg(null);
                  setStatusMsg(null);
                }}
                className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'login'
                    ? 'bg-white text-neutral-900 shadow-md font-bold'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Đăng nhập</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('register');
                  setErrorMsg(null);
                  setStatusMsg(null);
                }}
                className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'register'
                    ? 'bg-white text-neutral-900 shadow-md font-bold'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Đăng ký</span>
              </button>
            </div>

            {/* Error Message Alert */}
            {errorMsg && (
              <div className="relative z-10 mb-3.5 p-2.5 rounded-xl bg-red-500/15 border border-red-500/30 text-xs text-red-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{errorMsg}</span>
              </div>
            )}
            {statusMsg && (
              <div role="status" className="relative z-10 mb-3.5 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-400/20 text-xs text-emerald-200">
                {statusMsg}
              </div>
            )}

            {/* Tab: ĐĂNG NHẬP */}
            {activeTab === 'login' && (
              <form onSubmit={handleLoginSubmit} className="relative z-10 space-y-3.5">
                <div>
                  <label className="block text-xs font-medium text-white/70 mb-1 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-amber-400" />
                    <span>Địa chỉ Email</span>
                  </label>
                  <input
                    type="email"
                    required
                    maxLength={120}
                    value={loginEmail}
                    onChange={e => setLoginEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full bg-neutral-900/90 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-amber-400 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-white/70 mb-1 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                    <span>Mật khẩu</span>
                  </label>
                  <input
                    type="password"
                    required
                    maxLength={128}
                    value={loginPassword}
                    onChange={e => setLoginPassword(e.target.value)}
                    placeholder="Nhập mật khẩu..."
                    className="w-full bg-neutral-900/90 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-amber-400 transition-colors"
                  />
                </div>

                <div className="pt-1">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-neutral-950 font-bold text-xs flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(245,158,11,0.35)] transition-all cursor-pointer active:scale-98 disabled:opacity-50"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>{isSubmitting ? 'Đang kiểm tra...' : 'Đăng nhập vào diễn đàn'}</span>
                  </button>
                </div>
              </form>
            )}

            {/* Tab: ĐĂNG KÝ */}
            {activeTab === 'register' && (
              <form onSubmit={handleRegisterSubmit} className="relative z-10 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-white/70 mb-1 flex items-center gap-1.5">
                    <UserIcon className="w-3.5 h-3.5 text-amber-400" />
                    <span>Họ và tên hiển thị</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={60}
                    value={registerName}
                    onChange={e => setRegisterName(e.target.value)}
                    placeholder="Ví dụ: Nguyễn Văn A"
                    className="w-full bg-neutral-900/90 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-amber-400 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-white/70 mb-1 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-amber-400" />
                    <span>Địa chỉ Email</span>
                  </label>
                  <input
                    type="email"
                    required
                    maxLength={120}
                    value={registerEmail}
                    onChange={e => setRegisterEmail(e.target.value)}
                    placeholder="youremail@example.com"
                    className="w-full bg-neutral-900/90 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-amber-400 transition-colors"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-white/70 mb-1 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-amber-400" />
                      <span>Mật khẩu</span>
                    </label>
                    <input
                      type="password"
                      required
                      maxLength={128}
                      minLength={12}
                      value={registerPassword}
                      onChange={e => setRegisterPassword(e.target.value)}
                      placeholder="Ít nhất 12 ký tự"
                      className="w-full bg-neutral-900/90 border border-white/15 rounded-xl px-3 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-amber-400 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-white/70 mb-1 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-amber-400" />
                      <span>Xác nhận</span>
                    </label>
                    <input
                      type="password"
                      required
                      maxLength={128}
                      minLength={12}
                      value={registerConfirmPassword}
                      onChange={e => setRegisterConfirmPassword(e.target.value)}
                      placeholder="Nhập lại mật khẩu"
                      className="w-full bg-neutral-900/90 border border-white/15 rounded-xl px-3 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-amber-400 transition-colors"
                    />
                  </div>
                </div>

                <div className="pt-1">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-neutral-950 font-bold text-xs flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(245,158,11,0.35)] transition-all cursor-pointer active:scale-98 disabled:opacity-50"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>{isSubmitting ? 'Đang tạo tài khoản...' : 'Tạo tài khoản mới'}</span>
                  </button>
                </div>
              </form>
            )}

            {/* ==================================================================== */}
            {/* DUAL REAL OAUTH OPTIONS: Google OAuth 2.0 & Meta Facebook Login SDK */}
            {/* ==================================================================== */}
            <div className="relative z-10 pt-3">
              <div className="flex items-center gap-2 my-2.5">
                <div className="h-[1px] flex-1 bg-white/10" />
                <span className="text-[10px] uppercase font-mono text-white/40 tracking-wider">
                  HOẶC TIẾP TỤC VỚI
                </span>
                <div className="h-[1px] flex-1 bg-white/10" />
              </div>

              <div className="grid grid-cols-2 gap-2">
                {/* 1. Google OAuth 2.0 Native Popup */}
                <button
                  type="button"
                  onClick={handleGoogleAuth}
                  disabled={isSubmitting}
                  className="py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/25 text-xs font-semibold text-white/90 flex items-center justify-center gap-2 transition-all cursor-pointer hover:scale-102 active:scale-98 disabled:opacity-50"
                  title="Đăng nhập nhanh với Google OAuth 2.0 (Cửa sổ Popup)"
                >
                  <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"/>
                    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24Z"/>
                    <path fill="#FBBC05" d="M5.28 14.27a7.17 7.17 0 0 1 0-4.54V6.58H1.25a11.96 11.96 0 0 0 0 10.84l4.03-3.15Z"/>
                    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98Z"/>
                  </svg>
                  <span>Google</span>
                </button>

                {/* 2. Facebook Login SDK Native Popup */}
                <button
                  type="button"
                  onClick={handleFacebookAuth}
                  disabled={isSubmitting}
                  className="py-2.5 px-3 rounded-xl bg-[#1877F2]/20 hover:bg-[#1877F2]/30 border border-[#1877F2]/40 text-xs font-semibold text-blue-200 flex items-center justify-center gap-2 transition-all cursor-pointer hover:scale-102 active:scale-98 disabled:opacity-50"
                  title="Đăng nhập nhanh với Facebook SDK (Cửa sổ Popup)"
                >
                  <svg className="w-3.5 h-3.5 fill-[#1877F2] shrink-0" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  <span>Facebook</span>
                </button>
              </div>
            </div>

      </div>
    </div>
  );
};

export default AuthModal;
