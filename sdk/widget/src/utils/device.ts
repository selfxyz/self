const IOS_APP_STORE = 'https://apps.apple.com/app/self-zk-proofs-for-everyone/id6478563710';
const ANDROID_PLAY_STORE = 'https://play.google.com/store/apps/details?id=xyz.self.app';

export function isMobile(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent);
}

export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export function isInAppBrowser(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return (
    /FBAN|FBAV/i.test(ua) || // Facebook
    /Instagram/i.test(ua) || // Instagram
    /Twitter/i.test(ua) || // Twitter/X
    /TikTok/i.test(ua) || // TikTok
    /Line\//i.test(ua) || // Line
    /Snapchat/i.test(ua) || // Snapchat
    /wv\)/i.test(ua) // Generic Android WebView
  );
}

export function getAppStoreUrl(): string {
  return isIOS() ? IOS_APP_STORE : ANDROID_PLAY_STORE;
}

export function getAppStoreUrls(): { ios: string; android: string } {
  return { ios: IOS_APP_STORE, android: ANDROID_PLAY_STORE };
}

export function getDefaultBrowserName(): string {
  if (isIOS()) return 'Safari';
  return 'Chrome';
}
