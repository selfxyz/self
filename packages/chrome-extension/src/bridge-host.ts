import { startLinkSession, type LinkSessionHandle } from './link-session';
import {
  disablePasskeyUnlock,
  enablePasskeyUnlock,
  isPasskeyEnabled,
  unlockWithPasskey,
} from './passkey';
import { startRelayerSession, type RelayerSession } from './relayer-session';
import {
  createVault,
  isInitialized,
  isUnlocked,
  passwordStrength,
  reset as vaultReset,
  unlock as vaultUnlock,
  unlockCooldownMs,
  vaultMode,
  VaultLockedError,
} from './vault';

// The anchored action popup (default_popup) sizes itself to the document, so
// pin an exact frame there; other contexts (verification window, tabs) keep
// their own sizing. The marker rides the ctx=popup query param through every
// custody redirect.
const inActionPopup =
  new URLSearchParams(window.location.search).get('ctx') === 'popup';
if (inActionPopup) {
  const style = document.documentElement.style;
  style.width = '400px';
  style.height = '600px';
  style.overflowX = 'hidden';
  style.overflowY = 'auto';
}

// Custody gating routes inside the app now (euclid screens at /ext/link and
// /ext/unlock); the app is a hash-free SPA served from index.html, so the
// route rides a query param the boot code reads before React mounts.
function gateUrl(route: 'link' | 'unlock', next?: string): string {
  const params = new URLSearchParams();
  params.set('ext_route', route);
  if (inActionPopup) params.set('ctx', 'popup');
  if (next) params.set('next', next);
  return chrome.runtime.getURL(`index.html?${params.toString()}`);
}

// Suppresses the lock-eviction redirect while custody.reset is tearing the
// vault down, so the page lands on the link screen instead of unlock.
let resettingVault = false;

// Boot-time marker: decides whether this load starts on a gate screen.
const initialGateRoute = new URLSearchParams(window.location.search).get(
  'ext_route',
);

// Live check: the app navigates client-side (gate -> home), so the boot-time
// marker goes stale. Anything reacting to later events must ask where we are
// now, or a page that unlocked in place would ignore the next lock.
function onGateScreen(): boolean {
  if (window.location.pathname.startsWith('/ext/')) return true;
  return new URLSearchParams(window.location.search).get('ext_route') !== null;
}

// Return target for after an unlock, with gate params stripped: leaving them in
// would nest ext_route/next into the next gate URL on every hop.
function returnTarget(): string {
  const params = new URLSearchParams(window.location.search);
  params.delete('ext_route');
  params.delete('next');
  params.delete('ctx');
  const query = params.toString();
  return window.location.pathname.slice(1) + (query ? `?${query}` : '');
}

chrome.storage.session.onChanged?.addListener(changes => {
  if (resettingVault) return;
  if (onGateScreen()) return; // already on a gate screen
  if (!changes.vaultSessionKey) return;
  if (changes.vaultSessionKey.newValue) return; // unlocked or refreshed
  window.location.replace(gateUrl('unlock', returnTarget()));
});

function mountApp(): void {
  performance.mark('self-ext-gate-done');
  const preload = document.getElementById(
    'self-app-module',
  ) as HTMLLinkElement | null;
  if (!preload) return; // dev layout without the build-time transform
  const script = document.createElement('script');
  script.type = 'module';
  script.src = preload.href;
  if (preload.integrity) script.integrity = preload.integrity;
  script.crossOrigin = 'anonymous';
  document.head.appendChild(script);

  const splash = document.getElementById('self-splash');
  const root = document.getElementById('root');
  if (!splash || !root) return;
  const observer = new MutationObserver(() => {
    if (root.childElementCount > 0) {
      splash.remove();
      observer.disconnect();
    }
  });
  observer.observe(root, { childList: true });
}

