import { getPostVerificationRoute } from '../../../src/utils/proving/provingMachine';
import { useSettingStore } from '../../../src/stores/settingStore';

describe('getPostVerificationRoute', () => {
  afterEach(() => {
    useSettingStore.setState({ cloudBackupEnabled: false });
  });

  it('returns SaveRecoveryPhrase when cloud backup disabled', () => {
    useSettingStore.setState({ cloudBackupEnabled: false });
    expect(getPostVerificationRoute()).toBe('SaveRecoveryPhrase');
  });

  it('returns AccountVerifiedSuccess when cloud backup enabled', () => {
    useSettingStore.setState({ cloudBackupEnabled: true });
    expect(getPostVerificationRoute()).toBe('AccountVerifiedSuccess');
  });
});
