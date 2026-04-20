// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { v4 as uuidv4 } from 'uuid';
import Clipboard from '@react-native-clipboard/clipboard';

import { setSupportUuidInSentry } from '@/config/sentry';
import {
  resetAnalyticsIdentityForSupportUuid,
  setAnalyticsSupportUuid,
} from '@/services/analytics';
import { useSettingStore } from '@/stores/settingStore';

const ensureSupportUuid = (): string | null => {
  const state = useSettingStore.getState();
  if (!state.supportUuidEnabled) {
    return null;
  }

  if (state.supportUuid) {
    return state.supportUuid;
  }

  const nextUuid = uuidv4();
  state.setSupportUuid(nextUuid);
  return nextUuid;
};

export const appendSupportUuidToUrl = (url: string): string => {
  const supportUuid = ensureSupportUuid();
  if (!supportUuid) {
    return url;
  }

  try {
    const parsed = new URL(url);
    parsed.searchParams.set('support_uuid', supportUuid);
    return parsed.toString();
  } catch {
    // Fallback for malformed URLs / unsupported URL parsing edge-cases.
    // Preserve any fragment by appending the query before `#`.
    const hashIndex = url.indexOf('#');
    const baseUrl = hashIndex === -1 ? url : url.slice(0, hashIndex);
    const hash = hashIndex === -1 ? '' : url.slice(hashIndex);
    const separator = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${separator}support_uuid=${encodeURIComponent(supportUuid)}${hash}`;
  }
};

export const copySupportUuid = (): string | null => {
  const supportUuid = ensureSupportUuid();
  if (!supportUuid) {
    return null;
  }

  Clipboard.setString(supportUuid);
  return supportUuid;
};

export const getSupportUuid = (): string | null => {
  return ensureSupportUuid();
};

export const initializeSupportUuidContext = (): string | null => {
  const { supportUuidEnabled } = useSettingStore.getState();
  const supportUuid = ensureSupportUuid();
  setSupportUuidInSentry(supportUuid, supportUuidEnabled);
  setAnalyticsSupportUuid(supportUuidEnabled ? supportUuid : null);
  return supportUuid;
};

export const regenerateSupportUuid = (): string | null => {
  const state = useSettingStore.getState();
  if (!state.supportUuidEnabled) {
    return null;
  }

  const nextUuid = uuidv4();
  state.setSupportUuid(nextUuid);

  setSupportUuidInSentry(nextUuid, true);
  resetAnalyticsIdentityForSupportUuid(nextUuid);

  return nextUuid;
};

export const setSupportUuidCollectionEnabled = (
  enabled: boolean,
): string | null => {
  const state = useSettingStore.getState();

  if (enabled === state.supportUuidEnabled) {
    return enabled ? ensureSupportUuid() : null;
  }

  state.setSupportUuidEnabled(enabled);

  if (!enabled) {
    state.setSupportUuid(null);
    setSupportUuidInSentry(null, false);
    setAnalyticsSupportUuid(null);
    return null;
  }

  const nextUuid = uuidv4();
  state.setSupportUuid(nextUuid);
  setSupportUuidInSentry(nextUuid, true);
  resetAnalyticsIdentityForSupportUuid(nextUuid);
  return nextUuid;
};
