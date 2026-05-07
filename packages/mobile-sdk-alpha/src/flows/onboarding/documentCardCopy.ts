// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { commonNames } from '@selfxyz/common/constants/countries';

const COUNTRY_ADJECTIVES: Record<string, string> = {
  USA: 'American',
  GBR: 'British',
  CAN: 'Canadian',
  AUS: 'Australian',
  IND: 'Indian',
  DEU: 'German',
  'D<<': 'German',
  FRA: 'French',
  JPN: 'Japanese',
  KOR: 'Korean',
  BRA: 'Brazilian',
  MEX: 'Mexican',
  ITA: 'Italian',
  ESP: 'Spanish',
  NLD: 'Dutch',
  PRT: 'Portuguese',
  CHN: 'Chinese',
  RUS: 'Russian',
  KEN: 'Kenyan',
  NGA: 'Nigerian',
  ZAF: 'South African',
  SGP: 'Singaporean',
  MYS: 'Malaysian',
  PHL: 'Philippine',
  IDN: 'Indonesian',
  THA: 'Thai',
  VNM: 'Vietnamese',
  ARE: 'Emirati',
  SAU: 'Saudi',
  EGY: 'Egyptian',
  TUR: 'Turkish',
  POL: 'Polish',
  SWE: 'Swedish',
  NOR: 'Norwegian',
  DNK: 'Danish',
  FIN: 'Finnish',
  CHE: 'Swiss',
  AUT: 'Austrian',
  BEL: 'Belgian',
  IRL: 'Irish',
  NZL: 'New Zealand',
  ARG: 'Argentine',
  COL: 'Colombian',
  PER: 'Peruvian',
  CHL: 'Chilean',
};

const KYC_DOC_TYPE = 'kyc';

function normalizeCountryCode(countryCode: string): string {
  const upper = countryCode.toUpperCase().trim();
  if (upper.startsWith('D') && upper.includes('<')) {
    return 'D<<';
  }
  return upper.replace(/</g, '');
}

function getCountryAdjective(countryCode: string): string {
  const normalized = normalizeCountryCode(countryCode);
  return COUNTRY_ADJECTIVES[normalized] ?? commonNames[normalized as keyof typeof commonNames] ?? normalized;
}

function getCountryName(countryCode: string): string {
  const normalized = normalizeCountryCode(countryCode);
  return commonNames[normalized as keyof typeof commonNames] ?? normalized;
}

export function getDocumentDisplayTitle(docType: string, countryCode: string): string {
  switch (docType) {
    case 'p':
      return `${getCountryAdjective(countryCode)} Passport`;
    case 'i':
      return `${getCountryAdjective(countryCode)} ID card`;
    case 'a':
      return `${getCountryAdjective(countryCode)} Aadhaar`;
    case KYC_DOC_TYPE:
      return 'Other IDs';
    default:
      return 'Unknown Document';
  }
}

export function getDocumentDisplaySubtitle(docType: string, countryCode: string): string | null {
  switch (docType) {
    case 'p':
      return 'Verified Passport';
    case 'i':
      return 'Verified ID card';
    case 'a':
      return `Verified ${getCountryName(countryCode)} Aadhaar`;
    case KYC_DOC_TYPE:
      return "National ID, Driver's License etc.";
    default:
      return null;
  }
}
