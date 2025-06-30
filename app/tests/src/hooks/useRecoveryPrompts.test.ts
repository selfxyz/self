import { renderHook } from '@testing-library/react-native';
import { navigationRef } from '../../../src/navigation';
import useRecoveryPrompts from '../../../src/hooks/useRecoveryPrompts';
import { useSettingStore } from '../../../src/stores/settingStore';
import { useModal } from '../../../src/hooks/useModal';

jest.mock('../../../src/hooks/useModal');
jest.mock('../../../src/navigation', () => ({
  navigationRef: {
    isReady: jest.fn(() => true),
    navigate: jest.fn(),
  },
}));

const showModal = jest.fn();
(useModal as jest.Mock).mockReturnValue({ showModal, visible: false });

describe('useRecoveryPrompts', () => {
  beforeEach(() => {
    showModal.mockClear();
    useSettingStore.setState({
      loginCount: 0,
      cloudBackupEnabled: false,
      hasViewedRecoveryPhrase: false,
    });
  });

  it('shows modal on first login', () => {
    useSettingStore.getState().incrementLoginCount();
    renderHook(() => useRecoveryPrompts());
    expect(showModal).toHaveBeenCalled();
  });

  it('does not show modal when login count is 4', () => {
    useSettingStore.setState({ loginCount: 4 });
    renderHook(() => useRecoveryPrompts());
    expect(showModal).not.toHaveBeenCalled();
  });

  it('shows modal on eighth login', () => {
    useSettingStore.setState({ loginCount: 8 });
    renderHook(() => useRecoveryPrompts());
    expect(showModal).toHaveBeenCalled();
  });

  it('does not show modal if backup already enabled', () => {
    useSettingStore.setState({ loginCount: 1, cloudBackupEnabled: true });
    renderHook(() => useRecoveryPrompts());
    expect(showModal).not.toHaveBeenCalled();
  });
});
