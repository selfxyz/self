export function useNetInfo() {
  // when implementing this for real be ware that Network information API
  // is not available on webview on ios https://developer.mozilla.org/en-US/docs/Web/API/Network_Information_API
  return { isConnected: true, isInternetReachable: true };
}
