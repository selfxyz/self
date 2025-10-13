// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { ethers } from 'ethers';
import { Platform } from 'react-native';
import { CloudStorage } from 'react-native-cloud-storage';
// Import after mocks
import { GDrive } from '@robinbobin/react-native-google-drive-api-wrapper';
import { renderHook } from '@testing-library/react-native';

import {
  exportDocumentStorageSnapshot,
  restoreDocumentStorageSnapshotIfEmpty,
} from '@/providers/passportDataProvider';
import { useBackupMnemonic } from '@/utils/cloudBackup';
import { createGDrive } from '@/utils/cloudBackup/google';

import '@/utils/ethers';

// Mock dependencies
jest.mock('react-native-cloud-storage', () => ({
  CloudStorage: {
    setProviderOptions: jest.fn(),
    mkdir: jest.fn(),
    writeFile: jest.fn(),
    exists: jest.fn(),
    readFile: jest.fn(),
    rmdir: jest.fn(),
  },
  CloudStorageScope: {
    AppData: 'AppData',
  },
}));

jest.mock('@robinbobin/react-native-google-drive-api-wrapper', () => ({
  GDrive: jest.fn(),
  APP_DATA_FOLDER_ID: 'mock-app-data-folder',
  MIME_TYPES: {
    application: {
      json: 'application/json',
    },
  },
}));

jest.mock('@/utils/cloudBackup/google', () => {
  const originalModule = jest.requireActual('@/utils/cloudBackup/google');
  return {
    ...originalModule,
    createGDrive: jest.fn(),
  };
});

jest.mock('@/providers/passportDataProvider', () => ({
  exportDocumentStorageSnapshot: jest.fn(),
  restoreDocumentStorageSnapshotIfEmpty: jest.fn(),
}));

// Mock implementations
const mockGDriveInstance = {
  accessToken: '',
  files: {
    newMultipartUploader: jest.fn().mockReturnValue({
      setData: jest.fn().mockReturnThis(),
      setDataMimeType: jest.fn().mockReturnThis(),
      setRequestBody: jest.fn().mockReturnThis(),
      execute: jest.fn(),
    }),
    list: jest.fn(),
    getText: jest.fn(),
    delete: jest.fn(),
  },
};

const mockMnemonic = {
  phrase:
    'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
  password: '',
  wordlist: { locale: 'en' },
  entropy: '0x00000000000000000000000000000000',
};

const mockExportSnapshot = exportDocumentStorageSnapshot as jest.MockedFunction<
  typeof exportDocumentStorageSnapshot
>;
const mockRestoreSnapshot =
  restoreDocumentStorageSnapshotIfEmpty as jest.MockedFunction<
    typeof restoreDocumentStorageSnapshotIfEmpty
  >;

