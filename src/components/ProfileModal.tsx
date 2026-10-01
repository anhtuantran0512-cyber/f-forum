import React, { useState } from 'react';
import { X, Upload, Check, AlertCircle, Sparkles, CreditCard, UserPen } from 'lucide-react';
import type { User } from '../types';
import { TierBadge, AdminVerifiedBadge } from './Badges10Tier';
import { getTierForLevel } from '../utils/tier';
import { HologramStudentCard } from './HologramStudentCard';
import { DEFAULT_AVATAR, handleImageError } from '../utils/mediaFallback';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onSaveProfile: (updates: Partial<User>) => void;
  initialTab?: 'card' | 'edit';
}

const ProfileModalInner: React.FC<{
  currentUser: User;
  onClose: () => void;
  onSaveProfile: (updates: Partial<User>) => void;
  initialTab?: 'card' | 'edit';
}> = ({ currentUser, onClose, onSaveProfile, initialTab = 'card' }) => {
  const [activeTab, setActiveTab] = useState<'card' | 'edit'>(initialTab);
  const [name, setName] = useState(currentUser.name);
  const [avatar, setAvatar] = useState(currentUser.avatar);
  const [bio, setBio] = useState(currentUser.bio || '');
  const [gender, setGender] = useState(currentUser.gender || 'Nam');
  const [city, setCity] = useState(currentUser.city || '');
  const [className, setClassName] = useState(currentUser.className || '');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isSuperAdmin = currentUser.email === 'anhtuantran0512@gmail.com';
  const tier = getTierForLevel(currentUser.level);

  const [isSaving, setIsSaving] = useState(false);

  // File Upload with Strict Client-Side Validation (> 5MB rejection & image type check)
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Vui lòng chỉ chọn tệp hình ảnh (PNG, JPG, WebP, GIF)!');
      e.target.value = '';
      return;
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      setErrorMsg(
        `Kích thước file (${(file.size / (1024 * 1024)).toFixed(
          2
        )}MB) vượt quá giới hạn cho phép 5MB! Vui lòng chọn ảnh nhẹ hơn.`
      );
      e.target.value = '';
      return;
    }

    setErrorMsg(null);
    const reader = new FileReader();
    reader.onload = uploadEvent => {
      if (typeof uploadEvent.target?.result === 'string') {
        setAvatar(uploadEvent.target.result);
      }
    };
    reader.onerror = () => {
      setErrorMsg('Đã xảy ra lỗi khi đọc tệp ảnh. Vui lòng thử lại!');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleBioChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    if (val.length <= 100) {
      setBio(val);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    if (!name.trim()) {
      setErrorMsg('Tên hiển thị không được để trống!');
      return;
    }

    setIsSaving(true);
    onSaveProfile({
      name: name.trim().slice(0, 50),
      avatar,
      bio: bio.trim().slice(0, 100),
      gender,
      city: city.trim().slice(0, 50),
      className: className.trim().slice(0, 50),
    });

    setTimeout(() => {
      setIsSaving(false);
      setActiveTab('card');
    }, 200);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-up"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="liquid-glass w-full max-w-xl rounded-3xl bg-[#0c1218]/95 border border-white/15 shadow-[0_25px_60px_rgba(0,0,0,0.85)] p-4 sm:p-6 relative overflow-hidden max-h-[95vh] overflow-y-auto"
      >
        
        {/* Modal Header & Navigation Tabs */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500/20 to-amber-600/20 border border-amber-400/30 flex items-center justify-center text-amber-300">
              <Sparkles className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white tracking-wide flex items-center gap-1.5">
                <span>F-PASS VIRTUAL CAMPUS ID</span>
              </h2>
              <p className="text-[10px] sm:text-[11px] text-white/50 font-mono">
                {currentUser.email}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Tab Switcher Pills */}
            <div className="flex items-center bg-black/50 p-1 rounded-full border border-white/10">
              <button
                type="button"
                onClick={() => setActiveTab('card')}
                className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'card'
                    ? 'bg-amber-500 text-black shadow-[0_0_12px_rgba(245,158,11,0.5)] font-bold'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Thẻ F-Pass 3D</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('edit')}
                className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'edit'
                    ? 'bg-amber-500 text-black shadow-[0_0_12px_rgba(245,158,11,0.5)] font-bold'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <UserPen className="w-3.5 h-3.5" />
                <span>Cài Đặt F-ID</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-white/10 text-neutral-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/50 border border-red-500/30 text-xs text-red-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* TAB 1: 3D Hologram Student Card View */}
        {activeTab === 'card' && (
          <div className="space-y-4">
            <HologramStudentCard user={currentUser} />

            {/* Quick Action Footer in Card View */}
            <div className="pt-3 border-t border-white/10 flex items-center justify-between">
              <div className="text-[11px] text-white/50 font-mono">
                Bảo chứng danh tính mã hóa toàn hệ thống F-forum.
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('edit')}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <UserPen className="w-3.5 h-3.5 text-amber-400" />
                  <span>Sửa Thông Tin F-ID</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-black transition-all shadow-[0_0_15px_rgba(245,158,11,0.4)] cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Edit Profile Form */}
        {activeTab === 'edit' && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Avatar & Rank preview row */}
            <div className="flex items-center gap-4 p-3 rounded-2xl bg-white/5 border border-white/10">
              <div className="relative group shrink-0">
                <img
                  src={avatar}
                  alt="Avatar"
                  onError={(e) => handleImageError(e, DEFAULT_AVATAR)}
                  className="w-16 h-16 rounded-full object-cover border-2 border-amber-400/60 shadow-lg"
                />
                <label
                  htmlFor="avatar-upload"
                  className="absolute inset-0 bg-black/60 rounded-full flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-[10px] text-white font-medium"
                >
                  <Upload className="w-4 h-4 mb-0.5" />
                  Thay đổi
                </label>
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  <span
                    className={
                      isSuperAdmin
                        ? 'discord-admin-name text-sm'
                        : 'text-sm font-bold text-white'
                    }
                  >
                    {name || 'Học sinh FPT'}
                  </span>
                  {isSuperAdmin && <AdminVerifiedBadge size={14} />}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <TierBadge
                    level={currentUser.level}
                    size={20}
                    showTooltip={false}
                  />
                  <span className="text-xs text-amber-300 font-mono font-semibold">
                    Tier {tier.roman} • Level {currentUser.level}
                  </span>
                </div>
                <p className="text-[10px] text-white/50 mt-1 font-mono">
                  Yêu cầu upload: file ảnh &lt; 5MB (PNG, JPG, WebP)
                </p>
              </div>
            </div>

            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                Tên hiển thị:
              </label>
              <input
                type="text"
                value={name}
                maxLength={50}
                onChange={e => setName(e.target.value)}
                className="w-full bg-neutral-900 border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-400 transition-colors"
                placeholder="Nhập họ và tên..."
              />
            </div>

            {/* Bio with live counter (Max 100 characters) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-neutral-300">
                  Tiểu sử cá nhân (Bio):
                </label>
                <span
                  className={`text-[11px] font-mono ${
                    bio.length >= 95
                      ? 'text-amber-400 font-bold'
                      : 'text-neutral-400'
                  }`}
                >
                  {bio.length}/100 ký tự
                </span>
              </div>
              <textarea
                value={bio}
                onChange={handleBioChange}
                rows={2}
                maxLength={100}
                placeholder="Chia sẻ ngắn về bản thân, sở thích hoặc châm ngôn học tập..."
                className="w-full bg-neutral-900 border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-400 transition-colors resize-none"
              />
            </div>

            {/* 3 Columns: Gender, Class, City */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Giới tính:
                </label>
                <select
                  value={gender}
                  onChange={e => setGender(e.target.value)}
                  className="w-full bg-neutral-900 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400 cursor-pointer"
                >
                  <option value="Nam">Nam</option>
                  <option value="Nữ">Nữ</option>
                  <option value="Khác">Khác / Ẩn</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Lớp / Khoá học:
                </label>
                <input
                  type="text"
                  value={className}
                  maxLength={50}
                  onChange={e => setClassName(e.target.value)}
                  placeholder="VD: K19 SE..."
                  className="w-full bg-neutral-900 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Thành phố:
                </label>
                <input
                  type="text"
                  value={city}
                  maxLength={50}
                  onChange={e => setCity(e.target.value)}
                  placeholder="VD: Hà Nội..."
                  className="w-full bg-neutral-900 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            {/* Footer Submit */}
            <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setActiveTab('card')}
                className="px-4 py-2 rounded-xl text-xs font-medium text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                Quay lại xem thẻ
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 hover:opacity-90 active:scale-95 text-neutral-950 font-bold text-xs flex items-center gap-1.5 shadow-[0_2px_12px_rgba(245,158,11,0.4)] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{isSaving ? 'Đang lưu...' : 'Lưu thay đổi F-ID'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSaveProfile,
  initialTab = 'card',
}) => {
  if (!isOpen) return null;
  return (
    <ProfileModalInner
      key={`${currentUser.id}-${initialTab}`}
      currentUser={currentUser}
      onClose={onClose}
      onSaveProfile={onSaveProfile}
      initialTab={initialTab}
    />
  );
};

export default ProfileModal;
