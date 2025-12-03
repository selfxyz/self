// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { Platform } from 'react-native';
import { CloudStorage, CloudStorageScope } from 'react-native-cloud-storage';

import { name } from '../../../package.json';

const packageName = name?.startsWith('@') ? name : '@selfxyz/mobile-app';
const folder = `/${packageName}`;
export const ENCRYPTED_FILE_PATH = `/${folder}/encrypted-private-key`;
export const FILE_NAME = 'encrypted-private-key';
export const FOLDER = folder;

if (Platform.OS === 'ios') {
  CloudStorage.setProviderOptions({ scope: CloudStorageScope.AppData });
}
