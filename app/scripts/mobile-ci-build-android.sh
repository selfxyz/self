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

# Clone private Android modules if they don't exist (for local development)
# Note: In CI, this is usually handled by GitHub action, but we keep this as fallback
clone_private_module() {
  local repo_name=$1
  local target_dir=$2

  if [[ -d "$target_dir" ]]; then
    if is_ci; then
      log "📁 $repo_name exists (likely cloned by GitHub action)"
    else
      log "📁 $repo_name already exists - preserving existing directory"
    fi
    return 0
  fi

  log "Cloning $repo_name for build..."
  cd app/android

  # Extract just the directory name from the full path for git clone
  local dir_name=$(basename "$target_dir")

  # Use different clone methods based on environment
  if is_ci && [[ -n "${SELFXYZ_APP_TOKEN:-}" ]]; then
    # CI environment with GitHub App installation token
    git clone "https://x-access-token:${SELFXYZ_APP_TOKEN}@github.com/selfxyz/${repo_name}.git" "$dir_name" || {
      log "ERROR: Failed to clone $repo_name with GitHub App token"
      exit 1
    }
  elif is_ci && [[ -n "${SELFXYZ_INTERNAL_REPO_PAT:-}" ]]; then
    # CI environment with PAT (fallback if action didn't run)
    git clone "https://${SELFXYZ_INTERNAL_REPO_PAT}@github.com/selfxyz/${repo_name}.git" "$dir_name" || {
      log "ERROR: Failed to clone $repo_name with PAT"
      exit 1
    }
  elif [[ -n "${SSH_AUTH_SOCK:-}" ]] || [[ -f "${HOME}/.ssh/id_rsa" ]] || [[ -f "${HOME}/.ssh/id_ed25519" ]]; then
    # Local development with SSH
    git clone "git@github.com:selfxyz/${repo_name}.git" "$dir_name" || {
      log "ERROR: Failed to clone $repo_name with SSH"
      log "Please ensure you have SSH access to the repository or set SELFXYZ_APP_TOKEN/SELFXYZ_INTERNAL_REPO_PAT"
      exit 1
    }
  else
    log "ERROR: No authentication method available for cloning $repo_name"
    log "Please either:"
    log "  - Set up SSH access (for local development)"
    log "  - Set SELFXYZ_APP_TOKEN or SELFXYZ_INTERNAL_REPO_PAT environment variable (for CI)"
    exit 1
  fi

  cd ../../
  log "✅ $repo_name cloned successfully"
}

# Clone all required private modules
clone_private_module "android-passport-nfc-reader" "app/android/android-passport-nfc-reader"
clone_private_module "react-native-passport-reader" "app/android/react-native-passport-reader"

# Build and package the SDK with timeout (including dependencies)
log "Building SDK and dependencies..."
if is_ci; then
  timeout 300 yarn workspaces foreach --from @selfxyz/mobile-sdk-alpha --topological --recursive run build || {
    log "SDK build timed out after 5 minutes"
    exit 1
  }
else
  yarn workspaces foreach --from @selfxyz/mobile-sdk-alpha --topological --recursive run build
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
  # Temporarily unset both auth tokens to skip private modules during SDK installation
  # Both tokens must be unset to prevent setup-private-modules.cjs from attempting clones
  env -u SELFXYZ_INTERNAL_REPO_PAT -u SELFXYZ_APP_TOKEN timeout 180 yarn add "@selfxyz/mobile-sdk-alpha@file:$TARBALL_PATH" || {
    log "SDK installation timed out after 3 minutes"
    exit 1
  }
else
  # Temporarily unset both auth tokens to skip private modules during SDK installation
  env -u SELFXYZ_INTERNAL_REPO_PAT -u SELFXYZ_APP_TOKEN yarn add "@selfxyz/mobile-sdk-alpha@file:$TARBALL_PATH"
fi

# Verify installation (check for AAR file in both local and hoisted locations)
SDK_AAR_PATH=""
if [[ -f "node_modules/@selfxyz/mobile-sdk-alpha/dist/android/mobile-sdk-alpha-release.aar" ]]; then
  SDK_AAR_PATH="node_modules/@selfxyz/mobile-sdk-alpha/dist/android/mobile-sdk-alpha-release.aar"
elif [[ -f "../node_modules/@selfxyz/mobile-sdk-alpha/dist/android/mobile-sdk-alpha-release.aar" ]]; then
  SDK_AAR_PATH="../node_modules/@selfxyz/mobile-sdk-alpha/dist/android/mobile-sdk-alpha-release.aar"
else
  log "ERROR: SDK AAR file not found after installation"
  log "Checked: node_modules/@selfxyz/mobile-sdk-alpha/dist/android/mobile-sdk-alpha-release.aar"
  log "Checked: ../node_modules/@selfxyz/mobile-sdk-alpha/dist/android/mobile-sdk-alpha-release.aar"
  exit 1
fi

log "SDK AAR file found at: $SDK_AAR_PATH"

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
  if mv package.json.backup package.json && mv ../yarn.lock.backup ../yarn.lock; then
    log "✅ Package files restored successfully"

    # Verify restoration by checking yarn.lock doesn't contain tarball references
    if grep -q "file:/tmp/mobile-sdk-alpha-ci.tgz" ../yarn.lock 2>/dev/null; then
      log "WARNING: yarn.lock still contains tarball references after restoration"
      log "This may cause 'yarn.lock is out of date' errors in CI"
    fi
  else
    log "ERROR: Failed to restore package files"
    log "This may cause 'yarn.lock is out of date' errors in CI"
    exit 1
  fi
else
  log "WARNING: Backup files not found - package.json may still reference tarball"
  log "Please run 'yarn add @selfxyz/mobile-sdk-alpha@workspace:^' manually"
fi

log "Mobile CI Build Android completed successfully!"

exit 0
