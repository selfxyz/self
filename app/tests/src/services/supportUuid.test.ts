// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import Clipboard from '@react-native-clipboard/clipboard';

import { setSupportUuidInSentry } from '@/config/sentry';
import {
  resetAnalyticsIdentityForSupportUuid,
  setAnalyticsSupportUuid,
} from '@/services/analytics';
import {
  appendSupportUuidToUrl,
  copySupportUuid,
  getSupportUuid,
  initializeSupportUuidContext,
  regenerateSupportUuid,
} from '@/services/supportUuid';
import { useSettingStore } from '@/stores/settingStore';

jest.mock('@/stores/settingStore', () => {
  const state = { supportUuid: null as string | null };
  const setSupportUuid = jest.fn((next: string | null) => {
    state.supportUuid = next;
  });
  return {
    useSettingStore: {
      getState: () => ({
        get supportUuid() {
          return state.supportUuid;
        },
        setSupportUuid,
      }),
      __state: state,
      __setSupportUuid: setSupportUuid,
    },
  };
});

jest.mock('@/config/sentry', () => ({
  setSupportUuidInSentry: jest.fn(),
}));

jest.mock('@/services/analytics', () => ({
  setAnalyticsSupportUuid: jest.fn(),
  resetAnalyticsIdentityForSupportUuid: jest.fn(),
}));

jest.mock('@react-native-clipboard/clipboard', () => ({
  __esModule: true,
  default: { setString: jest.fn() },
}));

const storeState = (
  useSettingStore as unknown as { __state: { supportUuid: string | null } }
).__state;
const mockSetSupportUuid = (
  useSettingStore as unknown as { __setSupportUuid: jest.Mock }
).__setSupportUuid;

describe('supportUuid service', () => {
  beforeEach(() => {
    storeState.supportUuid = null;
    jest.clearAllMocks();
  });

  describe('getSupportUuid', () => {
    it('generates and persists a UUID on first call', () => {
      const uuid = getSupportUuid();
      expect(uuid).toMatch(/^[0-9a-f-]{36}$/);
      expect(mockSetSupportUuid).toHaveBeenCalledWith(uuid);
    });

    it('returns the persisted UUID on subsequent calls', () => {
      storeState.supportUuid = '11111111-1111-1111-1111-111111111111';
      expect(getSupportUuid()).toBe(storeState.supportUuid);
      expect(mockSetSupportUuid).not.toHaveBeenCalled();
    });
  });

  describe('appendSupportUuidToUrl', () => {
    beforeEach(() => {
      storeState.supportUuid = '22222222-2222-2222-2222-222222222222';
    });

    it('adds support_uuid to a normal URL', () => {
      const result = appendSupportUuidToUrl('https://example.com/help');
      expect(result).toBe(
        `https://example.com/help?support_uuid=${storeState.supportUuid}`,
      );
    });

    it('merges with existing query params', () => {
      const result = appendSupportUuidToUrl('https://example.com/help?x=1');
      expect(result).toContain('x=1');
      expect(result).toContain(`support_uuid=${storeState.supportUuid}`);
    });

    it('overwrites an existing support_uuid query param', () => {
      const result = appendSupportUuidToUrl(
        'https://example.com/help?support_uuid=stale',
      );
      expect(result).toContain(`support_uuid=${storeState.supportUuid}`);
      expect(result).not.toContain('support_uuid=stale');
    });

    it('preserves fragments when falling back on malformed URLs', () => {
      const urlSpy = jest.spyOn(global, 'URL').mockImplementationOnce(() => {
        throw new TypeError('invalid');
      });
      const result = appendSupportUuidToUrl('support?x=1#section');
      expect(result).toBe(
        `support?x=1&support_uuid=${storeState.supportUuid}#section`,
      );
      urlSpy.mockRestore();
    });
  });

  describe('initializeSupportUuidContext', () => {
    it('wires the UUID into Sentry and analytics', () => {
      const uuid = initializeSupportUuidContext();
      expect(setSupportUuidInSentry).toHaveBeenCalledWith(uuid);
      expect(setAnalyticsSupportUuid).toHaveBeenCalledWith(uuid);
    });
  });

  describe('regenerateSupportUuid', () => {
    it('rotates the UUID and propagates to Sentry + analytics', () => {
      storeState.supportUuid = 'old-uuid';
      const next = regenerateSupportUuid();

      expect(next).not.toBe('old-uuid');
      expect(mockSetSupportUuid).toHaveBeenCalledWith(next);
      expect(setSupportUuidInSentry).toHaveBeenCalledTimes(1);
      expect(setSupportUuidInSentry).toHaveBeenCalledWith(next);
      expect(resetAnalyticsIdentityForSupportUuid).toHaveBeenCalledWith(next);
    });
  });

  describe('copySupportUuid', () => {
    it('copies the current UUID to the clipboard', () => {
      storeState.supportUuid = '33333333-3333-3333-3333-333333333333';
      const uuid = copySupportUuid();
      expect(uuid).toBe(storeState.supportUuid);
      expect(Clipboard.setString).toHaveBeenCalledWith(storeState.supportUuid);
    });
  });
});
