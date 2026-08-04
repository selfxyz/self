// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

// Shared drivers for the euclid extension screens (CEP-07). The link and
// unlock flows are app routes now, so harnesses interact by visible text and
// role instead of the ids the deleted bespoke pages used.

export const EXTENSION_ID = 'ogmglcibieieclolmenndchnccbbmmcf';

export function extensionUrl(path = 'index.html') {
  return `chrome-extension://${EXTENSION_ID}/${path}`;
}

export async function clickByText(page, text, timeout = 15_000) {
  await page.waitForFunction(
    label =>
      [...document.querySelectorAll('button')].some(button =>
        (button.innerText || button.getAttribute('aria-label') || '').includes(
          label,
        ),
      ),
    { timeout },
    text,
  );
  await page.evaluate(label => {
    const button = [...document.querySelectorAll('button')].find(candidate =>
      (
        candidate.innerText ||
        candidate.getAttribute('aria-label') ||
        ''
      ).includes(label),
    );
    if (!button) throw new Error(`no button matching "${label}"`);
    button.click();
  }, text);
}

export function waitForText(page, text, timeout = 20_000) {
  return page.waitForFunction(
    label => (document.body?.innerText ?? '').includes(label),
    { timeout },
    text,
  );
}

export function bodyText(page) {
  return page.evaluate(() =>
    (document.body?.innerText ?? '').replace(/\n+/g, ' | '),
  );
}

/** Waits for the link screen and returns the parsed QR payload. */
export async function readLinkQr(page, timeout = 30_000) {
  await page.waitForSelector('[data-qr-content]', { timeout });
  const raw = await page.$eval(
    '[data-qr-content]',
    node => node.dataset.qrContent,
  );
  return JSON.parse(raw);
}

/** Reads the emoji row rendered by euclid's EmojiSas (role="img" per slot). */
export async function readSas(page) {
  return page.evaluate(() =>
    [...document.querySelectorAll('[role="img"]')]
      .map(node => node.textContent.trim())
      .filter(text => /\p{Extended_Pictographic}/u.test(text)),
  );
}

/** Waits for the emoji-verify step (QR gone) and returns the emojis shown. */
export async function waitForVerifyStep(page, timeout = 60_000) {
  await waitForText(page, 'Check these emojis', timeout);
  return readSas(page);
}

/** Fills the two password fields on the custody step and submits. */
export async function completeCustodyWithPassword(page, password) {
  await waitForText(page, 'Secure this browser', 60_000);
  const fields = await page.$$('input[type="password"]');
  if (fields.length < 2)
    throw new Error(`expected two password inputs, found ${fields.length}`);
  await fields[0].type(password);
  await fields[1].type(password);
  await clickByText(page, 'Use a password instead');
  await waitForText(page, 'Account linked', 30_000);
}

/** Types a password into the unlock screen and submits it. */
export async function unlockWithPassword(page, password) {
  await waitForText(page, 'Unlock Self');
  const field = await page.waitForSelector('input[type="password"]', {
    timeout: 15_000,
  });
  await field.click({ clickCount: 3 });
  await field.type(password);
  await clickByText(page, 'Unlock');
}

/** Drives the two-press reset affordance on the unlock screen. */
export async function resetFromUnlock(page) {
  await waitForText(page, 'Forgot password');
  await clickByText(page, 'Forgot password');
  await clickByText(page, 'Press again to erase');
}
