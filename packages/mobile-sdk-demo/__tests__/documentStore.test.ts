// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import AsyncStorage from '@react-native-async-storage/async-storage';

import type { PassportData } from '@selfxyz/common/dist/esm/src/utils/types.js';
import { generateMockDocument } from '@selfxyz/mobile-sdk-alpha';

import { inMemoryDocumentsAdapter, persistentDocumentsAdapter } from '../src/utils/documentStore';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
  getAllKeys: jest.fn(() => Promise.resolve([])),
  multiGet: jest.fn(() => Promise.resolve([])),
  multiSet: jest.fn(() => Promise.resolve()),
  multiRemove: jest.fn(() => Promise.resolve()),
}));

describe('documentStore - BigInt serialization fix', () => {
  // Create a simple in-memory storage for testing
  const storage = new Map<string, string>();

  beforeEach(() => {
    storage.clear();
    jest.clearAllMocks();

    // Setup AsyncStorage mock implementation
    (AsyncStorage.setItem as jest.Mock).mockImplementation((key: string, value: string) => {
      storage.set(key, value);
      return Promise.resolve();
    });

    (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
      return Promise.resolve(storage.get(key) || null);
    });

    (AsyncStorage.removeItem as jest.Mock).mockImplementation((key: string) => {
      storage.delete(key);
      return Promise.resolve();
    });

    (AsyncStorage.clear as jest.Mock).mockImplementation(() => {
      storage.clear();
      return Promise.resolve();
    });
  });

  describe('persistentDocumentsAdapter', () => {
    it('should properly restore dsc_parsed and passportMetadata after save/load cycle', async () => {
      // Generate a mock passport with parsed data
      const mockPassport = await generateMockDocument({
        age: 30,
        expiryYears: 5,
        isInOfacList: false,
        selectedAlgorithm: 'sha256 rsa 65537 2048',
        selectedCountry: 'USA',
        selectedDocumentType: 'mock_passport',
        firstName: 'John',
        lastName: 'Doe',
      });

      const passportData = mockPassport as PassportData;
      const documentId = 'test-passport-id';

      // Verify the generated passport has parsed data
      expect(passportData.dsc_parsed).toBeDefined();
      expect(passportData.passportMetadata).toBeDefined();
      expect(passportData.passportMetadata?.signatureAlgorithm).toBeDefined();
      expect(passportData.passportMetadata?.curveOrExponent).toBeDefined();

      // Save the document
      await persistentDocumentsAdapter.saveDocument(documentId, passportData);

      // Load the document back
      const loadedDoc = await persistentDocumentsAdapter.loadDocumentById(documentId);

      // Verify the document was loaded
      expect(loadedDoc).toBeDefined();
      expect(loadedDoc).not.toBeNull();

      const loadedPassport = loadedDoc as PassportData;

      // Verify parsed data was restored
      expect(loadedPassport.dsc_parsed).toBeDefined();
      expect(loadedPassport.passportMetadata).toBeDefined();
      expect(loadedPassport.passportMetadata?.signatureAlgorithm).toBeDefined();
      expect(loadedPassport.passportMetadata?.curveOrExponent).toBeDefined();

      // Verify key fields match
      expect(loadedPassport.mrz).toBe(passportData.mrz);
      expect(loadedPassport.dsc).toBe(passportData.dsc);
      expect(loadedPassport.documentType).toBe(passportData.documentType);
      expect(loadedPassport.documentCategory).toBe(passportData.documentCategory);
    });

    it('should allow BigInt operations on loaded document fields', async () => {
      // Generate a mock passport
      const mockPassport = await generateMockDocument({
        age: 25,
        expiryYears: 10,
        isInOfacList: false,
        selectedAlgorithm: 'sha256 rsa 65537 2048',
        selectedCountry: 'GBR',
        selectedDocumentType: 'mock_passport',
        firstName: 'Jane',
        lastName: 'Smith',
      });

      const passportData = mockPassport as PassportData;
      const documentId = 'test-bigint-passport';

      // Save and load
      await persistentDocumentsAdapter.saveDocument(documentId, passportData);
      const loadedDoc = await persistentDocumentsAdapter.loadDocumentById(documentId);

      expect(loadedDoc).toBeDefined();
      const loadedPassport = loadedDoc as PassportData;

      // These operations would throw "can't convert string to bigint" before the fix
      expect(() => {
        // Simulate what happens in generateCircuitInputsRegister
        const eContentSample = loadedPassport.eContent.slice(0, 5);
        eContentSample.forEach(byte => {
          const bigIntValue = BigInt(byte);
          expect(typeof bigIntValue).toBe('bigint');
        });
      }).not.toThrow();

      expect(() => {
        // Simulate signature processing
        const signatureSample = loadedPassport.encryptedDigest.slice(0, 5);
        signatureSample.forEach(byte => {
          const bigIntValue = BigInt(byte);
          expect(typeof bigIntValue).toBe('bigint');
        });
      }).not.toThrow();

      expect(() => {
        // Simulate signed attributes processing
        const signedAttrSample = loadedPassport.signedAttr.slice(0, 5);
        signedAttrSample.forEach(byte => {
          const bigIntValue = BigInt(byte);
          expect(typeof bigIntValue).toBe('bigint');
        });
      }).not.toThrow();
    });

    it('should handle array fields correctly after serialization', async () => {
      const mockPassport = await generateMockDocument({
        age: 40,
        expiryYears: 3,
        isInOfacList: false,
        selectedAlgorithm: 'sha256 rsa 65537 2048',
        selectedCountry: 'FRA',
        selectedDocumentType: 'mock_passport',
      });

      const passportData = mockPassport as PassportData;
      const documentId = 'test-array-fields';

      // Verify original arrays are number arrays
      expect(Array.isArray(passportData.eContent)).toBe(true);
      expect(Array.isArray(passportData.signedAttr)).toBe(true);
      expect(Array.isArray(passportData.encryptedDigest)).toBe(true);
      expect(typeof passportData.eContent[0]).toBe('number');
      expect(typeof passportData.signedAttr[0]).toBe('number');
      expect(typeof passportData.encryptedDigest[0]).toBe('number');

      // Save and load
      await persistentDocumentsAdapter.saveDocument(documentId, passportData);
      const loadedDoc = await persistentDocumentsAdapter.loadDocumentById(documentId);

      const loadedPassport = loadedDoc as PassportData;

      // Verify arrays remain number arrays (not string arrays or other corruption)
      expect(Array.isArray(loadedPassport.eContent)).toBe(true);
      expect(Array.isArray(loadedPassport.signedAttr)).toBe(true);
      expect(Array.isArray(loadedPassport.encryptedDigest)).toBe(true);
      expect(typeof loadedPassport.eContent[0]).toBe('number');
      expect(typeof loadedPassport.signedAttr[0]).toBe('number');
      expect(typeof loadedPassport.encryptedDigest[0]).toBe('number');

      // Verify lengths match
      expect(loadedPassport.eContent.length).toBe(passportData.eContent.length);
      expect(loadedPassport.signedAttr.length).toBe(passportData.signedAttr.length);
      expect(loadedPassport.encryptedDigest.length).toBe(passportData.encryptedDigest.length);
    });

    it('should handle mock ID cards correctly', async () => {
      const mockIdCard = await generateMockDocument({
        age: 22,
        expiryYears: 7,
        isInOfacList: false,
        selectedAlgorithm: 'sha256 rsa 65537 2048',
        selectedCountry: 'DEU',
        selectedDocumentType: 'mock_id_card',
        firstName: 'Hans',
        lastName: 'Mueller',
      });

      const idCardData = mockIdCard as PassportData;
      const documentId = 'test-id-card';

      expect(idCardData.documentCategory).toBe('id_card');

      // Save and load
      await persistentDocumentsAdapter.saveDocument(documentId, idCardData);
      const loadedDoc = await persistentDocumentsAdapter.loadDocumentById(documentId);

      expect(loadedDoc).toBeDefined();
      const loadedIdCard = loadedDoc as PassportData;

      // Verify parsed data was restored for ID card
      expect(loadedIdCard.dsc_parsed).toBeDefined();
      expect(loadedIdCard.passportMetadata).toBeDefined();
      expect(loadedIdCard.documentCategory).toBe('id_card');

      // Verify BigInt operations work
      expect(() => {
        loadedIdCard.eContent.slice(0, 3).forEach(byte => {
          BigInt(byte);
        });
      }).not.toThrow();
    });

    it('should handle documents without parsed data gracefully', async () => {
      // Create a minimal document without parsed data
      const minimalDoc: PassportData = {
        mrz: 'P<USADOE<<JOHN<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<1234567890USA9001011M3001011<<<<<<<<<<<<<<02',
        dsc: '-----BEGIN CERTIFICATE-----\nMIIBkTCB+wIJAKHHCgVZU2T9MA0GCSqGSIb3DQEBCwUAMA0xCzAJBgNVBAYTAlVTMB4XDTI1MDEwMTAwMDAwMFoXDTI5MDEwMTAwMDAwMFowDTELMAkGA1UEBhMCVVMwgZ8wDQYJKoZIhvcNAQEBBQADgY0AMIGJAoGBALRiMLAh9iimur8VA7qVvdqxevEuUkW4K+2KdMXmnQbG9Aa7k7eBjK1S+0LYmVjPKlJGNXHDGuy5Fw/d7rjVJ0BLB+ubPK8iA/Tw3hLQgXMRRGRXXCn8ikfuQfjUS1uZSatdLB81mydBETlJhI6GH4twrbDJCR2Bwy/XWXgqgGRzAgMBAAEwDQYJKoZIhvcNAQELBQADgYEAtCu4nUhVVxYUntneD9+h8Ag9Q+X2lE2FNKlKVlwKPZy/4Ag1kB4Hn4K8++1q0n+R4aFl1PjJxLDvRLJNIcwQBL8Kc1x4PjdFrVH4M5YrZ7vBKPJ\n-----END CERTIFICATE-----',
        eContent: [1, 2, 3, 4, 5],
        signedAttr: [6, 7, 8, 9, 10],
        encryptedDigest: [11, 12, 13, 14, 15],
        documentType: 'mock_passport',
        documentCategory: 'passport',
        mock: true,
      };

      const documentId = 'test-minimal-doc';

      // Save and load - should trigger re-parsing since dsc_parsed is missing
      await persistentDocumentsAdapter.saveDocument(documentId, minimalDoc);
      const loadedDoc = await persistentDocumentsAdapter.loadDocumentById(documentId);

      expect(loadedDoc).toBeDefined();
      const loadedPassport = loadedDoc as PassportData;

      // After loading, parsed data should be present (re-parsed)
      expect(loadedPassport.dsc_parsed).toBeDefined();
      expect(loadedPassport.passportMetadata).toBeDefined();
    });
  });

  describe('inMemoryDocumentsAdapter', () => {
    it('should properly restore parsed data in memory store', async () => {
      const mockPassport = await generateMockDocument({
        age: 35,
        expiryYears: 4,
        isInOfacList: false,
        selectedAlgorithm: 'sha256 rsa 65537 2048',
        selectedCountry: 'CAN',
        selectedDocumentType: 'mock_passport',
        firstName: 'Alice',
        lastName: 'Johnson',
      });

      const passportData = mockPassport as PassportData;
      const documentId = 'test-memory-passport';

      // Save to in-memory store
      await inMemoryDocumentsAdapter.saveDocument(documentId, passportData);

      // Load back
      const loadedDoc = await inMemoryDocumentsAdapter.loadDocumentById(documentId);

      expect(loadedDoc).toBeDefined();
      const loadedPassport = loadedDoc as PassportData;

      // Verify parsed data
      expect(loadedPassport.dsc_parsed).toBeDefined();
      expect(loadedPassport.passportMetadata).toBeDefined();

      // Verify BigInt operations work
      expect(() => {
        loadedPassport.eContent.forEach(byte => {
          BigInt(byte);
        });
      }).not.toThrow();
    });
  });

  describe('Edge cases', () => {
    it('should return null for non-existent document', async () => {
      const result = await persistentDocumentsAdapter.loadDocumentById('non-existent-id');
      expect(result).toBeNull();
    });

    it('should handle corrupted AsyncStorage data gracefully', async () => {
      const documentId = 'corrupted-doc';
      // Manually insert corrupted data
      await AsyncStorage.setItem(`@self_demo:document:${documentId}`, 'invalid json {{{');

      const result = await persistentDocumentsAdapter.loadDocumentById(documentId);
      expect(result).toBeNull();
    });
  });
});
