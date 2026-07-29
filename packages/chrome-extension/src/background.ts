// MV3 service worker. Owns popup windows, routes by vault state, and manages
// one pending site verification session at a time (fail-closed on overlap).
//
// NOTHING lives in module memory. Chrome terminates an idle MV3 worker after
// ~30s, which is guaranteed to happen while the user reads the consent screen
// or waits 10-30s on proving. State kept in globals would be gone when the
// popup reports its result: the RP page would hang, and the BUSY, TIMEOUT and
// cancel guards would silently stop working. So session state lives in
// chrome.storage.session and the timeout is a chrome.alarms alarm, both of
// which survive worker restarts. See CEP-15.

import { isUnlocked, lock } from './vault';
import { selfAppToPopupQuery, type SelfAppLike } from './verification-url';

const POPUP_WIDTH = 430;
const POPUP_HEIGHT = 800;
const SESSION_TIMEOUT_MS = 5 * 60_000;
const PENDING_KEY = 'pendingSession';
const HOME_WINDOW_KEY = 'homeWindowId';
const TIMEOUT_ALARM = 'self-pending-timeout';
const LOCK_MENU_ID = 'self-lock';

interface PendingSession {
  sessionId: string;
  tabId: number;
  /** Origin that asked, for result routing and the popup's requester display. */
  origin: string | null;
  windowId: number | null;
  resolved: boolean;
}

async function readPending(): Promise<PendingSession | null> {
  const record = await chrome.storage.session.get(PENDING_KEY);
  return (record[PENDING_KEY] as PendingSession | undefined) ?? null;
}

async function writePending(session: PendingSession | null): Promise<void> {
  if (session) await chrome.storage.session.set({ [PENDING_KEY]: session });
  else await chrome.storage.session.remove(PENDING_KEY);
}

async function readHomeWindowId(): Promise<number | null> {
  const record = await chrome.storage.session.get(HOME_WINDOW_KEY);
  const value = record[HOME_WINDOW_KEY];
  return typeof value === 'number' ? value : null;
}

async function vaultState(): Promise<'uninitialized' | 'locked' | 'unlocked'> {
  const local = await chrome.storage.local.get('vaultMeta');
  if (!local.vaultMeta) return 'uninitialized';
  // Share the vault's TTL-aware check: reading the raw session record here
  // would route an expired session straight into the app.
  return (await isUnlocked()) ? 'unlocked' : 'locked';
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
  const existing = await readHomeWindowId();
  if (existing !== null) {
    try {
      await chrome.windows.update(existing, { focused: true });
      return;
    } catch {
      // Window is gone; fall through and open a new one.
    }
  }

  const created = await chrome.windows.create({
    url: await gatedUrl('index.html'),
    type: 'popup',
    width: POPUP_WIDTH,
    height: POPUP_HEIGHT,
  });
  await chrome.storage.session.set({ [HOME_WINDOW_KEY]: created.id ?? null });
}

function failureResult(code: string, message: string) {
  return { success: false, error: { code, message } };
}

/** Delivers the result to the requesting tab, once, if it still holds the
 *  origin that asked. A navigated tab must not receive another origin's result. */
async function settleSession(result: unknown): Promise<void> {
  const session = await readPending();
  if (!session || session.resolved) return;
  session.resolved = true;
  await writePending(session);
  await chrome.alarms.clear(TIMEOUT_ALARM);

  if (session.origin) {
    try {
      const tab = await chrome.tabs.get(session.tabId);
      const tabOrigin = tab.url ? new URL(tab.url).origin : null;
      if (tabOrigin !== session.origin) return; // tab moved on; drop the result
    } catch {
      return; // tab closed
    }
  }

  await chrome.tabs
    .sendMessage(session.tabId, {
      type: 'self-ext:result',
      sessionId: session.sessionId,
      origin: session.origin,
      result,
    })
    .catch(() => {
      // Tab closed between the check and the send; nothing to deliver to.
    });
}

async function closeSessionWindow(): Promise<void> {
  const session = await readPending();
  if (session?.windowId != null) {
    await chrome.windows.remove(session.windowId).catch(() => {});
  }
  await writePending(null);
  await chrome.alarms.clear(TIMEOUT_ALARM);
}

