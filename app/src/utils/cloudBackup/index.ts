// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { Buffer } from 'buffer';
import { ethers } from 'ethers';
import forge from 'node-forge';
import { useMemo } from 'react';
import { Platform } from 'react-native';
import {
  APP_DATA_FOLDER_ID,
  MIME_TYPES,
} from '@robinbobin/react-native-google-drive-api-wrapper';

import { encryptAES256GCM } from '@selfxyz/common/utils/proving';

import {
  type DocumentStorageSnapshot,
  exportDocumentStorageSnapshot,
  restoreDocumentStorageSnapshotIfEmpty,
} from '@/providers/passportDataProvider';
import type { Mnemonic } from '@/types/mnemonic';
import { createGDrive } from '@/utils/cloudBackup/google';
import type {
  CloudBackupPayload,
  EncryptedDocumentBackup,
} from '@/utils/cloudBackup/helpers';
import {
  FILE_NAME,
  parseBackupPayload,
  withRetries,
} from '@/utils/cloudBackup/helpers';
import {
  disableBackup as disableIosBackup,
  download as iosDownload,
  upload as iosUpload,
} from '@/utils/cloudBackup/ios';

import '@/utils/ethers';

export const STORAGE_NAME = Platform.OS === 'ios' ? 'iCloud' : 'Google Drive';

const DOCUMENT_BACKUP_VERSION = 1;
const DOCUMENT_BACKUP_KDF_SALT = 'selfxyz:document-backup:v1';
const DOCUMENT_BACKUP_KDF_ITERATIONS = 100_000;

function isDriveFile(file: unknown): file is { id: string } {
  return (
    typeof file === 'object' &&
    file !== null &&
    typeof (file as { id?: unknown }).id === 'string'
  );
}

function deriveBackupKeyBytes(mnemonic: Mnemonic): Uint8Array {
  const secret = `${mnemonic.phrase}|${mnemonic.password ?? ''}`;
  const saltBytes = ethers.toUtf8Bytes(DOCUMENT_BACKUP_KDF_SALT);

  const keyHex = ethers.pbkdf2(
    ethers.toUtf8Bytes(secret),
    saltBytes,
    DOCUMENT_BACKUP_KDF_ITERATIONS,
    32,
    'sha256',
  );
  return ethers.getBytes(keyHex);
}

function forgeBufferFromBytes(bytes: Uint8Array) {
  return forge.util.createBuffer(Buffer.from(bytes).toString('binary'));
}

function encryptSnapshot(
  snapshot: DocumentStorageSnapshot,
  mnemonic: Mnemonic,
): EncryptedDocumentBackup {
  const keyBytes = deriveBackupKeyBytes(mnemonic);
  const encrypted = encryptAES256GCM(
    JSON.stringify(snapshot),
    forgeBufferFromBytes(keyBytes),
  );

  return {
    version: DOCUMENT_BACKUP_VERSION,
    nonce: Buffer.from(encrypted.nonce).toString('base64'),
    cipherText: Buffer.from(encrypted.cipher_text).toString('base64'),
    authTag: Buffer.from(encrypted.auth_tag).toString('base64'),
  };
}

function isDocumentStorageSnapshot(
  value: unknown,
): value is DocumentStorageSnapshot {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as DocumentStorageSnapshot;
  return (
    !!candidate.catalog &&
    typeof candidate.catalog === 'object' &&
    Array.isArray(candidate.catalog.documents) &&
    !!candidate.documents &&
    typeof candidate.documents === 'object'
  );
}

function decryptSnapshot(
  encrypted: EncryptedDocumentBackup,
  mnemonic: Mnemonic,
): DocumentStorageSnapshot {
  if (encrypted.version !== DOCUMENT_BACKUP_VERSION) {
    throw new Error(
      `Unsupported document backup version: ${encrypted.version}`,
    );
  }

  const keyBytes = deriveBackupKeyBytes(mnemonic);
  const decipher = forge.cipher.createDecipher(
    'AES-GCM',
    forgeBufferFromBytes(keyBytes),
  );

  const iv = Buffer.from(encrypted.nonce, 'base64').toString('binary');
  const cipherText = Buffer.from(encrypted.cipherText, 'base64').toString(
    'binary',
  );
  const authTag = Buffer.from(encrypted.authTag, 'base64').toString('binary');

  decipher.start({
    iv,
    tagLength: 128,
    tag: forge.util.createBuffer(authTag),
  });
  decipher.update(forge.util.createBuffer(cipherText));

  if (!decipher.finish()) {
    throw new Error('Failed to decrypt document backup payload');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(decipher.output.toString());
  } catch {
    throw new Error('Invalid document backup payload: malformed JSON');
  }

  if (!isDocumentStorageSnapshot(parsed)) {
    throw new Error('Invalid document backup payload: unexpected structure');
  }

  return parsed;
}

