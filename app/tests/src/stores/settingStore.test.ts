// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import {
  migrateSettingStore,
  SETTING_STORE_VERSION,
} from '@/stores/settingStore';

describe('migrateSettingStore', () => {
  it('forces supportUuidEnabled off and clears supportUuid when upgrading from v0', () => {
    const migrated = migrateSettingStore(
      {
        supportUuidEnabled: true,
        supportUuid: '11111111-1111-1111-1111-111111111111',
        cloudBackupEnabled: true,
      },
      0,
    );

    expect(migrated.supportUuidEnabled).toBe(false);
    expect(migrated.supportUuid).toBeNull();
    // Unrelated fields are preserved.
    expect(migrated.cloudBackupEnabled).toBe(true);
  });

  it('forces supportUuidEnabled off even if previously disabled (idempotent)', () => {
    const migrated = migrateSettingStore(
      { supportUuidEnabled: false, supportUuid: null },
      0,
    );

    expect(migrated.supportUuidEnabled).toBe(false);
    expect(migrated.supportUuid).toBeNull();
  });

  it('leaves state untouched when already at the current version', () => {
    const migrated = migrateSettingStore(
      {
        supportUuidEnabled: true,
        supportUuid: '22222222-2222-2222-2222-222222222222',
      },
      SETTING_STORE_VERSION,
    );

    expect(migrated.supportUuidEnabled).toBe(true);
    expect(migrated.supportUuid).toBe('22222222-2222-2222-2222-222222222222');
  });

  it('handles missing persisted state', () => {
    const migrated = migrateSettingStore(undefined, 0);

    expect(migrated.supportUuidEnabled).toBe(false);
    expect(migrated.supportUuid).toBeNull();
  });
});
