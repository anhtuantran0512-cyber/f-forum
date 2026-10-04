/* Bản quyền trí tuệ thuộc về BroAmStuck */
export interface SocialUserProfile {
  name: string;
  email: string;
  avatar?: string;
  /**
   * Access token của nhà cung cấp. Máy chủ DÙNG CÁI NÀY để tự kiểm chứng với
   * Google/Facebook — nếu không, `/api/auth/social` chỉ nhận một email do client
   * tự khai và ai cũng khai được email của quản trị viên.
   */
  accessToken?: string;
}

/**
 * Safely retrieve environment variable across Vite browser runtime and Node test runner
 */
export function getEnvVar(key: string): string {
  try {
    if (typeof import.meta !== 'undefined' && import.meta?.env?.[key]) {
      return String(import.meta.env[key]);
    }
  } catch {
    /* ignore */
  }
  try {
    const proc = (globalThis as any)?.process;
    if (proc?.env?.[key]) {
      return String(proc.env[key]);
    }
  } catch {
    /* ignore */
  }
  return '';
}

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
let localFbPromise: Promise<void> | null = null;

/**
 * Initializes Meta Facebook JavaScript SDK (v20.0)
 */
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
  if (localFbPromise) {
    return localFbPromise;
  }

  const promise = new Promise<void>((resolve) => {
    if (window.FB) {
      resolve();
      return;
    }

    const prevInit = window.fbAsyncInit;
    window.fbAsyncInit = function () {
      try {
        if (typeof prevInit === 'function') {
          prevInit();
        }
        const appId = getEnvVar('VITE_FACEBOOK_APP_ID');
        if (window.FB) {
          window.FB.init({
            appId: appId || '',
            cookie: true,
            xfbml: true,
            version: 'v20.0',
          });
        }
      } catch (err) {
        console.warn('[Facebook SDK] Init warning:', err);
      }
      resolve();
    };

    const existing = document.getElementById('facebook-jssdk') as HTMLScriptElement | null;
    if (existing) {
      const pollTimer = setInterval(() => {
        if (window.FB) {
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

    (function (d, s, id) {
      let js: any,
        fjs = d.getElementsByTagName(s)[0];
      if (d.getElementById(id)) return;
      js = d.createElement(s);
      js.id = id;
      js.src = 'https://connect.facebook.net/vi_VN/sdk.js';
      js.async = true;
      js.defer = true;
      js.onerror = () => resolve();
      fjs?.parentNode?.insertBefore(js, fjs);
    })(document, 'script', 'facebook-jssdk');

    setTimeout(() => resolve(), 5000);
  });

  localFbPromise = promise;
  window.__fbSdkPromise = promise;
  return promise;
}

let localGooglePromise: Promise<void> | null = null;

/**
 * Initializes Google Identity Services (GIS) client
 */
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
  if (localGooglePromise) {
    return localGooglePromise;
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

  localGooglePromise = promise;
  window.__googleSdkPromise = promise;
  return promise;
}

/**
 * Checks if Facebook OAuth App ID is provided in environment variables
 */
export function isFacebookConfigured(): boolean {
  const appId = getEnvVar('VITE_FACEBOOK_APP_ID').trim();
  return Boolean(
    appId &&
    appId !== '' &&
    appId !== 'YOUR_FACEBOOK_APP_ID' &&
    !appId.toUpperCase().includes('YOUR_FACEBOOK')
  );
}

/**
 * Checks if Google OAuth Client ID is provided in environment variables
 */
export function isGoogleConfigured(): boolean {
  const clientId = getEnvVar('VITE_GOOGLE_CLIENT_ID').trim();
  return Boolean(
    clientId &&
    clientId !== '' &&
    clientId !== 'YOUR_GOOGLE_CLIENT_ID' &&
    !clientId.toUpperCase().includes('YOUR_GOOGLE')
  );
}

/**
 * Native Google OAuth 2.0 Popup authentication via Google Identity Services
 */
export async function loginWithGooglePopup(): Promise<SocialUserProfile> {
  if (!isGoogleConfigured()) {
    throw new Error('MISSING_GOOGLE_CLIENT_ID');
  }

  await initGoogleSdk();

  if (!window.google?.accounts?.oauth2) {
    throw new Error('GOOGLE_SDK_UNAVAILABLE');
  }

  return new Promise((resolve, reject) => {
    try {
      const clientId = getEnvVar('VITE_GOOGLE_CLIENT_ID').trim();
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'email profile openid',
        callback: async (tokenResponse: any) => {
          if (tokenResponse?.error) {
            if (
              tokenResponse.error === 'popup_closed_by_user' ||
              tokenResponse.error === 'access_denied'
            ) {
              reject(new Error('POPUP_CLOSED'));
              return;
            }
            reject(new Error(tokenResponse.error_description || tokenResponse.error));
            return;
          }

          if (!tokenResponse?.access_token) {
            reject(new Error('NO_ACCESS_TOKEN'));
            return;
          }

          try {
            const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
            });
            if (!res.ok) {
              throw new Error('Không thể lấy thông tin tài khoản từ Google API');
            }
            const profile = await res.json();
            if (!profile?.email) {
              reject(new Error('Tài khoản Google không cung cấp địa chỉ email'));
              return;
            }
            resolve({
              name: profile.name || profile.given_name || 'Google User',
              email: String(profile.email).toLowerCase(),
              avatar: profile.picture,
              accessToken: tokenResponse.access_token,
            });
          } catch (err) {
            reject(err);
          }
        },
        error_callback: (err: any) => {
          if (err?.type === 'popup_closed' || err?.type === 'popup_closed_by_user') {
            reject(new Error('POPUP_CLOSED'));
          } else {
            reject(new Error(err?.message || 'Cửa sổ popup Google bị chặn hoặc gặp lỗi'));
          }
        },
      });

      tokenClient.requestAccessToken({ prompt: 'select_account' });
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Native Meta Facebook Login Popup authentication via Meta JavaScript SDK
 */
export async function loginWithFacebookPopup(): Promise<SocialUserProfile> {
  if (!isFacebookConfigured()) {
    throw new Error('MISSING_FACEBOOK_APP_ID');
  }

  await initFacebookSdk();

  if (!window.FB) {
    throw new Error('FACEBOOK_SDK_UNAVAILABLE');
  }

  return new Promise((resolve, reject) => {
    try {
      window.FB.login(
        (response: any) => {
          if (response?.authResponse) {
            window.FB.api(
              '/me',
              { fields: 'id,name,email,picture.width(200).height(200)' },
              (profile: any) => {
                if (profile && !profile.error) {
                  const fallbackEmail = `${profile.id || Date.now()}@facebook.user`;
                  const email = String(profile.email || fallbackEmail).toLowerCase();
                  const name = profile.name || 'Facebook User';
                  const avatar = profile.picture?.data?.url;
                  /* Gửi kèm access token để máy chủ tự kiểm chứng với Graph API. */
                  resolve({ name, email, avatar, accessToken: response.authResponse.accessToken });
                } else {
                  reject(new Error(profile?.error?.message || 'Không thể lấy dữ liệu người dùng từ Facebook'));
                }
              }
            );
          } else {
            reject(new Error('POPUP_CLOSED'));
          }
        },
        { scope: 'public_profile,email', return_scopes: true }
      );
    } catch (err) {
      reject(err);
    }
  });
}
