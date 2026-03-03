// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { DocumentCategory, PassportData } from '@selfxyz/common/types';

import type { SelfClient } from '../../types/public';

export const getMappingKey = (
  circuitType: 'disclose' | 'register' | 'dsc',
  documentCategory: DocumentCategory,
): string => {
  if (circuitType === 'disclose') {
    if (documentCategory === 'passport') return 'DISCLOSE';
    if (documentCategory === 'id_card') return 'DISCLOSE_ID';
    if (documentCategory === 'aadhaar') return 'DISCLOSE_AADHAAR';
    if (documentCategory === 'kyc') return 'DISCLOSE_KYC';
    throw new Error(`Unsupported document category for disclose: ${documentCategory}`);
  }
  if (circuitType === 'register') {
    if (documentCategory === 'passport') return 'REGISTER';
    if (documentCategory === 'id_card') return 'REGISTER_ID';
    if (documentCategory === 'aadhaar') return 'REGISTER_AADHAAR';
    if (documentCategory === 'kyc') return 'REGISTER_KYC';
    throw new Error(`Unsupported document category for register: ${documentCategory}`);
  }
  // circuitType === 'dsc'
  return documentCategory === 'passport' ? 'DSC' : 'DSC_ID';
};

export const resolveWebSocketUrl = (
  selfClient: SelfClient,
  circuitType: 'disclose' | 'register' | 'dsc',
  passportData: PassportData,
  circuitName: string,
): string | undefined => {
  const { documentCategory } = passportData;
  const circuitsMapping = selfClient.getProtocolState()[documentCategory].circuits_dns_mapping;
  const mappingKey = getMappingKey(circuitType, documentCategory);

  return circuitsMapping?.[mappingKey]?.[circuitName];
};
