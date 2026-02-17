// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { calculateFirstDifference } from './diffCalculator';

describe('calculateFirstDifference', () => {
  it('returns null when strings are identical', () => {
    expect(calculateFirstDifference('ABC', 'ABC')).toBeNull();
    expect(calculateFirstDifference('', '')).toBeNull();
    expect(calculateFirstDifference('12345', '12345')).toBeNull();
  });

  it('returns first character difference for substitution', () => {
    expect(calculateFirstDifference('CHANGED', 'CH4NG3D')).toEqual({
      original: 'A',
      changed: '4'
    });
    
    expect(calculateFirstDifference('ABC', 'XBC')).toEqual({
      original: 'A',
      changed: 'X'
    });
  });

  it('handles length differences when one string is longer', () => {
    expect(calculateFirstDifference('ABC', 'ABCD')).toEqual({
      original: '',
      changed: 'D'
    });
    
    expect(calculateFirstDifference('ABCD', 'ABC')).toEqual({
      original: 'D',
      changed: ''
    });
  });

  it('returns first difference even when multiple differences exist', () => {
    expect(calculateFirstDifference('ABC123', 'XYZ456')).toEqual({
      original: 'A',
      changed: 'X'
    });
  });

  it('handles empty strings', () => {
    expect(calculateFirstDifference('', 'A')).toEqual({
      original: '',
      changed: 'A'
    });
    
    expect(calculateFirstDifference('A', '')).toEqual({
      original: 'A',
      changed: ''
    });
  });

  it('handles real passport data examples', () => {
    expect(calculateFirstDifference('ABC1234567890', 'ABC12X4567890')).toEqual({
      original: '3',
      changed: 'X'
    });
    
    expect(calculateFirstDifference('1988-05-17', '1988-05-16')).toEqual({
      original: '7',
      changed: '6'
    });
    
    expect(calculateFirstDifference('2028-01-01', '2028-01-02')).toEqual({
      original: '1',
      changed: '2'
    });
  });
});