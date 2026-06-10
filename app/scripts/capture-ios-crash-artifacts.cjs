// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const APP_NAME = process.env.IOS_CRASH_CAPTURE_APP_NAME || 'Self';
const WINDOW_MINUTES = process.env.IOS_CRASH_CAPTURE_WINDOW_MINUTES || '5';
const OUTPUT_ROOT =
  process.env.IOS_CRASH_CAPTURE_OUTPUT_DIR ||
  path.join(os.homedir(), 'Desktop', 'ios-crash-capture');
const DERIVED_DATA_ROOT = path.join(
  os.homedir(),
  'Library',
  'Developer',
  'Xcode',
  'DerivedData',
);
const DIAGNOSTIC_REPORTS_DIR = path.join(
  os.homedir(),
  'Library',
  'Logs',
  'DiagnosticReports',
);

function timestamp() {
  return new Date().toISOString().replace(/[:]/g, '-');
}

function ensureDir(directory) {
  fs.mkdirSync(directory, { recursive: true });
}

function runCommand(command, args, options = {}) {
  return execFileSync(command, args, {
    encoding: 'utf8',
    ...options,
  });
}

function writeFile(filePath, contents) {
  fs.writeFileSync(filePath, contents, 'utf8');
}

function copyFileIfPresent(sourcePath, destinationPath) {
  if (fs.existsSync(sourcePath)) {
    fs.copyFileSync(sourcePath, destinationPath);
  }
}

function getLatestLaunchResult() {
  if (!fs.existsSync(DERIVED_DATA_ROOT)) {
    return null;
  }

  const candidates = [];

  for (const derivedDataEntry of fs.readdirSync(DERIVED_DATA_ROOT, {
    withFileTypes: true,
  })) {
    if (
      !derivedDataEntry.isDirectory() ||
      !derivedDataEntry.name.startsWith(`${APP_NAME}-`)
    ) {
      continue;
    }

    const launchDir = path.join(
      DERIVED_DATA_ROOT,
      derivedDataEntry.name,
      'Logs',
      'Launch',
    );

    if (!fs.existsSync(launchDir)) {
      continue;
    }

    for (const launchEntry of fs.readdirSync(launchDir, {
      withFileTypes: true,
    })) {
      if (
        !launchEntry.isDirectory() ||
        !launchEntry.name.endsWith('.xcresult')
      ) {
        continue;
      }

      const fullPath = path.join(launchDir, launchEntry.name);
      const stat = fs.statSync(fullPath);

      candidates.push({
        mtimeMs: stat.mtimeMs,
        path: fullPath,
      });
    }
  }

  candidates.sort((left, right) => right.mtimeMs - left.mtimeMs);

  return candidates[0]?.path ?? null;
}

function getRecentDiagnosticReports() {
  if (!fs.existsSync(DIAGNOSTIC_REPORTS_DIR)) {
    return [];
  }

  const cutoffMs =
    Date.now() - (Number.parseInt(WINDOW_MINUTES, 10) + 10) * 60 * 1000;

  return fs
    .readdirSync(DIAGNOSTIC_REPORTS_DIR, { withFileTypes: true })
    .filter(entry => entry.isFile())
    .map(entry => {
      const fullPath = path.join(DIAGNOSTIC_REPORTS_DIR, entry.name);
      const stat = fs.statSync(fullPath);

      return {
        mtimeMs: stat.mtimeMs,
        name: entry.name,
        path: fullPath,
      };
    })
    .filter(entry => entry.mtimeMs >= cutoffMs)
    .sort((left, right) => right.mtimeMs - left.mtimeMs)
    .slice(0, 10);
}

function captureUnifiedLog(outputDir) {
  const predicate = `(process == "${APP_NAME}" OR eventMessage CONTAINS[c] "${APP_NAME}" OR eventMessage CONTAINS[c] "Self.app" OR process == "SpringBoard" OR process == "runningboardd" OR eventMessage CONTAINS[c] "jetsam" OR eventMessage CONTAINS[c] "terminated" OR eventMessage CONTAINS[c] "killed")`;
  const logOutput = runCommand(
    'log',
    [
      'show',
      '--style',
      'compact',
      '--last',
      `${WINDOW_MINUTES}m`,
      '--predicate',
      predicate,
    ],
    { maxBuffer: 20 * 1024 * 1024 },
  );

  writeFile(path.join(outputDir, 'unified.log'), logOutput);
}

function captureDiagnosticReports(outputDir) {
  const listing = fs.existsSync(DIAGNOSTIC_REPORTS_DIR)
    ? runCommand('ls', ['-lt', DIAGNOSTIC_REPORTS_DIR])
    : 'DiagnosticReports directory not found.\n';

  writeFile(path.join(outputDir, 'diagnosticreports.txt'), listing);

  const reports = getRecentDiagnosticReports();
  const reportsDir = path.join(outputDir, 'diagnosticreports');
  ensureDir(reportsDir);

  for (const report of reports) {
    copyFileIfPresent(report.path, path.join(reportsDir, report.name));
  }
}

function captureLatestLaunchResult(outputDir) {
  const xcresultPath = getLatestLaunchResult();

  if (!xcresultPath) {
    writeFile(
      path.join(outputDir, 'launch-result.txt'),
      'No Launch xcresult bundle found in DerivedData.\n',
    );
    return;
  }

  writeFile(
    path.join(outputDir, 'launch-result-path.txt'),
    `${xcresultPath}\n`,
  );

  const xcresultJson = runCommand('xcrun', [
    'xcresulttool',
    'get',
    'object',
    '--legacy',
    '--path',
    xcresultPath,
    '--format',
    'json',
  ]);

  writeFile(path.join(outputDir, 'launch-result.json'), xcresultJson);
}

function main() {
  const outputDir = path.join(OUTPUT_ROOT, timestamp());
  ensureDir(outputDir);

  captureUnifiedLog(outputDir);
  captureDiagnosticReports(outputDir);
  captureLatestLaunchResult(outputDir);

  console.log(`Saved iOS crash artifacts to ${outputDir}`);
}

try {
  main();
} catch (error) {
  console.error(`Failed to capture iOS crash artifacts: ${error.message}`);
  process.exit(1);
}
