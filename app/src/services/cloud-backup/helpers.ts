// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { Platform } from 'react-native';
import { CloudStorage, CloudStorageScope } from 'react-native-cloud-storage';

// Frozen literal: backups live at this path in users' cloud accounts, so it
// must never follow the package name (which has already changed once, from
// `openpassport`). Renaming the app must not move or orphan existing backups.
const folder = '/@selfxyz/mobile-app';
export const FILE_NAME = 'encrypted-private-key';
export const ENCRYPTED_FILE_PATH = `${folder}/${FILE_NAME}`;
// The name iOS gives a not-yet-downloaded iCloud item in directory listings.
export const PLACEHOLDER_FILE_PATH = `${folder}/.${FILE_NAME}.icloud`;
export const FOLDER = folder;

if (Platform.OS === 'ios') {
  CloudStorage.setProviderOptions({ scope: CloudStorageScope.AppData });
}
