// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';

/**
 * ISO 3166-1 alpha-3 to alpha-2 mapping.
 * Used to convert 3-letter country codes (used in passport MRZ)
 * to 2-letter codes (used for flag emojis and Intl.DisplayNames).
 */
const alpha3ToAlpha2: Record<string, string> = {
  ABW: 'AW', AFG: 'AF', AGO: 'AO', AIA: 'AI', ALA: 'AX', ALB: 'AL',
  AND: 'AD', ARE: 'AE', ARG: 'AR', ARM: 'AM', ASM: 'AS', ATA: 'AQ',
  ATF: 'TF', ATG: 'AG', AUS: 'AU', AUT: 'AT', AZE: 'AZ', BDI: 'BI',
  BEL: 'BE', BEN: 'BJ', BES: 'BQ', BFA: 'BF', BGD: 'BD', BGR: 'BG',
  BHR: 'BH', BHS: 'BS', BIH: 'BA', BLM: 'BL', BLR: 'BY', BLZ: 'BZ',
  BMU: 'BM', BOL: 'BO', BRA: 'BR', BRB: 'BB', BRN: 'BN', BTN: 'BT',
  BVT: 'BV', BWA: 'BW', CAF: 'CF', CAN: 'CA', CCK: 'CC', CHE: 'CH',
  CHL: 'CL', CHN: 'CN', CIV: 'CI', CMR: 'CM', COD: 'CD', COG: 'CG',
  COK: 'CK', COL: 'CO', COM: 'KM', CPV: 'CV', CRI: 'CR', CUB: 'CU',
  CUW: 'CW', CXR: 'CX', CYM: 'KY', CYP: 'CY', CZE: 'CZ', DJI: 'DJ',
  DMA: 'DM', DNK: 'DK', DOM: 'DO', DZA: 'DZ', ECU: 'EC', EGY: 'EG',
  ERI: 'ER', ESH: 'EH', ESP: 'ES', EST: 'EE', ETH: 'ET', FIN: 'FI',
  FJI: 'FJ', FLK: 'FK', FRA: 'FR', FRO: 'FO', FSM: 'FM', GAB: 'GA',
  GBR: 'GB', GEO: 'GE', GGY: 'GG', GHA: 'GH', GIB: 'GI', GIN: 'GN',
  GLP: 'GP', GMB: 'GM', GNB: 'GW', GNQ: 'GQ', GRC: 'GR', GRD: 'GD',
  GRL: 'GL', GTM: 'GT', GUF: 'GF', GUM: 'GU', GUY: 'GY', HKG: 'HK',
  HMD: 'HM', HND: 'HN', HRV: 'HR', HTI: 'HT', HUN: 'HU', IDN: 'ID',
  IMN: 'IM', IND: 'IN', IOT: 'IO', IRL: 'IE', IRN: 'IR', IRQ: 'IQ',
  ISL: 'IS', ISR: 'IL', ITA: 'IT', JAM: 'JM', JEY: 'JE', JOR: 'JO',
  JPN: 'JP', KAZ: 'KZ', KEN: 'KE', KGZ: 'KG', KHM: 'KH', KIR: 'KI',
  KNA: 'KN', KOR: 'KR', KWT: 'KW', LAO: 'LA', LBN: 'LB', LBR: 'LR',
  LBY: 'LY', LCA: 'LC', LIE: 'LI', LKA: 'LK', LSO: 'LS', LTU: 'LT',
  LUX: 'LU', LVA: 'LV', MAC: 'MO', MAF: 'MF', MAR: 'MA', MCO: 'MC',
  MDA: 'MD', MDG: 'MG', MDV: 'MV', MEX: 'MX', MHL: 'MH', MKD: 'MK',
  MLI: 'ML', MLT: 'MT', MMR: 'MM', MNE: 'ME', MNG: 'MN', MNP: 'MP',
  MOZ: 'MZ', MRT: 'MR', MSR: 'MS', MTQ: 'MQ', MUS: 'MU', MWI: 'MW',
  MYS: 'MY', MYT: 'YT', NAM: 'NA', NCL: 'NC', NER: 'NE', NFK: 'NF',
  NGA: 'NG', NIC: 'NI', NIU: 'NU', NLD: 'NL', NOR: 'NO', NPL: 'NP',
  NRU: 'NR', NZL: 'NZ', OMN: 'OM', PAK: 'PK', PAN: 'PA', PCN: 'PN',
  PER: 'PE', PHL: 'PH', PLW: 'PW', PNG: 'PG', POL: 'PL', PRI: 'PR',
  PRK: 'KP', PRT: 'PT', PRY: 'PY', PSE: 'PS', PYF: 'PF', QAT: 'QA',
  REU: 'RE', ROU: 'RO', RUS: 'RU', RWA: 'RW', SAU: 'SA', SDN: 'SD',
  SEN: 'SN', SGP: 'SG', SGS: 'GS', SHN: 'SH', SJM: 'SJ', SLB: 'SB',
  SLE: 'SL', SLV: 'SV', SMR: 'SM', SOM: 'SO', SPM: 'PM', SRB: 'RS',
  SSD: 'SS', STP: 'ST', SUR: 'SR', SVK: 'SK', SVN: 'SI', SWE: 'SE',
  SWZ: 'SZ', SXM: 'SX', SYC: 'SC', SYR: 'SY', TCA: 'TC', TCD: 'TD',
  TGO: 'TG', THA: 'TH', TJK: 'TJ', TKL: 'TK', TKM: 'TM', TLS: 'TL',
  TON: 'TO', TTO: 'TT', TUN: 'TN', TUR: 'TR', TUV: 'TV', TWN: 'TW',
  TZA: 'TZ', UGA: 'UG', UKR: 'UA', UMI: 'UM', URY: 'UY', USA: 'US',
  UZB: 'UZ', VAT: 'VA', VCT: 'VC', VEN: 'VE', VGB: 'VG', VIR: 'VI',
  VNM: 'VN', VUT: 'VU', WLF: 'WF', WSM: 'WS', YEM: 'YE', ZAF: 'ZA',
  ZMB: 'ZM', ZWE: 'ZW',
  'D<<': 'DE',
};

/**
 * Convert alpha-3 country code to alpha-2.
 * Falls back to first 2 chars if not found (e.g. custom codes like D<<, EUE).
 */
export const alpha3To2 = (code: string): string =>
  alpha3ToAlpha2[code] ?? code.slice(0, 2);

/**
 * Convert a 2-letter country code to a flag emoji using regional indicator symbols.
 */
const alpha2ToFlagEmoji = (twoLetter: string): string =>
  String.fromCodePoint(
    ...twoLetter
      .toUpperCase()
      .split('')
      .map(c => 0x1f1e6 + c.charCodeAt(0) - 65),
  );

/**
 * Get country name from alpha-3 code using Intl.DisplayNames.
 */
export const getCountryName = (code: string): string => {
  try {
    const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
    const name = regionNames.of(alpha3To2(code));
    if (name && name !== code) return name;
  } catch {
    // fallback
  }
  return code;
};

/**
 * Render a flag emoji for a given alpha-3 country code.
 * Used as the `renderFlag` callback for euclid-web screen components.
 */
export const renderFlag = (countryCode: string, size: number): React.ReactNode => (
  <span style={{ fontSize: size * 0.8, lineHeight: 1 }}>
    {alpha2ToFlagEmoji(alpha3To2(countryCode))}
  </span>
);
