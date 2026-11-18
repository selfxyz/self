// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { render } from '@testing-library/react-native';

import IdCardRevealed from '@/components/homescreen/IdCardRevealed';

const MRZ =
  'P<USADOE<<JOHN<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<1VHE2FXLM4USA0511181M3111185<<<<<<<<<<<<<<02';

jest.mock('react-native', () => ({
  __esModule: true,
  Dimensions: { get: () => ({ width: 400, height: 800 }) },
}));

jest.mock('tamagui', () => {
  const Pass = ({ children, ...props }: any) => (
    <div {...props}>{children}</div>
  );
  return {
    __esModule: true,
    Separator: () => null,
    Text: ({ children, ...props }: any) => <span {...props}>{children}</span>,
    XStack: Pass,
    YStack: Pass,
  };
});

jest.mock('@selfxyz/common/constants', () => ({
  __esModule: true,
  commonNames: { USA: 'United States of America' },
}));

jest.mock('@selfxyz/common/utils/types', () => ({
  __esModule: true,
  isAadhaarDocument: (d: any) => d?.documentCategory === 'aadhaar',
  isMRZDocument: (d: any) =>
    d?.documentCategory === 'passport' || d?.documentCategory === 'id_card',
}));

jest.mock('@selfxyz/mobile-sdk-alpha/constants/colors', () => ({
  __esModule: true,
  black: '#000',
  separatorColor: '#eee',
  slate100: '#f1f5f9',
  slate400: '#94a3b8',
  white: '#fff',
}));

jest.mock('@selfxyz/mobile-sdk-alpha/constants/fonts', () => ({
  __esModule: true,
  dinot: 'DINOT',
  plexMono: 'PlexMono',
}));

jest.mock('@/components/homescreen/IdAttribute', () => ({
  __esModule: true,
  default: ({ name, value }: any) => <span>{`${name}:${value}`}</span>,
}));

jest.mock('@/components/homescreen/SvgXmlWrapper', () => ({
  __esModule: true,
  SvgXml: () => null,
}));

jest.mock('@/utils/documentAttributes', () => ({
  __esModule: true,
  formatDateFromYYMMDD: (value: string) => value,
  getDocumentAttributes: () => ({
    nameSlice: 'DOE<<JOHN',
    passNoSlice: '1VHE2FXLM',
    sexSlice: 'M',
    nationalitySlice: 'USA',
    issuingStateSlice: 'USA',
    dobSlice: '051118',
    expiryDateSlice: '311118',
  }),
  getNameAndSurname: () => ({ surname: ['DOE'], names: ['JOHN'] }),
}));

const passport = (mock: boolean) =>
  ({ documentCategory: 'passport', mock, mrz: MRZ }) as any;

describe('IdCardRevealed', () => {
  it('presents a real passport as verified with its authority and MRZ', () => {
    const json = JSON.stringify(
      render(<IdCardRevealed idDocument={passport(false)} />).toJSON(),
    );

    expect(json).toContain('Verified Biometric Passport');
    expect(json).toContain('AUTHORITY:United States of America');
    expect(json).toContain(MRZ.slice(0, 44));
    expect(json).not.toContain('TEST DATA');
  });

  it('never presents test data as a verified or government-issued document', () => {
    const json = JSON.stringify(
      render(<IdCardRevealed idDocument={passport(true)} />).toJSON(),
    );

    expect(json).toContain('Test Passport');
    expect(json).toContain('TEST DATA');
    expect(json).toContain('Not a valid document');
    expect(json).toContain('SAMPLE - NOT A VALID DOCUMENT');
    expect(json).toContain('AUTHORITY:Self test issuer');
    expect(json).not.toContain('Verified');
    expect(json).not.toContain('AUTHORITY:United States of America');
    expect(json).not.toContain(MRZ.slice(0, 44));
  });
});