void (async () => {
  // Gate screens are app routes themselves: mount and let them run.
  if (initialGateRoute) {
    mountApp();
    return;
  }
  if (!(await isInitialized())) {
    window.location.replace(gateUrl('link'));
    return;
  }
  if (!(await isUnlocked())) {
    window.location.replace(gateUrl('unlock', returnTarget()));
    return;
  }
  mountApp();
})();

interface BridgeRequest {
  type: 'request';
  version: number;
  id: string;
  domain: string;
  method: string;
  params: Record<string, unknown>;
  timestamp: number;
}

interface BridgeErrorShape {
  code: string;
  message: string;
}

interface SelfNativeBridgeGlobal {
  _handleResponse(json: string): void;
  _handleEvent(json: string): void;
}

const BRIDGE_PROTOCOL_VERSION = 1;
const CRYPTO_KEY_PREFIX = 'cryptoKey:';

const vault = createVault();

const pageParams = new URLSearchParams(window.location.search);
const relayerSession: RelayerSession | null =
  pageParams.get('ext_mode') === 'embed'
    ? startRelayerSession(pageParams)
    : null;

function respond(
  request: BridgeRequest,
  data: unknown,
  error?: BridgeErrorShape,
): void {
  const bridge = (globalThis as { SelfNativeBridge?: SelfNativeBridgeGlobal })
    .SelfNativeBridge;
  if (!bridge) return;
  bridge._handleResponse(
    JSON.stringify({
      type: 'response',
      version: BRIDGE_PROTOCOL_VERSION,
      id: crypto.randomUUID(),
      domain: request.domain,
      requestId: request.id,
      success: !error,
      data: error ? undefined : data,
      error,
      timestamp: Date.now(),
    }),
  );
}

function unsupported(code: string, message: string): BridgeErrorShape {
  return { code, message };
}

function emitEvent(domain: string, event: string, data: unknown): void {
  const bridge = (globalThis as { SelfNativeBridge?: SelfNativeBridgeGlobal })
    .SelfNativeBridge;
  if (!bridge) return;
  bridge._handleEvent(
    JSON.stringify({
      type: 'event',
      version: BRIDGE_PROTOCOL_VERSION,
      id: crypto.randomUUID(),
      domain,
      event,
      data,
      timestamp: Date.now(),
    }),
  );
}

let linkSession: LinkSessionHandle | null = null;

interface HostConfig {
  mode: 'self-app' | 'embed';
  verificationRequest: Record<string, unknown> | null;
  platform: string;
  debug: boolean;
  capabilities: {
    nfc: boolean;
    mrzCamera: boolean;
    biometrics: boolean;
    secureStorage: boolean;
    custodyControls: boolean;
  };
}

function hostConfigFromUrl(): HostConfig {
  const params = new URLSearchParams(window.location.search);
  const embed = params.get('ext_mode') === 'embed';

  let verificationRequest: Record<string, unknown> | null = null;
  if (embed) {
    verificationRequest = {};
    for (const [key, value] of params.entries()) {
      if (key === 'ext_mode') continue;
      verificationRequest[key] =
        key === 'disclosures' || key === 'proofItems'
          ? value.split(',')
          : value;
    }
  }

  return {
    mode: embed ? 'embed' : 'self-app',
    verificationRequest,
    platform: 'chrome-extension',
    debug: true,
    capabilities: {
      // The four legacy fields mirror the pre-handshake defaults (absent =
      // true) so advertising them changes no existing flow.
      nfc: true,
      mrzCamera: true,
      biometrics: true,
      secureStorage: true,
      custodyControls: true,
    },
  };
}

function notifyBackground(
  method: string,
  params: Record<string, unknown>,
): void {
  void chrome.runtime
    .sendMessage({
      type: 'self-ext:lifecycle',
      method,
      params,
      search: window.location.search,
    })
    .catch(() => {});
}

const b64 = {
  encode(bytes: ArrayBuffer): string {
    let binary = '';
    for (const byte of new Uint8Array(bytes))
      binary += String.fromCharCode(byte);
    return btoa(binary);
  },
  decode(value: string) {
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  },
};

