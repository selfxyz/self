// MV3 service worker. Owns popup windows, routes by vault state, and manages
// one pending site verification session at a time (fail-closed on overlap).

import { lock } from './vault';
import { selfAppToPopupQuery, type SelfAppLike } from './verification-url';

const POPUP_WIDTH = 430;
const POPUP_HEIGHT = 800;
const SESSION_TIMEOUT_MS = 5 * 60_000;

let homeWindowId: number | null = null;

interface PendingSession {
  sessionId: string;
  tabId: number;
  windowId: number | null;
  resolved: boolean;
  timer: ReturnType<typeof setTimeout>;
}

let pending: PendingSession | null = null;

async function vaultState(): Promise<'uninitialized' | 'locked' | 'unlocked'> {
  const local = await chrome.storage.local.get('vaultMeta');
  if (!local.vaultMeta) return 'uninitialized';
  const session = await chrome.storage.session.get('vaultSessionKey');
  return session.vaultSessionKey ? 'unlocked' : 'locked';
}

async function gatedUrl(target: string): Promise<string> {
  switch (await vaultState()) {
    case 'uninitialized':
      return chrome.runtime.getURL('link.html');
    case 'locked':
      return chrome.runtime.getURL(`unlock.html?next=${encodeURIComponent(target)}`);
    case 'unlocked':
      return chrome.runtime.getURL(target);
  }
}

async function openHomeWindow(): Promise<void> {
  if (homeWindowId !== null) {
    try {
      await chrome.windows.update(homeWindowId, { focused: true });
      return;
    } catch {
      homeWindowId = null;
    }
  }

  const created = await chrome.windows.create({
    url: await gatedUrl('index.html'),
    type: 'popup',
    width: POPUP_WIDTH,
    height: POPUP_HEIGHT,
  });
  homeWindowId = created.id ?? null;
}

function failureResult(code: string, message: string) {
  return { success: false, error: { code, message } };
}

function settleSession(result: unknown): void {
  if (!pending || pending.resolved) return;
  pending.resolved = true;
  clearTimeout(pending.timer);
  void chrome.tabs
    .sendMessage(pending.tabId, { type: 'self-ext:result', sessionId: pending.sessionId, result })
    .catch(() => {
      // Tab closed; nothing to deliver to.
    });
}

function closeSessionWindow(): void {
  if (pending?.windowId != null) {
    void chrome.windows.remove(pending.windowId).catch(() => {});
  }
  pending = null;
}

async function startVerification(selfApp: SelfAppLike, tabId: number): Promise<{ accepted: boolean; result?: unknown }> {
  if (pending && !pending.resolved) {
    return { accepted: false, result: failureResult('BUSY', 'Another verification is in progress') };
  }
  if ((await vaultState()) === 'uninitialized') {
    return { accepted: false, result: failureResult('NO_ACCOUNT', 'No account linked in the Self extension') };
  }

  const target = `index.html?${selfAppToPopupQuery(selfApp)}`;
  const created = await chrome.windows.create({
    url: await gatedUrl(target),
    type: 'popup',
    width: POPUP_WIDTH,
    height: POPUP_HEIGHT,
  });

  pending = {
    sessionId: selfApp.sessionId,
    tabId,
    windowId: created.id ?? null,
    resolved: false,
    timer: setTimeout(() => {
      settleSession(failureResult('TIMEOUT', 'Verification timed out'));
      closeSessionWindow();
    }, SESSION_TIMEOUT_MS),
  };

  return { accepted: true };
}

chrome.action.onClicked.addListener(() => {
  void openHomeWindow();
});

// Manual lock: right-click the toolbar icon. Locking closes any open
// extension windows so no unlocked surface survives the lock.
const LOCK_MENU_ID = 'self-lock';

async function lockNow(): Promise<void> {
  await lock();
  if (homeWindowId !== null) {
    void chrome.windows.remove(homeWindowId).catch(() => {});
    homeWindowId = null;
  }
  if (pending && !pending.resolved) {
    settleSession(failureResult('LOCKED', 'Extension was locked'));
    closeSessionWindow();
  }
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: LOCK_MENU_ID,
    title: 'Lock Self',
    contexts: ['action'],
  });
});

chrome.contextMenus.onClicked.addListener(info => {
  if (info.menuItemId === LOCK_MENU_ID) void lockNow();
});

// OS session lock locks the vault (spec: session & lock policy).
chrome.idle.onStateChanged.addListener(state => {
  if (state === 'locked') void lockNow();
});

chrome.windows.onRemoved.addListener(windowId => {
  if (windowId === homeWindowId) homeWindowId = null;
  if (pending?.windowId === windowId) {
    settleSession(failureResult('USER_CANCELLED', 'Verification window closed'));
    pending = null;
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === 'self-ext:verify') {
    const tabId = sender.tab?.id;
    if (typeof tabId !== 'number') {
      sendResponse({ accepted: false, result: failureResult('INVALID_SENDER', 'Request must come from a tab') });
      return undefined;
    }
    void startVerification(message.selfApp as SelfAppLike, tabId).then(sendResponse);
    return true; // async sendResponse
  }

  if (message?.type === 'self-ext:lifecycle') {
    if (message.method === 'setResult') {
      settleSession(message.params);
    }
    if (message.method === 'dismiss') {
      if (pending && !pending.resolved) {
        settleSession(failureResult('USER_CANCELLED', 'Verification dismissed'));
      }
      closeSessionWindow();
    }
  }
  return undefined;
});
