// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import {
  birthDateToDisplay,
  expiryDateToDisplay,
  pickerDateToYYMMDD,
} from '@/utils/yymmdd';

describe('birthDateToDisplay', () => {
  it('formats year > 30 as 1900s', () => {
    expect(birthDateToDisplay('900117')).toBe('Jan 17 1990');
  });

  it('formats year <= 30 as 2000s', () => {
    expect(birthDateToDisplay('260115')).toBe('Jan 15 2026');
  });

  it('returns empty string for invalid input', () => {
    expect(birthDateToDisplay('')).toBe('');
    expect(birthDateToDisplay('12345')).toBe('');
  });
});

describe('expiryDateToDisplay', () => {
  it('always formats as 2000s', () => {
    expect(expiryDateToDisplay('341219')).toBe('Dec 19 2034');
  });

  it('formats year <= 30 as 2000s', () => {
    expect(expiryDateToDisplay('301231')).toBe('Dec 31 2030');
  });
});

describe('pickerDateToYYMMDD', () => {
  it('converts date to YYMMDD string', () => {
    expect(pickerDateToYYMMDD(new Date(1990, 0, 17))).toBe('900117');
  });

  it('pads single-digit month and day', () => {
    expect(pickerDateToYYMMDD(new Date(2030, 0, 5))).toBe('300105');
  });
});
