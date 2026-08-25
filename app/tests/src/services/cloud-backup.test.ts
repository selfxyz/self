// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { ethers } from 'ethers';
import { CloudStorage } from 'react-native-cloud-storage';
// Import after mocks
import { GDrive } from '@robinbobin/react-native-google-drive-api-wrapper';
import { renderHook } from '@testing-library/react-native';

import { useBackupMnemonic } from '@/services/cloud-backup';
import type { CloudBackupError } from '@/services/cloud-backup/errors';
import { createGDrive } from '@/services/cloud-backup/google';
import {
  ENCRYPTED_FILE_PATH,
  FILE_NAME,
  FOLDER,
  PLACEHOLDER_FILE_PATH,
} from '@/services/cloud-backup/helpers';

type SupportedPlatforms = 'ios' | 'android';

jest.mock('react-native', () => {
  const mockPlatform: { OS: SupportedPlatforms; select: jest.Mock } = {
    OS: 'ios',
    select: jest.fn(() => 'ios'),
  };

  const mockAppState = {
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
    removeEventListener: jest.fn(),
  };

  const mockNativeModules = {
    NativeLoggerBridge: {},
  };

  const MockNativeEventEmitter = jest.fn(() => ({
    addListener: jest.fn(),
    removeAllListeners: jest.fn(),
  }));

  return {
    Platform: mockPlatform,
    AppState: mockAppState,
    NativeModules: mockNativeModules,
    NativeEventEmitter: MockNativeEventEmitter,
  };
});

jest.mock('react-native-biometrics', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    simplePrompt: jest.fn(async () => ({ success: true })),
    isSensorAvailable: jest.fn(async () => ({
      available: true,
      biometryType: 'TouchID',
    })),
  })),
}));

const mockPlatform = jest.requireMock('react-native').Platform as {
  OS: SupportedPlatforms;
  select: jest.Mock;
};

