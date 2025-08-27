import { act, renderHook } from '@testing-library/react-native';

import { SelfClient } from '@selfxyz/mobile-sdk-alpha';

import { useProvingStore } from '@/utils/proving/provingMachine';

jest.mock('@/navigation', () => ({
  navigationRef: {
    isReady: jest.fn(() => true),
    navigate: jest.fn(),
  },
}));

jest.mock('@selfxyz/mobile-sdk-alpha/documents/utils', () => {
  return {
    loadSelectedDocument: jest.fn().mockResolvedValue(null),
  };
});

describe('provingMachine registration completion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('initializes proving machine for confirmed registration - no document found', async () => {
    const { result: initHook } = renderHook(() =>
      useProvingStore(state => state.init),
    );
    const selfClient = {} as SelfClient;

    expect(initHook.current).toBeDefined();

    await act(async () => {
      await initHook.current(selfClient, 'register');
    });

    const { result: provingStoreHook } = renderHook(() =>
      useProvingStore(state => state.currentState),
    );

    expect(provingStoreHook.current).toBe('passport_data_not_found');
  });
});