async function startVerification(
  selfApp: SelfAppLike,
  tabId: number,
  origin: string | null,
): Promise<{ accepted: boolean; result?: unknown }> {
  const existing = await readPending();
  if (existing && !existing.resolved) {
    return { accepted: false, result: failureResult('BUSY', 'Another verification is in progress') };
  }

  // Reserve the slot before opening anything: two back-to-back requests would
  // otherwise both pass the check above and open two popups with only the
  // later one tracked. Default-deny on overlap.
  const reserved: PendingSession = {
    sessionId: selfApp.sessionId,
    tabId,
    origin,
    windowId: null,
    resolved: false,
  };
  await writePending(reserved);
  await chrome.alarms.create(TIMEOUT_ALARM, { when: Date.now() + SESSION_TIMEOUT_MS });

  try {
    if ((await vaultState()) === 'uninitialized') {
      await writePending(null);
      await chrome.alarms.clear(TIMEOUT_ALARM);
      return { accepted: false, result: failureResult('NO_ACCOUNT', 'No account linked in the Self extension') };
    }

    const target = `index.html?${selfAppToPopupQuery(selfApp)}`;
    const created = await chrome.windows.create({
      url: await gatedUrl(target),
      type: 'popup',
      width: POPUP_WIDTH,
      height: POPUP_HEIGHT,
    });

    const current = await readPending();
    if (current && current.sessionId === reserved.sessionId) {
      current.windowId = created.id ?? null;
      await writePending(current);
    }
    return { accepted: true };
  } catch (err) {
    await writePending(null);
    await chrome.alarms.clear(TIMEOUT_ALARM);
    return {
      accepted: false,
      result: failureResult('POPUP_FAILED', err instanceof Error ? err.message : 'Could not open the Self popup'),
    };
  }
}

/** Closes every open extension window. Enumerating beats cached ids, which do
 *  not survive a worker restart. */
async function closeAllExtensionWindows(): Promise<void> {
  const prefix = chrome.runtime.getURL('');
  const windows = await chrome.windows.getAll({ populate: true });
  for (const win of windows) {
    const ours = win.tabs?.some(tab => tab.url?.startsWith(prefix));
    if (ours && win.id != null) await chrome.windows.remove(win.id).catch(() => {});
  }
  await chrome.storage.session.remove(HOME_WINDOW_KEY);
}

async function lockNow(): Promise<void> {
  await lock();
  const session = await readPending();
  if (session && !session.resolved) {
    await settleSession(failureResult('LOCKED', 'Extension was locked'));
  }
  await writePending(null);
  await chrome.alarms.clear(TIMEOUT_ALARM);
  // Pages hold decrypted data in memory, so clearing the key is not enough:
  // close every extension surface. Pages also self-navigate on the storage
  // change (bridge-host) in case a window survives.
  await closeAllExtensionWindows();
}

// Pin the session key to trusted contexts so a future access-level change
// elsewhere cannot expose it to content scripts.
void chrome.storage.session.setAccessLevel?.({ accessLevel: 'TRUSTED_CONTEXTS' });

chrome.action.onClicked.addListener(() => {
  void openHomeWindow();
});

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

// Survives worker restarts, unlike setTimeout.
chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name !== TIMEOUT_ALARM) return;
  void (async () => {
    await settleSession(failureResult('TIMEOUT', 'Verification timed out'));
    await closeSessionWindow();
  })();
});

// Reconcile on startup: a window closed while the worker was asleep leaves a
// pending session nobody will ever settle.
async function reconcile(): Promise<void> {
  const session = await readPending();
  if (!session || session.resolved) return;
  if (session.windowId == null) return;
  try {
    await chrome.windows.get(session.windowId);
  } catch {
    await settleSession(failureResult('USER_CANCELLED', 'Verification window closed'));
    await writePending(null);
  }
}

chrome.runtime.onStartup.addListener(() => void reconcile());
void reconcile();

chrome.windows.onRemoved.addListener(windowId => {
  void (async () => {
    if ((await readHomeWindowId()) === windowId) await chrome.storage.session.remove(HOME_WINDOW_KEY);
    const session = await readPending();
    if (session?.windowId === windowId) {
      await settleSession(failureResult('USER_CANCELLED', 'Verification window closed'));
      await writePending(null);
    }
  })();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === 'self-ext:verify') {
    const tabId = sender.tab?.id;
    if (typeof tabId !== 'number') {
      sendResponse({ accepted: false, result: failureResult('INVALID_SENDER', 'Request must come from a tab') });
      return undefined;
    }
    // sender.origin is set by Chrome, not by the page, so it is the one
    // trustworthy statement of who is asking.
    const origin = sender.origin ?? (sender.url ? new URL(sender.url).origin : null);
    void startVerification(message.selfApp as SelfAppLike, tabId, origin).then(sendResponse);
    return true; // async sendResponse
  }

  if (message?.type === 'self-ext:lifecycle') {
    void (async () => {
      if (message.method === 'setResult') {
        await settleSession(message.params);
      }
      if (message.method === 'dismiss') {
        const session = await readPending();
        if (session && !session.resolved) {
          await settleSession(failureResult('USER_CANCELLED', 'Verification dismissed'));
        }
        await closeSessionWindow();
      }
    })();
  }
  return undefined;
});
