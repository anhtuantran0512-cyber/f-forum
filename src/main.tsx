/* Bản quyền trí tuệ thuộc về BroAmStuck */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AppErrorBoundary } from './components/AppErrorBoundary'

declare global {
  interface Window {
    fbAsyncInit: () => void;
    FB: any;
    google: any;
    __fbSdkPromise?: Promise<void>;
    __googleSdkPromise?: Promise<void>;
  }
}

const resolvedPromise = Promise.resolve();

export function initFacebookSdk(): Promise<void> {
  if (typeof window === 'undefined') {
    return resolvedPromise;
  }
  if (window.FB) {
    return resolvedPromise;
  }
  if (window.__fbSdkPromise) {
    return window.__fbSdkPromise;
  }

  const promise = new Promise<void>((resolve) => {
    if (window.FB) {
      resolve();
      return;
    }
    window.fbAsyncInit = function () {
      try {
        window.FB.init({
          appId: import.meta.env.VITE_FACEBOOK_APP_ID || '',
          cookie: true,
          xfbml: true,
          version: 'v20.0',
        });
      } catch (err) {
        console.warn('[Facebook SDK] Init warning:', err);
      }
      resolve();
    };

    (function (d, s, id) {
      let js: any,
        fjs = d.getElementsByTagName(s)[0];
      if (d.getElementById(id)) return;
      js = d.createElement(s);
      js.id = id;
      js.src = 'https://connect.facebook.net/vi_VN/sdk.js';
      fjs.parentNode?.insertBefore(js, fjs);
    })(document, 'script', 'facebook-jssdk');

    setTimeout(() => resolve(), 5000);
  });

  window.__fbSdkPromise = promise;
  return promise;
}

export function initGoogleSdk(): Promise<void> {
  if (typeof window === 'undefined') {
    return resolvedPromise;
  }
  if (window.google?.accounts?.oauth2) {
    return resolvedPromise;
  }
  if (window.__googleSdkPromise) {
    return window.__googleSdkPromise;
  }

  const promise = new Promise<void>((resolve) => {
    if (window.google?.accounts?.oauth2) {
      resolve();
      return;
    }
    const existing = document.getElementById('google-jssdk') as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => resolve());
      const pollTimer = setInterval(() => {
        if (window.google?.accounts?.oauth2) {
          clearInterval(pollTimer);
          resolve();
        }
      }, 50);
      setTimeout(() => {
        clearInterval(pollTimer);
        resolve();
      }, 4000);
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-jssdk';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => resolve();
    document.head.appendChild(script);

    setTimeout(() => resolve(), 5000);
  });

  window.__googleSdkPromise = promise;
  return promise;
}

if (typeof window !== 'undefined') {
  initFacebookSdk().catch(() => {});
  initGoogleSdk().catch(() => {});

  /* EPIC 5: "Console Lock" cũ ở đây đã được thay thế. Nó chạy cả ở bản dev, bật
     hộp alert() chặn màn hình ở MỖI cú chuột phải (kể cả trong ô nhập liệu) và tắt
     luôn console.error/warn — che mất lỗi thật. Nay:
       • vite.config.ts  → loại bỏ mọi lệnh console.* / debugger khi build;
       • public/security-boot.js → tắt cầu nối React DevTools + cảnh báo Self-XSS
         (chỉ chèn vào bản build);
       • src/security/devtoolsGuard.ts → chặn F12 / Ctrl+Shift+I / chuột phải và
         cảnh báo khi mở DevTools bằng toast không chặn (chỉ production). */
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </StrictMode>,
)
