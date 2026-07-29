// Page-side shim: the premise of a relying-party SDK for the Self extension.
//
// The page builds its config with the standard SelfAppBuilder (from
// @selfxyz/qrcode) and calls requestVerification(selfApp). The extension's
// content script relays to the background, which opens the approval popup;
// the result comes back as a window message. Detection is a ping/pong so the
// page can fall back to rendering the QR when the extension is absent.

export interface ExtensionVerificationResult {
  success: boolean;
  userId?: string;
  verificationId?: string;
  claims?: Record<string, unknown>;
  error?: { code: string; message: string };
}

export function isSelfExtensionAvailable(timeoutMs = 500): Promise<boolean> {
  return new Promise(resolve => {
    const timer = setTimeout(() => {
      window.removeEventListener('message', onMessage);
      resolve(false);
    }, timeoutMs);

    function onMessage(event: MessageEvent): void {
      if (event.source !== window) return;
      if ((event.data as { type?: string })?.type === 'self:ext:pong') {
        clearTimeout(timer);
        window.removeEventListener('message', onMessage);
        resolve(true);
      }
    }

    window.addEventListener('message', onMessage);
    window.postMessage({ type: 'self:ext:ping' }, window.origin);
  });
}

export function requestVerification(
  selfApp: { sessionId: string } & Record<string, unknown>,
  timeoutMs = 5 * 60_000,
): Promise<ExtensionVerificationResult> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      window.removeEventListener('message', onMessage);
      reject(new Error('Self extension verification timed out'));
    }, timeoutMs);

    function onMessage(event: MessageEvent): void {
      if (event.source !== window) return;
      const data = event.data as { type?: string; sessionId?: string; result?: ExtensionVerificationResult };
      if (data?.type !== 'self:ext:result' || data.sessionId !== selfApp.sessionId) return;
      clearTimeout(timer);
      window.removeEventListener('message', onMessage);
      resolve(data.result ?? { success: false, error: { code: 'NO_RESULT', message: 'Empty result' } });
    }

    window.addEventListener('message', onMessage);
    window.postMessage({ type: 'self:ext:request', selfApp }, window.origin);
  });
}
