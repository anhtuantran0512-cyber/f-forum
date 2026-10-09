/* Bản quyền trí tuệ thuộc về BroAmStuck */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Check, Link2, Mail, Send, Share2 } from 'lucide-react';
import './ShareRow.css';

/* Glyph tự vẽ (không dùng logo gốc): chữ "f" và chữ "X" nét đơn. */
const GlyphF = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
    <path d="M15 4h-2a3 3 0 0 0-3 3v13M7 11h7" />
  </svg>
);
const GlyphX = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
    <path d="M5 4l14 16M19 4L5 20" />
  </svg>
);

interface ShareTarget {
  id: string;
  label: string;
  href: string;
  icon: ReactNode;
}

interface ShareRowProps {
  url: string;
  title: string;
}

/**
 * Hàng nút chia sẻ (code_yeucau · social share buttons): 44×44, đổi sang màu
 * thương hiệu khi rê, tooltip thuần CSS, nút chép liên kết có phản hồi ✓ và
 * nút "Khác" dùng Web Share API khi thiết bị hỗ trợ.
 */
export function ShareRow({ url, title }: ShareRowProps) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const enc = encodeURIComponent;
  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const targets: ShareTarget[] = [
    { id: 'facebook', label: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`, icon: <GlyphF /> },
    { id: 'x', label: 'X', href: `https://twitter.com/intent/tweet?url=${enc(url)}&text=${enc(title)}`, icon: <GlyphX /> },
    { id: 'telegram', label: 'Telegram', href: `https://t.me/share/url?url=${enc(url)}&text=${enc(title)}`, icon: <Send className="w-4 h-4" /> },
    { id: 'email', label: 'Email', href: `mailto:?subject=${enc(title)}&body=${enc(`${title}\n${url}`)}`, icon: <Mail className="w-4 h-4" /> },
  ];

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const nativeShare = () => {
    navigator.share?.({ title, url }).catch(() => undefined);
  };

  return (
    <div className="ff-share" role="group" aria-label="Chia sẻ câu hỏi">
      {targets.map((t) => (
        <a
          key={t.id}
          className={`ff-share__btn ff-share__btn--${t.id}`}
          href={t.href}
          target={t.id === 'email' ? undefined : '_blank'}
          rel="noopener noreferrer"
          data-tip={t.label}
          aria-label={`Chia sẻ qua ${t.label}`}
        >
          {t.icon}
        </a>
      ))}
      <button
        type="button"
        className={`ff-share__btn ff-share__btn--copy${copied ? ' is-copied' : ''}`}
        onClick={() => void copyLink()}
        data-tip={copied ? 'Đã chép!' : 'Chép liên kết'}
        aria-label={copied ? 'Đã chép liên kết' : 'Chép liên kết câu hỏi'}
      >
        {copied ? <Check className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
      </button>
      {canNativeShare && (
        <button type="button" className="ff-share__btn ff-share__btn--native" onClick={nativeShare} data-tip="Khác…" aria-label="Chia sẻ bằng ứng dụng khác">
          <Share2 className="w-4 h-4" />
        </button>
      )}
      <span className="sr-only" aria-live="polite">{copied ? 'Đã chép liên kết vào bộ nhớ tạm' : ''}</span>
    </div>
  );
}

export default ShareRow;
