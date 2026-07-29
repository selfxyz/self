// Unlock page: derives the vault key from the password and stores it in
// chrome.storage.session, then continues to the requested page.

import { disablePasskeyUnlock, enablePasskeyUnlock, isPasskeyEnabled, unlockWithPasskey } from './passkey';
import { reset, unlock, vaultMode } from './vault';

const pw = document.getElementById('pw') as HTMLInputElement;
const submit = document.getElementById('pw-submit') as HTMLButtonElement;
const passkeyBtn = document.getElementById('pw-passkey') as HTMLButtonElement;
const enablePasskeyBtn = document.getElementById('pw-enable-passkey') as HTMLButtonElement;
const error = document.getElementById('pw-error') as HTMLElement;

function nextUrl(): string {
  const next = new URLSearchParams(window.location.search).get('next');
  // Only ever continue to our own pages.
  if (next && /^[a-z0-9./?=&_-]+$/i.test(next) && !next.startsWith('//')) {
    return chrome.runtime.getURL(next);
  }
  return chrome.runtime.getURL('index.html');
}

async function attempt(): Promise<void> {
  submit.disabled = true;
  error.textContent = '';
  const ok = await unlock(pw.value);
  if (ok) {
    window.location.href = nextUrl();
    return;
  }
  submit.disabled = false;
  error.textContent = 'Wrong password.';
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
    // Vault is unlocked at this point; continue rather than trap the user.
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
    // Passkey custody: there is no password to type.
    pw.classList.add('hidden');
    submit.classList.add('hidden');
    document.querySelector('main > p')!.textContent = 'Unlock with Touch ID to decrypt your account on this computer.';
  }
});

const resetStart = document.getElementById('reset-start') as HTMLButtonElement;
const resetConfirm = document.getElementById('reset-confirm') as HTMLElement;
const resetConfirmBtn = document.getElementById('reset-confirm-btn') as HTMLButtonElement;

resetStart.addEventListener('click', () => {
  resetConfirm.classList.toggle('hidden');
});
resetConfirmBtn.addEventListener('click', () => {
  void (async () => {
    resetConfirmBtn.disabled = true;
    await reset();
    await disablePasskeyUnlock();
    window.location.href = chrome.runtime.getURL('link.html');
  })();
});
