import { jest } from '@jest/globals';
import { useProvingStore } from '../../../src/utils/proving/provingMachine';
import { emitState } from './actorMock';

jest.mock('xstate', () => {
  const actual = jest.requireActual('xstate');
  const { actorMock } = require('./actorMock');
  return { ...actual, createActor: jest.fn(() => actorMock) };
});

jest.mock('../../../src/providers/passportDataProvider', () => ({
  loadSelectedDocument: jest.fn(),
}));

jest.mock('../../../src/providers/authProvider', () => ({
  unsafe_getPrivateKey: jest.fn(),
}));

jest.mock('../../../src/utils/analytics', () => () => ({ trackEvent: jest.fn() }));

const { loadSelectedDocument } = require('../../../src/providers/passportDataProvider');
const { unsafe_getPrivateKey } = require('../../../src/providers/authProvider');
const { actorMock } = require('./actorMock');

describe('provingMachine init', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useProvingStore.setState({});
  });

  it('handles missing document', async () => {
    loadSelectedDocument.mockResolvedValue(null);
    await useProvingStore.getState().init('register');
    expect(actorMock.send).toHaveBeenCalledWith({ type: 'PASSPORT_DATA_NOT_FOUND' });
    emitState('passport_data_not_found');
    expect(useProvingStore.getState().currentState).toBe('passport_data_not_found');
  });

  it('initializes state with document and secret', async () => {
    loadSelectedDocument.mockResolvedValue({ data: { documentCategory: 'passport', mock: false } });
    unsafe_getPrivateKey.mockResolvedValue('mysecret');
    await useProvingStore.getState().init('register');
    expect(useProvingStore.getState().passportData).toEqual({ documentCategory: 'passport', mock: false });
    expect(useProvingStore.getState().secret).toBe('mysecret');
    expect(useProvingStore.getState().env).toBe('prod');
    expect(useProvingStore.getState().circuitType).toBe('register');
  });
});