async function loadKeyPair(
  keyRef: string,
): Promise<{ privateJwk: JsonWebKey; publicJwk: JsonWebKey } | null> {
  const storageKey = CRYPTO_KEY_PREFIX + keyRef;
  const record = await chrome.storage.local.get(storageKey);
  const raw = record[storageKey] as
    | { privateJwk: JsonWebKey; publicJwk: JsonWebKey }
    | undefined;
  if (raw) return raw; // pre-vault keys; migrated on next generateKey
  const stored = await createVault().get(CRYPTO_KEY_PREFIX + keyRef);
  return stored
    ? (JSON.parse(stored) as { privateJwk: JsonWebKey; publicJwk: JsonWebKey })
    : null;
}

async function generateKey(
  keyRef: string,
): Promise<{ keyRef: string; success: boolean }> {
  const pair = await crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign', 'verify'],
  );
  const privateJwk = await crypto.subtle.exportKey('jwk', pair.privateKey);
  const publicJwk = await crypto.subtle.exportKey('jwk', pair.publicKey);
  await createVault().set(
    CRYPTO_KEY_PREFIX + keyRef,
    JSON.stringify({ privateJwk, publicJwk }),
  );
  return { keyRef, success: true };
}

async function sign(
  dataB64: string,
  keyRef: string,
): Promise<{ signature: string }> {
  const stored = await loadKeyPair(keyRef);
  if (!stored) throw new Error(`No key for keyRef ${keyRef}`);
  const privateKey = await crypto.subtle.importKey(
    'jwk',
    stored.privateJwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privateKey,
    b64.decode(dataB64),
  );
  return { signature: b64.encode(signature) };
}

async function getPublicKey(keyRef: string): Promise<{ publicKey: string }> {
  const stored = await loadKeyPair(keyRef);
  if (!stored) throw new Error(`No key for keyRef ${keyRef}`);
  const publicKey = await crypto.subtle.importKey(
    'jwk',
    stored.publicJwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['verify'],
  );
  const raw = await crypto.subtle.exportKey('raw', publicKey);
  return { publicKey: b64.encode(raw) };
}