describe('cloudBackup', () => {
  let originalPlatform: any;
  let consoleSpy: jest.SpyInstance;
  let mnemonicSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    originalPlatform = Platform.OS;
    // Suppress console.error during tests to avoid cluttering output
    consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    (GDrive as jest.Mock).mockImplementation(() => mockGDriveInstance);
    mnemonicSpy = jest
      .spyOn(ethers.Mnemonic, 'isValidMnemonic')
      .mockReturnValue(true);
    mockExportSnapshot.mockResolvedValue(null);
    mockRestoreSnapshot.mockResolvedValue(false);
  });

  afterEach(() => {
    Platform.OS = originalPlatform;
    consoleSpy.mockRestore();
    mnemonicSpy.mockRestore();
  });

  describe('useBackupMnemonic hook', () => {
    it('should return upload, download, disableBackup, and restore functions', () => {
      const { result } = renderHook(() => useBackupMnemonic());

      expect(result.current).toHaveProperty('upload');
      expect(result.current).toHaveProperty('download');
      expect(result.current).toHaveProperty('disableBackup');
      expect(result.current).toHaveProperty('restoreDocumentsFromBackup');
      expect(typeof result.current.upload).toBe('function');
      expect(typeof result.current.download).toBe('function');
      expect(typeof result.current.disableBackup).toBe('function');
      expect(typeof result.current.restoreDocumentsFromBackup).toBe('function');
    });
  });

  describe('upload function - iOS', () => {
    beforeEach(() => {
      Platform.OS = 'ios';
    });

    it('should upload mnemonic to iCloud successfully', async () => {
      (CloudStorage.mkdir as jest.Mock).mockResolvedValue(undefined);
      (CloudStorage.writeFile as jest.Mock).mockResolvedValue(undefined);

      const { result } = renderHook(() => useBackupMnemonic());

      await expect(
        result.current.upload(mockMnemonic),
      ).resolves.toBeUndefined();

      expect(CloudStorage.mkdir).toHaveBeenCalledWith('/@selfxyz/mobile-app');
      expect(CloudStorage.writeFile).toHaveBeenCalledWith(
        '//@selfxyz/mobile-app/encrypted-private-key',
        expect.any(String),
      );
      const payloadString = (CloudStorage.writeFile as jest.Mock).mock
        .calls[0][1];
      const payload = JSON.parse(payloadString);
      expect(payload.mnemonic).toEqual(mockMnemonic);
      expect(payload.documents).toBeUndefined();
    });

    it('should handle folder already exists error gracefully', async () => {
      const folderExistsError = new Error('folder already exists');
      (CloudStorage.mkdir as jest.Mock).mockRejectedValue(folderExistsError);
      (CloudStorage.writeFile as jest.Mock).mockResolvedValue(undefined);

      const { result } = renderHook(() => useBackupMnemonic());

      await expect(
        result.current.upload(mockMnemonic),
      ).resolves.toBeUndefined();

      expect(CloudStorage.writeFile).toHaveBeenCalledWith(
        '//@selfxyz/mobile-app/encrypted-private-key',
        expect.any(String),
      );
      const payloadString = (CloudStorage.writeFile as jest.Mock).mock
        .calls[0][1];
      const payload = JSON.parse(payloadString);
      expect(payload.mnemonic).toEqual(mockMnemonic);
      expect(payload.documents).toBeUndefined();
    });

    it('should throw error for empty mnemonic', async () => {
      const { result } = renderHook(() => useBackupMnemonic());

      await expect(
        result.current.upload({
          phrase: '',
          password: '',
          wordlist: { locale: 'en' },
          entropy: '',
        }),
      ).rejects.toThrow(
        'Mnemonic not set yet. Did the user see the recovery phrase?',
      );
    });

    it('should throw error for null mnemonic', async () => {
      const { result } = renderHook(() => useBackupMnemonic());

      await expect(result.current.upload(null as any)).rejects.toThrow(
        'Mnemonic not set yet. Did the user see the recovery phrase?',
      );
    });

    it('should throw error when mkdir fails with non-existing folder error', async () => {
      const permissionError = new Error('permission denied');
      (CloudStorage.mkdir as jest.Mock).mockRejectedValue(permissionError);

      const { result } = renderHook(() => useBackupMnemonic());

      await expect(result.current.upload(mockMnemonic)).rejects.toThrow(
        'permission denied',
      );
    });

    it('should encrypt and restore document snapshots when available', async () => {
      const snapshot = {
        catalog: {
          documents: [
            {
              id: 'doc1',
              documentType: 'passport',
              documentCategory: 'PASSPORT',
              data: 'MRZ',
              mock: false,
              isRegistered: false,
            },
          ],
          selectedDocumentId: 'doc1',
        },
        documents: {
          doc1: {
            documentType: 'passport',
            documentCategory: 'PASSPORT',
            mrz: 'MRZ',
            mock: false,
          },
        },
      };
      mockExportSnapshot.mockResolvedValueOnce(snapshot as any);
      (CloudStorage.mkdir as jest.Mock).mockResolvedValue(undefined);
      (CloudStorage.writeFile as jest.Mock).mockResolvedValue(undefined);

      const { result } = renderHook(() => useBackupMnemonic());

      await expect(
        result.current.upload(mockMnemonic),
      ).resolves.toBeUndefined();

      const payloadString = (CloudStorage.writeFile as jest.Mock).mock
        .calls[0][1];
      const payload = JSON.parse(payloadString);
      expect(payload.documents).toBeDefined();
      expect(payload.documents.version).toBe(1);
      expect(typeof payload.documents.cipherText).toBe('string');
      mockRestoreSnapshot.mockResolvedValue(true);
      await expect(
        result.current.restoreDocumentsFromBackup(
          payload.mnemonic,
          payload.documents,
        ),
      ).resolves.toBe(true);
      expect(mockRestoreSnapshot).toHaveBeenCalledWith(snapshot as any);
    });
  });

  describe('upload function - Android', () => {
    beforeEach(() => {
      Platform.OS = 'android';
    });

    it('should upload mnemonic to Google Drive successfully', async () => {
      (createGDrive as jest.Mock).mockResolvedValue(mockGDriveInstance);
      mockGDriveInstance.files
        .newMultipartUploader()
        .execute.mockResolvedValue({});

      const { result } = renderHook(() => useBackupMnemonic());

      await expect(
        result.current.upload(mockMnemonic),
      ).resolves.toBeUndefined();

      expect(createGDrive).toHaveBeenCalled();
      expect(
        mockGDriveInstance.files.newMultipartUploader().setData,
      ).toHaveBeenCalledWith(expect.any(String));
      const payloadString =
        mockGDriveInstance.files.newMultipartUploader().setData.mock
          .calls[0][0];
      const payload = JSON.parse(payloadString);
      expect(payload.mnemonic).toEqual(mockMnemonic);
      expect(payload.documents).toBeUndefined();
      expect(
        mockGDriveInstance.files.newMultipartUploader().execute,
      ).toHaveBeenCalled();
    });

    it('should throw error when user cancels Google sign-in', async () => {
      (createGDrive as jest.Mock).mockResolvedValue(null);

      const { result } = renderHook(() => useBackupMnemonic());

      await expect(result.current.upload(mockMnemonic)).rejects.toThrow(
        'User canceled Google sign-in',
      );
    });
  });

  describe('download function - iOS', () => {
    beforeEach(() => {
      Platform.OS = 'ios';
    });

    it('should download and parse mnemonic from iCloud successfully', async () => {
      (CloudStorage.exists as jest.Mock).mockResolvedValue(true);
      (CloudStorage.readFile as jest.Mock).mockResolvedValue(
        JSON.stringify({ mnemonic: mockMnemonic }),
      );

      const { result } = renderHook(() => useBackupMnemonic());

      const downloaded = await result.current.download();

      expect(CloudStorage.exists).toHaveBeenCalledWith(
        '//@selfxyz/mobile-app/encrypted-private-key',
      );
      expect(CloudStorage.readFile).toHaveBeenCalledWith(
        '//@selfxyz/mobile-app/encrypted-private-key',
      );
      expect(downloaded.mnemonic).toEqual(mockMnemonic);
      expect(downloaded.documents).toBeUndefined();
      expect(ethers.Mnemonic.isValidMnemonic).toHaveBeenCalledWith(
        mockMnemonic.phrase,
      );
    });

    it('should throw error when backup file does not exist', async () => {
      (CloudStorage.exists as jest.Mock).mockResolvedValue(false);

      const { result } = renderHook(() => useBackupMnemonic());

      await expect(result.current.download()).rejects.toThrow(
        'Couldnt find the encrypted backup, did you back it up previously?',
      );
    });

    it('should throw error for malformed mnemonic JSON', async () => {
      (CloudStorage.exists as jest.Mock).mockResolvedValue(true);
      (CloudStorage.readFile as jest.Mock).mockResolvedValue('invalid json');

      const { result } = renderHook(() => useBackupMnemonic());

      await expect(result.current.download()).rejects.toThrow(
        'Failed to parse mnemonic backup: Invalid JSON format in mnemonic backup',
      );
    });

    it('should throw error for invalid mnemonic phrase', async () => {
      const invalidMnemonic = { ...mockMnemonic, phrase: 'invalid phrase' };
      (CloudStorage.exists as jest.Mock).mockResolvedValue(true);
      (CloudStorage.readFile as jest.Mock).mockResolvedValue(
        JSON.stringify({ mnemonic: invalidMnemonic }),
      );
      mnemonicSpy.mockReturnValueOnce(false);

      const { result } = renderHook(() => useBackupMnemonic());

      await expect(result.current.download()).rejects.toThrow(
        'Failed to parse mnemonic backup: Invalid mnemonic phrase: not a valid BIP39 mnemonic',
      );
    });

    it('should throw error for missing mnemonic properties', async () => {
      const incompleteMnemonic = { phrase: 'valid phrase', password: '' }; // missing wordlist and entropy
      (CloudStorage.exists as jest.Mock).mockResolvedValue(true);
      (CloudStorage.readFile as jest.Mock).mockResolvedValue(
        JSON.stringify({ mnemonic: incompleteMnemonic }),
      );

      const { result } = renderHook(() => useBackupMnemonic());

      await expect(result.current.download()).rejects.toThrow(
        'Failed to parse mnemonic backup: Invalid mnemonic structure: missing required properties (phrase, password, wordlist, entropy)',
      );
    });
  });

  describe('download function - Android', () => {
    beforeEach(() => {
      Platform.OS = 'android';
    });

    it('should download and parse mnemonic from Google Drive successfully', async () => {
      (createGDrive as jest.Mock).mockResolvedValue(mockGDriveInstance);
      mockGDriveInstance.files.list.mockResolvedValue({
        files: [{ id: 'file-id', name: 'encrypted-private-key' }],
      });
      mockGDriveInstance.files.getText.mockResolvedValue(
        JSON.stringify({ mnemonic: mockMnemonic }),
      );

      const { result } = renderHook(() => useBackupMnemonic());

      const downloaded = await result.current.download();

      expect(createGDrive).toHaveBeenCalled();
      expect(mockGDriveInstance.files.list).toHaveBeenCalledWith({
        spaces: 'mock-app-data-folder',
        q: "name = 'encrypted-private-key'",
      });
      expect(mockGDriveInstance.files.getText).toHaveBeenCalledWith('file-id');
      expect(downloaded.mnemonic).toEqual(mockMnemonic);
      expect(downloaded.documents).toBeUndefined();
      expect(ethers.Mnemonic.isValidMnemonic).toHaveBeenCalledWith(
        mockMnemonic.phrase,
      );
    });

    it('should throw error when user cancels Google sign-in', async () => {
      (createGDrive as jest.Mock).mockResolvedValue(null);

      const { result } = renderHook(() => useBackupMnemonic());

      await expect(result.current.download()).rejects.toThrow(
        'User canceled Google sign-in',
      );
    });

    it('should throw error when backup file does not exist', async () => {
      (createGDrive as jest.Mock).mockResolvedValue(mockGDriveInstance);
      mockGDriveInstance.files.list.mockResolvedValue({
        files: [],
      });

      const { result } = renderHook(() => useBackupMnemonic());

      await expect(result.current.download()).rejects.toThrow(
        'Couldnt find the encrypted backup, did you back it up previously?',
      );
    });

    it('should throw error for malformed mnemonic JSON', async () => {
      (createGDrive as jest.Mock).mockResolvedValue(mockGDriveInstance);
      mockGDriveInstance.files.list.mockResolvedValue({
        files: [{ id: 'file-id', name: 'encrypted-private-key' }],
      });
      mockGDriveInstance.files.getText.mockResolvedValue('invalid json');

      const { result } = renderHook(() => useBackupMnemonic());

      await expect(result.current.download()).rejects.toThrow(
        'Failed to parse mnemonic backup: Invalid JSON format in mnemonic backup',
      );
    });

    it('should throw error for invalid mnemonic phrase', async () => {
      (createGDrive as jest.Mock).mockResolvedValue(mockGDriveInstance);
      mockGDriveInstance.files.list.mockResolvedValue({
        files: [{ id: 'file-id', name: 'encrypted-private-key' }],
      });
      mockGDriveInstance.files.getText.mockResolvedValue(
        JSON.stringify({
          mnemonic: { ...mockMnemonic, phrase: 'invalid phrase' },
        }),
      );
      mnemonicSpy.mockReturnValueOnce(false);

      const { result } = renderHook(() => useBackupMnemonic());

      await expect(result.current.download()).rejects.toThrow(
        'Failed to parse mnemonic backup: Invalid mnemonic phrase: not a valid BIP39 mnemonic',
      );
    });

    it('should throw error for missing mnemonic properties', async () => {
      const incompleteMnemonic = { phrase: 'valid phrase', password: '' }; // missing wordlist and entropy
      (createGDrive as jest.Mock).mockResolvedValue(mockGDriveInstance);
      mockGDriveInstance.files.list.mockResolvedValue({
        files: [{ id: 'file-id', name: 'encrypted-private-key' }],
      });
      mockGDriveInstance.files.getText.mockResolvedValue(
        JSON.stringify({ mnemonic: incompleteMnemonic }),
      );

      const { result } = renderHook(() => useBackupMnemonic());

      await expect(result.current.download()).rejects.toThrow(
        'Failed to parse mnemonic backup: Invalid mnemonic structure: missing required properties (phrase, password, wordlist, entropy)',
      );
    });
  });

  describe('disableBackup function - iOS', () => {
    beforeEach(() => {
      Platform.OS = 'ios';
    });

    it('should remove backup folder from iCloud', async () => {
      (CloudStorage.rmdir as jest.Mock).mockResolvedValue(undefined);

      const { result } = renderHook(() => useBackupMnemonic());

      await expect(result.current.disableBackup()).resolves.toBeUndefined();
      expect(CloudStorage.rmdir).toHaveBeenCalledWith('/@selfxyz/mobile-app', {
        recursive: true,
      });
    });
  });

  describe('disableBackup function - Android', () => {
    beforeEach(() => {
      Platform.OS = 'android';
    });

    it('should delete backup files from Google Drive', async () => {
      (createGDrive as jest.Mock).mockResolvedValue(mockGDriveInstance);
      mockGDriveInstance.files.list.mockResolvedValue({
        files: [{ id: 'file-id' }, { id: 'file-id2' }],
      });
      mockGDriveInstance.files.delete.mockResolvedValue(undefined);

      const { result } = renderHook(() => useBackupMnemonic());

      await expect(result.current.disableBackup()).resolves.toBeUndefined();
      expect(mockGDriveInstance.files.list).toHaveBeenCalledWith({
        spaces: 'mock-app-data-folder',
        q: "name = 'encrypted-private-key'",
      });
      expect(mockGDriveInstance.files.delete).toHaveBeenNthCalledWith(
        1,
        'file-id',
      );
      expect(mockGDriveInstance.files.delete).toHaveBeenNthCalledWith(
        2,
        'file-id2',
      );
    });

    it('should resolve when user cancels Google sign-in', async () => {
      (createGDrive as jest.Mock).mockResolvedValue(null);

      const { result } = renderHook(() => useBackupMnemonic());

      await expect(result.current.disableBackup()).resolves.toBeUndefined();
    });
  });
});
