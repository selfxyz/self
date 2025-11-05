// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { vi } from 'vitest';

const mockMRZStore = {
  getMRZ: vi.fn(() => ({
    documentNumber: 'L898902C3',
    dateOfBirth: '740812',
    dateOfExpiry: '120415',
  })),
};

const mockUseMRZStore = vi.fn((selector: any) => selector(mockMRZStore));

export const useSelfClient = vi.fn(() => ({
  useMRZStore: mockUseMRZStore,
  scanNFC: vi.fn(),
  emit: vi.fn(),
}));

export const extractMRZInfo = vi.fn((_mrz: string) => {
  return {
    documentNumber: 'L898902C3',
    dateOfBirth: '740812',
    dateOfExpiry: '120415',
    issuingCountry: 'UTO',
    documentType: 'P',
    validation: {
      format: true,
      passportNumberChecksum: true,
      dateOfBirthChecksum: true,
      dateOfExpiryChecksum: true,
      compositeChecksum: true,
      overall: true,
    },
  };
});

export const formatDateToYYMMDD = vi.fn((date: Date) => {
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}${month}${day}`;
});
