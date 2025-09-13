import { useProtocolStore } from '@selfxyz/mobile-sdk-alpha/stores';

describe('protocol store singleton', () => {
  it('maintains single instance across imports', () => {
    const store1 = useProtocolStore;
    const store2 = require('@selfxyz/mobile-sdk-alpha/stores').useProtocolStore;
    expect(store1).toBe(store2);
    expect((store1 as any).__instanceId).toBe((store2 as any).__instanceId);
  });

  it('shares state across all references', () => {
    const initialState = useProtocolStore.getState();
    useProtocolStore.setState(s => ({
      ...s,
      passport: {
        ...s.passport,
        ofac_trees: {
          nameAndDob: { root: ['test'] },
          nameAndYob: { root: ['test'] },
          passportNoAndNationality: { root: ['test'] },
        } as any,
      },
    }));
    const newState = useProtocolStore.getState();
    expect(newState.passport.ofac_trees).toBeTruthy();
    expect(newState).not.toBe(initialState);
  });
});