async function buildBackupPayload(
  mnemonic: Mnemonic,
): Promise<CloudBackupPayload> {
  const payload: CloudBackupPayload = { mnemonic };
  const snapshot = await exportDocumentStorageSnapshot();

  if (snapshot) {
    payload.documents = encryptSnapshot(snapshot, mnemonic);
  }

  return payload;
}

export async function disableBackup() {
  if (Platform.OS === 'ios') {
    await disableIosBackup();
    return;
  }
  const gdrive = await createGDrive();
  if (!gdrive) {
    // User canceled Google sign-in; skip disabling backup gracefully.
    return;
  }
  const { files } = await gdrive.files.list({
    spaces: APP_DATA_FOLDER_ID,
    q: `name = '${FILE_NAME}'`,
  });

  const driveFiles: unknown[] = files;

  await Promise.all(
    driveFiles.map(file => {
      return isDriveFile(file) && file.id
        ? gdrive.files.delete(file.id)
        : Promise.resolve();
    }),
  );
}

export async function download(): Promise<CloudBackupPayload> {
  if (Platform.OS === 'ios') {
    return iosDownload();
  }

  const gdrive = await createGDrive();
  if (!gdrive) {
    throw new Error('User canceled Google sign-in');
  }
  const { files } = await gdrive.files.list({
    spaces: APP_DATA_FOLDER_ID,
    q: `name = '${FILE_NAME}'`,
  });

  const driveFiles: unknown[] = files;
  const firstFile = driveFiles[0];

  if (!isDriveFile(firstFile)) {
    throw new Error(
      'Couldnt find the encrypted backup, did you back it up previously?',
    );
  }
  const mnemonicString = await withRetries(() =>
    gdrive.files.getText(firstFile.id),
  );
  try {
    return parseBackupPayload(mnemonicString);
  } catch (e) {
    throw new Error(`Failed to parse mnemonic backup: ${(e as Error).message}`);
  }
}

export async function restoreDocumentsFromBackup(
  mnemonic: Mnemonic | undefined,
  encrypted?: EncryptedDocumentBackup | null,
): Promise<boolean> {
  if (!mnemonic) {
    console.warn('Cannot restore documents without mnemonic payload');
    return false;
  }

  if (!encrypted) {
    return false;
  }

  try {
    const snapshot = decryptSnapshot(encrypted, mnemonic);
    return await restoreDocumentStorageSnapshotIfEmpty(snapshot);
  } catch (error) {
    console.warn('Failed to restore encrypted document backup', error);
    return false;
  }
}

export async function upload(mnemonic: Mnemonic) {
  if (!mnemonic || !mnemonic.phrase) {
    throw new Error(
      'Mnemonic not set yet. Did the user see the recovery phrase?',
    );
  }
  const payload = await buildBackupPayload(mnemonic);
  if (Platform.OS === 'ios') {
    await iosUpload(payload);
  } else {
    const gdrive = await createGDrive();
    if (!gdrive) {
      throw new Error('User canceled Google sign-in');
    }
    await withRetries(() =>
      gdrive.files
        .newMultipartUploader()
        .setData(JSON.stringify(payload))
        .setDataMimeType(MIME_TYPES.application.json)
        .setRequestBody({ name: FILE_NAME, parents: [APP_DATA_FOLDER_ID] })
        .execute(),
    );
  }
}

export function useBackupMnemonic() {
  return useMemo(
    () => ({
      upload,
      download,
      disableBackup,
      restoreDocumentsFromBackup,
    }),
    [],
  );
}
