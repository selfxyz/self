import { describe, expect, it } from 'vitest';

import { createSelfClient, extractMRZInfo } from '../src/react-native';

describe('react-native entry', () => {
  it('exposes createSelfClient', () => {
    expect(typeof createSelfClient).toBe('function');
  });

  it('parses MRZ via react-native entry', () => {
    const sample = `P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<\nL898902C36UTO7408122F1204159ZE184226B<<<<<10`;
    const info = extractMRZInfo(sample);
    expect(info.passportNumber).toBe('L898902C3');
    expect(info.validation.overall).toBe(true);
  });
});
