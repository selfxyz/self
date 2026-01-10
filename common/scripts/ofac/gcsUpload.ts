/**
 * Google Cloud Storage Upload Module
 *
 * Handles uploading OFAC tree files to GCS with versioned paths
 * and atomic pointer file updates for minimal mismatch window.
 */

import { Storage } from '@google-cloud/storage';
import * as fs from 'fs';
import * as path from 'path';

export interface GcsUploadOptions {
  bucketName: string;
  basePath: string;
  treesDir: string;
  roots: Record<string, string>;
  timestamp: number;
  dryRun?: boolean;
}

export interface GcsUploadResult {
  success: boolean;
  versionPath?: string;
  filesUploaded?: number;
  error?: string;
}

export interface PointerUpdateResult {
  success: boolean;
  durationMs: number;
  completedAt?: number;
  error?: string;
}

const TREE_FILES = [
  'passportNoAndNationalitySMT.json',
  'nameAndDobSMT.json',
  'nameAndYobSMT.json',
  'nameAndDobSMT_ID.json',
  'nameAndYobSMT_ID.json',
  'nameAndDobSMT_AADHAAR.json',
  'nameAndYobSMT_AADHAAR.json',
  'roots.json',
  'latest-roots.json',
];

function log(msg: string) {
  const timestamp = new Date().toISOString().slice(11, 23);
  console.log(`[${timestamp}] ${msg}`);
}

/**
 * Initialize GCS client with authentication
 */
function getStorageClient(): Storage {
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (credentialsPath && !fs.existsSync(credentialsPath)) {
    throw new Error(`GCS credentials file not found: ${credentialsPath}`);
  }

  return new Storage();
}

/**
 * Upload all tree files to a versioned path in GCS
 */
export async function uploadToGcs(options: GcsUploadOptions): Promise<GcsUploadResult> {
  const { bucketName, basePath, treesDir, timestamp, dryRun = false } = options;

  const versionPath = `${basePath}/${new Date(timestamp).toISOString().split('T')[0]}-${timestamp}`;

  log(`Uploading to gs://${bucketName}/${versionPath}`);

  const filesToUpload = TREE_FILES
    .map((f) => path.join(treesDir, f))
    .filter((f) => fs.existsSync(f));

  if (filesToUpload.length === 0) {
    return {
      success: false,
      error: 'No tree files found to upload',
    };
  }

  log(`   Found ${filesToUpload.length} files to upload`);

  if (dryRun) {
    log('   [DRY RUN] Would upload:');
    filesToUpload.forEach((f) => log(`     - ${path.basename(f)}`));
    return {
      success: true,
      versionPath,
      filesUploaded: filesToUpload.length,
    };
  }

  try {
    const storage = getStorageClient();
    const bucket = storage.bucket(bucketName);

    for (const filePath of filesToUpload) {
      const fileName = path.basename(filePath);
      const destination = `${versionPath}/${fileName}`;

      process.stdout.write(`   Uploading ${fileName}...`);

      await bucket.upload(filePath, {
        destination,
        metadata: {
          cacheControl: 'public, max-age=300',
          metadata: {
            uploadedAt: new Date().toISOString(),
          },
        },
      });

      console.log(' ok');
    }

    log(`Successfully uploaded ${filesToUpload.length} files to ${versionPath}`);

    return {
      success: true,
      versionPath,
      filesUploaded: filesToUpload.length,
    };
  } catch (error) {
    return {
      success: false,
      error: `GCS upload failed: ${(error as Error).message}`,
    };
  }
}

/**
 * Update the current.json pointer file to point to the new version
 * This is the atomic switch that minimizes mismatch window
 */
export async function updatePointerFile(
  bucketName: string,
  basePath: string,
  versionPath: string,
  roots: Record<string, string>,
  dryRun: boolean = false
): Promise<PointerUpdateResult> {
  log(`Updating pointer file: gs://${bucketName}/${basePath}/current.json`);

  if (dryRun) {
    log('   [DRY RUN] Would update pointer to: ' + versionPath);
    return { success: true, durationMs: 0, completedAt: Date.now() };
  }

  const startTime = Date.now();

  try {
    const storage = getStorageClient();
    const bucket = storage.bucket(bucketName);

    const pointerData = {
      timestamp: new Date().toISOString(),
      path: versionPath,
      roots,
    };

    const pointerFile = bucket.file(`${basePath}/current.json`);

    await pointerFile.save(JSON.stringify(pointerData, null, 2), {
      metadata: {
        contentType: 'application/json',
        cacheControl: 'no-cache, no-store, must-revalidate',
      },
    });

    const durationMs = Date.now() - startTime;
    const completedAt = Date.now();
    log(`Pointer updated in ${durationMs}ms`);

    return { success: true, durationMs, completedAt };
  } catch (error) {
    const durationMs = Date.now() - startTime;
    return {
      success: false,
      durationMs,
      error: `Pointer update failed: ${(error as Error).message}`,
    };
  }
}

/**
 * Verify that all files were uploaded successfully
 */
export async function verifyGcsFiles(
  bucketName: string,
  versionPath: string,
  dryRun: boolean = false
): Promise<void> {
  log('Verifying uploaded files...');

  if (dryRun) {
    log('   [DRY RUN] Skipping verification');
    return;
  }

  try {
    const storage = getStorageClient();
    const bucket = storage.bucket(bucketName);

    const [files] = await bucket.getFiles({
      prefix: versionPath,
    });

    if (files.length === 0) {
      log('   WARNING: No files found at version path');
      return;
    }

    log(`   Found ${files.length} files:`);
    files.slice(0, 10).forEach((file) => {
      log(`     - ${file.name}`);
    });

    if (files.length > 10) {
      log(`     ... and ${files.length - 10} more`);
    }
  } catch (error) {
    log(`   Could not verify files: ${(error as Error).message}`);
  }
}
