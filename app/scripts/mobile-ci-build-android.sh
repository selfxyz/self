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

# Error handling
handle_error() {
  local exit_code=$?
  log "ERROR: Command failed with exit code $exit_code"
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

# Verify installation
if [[ ! -d "node_modules/@selfxyz/mobile-sdk-alpha/android/src/main/res" ]]; then
  log "ERROR: SDK Android resources not found after installation"
  exit 1
fi

# Build Android with appropriate timeout
log "Building Android..."
if is_ci; then
  # Longer timeout for CI Android builds
  timeout 1800 yarn react-native run-android || {
    log "Android build timed out after 30 minutes"
    exit 1
  }
else
  yarn react-native run-android
fi

# Cleanup
if [[ -f "$TARBALL_PATH" ]]; then
  rm -f "$TARBALL_PATH"
  log "Cleaned up temporary tarball"
fi

log "Mobile CI Build Android completed successfully!"

exit 0
