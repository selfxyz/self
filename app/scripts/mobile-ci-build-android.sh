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

readonly ANDROID_PRIVATE_MODULE_DIR="app/android/android-passport-nfc-reader"
readonly LEGACY_ANDROID_PRIVATE_MODULE_DIR="app/android/android-passport-reader"
readonly ANDROID_PRIVATE_REPO_ORG="selfxyz"
readonly ANDROID_PRIVATE_REPO_SLUG="android-passport-nfc-reader"
readonly LEGACY_ANDROID_PRIVATE_REPO_SLUG="android-passport-reader"

# Error handling with cleanup
handle_error() {
  local exit_code=$?
  log "ERROR: Command failed with exit code $exit_code"

  # Attempt cleanup on error
  if [[ -f "/tmp/mobile-sdk-alpha-ci.tgz" ]]; then
    log "Cleaning up tarball on error..."
    rm -f "/tmp/mobile-sdk-alpha-ci.tgz"
  fi

  # Clean up lock file
  rm -f "/tmp/mobile-ci-build-android.lock" 2>/dev/null || true

  # Attempt to restore backup package files if they exist
  if [[ -f "package.json.backup" ]] && [[ -f "../yarn.lock.backup" ]]; then
    log "Restoring backup package files on error..."
    mv package.json.backup package.json 2>/dev/null || true
    mv ../yarn.lock.backup ../yarn.lock 2>/dev/null || true
  elif [[ -f "package.json" ]] && grep -q "mobile-sdk-alpha.*file:/tmp" package.json 2>/dev/null; then
    log "WARNING: Package files modified but no backup found - manual fix required"
    log "Please run 'yarn add @selfxyz/mobile-sdk-alpha@workspace:^' to restore"
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

# Check for and clean up any existing backup files (from previous failed runs)
if [[ -f "app/package.json.backup" ]] || [[ -f "yarn.lock.backup" ]]; then
  log "WARNING: Found existing backup files from previous run - cleaning up..."
  rm -f app/package.json.backup yarn.lock.backup
fi

# Check if another instance is running
LOCK_FILE="/tmp/mobile-ci-build-android.lock"
if [[ -f "$LOCK_FILE" ]]; then
  log "ERROR: Another instance of this script is already running (lock file exists)"
  log "If you're sure no other instance is running, remove: $LOCK_FILE"
  exit 1
fi
echo $$ > "$LOCK_FILE"
trap 'rm -f "$LOCK_FILE"' EXIT

# Go to project root
PROJECT_ROOT="$(dirname "$0")/../.."
cd "$PROJECT_ROOT"

log "Working directory: $(pwd)"

# Clone android-passport-nfc-reader if it doesn't exist (for local development)
# Note: In CI, this is usually handled by GitHub action, but we keep this as fallback
if [[ -d "$LEGACY_ANDROID_PRIVATE_MODULE_DIR" ]]; then
  if [[ -d "$ANDROID_PRIVATE_MODULE_DIR" ]]; then
    log "Removing legacy android-passport-reader directory to avoid conflicts..."
    rm -rf "$LEGACY_ANDROID_PRIVATE_MODULE_DIR"
  else
    log "Renaming legacy android-passport-reader directory to android-passport-nfc-reader..."
    mv "$LEGACY_ANDROID_PRIVATE_MODULE_DIR" "$ANDROID_PRIVATE_MODULE_DIR"
  fi
fi

if [[ ! -d "$ANDROID_PRIVATE_MODULE_DIR" ]]; then
  log "Cloning android-passport-nfc-reader for build..."
  cd app/android

  # Use different clone methods based on environment
  if is_ci && [[ -n "${SELFXYZ_INTERNAL_REPO_PAT:-}" ]]; then
    # CI environment with PAT (fallback if action didn't run)
    clone_success=0
    for repo_slug in "$ANDROID_PRIVATE_REPO_SLUG" "$LEGACY_ANDROID_PRIVATE_REPO_SLUG"; do
      git clone "https://${SELFXYZ_INTERNAL_REPO_PAT}@github.com/${ANDROID_PRIVATE_REPO_ORG}/${repo_slug}.git" "$ANDROID_PRIVATE_REPO_SLUG" && {
        clone_success=1
        if [[ "$repo_slug" == "$LEGACY_ANDROID_PRIVATE_REPO_SLUG" ]]; then
          log "Cloned legacy android-passport-reader repository with PAT; remote will be updated automatically."
        fi
        break
      }

      log "WARNING: Failed to clone ${repo_slug} with PAT"
      rm -rf "$ANDROID_PRIVATE_REPO_SLUG"
    done

    if [[ $clone_success -ne 1 ]]; then
      log "ERROR: Failed to clone android-passport-nfc-reader with PAT"
      exit 1
    fi
  elif [[ -n "${SSH_AUTH_SOCK:-}" ]] || [[ -f "${HOME}/.ssh/id_rsa" ]] || [[ -f "${HOME}/.ssh/id_ed25519" ]]; then
    # Local development with SSH
    clone_success=0
    for repo_slug in "$ANDROID_PRIVATE_REPO_SLUG" "$LEGACY_ANDROID_PRIVATE_REPO_SLUG"; do
      git clone "git@github.com:${ANDROID_PRIVATE_REPO_ORG}/${repo_slug}.git" "$ANDROID_PRIVATE_REPO_SLUG" && {
        clone_success=1
        if [[ "$repo_slug" == "$LEGACY_ANDROID_PRIVATE_REPO_SLUG" ]]; then
          log "Cloned legacy android-passport-reader repository via SSH; remote will be updated automatically."
        fi
        break
      }

      log "WARNING: Failed to clone ${repo_slug} with SSH"
      rm -rf "$ANDROID_PRIVATE_REPO_SLUG"
    done

    if [[ $clone_success -ne 1 ]]; then
      log "ERROR: Failed to clone android-passport-nfc-reader with SSH"
      log "Please ensure you have SSH access to the repository or set SELFXYZ_INTERNAL_REPO_PAT"
      exit 1
    fi
  else
    log "ERROR: No authentication method available for cloning android-passport-nfc-reader"
    log "Please either:"
    log "  - Set up SSH access (for local development)"
    log "  - Set SELFXYZ_INTERNAL_REPO_PAT environment variable (for CI)"
    exit 1
  fi

  cd ../..
  log "✅ android-passport-nfc-reader cloned successfully"
elif is_ci; then
  log "📁 android-passport-nfc-reader exists (likely cloned by GitHub action)"
else
  log "📁 android-passport-nfc-reader already exists - preserving existing directory"
fi

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

# Backup package.json and yarn.lock before modification
log "Backing up package files..."
cd app

# Ensure we can create backups
if [[ ! -f "package.json" ]]; then
  log "ERROR: package.json not found in app directory"
  exit 1
fi
if [[ ! -f "../yarn.lock" ]]; then
  log "ERROR: yarn.lock not found in project root"
  exit 1
fi

# Create backups with error checking
cp package.json package.json.backup || {
  log "ERROR: Failed to backup package.json"
  exit 1
}
cp ../yarn.lock ../yarn.lock.backup || {
  log "ERROR: Failed to backup yarn.lock"
  exit 1
}
log "✅ Package files backed up successfully"

# Install SDK from tarball in app with timeout
log "Installing SDK as real files..."
if is_ci; then
  # Temporarily unset PAT to skip private modules during SDK installation
  env -u SELFXYZ_INTERNAL_REPO_PAT timeout 180 yarn add "@selfxyz/mobile-sdk-alpha@file:$TARBALL_PATH" || {
    log "SDK installation timed out after 3 minutes"
    exit 1
  }
else
  # Temporarily unset PAT to skip private modules during SDK installation
  env -u SELFXYZ_INTERNAL_REPO_PAT yarn add "@selfxyz/mobile-sdk-alpha@file:$TARBALL_PATH"
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

# Restore original package files
log "Restoring original package files..."
if [[ -f "package.json.backup" ]] && [[ -f "../yarn.lock.backup" ]]; then
  mv package.json.backup package.json
  mv ../yarn.lock.backup ../yarn.lock
  log "✅ Package files restored successfully"
else
  log "WARNING: Backup files not found - package.json may still reference tarball"
  log "Please run 'yarn add @selfxyz/mobile-sdk-alpha@workspace:^' manually"
fi

log "Mobile CI Build Android completed successfully!"

exit 0
