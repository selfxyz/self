#!/bin/bash
# Mobile CI Build Android Script
# Fixes AAPT2 symlink issue by installing SDK as tarball, then builds Android
# Includes CI-worthy error handling and environment detection

set -e

# Detect CI environment (similar to run-patch-package.cjs)
is_ci() {
  [[ "${CI:-}" == "true" ]] || \
  [[ "${GITHUB_ACTIONS:-}" == "true" ]] || \
  [[ "${CIRCLECI:-}" == "true" ]] || \
  [[ "${TRAVIS:-}" == "true" ]] || \
  [[ "${BUILDKITE:-}" == "true" ]] || \
  [[ "${GITLAB_CI:-}" == "true" ]] || \
  [[ -n "${JENKINS_URL:-}" ]]
}

# Logging function
log() {
  if is_ci; then
    echo "mobile-ci-build-android: $1 (CI mode)"
  else
    echo "🤖 $1"
  fi
}

# Error handling with cleanup
handle_error() {
  local exit_code=$?
  log "ERROR: Command failed with exit code $exit_code"

  # Attempt cleanup on error
  if [[ -f "/tmp/mobile-sdk-alpha-ci.tgz" ]]; then
    log "Cleaning up tarball on error..."
    rm -f "/tmp/mobile-sdk-alpha-ci.tgz"
  fi

  # Attempt to restore workspace dependency if we're in the app directory
  if [[ -f "package.json" ]] && grep -q "mobile-sdk-alpha.*file:/tmp" package.json 2>/dev/null; then
    log "Restoring workspace dependency on error..."
    yarn add "@selfxyz/mobile-sdk-alpha@workspace:^" 2>/dev/null || true
  fi

  if is_ci; then
    log "Build failed during Android CI setup"
  fi
  exit $exit_code
}

trap handle_error ERR

log "Starting Mobile CI Build Android - Fixing AAPT2 symlink issue..."

# Early exit if not in expected directory structure
if [[ ! -d "$(dirname "$0")/../../packages/mobile-sdk-alpha" ]]; then
  log "ERROR: mobile-sdk-alpha package not found in expected location"
  exit 1
fi

# Go to project root
PROJECT_ROOT="$(dirname "$0")/../.."
cd "$PROJECT_ROOT"

log "Working directory: $(pwd)"

# Build and package the SDK with timeout
log "Building SDK..."
if is_ci; then
  timeout 300 yarn workspace @selfxyz/mobile-sdk-alpha build || {
    log "SDK build timed out after 5 minutes"
    exit 1
  }
else
  yarn workspace @selfxyz/mobile-sdk-alpha build
fi

log "Creating SDK tarball..."
TARBALL_PATH="/tmp/mobile-sdk-alpha-ci.tgz"
if is_ci; then
  timeout 60 yarn workspace @selfxyz/mobile-sdk-alpha pack --out "$TARBALL_PATH" || {
    log "SDK packaging timed out after 1 minute"
    exit 1
  }
else
  yarn workspace @selfxyz/mobile-sdk-alpha pack --out "$TARBALL_PATH"
fi

# Verify tarball was created
if [[ ! -f "$TARBALL_PATH" ]]; then
  log "ERROR: SDK tarball was not created at $TARBALL_PATH"
  exit 1
fi

# Install SDK from tarball in app with timeout
log "Installing SDK as real files..."
cd app
if is_ci; then
  timeout 180 yarn add "@selfxyz/mobile-sdk-alpha@file:$TARBALL_PATH" || {
    log "SDK installation timed out after 3 minutes"
    exit 1
  }
else
  yarn add "@selfxyz/mobile-sdk-alpha@file:$TARBALL_PATH"
fi

# Verify installation (check both local and hoisted locations)
SDK_ANDROID_PATH=""
if [[ -d "node_modules/@selfxyz/mobile-sdk-alpha/android/src/main/res" ]]; then
  SDK_ANDROID_PATH="node_modules/@selfxyz/mobile-sdk-alpha/android/src/main/res"
elif [[ -d "../node_modules/@selfxyz/mobile-sdk-alpha/android/src/main/res" ]]; then
  SDK_ANDROID_PATH="../node_modules/@selfxyz/mobile-sdk-alpha/android/src/main/res"
else
  log "ERROR: SDK Android resources not found after installation"
  log "Checked: node_modules/@selfxyz/mobile-sdk-alpha/android/src/main/res"
  log "Checked: ../node_modules/@selfxyz/mobile-sdk-alpha/android/src/main/res"
  exit 1
fi

log "SDK Android resources found at: $SDK_ANDROID_PATH"

# Build Android APK (don't install to device)
log "Building Android APK..."
if is_ci; then
  # Build APK only for CI (no device installation)
  timeout 1800 ./android/gradlew assembleDebug -p android || {
    log "Android APK build timed out after 30 minutes"
    exit 1
  }
else
  # For local development, build APK only
  ./android/gradlew assembleDebug -p android || {
    log "Android APK build failed"
    exit 1
  }
fi

# Cleanup tarball and restore workspace dependency
log "Cleaning up..."

# Remove temporary tarball
if [[ -f "$TARBALL_PATH" ]]; then
  rm -f "$TARBALL_PATH"
  log "Cleaned up temporary tarball"
fi

# Restore workspace dependency
log "Restoring workspace dependency..."
yarn add "@selfxyz/mobile-sdk-alpha@workspace:^" || {
  log "WARNING: Failed to restore workspace dependency"
}

log "Mobile CI Build Android completed successfully!"

exit 0
