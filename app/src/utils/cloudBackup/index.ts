import { useMemo } from 'react';
import { NativeModules, Platform } from 'react-native';
import { CloudStorage, CloudStorageScope } from 'react-native-cloud-storage';
import RNFS from 'react-native-fs';

// Note: also defined in app/android/app/src/main/res/xml/backup_rules.xml
const ENCRYPTED_FILE_PATH =
  RNFS.DocumentDirectoryPath + '/encrypted-private-key';

export const STORAGE_NAME =
  Platform.OS === 'ios' ? 'iCloud Backup' : 'Android Backup';

export const useBackupPrivateKey =
  Platform.OS === 'ios'
    ? useICloudBackupPrivateKey
    : useAndroidBackupPrivateKey;

/// ANDROID
function useAndroidBackupPrivateKey() {
  return useMemo(
    () => ({
      upload: (privateKey: string) => backupWithAndroidBackup(privateKey),
      download: () => downloadFromAndroidBackup(),
      disableBackup: () => disableBackupToAndroidBackup,
    }),
    [],
  );
}

async function backupWithAndroidBackup(privateKey: string) {
  if (!privateKey) {
    throw new Error(
      'Private key not set yet. Did the user see the recovery phrase?',
    );
  }

  const { BackupModule } = NativeModules;
  await RNFS.write(ENCRYPTED_FILE_PATH, privateKey);
  await BackupModule.backupNow();
}

async function downloadFromAndroidBackup() {
  const { BackupModule } = NativeModules;
  await BackupModule.restoreNow();
  const privateKey = await RNFS.readFile(ENCRYPTED_FILE_PATH);
  return privateKey;
}

async function disableBackupToAndroidBackup() {
  const { BackupModule } = NativeModules;
  await RNFS.unlink(ENCRYPTED_FILE_PATH);
  await BackupModule.backupNow();
}

/// IOS
function useICloudBackupPrivateKey() {
  return useMemo(
    () => ({
      upload: (privateKey: string) => backupWithICloud(privateKey),
      download: () => downloadFromICloud(),
      disableBackup: () => disableBackupToICloud,
    }),
    [],
  );
}

async function backupWithICloud(privateKey: string) {
  if (!privateKey) {
    throw new Error(
      'Private key not set yet. Did the user see the recovery phrase?',
    );
  }

  await CloudStorage.writeFile(
    ENCRYPTED_FILE_PATH,
    privateKey,
    CloudStorageScope.AppData,
  );
}
async function downloadFromICloud() {
  const privateKey = await CloudStorage.readFile(
    ENCRYPTED_FILE_PATH,
    CloudStorageScope.AppData,
  );
  return privateKey;
}

async function disableBackupToICloud() {
  await CloudStorage.unlink(ENCRYPTED_FILE_PATH, CloudStorageScope.AppData);
}
