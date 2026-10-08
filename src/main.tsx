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

  /* Cybersecurity Console Lock */
  document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    alert('BroAmStuck Studio: Hành động này đã bị khóa để bảo mật (Cybersecurity).');
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i'))) {
      e.preventDefault();
      alert('BroAmStuck Studio: Console Developer đã bị khóa để bảo mật (Cybersecurity).');
    }
  });

  /* Khóa console */
  const noop = () => {};
  console.log = noop;
  console.warn = noop;
  console.error = noop;
  console.info = noop;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </StrictMode>,
)
