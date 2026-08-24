// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { CloudStorage } from 'react-native-cloud-storage';

import {
  CloudBackupError,
  isCloudBackupError,
} from '@/services/cloud-backup/errors';
import {
  ENCRYPTED_FILE_PATH,
  FILE_NAME,
  FOLDER,
  PLACEHOLDER_FILE_PATH,
} from '@/services/cloud-backup/helpers';
import type { Mnemonic } from '@/types/mnemonic';
import { parseMnemonic } from '@/utils/crypto/mnemonic';
import { withRetries } from '@/utils/retry';

export interface IosDownloadOptions {
  /** Total budget for waiting on iCloud to materialise the backup file. */
  syncTimeoutMs?: number;
  /** Delay between `exists` checks while waiting, and between remote probes. */
  pollIntervalMs?: number;
  /** How often to re-probe when the folder listing itself fails. */
  remoteProbeAttempts?: number;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function disableBackup() {
  await withRetries(() => CloudStorage.rmdir(FOLDER, { recursive: true }));
}

/**
 * Whether iCloud holds a backup for this account, downloaded or not.
 *
 * iCloud syncs metadata before content: a backup made on another device shows
 * up here first as a `.name.icloud` placeholder that `exists` reports false
 * for. A failed folder listing is ambiguous — `contentsOfDirectory` throws the
 * same ERR_READ_ERROR for "folder never created" (no backup) and for a genuine
 * read failure. Nor is a successful listing that lacks the file conclusive:
 * the folder can materialise before its file placeholders do during the first
 * metadata sync. Only a sighting of the file ends the probe early — every
 * negative outcome is retried until the budget runs out, so "no backup" is
 * only ever concluded after the metadata has had a window to arrive. The
 * residual gap (metadata lag beyond the probe budget) is not closable with
 * this library's API surface; it exposes no NSMetadataQuery.
 */
async function hasRemoteBackup(
  probeAttempts: number,
  probeIntervalMs: number,
): Promise<boolean> {
  for (let attempt = 0; attempt < probeAttempts; attempt++) {
    if (attempt > 0) {
      await sleep(probeIntervalMs);
    }
    if (await CloudStorage.exists(PLACEHOLDER_FILE_PATH)) {
      return true;
    }
    try {
      const entries = await CloudStorage.readdir(FOLDER);
      if (entries.some(entry => entry.includes(FILE_NAME))) {
        return true;
      }
    } catch {
      // Missing folder or read failure — inconclusive, same as a listing
      // without the file. Retry the whole probe.
    }
  }
  return false;
}

/**
 * Asks iOS to download the backup and waits for it to appear locally.
 *
 * `triggerSync` is fired at both the plain path and the placeholder path:
 * Apple does not document which of the two `isUbiquitousItem` accepts for a
 * not-yet-downloaded item, and the wrong one throws instead of enqueueing. It
 * is re-fired on every poll tick — the enqueue is idempotent, and a single
 * dropped request must not strand the user in a retry loop that can never
 * succeed. The poll is the arbiter either way.
 */
async function waitForBackupFile(
  syncTimeoutMs: number,
  pollIntervalMs: number,
): Promise<boolean> {
  const deadline = Date.now() + syncTimeoutMs;
  for (;;) {
    await Promise.allSettled([
      CloudStorage.triggerSync(ENCRYPTED_FILE_PATH),
      CloudStorage.triggerSync(PLACEHOLDER_FILE_PATH),
    ]);
    if (await CloudStorage.exists(ENCRYPTED_FILE_PATH)) {
      return true;
    }
    if (Date.now() >= deadline) {
      return false;
    }
    await sleep(Math.min(pollIntervalMs, Math.max(deadline - Date.now(), 1)));
  }
}

export async function download(options?: IosDownloadOptions) {
  const {
    syncTimeoutMs = 30_000,
    pollIntervalMs = 1_000,
    remoteProbeAttempts = 3,
  } = options ?? {};
  try {
    // When the device is signed out of iCloud, `exists` resolves false rather
    // than throwing, so without this guard a signed-out user is told they have
    // no backup. Check availability first so the two stay distinguishable.
    if (!(await CloudStorage.isCloudAvailable())) {
      throw new CloudBackupError(
        'cloud_unavailable',
        'iCloud is unavailable, is the device signed in to iCloud?',
      );
    }

    if (!(await CloudStorage.exists(ENCRYPTED_FILE_PATH))) {
      if (!(await hasRemoteBackup(remoteProbeAttempts, pollIntervalMs))) {
        throw new CloudBackupError(
          'no_backup_found',
          'Couldnt find the encrypted backup, did you back it up previously?',
        );
      }
      if (!(await waitForBackupFile(syncTimeoutMs, pollIntervalMs))) {
        throw new CloudBackupError(
          'backup_not_synced',
          'The iCloud backup has not finished downloading to this device yet',
        );
      }
    }

    const mnemonicString = await withRetries(() =>
      CloudStorage.readFile(ENCRYPTED_FILE_PATH),
    );
    try {
      return parseMnemonic(mnemonicString);
    } catch (e) {
      throw new CloudBackupError(
        'backup_corrupt',
        `Failed to parse mnemonic backup: ${(e as Error).message}`,
        { cause: e },
      );
    }
  } catch (e) {
    if (isCloudBackupError(e)) {
      throw e;
    }
    // Whatever the provider rejected with is unclassifiable — `withRetries`
    // replaces the original error, so there is nothing left to inspect. Report
    // it as a read failure so the user is told to retry rather than that their
    // backup is missing.
    throw new CloudBackupError(
      'backup_read_failed',
      `Failed to read the backup from iCloud: ${(e as Error).message}`,
      { cause: e },
    );
  }
}

export async function upload(mnemonic: Mnemonic) {
  try {
    await CloudStorage.mkdir(FOLDER);
  } catch (e) {
    console.error(e);
    if (!(e as Error).message.includes('already')) {
      throw e;
    }
  }
  await withRetries(() =>
    CloudStorage.writeFile(ENCRYPTED_FILE_PATH, JSON.stringify(mnemonic)),
  );
}
