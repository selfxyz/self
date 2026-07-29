// Content script (isolated world, every http/https page). Relays verification
// requests from the page to the background and results back. The page-facing
// contract is implemented by the shim in sdk/shim.ts:
//   page -> ext:  {type:'self:ext:ping'} | {type:'self:ext:request', selfApp}
//   ext -> page:  {type:'self:ext:pong'} | {type:'self:ext:result', sessionId, result}
// Only same-window messages are accepted; the relayed request carries the
// page origin so the background can attribute sessions.

interface PageRequestMessage {
  type: 'self:ext:request';
  selfApp: Record<string, unknown>;
}

function isPlausibleSelfApp(candidate: unknown): candidate is Record<string, unknown> {
  if (!candidate || typeof candidate !== 'object') return false;
  const selfApp = candidate as Record<string, unknown>;
  return (
    typeof selfApp.sessionId === 'string' &&
    selfApp.sessionId.length >= 16 &&
    typeof selfApp.scope === 'string' &&
    typeof selfApp.userId === 'string'
  );
}

window.addEventListener('message', event => {
  if (event.source !== window) return;
  const data = event.data as { type?: string } | null;
  if (!data || typeof data !== 'object') return;

  if (data.type === 'self:ext:ping') {
    window.postMessage({ type: 'self:ext:pong' }, window.origin);
    return;
  }

  if (data.type === 'self:ext:request') {
    const { selfApp } = data as PageRequestMessage;
    if (!isPlausibleSelfApp(selfApp)) {
      window.postMessage(
        {
          type: 'self:ext:result',
          sessionId: (selfApp as { sessionId?: string })?.sessionId ?? null,
          result: { success: false, error: { code: 'INVALID_REQUEST', message: 'Malformed SelfApp' } },
        },
        window.origin,
      );
      return;
    }

    void chrome.runtime
      .sendMessage({ type: 'self-ext:verify', selfApp, pageOrigin: window.origin })
      .then(response => {
        if (response && response.accepted !== true) {
          window.postMessage(
            { type: 'self:ext:result', sessionId: selfApp.sessionId, result: response.result },
            window.origin,
          );
        }
      })
      .catch(() => {
        window.postMessage(
          {
            type: 'self:ext:result',
            sessionId: selfApp.sessionId,
            result: { success: false, error: { code: 'EXTENSION_UNAVAILABLE', message: 'Background unreachable' } },
          },
          window.origin,
        );
      });
  }
});

chrome.runtime.onMessage.addListener(message => {
  if (message?.type === 'self-ext:result') {
    window.postMessage(
      { type: 'self:ext:result', sessionId: message.sessionId, result: message.result },
      window.origin,
    );
  }
});
