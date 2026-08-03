import { disablePasskeyUnlock } from './passkey';
import { startRelayerSession, type RelayerSession } from './relayer-session';
import {
  createVault,
  isInitialized,
  isUnlocked,
  reset as vaultReset,
  VaultLockedError,
} from './vault';

// Suppresses the lock-eviction redirect while custody.reset is tearing the
// vault down, so the page lands on link.html instead of unlock.html.
let resettingVault = false;

chrome.storage.session.onChanged?.addListener(changes => {
  if (resettingVault) return;
  if (!changes.vaultSessionKey) return;
  if (changes.vaultSessionKey.newValue) return; // unlocked or refreshed
  const here = window.location.pathname.slice(1) + window.location.search;
  window.location.replace(
    chrome.runtime.getURL(`unlock.html?next=${encodeURIComponent(here)}`),
  );
});

void (async () => {
  if (!(await isInitialized())) {
    window.location.replace(chrome.runtime.getURL('link.html'));
    return;
  }
  if (!(await isUnlocked())) {
    const here = window.location.pathname.slice(1) + window.location.search;
    window.location.replace(
      chrome.runtime.getURL(`unlock.html?next=${encodeURIComponent(here)}`),
    );
  }
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

      case 'custody.lock':
        respond(request, { ok: true });
        void chrome.runtime.sendMessage({ type: 'self-ext:lock' });
        return;
      case 'custody.reset': {
        resettingVault = true;
        await vaultReset();
        await disablePasskeyUnlock();
        respond(request, { ok: true });
        window.location.replace(chrome.runtime.getURL('link.html'));
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
    if (err instanceof VaultLockedError) {
      const here = window.location.pathname.slice(1) + window.location.search;
      window.location.replace(
        chrome.runtime.getURL(`unlock.html?next=${encodeURIComponent(here)}`),
      );
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
