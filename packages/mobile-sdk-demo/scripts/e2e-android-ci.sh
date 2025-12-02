#!/bin/bash
set -euo pipefail

# Simple, robust Android E2E runner for CI using Maestro
# - Boots or detects an emulator
# - Builds Release APK
# - Installs to detected emulator
# - Runs Maestro flow
# - Cleans up emulator gracefully if started here

log() { echo "[e2e-android-ci] $*"; }

: "${ANDROID_HOME:?ANDROID_HOME must be set}"
ADB="$ANDROID_HOME/platform-tools/adb"
EMULATOR_BIN="$ANDROID_HOME/emulator/emulator"

if [ ! -x "$ADB" ]; then
  log "adb not found at $ADB"; exit 1
fi
if [ ! -x "$EMULATOR_BIN" ]; then
  log "emulator binary not found at $EMULATOR_BIN"; exit 1
fi

cd "$(dirname "$0")/.."

EMULATOR_PID=""
STARTED_AVD=""

cleanup() {
  # If we started an emulator, try to terminate it quietly
  if [ -n "$EMULATOR_PID" ] && kill -0 "$EMULATOR_PID" 2>/dev/null; then
    log "Stopping emulator PID $EMULATOR_PID"
    kill "$EMULATOR_PID" >/dev/null 2>&1 || true
    sleep 2 || true
    kill -9 "$EMULATOR_PID" >/dev/null 2>&1 || true
  fi
  # Also attempt an adb emu kill against detected serial, but tolerate failures
  serial="$($ADB devices | awk '/^emulator-/{print $1; exit}')"
  if [ -n "$serial" ]; then
    $ADB -s "$serial" emu kill >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

log "Ensuring dependencies are built"
yarn prebuild

log "Checking for running emulator"
serial="$($ADB devices | awk '/^emulator-/{print $1; exit}')"
if [ -z "$serial" ]; then
  log "No running emulator detected; attempting to start one"
  avd_list="$($EMULATOR_BIN -list-avds || true)"
  if [ -z "$avd_list" ]; then
    log "No AVDs available. Create one in CI before running tests."; exit 1
  fi
  STARTED_AVD="$(echo "$avd_list" | head -n1)"
  log "Starting AVD: $STARTED_AVD"
  "$EMULATOR_BIN" -avd "$STARTED_AVD" -no-snapshot-load -no-window -gpu swiftshader_indirect >/dev/null 2>&1 &
  EMULATOR_PID=$!

  # Wait for adb to see an emulator
  for i in {1..90}; do
    serial="$($ADB devices | awk '/^emulator-/{print $1; exit}')"
    [ -n "$serial" ] && break
    sleep 2
  done
  if [ -z "$serial" ]; then
    log "Emulator did not appear in adb within timeout"; exit 1
  fi
  log "Emulator detected: $serial; waiting for boot completion"
  boot_success=false
  for i in {1..120}; do
    if $ADB -s "$serial" shell getprop sys.boot_completed 2>/dev/null | grep -q "1"; then
      log "Emulator boot completed"
      boot_success=true
      break
    fi
    sleep 2
  done

  if [ "$boot_success" != "true" ]; then
    log "ERROR: Emulator failed to complete boot after 240 seconds"; exit 1
  fi
fi

log "Building Release APK"
pushd android >/dev/null
./gradlew assembleRelease --quiet
popd >/dev/null

APK_PATH="android/app/build/outputs/apk/release/app-release.apk"
if [ ! -f "$APK_PATH" ]; then
  log "APK not found at $APK_PATH"; exit 1
fi

# Determine package name via aapt2 if available
AAPT2_PATH=$(find "$ANDROID_HOME/build-tools" -type f -name aapt2 2>/dev/null | sort -r | head -n1 || true)
if [ -n "$AAPT2_PATH" ]; then
  PKG_NAME="$($AAPT2_PATH dump packagename "$APK_PATH" 2>/dev/null | head -1)"
else
  AAPT_PATH=$(find "$ANDROID_HOME/build-tools" -type f -name aapt 2>/dev/null | sort -r | head -n1 || true)
  if [ -n "$AAPT_PATH" ]; then
    PKG_NAME="$($AAPT_PATH dump badging "$APK_PATH" 2>/dev/null | sed -n "s/.*package: name='\([^']\+\)'.*/\1/p" | head -1)"
  fi
fi
PKG_NAME="${PKG_NAME:-com.selfxyz.demoapp}"
log "Using package name: $PKG_NAME"

log "Installing APK to $serial"
$ADB -s "$serial" install -r "$APK_PATH"

export MAESTRO_DRIVER_STARTUP_TIMEOUT=180000
log "Running Maestro tests"
maestro test tests/e2e/launch.android.flow.yaml --format junit --output maestro-results.xml

log "E2E completed"
exit 0