// Mock dependencies
jest.mock('react-native-cloud-storage', () => ({
  CloudStorage: {
    setProviderOptions: jest.fn(),
    mkdir: jest.fn(),
    writeFile: jest.fn(),
    exists: jest.fn(),
    readFile: jest.fn(),
    readdir: jest.fn(),
    rmdir: jest.fn(),
    triggerSync: jest.fn(),
    isCloudAvailable: jest.fn(),
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

jest.mock('@/services/cloud-backup/google', () => ({
  createGDrive: jest.fn(),
}));

jest.mock('ethers', () => ({
  ethers: {
    Mnemonic: {
      isValidMnemonic: jest.fn(),
    },
  },
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

// Keeps the iOS remote-backup probe from sleeping through real intervals.
const FAST_SYNC_OPTIONS = {
  syncTimeoutMs: 100,
  pollIntervalMs: 10,
  remoteProbeAttempts: 1,
};

describe('cloudBackup', () => {
  let originalPlatform: SupportedPlatforms;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    originalPlatform = mockPlatform.OS;
    // Suppress console.error during tests to avoid cluttering output
    consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    (GDrive as jest.Mock).mockImplementation(() => mockGDriveInstance);
    (ethers.Mnemonic.isValidMnemonic as jest.Mock).mockReturnValue(true);
    (CloudStorage.isCloudAvailable as jest.Mock).mockResolvedValue(true);
    (CloudStorage.readdir as jest.Mock).mockResolvedValue([]);
    (CloudStorage.triggerSync as jest.Mock).mockResolvedValue(undefined);
  });

  afterEach(() => {
    mockPlatform.OS = originalPlatform;
    consoleSpy.mockRestore();
  });

  describe('useBackupMnemonic hook', () => {
    it('should return upload, download, and disableBackup functions', () => {
      const { result } = renderHook(() => useBackupMnemonic());

      expect(result.current).toHaveProperty('upload');
      expect(result.current).toHaveProperty('download');
      expect(result.current).toHaveProperty('disableBackup');
      expect(typeof result.current.upload).toBe('function');
      expect(typeof result.current.download).toBe('function');
      expect(typeof result.current.disableBackup).toBe('function');
    });
  });

  describe('upload function - iOS', () => {
    beforeEach(() => {
      mockPlatform.OS = 'ios';
    });

    it('should upload mnemonic to iCloud successfully', async () => {
      (CloudStorage.mkdir as jest.Mock).mockResolvedValue(undefined);
      (CloudStorage.writeFile as jest.Mock).mockResolvedValue(undefined);

      const { result } = renderHook(() => useBackupMnemonic());

      await expect(
        result.current.upload(mockMnemonic, FAST_SYNC_OPTIONS),
      ).resolves.toBe('created');

      expect(CloudStorage.mkdir).toHaveBeenCalledWith('/@selfxyz/mobile-app');
      expect(CloudStorage.writeFile).toHaveBeenCalledWith(
        '/@selfxyz/mobile-app/encrypted-private-key',
        JSON.stringify(mockMnemonic),
      );
    });

    it('should handle folder already exists error gracefully', async () => {
      const folderExistsError = new Error('folder already exists');
      (CloudStorage.mkdir as jest.Mock).mockRejectedValue(folderExistsError);
      (CloudStorage.writeFile as jest.Mock).mockResolvedValue(undefined);

      const { result } = renderHook(() => useBackupMnemonic());

      await expect(
        result.current.upload(mockMnemonic, FAST_SYNC_OPTIONS),
      ).resolves.toBe('created');

      expect(CloudStorage.writeFile).toHaveBeenCalledWith(
        '/@selfxyz/mobile-app/encrypted-private-key',
        JSON.stringify(mockMnemonic),
      );
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

      // Write-phase failures stay raw — deliberately not classified.
      await expect(
        result.current.upload(mockMnemonic, FAST_SYNC_OPTIONS),
      ).rejects.toThrow('permission denied');
    });
  });

  describe('upload function - Android', () => {
    beforeEach(() => {
      mockPlatform.OS = 'android';
    });

    it('should upload mnemonic to Google Drive successfully', async () => {
      (createGDrive as jest.Mock).mockResolvedValue(mockGDriveInstance);
      mockGDriveInstance.files.list.mockResolvedValue({ files: [] });
      mockGDriveInstance.files
        .newMultipartUploader()
        .execute.mockResolvedValue({});

      const { result } = renderHook(() => useBackupMnemonic());

      await expect(result.current.upload(mockMnemonic)).resolves.toBe(
        'created',
      );

      // The existing-backup check and the write share one sign-in — a second
      // createGDrive call would show the user a second Google sheet.
      expect(createGDrive).toHaveBeenCalledTimes(1);
      expect(
        mockGDriveInstance.files.newMultipartUploader().setData,
      ).toHaveBeenCalledWith(JSON.stringify(mockMnemonic));
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

  describe('upload conflict checks - iOS', () => {
    beforeEach(() => {
      mockPlatform.OS = 'ios';
      (CloudStorage.mkdir as jest.Mock).mockResolvedValue(undefined);
      (CloudStorage.writeFile as jest.Mock).mockResolvedValue(undefined);
    });

    it('reconnects to an existing matching backup without writing', async () => {
      (CloudStorage.exists as jest.Mock).mockImplementation(
        async (path: string) => path === ENCRYPTED_FILE_PATH,
      );
      (CloudStorage.readFile as jest.Mock).mockResolvedValue(
        JSON.stringify(mockMnemonic),
      );

      const { result } = renderHook(() => useBackupMnemonic());

      await expect(
        result.current.upload(mockMnemonic, FAST_SYNC_OPTIONS),
      ).resolves.toBe('already_backed_up');
      expect(CloudStorage.writeFile).not.toHaveBeenCalled();
    });

    it.each([
      [
        'a different phrase',
        JSON.stringify({ ...mockMnemonic, phrase: 'legal winner thank' }),
      ],
      [
        'a different password',
        JSON.stringify({ ...mockMnemonic, password: 'hunter2' }),
      ],
      ['unreadable contents', 'not json at all'],
    ])(
      'blocks with a conflict when the existing backup has %s',
      async (_label, existingBlob) => {
        (CloudStorage.exists as jest.Mock).mockImplementation(
          async (path: string) => path === ENCRYPTED_FILE_PATH,
        );
        (CloudStorage.readFile as jest.Mock).mockResolvedValue(existingBlob);

        const { result } = renderHook(() => useBackupMnemonic());

        await expect(
          result.current.upload(mockMnemonic, FAST_SYNC_OPTIONS),
        ).rejects.toMatchObject({
          name: 'CloudBackupError',
          reason: 'backup_conflict',
        });
        // The whole point: nothing is ever deleted or overwritten.
        expect(CloudStorage.writeFile).not.toHaveBeenCalled();
        expect(CloudStorage.rmdir).not.toHaveBeenCalled();
      },
    );

    it('waits for a not-yet-synced backup and reconnects when it matches', async () => {
      let materialized = false;
      (CloudStorage.exists as jest.Mock).mockImplementation(
        async (path: string) =>
          path === PLACEHOLDER_FILE_PATH ? !materialized : materialized,
      );
      (CloudStorage.triggerSync as jest.Mock).mockImplementation(async () => {
        materialized = true;
      });
      (CloudStorage.readFile as jest.Mock).mockResolvedValue(
        JSON.stringify(mockMnemonic),
      );

      const { result } = renderHook(() => useBackupMnemonic());

      await expect(
        result.current.upload(mockMnemonic, FAST_SYNC_OPTIONS),
      ).resolves.toBe('already_backed_up');
      expect(CloudStorage.writeFile).not.toHaveBeenCalled();
    });

    it('reports a backup that never finishes syncing without writing', async () => {
      (CloudStorage.exists as jest.Mock).mockImplementation(
        async (path: string) => path === PLACEHOLDER_FILE_PATH,
      );

      const { result } = renderHook(() => useBackupMnemonic());

      await expect(
        result.current.upload(mockMnemonic, FAST_SYNC_OPTIONS),
      ).rejects.toMatchObject({
        name: 'CloudBackupError',
        reason: 'backup_not_synced',
      });
      expect(CloudStorage.writeFile).not.toHaveBeenCalled();
    });

    it('creates the backup when the folder itself did not exist', async () => {
      // Fresh device: the folder was never created, so every listing rejects
      // with the same code as a genuine read failure. The folder being absent
      // locally is the proof that no backup can exist here.
      (CloudStorage.exists as jest.Mock).mockResolvedValue(false);
      (CloudStorage.readdir as jest.Mock).mockRejectedValue(
        Object.assign(new Error('read failed'), { code: 'ERR_READ_ERROR' }),
      );

      const { result } = renderHook(() => useBackupMnemonic());

      await expect(
        result.current.upload(mockMnemonic, FAST_SYNC_OPTIONS),
      ).resolves.toBe('created');
      // The decision must come from checking the folder, not from mkdir —
      // the native createDirectory succeeds silently for an existing dir.
      expect(CloudStorage.exists).toHaveBeenCalledWith(FOLDER);
      expect(CloudStorage.writeFile).toHaveBeenCalled();
    });

    it('refuses to write when the folder exists but cannot be checked', async () => {
      (CloudStorage.exists as jest.Mock).mockImplementation(
        async (path: string) => path === FOLDER,
      );
      (CloudStorage.readdir as jest.Mock).mockRejectedValue(
        Object.assign(new Error('read failed'), { code: 'ERR_READ_ERROR' }),
      );

      const { result } = renderHook(() => useBackupMnemonic());

      await expect(
        result.current.upload(mockMnemonic, FAST_SYNC_OPTIONS),
      ).rejects.toMatchObject({
        name: 'CloudBackupError',
        reason: 'backup_read_failed',
      });
      expect(CloudStorage.writeFile).not.toHaveBeenCalled();
      expect(CloudStorage.mkdir).not.toHaveBeenCalled();
    });

    it('reports iCloud being unavailable before any check', async () => {
      (CloudStorage.isCloudAvailable as jest.Mock).mockResolvedValue(false);

      const { result } = renderHook(() => useBackupMnemonic());

      await expect(
        result.current.upload(mockMnemonic, FAST_SYNC_OPTIONS),
      ).rejects.toMatchObject({
        name: 'CloudBackupError',
        reason: 'cloud_unavailable',
      });
      expect(CloudStorage.writeFile).not.toHaveBeenCalled();
    });
  });

  describe('upload conflict checks - Android', () => {
    beforeEach(() => {
      mockPlatform.OS = 'android';
      (createGDrive as jest.Mock).mockResolvedValue(mockGDriveInstance);
      mockGDriveInstance.files
        .newMultipartUploader()
        .execute.mockResolvedValue({});
    });

    it('reconnects to an existing matching backup without uploading', async () => {
      mockGDriveInstance.files.list.mockResolvedValue({
        files: [{ id: 'file-1', name: 'encrypted-private-key' }],
      });
      mockGDriveInstance.files.getText.mockResolvedValue(
        JSON.stringify(mockMnemonic),
      );

      const { result } = renderHook(() => useBackupMnemonic());

      await expect(result.current.upload(mockMnemonic)).resolves.toBe(
        'already_backed_up',
      );
      expect(
        mockGDriveInstance.files.newMultipartUploader().execute,
      ).not.toHaveBeenCalled();
      expect(createGDrive).toHaveBeenCalledTimes(1);
    });

    it('reconnects across legacy duplicates when every copy matches', async () => {
      mockGDriveInstance.files.list.mockResolvedValue({
        files: [
          { id: 'file-1', name: 'encrypted-private-key' },
          { id: 'file-2', name: 'encrypted-private-key' },
        ],
      });
      mockGDriveInstance.files.getText.mockResolvedValue(
        JSON.stringify(mockMnemonic),
      );

      const { result } = renderHook(() => useBackupMnemonic());

      await expect(result.current.upload(mockMnemonic)).resolves.toBe(
        'already_backed_up',
      );
      expect(mockGDriveInstance.files.getText).toHaveBeenCalledTimes(2);
      expect(
        mockGDriveInstance.files.newMultipartUploader().execute,
      ).not.toHaveBeenCalled();
    });

    it('blocks with a conflict on the first mismatched duplicate', async () => {
      mockGDriveInstance.files.list.mockResolvedValue({
        files: [
          { id: 'file-1', name: 'encrypted-private-key' },
          { id: 'file-2', name: 'encrypted-private-key' },
        ],
      });
      mockGDriveInstance.files.getText.mockResolvedValue(
        JSON.stringify({ ...mockMnemonic, phrase: 'legal winner thank' }),
      );

      const { result } = renderHook(() => useBackupMnemonic());

      await expect(result.current.upload(mockMnemonic)).rejects.toMatchObject({
        name: 'CloudBackupError',
        reason: 'backup_conflict',
      });
      // One mismatch decides the outcome — the rest are not read.
      expect(mockGDriveInstance.files.getText).toHaveBeenCalledTimes(1);
      expect(
        mockGDriveInstance.files.newMultipartUploader().execute,
      ).not.toHaveBeenCalled();
      expect(mockGDriveInstance.files.delete).not.toHaveBeenCalled();
    });

    it('blocks with a conflict when an existing backup is unreadable', async () => {
      mockGDriveInstance.files.list.mockResolvedValue({
        files: [{ id: 'file-1', name: 'encrypted-private-key' }],
      });
      mockGDriveInstance.files.getText.mockResolvedValue('not json');

      const { result } = renderHook(() => useBackupMnemonic());

      await expect(result.current.upload(mockMnemonic)).rejects.toMatchObject({
        name: 'CloudBackupError',
        reason: 'backup_conflict',
      });
      expect(
        mockGDriveInstance.files.newMultipartUploader().execute,
      ).not.toHaveBeenCalled();
    });

    it('walks every listing page before deciding', async () => {
      mockGDriveInstance.files.list
        .mockResolvedValueOnce({
          files: [{ id: 'file-1', name: 'encrypted-private-key' }],
          nextPageToken: 'page-2',
        })
        .mockResolvedValueOnce({
          files: [{ id: 'file-2', name: 'encrypted-private-key' }],
        });
      mockGDriveInstance.files.getText.mockResolvedValue(
        JSON.stringify(mockMnemonic),
      );

      const { result } = renderHook(() => useBackupMnemonic());

      await expect(result.current.upload(mockMnemonic)).resolves.toBe(
        'already_backed_up',
      );
      expect(mockGDriveInstance.files.list).toHaveBeenCalledTimes(2);
      expect(mockGDriveInstance.files.list).toHaveBeenLastCalledWith(
        expect.objectContaining({ pageToken: 'page-2' }),
      );
      expect(mockGDriveInstance.files.getText).toHaveBeenCalledTimes(2);
    });

    it('reports a failed existence check as retryable, never writing', async () => {
      mockGDriveInstance.files.list.mockRejectedValue(
        new Error('network offline'),
      );

      const { result } = renderHook(() => useBackupMnemonic());

      await expect(result.current.upload(mockMnemonic)).rejects.toMatchObject({
        name: 'CloudBackupError',
        reason: 'backup_read_failed',
      });
      expect(
        mockGDriveInstance.files.newMultipartUploader().execute,
      ).not.toHaveBeenCalled();
    });
  });

  describe('download function - iOS', () => {
    beforeEach(() => {
      mockPlatform.OS = 'ios';
    });

    it('should download and parse mnemonic from iCloud successfully', async () => {
      (CloudStorage.exists as jest.Mock).mockResolvedValue(true);
      (CloudStorage.readFile as jest.Mock).mockResolvedValue(
        JSON.stringify(mockMnemonic),
      );

      const { result } = renderHook(() => useBackupMnemonic());

      const downloaded = await result.current.download();

      expect(CloudStorage.exists).toHaveBeenCalledWith(
        '/@selfxyz/mobile-app/encrypted-private-key',
      );
      expect(CloudStorage.readFile).toHaveBeenCalledWith(
        '/@selfxyz/mobile-app/encrypted-private-key',
      );
      expect(downloaded).toEqual(mockMnemonic);
      expect(ethers.Mnemonic.isValidMnemonic).toHaveBeenCalledWith(
        mockMnemonic.phrase,
      );
    });

    it('should throw error when backup file does not exist', async () => {
      (CloudStorage.exists as jest.Mock).mockResolvedValue(false);

      const { result } = renderHook(() => useBackupMnemonic());

      await expect(
        result.current.download({ remoteProbeAttempts: 1, pollIntervalMs: 10 }),
      ).rejects.toThrow(
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
        JSON.stringify(invalidMnemonic),
      );
      (ethers.Mnemonic.isValidMnemonic as jest.Mock).mockReturnValue(false);

      const { result } = renderHook(() => useBackupMnemonic());

      await expect(result.current.download()).rejects.toThrow(
        'Failed to parse mnemonic backup: Invalid mnemonic phrase: not a valid BIP39 mnemonic',
      );
    });

    it('should throw error for missing mnemonic properties', async () => {
      const incompleteMnemonic = { phrase: 'valid phrase', password: '' }; // missing wordlist and entropy
      (CloudStorage.exists as jest.Mock).mockResolvedValue(true);
      (CloudStorage.readFile as jest.Mock).mockResolvedValue(
        JSON.stringify(incompleteMnemonic),
      );

      const { result } = renderHook(() => useBackupMnemonic());

      await expect(result.current.download()).rejects.toThrow(
        'Failed to parse mnemonic backup: Invalid mnemonic structure: missing required properties (phrase, password, wordlist, entropy)',
      );
    });
  });

  describe('download function - Android', () => {
    beforeEach(() => {
      mockPlatform.OS = 'android';
    });

    it('should download and parse mnemonic from Google Drive successfully', async () => {
      (createGDrive as jest.Mock).mockResolvedValue(mockGDriveInstance);
      mockGDriveInstance.files.list.mockResolvedValue({
        files: [{ id: 'file-id', name: 'encrypted-private-key' }],
      });
      mockGDriveInstance.files.getText.mockResolvedValue(
        JSON.stringify(mockMnemonic),
      );

      const { result } = renderHook(() => useBackupMnemonic());

      const downloaded = await result.current.download();

      expect(createGDrive).toHaveBeenCalled();
      expect(mockGDriveInstance.files.list).toHaveBeenCalledWith({
        spaces: 'mock-app-data-folder',
        q: "name = 'encrypted-private-key'",
      });
      expect(mockGDriveInstance.files.getText).toHaveBeenCalledWith('file-id');
      expect(downloaded).toEqual(mockMnemonic);
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
        JSON.stringify({ ...mockMnemonic, phrase: 'invalid phrase' }),
      );
      (ethers.Mnemonic.isValidMnemonic as jest.Mock).mockReturnValue(false);

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
        JSON.stringify(incompleteMnemonic),
      );

      const { result } = renderHook(() => useBackupMnemonic());

      await expect(result.current.download()).rejects.toThrow(
        'Failed to parse mnemonic backup: Invalid mnemonic structure: missing required properties (phrase, password, wordlist, entropy)',
      );
    });
  });

  describe('download failure classification', () => {
    async function rejectionReason(run: () => Promise<unknown>) {
      try {
        await run();
      } catch (error) {
        return {
          name: (error as Error).name,
          reason: (error as CloudBackupError).reason,
        };
      }
      throw new Error('expected the download to reject');
    }

    describe('iOS', () => {
      beforeEach(() => {
        mockPlatform.OS = 'ios';
      });

      it('reports iCloud being unavailable without looking for the file', async () => {
        (CloudStorage.isCloudAvailable as jest.Mock).mockResolvedValue(false);

        const { result } = renderHook(() => useBackupMnemonic());

        expect(await rejectionReason(result.current.download)).toEqual({
          name: 'CloudBackupError',
          reason: 'cloud_unavailable',
        });
        // A signed-out device resolves `exists` as false, so classifying it as
        // "no backup" is exactly the misclassification this guard prevents.
        expect(CloudStorage.exists).not.toHaveBeenCalled();
      });

      it('distinguishes a missing backup from an unavailable cloud', async () => {
        (CloudStorage.exists as jest.Mock).mockResolvedValue(false);

        const { result } = renderHook(() => useBackupMnemonic());

        expect(
          await rejectionReason(() =>
            result.current.download({
              remoteProbeAttempts: 1,
              pollIntervalMs: 10,
            }),
          ),
        ).toEqual({
          name: 'CloudBackupError',
          reason: 'no_backup_found',
        });
      });

      it('reports an unreadable backup as corrupt', async () => {
        (CloudStorage.exists as jest.Mock).mockResolvedValue(true);
        (CloudStorage.readFile as jest.Mock).mockResolvedValue('invalid json');

        const { result } = renderHook(() => useBackupMnemonic());

        expect(await rejectionReason(result.current.download)).toEqual({
          name: 'CloudBackupError',
          reason: 'backup_corrupt',
        });
      });

      it('reports a rejected read as retryable, not as a missing backup', async () => {
        (CloudStorage.exists as jest.Mock).mockResolvedValue(true);
        (CloudStorage.readFile as jest.Mock).mockRejectedValue(
          new Error('network offline'),
        );

        const { result } = renderHook(() => useBackupMnemonic());

        expect(await rejectionReason(result.current.download)).toEqual({
          name: 'CloudBackupError',
          reason: 'backup_read_failed',
        });
      }, 30000);

      it('reports a rejected availability check as a read failure', async () => {
        (CloudStorage.isCloudAvailable as jest.Mock).mockRejectedValue(
          new Error('provider unreachable'),
        );

        const { result } = renderHook(() => useBackupMnemonic());

        expect(await rejectionReason(result.current.download)).toEqual({
          name: 'CloudBackupError',
          reason: 'backup_read_failed',
        });
      });

      it('reports a backup that never finishes syncing as not synced', async () => {
        // Placeholder visible, plain file never materialises.
        (CloudStorage.exists as jest.Mock).mockImplementation(
          async (path: string) => path === PLACEHOLDER_FILE_PATH,
        );

        const { result } = renderHook(() => useBackupMnemonic());

        expect(
          await rejectionReason(() =>
            result.current.download({ syncTimeoutMs: 50, pollIntervalMs: 10 }),
          ),
        ).toEqual({
          name: 'CloudBackupError',
          reason: 'backup_not_synced',
        });
      });

      it('treats a placeholder found via the folder listing as not synced, not absent', async () => {
        (CloudStorage.exists as jest.Mock).mockResolvedValue(false);
        (CloudStorage.readdir as jest.Mock).mockResolvedValue([
          `.${FILE_NAME}.icloud`,
        ]);

        const { result } = renderHook(() => useBackupMnemonic());

        expect(
          await rejectionReason(() =>
            result.current.download({ syncTimeoutMs: 50, pollIntervalMs: 10 }),
          ),
        ).toEqual({
          name: 'CloudBackupError',
          reason: 'backup_not_synced',
        });
      });

      it('reports no backup when the folder lists only unrelated files', async () => {
        (CloudStorage.exists as jest.Mock).mockResolvedValue(false);
        (CloudStorage.readdir as jest.Mock).mockResolvedValue([
          'unrelated-file',
        ]);

        const { result } = renderHook(() => useBackupMnemonic());

        expect(
          await rejectionReason(() =>
            result.current.download({
              remoteProbeAttempts: 2,
              pollIntervalMs: 10,
            }),
          ),
        ).toEqual({
          name: 'CloudBackupError',
          reason: 'no_backup_found',
        });
        expect(CloudStorage.triggerSync).not.toHaveBeenCalled();
        // A listing without the file is inconclusive during first metadata
        // sync, so the whole probe budget must be spent before concluding.
        expect(CloudStorage.readdir).toHaveBeenCalledTimes(2);
      });

      it('reports no backup when the folder listing keeps failing', async () => {
        // ERR_READ_ERROR is what a never-created folder throws; after the
        // probe budget it must read as "no backup", not as a read failure.
        (CloudStorage.exists as jest.Mock).mockResolvedValue(false);
        (CloudStorage.readdir as jest.Mock).mockRejectedValue(
          Object.assign(new Error('read failed'), { code: 'ERR_READ_ERROR' }),
        );

        const { result } = renderHook(() => useBackupMnemonic());

        expect(
          await rejectionReason(() =>
            result.current.download({
              remoteProbeAttempts: 1,
              pollIntervalMs: 10,
            }),
          ),
        ).toEqual({
          name: 'CloudBackupError',
          reason: 'no_backup_found',
        });
      });

      it('aborts the sync wait when the exists check itself rejects', async () => {
        // The container going nil mid-poll (signed out) is structural, not
        // transient — the user must not wait out the full budget for it.
        let plainExistsCalls = 0;
        (CloudStorage.exists as jest.Mock).mockImplementation(
          async (path: string) => {
            if (path === PLACEHOLDER_FILE_PATH) {
              return true;
            }
            plainExistsCalls += 1;
            if (plainExistsCalls === 1) {
              return false;
            }
            throw Object.assign(new Error('container gone'), {
              code: 'ERR_DIRECTORY_NOT_FOUND',
            });
          },
        );

        const { result } = renderHook(() => useBackupMnemonic());

        expect(
          await rejectionReason(() =>
            result.current.download({
              syncTimeoutMs: 500,
              pollIntervalMs: 10,
            }),
          ),
        ).toEqual({
          name: 'CloudBackupError',
          reason: 'backup_read_failed',
        });
      });
    });

    describe('Android', () => {
      beforeEach(() => {
        mockPlatform.OS = 'android';
      });

      it('reports a cancelled sign-in', async () => {
        (createGDrive as jest.Mock).mockResolvedValue(null);

        const { result } = renderHook(() => useBackupMnemonic());

        expect(await rejectionReason(result.current.download)).toEqual({
          name: 'CloudBackupError',
          reason: 'sign_in_cancelled',
        });
      });

      it('reports a missing backup', async () => {
        (createGDrive as jest.Mock).mockResolvedValue(mockGDriveInstance);
        mockGDriveInstance.files.list.mockResolvedValue({ files: [] });

        const { result } = renderHook(() => useBackupMnemonic());

        expect(await rejectionReason(result.current.download)).toEqual({
          name: 'CloudBackupError',
          reason: 'no_backup_found',
        });
      });

      it('reports an unreadable backup as corrupt', async () => {
        (createGDrive as jest.Mock).mockResolvedValue(mockGDriveInstance);
        mockGDriveInstance.files.list.mockResolvedValue({
          files: [{ id: 'file-id', name: 'encrypted-private-key' }],
        });
        mockGDriveInstance.files.getText.mockResolvedValue('invalid json');

        const { result } = renderHook(() => useBackupMnemonic());

        expect(await rejectionReason(result.current.download)).toEqual({
          name: 'CloudBackupError',
          reason: 'backup_corrupt',
        });
      });

      it('reports a rejected file listing as retryable, not as a missing backup', async () => {
        (createGDrive as jest.Mock).mockResolvedValue(mockGDriveInstance);
        mockGDriveInstance.files.list.mockRejectedValue(
          new Error('network offline'),
        );

        const { result } = renderHook(() => useBackupMnemonic());

        expect(await rejectionReason(result.current.download)).toEqual({
          name: 'CloudBackupError',
          reason: 'backup_read_failed',
        });
      });
    });
  });

  describe('iOS sync wait', () => {
    beforeEach(() => {
      mockPlatform.OS = 'ios';
    });

    it('triggers the iCloud download for a placeholder and reads the file once it lands', async () => {
      let materialized = false;
      (CloudStorage.exists as jest.Mock).mockImplementation(
        async (path: string) =>
          path === PLACEHOLDER_FILE_PATH ? !materialized : materialized,
      );
      let syncCalls = 0;
      (CloudStorage.triggerSync as jest.Mock).mockImplementation(async () => {
        syncCalls += 1;
        // Two paths are synced per tick; land the file on the second tick.
        if (syncCalls >= 4) {
          materialized = true;
        }
      });
      (CloudStorage.readFile as jest.Mock).mockResolvedValue(
        JSON.stringify(mockMnemonic),
      );

      const { result } = renderHook(() => useBackupMnemonic());

      const downloaded = await result.current.download({
        syncTimeoutMs: 500,
        pollIntervalMs: 10,
      });

      expect(downloaded).toEqual(mockMnemonic);
      // Apple doesn't document which of the two paths isUbiquitousItem
      // accepts for a non-materialised item, so both must be requested.
      expect(CloudStorage.triggerSync).toHaveBeenCalledWith(
        ENCRYPTED_FILE_PATH,
      );
      expect(CloudStorage.triggerSync).toHaveBeenCalledWith(
        PLACEHOLDER_FILE_PATH,
      );
    });

    it('still restores when the sync request is rejected but the file lands anyway', async () => {
      let plainExistsCalls = 0;
      (CloudStorage.exists as jest.Mock).mockImplementation(
        async (path: string) => {
          if (path === PLACEHOLDER_FILE_PATH) {
            return true;
          }
          plainExistsCalls += 1;
          return plainExistsCalls >= 2;
        },
      );
      (CloudStorage.triggerSync as jest.Mock).mockRejectedValue(
        Object.assign(new Error('not downloadable'), {
          code: 'ERR_FILE_NOT_DOWNLOADABLE',
        }),
      );
      (CloudStorage.readFile as jest.Mock).mockResolvedValue(
        JSON.stringify(mockMnemonic),
      );

      const { result } = renderHook(() => useBackupMnemonic());

      await expect(
        result.current.download({ syncTimeoutMs: 500, pollIntervalMs: 10 }),
      ).resolves.toEqual(mockMnemonic);
    });

    it('keeps probing after an empty folder listing until the placeholder appears', async () => {
      // Fresh-device window: the iCloud folder can materialise before its
      // file placeholders do, so an empty listing must not conclude
      // "no backup" while probe budget remains.
      let materialized = false;
      let placeholderProbes = 0;
      (CloudStorage.exists as jest.Mock).mockImplementation(
        async (path: string) => {
          if (path === PLACEHOLDER_FILE_PATH) {
            placeholderProbes += 1;
            return placeholderProbes >= 2;
          }
          return materialized;
        },
      );
      (CloudStorage.readdir as jest.Mock).mockResolvedValue([]);
      (CloudStorage.triggerSync as jest.Mock).mockImplementation(async () => {
        materialized = true;
      });
      (CloudStorage.readFile as jest.Mock).mockResolvedValue(
        JSON.stringify(mockMnemonic),
      );

      const { result } = renderHook(() => useBackupMnemonic());

      await expect(
        result.current.download({
          syncTimeoutMs: 200,
          pollIntervalMs: 10,
          remoteProbeAttempts: 3,
        }),
      ).resolves.toEqual(mockMnemonic);
      expect(CloudStorage.readdir).toHaveBeenCalled();
    });

    it('skips the sync machinery entirely when the file is already local', async () => {
      (CloudStorage.exists as jest.Mock).mockResolvedValue(true);
      (CloudStorage.readFile as jest.Mock).mockResolvedValue(
        JSON.stringify(mockMnemonic),
      );

      const { result } = renderHook(() => useBackupMnemonic());

      await expect(result.current.download()).resolves.toEqual(mockMnemonic);
      expect(CloudStorage.readdir).not.toHaveBeenCalled();
      expect(CloudStorage.triggerSync).not.toHaveBeenCalled();
    });
  });

  describe('backup path constants', () => {
    it('keeps the placeholder, file and folder paths on the same file', () => {
      // disableBackup rmdirs FOLDER; upload writes ENCRYPTED_FILE_PATH; the
      // placeholder probe reads PLACEHOLDER_FILE_PATH. All three must agree.
      expect(ENCRYPTED_FILE_PATH).toBe(`${FOLDER}/${FILE_NAME}`);
      expect(PLACEHOLDER_FILE_PATH).toBe(`${FOLDER}/.${FILE_NAME}.icloud`);
    });

    it('resolves to the exact path production backups already live at', () => {
      // The native layer strips leading slashes before resolving, so THIS is
      // the effective path in users' cloud accounts. It is frozen: neither a
      // package rename nor slash-count cleanup may ever change it, or every
      // existing backup is orphaned.
      expect(ENCRYPTED_FILE_PATH.replace(/^\/+/, '')).toBe(
        '@selfxyz/mobile-app/encrypted-private-key',
      );
    });
  });

  describe('disableBackup function - iOS', () => {
    beforeEach(() => {
      mockPlatform.OS = 'ios';
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
      mockPlatform.OS = 'android';
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
