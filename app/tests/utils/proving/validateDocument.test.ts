// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import { PassportData } from '@selfxyz/common';

import { useProtocolStore } from '../../../src/stores/protocolStore';
import { checkPassportSupported } from '../../../src/utils/proving/validateDocument';

jest.mock('@selfxyz/common', () => {
  const actual = jest.requireActual('@selfxyz/common');
  return {
    ...actual,
    getCircuitNameFromPassportData: (_pd: any, type: string) =>
      type === 'register' ? 'register_rsa' : 'dsc_rsa',
  };
});

describe('checkPassportSupported', () => {
  const basePassportData: PassportData = {
    mrz: 'mrz',
    dsc: 'dsc',
    eContent: [],
    signedAttr: [],
    encryptedDigest: [],
    passportMetadata: {
      cscaFound: true,
      signatureAlgorithm: 'RSA',
      curveOrExponent: '',
    } as any,
    documentType: 'passport',
    documentCategory: 'passport',
    mock: false,
  };

  afterEach(() => {
    useProtocolStore.setState(state => ({
      passport: { ...state.passport, deployed_circuits: null },
    }));
  });

  it('returns protocol_data_missing when protocol data is absent', async () => {
    useProtocolStore.setState(state => ({
      passport: { ...state.passport, deployed_circuits: null },
    }));

    const result = await checkPassportSupported(basePassportData);
    expect(result.status).toBe('protocol_data_missing');
  });

  it('returns passport_supported when circuits are available', async () => {
    useProtocolStore.setState(state => ({
      passport: {
        ...state.passport,
        deployed_circuits: {
          REGISTER: ['register_rsa'],
          REGISTER_ID: ['register_rsa'],
          DSC: ['dsc_rsa'],
          DSC_ID: ['dsc_rsa'],
        },
      },
    }));

    const result = await checkPassportSupported(basePassportData);
    expect(result.status).toBe('passport_supported');
  });
});
