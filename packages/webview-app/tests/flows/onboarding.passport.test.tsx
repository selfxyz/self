// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest';

import { currentPath, renderWithBridge } from '../utils/renderWithBridge';

import { cleanup, waitFor } from '@testing-library/react';

const MRZ_FIXTURE = {
  documentNumber: 'P1234567',
  dateOfBirth: '900115',
  dateOfExpiry: '300115',
};

// A minimally-valid reader payload (Android io.tradle.nfc shape) that the
// PassportData normalizer in NfcRoute can convert without throwing.
const CHIP_FIXTURE = {
  mrz: 'P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<L898902C36UTO7408122F1204159ZE184226B<<<<<10',
  documentSigningCertificate: '-----BEGIN CERTIFICATE-----\nMIICdummy\n-----END CERTIFICATE-----',
  eContent: 'AQIDBA==', // signed attributes
  encapContent: 'AQIDBA==', // encapsulated content -> PassportData.eContent
  encryptedDigest: 'AQIDBA==',
  dataGroupHashes: { '1': 'aabb', '2': 'ccdd' },
};

describe('passport onboarding flow', () => {
  afterEach(cleanup);

  it('happy path: MRZ scan -> NFC scan -> success route', async () => {
    const result = renderWithBridge({
      initialEntries: ['/capture/passport/code-scan-viewfinder'],
      setupHandlers: mock => {
        mock.handleWith('camera', 'scanMRZ', MRZ_FIXTURE);
        mock.handleWith('nfc', 'scanPassport', CHIP_FIXTURE);
      },
    });

    await waitFor(() => expect(currentPath(result)).toBe('/capture/passport/nfc-success'));

    // The captured document must be persisted over the documents bridge
    // domain (host store), not tunneled through secureStorage.
    expect(result.documents.byId.size).toBe(1);
    const catalog = result.documents.catalog.value as {
      documents: Array<{ id: string; isRegistered: boolean }>;
      selectedDocumentId?: string;
    };
    expect(catalog.documents).toHaveLength(1);
    expect(catalog.documents[0].isRegistered).toBe(false);
    // Document ids are content hashes, never document numbers — keychain
    // service names derived from the id leak into native logs.
    const [docId] = result.documents.byId.keys();
    expect(catalog.documents[0].id).toBe(docId);
    expect(catalog.selectedDocumentId).toBe(docId);
    expect(docId).not.toContain('L898902C3'); // chip MRZ document number
    expect(docId).not.toContain(MRZ_FIXTURE.documentNumber);
  });

  it('NFC failure routes to the error screen and shows the support reference', async () => {
    const result = renderWithBridge({
      initialEntries: [{ pathname: '/capture/passport/nfc', state: { mrz: MRZ_FIXTURE } }],
      config: { mode: 'self-app', referenceId: 'ref-passport-nfc' },
      setupHandlers: mock => {
        mock.handleWithError('nfc', 'scanPassport', { code: 'NFC_READ_FAILED', message: 'chip read failed' });
      },
    });

    await waitFor(() => expect(currentPath(result)).toBe('/capture/passport/nfc-error'));
    await waitFor(() => expect(result.getByText('Reference: ref-passport-nfc')).toBeTruthy());
  });
});
