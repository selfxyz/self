// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import {
  migrateSettingStore,
  SETTING_STORE_VERSION,
  useSettingStore,
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

describe('useSettingStore test registration circuit flag', () => {
  afterEach(() => {
    useSettingStore.setState(useSettingStore.getInitialState(), true);
  });

  it('arms once and clears on first consume', () => {
    expect(useSettingStore.getState().testRegistrationCircuitArmed).toBe(false);

    useSettingStore.getState().armTestRegistrationCircuit();

    expect(useSettingStore.getState().testRegistrationCircuitArmed).toBe(true);
    expect(useSettingStore.getState().consumeTestRegistrationCircuit()).toBe(
      true,
    );
    expect(useSettingStore.getState().testRegistrationCircuitArmed).toBe(false);
    expect(useSettingStore.getState().consumeTestRegistrationCircuit()).toBe(
      false,
    );
  });

  it('excludes the test registration circuit flag from persisted state', () => {
    useSettingStore.getState().armTestRegistrationCircuit();

    const partialize = useSettingStore.persist.getOptions().partialize;
    const persistedState = partialize?.(useSettingStore.getState());

    expect(persistedState).toBeDefined();
    expect(persistedState).not.toHaveProperty('testRegistrationCircuitArmed');
    expect(persistedState).not.toHaveProperty('armTestRegistrationCircuit');
    expect(persistedState).not.toHaveProperty('consumeTestRegistrationCircuit');
  });
});

describe('useSettingStore test DSC circuit flag', () => {
  afterEach(() => {
    useSettingStore.setState(useSettingStore.getInitialState(), true);
  });

  it('arms once and clears on first consume', () => {
    expect(useSettingStore.getState().testDscCircuitArmed).toBe(false);

    useSettingStore.getState().armTestDscCircuit();

    expect(useSettingStore.getState().testDscCircuitArmed).toBe(true);
    expect(useSettingStore.getState().consumeTestDscCircuit()).toBe(true);
    expect(useSettingStore.getState().testDscCircuitArmed).toBe(false);
    expect(useSettingStore.getState().consumeTestDscCircuit()).toBe(false);
  });

  it('is independent of the test registration circuit flag', () => {
    useSettingStore.getState().armTestDscCircuit();

    expect(useSettingStore.getState().testDscCircuitArmed).toBe(true);
    expect(useSettingStore.getState().testRegistrationCircuitArmed).toBe(false);
    expect(useSettingStore.getState().consumeTestRegistrationCircuit()).toBe(
      false,
    );
    // Consuming the registration flag must not clear the DSC arm.
    expect(useSettingStore.getState().testDscCircuitArmed).toBe(true);
  });

  it('excludes the test DSC circuit flag from persisted state', () => {
    useSettingStore.getState().armTestDscCircuit();

    const partialize = useSettingStore.persist.getOptions().partialize;
    const persistedState = partialize?.(useSettingStore.getState());

    expect(persistedState).toBeDefined();
    expect(persistedState).not.toHaveProperty('testDscCircuitArmed');
    expect(persistedState).not.toHaveProperty('armTestDscCircuit');
    expect(persistedState).not.toHaveProperty('consumeTestDscCircuit');
  });
});