async function handle(request: BridgeRequest): Promise<void> {
  const { domain, method, params } = request;

  try {
    switch (`${domain}.${method}`) {
      case 'lifecycle.getConfig':
        return respond(request, hostConfigFromUrl());
      case 'lifecycle.ready':
        notifyBackground(method, params);
        return respond(request, { ok: true });
      case 'lifecycle.setResult': {
        const success = params.success === true;
        const error = params.error as
          | { code?: string; message?: string }
          | undefined;
        relayerSession?.reportResult(success, error?.code, error?.message);
        notifyBackground(method, params);
        return respond(request, { ok: true });
      }
      case 'lifecycle.dismiss':
        relayerSession?.reportDismissWithoutResult();
        relayerSession?.close();
        notifyBackground(method, params);
        respond(request, { ok: true });
        window.close();
        return;

      case 'custody.state':
        return respond(request, {
          initialized: await isInitialized(),
          unlocked: await isUnlocked(),
          mode: await vaultMode(),
          passkeyEnabled: await isPasskeyEnabled(),
        });
      case 'custody.passwordStrength':
        return respond(request, passwordStrength(String(params.password)));
      case 'custody.createLinkSession': {
        linkSession?.cancel();
        linkSession = await startLinkSession(pageParams.get('relay'), event =>
          emitEvent('custody', 'link', event),
        );
        return respond(request, {
          qrContent: linkSession.qrContent,
          ttlMs: linkSession.ttlMs,
        });
      }
      case 'custody.cancelLinkSession':
        linkSession?.cancel();
        linkSession = null;
        return respond(request, { ok: true });
      case 'custody.completeLink': {
        if (!linkSession) throw new Error('No link session in progress');
        const docCount = await linkSession.complete(
          params.kind === 'passkey' ? 'passkey' : 'password',
          typeof params.password === 'string' ? params.password : undefined,
        );
        return respond(request, { ok: true, docCount });
      }
      case 'custody.unlock': {
        const cooldownMs = await unlockCooldownMs();
        if (cooldownMs > 0) return respond(request, { ok: false, cooldownMs });
        const ok = await vaultUnlock(String(params.password));
        return respond(request, {
          ok,
          cooldownMs: ok ? 0 : await unlockCooldownMs(),
        });
      }
      case 'custody.unlockPasskey':
        return respond(request, { ok: await unlockWithPasskey() });
      case 'custody.enablePasskey':
        await enablePasskeyUnlock();
        return respond(request, { ok: true });
      case 'custody.lock':
        respond(request, { ok: true });
        void chrome.runtime.sendMessage({ type: 'self-ext:lock' });
        return;
      case 'custody.reset': {
        resettingVault = true;
        await vaultReset();
        await disablePasskeyUnlock();
        respond(request, { ok: true });
        window.location.replace(gateUrl('link'));
        return;
      }

      case 'secureStorage.get':
        return respond(request, await vault.get(String(params.key)));
      case 'secureStorage.set':
        await vault.set(String(params.key), String(params.value));
        return respond(request, { ok: true });
      case 'secureStorage.remove':
        await vault.remove(String(params.key));
        return respond(request, { ok: true });

      case 'crypto.generateKey':
        return respond(request, await generateKey(String(params.keyRef)));
      case 'crypto.sign':
        return respond(
          request,
          await sign(String(params.data), String(params.keyRef)),
        );
      case 'crypto.getPublicKey':
        return respond(request, await getPublicKey(String(params.keyRef)));

      case 'biometrics.isAvailable':
        return respond(request, false);
      case 'biometrics.getBiometryType':
        return respond(request, 'none');
      case 'biometrics.authenticate':
        return respond(
          request,
          null,
          unsupported(
            'BIOMETRICS_NOT_SUPPORTED',
            'No biometrics in the extension',
          ),
        );
      case 'camera.isAvailable':
        return respond(request, false);
      case 'camera.stopCamera':
        return respond(request, { ok: true });
      case 'camera.scanMRZ':
      case 'camera.aadhaarUploadFromLibrary':
        return respond(
          request,
          null,
          unsupported(
            'CAMERA_NOT_SUPPORTED',
            'No camera capture in the extension',
          ),
        );
      case 'nfc.scanPassport':
        return respond(
          request,
          null,
          unsupported('NFC_NOT_SUPPORTED', 'No NFC in the extension'),
        );
      case 'nfc.cancelScan':
        return respond(request, { ok: true });

      case 'haptic.trigger':
      case 'analytics.trackEvent':
      case 'analytics.trackNfcEvent':
      case 'analytics.logNfcEvent':
        return respond(request, { ok: true });

      default:
        return respond(
          request,
          null,
          unsupported('METHOD_NOT_FOUND', `Unhandled ${domain}.${method}`),
        );
    }
  } catch (err) {
    respond(request, null, {
      code: err instanceof VaultLockedError ? 'VAULT_LOCKED' : 'HOST_ERROR',
      message: err instanceof Error ? err.message : String(err),
    });
    // Gate screens legitimately touch a locked vault (state checks, link
    // persistence); bouncing from them would loop forever.
    if (err instanceof VaultLockedError && !onGateScreen()) {
      window.location.replace(gateUrl('unlock', returnTarget()));
    }
  }
}

window.ReactNativeWebView = {
  postMessage(json: string): void {
    let request: BridgeRequest;
    try {
      request = JSON.parse(json) as BridgeRequest;
    } catch {
      return;
    }
    if (
      request?.type !== 'request' ||
      request.version !== BRIDGE_PROTOCOL_VERSION
    )
      return;
    void handle(request);
  },
};

declare global {
  interface Window {
    ReactNativeWebView?: { postMessage(json: string): void };
  }
}
