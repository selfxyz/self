import {
  disablePasskeyUnlock,
  enablePasskeyUnlock,
  isPasskeyEnabled,
  unlockWithPasskey,
} from './passkey';
import { reset, unlock, unlockCooldownMs, vaultMode } from './vault';

// Exact frame when hosted in the anchored action popup (see bridge-host).
const inActionPopup =
  new URLSearchParams(window.location.search).get('ctx') === 'popup';
if (inActionPopup) {
  const style = document.documentElement.style;
  style.width = '400px';
  style.height = '600px';
  style.overflowX = 'hidden';
  style.overflowY = 'auto';
}

const pw = document.getElementById('pw') as HTMLInputElement;
const submit = document.getElementById('pw-submit') as HTMLButtonElement;
const passkeyBtn = document.getElementById('pw-passkey') as HTMLButtonElement;
const enablePasskeyBtn = document.getElementById(
  'pw-enable-passkey',
) as HTMLButtonElement;
const error = document.getElementById('pw-error') as HTMLElement;

const NEXT_ALLOWED_PATHS = ['index.html', 'link.html'];

function nextUrl(): string {
  const next = new URLSearchParams(window.location.search).get('next');
  if (!next) return chrome.runtime.getURL('index.html');
  const [path, query] = next.split('?', 2);
  if (!NEXT_ALLOWED_PATHS.includes(path))
    return chrome.runtime.getURL('index.html');
  const params = new URLSearchParams(query ?? '');
  const search = params.toString();
  return chrome.runtime.getURL(search ? `${path}?${search}` : path);
}

async function attempt(): Promise<void> {
  submit.disabled = true;
  error.textContent = '';
  const cooldown = await unlockCooldownMs();
  if (cooldown > 0) {
    error.textContent = `Too many attempts. Try again in ${Math.ceil(cooldown / 1000)}s.`;
    submit.disabled = false;
    return;
  }
  const ok = await unlock(pw.value);
  if (ok) {
    window.location.href = nextUrl();
    return;
  }
  submit.disabled = false;
  const nextCooldown = await unlockCooldownMs();
  error.textContent =
    nextCooldown > 0
      ? `Wrong password. Too many attempts: wait ${Math.ceil(nextCooldown / 1000)}s before trying again.`
      : 'Wrong password.';
}

async function attemptPasskey(): Promise<void> {
  passkeyBtn.disabled = true;
  error.textContent = '';
  try {
    if (await unlockWithPasskey()) {
      window.location.href = nextUrl();
      return;
    }
    error.textContent = 'Touch ID unlock failed. Use your password.';
  } catch (err) {
    error.textContent = err instanceof Error ? err.message : String(err);
  }
  passkeyBtn.disabled = false;
}

async function attemptEnablePasskey(): Promise<void> {
  enablePasskeyBtn.disabled = true;
  error.textContent = '';
  const ok = await unlock(pw.value);
  if (!ok) {
    error.textContent = 'Wrong password. Type it, then press this button.';
    enablePasskeyBtn.disabled = false;
    return;
  }
  try {
    await enablePasskeyUnlock();
    window.location.href = nextUrl();
    return;
  } catch (err) {
    error.textContent = err instanceof Error ? err.message : String(err);
    setTimeout(() => {
      window.location.href = nextUrl();
    }, 2_500);
  }
}

submit.addEventListener('click', () => void attempt());
pw.addEventListener('keydown', event => {
  if (event.key === 'Enter') void attempt();
});
passkeyBtn.addEventListener('click', () => void attemptPasskey());
enablePasskeyBtn.addEventListener('click', () => void attemptEnablePasskey());
void Promise.all([isPasskeyEnabled(), vaultMode()]).then(([enabled, mode]) => {
  passkeyBtn.classList.toggle('hidden', !enabled);
  enablePasskeyBtn.classList.toggle('hidden', enabled || mode === 'passkey');
  if (mode === 'passkey') {
    pw.classList.add('hidden');
    submit.classList.add('hidden');
    document.querySelector('main > p')!.textContent =
      'Unlock with Touch ID to decrypt your account on this computer.';
  }
});

const resetStart = document.getElementById('reset-start') as HTMLButtonElement;
const resetConfirm = document.getElementById('reset-confirm') as HTMLElement;
const resetConfirmBtn = document.getElementById(
  'reset-confirm-btn',
) as HTMLButtonElement;

resetStart.addEventListener('click', () => {
  resetConfirm.classList.toggle('hidden');
});
resetConfirmBtn.addEventListener('click', () => {
  void (async () => {
    resetConfirmBtn.disabled = true;
    error.textContent = '';
    try {
      await reset();
      await disablePasskeyUnlock();
    } catch (err) {
      resetConfirmBtn.disabled = false;
      error.textContent = `Could not clear this browser: ${err instanceof Error ? err.message : String(err)}`;
      return;
    }
    window.location.href = chrome.runtime.getURL(
      inActionPopup ? 'link.html?ctx=popup' : 'link.html',
    );
  })();
});
