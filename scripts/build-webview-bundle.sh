#!/usr/bin/env bash
# SPDX-License-Identifier: BUSL-1.1
#
# Builds the webview-app and copies the output to native shell asset directories.
# Usage: ./scripts/build-webview-bundle.sh [--skip-build]

set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"

WEBVIEW_DIST="${REPO_ROOT}/packages/webview-app/dist"
ANDROID_ASSETS="${REPO_ROOT}/packages/native-shell-android/src/main/assets/self-wallet"
IOS_RESOURCES="${REPO_ROOT}/packages/native-shell-ios/Resources/self-sdk-web"

SKIP_BUILD=false
for arg in "$@"; do
  case "$arg" in
    --skip-build) SKIP_BUILD=true ;;
    *) echo "Unknown argument: $arg"; exit 1 ;;
  esac
done

# Step 1: Build webview-app
if [ "$SKIP_BUILD" = false ]; then
  echo "Building webview-app..."
  (cd "$REPO_ROOT" && yarn workspace @selfxyz/webview-app build)
else
  echo "Skipping build (--skip-build)"
fi

# Verify build output exists
if [ ! -d "$WEBVIEW_DIST" ]; then
  echo "ERROR: Build output not found at ${WEBVIEW_DIST}"
  echo "Run without --skip-build or build webview-app manually first."
  exit 1
fi

if [ ! -f "$WEBVIEW_DIST/index.html" ]; then
  echo "ERROR: Build output incomplete — index.html not found at ${WEBVIEW_DIST}/index.html"
  exit 1
fi

# Step 2: Clean target directories
echo "Cleaning target directories..."
rm -rf "$ANDROID_ASSETS"
rm -rf "$IOS_RESOURCES"

# Step 3: Create target directories and copy
echo "Copying bundle to Android assets..."
mkdir -p "$ANDROID_ASSETS"
cp -r "$WEBVIEW_DIST"/* "$ANDROID_ASSETS"/

echo "Copying bundle to iOS resources..."
mkdir -p "$IOS_RESOURCES"
cp -r "$WEBVIEW_DIST"/* "$IOS_RESOURCES"/

# Step 4: Verify
FAILED=false

if [ ! -f "$ANDROID_ASSETS/index.html" ]; then
  echo "ERROR: Android bundle verification failed — index.html not found at ${ANDROID_ASSETS}/index.html"
  FAILED=true
fi

if [ ! -f "$IOS_RESOURCES/index.html" ]; then
  echo "ERROR: iOS bundle verification failed — index.html not found at ${IOS_RESOURCES}/index.html"
  FAILED=true
fi

if [ "$FAILED" = true ]; then
  echo "Bundle copy FAILED."
  exit 1
fi

echo "WebView bundle copied successfully to both native shells."
